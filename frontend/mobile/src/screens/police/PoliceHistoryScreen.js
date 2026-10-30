import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl } from 'react-native';
import { api } from '../../services/api';
import { ScreenWrapper } from '../../components/ui/ScreenWrapper';
import { Card } from '../../components/ui/Card';
import { Clock, CheckCircle, MapPin, AlertTriangle, ShieldCheck, ChevronRight } from 'lucide-react-native';

const FILTERS = ['All', 'Resolved', 'Accepted', 'En Route'];

export function PoliceHistoryScreen({ navigation }) {
  const [history, setHistory] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [activeFilter, setActiveFilter] = useState('All');
  const [isLoading, setIsLoading] = useState(false);

  const fetchHistory = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await api.getPoliceIncidentHistory();
      if (Array.isArray(data)) {
        setHistory(data);
        setFiltered(data);
      }
    } catch (e) {
      console.warn("Failed to fetch incident history:", e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const handleFilterChange = (f) => {
    setActiveFilter(f);
    if (f === 'All') {
      setFiltered(history);
    } else if (f === 'Resolved') {
      setFiltered(history.filter(h => h.response_status === 'RESOLVED' || h.status === 'RESOLVED'));
    } else if (f === 'Accepted') {
      setFiltered(history.filter(h => h.response_status === 'ACCEPTED'));
    } else if (f === 'En Route') {
      setFiltered(history.filter(h => h.response_status === 'EN_ROUTE'));
    }
  };

  const renderItem = ({ item }) => {
    const isResolved = item.response_status === 'RESOLVED' || item.status === 'RESOLVED';
    const dateStr = item.start_time ? new Date(item.start_time).toLocaleString() : 'N/A';

    return (
      <Card style={styles.historyCard}>
        <View style={styles.cardHeader}>
          <View style={styles.idBadge}>
            <Text style={styles.idText}>#{item.id}</Text>
          </View>
          <View style={[styles.statusBadge, isResolved ? styles.statusResolved : styles.statusActive]}>
            <Text style={[styles.statusText, isResolved ? styles.statusTextResolved : styles.statusTextActive]}>
              {item.response_status || item.dispatch_status}
            </Text>
          </View>
        </View>

        <Text style={styles.categoryText}>{item.category || item.type}</Text>
        <Text style={styles.localityText}>{item.locality || 'Indiranagar'}, {item.city || 'Bengaluru'}</Text>

        <View style={styles.metaRow}>
          <Clock size={12} color="#64748B" />
          <Text style={styles.metaText}>{dateStr}</Text>
        </View>

        {item.notes ? (
          <View style={styles.notesBox}>
            <Text style={styles.notesLabel}>Officer Summary:</Text>
            <Text style={styles.notesContent}>{item.notes}</Text>
          </View>
        ) : null}
      </Card>
    );
  };

  return (
    <ScreenWrapper edges={['top', 'bottom']} style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>PATROL INCIDENT LOG</Text>
        <Text style={styles.subtitle}>Audit history of emergency responses and resolved incidents</Text>
      </View>

      {/* FILTER PILLS */}
      <View style={styles.filterBar}>
        {FILTERS.map(f => (
          <TouchableOpacity
            key={f}
            style={[styles.filterPill, activeFilter === f && styles.filterPillActive]}
            onPress={() => handleFilterChange(f)}
          >
            <Text style={[styles.filterText, activeFilter === f && styles.filterTextActive]}>{f}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item, idx) => String(item.id || idx)}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={fetchHistory} tintColor="#60A5FA" />}
        ListEmptyComponent={
          <View style={styles.emptyBox}>
            <ShieldCheck size={40} color="#64748B" />
            <Text style={styles.emptyTitle}>No Recorded Incidents</Text>
            <Text style={styles.emptySub}>No prior incidents match the selected filter category.</Text>
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
  filterBar: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
  },
  filterPill: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#0F1A2E',
    borderWidth: 1,
    borderColor: '#1E2F4D',
  },
  filterPillActive: {
    backgroundColor: '#1E3A8A',
    borderColor: '#3B82F6',
  },
  filterText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#94A3B8',
  },
  filterTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  listContent: {
    padding: 16,
    paddingTop: 4,
    paddingBottom: 40,
  },
  historyCard: {
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
  idBadge: {
    backgroundColor: '#1E293B',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  idText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#94A3B8',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusResolved: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
  },
  statusActive: {
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
  },
  statusText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  statusTextResolved: {
    color: '#10B981',
  },
  statusTextActive: {
    color: '#60A5FA',
  },
  categoryText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#F8FAFC',
    marginBottom: 2,
  },
  localityText: {
    fontSize: 13,
    color: '#94A3B8',
    marginBottom: 8,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaText: {
    fontSize: 11,
    color: '#64748B',
  },
  notesBox: {
    marginTop: 10,
    backgroundColor: '#0A1322',
    borderRadius: 8,
    padding: 8,
    borderLeftWidth: 2,
    borderLeftColor: '#3B82F6',
  },
  notesLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#60A5FA',
    marginBottom: 2,
  },
  notesContent: {
    fontSize: 11,
    color: '#CBD5E1',
    lineHeight: 15,
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

