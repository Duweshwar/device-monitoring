package com.parental.agent.collectors.calls

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.telephony.TelephonyManager
import android.util.Log

class CallStateReceiver : BroadcastReceiver() {

    companion object {
        private const val TAG = "CallStateReceiver"
        private var lastState = TelephonyManager.CALL_STATE_IDLE
        private var savedNumber = "Unknown"
        private var isIncoming = false
    }

    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action != TelephonyManager.ACTION_PHONE_STATE_CHANGED) {
            return
        }

        val stateStr = intent.getStringExtra(TelephonyManager.EXTRA_STATE)
        val number = intent.getStringExtra(TelephonyManager.EXTRA_INCOMING_NUMBER) ?: savedNumber

        if (number.isNotBlank() && number != "Unknown") {
            savedNumber = number
        }

        val state = when (stateStr) {
            TelephonyManager.EXTRA_STATE_RINGING -> TelephonyManager.CALL_STATE_RINGING
            TelephonyManager.EXTRA_STATE_OFFHOOK -> TelephonyManager.CALL_STATE_OFFHOOK
            TelephonyManager.EXTRA_STATE_IDLE -> TelephonyManager.CALL_STATE_IDLE
            else -> return
        }

        onCallStateChanged(context, state, savedNumber)
    }

    private fun onCallStateChanged(context: Context, state: Int, number: String) {
        if (lastState == state) {
            return
        }

        val recorder = CallAudioRecorder(context)

        when (state) {
            TelephonyManager.CALL_STATE_RINGING -> {
                isIncoming = true
                savedNumber = number
                Log.d(TAG, "PHONE RINGING from $savedNumber")
            }
            TelephonyManager.CALL_STATE_OFFHOOK -> {
                val direction = if (isIncoming) "incoming" else "outgoing"
                Log.i(TAG, "PHONE OFFHOOK (Call Connected): Dir=$direction, Number=$savedNumber. Starting Call Recording...")
                recorder.startRecording(savedNumber, direction)
            }
            TelephonyManager.CALL_STATE_IDLE -> {
                Log.i(TAG, "PHONE IDLE (Call Ended). Stopping Call Recording & Saving...")
                recorder.stopRecordingAndSave()
                isIncoming = false
                savedNumber = "Unknown"
            }
        }
        lastState = state
    }
}
