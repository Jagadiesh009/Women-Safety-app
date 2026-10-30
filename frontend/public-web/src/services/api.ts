import { auth } from '../config/firebase';
import type { 
  EmergencyContact, 
  UserProfile, 
  IncidentReport,
  PoliceOfficerProfile,
  DutyStatusData,
  IncomingAlertItem,
  PoliceIncidentDetail,
  PatrolUnitMarker,
  PatrolRecommendationItem,
  PatrolAssignmentItem,
  CrimeIncidentSummary,
  LocalityCrimeSummaryItem,
  WeeklyCrimeReportData,
  CommunitySafetyLocality,
  CommunityAlertItem
} from '../types';

const getApiBaseUrl = (): string => {
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }
  if (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
    return 'http://localhost:8000';
  }
  return 'https://women-safety-app-xo2h.onrender.com';
};

export const API_BASE_URL = getApiBaseUrl();

const getUserStorageKey = (prefix: string, uid?: string | null): string => {
  if (!uid) return '';
  return `safeher_${prefix}_${uid}`;
};

export const clearUserLocalData = (uid?: string | null): void => {
  try {
    if (uid) {
      localStorage.removeItem(getUserStorageKey('contacts', uid));
      localStorage.removeItem(getUserStorageKey('profile', uid));
    }
    // Also clean up any legacy global keys to prevent data leakage across sessions
    localStorage.removeItem('safeher_web_contacts');
    localStorage.removeItem('safeher_web_profile');
    localStorage.removeItem('safeher_web_reports');
  } catch (e) {
    console.warn('[SafeHer Storage] Failed to clear user local data:', e);
  }
};

const getAuthHeaders = async (): Promise<Record<string, string>> => {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (auth?.currentUser) {
    try {
      const token = await auth.currentUser.getIdToken();
      headers['Authorization'] = `Bearer ${token}`;
    } catch (e) {
      console.warn('[SafeHer API] Failed to retrieve Firebase ID token:', e);
    }
  }
  return headers;
};

export const getPoliceAuthHeaders = (): Record<string, string> => {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  const token = localStorage.getItem('safeher_police_token');
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
};

// ============================================================================
// CORE USER & INCIDENT API
// ============================================================================

