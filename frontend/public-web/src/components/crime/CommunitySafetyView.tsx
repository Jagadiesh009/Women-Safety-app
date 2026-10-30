import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  MapPin, 
  Info, 
  HelpCircle, 
  BellRing
} from 'lucide-react';
import { communityApi } from '../../services/api';
import type { CommunitySafetyLocality, CommunityAlertItem, PageView } from '../../types';

interface CommunitySafetyViewProps {
  onNavigate: (view: PageView) => void;
}

export const CommunitySafetyView: React.FC<CommunitySafetyViewProps> = ({ onNavigate }) => {
  const [localities, setLocalities] = useState<CommunitySafetyLocality[]>([]);
  const [advisories, setAdvisories] = useState<CommunityAlertItem[]>([]);
  const [showFormulaModal, setShowFormulaModal] = useState<boolean>(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [mapData, alerts] = await Promise.all([
          communityApi.getSafetyMap(),
          communityApi.getAlerts(),
        ]);
        setLocalities(mapData);
        setAdvisories(alerts);
      } catch (e) {
        console.warn('[CommunitySafetyView] Error loading safety data:', e);
      }
    };

    fetchData();
  }, []);

  return (
    <div className="space-y-6 animate-fade-in">

      {/* Header Banner */}
      <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-2xl p-5 sm:p-6 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold uppercase tracking-wider mb-2">
              <ShieldCheck size={12} />
              <span>Resident Safety Transparency</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[var(--text-primary)]">
              Community Safety Radar &amp; Official Advisories
            </h1>
            <p className="text-xs text-[var(--text-secondary)] mt-1 max-w-2xl">
              Stay informed with real-time neighborhood risk indicators, active police patrol density, and verified emergency advisories.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setShowFormulaModal(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[var(--border-subtle)] hover:bg-[var(--bg-elevated)] text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors self-start shrink-0 cursor-pointer"
          >
            <HelpCircle size={13} />
            <span>How are risk levels calculated?</span>
          </button>
        </div>
      </div>

      {/* OFFICIAL ADVISORIES BAR */}
      {advisories.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2">
            <BellRing size={16} className="text-amber-500 animate-pulse" />
            <span>Active Community Safety Advisories</span>
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {advisories.map((adv) => (
              <div 
                key={adv.id} 
                className="bg-amber-500/5 border border-amber-500/25 rounded-xl p-4 space-y-1.5"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-amber-500/20 text-amber-700 dark:text-amber-300">
                    {adv.category} • {adv.locality}
                  </span>
                  <span className="text-[10px] text-[var(--text-muted)]">
                    {new Date(adv.created_at).toLocaleDateString()}
                  </span>
                </div>
                <h3 className="font-bold text-xs text-[var(--text-primary)]">{adv.title}</h3>
                <p className="text-xs text-[var(--text-secondary)]">{adv.description}</p>
                {adv.police_station && (
                  <div className="text-[10px] text-[var(--text-muted)] pt-1">
                    Issued by: {adv.police_station}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* NEIGHBORHOOD RISK STATUS GRID */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2">
            <MapPin size={16} className="text-blue-500" />
            <span>Neighborhood Safety Status</span>
          </h2>
          <span className="text-xs text-[var(--text-muted)]">Source: SafeHer Verified Registry</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {localities.map((loc) => {
            const isRed = loc.risk_color === 'RED';
            const isOrange = loc.risk_color === 'ORANGE';

            return (
              <div
                key={loc.locality}
                className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-xl p-4 space-y-3 shadow-xs"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-bold text-sm text-[var(--text-primary)]">{loc.locality}</h3>
                    <span className="text-[10px] text-[var(--text-muted)]">{loc.city}</span>
                  </div>

                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                    isRed ? 'bg-red-500/15 text-red-600 dark:text-red-400 border border-red-500/30' :
                    isOrange ? 'bg-orange-500/15 text-orange-600 dark:text-orange-400 border border-orange-500/30' :
                    'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                  }`}>
                    {loc.risk_color}
                  </span>
                </div>

                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between py-1 border-b border-[var(--border-subtle)] text-[11px]">
                    <span className="text-[var(--text-muted)]">Verified Incidents:</span>
                    <strong className="text-[var(--text-primary)] font-mono">{loc.verified_incident_count}</strong>
                  </div>

                  <div className="flex justify-between py-1 border-b border-[var(--border-subtle)] text-[11px]">
                    <span className="text-[var(--text-muted)]">Patrol Units on Duty:</span>
                    <strong className="text-[var(--text-primary)] font-mono">
                      {loc.patrol_units_active > 0 ? `${loc.patrol_units_active} Active` : 'Standard Beat'}
                    </strong>
                  </div>

                  <div className="flex justify-between py-1 text-[11px]">
                    <span className="text-[var(--text-muted)]">Patrol Attention:</span>
                    <span className={loc.needs_additional_patrol ? 'text-amber-500 font-bold' : 'text-emerald-500 font-medium'}>
                      {loc.needs_additional_patrol ? 'Enhanced Watch' : 'Adequate'}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => onNavigate('crime-map')}
                  className="w-full py-1.5 text-center text-[11px] font-semibold text-[var(--brand-primary)] hover:underline cursor-pointer"
                >
                  View on Crime Map &rarr;
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* HOW RISK IS CALCULATED MODAL */}
      {showFormulaModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-3">
              <h3 className="font-bold text-sm text-[var(--text-primary)] flex items-center gap-2">
                <Info size={16} className="text-blue-500" />
                <span>Risk Level Calculation Methodology</span>
              </h3>
              <button
                onClick={() => setShowFormulaModal(false)}
                className="text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer text-sm"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs text-[var(--text-secondary)] leading-relaxed">
              <p>
                Neighborhood risk ratings are calculated automatically using verified data from the SafeHer emergency dispatch core:
              </p>

              <div className="space-y-2">
                <div className="p-2.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-700 dark:text-red-300">
                  <strong>RED (High Concern):</strong> 4 or more verified emergency incidents within the last 7 days, or a week-on-week incident surge exceeding +100%. Priority police beats deployed.
                </div>

                <div className="p-2.5 rounded-lg bg-orange-500/10 border border-orange-500/20 text-orange-700 dark:text-orange-300">
                  <strong>ORANGE (Moderate):</strong> 1 to 3 verified incidents with stable trends. Regular police mobile patrols active.
                </div>

                <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-300">
                  <strong>GREEN (Adequate / Safe):</strong> 0 verified incidents in the past 7 days, or continuous coverage by active patrol beats.
                </div>
              </div>

              <p className="text-[10px] text-[var(--text-muted)]">
                *Privacy Guarantee: Exact victim identities, phone numbers, and pinpoint coordinates are never disclosed. Fuzzed locality centroids are used for public transparency.
              </p>
            </div>

            <div className="flex justify-end pt-2 border-t border-[var(--border-subtle)]">
              <button
                type="button"
                onClick={() => setShowFormulaModal(false)}
                className="px-4 py-1.5 rounded-lg bg-[var(--brand-primary)] text-white text-xs font-semibold cursor-pointer"
              >
                Understood
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
