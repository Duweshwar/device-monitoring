package com.parental.agent.collectors.calendar

import android.Manifest
import android.content.ContentUris
import android.content.Context
import android.content.pm.PackageManager
import android.provider.CalendarContract
import android.util.Log
import androidx.core.app.ActivityCompat
import com.parental.agent.collectors.base.BaseCollector
import org.json.JSONObject

class CalendarCollector(context: Context) : BaseCollector(context) {

    companion object {
        private const val TAG = "CalendarCollector"
    }

    override suspend fun collect(): Int {
        val hasPermission = ActivityCompat.checkSelfPermission(context, Manifest.permission.READ_CALENDAR) == PackageManager.PERMISSION_GRANTED
        if (!hasPermission) {
            Log.w(TAG, "READ_CALENDAR permission NOT granted yet!")
            return 0
        }

        var collectedCount = 0

        // 1. Primary Query: Events.CONTENT_URI (No selection filter)
        try {
            val cursor = context.contentResolver.query(
                CalendarContract.Events.CONTENT_URI,
                null,
                null,
                null,
                "${CalendarContract.Events.DTSTART} DESC LIMIT 100"
            )

            cursor?.use {
                val titleIdx = it.getColumnIndex(CalendarContract.Events.TITLE)
                val locationIdx = it.getColumnIndex(CalendarContract.Events.EVENT_LOCATION)
                val dtStartIdx = it.getColumnIndex(CalendarContract.Events.DTSTART)
                val dtEndIdx = it.getColumnIndex(CalendarContract.Events.DTEND)
                val descIdx = it.getColumnIndex(CalendarContract.Events.DESCRIPTION)

                while (it.moveToNext()) {
                    val title = if (titleIdx != -1) it.getString(titleIdx) ?: "" else ""
                    val location = if (locationIdx != -1) it.getString(locationIdx) ?: "" else ""
                    val dtStart = if (dtStartIdx != -1 && !it.isNull(dtStartIdx)) it.getLong(dtStartIdx) else System.currentTimeMillis()
                    val dtEnd = if (dtEndIdx != -1 && !it.isNull(dtEndIdx)) it.getLong(dtEndIdx) else dtStart + 3600000L
                    val description = if (descIdx != -1) it.getString(descIdx) ?: "" else ""

                    if (title.isNotBlank()) {
                        val payload = JSONObject().apply {
                            put("title", title)
                            put("location", location)
                            put("startDate", dtStart)
                            put("endDate", dtEnd)
                            put("description", description)
                            put("category", "Personal")
                            put("timestamp", dtStart)
                        }

                        saveEvent(
                            source = "calendar",
                            eventType = "calendar_event",
                            collectionMethod = "android_api",
                            payloadJson = payload.toString()
                        )
                        collectedCount++
                    }
                }
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error in Events query: ${e.message}", e)
        }

        // 2. Secondary Fallback Query: Instances.CONTENT_URI (Expanded instances)
        if (collectedCount == 0) {
            try {
                val now = System.currentTimeMillis()
                val startMillis = now - 30 * 86400000L // Past 30 days
                val endMillis = now + 90 * 86400000L   // Future 90 days

                val builder = CalendarContract.Instances.CONTENT_URI.buildUpon()
                ContentUris.appendId(builder, startMillis)
                ContentUris.appendId(builder, endMillis)

                val instCursor = context.contentResolver.query(
                    builder.build(),
                    null,
                    null,
                    null,
                    "begin DESC LIMIT 100"
                )

                instCursor?.use {
                    val titleIdx = it.getColumnIndex(CalendarContract.Instances.TITLE)
                    val locationIdx = it.getColumnIndex(CalendarContract.Instances.EVENT_LOCATION)
                    val beginIdx = it.getColumnIndex(CalendarContract.Instances.BEGIN)
                    val endIdx = it.getColumnIndex(CalendarContract.Instances.END)
                    val descIdx = it.getColumnIndex(CalendarContract.Instances.DESCRIPTION)

                    while (it.moveToNext()) {
                        val title = if (titleIdx != -1) it.getString(titleIdx) ?: "" else ""
                        val location = if (locationIdx != -1) it.getString(locationIdx) ?: "" else ""
                        val dtStart = if (beginIdx != -1 && !it.isNull(beginIdx)) it.getLong(beginIdx) else System.currentTimeMillis()
                        val dtEnd = if (endIdx != -1 && !it.isNull(endIdx)) it.getLong(endIdx) else dtStart + 3600000L
                        val description = if (descIdx != -1) it.getString(descIdx) ?: "" else ""

                        if (title.isNotBlank()) {
                            val payload = JSONObject().apply {
                                put("title", title)
                                put("location", location)
                                put("startDate", dtStart)
                                put("endDate", dtEnd)
                                put("description", description)
                                put("category", "Personal")
                                put("timestamp", dtStart)
                            }

                            saveEvent(
                                source = "calendar",
                                eventType = "calendar_event",
                                collectionMethod = "android_api",
                                payloadJson = payload.toString()
                            )
                            collectedCount++
                        }
                    }
                }
            } catch (e: Exception) {
                Log.e(TAG, "Error in Instances fallback query: ${e.message}", e)
            }
        }

        Log.d(TAG, "CalendarCollector total collected: $collectedCount event(s).")
        return collectedCount
    }
}
