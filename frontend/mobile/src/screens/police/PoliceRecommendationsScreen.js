import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, Alert, Modal, TextInput, RefreshControl } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import { ScreenWrapper } from '../../components/ui/ScreenWrapper';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { TrendingUp, UserCheck, Shield, Clock, AlertTriangle, CheckCircle, ChevronRight, MapPin } from 'lucide-react-native';

export function PoliceRecommendationsScreen({ navigation }) {
  const { officer } = useAuth();
  const [tab, setTab] = useState('recommendations'); // 'recommendations' | 'assignments'
  const [recommendations, setRecommendations] = useState([]);
  const [myAssignments, setMyAssignments] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  // Assignment Modal for Supervisors
  const [assignModalVisible, setAssignModalVisible] = useState(false);
  const [selectedRec, setSelectedRec] = useState(null);
  const [targetOfficerId, setTargetOfficerId] = useState('2'); // Default to Officer Ramesh Kumar (POL-102)
  const [instructions, setInstructions] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isSupervisor = officer?.role === 'SUPERVISOR';

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [recsRes, assignsRes] = await Promise.allSettled([
        api.getPatrolRecommendations(),
        api.getMyPatrolAssignments()
      ]);
      if (recsRes.status === 'fulfilled' && Array.isArray(recsRes.value)) {
        setRecommendations(recsRes.value);
      }
      if (assignsRes.status === 'fulfilled' && Array.isArray(assignsRes.value)) {
        setMyAssignments(assignsRes.value);
      }
    } catch (e) {
      console.warn("Error fetching patrol recommendations:", e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleOpenAssignModal = (rec) => {
    if (!isSupervisor) {
      Alert.alert("Supervisor Authorization Required", "Only authorized Police Supervisors can approve and assign patrol deployments.");
      return;
    }
    setSelectedRec(rec);
    setInstructions(`Priority deployment in ${rec.locality}. Active night vigilance required.`);
    setAssignModalVisible(true);
  };

  const handleConfirmAssignment = async () => {
    if (!selectedRec) return;
    setIsSubmitting(true);
    try {
      await api.assignPatrolRecommendation(selectedRec.id, parseInt(targetOfficerId) || 2, instructions, selectedRec.suggested_patrol_period);
      Alert.alert("Patrol Unit Assigned", `Patrol order dispatched for ${selectedRec.locality}.`);
      setAssignModalVisible(false);
      fetchData();
    } catch (err) {
      Alert.alert("Assignment Error", err.message || "Failed to deploy patrol assignment.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateAssignmentStatus = async (assignmentId, newStatus) => {
    try {
      await api.updatePatrolAssignmentStatus(assignmentId, newStatus);
      Alert.alert("Status Updated", `Assignment marked as ${newStatus}.`);
      fetchData();
    } catch (err) {
      Alert.alert("Update Error", err.message || "Failed to update assignment status.");
    }
  };

  const renderRecommendationCard = ({ item }) => {
    const isHigh = item.risk_level === 'HIGH';
    return (
      <Card style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.localityRow}>
            <MapPin size={16} color={isHigh ? "#EF4444" : "#F59E0B"} />
            <Text style={styles.localityName}>{item.locality}</Text>
          </View>
          <View style={[styles.badge, isHigh ? styles.badgeHigh : styles.badgeModerate]}>
            <Text style={[styles.badgeText, isHigh ? styles.badgeTextHigh : styles.badgeTextModerate]}>
              {item.risk_level} RISK
            </Text>
          </View>
        </View>

        <Text style={styles.reasonText}>{item.reason}</Text>

        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>VERIFIED INCIDENTS</Text>
            <Text style={styles.statVal}>{item.verified_incidents_count}</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>WEEK-ON-WEEK</Text>
            <Text style={[styles.statVal, { color: item.percentage_change > 0 ? '#EF4444' : '#10B981' }]}>
              {item.percentage_change > 0 ? `+${item.percentage_change}%` : `${item.percentage_change}%`}
            </Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>SUGGESTED SHIFT</Text>
            <Text style={styles.statValSmall}>{item.suggested_patrol_period}</Text>
          </View>
        </View>

        <View style={styles.coverageRow}>
          <Text style={styles.coverageLabel}>Coverage: <Text style={{ color: '#E2E8F0', fontWeight: '700' }}>{item.existing_patrol_coverage}</Text></Text>
          <Text style={styles.coverageLabel}>Available Units: <Text style={{ color: '#60A5FA', fontWeight: '700' }}>{item.available_units_count}</Text></Text>
        </View>

        {isSupervisor ? (
          <Button
            title={item.status === 'DEPLOYED' ? 'Redeploy Patrol Unit' : 'Approve & Assign Patrol'}
            size="medium"
            onPress={() => handleOpenAssignModal(item)}
            style={styles.assignButton}
          />
        ) : (
          <View style={styles.officerViewOnlyNote}>
            <Shield size={14} color="#64748B" />
            <Text style={styles.officerViewOnlyText}>Supervisor review & deployment required</Text>
          </View>
        )}
      </Card>
    );
  };

  const renderAssignmentCard = ({ item }) => {
    const isCompleted = item.status === 'COMPLETED';
    const isInProgress = item.status === 'IN_PROGRESS';

    return (
      <Card style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.localityRow}>
            <Shield size={16} color="#3B82F6" />
            <Text style={styles.localityName}>{item.locality} ({item.zone})</Text>
          </View>
          <View style={[styles.badge, isCompleted ? styles.badgeSuccess : styles.badgeInfo]}>
            <Text style={[styles.badgeText, isCompleted ? styles.badgeTextSuccess : styles.badgeTextInfo]}>
              {item.status}
            </Text>
          </View>
        </View>

        <Text style={styles.instructionsText}>
          <Text style={{ fontWeight: '700', color: '#94A3B8' }}>Orders: </Text>
          {item.instructions || 'Routine crime prevention patrol'}
        </Text>

        <View style={styles.metaInfo}>
          <Clock size={12} color="#64748B" />
          <Text style={styles.metaInfoText}>Shift: {item.shift_period}</Text>
        </View>

        <View style={styles.actionButtonsRow}>
          {!isInProgress && !isCompleted && (
            <Button
              title="Start Patrol"
              size="small"
              onPress={() => handleUpdateAssignmentStatus(item.id, 'IN_PROGRESS')}
              style={{ flex: 1, backgroundColor: '#2563EB' }}
            />
          )}
          {!isCompleted && (
            <Button
              title="Mark Completed"
              size="small"
              variant="secondary"
              onPress={() => handleUpdateAssignmentStatus(item.id, 'COMPLETED')}
              style={{ flex: 1 }}
            />
          )}
        </View>
      </Card>
    );
  };

  return (
    <ScreenWrapper edges={['top', 'bottom']} style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>PATROL COORDINATION</Text>
        <Text style={styles.subtitle}>Data-driven crime hotspots & assigned sector security</Text>
      </View>

      {/* TABS */}
      <View style={styles.tabsContainer}>
        <TouchableOpacity
          style={[styles.tabBtn, tab === 'recommendations' && styles.tabBtnActive]}
          onPress={() => setTab('recommendations')}
        >
          <TrendingUp size={14} color={tab === 'recommendations' ? '#FFFFFF' : '#94A3B8'} />
          <Text style={[styles.tabBtnText, tab === 'recommendations' && styles.tabBtnTextActive]}>
            Hotspot Recommendations
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabBtn, tab === 'assignments' && styles.tabBtnActive]}
          onPress={() => setTab('assignments')}
        >
          <UserCheck size={14} color={tab === 'assignments' ? '#FFFFFF' : '#94A3B8'} />
          <Text style={[styles.tabBtnText, tab === 'assignments' && styles.tabBtnTextActive]}>
            My Patrol Orders ({myAssignments.length})
          </Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={tab === 'recommendations' ? recommendations : myAssignments}
        keyExtractor={(item) => String(item.id)}
        renderItem={tab === 'recommendations' ? renderRecommendationCard : renderAssignmentCard}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={fetchData} tintColor="#60A5FA" />}
        ListEmptyComponent={
          <View style={styles.emptyBox}>
            <CheckCircle size={40} color="#10B981" />
            <Text style={styles.emptyTitle}>
              {tab === 'recommendations' ? 'No Hotspots Identified' : 'No Active Patrol Orders'}
            </Text>
            <Text style={styles.emptySub}>
              {tab === 'recommendations' ? 'Sector verified incidents are within normal baseline thresholds.' : 'You have no assigned patrol orders currently.'}
            </Text>
          </View>
        }
      />

      {/* SUPERVISOR ASSIGNMENT MODAL */}
      <Modal
        visible={assignModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setAssignModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Deploy Patrol Unit</Text>
            <Text style={styles.modalSub}>
              Assign patrol officers to {selectedRec?.locality} with tactical coverage orders.
            </Text>

            <Text style={styles.inputLabel}>SELECT OFFICER:</Text>
            <View style={styles.officerSelectRow}>
              <TouchableOpacity
                style={[styles.officerOption, targetOfficerId === '2' && styles.officerOptionActive]}
                onPress={() => setTargetOfficerId('2')}
              >
                <Text style={styles.officerOptionText}>Officer Ramesh Kumar (POL-102)</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.officerOption, targetOfficerId === '3' && styles.officerOptionActive]}
                onPress={() => setTargetOfficerId('3')}
              >
                <Text style={styles.officerOptionText}>Officer Ananya Patel (POL-103)</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.inputLabel}>PATROL ORDERS & INSTRUCTIONS:</Text>
            <TextInput
              style={styles.textInput}
              value={instructions}
              onChangeText={setInstructions}
              multiline
              numberOfLines={3}
            />

            <View style={styles.modalActions}>
              <Button
                title="Cancel"
                variant="ghost"
                onPress={() => setAssignModalVisible(false)}
                style={{ flex: 1 }}
              />
              <Button
                title="Authorize & Deploy"
                onPress={handleConfirmAssignment}
                loading={isSubmitting}
                style={{ flex: 1, backgroundColor: '#2563EB' }}
              />
            </View>
          </View>
        </View>
      </Modal>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#070D18',
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: '#F8FAFC',
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 2,
  },
  tabsContainer: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginVertical: 10,
    backgroundColor: '#0F1A2E',
    borderRadius: 10,
    padding: 3,
    gap: 4,
  },
  tabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  tabBtnActive: {
    backgroundColor: '#1E3A8A',
  },
  tabBtnText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#94A3B8',
  },
  tabBtnTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  listContent: {
    padding: 16,
    paddingTop: 4,
    paddingBottom: 40,
  },
  card: {
    backgroundColor: '#0F1A2E',
    borderColor: '#1E2F4D',
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  localityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  localityName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  badgeHigh: {
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
  },
  badgeModerate: {
    backgroundColor: 'rgba(245, 158, 11, 0.2)',
  },
  badgeSuccess: {
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
  },
  badgeInfo: {
    backgroundColor: 'rgba(59, 130, 246, 0.2)',
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '800',
  },
  badgeTextHigh: {
    color: '#EF4444',
  },
  badgeTextModerate: {
    color: '#F59E0B',
  },
  badgeTextSuccess: {
    color: '#10B981',
  },
  badgeTextInfo: {
    color: '#60A5FA',
  },
  reasonText: {
    fontSize: 12,
    color: '#CBD5E1',
    lineHeight: 16,
    marginBottom: 12,
  },
  statsRow: {
    flexDirection: 'row',
    backgroundColor: '#0A1322',
    borderRadius: 10,
    padding: 8,
    marginBottom: 10,
    gap: 8,
  },
  statBox: {
    flex: 1,
  },
  statLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: '#64748B',
  },
  statVal: {
    fontSize: 14,
    fontWeight: '800',
    color: '#F8FAFC',
    marginTop: 1,
  },
  statValSmall: {
    fontSize: 11,
    fontWeight: '600',
    color: '#94A3B8',
    marginTop: 1,
  },
  coverageRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
    marginBottom: 10,
  },
  coverageLabel: {
    fontSize: 11,
    color: '#94A3B8',
  },
  assignButton: {
    backgroundColor: '#2563EB',
    marginTop: 4,
  },
  officerViewOnlyNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: '#1E293B',
  },
  officerViewOnlyText: {
    fontSize: 11,
    color: '#64748B',
  },
  instructionsText: {
    fontSize: 12,
    color: '#E2E8F0',
    marginBottom: 8,
    lineHeight: 16,
  },
  metaInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },
  metaInfoText: {
    fontSize: 11,
    color: '#94A3B8',
  },
  actionButtonsRow: {
    flexDirection: 'row',
    gap: 10,
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
  inputLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#60A5FA',
    marginBottom: 6,
  },
  officerSelectRow: {
    gap: 6,
    marginBottom: 14,
  },
  officerOption: {
    backgroundColor: '#0A1322',
    borderWidth: 1,
    borderColor: '#1E2F4D',
    borderRadius: 8,
    padding: 10,
  },
  officerOptionActive: {
    borderColor: '#3B82F6',
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
  },
  officerOptionText: {
    fontSize: 12,
    color: '#F8FAFC',
    fontWeight: '600',
  },
  textInput: {
    backgroundColor: '#0A1322',
    borderWidth: 1,
    borderColor: '#1E2F4D',
    borderRadius: 8,
    padding: 10,
    color: '#FFFFFF',
    fontSize: 12,
    minHeight: 70,
    textAlignVertical: 'top',
    marginBottom: 16,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 10,
  },
  emptyBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#94A3B8',
    marginTop: 12,
  },
  emptySub: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 4,
    maxWidth: 240,
  },
});

