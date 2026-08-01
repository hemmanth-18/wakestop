import { useCallback, useEffect, useRef, useState } from "react";
import { distanceMetres } from "../utils/geo";
import {
  playAlarmSound,
  playEarlyBatteryAlarm,
  getSavedSoundPreset,
  getVibrationEnabled,
  unlockAudioContext,
  requestNotificationPermission,
  startAlarmVibration,
  stopAlarmVibration,
} from "../utils/audio";
import { calculateDynamicEta, calculateAdaptiveThresholds } from "../utils/aiEngine";
import { getRealBatteryState, evaluateBatteryRisk } from "../utils/batteryPredictor";

const DEFAULT_THRESHOLDS = {
  notifyM: 2000,
  alarmM: 1000,
  criticalM: 500,
  arrivedM: 120,
};

function triggerAudio(stage, notifOptions = {}) {
  const mult = stage === "critical" ? 1.5 : stage === "alarm" ? 1.2 : 1.0;
  // Audio only — vibration is triggered independently
  playAlarmSound(getSavedSoundPreset(), mult, 10000, { stage, ...notifOptions });
}

function vibrate(_pattern) {
  // Kept for reference — actual vibration now goes through startAlarmVibration()
  // which runs independently of audio. This stub prevents errors if called.
}

/**
 * Enhanced notify — uses requireInteraction + vibrate so it behaves
 * like an alarm notification even when media volume is 0.
 */
function notify(title, body, options = {}) {
  if (!("Notification" in window)) return;
  if (Notification.permission !== "granted") return;
  try {
    new Notification(title, {
      body,
      icon: "/favicon.svg",
      requireInteraction: options.requireInteraction ?? false,
      silent: false,
      vibrate: options.vibrate ?? [200, 100, 200],
      tag: options.tag ?? "wakestop-info",
      renotify: true,
    });
  } catch (e) {
    // Fallback for browsers that don't support all options
    try { new Notification(title, { body }); } catch (_) {}
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
    stopAlarmVibration(); // stop vibration independently
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
      "⚡ Battery Critical — WakeStop!",
      "AI activated early alarm to prevent missing your stop due to phone shutdown.",
      {
        tag: "wakestop-battery-alarm",
        requireInteraction: true,
        vibrate: [800, 100, 800, 100, 800, 100, 800],
      }
    );

    playEarlyBatteryAlarm(getSavedSoundPreset());
    // Start maximum-intensity vibration independently
    startAlarmVibration("critical");

    clearRepeatTimer();
    repeatTimer.current = window.setInterval(() => {
      playEarlyBatteryAlarm(getSavedSoundPreset());
      startAlarmVibration("critical"); // restart to keep it fresh
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

    // Unlock Web Audio API (required for sound on mobile after user gesture)
    unlockAudioContext();

    // Request notification permission (needed for SW alarm notifications)
    requestNotificationPermission();

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
            notify(
              "🔔 Getting Close — WakeStop",
              `Your destination is ~${Math.round(d / 1000)} km away. Start getting ready.`,
              { tag: "wakestop-notify", vibrate: [150, 100, 150] }
            );
            triggerAudio(nextStage);
          } else if (nextStage === "alarm") {
            notify(
              "⏰ Wake Up! — WakeStop",
              "You're approaching your stop! Gather your belongings now.",
              {
                tag: "wakestop-alarm-info",
                requireInteraction: true,
                vibrate: [500, 150, 500, 150, 500],
              }
            );
            triggerAudio(nextStage, {
              title: "⏰ WakeStop — Wake Up!",
              body: "You're approaching your stop! Gather your belongings now.",
            });
            // Start vibration independently — NOT tied to audio
            startAlarmVibration("alarm");
          } else if (nextStage === "critical") {
            notify(
              "🚨 Almost There! — WakeStop",
              "Destination under 500 m away! Step off the vehicle now!",
              {
                tag: "wakestop-alarm-info",
                requireInteraction: true,
                vibrate: [800, 100, 800, 100, 800, 100, 800],
              }
            );
            triggerAudio(nextStage, {
              title: "🚨 WakeStop — Get Off Now!",
              body: "Destination under 500 m away! Step off the vehicle immediately!",
            });
            // Critical intensity vibration — independent from audio
            startAlarmVibration("critical");
            manuallyStopped.current = false;
            clearRepeatTimer();
            repeatTimer.current = window.setInterval(() => {
              triggerAudio("critical", {
                title: "🚨 WakeStop — Get Off Now!",
                body: "Still approaching your stop! You must step off immediately!",
              });
              startAlarmVibration("critical"); // keep vibration alive on each repeat
            }, 15000);
          } else if (nextStage === "arrived") {
            notify(
              "✅ You've Arrived — WakeStop",
              "Journey completed safely. Alarm deactivated.",
              { tag: "wakestop-arrived", vibrate: [200] }
            );
            stopAlarmVibration(); // stop vibration on arrival
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
