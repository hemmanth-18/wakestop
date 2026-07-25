export type SoundPreset =
  | "cyber_siren"
  | "digital_pulse"
  | "synth_horn"
  | "radar_beep"
  | "thunder_alert";

export interface SoundOption {
  id: SoundPreset;
  name: string;
  description: string;
}

export const SOUND_OPTIONS: SoundOption[] = [
  {
    id: "cyber_siren",
    name: "Cyber Siren",
    description: "High-tech escalating pitch slide alert",
  },
  {
    id: "digital_pulse",
    name: "Digital Pulse",
    description: "Rapid energetic beep pulse sequence",
  },
  {
    id: "synth_horn",
    name: "Cyber Synth Horn",
    description: "Rich brass chord synth warning",
  },
  {
    id: "radar_beep",
    name: "Radar Beep",
    description: "Deep sonar pulse with lingering echo",
  },
  {
    id: "thunder_alert",
    name: "Heavy Thunder Alert",
    description: "Sub-bass rumble paired with sharp alert chime",
  },
];

export function getSavedSoundPreset(): SoundPreset {
  const saved = localStorage.getItem("wakestop_sound_preset");
  if (saved && SOUND_OPTIONS.some((opt) => opt.id === saved)) {
    return saved as SoundPreset;
  }
  return "cyber_siren";
}

export function saveSoundPreset(preset: SoundPreset) {
  localStorage.setItem("wakestop_sound_preset", preset);
}

export function getVibrationEnabled(): boolean {
  const saved = localStorage.getItem("wakestop_vibrate_enabled");
  return saved === null ? true : saved === "true";
}

export function saveVibrationEnabled(enabled: boolean) {
  localStorage.setItem("wakestop_vibrate_enabled", String(enabled));
}

let activeAudioCtx: AudioContext | null = null;

export function playAlarmSound(preset: SoundPreset = getSavedSoundPreset(), stageMultiplier: number = 1) {
  try {
    if (!activeAudioCtx || activeAudioCtx.state === "closed") {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      activeAudioCtx = new AudioContextClass();
    }
    const ctx = activeAudioCtx;
    if (ctx.state === "suspended") {
      ctx.resume();
    }

    const now = ctx.currentTime;

    if (preset === "cyber_siren") {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sawtooth";
      osc.connect(gain);
      gain.connect(ctx.destination);

      const baseFreq = 440 * stageMultiplier;
      osc.frequency.setValueAtTime(baseFreq, now);
      osc.frequency.exponentialRampToValueAtTime(baseFreq * 2, now + 0.5);

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.exponentialRampToValueAtTime(0.4, now + 0.05);
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
        gain.connect(ctx.destination);

        const startTime = now + idx * 0.1;
        gain.gain.setValueAtTime(0.001, startTime);
        gain.gain.exponentialRampToValueAtTime(0.3, startTime + 0.02);
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
        gain.connect(ctx.destination);

        gain.gain.setValueAtTime(0.001, now);
        gain.gain.exponentialRampToValueAtTime(0.2, now + 0.08);
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
      gain.connect(ctx.destination);

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.exponentialRampToValueAtTime(0.45, now + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.7);

      osc.start(now);
      osc.stop(now + 0.75);
    } else if (preset === "thunder_alert") {
      // Low sub bass rumble
      const subOsc = ctx.createOscillator();
      const subGain = ctx.createGain();
      subOsc.type = "triangle";
      subOsc.frequency.setValueAtTime(80, now);
      subOsc.frequency.exponentialRampToValueAtTime(40, now + 0.7);
      subOsc.connect(subGain);
      subGain.connect(ctx.destination);

      subGain.gain.setValueAtTime(0.001, now);
      subGain.gain.exponentialRampToValueAtTime(0.5, now + 0.05);
      subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.7);

      subOsc.start(now);
      subOsc.stop(now + 0.75);

      // Sharp high chime
      const chimeOsc = ctx.createOscillator();
      const chimeGain = ctx.createGain();
      chimeOsc.type = "sine";
      chimeOsc.frequency.value = 1760 * stageMultiplier;
      chimeOsc.connect(chimeGain);
      chimeGain.connect(ctx.destination);

      chimeGain.gain.setValueAtTime(0.001, now + 0.1);
      chimeGain.gain.exponentialRampToValueAtTime(0.35, now + 0.15);
      chimeGain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);

      chimeOsc.start(now + 0.1);
      chimeOsc.stop(now + 0.55);
    }
  } catch (e) {
    console.warn("Web Audio play error:", e);
  }
}
