export const PREDEFINED_SOUND_OPTIONS = [
  {
    id: "cyber_siren",
    name: "Cyber Siren",
    description: "High-tech escalating pitch slide alert (High Volume Boost)",
    isCustom: false,
  },
  {
    id: "digital_pulse",
    name: "Digital Pulse",
    description: "Rapid energetic beep pulse sequence (High Volume Boost)",
    isCustom: false,
  },
  {
    id: "synth_horn",
    name: "Cyber Synth Horn",
    description: "Rich brass chord synth warning (High Volume Boost)",
    isCustom: false,
  },
  {
    id: "radar_beep",
    name: "Radar Beep",
    description: "Deep sonar pulse with lingering echo (High Volume Boost)",
    isCustom: false,
  },
  {
    id: "thunder_alert",
    name: "Heavy Thunder Alert",
    description: "Sub-bass rumble paired with sharp alert chime (High Volume Boost)",
    isCustom: false,
  },
];

export const SOUND_OPTIONS = PREDEFINED_SOUND_OPTIONS;

export function getCustomAlarms() {
  try {
    const raw = localStorage.getItem("wakestop_custom_alarms");
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

export function saveCustomAlarm(name, dataUrl) {
  const alarms = getCustomAlarms();
  const newAlarm = {
    id: `custom_${Date.now()}`,
    name: name || "Custom Local Ringtone",
    description: "User uploaded local audio file (High Volume Boost)",
    dataUrl,
    isCustom: true,
  };
  alarms.push(newAlarm);
  try {
    localStorage.setItem("wakestop_custom_alarms", JSON.stringify(alarms));
  } catch (e) {
    console.warn("Storage quota limit reached for custom audio:", e);
  }
  return newAlarm;
}

export function deleteCustomAlarm(id) {
  const alarms = getCustomAlarms().filter((a) => a.id !== id);
  try {
    localStorage.setItem("wakestop_custom_alarms", JSON.stringify(alarms));
  } catch (e) {}
  if (getSavedSoundPreset() === id) {
    saveSoundPreset("cyber_siren");
  }
}

export function getAllSoundOptions() {
  return [...PREDEFINED_SOUND_OPTIONS, ...getCustomAlarms()];
}

export function getSavedSoundPreset() {
  const saved = localStorage.getItem("wakestop_sound_preset");
  const all = getAllSoundOptions();
  if (saved && all.some((opt) => opt.id === saved)) {
    return saved;
  }
  return "cyber_siren";
}

export function saveSoundPreset(preset) {
  localStorage.setItem("wakestop_sound_preset", preset);
}

export function getVibrationEnabled() {
  const saved = localStorage.getItem("wakestop_vibrate_enabled");
  return saved === null ? true : saved === "true";
}

export function saveVibrationEnabled(enabled) {
  localStorage.setItem("wakestop_vibrate_enabled", String(enabled));
}

// ─── Service Worker Registration ────────────────────────────────────────────

let swRegistration = null;

/**
 * Register the WakeStop Service Worker for background alarm notifications.
 * Call once on app startup (e.g. in main.jsx or App.jsx).
 */
export async function registerAlarmServiceWorker() {
  if (!("serviceWorker" in navigator)) return;
  try {
    swRegistration = await navigator.serviceWorker.register("/sw.js", { scope: "/" });

    // Listen for messages back from the SW (Acknowledge / Snooze actions)
    navigator.serviceWorker.addEventListener("message", (event) => {
      if (!event.data) return;
      if (event.data.type === "ALARM_ACKNOWLEDGED") {
        stopAlarmSound();
        // Dispatch a custom DOM event so React components can react
        window.dispatchEvent(new CustomEvent("wakestop:alarm:acknowledged"));
      }
      if (event.data.type === "ALARM_SNOOZED") {
        stopAlarmSound();
        window.dispatchEvent(
          new CustomEvent("wakestop:alarm:snoozed", { detail: { snoozeMs: event.data.snoozeMs } })
        );
      }
    });
  } catch (e) {
    console.warn("WakeStop SW registration failed:", e);
  }
}

/**
 * Request notification permission on first user interaction.
 * Call this after any user gesture (button click, etc.)
 */
export async function requestNotificationPermission() {
  if (!("Notification" in window)) return "denied";
  if (Notification.permission === "granted") return "granted";
  if (Notification.permission === "denied") return "denied";
  try {
    const result = await Notification.requestPermission();
    return result;
  } catch (e) {
    return "denied";
  }
}

// ─── SW Alarm Notification Loop ─────────────────────────────────────────────
// KEY FIX: fire SW notification repeatedly every 3 seconds.
// Each notification plays the system notification sound on the NOTIFICATION
// VOLUME channel — completely separate from media volume.
// Even with media volume = 0, this keeps ringing until the user dismisses.

let swAlarmIntervalId = null;

function _postToSw(type, payload = {}) {
  if (!("serviceWorker" in navigator)) return;
  navigator.serviceWorker.ready
    .then((reg) => {
      if (reg && reg.active) reg.active.postMessage({ type, ...payload });
    })
    .catch(() => {});
}

/**
 * Start looping alarm notifications through the Service Worker.
 * The SW fires showNotification() on each call → system plays notification
 * sound on NOTIFICATION VOLUME (bypasses media volume entirely).
 *
 * @param {string} title
 * @param {string} body
 * @param {string} stage  - "alarm" | "critical"
 * @param {number} intervalMs - how often to re-ring (default 3000ms)
 */
function startSwAlarmLoop(title, body, stage, intervalMs = 3000) {
  // Stop any previous loop first
  stopSwAlarmLoop();

  const fire = () => _postToSw("TRIGGER_ALARM_NOTIFICATION", { title, body, stage });

  // Fire immediately
  fire();

  // Then keep firing every intervalMs — each call re-rings the system sound
  swAlarmIntervalId = setInterval(fire, intervalMs);
}

/**
 * Stop the SW alarm notification loop and dismiss existing notification.
 */
function stopSwAlarmLoop() {
  if (swAlarmIntervalId) {
    clearInterval(swAlarmIntervalId);
    swAlarmIntervalId = null;
  }
  _postToSw("DISMISS_ALARM_NOTIFICATION");
}

// ─── Audio Context Unlock (for iOS / Android Chrome) ────────────────────────

let audioCtxUnlocked = false;
let activeAudioCtx = null;

/**
 * Must be called inside a user gesture (tap/click) to unlock Web Audio on mobile.
 * Call once in your app's main "Start Tracking" button handler.
 */
export function unlockAudioContext() {
  if (audioCtxUnlocked) return;
  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;
    if (!activeAudioCtx || activeAudioCtx.state === "closed") {
      activeAudioCtx = new AudioContextClass();
    }
    // Play a silent buffer to unlock
    const buffer = activeAudioCtx.createBuffer(1, 1, 22050);
    const source = activeAudioCtx.createBufferSource();
    source.buffer = buffer;
    source.connect(activeAudioCtx.destination);
    source.start(0);
    source.onended = () => {
      audioCtxUnlocked = true;
    };
    if (activeAudioCtx.state === "suspended") {
      activeAudioCtx.resume();
    }
  } catch (e) {
    // Silently fail — Web Audio unlock is best-effort
  }
}

// ─── Vibration Controller ────────────────────────────────────────────────────

let currentPlayingAudio = null;
let currentLoopTimer = null;
let currentTimeoutTimer = null;
let vibrationIntervalId = null;

/**
 * Mobile & Laptop Vibration Controller
 *
 * FIX: Pattern duration MUST equal the setInterval period.
 * If interval < pattern duration → vibrate() cancels the ongoing
 * vibration mid-burst → choppy, weak, stuttering effect.
 *
 * PATTERN DESIGN:
 *   [300, 100, 300, 100, 300, 100, 300, 100, 300, 100] = 2000ms exactly
 *   interval = 2000ms → zero gap, zero overlap → seamless loop.
 *   Short rapid bursts (300ms) are physically felt STRONGER than
 *   long continuous rumbles (1000ms) because the motor accelerates
 *   from 0 each burst, producing peak force.
 */

// Pattern total = 300+100+300+100+300+100+300+100+300+100 = 2000ms
const VIBRATE_PATTERN      = [300, 100, 300, 100, 300, 100, 300, 100, 300, 100];
const VIBRATE_INTERVAL_MS  = 2000; // must equal sum of VIBRATE_PATTERN

export function triggerContinuousVibration() {
  if (!getVibrationEnabled()) return;

  stopContinuousVibration();

  // ── 1. Mobile vibration (navigator.vibrate) ──────────────────────────────
  if ("vibrate" in navigator) {
    try { navigator.vibrate(VIBRATE_PATTERN); } catch (e) {}
  }

  // ── 2. Laptop gamepad haptic rumble ──────────────────────────────────────
  function rumbleGamepads() {
    if (!("getGamepads" in navigator)) return;
    try {
      for (const gp of navigator.getGamepads()) {
        if (gp?.vibrationActuator) {
          gp.vibrationActuator.playEffect("dual-rumble", {
            startDelay: 0,
            duration: VIBRATE_INTERVAL_MS,
            weakMagnitude: 1.0,
            strongMagnitude: 1.0,
          });
        }
      }
    } catch (e) {}
  }
  rumbleGamepads();

  // ── 3. Laptop screen shake animation ─────────────────────────────────────
  if (typeof document !== "undefined" && document.body) {
    document.body.classList.add("laptop-vibrate-screen");
  }

  // ── 4. Seamless loop — interval == pattern duration, no gaps, no cancels ─
  vibrationIntervalId = setInterval(() => {
    if ("vibrate" in navigator) {
      try { navigator.vibrate(VIBRATE_PATTERN); } catch (e) {}
    }
    rumbleGamepads();
  }, VIBRATE_INTERVAL_MS);
}

export function stopContinuousVibration() {
  if (vibrationIntervalId) {
    clearInterval(vibrationIntervalId);
    vibrationIntervalId = null;
  }
  if ("vibrate" in navigator) {
    try {
      navigator.vibrate(0);
    } catch (e) {}
  }
  if (typeof document !== "undefined" && document.body) {
    document.body.classList.remove("laptop-vibrate-screen");
  }
}

export function stopAlarmSound() {
  stopContinuousVibration();
  // Stop the repeating SW notification loop
  stopSwAlarmLoop();

  if (currentLoopTimer) {
    clearInterval(currentLoopTimer);
    currentLoopTimer = null;
  }
  if (currentTimeoutTimer) {
    clearTimeout(currentTimeoutTimer);
    currentTimeoutTimer = null;
  }
  if (currentPlayingAudio) {
    try {
      currentPlayingAudio.pause();
      currentPlayingAudio.currentTime = 0;
    } catch (e) {}
    currentPlayingAudio = null;
  }
}

// ─── Web Audio Tone Engine ───────────────────────────────────────────────────

function playSingleToneBurst(preset, stageMultiplier = 1) {
  try {
    if (!activeAudioCtx || activeAudioCtx.state === "closed") {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      activeAudioCtx = new AudioContextClass();
    }
    const ctx = activeAudioCtx;
    if (ctx.state === "suspended") {
      ctx.resume();
    }

    const now = ctx.currentTime;

    // Master Volume Boost & Dynamics Compressor to maximize loudness over low volume settings
    const compressor = ctx.createDynamicsCompressor();
    compressor.threshold.setValueAtTime(-24, now);
    compressor.knee.setValueAtTime(30, now);
    compressor.ratio.setValueAtTime(12, now);
    compressor.attack.setValueAtTime(0.003, now);
    compressor.release.setValueAtTime(0.25, now);

    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(2.5, now); // +250% High Gain Volume Booster

    compressor.connect(masterGain);
    masterGain.connect(ctx.destination);

    if (preset === "cyber_siren") {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sawtooth";
      osc.connect(gain);
      gain.connect(compressor);

      const baseFreq = 440 * stageMultiplier;
      osc.frequency.setValueAtTime(baseFreq, now);
      osc.frequency.exponentialRampToValueAtTime(baseFreq * 2, now + 0.5);

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.exponentialRampToValueAtTime(0.5, now + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.55);

      osc.start(now);
      osc.stop(now + 0.6);
    } else if (preset === "digital_pulse") {
      const freqs = [660, 880, 1100, 1320];
      freqs.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "square";
        osc.frequency.value = freq * stageMultiplier;

        osc.connect(gain);
        gain.connect(compressor);

        const startTime = now + idx * 0.1;
        gain.gain.setValueAtTime(0.001, startTime);
        gain.gain.exponentialRampToValueAtTime(0.4, startTime + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.08);

        osc.start(startTime);
        osc.stop(startTime + 0.09);
      });
    } else if (preset === "synth_horn") {
      const chord = [220, 330, 440, 554.37];
      chord.forEach((freq) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sawtooth";
        osc.frequency.value = freq * stageMultiplier;

        osc.connect(gain);
        gain.connect(compressor);

        gain.gain.setValueAtTime(0.001, now);
        gain.gain.exponentialRampToValueAtTime(0.3, now + 0.08);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);

        osc.start(now);
        osc.stop(now + 0.65);
      });
    } else if (preset === "radar_beep") {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = 1046.5 * stageMultiplier;

      osc.connect(gain);
      gain.connect(compressor);

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.exponentialRampToValueAtTime(0.6, now + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.7);

      osc.start(now);
      osc.stop(now + 0.75);
    } else if (preset === "thunder_alert") {
      const subOsc = ctx.createOscillator();
      const subGain = ctx.createGain();
      subOsc.type = "triangle";
      subOsc.frequency.setValueAtTime(80, now);
      subOsc.frequency.exponentialRampToValueAtTime(40, now + 0.7);
      subOsc.connect(subGain);
      subGain.connect(compressor);

      subGain.gain.setValueAtTime(0.001, now);
      subGain.gain.exponentialRampToValueAtTime(0.6, now + 0.05);
      subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.7);

      subOsc.start(now);
      subOsc.stop(now + 0.75);

      const chimeOsc = ctx.createOscillator();
      const chimeGain = ctx.createGain();
      chimeOsc.type = "sine";
      chimeOsc.frequency.value = 1760 * stageMultiplier;
      chimeOsc.connect(chimeGain);
      chimeGain.connect(compressor);

      chimeGain.gain.setValueAtTime(0.001, now + 0.1);
      chimeGain.gain.exponentialRampToValueAtTime(0.4, now + 0.15);
      chimeGain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);

      chimeOsc.start(now + 0.1);
      chimeOsc.stop(now + 0.55);
    }
  } catch (e) {
    console.warn("Web Audio tone play error:", e);
  }
}

