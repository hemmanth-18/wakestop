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

let activeAudioCtx = null;
let currentPlayingAudio = null;
let currentLoopTimer = null;
let currentTimeoutTimer = null;
let vibrationIntervalId = null;

/**
 * Laptop & Mobile Vibration Controller
 * - Mobile: Uses persistent repeating navigator.vibrate()
 * - Laptop/PC: Uses Gamepad Dual-Rumble API (if connected) AND triggers Visual Screen Rumble
 */
export function triggerContinuousVibration() {
  if (!getVibrationEnabled()) return;

  stopContinuousVibration();

  // 1. Mobile Vibration API Pattern
  if ("vibrate" in navigator) {
    try {
      navigator.vibrate([1000, 250, 1000, 250, 1000, 250]);
    } catch (e) {}
  }

  // 2. Laptop Gamepad Haptic Rumble API
  if ("getGamepads" in navigator) {
    try {
      const gamepads = navigator.getGamepads();
      for (const gp of gamepads) {
        if (gp && gp.vibrationActuator) {
          gp.vibrationActuator.playEffect("dual-rumble", {
            startDelay: 0,
            duration: 1800,
            weakMagnitude: 1.0,
            strongMagnitude: 1.0,
          });
        }
      }
    } catch (e) {}
  }

  // 3. Laptop Screen Vibration Animation
  if (typeof document !== "undefined" && document.body) {
    document.body.classList.add("laptop-vibrate-screen");
  }

  // Repeat vibration continuously
  vibrationIntervalId = setInterval(() => {
    if ("vibrate" in navigator) {
      try {
        navigator.vibrate([1000, 250, 1000, 250]);
      } catch (e) {}
    }
    if ("getGamepads" in navigator) {
      try {
        const gamepads = navigator.getGamepads();
        for (const gp of gamepads) {
          if (gp && gp.vibrationActuator) {
            gp.vibrationActuator.playEffect("dual-rumble", {
              startDelay: 0,
              duration: 1800,
              weakMagnitude: 1.0,
              strongMagnitude: 1.0,
            });
          }
        }
      } catch (e) {}
    }
  }, 1800);
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

/**
 * Plays the alarm preset continuously for at least 10 seconds (or minDurationMs),
 * boosting sound volume and triggering dual mobile + laptop vibration!
 */
export function playAlarmSound(preset = getSavedSoundPreset(), stageMultiplier = 1, minDurationMs = 10000) {
  stopAlarmSound();

  // Trigger persistent vibration (Mobile haptic + Laptop Gamepad + Laptop Screen Rumble)
  triggerContinuousVibration();

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
