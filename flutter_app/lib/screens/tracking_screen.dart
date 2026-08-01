import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';
import '../constants/app_colors.dart';
import '../providers/tracking_provider.dart';
import '../widgets/alarm_overlay.dart';
import '../widgets/battery_risk_card.dart';
import '../widgets/alarm_settings_modal.dart';
import '../services/api_service.dart';
import '../utils/geo.dart';
import 'landing_screen.dart';

class TrackingScreen extends StatelessWidget {
  const TrackingScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final tracking = Provider.of<TrackingProvider>(context);
    final trip = tracking.activeTrip;

    if (trip == null) {
      return const LandingScreen();
    }

    final destLocation = LatLng(trip.destination.lat, trip.destination.lng);
    final currentPos = tracking.currentPosition != null
        ? LatLng(tracking.currentPosition!.latitude, tracking.currentPosition!.longitude)
        : destLocation;

    return Scaffold(
      backgroundColor: AppColors.night950,
      appBar: AppBar(
        title: Text(trip.destination.name),
        actions: [
          IconButton(
            icon: const Icon(Icons.settings, color: AppColors.neonCyan),
            onPressed: () {
              showModalBottomSheet(
                context: context,
                backgroundColor: Colors.transparent,
                isScrollControlled: true,
                builder: (context) => const AlarmSettingsModal(),
              );
            },
          ),
        ],
      ),
      body: Stack(
        children: [
          Column(
            children: [
              // Interactive Leaflet/OpenStreetMap View
              SizedBox(
                height: 220,
                width: double.infinity,
                child: FlutterMap(
                  options: MapOptions(
                    initialCenter: currentPos,
                    initialZoom: 12.5,
                  ),
                  children: [
                    TileLayer(
                      urlTemplate: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
                      userAgentPackageName: 'com.wakestop.app',
                    ),
                    MarkerLayer(
                      markers: [
                        if (tracking.currentPosition != null)
                          Marker(
                            point: currentPos,
                            width: 40,
                            height: 40,
                            child: Container(
                              decoration: BoxDecoration(
                                color: AppColors.neonCyan,
                                shape: BoxShape.circle,
                                border: Border.all(color: AppColors.night950, width: 3),
                                boxShadow: [
                                  BoxShadow(
                                    color: AppColors.neonCyan.withOpacity(0.8),
                                    blurRadius: 15,
                                  ),
                                ],
                              ),
                              child: const Icon(Icons.directions_bus, color: AppColors.night950, size: 20),
                            ),
                          ),
                        Marker(
                          point: destLocation,
                          width: 40,
                          height: 40,
                          child: Container(
                            decoration: BoxDecoration(
                              color: AppColors.neonGold,
                              shape: BoxShape.circle,
                              border: Border.all(color: AppColors.night950, width: 3),
                              boxShadow: [
                                BoxShadow(
                                  color: AppColors.neonGold.withOpacity(0.8),
                                  blurRadius: 15,
                                ),
                              ],
                            ),
                            child: const Icon(Icons.location_on, color: AppColors.night950, size: 20),
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),

              // Metrics & Controls Section
              Expanded(
                child: SingleChildScrollView(
                  padding: const EdgeInsets.all(16.0),
                  child: Column(
                    children: [
                      // Distance Card
                      Container(
                        width: double.infinity,
                        padding: const EdgeInsets.all(20),
                        decoration: BoxDecoration(
                          color: AppColors.night900,
                          borderRadius: BorderRadius.circular(20),
                          border: Border.all(color: AppColors.neonCyan, width: 1.5),
                        ),
                        child: Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                const Text(
                                  'DISTANCE TO STOP',
                                  style: TextStyle(
                                    fontSize: 11,
                                    fontWeight: FontWeight.bold,
                                    color: AppColors.night500,
                                    letterSpacing: 1.0,
                                  ),
                                ),
                                const SizedBox(height: 8),
                                Text(
                                  tracking.distanceMeters != null
                                      ? formatDistance(tracking.distanceMeters!)
                                      : 'Acquiring GPS...',
                                  style: const TextStyle(
                                    fontSize: 32,
                                    fontWeight: FontWeight.w900,
                                    color: AppColors.neonCyan,
                                  ),
                                ),
                              ],
                            ),
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                              decoration: BoxDecoration(
                                color: AppColors.neonCyan.withOpacity(0.15),
                                borderRadius: BorderRadius.circular(10),
                                border: Border.all(color: AppColors.neonCyan),
                              ),
                              child: Text(
                                tracking.stage.toUpperCase(),
                                style: const TextStyle(
                                  color: AppColors.neonCyan,
                                  fontWeight: FontWeight.bold,
                                  fontSize: 12,
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: 14),

                      // Battery Risk Card
                      if (tracking.batteryRisk != null)
                        BatteryRiskCard(risk: tracking.batteryRisk!),

                      const SizedBox(height: 14),

                      // Cancel/End Journey Button
                      SizedBox(
                        width: double.infinity,
                        height: 52,
                        child: OutlinedButton(
                          onPressed: () async {
                            await ApiService.endTrip(trip.id, null);
                            tracking.stopTrip();
                          },
                          style: OutlinedButton.styleFrom(
                            side: const BorderSide(color: AppColors.night700),
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(16),
                            ),
                          ),
                          child: const Text(
                            'End Trip / Change Destination',
                            style: TextStyle(color: AppColors.night500, fontWeight: FontWeight.bold),
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ),

          // Alarm Overlay Modal
          if (tracking.alarmOverlayVisible)
            AlarmOverlay(
              stage: tracking.stage,
              distanceMeters: tracking.distanceMeters,
              destinationName: trip.destination.name,
              isBatteryCritical: tracking.isBatteryCritical,
              onAcknowledge: () {
                tracking.acknowledgeAlarm();
                if (tracking.stage == 'arrived') {
                  ApiService.endTrip(trip.id, 5);
                  tracking.stopTrip();
                }
              },
            ),
        ],
      ),
    );
  }
}
