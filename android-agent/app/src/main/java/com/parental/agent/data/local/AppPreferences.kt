package com.parental.agent.data.local

import android.content.Context
import android.content.SharedPreferences
import androidx.security.crypto.EncryptedSharedPreferences
import androidx.security.crypto.MasterKey

class AppPreferences(context: Context) {

    private val sharedPreferences: SharedPreferences

    init {
        val masterKey = MasterKey.Builder(context)
            .setKeyScheme(MasterKey.KeyScheme.AES256_GCM)
            .build()

        sharedPreferences = EncryptedSharedPreferences.create(
            context,
            "agent_encrypted_prefs",
            masterKey,
            EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
            EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM
        )
    }

    fun isUninstallationAllowed(): Boolean {
        return sharedPreferences.getBoolean(KEY_UNINSTALL_ALLOWED, false)
    }

    fun setUninstallationAllowed(allowed: Boolean) {
        sharedPreferences.edit().putBoolean(KEY_UNINSTALL_ALLOWED, allowed).apply()
    }

    fun getDeviceToken(): String? {
        return sharedPreferences.getString(KEY_DEVICE_TOKEN, null)
    }

    fun setDeviceToken(token: String) {
        sharedPreferences.edit().putString(KEY_DEVICE_TOKEN, token).apply()
    }

    companion object {
        private const val KEY_UNINSTALL_ALLOWED = "key_uninstall_allowed"
        private const val KEY_DEVICE_TOKEN = "key_device_token"
    }
}
