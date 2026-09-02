package com.parental.agent.data.remote

import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.json.JSONArray
import org.json.JSONObject
import java.io.BufferedReader
import java.io.InputStreamReader
import java.io.OutputStreamWriter
import java.net.HttpURLConnection
import java.net.URL

data class LicenseModel(
    val id: String,
    val licenseKey: String,
    val planName: String,
    val status: String,
    val expiresAt: String
)

object ApiClient {
    // Default server URL for Android Emulator / Local Network
    private const val BASE_URL = "http://10.0.2.2:3000/api/v1"

    // 1. Fetch real licenses from PostgreSQL database for logged-in parent
    suspend fun fetchLicenses(email: String): List<LicenseModel> = withContext(Dispatchers.IO) {
        val licenses = mutableListOf<LicenseModel>()
        try {
            val url = URL("$BASE_URL/licenses/my-licenses")
            val conn = url.openConnection() as HttpURLConnection
            conn.requestMethod = "GET"
            conn.setRequestProperty("Accept", "application/json")
            conn.setRequestProperty("Authorization", "Bearer $email")
            conn.connectTimeout = 8000
            conn.readTimeout = 8000

            if (conn.responseCode == 200) {
                val reader = BufferedReader(InputStreamReader(conn.inputStream))
                val response = StringBuilder()
                var line: String?
                while (reader.readLine().also { line = it } != null) {
                    response.append(line)
                }
                reader.close()

                val jsonArray = JSONArray(response.toString())
                for (i in 0 until jsonArray.length()) {
                    val item = jsonArray.getJSONObject(i)
                    licenses.add(
                        LicenseModel(
                            id = item.optString("id", ""),
                            licenseKey = item.optString("licenseKey", ""),
                            planName = item.optString("planName", "ChildCare Protection Plan"),
                            status = item.optString("status", "UNASSIGNED"),
                            expiresAt = item.optString("expiresAt", "")
                        )
                    )
                }
            }
        } catch (e: Exception) {
            e.printStackTrace()
        }
        return@withContext licenses
    }

    // 2. Post activation to server & wait for HTTP 200 confirmation
    suspend fun activateLicenseOnServer(
        deviceId: String,
        licenseKey: String,
        manufacturer: String = android.os.Build.MANUFACTURER,
        model: String = android.os.Build.MODEL,
        androidVersion: Int = android.os.Build.VERSION.SDK_INT
    ): Pair<Boolean, String> = withContext(Dispatchers.IO) {
        try {
            val url = URL("$BASE_URL/licenses/activate")
            val conn = url.openConnection() as HttpURLConnection
            conn.requestMethod = "POST"
            conn.setRequestProperty("Content-Type", "application/json")
            conn.setRequestProperty("Accept", "application/json")
            conn.connectTimeout = 10000
            conn.readTimeout = 10000
            conn.doOutput = true

            val payload = JSONObject().apply {
                put("deviceId", deviceId)
                put("licenseKey", licenseKey)
                put("manufacturer", manufacturer)
                put("model", model)
                put("androidVersion", androidVersion)
            }

            val writer = OutputStreamWriter(conn.outputStream)
            writer.write(payload.toString())
            writer.flush()
            writer.close()

            val responseCode = conn.responseCode
            val inputStream = if (responseCode in 200..299) conn.inputStream else conn.errorStream
            val reader = BufferedReader(InputStreamReader(inputStream))
            val response = StringBuilder()
            var line: String?
            while (reader.readLine().also { line = it } != null) {
                response.append(line)
            }
            reader.close()

            val jsonResponse = JSONObject(response.toString())
            if (responseCode == 200 || responseCode == 201) {
                val message = jsonResponse.optString("message", "License Activated Successfully!")
                return@withContext Pair(true, message)
            } else {
                val errorMsg = jsonResponse.optString("message", "Activation failed on server (HTTP $responseCode)")
                return@withContext Pair(false, errorMsg)
            }
        } catch (e: Exception) {
            e.printStackTrace()
            return@withContext Pair(false, "Server connection failed: ${e.localizedMessage}")
        }
    }
}
