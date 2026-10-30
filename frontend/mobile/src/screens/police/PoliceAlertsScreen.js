import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, Alert, RefreshControl, Platform } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import { ScreenWrapper } from '../../components/ui/ScreenWrapper';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Radio, AlertTriangle, MapPin, Clock, CheckCircle2, XCircle, Navigation, ShieldAlert } from 'lucide-react-native';

export function PoliceAlertsScreen({ navigation }) {
  const { officer } = useAuth();
  const [alerts, setAlerts] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [processingId, setProcessingId] = useState(null);
  const pollingRef = useRef(null);

  const fetchAlerts = useCallback(async () => {
    try {
      const data = await api.getIncomingAlerts();
      if (Array.isArray(data)) {
        setAlerts(data);
      }
    } catch (e) {
      console.warn("Failed to fetch incoming police alerts:", e);
    }
  }, []);

  useEffect(() => {
    fetchAlerts();
    pollingRef.current = setInterval(fetchAlerts, 3000); // 3-second rapid polling
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [fetchAlerts]);

  const handleAccept = async (incidentId) => {
    setProcessingId(incidentId);
    try {
      const res = await api.acceptAlert(incidentId);
      Alert.alert(
        "Incident Accepted",
        `You have been assigned to Incident #${incidentId}. Opening incident response console...`,
        [{
          text: "Open Response Console",
          onPress: () => navigation.navigate('PoliceIncidentResponse', { incidentId })
        }]
      );
      fetchAlerts();
    } catch (err) {
      if (err.status === 409) {
        Alert.alert("Already Assigned", err.message || "Another patrol officer has already accepted this incident.");
      } else {
        Alert.alert("Error", err.message || "Failed to accept alert. Verify you are marked ON DUTY.");
      }
      fetchAlerts();
    } finally {
      setProcessingId(null);
    }
  };

  const handleDecline = async (incidentId) => {
    setProcessingId(incidentId);
    try {
      await api.declineAlert(incidentId);
      setAlerts(prev => prev.filter(a => a.incident_id !== incidentId));
    } catch (err) {
      Alert.alert("Error", err.message || "Failed to decline alert.");
    } finally {
      setProcessingId(null);
    }
  };

  const renderAlertCard = ({ item }) => {
    const elapsedMinutes = Math.max(0, Math.floor((Date.now() - new Date(item.incident_time).getTime()) / 60000));
    const isProcessing = processingId === item.incident_id;

    return (
      <Card style={styles.alertCard}>
        <View style={styles.alertHeader}>
          <View style={styles.alertTitleBadge}>
            <Radio size={18} color="#EF4444" />
            <Text style={styles.alertTitleText}>EMERGENCY SOS DISPATCH</Text>
          </View>
          <View style={styles.timeBadge}>
            <Clock size={12} color="#F87171" />
            <Text style={styles.timeBadgeText}>{elapsedMinutes}m ago</Text>
          </View>
        </View>

        <Text style={styles.localityText}>
          {item.locality || 'Indiranagar Sector'}, {item.city || 'Bengaluru'}
        </Text>

        <View style={styles.detailsGrid}>
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>INCIDENT ID</Text>
            <Text style={styles.detailValue}>#{item.incident_id}</Text>
          </View>
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>TRIGGER</Text>
            <Text style={styles.detailValue}>{item.trigger_source}</Text>
          </View>
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>DISTANCE</Text>
            <Text style={styles.detailValue}>
              {item.distance_km != null ? `~${item.distance_km} km` : 'Calculating...'}
            </Text>
          </View>
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>CATEGORY</Text>
            <Text style={styles.detailValue}>{item.category}</Text>
          </View>
        </View>

        {item.latitude != null && item.longitude != null && (
          <View style={styles.coordsRow}>
            <Navigation size={14} color="#60A5FA" />
            <Text style={styles.coordsText}>
              Lat: {item.latitude.toFixed(5)}, Lng: {item.longitude.toFixed(5)} {item.accuracy ? `(±${Math.round(item.accuracy)}m)` : ''}
            </Text>
          </View>
        )}

        {/* ACTION BUTTONS */}
        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={[styles.declineButton, isProcessing && styles.buttonDisabled]}
            onPress={() => handleDecline(item.incident_id)}
            disabled={isProcessing}
            activeOpacity={0.8}
          >
            <XCircle size={18} color="#94A3B8" />
            <Text style={styles.declineText}>Decline</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.acceptButton, isProcessing && styles.buttonDisabled]}
            onPress={() => handleAccept(item.incident_id)}
            disabled={isProcessing}
            activeOpacity={0.8}
          >
            <CheckCircle2 size={18} color="#FFFFFF" />
            <Text style={styles.acceptText}>
              {isProcessing ? 'Accepting...' : 'ACCEPT DISPATCH'}
            </Text>
          </TouchableOpacity>
        </View>
      </Card>
    );
  };

  return (
    <ScreenWrapper edges={['top', 'bottom']} style={styles.container}>
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>INCOMING SOS ALERTS</Text>
          <Text style={styles.subtitle}>
            {officer?.is_on_duty 
              ? 'Monitoring real-time citizen emergency triggers' 
              : 'OFF DUTY - alerts paused until marked on-duty'}
          </Text>
        </View>
        <TouchableOpacity style={styles.refreshIconBtn} onPress={fetchAlerts}>
          <Clock size={16} color="#60A5FA" />
        </TouchableOpacity>
      </View>

      {!officer?.is_on_duty && (
        <Card style={styles.offDutyNotice}>
          <ShieldAlert size={20} color="#F59E0B" />
          <View style={{ flex: 1 }}>
            <Text style={styles.offDutyTitle}>Officer Marked OFF DUTY</Text>
            <Text style={styles.offDutyText}>
              Turn ON DUTY on the police dashboard to receive live SOS dispatch notifications in your sector.
            </Text>
          </View>
        </Card>
      )}

      <FlatList
        data={alerts}
        keyExtractor={(item) => String(item.notification_id || item.incident_id)}
        renderItem={renderAlertCard}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={fetchAlerts} tintColor="#60A5FA" />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <CheckCircle2 size={48} color="#10B981" />
            <Text style={styles.emptyStateTitle}>No Active Emergency Alerts</Text>
            <Text style={styles.emptyStateSub}>
              All reported sector incidents have been addressed or assigned.
            </Text>
          </View>
        }
      />
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
    paddingTop: 12,
    paddingBottom: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: '#F8FAFC',
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 2,
  },
  refreshIconBtn: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#0F1A2E',
  },
  offDutyNotice: {
    flexDirection: 'row',
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    borderColor: '#F59E0B',
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginHorizontal: 16,
    marginBottom: 12,
    gap: 10,
    alignItems: 'center',
  },
  offDutyTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#F59E0B',
  },
  offDutyText: {
    fontSize: 11,
    color: '#CBD5E1',
    marginTop: 2,
  },
  listContent: {
    padding: 16,
    paddingTop: 8,
    paddingBottom: 40,
  },
  alertCard: {
    backgroundColor: '#0F1A2E',
    borderColor: '#EF4444',
    borderWidth: 1.5,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  alertHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  alertTitleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  alertTitleText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#EF4444',
    letterSpacing: 0.5,
  },
  timeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  timeBadgeText: {
    fontSize: 11,
    color: '#FCA5A5',
    fontWeight: '700',
  },
  localityText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#F8FAFC',
    marginBottom: 12,
  },
  detailsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    backgroundColor: '#0A1322',
    borderRadius: 10,
    padding: 10,
    marginBottom: 12,
  },
  detailItem: {
    width: '50%',
    paddingVertical: 4,
  },
  detailLabel: {
    fontSize: 10,
    color: '#64748B',
    fontWeight: '700',
  },
  detailValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#E2E8F0',
    marginTop: 1,
  },
  coordsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 14,
  },
  coordsText: {
    fontSize: 11,
    color: '#94A3B8',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  declineButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1E293B',
    paddingVertical: 12,
    borderRadius: 10,
    gap: 6,
    borderWidth: 1,
    borderColor: '#334155',
  },
  declineText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#94A3B8',
  },
  acceptButton: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#16A34A',
    paddingVertical: 12,
    borderRadius: 10,
    gap: 6,
  },
  acceptText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyStateTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#94A3B8',
    marginTop: 12,
  },
  emptyStateSub: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 4,
    maxWidth: 260,
  },
});

