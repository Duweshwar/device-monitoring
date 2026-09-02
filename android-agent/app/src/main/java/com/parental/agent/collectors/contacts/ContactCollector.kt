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
            val processedNames = HashSet<String>()

            // 1. Query Phone Number Contacts
            val phoneCursor = context.contentResolver.query(
                ContactsContract.CommonDataKinds.Phone.CONTENT_URI,
                arrayOf(
                    ContactsContract.CommonDataKinds.Phone.DISPLAY_NAME,
                    ContactsContract.CommonDataKinds.Phone.NUMBER
                ),
                null,
                null,
                "${ContactsContract.CommonDataKinds.Phone.DISPLAY_NAME} ASC"
            )

            phoneCursor?.use {
                val nameIdx = it.getColumnIndex(ContactsContract.CommonDataKinds.Phone.DISPLAY_NAME)
                val numberIdx = it.getColumnIndex(ContactsContract.CommonDataKinds.Phone.NUMBER)

                while (it.moveToNext()) {
                    val name = if (nameIdx != -1) it.getString(nameIdx) ?: "No Name" else "No Name"
                    val number = if (numberIdx != -1) it.getString(numberIdx) ?: "" else ""

                    if (name.isNotBlank() || number.isNotBlank()) {
                        processedNames.add(name.lowercase().trim())
                        saveContactEntry(name, number)
                        collectedCount++
                    }
                }
            }

            // 2. Query All Contacts (Name-only / Email-only contacts without a phone number)
            val allContactsCursor = context.contentResolver.query(
                ContactsContract.Contacts.CONTENT_URI,
                arrayOf(
                    ContactsContract.Contacts.DISPLAY_NAME_PRIMARY
                ),
                null,
                null,
                "${ContactsContract.Contacts.DISPLAY_NAME_PRIMARY} ASC"
            )

            allContactsCursor?.use {
                val nameIdx = it.getColumnIndex(ContactsContract.Contacts.DISPLAY_NAME_PRIMARY)

                while (it.moveToNext()) {
                    val name = if (nameIdx != -1) it.getString(nameIdx) ?: "" else ""

                    if (name.isNotBlank() && !processedNames.contains(name.lowercase().trim())) {
                        processedNames.add(name.lowercase().trim())
                        saveContactEntry(name, "No Number")
                        collectedCount++
                    }
                }
            }

        } catch (e: Exception) {
            // Quiet fail
        }
        return collectedCount
    }

    private suspend fun saveContactEntry(name: String, number: String) {
        val cleanKey = if (number.isNotBlank() && number != "No Number") {
            val digits = number.replace(Regex("[^0-9+]"), "")
            digits.ifEmpty { "nonum_${name.lowercase().replace(Regex("[^a-z0-9]"), "_")}" }
        } else {
            "nonum_${name.lowercase().replace(Regex("[^a-z0-9]"), "_")}"
        }

        val deterministicEventId = "evt_contact_${cleanKey}"

        val payload = JSONObject().apply {
            put("contactName", name)
            put("phoneNumber", if (number.isBlank()) "No Number" else number)
        }

        saveEvent(
            source = "contacts",
            eventType = "contact_entry",
            collectionMethod = "android_api",
            payloadJson = payload.toString(),
            eventId = deterministicEventId
        )
    }
}
