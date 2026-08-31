package com.parental.agent.collectors.location

import android.Manifest
import android.content.Context
import android.content.pm.PackageManager
import androidx.core.app.ActivityCompat
import com.google.android.gms.location.LocationServices
import com.google.android.gms.location.Priority
import com.google.android.gms.tasks.CancellationTokenSource
import com.parental.agent.collectors.base.BaseCollector
import kotlinx.coroutines.tasks.await
import org.json.JSONObject

class LocationCollector(context: Context) : BaseCollector(context) {

    private val fusedLocationClient = LocationServices.getFusedLocationProviderClient(context)

    override suspend fun collect(): Int {
        if (ActivityCompat.checkSelfPermission(context, Manifest.permission.ACCESS_FINE_LOCATION) != PackageManager.PERMISSION_GRANTED &&
            ActivityCompat.checkSelfPermission(context, Manifest.permission.ACCESS_COARSE_LOCATION) != PackageManager.PERMISSION_GRANTED
        ) {
            return 0
        }

        return try {
            val cancellationToken = CancellationTokenSource()
            val location = fusedLocationClient.getCurrentLocation(
                Priority.PRIORITY_BALANCED_POWER_ACCURACY,
                cancellationToken.token
            ).await()

            if (location != null) {
                val payload = JSONObject().apply {
                    put("latitude", location.latitude)
                    put("longitude", location.longitude)
                    put("accuracy", location.accuracy)
                    put("altitude", location.altitude)
                    put("speed", location.speed)
                    put("provider", location.provider)
                }

                saveEvent(
                    source = "location",
                    eventType = "location_update",
                    collectionMethod = "android_api",
                    payloadJson = payload.toString()
                )
                1
            } else {
                0
            }
        } catch (e: Exception) {
            0
        }
    }
}
