package com.parental.agent.ui.onboarding

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.parental.agent.ui.theme.*

@Composable
fun ActiveStatusScreen(
    deviceName: String = "Target Device",
    activeCollectorsCount: Int = 8,
    hasPendingUpdate: Boolean = false,
    pendingUpdateVersion: String = "v2.2.0",
    onInstallUpdate: () -> Unit = {}
) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(Slate50)
            .padding(24.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center
    ) {
        // Pending Update Card (Staged for Secret Dialer Launch)
        if (hasPendingUpdate) {
            Card(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(bottom = 20.dp),
                colors = CardDefaults.cardColors(containerColor = Indigo50),
                shape = RoundedCornerShape(16.dp),
                border = androidx.compose.foundation.BorderStroke(1.5.dp, Indigo600)
            ) {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(16.dp),
                    horizontalAlignment = Alignment.CenterHorizontally
                ) {
                    Text(
                        text = "⚡ Software Update Ready ($pendingUpdateVersion)",
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.Bold,
                        color = Indigo600
                    )
                    Spacer(modifier = Modifier.height(4.dp))
                    Text(
                        text = "A new security agent update has been downloaded in background. Tap below to complete 1-click installation.",
                        style = MaterialTheme.typography.bodySmall,
                        color = Slate700
                    )
                    Spacer(modifier = Modifier.height(12.dp))
                    Button(
                        onClick = onInstallUpdate,
                        colors = ButtonDefaults.buttonColors(containerColor = Indigo600),
                        shape = RoundedCornerShape(8.dp),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Text(
                            text = "Install $pendingUpdateVersion Now",
                            fontWeight = FontWeight.Bold,
                            color = androidx.compose.ui.graphics.Color.White
                        )
                    }
                }
            }
        }

        // Status Badge Icon
        Box(
            modifier = Modifier
                .size(80.dp)
                .clip(RoundedCornerShape(40.dp))
                .background(Emerald50),
            contentAlignment = Alignment.Center
        ) {
            Text(
                text = "✓",
                fontSize = 40.sp,
                color = Emerald600,
                fontWeight = FontWeight.Bold
            )
        }

        Spacer(modifier = Modifier.height(24.dp))

        Text(
            text = "Protection Active",
            style = MaterialTheme.typography.headlineMedium,
            fontWeight = FontWeight.Bold,
            color = Slate900
        )

        Text(
            text = deviceName,
            style = MaterialTheme.typography.titleMedium,
            color = Indigo600,
            fontWeight = FontWeight.SemiBold
        )

        Spacer(modifier = Modifier.height(16.dp))

        Card(
            modifier = Modifier.fillMaxWidth(),
            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
            shape = RoundedCornerShape(12.dp)
        ) {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(20.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                StatusRow(label = "Background Watchdog", value = "RUNNING", isPositive = true)
                StatusRow(
                    label = "OTA Update Status", 
                    value = if (hasPendingUpdate) "UPDATE READY ($pendingUpdateVersion)" else "UP TO DATE", 
                    isPositive = !hasPendingUpdate
                )
                StatusRow(label = "Active Collectors", value = "$activeCollectorsCount Active Modules", isPositive = true)
                StatusRow(label = "Encrypted Local Storage", value = "SQLCipher Enforced", isPositive = true)
                StatusRow(label = "Backend Sync", value = "CONNECTED", isPositive = true)
            }
        }
    }
}

@Composable
fun StatusRow(label: String, value: String, isPositive: Boolean) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically
    ) {
        Text(text = label, fontSize = 14.sp, color = Slate700)
        Surface(
            color = if (isPositive) Emerald50 else Amber50,
            shape = RoundedCornerShape(4.dp)
        ) {
            Text(
                text = value,
                color = if (isPositive) Emerald600 else Amber600,
                fontSize = 12.sp,
                fontWeight = FontWeight.Bold,
                modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp)
            )
        }
    }
}
