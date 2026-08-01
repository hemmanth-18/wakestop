import 'dart:math';
import 'package:flutter/material.dart';
import '../theme/app_theme.dart';
import 'select_destination_screen.dart';
import 'history_screen.dart';

class NeonParticlePainter extends CustomPainter {
  final double animationValue;
  final List<Point<double>> particles = List.generate(
    30,
    (i) => Point(
      Random(i * 17).nextDouble(),
      Random(i * 31).nextDouble(),
    ),
  );

  NeonParticlePainter(this.animationValue);

  @override
  void paint(Canvas canvas, Size size) {
    final particlePaint = Paint()
      ..color = AppTheme.neonCyan.withOpacity(0.35)
      ..style = PaintingStyle.fill;

    final linePaint = Paint()
      ..color = AppTheme.neonCyan.withOpacity(0.12)
      ..strokeWidth = 1.0;

    final List<Offset> points = [];

    for (int i = 0; i < particles.length; i++) {
      double dx = (particles[i].x * size.width + sin(animationValue * 2 * pi + i) * 20) % size.width;
      double dy = (particles[i].y * size.height + cos(animationValue * 2 * pi + i) * 20) % size.height;
      final offset = Offset(dx, dy);
      points.add(offset);
      canvas.drawCircle(offset, 2.5, particlePaint);
    }

    for (int i = 0; i < points.length; i++) {
      for (int j = i + 1; j < points.length; j++) {
        double dist = (points[i] - points[j]).distance;
        if (dist < 110) {
          canvas.drawLine(points[i], points[j], linePaint);
        }
      }
    }
  }

  @override
  bool shouldRepaint(covariant NeonParticlePainter oldDelegate) => true;
}

class LandingScreen extends StatefulWidget {
  const LandingScreen({super.key});

  @override
  State<LandingScreen> createState() => _LandingScreenState();
}

