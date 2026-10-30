import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, useWindowDimensions, Platform, Image } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { ScreenWrapper } from '../components/ui/ScreenWrapper';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { ShieldCheck, AlertTriangle, Mail, Lock, Shield, BadgeCheck, Radio } from 'lucide-react-native';
import { useAppTheme, spacing, typography, borderRadius } from '../utils/theme';

export function LoginScreen({ navigation }) {
  const [loginMode, setLoginMode] = useState('user'); // 'user' | 'police'
  
  // User login states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Police login states
  const [badgeNumber, setBadgeNumber] = useState('');
  const [policePassword, setPolicePassword] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const { login, loginWithGoogle, policeLogin, configMissing } = useAuth();
  
  const { colors, shadows, isDark } = useAppTheme();
  const styles = useMemo(() => getStyles(colors, shadows, isDark, loginMode), [colors, shadows, isDark, loginMode]);

  const handleUserLogin = async () => {
    if (!email || !password) {
      setErrorMsg("Please enter email and password");
      return;
    }
    
    setErrorMsg('');
    setIsSubmitting(true);
    try {
      await login(email, password);
    } catch (err) {
      setErrorMsg(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePoliceLogin = async () => {
    if (!badgeNumber || !policePassword) {
      setErrorMsg("Please enter Officer Badge ID and Password");
      return;
    }

    setErrorMsg('');
    setIsSubmitting(true);
    try {
      await policeLogin(badgeNumber.trim(), policePassword);
    } catch (err) {
      setErrorMsg(err.message || 'Police login failed. Verify officer credentials and authorization.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleLogin = async () => {
    setErrorMsg('');
    setIsSubmitting(true);
    try {
      await loginWithGoogle();
    } catch (err) {
      if (err.message !== 'auth/popup-closed-by-user' && err.message !== 'auth/cancelled-popup-request') {
        setErrorMsg(err.message || 'Google Login failed.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ScreenWrapper scrollable edges={['top', 'bottom']} withGlow>
      <View style={styles.content}>
        
        <View style={styles.header}>
          <View style={styles.brandContainer}>
            <View style={[styles.iconContainer, loginMode === 'police' && styles.iconContainerPolice]}>
              {loginMode === 'police' ? (
                <Shield size={24} color="#60A5FA" />
              ) : (
                <Image source={require('../../assets/icon.png')} style={styles.logoImage} />
              )}
            </View>
            <Text style={styles.brandTitle}>SafeHer</Text>
          </View>
          <Text style={styles.subtitle}>
            {loginMode === 'police' 
              ? 'Law Enforcement & Emergency Patrol Portal'
              : 'Your safety, always within reach.'}
          </Text>
        </View>

        {/* ROLE SELECTION TABS */}
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tabButton, loginMode === 'user' && styles.tabButtonActive]}
            onPress={() => { setLoginMode('user'); setErrorMsg(''); }}
            activeOpacity={0.8}
          >
            <ShieldCheck size={16} color={loginMode === 'user' ? '#fff' : colors.textSecondary} />
            <Text style={[styles.tabButtonText, loginMode === 'user' && styles.tabButtonTextActive]}>
              User Login
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabButton, loginMode === 'police' && styles.tabButtonPoliceActive]}
            onPress={() => { setLoginMode('police'); setErrorMsg(''); }}
            activeOpacity={0.8}
          >
            <Shield size={16} color={loginMode === 'police' ? '#fff' : colors.textSecondary} />
            <Text style={[styles.tabButtonText, loginMode === 'police' && styles.tabButtonTextActive]}>
              Police Officer Login
            </Text>
          </TouchableOpacity>
        </View>

        {configMissing && loginMode === 'user' && (
          <View style={styles.configWarning}>
            <AlertTriangle size={20} color={colors.accentWarning} />
            <View style={styles.configWarningTextContainer}>
              <Text style={styles.configWarningTitle}>Missing Configuration</Text>
              <Text style={styles.configWarningText}>
                Firebase Auth is not configured. Add credentials to enable user authentication.
              </Text>
            </View>
          </View>
        )}

        <View style={[styles.formCard, loginMode === 'police' && styles.formCardPolice]}>
          {errorMsg ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{errorMsg}</Text>
            </View>
          ) : null}

          {loginMode === 'user' ? (
            /* ================= USER LOGIN FORM ================= */
            <View style={styles.form}>
              <Input 
                label="Email"
                placeholder="name@example.com"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                editable={!configMissing}
                leadingIcon={<Mail size={18} color={colors.textSecondary} />}
              />
              
              <Input 
                label="Password"
                placeholder="Enter your password"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                editable={!configMissing}
                leadingIcon={<Lock size={18} color={colors.textSecondary} />}
              />

              <TouchableOpacity 
                style={styles.forgotPassword} 
                onPress={() => navigation.navigate('ForgotPassword')}
                disabled={configMissing}
              >
                <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
              </TouchableOpacity>

              <Button 
                title="Sign In" 
                onPress={handleUserLogin} 
                loading={isSubmitting}
                disabled={configMissing || isSubmitting}
                style={styles.loginButton}
                size="large"
              />

              <View style={styles.dividerContainer}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>or continue with</Text>
                <View style={styles.dividerLine} />
              </View>

              <Button 
                title="Sign In with Google" 
                variant="secondary"
                onPress={handleGoogleLogin} 
                disabled={configMissing || isSubmitting}
                style={styles.googleButton}
                size="large"
                leadingIcon={<Image source={{ uri: 'https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg' }} style={{ width: 18, height: 18 }} />}
              />

              <View style={styles.createAccountSection}>
                <Button 
                  title="Don't have an account? Sign Up" 
                  variant="ghost" 
                  onPress={() => navigation.navigate('Register')}
                  disabled={configMissing}
                />
              </View>
            </View>
          ) : (
            /* ================= POLICE OFFICER LOGIN FORM ================= */
            <View style={styles.form}>
              <View style={styles.policeNoticeBanner}>
                <Shield size={18} color="#3B82F6" style={{ marginTop: 2 }} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.policeNoticeTitle}>Authorized Police Personnel Only</Text>
                  <Text style={styles.policeNoticeText}>
                    Accounts are strictly provisioned by department administration. Self-registration is disabled.
                  </Text>
                </View>
              </View>

              <Input 
                label="Badge / Officer ID"
                placeholder="e.g. POL-101 or POL-102"
                value={badgeNumber}
                onChangeText={setBadgeNumber}
                autoCapitalize="characters"
                leadingIcon={<BadgeCheck size={18} color="#3B82F6" />}
              />
              
              <Input 
                label="Password"
                placeholder="Enter police account password"
                value={policePassword}
                onChangeText={setPolicePassword}
                secureTextEntry
                leadingIcon={<Lock size={18} color="#3B82F6" />}
              />

              <View style={styles.officerHelpBox}>
                <Text style={styles.officerHelpText}>
                  Authorized test credentials:{'\n'}
                  • Supervisor: POL-101 / PoliceSecure@2026{'\n'}
                  • Patrol Officer: POL-102 / PoliceSecure@2026
                </Text>
              </View>

              <Button 
                title="Sign In as Police Officer" 
                onPress={handlePoliceLogin} 
                loading={isSubmitting}
                disabled={isSubmitting}
                style={styles.policeLoginButton}
                size="large"
              />
            </View>
          )}

        </View>

      </View>
    </ScreenWrapper>
  );
}

const getStyles = (colors, shadows, isDark, loginMode) => StyleSheet.create({
  content: {
    flexGrow: 1,
    padding: spacing.lg,
    justifyContent: 'center',
    paddingBottom: spacing.xl,
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  brandContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: colors.accentBrandMuted,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.accentBrand,
    ...shadows.glowBrand,
    overflow: 'hidden',
  },
  iconContainerPolice: {
    backgroundColor: '#0F1E36',
    borderColor: '#3B82F6',
  },
  logoImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'contain',
  },
  brandTitle: {
    ...typography.h1,
    fontSize: 32,
    letterSpacing: -0.5,
    color: colors.textPrimary,
  },
  subtitle: {
    ...typography.subhead,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: isDark ? '#161E2E' : '#E2E8F0',
    borderRadius: borderRadius.lg,
    padding: 4,
    marginBottom: spacing.lg,
    gap: 4,
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: borderRadius.md,
    gap: 6,
  },
  tabButtonActive: {
    backgroundColor: colors.accentBrand,
    ...shadows.subtle,
  },
  tabButtonPoliceActive: {
    backgroundColor: '#1E3A8A',
    ...shadows.subtle,
  },
  tabButtonText: {
    ...typography.footnote,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  tabButtonTextActive: {
    color: '#FFFFFF',
  },
  configWarning: {
    flexDirection: 'row',
    backgroundColor: colors.accentWarningMuted,
    borderColor: isDark ? 'rgba(245, 158, 11, 0.2)' : 'rgba(217, 119, 6, 0.2)',
    borderWidth: 1,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.md,
    gap: 12,
    alignItems: 'center',
  },
  configWarningTextContainer: {
    flex: 1,
  },
  configWarningTitle: {
    ...typography.subhead,
    color: colors.accentWarning,
    fontWeight: '600',
    marginBottom: 2,
  },
  configWarningText: {
    ...typography.footnote,
    color: colors.accentWarning,
    opacity: 0.9,
  },
  formCard: {
    backgroundColor: colors.bgSecondary,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.subtle,
  },
  formCardPolice: {
    borderColor: 'rgba(59, 130, 246, 0.3)',
    backgroundColor: isDark ? '#0D1525' : '#F8FAFC',
  },
  errorBox: {
    backgroundColor: colors.accentEmergencyMuted,
    padding: spacing.md,
    borderRadius: borderRadius.sm,
    marginBottom: spacing.md,
    borderLeftWidth: 3,
    borderLeftColor: colors.accentEmergency,
  },
  errorText: {
    ...typography.footnote,
    color: colors.accentEmergency,
    fontWeight: '500',
  },
  form: {
    width: '100%',
  },
  forgotPassword: {
    alignSelf: 'flex-end',
    marginBottom: spacing.md,
    marginTop: -spacing.xs,
  },
  forgotPasswordText: {
    ...typography.footnote,
    color: colors.accentBrand,
    fontWeight: '500',
  },
  loginButton: {
    marginBottom: spacing.md,
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: spacing.md,
    gap: spacing.md,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border,
  },
  dividerText: {
    ...typography.caption,
    color: colors.textMuted,
  },
  googleButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.border,
  },
  createAccountSection: {
    marginTop: spacing.md,
  },
  policeNoticeBanner: {
    flexDirection: 'row',
    backgroundColor: isDark ? 'rgba(30, 58, 138, 0.25)' : 'rgba(219, 234, 254, 0.6)',
    borderWidth: 1,
    borderColor: isDark ? 'rgba(59, 130, 246, 0.3)' : 'rgba(147, 197, 253, 0.6)',
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  policeNoticeTitle: {
    ...typography.footnote,
    fontWeight: '700',
    color: '#3B82F6',
    marginBottom: 2,
  },
  policeNoticeText: {
    ...typography.caption,
    color: colors.textSecondary,
    lineHeight: 16,
  },
  officerHelpBox: {
    backgroundColor: isDark ? '#111A2E' : '#EFF6FF',
    padding: spacing.sm,
    borderRadius: borderRadius.sm,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: isDark ? '#1E293B' : '#DBEAFE',
  },
  officerHelpText: {
    fontSize: 11,
    color: isDark ? '#94A3B8' : '#475569',
    lineHeight: 16,
  },
  policeLoginButton: {
    backgroundColor: '#1E3A8A',
    borderColor: '#3B82F6',
    borderWidth: 1,
    marginBottom: spacing.sm,
  },
});
