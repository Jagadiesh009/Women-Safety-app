import React, { useEffect, useRef, useState, useMemo } from 'react';
import { View, Text, StyleSheet, Animated, Platform, Alert } from 'react-native';
import { useEmergency } from '../context/EmergencyContext';
import { useLocation } from '../hooks/useLocation';
import { initiateEmergencyCall } from '../services/emergencyCommunication';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { ScreenWrapper } from '../components/ui/ScreenWrapper';
import { Phone, StopCircle, Radio, Clock, AlertTriangle, Navigation, CheckCircle, Shield } from 'lucide-react-native';
import { api } from '../services/api';
import { useAppTheme, spacing, typography, borderRadius } from '../utils/theme';

export function EmergencyActiveScreen({ navigation }) {
  const { activeIncident, endEmergency, updateIncidentLocation } = useEmergency();
  const { location, refreshLocation } = useLocation();
  const pulseAnim = useRef(new Animated.Value(0)).current;
  const [secondsAgo, setSecondsAgo] = useState(0);
  const [dispatchInfo, setDispatchInfo] = useState(null);

  // Poll police dispatch progress from backend
  useEffect(() => {
    if (!activeIncident?.id) return;
    let isMounted = true;

    const checkDispatch = async () => {
      try {
        const info = await api.getIncidentDispatchStatus(activeIncident.id);
        if (isMounted) {
          setDispatchInfo(info);
        }
      } catch (e) {
        // Fallback gracefully if dispatch endpoint not yet reachable
      }
    };

    checkDispatch();
    const timer = setInterval(checkDispatch, 3000);
    return () => {
      isMounted = false;
      clearInterval(timer);
    };
  }, [activeIncident?.id]);

  const { colors, shadows, isDark } = useAppTheme();
  const styles = useMemo(() => getStyles(colors, shadows, isDark), [colors, shadows, isDark]);

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1, duration: 1000, useNativeDriver: Platform.OS !== 'web' }),
        Animated.timing(pulseAnim, { toValue: 0, duration: 1000, useNativeDriver: Platform.OS !== 'web' }),
      ])
    ).start();
  }, [pulseAnim]);

  useEffect(() => {
    if (activeIncident?.startTime) {
      const interval = setInterval(() => {
        const diff = Math.floor((Date.now() - new Date(activeIncident.startTime).getTime()) / 1000);
        setSecondsAgo(diff > 0 ? diff : 0);
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [activeIncident]);

  // Live location tracking: automatically streams from singleton location watcher
  useEffect(() => {
    refreshLocation();
  }, [refreshLocation]);

  // Sync new location to incident
  useEffect(() => {
    if (location && activeIncident) {
      // Only update if location changed significantly to avoid spam
      const currentLoc = activeIncident.latestLocation || activeIncident.initialLocation || activeIncident.location;
      const currentLat = currentLoc?.latitude || currentLoc?.lat;
      const currentLng = currentLoc?.longitude || currentLoc?.lng;
      
      if (!currentLoc || currentLat !== location.lat || currentLng !== location.lng) {
        updateIncidentLocation(location);
      }
    }
  }, [location, activeIncident, updateIncidentLocation]);

  const handleEndEmergency = () => {
    if (Platform.OS === 'web') {
      const confirm = window.confirm("Are you sure you want to end this emergency?");
      if (confirm) {
        endEmergency();
      }
    } else {
      Alert.alert(
        "End Emergency",
        "Are you sure you want to end this emergency?",
        [
          { text: "Cancel", style: "cancel" },
          { 
            text: "End Emergency", 
            style: "destructive",
            onPress: () => {
              endEmergency();
            }
          }
        ]
      );
    }
  };

  if (!activeIncident) return null;

  const loc = activeIncident.latestLocation || activeIncident.initialLocation || activeIncident.location || location || {};
  const isHighAccuracy = loc.accuracyLevel === 'HIGH' || loc.accuracy < 20;

  const primaryContact = activeIncident.emergencyContacts?.find(c => (c.isPrimary || c.is_primary) && c.enabled !== false) 
    || activeIncident.emergencyContacts?.find(c => c.enabled !== false && c.phone) 
    || activeIncident.emergencyContacts?.[0];
  
  const callActionTitle = primaryContact?.name 
    ? `CALL ${primaryContact.name.toUpperCase()}` 
    : (primaryContact?.phone ? `CALL ${primaryContact.phone}` : "CALL 112");

  const handleManualCall = () => {
    if (primaryContact?.phone) {
      initiateEmergencyCall(primaryContact, primaryContact.phone);
    } else {
      initiateEmergencyCall({ phone: '112' }, '112');
    }
  };

  return (
    <ScreenWrapper scrollable edges={['top', 'bottom']} style={styles.container}>
      <Animated.View pointerEvents="none" style={[styles.redFlash, { opacity: pulseAnim }]} />
      
      <View style={styles.content}>
        <View style={styles.header}>
          <View style={styles.alertIconWrapper}>
            <AlertTriangle size={42} color={colors.accentEmergency} />
          </View>
          <Text style={styles.title}>EMERGENCY ACTIVE</Text>
          <Text style={styles.subtitle}>Incident {activeIncident.id}</Text>
        </View>

        <Card style={styles.trackingCard}>
          <View style={styles.trackingHeader}>
            <View style={styles.liveRow}>
              <Animated.View style={{ opacity: pulseAnim }}>
                <Radio size={20} color={colors.accentEmergency} />
              </Animated.View>
              <Text style={styles.liveText}>LIVE LOCATION</Text>
            </View>
            <Text style={styles.updatedText}>Elapsed: {secondsAgo}s</Text>
          </View>
          
          <View style={styles.mapData}>
            <View style={styles.row}>
              <Navigation size={14} color={isHighAccuracy ? colors.accentSafe : colors.accentWarning} style={{ transform: [{ rotate: '45deg' }] }} />
              <Text style={[styles.coordsText, { color: isHighAccuracy ? colors.accentSafe : colors.accentWarning }]}>
                GPS ACCURACY {loc?.accuracy ? `(±${loc.accuracy}m)` : ''}
              </Text>
            </View>
            <Text style={styles.coordsDetail}>
            {loc?.addressLabel ? loc.addressLabel : (
                (loc?.latitude != null && loc?.longitude != null) ? 
                  `Lat: ${Number(loc.latitude).toFixed(5)}, Lng: ${Number(loc.longitude).toFixed(5)}` 
                : (loc?.lat != null && loc?.lng != null) ?
                  `Lat: ${Number(loc.lat).toFixed(5)}, Lng: ${Number(loc.lng).toFixed(5)}`
                : 'Location unavailable'
              )}
            </Text>
          </View>
        </Card>

        {/* POLICE DISPATCH PROGRESS CARD */}
        <Card style={[styles.timelineCard, { marginBottom: spacing.lg, borderColor: '#3B82F6', borderWidth: 1 }]} variant="flat">
          <View style={styles.timelineHeader}>
            <Shield size={18} color="#3B82F6" />
            <Text style={[styles.timelineTitle, { color: colors.textPrimary }]}>Police Dispatch Status</Text>
          </View>
          <View style={{ paddingTop: spacing.md }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.xs, justifyContent: 'space-between' }}>
              <Text style={{ fontSize: 13, fontWeight: '700', color: '#60A5FA' }}>
                {dispatchInfo ? dispatchInfo.dispatch_status : 'CHECKING DISPATCH...'}
              </Text>
              {dispatchInfo?.assigned_officer_badge && (
                <View style={{ backgroundColor: 'rgba(59, 130, 246, 0.15)', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 }}>
                  <Text style={{ fontSize: 11, fontWeight: '800', color: '#60A5FA' }}>
                    {dispatchInfo.assigned_officer_badge}
                  </Text>
                </View>
              )}
            </View>

            <Text style={{ color: colors.textSecondary, fontSize: 12, lineHeight: 17, marginBottom: 8 }}>
              {dispatchInfo?.message || 'Contacting police patrol dispatch system...'}
            </Text>

            {dispatchInfo?.assigned_officer_name && (
              <View style={{ backgroundColor: isDark ? '#0A1322' : '#F1F5F9', padding: 8, borderRadius: 8, marginTop: 4 }}>
                <Text style={{ fontSize: 12, fontWeight: '600', color: colors.textPrimary }}>
                  Officer: {dispatchInfo.assigned_officer_name} ({dispatchInfo.assigned_officer_rank || 'Patrol Unit'})
                </Text>
                <Text style={{ fontSize: 11, color: colors.textSecondary, marginTop: 2 }}>
                  Station: {dispatchInfo.assigned_officer_station || 'Bengaluru City Police'}
                  {dispatchInfo.assigned_officer_vehicle ? ` • Vehicle: ${dispatchInfo.assigned_officer_vehicle}` : ''}
                </Text>
              </View>
            )}
          </View>
        </Card>

        {activeIncident.emergencyContacts && activeIncident.emergencyContacts.length > 0 && (
          <Card style={[styles.timelineCard, { marginBottom: spacing.lg }]} variant="flat">
            <View style={styles.timelineHeader}>
              <Text style={styles.timelineTitle}>Emergency Communication</Text>
            </View>
            <View style={{ paddingTop: spacing.md }}>
              {activeIncident.emergencyContacts.map((contact, idx) => {
                let statusText = 'Pending...';
                let statusColor = colors.textTertiary;
                let StatusIcon = Clock;

                if (contact.status === 'QUEUED') {
                  statusText = 'SMS Queued';
                  statusColor = colors.accentSafe;
                  StatusIcon = CheckCircle;
                } else if (contact.status === 'FAILED' || contact.status === 'PERMISSION_DENIED') {
                  statusText = 'SMS Failed';
                  statusColor = colors.accentEmergency;
                  StatusIcon = AlertTriangle;
                } else if (contact.status === 'UNAVAILABLE') {
                  statusText = 'SMS Unavailable';
                  statusColor = colors.accentWarning;
                  StatusIcon = AlertTriangle;
                }

                return (
                  <View key={idx} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.sm }}>
                    <StatusIcon size={16} color={statusColor} style={{ marginRight: spacing.sm }} />
                    <Text style={{ color: colors.textPrimary, flex: 1, ...typography.bodySemibold }}>
                      SMS — {contact.name}
                    </Text>
                    <Text style={{ color: statusColor, ...typography.caption }}>
                      {statusText}
                    </Text>
                  </View>
                );
              })}
            </View>
          </Card>
        )}

        <Card style={styles.timelineCard} variant="flat">
          <View style={styles.timelineHeader}>
            <Clock size={18} color={colors.textSecondary} />
            <Text style={styles.timelineTitle}>Event Log</Text>
          </View>
          
          <View style={styles.timelineContainer}>
            {activeIncident.timeline.map((item, idx) => (
              <View key={idx} style={styles.timelineItem}>
                <View style={styles.timelineLine} />
                <View style={styles.timelineDot} />
                <View style={styles.timelineContent}>
                  <Text style={styles.timelineTime}>{item.time}</Text>
                  <Text style={styles.timelineEvent}>{item.event}</Text>
                </View>
              </View>
            ))}
          </View>
        </Card>

        <View style={styles.actions}>
          <Button 
            title={callActionTitle}
            variant="danger" 
            icon={<Phone size={22} color="#FFFFFF" />}
            style={styles.actionBtn}
            onPress={handleManualCall}
          />
          <Button 
            title="VIEW DETAILS" 
            variant="outline" 
            style={styles.actionBtn}
            onPress={() => navigation.navigate('IncidentDetails')}
          />
          <Button 
            title="END EMERGENCY" 
            variant="ghost" 
            icon={<StopCircle size={22} color={colors.accentEmergency} />}
            textStyle={{ color: colors.accentEmergency }}
            style={styles.endBtn}
            onPress={handleEndEmergency}
          />
        </View>
      </View>
    </ScreenWrapper>
  );
}

