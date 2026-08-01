import 'package:flutter/material.dart';
import '../constants/app_colors.dart';

class AlarmSettingsModal extends StatefulWidget {
  const AlarmSettingsModal({super.key});

  @override
  State<AlarmSettingsModal> createState() => _AlarmSettingsModalState();
}

class _AlarmSettingsModalState extends State<AlarmSettingsModal> {
  String _selectedSound = 'cyber_siren';
  bool _vibrateOn = true;
  bool _batteryAiOn = true;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(24),
      decoration: const BoxDecoration(
        color: AppColors.night900,
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text(
                'Alarm Settings',
                style: TextStyle(
                  fontSize: 20,
                  fontWeight: FontWeight.bold,
                  color: Colors.white,
                ),
              ),
              IconButton(
                icon: const Icon(Icons.close, color: AppColors.night500),
                onPressed: () => Navigator.pop(context),
              ),
            ],
          ),
          const SizedBox(height: 16),

          // Sound Preset Selector
          const Text(
            'RINGTONE SOUND PRESET',
            style: TextStyle(
              fontSize: 11,
              fontWeight: FontWeight.bold,
              color: AppColors.night500,
              letterSpacing: 1.0,
            ),
          ),
          const SizedBox(height: 8),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            decoration: BoxDecoration(
              color: AppColors.night950,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: AppColors.night700),
            ),
            child: DropdownButtonHideUnderline(
              child: DropdownButton<String>(
                value: _selectedSound,
                dropdownColor: AppColors.night950,
                isExpanded: true,
                style: const TextStyle(color: Colors.white, fontSize: 14),
                items: const [
                  DropdownMenuItem(value: 'cyber_siren', child: Text('Cyber Siren (High Volume)')),
                  DropdownMenuItem(value: 'digital_pulse', child: Text('Digital Pulse Alert')),
                  DropdownMenuItem(value: 'synth_horn', child: Text('Cyber Synth Horn')),
                  DropdownMenuItem(value: 'thunder_alert', child: Text('Heavy Thunder Alert')),
                ],
                onChanged: (val) {
                  if (val != null) setState(() => _selectedSound = val);
                },
              ),
            ),
          ),
          const SizedBox(height: 20),

          // Battery AI Toggle
          Container(
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              color: AppColors.night950,
              borderRadius: BorderRadius.circular(14),
              border: Border.all(color: AppColors.neonCyan.withOpacity(0.3)),
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.all(8),
                      decoration: BoxDecoration(
                        color: AppColors.neonCyan.withOpacity(0.15),
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: const Icon(Icons.battery_charging_full, color: AppColors.neonCyan, size: 20),
                    ),
                    const SizedBox(width: 12),
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text(
                          'Battery AI',
                          style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 14),
                        ),
                        Text(
                          _batteryAiOn ? 'Early alarm on low battery' : 'Disabled',
                          style: const TextStyle(color: AppColors.night500, fontSize: 12),
                        ),
                      ],
                    ),
                  ],
                ),
                Switch(
                  value: _batteryAiOn,
                  activeColor: AppColors.neonCyan,
                  onChanged: (val) => setState(() => _batteryAiOn = val),
                ),
              ],
            ),
          ),
          const SizedBox(height: 12),

          // Vibration Alarm Toggle
          Container(
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              color: AppColors.night950,
              borderRadius: BorderRadius.circular(14),
              border: Border.all(color: AppColors.neonPurple.withOpacity(0.3)),
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.all(8),
                      decoration: BoxDecoration(
                        color: AppColors.neonPurple.withOpacity(0.15),
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: const Icon(Icons.vibration, color: AppColors.neonPurple, size: 20),
                    ),
                    const SizedBox(width: 12),
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: const [
                        Text(
                          'Vibration Alarm',
                          style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 14),
                        ),
                        Text(
                          'Hardware motor pattern',
                          style: TextStyle(color: AppColors.night500, fontSize: 12),
                        ),
                      ],
                    ),
                  ],
                ),
                Switch(
                  value: _vibrateOn,
                  activeColor: AppColors.neonPurple,
                  onChanged: (val) => setState(() => _vibrateOn = val),
                ),
              ],
            ),
          ),
          const SizedBox(height: 24),
        ],
      ),
    );
  }
}
