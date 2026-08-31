package com.parental.agent.collectors.appusage

import android.app.usage.UsageStatsManager
import android.content.Context
import com.parental.agent.collectors.base.BaseCollector
import org.json.JSONObject

class AppUsageCollector(context: Context) : BaseCollector(context) {

    override suspend fun collect(): Int {
        val usageStatsManager = context.getSystemService(Context.USAGE_STATS_SERVICE) as? UsageStatsManager
            ?: return 0

        val endTime = System.currentTimeMillis()
        val startTime = endTime - (1000 * 60 * 60 * 24) // Past 24 hours

        var collectedCount = 0
        try {
            val usageStatsList = usageStatsManager.queryUsageStats(
                UsageStatsManager.INTERVAL_DAILY,
                startTime,
                endTime
            )

            if (!usageStatsList.isNullOrEmpty()) {
                for (stats in usageStatsList) {
                    if (stats.totalTimeInForeground > 0) {
                        val payload = JSONObject().apply {
                            put("packageName", stats.packageName)
                            put("totalTimeForegroundMs", stats.totalTimeInForeground)
                            put("lastTimeUsed", stats.lastTimeUsed)
                        }

                        saveEvent(
                            source = "appusage",
                            eventType = "app_usage_stats",
                            collectionMethod = "android_api",
                            payloadJson = payload.toString()
                        )
                        collectedCount++
                    }
                }
            }
        } catch (e: Exception) {
            // Quiet fail
        }
        return collectedCount
    }
}