const getStyles = (colors, shadows, isDark) => StyleSheet.create({
  container: {
    backgroundColor: isDark ? '#140505' : '#FFF0F0', // Dark red tint for emergency state
  },
  redFlash: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.accentEmergencyMuted,
    borderWidth: 2,
    borderColor: isDark ? 'rgba(244, 63, 94, 0.3)' : 'rgba(225, 29, 72, 0.3)',
  },
  content: {
    padding: spacing.xl,
    paddingBottom: spacing.xxxl,
  },
  header: {
    alignItems: 'center',
    marginVertical: spacing.xl,
  },
  alertIconWrapper: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.accentEmergencyMuted,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
    ...shadows.glowEmergency,
  },
  title: {
    ...typography.h1,
    color: colors.accentEmergency,
    marginTop: spacing.sm,
    letterSpacing: 1,
  },
  subtitle: {
    ...typography.body,
    color: colors.textPrimary,
    marginTop: 4,
  },
  trackingCard: {
    backgroundColor: isDark ? 'rgba(244, 63, 94, 0.05)' : 'rgba(225, 29, 72, 0.05)',
    borderColor: isDark ? 'rgba(244, 63, 94, 0.2)' : 'rgba(225, 29, 72, 0.2)',
    borderWidth: 1,
    marginBottom: spacing.lg,
  },
  trackingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  liveRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  liveText: {
    ...typography.subhead,
    color: colors.textPrimary,
    fontWeight: '700',
    letterSpacing: 1,
  },
  updatedText: {
    ...typography.footnote,
    color: colors.textSecondary,
  },
  mapData: {
    backgroundColor: isDark ? 'rgba(0,0,0,0.4)' : 'rgba(255,255,255,0.6)',
    borderRadius: borderRadius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: isDark ? 'rgba(244, 63, 94, 0.15)' : 'rgba(225, 29, 72, 0.15)',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  coordsText: {
    ...typography.caption,
    fontWeight: '700',
  },
  coordsDetail: {
    color: colors.textSecondary,
    fontSize: 13,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    marginTop: 4,
  },
  timelineCard: {
    marginBottom: spacing.xl,
  },
  timelineHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  timelineTitle: {
    ...typography.h3,
    color: colors.textPrimary,
  },
  timelineContainer: {
    marginLeft: 12,
  },
  timelineItem: {
    flexDirection: 'row',
    marginBottom: spacing.lg,
  },
  timelineLine: {
    position: 'absolute',
    left: 5,
    top: 18,
    bottom: -32,
    width: 2,
    backgroundColor: colors.border,
  },
  timelineDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.textSecondary,
    marginTop: 6,
    marginRight: 16,
    zIndex: 1,
  },
  timelineContent: {
    flex: 1,
  },
  timelineTime: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  timelineEvent: {
    ...typography.bodySemibold,
    color: colors.textPrimary,
    marginTop: 4,
  },
  actions: {
    gap: spacing.md,
    marginTop: spacing.md,
  },
  actionBtn: {
    width: '100%',
  },
  endBtn: {
    marginTop: spacing.sm,
    paddingVertical: spacing.md,
  }
});
