import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithCredential,
  updateProfile
} from 'firebase/auth';
import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { auth, isFirebaseConfigured } from '../config/firebase';
import { api } from '../services/api';

if (Platform.OS !== 'web') {
  GoogleSignin.configure({
    webClientId: '592378767800-va77s2e1manmlqu1sfk64cga7br8cvii.apps.googleusercontent.com',
  });
}

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [officer, setOfficer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [configMissing, setConfigMissing] = useState(!isFirebaseConfigured);

  useEffect(() => {
    let unsubscribe = () => {};

    const initAuth = async () => {
      // 1. Check if Police session is active
      try {
        const activeRole = await AsyncStorage.getItem('@safeher_active_role');
        const token = await AsyncStorage.getItem('@safeher_police_token');
        if (activeRole === 'police' && token) {
          try {
            const officerProfile = await api.getPoliceProfile();
            setOfficer(officerProfile);
            setUser(null);
            setLoading(false);
            return;
          } catch (e) {
            console.log("Police token verification failed:", e);
            await AsyncStorage.removeItem('@safeher_police_token');
            await AsyncStorage.removeItem('@safeher_police_officer');
            await AsyncStorage.removeItem('@safeher_active_role');
            setOfficer(null);
          }
        }
      } catch (e) {
        console.log("Error checking police session:", e);
      }

      if (!isFirebaseConfigured) {
        // Mock login for UI testing when Firebase is not configured
        setUser({
          uid: 'test-user-123',
          email: 'test@example.com',
          name: 'Test User',
          phone: 'Not provided',
          bloodGroup: 'O+',
        });
        setLoading(false);
        return;
      }

      // 2. Firebase Auth State Listener for regular user
      console.log("AuthContext: setting up onAuthStateChanged listener, isFirebaseConfigured =", isFirebaseConfigured);
      unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
        console.log("AuthContext: onAuthStateChanged fired, firebaseUser:", firebaseUser ? firebaseUser.uid : null);
        // If an officer is logged in, ignore Firebase user
        const activeRole = await AsyncStorage.getItem('@safeher_active_role');
        if (activeRole === 'police') {
          return;
        }

        if (firebaseUser) {
          let extraProfile = {};
          try {
            const profileStr = await AsyncStorage.getItem(`@profile_${firebaseUser.uid}`);
            if (profileStr) {
              extraProfile = JSON.parse(profileStr);
            }
          } catch (e) {
            console.log("Failed to load extra profile data:", e);
          }

          const userData = {
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            name: firebaseUser.displayName || extraProfile.name || 'User',
            phone: extraProfile.phone || firebaseUser.phoneNumber || 'Not provided',
            bloodGroup: extraProfile.bloodGroup || 'O+',
            medicalNotes: extraProfile.medicalNotes || '',
            allergies: extraProfile.allergies || '',
          };
          setUser(userData);
          setLoading(false);

          try {
            await api.syncUser({
              email: userData.email,
              name: userData.name !== 'User' ? userData.name : undefined,
              phone: userData.phone !== 'Not provided' ? userData.phone : undefined,
              blood_group: userData.bloodGroup,
            });
          } catch (e) {
            console.log("Backend sync failed, but user is logged in locally:", e);
          }
        } else {
          setUser(null);
          setLoading(false);
        }
      });
    };

    initAuth();

    return () => unsubscribe();
  }, []);

  const login = async (email, password) => {
    if (!isFirebaseConfigured) throw new Error("Firebase Auth is not configured. Missing API keys.");
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (error) {
      throw error;
    }
  };

  const register = async (email, password, name, phone) => {
    if (!isFirebaseConfigured) throw new Error("Firebase Auth is not configured. Missing API keys.");
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      // Update Firebase profile name
      await updateProfile(user, {
        displayName: name
      });

      // Save additional profile data using existing persistence architecture
      const extraProfile = { name, phone, bloodGroup: 'O+', medicalNotes: '', allergies: '' };
      try {
        await AsyncStorage.setItem(`@profile_${user.uid}`, JSON.stringify(extraProfile));
      } catch (e) {
        console.error("Failed to save profile to storage", e);
      }

      const userData = {
        uid: user.uid,
        email: user.email,
        name: name,
        phone: phone,
        bloodGroup: 'O+',
        medicalNotes: '',
        allergies: '',
      };
      setUser(userData);
      
      // Sync with backend (non-blocking)
      try {
        await api.syncUser({
          email: userData.email,
          name: userData.name,
          phone: userData.phone,
          blood_group: userData.bloodGroup,
        });
      } catch (e) {
        console.log("Backend sync failed on registration:", e);
      }

      return userCredential;
    } catch (error) {
      if (error.code === 'auth/email-already-in-use') {
        throw new Error('This email is already registered.');
      } else if (error.code === 'auth/invalid-email') {
        throw new Error('Invalid email address format.');
      } else if (error.code === 'auth/weak-password') {
        throw new Error('Password should be at least 6 characters.');
      } else if (error.code === 'auth/network-request-failed') {
        throw new Error('Network error. Please check your connection.');
      }
      throw error;
    }
  };

  const loginWithGoogle = async () => {
    if (!isFirebaseConfigured) throw new Error("Firebase Auth is not configured. Missing API keys.");
    
    if (Platform.OS === 'web') {
      try {
        const provider = new GoogleAuthProvider();
        const result = await signInWithPopup(auth, provider);
        return result.user;
      } catch (error) {
        throw error;
      }
    } else {
      try {
        await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
        
        // Handles v16+ response shape ({ data: { idToken, ... } } or { type: 'cancelled' })
        const response = await GoogleSignin.signIn();
        if (response?.type === 'cancelled') {
          console.log('[Google Sign-In] Cancelled by user');
          return null;
        }

        const idToken = response?.data ? response.data.idToken : response?.idToken;
        if (!idToken) {
           throw new Error("Google Sign-In failed: No ID token returned");
        }
        
        const credential = GoogleAuthProvider.credential(idToken);
        const result = await signInWithCredential(auth, credential);
        return result.user;
      } catch (error) {
        console.error("[Google Sign-In Error]:", {
          code: error.code,
          message: error.message,
          error
        });

        if (error.code === statusCodes.SIGN_IN_CANCELLED || error.message?.includes('cancelled')) {
          return null;
        } else if (error.code === statusCodes.IN_PROGRESS) {
          throw new Error('Sign in is already in progress');
        } else if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
          throw new Error('Google Play Services not available or outdated');
        } else if (
          error.code === statusCodes.DEVELOPER_ERROR ||
          error.code === '10' ||
          error.code === 10 ||
          error.code === '12500' ||
          (error.message && (error.message.includes('DEVELOPER_ERROR') || error.message.includes('10') || error.message.includes('12500')))
        ) {
          throw new Error(
            'Google Sign-In Error (12500 / DEVELOPER_ERROR): Google Play Services was unable to verify the OAuth client. Verify that the app certificate fingerprint and package "com.anonymous.mobile" match Google Cloud Console and that the OAuth consent screen has a Support Email.'
          );
        } else {
          throw new Error(error.message || 'An unexpected error occurred during Google Sign-In');
        }
      }
    }
  };

  const updateUserProfile = async (updates) => {
    if (!user) return;
    try {
      // 1. Fetch current extra profile
      let currentExtra = {};
      try {
        const str = await AsyncStorage.getItem(`@profile_${user.uid}`);
        if (str) currentExtra = JSON.parse(str);
      } catch (e) {
        console.warn("Could not read profile from storage:", e);
      }

      // 2. Merge non-blank values to avoid overwriting existing fields with blank
      const mergedExtra = {
        name: updates.name?.trim() ? updates.name.trim() : (currentExtra.name || user.name),
        phone: updates.phone?.trim() ? updates.phone.trim() : (currentExtra.phone || user.phone),
        bloodGroup: updates.bloodGroup?.trim() ? updates.bloodGroup.trim() : (currentExtra.bloodGroup || user.bloodGroup || 'O+'),
        medicalNotes: updates.medicalNotes !== undefined ? updates.medicalNotes : (currentExtra.medicalNotes || user.medicalNotes || ''),
        allergies: updates.allergies !== undefined ? updates.allergies : (currentExtra.allergies || user.allergies || ''),
      };

      await AsyncStorage.setItem(`@profile_${user.uid}`, JSON.stringify(mergedExtra));

      // 3. Update Firebase display name if name changed
      if (auth.currentUser && mergedExtra.name && mergedExtra.name !== auth.currentUser.displayName) {
        try {
          await updateProfile(auth.currentUser, { displayName: mergedExtra.name });
        } catch (e) {
          console.warn("Firebase displayName update failed:", e);
        }
      }

      // 4. Update local user state
      const updatedUser = {
        ...user,
        name: mergedExtra.name,
        phone: mergedExtra.phone,
        bloodGroup: mergedExtra.bloodGroup,
        medicalNotes: mergedExtra.medicalNotes,
        allergies: mergedExtra.allergies,
      };
      setUser(updatedUser);

      // 5. Sync to backend API
      try {
        await api.syncUser({
          email: user.email,
          name: mergedExtra.name !== 'User' ? mergedExtra.name : undefined,
          phone: mergedExtra.phone !== 'Not provided' ? mergedExtra.phone : undefined,
          blood_group: mergedExtra.bloodGroup,
        });
      } catch (e) {
        console.log("Backend profile sync failed:", e.message);
      }

      return updatedUser;
    } catch (err) {
      console.error("Failed to update user profile:", err);
      throw err;
    }
  };

  const logout = async () => {
    if (!isFirebaseConfigured) {
      setUser(null);
      return;
    }
    // Allow user to choose a different Google account next time without revoking access
    if (Platform.OS !== 'web') {
      try {
        await GoogleSignin.signOut();
      } catch (e) {
        console.log("Google Sign-In signOut error:", e);
      }
    }
    await signOut(auth);
  };

  const policeLogin = async (badgeNumber, password) => {
    try {
      const res = await api.policeLogin(badgeNumber, password);
      if (res && res.access_token) {
        await AsyncStorage.setItem('@safeher_police_token', res.access_token);
        await AsyncStorage.setItem('@safeher_police_officer', JSON.stringify(res.officer));
        await AsyncStorage.setItem('@safeher_active_role', 'police');
        setOfficer(res.officer);
        // Cleanly isolate roles
        if (auth.currentUser) {
          try { await signOut(auth); } catch (e) {}
        }
        setUser(null);
        return res.officer;
      }
      throw new Error("Invalid response from police service");
    } catch (err) {
      console.error("Police login error:", err);
      throw err;
    }
  };

  const policeLogout = async () => {
    try {
      if (officer?.is_on_duty) {
        try {
          await api.toggleDutyStatus(false);
        } catch (e) {
          console.warn("Could not toggle off-duty before logout:", e);
        }
      }
      await AsyncStorage.removeItem('@safeher_police_token');
      await AsyncStorage.removeItem('@safeher_police_officer');
      await AsyncStorage.removeItem('@safeher_active_role');
      setOfficer(null);
    } catch (e) {
      console.error("Police logout error:", e);
      setOfficer(null);
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      officer,
      isPolice: Boolean(officer),
      login,
      register,
      loginWithGoogle,
      updateUserProfile,
      logout,
      policeLogin,
      policeLogout,
      setOfficer,
      loading,
      configMissing
    }}>
      {children}
    </AuthContext.Provider>
  );
};


export const useAuth = () => useContext(AuthContext);
