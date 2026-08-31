package com.parental.agent.sync

import retrofit2.Response
import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.POST
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

interface ApiService {
    @POST("api/v1/telemetry/events")
    suspend fun syncEvents(@Body payload: SyncPayload): Response<SyncResponse>

    @GET("api/v1/devices/check-uninstall-permission")
    suspend fun checkUninstallPermission(@Query("deviceId") deviceId: String): Response<CheckUninstallResponse>
}
