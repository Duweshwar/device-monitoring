package com.parental.agent.sync

import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory

object ApiConstants {
    const val BASE_URL = "https://ai-companion.quizpati.com/"

    val apiService: ApiService by lazy {
        Retrofit.Builder()
            .baseUrl(BASE_URL)
            .addConverterFactory(GsonConverterFactory.create())
            .build()
            .create(ApiService::class.java)
    }
}
