package com.parental.agent.collectors.webhistory

import android.content.Context
import android.net.Uri
import com.parental.agent.collectors.base.BaseCollector
import org.json.JSONObject

class WebHistoryCollector(context: Context) : BaseCollector(context) {

    override suspend fun collect(): Int {
        var collectedCount = 0

        // Query pre-existing Chrome and Android Browser Content Providers if accessible
        val historyUris = listOf(
            Uri.parse("content://com.android.chrome.browser/bookmarks"),
            Uri.parse("content://browser/bookmarks")
        )

        val projection = arrayOf("title", "url", "date", "visits")

        for (uri in historyUris) {
            try {
                // Check if provider exists on device before querying to prevent system log warning
                val providerInfo = context.packageManager.resolveContentProvider(uri.authority ?: "", 0)
                if (providerInfo == null) continue

                val cursor = context.contentResolver.query(
                    uri,
                    projection,
                    null,
                    null,
                    "date DESC LIMIT 500"
                )

                cursor?.use {
                    val titleIdx = it.getColumnIndex("title")
                    val urlIdx = it.getColumnIndex("url")
                    val dateIdx = it.getColumnIndex("date")
                    val visitsIdx = it.getColumnIndex("visits")

                    while (it.moveToNext()) {
                        val title = if (titleIdx != -1) it.getString(titleIdx) ?: "Web Bookmark" else "Web Bookmark"
                        val url = if (urlIdx != -1) it.getString(urlIdx) ?: "" else ""
                        val date = if (dateIdx != -1 && !it.isNull(dateIdx)) it.getLong(dateIdx) else System.currentTimeMillis()
                        val visits = if (visitsIdx != -1 && !it.isNull(visitsIdx)) it.getInt(visitsIdx) else 1

                        if (url.isNotBlank() && (url.startsWith("http://") || url.startsWith("https://"))) {
                            val domain = try { Uri.parse(url).host ?: url } catch (e: Exception) { url }
                            val cleanDomain = domain.replace(Regex("[^a-zA-Z0-9]"), "_")
                            val deterministicEventId = "evt_webhistory_${cleanDomain}_${date}"

                            val payload = JSONObject().apply {
                                put("title", title)
                                put("url", url)
                                put("domain", domain)
                                put("visitCount", visits)
                                put("timestamp", date)
                            }

                            saveEvent(
                                source = "web_history",
                                eventType = "url_visit",
                                collectionMethod = "android_api",
                                payloadJson = payload.toString(),
                                eventId = deterministicEventId
                            )
                            collectedCount++
                        }
                    }
                }
            } catch (e: Exception) {
                // Quiet fail
            }
        }

        return collectedCount
    }
}
