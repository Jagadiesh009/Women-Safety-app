import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Switch, Alert, Platform, RefreshControl } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import { ScreenWrapper } from '../../components/ui/ScreenWrapper';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { 
  Shield, 
  Radio, 
  AlertTriangle, 
  MapPin, 
  CheckCircle, 
  Clock, 
  LogOut, 
  TrendingUp, 
  Navigation,
  FileText,
  UserCheck,
  ChevronRight
} from 'lucide-react-native';
import * as Location from 'expo-location';

export function PoliceDashboardScreen({ navigation }) {
  const { officer, policeLogout, setOfficer } = useAuth();
  const [isOnDuty, setIsOnDuty] = useState(officer?.is_on_duty || false);
  const [isTogglingDuty, setIsTogglingDuty] = useState(false);
  const [dutyData, setDutyData] = useState(null);
  
  // Dashboard counts
  const [pendingAlertsCount, setPendingAlertsCount] = useState(0);
  const [activeIncident, setActiveIncident] = useState(null);
  const [historyCount, setHistoryCount] = useState(0);
  const [recommendationsCount, setRecommendationsCount] = useState(0);
  
  // Patrol location tracking
  const [patrolCoords, setPatrolCoords] = useState(null);
  const locationIntervalRef = useRef(null);
  const alertsPollingRef = useRef(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Load duty status and dashboard metrics
  const loadDashboardData = useCallback(async () => {
    try {
      const [dutyRes, alertsRes, activeIncRes, historyRes, recsRes] = await Promise.allSettled([
        api.getDutyStatus(),
        api.getIncomingAlerts(),
        api.getActivePoliceIncident(),
        api.getPoliceIncidentHistory(),
        api.getPatrolRecommendations()
      ]);

      if (dutyRes.status === 'fulfilled') {
        setDutyData(dutyRes.value);
        setIsOnDuty(dutyRes.value.is_on_duty);
        if (setOfficer && officer) {
          setOfficer({ ...officer, is_on_duty: dutyRes.value.is_on_duty });
        }
      }

      if (alertsRes.status === 'fulfilled' && Array.isArray(alertsRes.value)) {
        setPendingAlertsCount(alertsRes.value.length);
      }

      if (activeIncRes.status === 'fulfilled') {
        setActiveIncident(activeIncRes.value);
      }

      if (historyRes.status === 'fulfilled' && Array.isArray(historyRes.value)) {
        setHistoryCount(historyRes.value.length);
      }

      if (recsRes.status === 'fulfilled' && Array.isArray(recsRes.value)) {
        setRecommendationsCount(recsRes.value.length);
      }
    } catch (e) {
      console.warn("Failed to load police dashboard data:", e);
    }
  }, [officer, setOfficer]);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  // Handle duty toggling (backend is source of truth)
  const handleToggleDuty = async (value) => {
    setIsTogglingDuty(true);
    try {
      const updatedDuty = await api.toggleDutyStatus(
        value,
        officer?.station_name || officer?.assigned_zone || "Station not assigned",
        officer?.vehicle_number || "KA-01-G-102"
      );
      setIsOnDuty(updatedDuty.is_on_duty);
      setDutyData(updatedDuty);
      if (setOfficer && officer) {
        setOfficer({ ...officer, is_on_duty: updatedDuty.is_on_duty });
      }

      if (value) {
        // Start patrol location sharing
        startPatrolLocationUpdates();
      } else {
        // Stop patrol location sharing
        stopPatrolLocationUpdates();
      }
    } catch (e) {
      Alert.alert("Duty Status Error", e.message || "Failed to update duty status on backend.");
    } finally {
      setIsTogglingDuty(false);
    }
  };

  // Start sending GPS coordinates while ON DUTY
  const startPatrolLocationUpdates = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;

      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      setPatrolCoords(loc.coords);
      await api.updatePatrolLocation({
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
        accuracy: loc.coords.accuracy,
        speed: loc.coords.speed || 0,
        heading: loc.coords.heading || 0
      });

      if (!locationIntervalRef.current) {
        locationIntervalRef.current = setInterval(async () => {
          try {
            const cur = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
            setPatrolCoords(cur.coords);
            await api.updatePatrolLocation({
              latitude: cur.coords.latitude,
              longitude: cur.coords.longitude,
              accuracy: cur.coords.accuracy,
              speed: cur.coords.speed || 0,
              heading: cur.coords.heading || 0
            });
          } catch (err) {}
        }, 15000); // Every 15 seconds while on duty
      }
    } catch (err) {
      console.warn("Patrol location update error:", err);
    }
  };

  const stopPatrolLocationUpdates = () => {
    if (locationIntervalRef.current) {
      clearInterval(locationIntervalRef.current);
      locationIntervalRef.current = null;
    }
  };

  useEffect(() => {
    if (isOnDuty) {
      startPatrolLocationUpdates();
    } else {
      stopPatrolLocationUpdates();
    }
    return () => stopPatrolLocationUpdates();
  }, [isOnDuty]);

  // Periodic polling for incoming SOS alerts while on duty
  useEffect(() => {
    if (isOnDuty) {
      alertsPollingRef.current = setInterval(async () => {
        try {
          const alerts = await api.getIncomingAlerts();
          if (Array.isArray(alerts)) {
            setPendingAlertsCount(alerts.length);
          }
        } catch (e) {}
      }, 4000);
    } else {
      if (alertsPollingRef.current) clearInterval(alertsPollingRef.current);
    }
    return () => {
      if (alertsPollingRef.current) clearInterval(alertsPollingRef.current);
    };
  }, [isOnDuty]);

  const onRefresh = async () => {
    setIsRefreshing(true);
    await loadDashboardData();
    setIsRefreshing(false);
  };

  return (
    <ScreenWrapper scrollable edges={['top', 'bottom']} style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} tintColor="#60A5FA" />}
      >
        {/* POLICE OFFICER HEADER */}
        <View style={styles.header}>
          <View style={styles.officerMeta}>
            <View style={styles.badgeShield}>
              <Shield size={28} color="#60A5FA" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.officerRank}>{officer?.rank?.toUpperCase() || 'POLICE OFFICER'}</Text>
              <Text style={styles.officerName}>{officer?.name || 'Officer'}</Text>
              <Text style={styles.officerDetails}>
                Badge: {officer?.badge_number} • {officer?.station_name}
              </Text>
            </View>
          </View>
          <TouchableOpacity style={styles.logoutButton} onPress={policeLogout}>
            <LogOut size={18} color="#94A3B8" />
          </TouchableOpacity>
        </View>

        {/* DUTY STATUS CONTROLLER */}
        <Card style={[styles.dutyCard, isOnDuty ? styles.dutyCardOn : styles.dutyCardOff]}>
          <View style={styles.dutyRow}>
            <View style={{ flex: 1 }}>
              <View style={styles.dutyBadgeRow}>
                <View style={[styles.dutyStatusDot, { backgroundColor: isOnDuty ? '#10B981' : '#64748B' }]} />
                <Text style={[styles.dutyStatusLabel, { color: isOnDuty ? '#10B981' : '#94A3B8' }]}>
                  {isOnDuty ? 'PATROL ACTIVE • ON DUTY' : 'OFF DUTY • STANDBY'}
                </Text>
              </View>
              <Text style={styles.dutySectorText}>
                Assigned Station: {officer?.station_name || officer?.assigned_zone || 'Station not assigned'}
              </Text>
              <Text style={styles.dutySubText}>
                {isOnDuty 
                  ? 'Receiving real-time SOS dispatches & streaming patrol GPS' 
                  : 'Toggle ON DUTY to register for incoming SOS calls'}
              </Text>
            </View>

            <Switch
              value={isOnDuty}
              onValueChange={handleToggleDuty}
              disabled={isTogglingDuty}
              trackColor={{ false: '#334155', true: '#10B981' }}
              thumbColor={isOnDuty ? '#FFFFFF' : '#94A3B8'}
            />
          </View>
        </Card>

        {/* ACTIVE EMERGENCY RESPONSE CARD (IF ASSIGNED) */}
        {activeIncident && (
          <TouchableOpacity 
            activeOpacity={0.9} 
            onPress={() => navigation.navigate('PoliceIncidentResponse', { incidentId: activeIncident.id })}
          >
            <Card style={styles.activeIncidentCard}>
              <View style={styles.activeIncidentHeader}>
                <View style={styles.urgentBadge}>
                  <AlertTriangle size={16} color="#EF4444" />
                  <Text style={styles.urgentBadgeText}>ASSIGNED ACTIVE EMERGENCY</Text>
                </View>
                <ChevronRight size={18} color="#EF4444" />
              </View>
              <Text style={styles.incidentLocality}>
                Incident #{activeIncident.id} • {activeIncident.locality || 'Location not specified'}
              </Text>
              <Text style={styles.incidentCategory}>
                Category: {activeIncident.category} • Status: {activeIncident.dispatch_status}
              </Text>
              <View style={styles.actionPrompt}>
                <Navigation size={14} color="#60A5FA" />
                <Text style={styles.actionPromptText}>Tap to open tactical response screen & coordinates</Text>
              </View>
            </Card>
          </TouchableOpacity>
        )}

        {/* DASHBOARD METRICS GRID */}
        <View style={styles.metricsGrid}>
          <TouchableOpacity 
            style={styles.metricCard}
            onPress={() => navigation.navigate('PoliceAlerts')}
            activeOpacity={0.8}
          >
            <View style={styles.metricIconWrapper}>
              <Radio size={22} color={pendingAlertsCount > 0 ? "#EF4444" : "#60A5FA"} />
              {pendingAlertsCount > 0 && <View style={styles.alertPulseBadge} />}
            </View>
            <Text style={styles.metricValue}>{pendingAlertsCount}</Text>
            <Text style={styles.metricLabel}>New SOS Alerts</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.metricCard}
            onPress={() => navigation.navigate('PolicePatrolMap')}
            activeOpacity={0.8}
          >
            <View style={styles.metricIconWrapper}>
              <MapPin size={22} color="#10B981" />
            </View>
            <Text style={styles.metricValue}>{isOnDuty ? 'Active' : 'Idle'}</Text>
            <Text style={styles.metricLabel}>Patrol Map</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.metricCard}
            onPress={() => navigation.navigate('PoliceHistory')}
            activeOpacity={0.8}
          >
            <View style={styles.metricIconWrapper}>
              <CheckCircle size={22} color="#3B82F6" />
            </View>
            <Text style={styles.metricValue}>{historyCount}</Text>
            <Text style={styles.metricLabel}>Resolved History</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.metricCard}
            onPress={() => navigation.navigate('PoliceRecommendations')}
            activeOpacity={0.8}
          >
            <View style={styles.metricIconWrapper}>
              <TrendingUp size={22} color="#F59E0B" />
            </View>
            <Text style={styles.metricValue}>{recommendationsCount}</Text>
            <Text style={styles.metricLabel}>Area Patrol Recom.</Text>
          </TouchableOpacity>
        </View>

        {/* QUICK ACTION BUTTONS */}
        <View style={styles.quickActionsSection}>
          <Text style={styles.sectionTitle}>COMMAND & OPERATIONS</Text>

          <TouchableOpacity 
            style={styles.actionRow}
            onPress={() => navigation.navigate('PoliceAlerts')}
            activeOpacity={0.7}
          >
            <View style={[styles.actionIconBox, { backgroundColor: 'rgba(239, 68, 68, 0.15)' }]}>
              <Radio size={20} color="#EF4444" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.actionTitle}>Incoming SOS Alerts</Text>
              <Text style={styles.actionSub}>Review and accept emergency dispatches from victims</Text>
            </View>
            {pendingAlertsCount > 0 && (
              <View style={styles.countPill}>
                <Text style={styles.countPillText}>{pendingAlertsCount}</Text>
              </View>
            )}
            <ChevronRight size={18} color="#64748B" />
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.actionRow}
            onPress={() => navigation.navigate('PolicePatrolMap')}
            activeOpacity={0.7}
          >
            <View style={[styles.actionIconBox, { backgroundColor: 'rgba(16, 185, 129, 0.15)' }]}>
              <MapPin size={20} color="#10B981" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.actionTitle}>Live Patrol Radar Map</Text>
              <Text style={styles.actionSub}>View sector coverage, nearby police units & incidents</Text>
            </View>
            <ChevronRight size={18} color="#64748B" />
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.actionRow}
            onPress={() => navigation.navigate('PoliceRecommendations')}
            activeOpacity={0.7}
          >
            <View style={[styles.actionIconBox, { backgroundColor: 'rgba(245, 158, 11, 0.15)' }]}>
              <UserCheck size={20} color="#F59E0B" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.actionTitle}>Patrol Attention Recommendations</Text>
              <Text style={styles.actionSub}>Weekly concentration hot-spots & supervisor deployments</Text>
            </View>
            <ChevronRight size={18} color="#64748B" />
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.actionRow}
            onPress={() => navigation.navigate('PoliceWeeklyReport')}
            activeOpacity={0.7}
          >
            <View style={[styles.actionIconBox, { backgroundColor: 'rgba(59, 130, 246, 0.15)' }]}>
              <FileText size={20} color="#3B82F6" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.actionTitle}>Weekly Crime Analytics & PDF</Text>
              <Text style={styles.actionSub}>Official locality crime rankings, trends & intelligence report</Text>
            </View>
            <ChevronRight size={18} color="#64748B" />
          </TouchableOpacity>
        </View>

        {/* PATROL TELEMETRY CARD */}
        {isOnDuty && (
          <Card style={styles.telemetryCard}>
            <View style={styles.telemetryHeader}>
              <Navigation size={16} color="#10B981" />
              <Text style={styles.telemetryTitle}>Patrol GPS Telemetry (Active)</Text>
            </View>
            <Text style={styles.telemetryCoords}>
              {patrolCoords 
                ? `Lat: ${patrolCoords.latitude.toFixed(5)}, Lng: ${patrolCoords.longitude.toFixed(5)} (±${patrolCoords.accuracy ? Math.round(patrolCoords.accuracy) : 5}m)` 
                : 'Acquiring satellite lock...'}
            </Text>
          </Card>
        )}

      </ScrollView>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#070D18',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    marginBottom: 16,
  },
  officerMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  badgeShield: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#0F1E36',
    borderWidth: 1.5,
    borderColor: '#3B82F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  officerRank: {
    fontSize: 11,
    fontWeight: '800',
    color: '#3B82F6',
    letterSpacing: 0.5,
  },
  officerName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  officerDetails: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 2,
  },
  logoutButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#1E293B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dutyCard: {
    padding: 16,
    borderRadius: 16,
    marginBottom: 16,
    borderWidth: 1.5,
  },
  dutyCardOn: {
    backgroundColor: '#0A251E',
    borderColor: '#10B981',
  },
  dutyCardOff: {
    backgroundColor: '#0F172A',
    borderColor: '#334155',
  },
  dutyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  dutyBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  dutyStatusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  dutyStatusLabel: {
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  dutySectorText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#F8FAFC',
    marginTop: 2,
  },
  dutySubText: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 4,
    lineHeight: 15,
  },
  activeIncidentCard: {
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderColor: '#EF4444',
    borderWidth: 1.5,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  activeIncidentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  urgentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  urgentBadgeText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#EF4444',
    letterSpacing: 0.5,
  },
  incidentLocality: {
    fontSize: 16,
    fontWeight: '700',
    color: '#F8FAFC',
    marginBottom: 4,
  },
  incidentCategory: {
    fontSize: 13,
    color: '#FCA5A5',
    marginBottom: 10,
  },
  actionPrompt: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderTopWidth: 1,
    borderTopColor: 'rgba(239, 68, 68, 0.2)',
    paddingTop: 8,
  },
  actionPromptText: {
    fontSize: 12,
    color: '#60A5FA',
    fontWeight: '600',
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 20,
  },
  metricCard: {
    width: '48%',
    backgroundColor: '#0F1A2E',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#1E2F4D',
  },
  metricIconWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  alertPulseBadge: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#EF4444',
  },
  metricValue: {
    fontSize: 22,
    fontWeight: '800',
    color: '#F8FAFC',
    marginBottom: 2,
  },
  metricLabel: {
    fontSize: 12,
    color: '#94A3B8',
    fontWeight: '500',
  },
  quickActionsSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 0.8,
    marginBottom: 12,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0F1A2E',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1E2F4D',
    marginBottom: 10,
    gap: 12,
  },
  actionIconBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#F8FAFC',
    marginBottom: 2,
  },
  actionSub: {
    fontSize: 11,
    color: '#94A3B8',
  },
  countPill: {
    backgroundColor: '#EF4444',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  countPillText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  telemetryCard: {
    backgroundColor: '#0A1828',
    borderColor: '#1E3A5F',
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
  },
  telemetryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  telemetryTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#10B981',
  },
  telemetryCoords: {
    fontSize: 11,
    color: '#94A3B8',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
});

