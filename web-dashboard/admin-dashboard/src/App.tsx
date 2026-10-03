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
  Cpu,
  Save,
  Plus,
  DollarSign,
  Sparkles,
  Sliders,
  Shield,
  Tag,
  CheckSquare,
  Square,
  X
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

interface PlanTierModel {
  id: string;
  code: string;
  name: string;
  badge?: string | null;
  description: string;
  features: string[];
  pricing: Record<number, number>;
  isActive: boolean;
  sortOrder: number;
}

interface FeatureCatalogItem {
  key: string;
  name: string;
  category: string;
  description: string;
  tier: string;
}

const API_BASE = 'http://localhost:3000/api/v1';

export default function App() {
  const [activeTab, setActiveTab] = useState<'releases' | 'fleet' | 'logs' | 'plans'>('releases');
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

  // Plans & Feature Matrix State
  const [plansList, setPlansList] = useState<PlanTierModel[]>([]);
  const [featureCatalog, setFeatureCatalog] = useState<FeatureCatalogItem[]>([]);
  const [isSavingPlanId, setIsSavingPlanId] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [showNewPlanModal, setShowNewPlanModal] = useState(false);
  const [newPlan, setNewPlan] = useState({
    code: '',
    name: '',
    badge: '',
    description: '',
    pricing: { 1: 1999, 3: 3999, 12: 7999 },
    features: ['calls', 'sms', 'location', 'contacts'] as string[],
  });

  // Real Fleet Devices from PostgreSQL
  const [devices, setDevices] = useState<any[]>([]);
  const [isLoadingDevices, setIsLoadingDevices] = useState(false);

  // Fetch Releases, Jobs, Plans, and Real Devices on mount
  useEffect(() => {
    fetchReleases();
    fetchJobs();
    fetchPlansAndCatalog();
    fetchDevices();
    const interval = setInterval(() => {
      fetchJobs();
      fetchDevices();
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const fetchDevices = async () => {
    setIsLoadingDevices(true);
    try {
      const res = await axios.get(`${API_BASE}/devices/admin/fleet`);
      setDevices(Array.isArray(res.data) ? res.data : []);
    } catch (e) {
      console.warn('Backend fleet devices query error');
      setDevices([]);
    } finally {
      setIsLoadingDevices(false);
    }
  };

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

  const fetchPlansAndCatalog = async () => {
    try {
      const [plansRes, catRes] = await Promise.all([
        axios.get(`${API_BASE}/plans/admin`),
        axios.get(`${API_BASE}/plans/catalog`)
      ]);
      if (plansRes.data && Array.isArray(plansRes.data)) {
        setPlansList(plansRes.data);
      }
      if (catRes.data?.features && Array.isArray(catRes.data.features)) {
        setFeatureCatalog(catRes.data.features);
      }
    } catch (e) {
      console.warn('Failed to load plans or catalog from backend');
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
      setUploadProgress(null);
      setStatusMsg({ 
        text: `Upload failed: ${err.response?.data?.message || err.message}`, 
        type: 'error' 
      });
    }
  };

  const handleTriggerUpdate = async (deviceId: string, releaseId?: string) => {
    try {
      setStatusMsg({ text: `Triggering remote OTA deployment on ${deviceId}...`, type: 'info' });
      const res = await axios.post(`${API_BASE}/updates/trigger`, { deviceId, releaseId });
      setStatusMsg({ 
        text: `✓ OTA Dispatch command staged! Job ${res.data.jobId} created for device ${deviceId}`, 
        type: 'success' 
      });
      fetchJobs();
    } catch (err: any) {
      setStatusMsg({ text: `OTA Trigger failed: ${err.message}`, type: 'error' });
    }
  };

  // Feature Matrix Action: Toggle feature for a plan tier
  const handleToggleFeature = async (plan: PlanTierModel, featureKey: string) => {
    const hasFeature = plan.features.includes(featureKey);
    const updatedFeatures = hasFeature
      ? plan.features.filter(k => k !== featureKey)
      : [...plan.features, featureKey];

    // Optimistic UI update
    setPlansList(prev => prev.map(p => p.id === plan.id ? { ...p, features: updatedFeatures } : p));

    try {
      await axios.put(`${API_BASE}/plans/${plan.id}`, {
        features: updatedFeatures
      });
      setStatusMsg({ 
        text: `✓ Updated feature "${featureKey}" for plan "${plan.name}"`, 
        type: 'success' 
      });
    } catch (err: any) {
      setStatusMsg({ text: `Failed to update feature: ${err.message}`, type: 'error' });
      fetchPlansAndCatalog();
    }
  };

  // Feature Matrix Action: Save plan metadata and pricing
  const handleSavePlan = async (plan: PlanTierModel) => {
    setIsSavingPlanId(plan.id);
    try {
      await axios.put(`${API_BASE}/plans/${plan.id}`, {
        name: plan.name,
        badge: plan.badge,
        description: plan.description,
        pricing: plan.pricing,
        isActive: plan.isActive,
      });
      setIsSavingPlanId(null);
      setStatusMsg({ text: `✓ Saved pricing and settings for "${plan.name}"!`, type: 'success' });
    } catch (err: any) {
      setIsSavingPlanId(null);
      setStatusMsg({ text: `Failed to save plan: ${err.message}`, type: 'error' });
    }
  };

  // Feature Matrix Action: Toggle Active Status
  const handleTogglePlanStatus = async (planId: string, currentStatus: boolean) => {
    try {
      await axios.patch(`${API_BASE}/plans/${planId}/status`, {
        isActive: !currentStatus
      });
      setPlansList(prev => prev.map(p => p.id === planId ? { ...p, isActive: !currentStatus } : p));
      setStatusMsg({ text: `✓ Plan status updated!`, type: 'success' });
    } catch (err: any) {
      setStatusMsg({ text: `Failed to toggle status: ${err.message}`, type: 'error' });
    }
  };

  // Feature Matrix Action: Create new custom plan tier
  const handleCreateNewPlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPlan.code.trim() || !newPlan.name.trim()) {
      setStatusMsg({ text: 'Plan code and name are required.', type: 'error' });
      return;
    }

    try {
      await axios.post(`${API_BASE}/plans`, {
        code: newPlan.code.toLowerCase().trim(),
        name: newPlan.name.trim(),
        badge: newPlan.badge.trim() || null,
        description: newPlan.description.trim(),
        pricing: newPlan.pricing,
        features: newPlan.features,
      });
      setShowNewPlanModal(false);
      setStatusMsg({ text: `✓ Created plan tier "${newPlan.name}" successfully!`, type: 'success' });
      fetchPlansAndCatalog();
    } catch (err: any) {
      setStatusMsg({ text: `Failed to create plan: ${err.response?.data?.message || err.message}`, type: 'error' });
    }
  };

  const latestRelease = releases[0];

  const categories = ['all', ...Array.from(new Set(featureCatalog.map(f => f.category)))];
  const filteredFeatures = categoryFilter === 'all' 
    ? featureCatalog 
    : featureCatalog.filter(f => f.category === categoryFilter);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      
      {/* Top Navigation Bar */}
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-emerald-500 flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <ShieldCheck className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-base tracking-tight text-white">ChildCare C2 & Fleet Admin</span>
                <span className="px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-[10px] font-bold uppercase tracking-wider">
                  Super Admin
                </span>
              </div>
              <p className="text-[11px] text-slate-400">MDM Device Owner Management, Remote OTA Deployments & Feature Matrix</p>
            </div>
          </div>

          <div className="flex items-center gap-4 text-xs font-medium">
            <div className="flex items-center gap-2 bg-slate-800/80 border border-slate-700 px-3 py-1.5 rounded-lg">
              <Server className="w-4 h-4 text-indigo-400" />
              <span className="text-slate-400">Environment:</span>
              <span className="text-emerald-400 font-bold">PostgreSQL Online</span>
            </div>
            <div className="flex items-center gap-2 bg-slate-800/80 border border-slate-700 px-3 py-1.5 rounded-lg">
              <Activity className="w-4 h-4 text-emerald-400 animate-pulse" />
              <span className="text-slate-400">Cashfree PG:</span>
              <span className="text-emerald-400 font-bold">Universal Webhook Active</span>
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
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-800 pb-2">
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

          <button
            onClick={() => setActiveTab('plans')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs transition-all ${
              activeTab === 'plans'
                ? 'bg-gradient-to-r from-emerald-600 to-indigo-600 text-white shadow-lg shadow-emerald-600/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Plans & Feature Matrix</span>
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
                      <div>
                        <span className="font-bold text-xs text-emerald-400 block">{selectedFile.name}</span>
                        <span className="text-[10px] text-slate-400">{(selectedFile.size / (1024 * 1024)).toFixed(2)} MB</span>
                      </div>
                    ) : (
                      <div>
                        <span className="font-bold text-xs text-slate-200 block">Click or Drag APK here</span>
                        <span className="text-[10px] text-slate-400">Target agent binary (e.g. app-release.apk)</span>
                      </div>
                    )}
                  </label>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-400">Version Name</label>
                    <input
                      type="text"
                      value={versionName}
                      onChange={(e) => setVersionName(e.target.value)}
                      placeholder="v8.2.1"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-400">Version Code</label>
                    <input
                      type="number"
                      value={versionCode}
                      onChange={(e) => setVersionCode(e.target.value)}
                      placeholder="221"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-400">Release Notes / Changelog</label>
                  <textarea
                    rows={3}
                    value={releaseNotes}
                    onChange={(e) => setReleaseNotes(e.target.value)}
                    placeholder="Changelog details..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="checkbox"
                    id="mandatory-check"
                    checked={isMandatory}
                    onChange={(e) => setIsMandatory(e.target.checked)}
                    className="w-4 h-4 text-indigo-600 rounded bg-slate-950 border-slate-700"
                  />
                  <label htmlFor="mandatory-check" className="text-xs text-slate-300 font-medium cursor-pointer">
                    Mandatory Enforcement (Auto-installs silently on check-in)
                  </label>
                </div>

                {uploadProgress !== null && (
                  <div className="space-y-1">
                    <div className="flex justify-between text-[11px] text-slate-400">
                      <span>Uploading & Processing SHA-256...</span>
                      <span>{uploadProgress}%</span>
                    </div>
                    <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                      <div className="bg-indigo-500 h-full transition-all duration-200" style={{ width: `${uploadProgress}%` }} />
                    </div>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={uploadProgress !== null && uploadProgress < 100}
                  className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 font-bold text-xs text-white shadow-lg shadow-indigo-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <Upload className="w-4 h-4" />
                  <span>Publish Android Update</span>
                </button>
              </form>
            </div>

            {/* Releases Repository List */}
            <div className="lg:col-span-2 bg-slate-900/90 border border-slate-800 rounded-2xl p-6 space-y-4 shadow-xl">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                    <Download className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="font-bold text-sm text-white">Published OTA Releases ({releases.length})</h2>
                    <p className="text-[11px] text-slate-400">Repository of signed binaries deployed across target devices</p>
                  </div>
                </div>
                <button 
                  onClick={fetchReleases}
                  className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300"
                  title="Refresh Releases"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-3">
                {releases.length === 0 ? (
                  <div className="text-center py-10 text-slate-500 text-xs">No releases published yet. Upload your first APK build above.</div>
                ) : (
                  releases.map((rel) => (
                    <div key={rel.id} className="bg-slate-950/70 border border-slate-800 hover:border-slate-700 rounded-xl p-4 transition-all space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="font-mono font-extrabold text-sm text-white">{rel.versionName}</span>
                          <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 font-mono text-[10px]">
                            Build {rel.versionCode}
                          </span>
                          {rel.isMandatory && (
                            <span className="px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/40 text-[10px] font-bold">
                              MANDATORY
                            </span>
                          )}
                        </div>
                        <span className="text-[11px] text-slate-500">{new Date(rel.createdAt).toLocaleDateString()}</span>
                      </div>

                      <p className="text-xs text-slate-400">{rel.releaseNotes}</p>

                      <div className="flex items-center justify-between pt-1 border-t border-slate-900 text-[11px]">
                        <div className="flex items-center gap-2 text-slate-500">
                          <Key className="w-3 h-3 text-indigo-400" />
                          <span className="font-mono text-[10px]">SHA-256: {rel.sha256.substring(0, 24)}...</span>
                        </div>
                        <a
                          href={rel.apkUrl}
                          download
                          className="text-indigo-400 hover:text-indigo-300 font-semibold flex items-center gap-1"
                        >
                          <Download className="w-3 h-3" />
                          <span>Download APK</span>
                        </a>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

          </div>
        )}

        {/* TAB 2: REMOTE FLEET DEPLOYMENT (OTA) */}
        {activeTab === 'fleet' && (
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 space-y-6 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
                  <Smartphone className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="font-bold text-base text-white">Target Device Fleet OTA Control</h2>
                  <p className="text-xs text-slate-400">Trigger silent background downloads, verify SHA-256 hash, and execute silent MDM installs</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    devices.forEach(d => handleTriggerUpdate(d.deviceId, latestRelease?.id));
                  }}
                  className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-emerald-600 hover:from-indigo-500 hover:to-emerald-500 text-white rounded-xl font-bold text-xs shadow-md transition-all flex items-center gap-2"
                >
                  <Zap className="w-4 h-4" />
                  <span>Push Latest Build to Entire Fleet ({latestRelease?.versionName || 'v8.2.0'})</span>
                </button>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                  Paired Managed Devices ({devices.length})
                </span>
                <button
                  onClick={fetchDevices}
                  className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 font-semibold"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Refresh Fleet</span>
                </button>
              </div>

              {devices.length === 0 ? (
                <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-8 text-center space-y-2">
                  <Smartphone className="w-10 h-10 text-slate-600 mx-auto" />
                  <h4 className="text-sm font-bold text-slate-300">No Target Devices Paired in PostgreSQL</h4>
                  <p className="text-xs text-slate-500 max-w-md mx-auto">
                    Live devices will appear here automatically when paired via the ChildCare Agent APK using parent license keys or pairing codes.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {devices.map((dev) => {
                    const devId = dev.id || dev.deviceId;
                    const activeJob = jobs.find(j => j.deviceId === devId);
                    const hasPendingUpdate = latestRelease && dev.versionCode < latestRelease.versionCode;

                    return (
                      <div key={devId} className="bg-slate-950/80 border border-slate-800 rounded-2xl p-5 space-y-4">
                        <div className="flex items-start justify-between">
                          <div className="space-y-1">
                            <h3 className="font-bold text-sm text-white">{dev.alias || dev.name || 'Android Device'}</h3>
                            <span className="font-mono text-[11px] text-slate-500 block">ID: {devId}</span>
                          </div>
                          {dev.isDeviceOwner || dev.capabilities?.deviceOwner ? (
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
                            <span className="font-mono font-bold text-white">{dev.currentVersion || dev.appVersion || 'v8.2.0'} (Build {dev.versionCode || 220})</span>
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-400 block">Latest Server Build</span>
                            <span className="font-mono font-bold text-emerald-400">{latestRelease?.versionName || 'No Release'}</span>
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
                          onClick={() => handleTriggerUpdate(devId, latestRelease?.id)}
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
              )}
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

        {/* TAB 4: PLANS & FEATURE MATRIX */}
        {activeTab === 'plans' && (
          <div className="space-y-8 animate-in fade-in duration-200">
            
            {/* Top Overview & Action Header */}
            <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-extrabold text-white">Super Admin Feature Matrix & Pricing Controller</h2>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-bold">
                    Live PostgreSQL DB
                  </span>
                </div>
                <p className="text-xs text-slate-300 max-w-2xl">
                  Configure plan pricing (1, 3, 6, 12 months) and dynamically grant or revoke system capabilities across tiers. All modifications reflect instantly on public checkout.
                </p>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <button
                  onClick={fetchPlansAndCatalog}
                  className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-all"
                  title="Refresh Matrix"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setShowNewPlanModal(true)}
                  className="px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-emerald-600/20 transition-all flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  <span>Create New Plan Tier</span>
                </button>
              </div>
            </div>

            {/* SECTION 1: PLAN TIERS & PRICING CONTROLLER */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-extrabold text-base text-white flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-emerald-400" />
                    <span>Plan Tiers & Public Pricing (in INR ₹)</span>
                  </h3>
                  <p className="text-xs text-slate-400">Edit duration rates, marketing badges, and active visibility for each tier</p>
                </div>
                <span className="text-xs font-semibold text-slate-400">{plansList.length} Tiers Configured</span>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {plansList.map((plan) => (
                  <div
                    key={plan.id}
                    className="bg-slate-900/90 border border-slate-800 hover:border-slate-700 rounded-2xl p-5 shadow-xl space-y-4 flex flex-col justify-between"
                  >
                    <div className="space-y-3">
                      {/* Plan Header & Active Toggle */}
                      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs px-2 py-0.5 rounded-md bg-slate-800 text-indigo-300 font-bold uppercase">
                            {plan.code}
                          </span>
                          <input
                            type="text"
                            value={plan.name}
                            onChange={(e) => {
                              const val = e.target.value;
                              setPlansList(prev => prev.map(p => p.id === plan.id ? { ...p, name: val } : p));
                            }}
                            className="bg-transparent font-extrabold text-sm text-white focus:outline-none focus:border-b border-indigo-500"
                          />
                        </div>

                        <button
                          onClick={() => handleTogglePlanStatus(plan.id, plan.isActive)}
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all ${
                            plan.isActive
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                              : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                          }`}
                        >
                          {plan.isActive ? 'Active' : 'Disabled'}
                        </button>
                      </div>

                      {/* Badge & Description */}
                      <div className="space-y-2">
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                            <Tag className="w-3 h-3 text-indigo-400" />
                            <span>Promo Badge</span>
                          </label>
                          <input
                            type="text"
                            value={plan.badge || ''}
                            placeholder="e.g. Most Popular, Best Value"
                            onChange={(e) => {
                              const val = e.target.value;
                              setPlansList(prev => prev.map(p => p.id === plan.id ? { ...p, badge: val || null } : p));
                            }}
                            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Description</label>
                          <textarea
                            rows={2}
                            value={plan.description || ''}
                            onChange={(e) => {
                              const val = e.target.value;
                              setPlansList(prev => prev.map(p => p.id === plan.id ? { ...p, description: val } : p));
                            }}
                            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-indigo-500"
                          />
                        </div>
                      </div>

                      {/* Duration Pricing Matrix */}
                      <div className="space-y-2 pt-2 border-t border-slate-800">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Duration Pricing (INR)</label>
                        <div className="grid grid-cols-3 gap-2">
                          {[1, 3, 12].map((m) => (
                            <div key={m} className="bg-slate-950 p-2 rounded-xl border border-slate-800 flex items-center justify-between">
                              <span className="text-[11px] font-semibold text-slate-400">{m} Month{m > 1 ? 's' : ''}:</span>
                              <div className="flex items-center gap-1">
                                <span className="text-slate-500 text-xs">₹</span>
                                <input
                                  type="number"
                                  value={plan.pricing?.[m] || 0}
                                  onChange={(e) => {
                                    const val = Number(e.target.value);
                                    setPlansList(prev => prev.map(p => p.id === plan.id ? {
                                      ...p,
                                      pricing: { ...p.pricing, [m]: val }
                                    } : p));
                                  }}
                                  className="w-16 bg-slate-900 border border-slate-700 rounded-md px-1.5 py-0.5 text-xs font-mono font-bold text-emerald-400 text-right focus:outline-none focus:border-indigo-500"
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Save Button */}
                    <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
                      <span className="text-[11px] text-indigo-400 font-semibold">
                        {plan.features?.length || 0} features active
                      </span>
                      <button
                        onClick={() => handleSavePlan(plan)}
                        disabled={isSavingPlanId === plan.id}
                        className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm disabled:opacity-50"
                      >
                        <Save className="w-3.5 h-3.5" />
                        <span>{isSavingPlanId === plan.id ? 'Saving...' : 'Save Plan'}</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* SECTION 2: INTERACTIVE FEATURE MATRIX TABLE */}
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div>
                  <h3 className="font-extrabold text-base text-white flex items-center gap-2">
                    <Sliders className="w-4 h-4 text-indigo-400" />
                    <span>Master Feature Matrix Access Control</span>
                  </h3>
                  <p className="text-xs text-slate-400">Click any checkbox to grant or revoke feature access for that plan tier instantly</p>
                </div>

                {/* Category Filters */}
                <div className="flex flex-wrap items-center gap-1.5">
                  {categories.map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setCategoryFilter(cat)}
                      className={`px-3 py-1 rounded-lg text-[11px] font-bold transition-all capitalize ${
                        categoryFilter === cat
                          ? 'bg-indigo-600 text-white shadow-xs'
                          : 'bg-slate-900 text-slate-400 hover:bg-slate-800 hover:text-white'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              {/* Matrix Table */}
              <div className="bg-slate-900/90 border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-950 border-b border-slate-800 text-slate-400 text-[11px] uppercase tracking-wider font-extrabold">
                        <th className="py-4 px-6 min-w-[280px]">Feature & Description</th>
                        <th className="py-4 px-4 min-w-[140px]">Category</th>
                        {plansList.map((plan) => (
                          <th key={plan.id} className="py-4 px-4 text-center min-w-[140px]">
                            <div className="space-y-0.5">
                              <span className="text-white font-extrabold text-xs block">{plan.name}</span>
                              <span className="text-[10px] text-slate-500 font-mono font-normal">({plan.code})</span>
                            </div>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/80">
                      {filteredFeatures.map((feat) => (
                        <tr key={feat.key} className="hover:bg-slate-800/40 transition-colors">
                          
                          {/* Feature Name & Key */}
                          <td className="py-3.5 px-6 space-y-0.5">
                            <div className="flex items-center gap-2">
                              <span className="font-extrabold text-slate-100">{feat.name}</span>
                              <span className="font-mono text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-indigo-300">
                                {feat.key}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-400 leading-snug">{feat.description}</p>
                          </td>

                          {/* Category Badge */}
                          <td className="py-3.5 px-4">
                            <span className="px-2.5 py-1 rounded-full bg-slate-800/90 text-slate-300 text-[10px] font-semibold">
                              {feat.category}
                            </span>
                          </td>

                          {/* Checkboxes per Plan */}
                          {plansList.map((plan) => {
                            const isEnabled = plan.features?.includes(feat.key);
                            return (
                              <td key={plan.id} className="py-3.5 px-4 text-center">
                                <button
                                  onClick={() => handleToggleFeature(plan, feat.key)}
                                  className={`w-7 h-7 rounded-lg inline-flex items-center justify-center transition-all cursor-pointer ${
                                    isEnabled
                                      ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-xs ring-2 ring-emerald-500/20'
                                      : 'bg-slate-800 hover:bg-slate-700 text-slate-600 border border-slate-700'
                                  }`}
                                  title={`${isEnabled ? 'Disable' : 'Enable'} ${feat.name} for ${plan.name}`}
                                >
                                  {isEnabled ? <Check className="w-4 h-4 stroke-[3]" /> : <X className="w-3.5 h-3.5" />}
                                </button>
                              </td>
                            );
                          })}

                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>

            {/* CREATE NEW PLAN MODAL */}
            {showNewPlanModal && (
              <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
                <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-xl w-full p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-200">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                        <Plus className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="font-extrabold text-base text-white">Create New Plan Tier</h3>
                        <p className="text-xs text-slate-400">Add a custom subscription tier with tailor-made feature matrix</p>
                      </div>
                    </div>
                    <button onClick={() => setShowNewPlanModal(false)} className="text-slate-400 hover:text-white text-lg">×</button>
                  </div>

                  <form onSubmit={handleCreateNewPlan} className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-400">Plan Code (Unique ID) *</label>
                        <input
                          type="text"
                          required
                          value={newPlan.code}
                          onChange={(e) => setNewPlan({ ...newPlan, code: e.target.value })}
                          placeholder="e.g. enterprise"
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-indigo-500"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-400">Display Name *</label>
                        <input
                          type="text"
                          required
                          value={newPlan.name}
                          onChange={(e) => setNewPlan({ ...newPlan, name: e.target.value })}
                          placeholder="e.g. Enterprise Pack"
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-400">Promotional Badge</label>
                        <input
                          type="text"
                          value={newPlan.badge}
                          onChange={(e) => setNewPlan({ ...newPlan, badge: e.target.value })}
                          placeholder="e.g. Special Offer"
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-400">12-Month Price (₹) *</label>
                        <input
                          type="number"
                          required
                          value={newPlan.pricing[12]}
                          onChange={(e) => setNewPlan({
                            ...newPlan,
                            pricing: { ...newPlan.pricing, 12: Number(e.target.value) }
                          })}
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono text-emerald-400 focus:outline-none focus:border-indigo-500"
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-400">Description</label>
                      <textarea
                        rows={2}
                        value={newPlan.description}
                        onChange={(e) => setNewPlan({ ...newPlan, description: e.target.value })}
                        placeholder="Description of the plan tier..."
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                      />
                    </div>

                    <div className="pt-2 flex justify-end gap-2 border-t border-slate-800">
                      <button
                        type="button"
                        onClick={() => setShowNewPlanModal(false)}
                        className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="px-5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold shadow-md"
                      >
                        Create Plan
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

          </div>
        )}

      </main>
    </div>
  );
}
