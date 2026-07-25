import { useCallback, useEffect, useRef, useState } from "react";
import { distanceMetres } from "../utils/geo";
import { playAlarmSound, getSavedSoundPreset, getVibrationEnabled } from "../utils/audio";

export type AlarmStage = "idle" | "notify" | "alarm" | "critical" | "arrived" | "stopped";

interface Destination {
  lat: number;
  lng: number;
}

interface Thresholds {
  notifyM: number;
  alarmM: number;
  criticalM: number;
  arrivedM: number;
}

const DEFAULT_THRESHOLDS: Thresholds = {
  notifyM: 2000,
  alarmM: 1000,
  criticalM: 500,
  arrivedM: 120,
};

function triggerAudio(stage: AlarmStage) {
  const mult = stage === "critical" ? 1.5 : stage === "alarm" ? 1.2 : 1.0;
  playAlarmSound(getSavedSoundPreset(), mult);
}

function vibrate(pattern: number | number[]) {
  if (getVibrationEnabled() && "vibrate" in navigator) {
    navigator.vibrate(pattern);
  }
}

function notify(title: string, body: string) {
  if (!("Notification" in window)) return;
  if (Notification.permission === "granted") {
    new Notification(title, { body });
  }
}

export function useGeoTracking(destination: Destination | null, thresholds: Thresholds = DEFAULT_THRESHOLDS) {
  const [position, setPosition] = useState<GeolocationCoordinates | null>(null);
  const [distance, setDistance] = useState<number | null>(null);
  const [stage, setStage] = useState<AlarmStage>("idle");
  const [error, setError] = useState<string | null>(null);
  const watchId = useRef<number | null>(null);
  const repeatTimer = useRef<number | null>(null);
  const wakeLockRef = useRef<any>(null);
  const lastStage = useRef<AlarmStage>("idle");
  const manuallyStopped = useRef(false);

  const clearRepeatTimer = () => {
    if (repeatTimer.current) {
      window.clearInterval(repeatTimer.current);
      repeatTimer.current = null;
    }
  };

  const acknowledge = useCallback(() => {
    manuallyStopped.current = true;
    setStage("stopped");
    clearRepeatTimer();
  }, []);

  // Screen Wake Lock API to prevent mobile sleep while tracking
  useEffect(() => {
    if ("wakeLock" in navigator) {
      navigator.wakeLock
        .request("screen")
        .then((lock: any) => {
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
        setPosition(pos.coords);
        const d = distanceMetres(pos.coords.latitude, pos.coords.longitude, destination.lat, destination.lng);
        setDistance(d);

        let nextStage: AlarmStage = stage;
        if (manuallyStopped.current) {
          nextStage = d <= thresholds.arrivedM ? "arrived" : "stopped";
        } else if (d <= thresholds.arrivedM) {
          nextStage = "arrived";
        } else if (d <= thresholds.criticalM) {
          nextStage = "critical";
        } else if (d <= thresholds.alarmM) {
          nextStage = "alarm";
        } else if (d <= thresholds.notifyM) {
          nextStage = "notify";
        } else {
          nextStage = "idle";
        }

        if (nextStage !== lastStage.current) {
          lastStage.current = nextStage;
          setStage(nextStage);
          if (nextStage === "notify") {
            notify("Getting close", "Your destination is about 2 km away.");
            triggerAudio(nextStage);
          } else if (nextStage === "alarm") {
            notify("Wake up!", "Your destination is about 1 km away.");
            triggerAudio(nextStage);
            vibrate([300, 150, 300]);
          } else if (nextStage === "critical") {
            notify("Almost there!", "Your destination is under 500 m away. Get ready to get off.");
            triggerAudio(nextStage);
            vibrate([400, 100, 400, 100, 400]);
            manuallyStopped.current = false;
            clearRepeatTimer();
            repeatTimer.current = window.setInterval(() => {
              triggerAudio("critical");
              vibrate([400, 100, 400]);
            }, 15000);
          } else if (nextStage === "arrived") {
            notify("You've arrived", "Journey completed. The alarm has stopped.");
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
  }, [destination?.lat, destination?.lng]);

  return { position, distance, stage, error, acknowledge };
}

