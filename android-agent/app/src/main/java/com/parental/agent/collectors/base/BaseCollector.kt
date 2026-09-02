package com.parental.agent.collectors.base

import android.content.Context
import com.parental.agent.data.local.AppDatabase
import com.parental.agent.data.local.AppPreferences
import com.parental.agent.data.local.entity.NormalizedEventEntity
import java.util.UUID

abstract class BaseCollector(protected val context: Context) {

    protected val database = AppDatabase.getInstance(context)
    protected val prefs = AppPreferences(context)

    abstract suspend fun collect(): Int

    protected suspend fun saveEvent(
        source: String,
        eventType: String,
        collectionMethod: String,
        payloadJson: String,
        deviceId: String = prefs.getDeviceId()
    ) {
        val activeDeviceId = if (deviceId.isBlank() || deviceId == "dev_local_agent") prefs.getDeviceId() else deviceId

        val event = NormalizedEventEntity(
            eventId = "evt_" + UUID.randomUUID().toString(),
            deviceId = activeDeviceId,
            source = source,
            eventType = eventType,
            timestamp = System.currentTimeMillis(),
            collectionMethod = collectionMethod,
            payloadJson = payloadJson,
            isSynced = false
        )
        database.eventDao().insertEvent(event)
    }
}
