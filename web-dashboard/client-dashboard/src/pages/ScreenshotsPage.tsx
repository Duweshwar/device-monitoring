import React, { useState, useEffect } from 'react';
import { DeviceInfo } from '../types/dashboard.types';
import { apiService } from '../services/apiService';
import { 
  Camera, 
  RefreshCw, 
  Download, 
  Calendar, 
  X, 
  Zap, 
  Sparkles, 
  Loader2, 
  Eye, 
  Clock,
  AlertTriangle,
  Play,
  Square,
  Sliders,
  CheckCircle2,
  Monitor,
  Smartphone
} from 'lucide-react';

interface ScreenshotsPageProps {
  device: DeviceInfo;
}

interface ScreenshotMediaItem {
  id: string;
  deviceId: string;
  category: string;
  filename: string;
  fileSizeBytes: number;
  mimeType: string;
  url: string;
  timestamp: string;
}

interface PendingScreenshotItem {
  id: string;
  commandId?: string;
  timestamp: string;
  createdAt: number;
  status: 'PENDING' | 'TIMEOUT' | 'FAILED';
  error?: string;
}

interface ScheduleState {
  active: boolean;
  durationMin: number;
  intervalSec: number;
  startTime: number;
  stopTime: number;
}

export function ScreenshotsPage({ device }: ScreenshotsPageProps) {
  const [screenshots, setScreenshots] = useState<ScreenshotMediaItem[]>([]);
  const [pendingRequests, setPendingRequests] = useState<PendingScreenshotItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedScreenshot, setSelectedScreenshot] = useState<ScreenshotMediaItem | null>(null);

  // Active Schedule State
  const [schedule, setSchedule] = useState<ScheduleState>({
    active: false,
    durationMin: 15,
    intervalSec: 30,
    startTime: 0,
    stopTime: 0
  });

  // UI Modals & Actions
  const [instantCapturing, setInstantCapturing] = useState<boolean>(false);
  const [scheduleModalOpen, setScheduleModalOpen] = useState<boolean>(false);
  const [scheduleDuration, setScheduleDuration] = useState<number>(15); // 15 mins default
  const [scheduleInterval, setScheduleInterval] = useState<number>(30); // 30 sec default
  const [intervalUnit, setIntervalUnit] = useState<'SEC' | 'MIN'>('SEC');
  const [useFutureStartTime, setUseFutureStartTime] = useState<boolean>(false);
  const [futureTimeMode, setFutureTimeMode] = useState<'BUFFER' | 'DATETIME'>('BUFFER');
  const [startDelayMin, setStartDelayMin] = useState<number>(5); // 5 mins in future default
  const [customStartDateTime, setCustomStartDateTime] = useState<string>(() => {
    const defaultDate = new Date(Date.now() + 10 * 60 * 1000);
    const iso = defaultDate.toISOString();
    return iso.substring(0, 16); // yyyy-MM-ddTHH:mm format for datetime-local input
  });
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const getDismissedCommands = (): Set<string> => {
    try {
      const raw = localStorage.getItem(`dismissed_commands_${device.id}`);
      return raw ? new Set(JSON.parse(raw)) : new Set();
    } catch {
      return new Set();
    }
  };

  const getPhotoUrl = (url: string) => {
    if (!url) return '';
    if (url.startsWith('http://') || url.startsWith('https://')) return url;
    if (url.startsWith('/api/v1')) return url;
    return `/api/v1${url.startsWith('/') ? '' : '/'}${url}`;
  };

  const handleDismissPending = (id: string, commandId?: string) => {
    const keyToDismiss = commandId || id;
    try {
      const current = getDismissedCommands();
      current.add(keyToDismiss);
      current.add(id);
      localStorage.setItem(`dismissed_commands_${device.id}`, JSON.stringify(Array.from(current)));
    } catch (e) {
      console.warn('Failed to save dismissed command to localStorage:', e);
    }
    setPendingRequests((prev) => prev.filter((r) => r.id !== id && r.commandId !== keyToDismiss));
  };

  const fetchScreenshots = async () => {
    if (!device || device.id === 'no_device') {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const token = localStorage.getItem('childcare_auth_token') || 'jwt_demo_token';
      const response = await fetch(`/api/v1/media/device/${device.id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      let currentScreenshots: ScreenshotMediaItem[] = [];
      if (data.success && Array.isArray(data.assets)) {
        currentScreenshots = data.assets.filter((a: ScreenshotMediaItem) => 
          a.category === 'SCREENSHOT' || a.filename?.startsWith('screenshot_') || a.filename?.startsWith('scr_')
        );
        setScreenshots(currentScreenshots);
      } else {
        setScreenshots([]);
      }

      // Hydrate command statuses from backend store so pending & failed cards persist across refresh
      const statusRes = await apiService.getCommandStatuses(device.id);
      const dismissedSet = getDismissedCommands();

      if (statusRes.success && statusRes.statuses) {
        setPendingRequests((prev) => {
          const map = new Map<string, PendingScreenshotItem>();

          // Preserve existing state items (unless dismissed)
          prev.forEach((req) => {
            const key = req.commandId || req.id;
            if (!dismissedSet.has(key) && !dismissedSet.has(req.id)) {
              map.set(key, req);
            }
          });

          // Hydrate backend statuses
          Object.entries(statusRes.statuses).forEach(([cmdId, info]) => {
            if (!cmdId.startsWith('cmd_scr_')) return;
            if (dismissedSet.has(cmdId) || dismissedSet.has(`scr_${cmdId}`)) return;

            const isSuccess = info.status === 'SUCCESS';
            const isFailed = info.status === 'FAILED';
            const isPending = info.status === 'PENDING';
            const now = Date.now();
            const createdAt = info.timestamp || now;

            const hasUploadedAsset = currentScreenshots.some((s) => {
              const scrTime = new Date(s.timestamp).getTime();
              return scrTime >= createdAt - 5000;
            });

            if (isSuccess || hasUploadedAsset) {
              map.delete(cmdId);
              return;
            }

            let status: 'PENDING' | 'TIMEOUT' | 'FAILED' = 'PENDING';
            if (isFailed) {
              status = 'FAILED';
            } else if (isPending && now - createdAt > 25000) {
              status = 'TIMEOUT';
            }

            const existing = map.get(cmdId);
            map.set(cmdId, {
              id: existing?.id || `scr_${cmdId}`,
              commandId: cmdId,
              timestamp: existing?.timestamp || new Date(createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              createdAt,
              status,
              error: isFailed ? (info.error || 'Screenshot capture failed on target device') : existing?.error
            });
          });

          return Array.from(map.values()).sort((a, b) => b.createdAt - a.createdAt);
        });
      }

      // Check schedule status
      const schedRes = await apiService.getScreenshotSchedule(device.id);
      if (schedRes.success && schedRes.schedule) {
        setSchedule(schedRes.schedule);
      }
    } catch (e) {
      console.warn('Failed to fetch screenshots:', e);
      setScreenshots([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchScreenshots();
    const interval = setInterval(fetchScreenshots, 5000);
    return () => clearInterval(interval);
  }, [device]);

  // Timeout checker for pending requests
  useEffect(() => {
    const timeoutChecker = setInterval(() => {
      const now = Date.now();
      setPendingRequests((prev) =>
        prev.map((req) => {
          if (req.status === 'PENDING' && now - req.createdAt > 25000) {
            return { ...req, status: 'TIMEOUT' };
          }
          return req;
        })
      );
    }, 3000);
    return () => clearInterval(timeoutChecker);
  }, []);

  const handleTriggerInstantScreenshot = async () => {
    setInstantCapturing(true);
    setToastMsg(null);
    try {
      const res = await apiService.triggerScreenshot({ deviceId: device.id });
      if (res.success) {
        setToastMsg('📸 Instant screenshot command dispatched! Capturing target screen now...');
        const now = Date.now();
        setPendingRequests((prev) => [
          {
            id: `pending_scr_${now}`,
            commandId: res.commandId,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            createdAt: now,
            status: 'PENDING'
          },
          ...prev
        ]);

        setTimeout(fetchScreenshots, 1500);
        setTimeout(fetchScreenshots, 3500);
        setTimeout(fetchScreenshots, 6500);
      } else {
        setToastMsg('⚠️ Failed to dispatch screenshot command.');
      }
    } catch (e) {
      setToastMsg('⚠️ Connection error initiating screenshot.');
    } finally {
      setInstantCapturing(false);
    }
  };

  const handleSaveSchedule = async (enable: boolean) => {
    setToastMsg(null);
    try {
      let delayVal = 0;
      let targetStartTime = 0;

      if (enable && useFutureStartTime) {
        if (futureTimeMode === 'DATETIME' && customStartDateTime) {
          targetStartTime = new Date(customStartDateTime).getTime();
          delayVal = Math.max(0, Math.round((targetStartTime - Date.now()) / 60000));
        } else {
          delayVal = startDelayMin > 0 ? startDelayMin : 0;
          targetStartTime = Date.now() + (delayVal * 60 * 1000);
        }
      }

      const res = await apiService.setScreenshotSchedule({
        deviceId: device.id,
        active: enable,
        durationMin: scheduleDuration,
        intervalSec: scheduleInterval,
        startDelayMin: delayVal,
        startTime: enable ? targetStartTime : 0
      });

      if (res.success) {
        setSchedule(res.schedule);
        setScheduleModalOpen(false);
        if (enable) {
          const intervalText = scheduleInterval >= 60 ? `${scheduleInterval / 60} min` : `${scheduleInterval} sec`;
          const startNotice = delayVal > 0 ? `starting in ~${delayVal} mins` : 'starting immediately';
          setToastMsg(`⏰ Automatic Screenshots scheduled (${startNotice})! Capturing every ${intervalText} for ${scheduleDuration} minutes.`);
        } else {
          setToastMsg('⏹️ Scheduled screenshot capture stopped.');
        }
      }
    } catch (e) {
      setToastMsg('⚠️ Failed to update screenshot schedule.');
    }
  };

  const formatFileSize = (bytes: number) => {
    if (!bytes) return '0 KB';
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const nowTime = Date.now();
  const isFutureWaiting = schedule.active && schedule.startTime > nowTime;
  const isScheduleRunning = schedule.active && schedule.startTime <= nowTime && schedule.stopTime > nowTime;
  const isScheduleActive = isFutureWaiting || isScheduleRunning;

  const remainingSeconds = isScheduleRunning ? Math.max(0, Math.floor((schedule.stopTime - nowTime) / 1000)) : 0;
  const remainingMin = Math.floor(remainingSeconds / 60);
  const remainingSec = remainingSeconds % 60;

  const futureWaitMin = isFutureWaiting ? Math.ceil((schedule.startTime - nowTime) / 60000) : 0;

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMsg && (
        <div className="bg-indigo-600 text-white px-5 py-3.5 rounded-2xl shadow-lg flex items-center justify-between animate-fadeIn">
          <div className="flex items-center gap-3">
            <Zap className="w-5 h-5 text-amber-300 animate-pulse" />
            <span className="text-xs font-bold">{toastMsg}</span>
          </div>
          <button onClick={() => setToastMsg(null)} className="p-1 hover:bg-indigo-700 rounded-lg">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Page Header */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold shadow-inner border border-indigo-100">
            <Monitor className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">Remote Screen Captures & Screenshots</h1>
            <p className="text-xs text-slate-500 font-medium">
              Instant remote screenshot capture & periodic automated screenshot scheduler for <span className="font-bold text-indigo-600">{device.alias}</span>
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto justify-end">
          <button
            onClick={handleTriggerInstantScreenshot}
            disabled={instantCapturing}
            className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl transition-all flex items-center gap-2 text-xs font-bold shadow-md shadow-indigo-600/20 active:scale-95"
          >
            {instantCapturing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
            <span>Take Instant Screenshot</span>
          </button>

          <button
            onClick={() => setScheduleModalOpen(true)}
            className={`px-4 py-2.5 rounded-xl transition-all flex items-center gap-2 text-xs font-bold shadow-sm ${
              isScheduleActive 
                ? 'bg-amber-500 text-white hover:bg-amber-600' 
                : 'bg-slate-900 text-white hover:bg-slate-800'
            }`}
          >
            <Sliders className="w-4 h-4" />
            <span>{isScheduleActive ? 'Manage Active Schedule' : 'Schedule Auto Captures'}</span>
          </button>

          <button
            onClick={fetchScreenshots}
            className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl transition-all flex items-center gap-2 text-xs font-bold"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Active Schedule Status Banner */}
      {isScheduleActive && (
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-3xl p-5 border border-amber-500/40 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 animate-fadeIn">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-400/30 text-amber-400 flex items-center justify-center font-bold shrink-0">
              <Clock className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 bg-amber-500 text-slate-950 text-[10px] font-black rounded uppercase">
                  {isFutureWaiting ? 'SCHEDULED FUTURE CAPTURE' : 'ACTIVE SCHEDULE'}
                </span>
                <span className="text-xs text-amber-300 font-bold">
                  Capturing every {schedule.intervalSec >= 60 ? `${schedule.intervalSec / 60} minute(s)` : `${schedule.intervalSec} seconds`}
                </span>
              </div>
              <p className="text-xs text-slate-300 font-medium mt-1">
                {isFutureWaiting ? (
                  <>Starts in: <span className="font-bold text-amber-400 text-sm">~{futureWaitMin} minute(s)</span> at {new Date(schedule.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • Duration: {schedule.durationMin}m</>
                ) : (
                  <>Time remaining: <span className="font-bold text-white text-sm">{remainingMin}m {remainingSec}s</span> • Target device: {device.alias}</>
                )}
              </p>
            </div>
          </div>

          <button
            onClick={() => handleSaveSchedule(false)}
            className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl transition-all flex items-center gap-2 shadow-md shrink-0"
          >
            <Square className="w-3.5 h-3.5 fill-current" />
            <span>Stop Schedule</span>
          </button>
        </div>
      )}

      {/* Stats Summary Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
            <Monitor className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs text-slate-500 font-bold block">Total Screenshots</span>
            <span className="text-xl font-black text-slate-900">{screenshots.length}</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
            <Zap className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs text-slate-500 font-bold block">Schedule Status</span>
            <span className={`text-xs font-black block mt-1 ${
              isScheduleRunning ? 'text-emerald-600' : isFutureWaiting ? 'text-amber-600' : 'text-slate-500'
            }`}>
              {isScheduleRunning ? '● RUNNING' : isFutureWaiting ? `⏳ WAITING (+${futureWaitMin}m)` : '○ IDLE (Manual)'}
            </span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-purple-50 text-purple-600 rounded-xl">
            <Sliders className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs text-slate-500 font-bold block">Set Interval</span>
            <span className="text-xl font-black text-purple-600">
              {schedule.intervalSec >= 60 ? `${schedule.intervalSec / 60} min` : `${schedule.intervalSec} sec`}
            </span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs text-slate-500 font-bold block">Pending / Capturing</span>
            <span className="text-xl font-black text-amber-600">{pendingRequests.length}</span>
          </div>
        </div>
      </div>

      {/* Screenshot Gallery Grid */}
      {loading && screenshots.length === 0 && pendingRequests.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 shadow-sm">
          <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-xs text-slate-500 font-bold">Checking target device screenshots...</p>
        </div>
      ) : screenshots.length === 0 && pendingRequests.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 shadow-sm space-y-4">
          <div className="w-14 h-14 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto border border-indigo-100 shadow-inner">
            <Monitor className="w-7 h-7" />
          </div>
          <div className="space-y-1">
            <h3 className="font-bold text-slate-800 text-base">No Screenshots Captured Yet</h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
              Click <strong>"Take Instant Screenshot"</strong> above to capture the child's screen instantly or click <strong>"Schedule Auto Captures"</strong> to capture one image every N seconds/minutes for the next N minutes.
            </p>
          </div>

          <div className="flex items-center justify-center gap-3 pt-2">
            <button
              onClick={handleTriggerInstantScreenshot}
              className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-full shadow-lg shadow-indigo-600/20 transition-all inline-flex items-center gap-2"
            >
              <Camera className="w-4 h-4" />
              <span>Capture First Screenshot Now</span>
            </button>

            <button
              onClick={() => setScheduleModalOpen(true)}
              className="px-6 py-3 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-full shadow-md transition-all inline-flex items-center gap-2"
            >
              <Sliders className="w-4 h-4" />
              <span>Configure Schedule</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {/* Pending Request Cards */}
          {pendingRequests.map((pending) => (
            <div
              key={pending.id}
              className={`relative rounded-2xl overflow-hidden aspect-square border bg-slate-950/85 backdrop-blur-lg p-4 flex flex-col justify-between shadow-lg transition-all ${
                pending.status === 'FAILED'
                  ? 'border-rose-500/60'
                  : pending.status === 'TIMEOUT'
                  ? 'border-slate-700/80'
                  : 'border-amber-400/70 animate-pulse'
              }`}
            >
              {/* Header Badges */}
              <div className="flex items-center justify-between z-10">
                <span className="px-2 py-0.5 bg-indigo-600/90 text-white rounded-md text-[10px] font-black uppercase tracking-wide flex items-center gap-1 shadow-sm">
                  📱 SCREENSHOT
                </span>

                {pending.status === 'PENDING' ? (
                  <span className="px-2 py-0.5 bg-amber-500 text-slate-950 text-[10px] font-black rounded-md flex items-center gap-1 shadow-sm">
                    <Loader2 className="w-3 h-3 animate-spin" /> CAPTURING
                  </span>
                ) : pending.status === 'FAILED' ? (
                  <span className="px-2 py-0.5 bg-rose-600 text-white text-[10px] font-black rounded-md flex items-center gap-1 shadow-sm">
                    <AlertTriangle className="w-3 h-3" /> FAILED
                  </span>
                ) : (
                  <span className="px-2 py-0.5 bg-slate-800 text-slate-200 text-[10px] font-bold rounded-md flex items-center gap-1 border border-slate-700">
                    <Clock className="w-3 h-3 text-amber-400" /> TIMEOUT
                  </span>
                )}
              </div>

              {/* Main Content Area */}
              <div className="my-auto text-center space-y-2 py-2">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center mx-auto border ${
                  pending.status === 'FAILED'
                    ? 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                    : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                }`}>
                  {pending.status === 'PENDING' ? (
                    <Loader2 className="w-5 h-5 animate-spin text-amber-400" />
                  ) : pending.status === 'FAILED' ? (
                    <AlertTriangle className="w-5 h-5 text-rose-400" />
                  ) : (
                    <Clock className="w-5 h-5 text-amber-400" />
                  )}
                </div>
                <p className="text-xs font-bold leading-snug px-1 text-slate-100">
                  {pending.status === 'PENDING'
                    ? `Capturing target screen in background...`
                    : pending.status === 'FAILED'
                    ? (pending.error || 'Screen capture failed on device')
                    : `Device screen capture timed out.`}
                </p>
              </div>

              {/* Footer Row */}
              <div className="flex items-center justify-between text-[10px] pt-2 border-t border-slate-800/80 mt-auto text-slate-300">
                <span className="font-medium">
                  Requested: <span className="font-bold text-white">{pending.timestamp}</span>
                </span>
                <button
                  onClick={() => handleDismissPending(pending.id, pending.commandId)}
                  className={`px-2.5 py-0.5 rounded text-[10px] font-bold transition-all border ${
                    pending.status === 'FAILED'
                      ? 'bg-rose-500/20 text-rose-200 hover:bg-rose-600 hover:text-white border-rose-500/40'
                      : 'bg-slate-800 text-slate-200 hover:bg-slate-700 hover:text-white border-slate-700'
                  }`}
                >
                  Dismiss
                </button>
              </div>
            </div>
          ))}

          {/* Actual Uploaded Screenshots */}
          {screenshots.map((scr) => (
            <div
              key={scr.id}
              onClick={() => setSelectedScreenshot(scr)}
              className="group relative bg-slate-900 rounded-2xl overflow-hidden aspect-square border border-slate-200 shadow-sm hover:shadow-xl transition-all cursor-pointer flex flex-col justify-between"
            >
              <div className="w-full h-full bg-slate-900 relative overflow-hidden flex items-center justify-center">
                <img
                  src={getPhotoUrl(scr.url)}
                  alt={scr.filename}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  loading="lazy"
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = 'none';
                  }}
                />

                <div className="absolute top-2 left-2 z-10">
                  <span className="px-2 py-1 bg-indigo-600/90 backdrop-blur-md text-white text-[10px] font-black rounded-lg shadow-md flex items-center gap-1">
                    🖥️ Screenshot
                  </span>
                </div>

                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/95 via-slate-950/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity p-3 flex flex-col justify-end gap-1">
                  <span className="text-[11px] font-bold text-white truncate block">{scr.filename}</span>
                  <div className="flex items-center justify-between text-[10px] text-slate-300 font-medium">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3 text-slate-400" />
                      {new Date(scr.timestamp).toLocaleString([], {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit'
                      })}
                    </span>
                    <span>{formatFileSize(scr.fileSizeBytes)}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal: Schedule Automatic Screenshots */}
      {scheduleModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-6 shadow-2xl border border-slate-100 animate-scaleUp">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl">
                  <Sliders className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-lg">Schedule Automatic Screenshots</h3>
                  <p className="text-xs text-slate-500">Configure capture duration & interval frequency</p>
                </div>
              </div>
              <button 
                onClick={() => setScheduleModalOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-5">
              {/* Active Schedule Warning Banner */}
              {isScheduleActive && (
                <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-amber-900 animate-fadeIn">
                  <div className="flex items-center gap-2.5">
                    <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
                    <div>
                      <span className="text-xs font-bold block text-slate-900">Schedule Currently Active</span>
                      <span className="text-[11px] text-slate-600 block">
                        Stop the running schedule to edit settings or start a new configuration.
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleSaveSchedule(false)}
                    className="px-3.5 py-2 bg-rose-600 hover:bg-rose-700 active:scale-95 text-white text-xs font-bold rounded-xl transition-all shadow-md shrink-0 flex items-center gap-1.5 w-full sm:w-auto justify-center"
                  >
                    <Square className="w-3.5 h-3.5 fill-current" />
                    <span>Stop Schedule First</span>
                  </button>
                </div>
              )}

              {/* Option 1: Total Duration */}
              <div className={`space-y-2 ${isScheduleActive ? 'opacity-60 pointer-events-none' : ''}`}>
                <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
                  <span>1. Run Schedule For Next (Total Duration):</span>
                  <span className="text-indigo-600 font-black">{scheduleDuration} Minutes</span>
                </label>
                <div className="grid grid-cols-5 gap-2">
                  {[5, 10, 15, 30, 60].map((mins) => (
                    <button
                      key={mins}
                      type="button"
                      disabled={isScheduleActive}
                      onClick={() => setScheduleDuration(mins)}
                      className={`py-2 rounded-xl text-xs font-bold transition-all border ${
                        scheduleDuration === mins
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-md'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {mins}m
                    </button>
                  ))}
                </div>
                {/* Custom Duration Input */}
                <div className="flex items-center justify-between pt-1 text-xs">
                  <span className="font-bold text-slate-500 text-[11px]">Or Custom Duration:</span>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="1"
                      max="1440"
                      disabled={isScheduleActive}
                      value={scheduleDuration || ''}
                      onChange={(e) => {
                        const val = parseInt(e.target.value, 10);
                        setScheduleDuration(isNaN(val) ? 0 : Math.max(1, val));
                      }}
                      className="w-24 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-slate-100 disabled:cursor-not-allowed"
                      placeholder="e.g. 45"
                    />
                    <span className="font-bold text-slate-600">Minutes</span>
                  </div>
                </div>
              </div>

              {/* Option 2: Capture Frequency / Interval */}
              <div className={`space-y-2 ${isScheduleActive ? 'opacity-60 pointer-events-none' : ''}`}>
                <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
                  <span>2. Capture Image Frequency (Interval):</span>
                  <span className="text-indigo-600 font-black">
                    Every {scheduleInterval >= 60 ? `${scheduleInterval / 60} Minute(s)` : `${scheduleInterval} Seconds`}
                  </span>
                </label>
                <div className="grid grid-cols-5 gap-2">
                  {[
                    { label: '15s', sec: 15 },
                    { label: '30s', sec: 30 },
                    { label: '1 min', sec: 60 },
                    { label: '2 min', sec: 120 },
                    { label: '5 min', sec: 300 }
                  ].map((opt) => (
                    <button
                      key={opt.sec}
                      type="button"
                      disabled={isScheduleActive}
                      onClick={() => {
                        setScheduleInterval(opt.sec);
                        setIntervalUnit(opt.sec >= 60 ? 'MIN' : 'SEC');
                      }}
                      className={`py-2 rounded-xl text-xs font-bold transition-all border ${
                        scheduleInterval === opt.sec
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-md'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
                {/* Custom Interval Input */}
                <div className="flex items-center justify-between pt-1 text-xs">
                  <span className="font-bold text-slate-500 text-[11px]">Or Custom Interval:</span>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="1"
                      max="3600"
                      disabled={isScheduleActive}
                      value={intervalUnit === 'MIN' ? Math.max(1, Math.round(scheduleInterval / 60)) : scheduleInterval || ''}
                      onChange={(e) => {
                        const val = parseInt(e.target.value, 10);
                        if (!isNaN(val) && val > 0) {
                          setScheduleInterval(intervalUnit === 'MIN' ? val * 60 : val);
                        }
                      }}
                      className="w-24 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-slate-100 disabled:cursor-not-allowed"
                      placeholder="e.g. 10"
                    />
                    <select
                      value={intervalUnit}
                      disabled={isScheduleActive}
                      onChange={(e) => {
                        const unit = e.target.value as 'SEC' | 'MIN';
                        setIntervalUnit(unit);
                        if (unit === 'MIN' && scheduleInterval < 60) setScheduleInterval(60);
                      }}
                      className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer disabled:bg-slate-100 disabled:cursor-not-allowed"
                    >
                      <option value="SEC">Seconds</option>
                      <option value="MIN">Minutes</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Option 3: Future Start Time Checkbox */}
              <div className={`p-3 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-3 ${isScheduleActive ? 'opacity-60 pointer-events-none' : ''}`}>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    disabled={isScheduleActive}
                    checked={useFutureStartTime}
                    onChange={(e) => setUseFutureStartTime(e.target.checked)}
                    className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300 disabled:cursor-not-allowed"
                  />
                  <div>
                    <span className="text-xs font-bold text-slate-900 block">Schedule Future Start Time</span>
                    <span className="text-[11px] text-slate-500 block">
                      {useFutureStartTime ? 'Start at a future time or specific date/time' : 'Start Immediately (Default: As soon as selected)'}
                    </span>
                  </div>
                </label>

                {useFutureStartTime && (
                  <div className="space-y-3 pt-2 border-t border-slate-200/60 animate-fadeIn">
                    {/* Selector Tabs: Buffer vs Exact Date & Time */}
                    <div className="flex items-center gap-2 p-1 bg-slate-200/60 rounded-xl">
                      <button
                        type="button"
                        disabled={isScheduleActive}
                        onClick={() => setFutureTimeMode('BUFFER')}
                        className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
                          futureTimeMode === 'BUFFER' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        ⏱️ Start Delay (+Minutes)
                      </button>
                      <button
                        type="button"
                        disabled={isScheduleActive}
                        onClick={() => setFutureTimeMode('DATETIME')}
                        className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
                          futureTimeMode === 'DATETIME' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        📅 Specific Date & Time
                      </button>
                    </div>

                    {futureTimeMode === 'BUFFER' ? (
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
                          <span>Start Delay (Future Buffer):</span>
                          <span className="text-indigo-600 font-black">+{startDelayMin} Minutes</span>
                        </label>
                        <div className="grid grid-cols-5 gap-2">
                          {[5, 10, 15, 30, 60].map((delay) => (
                            <button
                              key={delay}
                              type="button"
                              disabled={isScheduleActive}
                              onClick={() => setStartDelayMin(delay)}
                              className={`py-2 rounded-xl text-xs font-bold transition-all border ${
                                startDelayMin === delay
                                  ? 'bg-purple-600 text-white border-purple-600 shadow-md'
                                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                              }`}
                            >
                              +{delay}m
                            </button>
                          ))}
                        </div>
                        <div className="flex items-center justify-between pt-1 text-xs">
                          <span className="font-bold text-slate-500 text-[11px]">Or Custom Delay:</span>
                          <div className="flex items-center gap-2">
                            <input
                              type="number"
                              min="1"
                              max="10080"
                              disabled={isScheduleActive}
                              value={startDelayMin || ''}
                              onChange={(e) => {
                                const val = parseInt(e.target.value, 10);
                                setStartDelayMin(isNaN(val) ? 0 : Math.max(1, val));
                              }}
                              className="w-24 px-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-slate-100 disabled:cursor-not-allowed"
                              placeholder="e.g. 45"
                            />
                            <span className="font-bold text-slate-600">Minutes</span>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-700 block">
                          Select Specific Date & Start Time:
                        </label>
                        <input
                          type="datetime-local"
                          disabled={isScheduleActive}
                          value={customStartDateTime}
                          onChange={(e) => setCustomStartDateTime(e.target.value)}
                          className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-slate-100 disabled:cursor-not-allowed"
                        />
                        {customStartDateTime && (
                          <p className="text-[11px] text-purple-700 font-bold pt-1">
                            📅 Start Time: {new Date(customStartDateTime).toLocaleString()} (~{Math.max(0, Math.round((new Date(customStartDateTime).getTime() - Date.now()) / 60000))} mins from now)
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="p-4 bg-indigo-50/70 rounded-2xl border border-indigo-100 space-y-1">
                <div className="flex items-center gap-2 text-xs font-bold text-indigo-900">
                  <Sparkles className="w-4 h-4 text-indigo-600" />
                  <span>Scheduled Calculation Summary</span>
                </div>
                <p className="text-[11px] text-indigo-700 font-medium leading-relaxed">
                  {useFutureStartTime ? (
                    <>
                      Will wait <strong>{futureTimeMode === 'DATETIME' && customStartDateTime ? `until ${new Date(customStartDateTime).toLocaleString()}` : `+${startDelayMin} minutes`}</strong>, then automatically capture <strong>~{scheduleInterval > 0 ? Math.floor((scheduleDuration * 60) / scheduleInterval) : 0} screenshots</strong> (one image every {scheduleInterval >= 60 ? `${scheduleInterval / 60} min` : `${scheduleInterval} sec`}) over the following {scheduleDuration} minutes.
                    </>
                  ) : (
                    <>
                      Will start immediately and automatically capture <strong>~{scheduleInterval > 0 ? Math.floor((scheduleDuration * 60) / scheduleInterval) : 0} screenshots</strong> (one image every {scheduleInterval >= 60 ? `${scheduleInterval / 60} min` : `${scheduleInterval} sec`}) over the next {scheduleDuration} minutes.
                    </>
                  )}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              {isScheduleActive ? (
                <button
                  type="button"
                  onClick={() => handleSaveSchedule(false)}
                  className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-2 active:scale-95"
                >
                  <Square className="w-3.5 h-3.5 fill-current" />
                  <span>Stop Active Schedule First</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => handleSaveSchedule(true)}
                  className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-md shadow-indigo-600/20 transition-all flex items-center gap-2 active:scale-95"
                >
                  <Play className="w-4 h-4 fill-current" />
                  <span>Start Automatic Screenshots</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal: Fullscreen Screenshot Lightbox */}
      {selectedScreenshot && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-3xl w-full p-6 space-y-5 shadow-2xl border border-slate-100 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl">
                  <Monitor className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">{selectedScreenshot.filename}</h3>
                  <span className="text-xs text-slate-400 font-medium">
                    Captured: {new Date(selectedScreenshot.timestamp).toLocaleString()}
                  </span>
                </div>
              </div>

              <button
                onClick={() => setSelectedScreenshot(null)}
                className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-slate-900 rounded-2xl overflow-hidden max-h-[60vh] flex items-center justify-center p-2">
              <img
                src={getPhotoUrl(selectedScreenshot.url)}
                alt={selectedScreenshot.filename}
                className="max-h-[55vh] w-auto object-contain rounded-lg shadow-md"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <a
                href={getPhotoUrl(selectedScreenshot.url)}
                download={selectedScreenshot.filename}
                target="_blank"
                rel="noreferrer"
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                <span>Download Screenshot</span>
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
