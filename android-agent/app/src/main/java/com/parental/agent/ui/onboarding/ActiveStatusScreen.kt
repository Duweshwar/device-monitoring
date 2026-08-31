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
    activeCollectorsCount: Int = 8
) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(Slate50)
            .padding(24.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center
    ) {
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
