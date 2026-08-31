import React from 'react';
import { MessageSquare, PhoneCall, MapPin, Key, ShieldAlert, Image as ImageIcon, ChevronRight } from 'lucide-react';
import { ActivityEvent } from '../types/dashboard.types';

interface RecentActivityFeedProps {
  events: ActivityEvent[];
  onViewAll: () => void;
}

export const RecentActivityFeed: React.FC<RecentActivityFeedProps> = ({ events, onViewAll }) => {
  const getIcon = (source: ActivityEvent['source']) => {
    switch (source) {
      case 'whatsapp':
        return <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />;
      case 'calls':
        return <PhoneCall className="w-3.5 h-3.5 text-rose-600" />;
      case 'location':
        return <MapPin className="w-3.5 h-3.5 text-blue-600" />;
      case 'keylogger':
        return <Key className="w-3.5 h-3.5 text-purple-600" />;
      case 'system':
        return <ShieldAlert className="w-3.5 h-3.5 text-amber-600" />;
      case 'media':
        return <ImageIcon className="w-3.5 h-3.5 text-teal-600" />;
    }
  };

  const getBg = (source: ActivityEvent['source']) => {
    switch (source) {
      case 'whatsapp': return 'bg-emerald-50 border-emerald-200';
      case 'calls': return 'bg-rose-50 border-rose-200';
      case 'location': return 'bg-blue-50 border-blue-200';
      case 'keylogger': return 'bg-purple-50 border-purple-200';
      case 'system': return 'bg-amber-50 border-amber-200';
      case 'media': return 'bg-teal-50 border-teal-200';
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs flex flex-col justify-between h-full">
      <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-3">
        <div>
          <h3 className="font-bold text-slate-900 text-sm">Recent Activity & Updates</h3>
          <p className="text-xs text-slate-500">Latest live device activity stream</p>
        </div>
        <button
          onClick={onViewAll}
          className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-0.5"
        >
          <span>View All</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="space-y-2.5 overflow-y-auto max-h-56 pr-1">
        {events.map((evt) => (
          <div
            key={evt.id}
            className="flex items-start gap-3 p-2.5 rounded-lg border border-slate-100 hover:bg-slate-50/80 transition-colors"
          >
            <div className={`w-7 h-7 rounded-lg border flex items-center justify-center shrink-0 mt-0.5 ${getBg(evt.source)}`}>
              {getIcon(evt.source)}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <span className="font-semibold text-xs text-slate-900 truncate">{evt.title}</span>
                <span className="text-[10px] text-slate-400 shrink-0">{evt.timestamp}</span>
              </div>
              <p className="text-xs text-slate-600 truncate">{evt.description}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>Live Activity Stream Active</span>
        </span>
        <span className="font-medium text-slate-700">6 Events Today</span>
      </div>
    </div>
  );
};
