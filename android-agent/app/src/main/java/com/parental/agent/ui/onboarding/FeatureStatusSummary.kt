package com.parental.agent.ui.onboarding

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.parental.agent.ui.theme.*

enum class FeatureStatusLevel {
    FULL,       // 🟢 100% Functionality Active
    PARTIAL,    // 🟡 Limited / Fallback Mode Active
    DISABLED    // 🔴 Missing Permission / Unsupported
}

data class FeatureCapability(
    val name: String,
    val description: String,
    val status: FeatureStatusLevel,
    val statusNote: String
)

@Composable
fun FeatureStatusCard(capability: FeatureCapability) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        shape = RoundedCornerShape(8.dp)
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(14.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.SpaceBetween
        ) {
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = capability.name,
                    fontWeight = FontWeight.Bold,
                    fontSize = 14.sp,
                    color = Slate900
                )
                Spacer(modifier = Modifier.height(2.dp))
                Text(
                    text = capability.description,
                    fontSize = 11.sp,
                    color = Slate500
                )
                Spacer(modifier = Modifier.height(4.dp))
                Text(
                    text = capability.statusNote,
                    fontSize = 11.sp,
                    fontWeight = FontWeight.Medium,
                    color = when (capability.status) {
                        FeatureStatusLevel.FULL -> Emerald600
                        FeatureStatusLevel.PARTIAL -> Amber600
                        FeatureStatusLevel.DISABLED -> Slate500
                    }
                )
            }

            Spacer(modifier = Modifier.width(12.dp))

            // Status Badge
            Surface(
                color = when (capability.status) {
                    FeatureStatusLevel.FULL -> Emerald50
                    FeatureStatusLevel.PARTIAL -> Amber50
                    FeatureStatusLevel.DISABLED -> Slate100
                },
                shape = RoundedCornerShape(6.dp)
            ) {
                Text(
                    text = when (capability.status) {
                        FeatureStatusLevel.FULL -> "🟢 FULL"
                        FeatureStatusLevel.PARTIAL -> "🟡 PARTIAL"
                        FeatureStatusLevel.DISABLED -> "🔴 OFF"
                    },
                    color = when (capability.status) {
                        FeatureStatusLevel.FULL -> Emerald600
                        FeatureStatusLevel.PARTIAL -> Amber600
                        FeatureStatusLevel.DISABLED -> Slate700
                    },
                    fontSize = 11.sp,
                    fontWeight = FontWeight.Bold,
                    modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp)
                )
            }
        }
    }
}
