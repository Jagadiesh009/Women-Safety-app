import React, { useEffect, useRef, useState, useCallback } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { 
  ArrowLeft, 
  Navigation, 
  AlertCircle, 
  RefreshCw, 
  PhoneCall,
  Shield,
  Radio,
  Clock,
  Compass
} from 'lucide-react';
import type { PageView, NearbyPoliceOfficer } from '../types';
import { api } from '../services/api';

interface FullMapPageProps {
  onNavigate: (view: PageView) => void;
}

interface LocationData {
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: Date;
}

export const FullMapPage: React.FC<FullMapPageProps> = ({ onNavigate }) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const userCircleRef = useRef<L.Circle | null>(null);
  const radarCircleRef = useRef<L.Circle | null>(null);
  const policeMarkersRef = useRef<Map<number, L.Marker>>(new Map());

  const [location, setLocation] = useState<LocationData | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [errorStatus, setErrorStatus] = useState<string | null>(null);
  const [radiusKm, setRadiusKm] = useState<number>(3.0);
  const [nearbyOfficers, setNearbyOfficers] = useState<NearbyPoliceOfficer[]>([]);
  const [isLoadingRadar, setIsLoadingRadar] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);

  // Initialize Full-Page Leaflet Map with OpenStreetMap (Admin parity)
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    // Default center: India overview
    const initialLat = 20.5937;
    const initialLng = 78.9629;
    const initialZoom = 5;

    const map = L.map(mapContainerRef.current, {
      center: [initialLat, initialLng],
      zoom: initialZoom,
      zoomControl: false,
      scrollWheelZoom: true,
      attributionControl: true,
    });

    L.control.zoom({ position: 'topright' }).addTo(map);

    // Standard OpenStreetMap tiles — identical to admin panel
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
    }).addTo(map);

    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Fetch nearby on-duty police units from backend
  const fetchNearbyOfficers = useCallback(async (lat: number, lng: number, rad: number) => {
    setIsLoadingRadar(true);
    try {
      const units = await api.getNearbyPolice(lat, lng, rad);
      setNearbyOfficers(units);
      setLastRefreshed(new Date());

      if (mapInstanceRef.current) {
        const map = mapInstanceRef.current;

        // Clean up previous police markers
        policeMarkersRef.current.forEach((m) => m.remove());
        policeMarkersRef.current.clear();

        // Draw new police markers
        units.forEach((officer: NearbyPoliceOfficer) => {
          const policeIconHtml = `
            <div style="position: relative; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; cursor: pointer;">
              <div style="width: 24px; height: 24px; border-radius: 50%; background: #1D4ED8; border: 2.5px solid #ffffff; box-shadow: 0 2px 8px rgba(0,0,0,0.45); display: flex; align-items: center; justify-content: center; color: #ffffff; font-size: 12px;">
                👮
              </div>
              <div style="position: absolute; width: 32px; height: 32px; border-radius: 50%; background: rgba(29, 78, 216, 0.25); animation: pulse 2s infinite;"></div>
            </div>
          `;

          const policeIcon = L.divIcon({
            className: 'police-radar-marker',
            html: policeIconHtml,
            iconSize: [32, 32],
            iconAnchor: [16, 16],
          });

          const m = L.marker([officer.latitude, officer.longitude], { icon: policeIcon }).addTo(map);

          const timeStr = officer.last_location_update
            ? new Date(officer.last_location_update).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            : 'Active';

          const popupContent = `
            <div style="font-family: system-ui, -apple-system, sans-serif; min-width: 180px; padding: 2px;">
              <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 4px;">
                <span style="font-size: 13px; font-weight: 700; color: #0F172A;">${officer.display_name}</span>
              </div>
              <div style="font-size: 11px; color: #475569; margin-bottom: 2px;">
                Badge: <strong>${officer.badge_number}</strong>
              </div>
              <div style="font-size: 11px; color: #475569; margin-bottom: 6px;">
                Station: <strong>${officer.station_name}</strong>
              </div>
              <div style="padding-top: 6px; border-top: 1px solid #E2E8F0; display: flex; justify-content: space-between; align-items: center;">
                <span style="font-size: 10px; font-weight: 700; color: #16A34A; background: #DCFCE7; padding: 2px 6px; border-radius: 4px;">
                  ● ON DUTY
                </span>
                <span style="font-size: 11px; font-weight: 700; color: #1D4ED8;">
                  ${officer.distance_km} km away
                </span>
              </div>
              <div style="font-size: 9px; color: #94A3B8; margin-top: 4px;">
                Last GPS ping: ${timeStr}
              </div>
            </div>
          `;

          m.bindPopup(popupContent);
          policeMarkersRef.current.set(officer.officer_id, m);
        });
      }
    } catch (e) {
      console.warn('[SafeHer Radar] Failed to fetch nearby police:', e);
    } finally {
      setIsLoadingRadar(false);
    }
  }, []);

  // Update map visual circles (User position + Radar coverage radius)
  const updateMapCircles = useCallback((lat: number, lng: number, acc: number, rad: number) => {
    if (!mapInstanceRef.current) return;
    const map = mapInstanceRef.current;

    // User marker
    if (markerRef.current) markerRef.current.remove();
    if (userCircleRef.current) userCircleRef.current.remove();
    if (radarCircleRef.current) radarCircleRef.current.remove();

    const userMarkerHtml = `
      <div style="position: relative; width: 22px; height: 22px; display: flex; align-items: center; justify-content: center;">
        <div style="width: 14px; height: 14px; border-radius: 50%; background: #D14D72; border: 2.5px solid #ffffff; box-shadow: 0 1px 6px rgba(0,0,0,0.45);"></div>
        <div style="position: absolute; width: 32px; height: 32px; border-radius: 50%; background: rgba(209, 77, 114, 0.25); animation: pulse 2s infinite;"></div>
      </div>
    `;

    const userIcon = L.divIcon({
      className: 'safeher-marker',
      html: userMarkerHtml,
      iconSize: [22, 22],
      iconAnchor: [11, 11],
    });

    markerRef.current = L.marker([lat, lng], { icon: userIcon }).addTo(map);
    markerRef.current.bindPopup(`
      <div style="font-family: system-ui, sans-serif; font-size: 11px; padding: 2px;">
        <strong style="color: #D14D72;">Your Location</strong><br>
        Accuracy: ±${Math.round(acc)}m
      </div>
    `);

    // Accuracy circle
    userCircleRef.current = L.circle([lat, lng], {
      radius: Math.min(acc, 200),
      color: '#D14D72',
      weight: 1.5,
      opacity: 0.6,
      fillColor: '#D14D72',
      fillOpacity: 0.08,
    }).addTo(map);

    // Radar coverage radius circle
    radarCircleRef.current = L.circle([lat, lng], {
      radius: rad * 1000,
      color: '#2563EB',
      weight: 1.5,
      dashArray: '4, 4',
      opacity: 0.7,
      fillColor: '#3B82F6',
      fillOpacity: 0.04,
    }).addTo(map);
  }, []);

  // Browser Geolocation capture
  const handleLocateMe = useCallback(() => {
    if (!navigator.geolocation) {
      setErrorStatus('Geolocation is not supported by your browser.');
      return;
    }

    setIsLocating(true);
    setErrorStatus(null);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude, accuracy } = pos.coords;
        const locData: LocationData = {
          latitude,
          longitude,
          accuracy,
          timestamp: new Date(),
        };

        setLocation(locData);
        setIsLocating(false);

        if (mapInstanceRef.current) {
          const map = mapInstanceRef.current;
          map.flyTo([latitude, longitude], 15, { duration: 1.2 });
          updateMapCircles(latitude, longitude, accuracy, radiusKm);
        }

        fetchNearbyOfficers(latitude, longitude, radiusKm);
      },
      (err) => {
        setIsLocating(false);
        if (err.code === err.PERMISSION_DENIED) {
          setErrorStatus('Location permission was denied. Please allow location access in your browser to view your live position and nearby police.');
        } else if (err.code === err.TIMEOUT) {
          setErrorStatus('Location request timed out. Please try again.');
        } else {
          setErrorStatus('Unable to determine location: ' + err.message);
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  }, [radiusKm, updateMapCircles, fetchNearbyOfficers]);

  // Auto-locate on first load
  useEffect(() => {
    handleLocateMe();
  }, []);

  // Radius change handler
  const handleRadiusChange = (newRadius: number) => {
    setRadiusKm(newRadius);
    if (location) {
      updateMapCircles(location.latitude, location.longitude, location.accuracy, newRadius);
      fetchNearbyOfficers(location.latitude, location.longitude, newRadius);
    }
  };

  // Periodic radar refresh every 15 seconds while location is available
  useEffect(() => {
    if (!location) return;
    const interval = setInterval(() => {
      fetchNearbyOfficers(location.latitude, location.longitude, radiusKm);
    }, 15000);
    return () => clearInterval(interval);
  }, [location, radiusKm, fetchNearbyOfficers]);

  // Focus officer marker when clicked from list
  const focusOfficer = (officer: NearbyPoliceOfficer) => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.flyTo([officer.latitude, officer.longitude], 16, { duration: 0.8 });
      const marker = policeMarkersRef.current.get(officer.officer_id);
      if (marker) {
        marker.openPopup();
      }
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-6 space-y-4">
      
      {/* Top Header & Breadcrumb */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[var(--border-subtle)]">
        <div className="flex items-center gap-3">
          <button
            onClick={() => onNavigate('dashboard')}
            className="p-1.5 rounded-lg border border-[var(--border-subtle)] hover:bg-[var(--bg-elevated)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer inline-flex items-center gap-1.5 text-xs font-medium"
            title="Return to Dashboard"
          >
            <ArrowLeft size={14} />
            <span>Dashboard</span>
          </button>

          <div className="h-4 w-px bg-[var(--border-subtle)]" />

          <div>
            <h1 className="text-base sm:text-lg font-semibold tracking-tight text-[var(--text-primary)] flex items-center gap-2">
              <Shield size={16} className="text-blue-600" />
              <span>Civilian Safety Radar &amp; Police Units</span>
            </h1>
            {location ? (
              <p className="text-[11px] font-mono tabular-nums text-[var(--text-muted)] mt-0.5">
                {location.latitude.toFixed(5)}° N, {location.longitude.toFixed(5)}° E · ±{Math.round(location.accuracy)}m accuracy · {nearbyOfficers.length} officer{nearbyOfficers.length === 1 ? '' : 's'} in {radiusKm} km radius
              </p>
            ) : (
              <p className="text-[11px] text-[var(--text-muted)] mt-0.5">
                Real-time on-duty police radar and verified safe locations
              </p>
            )}
          </div>
        </div>

        {/* Right Actions: Locate Me, Radar Refresh & Emergency Dial */}
        <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
          {/* Radius selector buttons */}
          <div className="inline-flex rounded-md border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-0.5 text-xs">
            {[1, 2, 3, 5].map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => handleRadiusChange(r)}
                className={`px-2.5 py-1 rounded text-xs font-medium cursor-pointer transition-colors ${
                  radiusKm === r
                    ? 'bg-blue-600 text-white font-semibold'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                {r} km
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={handleLocateMe}
            disabled={isLocating}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-[var(--border-subtle)] hover:border-[var(--brand-primary)] bg-[var(--bg-surface)] hover:bg-[var(--bg-elevated)] text-xs font-medium text-[var(--text-primary)] transition-colors cursor-pointer disabled:opacity-50"
          >
            {isLocating ? (
              <>
                <RefreshCw size={13} className="animate-spin text-[var(--brand-primary)]" />
                <span>Locating...</span>
              </>
            ) : (
              <>
                <Navigation size={13} className="text-[var(--brand-primary)]" />
                <span>{location ? 'Update GPS' : 'Locate Me'}</span>
              </>
            )}
          </button>

          <a
            href="tel:112"
            className="px-3.5 py-1.5 rounded-md bg-red-600 hover:bg-red-700 text-white text-xs font-semibold tracking-wide transition-colors inline-flex items-center gap-1.5 cursor-pointer shadow-none"
            title="Call National Emergency 112"
          >
            <PhoneCall size={13} />
            <span>Call 112</span>
          </a>
        </div>
      </div>

      {/* Main Grid: Map & Nearby Officers Side Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        
        {/* Left: Map Viewport (Span 3 cols on large screens) */}
        <div className="lg:col-span-3 relative h-[560px] sm:h-[620px] rounded-xl overflow-hidden border border-[var(--border-subtle)] bg-[var(--bg-surface)]">
          <div ref={mapContainerRef} className="w-full h-full z-0" />

          {/* Radar Status Overlay Pill */}
          <div className="absolute top-3 left-3 z-10 flex items-center gap-2 bg-[var(--bg-surface)]/90 backdrop-blur-md px-3 py-1.5 rounded-lg border border-[var(--border-subtle)] shadow-xs">
            <Radio size={14} className={`text-blue-600 ${isLoadingRadar ? 'animate-pulse' : ''}`} />
            <span className="text-xs font-semibold text-[var(--text-primary)]">
              {nearbyOfficers.length} On-Duty Unit{nearbyOfficers.length === 1 ? '' : 's'}
            </span>
            <span className="text-[10px] text-[var(--text-muted)] border-l border-[var(--border-subtle)] pl-2">
              {radiusKm} km coverage
            </span>
          </div>

          {/* Error notification banner */}
          {errorStatus && (
            <div className="absolute bottom-4 left-4 right-4 sm:left-6 sm:right-auto sm:max-w-md p-3 rounded-lg bg-[var(--bg-surface)]/95 backdrop-blur-md border border-amber-500/30 text-amber-800 dark:text-amber-200 text-xs flex items-start justify-between gap-3 shadow-md z-10">
              <div className="flex items-start gap-2">
                <AlertCircle size={15} className="shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
                <span className="text-[11px] leading-relaxed">{errorStatus}</span>
              </div>
              <button
                onClick={handleLocateMe}
                className="text-[11px] font-semibold underline shrink-0 cursor-pointer pt-0.5"
              >
                Retry
              </button>
            </div>
          )}
        </div>

        {/* Right: Nearby Officers List & Dispatch Panel */}
        <div className="lg:col-span-1 flex flex-col gap-3">
          <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-xl p-4 flex flex-col h-[560px] sm:h-[620px]">
            
            {/* Panel Header */}
            <div className="flex items-center justify-between pb-3 border-b border-[var(--border-subtle)]">
              <div className="flex items-center gap-2">
                <Shield size={16} className="text-blue-600" />
                <h2 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-primary)]">
                  Active Police Radar
                </h2>
              </div>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                nearbyOfficers.length > 0 
                  ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'
                  : 'bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400'
              }`}>
                {nearbyOfficers.length} Found
              </span>
            </div>

            {/* Coverage Explanation */}
            <p className="text-[11px] text-[var(--text-muted)] py-2 leading-relaxed">
              Real-time verified police officers on active duty within your selected {radiusKm} km radius.
            </p>

            {/* Officer List Container */}
            <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
              {!location ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-4">
                  <Compass size={28} className="text-[var(--text-muted)] mb-2 animate-pulse" />
                  <p className="text-xs font-medium text-[var(--text-primary)] mb-1">
                    Location Required
                  </p>
                  <p className="text-[11px] text-[var(--text-muted)] mb-3">
                    Enable location permission to discover nearby on-duty police patrol units.
                  </p>
                  <button
                    onClick={handleLocateMe}
                    className="px-3 py-1.5 rounded-md bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium cursor-pointer transition-colors"
                  >
                    Enable Location
                  </button>
                </div>
              ) : nearbyOfficers.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-4">
                  <Radio size={28} className="text-blue-500/50 mb-2" />
                  <p className="text-xs font-medium text-[var(--text-primary)] mb-1">
                    No Officers in {radiusKm} km Radius
                  </p>
                  <p className="text-[11px] text-[var(--text-muted)] mb-3 leading-relaxed">
                    No active patrol units are currently within {radiusKm} km. Try expanding to 5 km or contact central dispatch.
                  </p>
                  {radiusKm < 5 && (
                    <button
                      onClick={() => handleRadiusChange(5)}
                      className="px-3 py-1.5 rounded-md border border-blue-500/40 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/30 text-xs font-medium cursor-pointer transition-colors"
                    >
                      Expand to 5 km Radius
                    </button>
                  )}
                </div>
              ) : (
                nearbyOfficers.map((off) => (
                  <div
                    key={off.officer_id}
                    onClick={() => focusOfficer(off)}
                    className="p-3 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-elevated)]/50 hover:bg-[var(--bg-elevated)] hover:border-blue-500/40 transition-colors cursor-pointer group space-y-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-[var(--text-primary)] group-hover:text-blue-600 transition-colors">
                        {off.display_name}
                      </span>
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300">
                        {off.distance_km} km
                      </span>
                    </div>

                    <div className="text-[11px] text-[var(--text-secondary)]">
                      📍 {off.station_name}
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-[var(--text-muted)] pt-1 border-t border-[var(--border-subtle)]">
                      <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                        ● ON DUTY
                      </span>
                      <span className="font-mono">
                        Badge #{off.badge_number}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Bottom SafeHer Guarantee Footer */}
            <div className="pt-3 border-t border-[var(--border-subtle)] mt-2 flex items-center justify-between text-[10px] text-[var(--text-muted)]">
              <span className="flex items-center gap-1">
                <Clock size={11} />
                {lastRefreshed ? `Updated ${lastRefreshed.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : 'Live'}
              </span>
              <span className="font-semibold text-blue-600 dark:text-blue-400">
                Encrypted Real-Time Radar
              </span>
            </div>

          </div>
        </div>

      </div>

    </div>
  );
};
