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
import {
  startBackgroundAudioKeepAlive,
  stopBackgroundAudioKeepAlive,
} from "../utils/backgroundKeepAlive";

function triggerAudio(stage, notifOptions = {}) {
  const mult = stage === "stage3_100m" || stage === "critical" ? 1.6 : stage === "stage2_500m" ? 1.3 : 1.0;
  playAlarmSound(getSavedSoundPreset(), mult, 10000, { stage, ...notifOptions });
}

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
  const [currentSpeedKmh, setCurrentSpeedKmh] = useState(0);

  const watchId = useRef(null);
  const repeatTimer = useRef(null);
  const wakeLockRef = useRef(null);
  const lastStage = useRef("idle");
  const manuallyStopped = useRef(false);
  const alarmStartTime = useRef(null);

  // Dynamic AI Traffic-Adaptive Thresholds calculated continuously based on speed
  const adaptiveInfo = calculateAdaptiveThresholds(tripHistory, { vehicleSpeedKmh: currentSpeedKmh });
  const activeThresholds = customThresholds || adaptiveInfo.thresholds;

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
    stopAlarmVibration();
    stopBackgroundAudioKeepAlive();
    if (alarmStartTime.current) {
      const elapsedSec = Math.max(1, Math.round((Date.now() - alarmStartTime.current) / 1000));
      setWakeResponseSec(elapsedSec);
    }
  }, []);

  const triggerEarlyBatteryAlarm = useCallback(() => {
    manuallyStopped.current = false;
    setIsBatteryCritical(true);
    setStage("stage3_100m");
    lastStage.current = "stage3_100m";

    if (!alarmStartTime.current) {
      alarmStartTime.current = Date.now();
    }

    notify(
      "Battery Critical — WakeStop Alarm!",
      "AI activated early alarm to prevent missing your stop due to phone shutdown.",
      {
        tag: "wakestop-battery-alarm",
        requireInteraction: true,
        vibrate: [800, 100, 800, 100, 800, 100, 800],
      }
    );

    playEarlyBatteryAlarm(getSavedSoundPreset());
    startAlarmVibration("critical");

    clearRepeatTimer();
    repeatTimer.current = window.setInterval(() => {
      playEarlyBatteryAlarm(getSavedSoundPreset());
      startAlarmVibration("critical");
    }, 12000);
  }, []);

  // Screen Wake Lock & Background Audio Keep-Alive Lifecycle
  useEffect(() => {
    let isMounted = true;

    async function requestLock() {
      if ("wakeLock" in navigator && !wakeLockRef.current) {
        try {
          const lock = await navigator.wakeLock.request("screen");
          if (isMounted) {
            wakeLockRef.current = lock;
            lock.addEventListener("release", () => {
              wakeLockRef.current = null;
              if (isMounted && lastStage.current !== "stopped" && lastStage.current !== "arrived") {
                setTimeout(requestLock, 1000);
              }
            });
          }
        } catch (e) {}
      }
    }

    requestLock();
    // Start silent background audio keep-alive for screen-off alarm capability
    startBackgroundAudioKeepAlive();

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        requestLock();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      isMounted = false;
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      stopBackgroundAudioKeepAlive();
      if (wakeLockRef.current) {
        wakeLockRef.current.release().catch(() => {});
        wakeLockRef.current = null;
      }
    };
  }, []);

  // Battery monitoring loop
  useEffect(() => {
    const checkBattery = async () => {
      const bState = await getRealBatteryState();
      const eta = calculateDynamicEta(positionHistory, distance);
      const risk = evaluateBatteryRisk(bState, eta.dynamicEtaMin);
      setBatteryRisk(risk);

      if (risk.triggerEarlyAlarm && !manuallyStopped.current && stage !== "arrived" && stage !== "stage3_100m") {
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

    unlockAudioContext();
    requestNotificationPermission();

    watchId.current = navigator.geolocation.watchPosition(
      (pos) => {
        const point = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          speed: pos.coords.speed,
          timestamp: pos.timestamp || Date.now(),
        };

        const speedKmh = pos.coords.speed != null && pos.coords.speed >= 0 ? pos.coords.speed * 3.6 : 0;
        setCurrentSpeedKmh(speedKmh);

        setPosition(pos.coords);
        setPositionHistory((prev) => [...prev.slice(-25), point]);

        const d = distanceMetres(pos.coords.latitude, pos.coords.longitude, destination.lat, destination.lng);
        setDistance(d);

        const t = activeThresholds;
        let nextStage = stage;

        if (manuallyStopped.current) {
          nextStage = d <= t.arrivedM ? "arrived" : "stopped";
        } else if (isBatteryCritical) {
          nextStage = d <= t.arrivedM ? "arrived" : "stage3_100m";
        } else if (d <= t.arrivedM) {
          nextStage = "arrived";
        } else if (d <= t.stage3_100m) {
          // Stage 3 Alarm (100m target threshold)
          nextStage = "stage3_100m";
        } else if (d <= t.stage2_500m) {
          // Stage 2 Alarm (500m target threshold)
          nextStage = "stage2_500m";
        } else if (d <= t.stage1_1km) {
          // Stage 1 Alarm (1 km target threshold)
          nextStage = "stage1_1km";
        } else {
          nextStage = "idle";
        }

        if (nextStage !== lastStage.current) {
          lastStage.current = nextStage;
          setStage(nextStage);

          if ((nextStage.startsWith("stage") || nextStage === "critical") && !alarmStartTime.current) {
            alarmStartTime.current = Date.now();
          }

          if (nextStage === "stage1_1km") {
            notify(
              "🔔 Stage 1 Alert (1 km) — WakeStop",
              `Approaching destination (~${(d / 1000).toFixed(1)} km). Start getting ready!`,
              {
                tag: "wakestop-stage1",
                requireInteraction: true,
                vibrate: [300, 150, 300],
              }
            );
            triggerAudio("stage1_1km", {
              title: "WakeStop — Stage 1 Alert (1 km)",
              body: `Approaching destination (~${(d / 1000).toFixed(1)} km). Start getting ready!`,
              stage: "stage1_1km",
            });
            startAlarmVibration("notify");
          } else if (nextStage === "stage2_500m") {
            notify(
              "⏰ Stage 2 Wake Up! (500 m) — WakeStop",
              "Destination under 500 m away! Gather your luggage now.",
              {
                tag: "wakestop-stage2",
                requireInteraction: true,
                vibrate: [500, 150, 500, 150, 500],
              }
            );
            triggerAudio("stage2_500m", {
              title: "WakeStop — Stage 2 Wake Up! (500 m)",
              body: "Destination under 500 m away! Gather your belongings now.",
              stage: "stage2_500m",
            });
            startAlarmVibration("alarm");
          } else if (nextStage === "stage3_100m") {
            notify(
              "🚨 Stage 3 Urgent Arrival! (100 m) — WakeStop",
              "Under 100 m to destination! Step off vehicle immediately!",
              {
                tag: "wakestop-stage3",
                requireInteraction: true,
                vibrate: [800, 100, 800, 100, 800, 100, 800],
              }
            );
            triggerAudio("stage3_100m", {
              title: "WakeStop — Get Off Now! (100 m)",
              body: "Destination under 100 m away! Step off vehicle immediately!",
              stage: "critical",
            });
            startAlarmVibration("critical");
            manuallyStopped.current = false;
            clearRepeatTimer();
            repeatTimer.current = window.setInterval(() => {
              triggerAudio("stage3_100m", {
                title: "WakeStop — Get Off Now! (100 m)",
                body: "Under 100 m! Step off vehicle immediately!",
                stage: "critical",
              });
              startAlarmVibration("critical");
            }, 12000);
          } else if (nextStage === "arrived") {
            notify(
              "✅ You've Arrived — WakeStop",
              "Journey completed safely. Welcome to your destination!",
              {
                tag: "wakestop-arrived",
                requireInteraction: true,
                vibrate: [400, 100, 400, 100, 400],
              }
            );
            triggerAudio("arrived", {
              title: "✅ WakeStop — You've Arrived!",
              body: "Journey completed safely. Welcome to your destination!",
              stage: "arrived",
            });
            startAlarmVibration("arrived");
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
    adaptiveInfo,
    activeThresholds,
    wakeResponseSec,
    batteryRisk,
    isBatteryCritical,
    triggerEarlyBatteryAlarm,
  };
}
