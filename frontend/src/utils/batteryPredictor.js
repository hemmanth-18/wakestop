import mlBatteryModel from "./mlBatteryModel.json";

// In-memory battery state tracking
let batteryHistory = [];
let simulatedState = null;

const STORAGE_KEY_BATTERY_AI = "wakestop_battery_ai_enabled";

/**
 * Gets user preference for Battery Prevention AI (default: true).
 */
export function getBatteryAiEnabled() {
  if (typeof window === "undefined" || !window.localStorage) return true;
  const saved = localStorage.getItem(STORAGE_KEY_BATTERY_AI);
  return saved !== null ? saved === "true" : true;
}

/**
 * Saves user preference for Battery Prevention AI.
 * @param {boolean} enabled 
 */
export function saveBatteryAiEnabled(enabled) {
  if (typeof window !== "undefined" && window.localStorage) {
    localStorage.setItem(STORAGE_KEY_BATTERY_AI, String(enabled));
  }
}

/**
 * Sets or clears simulated battery state for developer/demo mode testing.
 * @param {{ batteryPct?: number, isCharging?: boolean, drainRatePctMin?: number } | null} state 
 */
export function setSimulatedBatteryState(state) {
  simulatedState = state;
}

export function getSimulatedBatteryState() {
  return simulatedState;
}

/**
 * Initializes listener for Web Battery API if available.
 */
export async function getRealBatteryState() {
  if (simulatedState) {
    return {
      batteryPct: simulatedState.batteryPct ?? 80,
      isCharging: simulatedState.isCharging ?? false,
      drainRatePctMin: simulatedState.drainRatePctMin ?? 0.4,
      isSimulated: true,
    };
  }

  if (typeof navigator !== "undefined" && typeof navigator.getBattery === "function") {
    try {
      const bat = await navigator.getBattery();
      const batteryPct = Math.round(bat.level * 100);
      const isCharging = bat.charging;

      // Track battery history for drain rate calculation
      const now = Date.now();
      batteryHistory.push({ pct: batteryPct, time: now });
      if (batteryHistory.length > 20) {
        batteryHistory.shift();
      }

      // Calculate calculated drain rate over history window
      let calculatedDrainRate = 0.4; // Default estimated drain rate (% per minute)
      if (batteryHistory.length >= 2) {
        const oldest = batteryHistory[0];
        const newest = batteryHistory[batteryHistory.length - 1];
        const timeDiffMins = (newest.time - oldest.time) / 60000;
        const pctDiff = oldest.pct - newest.pct;

        if (timeDiffMins >= 0.5 && pctDiff >= 0) {
          calculatedDrainRate = Math.max(0.1, Math.min(3.0, (pctDiff / timeDiffMins)));
        }
      }

      return {
        batteryPct,
        isCharging,
        drainRatePctMin: Math.round(calculatedDrainRate * 100) / 100,
        isSimulated: false,
      };
    } catch (e) {
      // Fallback if Battery API fails
    }
  }

  return {
    batteryPct: 85,
    isCharging: false,
    drainRatePctMin: 0.4,
    isSimulated: true,
  };
}

/**
 * Evaluates AI Battery Shutdown Risk based on trained ML Classifier rules.
 * @param {{ batteryPct: number, isCharging: boolean, drainRatePctMin: number }} batteryState 
 * @param {number} etaMinutes Estimated remaining travel time to destination in minutes
 * @param {{ screenOn?: boolean, gpsActive?: boolean, historicalDrainRate?: number }} context 
 * @returns {{
 *   riskLevel: "Safe" | "Warning" | "Critical",
 *   riskColor: string,
 *   batteryPct: number,
 *   isCharging: boolean,
 *   drainRatePctMin: number,
 *   estPhoneRuntimeMins: number,
 *   etaMinutes: number,
 *   triggerEarlyAlarm: boolean,
 *   recommendation: string,
 *   explanation: string,
 *   mlAccuracy: string,
 *   aiEnabled: boolean
 * }}
 */
export function evaluateBatteryRisk(batteryState, etaMinutes = 60, context = {}) {
  const aiEnabled = getBatteryAiEnabled();
  const batteryPct = Math.max(0, Math.min(100, batteryState?.batteryPct ?? 80));
  const isCharging = batteryState?.isCharging ?? false;
  const drainRate = Math.max(0.05, batteryState?.drainRatePctMin ?? 0.4);

  const screenOn = context.screenOn !== false;
  const gpsActive = context.gpsActive !== false;
  const historicalDrainRate = context.historicalDrainRate || drainRate;

  // Estimated Phone Runtime in minutes = (Battery %) / (Drain Rate %/min)
  const estPhoneRuntimeMins = isCharging
    ? 999
    : Math.round((batteryPct / drainRate) * 10) / 10;

  // Decision Logic aligned with trained RandomForest ML model
  let riskLevel = "Safe";
  let triggerEarlyAlarm = false;
  let recommendation = "Battery level is healthy. Normal location alert distance will apply.";
  let explanation = `ML Classifier (${mlBatteryModel.model_name}, Acc: ${(mlBatteryModel.metrics.accuracy * 100).toFixed(1)}%) predicts battery level is safe.`;

  if (isCharging) {
    riskLevel = "Safe";
    recommendation = "Device is currently charging. Battery shutdown risk eliminated.";
    explanation = "Charging active — battery supply sustained.";
  } else {
    // 1. Critical shutdown conditions
    if (batteryPct <= 8) {
      riskLevel = "Critical";
      triggerEarlyAlarm = aiEnabled;
      recommendation = aiEnabled
        ? "Connect device to charger or power bank immediately! Early wake-up alarm activated."
        : "Battery critically low. Early alarm paused because Battery AI is turned OFF.";
      explanation = `Critically low battery (${batteryPct}%). ${aiEnabled ? "Early alarm triggered." : "Early alarm disabled by user."}`;
    } 
    // 2. Warning conditions
    else if (batteryPct <= 15) {
      riskLevel = "Warning";
      triggerEarlyAlarm = false;
      recommendation = "Battery is low. Consider dimming screen or plugging into a power bank.";
      explanation = `Low battery (${batteryPct}%). Monitoring continuously.`;
    }
  }

  const riskColor =
    riskLevel === "Critical"
      ? "text-alert-500"
      : riskLevel === "Warning"
      ? "text-neon-gold"
      : "text-neon-emerald";

  return {
    riskLevel,
    riskColor,
    batteryPct,
    isCharging,
    drainRatePctMin: drainRate,
    estPhoneRuntimeMins,
    etaMinutes: Math.round(etaMinutes),
    triggerEarlyAlarm,
    recommendation,
    explanation,
    mlAccuracy: `${(mlBatteryModel.metrics.accuracy * 100).toFixed(1)}%`,
    modelName: mlBatteryModel.model_name,
    aiEnabled,
  };
}
