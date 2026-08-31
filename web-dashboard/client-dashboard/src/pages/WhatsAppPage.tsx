import React from 'react';
import { MessageSquare, Search, Filter, Phone, Video, Mic, CheckCheck } from 'lucide-react';
import { DeviceInfo } from '../types/dashboard.types';

interface WhatsAppPageProps {
  device: DeviceInfo;
}

export const WhatsAppPage: React.FC<WhatsAppPageProps> = ({ device }) => {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">WhatsApp & WA Business Telemetry</h1>
          <p className="text-xs text-slate-500">Live chat messages, call logs, voice notes, and media attachments for {device.alias}</p>
        </div>
        <span className="px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full text-xs font-semibold">
          Accessibility Stream Active
        </span>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden grid grid-cols-1 md:grid-cols-3 min-h-[500px]">
        {/* Chat List */}
        <div className="border-r border-slate-200 p-4 space-y-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search chats or numbers..."
              className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div className="space-y-1">
            <div className="p-3 bg-indigo-50/70 border border-indigo-100 rounded-lg flex items-start justify-between cursor-pointer">
              <div>
                <div className="font-semibold text-xs text-slate-900">Alex Rivera</div>
                <div className="text-[11px] text-slate-500 truncate">Meeting at 5 PM near central park...</div>
              </div>
              <span className="text-[10px] text-slate-400">2m ago</span>
            </div>

            <div className="p-3 hover:bg-slate-50 rounded-lg flex items-start justify-between cursor-pointer">
              <div>
                <div className="font-semibold text-xs text-slate-900">Sarah Jenkins</div>
                <div className="text-[11px] text-slate-500 truncate">Voice note (0:45)</div>
              </div>
              <span className="text-[10px] text-slate-400">1h ago</span>
            </div>

            <div className="p-3 hover:bg-slate-50 rounded-lg flex items-start justify-between cursor-pointer">
              <div>
                <div className="font-semibold text-xs text-slate-900">Study Group (WA Business)</div>
                <div className="text-[11px] text-slate-500 truncate">Image attachment received</div>
              </div>
              <span className="text-[10px] text-slate-400">3h ago</span>
            </div>
          </div>
        </div>

        {/* Active Conversation Feed */}
        <div className="col-span-2 p-6 flex flex-col justify-between bg-slate-50/50">
          <div className="border-b border-slate-200 pb-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-emerald-500 text-white font-bold flex items-center justify-center text-sm">
                AR
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-sm">Alex Rivera</h3>
                <p className="text-[11px] text-slate-500">+91 98765 43210 • Online</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="px-2 py-1 bg-rose-50 text-rose-700 text-[10px] font-bold rounded-md border border-rose-200">
                VoIP Call Recorded
              </span>
            </div>
          </div>

          <div className="py-6 space-y-3">
            <div className="flex justify-start">
              <div className="bg-white border border-slate-200 p-3 rounded-2xl rounded-tl-xs max-w-xs shadow-xs text-xs text-slate-800">
                <p>Hey, are we still meeting today at 5 PM?</p>
                <span className="text-[10px] text-slate-400 block text-right mt-1">16:42</span>
              </div>
            </div>

            <div className="flex justify-end">
              <div className="bg-indigo-600 text-white p-3 rounded-2xl rounded-tr-xs max-w-xs shadow-xs text-xs">
                <p>Yes! See you near central park.</p>
                <div className="flex items-center justify-end gap-1 text-[10px] text-indigo-200 mt-1">
                  <span>16:43</span>
                  <CheckCheck className="w-3 h-3 text-indigo-200" />
                </div>
              </div>
            </div>
          </div>

          <div className="p-3 bg-white border border-slate-200 rounded-lg text-xs text-slate-500 text-center">
            Monitoring active • Incoming and outgoing messages synced in real-time via Accessibility Service
          </div>
        </div>
      </div>
    </div>
  );
};
