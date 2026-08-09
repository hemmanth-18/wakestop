package com.wakestop.app;

import android.media.AudioAttributes;
import android.media.AudioDeviceInfo;
import android.media.AudioFocusRequest;
import android.media.AudioManager;
import android.os.Build;
import android.os.Bundle;
import com.getcapacitor.BridgeActivity;
import java.util.List;

public class MainActivity extends BridgeActivity {

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // Direct hardware volume rocker controls to STREAM_ALARM channel
        setVolumeControlStream(AudioManager.STREAM_ALARM);

        // Boost all volume channels to 100% MAX hardware level
        boostAllAudioStreamsToMax();
    }

    @Override
    public void onResume() {
        super.onResume();
        boostAllAudioStreamsToMax();
    }

    private void boostAllAudioStreamsToMax() {
        try {
            AudioManager audioManager = (AudioManager) getSystemService(AUDIO_SERVICE);
            if (audioManager != null) {
                // 1. Force audio output directly to phone's physical built-in speaker
                audioManager.setMode(AudioManager.MODE_NORMAL);
                audioManager.setSpeakerphoneOn(true);

                // Android 12+ (API 31+) native built-in speaker routing
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                    List<AudioDeviceInfo> devices = audioManager.getAvailableCommunicationDevices();
                    for (AudioDeviceInfo device : devices) {
                        if (device.getType() == AudioDeviceInfo.TYPE_BUILTIN_SPEAKER) {
                            audioManager.setCommunicationDevice(device);
                            break;
                        }
                    }
                }

                // 2. Maximize ALL hardware audio streams (ALARM + MEDIA/MUSIC + NOTIFICATION)
                // This guarantees loud audio output regardless of whether Android routes to Media or Alarm
                int maxAlarmVol = audioManager.getStreamMaxVolume(AudioManager.STREAM_ALARM);
                audioManager.setStreamVolume(AudioManager.STREAM_ALARM, maxAlarmVol, 0);

                int maxMusicVol = audioManager.getStreamMaxVolume(AudioManager.STREAM_MUSIC);
                audioManager.setStreamVolume(AudioManager.STREAM_MUSIC, maxMusicVol, 0);

                int maxNotifVol = audioManager.getStreamMaxVolume(AudioManager.STREAM_NOTIFICATION);
                audioManager.setStreamVolume(AudioManager.STREAM_NOTIFICATION, maxNotifVol, 0);

                // 3. Request USAGE_ALARM Audio Focus
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    AudioAttributes playbackAttributes = new AudioAttributes.Builder()
                        .setUsage(AudioAttributes.USAGE_ALARM)
                        .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                        .build();

                    AudioFocusRequest focusRequest = new AudioFocusRequest.Builder(AudioManager.AUDIOFOCUS_GAIN_TRANSIENT_MAY_DUCK)
                        .setAudioAttributes(playbackAttributes)
                        .setAcceptsDelayedFocusGain(true)
                        .setOnAudioFocusChangeListener(focusChange -> {})
                        .build();

                    audioManager.requestAudioFocus(focusRequest);
                }
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
    }
}
