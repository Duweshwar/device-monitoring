package com.parental.agent.collectors.contacts

import android.Manifest
import android.content.Context
import android.content.pm.PackageManager
import android.provider.ContactsContract
import androidx.core.app.ActivityCompat
import com.parental.agent.collectors.base.BaseCollector
import org.json.JSONObject

class ContactCollector(context: Context) : BaseCollector(context) {

    override suspend fun collect(): Int {
        if (ActivityCompat.checkSelfPermission(context, Manifest.permission.READ_CONTACTS) != PackageManager.PERMISSION_GRANTED) {
            return 0
        }

        var collectedCount = 0
        try {
            val cursor = context.contentResolver.query(
                ContactsContract.CommonDataKinds.Phone.CONTENT_URI,
                arrayOf(
                    ContactsContract.CommonDataKinds.Phone.DISPLAY_NAME,
                    ContactsContract.CommonDataKinds.Phone.NUMBER
                ),
                null,
                null,
                "${ContactsContract.CommonDataKinds.Phone.DISPLAY_NAME} ASC LIMIT 100"
            )

            cursor?.use {
                val nameIdx = it.getColumnIndex(ContactsContract.CommonDataKinds.Phone.DISPLAY_NAME)
                val numberIdx = it.getColumnIndex(ContactsContract.CommonDataKinds.Phone.NUMBER)

                while (it.moveToNext()) {
                    val name = if (nameIdx != -1) it.getString(nameIdx) ?: "No Name" else "No Name"
                    val number = if (numberIdx != -1) it.getString(numberIdx) ?: "" else ""

                    val payload = JSONObject().apply {
                        put("contactName", name)
                        put("phoneNumber", number)
                    }

                    saveEvent(
                        source = "contacts",
                        eventType = "contact_entry",
                        collectionMethod = "android_api",
                        payloadJson = payload.toString()
                    )
                    collectedCount++
                }
            }
        } catch (e: Exception) {
            // Quiet fail
        }
        return collectedCount
    }
}
