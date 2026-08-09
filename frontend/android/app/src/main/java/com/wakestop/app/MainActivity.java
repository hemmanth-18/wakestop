package com.wakestop.app;

import android.media.AudioAttributes;
import android.media.AudioFocusRequest;
import android.media.AudioManager;
import android.os.Build;
import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // 1. Direct hardware volume controls to STREAM_ALARM channel
        setVolumeControlStream(AudioManager.STREAM_ALARM);

        // 2. Emergency Alarm Stream Override (FindHub / Smart Alert style)
        // Automatically boosts Alarm volume channel to 100% MAX and overrides silent/vibrate restrictions
        try {
            AudioManager audioManager = (AudioManager) getSystemService(AUDIO_SERVICE);
            if (audioManager != null) {
                int maxAlarmVol = audioManager.getStreamMaxVolume(AudioManager.STREAM_ALARM);
                audioManager.setStreamVolume(AudioManager.STREAM_ALARM, maxAlarmVol, 0);

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
