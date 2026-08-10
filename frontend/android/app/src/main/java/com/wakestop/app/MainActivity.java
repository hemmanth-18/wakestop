package com.wakestop.app;

import android.content.Intent;
import android.media.AudioAttributes;
import android.media.AudioFocusRequest;
import android.media.AudioManager;
import android.media.Ringtone;
import android.media.RingtoneManager;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import com.getcapacitor.BridgeActivity;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

public class MainActivity extends BridgeActivity {

    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(AlarmStreamPlugin.class);
        super.onCreate(savedInstanceState);

        // Direct hardware volume rocker buttons strictly to STREAM_ALARM channel
        setVolumeControlStream(AudioManager.STREAM_ALARM);

        bindToAlarmVolumeStream();
        startForegroundLocationService();
    }

    @Override
    public void onResume() {
        super.onResume();
        bindToAlarmVolumeStream();
        startForegroundLocationService();
    }

    private void startForegroundLocationService() {
        try {
            Intent serviceIntent = new Intent(this, BackgroundLocationService.class);
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                startForegroundService(serviceIntent);
            } else {
                startService(serviceIntent);
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    private void bindToAlarmVolumeStream() {
        try {
            AudioManager audioManager = (AudioManager) getSystemService(AUDIO_SERVICE);
            if (audioManager != null) {
                audioManager.setMode(AudioManager.MODE_NORMAL);

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

@CapacitorPlugin(name = "AlarmStream")
class AlarmStreamPlugin extends Plugin {
    private static Ringtone alarmRingtone;

    @PluginMethod
    public void playAlarm(PluginCall call) {
        try {
            if (alarmRingtone != null && alarmRingtone.isPlaying()) {
                alarmRingtone.stop();
            }

            Uri alarmUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM);
            if (alarmUri == null) {
                alarmUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION);
            }

            alarmRingtone = RingtoneManager.getRingtone(getContext(), alarmUri);

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P && alarmRingtone != null) {
                alarmRingtone.setLooping(true);
            }

            if (alarmRingtone != null) {
                AudioAttributes aa = new AudioAttributes.Builder()
                    .setUsage(AudioAttributes.USAGE_ALARM)
                    .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                    .build();

                alarmRingtone.setAudioAttributes(aa);
                alarmRingtone.play();
            }

            call.resolve();
        } catch (Exception e) {
            call.reject("Failed to play alarm on STREAM_ALARM: " + e.getMessage());
        }
    }

    @PluginMethod
    public void stopAlarm(PluginCall call) {
        try {
            if (alarmRingtone != null && alarmRingtone.isPlaying()) {
                alarmRingtone.stop();
            }
            call.resolve();
        } catch (Exception e) {
            call.reject("Failed to stop alarm: " + e.getMessage());
        }
    }
}
