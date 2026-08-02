import { Audio } from 'expo-av';
import * as Notifications from 'expo-notifications';
import { Vibration } from 'react-native';

// Configure Notifications behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

class AlarmServiceManager {
  private sound: Audio.Sound | null = null;
  private isRinging: boolean = false;
  private vibrationInterval: any = null;

  async init() {
    try {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        staysActiveInBackground: true,
        playsInSilentModeIOS: true,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
      });

      // Request notification permissions
      const { status } = await Notifications.getPermissionsAsync();
      if (status !== 'granted') {
        await Notifications.requestPermissionsAsync();
      }
    } catch (e) {
      console.warn('Failed to initialize Audio/Notification settings:', e);
    }
  }

  async triggerStageAlarm(stage: 'notify' | 'alarm' | 'critical' | 'arrived', destinationName: string) {
    if (stage === 'notify') {
      await this.sendNotification(
        '📍 Approaching Destination',
        `You are approaching ${destinationName}. Get ready!`
      );
      Vibration.vibrate(300);
      return;
    }

    // High alert or critical stage
    await this.stopAlarm();
    this.isRinging = true;

    const title = stage === 'critical' ? '🚨 WAKE UP NOW! Destination Reached' : '⏰ Alarm — WakeStop';
    const body = `Arriving at ${destinationName}. Wake up and get off the bus!`;

    await this.sendNotification(title, body);

    // Hardware vibration loop
    if (stage === 'critical') {
      Vibration.vibrate([0, 400, 100, 400, 100, 400], true);
    } else {
      Vibration.vibrate([0, 300, 200, 300], true);
    }

    // Play alarm audio
    try {
      const { sound } = await Audio.Sound.createAsync(
        { uri: 'https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3' },
        { shouldPlay: true, isLooping: true, volume: 1.0 }
      );
      this.sound = sound;
    } catch (e) {
      console.warn('Audio playback error, falling back to vibration:', e);
    }
  }

  private async sendNotification(title: string, body: string) {
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          sound: true,
          priority: Notifications.AndroidNotificationPriority.MAX,
        },
        trigger: null,
      });
    } catch (e) {
      console.warn('Failed to trigger local notification:', e);
    }
  }

  async stopAlarm() {
    this.isRinging = false;
    Vibration.cancel();
    if (this.vibrationInterval) {
      clearInterval(this.vibrationInterval);
      this.vibrationInterval = null;
    }

    if (this.sound) {
      try {
        await this.sound.stopAsync();
        await this.sound.unloadAsync();
      } catch (e) {}
      this.sound = null;
    }
  }

  getIsRinging(): boolean {
    return this.isRinging;
  }
}

export const AlarmService = new AlarmServiceManager();
