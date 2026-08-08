/**
 * Background Keep-Alive Controller for Screen-Off & Lock-Screen Alarm Playback.
 * Uses a silent HTML5 Audio element + MediaSession API + Web Worker timer + WakeLock API.
 */

const SILENT_WAV_BASE64 =
  "data:audio/wav;base64,UklGRigAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQQAAAAAAA==";

// Generates a 440 Hz sine wave beep WAV as a Blob URL.
// Used as the alarm sound played through the backgroundAudioElement (screen-off safe).
function generateAlarmBeepBlobUrl(durationSeconds = 0.5, frequency = 880) {
  try {
    const sampleRate = 22050;
    const numSamples = Math.floor(sampleRate * durationSeconds);
    const buffer = new ArrayBuffer(44 + numSamples * 2);
    const view = new DataView(buffer);

    // WAV header
    const writeStr = (offset, str) => { for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i)); };
    writeStr(0, 'RIFF');
    view.setUint32(4, 36 + numSamples * 2, true);
    writeStr(8, 'WAVE');
    writeStr(12, 'fmt ');
    view.setUint32(16, 16, true);      // chunk size
    view.setUint16(20, 1, true);       // PCM
    view.setUint16(22, 1, true);       // mono
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 2, true);
    view.setUint16(32, 2, true);       // block align
    view.setUint16(34, 16, true);      // bits per sample
    writeStr(36, 'data');
    view.setUint32(40, numSamples * 2, true);

    // PCM samples: fast attack, slight fade-out envelope for a sharp alarm beep
    for (let i = 0; i < numSamples; i++) {
      const t = i / sampleRate;
      const envelope = Math.min(1, (i / (sampleRate * 0.01))) * // 10ms attack
                       Math.max(0, 1 - (i / (numSamples * 0.8))); // 20% fade-out at end
      const sample = Math.sin(2 * Math.PI * frequency * t) * 0.9 * envelope;
      view.setInt16(44 + i * 2, Math.round(sample * 32767), true);
    }

    const blob = new Blob([buffer], { type: 'audio/wav' });
    return URL.createObjectURL(blob);
  } catch (e) {
    return null;
  }
}

let cachedAlarmBeepUrl = null;

function getAlarmBeepUrl() {
  if (!cachedAlarmBeepUrl) {
    cachedAlarmBeepUrl = generateAlarmBeepBlobUrl(0.4, 880);
  }
  return cachedAlarmBeepUrl;
}

let backgroundAudioElement = null;
let trackingWorker = null;
let isKeepAliveActive = false;
let wakeLockInstance = null;

/**
 * Request all mobile permissions (Notifications + WakeLock + Audio unlock).
 * Call inside user click gesture.
 */
export async function requestAllMobilePermissions() {
  if (typeof window === "undefined") return "denied";

  let notifStatus = "granted";
  if ("Notification" in window && Notification.permission !== "granted") {
    try {
      notifStatus = await Notification.requestPermission();
    } catch (e) {
      notifStatus = "denied";
    }
  }

  if ("wakeLock" in navigator && !wakeLockInstance) {
    try {
      wakeLockInstance = await navigator.wakeLock.request("screen");
      wakeLockInstance.addEventListener("release", () => {
        wakeLockInstance = null;
      });
    } catch (e) {}
  }

  return notifStatus;
}

/**
 * Initializes and starts silent background audio loop and media session.
 * MUST be invoked directly within a user click gesture (e.g. Activate Alarm click).
 */
