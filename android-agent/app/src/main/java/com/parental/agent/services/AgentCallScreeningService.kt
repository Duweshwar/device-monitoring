package com.parental.agent.services

import android.os.Build
import android.telecom.Call
import android.telecom.CallScreeningService
import android.util.Log
import androidx.annotation.RequiresApi
import com.parental.agent.policy.CallBlocker

@RequiresApi(Build.VERSION_CODES.Q)
class AgentCallScreeningService : CallScreeningService() {

    companion object {
        private const val TAG = "CallScreeningService"
    }

    override fun onScreenCall(callDetails: Call.Details) {
        try {
            val handle = callDetails.handle
            val incomingNumber = handle?.schemeSpecificPart ?: ""
            Log.i(TAG, "CallScreeningService evaluating incoming call from: $incomingNumber")

            if (CallBlocker.getInstance().shouldBlockCall(incomingNumber)) {
                Log.w(TAG, "⛔ CallScreeningService REJECTING blocked call from $incomingNumber")

                val response = CallResponse.Builder()
                    .setDisallowCall(true)
                    .setRejectCall(true)
                    .setSkipNotification(true)
                    .setSkipCallLog(false)
                    .build()

                respondToCall(callDetails, response)
                CallBlocker.getInstance().checkAndBlockIncomingCall(applicationContext, incomingNumber)
            } else {
                val response = CallResponse.Builder()
                    .setDisallowCall(false)
                    .setRejectCall(false)
                    .build()
                respondToCall(callDetails, response)
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error in CallScreeningService: ${e.message}")
        }
    }
}
