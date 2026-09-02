package com.parental.agent.sync

import retrofit2.Response
import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.POST
import retrofit2.http.Path
import retrofit2.http.Query

data class SyncPayload(
    val deviceId: String,
    val events: List<Map<String, Any?>>
)

data class SyncResponse(
    val success: Boolean,
    val syncedEventIds: List<String>,
    val allowUninstallation: Boolean? = false
)

data class CheckUninstallResponse(
    val success: Boolean,
    val allowUninstallation: Boolean
)

data class HeartbeatPayload(
    val deviceId: String,
    val batteryLevel: Int,
    val isCharging: Boolean,
    val isOnline: Boolean,
    val appVersion: String,
    val capabilities: Map<String, Boolean>
)

data class OtaCheckResponse(
    val hasUpdate: Boolean,
    val isMandatory: Boolean,
    val latestRelease: OtaReleaseInfo?
)

data class OtaReleaseInfo(
    val versionCode: Int,
    val versionName: String,
    val apkUrl: String,
    val sha256: String,
    val releaseNotes: String
)

data class OtaProgressPayload(
    val jobId: String,
    val deviceId: String,
    val status: String,
    val progress: Int,
    val errorMessage: String? = null
)

data class AppPolicyRule(
    val packageName: String,
    val appName: String,
    val isBlocked: Boolean
)

data class WebPolicyRule(
    val domain: String,
    val isBlocked: Boolean
)

data class PendingCommandResponse(
    val count: Int,
    val commands: List<Map<String, Any?>>
)

interface ApiService {
    @POST("api/v1/telemetry/events")
    suspend fun syncEvents(@Body payload: SyncPayload): Response<SyncResponse>

    @POST("api/devices/heartbeat")
    suspend fun sendHeartbeat(@Body payload: HeartbeatPayload): Response<Map<String, Any>>

    @GET("api/updates/check")
    suspend fun checkDeviceUpdate(
        @Query("deviceId") deviceId: String,
        @Query("versionCode") versionCode: Int
    ): Response<OtaCheckResponse>

    @POST("api/updates/progress")
    suspend fun reportOtaProgress(@Body payload: OtaProgressPayload): Response<Map<String, Any>>

    @GET("api/policy/apps/{deviceId}")
    suspend fun getAppRules(@Path("deviceId") deviceId: String): Response<List<AppPolicyRule>>

    @GET("api/policy/web/{deviceId}")
    suspend fun getWebRules(@Path("deviceId") deviceId: String): Response<List<WebPolicyRule>>

    @GET("api/commands/pending/{deviceId}")
    suspend fun getPendingCommands(@Path("deviceId") deviceId: String): Response<PendingCommandResponse>

    @GET("api/v1/devices/check-uninstall-permission")
    suspend fun checkUninstallPermission(@Query("deviceId") deviceId: String): Response<CheckUninstallResponse>
}
