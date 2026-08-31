import React from 'react';
import { 
  MessageSquare, 
  PhoneCall, 
  MapPin, 
  Mic, 
  MessageCircle, 
  Key, 
  Image as ImageIcon, 
  Radio, 
  Lock, 
  Globe, 
  Users, 
  Calendar,
  ChevronRight,
  Play,
  Volume2
} from 'lucide-react';
import { MetricSummary } from '../types/dashboard.types';

interface FeatureTileGridProps {
  metrics: MetricSummary;
  onSelectFeature: (featureId: string) => void;
}

export const FeatureTileGrid: React.FC<FeatureTileGridProps> = ({ metrics, onSelectFeature }) => {
  const featureTiles = [
    {
      id: 'whatsapp',
      title: 'WhatsApp Monitoring',
      subtitle: 'WhatsApp & WA Business Chats',
      counter: `${metrics.whatsappMessages} New Messages`,
      badge: 'Chat UI & Voice',
      badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      icon: MessageSquare,
      iconBg: 'bg-emerald-500 text-white',
      cardBorder: 'hover:border-emerald-300',
      actionText: 'View WhatsApp Timeline'
    },
    {
      id: 'calls',
      title: 'Call Logs & Recordings',
      subtitle: 'Phone & VoIP Call Audio',
      counter: `${metrics.callRecordings} Audio Recorded`,
      badge: '2-Way Hardware',
      badgeColor: 'bg-rose-50 text-rose-700 border-rose-200',
      icon: PhoneCall,
      iconBg: 'bg-rose-500 text-white',
      cardBorder: 'hover:border-rose-300',
      actionText: 'Listen to Call Recordings'
    },
    {
      id: 'location',
      title: 'Live Location Tracking',
      subtitle: 'Real-time GPS & Route History',
      counter: 'Updated 2m ago',
      badge: 'Fine GPS Active',
      badgeColor: 'bg-blue-50 text-blue-700 border-blue-200',
      icon: MapPin,
      iconBg: 'bg-blue-500 text-white',
      cardBorder: 'hover:border-blue-300',
      actionText: 'Open Live Map & Geofences'
    },
    {
      id: 'surround',
      title: 'Live Surround Audio',
      subtitle: 'On-Demand Background Mic',
      counter: `${metrics.surroundAudioCount} Recorded Sessions`,
      badge: 'Live Stream Ready',
      badgeColor: 'bg-indigo-50 text-indigo-700 border-indigo-200',
      icon: Mic,
      iconBg: 'bg-indigo-600 text-white',
      cardBorder: 'hover:border-indigo-300',
      actionText: 'Start Live Surround Stream'
    },
    {
      id: 'sms',
      title: 'SMS & Telephony',
      subtitle: 'Incoming & Outgoing Messages',
      counter: `${metrics.smsLogs} SMS Captured`,
      badge: 'Content Intercepted',
      badgeColor: 'bg-sky-50 text-sky-700 border-sky-200',
      icon: MessageCircle,
      iconBg: 'bg-sky-500 text-white',
      cardBorder: 'hover:border-sky-300',
      actionText: 'View SMS Logs'
    },
    {
      id: 'keylogger',
      title: 'Keylogger Activity',
      subtitle: 'On-Screen Text Input Logs',
      counter: `${metrics.keylogsCount} Keypresses`,
      badge: 'Accessibility Stream',
      badgeColor: 'bg-purple-50 text-purple-700 border-purple-200',
      icon: Key,
      iconBg: 'bg-purple-600 text-white',
      cardBorder: 'hover:border-purple-300',
      actionText: 'View Keylogger Log Stream'
    },
    {
      id: 'photos',
      title: 'Photos & Screenshots',
      subtitle: 'Camera Captures & Screenshots',
      counter: `${metrics.stealthPhotos + metrics.screenshots} New Media Files`,
      badge: 'MediaStore & Camera',
      badgeColor: 'bg-teal-50 text-teal-700 border-teal-200',
      icon: ImageIcon,
      iconBg: 'bg-teal-500 text-white',
      cardBorder: 'hover:border-teal-300',
      actionText: 'Browse Media Gallery'
    },
    {
      id: 'livestream',
      title: 'Live Screen & Camera',
      subtitle: 'Real-time Screen Video Stream',
      counter: 'MediaProjection API',
      badge: 'Phase 3 Feature',
      badgeColor: 'bg-amber-50 text-amber-700 border-amber-200',
      icon: Radio,
      iconBg: 'bg-amber-500 text-white',
      cardBorder: 'hover:border-amber-300',
      actionText: 'Launch Live Stream Player'
    },
    {
      id: 'appblock',
      title: 'App Blocker & Limits',
      subtitle: 'Screen Time & Package Block',
      counter: `${metrics.blockedAppsCount} Apps Restricted`,
      badge: 'Device Owner Rule',
      badgeColor: 'bg-slate-100 text-slate-700 border-slate-300',
      icon: Lock,
      iconBg: 'bg-slate-700 text-white',
      cardBorder: 'hover:border-slate-400',
      actionText: 'Manage App Restrictions'
    },
    {
      id: 'webfilter',
      title: 'Web Safety & History',
      subtitle: 'Browser History & Domain Filter',
      counter: `${metrics.webHistoryCount} URLs Tracked`,
      badge: 'Always-On Local VPN',
      badgeColor: 'bg-cyan-50 text-cyan-700 border-cyan-200',
      icon: Globe,
      iconBg: 'bg-cyan-600 text-white',
      cardBorder: 'hover:border-cyan-300',
      actionText: 'View Browsing History'
    },
    {
      id: 'contacts',
      title: 'Contacts Inventory',
      subtitle: 'Phonebook Synchronization',
      counter: `${metrics.contactsCount} Contacts Synced`,
      badge: 'Synced 1h ago',
      badgeColor: 'bg-slate-100 text-slate-700 border-slate-200',
      icon: Users,
      iconBg: 'bg-slate-600 text-white',
      cardBorder: 'hover:border-slate-300',
      actionText: 'View Phonebook List'
    },
    {
      id: 'calendar',
      title: 'Calendar & Schedule',
      subtitle: 'Event Titles & Agenda Logs',
      counter: '5 Scheduled Events',
      badge: 'Calendar API',
      badgeColor: 'bg-violet-50 text-violet-700 border-violet-200',
      icon: Calendar,
      iconBg: 'bg-violet-600 text-white',
      cardBorder: 'hover:border-violet-300',
      actionText: 'View Calendar Logs'
    }
  ];

  return (
    <div className="space-y-4 mb-8">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-bold text-slate-900 tracking-tight">Feature Overview & Telemetry Matrix</h2>
        <span className="text-xs text-slate-500 font-medium">Click tile to inspect detailed logs</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {featureTiles.map((tile) => {
          const Icon = tile.icon;
          return (
            <div
              key={tile.id}
              onClick={() => onSelectFeature(tile.id)}
              className={`bg-white border border-slate-200 rounded-xl p-4 cursor-pointer transition-all duration-200 shadow-xs hover:shadow-md ${tile.cardBorder} flex flex-col justify-between group`}
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between">
                  <div className={`w-10 h-10 rounded-xl ${tile.iconBg} flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${tile.badgeColor}`}>
                    {tile.badge}
                  </span>
                </div>

                <div>
                  <h3 className="font-bold text-slate-900 text-sm group-hover:text-indigo-600 transition-colors">
                    {tile.title}
                  </h3>
                  <p className="text-xs text-slate-500">{tile.subtitle}</p>
                </div>
              </div>

              <div className="pt-4 mt-2 border-t border-slate-100 flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-700">{tile.counter}</span>
                <span className="text-xs font-semibold text-indigo-600 flex items-center gap-0.5 group-hover:translate-x-0.5 transition-transform">
                  <span>Open</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
