import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, Linking } from 'react-native';
import { api } from '../../services/api';
import { ScreenWrapper } from '../../components/ui/ScreenWrapper';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { FileText, TrendingUp, AlertTriangle, Clock, ShieldCheck, Download, ExternalLink } from 'lucide-react-native';

export function PoliceWeeklyReportScreen() {
  const [report, setReport] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const fetchReport = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await api.getWeeklyCrimeReport(0);
      setReport(data);
    } catch (e) {
      console.warn("Failed to load weekly report:", e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  const handleOpenPdf = () => {
    const url = api.getWeeklyReportPdfUrl();
    Linking.openURL(url).catch(e => console.warn("Failed to open report URL:", e));
  };

  return (
    <ScreenWrapper scrollable edges={['top', 'bottom']} style={styles.container}>
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>WEEKLY CRIME & PATROL REPORT</Text>
          <Text style={styles.subtitle}>
            Period: {report?.report_week || 'Current Week'} • Official Police Analytics
          </Text>
        </View>
        <TouchableOpacity style={styles.downloadIconBtn} onPress={handleOpenPdf}>
          <Download size={18} color="#60A5FA" />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={fetchReport} tintColor="#60A5FA" />}
      >
        {report?.insufficient_data ? (
          <Card style={styles.insufficientCard}>
            <AlertTriangle size={36} color="#F59E0B" />
            <Text style={styles.insufficientTitle}>Insufficient Verified Data</Text>
            <Text style={styles.insufficientSub}>
              Not enough verified incidents recorded this weekly cycle to compute statistically significant rankings.
            </Text>
          </Card>
        ) : (
          <>
            {/* KPI CARDS */}
            <View style={styles.kpiGrid}>
              <View style={styles.kpiCard}>
                <Text style={styles.kpiLabel}>TOTAL VERIFIED</Text>
                <Text style={styles.kpiVal}>{report?.total_verified_incidents || 0}</Text>
                <Text style={styles.kpiSub}>vs {report?.previous_week_total || 0} prev week</Text>
              </View>

              <View style={styles.kpiCard}>
                <Text style={styles.kpiLabel}>WEEK-ON-WEEK</Text>
                <Text style={[styles.kpiVal, { color: (report?.week_on_week_change_pct || 0) > 0 ? '#EF4444' : '#10B981' }]}>
                  {(report?.week_on_week_change_pct || 0) > 0 ? `+${report?.week_on_week_change_pct}%` : `${report?.week_on_week_change_pct}%`}
                </Text>
                <Text style={styles.kpiSub}>Trend comparison</Text>
              </View>

              <View style={styles.kpiCardFull}>
                <Text style={styles.kpiLabel}>HIGHEST VERIFIED LOCALITY (RANK 1)</Text>
                <Text style={styles.kpiValLarge}>{report?.highest_risk_area || 'Indiranagar'}</Text>
                <Text style={styles.kpiSub}>Peak Period: {report?.time_of_day_distribution?.peak_period || 'Night (22:00 - 04:00)'}</Text>
              </View>
            </View>

            {/* LOCALITY RANKINGS TABLE */}
            <Card style={styles.sectionCard}>
              <Text style={styles.cardHeading}>LOCALITY VERIFIED INCIDENT RANKINGS</Text>
              
              {report?.ranked_areas?.map((item) => {
                const isRank1 = item.rank === 1;
                const isHigh = item.risk_level === 'HIGH';

                return (
                  <View key={item.locality} style={[styles.rankRow, isRank1 && styles.rankRowFirst]}>
                    <View style={styles.rankBadge}>
                      <Text style={styles.rankNum}>#{item.rank}</Text>
                    </View>

                    <View style={{ flex: 1 }}>
                      <Text style={styles.rankLocality}>{item.locality}</Text>
                      <Text style={styles.rankMeta}>
                        Primary: {item.primary_category} • Patrol: {item.patrol_status}
                      </Text>
                    </View>

                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={styles.rankCount}>{item.verified_count} incidents</Text>
                      <Text style={[styles.rankPct, { color: item.percentage_change > 0 ? '#EF4444' : '#10B981' }]}>
                        {item.percentage_change > 0 ? `+${item.percentage_change}%` : `${item.percentage_change}%`}
                      </Text>
                    </View>
                  </View>
                );
              })}
            </Card>

            {/* TIME OF DAY CONCENTRATION */}
            <Card style={styles.sectionCard}>
              <Text style={styles.cardHeading}>TIME-OF-DAY INCIDENT CONCENTRATION</Text>
              <View style={styles.todRow}>
                <View style={styles.todCol}>
                  <Text style={styles.todCount}>{report?.time_of_day_distribution?.night_22_04 || 0}</Text>
                  <Text style={styles.todLabel}>Night (22-04)</Text>
                </View>
                <View style={styles.todCol}>
                  <Text style={styles.todCount}>{report?.time_of_day_distribution?.evening_17_22 || 0}</Text>
                  <Text style={styles.todLabel}>Evening (17-22)</Text>
                </View>
                <View style={styles.todCol}>
                  <Text style={styles.todCount}>{report?.time_of_day_distribution?.afternoon_12_17 || 0}</Text>
                  <Text style={styles.todLabel}>Afternoon (12-17)</Text>
                </View>
                <View style={styles.todCol}>
                  <Text style={styles.todCount}>{report?.time_of_day_distribution?.morning_08_12 || 0}</Text>
                  <Text style={styles.todLabel}>Morning (08-12)</Text>
                </View>
              </View>
            </Card>

            {/* CATEGORY BREAKDOWN */}
            <Card style={styles.sectionCard}>
              <Text style={styles.cardHeading}>INCIDENT CATEGORIES</Text>
              {report?.category_distribution?.map((c) => (
                <View key={c.category} style={styles.catRow}>
                  <Text style={styles.catName}>{c.category}</Text>
                  <Text style={styles.catCount}>{c.count}</Text>
                </View>
              ))}
            </Card>

            {/* DOWNLOAD PDF ACTION */}
            <Button
              title="Download Official Intelligence PDF"
              leadingIcon={<Download size={18} color="#FFFFFF" />}
              onPress={handleOpenPdf}
              style={styles.pdfButton}
              size="large"
            />
          </>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
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
  downloadIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#0F1A2E',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    padding: 16,
    paddingTop: 6,
    paddingBottom: 40,
  },
  insufficientCard: {
    backgroundColor: '#0F1A2E',
    alignItems: 'center',
    padding: 24,
    borderRadius: 14,
    borderColor: '#F59E0B',
    borderWidth: 1,
  },
  insufficientTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#F59E0B',
    marginTop: 12,
  },
  insufficientSub: {
    fontSize: 12,
    color: '#94A3B8',
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 16,
  },
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 16,
  },
  kpiCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#0F1A2E',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#1E2F4D',
  },
  kpiCardFull: {
    width: '100%',
    backgroundColor: '#0F1A2E',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#1E2F4D',
  },
  kpiLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748B',
  },
  kpiVal: {
    fontSize: 22,
    fontWeight: '800',
    color: '#F8FAFC',
    marginTop: 2,
  },
  kpiValLarge: {
    fontSize: 20,
    fontWeight: '800',
    color: '#60A5FA',
    marginTop: 2,
  },
  kpiSub: {
    fontSize: 10,
    color: '#94A3B8',
    marginTop: 2,
  },
  sectionCard: {
    backgroundColor: '#0F1A2E',
    borderColor: '#1E2F4D',
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    marginBottom: 14,
  },
  cardHeading: {
    fontSize: 11,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 0.8,
    marginBottom: 12,
  },
  rankRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
    gap: 10,
  },
  rankRowFirst: {
    backgroundColor: 'rgba(59, 130, 246, 0.08)',
    borderRadius: 8,
    paddingHorizontal: 6,
  },
  rankBadge: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#1E293B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankNum: {
    fontSize: 12,
    fontWeight: '800',
    color: '#60A5FA',
  },
  rankLocality: {
    fontSize: 14,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  rankMeta: {
    fontSize: 10,
    color: '#94A3B8',
    marginTop: 1,
  },
  rankCount: {
    fontSize: 13,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  rankPct: {
    fontSize: 11,
    fontWeight: '700',
    marginTop: 1,
  },
  todRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  todCol: {
    alignItems: 'center',
    flex: 1,
  },
  todCount: {
    fontSize: 18,
    fontWeight: '800',
    color: '#60A5FA',
  },
  todLabel: {
    fontSize: 10,
    color: '#94A3B8',
    marginTop: 2,
    textAlign: 'center',
  },
  catRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  catName: {
    fontSize: 12,
    color: '#CBD5E1',
    fontWeight: '600',
  },
  catCount: {
    fontSize: 12,
    fontWeight: '800',
    color: '#60A5FA',
  },
  pdfButton: {
    backgroundColor: '#1E3A8A',
    borderColor: '#3B82F6',
    borderWidth: 1,
    marginTop: 4,
  },
});

