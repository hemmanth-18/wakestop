import { useState } from "react";
import {
  SOUND_OPTIONS,
  getSavedSoundPreset,
  saveSoundPreset,
  getVibrationEnabled,
  saveVibrationEnabled,
  playAlarmSound,
} from "../utils/audio";
import { Volume2Icon, ZapIcon, SlidersIcon, CheckIcon } from "./Icons";

export default function AlarmSettingsModal({ isOpen, onClose }) {
  const [selectedSound, setSelectedSound] = useState(getSavedSoundPreset());
  const [vibrateOn, setVibrateOn] = useState(getVibrationEnabled());
  const [playingSample, setPlayingSample] = useState(false);

  if (!isOpen) return null;

  const handleSelectSound = (preset) => {
    setSelectedSound(preset);
    saveSoundPreset(preset);
  };

  const handleToggleVibrate = () => {
    const next = !vibrateOn;
    setVibrateOn(next);
    saveVibrationEnabled(next);
    if (next && "vibrate" in navigator) {
      navigator.vibrate([200, 100, 200]);
    }
  };

  const handleTestSound = (preset) => {
    setPlayingSample(true);
    playAlarmSound(preset, 1);
    setTimeout(() => setPlayingSample(false), 800);
  };

  const supportsVibration = "vibrate" in navigator;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-night-950/80 p-4 backdrop-blur-md">
      <div className="glass-panel-gold w-full max-w-md rounded-2xl p-6 shadow-2xl">
        <div className="flex items-center justify-between border-b border-night-700 pb-4">
          <div className="flex items-center gap-2.5">
            <SlidersIcon className="text-neon-gold" size={22} />
            <h2 className="font-display text-xl font-bold tracking-tight text-white">
              Alarm & Vibration Settings
            </h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-night-500 hover:bg-night-800 hover:text-white"
          >
            ✕
          </button>
        </div>

        {/* Ringtone Sound Selector */}
        <div className="mt-5">
          <label className="text-xs font-semibold uppercase tracking-wider text-neon-cyan">
            Select Ringtone Sound
          </label>
          <div className="mt-3 space-y-2 max-h-60 overflow-y-auto pr-1">
            {SOUND_OPTIONS.map((opt) => {
              const isSelected = selectedSound === opt.id;
              return (
                <div
                  key={opt.id}
                  onClick={() => handleSelectSound(opt.id)}
                  className={`flex items-center justify-between rounded-xl border p-3 cursor-pointer transition-all ${
                    isSelected
                      ? "border-neon-gold bg-neon-gold/10 shadow-[0_0_15px_rgba(255,184,0,0.15)]"
                      : "border-night-700 bg-night-900/60 hover:border-night-600"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`flex h-8 w-8 items-center justify-center rounded-lg ${
                        isSelected ? "bg-neon-gold text-night-950" : "bg-night-800 text-night-500"
                      }`}
                    >
                      {isSelected ? <CheckIcon size={18} /> : <Volume2Icon size={18} />}
                    </div>
                    <div>
                      <p className="font-display text-sm font-semibold text-white">{opt.name}</p>
                      <p className="text-xs text-night-500">{opt.description}</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleTestSound(opt.id);
                    }}
                    className="flex items-center gap-1.5 rounded-lg border border-neon-cyan/40 bg-neon-cyan/10 px-2.5 py-1 text-xs font-semibold text-neon-cyan hover:bg-neon-cyan/20 active:scale-95 transition-all"
                  >
                    <Volume2Icon size={14} />
                    {playingSample && selectedSound === opt.id ? "Playing…" : "Test"}
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Vibration Switch */}
        <div className="mt-6 rounded-xl border border-night-700 bg-night-900/80 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className={`flex h-9 w-9 items-center justify-center rounded-lg ${
                  vibrateOn ? "bg-neon-cyan text-night-950 shadow-[0_0_12px_rgba(0,240,255,0.4)]" : "bg-night-800 text-night-500"
                }`}
              >
                <ZapIcon size={20} />
              </div>
              <div>
                <p className="font-display text-sm font-semibold text-white">Vibration Alarm</p>
                <p className="text-xs text-night-500">
                  {supportsVibration
                    ? "Vibrates device on 1km & 500m alerts"
                    : "Not supported on iOS Safari (Android supported)"}
                </p>
              </div>
            </div>

            <button
              onClick={handleToggleVibrate}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                vibrateOn ? "bg-neon-cyan" : "bg-night-700"
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-night-950 transition-transform ${
                  vibrateOn ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </button>
          </div>
        </div>

        <button
          onClick={onClose}
          className="mt-6 w-full rounded-xl bg-neon-gold py-3 font-display font-bold text-night-950 shadow-[0_0_20px_rgba(255,184,0,0.3)] hover:brightness-110 active:scale-98 transition-all"
        >
          Save & Close
        </button>
      </div>
    </div>
  );
}
