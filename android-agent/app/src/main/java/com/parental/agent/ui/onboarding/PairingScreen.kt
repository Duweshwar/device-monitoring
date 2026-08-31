package com.parental.agent.ui.onboarding

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.parental.agent.ui.theme.*

@Composable
fun PairingScreen(
    onPairDevice: (pairingCode: String, deviceAlias: String) -> Unit,
    isLoading: Boolean = false,
    errorMessage: String? = null
) {
    var pairingCode by remember { mutableStateOf("") }
    var deviceAlias by remember { mutableStateOf("") }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(Slate50)
            .padding(24.dp),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Spacer(modifier = Modifier.height(24.dp))

        Text(
            text = "Device Registration",
            style = MaterialTheme.typography.headlineSmall,
            fontWeight = FontWeight.Bold,
            color = Slate900
        )

        Text(
            text = "Enter the 6-digit pairing code from your Web Dashboard",
            style = MaterialTheme.typography.bodyMedium,
            color = Slate500
        )

        Spacer(modifier = Modifier.height(32.dp))

        Card(
            modifier = Modifier.fillMaxWidth(),
            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
            shape = RoundedCornerShape(12.dp)
        ) {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(20.dp),
                verticalArrangement = Arrangement.spacedBy(16.dp)
            ) {
                // 6-Digit Code Input
                OutlinedTextField(
                    value = pairingCode,
                    onValueChange = { if (it.length <= 6) pairingCode = it },
                    label = { Text("6-Digit Pairing Code") },
                    placeholder = { Text("e.g. 849201") },
                    singleLine = true,
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                    modifier = Modifier.fillMaxWidth()
                )

                // Device Custom Alias Input
                OutlinedTextField(
                    value = deviceAlias,
                    onValueChange = { deviceAlias = it },
                    label = { Text("Device Alias / Name") },
                    placeholder = { Text("e.g. Child's Galaxy S23") },
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth()
                )

                if (errorMessage != null) {
                    Text(
                        text = errorMessage,
                        color = MaterialTheme.colorScheme.error,
                        fontSize = 13.sp
                    )
                }
            }
        }

        Spacer(modifier = Modifier.weight(1f))

        // Pair Button
        Button(
            onClick = { onPairDevice(pairingCode, deviceAlias) },
            enabled = pairingCode.length == 6 && deviceAlias.isNotBlank() && !isLoading,
            modifier = Modifier
                .fillMaxWidth()
                .height(52.dp),
            shape = RoundedCornerShape(10.dp),
            colors = ButtonDefaults.buttonColors(
                containerColor = Indigo600,
                disabledContainerColor = Slate200
            )
        ) {
            if (isLoading) {
                CircularProgressIndicator(
                    modifier = Modifier.size(24.dp),
                    color = MaterialTheme.colorScheme.onPrimary
                )
            } else {
                Text(
                    text = "Pair & Register Device",
                    fontSize = 16.sp,
                    fontWeight = FontWeight.Bold
                )
            }
        }
    }
}
