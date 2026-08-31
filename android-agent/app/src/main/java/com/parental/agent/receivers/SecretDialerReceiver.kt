package com.parental.agent.receivers

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.util.Log
import com.parental.agent.ui.MainActivity

class SecretDialerReceiver : BroadcastReceiver() {

    companion object {
        private const val TAG = "SecretDialerReceiver"
        const val SECRET_CODE_DIAL = "2013"
    }

    override fun onReceive(context: Context, intent: Intent) {
        Log.i(TAG, "Secret dialer code triggered: ${intent.action}")

        val launchIntent = Intent(context, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
            putExtra("EXTRA_LAUNCHED_FROM_DIALER", true)
        }
        context.startActivity(launchIntent)
    }
}
