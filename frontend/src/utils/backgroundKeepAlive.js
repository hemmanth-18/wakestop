/**
 * Background Keep-Alive Controller for Screen-Off & Lock-Screen Alarm Playback.
 * Uses a silent HTML5 Audio element + MediaSession API + Web Worker timer.
 */

const SILENT_WAV_BASE64 =
  "data:audio/wav;base64,UklGRigAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQQAAAAAAA==";

let backgroundAudioElement = null;
let trackingWorker = null;
let isKeepAliveActive = false;

/**
 * Initializes and starts silent background audio loop and media session.
 * Call when GPS tracking starts.
 */
export function startBackgroundAudioKeepAlive(onTickCallback = null) {
  if (typeof window === "undefined") return;

  try {
    // 1. Silent HTML5 Audio Element
    if (!backgroundAudioElement) {
      backgroundAudioElement = new Audio(SILENT_WAV_BASE64);
      backgroundAudioElement.loop = true;
      backgroundAudioElement.volume = 0.01; // minimal volume to keep audio hardware active
      backgroundAudioElement.setAttribute("playsinline", "true");
    }

    backgroundAudioElement
      .play()
      .then(() => {
        isKeepAliveActive = true;
      })
      .catch((e) => {
        console.warn("Silent audio keep-alive auto-play prevented:", e?.message);
      });

    // 2. Setup MediaSession API for OS level background media status
    if ("mediaSession" in navigator) {
      try {
        navigator.mediaSession.metadata = new MediaMetadata({
          title: "WakeStop Active Journey Tracking",
          artist: "WakeStop GPS Alarm System",
          album: "GPS Alarm Active",
          artwork: [
            { src: "/logo.png", sizes: "512x512", type: "image/png" },
          ],
        });

        // Dummy handlers to keep session active
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

    // 3. Web Worker for background interval fallback
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
  } catch (e) {
    console.warn("Background keep-alive init exception:", e?.message);
  }
}

/**
 * Plays an alarm sound directly using the active background audio element.
 * Works even when screen is locked because backgroundAudioElement is already active in OS media session.
 */
export function playOnBackgroundAudioElement(audioSrcUrl) {
  if (!backgroundAudioElement) return false;

  try {
    backgroundAudioElement.pause();
    backgroundAudioElement.src = audioSrcUrl || SILENT_WAV_BASE64;
    backgroundAudioElement.loop = true;
    backgroundAudioElement.volume = 1.0; // Boost to maximum
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
    backgroundAudioElement.volume = 0.01;
    if (isKeepAliveActive) {
      backgroundAudioElement.play().catch(() => {});
    }
  } catch (e) {}
}

/**
 * Stops background keep-alive audio and worker.
 * Call when tracking ends or trip is acknowledged.
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

  if ("mediaSession" in navigator) {
    try {
      navigator.mediaSession.metadata = null;
    } catch (_) {}
  }
}
