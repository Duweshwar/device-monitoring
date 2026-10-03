package com.parental.agent.sync

import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory

object ApiConstants {
    // Default NestJS backend server URL for local testing & development
    private var customBaseUrl: String? = null

    val BASE_URL: String
        get() = (customBaseUrl ?: "http://10.0.2.2:3000").removeSuffix("/") + "/"

    fun setCustomBaseUrl(url: String) {
        customBaseUrl = url.trim().removeSuffix("/")
        _apiService = null
    }

    private var _apiService: ApiService? = null

    val apiService: ApiService
        get() {
            if (_apiService == null) {
                _apiService = Retrofit.Builder()
                    .baseUrl(BASE_URL)
                    .addConverterFactory(GsonConverterFactory.create())
                    .build()
                    .create(ApiService::class.java)
            }
            return _apiService!!
        }
}
