package com.parental.agent.data.local

import android.content.Context
import android.content.SharedPreferences
import androidx.security.crypto.EncryptedSharedPreferences
import androidx.security.crypto.MasterKey
import java.util.UUID

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

    fun getDeviceId(): String {
        var id = sharedPreferences.getString(KEY_DEVICE_ID, null)
        if (id == null) {
            id = UUID.randomUUID().toString()
            sharedPreferences.edit().putString(KEY_DEVICE_ID, id).apply()
        }
        return id
    }

    fun isTermsAccepted(): Boolean {
        return sharedPreferences.getBoolean(KEY_TERMS_ACCEPTED, false)
    }

    fun setTermsAccepted(accepted: Boolean) {
        sharedPreferences.edit().putBoolean(KEY_TERMS_ACCEPTED, accepted).apply()
    }

    fun isDevicePaired(): Boolean {
        return sharedPreferences.getBoolean(KEY_DEVICE_PAIRED, false)
    }

    fun setDevicePaired(paired: Boolean) {
        sharedPreferences.edit().putBoolean(KEY_DEVICE_PAIRED, paired).apply()
    }

    fun getPairedDeviceName(): String {
        return sharedPreferences.getString(KEY_PAIRED_DEVICE_NAME, "Target Device") ?: "Target Device"
    }

    fun setPairedDeviceName(name: String) {
        sharedPreferences.edit().putString(KEY_PAIRED_DEVICE_NAME, name).apply()
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

    fun getLastCallSyncTimestamp(): Long {
        return sharedPreferences.getLong(KEY_LAST_CALL_TIMESTAMP, 0L)
    }

    fun setLastCallSyncTimestamp(timestamp: Long) {
        sharedPreferences.edit().putLong(KEY_LAST_CALL_TIMESTAMP, timestamp).apply()
    }

    fun getLastSmsSyncTimestamp(): Long {
        return sharedPreferences.getLong(KEY_LAST_SMS_TIMESTAMP, 0L)
    }

    fun setLastSmsSyncTimestamp(timestamp: Long) {
        sharedPreferences.edit().putLong(KEY_LAST_SMS_TIMESTAMP, timestamp).apply()
    }

    fun getBlockedApps(): Set<String> {
        return sharedPreferences.getStringSet(KEY_BLOCKED_APPS, emptySet()) ?: emptySet()
    }

    fun setBlockedApps(packages: Set<String>) {
        sharedPreferences.edit().putStringSet(KEY_BLOCKED_APPS, packages).apply()
    }

    fun getBlockedNumbers(): Set<String> {
        return sharedPreferences.getStringSet(KEY_BLOCKED_NUMBERS, emptySet()) ?: emptySet()
    }

    fun setBlockedNumbers(numbers: Set<String>) {
        sharedPreferences.edit().putStringSet(KEY_BLOCKED_NUMBERS, numbers).apply()
    }

    fun getBlockedDomains(): Set<String> {
        return sharedPreferences.getStringSet(KEY_BLOCKED_DOMAINS, emptySet()) ?: emptySet()
    }

    fun setBlockedDomains(domains: Set<String>) {
        sharedPreferences.edit().putStringSet(KEY_BLOCKED_DOMAINS, domains).apply()
    }

    fun getServerBaseUrl(): String {
        return sharedPreferences.getString(KEY_SERVER_URL, "http://10.0.2.2:3000") ?: "http://10.0.2.2:3000"
    }

    fun setServerBaseUrl(url: String) {
        val clean = url.trim().removeSuffix("/")
        sharedPreferences.edit().putString(KEY_SERVER_URL, clean).apply()
    }

    companion object {
        private const val KEY_DEVICE_ID = "key_device_id"
        private const val KEY_TERMS_ACCEPTED = "key_terms_accepted"
        private const val KEY_DEVICE_PAIRED = "key_device_paired"
        private const val KEY_PAIRED_DEVICE_NAME = "key_paired_device_name"
        private const val KEY_UNINSTALL_ALLOWED = "key_uninstall_allowed"
        private const val KEY_DEVICE_TOKEN = "key_device_token"
        private const val KEY_LAST_CALL_TIMESTAMP = "key_last_call_timestamp"
        private const val KEY_LAST_SMS_TIMESTAMP = "key_last_sms_timestamp"
        private const val KEY_BLOCKED_APPS = "key_blocked_apps"
        private const val KEY_BLOCKED_NUMBERS = "key_blocked_numbers"
        private const val KEY_BLOCKED_DOMAINS = "key_blocked_domains"
        private const val KEY_SERVER_URL = "key_server_url"
    }
}
