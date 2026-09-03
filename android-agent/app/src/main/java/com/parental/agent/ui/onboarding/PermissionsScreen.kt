package com.parental.agent.ui.onboarding

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.parental.agent.ui.theme.*

data class PermissionItem(
    val id: String,
    val title: String,
    val description: String,
    val isGranted: Boolean,
    val isMandatory: Boolean = true
)

@Composable
fun PermissionsScreen(
    permissionList: List<PermissionItem>,
    featureCapabilities: List<FeatureCapability>,
    isAlreadyPaired: Boolean = false,
    onRequestPermission: (PermissionItem) -> Unit,
    onContinue: () -> Unit
) {
    var selectedTab by remember { mutableStateOf(0) } // 0: Permissions Checklist, 1: Feature Matrix
    val allMandatoryGranted = permissionList.filter { it.isMandatory }.all { it.isGranted }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(Slate50)
            .padding(24.dp)
    ) {
        Spacer(modifier = Modifier.height(16.dp))

        Text(
            text = "Permissions & Feature Status",
            style = MaterialTheme.typography.headlineSmall,
            fontWeight = FontWeight.Bold,
            color = Slate900
        )

        Text(
            text = "Grant required Android services to enable monitoring capabilities",
            style = MaterialTheme.typography.bodyMedium,
            color = Slate500
        )

        Spacer(modifier = Modifier.height(16.dp))

        // Tab Selector (Permissions Checklist vs Feature Matrix)
        TabRow(
            selectedTabIndex = selectedTab,
            containerColor = Slate100,
            contentColor = Indigo600,
            modifier = Modifier.fillMaxWidth().clip(RoundedCornerShape(8.dp))
        ) {
            Tab(
                selected = selectedTab == 0,
                onClick = { selectedTab = 0 },
                text = { Text("Permissions (${permissionList.count { it.isGranted }}/${permissionList.size})", fontWeight = FontWeight.Bold) }
            )
            Tab(
                selected = selectedTab == 1,
                onClick = { selectedTab = 1 },
                text = { Text("Feature Status Matrix", fontWeight = FontWeight.Bold) }
            )
        }

        Spacer(modifier = Modifier.height(16.dp))

        // Tab Content
        if (selectedTab == 0) {
            // Live Permission Checklist
            LazyColumn(
                modifier = Modifier.weight(1f),
                verticalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                items(permissionList) { item ->
                    PermissionRow(
                        item = item,
                        onClick = { onRequestPermission(item) }
                    )
                }
            }
        } else {
            // Live Feature Capability Status (FULL vs PARTIAL vs DISABLED)
            LazyColumn(
                modifier = Modifier.weight(1f),
                verticalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                items(featureCapabilities) { capability ->
                    FeatureStatusCard(capability = capability)
                }
            }
        }

        Spacer(modifier = Modifier.height(16.dp))

        // Continue Button
        Button(
            onClick = onContinue,
            enabled = isAlreadyPaired || allMandatoryGranted,
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
                text = if (isAlreadyPaired) "Continue to Active Status" else (if (allMandatoryGranted) "Continue to Device Pairing" else "Grant Mandatory Permissions First"),
                fontSize = 15.sp,
                fontWeight = FontWeight.Bold
            )
        }
    }
}

@Composable
fun PermissionRow(
    item: PermissionItem,
    onClick: () -> Unit
) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        shape = RoundedCornerShape(10.dp)
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Column(modifier = Modifier.weight(1f)) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text(
                        text = item.title,
                        fontWeight = FontWeight.Bold,
                        fontSize = 15.sp,
                        color = Slate900
                    )
                    if (item.isMandatory) {
                        Spacer(modifier = Modifier.width(6.dp))
                        Text(
                            text = "*Required",
                            fontSize = 11.sp,
                            color = Amber600,
                            fontWeight = FontWeight.Medium
                        )
                    }
                }
                Spacer(modifier = Modifier.height(4.dp))
                Text(
                    text = item.description,
                    fontSize = 12.sp,
                    color = Slate500
                )
            }

            Spacer(modifier = Modifier.width(12.dp))

            // Status Badge / Grant Button
            if (item.isGranted) {
                Surface(
                    color = Emerald50,
                    shape = RoundedCornerShape(6.dp)
                ) {
                    Text(
                        text = "✓ GRANTED",
                        color = Emerald600,
                        fontSize = 12.sp,
                        fontWeight = FontWeight.Bold,
                        modifier = Modifier.padding(horizontal = 10.dp, vertical = 6.dp)
                    )
                }
            } else if (item.id == "device_owner") {
                Button(
                    onClick = onClick,
                    shape = RoundedCornerShape(6.dp),
                    contentPadding = PaddingValues(horizontal = 10.dp, vertical = 4.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = Indigo600)
                ) {
                    Text(
                        text = "DEV OPTIONS",
                        fontSize = 11.sp,
                        fontWeight = FontWeight.Bold
                    )
                }
            } else {
                Button(
                    onClick = onClick,
                    shape = RoundedCornerShape(6.dp),
                    contentPadding = PaddingValues(horizontal = 12.dp, vertical = 4.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = Indigo600)
                ) {
                    Text(
                        text = "GRANT",
                        fontSize = 12.sp,
                        fontWeight = FontWeight.Bold
                    )
                }
            }
        }
    }
}
