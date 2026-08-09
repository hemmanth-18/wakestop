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

        // 1. Direct phone physical volume rocker buttons strictly to STREAM_ALARM
        setVolumeControlStream(AudioManager.STREAM_ALARM);

        // 2. Bind audio routing strictly to phone's STREAM_ALARM channel
        bindToAlarmVolumeStream();
    }

    @Override
    public void onResume() {
        super.onResume();
        bindToAlarmVolumeStream();
    }

    private void bindToAlarmVolumeStream() {
        try {
            AudioManager audioManager = (AudioManager) getSystemService(AUDIO_SERVICE);
            if (audioManager != null) {
                // Ensure audio mode is normal so STREAM_ALARM operates as designed
                audioManager.setMode(AudioManager.MODE_NORMAL);

                // Request USAGE_ALARM focus so all playback strictly depends on the user's Alarm Volume setting
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
