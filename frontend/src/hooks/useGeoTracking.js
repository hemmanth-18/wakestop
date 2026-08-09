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
  fireSwAlarmTick,
} from "../utils/audio";
import { calculateDynamicEta, calculateAdaptiveThresholds } from "../utils/aiEngine";
import { getRealBatteryState, evaluateBatteryRisk } from "../utils/batteryPredictor";
import {
  startBackgroundAudioKeepAlive,
  stopBackgroundAudioKeepAlive,
  playOnBackgroundAudioElement,
} from "../utils/backgroundKeepAlive";


function triggerAudio(stage, notifOptions = {}) {
  const mult = stage === "stage3_100m" || stage === "critical" ? 1.6 : stage === "stage2_500m" ? 1.3 : 1.0;
  playAlarmSound(getSavedSoundPreset(), mult, 10000, { stage, ...notifOptions });
  // Simultaneously switch the background audio element (OS media session) to an alarm beep.
  // This is the ONLY audio path that works when screen is off or app is backgrounded,
  // because the backgroundAudioElement already has OS hardware audio session privileges.
  playOnBackgroundAudioElement(); // defaults to generated 880 Hz beep in backgroundKeepAlive.js
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

  // ── Bug Fix: thresholdsRef keeps the watchPosition callback always reading the
  // LATEST adaptive thresholds, even though the geolocation effect runs only once.
  // Without this, the callback closes over the initial value (speed=0 → 1 km)
  // and never sees the updated 1.6 km highway threshold.
  const thresholdsRef = useRef(activeThresholds);
  useEffect(() => {
    thresholdsRef.current = activeThresholds;
  });

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
    // Start background audio keep-alive + Web Worker ticker for continuous screen-off GPS tracking
    startBackgroundAudioKeepAlive(() => {
      // ── Throttle-proof SW notification re-fire ──────────────────────────────
      // Web Workers are NOT throttled by the OS in background (unlike main thread setInterval).
      // This fires the SW alarm notification every 3s even when the user is in Instagram.
      fireSwAlarmTick();

      // Also refresh GPS position on each worker tick
      if (destination && "geolocation" in navigator) {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            if (pos?.coords) {
              setPosition(pos.coords);
              const d = distanceMetres(pos.coords.latitude, pos.coords.longitude, destination.lat, destination.lng);
              setDistance(d);
            }
          },
          () => {},
          { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
        );
      }
    });

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
  }, [destination]);

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
    if (!destination) return;

    unlockAudioContext();
    requestNotificationPermission();

    let capWatchCallbackId = null;

    const processPosition = (coords, timestamp) => {
      if (!coords) return;
      const point = {
        lat: coords.latitude,
        lng: coords.longitude,
        speed: coords.speed,
        timestamp: timestamp || Date.now(),
      };

      const speedKmh = coords.speed != null && coords.speed >= 0 ? coords.speed * 3.6 : 0;
      setCurrentSpeedKmh(speedKmh);

      setPosition(coords);
      setPositionHistory((prev) => [...prev.slice(-25), point]);

      const d = distanceMetres(coords.latitude, coords.longitude, destination.lat, destination.lng);
      setDistance(d);

      const t = thresholdsRef.current; // always read latest speed-adaptive thresholds
      let nextStage = stage;

      if (manuallyStopped.current) {
        nextStage = d <= t.arrivedM ? "arrived" : "stopped";
      } else if (isBatteryCritical) {
        nextStage = d <= t.arrivedM ? "arrived" : "stage3_100m";
      } else if (d <= t.arrivedM) {
        nextStage = "arrived";
      } else if (d <= t.stage3_100m) {
        nextStage = "stage3_100m";
      } else if (d <= t.stage2_500m) {
        nextStage = "stage2_500m";
      } else if (d <= t.stage1_1km) {
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
    };

    async function startWatch() {
      if (window.Capacitor?.isNativePlatform()) {
        try {
          const { Geolocation } = await import("@capacitor/geolocation");
          await Geolocation.requestPermissions();
          capWatchCallbackId = await Geolocation.watchPosition(
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
            (pos) => {
              if (pos?.coords) {
                processPosition(pos.coords, pos.timestamp);
              }
            }
          );
          return;
        } catch (e) {
          console.warn("Capacitor native Geolocation fallback to navigator:", e?.message);
        }
      }

      if ("geolocation" in navigator) {
        watchId.current = navigator.geolocation.watchPosition(
          (pos) => processPosition(pos.coords, pos.timestamp),
          (err) => setError(err.message),
          { enableHighAccuracy: true, maximumAge: 0, timeout: 15000 }
        );
      } else {
        setError("Geolocation is not supported on this device/browser.");
      }
    }

    startWatch();

    return () => {
      if (capWatchCallbackId !== null) {
        import("@capacitor/geolocation").then(({ Geolocation }) => {
          Geolocation.clearWatch({ id: capWatchCallbackId }).catch(() => {});
        }).catch(() => {});
      }
      if (watchId.current !== null && "geolocation" in navigator) {
        navigator.geolocation.clearWatch(watchId.current);
      }
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
