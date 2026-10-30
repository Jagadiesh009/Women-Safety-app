import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, Platform, Linking, TextInput, Modal } from 'react-native';
import { WebView } from 'react-native-webview';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import { ScreenWrapper } from '../../components/ui/ScreenWrapper';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { 
  Shield, 
  MapPin, 
  Navigation, 
  CheckCircle, 
  Clock, 
  Phone, 
  AlertTriangle, 
  Radio, 
  ArrowLeft,
  CheckCircle2,
  Send
} from 'lucide-react-native';
import * as Location from 'expo-location';

const STATUS_STEPS = [
  { key: 'ACCEPTED', label: '1. Accepted', desc: 'Dispatch accepted by officer' },
  { key: 'EN_ROUTE', label: '2. En Route', desc: 'Patrol unit en route to scene' },
  { key: 'ARRIVED', label: '3. Arrived', desc: 'Officer arrived on-scene' },
  { key: 'ASSISTANCE_PROVIDED', label: '4. Assisting', desc: 'Assistance being rendered' },
  { key: 'RESOLVED', label: '5. Resolved', desc: 'Emergency resolved & secured' },
];

export function PoliceIncidentResponseScreen({ route, navigation }) {
  const { officer } = useAuth();
  const incidentId = route?.params?.incidentId;
  const [incident, setIncident] = useState(null);
  const [officerLoc, setOfficerLoc] = useState(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [resolutionModalVisible, setResolutionModalVisible] = useState(false);
  const [resolutionNotes, setResolutionNotes] = useState('');
  
  const refreshIntervalRef = useRef(null);

  const fetchIncidentDetails = useCallback(async () => {
    try {
      const data = await api.getActivePoliceIncident();
      if (data && (!incidentId || data.id === incidentId)) {
        setIncident(data);
      }
    } catch (e) {
      console.warn("Error fetching active police incident:", e);
    }
  }, [incidentId]);

  useEffect(() => {
    fetchIncidentDetails();
    // Get officer current position
    (async () => {
      try {
        const { status } = await Location.getForegroundPermissionsAsync();
        if (status === 'granted') {
          const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
          setOfficerLoc(loc.coords);
        }
      } catch (e) {}
    })();

    refreshIntervalRef.current = setInterval(fetchIncidentDetails, 4000);
    return () => {
      if (refreshIntervalRef.current) clearInterval(refreshIntervalRef.current);
    };
  }, [fetchIncidentDetails]);

  const handleUpdateStatus = async (nextStatus, notes = null) => {
    if (!incident) return;
    setIsUpdating(true);
    try {
      await api.updateIncidentStatus(incident.id, nextStatus, notes);
      await fetchIncidentDetails();
      if (nextStatus === 'RESOLVED') {
        setResolutionModalVisible(false);
        Alert.alert(
          "Incident Resolved",
          `Incident #${incident.id} has been successfully resolved and logged in history.`,
          [{ text: "Back to Dashboard", onPress: () => navigation.navigate('PoliceTabs', { screen: 'PoliceDashboard' }) }]
        );
      }
    } catch (err) {
      Alert.alert("Update Error", err.message || "Failed to update incident response status.");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleOpenNavigation = () => {
    if (!incident?.latest_latitude || !incident?.latest_longitude) {
      Alert.alert("Navigation", "User coordinates not available.");
      return;
    }
    const lat = incident.latest_latitude;
    const lng = incident.latest_longitude;
    const url = Platform.select({
      ios: `maps:0,0?q=${lat},${lng}`,
      android: `google.navigation:q=${lat},${lng}`,
      default: `https://maps.google.com/?q=${lat},${lng}`
    });
    Linking.openURL(url).catch(() => {
      Linking.openURL(`https://maps.google.com/?q=${lat},${lng}`);
    });
  };

  const currentStepIndex = STATUS_STEPS.findIndex(s => s.key === (incident?.dispatch_status || 'ACCEPTED'));

  // Leaflet map HTML for tactical tactical view
  const mapHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
      <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
      <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
      <style>
        body { padding: 0; margin: 0; background: #070D18; }
        html, body, #map { height: 100%; width: 100%; }
        .victim-pin {
          width: 22px; height: 22px; border-radius: 50%;
          background: #EF4444; border: 2.5px solid #FFFFFF;
          box-shadow: 0 0 14px #EF4444;
        }
        .officer-pin {
          width: 20px; height: 20px; border-radius: 50%;
          background: #3B82F6; border: 2.5px solid #FFFFFF;
          box-shadow: 0 0 10px #3B82F6;
        }
      </style>
    </head>
    <body>
      <div id="map"></div>
      <script>
        var victimLat = ${incident?.latest_latitude || 12.9784};
        var victimLng = ${incident?.latest_longitude || 77.6408};
        var officerLat = ${officerLoc?.latitude || 12.9750};
        var officerLng = ${officerLoc?.longitude || 77.6380};

        var map = L.map('map', { zoomControl: false }).setView([victimLat, victimLng], 15);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          maxZoom: 19
        }).addTo(map);

        // Victim Pin
        var victimIcon = L.divIcon({ className: 'victim-pin', iconSize: [22, 22] });
        L.marker([victimLat, victimLng], { icon: victimIcon }).addTo(map).bindPopup("Victim Location").openPopup();

        // Officer Pin
        var officerIcon = L.divIcon({ className: 'officer-pin', iconSize: [20, 20] });
        L.marker([officerLat, officerLng], { icon: officerIcon }).addTo(map).bindPopup("Your Patrol Unit");

        // Fit bounds to show both
        var bounds = L.latLngBounds([ [victimLat, victimLng], [officerLat, officerLng] ]);
        map.fitBounds(bounds, { padding: [40, 40] });
      </script>
    </body>
    </html>
  `;

  return (
    <ScreenWrapper edges={['top', 'bottom']} style={styles.container}>
      {/* HEADER */}
      <View style={styles.topHeader}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <ArrowLeft size={20} color="#F8FAFC" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>INCIDENT RESPONSE CONSOLE</Text>
          <Text style={styles.headerSubtitle}>
            Incident #{incident?.id || incidentId} • {incident?.locality || 'Indiranagar'}
          </Text>
        </View>
        <View style={styles.activeTag}>
          <Text style={styles.activeTagText}>{incident?.dispatch_status || 'ACCEPTED'}</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* TACTICAL MAP */}
        <View style={styles.mapContainer}>
          <WebView
            originWhitelist={['*']}
            source={{ html: mapHtml }}
            style={styles.webView}
            scrollEnabled={false}
          />
          <TouchableOpacity style={styles.floatingNavBtn} onPress={handleOpenNavigation} activeOpacity={0.85}>
            <Navigation size={18} color="#FFFFFF" />
            <Text style={styles.floatingNavBtnText}>TURN-BY-TURN GPS</Text>
          </TouchableOpacity>
        </View>

        {/* INCIDENT DETAILS CARD */}
        <Card style={styles.detailsCard}>
          <View style={styles.cardHeader}>
            <AlertTriangle size={18} color="#EF4444" />
            <Text style={styles.cardTitle}>Victim & Incident Information</Text>
          </View>

          <View style={styles.grid}>
            <View style={styles.gridItem}>
              <Text style={styles.gridLabel}>CITIZEN NAME</Text>
              <Text style={styles.gridVal}>{incident?.user_name || 'SafeHer User'}</Text>
            </View>
            <View style={styles.gridItem}>
              <Text style={styles.gridLabel}>EMERGENCY TYPE</Text>
              <Text style={styles.gridVal}>{incident?.category || 'SOS Emergency'}</Text>
            </View>
            <View style={styles.gridItem}>
              <Text style={styles.gridLabel}>TRIGGER SOURCE</Text>
              <Text style={styles.gridVal}>{incident?.trigger_source || 'MANUAL'}</Text>
            </View>
            <View style={styles.gridItem}>
              <Text style={styles.gridLabel}>DISTANCE</Text>
              <Text style={styles.gridVal}>{incident?.distance_km != null ? `${incident.distance_km} km` : 'Near'}</Text>
            </View>
          </View>

          <View style={styles.coordsBox}>
            <MapPin size={14} color="#60A5FA" />
            <Text style={styles.coordsText}>
              Lat: {incident?.latest_latitude ? incident.latest_latitude.toFixed(5) : 'N/A'}, Lng: {incident?.latest_longitude ? incident.latest_longitude.toFixed(5) : 'N/A'}
            </Text>
          </View>
        </Card>

        {/* STATUS PROGRESSION TIMELINE & ACTIONS */}
        <Card style={styles.timelineCard}>
          <Text style={styles.sectionHeader}>RESPONSE PROGRESSION (TAP TO ADVANCE)</Text>

          {STATUS_STEPS.map((step, idx) => {
            const isCompleted = idx <= currentStepIndex;
            const isCurrent = idx === currentStepIndex;
            const isNext = idx === currentStepIndex + 1;

            return (
              <View key={step.key} style={styles.stepRow}>
                <View style={styles.timelineCol}>
                  <View style={[
                    styles.stepDot,
                    isCompleted ? styles.stepDotCompleted : styles.stepDotPending
                  ]}>
                    {isCompleted ? (
                      <CheckCircle2 size={14} color="#FFFFFF" />
                    ) : (
                      <View style={styles.stepDotInner} />
                    )}
                  </View>
                  {idx < STATUS_STEPS.length - 1 && (
                    <View style={[
                      styles.stepLine,
                      idx < currentStepIndex ? styles.stepLineCompleted : styles.stepLinePending
                    ]} />
                  )}
                </View>

                <View style={{ flex: 1, paddingBottom: 16 }}>
                  <Text style={[
                    styles.stepLabel,
                    isCurrent && styles.stepLabelCurrent,
                    isCompleted && styles.stepLabelCompleted
                  ]}>
                    {step.label}
                  </Text>
                  <Text style={styles.stepDesc}>{step.desc}</Text>

                  {isNext && (
                    <TouchableOpacity
                      style={styles.advanceButton}
                      onPress={() => {
                        if (step.key === 'RESOLVED') {
                          setResolutionModalVisible(true);
                        } else {
                          handleUpdateStatus(step.key);
                        }
                      }}
                      disabled={isUpdating}
                    >
                      <Text style={styles.advanceButtonText}>
                        {isUpdating ? 'Updating...' : `MARK AS: ${step.label.toUpperCase()}`}
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            );
          })}
        </Card>

        {/* RESOLUTION MODAL */}
        <Modal
          visible={resolutionModalVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setResolutionModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Resolve Emergency Incident</Text>
              <Text style={styles.modalSub}>
                Provide mandatory case notes before marking this emergency as secured and resolved.
              </Text>

              <TextInput
                style={styles.notesInput}
                placeholder="Enter action summary (e.g. Victim escorted to safety, suspect questioned, situation de-escalated)..."
                placeholderTextColor="#64748B"
                multiline
                numberOfLines={4}
                value={resolutionNotes}
                onChangeText={setResolutionNotes}
              />

              <View style={styles.modalActions}>
                <Button
                  title="Cancel"
                  variant="ghost"
                  onPress={() => setResolutionModalVisible(false)}
                  style={{ flex: 1 }}
                />
                <Button
                  title="Confirm Resolution"
                  onPress={() => handleUpdateStatus('RESOLVED', resolutionNotes || 'Assistance provided and scene secured.')}
                  loading={isUpdating}
                  style={{ flex: 1, backgroundColor: '#16A34A' }}
                />
              </View>
            </View>
          </View>
        </Modal>

      </ScrollView>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#070D18',
  },
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
    gap: 12,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#1E293B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#F8FAFC',
    letterSpacing: 0.5,
  },
  headerSubtitle: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 1,
  },
  activeTag: {
    backgroundColor: 'rgba(59, 130, 246, 0.2)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#3B82F6',
  },
  activeTagText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#60A5FA',
  },
  scrollContent: {
    paddingBottom: 110,
  },
  mapContainer: {
    height: 240,
    position: 'relative',
    backgroundColor: '#0A1322',
  },
  webView: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  floatingNavBtn: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2563EB',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 4,
    elevation: 5,
  },
  floatingNavBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  detailsCard: {
    margin: 16,
    marginBottom: 12,
    backgroundColor: '#0F1A2E',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#1E2F4D',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    backgroundColor: '#09101C',
    borderRadius: 10,
    padding: 10,
    marginBottom: 10,
  },
  gridItem: {
    width: '50%',
    paddingVertical: 4,
  },
  gridLabel: {
    fontSize: 10,
    color: '#64748B',
    fontWeight: '700',
  },
  gridVal: {
    fontSize: 13,
    fontWeight: '600',
    color: '#E2E8F0',
    marginTop: 1,
  },
  coordsBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  coordsText: {
    fontSize: 11,
    color: '#94A3B8',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  timelineCard: {
    marginHorizontal: 16,
    backgroundColor: '#0F1A2E',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#1E2F4D',
  },
  sectionHeader: {
    fontSize: 11,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 0.8,
    marginBottom: 16,
  },
  stepRow: {
    flexDirection: 'row',
    gap: 12,
  },
  timelineCol: {
    alignItems: 'center',
    width: 24,
  },
  stepDot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepDotCompleted: {
    backgroundColor: '#10B981',
  },
  stepDotPending: {
    backgroundColor: '#1E293B',
    borderWidth: 1.5,
    borderColor: '#475569',
  },
  stepDotInner: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#64748B',
  },
  stepLine: {
    width: 2,
    flex: 1,
    marginVertical: 4,
  },
  stepLineCompleted: {
    backgroundColor: '#10B981',
  },
  stepLinePending: {
    backgroundColor: '#1E293B',
  },
  stepLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#64748B',
  },
  stepLabelCurrent: {
    color: '#60A5FA',
  },
  stepLabelCompleted: {
    color: '#F8FAFC',
  },
  stepDesc: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 2,
  },
  advanceButton: {
    backgroundColor: '#2563EB',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 8,
    marginTop: 10,
    alignItems: 'center',
  },
  advanceButtonText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#0F1A2E',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#1E3A5F',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#F8FAFC',
    marginBottom: 4,
  },
  modalSub: {
    fontSize: 12,
    color: '#94A3B8',
    marginBottom: 16,
    lineHeight: 16,
  },
  notesInput: {
    backgroundColor: '#0A1322',
    borderWidth: 1,
    borderColor: '#1E2F4D',
    borderRadius: 10,
    padding: 12,
    color: '#FFFFFF',
    fontSize: 13,
    textAlignVertical: 'top',
    minHeight: 90,
    marginBottom: 16,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
  },
});

