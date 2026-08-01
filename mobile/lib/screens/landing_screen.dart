import 'package:flutter/material.dart';
import '../theme/app_theme.dart';
import 'select_destination_screen.dart';

class LandingScreen extends StatelessWidget {
  const LandingScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 24.0, vertical: 32.0),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Spacer(),
              // Circular Glowing Logo Emblem
              Container(
                width: 150,
                height: 150,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: AppTheme.night950,
                  border: Border.all(color: AppTheme.neonCyan, width: 3),
                  boxShadow: [
                    BoxShadow(
                      color: AppTheme.neonCyan.withOpacity(0.5),
                      blurRadius: 30,
                      spreadRadius: 2,
                    ),
                  ],
                ),
                child: ClipOval(
                  child: Image.asset(
                    'assets/logo.png',
                    fit: BoxFit.cover,
                  ),
                ),
              ),
              const SizedBox(height: 32),

              // Title Headline
              RichText(
                textAlign: TextAlign.center,
                text: const TextSpan(
                  style: TextStyle(
                    fontSize: 32,
                    fontWeight: FontWeight.w900,
                    color: Colors.white,
                    height: 1.2,
                  ),
                  children: [
                    TextSpan(text: "Sleep On Long Rides.\n"),
                    TextSpan(
                      text: "Never Miss Your Stop.",
                      style: TextStyle(color: AppTheme.neonGold),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 16),

              const Text(
                "WakeStop tracks your live GPS position on bus journeys and wakes you with escalating alarms & vibration as your stop approaches.",
                textAlign: TextAlign.center,
                style: TextStyle(
                  color: AppTheme.night500,
                  fontSize: 14,
                  height: 1.5,
                ),
              ),
              const Spacer(),

              // Start Journey Button
              SizedBox(
                width: double.infinity,
                height: 56,
                child: ElevatedButton.icon(
                  onPressed: () {
                    Navigator.push(
                      context,
                      MaterialPageRoute(
                        builder: (context) => const SelectDestinationScreen(),
                      ),
                    );
                  },
                  icon: const Icon(Icons.navigation, color: AppTheme.night950),
                  label: const Text(
                    "Start New Journey",
                    style: TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.bold,
                      color: AppTheme.night950,
                    ),
                  ),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppTheme.neonGold,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(16),
                    ),
                    elevation: 10,
                    shadowColor: AppTheme.neonGold.withOpacity(0.5),
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
