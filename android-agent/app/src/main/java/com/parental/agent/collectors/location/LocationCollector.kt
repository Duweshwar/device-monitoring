package com.parental.agent.collectors.location

import android.Manifest
import android.content.Context
import android.content.pm.PackageManager
import android.location.Location
import android.location.LocationListener
import android.location.LocationManager
import android.os.Bundle
import android.os.Looper
import android.util.Log
import androidx.core.app.ActivityCompat
import com.google.android.gms.location.*
import com.parental.agent.collectors.base.BaseCollector
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.tasks.await
import org.json.JSONObject

class LocationCollector(context: Context) : BaseCollector(context), LocationListener {

    companion object {
        private const val TAG = "LocationCollector"
        @Volatile
        private var lastSavedLat: Double = 0.0
        @Volatile
        private var lastSavedLng: Double = 0.0
        @Volatile
        private var latestLocation: Location? = null
    }

    private val fusedLocationClient = LocationServices.getFusedLocationProviderClient(context)
    private val locationManager = context.getSystemService(Context.LOCATION_SERVICE) as? LocationManager

    init {
        startDualLocationListeners()
    }

    private fun startDualLocationListeners() {
        try {
            val hasFine = ActivityCompat.checkSelfPermission(context, Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED
            val hasCoarse = ActivityCompat.checkSelfPermission(context, Manifest.permission.ACCESS_COARSE_LOCATION) == PackageManager.PERMISSION_GRANTED

            if (hasFine || hasCoarse) {
                // 1. Direct Native Android OS Hardware Listener (Captures all active GPS movement)
                if (locationManager != null) {
                    if (hasFine && locationManager.isProviderEnabled(LocationManager.GPS_PROVIDER)) {
                        locationManager.requestLocationUpdates(
                            LocationManager.GPS_PROVIDER,
                            2000L,
                            1f,
                            this,
                            Looper.getMainLooper()
                        )
                    }
                    if (locationManager.isProviderEnabled(LocationManager.NETWORK_PROVIDER)) {
                        locationManager.requestLocationUpdates(
                            LocationManager.NETWORK_PROVIDER,
                            2000L,
                            1f,
                            this,
                            Looper.getMainLooper()
                        )
                    }
                }

                // 2. Fused Location Provider Engine
                val locationRequest = LocationRequest.Builder(Priority.PRIORITY_HIGH_ACCURACY, 3000L)
                    .setMinUpdateIntervalMillis(1000L)
                    .build()

                val locationCallback = object : LocationCallback() {
                    override fun onLocationResult(locationResult: LocationResult) {
                        val loc = locationResult.lastLocation
                        if (loc != null) {
                            Log.i(TAG, "REAL-TIME FUSED ROUTE FIX: Lat=${loc.latitude}, Lng=${loc.longitude}")
                            latestLocation = loc
                            saveLocationIfChanged(loc)
                        }
                    }
                }

                fusedLocationClient.requestLocationUpdates(
                    locationRequest,
                    locationCallback,
                    Looper.getMainLooper()
                )

                Log.i(TAG, "Successfully initialized Dual Hardware & Fused Location listeners.")
            } else {
                Log.w(TAG, "Cannot start location updates: Location permissions not granted!")
            }
        } catch (e: Exception) {
            Log.w(TAG, "Failed to start location listeners: ${e.message}")
        }
    }

    override fun onLocationChanged(location: Location) {
        Log.i(TAG, "NATIVE HARDWARE GPS FIX: Lat=${location.latitude}, Lng=${location.longitude}, Provider=${location.provider}")
        latestLocation = location
        saveLocationIfChanged(location)
    }

    @Deprecated("Deprecated in Java")
    override fun onStatusChanged(provider: String?, status: Int, extras: Bundle?) {}
    override fun onProviderEnabled(provider: String) {}
    override fun onProviderDisabled(provider: String) {}

    private fun saveLocationIfChanged(location: Location) {
        val lat = location.latitude
        val lng = location.longitude

        // Check if location shifted by ~5 meters or if it's the first fix
        val latDiff = Math.abs(lat - lastSavedLat)
        val lngDiff = Math.abs(lng - lastSavedLng)

        if (latDiff > 0.00003 || lngDiff > 0.00003) {
            lastSavedLat = lat
            lastSavedLng = lng

            val locTime = if (location.time > 0) location.time else System.currentTimeMillis()
            val latFormatted = String.format("%.4f", lat)
            val lngFormatted = String.format("%.4f", lng)
            val deterministicEventId = "evt_loc_${latFormatted}_${lngFormatted}_${locTime / 1000}"

            val payload = JSONObject().apply {
                put("latitude", lat)
                put("longitude", lng)
                put("accuracy", location.accuracy)
                put("altitude", location.altitude)
                put("speed", location.speed)
                put("provider", location.provider ?: "GPS")
                put("timestamp", locTime)
            }

            Log.i(TAG, "LOCATION SAVED TO DB: Lat=$lat, Lng=$lng, Provider=${location.provider}")

            CoroutineScope(Dispatchers.IO).launch {
                try {
                    saveEvent(
                        source = "location",
                        eventType = "location_update",
                        collectionMethod = "android_api",
                        payloadJson = payload.toString(),
                        deviceId = prefs.getDeviceId(),
                        eventId = deterministicEventId
                    )
                } catch (e: Exception) {
                    Log.e(TAG, "Failed to save location event: ${e.message}")
                }
            }
        }
    }

    override suspend fun collect(): Int {
        val hasFine = ActivityCompat.checkSelfPermission(context, Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED
        val hasCoarse = ActivityCompat.checkSelfPermission(context, Manifest.permission.ACCESS_COARSE_LOCATION) == PackageManager.PERMISSION_GRANTED

        if (!hasFine && !hasCoarse) {
            Log.w(TAG, "Location permissions NOT granted yet! Fine=$hasFine, Coarse=$hasCoarse")
            return 0
        }

        var location: Location? = latestLocation

        // Always query active OS location provider caches directly on each collect cycle
        if (locationManager != null) {
            try {
                val gpsLoc = if (hasFine) locationManager.getLastKnownLocation(LocationManager.GPS_PROVIDER) else null
                val netLoc = locationManager.getLastKnownLocation(LocationManager.NETWORK_PROVIDER)
                val passiveLoc = locationManager.getLastKnownLocation(LocationManager.PASSIVE_PROVIDER)

                val bestNativeLoc = gpsLoc ?: netLoc ?: passiveLoc
                if (bestNativeLoc != null) {
                    if (location == null || bestNativeLoc.time > location.time) {
                        location = bestNativeLoc
                    }
                }
            } catch (e: Exception) {
                // Quiet fail
            }
        }

        if (location == null) {
            try {
                val fusedLast = fusedLocationClient.lastLocation.await()
                if (fusedLast != null) {
                    location = fusedLast
                }
            } catch (e: Exception) {
                // Quiet fail
            }
        }

        if (location != null) {
            latestLocation = location
            saveLocationIfChanged(location)
            return 1
        } else {
            Log.w(TAG, "Waiting for OS location provider fix...")
            return 0
        }
    }
}
