package com.parental.agent.services

import android.content.Context
import android.content.Intent
import android.net.VpnService
import android.os.ParcelFileDescriptor
import android.util.Log
import com.parental.agent.data.local.AppDatabase
import com.parental.agent.data.local.entity.NormalizedEventEntity
import kotlinx.coroutines.*
import org.json.JSONObject
import java.io.FileInputStream
import java.io.FileOutputStream
import java.net.InetAddress
import java.nio.ByteBuffer

class LocalVpnService : VpnService() {

    companion object {
        private const val TAG = "LocalVpnService"
        private const val VPN_ADDRESS = "10.1.10.1"
        private const val VPN_ROUTE = "0.0.0.0"

        @Volatile
        var isVpnRunning: Boolean = false
            private set

        fun startVpn(context: Context) {
            try {
                val intent = Intent(context, LocalVpnService::class.java)
                context.startService(intent)
            } catch (e: Exception) {
                Log.e(TAG, "Failed to start LocalVpnService: ${e.message}")
            }
        }

        fun stopVpn(context: Context) {
            try {
                val intent = Intent(context, LocalVpnService::class.java)
                context.stopService(intent)
            } catch (e: Exception) {
                Log.e(TAG, "Failed to stop LocalVpnService: ${e.message}")
            }
        }
    }

    private var vpnInterface: ParcelFileDescriptor? = null
    private val vpnJob = SupervisorJob()
    private val vpnScope = CoroutineScope(Dispatchers.IO + vpnJob)
    private var lastCapturedDomain: String = ""

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        Log.i(TAG, "LocalVpnService starting secondary DNS packet inspector...")

        if (vpnInterface == null) {
            setupVpnInterface()
        }
        isVpnRunning = true
        return START_STICKY
    }

    private fun setupVpnInterface() {
        try {
            val builder = Builder()
                .setSession("Parental Guard DNS Filter")
                .addAddress(VPN_ADDRESS, 24)
                .addDnsServer("8.8.8.8")
                .addDnsServer("1.1.1.1")
                .addRoute("8.8.8.8", 32)
                .addRoute("1.1.1.1", 32)

            vpnInterface = builder.establish()
            Log.i(TAG, "Local VPN TUN interface established successfully.")
            startDnsPacketInspector()
        } catch (e: Exception) {
            Log.e(TAG, "Error establishing Local VPN interface: ${e.message}", e)
        }
    }

    private fun startDnsPacketInspector() {
        vpnScope.launch {
            val pfd = vpnInterface ?: return@launch
            val inputStream = FileInputStream(pfd.fileDescriptor)
            val outputStream = FileOutputStream(pfd.fileDescriptor)
            val packet = ByteBuffer.allocate(32767)

            while (isActive && vpnInterface != null) {
                try {
                    val length = inputStream.read(packet.array())
                    if (length > 0) {
                        packet.limit(length)
                        parseAndInspectDnsPacket(packet, length)
                        packet.clear()
                    }
                } catch (e: Exception) {
                    if (!isActive) break
                    delay(100)
                }
            }
        }
    }

    private fun parseAndInspectDnsPacket(buffer: ByteBuffer, length: Int) {
        try {
            if (length < 28) return // Minimum IP (20) + UDP (8) header size

            val ipVersion = (buffer.get(0).toInt() shr 4) and 0x0F
            if (ipVersion != 4) return // IPv4 only for DNS packet parsing

            val protocol = buffer.get(9).toInt() and 0xFF
            if (protocol != 17) return // UDP protocol only

            val ipHeaderLength = (buffer.get(0).toInt() and 0x0F) * 4
            val udpHeaderOffset = ipHeaderLength
            val destPort = buffer.getShort(udpHeaderOffset + 2).toInt() and 0xFFFF

            if (destPort == 53) { // Outbound DNS Query
                val dnsDataOffset = udpHeaderOffset + 8
                val domain = parseDnsQuestionDomain(buffer.array(), dnsDataOffset, length)

                if (!domain.isNullOrBlank() && domain.contains(".") && domain != lastCapturedDomain) {
                    lastCapturedDomain = domain
                    Log.i(TAG, "SECONDARY DNS FALLBACK CAPTURED DOMAIN: $domain")
                    saveFallbackWebHistoryEvent(domain)
                }
            }
        } catch (e: Exception) {
            // Ignore malformed packets silently
        }
    }

    private fun parseDnsQuestionDomain(data: ByteArray, offset: Int, length: Int): String? {
        try {
            if (offset + 12 >= length) return null
            var pos = offset + 12 // Skip DNS header (12 bytes)
            val sb = StringBuilder()

            while (pos < length) {
                val labelLength = data[pos].toInt() and 0xFF
                if (labelLength == 0) break
                pos++
                if (pos + labelLength > length) return null

                if (sb.isNotEmpty()) sb.append(".")
                sb.append(String(data, pos, labelLength))
                pos += labelLength
            }
            return sb.toString().lowercase()
        } catch (e: Exception) {
            return null
        }
    }

    private fun saveFallbackWebHistoryEvent(domain: String) {
        vpnScope.launch {
            try {
                val appDatabase = AppDatabase.getInstance(applicationContext)
                val now = System.currentTimeMillis()
                val cleanDomain = domain.replace(Regex("[^a-zA-Z0-9]"), "_")
                val eventId = "evt_vpn_history_${cleanDomain}_${now}"

                val payload = JSONObject().apply {
                    put("title", "$domain (Secondary DNS Fallback)")
                    put("url", "https://$domain")
                    put("domain", domain)
                    put("packageName", "system.dns.fallback")
                    put("timestamp", now)
                    put("captureMethod", "local_vpn_dns_fallback")
                }

                val event = NormalizedEventEntity(
                    eventId = eventId,
                    deviceId = "dev_01",
                    source = "local_vpn_dns",
                    eventType = "WEB_HISTORY",
                    timestamp = now,
                    collectionMethod = "local_vpn",
                    payloadJson = payload.toString(),
                    isSynced = false
                )

                appDatabase.eventDao().insertEvent(event)
                Log.d(TAG, "Fallback DNS Domain logged to Room DB: $domain")
            } catch (e: Exception) {
                Log.e(TAG, "Failed to save fallback DNS domain: ${e.message}")
            }
        }
    }

    override fun onDestroy() {
        super.onDestroy()
        isVpnRunning = false
        Log.w(TAG, "LocalVpnService destroyed.")
        vpnJob.cancel()
        try {
            vpnInterface?.close()
            vpnInterface = null
        } catch (e: Exception) {
            // Ignore
        }
    }
}