export function startBackgroundAudioKeepAlive(onTickCallback = null) {
  if (typeof window === "undefined") return;

  try {
    // 1. Initialize HTML5 Audio Element with playsinline
    if (!backgroundAudioElement) {
      backgroundAudioElement = new Audio(SILENT_WAV_BASE64);
      backgroundAudioElement.loop = true;
      backgroundAudioElement.volume = 0.05; // minimal volume to keep mobile hardware sound card active
      backgroundAudioElement.setAttribute("playsinline", "true");
      backgroundAudioElement.setAttribute("webkit-playsinline", "true");
    }

    const playPromise = backgroundAudioElement.play();
    if (playPromise) {
      playPromise
        .then(() => {
          isKeepAliveActive = true;
          console.log("⚡ Mobile silent background audio keep-alive active");
        })
        .catch((e) => {
          console.warn("Silent audio keep-alive auto-play prevented:", e?.message);
        });
    }

    // 2. Setup OS level MediaSession API (Forces mobile OS to treat PWA as active background media player)
    if ("mediaSession" in navigator) {
      try {
        navigator.mediaSession.metadata = new MediaMetadata({
          title: "WakeStop Screen-Off GPS Tracking Active",
          artist: "WakeStop Background Alarm Engine",
          album: "GPS Alarm Active",
          artwork: [
            { src: "/pwa-512x512.png", sizes: "512x512", type: "image/png" },
            { src: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
          ],
        });

        navigator.mediaSession.playbackState = "playing";

        const dummyAction = () => {};
        ["play", "pause", "stop", "previoustrack", "nexttrack"].forEach((action) => {
          try {
            navigator.mediaSession.setActionHandler(action, dummyAction);
          } catch (_) {}
        });
      } catch (err) {
        console.warn("MediaSession setup warning:", err?.message);
      }
    }

    // 3. Web Worker for background interval fallback during screen-off state
    if (onTickCallback && typeof Worker !== "undefined" && !trackingWorker) {
      try {
        trackingWorker = new Worker(
          new URL("./trackingWorker.js", import.meta.url),
          { type: "module" }
        );
        trackingWorker.onmessage = (event) => {
          if (event.data?.type === "TICK") {
            onTickCallback();
          }
        };
        trackingWorker.postMessage({ action: "START", interval: 3000 });
      } catch (err) {
        console.warn("Web Worker creation fallback:", err?.message);
      }
    }

    // 4. Request Screen WakeLock
    if ("wakeLock" in navigator && !wakeLockInstance) {
      navigator.wakeLock.request("screen").then((lock) => {
        wakeLockInstance = lock;
      }).catch(() => {});
    }
  } catch (e) {
    console.warn("Background keep-alive init exception:", e?.message);
  }
}

/**
 * Plays an alarm sound directly using the active background audio element.
 * Works when screen is locked because backgroundAudioElement is already active in OS media session.
 * @param {string|null} audioSrcUrl - URL to play. Defaults to generated alarm beep.
 */
export function playOnBackgroundAudioElement(audioSrcUrl) {
  if (!backgroundAudioElement) return false;

  const src = audioSrcUrl || getAlarmBeepUrl() || SILENT_WAV_BASE64;

  try {
    backgroundAudioElement.pause();
    backgroundAudioElement.src = src;
    backgroundAudioElement.loop = true;
    backgroundAudioElement.volume = 1.0; // Boost volume to 100%
    const playPromise = backgroundAudioElement.play();
    if (playPromise) {
      playPromise.catch((err) => {
        console.warn("Background audio element play error:", err?.message);
      });
    }
    return true;
  } catch (e) {
    return false;
  }
}

/**
 * Resets the background audio back to silent keep-alive mode.
 */
export function resetBackgroundAudioToSilent() {
  if (!backgroundAudioElement) return;

  try {
    backgroundAudioElement.pause();
    backgroundAudioElement.src = SILENT_WAV_BASE64;
    backgroundAudioElement.loop = true;
    backgroundAudioElement.volume = 0.05;
    if (isKeepAliveActive) {
      backgroundAudioElement.play().catch(() => {});
    }
  } catch (e) {}
}

/**
 * Stops background keep-alive audio, worker, and wake lock.
 */
export function stopBackgroundAudioKeepAlive() {
  isKeepAliveActive = false;

  if (backgroundAudioElement) {
    try {
      backgroundAudioElement.pause();
      backgroundAudioElement.currentTime = 0;
    } catch (_) {}
    backgroundAudioElement = null;
  }

  if (trackingWorker) {
    try {
      trackingWorker.postMessage({ action: "STOP" });
      trackingWorker.terminate();
    } catch (_) {}
    trackingWorker = null;
  }

  if (wakeLockInstance) {
    try {
      wakeLockInstance.release();
    } catch (_) {}
    wakeLockInstance = null;
  }

  if ("mediaSession" in navigator) {
    try {
      navigator.mediaSession.metadata = null;
      navigator.mediaSession.playbackState = "none";
    } catch (_) {}
  }
}
