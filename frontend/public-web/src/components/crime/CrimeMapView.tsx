import React, { useState, useEffect, useRef, useCallback } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { 
  Search, 
  Radio, 
  Download 
} from 'lucide-react';
import { crimeApi } from '../../services/api';
import type { 
  CrimeIncidentSummary, 
  LocalityCrimeSummaryItem, 
  WeeklyCrimeReportData,
  PageView 
} from '../../types';

interface CrimeMapViewProps {
  onNavigate?: (view: PageView) => void;
}

export const CrimeMapView: React.FC<CrimeMapViewProps> = () => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedDays, setSelectedDays] = useState<number>(30);
  const [verifiedOnly, setVerifiedOnly] = useState<boolean>(true);

  // Data State
  const [incidents, setIncidents] = useState<CrimeIncidentSummary[]>([]);
  const [localities, setLocalities] = useState<LocalityCrimeSummaryItem[]>([]);
  const [weeklyReport, setWeeklyReport] = useState<WeeklyCrimeReportData | null>(null);
  const [selectedLocality, setSelectedLocality] = useState<string | null>(null);

  // Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: [12.9716, 77.5946],
      zoom: 12,
      zoomControl: true,
      attributionControl: true,
    });

    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; CARTO &copy; OpenStreetMap',
      maxZoom: 19,
    }).addTo(map);

    markersLayerRef.current = L.layerGroup().addTo(map);
    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Fetch Crime Data
  const performSearch = useCallback(async () => {
    try {
      const result = await crimeApi.search({
        locality: searchQuery.trim() || undefined,
        category: selectedCategory !== 'All' ? selectedCategory : undefined,
        days: selectedDays,
        verified_only: verifiedOnly,
      });

      setIncidents(result.incidents);

      // Also refresh localities & weekly report
      const [locs, report] = await Promise.all([
        crimeApi.getLocalities(),
        crimeApi.getWeeklyReport(0),
      ]);
      setLocalities(locs);
      setWeeklyReport(report);
    } catch (e) {
      console.warn('[CrimeMapView] Search error:', e);
    }
  }, [searchQuery, selectedCategory, selectedDays, verifiedOnly]);

  useEffect(() => {
    performSearch();
  }, [performSearch]);

  // Update Map Markers (with privacy fuzzing applied)
  useEffect(() => {
    if (!mapInstanceRef.current || !markersLayerRef.current) return;
    const layer = markersLayerRef.current;
    layer.clearLayers();

    // Locality Hotspot Circles
    localities.forEach((loc) => {
      const color = loc.risk_level === 'HIGH' ? '#EF4444' : loc.risk_level === 'MODERATE' ? '#F97316' : '#10B981';
      const circle = L.circle([loc.latitude, loc.longitude], {
        radius: 800,
        color: color,
        fillColor: color,
        fillOpacity: 0.18,
        weight: 1.5,
      });

      circle.bindPopup(`
        <div style="font-family: sans-serif; font-size: 12px; line-height: 1.4;">
          <strong style="color: ${color}; font-size: 13px;">${loc.locality} (${loc.risk_level} Risk)</strong><br />
          Verified Incidents: <strong>${loc.verified_incidents}</strong><br />
          Primary Pattern: <em>${loc.primary_category}</em><br />
          Patrol Coverage: <code>${loc.patrol_status}</code>
        </div>
      `);
      layer.addLayer(circle);
    });

    // Individual Incident Markers
    incidents.forEach((inc) => {
      const isSos = inc.category === 'SOS Emergency';
      const markerColor = isSos ? '#DC2626' : '#4F46E5';

      const iconHtml = `
        <div style="position: relative; width: 22px; height: 22px; display: flex; align-items: center; justify-content: center;">
          <div style="width: 14px; height: 14px; border-radius: 50%; background: ${markerColor}; border: 2.5px solid #FFFFFF; box-shadow: 0 1px 5px rgba(0,0,0,0.35);"></div>
        </div>
      `;
      const icon = L.divIcon({
        className: 'crime-point-marker',
        html: iconHtml,
        iconSize: [22, 22],
        iconAnchor: [11, 11],
      });

      const m = L.marker([inc.approx_latitude, inc.approx_longitude], { icon });
      m.bindPopup(`
        <div style="font-family: sans-serif; font-size: 12px; line-height: 1.4;">
          <strong>${inc.category}</strong><br />
          Locality: ${inc.locality}, ${inc.city}<br />
          Verification: <strong style="color: #10B981;">Official Registry Verified</strong><br />
          Date: ${new Date(inc.time).toLocaleDateString()}<br />
          <small style="color: #64748B;">*Privacy Protected: Coordinates fuzzed to neighborhood centroid.</small>
        </div>
      `);
      layer.addLayer(m);
    });
  }, [incidents, localities]);

  const handleLocalitySelect = (locName: string, lat: number, lng: number) => {
    setSelectedLocality(locName);
    setSearchQuery(locName);
    if (mapInstanceRef.current) {
      mapInstanceRef.current.flyTo([lat, lng], 14, { duration: 1.2 });
    }
  };

  return (
    <div className="space-y-6">

      {/* Hero Header */}
      <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-2xl p-5 sm:p-6 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-600 dark:text-blue-400 text-[10px] font-bold uppercase tracking-wider mb-2">
              <Radio size={12} className="animate-pulse" />
              <span>Public Safety &amp; Community Intelligence</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[var(--text-primary)]">
              Verified Crime Radar &amp; Area Search
            </h1>
            <p className="text-xs text-[var(--text-secondary)] mt-1 max-w-2xl">
              Inspect verified safety telemetry across neighborhoods. Coordinates are neighborhood-fuzzed to protect victim privacy while preserving accurate risk awareness.
            </p>
          </div>

          {weeklyReport && (
            <a
              href={crimeApi.getWeeklyReportPdfUrl(0)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[var(--brand-primary)] text-white text-xs font-semibold shadow-xs hover:bg-[var(--brand-hover)] transition-colors self-start shrink-0 cursor-pointer"
            >
              <Download size={14} />
              <span>Download Weekly PDF Report</span>
            </a>
          )}
        </div>

        {/* SEARCH & FILTERS BAR */}
        <div className="mt-5 pt-4 border-t border-[var(--border-subtle)] grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          
          {/* Locality Search Input */}
          <div className="relative">
            <Search size={14} className="absolute left-3 top-3 text-[var(--text-muted)]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search locality or PIN code..."
              className="w-full pl-8 pr-3 py-2 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-subtle)] text-xs text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--brand-primary)]"
            />
          </div>

          {/* Category Filter */}
          <div>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-subtle)] text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--brand-primary)]"
            >
              <option value="All">All Categories</option>
              <option value="SOS Emergency">SOS Emergency</option>
              <option value="Harassment">Harassment</option>
              <option value="Stalking">Stalking</option>
              <option value="Suspicious Activity">Suspicious Activity</option>
              <option value="Theft">Theft</option>
            </select>
          </div>

          {/* Date Filter */}
          <div>
            <select
              value={selectedDays}
              onChange={(e) => setSelectedDays(Number(e.target.value))}
              className="w-full px-3 py-2 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-subtle)] text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--brand-primary)]"
            >
              <option value={7}>Last 7 Days</option>
              <option value={30}>Last 30 Days</option>
              <option value={90}>Last 90 Days</option>
            </select>
          </div>

          {/* Verified Toggle */}
          <div className="flex items-center justify-between sm:justify-start gap-2 px-3 py-2 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-subtle)]">
            <span className="text-xs text-[var(--text-secondary)] font-medium">Verified Only</span>
            <input
              type="checkbox"
              checked={verifiedOnly}
              onChange={(e) => setVerifiedOnly(e.target.checked)}
              className="rounded accent-[var(--brand-primary)] cursor-pointer"
            />
          </div>

        </div>
      </div>

      {/* INTERACTIVE CRIME MAP */}
      <div className="relative rounded-2xl overflow-hidden border border-[var(--border-subtle)] bg-[var(--bg-elevated)] shadow-sm">
        <div ref={mapContainerRef} className="w-full h-[460px] z-0" />

        {/* Legend */}
        <div className="absolute bottom-3 left-3 z-10 bg-[var(--bg-surface)]/90 backdrop-blur-md border border-[var(--border-subtle)] rounded-xl px-3 py-2 shadow-md flex flex-wrap items-center gap-3 text-[11px] text-[var(--text-secondary)]">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500 shrink-0" />
            <span>High Risk Cluster</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-orange-500 shrink-0" />
            <span>Moderate Concentration</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" />
            <span>Safe / Adequate Patrol</span>
          </div>
        </div>
      </div>

      {/* LOCALITY CARDS & TOP RANKINGS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Locality Quick Jump */}
        <div className="lg:col-span-1 bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm text-[var(--text-primary)]">Locality Concentrations</h3>
            <span className="text-[11px] text-[var(--text-muted)]">{localities.length} Areas</span>
          </div>

          <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
            {localities.map((loc) => (
              <button
                key={loc.locality}
                type="button"
                onClick={() => handleLocalitySelect(loc.locality, loc.latitude, loc.longitude)}
                className={`w-full p-2.5 rounded-lg border text-left transition-colors cursor-pointer flex items-center justify-between gap-2 ${
                  selectedLocality === loc.locality
                    ? 'border-[var(--brand-primary)] bg-[var(--bg-elevated)]'
                    : 'border-[var(--border-subtle)] hover:bg-[var(--bg-elevated)]'
                }`}
              >
                <div>
                  <strong className="text-xs text-[var(--text-primary)] block">{loc.locality}</strong>
                  <span className="text-[10px] text-[var(--text-muted)]">
                    {loc.verified_incidents} verified incidents • {loc.primary_category}
                  </span>
                </div>
                <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                  loc.risk_level === 'HIGH' ? 'bg-red-500/15 text-red-600 dark:text-red-400' :
                  loc.risk_level === 'MODERATE' ? 'bg-orange-500/15 text-orange-600 dark:text-orange-400' :
                  'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                }`}>
                  {loc.risk_level}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Weekly Crime Report & Rank 1/2/3 */}
        <div className="lg:col-span-2 bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-3">
            <div>
              <h3 className="font-bold text-sm text-[var(--text-primary)]">
                Official Weekly Crime Report
              </h3>
              <p className="text-[11px] text-[var(--text-muted)]">
                {weeklyReport?.report_week || 'Recent 7-Day Window'} • Calculated from live database records
              </p>
            </div>
          </div>

          {weeklyReport && (
            <div className="space-y-4">
              
              {/* Rank 1, 2, 3 Highlights */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {weeklyReport.ranked_areas.slice(0, 3).map((area) => (
                  <div 
                    key={area.rank}
                    className="p-3 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-extrabold uppercase px-1.5 py-0.2 rounded bg-red-500/10 text-red-600 dark:text-red-400">
                        Rank #{area.rank}
                      </span>
                      <span className="text-[10px] text-red-500 font-bold">
                        +{area.percentage_change}% WoW
                      </span>
                    </div>
                    <strong className="text-xs text-[var(--text-primary)] block">{area.locality}</strong>
                    <div className="text-[10px] text-[var(--text-muted)]">
                      {area.verified_count} verified • {area.primary_category}
                    </div>
                  </div>
                ))}
              </div>

              {/* Category Breakdown */}
              <div className="space-y-2 pt-2">
                <span className="text-xs font-semibold text-[var(--text-secondary)]">
                  City-Wide Crime Category Breakdown
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {weeklyReport.category_distribution.map((cat) => (
                    <div key={cat.category} className="p-2 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-subtle)] text-xs">
                      <span className="text-[var(--text-muted)] block text-[10px]">{cat.category}</span>
                      <strong className="text-sm text-[var(--text-primary)] font-mono">{cat.count}</strong>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          )}
        </div>

      </div>

    </div>
  );
};
