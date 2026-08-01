import { useState, useRef } from "react";
import {
  getAllSoundOptions,
  getSavedSoundPreset,
  saveSoundPreset,
  getVibrationEnabled,
  saveVibrationEnabled,
  playAlarmSound,
  stopAlarmSound,
  saveCustomAlarm,
  deleteCustomAlarm,
} from "../utils/audio";
import {
  getBatteryAiEnabled,
  saveBatteryAiEnabled,
} from "../utils/batteryPredictor";
import { Volume2Icon, ZapIcon, SlidersIcon, CheckIcon, PlusIcon, TrashIcon, BatteryChargingIcon, VibrateIcon } from "./Icons";

export default function AlarmSettingsModal({ isOpen, onClose }) {
  const [soundOptions, setSoundOptions] = useState(getAllSoundOptions());
  const [selectedSound, setSelectedSound] = useState(getSavedSoundPreset());
  const [vibrateOn, setVibrateOn] = useState(getVibrationEnabled());
  const [batteryAiOn, setBatteryAiOn] = useState(getBatteryAiEnabled());
  const [playingPreset, setPlayingPreset] = useState(null);
  const [testCountdown, setTestCountdown] = useState(0);

  const fileInputRef = useRef(null);
  const countdownTimerRef = useRef(null);

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

  const handleToggleBatteryAi = () => {
    const next = !batteryAiOn;
    setBatteryAiOn(next);
    saveBatteryAiEnabled(next);
  };

  const handleTestSound = (preset) => {
    if (playingPreset === preset) {
      stopAlarmSound();
      setPlayingPreset(null);
      if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
      setTestCountdown(0);
      return;
    }

    stopAlarmSound();
    if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);

    setPlayingPreset(preset);
    setTestCountdown(10);
    playAlarmSound(preset, 1, 10000); // Minimum 10 seconds continuous ringing

    countdownTimerRef.current = setInterval(() => {
      setTestCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(countdownTimerRef.current);
          setPlayingPreset(null);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 8 * 1024 * 1024) {
      alert("Audio file size exceeds 8MB limit. Please choose a smaller audio file.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result;
      if (dataUrl) {
        const name = file.name.replace(/\.[^/.]+$/, ""); // strip extension
        const created = saveCustomAlarm(name, dataUrl);
        const updated = getAllSoundOptions();
        setSoundOptions(updated);
        handleSelectSound(created.id);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleDeleteCustom = (id, e) => {
    e.stopPropagation();
    deleteCustomAlarm(id);
    setSoundOptions(getAllSoundOptions());
    if (selectedSound === id) {
      setSelectedSound("cyber_siren");
    }
  };

  const closeModal = () => {
    stopAlarmSound();
    if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
    setPlayingPreset(null);
    onClose();
  };

  const supportsVibration = "vibrate" in navigator;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-night-950/80 p-4 backdrop-blur-md">
      <div className="glass-panel-gold w-full max-w-md rounded-2xl p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-night-700 pb-4">
          <div className="flex items-center gap-2.5">
            <SlidersIcon className="text-neon-gold" size={22} />
            <h2 className="font-display text-xl font-bold tracking-tight text-white">
              Alarm & AI Settings
            </h2>
          </div>
          <button
            onClick={closeModal}
            className="rounded-lg p-1.5 text-night-500 hover:bg-night-800 hover:text-white"
          >
            ✕
          </button>
        </div>

        {/* Badge: Minimum 10 Seconds Ringing */}
        <div className="mt-4 flex items-center gap-2 rounded-xl bg-neon-gold/15 border border-neon-gold/40 p-2.5 text-xs text-neon-gold font-semibold">
          <Volume2Icon size={16} className="text-neon-gold shrink-0" />
          <span>Alarms ring continuously for a minimum of 10 seconds.</span>
        </div>

        {/* Ringtone Sound Selector */}
        <div className="mt-4">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold uppercase tracking-wider text-neon-cyan">
              Select Ringtone Sound
            </label>

            {/* Custom File Upload Button */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-1.5 rounded-lg border border-neon-cyan/50 bg-neon-cyan/15 px-2.5 py-1 text-xs font-bold text-neon-cyan hover:bg-neon-cyan/25 transition-all"
            >
              <PlusIcon size={14} />
              Upload Custom Alarm
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="audio/*"
              className="hidden"
              onChange={handleFileUpload}
            />
          </div>

          <div className="mt-3 space-y-2 max-h-52 overflow-y-auto pr-1">
            {soundOptions.map((opt) => {
              const isSelected = selectedSound === opt.id;
              const isPlayingThis = playingPreset === opt.id;

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
                      <div className="flex items-center gap-2">
                        <p className="font-display text-sm font-semibold text-white">{opt.name}</p>
                        {opt.isCustom && (
                          <span className="rounded-md bg-neon-purple/20 px-1.5 py-0.5 text-[10px] font-bold text-neon-purple">
                            Custom Local
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-night-500">{opt.description}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {opt.isCustom && (
                      <button
                        type="button"
                        onClick={(e) => handleDeleteCustom(opt.id, e)}
                        className="rounded-lg p-1.5 text-alert-500 hover:bg-alert-500/20 transition-colors"
                        title="Delete Custom Alarm"
                      >
                        <TrashIcon size={14} />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleTestSound(opt.id);
                      }}
                      className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-bold transition-all ${
                        isPlayingThis
                          ? "border-alert-500 bg-alert-500 text-white animate-pulse"
                          : "border-neon-cyan/40 bg-neon-cyan/10 text-neon-cyan hover:bg-neon-cyan/20 active:scale-95"
                      }`}
                    >
                      <Volume2Icon size={14} />
                      {isPlayingThis ? `Stop (${testCountdown}s)` : "Test (10s)"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Battery Prevention AI Toggle */}
        <div className="mt-4 rounded-xl border border-neon-cyan/30 bg-night-900/80 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className={`flex h-9 w-9 items-center justify-center rounded-lg ${
                  batteryAiOn ? "bg-neon-cyan text-night-950 shadow-[0_0_12px_rgba(0,240,255,0.4)]" : "bg-night-800 text-night-500"
                }`}
              >
                <BatteryChargingIcon size={20} />
              </div>
              <div>
                <p className="font-display text-sm font-semibold text-white">Battery AI</p>
                <p className="text-xs text-night-400">
                  {batteryAiOn
                    ? "Early alarm on low battery"
                    : "Disabled"}
                </p>
              </div>
            </div>

            <button
              onClick={handleToggleBatteryAi}
              className={`toggle-switch shrink-0 min-h-0 relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                batteryAiOn ? "bg-neon-cyan" : "bg-night-700"
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-night-950 transition-transform ${
                  batteryAiOn ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </button>
          </div>
        </div>

        {/* Vibration Switch */}
        <div className="mt-3 rounded-xl border border-night-700 bg-night-900/80 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className={`flex h-9 w-9 items-center justify-center rounded-lg ${
                  vibrateOn ? "bg-neon-purple text-white shadow-[0_0_12px_rgba(176,38,255,0.4)]" : "bg-night-800 text-night-500"
                }`}
              >
                <VibrateIcon size={20} />
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
              className={`toggle-switch shrink-0 min-h-0 relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                vibrateOn ? "bg-neon-purple" : "bg-night-700"
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
          onClick={closeModal}
          className="mt-6 w-full rounded-xl bg-neon-gold py-3 font-display font-bold text-night-950 shadow-[0_0_20px_rgba(255,184,0,0.3)] hover:brightness-110 active:scale-98 transition-all"
        >
          Save & Close
        </button>
      </div>
    </div>
  );
}
