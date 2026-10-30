import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  MapPin, 
  Users, 
  FileText, 
  Lightbulb, 
  Phone, 
  Clock, 
  RotateCw, 
  ChevronRight, 
  ChevronLeft,
  AlertTriangle,
  ShieldCheck,
  ArrowRight
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { syncService, type SyncState } from '../services/syncService';
import { LandscapeIllustration } from './LandscapeIllustration';
import { SafetyTipIllustration } from './SafetyTipIllustration';
import { SafetyMap } from './SafetyMap';
import type { IncidentReport, PageView } from '../types';

interface WebDashboardProps {
  onNavigate: (view: PageView) => void;
  onOpenAccountModal?: () => void;
}

const SAFETY_TIPS = [
  {
    title: 'Be aware of your surroundings',
    desc: 'Stay alert in unfamiliar places and avoid distractions while walking.',
  },
  {
    title: 'Keep trusted contacts updated',
    desc: 'Share your route and live location when traveling late or through quiet corridors.',
  },
  {
    title: 'Use well-lit and active routes',
    desc: 'Stick to main avenues, commercial areas, and established pedestrian paths.',
  },
  {
    title: 'Know your emergency shortcuts',
    desc: 'Keep emergency hotlines on speed-dial and practice quick volume-button triggers on your phone.',
  },
];

