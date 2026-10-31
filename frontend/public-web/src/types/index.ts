export type PageView = 
  | 'welcome'
  | 'dashboard'
  | 'emergency'
  | 'contacts'
  | 'incidents'
  | 'map'
  | 'mobile-app'
  | 'profile'
  | 'settings'
  | 'features'
  | 'resources'
  | 'reports'
  | 'privacy'
  | 'terms'
  | 'track'
  | 'crime-map'
  | 'crime-reports'
  | 'community-safety';

export interface UserProfile {
  uid: string;
  email: string;
  name: string;
  phone: string;
  bloodGroup: string;
  medicalNotes?: string;
  allergies?: string;
  isSyncedWithCloud?: boolean;
}

export interface EmergencyContact {
  id: number | string;
  user_id?: number;
  name: string;
  phone: string;
  relation: string;
  is_primary: boolean;
  createdAt?: string;
}

export interface IncidentTimelineEvent {
  time: string;
  event: string;
  location?: {
    latitude: number;
    longitude: number;
    addressLabel?: string;
  };
}

export interface IncidentReport {
  id: string; // e.g. #REP-849201
  type: string;
  description: string;
  createdAt: string;
  location: {
    latitude: number;
    longitude: number;
    addressLabel?: string;
    accuracy?: number;
  };
  status: 'Submitted' | 'Under Review' | 'Resolved';
  timeline: IncidentTimelineEvent[];
}

export interface ContactFormData {
  name: string;
  email: string;
  category: 'general' | 'bug' | 'sos-feedback' | 'hardware-iot' | 'emergency';
  subject: string;
  message: string;
  honeypot?: string;
}

export interface FeatureItem {
  id: string;
  title: string;
  category: string;
  badge: string;
  summary: string;
  technicalDetails: string[];
  iconName: string;
  accentColor: string;
  isMobileNativeOnly?: boolean;
}

export interface FaqItem {
  question: string;
  answer: string;
}

export interface SafetyReadinessItem {
  id: string;
  label: string;
  description: string;
  points: number;
  completed: boolean;
}

// ============================================================================
// CRIME ANALYTICS & COMMUNITY INTELLIGENCE TYPES
// ============================================================================

export interface CrimeIncidentSummary {
  id: number;
  category: string;
  status: string;
  is_verified: boolean;
  time: string;
  locality: string;
  city: string;
  approx_latitude: number;
  approx_longitude: number;
  distance_km?: number | null;
}

export interface LocalityCrimeSummaryItem {
  locality: string;
  city: string;
  latitude: number;
  longitude: number;
  total_incidents: number;
  verified_incidents: number;
  primary_category: string;
  risk_level: 'HIGH' | 'MODERATE' | 'LOW';
  patrol_status: string;
}

export interface RankedAreaItem {
  rank: number;
  locality: string;
  city: string;
  verified_count: number;
  previous_week_count: number;
  percentage_change: number;
  trend: 'INCREASED' | 'DECREASED' | 'STABLE';
  risk_level: 'HIGH' | 'MODERATE' | 'LOW';
  primary_category: string;
  patrol_status: string;
  avg_response_time_minutes: number;
}

export interface TimeOfDayDistribution {
  night_22_04: number;
  early_morning_04_08: number;
  morning_08_12: number;
  afternoon_12_17: number;
  evening_17_22: number;
  peak_period: string;
}

export interface CategoryDistributionItem {
  category: string;
  count: number;
}

export interface WeeklyCrimeReportData {
  report_week: string;
  start_date: string;
  end_date: string;
  insufficient_data: boolean;
  total_verified_incidents: number;
  previous_week_total: number;
  week_on_week_change_pct: number;
  highest_risk_area: string;
  ranked_areas: RankedAreaItem[];
  category_distribution: CategoryDistributionItem[];
  time_of_day_distribution: TimeOfDayDistribution;
  areas_needing_patrol: string[];
  patrol_performance_summary: string;
  generated_at: string;
}

export interface CrimeSearchFilter {
  query?: string;
  locality?: string;
  category?: string;
  days?: number;
  verifiedOnly?: boolean;
}

export interface CommunitySafetyLocality {
  locality: string;
  city: string;
  latitude: number;
  longitude: number;
  risk_color: 'RED' | 'ORANGE' | 'GREEN';
  verified_incident_count: number;
  recent_alerts_count: number;
  has_active_patrol: boolean;
  patrol_units_active: number;
  needs_additional_patrol: boolean;
  data_source: string;
  last_updated: string;
}

export interface CommunityAlertItem {
  id: number;
  title: string;
  locality: string;
  category: string;
  description: string;
  severity: 'HIGH' | 'MEDIUM' | 'LOW';
  created_at: string;
  police_station?: string | null;
}

export interface NearbyPoliceOfficer {
  officer_id: number;
  display_name: string;
  badge_number: string;
  rank: string;
  station_name: string;
  latitude: number;
  longitude: number;
  distance_km: number;
  duty_status: string;
  last_location_update: string;
}
