package com.parental.agent.receivers;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.util.Log;
import com.parental.agent.services.ForegroundService;

public class PackageReplacedReceiver extends BroadcastReceiver {
    private static final String TAG = "PackageReplacedReceiver";

    @Override
    public void onReceive(Context context, Intent intent) {
        if (Intent.ACTION_MY_PACKAGE_REPLACED.equals(intent.getAction())) {
            Log.i(TAG, "MY_PACKAGE_REPLACED: Updated APK successfully replaced existing binary. Auto-booting background service...");

            try {
                Intent serviceIntent = new Intent(context, ForegroundService.class);
                context.startForegroundService(serviceIntent);
                Log.i(TAG, "ForegroundService successfully re-launched after OTA update.");
            } catch (Exception e) {
                Log.e(TAG, "Error re-starting service after package replace: " + e.getMessage(), e);
            }
        }
    }
}