class _LandingScreenState extends State<LandingScreen> with SingleTickerProviderStateMixin {
  late AnimationController _controller;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(seconds: 15),
    )..repeat();
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppTheme.night950,
      body: Stack(
        children: [
          // Animated Constellation Particle Background
          AnimatedBuilder(
            animation: _controller,
            builder: (context, child) {
              return CustomPaint(
                size: Size.infinite,
                painter: NeonParticlePainter(_controller.value),
              );
            },
          ),

          SafeArea(
            child: Column(
              children: [
                // Top Navigation Bar matching Web App
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 16.0, vertical: 12.0),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      // Logo & Brand Name
                      Row(
                        children: [
                          Container(
                            width: 38,
                            height: 38,
                            decoration: BoxDecoration(
                              shape: BoxShape.circle,
                              color: AppTheme.night950,
                              border: Border.all(color: AppTheme.neonCyan, width: 2),
                              boxShadow: [
                                BoxShadow(
                                  color: AppTheme.neonCyan.withOpacity(0.5),
                                  blurRadius: 12,
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
                          const SizedBox(width: 10),
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

                      // Top Nav Action Buttons
                      Row(
                        children: [
                          OutlinedButton.icon(
                            onPressed: () {
                              Navigator.push(
                                context,
                                MaterialPageRoute(
                                  builder: (context) => const SelectDestinationScreen(),
                                ),
                              );
                            },
                            icon: const Icon(Icons.navigation, color: AppTheme.neonGold, size: 14),
                            label: const Text(
                              'New Trip',
                              style: TextStyle(
                                fontSize: 13,
                                fontWeight: FontWeight.bold,
                                color: AppTheme.neonGold,
                              ),
                            ),
                            style: OutlinedButton.styleFrom(
                              side: BorderSide(color: AppTheme.neonGold.withOpacity(0.6)),
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(10),
                              ),
                              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                            ),
                          ),
                          const SizedBox(width: 8),
                          IconButton(
                            icon: const Icon(Icons.history, color: AppTheme.night500, size: 20),
                            onPressed: () {
                              Navigator.push(
                                context,
                                MaterialPageRoute(
                                  builder: (context) => const HistoryScreen(),
                                ),
                              );
                            },
                          ),
                        ],
                      ),
                    ],
                  ),
                ),

                Expanded(
                  child: SingleChildScrollView(
                    physics: const BouncingScrollPhysics(),
                    padding: const EdgeInsets.symmetric(horizontal: 24.0, vertical: 16.0),
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        const SizedBox(height: 20),
                        // Circular Glowing Logo Emblem
                        Center(
                          child: Container(
                            width: 150,
                            height: 150,
                            decoration: BoxDecoration(
                              shape: BoxShape.circle,
                              color: AppTheme.night950,
                              border: Border.all(color: AppTheme.neonCyan, width: 3),
                              boxShadow: [
                                BoxShadow(
                                  color: AppTheme.neonCyan.withOpacity(0.8),
                                  blurRadius: 50,
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
                        const SizedBox(height: 32),

                        // Headline
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
                                style: TextStyle(
                                  color: AppTheme.neonGold,
                                  shadows: [
                                    Shadow(
                                      color: AppTheme.neonGold,
                                      blurRadius: 20,
                                    ),
                                  ],
                                ),
                              ),
                            ],
                          ),
                        ),
                        const SizedBox(height: 16),

                        const MaxWidthContainer(
                          maxWidth: 500,
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
                        const SizedBox(height: 28),

                        // Centered Golden Button
                        ElevatedButton.icon(
                          onPressed: () {
                            Navigator.push(
                              context,
                              MaterialPageRoute(
                                builder: (context) => const SelectDestinationScreen(),
                              ),
                            );
                          },
                          icon: const Icon(Icons.navigation, color: AppTheme.night950, size: 18),
                          label: const Text(
                            "Start New Journey",
                            style: TextStyle(
                              fontSize: 16,
                              fontWeight: FontWeight.w800,
                              color: AppTheme.night950,
                            ),
                          ),
                          style: ElevatedButton.styleFrom(
                            backgroundColor: AppTheme.neonGold,
                            padding: const EdgeInsets.symmetric(horizontal: 28, vertical: 16),
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(16),
                            ),
                            elevation: 10,
                            shadowColor: AppTheme.neonGold.withOpacity(0.5),
                          ),
                        ),
                        const SizedBox(height: 48),

                        // 3 Feature Cards
                        Row(
                          children: [
                            Expanded(
                              child: _buildFeatureCard(
                                icon: Icons.notifications_active,
                                iconColor: AppTheme.neonCyan,
                                title: "2 km out",
                                description: "Quiet chime alert.",
                                borderColor: AppTheme.neonCyan.withOpacity(0.3),
                              ),
                            ),
                            const SizedBox(width: 12),
                            Expanded(
                              child: _buildFeatureCard(
                                icon: Icons.bolt,
                                iconColor: AppTheme.neonPurple,
                                title: "1 km out",
                                description: "Ringtone & vibration.",
                                borderColor: AppTheme.neonPurple.withOpacity(0.3),
                              ),
                            ),
                            const SizedBox(width: 12),
                            Expanded(
                              child: _buildFeatureCard(
                                icon: Icons.shield,
                                iconColor: AppTheme.neonGold,
                                title: "500 m out",
                                description: "Critical alarm repeat.",
                                borderColor: AppTheme.neonGold.withOpacity(0.3),
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 24),
                      ],
                    ),
                  ),
                ),
              ],
            ),
          ),
        ],
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
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: AppTheme.night900.withOpacity(0.8),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: borderColor, width: 1.2),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, color: iconColor, size: 22),
          const SizedBox(height: 10),
          Text(
            title,
            style: const TextStyle(
              fontFamily: 'monospace',
              fontSize: 13,
              fontWeight: FontWeight.bold,
              color: Colors.white,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            description,
            style: const TextStyle(
              fontSize: 11,
              color: AppTheme.night500,
              height: 1.3,
            ),
          ),
        ],
      ),
    );
  }
}

class MaxWidthContainer extends StatelessWidget {
  final double maxWidth;
  final Widget child;
  const MaxWidthContainer({super.key, required this.maxWidth, required this.child});

  @override
  Widget build(BuildContext context) {
    return Container(
      constraints: BoxConstraints(maxWidth: maxWidth),
      child: child,
    );
  }
}
