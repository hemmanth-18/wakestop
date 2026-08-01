import 'package:flutter/material.dart';
import 'theme/app_theme.dart';
import 'services/alarm_service.dart';
import 'screens/landing_screen.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await AlarmService.init();
  runApp(const WakeStopApp());
}

class WakeStopApp extends StatelessWidget {
  const WakeStopApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'WakeStop',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.darkTheme,
      home: const LandingScreen(),
    );
  }
}
