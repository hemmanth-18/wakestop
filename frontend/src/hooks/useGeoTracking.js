import { useCallback, useEffect, useRef, useState } from "react";
import { distanceMetres } from "../utils/geo";
import { playAlarmSound, playEarlyBatteryAlarm, getSavedSoundPreset, getVibrationEnabled } from "../utils/audio";
import { calculateDynamicEta, calculateAdaptiveThresholds } from "../utils/aiEngine";
import { getRealBatteryState, evaluateBatteryRisk } from "../utils/batteryPredictor";

const DEFAULT_THRESHOLDS = {
  notifyM: 2000,
  alarmM: 1000,
  criticalM: 500,
  arrivedM: 120,
};

function triggerAudio(stage) {
  const mult = stage === "critical" ? 1.5 : stage === "alarm" ? 1.2 : 1.0;
  playAlarmSound(getSavedSoundPreset(), mult);
}

function vibrate(pattern) {
  if (getVibrationEnabled() && "vibrate" in navigator) {
    navigator.vibrate(pattern);
  }
}

function notify(title, body) {
  if (!("Notification" in window)) return;
  if (Notification.permission === "granted") {
    new Notification(title, { body });
  }
}

export function useGeoTracking(destination, customThresholds = null, tripHistory = []) {
  const [position, setPosition] = useState(null);
  const [distance, setDistance] = useState(null);
  const [stage, setStage] = useState("idle");
  const [error, setError] = useState(null);
  const [positionHistory, setPositionHistory] = useState([]);
  const [wakeResponseSec, setWakeResponseSec] = useState(null);
  const [batteryRisk, setBatteryRisk] = useState(null);
  const [isBatteryCritical, setIsBatteryCritical] = useState(false);

  // Compute adaptive thresholds if custom ones aren't provided
  const adaptiveInfo = useRef(calculateAdaptiveThresholds(tripHistory));
  const activeThresholds = customThresholds || adaptiveInfo.current.thresholds;

  const watchId = useRef(null);
  const repeatTimer = useRef(null);
  const wakeLockRef = useRef(null);
  const lastStage = useRef("idle");
  const manuallyStopped = useRef(false);
  const alarmStartTime = useRef(null);

  const clearRepeatTimer = () => {
    if (repeatTimer.current) {
      window.clearInterval(repeatTimer.current);
      repeatTimer.current = null;
    }
  };

  const acknowledge = useCallback(() => {
    manuallyStopped.current = true;
    setStage("stopped");
    setIsBatteryCritical(false);
    clearRepeatTimer();
    if (alarmStartTime.current) {
      const elapsedSec = Math.max(1, Math.round((Date.now() - alarmStartTime.current) / 1000));
      setWakeResponseSec(elapsedSec);
    }
  }, []);

  const triggerEarlyBatteryAlarm = useCallback(() => {
    manuallyStopped.current = false;
    setIsBatteryCritical(true);
    setStage("critical");
    lastStage.current = "critical";

    if (!alarmStartTime.current) {
      alarmStartTime.current = Date.now();
    }

    notify(
      "⚡ Battery Critically Low!",
      "Alarm activated early by WakeStop AI to prevent missing your stop due to phone shutdown."
    );

    playEarlyBatteryAlarm(getSavedSoundPreset());
    vibrate([500, 150, 500, 150, 500]);

    clearRepeatTimer();
    repeatTimer.current = window.setInterval(() => {
      playEarlyBatteryAlarm(getSavedSoundPreset());
      vibrate([500, 150, 500]);
    }, 12000);
  }, []);

  // Screen Wake Lock API
  useEffect(() => {
    if ("wakeLock" in navigator) {
      navigator.wakeLock
        .request("screen")
        .then((lock) => {
          wakeLockRef.current = lock;
        })
        .catch(() => {});
    }

    return () => {
      if (wakeLockRef.current) {
        wakeLockRef.current.release().catch(() => {});
      }
    };
  }, []);

  // Battery monitoring loop during tracking
  useEffect(() => {
    const checkBattery = async () => {
      const bState = await getRealBatteryState();
      const eta = calculateDynamicEta(positionHistory, distance);
      const risk = evaluateBatteryRisk(bState, eta.dynamicEtaMin);
      setBatteryRisk(risk);

      if (risk.triggerEarlyAlarm && !manuallyStopped.current && stage !== "arrived" && stage !== "critical") {
        triggerEarlyBatteryAlarm();
      }
    };

    checkBattery();
    const timer = setInterval(checkBattery, 8000);
    return () => clearInterval(timer);
  }, [positionHistory, distance, stage, triggerEarlyBatteryAlarm]);

  useEffect(() => {
    if (!("geolocation" in navigator)) {
      setError("Geolocation is not supported on this device/browser.");
      return;
    }
    if (!destination) return;

    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }

    watchId.current = navigator.geolocation.watchPosition(
      (pos) => {
        const point = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          speed: pos.coords.speed,
          timestamp: pos.timestamp || Date.now(),
        };

        setPosition(pos.coords);
        setPositionHistory((prev) => [...prev.slice(-25), point]);

        const d = distanceMetres(pos.coords.latitude, pos.coords.longitude, destination.lat, destination.lng);
        setDistance(d);

        let nextStage = stage;
        if (manuallyStopped.current) {
          nextStage = d <= activeThresholds.arrivedM ? "arrived" : "stopped";
        } else if (isBatteryCritical) {
          nextStage = d <= activeThresholds.arrivedM ? "arrived" : "critical";
        } else if (d <= activeThresholds.arrivedM) {
          nextStage = "arrived";
        } else if (d <= activeThresholds.criticalM) {
          nextStage = "critical";
        } else if (d <= activeThresholds.alarmM) {
          nextStage = "alarm";
        } else if (d <= activeThresholds.notifyM) {
          nextStage = "notify";
        } else {
          nextStage = "idle";
        }

        if (nextStage !== lastStage.current) {
          lastStage.current = nextStage;
          setStage(nextStage);

          if ((nextStage === "alarm" || nextStage === "critical") && !alarmStartTime.current) {
            alarmStartTime.current = Date.now();
          }

          if (nextStage === "notify") {
            notify("Getting close", `Destination is ~${Math.round(d / 1000)} km away.`);
            triggerAudio(nextStage);
          } else if (nextStage === "alarm") {
            notify("Wake up!", "Approaching your stop! Wake up now.");
            triggerAudio(nextStage);
            vibrate([300, 150, 300]);
          } else if (nextStage === "critical") {
            notify("Almost there!", "Destination under 500 m away! Prepare to step off.");
            triggerAudio(nextStage);
            vibrate([400, 100, 400, 100, 400]);
            manuallyStopped.current = false;
            clearRepeatTimer();
            repeatTimer.current = window.setInterval(() => {
              triggerAudio("critical");
              vibrate([400, 100, 400]);
            }, 15000);
          } else if (nextStage === "arrived") {
            notify("You've arrived", "Journey completed. Alarm deactivated.");
            clearRepeatTimer();
          }
        }
      },
      (err) => setError(err.message),
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 15000 }
    );

    return () => {
      if (watchId.current !== null) navigator.geolocation.clearWatch(watchId.current);
      clearRepeatTimer();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [destination?.lat, destination?.lng, isBatteryCritical]);

  const aiEta = calculateDynamicEta(positionHistory, distance);

  return {
    position,
    distance,
    stage,
    error,
    acknowledge,
    positionHistory,
    aiEta,
    adaptiveInfo: adaptiveInfo.current,
    activeThresholds,
    wakeResponseSec,
    batteryRisk,
    isBatteryCritical,
    triggerEarlyBatteryAlarm,
  };
}
