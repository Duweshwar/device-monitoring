package com.parental.agent.collectors.base

import android.content.Context
import com.parental.agent.data.local.AppDatabase
import com.parental.agent.data.local.entity.NormalizedEventEntity
import java.util.UUID

abstract class BaseCollector(protected val context: Context) {

    protected val database = AppDatabase.getInstance(context)

    abstract suspend fun collect(): Int

    protected suspend fun saveEvent(
        source: String,
        eventType: String,
        collectionMethod: String,
        payloadJson: String,
        deviceId: String = "dev_local_agent"
    ) {
        val event = NormalizedEventEntity(
            eventId = "evt_" + UUID.randomUUID().toString(),
            deviceId = deviceId,
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
