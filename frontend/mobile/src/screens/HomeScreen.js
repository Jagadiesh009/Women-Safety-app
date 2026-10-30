import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform, useWindowDimensions, ScrollView, Animated, ActivityIndicator } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../context/AuthContext';
import { useEmergency } from '../context/EmergencyContext';
import { SOSButton } from '../components/SOSButton';
import { LocationStatus } from '../components/LocationStatus';
import { ScreenWrapper } from '../components/ui/ScreenWrapper';
import { Card } from '../components/ui/Card';
import { useLocation } from '../hooks/useLocation';
import { api } from '../services/api';
import { SOSConfirmationModal } from '../components/SOSConfirmationModal';
import { LiveLocationShareCard } from '../components/LiveLocationShareCard';
import { LocationSafetyCard } from '../components/LocationSafetyCard';
import { motionDetector } from '../services/motionDetector';
import { voiceDetector } from '../services/voiceDetector';
import { ShieldCheck, Users, PhoneCall, AlertTriangle, Activity, ShieldAlert, ChevronRight, CheckCircle, RefreshCw, MapPin, Shield } from 'lucide-react-native';
import { useAppTheme, spacing, typography, borderRadius } from '../utils/theme';

const normalizePhone = (phone) => {
  if (!phone) return '';
  const digits = String(phone).replace(/\D/g, '');
  return digits.length >= 10 ? digits.slice(-10) : digits;
};

