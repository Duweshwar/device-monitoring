package com.parental.agent.policy

import android.Manifest
import android.content.ContentValues
import android.content.Context
import android.content.pm.PackageManager
import android.media.AudioManager
import android.os.Build
import android.provider.BlockedNumberContract
import android.telecom.TelecomManager
import android.telephony.TelephonyManager
import android.util.Log
import androidx.core.content.ContextCompat
import com.parental.agent.data.local.AppDatabase
import com.parental.agent.data.local.AppPreferences
import com.parental.agent.data.local.entity.NormalizedEventEntity
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import org.json.JSONObject
import java.util.UUID
import java.util.concurrent.ConcurrentHashMap

class CallBlocker private constructor() {

    companion object {
        private const val TAG = "CallBlocker"

        @Volatile
        private var instance: CallBlocker? = null

        fun getInstance(): CallBlocker {
            return instance ?: synchronized(this) {
                instance ?: CallBlocker().also { instance = it }
            }
        }
    }

    // Thread-safe set of blocked phone numbers
    private val blockedNumbers = ConcurrentHashMap.newKeySet<String>().apply {
        add("+19998887777")
    }

    fun loadFromLocalPrefs(context: Context) {
        val prefs = AppPreferences(context)
        val saved = prefs.getBlockedNumbers()
        if (saved.isNotEmpty()) {
            blockedNumbers.clear()
            saved.forEach { addBlockedNumber(it) }
            Log.i(TAG, "Loaded ${saved.size} blocked phone numbers from local storage!")
        }
    }

    fun updateBlockedNumbers(numbers: List<String>, context: Context? = null) {
        val normalizedNewSet = numbers.map { normalizePhoneNumber(it) }.filter { it.isNotEmpty() }.toSet()
        if (blockedNumbers == normalizedNewSet) return
        blockedNumbers.clear()
        numbers.forEach { addBlockedNumber(it) }
        if (context != null) {
            val prefs = AppPreferences(context)
            prefs.setBlockedNumbers(numbers.toSet())
            syncWithSystemBlockedNumbers(context, numbers)
        }
        Log.i(TAG, "Updated blocked phone numbers policy: ${blockedNumbers.joinToString()}")
    }

    private fun syncWithSystemBlockedNumbers(context: Context, numbers: List<String>) {
        CoroutineScope(Dispatchers.IO).launch {
            try {
                if (!BlockedNumberContract.canCurrentUserBlockNumbers(context)) return@launch

                numbers.forEach { number ->
                    try {
                        val values = ContentValues().apply {
                            put(BlockedNumberContract.BlockedNumbers.COLUMN_ORIGINAL_NUMBER, number)
                        }
                        context.contentResolver.insert(BlockedNumberContract.BlockedNumbers.CONTENT_URI, values)
                        Log.i(TAG, "Synced $number with Android System BlockedNumberContract provider.")
                    } catch (e: Exception) {
                        // Already inserted or permission missing
                    }
                }
            } catch (e: Exception) {
                Log.w(TAG, "System BlockedNumberContract sync skipped: ${e.message}")
            }
        }
    }

    fun addBlockedNumber(number: String) {
        val normalized = normalizePhoneNumber(number)
        if (normalized.isNotEmpty()) {
            blockedNumbers.add(normalized)
            Log.i(TAG, "Added blocked phone number: $normalized")
        }
    }

    fun removeBlockedNumber(number: String) {
        val normalized = normalizePhoneNumber(number)
        blockedNumbers.remove(normalized)
        Log.i(TAG, "Removed blocked phone number: $normalized")
    }

    fun shouldBlockCall(phoneNumber: String?): Boolean {
        if (phoneNumber.isNullOrBlank() || 
            phoneNumber.equals("Unknown", ignoreCase = true) || 
            phoneNumber.equals("Private", ignoreCase = true) ||
            phoneNumber.equals("Restricted", ignoreCase = true) ||
            phoneNumber.equals("Anonymous", ignoreCase = true)) {
            return false
        }
        val normalizedIncoming = normalizePhoneNumber(phoneNumber)
        if (normalizedIncoming.isEmpty()) return false

        return blockedNumbers.any { blocked ->
            val normalizedBlocked = normalizePhoneNumber(blocked)
            normalizedBlocked.isNotEmpty() && (normalizedIncoming.endsWith(normalizedBlocked) || normalizedBlocked.endsWith(normalizedIncoming))
        }
    }

    @Volatile
    var isBlockedCallRinging: Boolean = false

    /**
     * Rejects an incoming call if the caller is on the parental blocked list.
     */
    fun checkAndBlockIncomingCall(context: Context, incomingNumber: String?): Boolean {
        if (!shouldBlockCall(incomingNumber)) return false

        isBlockedCallRinging = true
        Log.w(TAG, "Incoming call from blocked number $incomingNumber detected! Rejection initiated...")

        // 1. Mute ringer immediately to avoid disturbing the child
        try {
            val audioManager = context.getSystemService(Context.AUDIO_SERVICE) as AudioManager
            audioManager.ringerMode = AudioManager.RINGER_MODE_SILENT
        } catch (e: Exception) {
            Log.e(TAG, "Failed to mute ringer: ${e.message}")
        }

        // 2. End Call via TelecomManager (Android 9 Pie+) if permission is granted
        var callEnded = false
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
            try {
                if (ContextCompat.checkSelfPermission(context, Manifest.permission.ANSWER_PHONE_CALLS) == PackageManager.PERMISSION_GRANTED) {
                    val telecomManager = context.getSystemService(Context.TELECOM_SERVICE) as TelecomManager
                    callEnded = telecomManager.endCall()
                    Log.i(TAG, "Call policy matched ($incomingNumber): TelecomManager endCall()=$callEnded")
                } else {
                    Log.w(TAG, "ANSWER_PHONE_CALLS permission not granted yet! CallScreeningService/Accessibility handling rejection...")
                }
            } catch (e: Exception) {
                Log.w(TAG, "TelecomManager endCall failed: ${e.message}")
            }
        }

        // 3. Save telemetry event alert to Room DB for backend sync
        try {
            val database = AppDatabase.getInstance(context)
            val prefs = AppPreferences(context)
            val event = NormalizedEventEntity(
                eventId = "evt_call_blocked_${UUID.randomUUID()}",
                deviceId = prefs.getDeviceId(),
                source = "telecom",
                eventType = "CALL_BLOCKED",
                timestamp = System.currentTimeMillis(),
                collectionMethod = "call_blocker",
                payloadJson = JSONObject(mapOf(
                    "phoneNumber" to (incomingNumber ?: "Unknown"),
                    "status" to "REJECTED_BY_POLICY",
                    "timestamp" to System.currentTimeMillis()
                )).toString(),
                isSynced = false
            )
            CoroutineScope(Dispatchers.IO).launch {
                database.eventDao().insertEvent(event)
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error saving CALL_BLOCKED event: ${e.message}")
        }

        return true
    }

    private fun normalizePhoneNumber(rawNumber: String): String {
        return rawNumber.replace(Regex("[^0-9]"), "")
    }
}
