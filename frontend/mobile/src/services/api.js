import { auth } from '../config/firebase';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Multi-tier API endpoints for extreme connection resilience:
// 1. Local over adb reverse (127.0.0.1:8000)
// 2. Android emulator host loopback (10.0.2.2:8000)
// 3. Local machine Wi-Fi / LAN IP (10.222.5.225:8000)
// 4. Production cloud backend (https://women-safety-app-xo2h.onrender.com)
const CLOUD_API_URL = 'https://women-safety-app-xo2h.onrender.com';
const CANDIDATE_URLS = [
    process.env.EXPO_PUBLIC_API_URL,
    'http://127.0.0.1:8000',
    'http://10.0.2.2:8000',
    'http://10.222.5.225:8000',
    CLOUD_API_URL
].filter(Boolean);

let activeBaseUrl = CANDIDATE_URLS[0] || 'http://127.0.0.1:8000';
console.log('[API Config] Initial base URL:', activeBaseUrl);

// Helper to get fresh token and configure headers for either user or police officer
const getHeaders = async (endpoint = '') => {
    // 0. Nearby police radar endpoint (accessible to civilians, police, and test fixtures)
    if (endpoint.startsWith('/police/nearby')) {
        const user = auth.currentUser;
        if (user) {
            try {
                const token = await user.getIdToken();
                return {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                };
            } catch (e) {}
        }
        const policeToken = await AsyncStorage.getItem('@safeher_police_token');
        if (policeToken) {
            return {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${policeToken}`
            };
        }
        return { 'Content-Type': 'application/json' };
    }

    // 1. Police endpoints
    if (endpoint.startsWith('/police')) {
        if (endpoint === '/police/auth/login') {
            return { 'Content-Type': 'application/json' };
        }
        const policeToken = await AsyncStorage.getItem('@safeher_police_token');
        if (!policeToken) {
            throw new Error("No authorized police officer token found.");
        }
        return {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${policeToken}`
        };
    }

    // 2. Public / semi-public crime and community endpoints
    const isPublic = endpoint.startsWith('/crime') || endpoint.startsWith('/community');
    const user = auth.currentUser;

    if (!user) {
        if (isPublic) {
            // Check if police token is available
            const policeToken = await AsyncStorage.getItem('@safeher_police_token');
            if (policeToken) {
                return {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${policeToken}`
                };
            }
            return { 'Content-Type': 'application/json' };
        }
        throw new Error("No authenticated user found for API request.");
    }

    // 3. Authenticated SafeHer user
    const token = await user.getIdToken();
    return {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
    };
};

const executeFetch = async (baseUrl, endpoint, options, headers) => {
    const timeoutMs = options.timeout || (baseUrl.includes('127.0.0.1') ? 3500 : 7000);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
        const response = await fetch(`${baseUrl}${endpoint}`, {
            ...options,
            headers: {
                ...headers,
                ...options.headers,
            },
            signal: controller.signal
        });
        clearTimeout(timeoutId);

        if (response.status === 204) {
            return { ok: true, data: null };
        }

        const text = await response.text();
        let data;
        try {
            data = text ? JSON.parse(text) : {};
        } catch (e) {
            const isHtml = text.trim().startsWith('<');
            const errorMsg = isHtml 
                ? `Server returned HTML instead of JSON. Check your API_URL configuration.` 
                : `Invalid JSON response from server.`;
            const errorObj = new Error(errorMsg);
            errorObj.status = response.status;
            throw errorObj;
        }

        if (!response.ok) {
            const errorObj = new Error(data.detail || data.message || `API Error: ${response.status}`);
            errorObj.status = response.status;
            throw errorObj;
        }

        return { ok: true, data };
    } catch (err) {
        clearTimeout(timeoutId);
        throw err;
    }
};

// Generic API caller with resilient automatic candidate endpoint fallback
const fetchApi = async (endpoint, options = {}) => {
    const headers = await getHeaders(endpoint);

    // 1. First attempt with active base URL
    try {
        const res = await executeFetch(activeBaseUrl, endpoint, options, headers);
        return res.data;
    } catch (primaryErr) {
        const primaryErrMsg = primaryErr.message ? primaryErr.message.toLowerCase() : '';
        const isConnectionErr = primaryErrMsg.includes('connect') || 
                                primaryErrMsg.includes('network') || 
                                primaryErrMsg.includes('failed to fetch') ||
                                primaryErrMsg.includes('aborted') ||
                                primaryErrMsg.includes('canceled');

        // If it was a network/connection failure, cycle through candidate endpoints
        if (isConnectionErr) {
            for (const candidate of CANDIDATE_URLS) {
                if (candidate === activeBaseUrl) continue;
                try {
                    const fallbackRes = await executeFetch(candidate, endpoint, options, headers);
                    activeBaseUrl = candidate;
                    console.log(`[API Fallback] Switched activeBaseUrl to ${candidate}`);
                    return fallbackRes.data;
                } catch (candidateErr) {
                    // Try next candidate
                }
            }
            console.error(`[API Error] All candidate endpoints failed for ${endpoint}`);
        }

        const isAuthOrNotFound = primaryErr.status === 404 || primaryErr.status === 403;
        if (isConnectionErr || isAuthOrNotFound) {
            console.warn(`[API Warning] ${endpoint}:`, primaryErr.message);
        } else {
            console.error(`[API Error] ${endpoint}:`, primaryErr.message);
        }
        throw primaryErr;
    }
};

let syncPromise = null;

export const api = {
    // User endpoints
    syncUser: async (userData) => {
        if (syncPromise) return syncPromise;
        
        const executeSync = async () => {
            try {
                return await fetchApi('/users/sync', {
                    method: 'POST',
                    body: JSON.stringify(userData)
                });
            } catch (error) {
                throw error;
            }
        };

        syncPromise = executeSync().finally(() => {
            syncPromise = null;
        });

        return syncPromise;
    },
    getMyProfile: () => fetchApi('/users/me'),

    // Contacts endpoints
    getContacts: () => fetchApi('/contacts/'),
    createContact: (contactData) => fetchApi('/contacts/', {
        method: 'POST',
        body: JSON.stringify(contactData)
    }),
    updateContact: (id, contactData) => fetchApi(`/contacts/${id}`, {
        method: 'PUT',
        body: JSON.stringify(contactData)
    }),
    deleteContact: (id) => fetchApi(`/contacts/${id}`, {
        method: 'DELETE'
    }),

    // Incident endpoints
    getIncidents: () => fetchApi('/incidents/'),
    createIncident: (incidentData) => fetchApi('/incidents/', {
        method: 'POST',
        body: JSON.stringify(incidentData)
    }),
    updateIncident: (id, incidentData) => fetchApi(`/incidents/${id}`, {
        method: 'PUT',
        body: JSON.stringify(incidentData)
    }),
    getIncidentDispatchStatus: (incidentId) => fetchApi(`/incidents/${incidentId}/dispatch-status`),

    // Location endpoints
    addLocation: (incidentId, locationData) => fetchApi(`/locations/${incidentId}`, {
        method: 'POST',
        body: JSON.stringify(locationData)
    }),
    getIncidentLocations: (incidentId) => fetchApi(`/incidents/${incidentId}/locations`),

    // Live Location Sharing
    startLocationShare: (sessionToken = null) => fetchApi('/locations/share/start', {
        method: 'POST',
        body: sessionToken ? JSON.stringify({ session_token: sessionToken }) : undefined
    }),
    updateLocationShare: (locationData) => fetchApi('/locations/share/update', {
        method: 'POST',
        body: JSON.stringify(locationData)
    }),
    stopLocationShare: () => fetchApi('/locations/share/stop', {
        method: 'POST'
    }),
    getActiveLocationShare: () => fetchApi('/locations/share/active'),

    // Location Safety Rating
    getSafetyScore: (latitude, longitude, accuracy) => {
        const accParam = accuracy ? `&accuracy=${accuracy}` : '';
        return fetchApi(`/locations/safety-score?latitude=${latitude}&longitude=${longitude}${accParam}`);
    },

    // ========================================================================
    // POLICE OFFICER ENDPOINTS
    // ========================================================================
    policeLogin: (badgeNumber, password) => fetchApi('/police/auth/login', {
        method: 'POST',
        body: JSON.stringify({ badge_number: badgeNumber, password: password })
    }),
    getPoliceProfile: () => fetchApi('/police/auth/me'),

    // Duty Status & Location
    toggleDutyStatus: (isOnDuty, patrolZone = null, vehicleNumber = null) => fetchApi('/police/duty/toggle', {
        method: 'POST',
        body: JSON.stringify({ is_on_duty: isOnDuty, patrol_zone: patrolZone, vehicle_number: vehicleNumber })
    }),
    getDutyStatus: () => fetchApi('/police/duty/status'),
    updatePatrolLocation: (locationData) => fetchApi('/police/patrol/location', {
        method: 'POST',
        body: JSON.stringify(locationData)
    }),
    getActivePatrolUnits: () => fetchApi('/police/patrol/active-units'),

    // Incoming Alerts & Response
    getIncomingAlerts: () => fetchApi('/police/alerts'),
    acceptAlert: (incidentId) => fetchApi(`/police/alerts/${incidentId}/accept`, {
        method: 'POST'
    }),
    declineAlert: (incidentId) => fetchApi(`/police/alerts/${incidentId}/decline`, {
        method: 'POST'
    }),
    updateIncidentStatus: (incidentId, status, notes = null) => fetchApi(`/police/incidents/${incidentId}/status`, {
        method: 'POST',
        body: JSON.stringify({ status: status, notes: notes })
    }),
    getActivePoliceIncident: () => fetchApi('/police/incidents/active'),
    getPoliceIncidentHistory: () => fetchApi('/police/incidents/history'),

    // Area Patrol Recommendations & Assignments (Features 4 & 6)
    getPatrolRecommendations: () => fetchApi('/police/patrol/recommendations'),
    assignPatrolRecommendation: (recId, officerId, instructions = null, shiftPeriod = null) => fetchApi(`/police/patrol/recommendations/${recId}/assign`, {
        method: 'POST',
        body: JSON.stringify({ officer_id: officerId, instructions: instructions, shift_period: shiftPeriod })
    }),
    getMyPatrolAssignments: () => fetchApi('/police/patrol/my-assignments'),
    updatePatrolAssignmentStatus: (assignmentId, status) => fetchApi(`/police/patrol/assignments/${assignmentId}/status`, {
        method: 'POST',
        body: JSON.stringify({ status: status })
    }),

    // ========================================================================
    // CRIME SEARCH & WEEKLY REPORTS (Features 1 & 2)
    // ========================================================================
    searchCrime: (query = null, category = null, startDate = null, endDate = null) => {
        let params = [];
        if (query) params.push(`query=${encodeURIComponent(query)}`);
        if (category && category !== 'All') params.push(`category=${encodeURIComponent(category)}`);
        if (startDate) params.push(`start_date=${encodeURIComponent(startDate)}`);
        if (endDate) params.push(`end_date=${encodeURIComponent(endDate)}`);
        const qs = params.length > 0 ? `?${params.join('&')}` : '';
        return fetchApi(`/crime/search${qs}`);
    },
    getLocalitiesCrimeSummary: () => fetchApi('/crime/localities'),
    getWeeklyCrimeReport: (offsetWeeks = 0) => fetchApi(`/crime/weekly-report?date_offset_weeks=${offsetWeeks}`),
    getWeeklyReportPdfUrl: () => `${activeBaseUrl}/crime/weekly-report/pdf`,

    // ========================================================================
    // COMMUNITY AREA SAFETY & ALERTS (Features 3 & 5)
    // ========================================================================
    getCommunitySafetyMap: () => fetchApi('/community/safety-map'),
    getCommunityAlerts: (locality = null) => {
        const qs = locality ? `?locality=${encodeURIComponent(locality)}` : '';
        return fetchApi(`/community/alerts${qs}`);
    },
    publishCommunityAlert: (alertData) => fetchApi('/community/alerts', {
        method: 'POST',
        body: JSON.stringify(alertData)
    }),
    getNearbyPolice: (latitude, longitude, radiusKm = 3.0) => 
        fetchApi(`/police/nearby?latitude=${latitude}&longitude=${longitude}&radius_km=${radiusKm}`),
};
