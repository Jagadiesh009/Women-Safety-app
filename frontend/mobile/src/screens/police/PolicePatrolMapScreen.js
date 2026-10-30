import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, Platform } from 'react-native';
import { WebView } from 'react-native-webview';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import { ScreenWrapper } from '../../components/ui/ScreenWrapper';
import { Card } from '../../components/ui/Card';
import { Shield, Radio, MapPin, RefreshCw, Crosshair, Users } from 'lucide-react-native';
import * as Location from 'expo-location';

export function PolicePatrolMapScreen({ navigation }) {
  const { officer } = useAuth();
  const [patrolUnits, setPatrolUnits] = useState([]);
  const [activeIncident, setActiveIncident] = useState(null);
  const [myCoords, setMyCoords] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  
  const webViewRef = useRef(null);
  const refreshIntervalRef = useRef(null);

  const fetchMapData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [unitsRes, activeIncRes] = await Promise.allSettled([
        api.getActivePatrolUnits(),
        api.getActivePoliceIncident()
      ]);

      if (unitsRes.status === 'fulfilled' && Array.isArray(unitsRes.value)) {
        setPatrolUnits(unitsRes.value);
      }
      if (activeIncRes.status === 'fulfilled') {
        setActiveIncident(activeIncRes.value);
      }

      // Get own location
      const { status } = await Location.getForegroundPermissionsAsync();
      if (status === 'granted') {
        const cur = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        setMyCoords(cur.coords);
      }
    } catch (e) {
      console.warn("Failed to refresh patrol map:", e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMapData();
    refreshIntervalRef.current = setInterval(fetchMapData, 5000); // 5s refresh for tactical units
    return () => {
      if (refreshIntervalRef.current) clearInterval(refreshIntervalRef.current);
    };
  }, [fetchMapData]);

  // Coordinates
  const centerLat = myCoords?.latitude || activeIncident?.latest_latitude || 12.9784;
  const centerLng = myCoords?.longitude || activeIncident?.latest_longitude || 77.6408;

  const mapHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
      <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
      <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
      <style>
        body { padding: 0; margin: 0; background: #070D18; font-family: sans-serif; }
        html, body, #map { height: 100%; width: 100%; }
        .my-unit-pin {
          width: 24px; height: 24px; border-radius: 50%;
          background: #3B82F6; border: 3px solid #FFFFFF;
          box-shadow: 0 0 12px #3B82F6;
          display: flex; align-items: center; justify-content: center;
          color: white; font-weight: bold; font-size: 10px;
        }
        .other-unit-pin {
          width: 20px; height: 20px; border-radius: 50%;
          background: #10B981; border: 2.5px solid #FFFFFF;
          box-shadow: 0 0 8px #10B981;
        }
        .incident-pin {
          width: 24px; height: 24px; border-radius: 50%;
          background: #EF4444; border: 3px solid #FFFFFF;
          box-shadow: 0 0 14px #EF4444;
          animation: pulse 1.5s infinite;
        }
        @keyframes pulse {
          0% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.7); }
          70% { box-shadow: 0 0 0 15px rgba(239, 68, 68, 0); }
          100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); }
        }
      </style>
    </head>
    <body>
      <div id="map"></div>
      <script>
        var map = L.map('map', { zoomControl: false }).setView([${centerLat}, ${centerLng}], 14);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(map);

        // Patrol Beats (Sectors)
        var indiranagarZone = L.circle([12.9784, 77.6408], {
          color: '#3B82F6', fillColor: '#3B82F6', fillOpacity: 0.12, radius: 1400
        }).addTo(map).bindPopup("Sector Beat 1 - Indiranagar Division");

        var koramangalaZone = L.circle([12.9352, 77.6245], {
          color: '#10B981', fillColor: '#10B981', fillOpacity: 0.10, radius: 1600
        }).addTo(map).bindPopup("Sector Beat 2 - Koramangala Division");

        // Units from server
        var units = ${JSON.stringify(patrolUnits)};
        units.forEach(function(u) {
          var isSelf = u.is_self;
          var icon = L.divIcon({
            className: isSelf ? 'my-unit-pin' : 'other-unit-pin',
            iconSize: isSelf ? [24, 24] : [20, 20]
          });
          L.marker([u.latitude, u.longitude], { icon: icon })
            .addTo(map)
            .bindPopup("<b>" + u.name + " (" + u.badge_number + ")</b><br>" + u.rank + "<br>Zone: " + u.patrol_zone);
        });

        // Active Emergency Incident
        var inc = ${JSON.stringify(activeIncident)};
        if (inc && inc.latest_latitude && inc.latest_longitude) {
          var incIcon = L.divIcon({ className: 'incident-pin', iconSize: [24, 24] });
          L.marker([inc.latest_latitude, inc.latest_longitude], { icon: incIcon })
            .addTo(map)
            .bindPopup("<b>EMERGENCY #" + inc.id + "</b><br>" + inc.category + "<br>Status: " + inc.dispatch_status)
            .openPopup();
        }
      </script>
    </body>
    </html>
  `;

  return (
    <ScreenWrapper edges={['top', 'bottom']} style={styles.container}>
      {/* HEADER */}
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>PATROL RADAR & SECTOR MAP</Text>
          <Text style={styles.subtitle}>
            Active Units: {patrolUnits.length} • Sector: {officer?.assigned_zone || 'Indiranagar'}
          </Text>
        </View>
        <TouchableOpacity style={styles.refreshBtn} onPress={fetchMapData} disabled={isLoading}>
          <RefreshCw size={16} color="#60A5FA" />
        </TouchableOpacity>
      </View>

      {/* MAP */}
      <View style={styles.mapContainer}>
        <WebView
          ref={webViewRef}
          originWhitelist={['*']}
          source={{ html: mapHtml }}
          style={styles.webView}
        />

        {/* MAP OVERLAY LEGEND */}
        <Card style={styles.legendCard}>
          <View style={styles.legendRow}>
            <View style={[styles.legendDot, { backgroundColor: '#3B82F6' }]} />
            <Text style={styles.legendText}>Your Unit ({officer?.badge_number})</Text>
          </View>
          <View style={styles.legendRow}>
            <View style={[styles.legendDot, { backgroundColor: '#10B981' }]} />
            <Text style={styles.legendText}>Active Patrols ({patrolUnits.filter(u => !u.is_self).length})</Text>
          </View>
          <View style={styles.legendRow}>
            <View style={[styles.legendDot, { backgroundColor: '#EF4444' }]} />
            <Text style={styles.legendText}>Active Emergencies ({activeIncident ? 1 : 0})</Text>
          </View>
        </Card>
      </View>

      {/* FOOTER METRICS */}
      <View style={styles.footerBar}>
        <View style={styles.footerItem}>
          <Shield size={16} color="#60A5FA" />
          <Text style={styles.footerText}>Authorized Law Enforcement Map View</Text>
        </View>
        <Text style={styles.footerSubText}>Sensitive patrol locations restricted from civilian view</Text>
      </View>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#070D18',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: '800',
    color: '#F8FAFC',
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 2,
  },
  refreshBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#0F1A2E',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mapContainer: {
    flex: 1,
    position: 'relative',
  },
  webView: {
    flex: 1,
    backgroundColor: '#070D18',
  },
  legendCard: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: 'rgba(15, 26, 46, 0.92)',
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#1E2F4D',
    gap: 6,
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: 11,
    color: '#E2E8F0',
    fontWeight: '600',
  },
  footerBar: {
    backgroundColor: '#0A1322',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#1E293B',
  },
  footerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  footerText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  footerSubText: {
    fontSize: 10,
    color: '#64748B',
    marginTop: 2,
  },
});