export function HomeScreen({ navigation }) {
  const { user } = useAuth();
  const { location, errorMsg, isLoading } = useLocation();
  const { activeIncident, requestSOSTrigger } = useEmergency();
  const { width } = useWindowDimensions();
  const [contactsReady, setContactsReady] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const syncInProgress = useRef(false);
  const { colors, shadows, isDark } = useAppTheme();
  
  const pulseAnim = useRef(new Animated.Value(0.2)).current;
  const spinAnim = useRef(new Animated.Value(0)).current;
  const styles = useMemo(() => getStyles(colors, shadows, isDark), [colors, shadows, isDark]);

  const isDesktop = width > 768;
  const isSecure = !activeIncident && !errorMsg && !isLoading;

  const locationRef = useRef(location);
  locationRef.current = location;
  const requestSOSTriggerRef = useRef(requestSOSTrigger);
  requestSOSTriggerRef.current = requestSOSTrigger;

  const loadContacts = useCallback(async () => {
    try {
      let rawContacts = [];
      if (user?.uid) {
        const stored = await AsyncStorage.getItem(`women_safety_contacts_${user.uid}`);
        if (stored) rawContacts = JSON.parse(stored);
      }
      if (!rawContacts || rawContacts.length === 0) {
        const stored = await AsyncStorage.getItem('women_safety_contacts');
        if (stored) {
          const all = JSON.parse(stored);
          rawContacts = user?.uid ? all.filter(c => !c.userId || c.userId === user.uid) : all;
        }
      }
      if (!rawContacts || rawContacts.length === 0) {
        try {
          const cloud = await api.getContacts();
          if (Array.isArray(cloud)) {
            rawContacts = cloud;
          }
        } catch (e) {}
      }
      // Deduplicate with normalized phone & stable ID
      const seen = new Set();
      let uniqueCount = 0;
      for (const c of (rawContacts || [])) {
        const norm = normalizePhone(c.phone);
        const key = norm ? `phone:${norm}` : (c.backendId ? `bid:${c.backendId}` : (c.id ? `id:${c.id}` : null));
        if (key && !seen.has(key)) {
          seen.add(key);
          uniqueCount++;
        }
      }
      setContactsReady(uniqueCount);
    } catch(e) {
      console.error(e);
    }
  }, [user?.uid]);

  const setupDetectors = useCallback(async () => {
    try {
      const shakeEnabled = await AsyncStorage.getItem('safeher_shake_sos_enabled');
      if (shakeEnabled !== 'false') {
        motionDetector.startListening(() => {
          console.log('[HomeScreen] Triggering SOS via Motion Detector');
          requestSOSTriggerRef.current?.('SHAKE', true, locationRef.current);
        });
      } else {
        motionDetector.stopListening();
      }

      const voiceEnabled = await AsyncStorage.getItem('safeher_voice_sos_enabled');
      if (voiceEnabled !== 'false') {
        voiceDetector.startListening(() => {
          console.log('[HomeScreen] Triggering SOS via Voice Detector');
          requestSOSTriggerRef.current?.('VOICE', true, locationRef.current);
        });
      } else {
        voiceDetector.stopListening();
      }
    } catch (err) {
      console.warn('Error configuring safety detectors:', err);
    }
  }, []);

  useEffect(() => {
    const unsubscribeFocus = navigation.addListener('focus', () => {
      loadContacts();
      setupDetectors();
    });

    const unsubscribeBlur = navigation.addListener('blur', () => {
      motionDetector.stopListening();
      voiceDetector.stopListening();
    });

    loadContacts();
    setupDetectors();

    return () => {
      unsubscribeFocus();
      unsubscribeBlur();
      motionDetector.stopListening();
      voiceDetector.stopListening();
    };
  }, [navigation, loadContacts, setupDetectors]);

  useEffect(() => {
    // Ambient safety pulse
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 0.6, duration: 3000, useNativeDriver: Platform.OS !== 'web' }),
        Animated.timing(pulseAnim, { toValue: 0.2, duration: 3000, useNativeDriver: Platform.OS !== 'web' })
      ])
    ).start();
  }, [pulseAnim]);

  const handleManualSync = async () => {
    if (isSyncing || syncInProgress.current) return;
    if (!user) {
      navigation.navigate('ProfileTab');
      return;
    }
    syncInProgress.current = true;
    setIsSyncing(true);
    
    // Spin animation
    spinAnim.setValue(0);
    const spinLoop = Animated.loop(
      Animated.timing(spinAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: Platform.OS !== 'web',
      })
    );
    spinLoop.start();

    try {
      const remoteContacts = await api.getContacts();
      if (Array.isArray(remoteContacts)) {
        const seen = new Set();
        const deduped = [];
        for (const rc of remoteContacts) {
          const norm = normalizePhone(rc.phone);
          const key = norm ? `phone:${norm}` : `id:${rc.id}`;
          if (key && !seen.has(key)) {
            seen.add(key);
            deduped.push({
              ...rc,
              backendId: rc.id,
              userId: user.uid,
              isSynced: true,
            });
          }
        }
        await AsyncStorage.setItem(`women_safety_contacts_${user.uid}`, JSON.stringify(deduped));
        setContactsReady(deduped.length);
      }
    } catch (err) {
      console.warn('[HomeScreen] Cloud sync warning:', err);
    } finally {
      spinLoop.stop();
      spinAnim.setValue(0);
      setIsSyncing(false);
      syncInProgress.current = false;
    }
  };

  const spinInterpolate = spinAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  // Calculate Readiness
  const readinessScore = (location ? 40 : 0) + (contactsReady > 0 ? 40 : 0) + 20; // base 20% for auth

  const renderHeader = () => (
    <View style={styles.header}>
      <View style={styles.headerText}>
        <Text style={styles.greeting}>Good evening,</Text>
        <Text style={styles.userName}>{user?.name || 'User'}</Text>
      </View>
      <View style={styles.headerActions}>
        <TouchableOpacity 
          onPress={handleManualSync} 
          style={styles.syncButton} 
          activeOpacity={0.7}
          disabled={isSyncing}
          accessibilityLabel="Sync with cloud"
        >
          <Animated.View style={{ transform: [{ rotate: spinInterpolate }] }}>
            <RefreshCw size={18} color={isSyncing ? colors.accentBrand : colors.textSecondary} />
          </Animated.View>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => navigation.navigate('ProfileTab')} style={styles.avatar} activeOpacity={0.7}>
          <Text style={styles.avatarText}>{user?.name?.[0]?.toUpperCase() || 'U'}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderSafetyStatus = () => {
    const pulseColor = activeIncident ? colors.accentEmergency : (isSecure ? colors.accentSafe : colors.accentWarning);
    
    return (
      <View style={styles.statusWrapper}>
        <Animated.View style={[
          styles.statusPulse, 
          { backgroundColor: pulseColor, opacity: pulseAnim }
        ]} pointerEvents="none" />
        
        <Card style={styles.statusCard} variant="flat">
          <View style={styles.statusHeader}>
            {isSecure ? (
              <ShieldCheck size={24} color={colors.accentSafe} />
            ) : (
              <ShieldAlert size={24} color={activeIncident ? colors.accentEmergency : colors.accentWarning} />
            )}
            <Text style={styles.statusTitle}>
              {activeIncident ? 'EMERGENCY ACTIVE' : (isSecure ? "You're protected" : "Attention needed")}
            </Text>
          </View>
          
          <View style={styles.readinessContainer}>
            <View style={styles.readinessHeader}>
              <Text style={styles.readinessLabel}>Safety readiness</Text>
              <Text style={styles.readinessScore}>{readinessScore}%</Text>
            </View>
            <View style={styles.progressBarBg}>
              <View style={[styles.progressBarFill, { width: `${readinessScore}%`, backgroundColor: pulseColor }]} />
            </View>
          </View>
        </Card>
      </View>
    );
  };

  const renderContacts = () => (
    <TouchableOpacity activeOpacity={0.7} onPress={() => navigation.navigate('Contacts')}>
      <Card style={styles.moduleCard} variant="flat">
        <View style={styles.moduleHeader}>
          <View style={styles.moduleTitleRow}>
            <Users size={20} color={colors.textPrimary} />
            <Text style={styles.moduleTitle}>Trusted Network</Text>
          </View>
          <ChevronRight size={20} color={colors.textSecondary} />
        </View>
        
        {contactsReady > 0 ? (
          <View style={styles.treeContainer}>
            <Text style={styles.treeText}>You</Text>
            <Text style={styles.treeLine}>│</Text>
            <View style={styles.treeRow}>
              <Text style={styles.treeText}>├── Contacts ({contactsReady})</Text>
              <Text style={styles.treeReady}>● Ready</Text>
            </View>
            <View style={styles.treeRow}>
              <Text style={styles.treeText}>└── Services</Text>
              <Text style={styles.treeReady}>● Ready</Text>
            </View>
          </View>
        ) : (
          <Text style={[styles.moduleText, { color: colors.accentWarning }]}>
            Your safety network is empty. Tap to add trusted contacts.
          </Text>
        )}
      </Card>
    </TouchableOpacity>
  );

  const renderLocation = () => (
    <View style={styles.locationWrapper}>
      <LocationStatus location={location} errorMsg={errorMsg} isLoading={isLoading} />
    </View>
  );

  const renderActivity = () => (
    <Card style={styles.moduleCard} variant="flat">
      <View style={styles.moduleHeader}>
        <View style={styles.moduleTitleRow}>
          <Activity size={20} color={colors.textPrimary} />
          <Text style={styles.moduleTitle}>Recent Activity</Text>
        </View>
      </View>
      
      {activeIncident ? (
        <View style={styles.activityItem}>
          <View style={styles.activityDotRed} />
          <View>
            <Text style={styles.activityText}>Emergency incident active</Text>
            <Text style={styles.activityTime}>Right now</Text>
          </View>
        </View>
      ) : (
        <View style={styles.activityItem}>
          <View style={styles.activityDot} />
          <View>
            <Text style={styles.activityText}>Location updated</Text>
            <Text style={styles.activityTime}>{location ? 'Just now' : 'Unknown'}</Text>
          </View>
        </View>
      )}
    </Card>
  );

  const renderQuickActions = () => (
    <View style={styles.actionsSection}>
      <Text style={styles.sectionTitle}>Quick Actions</Text>
      {isDesktop ? (
        <View style={styles.desktopActionsContainer}>
          <ActionBtn 
            icon={<Users size={24} color={colors.accentBrand} />} 
            label="Contacts" 
            onPress={() => navigation.navigate('Contacts')}
            colors={colors}
          />
          <ActionBtn 
            icon={<MapPin size={24} color="#38BDF8" />} 
            label="Crime Map" 
            onPress={() => navigation.navigate('CrimeSearch')}
            colors={colors}
          />
          <ActionBtn 
            icon={<Shield size={24} color="#10B981" />} 
            label="Safety Map" 
            onPress={() => navigation.navigate('CommunitySafety')}
            colors={colors}
          />
          <ActionBtn 
            icon={<PhoneCall size={24} color={colors.textPrimary} />} 
            label="Fake Call" 
            onPress={() => navigation.navigate('FakeCall')}
            colors={colors}
          />
          <ActionBtn 
            icon={<AlertTriangle size={24} color={colors.accentWarning} />} 
            label="Report" 
            onPress={() => navigation.navigate('Report')}
            colors={colors}
          />
        </View>
      ) : (
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false} 
          contentContainerStyle={styles.actionsScroll}
        >
          <ActionBtn 
            icon={<Users size={24} color={colors.accentBrand} />} 
            label="Contacts" 
            onPress={() => navigation.navigate('Contacts')}
            colors={colors}
          />
          <ActionBtn 
            icon={<MapPin size={24} color="#38BDF8" />} 
            label="Crime Map" 
            onPress={() => navigation.navigate('CrimeSearch')}
            colors={colors}
          />
          <ActionBtn 
            icon={<Shield size={24} color="#10B981" />} 
            label="Safety Map" 
            onPress={() => navigation.navigate('CommunitySafety')}
            colors={colors}
          />
          <ActionBtn 
            icon={<PhoneCall size={24} color={colors.textPrimary} />} 
            label="Fake Call" 
            onPress={() => navigation.navigate('FakeCall')}
            colors={colors}
          />
          <ActionBtn 
            icon={<AlertTriangle size={24} color={colors.accentWarning} />} 
            label="Report" 
            onPress={() => navigation.navigate('Report')}
            colors={colors}
          />
        </ScrollView>
      )}
    </View>
  );

  const renderSOS = () => (
    <View style={styles.sosContainer}>
      <SOSButton locationData={location} />
    </View>
  );

  if (isDesktop) {
    return (
      <ScreenWrapper scrollable isWide withGlow contentContainerStyle={styles.desktopContainer}>
        {renderHeader()}
        <View style={styles.desktopGrid}>
          <View style={styles.desktopLeft}>
            {renderSafetyStatus()}
            <LiveLocationShareCard />
            <LocationSafetyCard />
            {renderLocation()}
            {renderContacts()}
            {renderActivity()}
          </View>
          <View style={styles.desktopRight}>
            {renderSOS()}
            {renderQuickActions()}
          </View>
        </View>
        <SOSConfirmationModal />
      </ScreenWrapper>
    );
  }

  return (
    <ScreenWrapper scrollable withGlow contentContainerStyle={styles.mobileContainer}>
      {renderHeader()}
      {renderSafetyStatus()}
      {renderSOS()}
      <LiveLocationShareCard />
      <LocationSafetyCard />
      {renderLocation()}
      {renderContacts()}
      {renderQuickActions()}
      {renderActivity()}
      <SOSConfirmationModal />
    </ScreenWrapper>
  );
}