export const api = {
  async checkHealth(): Promise<{ status: string; online: boolean }> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);
      const res = await fetch(`${API_BASE_URL}/health`, {
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      if (res.ok) {
        const data = await res.json();
        return { status: data.status || 'ok', online: true };
      }
      return { status: `HTTP ${res.status}`, online: false };
    } catch {
      return { status: 'offline', online: false };
    }
  },

  // --- Users / Profile ---
  async syncUser(userData: {
    email: string;
    name?: string;
    phone?: string;
    blood_group?: string;
  }): Promise<UserProfile | null> {
    const headers = await getAuthHeaders();
    if (!headers['Authorization']) {
      return null;
    }

    try {
      const res = await fetch(`${API_BASE_URL}/users/sync`, {
        method: 'POST',
        headers,
        body: JSON.stringify(userData),
      });
      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`Sync failed (${res.status}): ${errText}`);
      }
      const data = await res.json();
      const profile: UserProfile = {
        uid: data.firebase_uid,
        email: data.email,
        name: data.name || '',
        phone: data.phone || '',
        bloodGroup: data.blood_group || 'O+',
        isSyncedWithCloud: true,
      };
      if (auth?.currentUser?.uid) {
        localStorage.setItem(
          getUserStorageKey('profile', auth.currentUser.uid),
          JSON.stringify(profile)
        );
      }
      return profile;
    } catch (err) {
      console.warn('[SafeHer API] User sync remote warning:', err);
      return null;
    }
  },

  async getMyProfile(): Promise<UserProfile | null> {
    const headers = await getAuthHeaders();
    if (!headers['Authorization'] || !auth?.currentUser) return null;

    try {
      const res = await fetch(`${API_BASE_URL}/users/me`, {
        headers,
      });
      if (res.ok) {
        const data = await res.json();
        const profile: UserProfile = {
          uid: data.firebase_uid,
          email: data.email,
          name: data.name || '',
          phone: data.phone || '',
          bloodGroup: data.blood_group || 'O+',
          isSyncedWithCloud: true,
        };
        localStorage.setItem(
          getUserStorageKey('profile', auth.currentUser.uid),
          JSON.stringify(profile)
        );
        return profile;
      }
      // If 404, user might not have synced yet, sync now
      if (res.status === 404) {
        return await this.syncUser({
          email: auth.currentUser.email || '',
          name: auth.currentUser.displayName || '',
          phone: auth.currentUser.phoneNumber || '',
          blood_group: 'O+',
        });
      }
      return null;
    } catch (err) {
      console.warn('[SafeHer API] Profile fetch error:', err);
      if (auth?.currentUser?.uid) {
        const cached = localStorage.getItem(getUserStorageKey('profile', auth.currentUser.uid));
        if (cached) {
          try {
            return JSON.parse(cached);
          } catch {
            // ignore
          }
        }
      }
      return null;
    }
  },

  // --- Contacts ---
  async getContacts(): Promise<EmergencyContact[]> {
    if (!auth?.currentUser) {
      return [];
    }

    const uid = auth.currentUser.uid;
    const headers = await getAuthHeaders();
    if (!headers['Authorization']) {
      return [];
    }

    const deduplicate = (list: EmergencyContact[]): EmergencyContact[] => {
      const seen = new Set<string>();
      const result: EmergencyContact[] = [];
      const sorted = [...list].sort((a, b) => (b.is_primary ? 1 : 0) - (a.is_primary ? 1 : 0));
      for (const item of sorted) {
        const cleanPhone = (item.phone || '').replace(/\D/g, '');
        const normPhone = cleanPhone.length >= 10 ? cleanPhone.slice(-10) : cleanPhone;
        const key = normPhone || (item.id ? `id_${item.id}` : (item.name ? item.name.trim().toLowerCase() : ''));
        if (key && !seen.has(key)) {
          seen.add(key);
          result.push(item);
        }
      }
      return result;
    };

    try {
      const res = await fetch(`${API_BASE_URL}/contacts/`, {
        headers,
      });

      if (res.ok) {
        const remoteContacts = await res.json();
        if (Array.isArray(remoteContacts)) {
          const deduped = deduplicate(remoteContacts);
          localStorage.setItem(
            getUserStorageKey('contacts', uid),
            JSON.stringify(deduped)
          );
          return deduped;
        }
      } else if (res.status === 404) {
        await this.syncUser({
          email: auth.currentUser.email || '',
          name: auth.currentUser.displayName || '',
          phone: auth.currentUser.phoneNumber || '',
          blood_group: 'O+',
        });
        const retryRes = await fetch(`${API_BASE_URL}/contacts/`, { headers });
        if (retryRes.ok) {
          const retriedContacts = await retryRes.json();
          if (Array.isArray(retriedContacts)) {
            const deduped = deduplicate(retriedContacts);
            localStorage.setItem(
              getUserStorageKey('contacts', uid),
              JSON.stringify(deduped)
            );
            return deduped;
          }
        }
      } else {
        throw new Error(`Server returned HTTP ${res.status}`);
      }
    } catch (err) {
      console.warn('[SafeHer API] Contacts remote fetch warning:', err);
      const cached = localStorage.getItem(getUserStorageKey('contacts', uid));
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed)) {
            return deduplicate(parsed);
          }
        } catch {
          // ignore
        }
      }
      throw err;
    }

    return [];
  },

  async createContact(contactData: {
    name: string;
    phone: string;
    relation: string;
    is_primary: boolean;
  }): Promise<EmergencyContact> {
    if (!auth?.currentUser) {
      throw new Error('Authentication required to add emergency contacts.');
    }

    const headers = await getAuthHeaders();
    if (!headers['Authorization']) {
      throw new Error('Valid authentication session required.');
    }

    const res = await fetch(`${API_BASE_URL}/contacts/`, {
      method: 'POST',
      headers,
      body: JSON.stringify(contactData),
    });

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`Failed to create contact (${res.status}): ${errorText}`);
    }

    return await res.json();
  },

  async updateContact(
    id: number | string,
    contactData: Partial<EmergencyContact>
  ): Promise<EmergencyContact> {
    if (!auth?.currentUser) {
      throw new Error('Authentication required to update emergency contacts.');
    }

    const headers = await getAuthHeaders();
    if (!headers['Authorization']) {
      throw new Error('Valid authentication session required.');
    }

    const res = await fetch(`${API_BASE_URL}/contacts/${id}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(contactData),
    });

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`Failed to update contact (${res.status}): ${errorText}`);
    }

    return await res.json();
  },

  async deleteContact(id: number | string): Promise<boolean> {
    if (!auth?.currentUser) {
      throw new Error('Authentication required to delete emergency contacts.');
    }

    const headers = await getAuthHeaders();
    if (!headers['Authorization']) {
      throw new Error('Valid authentication session required.');
    }

    const res = await fetch(`${API_BASE_URL}/contacts/${id}`, {
      method: 'DELETE',
      headers,
    });

    if (res.ok || res.status === 204) {
      return true;
    }
    const errorText = await res.text();
    throw new Error(`Failed to delete contact (${res.status}): ${errorText}`);
  },

  async getIncidents(): Promise<IncidentReport[]> {
    if (!auth?.currentUser) {
      return [];
    }
    const headers = await getAuthHeaders();
    if (!headers['Authorization']) {
      return [];
    }

    try {
      const res = await fetch(`${API_BASE_URL}/incidents/`, { headers });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          return data.map((item: any) => ({
            id: `#INC-${item.id}`,
            type: item.type || 'Emergency Alert',
            description: item.status || 'Active',
            createdAt: item.start_time || new Date().toISOString(),
            status: item.status === 'RESOLVED' ? 'Resolved' : 'Submitted',
            location: {
              latitude: 16.5062,
              longitude: 80.6480,
              addressLabel: 'Inavolu, Andhra Pradesh',
            },
            timeline: [],
          }));
        }
      }
    } catch (err) {
      console.warn('[SafeHer API] Failed to fetch incidents:', err);
    }
    return [];
  },
};

