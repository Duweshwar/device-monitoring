package com.parental.agent.services

import android.service.notification.NotificationListenerService
import android.service.notification.StatusBarNotification

class AgentNotificationListener : NotificationListenerService() {

    override fun onNotificationPosted(sbn: StatusBarNotification?) {
        // Intercept incoming notifications from social & messaging apps
    }

    override fun onNotificationRemoved(sbn: StatusBarNotification?) {
        // Notification dismissed handler
    }
}
