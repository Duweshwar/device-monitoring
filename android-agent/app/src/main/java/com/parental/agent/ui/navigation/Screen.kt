package com.parental.agent.ui.navigation

sealed class Screen(val route: String) {
    object Terms : Screen("terms")
    object Permissions : Screen("permissions")
    object Pairing : Screen("pairing")
    object ActiveStatus : Screen("active_status")
}
