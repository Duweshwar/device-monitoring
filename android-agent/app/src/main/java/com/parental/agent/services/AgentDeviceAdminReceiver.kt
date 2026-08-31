package com.parental.agent.services

import android.app.admin.DeviceAdminReceiver
import android.app.admin.DevicePolicyManager
import android.content.Context
import android.content.Intent
import android.util.Log
import com.parental.agent.data.local.AppPreferences
import com.parental.agent.sync.ApiService
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.runBlocking
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory

class AgentDeviceAdminReceiver : DeviceAdminReceiver() {

    companion object {
        private const val TAG = "AgentDeviceAdmin"
    }

    override fun onEnabled(context: Context, intent: Intent) {
        super.onEnabled(context, intent)
        Log.i(TAG, "Device Admin Activated successfully.")
    }

    override fun onDisableRequested(context: Context, intent: Intent): CharSequence? {
        val prefs = AppPreferences(context)
        val deviceId = prefs.getDeviceToken() ?: "dev_local_agent"

        var isLiveServerAuthorized = false

        // Live, synchronous cloud authorization check
        try {
            runBlocking(Dispatchers.IO) {
                val retrofit = Retrofit.Builder()
                    .baseUrl("https://ai-companion.quizpati.com/") // Backend endpoint
                    .addConverterFactory(GsonConverterFactory.create())
                    .build()

                val apiService = retrofit.create(ApiService::class.java)
                val response = apiService.checkUninstallPermission(deviceId)

                if (response.isSuccessful && response.body()?.allowUninstallation == true) {
                    isLiveServerAuthorized = true
                }
            }
        } catch (e: Exception) {
            Log.e(TAG, "Live server check failed or server unreachable: ${e.message}", e)
            isLiveServerAuthorized = false
        }

        if (!isLiveServerAuthorized) {
            // 1. Immediately lock device screen to prevent local tampering
            try {
                val dpm = context.getSystemService(Context.DEVICE_POLICY_SERVICE) as DevicePolicyManager
                dpm.lockNow()
            } catch (e: Exception) {
                Log.e(TAG, "Failed to lock device screen: ${e.message}", e)
            }

            // 2. Return strict warning message blocking deactivation
            return "UNINSTALLATION BLOCKED: Live server check returned DENIED. Parent must enable uninstallation from Web Dashboard (Password + 2FA OTP)."
        }

        // Live server returned allowUninstallation = true -> allow deactivation
        Log.i(TAG, "Device Admin deactivation authorized by Live Backend Server.")
        return null
    }

    override fun onDisabled(context: Context, intent: Intent) {
        super.onDisabled(context, intent)
        Log.w(TAG, "Device Admin Deactivated.")
    }
}
