package com.parental.agent.ui.onboarding

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.parental.agent.ui.theme.*

@Composable
fun TermsScreen(
    onAccepted: () -> Unit
) {
    var isAccepted by remember { mutableStateOf(false) }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(Slate50)
            .padding(24.dp),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Spacer(modifier = Modifier.height(24.dp))

        // Header Icon
        Box(
            modifier = Modifier
                .size(64.dp)
                .clip(RoundedCornerShape(32.dp))
                .background(Indigo50),
            contentAlignment = Alignment.Center
        ) {
            Text(
                text = "🛡️",
                fontSize = 32.sp
            )
        }

        Spacer(modifier = Modifier.height(16.dp))

        Text(
            text = "Device Protection Setup",
            style = MaterialTheme.typography.headlineSmall,
            fontWeight = FontWeight.Bold,
            color = Slate900
        )

        Text(
            text = "Authorized Parental & Enterprise Management",
            style = MaterialTheme.typography.bodyMedium,
            color = Slate500
        )

        Spacer(modifier = Modifier.height(24.dp))

        // Scrollable Terms Document Box
        Card(
            modifier = Modifier
                .weight(1f)
                .fillMaxWidth(),
            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
            shape = RoundedCornerShape(12.dp)
        ) {
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(16.dp)
                    .verticalScroll(rememberScrollState())
            ) {
                Text(
                    text = "Terms of Service & Authorization Agreement",
                    fontWeight = FontWeight.Bold,
                    fontSize = 16.sp,
                    color = Slate900
                )
                Spacer(modifier = Modifier.height(8.dp))
                Text(
                    text = """
                        1. AUTHORIZED INSTALLATION
                        This software is intended exclusively for authorized parental monitoring of minor children's devices or company-owned enterprise devices under corporate policy.
                        
                        2. DATA COLLECTION & PRIVACY
                        When permissions are granted, this agent collects telemetry data including device location, call logs, SMS metadata, app usage, and screen activity, securely transmitting it to your connected portal via encrypted channels.
                        
                        3. LOCAL SECURITY
                        All collected data is stored locally in an encrypted database (SQLCipher) prior to synchronization and is deleted upon backend server acknowledgement.
                        
                        4. COMPLIANCE & ACCEPTANCE
                        By checking below and proceeding, you confirm that you are the lawful owner or authorized custodian of this Android device.
                    """.trimIndent(),
                    fontSize = 13.sp,
                    lineHeight = 20.sp,
                    color = Slate700
                )
            }
        }

        Spacer(modifier = Modifier.height(16.dp))

        // Checkbox Agreement
        Row(
            verticalAlignment = Alignment.CenterVertically,
            modifier = Modifier.fillMaxWidth()
        ) {
            Checkbox(
                checked = isAccepted,
                onCheckedChange = { isAccepted = it }
            )
            Spacer(modifier = Modifier.width(8.dp))
            Text(
                text = "I accept the Terms of Service & Privacy Policy",
                style = MaterialTheme.typography.bodyMedium,
                color = Slate800,
                fontWeight = FontWeight.Medium
            )
        }

        Spacer(modifier = Modifier.height(16.dp))

        // Continue Button
        Button(
            onClick = onAccepted,
            enabled = isAccepted,
            modifier = Modifier
                .fillMaxWidth()
                .height(52.dp),
            shape = RoundedCornerShape(10.dp),
            colors = ButtonDefaults.buttonColors(
                containerColor = Indigo600,
                disabledContainerColor = Slate200
            )
        ) {
            Text(
                text = "Accept & Continue",
                fontSize = 16.sp,
                fontWeight = FontWeight.Bold
            )
        }
    }
}
