import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { 
  RefreshCw, 
  ShieldAlert, 
  Radio, 
  Crosshair 
} from 'lucide-react';
import type { PatrolUnitMarker, PoliceIncidentDetail } from '../../types';

interface PatrolRadarMapProps {
  patrolUnits: PatrolUnitMarker[];
  activeIncident: PoliceIncidentDetail | null;
  officerLat?: number | null;
  officerLng?: number | null;
  onRefresh?: () => void;
  coverageRadiusKm?: number;
  onRadiusChange?: (radius: number) => void;
}

export const PatrolRadarMap: React.FC<PatrolRadarMapProps> = ({
  patrolUnits,
  activeIncident,
  officerLat,
  officerLng,
  onRefresh,
  coverageRadiusKm = 3,
  onRadiusChange,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const unitsLayerRef = useRef<L.LayerGroup | null>(null);
  const incidentLayerRef = useRef<L.LayerGroup | null>(null);
  const radiusCircleRef = useRef<L.Circle | null>(null);
  const officerMarkerRef = useRef<L.Marker | null>(null);

  const [selectedRadius, setSelectedRadius] = useState<number>(coverageRadiusKm);

  // Handle radius change
  const handleRadiusSelect = (r: number) => {
    setSelectedRadius(r);
    if (onRadiusChange) onRadiusChange(r);
  };

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    // Center on Bangalore or officer coordinates
    const defaultLat = officerLat || 12.9716;
    const defaultLng = officerLng || 77.5946;

    const map = L.map(mapContainerRef.current, {
      center: [defaultLat, defaultLng],
      zoom: 13,
      zoomControl: true,
      attributionControl: true,
    });

    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; <a href="https://carto.com/">CARTO</a> &copy; OpenStreetMap',
      maxZoom: 19,
    }).addTo(map);

    unitsLayerRef.current = L.layerGroup().addTo(map);
    incidentLayerRef.current = L.layerGroup().addTo(map);
    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Update Officer Location & Coverage Circle
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    const map = mapInstanceRef.current;

    const lat = officerLat || 12.9716;
    const lng = officerLng || 77.5946;

    // Update or create officer marker
    if (officerMarkerRef.current) {
      officerMarkerRef.current.setLatLng([lat, lng]);
    } else {
      const officerHtml = `
        <div style="position: relative; width: 34px; height: 34px; display: flex; align-items: center; justify-content: center;">
          <div style="position: absolute; width: 34px; height: 34px; border-radius: 50%; background: rgba(37, 99, 235, 0.25); animation: ping 2s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
          <div style="width: 22px; height: 22px; border-radius: 50%; background: #1D4ED8; border: 3px solid #FFFFFF; box-shadow: 0 2px 8px rgba(0,0,0,0.4); display: flex; align-items: center; justify-content: center; color: white; font-size: 11px; font-weight: bold;">
            ★
          </div>
        </div>
      `;
      const icon = L.divIcon({
        className: 'officer-self-marker',
        html: officerHtml,
        iconSize: [34, 34],
        iconAnchor: [17, 17],
      });
      officerMarkerRef.current = L.marker([lat, lng], { icon }).addTo(map);
      officerMarkerRef.current.bindPopup(`
        <div style="font-family: sans-serif; font-size: 12px; line-height: 1.4;">
          <strong style="color: #1D4ED8;">My Patrol Unit (Self)</strong><br />
          Lat: ${lat.toFixed(4)}, Lng: ${lng.toFixed(4)}
        </div>
      `);
    }

    // Update radius circle
    if (radiusCircleRef.current) {
      radiusCircleRef.current.setLatLng([lat, lng]);
      radiusCircleRef.current.setRadius(selectedRadius * 1000);
    } else {
      radiusCircleRef.current = L.circle([lat, lng], {
        radius: selectedRadius * 1000,
        color: '#2563EB',
        fillColor: '#3B82F6',
        fillOpacity: 0.12,
        weight: 1.5,
        dashArray: '4, 6',
      }).addTo(map);
    }
  }, [officerLat, officerLng, selectedRadius]);

  // Update Patrol Units Markers
  useEffect(() => {
    if (!mapInstanceRef.current || !unitsLayerRef.current) return;
    const layer = unitsLayerRef.current;
    layer.clearLayers();

    patrolUnits.forEach((unit) => {
      if (unit.is_self) return;

      const unitHtml = `
        <div style="position: relative; width: 30px; height: 30px; display: flex; align-items: center; justify-content: center;">
          <div style="width: 20px; height: 20px; border-radius: 50%; background: #0F172A; border: 2.5px solid #38BDF8; box-shadow: 0 2px 6px rgba(0,0,0,0.35); display: flex; align-items: center; justify-content: center; color: #38BDF8; font-size: 10px; font-weight: bold;">
            P
          </div>
        </div>
      `;
      const icon = L.divIcon({
        className: 'patrol-unit-marker',
        html: unitHtml,
        iconSize: [30, 30],
        iconAnchor: [15, 15],
      });

      const m = L.marker([unit.latitude, unit.longitude], { icon });
      m.bindPopup(`
        <div style="font-family: sans-serif; font-size: 12px; line-height: 1.4;">
          <strong>${unit.name}</strong> (${unit.rank})<br />
          Badge: <code>${unit.badge_number}</code><br />
          Zone: <em>${unit.patrol_zone || 'Patrol Unit'}</em><br />
          ${unit.vehicle_number ? `Vehicle: <code>${unit.vehicle_number}</code><br />` : ''}
          <small style="color: #64748B;">Active on Duty</small>
        </div>
      `);
      layer.addLayer(m);
    });
  }, [patrolUnits]);

  // Update Active Incident Marker
  useEffect(() => {
    if (!mapInstanceRef.current || !incidentLayerRef.current) return;
    const layer = incidentLayerRef.current;
    layer.clearLayers();

    if (activeIncident && activeIncident.latest_latitude && activeIncident.latest_longitude) {
      const incLat = activeIncident.latest_latitude;
      const incLng = activeIncident.latest_longitude;

      const incHtml = `
        <div style="position: relative; width: 38px; height: 38px; display: flex; align-items: center; justify-content: center;">
          <div style="position: absolute; width: 38px; height: 38px; border-radius: 50%; background: rgba(239, 68, 68, 0.35); animation: ping 1.2s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
          <div style="width: 24px; height: 24px; border-radius: 50%; background: #DC2626; border: 3px solid #FFFFFF; box-shadow: 0 2px 10px rgba(220,38,38,0.6); display: flex; align-items: center; justify-content: center; color: white; font-size: 11px; font-weight: 900;">
            !
          </div>
        </div>
      `;
      const icon = L.divIcon({
        className: 'incident-active-marker',
        html: incHtml,
        iconSize: [38, 38],
        iconAnchor: [19, 19],
      });

      const incMarker = L.marker([incLat, incLng], { icon });
      incMarker.bindPopup(`
        <div style="font-family: sans-serif; font-size: 12px; line-height: 1.4;">
          <strong style="color: #DC2626;">🚨 ACTIVE EMERGENCY #INC-${activeIncident.id}</strong><br />
          Category: <strong>${activeIncident.category}</strong><br />
          Locality: ${activeIncident.locality || 'Unknown'}, ${activeIncident.city}<br />
          Status: <code>${activeIncident.dispatch_status}</code><br />
          ${activeIncident.distance_km ? `Distance: <strong>${activeIncident.distance_km} km away</strong>` : ''}
        </div>
      `);
      layer.addLayer(incMarker);
    }
  }, [activeIncident]);

  const centerOnOfficer = () => {
    if (mapInstanceRef.current && (officerLat || officerLng)) {
      mapInstanceRef.current.flyTo([officerLat || 12.9716, officerLng || 77.5946], 14, { duration: 1.2 });
    }
  };

  const centerOnIncident = () => {
    if (mapInstanceRef.current && activeIncident?.latest_latitude && activeIncident?.latest_longitude) {
      mapInstanceRef.current.flyTo(
        [activeIncident.latest_latitude, activeIncident.latest_longitude], 
        15, 
        { duration: 1.2 }
      );
    }
  };

  return (
    <div className="relative w-full rounded-xl overflow-hidden border border-[var(--border-subtle)] bg-[var(--bg-elevated)] shadow-sm">
      {/* Map Header / Controls Overlay */}
      <div className="absolute top-3 left-3 right-3 z-10 flex flex-wrap items-center justify-between gap-2 pointer-events-none">
        
        {/* Coverage Radius Selector */}
        <div className="bg-[var(--bg-surface)]/90 backdrop-blur-md border border-[var(--border-subtle)] rounded-lg p-1 shadow-md flex items-center gap-1 pointer-events-auto">
          <span className="text-[10px] font-semibold text-[var(--text-muted)] px-2 uppercase tracking-wider flex items-center gap-1">
            <Radio size={11} className="text-blue-500 animate-pulse" />
            Radius:
          </span>
          {[1, 2, 3, 5].map((km) => (
            <button
              key={km}
              onClick={() => handleRadiusSelect(km)}
              className={`px-2 py-0.5 rounded text-[11px] font-bold cursor-pointer transition-colors ${
                selectedRadius === km
                  ? 'bg-blue-600 text-white shadow-2xs'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)]'
              }`}
            >
              {km} km
            </button>
          ))}
        </div>

        {/* Map Quick Actions */}
        <div className="flex items-center gap-1.5 pointer-events-auto">
          {activeIncident && activeIncident.latest_latitude && (
            <button
              onClick={centerOnIncident}
              className="px-2.5 py-1.5 rounded-lg bg-red-600 text-white font-semibold text-xs shadow-md flex items-center gap-1.5 hover:bg-red-700 transition-colors cursor-pointer animate-pulse"
              title="Jump to active emergency location"
            >
              <ShieldAlert size={12} />
              <span>Incident Beacon</span>
            </button>
          )}

          <button
            onClick={centerOnOfficer}
            className="p-1.5 rounded-lg bg-[var(--bg-surface)]/90 backdrop-blur-md border border-[var(--border-subtle)] text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] shadow-md transition-colors cursor-pointer"
            title="Center on My Location"
            aria-label="Center on My Location"
          >
            <Crosshair size={14} className="text-blue-500" />
          </button>

          {onRefresh && (
            <button
              onClick={onRefresh}
              className="p-1.5 rounded-lg bg-[var(--bg-surface)]/90 backdrop-blur-md border border-[var(--border-subtle)] text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] shadow-md transition-colors cursor-pointer"
              title="Refresh Active Patrol Radar"
              aria-label="Refresh Active Patrol Radar"
            >
              <RefreshCw size={14} className="text-[var(--text-secondary)]" />
            </button>
          )}
        </div>
      </div>

      {/* Map Container */}
      <div 
        ref={mapContainerRef} 
        className="w-full h-[420px] sm:h-[480px] z-0" 
      />

      {/* Bottom Status Legend */}
      <div className="absolute bottom-3 left-3 z-10 bg-[var(--bg-surface)]/90 backdrop-blur-md border border-[var(--border-subtle)] rounded-lg px-3 py-1.5 shadow-md flex items-center gap-4 text-[10px] text-[var(--text-secondary)] pointer-events-none">
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-blue-600 border border-white shrink-0"></span>
          <span>You (Assigned Unit)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-slate-800 border border-sky-400 shrink-0"></span>
          <span>Active Patrol Units ({patrolUnits.length})</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-red-600 animate-ping shrink-0"></span>
          <span>Emergency SOS Beacons</span>
        </div>
      </div>

    </div>
  );
};
