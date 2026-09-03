import React, { useState, useEffect } from 'react';
import { DeviceInfo } from '../types/dashboard.types';
import { apiService } from '../services/apiService';
import { Image as ImageIcon, Download, RefreshCw, Calendar, Eye, HardDrive, Filter, X, Clock, AlertTriangle } from 'lucide-react';

interface PhotosPageProps {
  device: DeviceInfo;
}

interface MediaItem {
  id: string;
  deviceId: string;
  category: string;
  filename: string;
  fileSizeBytes: number;
  originalSizeBytes?: number;
  mimeType: string;
  url: string;
  timestamp: string;
}

export function PhotosPage({ device }: PhotosPageProps) {
  const [photos, setPhotos] = useState<MediaItem[]>([]);
  const [pendingRequests, setPendingRequests] = useState<string[]>([]);
  const [hdStatuses, setHdStatuses] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedPhoto, setSelectedPhoto] = useState<MediaItem | null>(null);
  const [filterCategory, setFilterCategory] = useState<string>('ALL');

  const [requestingHd, setRequestingHd] = useState<boolean>(false);
  const [hdRequestedStatus, setHdRequestedStatus] = useState<string | null>(null);

  const handleRequestFullHd = async (photo: MediaItem) => {
    setRequestingHd(true);
    setHdRequestedStatus(null);
    try {
      const token = localStorage.getItem('childcare_auth_token') || 'jwt_demo_token';
      const res = await fetch('/api/v1/media/request-full-photo', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ deviceId: device.id, filename: photo.filename })
      });
      const data = await res.json();
      if (data.success) {
        setHdRequestedStatus('⚡ Full-HD Photo requested! Target device notified in real-time via SSE stream.');
        setPendingRequests((prev) => [...prev, photo.filename]);
        setHdStatuses((prev) => ({ ...prev, [photo.filename]: 'PENDING' }));
      }
    } catch (e) {
      setHdRequestedStatus('Failed to request HD photo.');
    } finally {
      setRequestingHd(false);
    }
  };

  const fetchPhotos = async () => {
    if (!device || device.id === 'no_device') {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const token = localStorage.getItem('childcare_auth_token') || 'jwt_demo_token';
      
      // Fetch device photo assets
      const response = await fetch(`/api/v1/media/device/${device.id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.success && Array.isArray(data.assets)) {
        const photoAssets = data.assets.filter((a: MediaItem) => 
          a.category === 'PHOTO_GALLERY' || a.category === 'PHOTO_FULL' || a.mimeType?.startsWith('image/') || a.filename?.match(/\.(jpg|jpeg|png|webp|gif)$/i)
        );
        setPhotos(photoAssets);
      } else {
        setPhotos([]);
      }

      // Fetch pending HD photo requests
      const pendingRes = await fetch(`/api/v1/media/pending-full-requests/${device.id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const pendingData = await pendingRes.json();
      if (pendingData.success && Array.isArray(pendingData.filenames)) {
        setPendingRequests(pendingData.filenames);
      }

      // Fetch HD request statuses (including NOT_FOUND)
      const statusRes = await fetch(`/api/v1/media/hd-requests-status/${device.id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const statusData = await statusRes.json();
      if (statusData.success && statusData.statuses) {
        setHdStatuses(statusData.statuses);
      }
    } catch (e) {
      console.warn('Failed to fetch photo gallery:', e);
      setPhotos([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPhotos();
    const interval = setInterval(fetchPhotos, 8000);
    return () => clearInterval(interval);
  }, [device]);

  const checkIsPending = (filename: string) => {
    const clean = filename.replace(/^thumb_/, '').replace(/^full_/, '');
    return pendingRequests.some(req => req.includes(clean) || clean.includes(req.replace(/^thumb_/, '').replace(/^full_/, '')));
  };

  const getPhotoStatus = (filename: string) => {
    if (hdStatuses[filename]) return hdStatuses[filename];
    const clean = filename.replace(/^thumb_/, '').replace(/^full_/, '');
    for (const [k, v] of Object.entries(hdStatuses)) {
      const cleanK = k.replace(/^thumb_/, '').replace(/^full_/, '');
      if (cleanK.includes(clean) || clean.includes(cleanK)) {
        return v;
      }
    }
    return null;
  };

  const filteredPhotos = photos.filter((p) => {
    if (filterCategory === 'ALL') return true;
    if (filterCategory === 'PHOTO_FULL') return p.category === 'PHOTO_FULL' || p.filename.startsWith('full_');
    if (filterCategory === 'PHOTO_GALLERY') return p.category === 'PHOTO_GALLERY' || p.filename.startsWith('thumb_');
    if (filterCategory === 'PENDING') return checkIsPending(p.filename);
    return p.category === filterCategory;
  });

  const formatFileSize = (bytes: number) => {
    if (!bytes) return '0 KB';
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const getDisplaySizes = (photo: MediaItem) => {
    const isFull = photo.category === 'PHOTO_FULL' || photo.filename.startsWith('full_');
    if (isFull) {
      return {
        thumbSize: '8.2 KB',
        origSize: formatFileSize(photo.fileSizeBytes)
      };
    }
    
    let origBytes = photo.originalSizeBytes || photo.fileSizeBytes;
    let thumbBytes = photo.fileSizeBytes;

    if (photo.fileSizeBytes > 50000 && (!photo.originalSizeBytes || photo.originalSizeBytes === photo.fileSizeBytes)) {
      origBytes = photo.fileSizeBytes;
      thumbBytes = Math.round(photo.fileSizeBytes / 16);
    } else if (thumbBytes > 50000) {
      thumbBytes = 8192;
    }

    return {
      thumbSize: formatFileSize(thumbBytes),
      origSize: formatFileSize(origBytes)
    };
  };

  const fullHdCount = photos.filter(p => p.category === 'PHOTO_FULL' || p.filename.startsWith('full_')).length;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold shadow-inner border border-indigo-100">
            <ImageIcon className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">Photos & Gallery Media Sync</h1>
            <p className="text-xs text-slate-500 font-medium">
              Synchronized camera photos & gallery media for <span className="font-bold text-indigo-600">{device.alias}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto justify-end">
          <button
            onClick={fetchPhotos}
            className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl transition-all flex items-center gap-2 text-xs font-bold"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Stats Summary Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
            <ImageIcon className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs text-slate-500 font-bold block">Total Synced Photos</span>
            <span className="text-xl font-black text-slate-900">{photos.length}</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
            <Eye className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs text-slate-500 font-bold block">Requested Full-HD</span>
            <span className="text-xl font-black text-emerald-600">{fullHdCount}</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-purple-50 text-purple-600 rounded-xl">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs text-slate-500 font-bold block">Last Synced</span>
            <span className="text-xs font-bold text-slate-900 block mt-1">
              {photos.length > 0 ? new Date(photos[0].timestamp).toLocaleString() : 'No photos synced yet'}
            </span>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        <button
          onClick={() => setFilterCategory('ALL')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
            filterCategory === 'ALL'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          <ImageIcon className="w-3.5 h-3.5" />
          <span>All Photos ({photos.length})</span>
        </button>

        <button
          onClick={() => setFilterCategory('PHOTO_FULL')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
            filterCategory === 'PHOTO_FULL'
              ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          <Eye className="w-3.5 h-3.5" />
          <span>Full-HD Photos ({fullHdCount})</span>
        </button>

        <button
          onClick={() => setFilterCategory('PENDING')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
            filterCategory === 'PENDING'
              ? 'bg-amber-500 text-white shadow-md shadow-amber-500/20'
              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          <Clock className="w-3.5 h-3.5" />
          <span>Pending HD Requests ({pendingRequests.length})</span>
        </button>

        <button
          onClick={() => setFilterCategory('PHOTO_GALLERY')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
            filterCategory === 'PHOTO_GALLERY'
              ? 'bg-slate-800 text-white shadow-md shadow-slate-800/20'
              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          <ImageIcon className="w-3.5 h-3.5" />
          <span>Thumbnails ({photos.length - fullHdCount})</span>
        </button>
      </div>

      {/* Photo Grid Gallery */}
      {loading && photos.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 shadow-sm">
          <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-xs text-slate-500 font-bold">Syncing photos from target device...</p>
        </div>
      ) : filteredPhotos.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 shadow-sm space-y-3">
          <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
            <ImageIcon className="w-6 h-6" />
          </div>
          <h3 className="font-bold text-slate-800 text-sm">No Photos in this Filter</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            {filterCategory === 'PHOTO_FULL'
              ? 'No Full-HD photos requested yet. Open any photo thumbnail and click "Request Full-HD Photo"!'
              : filterCategory === 'PENDING'
              ? 'No pending photo requests right now.'
              : 'Newly taken photos on target device will appear here.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {filteredPhotos.map((photo) => {
            const fullUrl = photo.url.startsWith('/api/v1') ? photo.url : `/api/v1${photo.url.startsWith('/') ? '' : '/'}${photo.url}`;
            const isHd = photo.category === 'PHOTO_FULL' || photo.filename.startsWith('full_');
            const isPending = checkIsPending(photo.filename);
            const photoStatus = getPhotoStatus(photo.filename);
            const isNotFound = photoStatus === 'NOT_FOUND';
            const sizes = getDisplaySizes(photo);
            return (
              <div 
                key={photo.id}
                onClick={() => setSelectedPhoto(photo)}
                className="group relative bg-slate-900 rounded-2xl overflow-hidden aspect-square border border-slate-200 shadow-sm hover:shadow-md transition-all cursor-pointer"
              >
                <img
                  src={fullUrl}
                  alt={photo.filename}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = 'none';
                  }}
                />

                <div className="absolute top-2 left-2 z-10">
                  <span className={`px-2 py-0.5 rounded-md text-[9px] font-black tracking-wider uppercase border shadow-sm ${
                    isNotFound
                      ? 'bg-rose-600 text-white border-rose-500'
                      : isPending
                      ? 'bg-amber-500 text-white border-amber-400 animate-pulse'
                      : isHd
                      ? 'bg-emerald-500 text-white border-emerald-400'
                      : 'bg-slate-900/80 text-slate-300 border-slate-700 backdrop-blur-sm'
                  }`}>
                    {isNotFound ? 'DELETED ⚠️' : isPending ? 'PENDING ⏳' : isHd ? 'FULL HD ⚡' : 'THUMB'}
                  </span>
                </div>

                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity p-3 flex flex-col justify-end">
                  <span className="text-[11px] font-bold text-white truncate block">{photo.filename}</span>
                  <div className="flex items-center justify-between text-[10px] text-slate-300 font-medium mt-1">
                    <span>{isNotFound ? 'Deleted from Phone' : isPending ? 'Uploading HD...' : isHd ? `Full-HD: ${sizes.origSize}` : `Thumb: ${sizes.thumbSize}`}</span>
                    <span className="p-1 bg-white/20 rounded-full hover:bg-white/30">
                      <Eye className="w-3 h-3 text-white" />
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Fullscreen Photo Lightbox Modal */}
      {selectedPhoto && (() => {
        const sizes = getDisplaySizes(selectedPhoto);
        const isHdPhoto = selectedPhoto.category === 'PHOTO_FULL' || selectedPhoto.filename.startsWith('full_');
        const photoStatus = getPhotoStatus(selectedPhoto.filename);
        const isNotFound = photoStatus === 'NOT_FOUND';
        return (
          <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4">
            <div className="relative max-w-4xl w-full bg-slate-900 rounded-3xl border border-slate-800 overflow-hidden shadow-2xl flex flex-col">
              <div className="p-4 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white truncate">{selectedPhoto.filename}</h3>
                  <p className="text-[11px] text-slate-400 font-medium">
                    {isHdPhoto ? (
                      <>Synced: {new Date(selectedPhoto.timestamp).toLocaleString()} • Full HD Size: <span className="font-bold text-emerald-400">{sizes.origSize}</span> (High Resolution)</>
                    ) : (
                      <>Synced: {new Date(selectedPhoto.timestamp).toLocaleString()} • Thumbnail Size: <span className="font-bold text-white">{sizes.thumbSize}</span> • Original Size: <span className="font-bold text-emerald-400">{sizes.origSize}</span></>
                    )}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  {isNotFound ? (
                    <span className="p-2 bg-rose-500/20 text-rose-300 border border-rose-500/40 rounded-xl font-bold text-xs flex items-center gap-1.5">
                      <AlertTriangle className="w-4 h-4 text-rose-400" />
                      <span>Photo Deleted from Target Phone (Full HD Unavailable)</span>
                    </span>
                  ) : isHdPhoto ? (
                    <span className="p-2 bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 rounded-xl font-bold text-xs flex items-center gap-1.5">
                      <Eye className="w-4 h-4 text-emerald-400" />
                      <span>Full-HD Image ({sizes.origSize})</span>
                    </span>
                  ) : checkIsPending(selectedPhoto.filename) ? (
                    <button
                      disabled
                      className="p-2 bg-amber-500 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 animate-pulse cursor-wait"
                    >
                      <Clock className="w-4 h-4 animate-spin" />
                      <span>Fetching Full-HD from Device...</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => handleRequestFullHd(selectedPhoto)}
                      disabled={requestingHd}
                      className="p-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all disabled:opacity-50"
                    >
                      <Eye className={`w-4 h-4 ${requestingHd ? 'animate-spin' : ''}`} />
                      <span>{requestingHd ? 'Requesting HD...' : `Request Full-HD Photo (${sizes.origSize})`}</span>
                    </button>
                  )}
                  <a
                    href={selectedPhoto.url.startsWith('/api/v1') ? selectedPhoto.url : `/api/v1${selectedPhoto.url.startsWith('/') ? '' : '/'}${selectedPhoto.url}`}
                    download={selectedPhoto.filename}
                    target="_blank"
                    rel="noreferrer"
                    className="p-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all"
                  >
                    <Download className="w-4 h-4" />
                    <span>Download</span>
                  </a>
                  <button
                    onClick={() => {
                      setSelectedPhoto(null);
                      setHdRequestedStatus(null);
                    }}
                    className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-xl transition-all"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {hdRequestedStatus && (
                <div className="p-3 bg-emerald-950/80 text-emerald-300 border-b border-emerald-800 text-xs font-bold text-center">
                  {hdRequestedStatus}
                </div>
              )}

              <div className="p-6 flex items-center justify-center bg-slate-950/50 max-h-[75vh] overflow-auto">
                <img
                  src={selectedPhoto.url.startsWith('/api/v1') ? selectedPhoto.url : `/api/v1${selectedPhoto.url.startsWith('/') ? '' : '/'}${selectedPhoto.url}`}
                  alt={selectedPhoto.filename}
                  className="max-h-[65vh] w-auto object-contain rounded-xl shadow-lg"
                />
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
