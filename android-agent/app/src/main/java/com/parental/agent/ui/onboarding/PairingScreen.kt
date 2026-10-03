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
import com.parental.agent.data.remote.LicenseInspectionResult
import com.parental.agent.data.remote.LicenseModel
import com.parental.agent.sync.ApiConstants
import com.parental.agent.ui.theme.*
import kotlinx.coroutines.launch

@Composable
fun PairingScreen(
    deviceId: String,
    onPairDevice: (licenseKey: String, deviceAlias: String) -> Unit,
    isLoading: Boolean = false,
    errorMessage: String? = null
) {
    val context = androidx.compose.ui.platform.LocalContext.current
    val prefs = remember { com.parental.agent.data.local.AppPreferences(context) }

    var activationMode by remember { mutableStateOf(0) } // 0: Direct Key, 1: Parent Account
    var directLicenseKey by remember { mutableStateOf("") }
    var email by remember { mutableStateOf("parent@gmail.com") }
    var password by remember { mutableStateOf("12345678") }

    // Dialogs & Inspection States
    var showLicenseDialog by remember { mutableStateOf(false) }
    var showInspectionConfirmDialog by remember { mutableStateOf(false) }
    var inspectedLicense by remember { mutableStateOf<LicenseInspectionResult?>(null) }
    var isInspectingKey by remember { mutableStateOf(false) }

    // Advanced Server Host
    var showServerSettings by remember { mutableStateOf(false) }
    var serverHostInput by remember { mutableStateOf(prefs.getServerBaseUrl()) }

    LaunchedEffect(Unit) {
        val saved = prefs.getServerBaseUrl()
        ApiClient.setCustomBaseUrl(saved)
        ApiConstants.setCustomBaseUrl(saved)
    }

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
            text = "Activate your purchased subscription license to pair this target device",
            style = MaterialTheme.typography.bodyMedium,
            color = Slate500
        )

        Spacer(modifier = Modifier.height(18.dp))

        // Activation Mode Segmented Tab
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .background(Slate200, RoundedCornerShape(10.dp))
                .padding(3.dp)
        ) {
            Surface(
                modifier = Modifier
                    .weight(1f)
                    .clickable { activationMode = 0 },
                color = if (activationMode == 0) MaterialTheme.colorScheme.surface else Slate200,
                shape = RoundedCornerShape(8.dp),
                shadowElevation = if (activationMode == 0) 2.dp else 0.dp
            ) {
                Box(
                    modifier = Modifier.padding(vertical = 10.dp),
                    contentAlignment = Alignment.Center
                ) {
                    Text(
                        text = "Enter License Key",
                        fontWeight = if (activationMode == 0) FontWeight.Bold else FontWeight.Medium,
                        fontSize = 13.sp,
                        color = if (activationMode == 0) Indigo600 else Slate600
                    )
                }
            }

            Surface(
                modifier = Modifier
                    .weight(1f)
                    .clickable { activationMode = 1 },
                color = if (activationMode == 1) MaterialTheme.colorScheme.surface else Slate200,
                shape = RoundedCornerShape(8.dp),
                shadowElevation = if (activationMode == 1) 2.dp else 0.dp
            ) {
                Box(
                    modifier = Modifier.padding(vertical = 10.dp),
                    contentAlignment = Alignment.Center
                ) {
                    Text(
                        text = "Parent Account",
                        fontWeight = if (activationMode == 1) FontWeight.Bold else FontWeight.Medium,
                        fontSize = 13.sp,
                        color = if (activationMode == 1) Indigo600 else Slate600
                    )
                }
            }
        }

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
                verticalArrangement = Arrangement.spacedBy(14.dp)
            ) {
                if (activationMode == 0) {
                    // Direct License Key Input
                    OutlinedTextField(
                        value = directLicenseKey,
                        onValueChange = { directLicenseKey = it.uppercase() },
                        label = { Text("License Key") },
                        placeholder = { Text("LIC-VIP-XXXXXX") },
                        singleLine = true,
                        modifier = Modifier.fillMaxWidth()
                    )

                    Text(
                        text = "Enter or paste your license key. We will display your registered name, email, and phone before confirming activation.",
                        style = MaterialTheme.typography.bodySmall,
                        color = Slate500,
                        fontSize = 11.sp
                    )
                } else {
                    // Parent Email & Password Input
                    OutlinedTextField(
                        value = email,
                        onValueChange = { email = it },
                        label = { Text("Parent Email") },
                        placeholder = { Text("parent@example.com") },
                        singleLine = true,
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Email),
                        modifier = Modifier.fillMaxWidth()
                    )

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

                    // Selected License Card
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
                }

                // Expandable Server Host Configuration
                TextButton(
                    onClick = { showServerSettings = !showServerSettings },
                    contentPadding = PaddingValues(0.dp)
                ) {
                    Text(
                        text = if (showServerSettings) "Hide Server Settings" else "Server Settings (Advanced)",
                        fontSize = 12.sp,
                        color = Indigo600
                    )
                }

                if (showServerSettings) {
                    OutlinedTextField(
                        value = serverHostInput,
                        onValueChange = {
                            serverHostInput = it
                            ApiClient.setCustomBaseUrl(it)
                            ApiConstants.setCustomBaseUrl(it)
                            prefs.setServerBaseUrl(it)
                        },
                        label = { Text("Server URL") },
                        placeholder = { Text("http://10.0.2.2:3000") },
                        singleLine = true,
                        modifier = Modifier.fillMaxWidth()
                    )
                    Text(
                        text = "Default emulator: http://10.0.2.2:3000. Physical device: use local Wi-Fi IP.",
                        fontSize = 10.sp,
                        color = Slate400
                    )
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

        // Main Action Button
        val isFormValid = if (activationMode == 0) {
            directLicenseKey.isNotBlank() && directLicenseKey.length >= 6
        } else {
            email.isNotBlank() && password.isNotBlank()
        }

        val isBusy = isFetchingLicenses || isActivatingServer || isInspectingKey || isLoading

        Button(
            onClick = {
                if (activationMode == 0) {
                    // Direct Key Flow: Inspect license details & show confirmation dialog FIRST
                    isInspectingKey = true
                    serverErrorMsg = null
                    coroutineScope.launch {
                        val (success, result) = ApiClient.inspectLicense(directLicenseKey.trim())
                        isInspectingKey = false
                        if (success && result != null) {
                            inspectedLicense = result
                            showInspectionConfirmDialog = true
                        } else {
                            serverErrorMsg = result?.errorMessage ?: "License key not found or server unreachable."
                        }
                    }
                } else {
                    // Parent Account Flow
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
                        // Activate selected license directly
                        isActivatingServer = true
                        serverErrorMsg = null
                        coroutineScope.launch {
                            val (success, msg) = ApiClient.activateLicenseOnServer(
                                deviceId = deviceId,
                                licenseKey = selectedLicense!!.licenseKey
                            )
                            isActivatingServer = false
                            if (success) {
                                onPairDevice(selectedLicense!!.licenseKey, autoDeviceAlias)
                            } else {
                                serverErrorMsg = msg
                            }
                        }
                    }
                }
            },
            enabled = isFormValid && !isBusy,
            modifier = Modifier
                .fillMaxWidth()
                .height(52.dp),
            shape = RoundedCornerShape(10.dp),
            colors = ButtonDefaults.buttonColors(
                containerColor = Indigo600,
                disabledContainerColor = Slate200
            )
        ) {
            if (isBusy) {
                Row(
                    horizontalArrangement = Arrangement.Center,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        text = when {
                            isInspectingKey -> "🔍 Checking License Details..."
                            isFetchingLicenses -> "⏳ Fetching Licenses..."
                            else -> "⏳ Confirming with Server..."
                        },
                        fontSize = 14.sp,
                        fontWeight = FontWeight.Bold,
                        color = MaterialTheme.colorScheme.onPrimary
                    )
                }
            } else {
                Text(
                    text = when {
                        activationMode == 0 -> "Verify & Preview License ➔"
                        selectedLicense == null -> "Log In & Select Plan"
                        else -> "Activate Selected License"
                    },
                    fontSize = 15.sp,
                    fontWeight = FontWeight.Bold
                )
            }
        }
    }

    // 1. License Confirmation Modal (Shows User Name, Email, Phone, Plan before final activation)
    if (showInspectionConfirmDialog && inspectedLicense != null) {
        val lic = inspectedLicense!!
        AlertDialog(
            onDismissRequest = {
                if (!isActivatingServer) showInspectionConfirmDialog = false
            },
            title = {
                Column {
                    Text("Confirm Subscription Details", fontWeight = FontWeight.Bold, fontSize = 18.sp, color = Slate900)
                    Text("Please verify your account details before activating this phone", fontSize = 12.sp, color = Slate500)
                }
            },
            text = {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(vertical = 4.dp),
                    verticalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    // Plan Details Card
                    Surface(
                        color = Indigo50,
                        shape = RoundedCornerShape(10.dp),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Column(modifier = Modifier.padding(12.dp), verticalArrangement = Arrangement.spacedBy(2.dp)) {
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Text(
                                    text = lic.planName,
                                    fontWeight = FontWeight.Bold,
                                    fontSize = 15.sp,
                                    color = Indigo700
                                )
                                if (!lic.planBadge.isNullOrBlank()) {
                                    Surface(
                                        color = Indigo600,
                                        shape = RoundedCornerShape(4.dp)
                                    ) {
                                        Text(
                                            text = lic.planBadge,
                                            color = MaterialTheme.colorScheme.onPrimary,
                                            fontSize = 10.sp,
                                            fontWeight = FontWeight.Bold,
                                            modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                                        )
                                    }
                                }
                            }
                            Text(
                                text = "Key: ${lic.licenseKey}",
                                fontSize = 12.sp,
                                fontWeight = FontWeight.SemiBold,
                                color = Slate700
                            )
                        }
                    }

                    // Registered Owner Details Card
                    Surface(
                        color = Slate100,
                        shape = RoundedCornerShape(10.dp),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Column(modifier = Modifier.padding(12.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                            Text(
                                text = "REGISTERED OWNER INFO",
                                fontSize = 10.sp,
                                fontWeight = FontWeight.Bold,
                                color = Slate500
                            )

                            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                                Text("Name:", fontSize = 12.sp, color = Slate500)
                                Text(lic.owner.name, fontSize = 12.sp, fontWeight = FontWeight.SemiBold, color = Slate900)
                            }

                            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                                Text("Email:", fontSize = 12.sp, color = Slate500)
                                Text(lic.owner.email, fontSize = 12.sp, fontWeight = FontWeight.SemiBold, color = Slate900)
                            }

                            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                                Text("Phone:", fontSize = 12.sp, color = Slate500)
                                Text(lic.owner.phone, fontSize = 12.sp, fontWeight = FontWeight.SemiBold, color = Slate900)
                            }

                            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                                Text("Status:", fontSize = 12.sp, color = Slate500)
                                Text(
                                    text = if (lic.isAlreadyAssigned) "Assigned to ${lic.assignedDeviceName ?: "Device"}" else "Unassigned (Ready)",
                                    fontSize = 12.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = if (lic.isAlreadyAssigned) Amber500 else Emerald500
                                )
                            }
                        }
                    }

                    if (lic.isAlreadyAssigned) {
                        Text(
                            text = "⚠️ This license is currently linked to another phone. Activating will transfer it to this device.",
                            fontSize = 11.sp,
                            color = Amber500,
                            lineHeight = 15.sp
                        )
                    }

                    if (lic.isExpired) {
                        Text(
                            text = "❌ This subscription has EXPIRED. Please renew your plan on the web dashboard.",
                            fontSize = 11.sp,
                            color = MaterialTheme.colorScheme.error,
                            fontWeight = FontWeight.Bold
                        )
                    }
                }
            },
            confirmButton = {
                Button(
                    onClick = {
                        isActivatingServer = true
                        serverErrorMsg = null
                        coroutineScope.launch {
                            val (success, msg) = ApiClient.activateLicenseOnServer(
                                deviceId = deviceId,
                                licenseKey = lic.licenseKey
                            )
                            isActivatingServer = false
                            if (success) {
                                showInspectionConfirmDialog = false
                                onPairDevice(lic.licenseKey, autoDeviceAlias)
                            } else {
                                serverErrorMsg = msg
                                showInspectionConfirmDialog = false
                            }
                        }
                    },
                    enabled = !lic.isExpired && !isActivatingServer,
                    colors = ButtonDefaults.buttonColors(containerColor = Indigo600)
                ) {
                    Text(
                        text = if (isActivatingServer) "Activating..." else "Confirm & Activate",
                        fontWeight = FontWeight.Bold
                    )
                }
            },
            dismissButton = {
                TextButton(
                    onClick = { showInspectionConfirmDialog = false },
                    enabled = !isActivatingServer
                ) {
                    Text("Cancel / Change")
                }
            }
        )
    }

    // 2. License Selection Dialog Pop-up (Parent Account flow)
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
