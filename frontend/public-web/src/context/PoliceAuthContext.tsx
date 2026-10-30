import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { policeApi } from '../services/api';
import type { PoliceOfficerProfile, DutyStatusData } from '../types';

interface PoliceAuthContextType {
  officer: PoliceOfficerProfile | null;
  token: string | null;
  dutyStatus: DutyStatusData | null;
  isLoading: boolean;
  error: string | null;
  loginPolice: (badgeNumber: string, password: string) => Promise<boolean>;
  logoutPolice: () => void;
  toggleDuty: (isOnDuty: boolean, patrolZone?: string, vehicleNumber?: string) => Promise<boolean>;
  refreshDutyStatus: () => Promise<void>;
  refreshOfficer: () => Promise<void>;
  updateLocation: (coords: { latitude: number; longitude: number; accuracy?: number }) => Promise<void>;
  clearError: () => void;
}

const PoliceAuthContext = createContext<PoliceAuthContextType>({
  officer: null,
  token: null,
  dutyStatus: null,
  isLoading: true,
  error: null,
  loginPolice: async () => false,
  logoutPolice: () => {},
  toggleDuty: async () => false,
  refreshDutyStatus: async () => {},
  refreshOfficer: async () => {},
  updateLocation: async () => {},
  clearError: () => {},
});

export const PoliceAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [officer, setOfficer] = useState<PoliceOfficerProfile | null>(() => {
    try {
      const cached = localStorage.getItem('safeher_police_officer');
      return cached ? JSON.parse(cached) : null;
    } catch {
      return null;
    }
  });

  const [token, setToken] = useState<string | null>(() => {
    return localStorage.getItem('safeher_police_token');
  });

  const [dutyStatus, setDutyStatus] = useState<DutyStatusData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const clearError = () => setError(null);

  // Sync / validate officer on startup if token exists
  useEffect(() => {
    const initPolice = async () => {
      const storedToken = localStorage.getItem('safeher_police_token');
      if (!storedToken) {
        setIsLoading(false);
        return;
      }

      try {
        const currentOfficer = await policeApi.getMe();
        setOfficer(currentOfficer);
        setToken(storedToken);

        const status = await policeApi.getDutyStatus();
        setDutyStatus(status);
      } catch (err: any) {
        console.warn('[PoliceAuth] Token validation expired or failed:', err);
        policeApi.logout();
        setOfficer(null);
        setToken(null);
        setDutyStatus(null);
      } finally {
        setIsLoading(false);
      }
    };

    initPolice();
  }, []);

  const loginPolice = async (badgeNumber: string, password: string): Promise<boolean> => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await policeApi.login(badgeNumber, password);
      // Ensure officer has a recognized police role
      const validRoles = ['OFFICER', 'SUPERVISOR', 'DISPATCHER'];
      if (!res.officer || !validRoles.includes(res.officer.role?.toUpperCase())) {
        policeApi.logout();
        throw new Error('Access denied: Account does not possess an authorized Police Officer role.');
      }

      setToken(res.access_token);
      setOfficer(res.officer);

      const status = await policeApi.getDutyStatus();
      setDutyStatus(status);
      return true;
    } catch (err: any) {
      const msg = err.message || 'Officer authentication failed';
      setError(msg);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const logoutPolice = useCallback(() => {
    policeApi.logout();
    setOfficer(null);
    setToken(null);
    setDutyStatus(null);
    setError(null);
  }, []);

  const toggleDuty = async (
    isOnDuty: boolean, 
    patrolZone?: string, 
    vehicleNumber?: string
  ): Promise<boolean> => {
    if (!token) return false;
    setError(null);
    try {
      const updatedStatus = await policeApi.toggleDuty(isOnDuty, patrolZone, vehicleNumber);
      setDutyStatus(updatedStatus);
      if (officer) {
        const updatedOfficer = { 
          ...officer, 
          is_on_duty: updatedStatus.is_on_duty,
          current_patrol_zone: updatedStatus.current_patrol_zone || officer.assigned_zone,
          vehicle_number: updatedStatus.vehicle_number || officer.vehicle_number
        };
        setOfficer(updatedOfficer);
        localStorage.setItem('safeher_police_officer', JSON.stringify(updatedOfficer));
      }
      return true;
    } catch (err: any) {
      setError(err.message || 'Failed to update duty status');
      return false;
    }
  };

  const refreshDutyStatus = async () => {
    if (!token) return;
    try {
      const st = await policeApi.getDutyStatus();
      setDutyStatus(st);
      if (officer) {
        setOfficer(prev => prev ? { ...prev, is_on_duty: st.is_on_duty } : null);
      }
    } catch (e) {
      console.warn('[PoliceAuth] Refresh duty status error:', e);
    }
  };

  const refreshOfficer = async () => {
    if (!token) return;
    try {
      const off = await policeApi.getMe();
      setOfficer(off);
    } catch (e) {
      console.warn('[PoliceAuth] Refresh officer error:', e);
    }
  };

  const updateLocation = async (coords: { latitude: number; longitude: number; accuracy?: number }) => {
    if (!token || !dutyStatus?.is_on_duty) return;
    try {
      await policeApi.updatePatrolLocation(coords);
    } catch (e) {
      console.warn('[PoliceAuth] GPS update warning:', e);
    }
  };

  return (
    <PoliceAuthContext.Provider
      value={{
        officer,
        token,
        dutyStatus,
        isLoading,
        error,
        loginPolice,
        logoutPolice,
        toggleDuty,
        refreshDutyStatus,
        refreshOfficer,
        updateLocation,
        clearError,
      }}
    >
      {children}
    </PoliceAuthContext.Provider>
  );
};

export const usePoliceAuth = () => useContext(PoliceAuthContext);

