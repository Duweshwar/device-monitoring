package com.parental.agent.data.local.dao

import androidx.room.*
import com.parental.agent.data.local.entity.NormalizedEventEntity

@Dao
interface NormalizedEventDao {

    @Insert(onConflict = OnConflictStrategy.IGNORE)
    suspend fun insertEvent(event: NormalizedEventEntity)

    @Insert(onConflict = OnConflictStrategy.IGNORE)
    suspend fun insertEvents(events: List<NormalizedEventEntity>)

    @Query("SELECT * FROM normalized_events WHERE isSynced = 0 ORDER BY timestamp ASC LIMIT :limit")
    suspend fun getUnsyncedEvents(limit: Int = 100): List<NormalizedEventEntity>

    @Query("UPDATE normalized_events SET isSynced = 1 WHERE eventId IN (:eventIds)")
    suspend fun markEventsSynced(eventIds: List<String>)

    @Query("DELETE FROM normalized_events WHERE isSynced = 1")
    suspend fun purgeSyncedEvents()

    @Query("SELECT COUNT(*) FROM normalized_events WHERE isSynced = 0")
    suspend fun getUnsyncedCount(): Int
}