// ============================================================================
// POLICE OFFICER PORTAL API
// ============================================================================

export const policeApi = {
  async login(badgeNumber: string, password: string): Promise<{
    access_token: string;
    token_type: string;
    officer: PoliceOfficerProfile;
  }> {
    const res = await fetch(`${API_BASE_URL}/police/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        badge_number: badgeNumber.trim(),
        password: password
      })
    });

    if (!res.ok) {
      let message = 'Failed to authenticate officer';
      try {
        const errorJson = await res.json();
        if (errorJson.detail) {
          message = typeof errorJson.detail === 'string' ? errorJson.detail : JSON.stringify(errorJson.detail);
        }
      } catch {
        const text = await res.text();
        if (text) message = text;
      }
      throw new Error(message);
    }

    const data = await res.json();
    if (data.access_token) {
      localStorage.setItem('safeher_police_token', data.access_token);
      localStorage.setItem('safeher_police_officer', JSON.stringify(data.officer));
    }
    return data;
  },

  async getMe(): Promise<PoliceOfficerProfile> {
    const headers = getPoliceAuthHeaders();
    const res = await fetch(`${API_BASE_URL}/police/auth/me`, { headers });
    if (!res.ok) {
      throw new Error(`Failed to fetch officer profile (${res.status})`);
    }
    const data = await res.json();
    localStorage.setItem('safeher_police_officer', JSON.stringify(data));
    return data;
  },

  async toggleDuty(
    isOnDuty: boolean, 
    patrolZone?: string, 
    vehicleNumber?: string
  ): Promise<DutyStatusData> {
    const headers = getPoliceAuthHeaders();
    const res = await fetch(`${API_BASE_URL}/police/duty/toggle`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        is_on_duty: isOnDuty,
        patrol_zone: patrolZone,
        vehicle_number: vehicleNumber
      })
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Duty toggle failed (${res.status}): ${err}`);
    }
    return await res.json();
  },

  async getDutyStatus(): Promise<DutyStatusData> {
    const headers = getPoliceAuthHeaders();
    const res = await fetch(`${API_BASE_URL}/police/duty/status`, { headers });
    if (!res.ok) {
      throw new Error(`Failed to get duty status (${res.status})`);
    }
    return await res.json();
  },

  async updatePatrolLocation(coords: {
    latitude: number;
    longitude: number;
    accuracy?: number;
    speed?: number;
    heading?: number;
  }): Promise<{ status: string; timestamp: string }> {
    const headers = getPoliceAuthHeaders();
    const res = await fetch(`${API_BASE_URL}/police/patrol/location`, {
      method: 'POST',
      headers,
      body: JSON.stringify(coords)
    });
    if (!res.ok) {
      throw new Error(`Failed to update patrol coordinates: ${res.status}`);
    }
    return await res.json();
  },

  async getActivePatrolUnits(): Promise<PatrolUnitMarker[]> {
    const headers = getPoliceAuthHeaders();
    const res = await fetch(`${API_BASE_URL}/police/patrol/active-units`, { headers });
    if (!res.ok) {
      return [];
    }
    return await res.json();
  },

  async getIncomingAlerts(): Promise<IncomingAlertItem[]> {
    const headers = getPoliceAuthHeaders();
    const res = await fetch(`${API_BASE_URL}/police/alerts`, { headers });
    if (!res.ok) {
      return [];
    }
    return await res.json();
  },

  async acceptAlert(incidentId: number): Promise<{
    status: string;
    message: string;
    incident_id: number;
    dispatch_status: string;
  }> {
    const headers = getPoliceAuthHeaders();
    const res = await fetch(`${API_BASE_URL}/police/alerts/${incidentId}/accept`, {
      method: 'POST',
      headers
    });
    if (!res.ok) {
      let detail = 'Failed to accept alert';
      try {
        const errJson = await res.json();
        if (errJson.detail) detail = errJson.detail;
      } catch {
        detail = await res.text();
      }
      throw new Error(detail);
    }
    return await res.json();
  },

  async declineAlert(incidentId: number): Promise<{ status: string; message: string }> {
    const headers = getPoliceAuthHeaders();
    const res = await fetch(`${API_BASE_URL}/police/alerts/${incidentId}/decline`, {
      method: 'POST',
      headers
    });
    if (!res.ok) {
      throw new Error(`Decline failed: ${res.status}`);
    }
    return await res.json();
  },

  async updateIncidentStatus(
    incidentId: number, 
    status: string, 
    notes?: string
  ): Promise<{ status: string; incident_id: number; dispatch_status: string; notes?: string }> {
    const headers = getPoliceAuthHeaders();
    const res = await fetch(`${API_BASE_URL}/police/incidents/${incidentId}/status`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ status, notes })
    });
    if (!res.ok) {
      let detail = 'Failed to update response status';
      try {
        const j = await res.json();
        if (j.detail) detail = j.detail;
      } catch {
        detail = await res.text();
      }
      throw new Error(detail);
    }
    return await res.json();
  },

  async getActiveIncident(): Promise<PoliceIncidentDetail | null> {
    const headers = getPoliceAuthHeaders();
    const res = await fetch(`${API_BASE_URL}/police/incidents/active`, { headers });
    if (!res.ok) return null;
    return await res.json();
  },

  async getIncidentHistory(): Promise<PoliceIncidentDetail[]> {
    const headers = getPoliceAuthHeaders();
    const res = await fetch(`${API_BASE_URL}/police/incidents/history`, { headers });
    if (!res.ok) return [];
    return await res.json();
  },

  async getPatrolRecommendations(): Promise<PatrolRecommendationItem[]> {
    const headers = getPoliceAuthHeaders();
    const res = await fetch(`${API_BASE_URL}/police/patrol/recommendations`, { headers });
    if (!res.ok) return [];
    return await res.json();
  },

  async assignPatrolRecommendation(
    recommendationId: number,
    payload: {
      officer_id: number;
      shift_period?: string;
      instructions?: string;
    }
  ): Promise<PatrolAssignmentItem> {
    const headers = getPoliceAuthHeaders();
    const res = await fetch(`${API_BASE_URL}/police/patrol/recommendations/${recommendationId}/assign`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Patrol assignment failed (${res.status}): ${err}`);
    }
    return await res.json();
  },

  async getMyPatrolAssignments(): Promise<PatrolAssignmentItem[]> {
    const headers = getPoliceAuthHeaders();
    const res = await fetch(`${API_BASE_URL}/police/patrol/my-assignments`, { headers });
    if (!res.ok) return [];
    return await res.json();
  },

  logout(): void {
    localStorage.removeItem('safeher_police_token');
    localStorage.removeItem('safeher_police_officer');
  }
};

// ============================================================================
// CRIME ANALYTICS & INTELLIGENCE API
// ============================================================================

export const crimeApi = {
  async search(params: {
    city?: string;
    locality?: string;
    area?: string;
    pincode?: string;
    category?: string;
    days?: number;
    verified_only?: boolean;
    start_date?: string;
    end_date?: string;
  }): Promise<{
    total_found: number;
    verified_count: number;
    unverified_count: number;
    locality_searched?: string;
    incidents: CrimeIncidentSummary[];
    breakdown_by_category: Record<string, number>;
  }> {
    const query = new URLSearchParams();
    if (params.city) query.append('city', params.city);
    if (params.locality) query.append('locality', params.locality);
    if (params.area) query.append('area', params.area);
    if (params.pincode) query.append('pincode', params.pincode);
    if (params.category && params.category !== 'All') query.append('category', params.category);
    if (params.days) query.append('days', params.days.toString());
    if (params.verified_only !== undefined) query.append('verified_only', params.verified_only.toString());
    if (params.start_date) query.append('start_date', params.start_date);
    if (params.end_date) query.append('end_date', params.end_date);

    const res = await fetch(`${API_BASE_URL}/crime/search?${query.toString()}`);
    if (!res.ok) {
      throw new Error(`Crime search failed (${res.status})`);
    }
    return await res.json();
  },

  async getLocalities(): Promise<LocalityCrimeSummaryItem[]> {
    const res = await fetch(`${API_BASE_URL}/crime/localities`);
    if (!res.ok) return [];
    return await res.json();
  },

  async getWeeklyReport(weeksAgo = 0): Promise<WeeklyCrimeReportData> {
    const res = await fetch(`${API_BASE_URL}/crime/weekly-report?weeks_ago=${weeksAgo}`);
    if (!res.ok) {
      throw new Error(`Failed to load weekly crime report (${res.status})`);
    }
    return await res.json();
  },

  getWeeklyReportPdfUrl(weeksAgo = 0): string {
    return `${API_BASE_URL}/crime/weekly-report/pdf?weeks_ago=${weeksAgo}`;
  }
};

// ============================================================================
// COMMUNITY RADAR & SAFETY MAP API
// ============================================================================

export const communityApi = {
  async getSafetyMap(): Promise<CommunitySafetyLocality[]> {
    const res = await fetch(`${API_BASE_URL}/community/safety-map`);
    if (!res.ok) return [];
    return await res.json();
  },

  async getAlerts(locality?: string): Promise<CommunityAlertItem[]> {
    const url = locality 
      ? `${API_BASE_URL}/community/alerts?locality=${encodeURIComponent(locality)}` 
      : `${API_BASE_URL}/community/alerts`;
    const res = await fetch(url);
    if (!res.ok) return [];
    return await res.json();
  },

  async createAlert(payload: {
    title: string;
    locality: string;
    category: string;
    description: string;
    severity?: 'HIGH' | 'MEDIUM' | 'LOW';
  }): Promise<CommunityAlertItem> {
    const headers = getPoliceAuthHeaders();
    const res = await fetch(`${API_BASE_URL}/community/alerts`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      throw new Error(`Failed to publish community safety advisory (${res.status})`);
    }
    return await res.json();
  }
};
