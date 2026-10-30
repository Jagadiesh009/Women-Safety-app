import React, { useState, useEffect, useCallback } from 'react';
import { 
  ShieldCheck, 
  Users, 
  Radio, 
  CheckCircle2, 
  AlertTriangle, 
  PlusCircle, 
  RefreshCw, 
  LogOut, 
  Lock, 
  Search, 
  MapPin, 
  ExternalLink, 
  Trash2, 
  FileText, 
  UserPlus, 
  Send, 
  Building, 
  Check, 
  X, 
  Activity, 
  Layers
} from 'lucide-react';
import { useAdminAuth } from '../../context/AdminAuthContext';
import { adminApi } from '../../services/api';
import type { 
  PageView,
  AdminComprehensiveStats, 
  AdminOfficerItem, 
  AdminCrimeReportItem, 
  AdminAdvisoryItem, 
  AdminPatrolRecommendation,
  AdminOfficerCreatePayload,
  AdminAdvisoryPayload
} from '../../types';

interface AdminDashboardProps {
  onLogout: () => void;
  onNavigatePublic?: (view: PageView) => void;
}

type AdminTab = 'incidents' | 'officers' | 'crime' | 'advisories' | 'patrol';

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ onLogout, onNavigatePublic }) => {
  const { adminUser, logoutAdmin } = useAdminAuth();

  const [activeTab, setActiveTab] = useState<AdminTab>('incidents');
  const [stats, setStats] = useState<AdminComprehensiveStats | null>(null);
  const [incidents, setIncidents] = useState<any[]>([]);
  const [officers, setOfficers] = useState<AdminOfficerItem[]>([]);
  const [crimeReports, setCrimeReports] = useState<AdminCrimeReportItem[]>([]);
  const [advisories, setAdvisories] = useState<AdminAdvisoryItem[]>([]);
  const [recommendations, setRecommendations] = useState<AdminPatrolRecommendation[]>([]);

  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [actionMessage, setActionMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Officer creation modal
  const [showOfficerModal, setShowOfficerModal] = useState(false);
  const [officerForm, setOfficerForm] = useState<AdminOfficerCreatePayload>({
    badge_number: '',
    name: '',
    email: '',
    password: '',
    phone: '',
    rank: 'Patrol Officer',
    role: 'OFFICER',
    station_name: 'Central Police Station',
    assigned_zone: 'Indiranagar'
  });
  const [submittingOfficer, setSubmittingOfficer] = useState(false);

  // Advisory creation form
  const [showAdvisoryModal, setShowAdvisoryModal] = useState(false);
  const [advisoryForm, setAdvisoryForm] = useState<AdminAdvisoryPayload>({
    locality: 'Indiranagar',
    title: '',
    advisory: '',
    precautions: '',
    severity: 'WARNING',
    issuing_authority: 'Bengaluru City Police & SafeHer HQ',
    expires_days: 7
  });
  const [submittingAdvisory, setSubmittingAdvisory] = useState(false);

  // Filter state for officers & incidents
  const [officerSearch, setOfficerSearch] = useState('');
  const [incidentFilter, setIncidentFilter] = useState<'ALL' | 'ACTIVE' | 'RESOLVED'>('ALL');

  const showNotification = (text: string, type: 'success' | 'error' = 'success') => {
    setActionMessage({ text, type });
    setTimeout(() => setActionMessage(null), 4000);
  };

  const loadAllData = useCallback(async (isSilent = false) => {
    if (!isSilent) setRefreshing(true);
    try {
      const [
        statsData,
        incidentsData,
        officersData,
        crimeData,
        advisoriesData,
        recsData
      ] = await Promise.all([
        adminApi.getStats().catch(() => null),
        adminApi.getIncidents().catch(() => []),
        adminApi.getOfficers().catch(() => []),
        adminApi.getCrimeReports(false).catch(() => []),
        adminApi.getAdvisories().catch(() => []),
        adminApi.getPatrolRecommendations().catch(() => [])
      ]);

      if (statsData) setStats(statsData);
      setIncidents(incidentsData);
      setOfficers(officersData);
      setCrimeReports(crimeData);
      setAdvisories(advisoriesData);
      setRecommendations(recsData);
    } catch (err: any) {
      console.error('[AdminDashboard] Error loading data:', err);
      showNotification('Failed to refresh data from server', 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadAllData();
    // Auto-poll live data every 6 seconds
    const interval = setInterval(() => {
      loadAllData(true);
    }, 6000);
    return () => clearInterval(interval);
  }, [loadAllData]);

  // Actions
  const handleResolveIncident = async (id: number) => {
    try {
      await adminApi.resolveIncident(id);
      showNotification(`Incident #${id} resolved successfully.`);
      loadAllData(true);
    } catch (err: any) {
      showNotification(err.message || 'Failed to resolve incident', 'error');
    }
  };

  const handleResolveAllIncidents = async () => {
    if (!window.confirm('Are you sure you want to resolve all currently unresolved incidents?')) return;
    try {
      const res = await adminApi.resolveAllIncidents();
      showNotification(res.message || 'All incidents resolved successfully.');
      loadAllData(true);
    } catch (err: any) {
      showNotification(err.message || 'Failed to resolve incidents', 'error');
    }
  };

  const handleToggleOfficerStatus = async (officerId: number, currentActive: boolean) => {
    try {
      await adminApi.toggleOfficerStatus(officerId, !currentActive);
      showNotification(`Officer account status updated.`);
      loadAllData(true);
    } catch (err: any) {
      showNotification(err.message || 'Failed to toggle status', 'error');
    }
  };

  const handleCreateOfficer = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingOfficer(true);
    try {
      await adminApi.createOfficer(officerForm);
      showNotification(`Officer ${officerForm.badge_number} provisioned successfully.`);
      setShowOfficerModal(false);
      setOfficerForm({
        badge_number: '',
        name: '',
        email: '',
        password: '',
        phone: '',
        rank: 'Patrol Officer',
        role: 'OFFICER',
        station_name: 'Central Police Station',
        assigned_zone: 'Indiranagar'
      });
      loadAllData(true);
    } catch (err: any) {
      showNotification(err.message || 'Failed to provision officer', 'error');
    } finally {
      setSubmittingOfficer(false);
    }
  };

  const handleVerifyCrimeReport = async (incidentId: number, currentVerified: boolean) => {
    try {
      await adminApi.verifyCrimeReport(incidentId, !currentVerified);
      showNotification(`Incident #${incidentId} verification updated.`);
      loadAllData(true);
    } catch (err: any) {
      showNotification(err.message || 'Failed to update verification', 'error');
    }
  };

  const handleCreateAdvisory = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingAdvisory(true);
    try {
      await adminApi.publishAdvisory(advisoryForm);
      showNotification('Official safety advisory published to public safety radar.');
      setShowAdvisoryModal(false);
      setAdvisoryForm({
        locality: 'Indiranagar',
        title: '',
        advisory: '',
        precautions: '',
        severity: 'WARNING',
        issuing_authority: 'Bengaluru City Police & SafeHer HQ',
        expires_days: 7
      });
      loadAllData(true);
    } catch (err: any) {
      showNotification(err.message || 'Failed to publish advisory', 'error');
    } finally {
      setSubmittingAdvisory(false);
    }
  };

  const handleToggleAdvisory = async (advisoryId: number) => {
    try {
      await adminApi.toggleAdvisory(advisoryId);
      showNotification('Advisory visibility toggled.');
      loadAllData(true);
    } catch (err: any) {
      showNotification(err.message || 'Failed to toggle advisory', 'error');
    }
  };

  const handleDeleteAdvisory = async (advisoryId: number) => {
    if (!window.confirm('Delete this official safety advisory permanently?')) return;
    try {
      await adminApi.deleteAdvisory(advisoryId);
      showNotification('Advisory deleted.');
      loadAllData(true);
    } catch (err: any) {
      showNotification(err.message || 'Failed to delete advisory', 'error');
    }
  };

  const handleApproveRecommendation = async (recId: number) => {
    try {
      await adminApi.approvePatrolRecommendation(recId);
      showNotification(`Patrol deployment #${recId} approved successfully.`);
      loadAllData(true);
    } catch (err: any) {
      showNotification(err.message || 'Failed to approve recommendation', 'error');
    }
  };

  const handleSignOut = () => {
    logoutAdmin();
    onLogout();
  };

  // Filtered lists
  const filteredOfficers = officers.filter(o => 
    o.name.toLowerCase().includes(officerSearch.toLowerCase()) ||
    o.badge_number.toLowerCase().includes(officerSearch.toLowerCase()) ||
    o.assigned_zone.toLowerCase().includes(officerSearch.toLowerCase())
  );

  const filteredIncidents = incidents.filter(i => {
    if (incidentFilter === 'ACTIVE') return i.status === 'ACTIVE' || !i.status;
    if (incidentFilter === 'RESOLVED') return i.status === 'RESOLVED';
    return true;
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-6 text-center">
        <div className="w-12 h-12 rounded-2xl bg-indigo-950 border border-indigo-500/30 p-2 shadow-lg mb-4 animate-pulse flex items-center justify-center">
          <Lock className="w-6 h-6 text-indigo-400" />
        </div>
        <p className="text-sm font-bold text-white">SafeHer HQ Command Center</p>
        <p className="text-xs text-slate-400 mt-1">Connecting to master telemetry database...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-indigo-600 selection:text-white">
      
      {/* Top Admin Header */}
      <header className="border-b border-slate-800 bg-slate-900/90 backdrop-blur-md sticky top-0 z-30 px-4 sm:px-6 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-600 to-rose-600 p-0.5 flex items-center justify-center shrink-0 shadow-lg shadow-indigo-950/50">
              <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
                <Lock className="w-4 h-4 text-indigo-400" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-base tracking-tight text-white">SafeHer HQ</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 uppercase tracking-wider">
                  Admin Command
                </span>
                <span className="flex items-center gap-1 text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  Live Telemetry
                </span>
              </div>
              <p className="text-xs text-slate-400 hidden sm:block">
                Master incident dispatch, police officer commissioning, and community safety governance
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={() => loadAllData()}
              disabled={refreshing}
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer border border-slate-700/60"
              title="Refresh Data"
            >
              <RefreshCw size={14} className={refreshing ? 'animate-spin text-indigo-400' : ''} />
            </button>

            {onNavigatePublic && (
              <button
                onClick={() => onNavigatePublic('crime-map')}
                className="hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700/60 cursor-pointer"
              >
                <Radio size={12} className="text-amber-400" />
                <span>Crime Map</span>
              </button>
            )}

            <div className="hidden sm:flex items-center gap-2 pl-2 border-l border-slate-800 text-xs text-slate-300 font-mono">
              <span className="text-slate-500">Admin:</span>
              <span className="text-indigo-400 font-bold">{adminUser?.admin_id || 'admin'}</span>
            </div>

            <button
              onClick={handleSignOut}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 transition-colors cursor-pointer"
            >
              <LogOut size={13} />
              <span className="hidden sm:inline">Sign Out</span>
            </button>
          </div>
        </div>
      </header>

      {/* Global Action Message Toast */}
      {actionMessage && (
        <div className={`py-2 px-4 text-center text-xs font-medium transition-all ${
          actionMessage.type === 'success' 
            ? 'bg-emerald-950/80 text-emerald-300 border-b border-emerald-800/40' 
            : 'bg-rose-950/80 text-rose-300 border-b border-rose-800/40'
        }`}>
          {actionMessage.text}
        </div>
      )}

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 space-y-6">

        {/* METRICS OVERVIEW BAR */}
        <section className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 shadow-sm">
            <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
              <span>Citizens</span>
              <Users size={14} className="text-indigo-400" />
            </div>
            <div className="text-2xl font-black text-white">{stats ? stats.total_users : '...'}</div>
            <div className="text-[10px] text-slate-500 mt-0.5">Registered accounts</div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 shadow-sm">
            <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
              <span>Police Force</span>
              <ShieldCheck size={14} className="text-blue-400" />
            </div>
            <div className="text-2xl font-black text-white">{stats ? stats.total_officers : '...'}</div>
            <div className="text-[10px] text-emerald-400 mt-0.5">
              {stats ? `${stats.on_duty_officers} ON DUTY` : 'Loading...'}
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 shadow-sm">
            <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
              <span>Pending SOS</span>
              <AlertTriangle size={14} className="text-rose-400" />
            </div>
            <div className="text-2xl font-black text-rose-400">{stats ? stats.pending_incidents : '...'}</div>
            <div className="text-[10px] text-slate-500 mt-0.5">Awaiting assignment</div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 shadow-sm">
            <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
              <span>Active Dispatches</span>
              <Activity size={14} className="text-amber-400" />
            </div>
            <div className="text-2xl font-black text-amber-400">{stats ? stats.active_responses : '...'}</div>
            <div className="text-[10px] text-slate-500 mt-0.5">Officers in response</div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 shadow-sm">
            <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
              <span>Resolved</span>
              <CheckCircle2 size={14} className="text-emerald-400" />
            </div>
            <div className="text-2xl font-black text-emerald-400">{stats ? stats.resolved_incidents : '...'}</div>
            <div className="text-[10px] text-slate-500 mt-0.5">Completed emergencies</div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 shadow-sm">
            <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
              <span>Verified Crime</span>
              <Layers size={14} className="text-purple-400" />
            </div>
            <div className="text-2xl font-black text-purple-400">{stats ? stats.verified_crime_reports : '...'}</div>
            <div className="text-[10px] text-slate-500 mt-0.5">Community reports verified</div>
          </div>
        </section>

        {/* TAB NAVIGATION */}
        <div className="flex items-center gap-1 border-b border-slate-800 pb-2 overflow-x-auto">
          <button
            onClick={() => setActiveTab('incidents')}
            className={`px-3.5 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'incidents'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <AlertTriangle size={14} />
            <span>Live SOS Incidents ({incidents.filter(i => i.status === 'ACTIVE' || !i.status).length})</span>
          </button>

          <button
            onClick={() => setActiveTab('officers')}
            className={`px-3.5 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'officers'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <ShieldCheck size={14} />
            <span>Police Officers ({officers.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('crime')}
            className={`px-3.5 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'crime'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <FileText size={14} />
            <span>Crime Intelligence &amp; Verification</span>
          </button>

          <button
            onClick={() => setActiveTab('advisories')}
            className={`px-3.5 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'advisories'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <Radio size={14} />
            <span>Safety Advisories ({advisories.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('patrol')}
            className={`px-3.5 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'patrol'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <Building size={14} />
            <span>Patrol Recommendations ({recommendations.length})</span>
          </button>
        </div>

        {/* TAB 1: LIVE INCIDENTS & DISPATCH MONITOR */}
        {activeTab === 'incidents' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900/60 p-3 rounded-xl border border-slate-800">
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400">Filter status:</span>
                <div className="inline-flex rounded-lg bg-slate-950 p-1 border border-slate-800 text-xs">
                  <button
                    onClick={() => setIncidentFilter('ALL')}
                    className={`px-2.5 py-1 rounded-md font-medium transition-all cursor-pointer ${
                      incidentFilter === 'ALL' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    All ({incidents.length})
                  </button>
                  <button
                    onClick={() => setIncidentFilter('ACTIVE')}
                    className={`px-2.5 py-1 rounded-md font-medium transition-all cursor-pointer ${
                      incidentFilter === 'ACTIVE' ? 'bg-rose-600 text-white' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Active ({incidents.filter(i => i.status === 'ACTIVE' || !i.status).length})
                  </button>
                  <button
                    onClick={() => setIncidentFilter('RESOLVED')}
                    className={`px-2.5 py-1 rounded-md font-medium transition-all cursor-pointer ${
                      incidentFilter === 'RESOLVED' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Resolved ({incidents.filter(i => i.status === 'RESOLVED').length})
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleResolveAllIncidents}
                  className="px-3 py-1.5 rounded-lg bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/30 text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors"
                >
                  <Check size={13} />
                  <span>Resolve All Unresolved</span>
                </button>
              </div>
            </div>

            {/* Incidents Table / Cards */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
              {filteredIncidents.length === 0 ? (
                <div className="py-12 text-center text-slate-500 text-xs">
                  No incidents matching the selected filter.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-950/70 text-slate-400 uppercase tracking-wider text-[10px] border-b border-slate-800">
                      <tr>
                        <th className="py-3 px-4">ID</th>
                        <th className="py-3 px-4">Citizen / User</th>
                        <th className="py-3 px-4">Type &amp; Locality</th>
                        <th className="py-3 px-4">Trigger</th>
                        <th className="py-3 px-4">Status</th>
                        <th className="py-3 px-4">Dispatch</th>
                        <th className="py-3 px-4">Timestamp</th>
                        <th className="py-3 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 text-slate-300">
                      {filteredIncidents.map((inc) => {
                        const isResolved = inc.status === 'RESOLVED';
                        const firstLoc = inc.locations && inc.locations.length > 0 ? inc.locations[0] : null;

                        return (
                          <tr key={inc.id} className="hover:bg-slate-800/40 transition-colors">
                            <td className="py-3 px-4 font-mono font-bold text-indigo-400">
                              #{inc.id}
                            </td>
                            <td className="py-3 px-4">
                              <div className="font-semibold text-white">
                                {inc.user?.name || 'Anonymous User'}
                              </div>
                              <div className="text-[11px] text-slate-400 font-mono">
                                {inc.user?.phone || inc.user?.email || 'No contact'}
                              </div>
                            </td>
                            <td className="py-3 px-4">
                              <div className="text-white font-medium">{inc.category || inc.type || 'SOS Emergency'}</div>
                              <div className="flex items-center gap-1 text-[11px] text-slate-400">
                                <MapPin size={11} className="text-rose-400 shrink-0" />
                                <span>{inc.locality || 'Central Bengaluru'}</span>
                              </div>
                            </td>
                            <td className="py-3 px-4">
                              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-slate-800 text-slate-300 border border-slate-700">
                                {inc.trigger_source || 'MANUAL'}
                              </span>
                            </td>
                            <td className="py-3 px-4">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                isResolved 
                                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                                  : 'bg-rose-500/10 text-rose-400 border border-rose-500/20 animate-pulse'
                              }`}>
                                {inc.status || 'ACTIVE'}
                              </span>
                            </td>
                            <td className="py-3 px-4">
                              <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                                {inc.dispatch_status || 'UNASSIGNED'}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-slate-400 text-[11px] font-mono whitespace-nowrap">
                              {inc.start_time ? new Date(inc.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'N/A'}
                            </td>
                            <td className="py-3 px-4 text-right">
                              <div className="inline-flex items-center gap-1.5">
                                {firstLoc && (
                                  <a
                                    href={`https://www.google.com/maps?q=${firstLoc.latitude},${firstLoc.longitude}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                                    title="View GPS on Google Maps"
                                  >
                                    <ExternalLink size={13} />
                                  </a>
                                )}
                                {!isResolved && (
                                  <button
                                    onClick={() => handleResolveIncident(inc.id)}
                                    className="px-2 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-[10px] cursor-pointer transition-colors shadow-xs"
                                  >
                                    Resolve
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: POLICE OFFICERS PROVISIONING & ROSTER */}
        {activeTab === 'officers' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900/60 p-3 rounded-xl border border-slate-800">
              <div className="relative flex-1 max-w-sm">
                <input
                  type="text"
                  value={officerSearch}
                  onChange={(e) => setOfficerSearch(e.target.value)}
                  placeholder="Search officers by badge, name, or zone..."
                  className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
                <Search size={13} className="absolute left-2.5 top-2 text-slate-500" />
              </div>

              <button
                onClick={() => setShowOfficerModal(true)}
                className="px-3.5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center justify-center gap-2 cursor-pointer shadow-sm transition-colors"
              >
                <UserPlus size={14} />
                <span>Commission New Officer</span>
              </button>
            </div>

            {/* Officers Roster Table */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950/70 text-slate-400 uppercase tracking-wider text-[10px] border-b border-slate-800">
                    <tr>
                      <th className="py-3 px-4">Badge ID</th>
                      <th className="py-3 px-4">Officer Name &amp; Rank</th>
                      <th className="py-3 px-4">Role</th>
                      <th className="py-3 px-4">Station &amp; Patrol Zone</th>
                      <th className="py-3 px-4">Duty Status</th>
                      <th className="py-3 px-4">Account Status</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 text-slate-300">
                    {filteredOfficers.map((off) => (
                      <tr key={off.id} className="hover:bg-slate-800/40 transition-colors">
                        <td className="py-3 px-4 font-mono font-bold text-amber-400">
                          {off.badge_number}
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-semibold text-white">{off.name}</div>
                          <div className="text-[11px] text-slate-400">{off.rank} • {off.email}</div>
                        </td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            off.role === 'SUPERVISOR'
                              ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                              : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                          }`}>
                            {off.role}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <div className="text-white font-medium">{off.station_name}</div>
                          <div className="text-[11px] text-slate-400">Zone: {off.assigned_zone}</div>
                        </td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold inline-flex items-center gap-1 ${
                            off.is_on_duty
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              : 'bg-slate-800 text-slate-400 border border-slate-700'
                          }`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${off.is_on_duty ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'}`}></span>
                            <span>{off.is_on_duty ? 'ON DUTY' : 'OFF DUTY'}</span>
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            off.is_active
                              ? 'bg-emerald-500/10 text-emerald-400'
                              : 'bg-rose-500/10 text-rose-400'
                          }`}>
                            {off.is_active ? 'Active' : 'Deactivated'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() => handleToggleOfficerStatus(off.id, off.is_active)}
                            className={`px-2.5 py-1 rounded text-[10px] font-semibold transition-colors cursor-pointer border ${
                              off.is_active
                                ? 'bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border-rose-500/30'
                                : 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                            }`}
                          >
                            {off.is_active ? 'Deactivate' : 'Activate'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: CRIME INTELLIGENCE & VERIFICATION */}
        {activeTab === 'crime' && (
          <div className="space-y-6">
            {/* Locality Rankings Overview */}
            {stats && stats.locality_crime_rankings && stats.locality_crime_rankings.length > 0 && (
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Locality Concentration &amp; Risk Hierarchy
                  </h3>
                  <span className="text-[11px] text-slate-500 font-mono">Last 30 Days Telemetry</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2.5">
                  {stats.locality_crime_rankings.map((rk, idx) => (
                    <div key={rk.locality} className="bg-slate-950 p-2.5 rounded-lg border border-slate-800">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-semibold text-white">#{idx + 1} {rk.locality}</span>
                        <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold ${
                          rk.risk_level === 'HIGH' ? 'bg-red-500/20 text-red-400' :
                          rk.risk_level === 'MODERATE' ? 'bg-amber-500/20 text-amber-400' :
                          'bg-emerald-500/20 text-emerald-400'
                        }`}>
                          {rk.risk_level}
                        </span>
                      </div>
                      <div className="text-lg font-black text-slate-200 mt-1">{rk.count} reports</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Reports List */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
              <div className="p-4 border-b border-slate-800 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white">Community &amp; Emergency Incident Reports</h3>
                  <p className="text-xs text-slate-400">Review civilian reports and grant official verification for public crime maps.</p>
                </div>
                <span className="text-xs font-mono text-slate-400">Total: {crimeReports.length}</span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950/70 text-slate-400 uppercase tracking-wider text-[10px] border-b border-slate-800">
                    <tr>
                      <th className="py-3 px-4">ID</th>
                      <th className="py-3 px-4">Locality &amp; City</th>
                      <th className="py-3 px-4">Category</th>
                      <th className="py-3 px-4">Reporter</th>
                      <th className="py-3 px-4">Verification</th>
                      <th className="py-3 px-4">Timestamp</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 text-slate-300">
                    {crimeReports.map((cr) => (
                      <tr key={cr.id} className="hover:bg-slate-800/40 transition-colors">
                        <td className="py-3 px-4 font-mono font-bold text-indigo-400">
                          #{cr.id}
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-semibold text-white">{cr.locality}</div>
                          <div className="text-[11px] text-slate-400">{cr.city}</div>
                        </td>
                        <td className="py-3 px-4">
                          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-800 text-slate-300 border border-slate-700">
                            {cr.category}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-400">
                          {cr.user_name || 'Anonymous User'}
                        </td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            cr.is_verified
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                          }`}>
                            {cr.is_verified ? 'Officially Verified' : 'Community Unverified'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-400 font-mono text-[11px]">
                          {cr.start_time ? new Date(cr.start_time).toLocaleDateString() : 'N/A'}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() => handleVerifyCrimeReport(cr.id, cr.is_verified)}
                            className={`px-2.5 py-1 rounded text-[10px] font-semibold transition-colors cursor-pointer border ${
                              cr.is_verified
                                ? 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border-amber-500/30'
                                : 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                            }`}
                          >
                            {cr.is_verified ? 'Revoke Verification' : 'Verify Report'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: SAFETY ADVISORIES & BROADCASTS */}
        {activeTab === 'advisories' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between bg-slate-900/60 p-3 rounded-xl border border-slate-800">
              <div>
                <h3 className="text-sm font-bold text-white">Community Safety Advisories</h3>
                <p className="text-xs text-slate-400">Publish high-priority official alerts to the public Safety Radar map.</p>
              </div>

              <button
                onClick={() => setShowAdvisoryModal(true)}
                className="px-3.5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors shadow-sm"
              >
                <PlusCircle size={14} />
                <span>Publish New Advisory</span>
              </button>
            </div>

            {/* Advisories Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {advisories.map((adv) => (
                <div key={adv.id} className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3 relative overflow-hidden">
                  <div className={`absolute top-0 left-0 right-0 h-1 ${
                    adv.severity === 'CRITICAL' ? 'bg-red-500' :
                    adv.severity === 'WARNING' ? 'bg-amber-500' : 'bg-blue-500'
                  }`}></div>

                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${
                          adv.severity === 'CRITICAL' ? 'bg-red-500/10 text-red-400 border border-red-500/20' :
                          adv.severity === 'WARNING' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                          'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                        }`}>
                          {adv.severity}
                        </span>
                        <span className="text-[11px] text-slate-400 font-semibold">{adv.locality}</span>
                      </div>
                      <h4 className="font-bold text-white text-sm">{adv.title}</h4>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleToggleAdvisory(adv.id)}
                        className={`px-2 py-1 rounded text-[10px] font-semibold cursor-pointer border ${
                          adv.is_active
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                            : 'bg-slate-800 text-slate-500 border-slate-700'
                        }`}
                      >
                        {adv.is_active ? 'Active' : 'Inactive'}
                      </button>
                      <button
                        onClick={() => handleDeleteAdvisory(adv.id)}
                        className="p-1 rounded bg-slate-800 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 transition-colors cursor-pointer"
                        title="Delete Advisory"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>

                  <p className="text-xs text-slate-300 leading-relaxed">{adv.advisory}</p>

                  {adv.precautions && (
                    <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800/80 text-[11px] text-slate-400">
                      <strong className="text-slate-200">Precaution:</strong> {adv.precautions}
                    </div>
                  )}

                  <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono pt-1 border-t border-slate-800/60">
                    <span>Issued by: {adv.issuing_authority}</span>
                    <span>{adv.created_at ? new Date(adv.created_at).toLocaleDateString() : ''}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 5: PATROL RECOMMENDATIONS & DEPLOYMENT */}
        {activeTab === 'patrol' && (
          <div className="space-y-4">
            <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-800">
              <h3 className="text-sm font-bold text-white">Algorithmic Patrol Optimization</h3>
              <p className="text-xs text-slate-400">
                Automated recommendations derived from week-on-week verified crime volume spikes and incident clustering.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {recommendations.map((rec) => (
                <div key={rec.id} className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3 relative overflow-hidden">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                          rec.risk_level === 'HIGH' ? 'bg-red-500/10 text-red-400 border border-red-500/20' :
                          'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                        }`}>
                          {rec.risk_level} RISK
                        </span>
                        <span className="font-bold text-white text-base">{rec.locality}</span>
                      </div>
                      <div className="text-xs text-slate-400">
                        Suggested Shift: <span className="text-indigo-400 font-semibold">{rec.suggested_patrol_period}</span>
                      </div>
                    </div>

                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                      rec.status === 'DEPLOYED' ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20' :
                      rec.status === 'APPROVED' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                      'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                    }`}>
                      {rec.status}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 bg-slate-950 p-2.5 rounded-lg border border-slate-800 text-center font-mono">
                    <div>
                      <div className="text-[10px] text-slate-500">Current Week</div>
                      <div className="text-sm font-bold text-white">{rec.verified_incidents_count}</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-500">Prev Week</div>
                      <div className="text-sm font-bold text-slate-400">{rec.previous_week_count}</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-500">Growth</div>
                      <div className="text-sm font-bold text-rose-400">+{rec.percentage_change}%</div>
                    </div>
                  </div>

                  <p className="text-xs text-slate-300 leading-relaxed">{rec.reason}</p>

                  <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
                    <span className="text-[11px] text-slate-400">Categories: {rec.primary_categories}</span>
                    {rec.status === 'PENDING' && (
                      <button
                        onClick={() => handleApproveRecommendation(rec.id)}
                        className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs cursor-pointer shadow-xs transition-colors flex items-center gap-1"
                      >
                        <Check size={13} />
                        <span>Approve Deployment</span>
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      </main>

      {/* MODAL: PROVISION NEW OFFICER */}
      {showOfficerModal && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl relative">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2 text-white font-bold text-sm">
                <ShieldCheck className="text-indigo-400" size={18} />
                <span>Commission New Police Officer</span>
              </div>
              <button
                onClick={() => setShowOfficerModal(false)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateOfficer} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 font-semibold mb-1 uppercase tracking-wider text-[10px]">
                    Badge Number *
                  </label>
                  <input
                    type="text"
                    value={officerForm.badge_number}
                    onChange={(e) => setOfficerForm({ ...officerForm, badge_number: e.target.value })}
                    placeholder="e.g. POL-104"
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-white font-mono focus:outline-none focus:border-indigo-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-slate-400 font-semibold mb-1 uppercase tracking-wider text-[10px]">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    value={officerForm.name}
                    onChange={(e) => setOfficerForm({ ...officerForm, name: e.target.value })}
                    placeholder="e.g. Inspector Rajesh Rao"
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-indigo-500"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 font-semibold mb-1 uppercase tracking-wider text-[10px]">
                    Department Email *
                  </label>
                  <input
                    type="email"
                    value={officerForm.email}
                    onChange={(e) => setOfficerForm({ ...officerForm, email: e.target.value })}
                    placeholder="rajesh.rao@police.gov.in"
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-indigo-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-slate-400 font-semibold mb-1 uppercase tracking-wider text-[10px]">
                    Temporary Password *
                  </label>
                  <input
                    type="password"
                    value={officerForm.password}
                    onChange={(e) => setOfficerForm({ ...officerForm, password: e.target.value })}
                    placeholder="••••••••••••"
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-white font-mono focus:outline-none focus:border-indigo-500"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 font-semibold mb-1 uppercase tracking-wider text-[10px]">
                    Rank
                  </label>
                  <input
                    type="text"
                    value={officerForm.rank}
                    onChange={(e) => setOfficerForm({ ...officerForm, rank: e.target.value })}
                    placeholder="Patrol Officer / Sub-Inspector / Inspector"
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 font-semibold mb-1 uppercase tracking-wider text-[10px]">
                    Role Designation
                  </label>
                  <select
                    value={officerForm.role}
                    onChange={(e) => setOfficerForm({ ...officerForm, role: e.target.value as 'OFFICER' | 'SUPERVISOR' })}
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value="OFFICER">OFFICER (Patrol &amp; Dispatch Response)</option>
                    <option value="SUPERVISOR">SUPERVISOR (Deployment &amp; Directives)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 font-semibold mb-1 uppercase tracking-wider text-[10px]">
                    Police Station
                  </label>
                  <input
                    type="text"
                    value={officerForm.station_name}
                    onChange={(e) => setOfficerForm({ ...officerForm, station_name: e.target.value })}
                    placeholder="Indiranagar Police Station"
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 font-semibold mb-1 uppercase tracking-wider text-[10px]">
                    Patrol Zone
                  </label>
                  <input
                    type="text"
                    value={officerForm.assigned_zone}
                    onChange={(e) => setOfficerForm({ ...officerForm, assigned_zone: e.target.value })}
                    placeholder="Indiranagar"
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1 uppercase tracking-wider text-[10px]">
                  Emergency Mobile Contact
                </label>
                <input
                  type="tel"
                  value={officerForm.phone}
                  onChange={(e) => setOfficerForm({ ...officerForm, phone: e.target.value })}
                  placeholder="+91 98765 43210"
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowOfficerModal(false)}
                  className="px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingOfficer}
                  className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-sm disabled:opacity-50"
                >
                  {submittingOfficer ? 'Provisioning...' : 'Commission Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: PUBLISH SAFETY ADVISORY */}
      {showAdvisoryModal && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl relative">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2 text-white font-bold text-sm">
                <Radio className="text-amber-400" size={18} />
                <span>Publish Public Safety Advisory</span>
              </div>
              <button
                onClick={() => setShowAdvisoryModal(false)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateAdvisory} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 font-semibold mb-1 uppercase tracking-wider text-[10px]">
                    Locality / Area *
                  </label>
                  <input
                    type="text"
                    value={advisoryForm.locality}
                    onChange={(e) => setAdvisoryForm({ ...advisoryForm, locality: e.target.value })}
                    placeholder="e.g. Indiranagar"
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-indigo-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-slate-400 font-semibold mb-1 uppercase tracking-wider text-[10px]">
                    Severity Level
                  </label>
                  <select
                    value={advisoryForm.severity}
                    onChange={(e) => setAdvisoryForm({ ...advisoryForm, severity: e.target.value as any })}
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value="CRITICAL">CRITICAL (High Risk Alert)</option>
                    <option value="WARNING">WARNING (Precautionary Notice)</option>
                    <option value="ADVISORY">ADVISORY (General Notice)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1 uppercase tracking-wider text-[10px]">
                  Advisory Headline *
                </label>
                <input
                  type="text"
                  value={advisoryForm.title}
                  onChange={(e) => setAdvisoryForm({ ...advisoryForm, title: e.target.value })}
                  placeholder="e.g. Heightened Evening Patrol along Metro Corridor"
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-indigo-500"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1 uppercase tracking-wider text-[10px]">
                  Official Directive / Body *
                </label>
                <textarea
                  value={advisoryForm.advisory}
                  onChange={(e) => setAdvisoryForm({ ...advisoryForm, advisory: e.target.value })}
                  placeholder="Details of safety alert, police deployment, or warning..."
                  rows={3}
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-indigo-500"
                  required
                ></textarea>
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1 uppercase tracking-wider text-[10px]">
                  Recommended Citizen Precautions
                </label>
                <input
                  type="text"
                  value={advisoryForm.precautions}
                  onChange={(e) => setAdvisoryForm({ ...advisoryForm, precautions: e.target.value })}
                  placeholder="e.g. Keep live tracking enabled; use illuminated routes."
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAdvisoryModal(false)}
                  className="px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingAdvisory}
                  className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-sm disabled:opacity-50"
                >
                  <Send size={13} />
                  <span>{submittingAdvisory ? 'Broadcasting...' : 'Broadcast to Safety Radar'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950 py-4 px-6 text-center text-xs text-slate-500">
        SafeHer HQ Administration System • Autonomous Tri-Portal Role-Based Dispatch &amp; Governance
      </footer>
    </div>
  );
};
