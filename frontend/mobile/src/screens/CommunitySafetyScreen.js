import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { WebView } from 'react-native-webview';
import { api } from '../services/api';
import { ScreenWrapper } from '../components/ui/ScreenWrapper';
import { Card } from '../components/ui/Card';
import { useAppTheme, spacing, typography, borderRadius } from '../utils/theme';
import { Shield, AlertTriangle, MapPin, Radio, Clock, ArrowLeft, ShieldAlert, CheckCircle } from 'lucide-react-native';

export function CommunitySafetyScreen({ navigation }) {
  const { colors, isDark } = useAppTheme();
  const [safetyLocalities, setSafetyLocalities] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [mapRes, alertsRes] = await Promise.allSettled([
        api.getCommunitySafetyMap(),
        api.getCommunityAlerts()
      ]);
      if (mapRes.status === 'fulfilled' && Array.isArray(mapRes.value)) {
        setSafetyLocalities(mapRes.value);
      }
      if (alertsRes.status === 'fulfilled' && Array.isArray(alertsRes.value)) {
        setAlerts(alertsRes.value);
      }
    } catch (e) {
      console.warn("Failed to load community safety data:", e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const mapHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
      <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
      <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
      <style>
        body { padding: 0; margin: 0; }
        html, body, #map { height: 100%; width: 100%; }
        .comm-pin {
          width: 24px; height: 24px; border-radius: 50%;
          border: 2.5px solid #FFFFFF;
          box-shadow: 0 0 10px rgba(0,0,0,0.5);
          display: flex; align-items: center; justify-content: center;
          color: white; font-size: 10px; font-weight: bold;
        }
        .comm-pin.red { background: #EF4444; }
        .comm-pin.orange { background: #F59E0B; }
        .comm-pin.green { background: #10B981; }
      </style>
    </head>
    <body>
      <div id="map"></div>
      <script>
        var map = L.map('map', { zoomControl: false }).setView([12.9716, 77.5946], 12);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 18 }).addTo(map);

        var locs = ${JSON.stringify(safetyLocalities)};
        locs.forEach(function(l) {
          var colorClass = l.risk_color.toLowerCase();
          var icon = L.divIcon({ className: 'comm-pin ' + colorClass, iconSize: [24, 24] });
          L.marker([l.latitude, l.longitude], { icon: icon })
            .addTo(map)
            .bindPopup("<b>" + l.locality + "</b><br>Concentration: " + l.risk_color + "<br>Verified Incidents: " + l.verified_incident_count + "<br>Patrol Active: " + (l.has_active_patrol ? "Yes" : "Standard Beats"));
        });
      </script>
    </body>
    </html>
  `;

  return (
    <ScreenWrapper scrollable edges={['top', 'bottom']} style={{ backgroundColor: colors.bgPrimary }}>
      {/* HEADER */}
      <View style={styles.topHeader}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <ArrowLeft size={20} color={colors.textPrimary} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>COMMUNITY SAFETY RADAR</Text>
          <Text style={styles.headerSubtitle}>Verified area incident concentration & official police advisories</Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={fetchData} tintColor={colors.accentBrand} />}
      >
        {/* INTERACTIVE COMMUNITY MAP */}
        <View style={styles.mapContainer}>
          <WebView
            originWhitelist={['*']}
            source={{ html: mapHtml }}
            style={styles.webView}
            scrollEnabled={false}
          />

          {/* MAP LEGEND */}
          <View style={[styles.legendBox, { backgroundColor: isDark ? 'rgba(15,26,46,0.92)' : 'rgba(255,255,255,0.92)' }]}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#EF4444' }]} />
              <Text style={[styles.legendLabel, { color: colors.textPrimary }]}>Higher Verified</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#F59E0B' }]} />
              <Text style={[styles.legendLabel, { color: colors.textPrimary }]}>Moderate</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#10B981' }]} />
              <Text style={[styles.legendLabel, { color: colors.textPrimary }]}>Lower Verified</Text>
            </View>
          </View>
        </View>

        {/* VERIFIED SAFETY ADVISORIES (FEATURE 5) */}
        <Text style={[styles.sectionHeading, { color: colors.textSecondary }]}>OFFICIAL LOCALITY ADVISORIES</Text>

        {alerts.map(alert => (
          <Card key={alert.id} style={[styles.alertCard, { backgroundColor: colors.bgSecondary, borderColor: colors.border }]}>
            <View style={styles.alertHeader}>
              <View style={styles.alertLocRow}>
                <ShieldAlert size={16} color="#EF4444" />
                <Text style={[styles.alertLocName, { color: colors.textPrimary }]}>{alert.locality}</Text>
              </View>
              <View style={styles.alertBadge}>
                <Text style={styles.alertBadgeText}>{alert.severity}</Text>
              </View>
            </View>

            <Text style={[styles.alertTitle, { color: colors.textPrimary }]}>{alert.title}</Text>
            <Text style={styles.alertBody}>{alert.advisory}</Text>

            {alert.precautions ? (
              <View style={[styles.precautionsBox, { backgroundColor: colors.bgTertiary }]}>
                <Text style={[styles.precautionsTitle, { color: colors.accentBrand }]}>Recommended Precautions:</Text>
                <Text style={styles.precautionsText}>{alert.precautions}</Text>
              </View>
            ) : null}

            <View style={styles.alertFooter}>
              <Text style={styles.alertAuthority}>Issued by: {alert.issuing_authority}</Text>
              <Text style={styles.alertDate}>{new Date(alert.created_at).toLocaleDateString()}</Text>
            </View>
          </Card>
        ))}

        {/* TRANSPARENT CLASSIFICATION METHOD NOTE */}
        <View style={[styles.infoCard, { backgroundColor: colors.bgSecondary, borderColor: colors.border }]}>
          <Text style={[styles.infoTitle, { color: colors.textPrimary }]}>Data Transparency & Standards</Text>
          <Text style={styles.infoText}>
            Classifications are calculated transparently from stored verified police incidents over a rolling 14-day window. Localities are never labeled based on a single unverified complaint.
          </Text>
          <Text style={styles.infoSource}>
            Source: SafeHer Verified Registry & Bengaluru City Police Dispatch
          </Text>
        </View>

      </ScrollView>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  backButton: {
    padding: 6,
    borderRadius: 8,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  headerSubtitle: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 1,
  },
  scrollContent: {
    padding: 16,
    paddingTop: 4,
    paddingBottom: 40,
  },
  mapContainer: {
    height: 220,
    borderRadius: 14,
    overflow: 'hidden',
    position: 'relative',
    marginBottom: 16,
  },
  webView: {
    flex: 1,
  },
  legendBox: {
    position: 'absolute',
    bottom: 10,
    left: 10,
    right: 10,
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 8,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
  sectionHeading: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
    marginBottom: 10,
  },
  alertCard: {
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 12,
  },
  alertHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  alertLocRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  alertLocName: {
    fontSize: 14,
    fontWeight: '700',
  },
  alertBadge: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  alertBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#EF4444',
  },
  alertTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 6,
  },
  alertBody: {
    fontSize: 12,
    color: '#94A3B8',
    lineHeight: 17,
    marginBottom: 10,
  },
  precautionsBox: {
    padding: 10,
    borderRadius: 8,
    marginBottom: 10,
  },
  precautionsTitle: {
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 2,
  },
  precautionsText: {
    fontSize: 11,
    color: '#94A3B8',
    lineHeight: 15,
  },
  alertFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(148, 163, 184, 0.15)',
  },
  alertAuthority: {
    fontSize: 10,
    color: '#64748B',
  },
  alertDate: {
    fontSize: 10,
    color: '#64748B',
  },
  infoCard: {
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 8,
  },
  infoTitle: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 4,
  },
  infoText: {
    fontSize: 11,
    color: '#94A3B8',
    lineHeight: 16,
    marginBottom: 6,
  },
  infoSource: {
    fontSize: 10,
    color: '#64748B',
    fontStyle: 'italic',
  },
});

