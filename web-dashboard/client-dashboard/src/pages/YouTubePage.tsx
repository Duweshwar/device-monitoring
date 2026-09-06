import React, { useState, useEffect, useMemo } from 'react';
import { 
  Youtube, 
  Search, 
  RefreshCw, 
  ExternalLink, 
  PlayCircle, 
  UserCheck, 
  Tv, 
  Clock, 
  Filter
} from 'lucide-react';
import { DeviceInfo } from '../types/dashboard.types';
import { apiService } from '../services/apiService';

interface YouTubePageProps {
  device: DeviceInfo;
}

interface YouTubeItem {
  id: string;
  type: 'watch' | 'search';
  title: string;
  channelName: string;
  channelHandle?: string;
  searchQuery: string;
  url: string;
  timestamp: string;
  rawTimestamp: number;
}

export const YouTubePage: React.FC<YouTubePageProps> = ({ device }) => {
  const [items, setItems] = useState<YouTubeItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<'watch' | 'search'>('watch');
  const [searchFilter, setSearchFilter] = useState<string>('');

  const fetchYouTubeTelemetry = async () => {
    try {
      const data = await apiService.getYouTube(device.id, []);
      if (Array.isArray(data)) {
        setItems(data);
      }
    } catch (err) {
      console.warn('Failed to fetch YouTube telemetry', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    fetchYouTubeTelemetry();
    const interval = setInterval(fetchYouTubeTelemetry, 5000);
    return () => clearInterval(interval);
  }, [device.id]);

  const watchedVideos = useMemo(() => {
    return items.filter(i => i.type === 'watch');
  }, [items]);

  const searchHistory = useMemo(() => {
    return items.filter(i => i.type === 'search');
  }, [items]);

  const filteredItems = useMemo(() => {
    const targetList = activeTab === 'watch' ? watchedVideos : searchHistory;
    if (!searchFilter.trim()) return targetList;
    const q = searchFilter.toLowerCase();
    return targetList.filter(
      (item) =>
        item.title.toLowerCase().includes(q) ||
        item.channelName.toLowerCase().includes(q) ||
        (item.channelHandle && item.channelHandle.toLowerCase().includes(q)) ||
        item.searchQuery.toLowerCase().includes(q)
    );
  }, [activeTab, watchedVideos, searchHistory, searchFilter]);

  return (
    <div className="space-y-6">
      {/* Top Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-rose-600 flex items-center justify-center text-white shadow-sm">
              <Youtube className="w-5 h-5 fill-white" />
            </div>
            YouTube Activity & Watch History
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Real-time monitored video titles, channel creators, and search queries for{' '}
            <span className="font-semibold text-slate-700">{device.alias}</span>
          </p>
        </div>

        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-full text-xs font-semibold shadow-2xs">
            <span className="w-2 h-2 rounded-full bg-indigo-600 animate-pulse"></span>
            Live Stream Active
          </span>

          <button
            onClick={fetchYouTubeTelemetry}
            className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg border border-slate-200 transition-colors"
            title="Refresh YouTube Activity"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Overview Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-500 font-medium">Total Activity Events</span>
            <div className="text-2xl font-extrabold text-slate-900 mt-1">{items.length}</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600">
            <Tv className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-500 font-medium">Videos Watched</span>
            <div className="text-2xl font-extrabold text-indigo-600 mt-1">{watchedVideos.length}</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
            <PlayCircle className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-500 font-medium">Search Queries</span>
            <div className="text-2xl font-extrabold text-sky-600 mt-1">{searchHistory.length}</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-sky-50 flex items-center justify-center text-sky-600">
            <Search className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Main Dashboard Container */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
        {/* Navigation Tabs Bar */}
        <div className="border-b border-slate-200 px-6 pt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50/50">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('watch')}
              className={`px-4 py-2.5 text-xs font-bold border-b-2 flex items-center gap-2 transition-all ${
                activeTab === 'watch'
                  ? 'border-indigo-600 text-indigo-600 bg-white rounded-t-lg shadow-2xs'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <PlayCircle className="w-4 h-4" />
              Watched Videos ({watchedVideos.length})
            </button>

            <button
              onClick={() => setActiveTab('search')}
              className={`px-4 py-2.5 text-xs font-bold border-b-2 flex items-center gap-2 transition-all ${
                activeTab === 'search'
                  ? 'border-indigo-600 text-indigo-600 bg-white rounded-t-lg shadow-2xs'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Search className="w-4 h-4" />
              Search History ({searchHistory.length})
            </button>
          </div>

          {/* Search Filter Input */}
          <div className="relative w-full sm:w-64 pb-3 sm:pb-0">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder={`Filter ${activeTab === 'watch' ? 'titles or channels...' : 'searches...'}`}
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-500 shadow-2xs transition-all"
            />
          </div>
        </div>

        {/* Tab Content Feed */}
        <div className="p-6">
          {filteredItems.length === 0 ? (
            <div className="text-center py-16 px-4 text-slate-400 text-xs">
              <Youtube className="w-12 h-12 mx-auto mb-3 text-slate-300" />
              <p className="font-semibold text-slate-600 text-sm">No YouTube {activeTab === 'watch' ? 'watched videos' : 'search queries'} found</p>
              <p className="text-slate-400 mt-1">Activities logged in the YouTube app on {device.alias} will appear here live.</p>
            </div>
          ) : activeTab === 'watch' ? (
            /* Watched Videos Feed */
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredItems.map((item) => (
                <div
                  key={item.id}
                  className="bg-slate-50/70 border border-slate-200 rounded-xl p-4 hover:border-indigo-300 hover:shadow-xs transition-all flex flex-col justify-between"
                >
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-3">
                      <h3 className="font-bold text-slate-900 text-sm leading-snug line-clamp-2">
                        {item.title}
                      </h3>
                      <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 text-[10px] font-bold rounded-full shrink-0">
                        Watched
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-xs text-slate-600">
                      <UserCheck className="w-3.5 h-3.5 text-slate-400" />
                      <span className="font-semibold text-slate-700">
                        {item.channelName || item.channelHandle || 'YouTube Creator'}
                      </span>
                      {item.channelHandle && item.channelName && (
                        <span className="px-1.5 py-0.5 bg-slate-100 text-slate-500 text-[10px] font-medium rounded-md">
                          {item.channelHandle}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="pt-4 mt-3 border-t border-slate-200/60 flex items-center justify-between text-[11px] text-slate-400">
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      <span>{item.timestamp}</span>
                    </div>

                    <a
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-indigo-600 hover:text-indigo-700 font-bold hover:underline"
                    >
                      <span>Watch Video</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            /* Search History Feed */
            <div className="space-y-2.5">
              {filteredItems.map((item) => (
                <div
                  key={item.id}
                  className="bg-slate-50/70 border border-slate-200 rounded-xl p-3.5 flex items-center justify-between hover:border-indigo-300 transition-all"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-sky-100 text-sky-700 flex items-center justify-center shrink-0 font-bold text-xs">
                      <Search className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="font-bold text-xs text-slate-900">
                        {item.searchQuery || item.title}
                      </h4>
                      <p className="text-[10px] text-slate-400 mt-0.5 flex items-center gap-1">
                        <Clock className="w-3 h-3 text-slate-400" />
                        {item.timestamp}
                      </p>
                    </div>
                  </div>

                  <a
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 rounded-lg text-xs font-semibold shadow-2xs transition-colors"
                  >
                    <span>Search on YouTube</span>
                    <ExternalLink className="w-3.5 h-3.5 text-sky-600" />
                  </a>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
