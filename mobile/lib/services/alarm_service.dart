import 'dart:async';
import 'package:audioplayers/audioplayers.dart';
import 'package:vibration/vibration.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';

class AlarmService {
  static final AudioPlayer _audioPlayer = AudioPlayer();
  static final FlutterLocalNotificationsPlugin _notificationsPlugin =
      FlutterLocalNotificationsPlugin();
  static Timer? _vibrateLoopTimer;
  static Timer? _swLoopTimer;

  static Future<void> init() async {
    const androidInit = AndroidInitializationSettings('@mipmap/ic_launcher');
    const iosInit = DarwinInitializationSettings();
    const initSettings = InitializationSettings(android: androidInit, iOS: iosInit);
    await _notificationsPlugin.initialize(initSettings);
  }

  static Future<void> playStageAlarm(String stage, {String? title, String? body}) async {
    await stopAlarm();

    // 1. Trigger Local Notification on System Sound Channel
    await showSystemNotification(
      title ?? (stage == 'critical' ? '🚨 Wake Up Now! — WakeStop' : '⏰ WakeStop Alarm!'),
      body ?? 'Approaching destination! Get ready now.',
      stage: stage,
    );

    // 2. Play Audio Tone on USAGE_ALARM stream
    try {
      await _audioPlayer.setAudioContext(const AudioContext(
        android: AudioContextAndroid(
          audioMode: AndroidAudioMode.normal,
          contentType: AndroidContentType.sonification,
          usageType: AndroidUsageType.alarm,
          audioFocus: AndroidAudioFocus.gainTransient,
        ),
        iOS: const AudioContextIOS(
          category: AVAudioSessionCategory.playback,
          options: [AVAudioSessionOptions.duckOthers],
        ),
      ));

      // Loop audio
      await _audioPlayer.setReleaseMode(ReleaseMode.loop);
      await _audioPlayer.play(AssetSource('cyber_siren.mp3'));
    } catch (e) {
      // Audio playback fallback
    }

    // 3. Start High-Efficiency Hardware Vibration Loop
    startVibrationPattern(stage);
  }

  static void startVibrationPattern(String stage) async {

    final bool? hasVibrator = await Vibration.hasVibrator();
    if (hasVibrator != true) return;

    List<int> pattern = stage == 'critical'
        ? [0, 200, 30, 200, 30, 200, 30]
        : [0, 200, 50, 200, 50, 200, 50];

    _vibrateLoopTimer?.cancel();
    _vibrateLoopTimer = Timer.periodic(const Duration(milliseconds: 1250), (_) {
      Vibration.vibrate(pattern: pattern);
    });
    Vibration.vibrate(pattern: pattern);
  }

  static Future<void> showSystemNotification(String title, String body, {required String stage}) async {
    final androidDetails = AndroidNotificationDetails(
      'wakestop_alarms',
      'WakeStop Critical Alarms',
      channelDescription: 'High-priority alarms that ring on system volume',
      importance: Importance.max,
      priority: Priority.max,
      fullScreenIntent: true,
      category: AndroidNotificationCategory.alarm,
      audioAttributesUsage: AudioAttributesUsage.alarm,
    );
    const iosDetails = DarwinNotificationDetails(presentSound: true, presentAlert: true);
    final details = NotificationDetails(android: androidDetails, iOS: iosDetails);

    await _notificationsPlugin.show(0, title, body, details);
  }

  static Future<void> stopAlarm() async {
    _vibrateLoopTimer?.cancel();
    _vibrateLoopTimer = null;
    _swLoopTimer?.cancel();
    _swLoopTimer = null;

    try {
      await _audioPlayer.stop();
      await Vibration.cancel();
      await _notificationsPlugin.cancel(0);
    } catch (e) {}
  }
}
