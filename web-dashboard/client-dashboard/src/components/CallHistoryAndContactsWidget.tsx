import React, { useState, useEffect } from 'react';
import { apiService } from '../services/apiService';
import { 
  PhoneCall, 
  Mic, 
  Users, 
  Play, 
  Pause, 
  ArrowUpRight, 
  ArrowDownLeft, 
  PhoneMissed,
  Star, 
  ChevronRight,
  Volume2
} from 'lucide-react';
import { DeviceInfo } from '../types/dashboard.types';

interface CallHistoryAndContactsWidgetProps {
  device: DeviceInfo;
  onSelectFeature: (featureId: string) => void;
}

export const CallHistoryAndContactsWidget: React.FC<CallHistoryAndContactsWidgetProps> = ({ device, onSelectFeature }) => {
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);

  const [callHistoryData, setCallHistoryData] = useState<any[]>([]);
  const [callRecordingsData, setCallRecordingsData] = useState<any[]>([]);
  const [contactsData, setContactsData] = useState<any[]>([]);

  useEffect(() => {
    let isMounted = true;

    const fetchLiveWidgetData = async () => {
      try {
        // 1. Fetch Calls
        const liveCalls = await apiService.getCalls(device.id, []);
        if (isMounted && Array.isArray(liveCalls)) {
          const formattedCalls = liveCalls.map((c: any, i: number) => {
            const rawDir = (c.direction || c.callType || 'incoming').toString().toLowerCase();
            let normDir = 'incoming';
            if (rawDir.includes('out') || rawDir === '2') normDir = 'outgoing';
            else if (rawDir.includes('miss') || rawDir === '3') normDir = 'missed';

            const durationSec = Number(c.durationSec || c.durationSeconds || 0);

            return {
              id: c.id || `ch_${i}`,
              name: c.contactName || c.name || 'Target Contact',
              number: c.phoneNumber || c.number || 'Unknown',
              duration: durationSec > 0 ? `${Math.floor(durationSec / 60)}m ${durationSec % 60}s` : '00m 00s',
              timestamp: new Date(c.timestamp || Date.now()).toLocaleString(),
              type: normDir,
              hasAudioRecording: Boolean(c.recordingUrl || c.recordingId || c.hasAudioRecording)
            };
          });

          // Call History shows 6 entries
          setCallHistoryData(formattedCalls.slice(0, 6));

          // Call Recordings shows 5 entries
          const recordings = formattedCalls.filter((c: any) => c.hasAudioRecording || c.duration !== '00m 00s');
          setCallRecordingsData(recordings.slice(0, 5));
        }

        // 2. Fetch Contacts (5 entries)
        const liveContacts = await apiService.getContacts(device.id, []);
        if (isMounted && Array.isArray(liveContacts)) {
          const formattedContacts = liveContacts.slice(0, 5).map((c: any, i: number) => ({
            id: c.id || `cnt_${i}`,
            name: c.name || c.contactName || 'No Name',
            number: c.phoneNumber || c.number || 'No Number',
            timestamp: new Date(c.timestamp || Date.now()).toLocaleString(),
            isStarred: true
          }));
          setContactsData(formattedContacts);
        }
      } catch (err) {
        console.warn('Failed to fetch dashboard widget data:', err);
      }
    };

    fetchLiveWidgetData();
    const interval = setInterval(fetchLiveWidgetData, 5000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [device.id]);

  const toggleAudio = (id: string) => {
    setPlayingAudioId(playingAudioId === id ? null : id);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      
      {/* 1. Call History Table Card (8 Rows) */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs flex flex-col h-full space-y-3">
        <div className="flex items-center justify-between border-b border-slate-100 pb-2.5 shrink-0">
          <div className="flex items-center gap-2">
            <PhoneCall className="w-4 h-4 text-indigo-600" />
            <h3 className="font-bold text-slate-900 text-sm">Call History</h3>
          </div>
          <button 
            onClick={() => onSelectFeature('calls')}
            className="text-xs font-semibold text-amber-700 hover:text-amber-900 flex items-center gap-0.5"
          >
            <span>View All »</span>
          </button>
        </div>

        <div className="overflow-x-auto flex-1 flex flex-col justify-start">
          {callHistoryData.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400 font-medium">
              No recent calls recorded yet
            </div>
          ) : (
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 font-semibold">
                  <th className="py-2 pr-2">Type</th>
                  <th className="py-2 px-2">Name</th>
                  <th className="py-2 px-2">Number</th>
                  <th className="py-2 pl-2 text-right">Duration</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {callHistoryData.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-2.5 pr-2">
                      {row.type === 'outgoing' && (
                        <span className="flex items-center gap-1 font-bold text-amber-600" title="Outgoing Call">
                          <ArrowUpRight className="w-3.5 h-3.5" />
                        </span>
                      )}
                      {row.type === 'incoming' && (
                        <span className="flex items-center gap-1 font-bold text-emerald-600" title="Incoming Call">
                          <ArrowDownLeft className="w-3.5 h-3.5" />
                        </span>
                      )}
                      {row.type === 'missed' && (
                        <span className="flex items-center gap-1 font-bold text-rose-600" title="Missed Call">
                          <PhoneMissed className="w-3.5 h-3.5" />
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-2 font-medium text-slate-900">{row.name}</td>
                    <td className="py-2.5 px-2 font-mono text-[11px] text-slate-600">{row.number}</td>
                    <td className="py-2.5 pl-2 text-right text-slate-600 font-medium">{row.duration}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* 2. Call Recordings Table Card (5 Rows with Circular Play Button) */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs flex flex-col h-full space-y-3">
        <div className="flex items-center justify-between border-b border-slate-100 pb-2.5 shrink-0">
          <div className="flex items-center gap-2">
            <Mic className="w-4 h-4 text-rose-600" />
            <h3 className="font-bold text-slate-900 text-sm">Call Recordings</h3>
          </div>
          <button 
            onClick={() => onSelectFeature('calls')}
            className="text-xs font-semibold text-amber-700 hover:text-amber-900 flex items-center gap-0.5"
          >
            <span>View All »</span>
          </button>
        </div>

        <div className="overflow-x-auto flex-1 flex flex-col justify-start">
          {callRecordingsData.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400 font-medium">
              No audio recordings captured yet
            </div>
          ) : (
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 font-semibold">
                  <th className="py-2 pr-2">Type</th>
                  <th className="py-2 px-2">Contact</th>
                  <th className="py-2 px-2">Duration</th>
                  <th className="py-2 pl-2 text-right">Play</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {callRecordingsData.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-2.5 pr-2">
                      {row.type === 'outgoing' ? (
                        <ArrowUpRight className="w-3.5 h-3.5 text-amber-600" />
                      ) : (
                        <ArrowDownLeft className="w-3.5 h-3.5 text-emerald-600" />
                      )}
                    </td>
                    <td className="py-2.5 px-2 font-medium text-slate-900">{row.name}</td>
                    <td className="py-2.5 px-2 text-slate-600">{row.duration}</td>
                    <td className="py-2.5 pl-2 text-right">
                      <button
                        onClick={() => toggleAudio(row.id)}
                        className={`w-7 h-7 rounded-full inline-flex items-center justify-center transition-all hover:scale-110 shadow-xs ${
                          playingAudioId === row.id
                            ? 'bg-rose-600 text-white ring-2 ring-rose-300'
                            : 'bg-rose-50 text-rose-600 hover:bg-rose-100 border border-rose-200'
                        }`}
                        title={playingAudioId === row.id ? 'Pause Recording' : 'Play Recording'}
                      >
                        {playingAudioId === row.id ? (
                          <Pause className="w-3.5 h-3.5" />
                        ) : (
                          <Play className="w-3.5 h-3.5 fill-rose-600 ml-0.5" />
                        )}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* 3. Contacts Inventory Table Card (5 Rows) */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs flex flex-col h-full space-y-3">
        <div className="flex items-center justify-between border-b border-slate-100 pb-2.5 shrink-0">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-indigo-600" />
            <h3 className="font-bold text-slate-900 text-sm">Contacts Inventory</h3>
          </div>
          <button 
            onClick={() => onSelectFeature('contacts')}
            className="text-xs font-semibold text-amber-700 hover:text-amber-900 flex items-center gap-0.5"
          >
            <span>View All »</span>
          </button>
        </div>

        <div className="overflow-x-auto flex-1 flex flex-col justify-start">
          {contactsData.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400 font-medium">
              No contacts synced yet
            </div>
          ) : (
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 font-semibold">
                  <th className="py-2 pr-2 text-center">★</th>
                  <th className="py-2 px-2">Name</th>
                  <th className="py-2 pl-2 text-right">Number</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {contactsData.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-2.5 pr-2 text-center">
                      <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-500 inline" />
                    </td>
                    <td className="py-2.5 px-2 font-medium text-slate-900">{row.name}</td>
                    <td className="py-2.5 pl-2 text-right font-mono text-[11px] text-slate-600">{row.number}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

    </div>
  );
};
