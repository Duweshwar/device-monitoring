package com.parental.agent.collectors.apps

import android.content.Context
import android.content.pm.ApplicationInfo
import android.content.pm.PackageManager
import com.parental.agent.collectors.base.BaseCollector
import org.json.JSONObject

class InstalledAppCollector(context: Context) : BaseCollector(context) {

    override suspend fun collect(): Int {
        var collectedCount = 0
        try {
            val pm = context.packageManager
            @Suppress("DEPRECATION")
            val packages = pm.getInstalledPackages(PackageManager.GET_META_DATA)

            for (pkg in packages) {
                val appInfo = pkg.applicationInfo ?: continue
                val appLabel = pm.getApplicationLabel(appInfo).toString()
                val pkgName = pkg.packageName
                val isSystem = (appInfo.flags and ApplicationInfo.FLAG_SYSTEM) != 0

                val cleanPkg = pkgName.replace(".", "_")
                val deterministicEventId = "evt_installedapp_${cleanPkg}"

                val payload = JSONObject().apply {
                    put("packageName", pkgName)
                    put("appName", appLabel)
                    put("versionName", pkg.versionName ?: "1.0.0")
                    @Suppress("DEPRECATION")
                    put("versionCode", pkg.versionCode)
                    put("isSystemApp", isSystem)
                    put("status", "Installed")
                }

                saveEvent(
                    source = "installed_apps",
                    eventType = "installed_app_entry",
                    collectionMethod = "android_api",
                    payloadJson = payload.toString(),
                    eventId = deterministicEventId
                )
                collectedCount++
            }
        } catch (e: Exception) {
            // Quiet fail
        }
        return collectedCount
    }
}
