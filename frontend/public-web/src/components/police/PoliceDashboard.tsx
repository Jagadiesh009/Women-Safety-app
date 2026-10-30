import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  ShieldCheck, 
  ShieldAlert, 
  Radio, 
  Car, 
  CheckCircle2, 
  AlertCircle, 
  MapPin, 
  Navigation, 
  Clock, 
  LogOut, 
  Volume2, 
  VolumeX, 
  RefreshCw, 
  Check, 
  X, 
  BarChart3, 
  TrendingUp, 
  Download, 
  UserCheck, 
  ExternalLink,
  ChevronRight
} from 'lucide-react';
import { usePoliceAuth } from '../../context/PoliceAuthContext';
import { policeApi, crimeApi } from '../../services/api';
import { emergencySound } from '../../utils/audioAlert';
import { PatrolRadarMap } from './PatrolRadarMap';
import type { 
  IncomingAlertItem, 
  PoliceIncidentDetail, 
  PatrolUnitMarker, 
  PatrolRecommendationItem, 
  PatrolAssignmentItem, 
  WeeklyCrimeReportData,
  PoliceDispatchLifecycleStatus,
  PageView 
} from '../../types';

interface PoliceDashboardProps {
  onLogout?: () => void;
  onNavigatePublic?: (view: PageView) => void;
}

type PoliceTab = 'overview' | 'dispatch' | 'radar' | 'analytics' | 'planning' | 'history';

