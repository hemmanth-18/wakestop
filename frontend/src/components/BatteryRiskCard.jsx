import { useEffect, useState } from "react";
import {
  getRealBatteryState,
  evaluateBatteryRisk,
  setSimulatedBatteryState,
  getSimulatedBatteryState,
  getBatteryAiEnabled,
  saveBatteryAiEnabled,
} from "../utils/batteryPredictor";
import { ZapIcon, SlidersIcon, ShieldIcon, PauseIcon, AlertTriangleIcon } from "./Icons";

export function BatteryRiskCard({ etaMinutes = 60, onSimulateEarlyAlarm = null }) {
  const [batteryState, setBatteryState] = useState({
    batteryPct: 80,
    isCharging: false,
    drainRatePctMin: 0.4,
    isSimulated: false,
  });

  const [aiEnabled, setAiEnabled] = useState(getBatteryAiEnabled());
  const [showSimControls, setShowSimControls] = useState(false);
  const [simBatteryPct, setSimBatteryPct] = useState(12);
  const [simCharging, setSimCharging] = useState(false);
  const [simDrainRate, setSimDrainRate] = useState(1.2);
  const [isSimActive, setIsSimActive] = useState(false);

  useEffect(() => {
    let timer;
    const fetchBattery = async () => {
      const state = await getRealBatteryState();
      setBatteryState(state);
    };

    fetchBattery();
    timer = setInterval(fetchBattery, 5000);
    return () => clearInterval(timer);
  }, []);

  const handleToggleAi = () => {
    const next = !aiEnabled;
    setAiEnabled(next);
    saveBatteryAiEnabled(next);
  };

  const risk = evaluateBatteryRisk(batteryState, etaMinutes);

  const applySimulation = (pct, charging, drain) => {
    const sim = {
      batteryPct: pct,
      isCharging: charging,
      drainRatePctMin: drain,
    };
    setSimulatedBatteryState(sim);
    setIsSimActive(true);
    setBatteryState({ ...sim, isSimulated: true });

    const newRisk = evaluateBatteryRisk(sim, etaMinutes);
    if (newRisk.triggerEarlyAlarm && onSimulateEarlyAlarm) {
      onSimulateEarlyAlarm(newRisk);
    }
  };

  const resetSimulation = () => {
    setSimulatedBatteryState(null);
    setIsSimActive(false);
    getRealBatteryState().then(setBatteryState);
  };

  const getRiskBadge = () => {
    if (!aiEnabled) {
      return {
        label: "AI PAUSED",
        badgeClasses: "bg-night-800 text-night-400 border-white/10",
        icon: <PauseIcon size={14} className="text-night-400" />,
      };
    }
    if (risk.riskLevel === "Critical") {
      return {
        label: "CRITICAL RISK",
        badgeClasses: "bg-alert-500/20 text-alert-500 border-alert-500/50 alarm-shake",
        icon: <ZapIcon size={14} className="text-alert-500" />,
      };
    }
    if (risk.riskLevel === "Warning") {
      return {
        label: "BATTERY WARNING",
        badgeClasses: "bg-neon-gold/20 text-neon-gold border-neon-gold/50",
        icon: <AlertTriangleIcon size={14} className="text-neon-gold" />,
      };
    }
    return {
      label: "SAFE",
      badgeClasses: "bg-neon-emerald/20 text-neon-emerald border-neon-emerald/50",
      icon: <ShieldIcon size={14} className="text-neon-emerald" />,
    };
  };

  const badge = getRiskBadge();

  return (
    <div className="glass-panel rounded-2xl p-5 border border-white/10 shadow-2xl relative overflow-hidden transition-all duration-300">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-3 mb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-neon-cyan/15 border border-neon-cyan/30 flex items-center justify-center text-neon-cyan shadow-[0_0_12px_rgba(0,240,255,0.2)]">
            <ZapIcon className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-display text-sm font-semibold text-white tracking-wide flex items-center gap-2">
              WakeStop AI Battery Guard
              <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-white/10 text-neon-cyan border border-neon-cyan/30">
                {risk.modelName} ({risk.mlAccuracy})
              </span>
            </h3>
            <p className="text-xs text-night-400">
              Predictive phone shutdown prevention engine
            </p>
          </div>
        </div>

        {/* AI Prevention Toggle + Risk Badge */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleToggleAi}
            title="Click to enable or disable Battery Prevention AI"
            className={`flex items-center gap-1.5 px-3 py-1 rounded-xl border text-xs font-mono font-bold transition-all ${
              aiEnabled
                ? "bg-neon-cyan/15 text-neon-cyan border-neon-cyan/40 shadow-[0_0_12px_rgba(0,240,255,0.25)] hover:bg-neon-cyan/25"
                : "bg-night-800 text-night-400 border-white/10 hover:bg-night-700"
            }`}
          >
            {aiEnabled ? (
              <>
                <ZapIcon size={13} className="text-neon-cyan" />
                <span>AI Prevention: ON</span>
              </>
            ) : (
              <>
                <PauseIcon size={13} className="text-night-400" />
                <span>AI Prevention: OFF</span>
              </>
            )}
          </button>

          <div
            className={`flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-mono font-bold tracking-wider ${badge.badgeClasses}`}
          >
            {badge.icon}
            <span>{badge.label}</span>
          </div>
        </div>
      </div>

      {/* Main Grid: Battery Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
        {/* Battery Level */}
        <div className="bg-night-900/60 rounded-xl p-3 border border-white/5 overflow-hidden flex flex-col justify-between min-w-0">
          <span className="text-[11px] text-night-400 uppercase font-mono block mb-1 truncate">
            Battery Level
          </span>
          <div className="flex flex-col gap-1 min-w-0">
            <span className={`text-2xl font-bold font-mono leading-none ${risk.batteryPct <= 15 ? 'text-alert-500 font-extrabold' : 'text-white'}`}>
              {risk.batteryPct}%
            </span>
            {risk.isCharging && (
              <span className="inline-flex items-center gap-1 text-[10px] text-neon-emerald font-bold font-mono bg-neon-emerald/15 px-1.5 py-0.5 rounded-full border border-neon-emerald/30 self-start whitespace-nowrap">
                <ZapIcon size={10} className="text-neon-emerald shrink-0" />
                Charging
              </span>
            )}
          </div>
          {/* Progress Bar */}
          <div className="w-full h-1.5 bg-night-800 rounded-full mt-2 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                risk.batteryPct <= 15
                  ? "bg-alert-500 shadow-[0_0_8px_#FF2E55]"
                  : risk.batteryPct <= 30
                  ? "bg-neon-gold"
                  : "bg-neon-emerald"
              }`}
              style={{ width: `${risk.batteryPct}%` }}
            />
          </div>
        </div>

        {/* Battery Drain Rate */}
        <div className="bg-night-900/60 rounded-xl p-3 border border-white/5">
          <span className="text-[11px] text-night-400 uppercase font-mono block mb-1">
            Drain Rate
          </span>
          <span className="text-2xl font-bold font-mono text-neon-purple">
            {risk.isCharging ? "0.0" : risk.drainRatePctMin}
            <span className="text-xs text-night-400 font-normal"> %/min</span>
          </span>
          <span className="text-[10px] text-night-400 block mt-1">
            GPS + Screen active
          </span>
        </div>

        {/* Est. Phone Runtime */}
        <div className="bg-night-900/60 rounded-xl p-3 border border-white/5">
          <span className="text-[11px] text-night-400 uppercase font-mono block mb-1">
            Phone Runtime
          </span>
          <span className={`text-2xl font-bold font-mono ${risk.estPhoneRuntimeMins < etaMinutes ? "text-alert-500" : "text-neon-cyan"}`}>
            {risk.isCharging ? "∞" : `~${risk.estPhoneRuntimeMins}`}
            <span className="text-xs text-night-400 font-normal"> mins</span>
          </span>
          <span className="text-[10px] text-night-400 block mt-1">
            Before zero power
          </span>
        </div>

        {/* Destination ETA */}
        <div className="bg-night-900/60 rounded-xl p-3 border border-white/5">
          <span className="text-[11px] text-night-400 uppercase font-mono block mb-1">
            Trip ETA
          </span>
          <span className="text-2xl font-bold font-mono text-neon-gold">
            ~{Math.round(etaMinutes)}
            <span className="text-xs text-night-400 font-normal"> mins</span>
          </span>
          <span className="text-[10px] text-night-400 block mt-1">
            To reach destination
          </span>
        </div>
      </div>

      {/* Explanation & Action Recommendation Box */}
      <div
        className={`rounded-xl p-3.5 border text-xs leading-relaxed mb-3 ${
          !aiEnabled
            ? "bg-night-900/90 border-white/10 text-night-400"
            : risk.riskLevel === "Critical"
            ? "bg-alert-500/10 border-alert-500/40 text-alert-300"
            : risk.riskLevel === "Warning"
            ? "bg-neon-gold/10 border-neon-gold/40 text-neon-gold"
            : "bg-night-900/80 border-white/10 text-night-300"
        }`}
      >
        <div className="font-semibold mb-1 flex items-center gap-1.5 text-white">
          <span>🧠 AI Decision Analysis:</span>
          <span className="font-mono text-[11px]">{risk.explanation}</span>
        </div>
        <p className="opacity-90">{risk.recommendation}</p>
      </div>

      {/* Interactive Simulator Bar */}
      <div className="flex items-center justify-between gap-2 text-xs pt-2 border-t border-white/5">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowSimControls(!showSimControls)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-night-300 hover:text-white border border-white/10 transition-all font-mono text-xs"
          >
            <SlidersIcon className="w-3.5 h-3.5 text-neon-cyan" />
            {showSimControls ? "Hide AI Simulator" : "Test AI Battery Simulator"}
          </button>
          {isSimActive && (
            <span className="px-2 py-0.5 rounded bg-neon-purple/20 text-neon-purple border border-neon-purple/30 font-mono text-[10px]">
              Simulated Mode Active
            </span>
          )}
        </div>

        {isSimActive && (
          <button
            onClick={resetSimulation}
            className="text-xs font-mono text-night-400 hover:text-white underline"
          >
            Reset Real State
          </button>
        )}
      </div>

      {/* Expanded Simulation Controls Drawer */}
      {showSimControls && (
        <div className="mt-3 p-4 rounded-xl bg-night-950/90 border border-neon-cyan/30 space-y-4">
          <div className="flex items-center justify-between border-b border-white/10 pb-2">
            <span className="text-xs font-display text-neon-cyan font-bold uppercase tracking-wider">
              🧪 AI Battery Risk Scenario Simulator
            </span>
            <span className="text-[10px] text-night-400 font-mono">
              Test low battery & early alert predictions
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Battery Slider */}
            <div>
              <label className="text-[11px] text-night-300 font-mono block mb-1">
                Simulated Battery: <span className="text-neon-cyan font-bold">{simBatteryPct}%</span>
              </label>
              <input
                type="range"
                min="3"
                max="100"
                value={simBatteryPct}
                onChange={(e) => setSimBatteryPct(Number(e.target.value))}
                className="w-full accent-neon-cyan cursor-pointer"
              />
            </div>

            {/* Drain Rate Slider */}
            <div>
              <label className="text-[11px] text-night-300 font-mono block mb-1">
                Drain Rate: <span className="text-neon-purple font-bold">{simDrainRate} %/min</span>
              </label>
              <input
                type="range"
                min="0.2"
                max="3.0"
                step="0.1"
                value={simDrainRate}
                onChange={(e) => setSimDrainRate(Number(e.target.value))}
                className="w-full accent-neon-purple cursor-pointer"
              />
            </div>

            {/* Quick Action Presets */}
            <div className="flex flex-col justify-end gap-1.5">
              <button
                onClick={() => {
                  setSimBatteryPct(8);
                  setSimDrainRate(1.5);
                  setSimCharging(false);
                  applySimulation(8, false, 1.5);
                }}
                className="w-full py-1.5 px-2 rounded bg-alert-500/20 hover:bg-alert-500/30 text-alert-400 border border-alert-500/50 text-[11px] font-mono font-bold transition-all text-center"
              >
                🚨 Trigger Critical Early Alarm (8%)
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-white/10">
            <label className="flex items-center gap-2 text-xs text-night-300 font-mono cursor-pointer">
              <input
                type="checkbox"
                checked={simCharging}
                onChange={(e) => setSimCharging(e.target.checked)}
                className="accent-neon-emerald rounded"
              />
              Simulate Device Charging ⚡
            </label>

            <button
              onClick={() => applySimulation(simBatteryPct, simCharging, simDrainRate)}
              className="px-4 py-1.5 rounded-lg bg-neon-cyan text-night-950 font-mono text-xs font-bold hover:shadow-[0_0_15px_rgba(0,240,255,0.4)] transition-all"
            >
              Apply AI Simulation
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