// ─── Main Alarm Entry Points ─────────────────────────────────────────────────

/**
 * Plays the alarm preset continuously for at least 10 seconds (or minDurationMs).
 *
 * TWO SIMULTANEOUS CHANNELS:
 *  1. Web Audio API (in-app audio, boosted with compressor + gain)
 *  2. Service Worker Notification (system ringtone channel — works even when volume is 0)
 *
 * Also triggers dual mobile + laptop vibration.
 *
 * @param {string}  preset        - Sound preset ID
 * @param {number}  stageMultiplier - Frequency multiplier for escalating alarm
 * @param {number}  minDurationMs  - Minimum alarm duration in milliseconds
 * @param {object}  notifOptions   - Optional: { title, body, stage } for the SW notification
 */
export function playAlarmSound(
  preset = getSavedSoundPreset(),
  stageMultiplier = 1,
  minDurationMs = 10000,
  notifOptions = {}
) {
  stopAlarmSound();

  // ── Layer 1: Persistent Vibration (Mobile haptic + Laptop Gamepad + Screen Rumble) ──
  triggerContinuousVibration();

  // ── Layer 2: SW Notification Loop (NOTIFICATION VOLUME — bypasses media volume) ──────
  // We fire a new notification every 3 seconds. Each one plays the system notification
  // sound through the NOTIFICATION channel, not media. This is how the alarm keeps
  // ringing even when media/music volume is fully muted — exactly like FindHub / Maps.
  const stage = notifOptions.stage || "alarm";
  const isCritical = stage === "critical";
  startSwAlarmLoop(
    notifOptions.title || (isCritical ? "🚨 Wake Up Now! — WakeStop" : "⏰ WakeStop Alarm!"),
    notifOptions.body ||
      (isCritical
        ? "Your destination is immediately approaching! Step off now!"
        : "You're approaching your stop. Wake up and get ready!"),
    stage,
    3000  // re-ring every 3 seconds on notification volume
  );

  // ── Layer 3: Web Audio API (in-app, boosted volume) ─────────────────────────────────
  const customAlarms = getCustomAlarms();
  const customObj = customAlarms.find((a) => a.id === preset);

  if (customObj && customObj.dataUrl) {
    try {
      const audio = new Audio(customObj.dataUrl);
      audio.loop = true;
      audio.volume = 1.0; // Max volume
      currentPlayingAudio = audio;
      audio.play().catch((e) => console.warn("Custom audio play error:", e));

      currentTimeoutTimer = setTimeout(() => {
        stopAlarmSound();
      }, minDurationMs);
    } catch (e) {
      console.warn("Custom audio playback failed:", e);
    }
    return;
  }

  // Predefined alarm: ring continuously in a loop for at least minDurationMs (10s min)
  playSingleToneBurst(preset, stageMultiplier);
  const intervalMs = preset === "digital_pulse" ? 500 : 700;

  currentLoopTimer = setInterval(() => {
    playSingleToneBurst(preset, stageMultiplier);
  }, intervalMs);

  currentTimeoutTimer = setTimeout(() => {
    stopAlarmSound();
  }, minDurationMs);
}

/**
 * Triggers maximum intensity alarm tone for critical battery alert.
 */
export function playEarlyBatteryAlarm(preset = getSavedSoundPreset()) {
  playAlarmSound(preset, 2.0, 15000, {
    title: "⚡ Battery Critical — WakeStop Alarm!",
    body: "Battery critically low! Alarm triggered early to prevent missing your stop.",
    stage: "critical",
  });
}
