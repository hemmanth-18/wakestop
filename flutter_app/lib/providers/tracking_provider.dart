import 'dart:async';
import 'package:flutter/material.dart';
import 'package:geolocator/geolocator.dart';
import '../models/trip.dart';
import '../utils/geo.dart';
import '../utils/ai_engine.dart';
import '../utils/battery_predictor.dart';
import '../services/alarm_service.dart';

class TrackingProvider with ChangeNotifier {
  Trip? _activeTrip;
  Position? _currentPosition;
  double? _distanceMeters;
  String _stage = 'idle'; // idle, notify, alarm, critical, arrived
  List<Map<String, dynamic>> _positionHistory = [];
  bool _alarmOverlayVisible = false;
  BatteryRisk? _batteryRisk;
  bool _isBatteryCritical = false;

  StreamSubscription<Position>? _positionSubscription;
  Timer? _batteryCheckTimer;

  Trip? get activeTrip => _activeTrip;
  Position? get currentPosition => _currentPosition;
  double? get distanceMeters => _distanceMeters;
  String get stage => _stage;
  bool get alarmOverlayVisible => _alarmOverlayVisible;
  BatteryRisk? get batteryRisk => _batteryRisk;
  bool get isBatteryCritical => _isBatteryCritical;

  void startTrip(Trip trip) {
    _activeTrip = trip;
    _stage = 'idle';
    _alarmOverlayVisible = false;
    _positionHistory.clear();
    _startGpsListener();
    _startBatteryMonitor();
    notifyListeners();
  }

  void _startGpsListener() async {
    bool serviceEnabled = await Geolocator.isLocationServiceEnabled();
    if (!serviceEnabled) {
      await Geolocator.openLocationSettings();
    }

    LocationPermission permission = await Geolocator.checkPermission();
    if (permission == LocationPermission.denied) {
      permission = await Geolocator.requestPermission();
    }

    _positionSubscription?.cancel();
    _positionSubscription = Geolocator.getPositionStream(
      locationSettings: const LocationSettings(
        accuracy: LocationAccuracy.high,
        distanceFilter: 5,
      ),
    ).listen((Position pos) {
      _currentPosition = pos;
      if (_activeTrip != null) {
        _distanceMeters = distanceMetres(
          pos.latitude,
          pos.longitude,
          _activeTrip!.destination.lat,
          _activeTrip!.destination.lng,
        );

        _positionHistory.add({
          'speed': pos.speed,
          'timestamp': pos.timestamp.millisecondsSinceEpoch,
        });

        if (_positionHistory.length > 25) {
          _positionHistory.removeAt(0);
        }

        _evaluateStage(_distanceMeters!);
      }
      notifyListeners();
    });
  }

  void _evaluateStage(double d) {
    String nextStage = 'idle';
    if (d <= 120) {
      nextStage = 'arrived';
    } else if (d <= 500) {
      nextStage = 'critical';
    } else if (d <= 1000) {
      nextStage = 'alarm';
    } else if (d <= 2000) {
      nextStage = 'notify';
    }

    if (nextStage != _stage) {
      _stage = nextStage;
      if (_stage == 'alarm' || _stage == 'critical' || _stage == 'arrived') {
        _alarmOverlayVisible = true;
        AlarmService.playStageAlarm(_stage);
      }
    }
  }

  void _startBatteryMonitor() {
    _batteryCheckTimer?.cancel();
    _batteryCheckTimer = Timer.periodic(const Duration(seconds: 8), (_) async {
      final bState = await getRealBatteryState();
      final eta = calculateDynamicEta(_positionHistory, _distanceMeters);
      _batteryRisk = evaluateBatteryRisk(bState, eta.dynamicEtaMin);

      if (_batteryRisk?.triggerEarlyAlarm == true && _stage != 'arrived' && _stage != 'critical') {
        _isBatteryCritical = true;
        _stage = 'critical';
        _alarmOverlayVisible = true;
        AlarmService.playStageAlarm('critical',
            title: '⚡ Battery Critical — WakeStop!',
            body: 'AI activated early alarm to prevent missing your stop due to phone shutdown.');
      }
      notifyListeners();
    });
  }

  void acknowledgeAlarm() {
    AlarmService.stopAlarm();
    _alarmOverlayVisible = false;
    notifyListeners();
  }

  void stopTrip() {
    _positionSubscription?.cancel();
    _batteryCheckTimer?.cancel();
    AlarmService.stopAlarm();
    _activeTrip = null;
    _stage = 'idle';
    _alarmOverlayVisible = false;
    notifyListeners();
  }

  @override
  void dispose() {
    stopTrip();
    super.dispose();
  }
}
