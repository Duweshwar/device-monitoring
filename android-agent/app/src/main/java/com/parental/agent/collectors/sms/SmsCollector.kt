package com.parental.agent.collectors.sms

import android.Manifest
import android.content.Context
import android.content.pm.PackageManager
import android.provider.Telephony
import androidx.core.app.ActivityCompat
import com.parental.agent.collectors.base.BaseCollector
import org.json.JSONObject

class SmsCollector(context: Context) : BaseCollector(context) {

    override suspend fun collect(): Int {
        if (ActivityCompat.checkSelfPermission(context, Manifest.permission.READ_SMS) != PackageManager.PERMISSION_GRANTED) {
            return 0
        }

        var collectedCount = 0
        val lastSyncTime = prefs.getLastSmsSyncTimestamp()
        var maxTimestamp = lastSyncTime

        try {
            val selection = if (lastSyncTime > 0) "${Telephony.Sms.DATE} > ?" else null
            val selectionArgs = if (lastSyncTime > 0) arrayOf(lastSyncTime.toString()) else null

            val cursor = context.contentResolver.query(
                Telephony.Sms.CONTENT_URI,
                arrayOf(
                    Telephony.Sms._ID,
                    Telephony.Sms.ADDRESS,
                    Telephony.Sms.BODY,
                    Telephony.Sms.DATE,
                    Telephony.Sms.TYPE
                ),
                selection,
                selectionArgs,
                "${Telephony.Sms.DATE} ASC LIMIT 50"
            )

            cursor?.use {
                val addressIdx = it.getColumnIndex(Telephony.Sms.ADDRESS)
                val bodyIdx = it.getColumnIndex(Telephony.Sms.BODY)
                val dateIdx = it.getColumnIndex(Telephony.Sms.DATE)
                val typeIdx = it.getColumnIndex(Telephony.Sms.TYPE)

                while (it.moveToNext()) {
                    val address = if (addressIdx != -1) it.getString(addressIdx) ?: "Unknown" else "Unknown"
                    val body = if (bodyIdx != -1) it.getString(bodyIdx) ?: "" else ""
                    val date = if (dateIdx != -1) it.getLong(dateIdx) else System.currentTimeMillis()
                    val type = if (typeIdx != -1) it.getInt(typeIdx) else Telephony.Sms.MESSAGE_TYPE_INBOX

                    if (date > maxTimestamp) {
                        maxTimestamp = date
                    }

                    val typeStr = when (type) {
                        Telephony.Sms.MESSAGE_TYPE_INBOX -> "RECEIVED"
                        Telephony.Sms.MESSAGE_TYPE_SENT -> "SENT"
                        else -> "OTHER"
                    }

                    val payload = JSONObject().apply {
                        put("address", address)
                        put("messageBody", body)
                        put("smsDate", date)
                        put("direction", typeStr)
                    }

                    saveEvent(
                        source = "sms",
                        eventType = "sms_record",
                        collectionMethod = "android_api",
                        payloadJson = payload.toString()
                    )
                    collectedCount++
                }
            }

            if (maxTimestamp > lastSyncTime) {
                prefs.setLastSmsSyncTimestamp(maxTimestamp)
            }
        } catch (e: Exception) {
            // Quiet fail
        }
        return collectedCount
    }
}
