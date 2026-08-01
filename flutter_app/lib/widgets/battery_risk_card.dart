import 'package:flutter/material.dart';
import '../constants/app_colors.dart';
import '../utils/battery_predictor.dart';

class BatteryRiskCard extends StatelessWidget {
  final BatteryRisk risk;
  const BatteryRiskCard({super.key, required this.risk});

  @override
  Widget build(BuildContext context) {
    if (!risk.isRisk) return const SizedBox.shrink();

    final isCritical = risk.level == 'critical';

    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.night900.withOpacity(0.9),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: isCritical ? AppColors.alertRed : AppColors.neonGold,
          width: 1.5,
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(
                Icons.battery_alert,
                color: isCritical ? AppColors.alertRed : AppColors.neonGold,
                size: 22,
              ),
              const SizedBox(width: 10),
              Text(
                isCritical ? '⚡ AI Battery Shutdown Risk' : '⚠️ Battery Low Warning',
                style: TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.bold,
                  color: isCritical ? AppColors.alertRed : AppColors.neonGold,
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          Text(
            risk.recommendation,
            style: const TextStyle(
              fontSize: 13,
              color: Colors.white,
              height: 1.4,
            ),
          ),
        ],
      ),
    );
  }
}
