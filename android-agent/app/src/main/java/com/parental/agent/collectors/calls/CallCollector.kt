package com.parental.agent.collectors.calls

import android.Manifest
import android.content.Context
import android.content.pm.PackageManager
import android.provider.CallLog
import androidx.core.app.ActivityCompat
import com.parental.agent.collectors.base.BaseCollector
import org.json.JSONObject

class CallCollector(context: Context) : BaseCollector(context) {

    override suspend fun collect(): Int {
        if (ActivityCompat.checkSelfPermission(context, Manifest.permission.READ_CALL_LOG) != PackageManager.PERMISSION_GRANTED) {
            return 0
        }

        var collectedCount = 0
        val lastSyncTime = prefs.getLastCallSyncTimestamp()
        var maxTimestamp = lastSyncTime

        try {
            val selection = if (lastSyncTime > 0) "${CallLog.Calls.DATE} > ?" else null
            val selectionArgs = if (lastSyncTime > 0) arrayOf(lastSyncTime.toString()) else null

            val cursor = context.contentResolver.query(
                CallLog.Calls.CONTENT_URI,
                arrayOf(
                    CallLog.Calls._ID,
                    CallLog.Calls.NUMBER,
                    CallLog.Calls.CACHED_NAME,
                    CallLog.Calls.TYPE,
                    CallLog.Calls.DATE,
                    CallLog.Calls.DURATION
                ),
                selection,
                selectionArgs,
                "${CallLog.Calls.DATE} DESC LIMIT 50"
            )

            cursor?.use {
                val numberIdx = it.getColumnIndex(CallLog.Calls.NUMBER)
                val nameIdx = it.getColumnIndex(CallLog.Calls.CACHED_NAME)
                val typeIdx = it.getColumnIndex(CallLog.Calls.TYPE)
                val dateIdx = it.getColumnIndex(CallLog.Calls.DATE)
                val durationIdx = it.getColumnIndex(CallLog.Calls.DURATION)

                while (it.moveToNext()) {
                    val number = if (numberIdx != -1) it.getString(numberIdx) ?: "Unknown" else "Unknown"
                    val name = if (nameIdx != -1) it.getString(nameIdx) ?: "" else ""
                    val type = if (typeIdx != -1) it.getInt(typeIdx) else CallLog.Calls.INCOMING_TYPE
                    val date = if (dateIdx != -1) it.getLong(dateIdx) else System.currentTimeMillis()
                    val duration = if (durationIdx != -1) it.getLong(durationIdx) else 0L

                    if (date > maxTimestamp) {
                        maxTimestamp = date
                    }

                    val typeStr = when (type) {
                        CallLog.Calls.INCOMING_TYPE -> "INCOMING"
                        CallLog.Calls.OUTGOING_TYPE -> "OUTGOING"
                        CallLog.Calls.MISSED_TYPE -> "MISSED"
                        CallLog.Calls.REJECTED_TYPE -> "REJECTED"
                        else -> "OTHER"
                    }

                    val cleanNum = number.replace(Regex("[^0-9+]"), "").ifEmpty { "unknown" }
                    val deterministicEventId = "evt_call_${cleanNum}_${typeStr}_${date / 1000}"

                    val payload = JSONObject().apply {
                        put("phoneNumber", number)
                        put("contactName", name)
                        put("callType", typeStr)
                        put("callDate", date)
                        put("durationSeconds", duration)
                    }

                    saveEvent(
                        source = "calls",
                        eventType = "call_record",
                        collectionMethod = "android_api",
                        payloadJson = payload.toString(),
                        deviceId = prefs.getDeviceId(),
                        eventId = deterministicEventId
                    )
                    collectedCount++
                }
            }

            if (maxTimestamp > lastSyncTime) {
                prefs.setLastCallSyncTimestamp(maxTimestamp)
            }
        } catch (e: Exception) {
            // Quiet fail
        }
        return collectedCount
    }
}
