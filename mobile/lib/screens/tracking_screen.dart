import 'dart:async';
import 'package:flutter/material.dart';
import 'package:geolocator/geolocator.dart';
import '../theme/app_theme.dart';
import '../models/trip.dart';
import '../services/alarm_service.dart';
import '../services/api_service.dart';
import 'landing_screen.dart';

class TrackingScreen extends StatefulWidget {
  final Trip trip;
  const TrackingScreen({super.key, required this.trip});

  @override
  State<TrackingScreen> createState() => _TrackingScreenState();
}

class _TrackingScreenState extends State<TrackingScreen> {
  StreamSubscription<Position>? _positionStream;
  Position? _currentPosition;
  double? _distanceMeters;
  String _stage = 'idle'; // idle, notify, alarm, critical, arrived
  bool _alarmOverlayVisible = false;

  @override
  void initState() {
    super.initState();
    _startLocationTracking();
  }

  void _startLocationTracking() async {
    bool serviceEnabled = await Geolocator.isLocationServiceEnabled();
    if (!serviceEnabled) {
      await Geolocator.openLocationSettings();
    }

    LocationPermission permission = await Geolocator.checkPermission();
    if (permission == LocationPermission.denied) {
      permission = await Geolocator.requestPermission();
    }

    _positionStream = Geolocator.getPositionStream(
      locationSettings: const LocationSettings(
        accuracy: LocationAccuracy.high,
        distanceFilter: 10,
      ),
    ).listen((Position position) {
      setState(() {
        _currentPosition = position;
        _distanceMeters = Geolocator.distanceBetween(
          position.latitude,
          position.longitude,
          widget.trip.destination.lat,
          widget.trip.destination.lng,
        );
        _updateStage(_distanceMeters!);
      });
    });
  }

  void _updateStage(double distanceM) {
    String nextStage = 'idle';
    if (distanceM <= 120) {
      nextStage = 'arrived';
    } else if (distanceM <= 500) {
      nextStage = 'critical';
    } else if (distanceM <= 1000) {
      nextStage = 'alarm';
    } else if (distanceM <= 2000) {
      nextStage = 'notify';
    }

    if (nextStage != _stage) {
      setState(() {
        _stage = nextStage;
        if (_stage == 'alarm' || _stage == 'critical' || _stage == 'arrived') {
          _alarmOverlayVisible = true;
          AlarmService.playStageAlarm(_stage);
        }
      });
    }
  }

  void _acknowledgeAlarm() async {
    await AlarmService.stopAlarm();
    setState(() => _alarmOverlayVisible = false);
    if (_stage == 'arrived') {
      await ApiService.endTrip(widget.trip.id, 5);
      if (!mounted) return;
      Navigator.pushReplacement(
        context,
        MaterialPageRoute(builder: (context) => const LandingScreen()),
      );
    }
  }

  @override
  void dispose() {
    _positionStream?.cancel();
    AlarmService.stopAlarm();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(widget.trip.destination.name),
        actions: [
          IconButton(
            icon: const Icon(Icons.settings, color: AppTheme.neonCyan),
            onPressed: () {},
          ),
        ],
      ),
      body: Stack(
        children: [
          Padding(
            padding: const EdgeInsets.all(16.0),
            child: Column(
              children: [
                // Live Distance Card
                Card(
                  color: AppTheme.night900,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(20),
                    side: const BorderSide(color: AppTheme.neonCyan, width: 1.5),
                  ),
                  child: Padding(
                    padding: const EdgeInsets.all(20.0),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Text(
                              'DISTANCE TO STOP',
                              style: TextStyle(
                                fontSize: 12,
                                fontWeight: FontWeight.bold,
                                color: AppTheme.night500,
                              ),
                            ),
                            const SizedBox(height: 8),
                            Text(
                              _distanceMeters != null
                                  ? _distanceMeters! >= 1000
                                      ? '${(_distanceMeters! / 1000).toStringAsFixed(2)} km'
                                      : '${_distanceMeters!.round()} m'
                                  : 'Acquiring GPS...',
                              style: const TextStyle(
                                fontSize: 32,
                                fontWeight: FontWeight.w900,
                                color: AppTheme.neonCyan,
                              ),
                            ),
                          ],
                        ),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                          decoration: BoxDecoration(
                            color: AppTheme.neonCyan.withOpacity(0.15),
                            borderRadius: BorderRadius.circular(10),
                            border: Border.all(color: AppTheme.neonCyan),
                          ),
                          child: Text(
                            _stage.toUpperCase(),
                            style: const TextStyle(
                              color: AppTheme.neonCyan,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
                const SizedBox(height: 16),

                // Change destination button
                SizedBox(
                  width: double.infinity,
                  child: OutlinedButton(
                    onPressed: () {
                      Navigator.pushReplacement(
                        context,
                        MaterialPageRoute(
                          builder: (context) => const LandingScreen(),
                        ),
                      );
                    },
                    style: OutlinedButton.styleFrom(
                      side: const BorderSide(color: AppTheme.night700),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(16),
                      ),
                      padding: const EdgeInsets.symmetric(vertical: 16),
                    ),
                    child: const Text(
                      'Change Destination / New Trip',
                      style: TextStyle(color: AppTheme.night500),
                    ),
                  ),
                ),
              ],
            ),
          ),

          // Alarm Overlay Screen
          if (_alarmOverlayVisible)
            Container(
              color: _stage == 'critical'
                  ? AppTheme.alertRed.withOpacity(0.95)
                  : _stage == 'arrived'
                      ? AppTheme.neonEmerald.withOpacity(0.95)
                      : AppTheme.neonGold.withOpacity(0.95),
              child: SafeArea(
                child: Center(
                  child: Padding(
                    padding: const EdgeInsets.all(24.0),
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(
                          _stage == 'arrived'
                              ? Icons.check_circle
                              : _stage == 'critical'
                                  ? Icons.bolt
                                  : Icons.notifications_active,
                          size: 80,
                          color: AppTheme.night950,
                        ),
                        const SizedBox(height: 24),
                        Text(
                          _stage == 'arrived'
                              ? "You've Arrived!"
                              : _stage == 'critical'
                                  ? "Wake Up Now!"
                                  : "Getting Close!",
                          style: const TextStyle(
                            fontSize: 36,
                            fontWeight: FontWeight.w900,
                            color: AppTheme.night950,
                          ),
                        ),
                        const SizedBox(height: 12),
                        Text(
                          widget.trip.destination.name,
                          style: const TextStyle(
                            fontSize: 22,
                            fontWeight: FontWeight.bold,
                            color: AppTheme.night950,
                          ),
                        ),
                        const SizedBox(height: 36),
                        SizedBox(
                          width: double.infinity,
                          height: 56,
                          child: ElevatedButton.icon(
                            onPressed: _acknowledgeAlarm,
                            icon: const Icon(Icons.check, color: Colors.white),
                            label: Text(
                              _stage == 'arrived'
                                  ? 'Stop Alarm & Complete Trip'
                                  : "I've Woken Up",
                              style: const TextStyle(
                                fontSize: 18,
                                fontWeight: FontWeight.bold,
                                color: Colors.white,
                              ),
                            ),
                            style: ElevatedButton.styleFrom(
                              backgroundColor: AppTheme.night950,
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(16),
                              ),
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            ),
        ],
      ),
    );
  }
}
