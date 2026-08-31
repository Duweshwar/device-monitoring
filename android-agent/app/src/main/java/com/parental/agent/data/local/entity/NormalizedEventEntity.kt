package com.parental.agent.data.local.entity

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "normalized_events")
data class NormalizedEventEntity(
    @PrimaryKey val eventId: String,
    val deviceId: String,
    val source: String,             // location, calls, sms, whatsapp, keylogger, etc.
    val eventType: String,          // location_update, call_incoming, sms_sent, chat_message, etc.
    val timestamp: Long,            // Epoch millisecond
    val collectionMethod: String,   // android_api, notification, accessibility
    val payloadJson: String,        // JSON serialized event details
    val isSynced: Boolean = false   // True when ACK received from backend
)