export const WebDashboard: React.FC<WebDashboardProps> = ({ onNavigate }) => {
  const { user, profile, isGuest } = useAuth();
  
  // Real-time synchronization state
  const [syncState, setSyncState] = useState<SyncState>(syncService.getState());
  const [incidents, setIncidents] = useState<IncidentReport[]>([]);
  const [currentTipIndex, setCurrentTipIndex] = useState(0);
  const [locationLabel, setLocationLabel] = useState('Campus & Vicinity');
  const [locationSub, setLocationSub] = useState('Inavolu, Andhra Pradesh • Approximate');

  const handleLocationCaptured = useCallback((lat: number, lng: number, acc: number) => {
    setLocationLabel(`Location (${lat.toFixed(3)}°, ${lng.toFixed(3)}°)`);
    setLocationSub(`Accurate to ~${Math.round(acc)} m • Updated just now`);
  }, []);

  // Subscribe to shared sync service
  useEffect(() => {
    const unsubscribe = syncService.subscribe((state) => {
      setSyncState(state);
    });
    // Trigger initial sync if never synced
    if (!syncState.lastSyncedAt && user) {
      syncService.syncAll();
    }
    return unsubscribe;
  }, [user]);

  // Fetch genuine incidents from backend
  const loadIncidents = useCallback(async () => {
    if (!user) return;
    try {
      const data = await api.getIncidents();
      setIncidents(data);
    } catch (err) {
      console.warn('Dashboard failed to load incidents:', err);
    }
  }, [user]);

  useEffect(() => {
    loadIncidents();
  }, [loadIncidents]);

  // Derive time-of-day greeting
  const greetingTime = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'GOOD MORNING';
    if (hour < 17) return 'GOOD AFTERNOON';
    return 'GOOD EVENING';
  }, []);

  const displayName = isGuest ? 'Guest' : (profile?.name || user?.displayName || user?.email?.split('@')[0] || 'User');

  // Format last synced time
  const formattedLastSynced = useMemo(() => {
    if (!syncState.lastSyncedAt) return 'Never';
    const now = new Date();
    const diffMs = now.getTime() - syncState.lastSyncedAt.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return 'Just now';
    if (diffMins === 1) return '1m ago';
    if (diffMins < 60) return `${diffMins}m ago`;
    return syncState.lastSyncedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }, [syncState.lastSyncedAt]);

  // Real contacts to display (up to 3)
  const displayContacts = syncState.contacts.slice(0, 3);

  // Real incidents to display (up to 3)
  const displayIncidents = incidents.slice(0, 3);

  // Avatar colors for contact initial circles
  const getAvatarBg = (index: number) => {
    const palette = ['#FBE9EF', '#F5EBE1', '#EBF2FA'];
    const textPalette = ['#A61945', '#9A5B2D', '#2B5B84'];
    return {
      bg: palette[index % palette.length],
      text: textPalette[index % textPalette.length],
    };
  };

  const handleNextTip = () => {
    setCurrentTipIndex((prev) => (prev + 1) % SAFETY_TIPS.length);
  };

  const handlePrevTip = () => {
    setCurrentTipIndex((prev) => (prev - 1 + SAFETY_TIPS.length) % SAFETY_TIPS.length);
  };

  return (
    <div className="space-y-6 max-w-[1360px] mx-auto animate-in fade-in-50 duration-200">
      
      {/* 1. TOP ROW: GREETING & STATUS SECTION */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        
        {/* Left: Greeting Card with Landscape Illustration */}
        <div className="lg:col-span-8 bg-white border border-[#EEE5E7] rounded-2xl p-6 sm:p-7 relative overflow-hidden flex flex-col justify-between shadow-xs min-h-[170px]">
          
          {/* Greeting Typography */}
          <div className="space-y-1 relative z-10 max-w-sm sm:max-w-md">
            <span className="text-[11px] font-bold tracking-wider text-[#81747D] uppercase">
              {greetingTime}
            </span>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#28151D] flex items-center gap-2">
              <span>{displayName}</span>
              <span className="inline-block hover:animate-bounce cursor-default select-none">👋</span>
            </h1>
            <p className="text-xs sm:text-sm text-[#81747D] pt-0.5">
              Stay safe. Stay aware.
            </p>
          </div>

          {/* Peaceful Landscape Illustration on the Right */}
          <div className="absolute right-0 bottom-0 top-0 w-3/5 sm:w-1/2 pointer-events-none opacity-90 hidden sm:block">
            <LandscapeIllustration className="w-full h-full" />
          </div>

        </div>

        {/* Right: Status & Refresh Cards */}
        <div className="lg:col-span-4 flex flex-col justify-between gap-3">
          
          {/* System Status Card */}
          <div className="bg-white border border-[#EEE5E7] rounded-2xl p-4 flex items-center gap-3.5 shadow-xs flex-1">
            <div className="w-3 h-3 rounded-full bg-[#059669] shrink-0 ring-4 ring-[#059669]/15" />
            <div className="min-w-0 flex-1">
              <div className="text-xs font-bold text-[#28151D] flex items-center gap-1.5">
                <span>All Systems Ready</span>
              </div>
              <p className="text-[11px] text-[#81747D] mt-0.5 leading-snug">
                Your profile, contacts and settings are synced.
              </p>
            </div>
          </div>

          {/* Last Synced & Manual Refresh Action */}
          <div className="bg-white border border-[#EEE5E7] rounded-2xl p-4 flex items-center justify-between gap-3 shadow-xs flex-1">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-[#FAF7F6] border border-[#EEE5E7] flex items-center justify-center text-[#81747D] shrink-0">
                <Clock size={15} />
              </div>
              <div>
                <div className="text-[11px] text-[#81747D]">Last synced</div>
                <div className="text-xs font-bold text-[#28151D]">{formattedLastSynced}</div>
              </div>
            </div>

            {/* Refresh Button with Spinner */}
            <button
              onClick={() => syncService.syncAll(true)}
              disabled={syncState.isSyncing}
              className="p-2 rounded-xl text-[#A61945] hover:bg-[#FBE9EF] border border-transparent hover:border-[#A61945]/20 transition-all cursor-pointer disabled:opacity-50"
              title="Manual Sync Cloud Data"
              id="manual-dashboard-sync-btn"
            >
              <RotateCw size={16} className={syncState.isSyncing ? 'animate-spin' : ''} />
            </button>
          </div>

        </div>

      </div>

      {/* 2. MIDDLE ROW: 3-COLUMN BALANCED CONTENT GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        
        {/* Card A: Current Location */}
        <div className="bg-white border border-[#EEE5E7] rounded-2xl p-5 flex flex-col justify-between shadow-xs space-y-4">
          
          {/* Card Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MapPin size={17} className="text-[#A61945]" />
              <h2 className="text-sm font-bold text-[#28151D]">Current Location</h2>
            </div>
            <button
              onClick={() => onNavigate('map')}
              className="text-xs text-[#A61945] hover:underline font-medium inline-flex items-center gap-1 cursor-pointer"
            >
              <span>View on Map</span>
              <ArrowRight size={11} />
            </button>
          </div>

          {/* Map Preview Area */}
          <div className="rounded-xl overflow-hidden border border-[#EEE5E7] h-44 relative bg-[#F7EEEE]">
            <SafetyMap onOpenFullMap={() => onNavigate('map')} onLocationCaptured={handleLocationCaptured} />
          </div>

          {/* Location Summary Footer */}
          <div className="flex items-start gap-2.5 pt-1">
            <MapPin size={15} className="text-[#A61945] shrink-0 mt-0.5" />
            <div>
              <div className="text-xs font-bold text-[#28151D]">{locationLabel}</div>
              <div className="text-[11px] text-[#81747D] mt-0.5">{locationSub}</div>
            </div>
          </div>

        </div>

        {/* Card B: Emergency Contacts */}
        <div className="bg-white border border-[#EEE5E7] rounded-2xl p-5 flex flex-col justify-between shadow-xs space-y-4">
          
          {/* Card Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users size={17} className="text-[#A61945]" />
              <h2 className="text-sm font-bold text-[#28151D]">Emergency Contacts</h2>
            </div>
            <button
              onClick={() => onNavigate('contacts')}
              className="text-xs text-[#A61945] hover:underline font-medium inline-flex items-center gap-1 cursor-pointer"
            >
              <span>Manage</span>
              <ArrowRight size={11} />
            </button>
          </div>

          {/* Contacts List Rows */}
          <div className="space-y-3 flex-1 flex flex-col justify-center">
            {displayContacts.length > 0 ? (
              displayContacts.map((contact, idx) => {
                const colors = getAvatarBg(idx);
                const initial = contact.name.trim().charAt(0).toUpperCase() || 'C';
                return (
                  <div
                    key={contact.id}
                    className="flex items-center justify-between py-1.5 border-b border-[#FAF2F4] last:border-0"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {/* Avatar Circle */}
                      <div
                        className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs"
                        style={{ backgroundColor: colors.bg, color: colors.text }}
                      >
                        {initial}
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-[#28151D] truncate">
                          {contact.name}
                        </div>
                        <div className="text-[11px] text-[#81747D] truncate">
                          {contact.is_primary ? 'Primary • ' : ''}{contact.relation || 'Emergency Circle'}
                        </div>
                      </div>
                    </div>

                    {/* Phone Call Button */}
                    <a
                      href={`tel:${contact.phone}`}
                      className="w-8 h-8 rounded-full bg-[#FBE9EF] hover:bg-[#A61945] text-[#A61945] hover:text-white flex items-center justify-center transition-colors shrink-0 shadow-2xs"
                      title={`Call ${contact.name}`}
                    >
                      <Phone size={13} />
                    </a>
                  </div>
                );
              })
            ) : (
              <div className="text-center py-6 space-y-2">
                <Users size={22} className="mx-auto text-[#D9CCD0]" />
                <p className="text-xs text-[#81747D]">No emergency contacts saved yet.</p>
                <button
                  onClick={() => onNavigate('contacts')}
                  className="px-3 py-1.5 rounded-lg bg-[#FBE9EF] text-[#A61945] text-xs font-semibold hover:bg-[#A61945] hover:text-white transition-colors cursor-pointer"
                >
                  Add Contact
                </button>
              </div>
            )}
          </div>

          <div className="text-[11px] text-[#81747D] pt-1">
            Tap the phone icon to initiate direct calling.
          </div>

        </div>

        {/* Card C: Recent Incidents */}
        <div className="bg-white border border-[#EEE5E7] rounded-2xl p-5 flex flex-col justify-between shadow-xs space-y-4">
          
          {/* Card Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText size={17} className="text-[#A61945]" />
              <h2 className="text-sm font-bold text-[#28151D]">Recent Incidents</h2>
            </div>
            <button
              onClick={() => onNavigate('incidents')}
              className="text-xs text-[#A61945] hover:underline font-medium inline-flex items-center gap-1 cursor-pointer"
            >
              <span>View All</span>
              <ArrowRight size={11} />
            </button>
          </div>

          {/* Incidents List Rows */}
          <div className="space-y-3 flex-1 flex flex-col justify-center">
            {displayIncidents.length > 0 ? (
              displayIncidents.map((inc) => (
                <div
                  key={inc.id}
                  className="flex items-center justify-between py-1.5 border-b border-[#FAF2F4] last:border-0"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-xl bg-red-50 text-red-600 flex items-center justify-center shrink-0">
                      <AlertTriangle size={14} />
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-[#28151D] truncate">{inc.type}</div>
                      <div className="text-[11px] text-[#81747D] truncate">
                        {inc.location.addressLabel || (inc.location.latitude && inc.location.longitude ? `${inc.location.latitude.toFixed(4)}, ${inc.location.longitude.toFixed(4)}` : 'Location Recorded')}
                      </div>
                    </div>
                  </div>
                  <div className="text-[10px] text-[#81747D] font-mono shrink-0 pl-2">
                    {new Date(inc.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                  </div>
                </div>
              ))
            ) : (
              <div className="py-8 text-center text-xs text-[#81747D]">
                <ShieldCheck size={28} className="mx-auto mb-2 text-[#C4B5BC] opacity-60" />
                <p className="font-semibold text-[#28151D]">No incidents recorded</p>
                <p className="text-[11px] text-[#81747D] mt-0.5">Your area is currently calm. Any alerts or reports will appear here.</p>
              </div>
            )}
          </div>

          <div className="text-[11px] text-[#81747D] pt-1">
            Logged incidents automatically notify security response.
          </div>

        </div>

      </div>

      {/* 3. BOTTOM ROW: SAFETY TIPS CARD */}
      <div className="bg-white border border-[#EEE5E7] rounded-2xl p-5 sm:p-6 shadow-xs space-y-4">
        
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Lightbulb size={17} className="text-[#A61945]" />
            <h2 className="text-sm font-bold text-[#28151D]">Safety Tips</h2>
          </div>
          <button
            onClick={() => onNavigate('resources')}
            className="text-xs text-[#A61945] hover:underline font-medium inline-flex items-center gap-1 cursor-pointer"
          >
            <span>View All</span>
            <ArrowRight size={11} />
          </button>
        </div>

        {/* Tip Body with Illustration & Navigation */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-6 p-4 rounded-xl bg-[#FAF7F6] border border-[#EEE5E7]">
          
          <div className="flex items-center gap-5 min-w-0">
            {/* Walking Woman Illustration */}
            <div className="w-20 h-20 shrink-0">
              <SafetyTipIllustration className="w-full h-full" />
            </div>

            {/* Tip Text */}
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-[#28151D]">
                {SAFETY_TIPS[currentTipIndex].title}
              </h3>
              <p className="text-xs text-[#5C4953] leading-relaxed max-w-xl">
                {SAFETY_TIPS[currentTipIndex].desc}
              </p>
            </div>
          </div>

          {/* Tip Pagination Controls */}
          <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
            <button
              onClick={handlePrevTip}
              className="w-7 h-7 rounded-full bg-white border border-[#EEE5E7] hover:border-[#A61945] flex items-center justify-center text-[#5C4953] hover:text-[#A61945] transition-colors cursor-pointer shadow-2xs"
              aria-label="Previous safety tip"
            >
              <ChevronLeft size={14} />
            </button>
            <span className="text-xs font-mono text-[#81747D]">
              {currentTipIndex + 1} / {SAFETY_TIPS.length}
            </span>
            <button
              onClick={handleNextTip}
              className="w-7 h-7 rounded-full bg-white border border-[#EEE5E7] hover:border-[#A61945] flex items-center justify-center text-[#5C4953] hover:text-[#A61945] transition-colors cursor-pointer shadow-2xs"
              aria-label="Next safety tip"
            >
              <ChevronRight size={14} />
            </button>
          </div>

        </div>

      </div>

    </div>
  );
};
