import 'package:flutter/material.dart';
import '../theme/app_theme.dart';
import 'select_destination_screen.dart';

class LandingScreen extends StatelessWidget {
  const LandingScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppTheme.night950,
      appBar: AppBar(
        backgroundColor: AppTheme.night950,
        elevation: 0,
        titleSpacing: 16,
        title: Row(
          children: [
            // Header Mini Logo Emblem
            Container(
              width: 44,
              height: 44,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: AppTheme.night950,
                border: Border.all(color: AppTheme.neonCyan, width: 2),
                boxShadow: [
                  BoxShadow(
                    color: AppTheme.neonCyan.withOpacity(0.5),
                    blurRadius: 15,
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
            const SizedBox(width: 12),
            const Text(
              'WakeStop',
              style: TextStyle(
                fontSize: 22,
                fontWeight: FontWeight.w900,
                color: Colors.white,
                letterSpacing: -0.5,
              ),
            ),
          ],
        ),
      ),
      body: SingleChildScrollView(
        physics: const BouncingScrollPhysics(),
        padding: const EdgeInsets.symmetric(horizontal: 20.0, vertical: 24.0),
        child: Column(
          children: [
            const SizedBox(height: 12),
            // Hero Circular Logo Emblem with Glowing Neon Border
            Center(
              child: Container(
                width: 140,
                height: 140,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: AppTheme.night950,
                  border: Border.all(color: AppTheme.neonCyan, width: 3),
                  boxShadow: [
                    BoxShadow(
                      color: AppTheme.neonCyan.withOpacity(0.7),
                      blurRadius: 40,
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
            ),
            const SizedBox(height: 28),

            // Headline
            RichText(
              textAlign: TextAlign.center,
              text: const TextSpan(
                style: TextStyle(
                  fontSize: 28,
                  fontWeight: FontWeight.w900,
                  color: Colors.white,
                  height: 1.25,
                ),
                children: [
                  TextSpan(text: "Sleep On Long Rides.\n"),
                  TextSpan(
                    text: "Never Miss Your Stop.",
                    style: TextStyle(
                      color: AppTheme.neonGold,
                      shadows: [
                        Shadow(
                          color: AppTheme.neonGold,
                          blurRadius: 15,
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 16),

            const Padding(
              padding: EdgeInsets.symmetric(horizontal: 8.0),
              child: Text(
                "WakeStop tracks your live GPS position on bus journeys and wakes you with an escalating alarm ringtone & vibration as your destination approaches.",
                textAlign: TextAlign.center,
                style: TextStyle(
                  color: AppTheme.night500,
                  fontSize: 14,
                  height: 1.5,
                ),
              ),
            ),
            const SizedBox(height: 32),

            // Action Buttons
            SizedBox(
              width: double.infinity,
              height: 54,
              child: ElevatedButton.icon(
                onPressed: () {
                  Navigator.push(
                    context,
                    MaterialPageRoute(
                      builder: (context) => const SelectDestinationScreen(),
                    ),
                  );
                },
                icon: const Icon(Icons.navigation, color: AppTheme.night950, size: 22),
                label: const Text(
                  "Start New Journey",
                  style: TextStyle(
                    fontSize: 17,
                    fontWeight: FontWeight.w800,
                    color: AppTheme.night950,
                  ),
                ),
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppTheme.neonGold,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(16),
                  ),
                  elevation: 8,
                  shadowColor: AppTheme.neonGold.withOpacity(0.5),
                ),
              ),
            ),
            const SizedBox(height: 36),

            // Feature Cards Grid (2 km out, 1 km out, 500 m out)
            _buildFeatureCard(
              icon: Icons.notifications_active,
              iconColor: AppTheme.neonCyan,
              title: "2 km out",
              description: "Quiet notification & subtle chime alerts you that your stop is coming.",
              borderColor: AppTheme.neonCyan.withOpacity(0.4),
            ),
            const SizedBox(height: 12),
            _buildFeatureCard(
              icon: Icons.bolt,
              iconColor: AppTheme.neonPurple,
              title: "1 km out",
              description: "Escalating ringtone sound and hardware vibration pattern trigger.",
              borderColor: AppTheme.neonPurple.withOpacity(0.4),
            ),
            const SizedBox(height: 12),
            _buildFeatureCard(
              icon: Icons.shield,
              iconColor: AppTheme.neonGold,
              title: "500 m out",
              description: "Continuous critical thunder alarm repeats until you confirm you're awake.",
              borderColor: AppTheme.neonGold.withOpacity(0.4),
            ),
            const SizedBox(height: 24),
          ],
        ),
      ),
    );
  }

  Widget _buildFeatureCard({
    required IconData icon,
    required Color iconColor,
    required String title,
    required String description,
    required Color borderColor,
  }) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: AppTheme.night900.withOpacity(0.8),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: borderColor, width: 1.2),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            padding: const EdgeInsets.all(10),
            decoration: BoxDecoration(
              color: iconColor.withOpacity(0.15),
              borderRadius: BorderRadius.circular(14),
            ),
            child: Icon(icon, color: iconColor, size: 24),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: const TextStyle(
                    fontFamily: 'monospace',
                    fontSize: 15,
                    fontWeight: FontWeight.bold,
                    color: Colors.white,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  description,
                  style: const TextStyle(
                    fontSize: 13,
                    color: AppTheme.night500,
                    height: 1.4,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
