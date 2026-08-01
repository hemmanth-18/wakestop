import 'package:battery_plus/battery_plus.dart';

class RealBatteryState {
  final int batteryLevel; // 0-100
  final bool isCharging;

  RealBatteryState({
    required this.batteryLevel,
    required this.isCharging,
  });
}

class BatteryRisk {
  final bool isRisk;
  final bool triggerEarlyAlarm;
  final String level; // "normal", "medium", "critical"
  final String recommendation;

  BatteryRisk({
    required this.isRisk,
    required this.triggerEarlyAlarm,
    required this.level,
    required this.recommendation,
  });
}

Future<RealBatteryState> getRealBatteryState() async {
  final Battery battery = Battery();
  try {
    int level = await battery.batteryLevel;
    BatteryState state = await battery.batteryState;
    bool isCharging = state == BatteryState.charging || state == BatteryState.full;
    return RealBatteryState(batteryLevel: level, isCharging: isCharging);
  } catch (e) {
    return RealBatteryState(batteryLevel: 80, isCharging: false);
  }
}

BatteryRisk evaluateBatteryRisk(RealBatteryState battery, int dynamicEtaMin) {
  if (battery.isCharging) {
    return BatteryRisk(
      isRisk: false,
      triggerEarlyAlarm: false,
      level: "normal",
      recommendation: "Phone is charging smoothly.",
    );
  }

  // Discharge rate assumption: ~0.4% battery drop per minute under GPS & screen load
  double estimatedDrainPercent = dynamicEtaMin * 0.4;
  double projectedBatteryAtDestination = battery.batteryLevel - estimatedDrainPercent;

  if (projectedBatteryAtDestination <= 3.0 || battery.batteryLevel <= 10) {
    return BatteryRisk(
      isRisk: true,
      triggerEarlyAlarm: true,
      level: "critical",
      recommendation: "⚡ Connect phone to a power bank or charger immediately! AI activated early alarm to prevent shutdown.",
    );
  }

  if (projectedBatteryAtDestination <= 12.0 || battery.batteryLevel <= 20) {
    return BatteryRisk(
      isRisk: true,
      triggerEarlyAlarm: false,
      level: "medium",
      recommendation: "⚠️ Battery running low. Consider dimming screen brightness.",
    );
  }

  return BatteryRisk(
    isRisk: false,
    triggerEarlyAlarm: false,
    level: "normal",
    recommendation: "Battery healthy for trip duration.",
  );
}
