import 'dart:math';

class Thresholds {
  final int notifyM;
  final int alarmM;
  final int criticalM;
  final int arrivedM;

  Thresholds({
    required this.notifyM,
    required this.alarmM,
    required this.criticalM,
    required this.arrivedM,
  });
}

class AdaptiveInfo {
  final Thresholds thresholds;
  final double averageResponseTimeSec;
  final double speedFactor;

  AdaptiveInfo({
    required this.thresholds,
    required this.averageResponseTimeSec,
    required this.speedFactor,
  });
}

class DynamicEta {
  final int dynamicEtaMin;
  final double averageSpeedKmh;
  final double confidenceScore;

  DynamicEta({
    required this.dynamicEtaMin,
    required this.averageSpeedKmh,
    required this.confidenceScore,
  });
}

AdaptiveInfo calculateAdaptiveThresholds(List<dynamic> tripHistory) {
  int defaultNotify = 2000;
  int defaultAlarm = 1000;
  int defaultCritical = 500;
  int defaultArrived = 120;

  if (tripHistory.isEmpty) {
    return AdaptiveInfo(
      thresholds: Thresholds(
        notifyM: defaultNotify,
        alarmM: defaultAlarm,
        criticalM: defaultCritical,
        arrivedM: defaultArrived,
      ),
      averageResponseTimeSec: 0,
      speedFactor: 1.0,
    );
  }

  double totalResponse = 0;
  int count = 0;
  for (var trip in tripHistory) {
    if (trip['wakeResponseSec'] != null) {
      totalResponse += (trip['wakeResponseSec'] as num).toDouble();
      count++;
    }
  }

  double avgResponseSec = count > 0 ? totalResponse / count : 10.0;
  double extraDistanceM = (avgResponseSec - 5.0) * (50.0 / 3.6);

  int adaptiveAlarmM = (defaultAlarm + extraDistanceM).round().clamp(1000, 3000);
  int adaptiveNotifyM = (defaultNotify + extraDistanceM).round().clamp(2000, 5000);

  return AdaptiveInfo(
    thresholds: Thresholds(
      notifyM: adaptiveNotifyM,
      alarmM: adaptiveAlarmM,
      criticalM: defaultCritical,
      arrivedM: defaultArrived,
    ),
    averageResponseTimeSec: avgResponseSec,
    speedFactor: (adaptiveAlarmM / defaultAlarm),
  );
}

DynamicEta calculateDynamicEta(List<dynamic> positionHistory, double? remainingDistanceM) {
  if (remainingDistanceM == null || positionHistory.length < 2) {
    return DynamicEta(
      dynamicEtaMin: 0,
      averageSpeedKmh: 45.0,
      confidenceScore: 0.5,
    );
  }

  double totalSpeedMps = 0;
  int validPoints = 0;

  for (int i = 1; i < positionHistory.length; i++) {
    var prev = positionHistory[i - 1];
    var curr = positionHistory[i];
    double dist = (curr['speed'] ?? 0).toDouble();
    if (dist > 0) {
      totalSpeedMps += dist;
      validPoints++;
    }
  }

  double avgSpeedKmh = validPoints > 0 ? (totalSpeedMps / validPoints) * 3.6 : 45.0;
  avgSpeedKmh = max(15.0, min(100.0, avgSpeedKmh));

  double remainingKm = remainingDistanceM / 1000.0;
  int etaMinutes = ((remainingKm / avgSpeedKmh) * 60).round();

  return DynamicEta(
    dynamicEtaMin: max(1, etaMinutes),
    averageSpeedKmh: avgSpeedKmh,
    confidenceScore: min(1.0, positionHistory.length / 20.0),
  );
}
