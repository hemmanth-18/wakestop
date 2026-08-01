import 'package:flutter/material.dart';
import '../constants/app_colors.dart';
import '../utils/geo.dart';

class AlarmOverlay extends StatelessWidget {
  final String stage;
  final double? distanceMeters;
  final String destinationName;
  final VoidCallback onAcknowledge;
  final bool isBatteryCritical;

  const AlarmOverlay({
    super.key,
    required this.stage,
    required this.distanceMeters,
    required this.destinationName,
    required this.onAcknowledge,
    this.isBatteryCritical = false,
  });

  @override
  Widget build(BuildContext context) {
    if (stage != 'alarm' && stage != 'critical' && stage != 'arrived') {
      return const SizedBox.shrink();
    }

    final isCritical = stage == 'critical' || isBatteryCritical;
    final isArrived = stage == 'arrived';

    final Color bgOverlayColor = isCritical
        ? AppColors.alertRed.withOpacity(0.95)
        : isArrived
            ? AppColors.neonEmerald.withOpacity(0.95)
            : AppColors.neonGold.withOpacity(0.95);

    String title = isBatteryCritical
        ? "Battery Critically Low!"
        : isArrived
            ? "You've Arrived!"
            : isCritical
                ? "Wake Up Now!"
                : "Getting Close!";

    String subtitle = isBatteryCritical
        ? "Alarm activated early to avoid missing your stop due to phone shutdown."
        : isArrived
            ? "Journey completed safely. Welcome to your destination!"
            : isCritical
                ? "Your destination is immediately approaching."
                : "Start gathering your belongings now.";

    return Container(
      color: bgOverlayColor,
      child: SafeArea(
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 24.0, vertical: 32.0),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              // Battery Warning Banner
              if (isBatteryCritical) ...[
                Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: AppColors.night950.withOpacity(0.9),
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(color: AppColors.alertRed, width: 2),
                  ),
                  child: Column(
                    children: const [
                      Text(
                        '⚡ AI BATTERY SHUTDOWN PREVENTION',
                        style: TextStyle(
                          color: AppColors.alertRed,
                          fontWeight: FontWeight.bold,
                          fontSize: 12,
                        ),
                      ),
                      SizedBox(height: 4),
                      Text(
                        'Connect device to a charger immediately.',
                        style: TextStyle(color: Colors.white, fontSize: 13),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 24),
              ],

              // Central Icon
              Container(
                width: 100,
                height: 100,
                decoration: BoxDecoration(
                  color: AppColors.night950,
                  borderRadius: BorderRadius.circular(24),
                  boxShadow: const [
                    BoxShadow(
                      color: Colors.black45,
                      blurRadius: 20,
                    ),
                  ],
                ),
                child: Icon(
                  isArrived
                      ? Icons.check_circle
                      : isCritical
                          ? Icons.bolt
                          : Icons.notifications_active,
                  size: 50,
                  color: isArrived
                      ? AppColors.neonEmerald
                      : isCritical
                          ? AppColors.alertRed
                          : AppColors.neonGold,
                ),
              ),
              const SizedBox(height: 28),

              // Title & Subtitle
              Text(
                title,
                textAlign: TextAlign.center,
                style: const TextStyle(
                  fontSize: 34,
                  fontWeight: FontWeight.w900,
                  color: AppColors.night950,
                  height: 1.1,
                ),
              ),
              const SizedBox(height: 12),
              Text(
                subtitle,
                textAlign: TextAlign.center,
                style: TextStyle(
                  fontSize: 16,
                  color: AppColors.night950.withOpacity(0.9),
                  fontWeight: FontWeight.w600,
                ),
              ),
              const SizedBox(height: 32),

              // Target Destination Card
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
                decoration: BoxDecoration(
                  color: AppColors.night950.withOpacity(0.7),
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(color: Colors.white24),
                ),
                child: Column(
                  children: [
                    const Text(
                      'TARGET DESTINATION',
                      style: TextStyle(
                        fontSize: 11,
                        letterSpacing: 1.2,
                        color: Colors.white60,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      destinationName,
                      style: const TextStyle(
                        fontSize: 22,
                        fontWeight: FontWeight.bold,
                        color: Colors.white,
                      ),
                    ),
                    if (distanceMeters != null && !isArrived) ...[
                      const SizedBox(height: 6),
                      Text(
                        '${formatDistance(distanceMeters!)} away',
                        style: const TextStyle(
                          fontSize: 26,
                          fontWeight: FontWeight.w900,
                          color: AppColors.neonCyan,
                        ),
                      ),
                    ],
                  ],
                ),
              ),
              const SizedBox(height: 40),

              // Action Button (Stop Alarm & Complete Trip / I've Woken Up)
              SizedBox(
                width: double.infinity,
                height: 58,
                child: ElevatedButton.icon(
                  onPressed: onAcknowledge,
                  icon: Icon(
                    isArrived ? Icons.check_circle : Icons.check,
                    color: isArrived ? AppColors.neonEmerald : AppColors.neonGold,
                    size: 24,
                  ),
                  label: Text(
                    isArrived ? 'Stop Alarm & Complete Trip' : "I've Woken Up",
                    style: const TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.w800,
                      color: Colors.white,
                    ),
                  ),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.night950,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(16),
                    ),
                    elevation: 10,
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
