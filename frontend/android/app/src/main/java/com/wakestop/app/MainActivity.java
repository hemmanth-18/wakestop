package com.wakestop.app;

import android.media.AudioManager;
import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        // Direct all app audio and volume controls to Android's native STREAM_ALARM channel
        // Rings through Android Alarm volume even if media volume or silent mode is enabled
        setVolumeControlStream(AudioManager.STREAM_ALARM);
    }
}
