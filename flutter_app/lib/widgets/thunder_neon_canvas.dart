import 'dart:math';
import 'package:flutter/material.dart';
import '../constants/app_colors.dart';

class ThunderNeonPainter extends CustomPainter {
  final double animationValue;
  final List<Point<double>> particles = List.generate(
    35,
    (i) => Point(
      Random(i * 17).nextDouble(),
      Random(i * 31).nextDouble(),
    ),
  );

  ThunderNeonPainter(this.animationValue);

  @override
  void paint(Canvas canvas, Size size) {
    final particlePaint = Paint()
      ..color = AppColors.neonCyan.withOpacity(0.35)
      ..style = PaintingStyle.fill;

    final linePaint = Paint()
      ..color = AppColors.neonCyan.withOpacity(0.12)
      ..strokeWidth = 1.0;

    final List<Offset> points = [];

    for (int i = 0; i < particles.length; i++) {
      double dx = (particles[i].x * size.width + sin(animationValue * 2 * pi + i) * 25) % size.width;
      double dy = (particles[i].y * size.height + cos(animationValue * 2 * pi + i) * 25) % size.height;
      final offset = Offset(dx, dy);
      points.add(offset);
      canvas.drawCircle(offset, 2.5, particlePaint);
    }

    for (int i = 0; i < points.length; i++) {
      for (int j = i + 1; j < points.length; j++) {
        double dist = (points[i] - points[j]).distance;
        if (dist < 120) {
          canvas.drawLine(points[i], points[j], linePaint);
        }
      }
    }
  }

  @override
  bool shouldRepaint(covariant ThunderNeonPainter oldDelegate) => true;
}

class ThunderNeonCanvas extends StatefulWidget {
  const ThunderNeonCanvas({super.key});

  @override
  State<ThunderNeonCanvas> createState() => _ThunderNeonCanvasState();
}

class _ThunderNeonCanvasState extends State<ThunderNeonCanvas> with SingleTickerProviderStateMixin {
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
    return AnimatedBuilder(
      animation: _controller,
      builder: (context, child) {
        return CustomPaint(
          size: Size.infinite,
          painter: ThunderNeonPainter(_controller.value),
        );
      },
    );
  }
}
