import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, RefreshControl } from 'react-native';
import { WebView } from 'react-native-webview';
import { api } from '../services/api';
import { ScreenWrapper } from '../components/ui/ScreenWrapper';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { useAppTheme, spacing, typography, borderRadius } from '../utils/theme';
import { Search, MapPin, Calendar, Filter, ShieldAlert, ShieldCheck, ArrowLeft, BarChart2 } from 'lucide-react-native';

const CATEGORIES = ['All', 'Harassment', 'Stalking', 'Theft', 'SOS Emergency', 'Suspicious Activity'];
const DATE_RANGES = ['Last 7 Days', 'Last 30 Days', 'All Time'];

export function CrimeSearchScreen({ navigation }) {
  const { colors, isDark } = useAppTheme();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedDateRange, setSelectedDateRange] = useState('All Time');
  
  const [searchResult, setSearchResult] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const executeSearch = useCallback(async () => {
    setIsLoading(true);
    try {
      let startDate = null;
      if (selectedDateRange === 'Last 7 Days') {
        const d = new Date();
        d.setDate(d.getDate() - 7);
        startDate = d.toISOString();
      } else if (selectedDateRange === 'Last 30 Days') {
        const d = new Date();
        d.setDate(d.getDate() - 30);
        startDate = d.toISOString();
      }

      const res = await api.searchCrime(
        searchTerm.trim() || null,
        selectedCategory !== 'All' ? selectedCategory : null,
        startDate
      );
      setSearchResult(res);
    } catch (e) {
      console.warn("Crime search failed:", e);
    } finally {
      setIsLoading(false);
    }
  }, [searchTerm, selectedCategory, selectedDateRange]);

  useEffect(() => {
    executeSearch();
  }, [executeSearch]);

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
        .area-pin {
          width: 22px; height: 22px; border-radius: 50%;
          background: #3B82F6; border: 2.5px solid #FFFFFF;
          box-shadow: 0 0 8px rgba(0,0,0,0.4);
        }
        .area-pin.high { background: #EF4444; }
        .area-pin.moderate { background: #F59E0B; }
        .area-pin.low { background: #10B981; }
      </style>
    </head>
    <body>
      <div id="map"></div>
      <script>
        var map = L.map('map', { zoomControl: false }).setView([12.9716, 77.5946], 12);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 18 }).addTo(map);

        var locs = ${JSON.stringify(searchResult?.localities || [])};
        locs.forEach(function(l) {
          var cls = 'area-pin ' + l.risk_level.toLowerCase();
          var icon = L.divIcon({ className: cls, iconSize: [22, 22] });
          L.marker([l.approx_latitude, l.approx_longitude], { icon: icon })
            .addTo(map)
            .bindPopup("<b>" + l.locality + "</b><br>Verified Incidents: " + l.verified_incidents + "<br>Risk: " + l.risk_level);
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
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>CRIME MAP & REPORTS</Text>
          <Text style={styles.headerSubtitle}>Official verified area statistics & locality crime intelligence</Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={executeSearch} tintColor={colors.accentBrand} />}
      >
        {/* SEARCH BAR */}
        <View style={[styles.searchBox, { backgroundColor: colors.bgSecondary, borderColor: colors.border }]}>
          <Search size={18} color={colors.textSecondary} />
          <TextInput
            style={[styles.searchInput, { color: colors.textPrimary }]}
            placeholder="Search locality, area or PIN (e.g. Indiranagar, 560038)..."
            placeholderTextColor={colors.textMuted}
            value={searchTerm}
            onChangeText={setSearchTerm}
            onSubmitEditing={executeSearch}
          />
        </View>

        {/* CATEGORY FILTER PILLS */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pillsScroll}>
          {CATEGORIES.map(cat => (
            <TouchableOpacity
              key={cat}
              style={[
                styles.filterPill,
                { backgroundColor: selectedCategory === cat ? colors.accentBrand : colors.bgSecondary, borderColor: colors.border }
              ]}
              onPress={() => setSelectedCategory(cat)}
            >
              <Text style={[styles.filterPillText, { color: selectedCategory === cat ? '#FFFFFF' : colors.textSecondary }]}>
                {cat}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* DATE RANGE FILTER */}
        <View style={styles.dateFilterRow}>
          {DATE_RANGES.map(d => (
            <TouchableOpacity
              key={d}
              style={[
                styles.dateFilterBtn,
                selectedDateRange === d && { borderColor: colors.accentBrand, backgroundColor: colors.accentBrandMuted }
              ]}
              onPress={() => setSelectedDateRange(d)}
            >
              <Text style={[styles.dateFilterText, { color: selectedDateRange === d ? colors.accentBrand : colors.textSecondary }]}>
                {d}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* MAP COMPONENT */}
        <View style={styles.mapContainer}>
          <WebView
            originWhitelist={['*']}
            source={{ html: mapHtml }}
            style={styles.webView}
            scrollEnabled={false}
          />
        </View>

        {/* AGGREGATED METRICS SUMMARY */}
        <Card style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>TOTAL INCIDENTS</Text>
              <Text style={[styles.summaryVal, { color: colors.textPrimary }]}>{searchResult?.total_found || 0}</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>ADMIN-VERIFIED</Text>
              <Text style={[styles.summaryVal, { color: colors.accentSafe }]}>{searchResult?.total_verified || 0}</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>MONITORED LOCALITIES</Text>
              <Text style={[styles.summaryVal, { color: colors.accentBrand }]}>{searchResult?.localities?.length || 0}</Text>
            </View>
          </View>
        </Card>

        {/* LOCALITIES COMPARISON LIST */}
        <Text style={[styles.sectionHeading, { color: colors.textSecondary }]}>LOCALITIES SAFETY COMPARISON</Text>

        {searchResult?.localities?.map(loc => {
          const isHigh = loc.risk_level === 'HIGH';
          const isMod = loc.risk_level === 'MODERATE';
          const badgeColor = isHigh ? '#EF4444' : (isMod ? '#F59E0B' : '#10B981');

          return (
            <Card key={loc.locality} style={styles.localityCard}>
              <View style={styles.localityHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.localityTitle, { color: colors.textPrimary }]}>{loc.locality}</Text>
                  <Text style={styles.localitySub}>City: {loc.city} • Patrol: {loc.patrol_coverage_status}</Text>
                </View>
                <View style={[styles.riskBadge, { backgroundColor: badgeColor + '20', borderColor: badgeColor }]}>
                  <Text style={[styles.riskBadgeText, { color: badgeColor }]}>{loc.risk_level} RISK</Text>
                </View>
              </View>

              <View style={styles.countsRow}>
                <Text style={styles.countText}>Verified Incidents: <Text style={{ fontWeight: '700', color: colors.textPrimary }}>{loc.verified_incidents}</Text></Text>
                <Text style={styles.countText}>Weekly Trend: <Text style={{ fontWeight: '700', color: loc.weekly_change_pct > 0 ? '#EF4444' : '#10B981' }}>{loc.weekly_change_pct > 0 ? `+${loc.weekly_change_pct}%` : `${loc.weekly_change_pct}%`}</Text></Text>
              </View>

              {/* TOP CATEGORIES */}
              <View style={styles.catsRow}>
                {loc.top_categories?.slice(0, 3).map((c, i) => (
                  <View key={i} style={[styles.catPill, { backgroundColor: colors.bgTertiary }]}>
                    <Text style={[styles.catPillText, { color: colors.textSecondary }]}>{c.category} ({c.count})</Text>
                  </View>
                ))}
              </View>
            </Card>
          );
        })}

        {/* PRIVACY PROTECTION NOTICE */}
        <View style={styles.privacyNotice}>
          <ShieldCheck size={14} color={colors.accentSafe} />
          <Text style={styles.privacyNoticeText}>
            Victim privacy guaranteed: Private names, phone numbers, home addresses and exact private coordinates are never published.
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
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 10,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
  },
  pillsScroll: {
    gap: 8,
    marginBottom: 10,
  },
  filterPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 18,
    borderWidth: 1,
  },
  filterPillText: {
    fontSize: 12,
    fontWeight: '600',
  },
  dateFilterRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  dateFilterBtn: {
    flex: 1,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#334155',
    alignItems: 'center',
  },
  dateFilterText: {
    fontSize: 11,
    fontWeight: '600',
  },
  mapContainer: {
    height: 190,
    borderRadius: 14,
    overflow: 'hidden',
    marginBottom: 14,
  },
  webView: {
    flex: 1,
  },
  summaryCard: {
    marginBottom: 14,
    padding: 12,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  summaryItem: {
    alignItems: 'center',
    flex: 1,
  },
  summaryLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: '#64748B',
  },
  summaryVal: {
    fontSize: 20,
    fontWeight: '800',
    marginTop: 2,
  },
  sectionHeading: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
    marginBottom: 10,
  },
  localityCard: {
    marginBottom: 10,
    padding: 12,
  },
  localityHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  localityTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  localitySub: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 2,
  },
  riskBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  riskBadgeText: {
    fontSize: 10,
    fontWeight: '800',
  },
  countsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  countText: {
    fontSize: 11,
    color: '#94A3B8',
  },
  catsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  catPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  catPillText: {
    fontSize: 10,
  },
  privacyNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
    padding: 10,
    borderRadius: 8,
    backgroundColor: 'rgba(16, 185, 129, 0.08)',
  },
  privacyNoticeText: {
    fontSize: 11,
    color: '#10B981',
    flex: 1,
    lineHeight: 15,
  },
});