export const PoliceDashboard: React.FC<PoliceDashboardProps> = ({ 
  onLogout, 
  onNavigatePublic 
}) => {
  const { 
    officer, 
    dutyStatus, 
    toggleDuty, 
    logoutPolice, 
    updateLocation 
  } = usePoliceAuth();

  const [activeTab, setActiveTab] = useState<PoliceTab>('overview');
  const [isTogglingDuty, setIsTogglingDuty] = useState(false);
  const [isMuted, setIsMuted] = useState<boolean>(emergencySound.getIsMuted());

  // Real-time state
  const [incomingAlerts, setIncomingAlerts] = useState<IncomingAlertItem[]>([]);
  const [activeIncident, setActiveIncident] = useState<PoliceIncidentDetail | null>(null);
  const [incidentHistory, setIncidentHistory] = useState<PoliceIncidentDetail[]>([]);
  const [patrolUnits, setPatrolUnits] = useState<PatrolUnitMarker[]>([]);
  const [patrolRecommendations, setPatrolRecommendations] = useState<PatrolRecommendationItem[]>([]);
  const [myAssignments, setMyAssignments] = useState<PatrolAssignmentItem[]>([]);
  const [weeklyReport, setWeeklyReport] = useState<WeeklyCrimeReportData | null>(null);

  // Operational state
  const [officerCoords, setOfficerCoords] = useState<{ latitude: number; longitude: number; accuracy: number } | null>(null);
  const [statusNotes, setStatusNotes] = useState<string>('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Supervisor assignment modal state
  const [assignModalRec, setAssignModalRec] = useState<PatrolRecommendationItem | null>(null);
  const [assignOfficerId, setAssignOfficerId] = useState<number>(officer?.id || 1);
  const [assignShift, setAssignShift] = useState<string>('Night Patrol (20:00 - 04:00)');
  const [assignInstructions, setAssignInstructions] = useState<string>('');

  const previousAlertCountRef = useRef<number>(0);

  // Toggle Mute
  const handleToggleMute = () => {
    const next = !isMuted;
    emergencySound.setMuted(next);
    setIsMuted(next);
  };

  // 1. Browser Geolocation Tracker
  useEffect(() => {
    if (!dutyStatus?.is_on_duty) return;

    if (!navigator.geolocation) return;

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude, longitude, accuracy } = pos.coords;
        setOfficerCoords({ latitude, longitude, accuracy });
        updateLocation({ latitude, longitude, accuracy });
      },
      (err) => {
        console.warn('[PoliceDashboard] Geolocation watch error:', err);
      },
      { enableHighAccuracy: true, maximumAge: 10000, timeout: 15000 }
    );

    return () => {
      navigator.geolocation.clearWatch(watchId);
    };
  }, [dutyStatus?.is_on_duty, updateLocation]);

  // 2. Fetch Data Functions
  const fetchAlertsAndActive = useCallback(async () => {
    if (!dutyStatus?.is_on_duty) {
      setIncomingAlerts([]);
      return;
    }

    try {
      const alerts = await policeApi.getIncomingAlerts();
      setIncomingAlerts(alerts);

      // Trigger audible emergency chirp if new alerts arrived
      if (alerts.length > 0 && alerts.length > previousAlertCountRef.current) {
        emergencySound.playChirp();
      }
      previousAlertCountRef.current = alerts.length;

      // Active incident
      const active = await policeApi.getActiveIncident();
      setActiveIncident(active);
    } catch (e) {
      console.warn('[PoliceDashboard] Polling alerts error:', e);
    }
  }, [dutyStatus?.is_on_duty]);

  const fetchUnits = useCallback(async () => {
    try {
      const units = await policeApi.getActivePatrolUnits();
      setPatrolUnits(units);
    } catch (e) {
      console.warn('[PoliceDashboard] Error fetching patrol units:', e);
    }
  }, []);

  const fetchHistory = useCallback(async () => {
    try {
      const history = await policeApi.getIncidentHistory();
      setIncidentHistory(history);
    } catch (e) {
      console.warn('[PoliceDashboard] Error fetching history:', e);
    }
  }, []);

  const fetchRecommendationsAndAssignments = useCallback(async () => {
    try {
      const [recs, assigns] = await Promise.all([
        policeApi.getPatrolRecommendations(),
        policeApi.getMyPatrolAssignments(),
      ]);
      setPatrolRecommendations(recs);
      setMyAssignments(assigns);
    } catch (e) {
      console.warn('[PoliceDashboard] Error loading recommendations:', e);
    }
  }, []);

  const fetchWeeklyReport = useCallback(async () => {
    try {
      const report = await crimeApi.getWeeklyReport(0);
      setWeeklyReport(report);
    } catch (e) {
      console.warn('[PoliceDashboard] Error fetching weekly crime report:', e);
    }
  }, []);

  // Initial and periodic refresh
  useEffect(() => {
    fetchAlertsAndActive();
    fetchUnits();
    fetchHistory();
    fetchRecommendationsAndAssignments();
    fetchWeeklyReport();

    // 3-second rapid polling for live dispatch and active incident sync
    const interval = setInterval(() => {
      fetchAlertsAndActive();
      fetchUnits();
    }, 3000);

    return () => clearInterval(interval);
  }, [
    fetchAlertsAndActive, 
    fetchUnits, 
    fetchHistory, 
    fetchRecommendationsAndAssignments, 
    fetchWeeklyReport
  ]);

  // Handle ON / OFF DUTY Toggle
  const handleToggleDuty = async () => {
    if (isTogglingDuty) return;
    setIsTogglingDuty(true);
    setActionError(null);
    setActionSuccess(null);

    const targetStatus = !dutyStatus?.is_on_duty;
    try {
      const ok = await toggleDuty(
        targetStatus, 
        officer?.assigned_zone || 'Bengaluru Central',
        officer?.vehicle_number || 'KA-01-G-1001'
      );
      if (ok) {
        setActionSuccess(targetStatus ? 'Patrol status: ON DUTY. Live dispatch active.' : 'Patrol status: OFF DUTY. Dispatches paused.');
        if (targetStatus) {
          fetchAlertsAndActive();
        } else {
          setIncomingAlerts([]);
        }
      } else {
        setActionError('Failed to change duty status on backend.');
      }
    } catch (err: any) {
      setActionError(err.message || 'Error updating duty status.');
    } finally {
      setIsTogglingDuty(false);
      setTimeout(() => setActionSuccess(null), 4000);
    }
  };

  // Accept Incoming Alert
  const handleAcceptAlert = async (incidentId: number) => {
    setActionLoading(`accept_${incidentId}`);
    setActionError(null);
    try {
      await policeApi.acceptAlert(incidentId);
      setActionSuccess(`Emergency dispatch accepted! You are now assigned to #INC-${incidentId}.`);
      emergencySound.playChirp();
      await fetchAlertsAndActive();
      await fetchHistory();
      setActiveTab('dispatch');
    } catch (err: any) {
      setActionError(err.message || 'Failed to accept alert. Another unit may have responded.');
      await fetchAlertsAndActive();
    } finally {
      setActionLoading(null);
      setTimeout(() => setActionSuccess(null), 5000);
    }
  };

  // Decline Incoming Alert
  const handleDeclineAlert = async (incidentId: number) => {
    setActionLoading(`decline_${incidentId}`);
    try {
      await policeApi.declineAlert(incidentId);
      await fetchAlertsAndActive();
    } catch (err: any) {
      setActionError(err.message || 'Failed to decline alert');
    } finally {
      setActionLoading(null);
    }
  };

  // Progress Incident Lifecycle Status
  const handleAdvanceStatus = async (incidentId: number, nextStatus: PoliceDispatchLifecycleStatus) => {
    setActionLoading(`status_${nextStatus}`);
    setActionError(null);
    try {
      await policeApi.updateIncidentStatus(incidentId, nextStatus, statusNotes);
      setActionSuccess(`Status updated to ${nextStatus}. User telemetry notified.`);
      setStatusNotes('');
      await fetchAlertsAndActive();
      await fetchHistory();
    } catch (err: any) {
      setActionError(err.message || 'Failed to update incident response lifecycle');
    } finally {
      setActionLoading(null);
      setTimeout(() => setActionSuccess(null), 4000);
    }
  };

  // Supervisor Assign Patrol Recommendation
  const handleSupervisorAssign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignModalRec) return;

    setActionLoading('assigning_patrol');
    setActionError(null);
    try {
      await policeApi.assignPatrolRecommendation(assignModalRec.id, {
        officer_id: assignOfficerId,
        shift_period: assignShift,
        instructions: assignInstructions || `Priority patrol deployment in ${assignModalRec.locality}.`,
      });
      setActionSuccess(`Patrol order deployed to ${assignModalRec.locality}!`);
      setAssignModalRec(null);
      await fetchRecommendationsAndAssignments();
    } catch (err: any) {
      setActionError(err.message || 'Failed to deploy patrol assignment.');
    } finally {
      setActionLoading(null);
      setTimeout(() => setActionSuccess(null), 4000);
    }
  };

  const handleLogout = () => {
    logoutPolice();
    if (onLogout) {
      onLogout();
    } else {
      window.location.hash = 'welcome';
    }
  };

  // Compute metrics
  const completedCount = incidentHistory.filter(i => i.status === 'RESOLVED' || i.dispatch_status === 'RESOLVED').length;
  const inProgressCount = activeIncident ? 1 : 0;
  const alertsCount = incomingAlerts.length;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-blue-600 selection:text-white">

      {/* TOP COMMAND CONSOLE HEADER */}
      <header className="sticky top-0 z-40 bg-slate-900/95 backdrop-blur-md border-b border-slate-800 shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 gap-3">
            
            {/* Officer Identification & Department Seal */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-700 to-indigo-900 border border-blue-500/40 flex items-center justify-center shadow-md shrink-0">
                <ShieldAlert className="w-5 h-5 text-amber-400" />
              </div>

              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm tracking-tight text-white">
                    SafeHer Police Dispatch
                  </span>
                  <span className="px-1.5 py-0.5 rounded bg-blue-500/15 border border-blue-500/30 text-blue-400 text-[10px] font-mono font-semibold">
                    {officer?.badge_number || 'POL-101'}
                  </span>
                  {officer?.role === 'SUPERVISOR' && (
                    <span className="px-1.5 py-0.5 rounded bg-amber-500/15 border border-amber-500/30 text-amber-400 text-[10px] font-bold uppercase tracking-wider">
                      Supervisor
                    </span>
                  )}
                </div>
                <div className="text-[11px] text-slate-400 flex items-center gap-2">
                  <span>{officer?.name || 'Officer'}</span>
                  <span>•</span>
                  <span>{officer?.rank || 'Patrol Officer'}</span>
                  <span>•</span>
                  <span className="text-slate-300 font-medium">{officer?.station_name || 'Central Precinct'}</span>
                </div>
              </div>
            </div>

            {/* Right Status Actions & Duty Switch */}
            <div className="flex items-center gap-2 sm:gap-4">
              
              {/* Audio Alarm Toggle */}
              <button
                type="button"
                onClick={handleToggleMute}
                className={`p-2 rounded-lg border transition-colors cursor-pointer ${
                  isMuted 
                    ? 'border-slate-700 bg-slate-800 text-slate-400 hover:text-slate-200' 
                    : 'border-blue-500/40 bg-blue-950/60 text-blue-400 hover:bg-blue-900/60'
                }`}
                title={isMuted ? 'Unmute siren chimes' : 'Mute siren chimes'}
                aria-label="Toggle siren audio"
              >
                {isMuted ? <VolumeX size={15} /> : <Volume2 size={15} className="animate-pulse" />}
              </button>

              {/* ON DUTY / OFF DUTY Primary Toggle */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleToggleDuty}
                  disabled={isTogglingDuty}
                  className={`px-3 py-1.5 rounded-lg font-bold text-xs flex items-center gap-2 transition-all shadow-md cursor-pointer border ${
                    dutyStatus?.is_on_duty
                      ? 'bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-400 shadow-emerald-950/40'
                      : 'bg-rose-950/70 hover:bg-rose-900/80 text-rose-300 border-rose-800'
                  }`}
                >
                  <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                    dutyStatus?.is_on_duty 
                      ? 'bg-emerald-300 animate-ping' 
                      : 'bg-rose-500'
                  }`} />
                  <span>{dutyStatus?.is_on_duty ? 'ON DUTY' : 'OFF DUTY'}</span>
                </button>
              </div>

              {/* Citizen Web Portal Link */}
              {onNavigatePublic && (
                <button
                  type="button"
                  onClick={() => onNavigatePublic('dashboard')}
                  className="hidden md:inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors cursor-pointer"
                  title="Switch to citizen portal preview"
                >
                  <span>Citizen Portal</span>
                </button>
              )}

              {/* Sign Out */}
              <button
                type="button"
                onClick={handleLogout}
                className="p-2 rounded-lg border border-slate-700 bg-slate-800 hover:bg-rose-950/50 hover:text-rose-400 hover:border-rose-800 text-slate-300 transition-colors cursor-pointer"
                title="Sign out of police portal"
                aria-label="Sign out"
              >
                <LogOut size={15} />
              </button>

            </div>

          </div>
        </div>
      </header>

      {/* NOTIFICATION FEEDBACK BANNERS */}
      {actionSuccess && (
        <div className="bg-emerald-950/80 border-b border-emerald-500/30 px-4 py-2 text-xs text-emerald-300 flex items-center justify-between">
          <div className="max-w-7xl mx-auto w-full flex items-center gap-2">
            <CheckCircle2 size={14} className="text-emerald-400 shrink-0" />
            <span>{actionSuccess}</span>
          </div>
        </div>
      )}

      {actionError && (
        <div className="bg-rose-950/80 border-b border-rose-500/30 px-4 py-2 text-xs text-rose-300 flex items-center justify-between">
          <div className="max-w-7xl mx-auto w-full flex items-center gap-2">
            <AlertCircle size={14} className="text-rose-400 shrink-0" />
            <span>{actionError}</span>
          </div>
        </div>
      )}

      {/* CRITICAL INCOMING EMERGENCY POPUP / ALERT BAR */}
      {dutyStatus?.is_on_duty && incomingAlerts.length > 0 && (
        <div className="bg-gradient-to-r from-red-950 via-rose-900 to-red-950 border-b-2 border-red-500 px-4 py-3 shadow-xl animate-pulse">
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-red-600 border-2 border-white flex items-center justify-center text-white shrink-0 shadow-lg">
                <Radio className="w-5 h-5 animate-spin" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-extrabold text-sm uppercase tracking-wide text-white">
                    🚨 INCOMING EMERGENCY SOS DISPATCH ({incomingAlerts.length})
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-white/20 text-white text-[11px] font-mono font-bold">
                    #{incomingAlerts[0].incident_id}
                  </span>
                </div>
                <p className="text-xs text-rose-100">
                  {incomingAlerts[0].category} in <strong>{incomingAlerts[0].locality || 'Live Coordinates'}</strong>, {incomingAlerts[0].city}
                  {incomingAlerts[0].distance_km !== null && incomingAlerts[0].distance_km !== undefined && (
                    <span className="ml-1 text-amber-300 font-bold">({incomingAlerts[0].distance_km} km from your patrol unit)</span>
                  )}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleAcceptAlert(incomingAlerts[0].incident_id)}
                disabled={actionLoading === `accept_${incomingAlerts[0].incident_id}`}
                className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <Check size={14} />
                <span>ACCEPT DISPATCH</span>
              </button>
              <button
                type="button"
                onClick={() => handleDeclineAlert(incomingAlerts[0].incident_id)}
                disabled={actionLoading === `decline_${incomingAlerts[0].incident_id}`}
                className="px-3 py-2 rounded-lg bg-red-900/80 hover:bg-red-800 text-rose-200 font-semibold text-xs border border-red-700/60 transition-all cursor-pointer"
              >
                <X size={14} />
                <span>Decline</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* NAVIGATION TABS */}
      <nav className="border-b border-slate-800 bg-slate-900/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-1 overflow-x-auto py-2 scrollbar-none">
            {[
              { id: 'overview', label: 'Console Overview', icon: <ShieldCheck size={14} /> },
              { id: 'dispatch', label: 'Active Response', icon: <Radio size={14} />, badge: activeIncident ? 1 : 0 },
              { id: 'radar', label: 'Patrol Radar Map', icon: <MapPin size={14} />, badge: patrolUnits.length },
              { id: 'analytics', label: 'Crime Intelligence', icon: <BarChart3 size={14} /> },
              { id: 'planning', label: 'Patrol Planning', icon: <TrendingUp size={14} /> },
              { id: 'history', label: 'Incident Audit & History', icon: <Clock size={14} /> },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as PoliceTab)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                  activeTab === tab.id
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                {tab.icon}
                <span>{tab.label}</span>
                {Boolean(tab.badge) && (
                  <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-red-500 text-white font-bold">
                    {tab.badge}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      </nav>

      {/* MAIN CONSOLE BODY */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6 space-y-6">

        {/* TAB 1: OVERVIEW */}
        {activeTab === 'overview' && (
          <div className="space-y-6 animate-fade-in">
            {/* STATUS METRICS CARDS */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm">
                <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
                  <span>Pending Alerts</span>
                  <Radio size={14} className={alertsCount > 0 ? 'text-red-400 animate-pulse' : 'text-slate-500'} />
                </div>
                <div className="mt-2 text-2xl font-extrabold text-white">
                  {alertsCount}
                </div>
                <p className="mt-1 text-[11px] text-slate-400">Within patrol radius</p>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm">
                <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
                  <span>Active Response</span>
                  <Car size={14} className="text-amber-400" />
                </div>
                <div className="mt-2 text-2xl font-extrabold text-white">
                  {inProgressCount}
                </div>
                <p className="mt-1 text-[11px] text-slate-400">Currently in progress</p>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm">
                <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
                  <span>Completed Responses</span>
                  <CheckCircle2 size={14} className="text-emerald-400" />
                </div>
                <div className="mt-2 text-2xl font-extrabold text-white">
                  {completedCount}
                </div>
                <p className="mt-1 text-[11px] text-slate-400">Resolved by unit</p>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm">
                <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
                  <span>Patrol Units Active</span>
                  <UserCheck size={14} className="text-blue-400" />
                </div>
                <div className="mt-2 text-2xl font-extrabold text-white">
                  {patrolUnits.length}
                </div>
                <p className="mt-1 text-[11px] text-slate-400">ON DUTY across sectors</p>
              </div>
            </div>

            {/* CURRENT ACTIVE INCIDENT CARD */}
            {activeIncident ? (
              <div className="bg-gradient-to-br from-slate-900 to-blue-950 border border-blue-500/40 rounded-xl p-5 shadow-lg space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
                  <div className="flex items-center gap-2.5">
                    <span className="w-3 h-3 rounded-full bg-red-500 animate-ping shrink-0" />
                    <h3 className="text-base font-bold text-white flex items-center gap-2">
                      Active Emergency: #{activeIncident.id}
                      <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 font-mono">
                        {activeIncident.dispatch_status}
                      </span>
                    </h3>
                  </div>

                  <button
                    onClick={() => setActiveTab('dispatch')}
                    className="text-xs font-semibold text-blue-400 hover:text-blue-300 flex items-center gap-1 cursor-pointer"
                  >
                    <span>Open Tactical Response Console</span>
                    <ChevronRight size={13} />
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                  <div>
                    <span className="text-slate-400 block mb-0.5">Victim Details</span>
                    <strong className="text-white text-sm">{activeIncident.user_name}</strong>
                    {activeIncident.user_phone && (
                      <p className="text-slate-300 font-mono mt-0.5">{activeIncident.user_phone}</p>
                    )}
                  </div>

                  <div>
                    <span className="text-slate-400 block mb-0.5">Location &amp; Coordinates</span>
                    <strong className="text-white">{activeIncident.locality || 'Unknown Area'}, {activeIncident.city}</strong>
                    {activeIncident.latest_latitude && activeIncident.latest_longitude && (
                      <p className="text-slate-400 font-mono mt-0.5">
                        {activeIncident.latest_latitude.toFixed(5)}, {activeIncident.latest_longitude.toFixed(5)}
                      </p>
                    )}
                  </div>

                  <div>
                    <span className="text-slate-400 block mb-0.5">Triggered At</span>
                    <span className="text-slate-200">
                      {new Date(activeIncident.start_time).toLocaleTimeString()} ({activeIncident.trigger_source})
                    </span>
                  </div>
                </div>

                {activeIncident.latest_latitude && activeIncident.latest_longitude && (
                  <div className="pt-2 flex items-center gap-3">
                    <a
                      href={`https://www.google.com/maps/dir/?api=1&destination=${activeIncident.latest_latitude},${activeIncident.latest_longitude}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Navigation size={13} />
                      <span>Launch External GPS Navigation</span>
                      <ExternalLink size={12} />
                    </a>
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex items-center justify-between">
                <div>
                  <h4 className="font-semibold text-sm text-slate-200">No active response in progress</h4>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {dutyStatus?.is_on_duty 
                      ? 'You are ON DUTY and standing by for incoming SOS dispatches in your patrol sector.'
                      : 'You are currently OFF DUTY. Toggle ON DUTY above to receive live emergency dispatches.'}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setActiveTab('radar')}
                    className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                  >
                    <MapPin size={13} />
                    <span>View Radar Map</span>
                  </button>
                </div>
              </div>
            )}

            {/* SECTOR RADAR MAP PREVIEW */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <MapPin size={15} className="text-blue-400" />
                  <span>Patrol Sector Radar</span>
                </h3>
                <span className="text-xs text-slate-400">
                  Sector: <strong>{officer?.assigned_zone || 'Bengaluru Central'}</strong>
                </span>
              </div>
              <PatrolRadarMap
                patrolUnits={patrolUnits}
                activeIncident={activeIncident}
                officerLat={officerCoords?.latitude}
                officerLng={officerCoords?.longitude}
                onRefresh={fetchUnits}
              />
            </div>
          </div>
        )}

        {/* TAB 2: ACTIVE RESPONSE */}
        {activeTab === 'dispatch' && (
          <div className="space-y-6 animate-fade-in">
            {activeIncident ? (
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-6 shadow-xl">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-800 pb-4">
                  <div>
                    <span className="text-[10px] uppercase font-bold tracking-wider text-rose-400">
                      Emergency Incident #{activeIncident.id}
                    </span>
                    <h2 className="text-lg font-bold text-white mt-0.5">
                      {activeIncident.category} – {activeIncident.locality || 'Unknown Area'}
                    </h2>
                    <p className="text-xs text-slate-400 mt-1">
                      Assigned to Officer <strong>{officer?.name}</strong> ({officer?.badge_number}) • Response Status: <code className="text-amber-400 font-bold">{activeIncident.dispatch_status}</code>
                    </p>
                  </div>

                  {activeIncident.latest_latitude && activeIncident.latest_longitude && (
                    <a
                      href={`https://www.google.com/maps/dir/?api=1&destination=${activeIncident.latest_latitude},${activeIncident.latest_longitude}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3.5 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer self-start"
                    >
                      <Navigation size={14} />
                      <span>Turn-by-Turn GPS Directions</span>
                      <ExternalLink size={12} />
                    </a>
                  )}
                </div>

                {/* 5-STAGE RESPONSE LIFECYCLE CONTROLS */}
                <div className="space-y-2">
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
                    Response Progression Stages:
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                    {[
                      { status: 'ACCEPTED', label: '1. Accepted', desc: 'Unit assigned' },
                      { status: 'EN_ROUTE', label: '2. En Route', desc: 'Officer driving' },
                      { status: 'ARRIVED', label: '3. Arrived', desc: 'Officer on scene' },
                      { status: 'ASSISTANCE_PROVIDED', label: '4. Assistance Given', desc: 'Victim safe' },
                      { status: 'RESOLVED', label: '5. Resolved', desc: 'Incident closed' },
                    ].map((step) => {
                      const isCurrent = activeIncident.dispatch_status === step.status;
                      const order = ['ACCEPTED', 'EN_ROUTE', 'ARRIVED', 'ASSISTANCE_PROVIDED', 'RESOLVED'];
                      const isPast = order.indexOf(activeIncident.dispatch_status) > order.indexOf(step.status as any);

                      return (
                        <button
                          key={step.status}
                          type="button"
                          onClick={() => handleAdvanceStatus(activeIncident.id, step.status as PoliceDispatchLifecycleStatus)}
                          disabled={actionLoading !== null}
                          className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                            isCurrent
                              ? 'bg-amber-500/20 border-amber-500 text-amber-300 shadow-md ring-1 ring-amber-500'
                              : isPast
                              ? 'bg-emerald-950/40 border-emerald-600/40 text-emerald-400'
                              : 'bg-slate-800/60 border-slate-700/60 text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                          }`}
                        >
                          <div className="font-bold text-xs">{step.label}</div>
                          <div className="text-[10px] text-slate-400 mt-0.5">{step.desc}</div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Notes Input */}
                <div className="space-y-2">
                  <label className="block text-xs font-semibold text-slate-300">
                    Officer Incident Notes / Resolution Details:
                  </label>
                  <textarea
                    value={statusNotes}
                    onChange={(e) => setStatusNotes(e.target.value)}
                    placeholder="Enter observations, assistance provided, contact with citizen, medical attention, or case numbers..."
                    className="w-full h-24 px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 resize-none"
                  />
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={() => handleAdvanceStatus(activeIncident.id, activeIncident.dispatch_status)}
                      disabled={!statusNotes.trim() || actionLoading !== null}
                      className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold disabled:opacity-50 cursor-pointer"
                    >
                      Save Notes to Case Log
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 text-center space-y-3">
                <CheckCircle2 size={32} className="mx-auto text-emerald-400" />
                <h3 className="font-bold text-base text-white">No active incident assignment</h3>
                <p className="text-xs text-slate-400 max-w-md mx-auto">
                  When you accept an incoming SOS alert, the live tactical response console with 5-stage lifecycle and victim telemetry appears here.
                </p>
                <button
                  onClick={() => setActiveTab('overview')}
                  className="px-4 py-2 rounded-lg bg-blue-600 text-white text-xs font-semibold cursor-pointer"
                >
                  Return to Console
                </button>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: RADAR MAP */}
        {activeTab === 'radar' && (
          <div className="space-y-4 animate-fade-in">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <MapPin size={18} className="text-blue-400" />
                  <span>City-Wide Patrol Radar Map</span>
                </h2>
                <p className="text-xs text-slate-400">
                  Real-time geographic locations of authorized on-duty patrol vehicles and emergency alerts.
                </p>
              </div>

              <button
                onClick={fetchUnits}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold flex items-center gap-1.5 self-start cursor-pointer"
              >
                <RefreshCw size={13} />
                <span>Refresh Radar</span>
              </button>
            </div>

            <PatrolRadarMap
              patrolUnits={patrolUnits}
              activeIncident={activeIncident}
              officerLat={officerCoords?.latitude}
              officerLng={officerCoords?.longitude}
              onRefresh={fetchUnits}
            />
          </div>
        )}

        {/* TAB 4: CRIME INTELLIGENCE */}
        {activeTab === 'analytics' && (
          <div className="space-y-6 animate-fade-in">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <BarChart3 size={18} className="text-amber-400" />
                  <span>Official Crime Analytics &amp; Weekly Intelligence</span>
                </h2>
                <p className="text-xs text-slate-400">
                  Calculated from verified SafeHer incident registry and emergency dispatches.
                </p>
              </div>

              <a
                href={crimeApi.getWeeklyReportPdfUrl(0)}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3.5 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer self-start"
              >
                <Download size={14} />
                <span>Export Official Intelligence PDF</span>
              </a>
            </div>

            {weeklyReport && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                    <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Report Window</span>
                    <div className="mt-1 text-lg font-bold text-white">{weeklyReport.report_week}</div>
                    <p className="text-[11px] text-slate-400 mt-0.5">Generated {new Date(weeklyReport.generated_at).toLocaleDateString()}</p>
                  </div>

                  <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                    <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Total Verified Incidents</span>
                    <div className="mt-1 text-2xl font-extrabold text-white">{weeklyReport.total_verified_incidents}</div>
                    <p className="text-[11px] text-amber-400 mt-0.5 font-semibold">
                      +{weeklyReport.week_on_week_change_pct}% compared to prior week ({weeklyReport.previous_week_total})
                    </p>
                  </div>

                  <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                    <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Highest Risk Concentration</span>
                    <div className="mt-1 text-xl font-extrabold text-red-400">{weeklyReport.highest_risk_area}</div>
                    <p className="text-[11px] text-slate-400 mt-0.5">Requires enhanced night patrol coverage</p>
                  </div>
                </div>

                {/* RANK 1 / 2 / 3 LEADERBOARD */}
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-3">
                  <h3 className="font-bold text-sm text-white flex items-center gap-2">
                    <TrendingUp size={15} className="text-red-400" />
                    <span>Area Crime Concentrations (Rank 1 to 3)</span>
                  </h3>

                  <div className="divide-y divide-slate-800">
                    {weeklyReport.ranked_areas.slice(0, 3).map((area) => (
                      <div key={area.rank} className="py-3 flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-extrabold text-xs shrink-0 ${
                            area.rank === 1 ? 'bg-red-500/20 text-red-400 border border-red-500/30' :
                            area.rank === 2 ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30' :
                            'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                          }`}>
                            #{area.rank}
                          </div>
                          <div>
                            <strong className="text-white text-sm">{area.locality}</strong>
                            <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5">
                              <span>Primary: {area.primary_category}</span>
                              <span>•</span>
                              <span>Avg Response: {area.avg_response_time_minutes}m</span>
                            </div>
                          </div>
                        </div>

                        <div className="text-right">
                          <div className="text-sm font-extrabold text-white">{area.verified_count} incidents</div>
                          <span className={`text-[10px] font-bold ${
                            area.trend === 'INCREASED' ? 'text-red-400' : 'text-emerald-400'
                          }`}>
                            {area.percentage_change >= 0 ? `+${area.percentage_change}% WoW` : `${area.percentage_change}% WoW`}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* CATEGORY & TIME */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-3">
                    <h3 className="font-bold text-sm text-white">Incident Category Distribution</h3>
                    <div className="space-y-2.5">
                      {weeklyReport.category_distribution.map((cat) => {
                        const pct = Math.round((cat.count / (weeklyReport.total_verified_incidents || 1)) * 100);
                        return (
                          <div key={cat.category} className="space-y-1">
                            <div className="flex justify-between text-xs">
                              <span className="text-slate-300 font-medium">{cat.category}</span>
                              <span className="text-slate-400 font-mono">{cat.count} ({pct}%)</span>
                            </div>
                            <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                              <div 
                                className="bg-blue-500 h-2 rounded-full" 
                                style={{ width: `${pct}%` }} 
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-3">
                    <h3 className="font-bold text-sm text-white">Peak Time-of-Day Analysis</h3>
                    <div className="p-3 rounded-lg bg-blue-950/40 border border-blue-500/20 text-xs text-blue-300">
                      Peak Risk Period: <strong>{weeklyReport.time_of_day_distribution.peak_period}</strong>
                    </div>

                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between py-1 border-b border-slate-800">
                        <span className="text-slate-400">Night (22:00 - 04:00)</span>
                        <strong className="text-white font-mono">{weeklyReport.time_of_day_distribution.night_22_04}</strong>
                      </div>
                      <div className="flex justify-between py-1 border-b border-slate-800">
                        <span className="text-slate-400">Evening (17:00 - 22:00)</span>
                        <strong className="text-white font-mono">{weeklyReport.time_of_day_distribution.evening_17_22}</strong>
                      </div>
                      <div className="flex justify-between py-1 border-b border-slate-800">
                        <span className="text-slate-400">Afternoon (12:00 - 17:00)</span>
                        <strong className="text-white font-mono">{weeklyReport.time_of_day_distribution.afternoon_12_17}</strong>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 5: PATROL PLANNING */}
        {activeTab === 'planning' && (
          <div className="space-y-6 animate-fade-in">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <TrendingUp size={18} className="text-blue-400" />
                  <span>Area Patrol Recommendations &amp; Deployment</span>
                </h2>
                <p className="text-xs text-slate-400">
                  Data-driven deployment orders generated from incident hotspots.
                </p>
              </div>
            </div>

            <div className="space-y-3">
              {patrolRecommendations.map((rec) => (
                <div 
                  key={rec.id}
                  className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <strong className="text-white text-base">{rec.locality}</strong>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        rec.risk_level === 'HIGH' ? 'bg-red-500/20 text-red-400 border border-red-500/30' :
                        rec.risk_level === 'MODERATE' ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30' :
                        'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                      }`}>
                        {rec.risk_level} Risk
                      </span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                        rec.status === 'DEPLOYED' ? 'bg-blue-500/20 text-blue-400' : 'bg-slate-800 text-slate-400'
                      }`}>
                        {rec.status}
                      </span>
                    </div>

                    <p className="text-xs text-slate-300">{rec.reason}</p>

                    <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-400 pt-1">
                      <span>Verified: <strong>{rec.verified_incidents_count}</strong></span>
                      <span>•</span>
                      <span>Trend: <strong className="text-red-400">+{rec.percentage_change}% WoW</strong></span>
                      <span>•</span>
                      <span>Suggested Period: <strong className="text-amber-300">{rec.suggested_patrol_period}</strong></span>
                    </div>
                  </div>

                  {officer?.role === 'SUPERVISOR' && (
                    <button
                      type="button"
                      onClick={() => setAssignModalRec(rec)}
                      className="px-3.5 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs transition-colors shrink-0 cursor-pointer self-start md:self-auto"
                    >
                      Authorize &amp; Deploy Patrol
                    </button>
                  )}
                </div>
              ))}
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-3">
              <h3 className="font-bold text-sm text-white">My Active Patrol Orders</h3>
              {myAssignments.length > 0 ? (
                <div className="divide-y divide-slate-800">
                  {myAssignments.map((a) => (
                    <div key={a.id} className="py-2.5 flex items-center justify-between text-xs">
                      <div>
                        <strong className="text-white">{a.locality}</strong>
                        <p className="text-slate-400 text-[11px]">{a.instructions}</p>
                      </div>
                      <div className="text-right">
                        <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 text-[10px] font-bold">
                          {a.status}
                        </span>
                        <div className="text-slate-400 text-[10px] mt-0.5">{a.shift_period}</div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-400">No specific patrol deployment orders assigned to your badge today.</p>
              )}
            </div>
          </div>
        )}

        {/* TAB 6: AUDIT & HISTORY */}
        {activeTab === 'history' && (
          <div className="space-y-4 animate-fade-in">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Clock size={18} className="text-blue-400" />
              <span>Incident Response Log &amp; Resolution Audit</span>
            </h2>

            {incidentHistory.length > 0 ? (
              <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-800/60 border-b border-slate-800 text-slate-400 font-semibold uppercase tracking-wider">
                      <tr>
                        <th className="px-4 py-3">Incident ID</th>
                        <th className="px-4 py-3">Category</th>
                        <th className="px-4 py-3">Locality</th>
                        <th className="px-4 py-3">Dispatched / Accepted</th>
                        <th className="px-4 py-3">Lifecycle Status</th>
                        <th className="px-4 py-3">Resolution Notes</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800 text-slate-300">
                      {incidentHistory.map((inc) => (
                        <tr key={inc.id} className="hover:bg-slate-800/40">
                          <td className="px-4 py-3 font-mono font-bold text-white">#{inc.id}</td>
                          <td className="px-4 py-3 font-medium text-slate-200">{inc.category}</td>
                          <td className="px-4 py-3">{inc.locality || 'Unknown'}, {inc.city}</td>
                          <td className="px-4 py-3 text-slate-400">
                            {new Date(inc.start_time).toLocaleString()}
                          </td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              inc.dispatch_status === 'RESOLVED' ? 'bg-emerald-500/20 text-emerald-400' :
                              'bg-amber-500/20 text-amber-400'
                            }`}>
                              {inc.dispatch_status}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-slate-400 max-w-xs truncate">
                            {inc.notes || '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 text-center text-xs text-slate-400">
                No historical incident assignments recorded for Officer {officer?.name}.
              </div>
            )}
          </div>
        )}

      </main>

      {/* SUPERVISOR DEPLOYMENT MODAL */}
      {assignModalRec && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-xl max-w-md w-full p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-sm text-white flex items-center gap-2">
                <ShieldAlert size={16} className="text-amber-400" />
                <span>Deploy Patrol: {assignModalRec.locality}</span>
              </h3>
              <button
                type="button"
                onClick={() => setAssignModalRec(null)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSupervisorAssign} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 mb-1 font-semibold">Select Patrol Officer:</label>
                <select
                  value={assignOfficerId}
                  onChange={(e) => setAssignOfficerId(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-white focus:outline-none focus:border-blue-500"
                >
                  <option value={1}>Inspector Priya Sharma (POL-101)</option>
                  <option value={2}>Officer Ramesh Kumar (POL-102)</option>
                  <option value={3}>Officer Ananya Patel (POL-103)</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-semibold">Shift Schedule Period:</label>
                <input
                  type="text"
                  value={assignShift}
                  onChange={(e) => setAssignShift(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-white focus:outline-none focus:border-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-semibold">Patrol Directive / Special Instructions:</label>
                <textarea
                  value={assignInstructions}
                  onChange={(e) => setAssignInstructions(e.target.value)}
                  placeholder="e.g. Heightened foot patrol near transit hub. Conduct stop-and-checks."
                  className="w-full h-20 px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-white focus:outline-none focus:border-blue-500 resize-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setAssignModalRec(null)}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading !== null}
                  className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold cursor-pointer"
                >
                  Authorize Deployment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