function ActionBtn({ icon, label, onPress, colors }) {
  return (
    <TouchableOpacity style={styles(colors).actionBtn} onPress={onPress} activeOpacity={0.7}>
      <View style={styles(colors).actionIcon}>{icon}</View>
      <Text style={styles(colors).actionLabel}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = (colors) => StyleSheet.create({
  actionBtn: {
    alignItems: 'center',
    width: 80,
  },
  actionIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.bgTertiary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  actionLabel: {
    ...typography.footnote,
    color: colors.textPrimary,
  }
});

const getStyles = (colors, shadows, isDark) => StyleSheet.create({
  desktopContainer: {
    padding: spacing.xl,
    paddingBottom: spacing.xxxl,
    flexGrow: 1,
  },
  mobileContainer: {
    padding: spacing.lg,
    paddingBottom: spacing.xxxl,
    flexGrow: 1,
  },
  desktopGrid: {
    flexDirection: 'row',
    gap: spacing.xxl,
    marginTop: spacing.md, // Reduced gap from header
  },
  desktopLeft: {
    flex: 1.2, // Give slightly more room to content
    gap: spacing.lg,
  },
  desktopRight: {
    flex: 1,
    alignItems: 'center',
    paddingTop: spacing.xl, // Push SOS down slightly to align better with content
    gap: spacing.xxl, // More space between SOS and Quick Actions
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xl,
    marginTop: spacing.md,
  },
  headerText: {
    flex: 1,
  },
  greeting: {
    ...typography.subhead,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  userName: {
    ...typography.h2,
    color: colors.textPrimary,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  syncButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.bgSecondary,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.subtle,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.bgSecondary,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.subtle,
  },
  avatarText: {
    ...typography.h3,
    color: colors.textPrimary,
  },
  statusWrapper: {
    marginBottom: spacing.lg,
    position: 'relative',
  },
  statusPulse: {
    position: 'absolute',
    top: -10,
    left: -10,
    right: -10,
    bottom: -10,
    borderRadius: borderRadius.xl,
    ...Platform.select({
      web: { filter: 'blur(20px)' },
      ios: { shadowColor: '#000', shadowOffset: {width:0, height:0}, shadowOpacity: 0.1, shadowRadius: 20 }
    })
  },
  statusCard: {
    backgroundColor: colors.bgSecondary,
    marginBottom: 0,
    zIndex: 2,
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  statusTitle: {
    ...typography.subhead,
    color: colors.textPrimary,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  readinessContainer: {
    marginTop: spacing.xs,
  },
  readinessHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  readinessLabel: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  readinessScore: {
    ...typography.caption,
    color: colors.textPrimary,
    fontWeight: '600',
  },
  progressBarBg: {
    height: 6,
    backgroundColor: colors.bgTertiary,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  sosContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: spacing.xl,
  },
  locationWrapper: {
    marginBottom: spacing.lg,
  },
  moduleCard: {
    marginBottom: spacing.lg,
  },
  moduleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  moduleTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  moduleTitle: {
    ...typography.callout,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  moduleText: {
    ...typography.footnote,
    color: colors.textSecondary,
    lineHeight: 20,
    marginTop: 4,
  },
  treeContainer: {
    marginTop: spacing.sm,
    paddingLeft: spacing.xs,
  },
  treeText: {
    ...typography.footnote,
    color: colors.textSecondary,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  treeLine: {
    ...typography.footnote,
    color: colors.textMuted,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    marginLeft: 1,
    marginVertical: -2,
  },
  treeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  treeReady: {
    ...typography.caption,
    color: colors.accentSafe,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginTop: spacing.sm,
  },
  activityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.accentSafe,
  },
  activityDotRed: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.accentEmergency,
  },
  activityText: {
    ...typography.subhead,
    color: colors.textPrimary,
  },
  activityTime: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: 2,
  },
  actionsSection: {
    marginTop: spacing.md,
    width: '100%',
  },
  sectionTitle: {
    ...typography.subhead,
    color: colors.textSecondary,
    marginBottom: spacing.md,
    marginLeft: spacing.xs,
  },
  actionsScroll: {
    gap: spacing.md,
    paddingBottom: spacing.sm,
  },
  desktopActionsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.xl,
    width: '100%',
  },
});
