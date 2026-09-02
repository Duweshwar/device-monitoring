package com.parental.agent.ui.onboarding

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.parental.agent.data.remote.ApiClient
import com.parental.agent.data.remote.LicenseModel
import com.parental.agent.ui.theme.*
import kotlinx.coroutines.launch

@Composable
fun PairingScreen(
    deviceId: String,
    onPairDevice: (licenseKey: String, deviceAlias: String) -> Unit,
    isLoading: Boolean = false,
    errorMessage: String? = null
) {
    var email by remember { mutableStateOf("parent@gmail.com") }
    var password by remember { mutableStateOf("12345678") }
    var showLicenseDialog by remember { mutableStateOf(false) }

    // Dynamic list of licenses fetched from NestJS server (NO static data)
    var availableLicenses by remember { mutableStateOf<List<LicenseModel>>(emptyList()) }
    var selectedLicense by remember { mutableStateOf<LicenseModel?>(null) }
    var isFetchingLicenses by remember { mutableStateOf(false) }
    var isActivatingServer by remember { mutableStateOf(false) }
    var serverErrorMsg by remember { mutableStateOf<String?>(null) }

    val autoDeviceAlias = remember { android.os.Build.MODEL ?: "Target Android Phone" }
    val coroutineScope = rememberCoroutineScope()

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(Slate50)
            .padding(24.dp),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Spacer(modifier = Modifier.height(16.dp))

        Text(
            text = "ChildCare Device Setup",
            style = MaterialTheme.typography.headlineSmall,
            fontWeight = FontWeight.Bold,
            color = Slate900
        )

        Text(
            text = "Login with your parent account to view and activate your purchased license plan",
            style = MaterialTheme.typography.bodyMedium,
            color = Slate500
        )

        Spacer(modifier = Modifier.height(24.dp))

        Card(
            modifier = Modifier.fillMaxWidth(),
            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
            shape = RoundedCornerShape(12.dp)
        ) {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(20.dp),
                verticalArrangement = Arrangement.spacedBy(14.dp)
            ) {
                // Parent Email Input
                OutlinedTextField(
                    value = email,
                    onValueChange = { email = it },
                    label = { Text("Parent Email") },
                    placeholder = { Text("parent@example.com") },
                    singleLine = true,
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Email),
                    modifier = Modifier.fillMaxWidth()
                )

                // Parent Password Input
                OutlinedTextField(
                    value = password,
                    onValueChange = { password = it },
                    label = { Text("Password") },
                    placeholder = { Text("••••••••") },
                    singleLine = true,
                    visualTransformation = PasswordVisualTransformation(),
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Password),
                    modifier = Modifier.fillMaxWidth()
                )

                // Selected License Read-only Card
                if (selectedLicense != null) {
                    Surface(
                        color = Indigo50,
                        shape = RoundedCornerShape(8.dp),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Column(modifier = Modifier.padding(12.dp)) {
                            Text(
                                text = "Selected Plan:",
                                style = MaterialTheme.typography.labelSmall,
                                color = Indigo700
                            )
                            Text(
                                text = selectedLicense!!.planName,
                                fontWeight = FontWeight.Bold,
                                fontSize = 14.sp,
                                color = Slate900
                            )
                            Text(
                                text = "Key: ${selectedLicense!!.licenseKey}",
                                fontSize = 12.sp,
                                color = Slate500
                            )
                        }
                    }
                }

                if (serverErrorMsg != null || errorMessage != null) {
                    Text(
                        text = serverErrorMsg ?: errorMessage!!,
                        color = MaterialTheme.colorScheme.error,
                        fontSize = 13.sp,
                        fontWeight = FontWeight.SemiBold
                    )
                }
            }
        }

        Spacer(modifier = Modifier.weight(1f))

        // Main Action Button (Fetches from server & waits for HTTP 200 OK confirmation)
        Button(
            onClick = {
                if (selectedLicense == null) {
                    isFetchingLicenses = true
                    serverErrorMsg = null
                    coroutineScope.launch {
                        val serverLicenses = ApiClient.fetchLicenses(email)
                        isFetchingLicenses = false
                        if (serverLicenses.isNotEmpty()) {
                            availableLicenses = serverLicenses
                            showLicenseDialog = true
                        } else {
                            serverErrorMsg = "No unassigned active licenses found for this account. Please purchase a plan on web dashboard."
                        }
                    }
                } else {
                    isActivatingServer = true
                    serverErrorMsg = null
                    coroutineScope.launch {
                        val (success, msg) = ApiClient.activateLicenseOnServer(
                            deviceId = deviceId,
                            licenseKey = selectedLicense!!.licenseKey
                        )
                        isActivatingServer = false
                        if (success) {
                            // Completion ONLY after HTTP 200 server confirmation
                            onPairDevice(selectedLicense!!.licenseKey, autoDeviceAlias)
                        } else {
                            serverErrorMsg = msg
                        }
                    }
                }
            },
            enabled = email.isNotBlank() && password.isNotBlank() && !isFetchingLicenses && !isActivatingServer && !isLoading,
            modifier = Modifier
                .fillMaxWidth()
                .height(52.dp),
            shape = RoundedCornerShape(10.dp),
            colors = ButtonDefaults.buttonColors(
                containerColor = Indigo600,
                disabledContainerColor = Slate200
            )
        ) {
            if (isFetchingLicenses || isActivatingServer || isLoading) {
                Row(
                    horizontalArrangement = Arrangement.Center,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        text = if (isFetchingLicenses) "⏳ Fetching Licenses..." else "⏳ Confirming with Server...",
                        fontSize = 14.sp,
                        fontWeight = FontWeight.Bold,
                        color = MaterialTheme.colorScheme.onPrimary
                    )
                }
            } else {
                Text(
                    text = if (selectedLicense == null) "Log In & Select License Plan" else "Activate Selected License",
                    fontSize = 15.sp,
                    fontWeight = FontWeight.Bold
                )
            }
        }
    }

    // License Selection Dialog Pop-up (Populated dynamically from backend server)
    if (showLicenseDialog) {
        AlertDialog(
            onDismissRequest = { showLicenseDialog = false },
            title = {
                Column {
                    Text("Select License Plan", fontWeight = FontWeight.Bold, fontSize = 18.sp)
                    Text("Choose an unassigned plan to bind to this target device", fontSize = 12.sp, color = Slate500)
                }
            },
            text = {
                LazyColumn(
                    verticalArrangement = Arrangement.spacedBy(8.dp),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    items(availableLicenses) { lic ->
                        Surface(
                            modifier = Modifier
                                .fillMaxWidth()
                                .clickable {
                                    selectedLicense = lic
                                    showLicenseDialog = false
                                }
                                .border(
                                    1.dp,
                                    if (selectedLicense?.licenseKey == lic.licenseKey) Indigo600 else Slate200,
                                    RoundedCornerShape(8.dp)
                                ),
                            shape = RoundedCornerShape(8.dp),
                            color = if (selectedLicense?.licenseKey == lic.licenseKey) Indigo50 else Slate50
                        ) {
                            Column(modifier = Modifier.padding(12.dp)) {
                                Text(
                                    text = lic.planName,
                                    fontWeight = FontWeight.Bold,
                                    fontSize = 14.sp,
                                    color = Slate900
                                )
                                Text(
                                    text = "Key: ${lic.licenseKey}",
                                    fontSize = 12.sp,
                                    color = Indigo700
                                )
                            }
                        }
                    }
                }
            },
            confirmButton = {
                TextButton(onClick = { showLicenseDialog = false }) {
                    Text("Cancel")
                }
            }
        )
    }
}
