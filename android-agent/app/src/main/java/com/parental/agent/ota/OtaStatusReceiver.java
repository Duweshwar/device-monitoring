package com.parental.agent.ota;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageInstaller;
import android.os.Build;
import android.util.Log;

public class OtaStatusReceiver extends BroadcastReceiver {
    private static final String TAG = "OtaStatusReceiver";

    @Override
    @SuppressWarnings("deprecation")
    public void onReceive(Context context, Intent intent) {
        int status = intent.getIntExtra(PackageInstaller.EXTRA_STATUS, -1);
        String message = intent.getStringExtra(PackageInstaller.EXTRA_STATUS_MESSAGE);
        String jobId = intent.getStringExtra("jobId");

        Log.d(TAG, "OTA PackageInstaller Callback Status: " + status + " (" + message + ") for Job: " + jobId);

        if (status == PackageInstaller.STATUS_SUCCESS) {
            Log.i(TAG, "SUCCESS: Silent OTA Package Replacement Succeeded! App updated.");
        } else if (status == PackageInstaller.STATUS_PENDING_USER_ACTION) {
            Log.w(TAG, "PENDING_USER_ACTION: Non-Device Owner fallback triggered.");
            
            Intent confirmIntent;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                confirmIntent = intent.getParcelableExtra(Intent.EXTRA_INTENT, Intent.class);
            } else {
                confirmIntent = intent.getParcelableExtra(Intent.EXTRA_INTENT);
            }

            if (confirmIntent != null) {
                confirmIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                context.startActivity(confirmIntent);
            }
        } else {
            Log.e(TAG, "FAILED: PackageInstaller session failed with status: " + status + " message: " + message);
        }
    }
}
