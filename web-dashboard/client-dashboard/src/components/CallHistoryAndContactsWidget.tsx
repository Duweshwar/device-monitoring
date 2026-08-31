import React, { useState } from 'react';
import { 
  PhoneCall, 
  Mic, 
  Users, 
  Play, 
  Pause, 
  ArrowUpRight, 
  ArrowDownLeft, 
  Star, 
  ChevronRight,
  Volume2
} from 'lucide-react';

interface CallHistoryAndContactsWidgetProps {
  onSelectFeature: (featureId: string) => void;
}

export const CallHistoryAndContactsWidget: React.FC<CallHistoryAndContactsWidgetProps> = ({ onSelectFeature }) => {
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);

  const callHistoryData = [
    { id: 'ch_01', name: 'Bran', number: '91234XX567', duration: '02m 15s', timestamp: '2026-08-30 20:52:04', type: 'outgoing' },
    { id: 'ch_02', name: 'Bran', number: '91234XX567', duration: '01m 40s', timestamp: '2026-08-30 19:02:35', type: 'incoming' },
    { id: 'ch_03', name: 'Hema', number: '99992XX787', duration: '04m 12s', timestamp: '2026-08-30 17:57:56', type: 'outgoing' },
    { id: 'ch_04', name: 'Hema', number: '9234XXX87', duration: '00m 45s', timestamp: '2026-08-30 16:59:09', type: 'incoming' },
    { id: 'ch_05', name: 'Samaira', number: '92342XX454', duration: '03m 10s', timestamp: '2026-08-30 14:53:21', type: 'outgoing' },
  ];

  const callRecordingsData = [
    { id: 'cr_01', contact: 'Bran', duration: '02m 15s', timestamp: '2026-08-30 20:52:04', type: 'outgoing' },
    { id: 'cr_02', contact: 'Bran', duration: '01m 40s', timestamp: '2026-08-30 19:02:35', type: 'incoming' },
    { id: 'cr_03', contact: 'Hema', duration: '04m 12s', timestamp: '2026-08-30 17:57:56', type: 'outgoing' },
    { id: 'cr_04', contact: 'Hema', duration: '00m 45s', timestamp: '2026-08-30 16:59:09', type: 'incoming' },
    { id: 'cr_05', contact: 'Samaira', duration: '03m 10s', timestamp: '2026-08-30 14:53:21', type: 'outgoing' },
  ];

  const contactsData = [
    { id: 'cnt_01', name: 'Bran', number: '91234XX567', timestamp: '2026-08-30 23:48:13', isStarred: true },
    { id: 'cnt_02', name: 'Vipul', number: '93177XX756', timestamp: '2026-08-30 23:31:20', isStarred: true },
    { id: 'cnt_03', name: 'Bran', number: '91234XX567', timestamp: '2026-08-30 21:50:06', isStarred: true },
    { id: 'cnt_04', name: 'Karan', number: '81274XX547', timestamp: '2026-08-30 20:40:37', isStarred: true },
    { id: 'cnt_05', name: 'Karan', number: '81274XX547', timestamp: '2026-08-30 20:33:16', isStarred: true },
  ];

  const toggleAudio = (id: string) => {
    setPlayingAudioId(playingAudioId === id ? null : id);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      
      {/* 1. Call History Table Card */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs flex flex-col justify-between space-y-3">
        <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
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

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-100 text-slate-400 font-semibold">
                <th className="py-2 pr-2">Type</th>
                <th className="py-2 px-2">Name</th>
                <th className="py-2 px-2">Number</th>
                <th className="py-2 px-2">Duration</th>
                <th className="py-2 pl-2 text-right">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {callHistoryData.map((row) => (
                <tr key={row.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-2.5 pr-2">
                    {row.type === 'outgoing' ? (
                      <span className="flex items-center gap-1 font-bold text-amber-600" title="Outgoing Call">
                        <ArrowUpRight className="w-3.5 h-3.5" />
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 font-bold text-emerald-600" title="Incoming Call">
                        <ArrowDownLeft className="w-3.5 h-3.5" />
                      </span>
                    )}
                  </td>
                  <td className="py-2.5 px-2 font-medium text-slate-900">{row.name}</td>
                  <td className="py-2.5 px-2 font-mono text-[11px] text-slate-600">{row.number}</td>
                  <td className="py-2.5 px-2 text-slate-600">{row.duration}</td>
                  <td className="py-2.5 pl-2 text-right text-[11px] text-slate-400 whitespace-nowrap">{row.timestamp}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 2. Call Recordings Table Card */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs flex flex-col justify-between space-y-3">
        <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
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

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-100 text-slate-400 font-semibold">
                <th className="py-2 pr-2">Type</th>
                <th className="py-2 px-2">Contact</th>
                <th className="py-2 px-2">Duration</th>
                <th className="py-2 px-2">Timestamp</th>
                <th className="py-2 pl-2 text-right">Action</th>
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
                  <td className="py-2.5 px-2 font-medium text-slate-900">{row.contact}</td>
                  <td className="py-2.5 px-2 text-slate-600">{row.duration}</td>
                  <td className="py-2.5 px-2 text-[11px] text-slate-400 whitespace-nowrap">{row.timestamp}</td>
                  <td className="py-2.5 pl-2 text-right">
                    <button
                      onClick={() => toggleAudio(row.id)}
                      className={`p-1.5 rounded-full transition-all inline-flex items-center gap-1 text-[11px] font-semibold ${
                        playingAudioId === row.id
                          ? 'bg-rose-600 text-white shadow-xs'
                          : 'bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200/80'
                      }`}
                    >
                      {playingAudioId === row.id ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3 fill-rose-600" />}
                      <span className="hidden sm:inline">{playingAudioId === row.id ? 'Playing' : 'Listen'}</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 3. Contacts Inventory Table Card */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs flex flex-col justify-between space-y-3">
        <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
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

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-100 text-slate-400 font-semibold">
                <th className="py-2 pr-2 text-center">★</th>
                <th className="py-2 px-2">Name</th>
                <th className="py-2 px-2">Number</th>
                <th className="py-2 pl-2 text-right">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {contactsData.map((row) => (
                <tr key={row.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-2.5 pr-2 text-center">
                    <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-500 inline" />
                  </td>
                  <td className="py-2.5 px-2 font-medium text-slate-900">{row.name}</td>
                  <td className="py-2.5 px-2 font-mono text-[11px] text-slate-600">{row.number}</td>
                  <td className="py-2.5 pl-2 text-right text-[11px] text-slate-400 whitespace-nowrap">{row.timestamp}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};
