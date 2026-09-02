package com.parental.agent.ota;

import android.app.PendingIntent;
import android.app.admin.DevicePolicyManager;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageInstaller;
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
    private static final ExecutorService executor = Executors.newSingleThreadExecutor();

    public interface OtaCallback {
        void onProgress(String jobId, String status, int progress, String error);
    }

    public static void downloadAndInstall(
            Context context,
            String apkUrl,
            String expectedSha256,
            String jobId,
            String backendUrl,
            OtaCallback callback
    ) {
        executor.execute(() -> {
            File destinationFile = new File(context.getCacheDir(), "ota_update_v220.apk");

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
                        int progress = (int) ((total * 70) / fileLength) + 10;
                        callback.onProgress(jobId, "DOWNLOADING", progress, null);
                    }
                }

                output.flush();
                output.close();
                input.close();

                Log.d(TAG, "Download complete. Verifying SHA-256 Checksum...");
                if (callback != null) callback.onProgress(jobId, "VERIFYING", 85, null);

                // 2. Verify SHA-256 Integrity
                if (expectedSha256 != null && !expectedSha256.isEmpty()) {
                    String actualSha256 = calculateSha256(destinationFile);
                    if (!expectedSha256.equalsIgnoreCase(actualSha256)) {
                        throw new SecurityException("SHA-256 mismatch! Expected: " + expectedSha256 + ", Actual: " + actualSha256);
                    }
                }

                Log.d(TAG, "SHA-256 verified. Executing PackageInstaller Session...");
                if (callback != null) callback.onProgress(jobId, "INSTALLING", 95, null);

                // 3. Silent Unattended Installation via PackageInstaller API
                executePackageInstallerSession(context, destinationFile, jobId);

            } catch (Exception e) {
                Log.e(TAG, "OTA Update failed: " + e.getMessage(), e);
                if (callback != null) callback.onProgress(jobId, "FAILED", 0, e.getMessage());
            }
        });
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

    private static void executePackageInstallerSession(Context context, File apkFile, String jobId) throws Exception {
        DevicePolicyManager dpm = (DevicePolicyManager) context.getSystemService(Context.DEVICE_POLICY_SERVICE);
        boolean isDeviceOwner = dpm != null && dpm.isDeviceOwnerApp(context.getPackageName());

        Log.d(TAG, "PackageInstaller session initialization. Device Owner Mode: " + isDeviceOwner);

        PackageInstaller packageInstaller = context.getPackageManager().getPackageInstaller();
        PackageInstaller.SessionParams params = new PackageInstaller.SessionParams(
                PackageInstaller.SessionParams.MODE_FULL_INSTALL
        );
        params.setAppPackageName(context.getPackageName());

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

        // Commit silent replacement session (Zero user interaction required in Device Owner Mode)
        session.commit(pendingIntent.getIntentSender());
        Log.d(TAG, "PackageInstaller Session committed successfully. Session ID: " + sessionId);
    }
}
