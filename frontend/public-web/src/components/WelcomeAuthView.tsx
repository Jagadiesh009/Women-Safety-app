import React, { useState } from 'react';
import { 
  ShieldCheck, 
  ShieldAlert,
  Eye, 
  EyeOff, 
  AlertCircle, 
  CheckCircle2, 
  Sun, 
  Moon, 
  Smartphone,
  BadgeAlert,
  Radio,
  ExternalLink,
  Lock,
  FileKey
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { usePoliceAuth } from '../context/PoliceAuthContext';
import { useTheme } from '../context/ThemeContext';
import { APP_CONFIG } from '../config/appConfig';

interface WelcomeAuthViewProps {
  onEnterDashboard: () => void;
  onEnterPoliceDashboard?: () => void;
  initialPortal?: 'user' | 'police';
}

export const WelcomeAuthView: React.FC<WelcomeAuthViewProps> = ({ 
  onEnterDashboard,
  onEnterPoliceDashboard,
  initialPortal = 'user'
}) => {
  const { 
    signInWithGoogle, 
    signInWithEmail, 
    registerWithEmail, 
    sendPasswordReset, 
    continueAsGuest,
    loading: userLoading, 
    authError, 
    authSuccess, 
    clearAuthMessages 
  } = useAuth();

  const {
    loginPolice,
    isLoading: policeLoading,
    error: policeError,
    clearError: clearPoliceError
  } = usePoliceAuth();



  const { toggleTheme, isDark } = useTheme();

  // Tri-Portal Mode: 'user' | 'police' | 'admin'
  const [portalMode, setPortalMode] = useState<'user' | 'police'>(initialPortal);

  // User auth state
  const [activeTab, setActiveTab] = useState<'signin' | 'register' | 'forgot'>('signin');
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);

  // Police auth state
  const [badgeNumber, setBadgeNumber] = useState('');
  const [policePassword, setPolicePassword] = useState('');
  const [showPolicePassword, setShowPolicePassword] = useState(false);



  const handlePortalSwitch = (mode: 'user' | 'police') => {
    setPortalMode(mode);
    setValidationError(null);
    clearAuthMessages();
    clearPoliceError();
  };

  const handleTabChange = (tab: 'signin' | 'register' | 'forgot') => {
    setActiveTab(tab);
    setValidationError(null);
    clearAuthMessages();
  };

  const handleGoogleSignIn = async () => {
    setValidationError(null);
    const success = await signInWithGoogle();
    if (success) {
      onEnterDashboard();
    }
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);
    clearAuthMessages();

    if (!email.trim() || !email.includes('@')) {
      setValidationError('Please enter a valid email address.');
      return;
    }

    if (activeTab === 'forgot') {
      await sendPasswordReset(email.trim());
      return;
    }

    if (!password || password.length < 6) {
      setValidationError('Password must be at least 6 characters.');
      return;
    }

    if (activeTab === 'register') {
      if (password !== confirmPassword) {
        setValidationError('Passwords do not match.');
        return;
      }
      if (!name.trim()) {
        setValidationError('Please enter your name.');
        return;
      }
      const success = await registerWithEmail(email.trim(), password, name.trim(), phone.trim());
      if (success) {
        onEnterDashboard();
      }
    } else {
      const success = await signInWithEmail(email.trim(), password);
      if (success) {
        onEnterDashboard();
      }
    }
  };

  const handlePoliceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);
    clearPoliceError();

    if (!badgeNumber.trim()) {
      setValidationError('Please enter your Officer Badge Number or Official Police Email.');
      return;
    }

    if (!policePassword) {
      setValidationError('Please enter your officer account password.');
      return;
    }

    const success = await loginPolice(badgeNumber.trim(), policePassword);
    if (success) {
      if (onEnterPoliceDashboard) {
        onEnterPoliceDashboard();
      } else {
        window.location.hash = 'police-dashboard';
      }
    }
  };

  const handleGuestEntry = () => {
    continueAsGuest();
    onEnterDashboard();
  };

  return (
    <div className="min-h-screen bg-[var(--bg-base)] text-[var(--text-primary)] flex flex-col justify-between selection:bg-[var(--brand-primary)] selection:text-white">
      
      {/* Top Header */}
      <header className="w-full border-b border-[var(--border-subtle)] bg-[var(--bg-base)]/80 backdrop-blur-md sticky top-0 z-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-medium)] p-1 flex items-center justify-center shrink-0">
              <img 
                src="/logo.png" 
                alt="SafeHer" 
                className="w-full h-full object-cover rounded"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
              <ShieldCheck className="w-4 h-4 text-[var(--brand-primary)]" style={{ display: 'none' }} />
            </div>
            <span className="font-semibold text-sm tracking-tight text-[var(--text-primary)]">SafeHer</span>
            <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-[var(--bg-elevated)] text-[var(--text-muted)] border border-[var(--border-subtle)] hidden sm:inline">
              Emergency Response Network
            </span>
          </div>

          <div className="flex items-center gap-2">
            <a
              href="#crime-map"
              onClick={(e) => {
                e.preventDefault();
                window.location.hash = 'crime-map';
              }}
              className="hidden md:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border-subtle)] transition-colors cursor-pointer"
            >
              <Radio size={12} className="text-amber-500" />
              <span>Crime Map</span>
            </a>

            <a
              href={APP_CONFIG.apkDownloadUrl}
              download={APP_CONFIG.apkFilename}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border-subtle)] transition-colors cursor-pointer"
              title="Download Android APK"
            >
              <Smartphone size={12} className="text-[var(--brand-primary)]" />
              <span>Android APK</span>
            </a>

            <button
              onClick={toggleTheme}
              className="p-1.5 rounded-md border border-[var(--border-subtle)] text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] transition-colors cursor-pointer"
              aria-label="Toggle theme"
            >
              {isDark ? <Sun size={13} /> : <Moon size={13} />}
            </button>
          </div>
        </div>
      </header>

      {/* Main Authentication Container */}
      <main className="flex-1 flex items-center justify-center px-4 py-8 sm:py-12">
        <div className="w-full max-w-md mx-auto space-y-4">

          {/* ROLE SELECTOR: Civilian User vs Police Officer */}
          <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-xl p-1.5 shadow-xs flex items-center gap-1">
            <button
              type="button"
              onClick={() => handlePortalSwitch('user')}
              className={`flex-1 py-2 px-2 sm:px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                portalMode === 'user'
                  ? 'bg-[var(--brand-primary)] text-white shadow-xs'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)]'
              }`}
            >
              <ShieldCheck size={13} />
              <span>Civilian User</span>
            </button>

            <button
              type="button"
              onClick={() => handlePortalSwitch('police')}
              className={`flex-1 py-2 px-2 sm:px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                portalMode === 'police'
                  ? 'bg-slate-900 text-amber-400 border border-amber-500/30 shadow-xs'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)]'
              }`}
            >
              <ShieldAlert size={13} className={portalMode === 'police' ? 'text-amber-400' : 'text-slate-400'} />
              <span>Police Officer</span>
            </button>
          </div>

          {/* POLICE OFFICER PORTAL INTERFACE */}
          {portalMode === 'police' && (
            <div className="space-y-4 animate-fade-in">
              <div className="text-center space-y-1">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 text-[10px] font-bold uppercase tracking-wider">
                  <BadgeAlert size={12} />
                  <span>Law Enforcement Response Network</span>
                </div>
                <h2 className="text-xl font-bold tracking-tight text-[var(--text-primary)]">
                  Police Officer Portal
                </h2>
                <p className="text-xs text-[var(--text-secondary)]">
                  Sign in with your department credentials for live emergency SOS dispatch.
                </p>
              </div>

              {/* Police Card */}
              <div className="bg-[var(--bg-surface)] border border-slate-700/40 rounded-xl p-5 space-y-3.5 shadow-lg relative overflow-hidden">
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-600 via-amber-500 to-red-600"></div>

                {/* Error Banner */}
                {(validationError || policeError) && (
                  <div className="p-2.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs flex items-start gap-2">
                    <AlertCircle size={14} className="shrink-0 mt-0.5" />
                    <span>{validationError || policeError}</span>
                  </div>
                )}

                {/* Police Sign-in Form */}
                <form onSubmit={handlePoliceSubmit} className="space-y-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-1">
                      Officer Identification / Badge Number
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={badgeNumber}
                        onChange={(e) => setBadgeNumber(e.target.value)}
                        placeholder="e.g. POL-101 or officer@police.gov.in"
                        className="w-full px-3 py-2.5 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-subtle)] text-xs text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-amber-500 font-mono"
                        required
                        autoFocus
                      />
                      <FileKey size={14} className="absolute right-3 top-3 text-[var(--text-muted)]" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-1">
                      Department Secure Password
                    </label>
                    <div className="relative">
                      <input
                        type={showPolicePassword ? 'text' : 'password'}
                        value={policePassword}
                        onChange={(e) => setPolicePassword(e.target.value)}
                        placeholder="••••••••••••"
                        className="w-full pl-3 pr-8 py-2.5 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-subtle)] text-xs text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-amber-500 font-mono"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPolicePassword(!showPolicePassword)}
                        className="absolute right-2.5 top-3 text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer"
                        aria-label="Toggle password visibility"
                      >
                        {showPolicePassword ? <EyeOff size={13} /> : <Eye size={13} />}
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={policeLoading}
                    className="w-full py-2.5 px-3 rounded-lg bg-slate-900 hover:bg-slate-800 text-amber-400 font-bold text-xs border border-amber-500/40 shadow-sm transition-all flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer"
                  >
                    {policeLoading ? (
                      <span className="w-4 h-4 border-2 border-amber-400/30 border-t-amber-400 rounded-full animate-spin"></span>
                    ) : (
                      <>
                        <Lock size={13} />
                        <span>Verify Credentials &amp; Enter Console</span>
                      </>
                    )}
                  </button>
                </form>

                {/* Provisioning Notice & Testing Aid */}
                <div className="pt-3 border-t border-[var(--border-subtle)] space-y-2 text-[11px] text-[var(--text-secondary)]">
                  <div className="flex items-start gap-1.5 text-[10px] text-[var(--text-muted)] leading-tight">
                    <ShieldAlert size={12} className="shrink-0 mt-0.5 text-amber-500" />
                    <span>
                      <strong>Authorized Personnel Only:</strong> Police accounts cannot be self-registered. Credentials are provisioned through official departmental procedures.
                    </span>
                  </div>

                  {/* Seeded Testing Accounts Helper */}
                  <div className="p-2 rounded-lg bg-amber-500/5 border border-amber-500/15 text-[10px] text-amber-700 dark:text-amber-300 font-mono">
                    <div className="font-sans font-semibold mb-0.5 text-amber-800 dark:text-amber-200">
                      Authorized Test Credentials:
                    </div>
                    <div>Supervisor: <strong>POL-101</strong> (Inspector Priya Sharma)</div>
                    <div>Patrol Officer: <strong>POL-102</strong> (Officer Ramesh Kumar)</div>
                    <div>Password: <strong>PoliceSecure@2026</strong></div>
                  </div>
                </div>

              </div>
            </div>
          )}

          {/* CIVILIAN USER PORTAL INTERFACE */}
          {portalMode === 'user' && (
            <div className="space-y-4 animate-fade-in">
              <div className="text-center space-y-1">
                <span className="text-[10px] font-bold tracking-wider uppercase text-[var(--text-muted)]">
                  Civilian Safety Portal
                </span>
                <h2 className="text-xl font-semibold tracking-tight text-[var(--text-primary)]">
                  {activeTab === 'signin' && 'Sign in to SafeHer'}
                  {activeTab === 'register' && 'Create your account'}
                  {activeTab === 'forgot' && 'Reset password'}
                </h2>
                <p className="text-xs text-[var(--text-secondary)]">
                  Access your cloud telemetry &amp; personal contacts on desktop.
                </p>
              </div>

              {/* Card */}
              <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-xl p-5 space-y-3.5 shadow-[var(--shadow-card)]">
                
                {/* Feedback Notifications */}
                {(validationError || authError) && (
                  <div className="p-2 rounded-lg bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs flex items-start gap-1.5">
                    <AlertCircle size={13} className="shrink-0 mt-0.5" />
                    <span>{validationError || authError}</span>
                  </div>
                )}

                {authSuccess && (
                  <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs flex items-start gap-1.5">
                    <CheckCircle2 size={13} className="shrink-0 mt-0.5" />
                    <span>{authSuccess}</span>
                  </div>
                )}

                {/* Google Sign-in */}
                {activeTab !== 'forgot' && (
                  <>
                    <button
                      type="button"
                      onClick={handleGoogleSignIn}
                      disabled={userLoading}
                      className="w-full py-2 px-3 rounded-lg border border-[var(--border-medium)] bg-[var(--bg-elevated)] hover:bg-[var(--bg-surface)] text-xs font-medium text-[var(--text-primary)] transition-all flex items-center justify-center gap-2 shadow-xs cursor-pointer disabled:opacity-50"
                    >
                      <svg className="w-3.5 h-3.5" viewBox="0 0 24 24">
                        <path
                          fill="#4285F4"
                          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                        />
                        <path
                          fill="#34A853"
                          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                        />
                        <path
                          fill="#FBBC05"
                          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                        />
                        <path
                          fill="#EA4335"
                          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                        />
                      </svg>
                      <span>Continue with Google</span>
                    </button>

                    <div className="relative flex items-center justify-center my-1">
                      <div className="border-t border-[var(--border-subtle)] w-full"></div>
                      <span className="bg-[var(--bg-surface)] px-2 text-[10px] text-[var(--text-muted)] uppercase tracking-wider font-semibold">
                        or email
                      </span>
                    </div>
                  </>
                )}

                {/* Form */}
                <form onSubmit={handleEmailSubmit} className="space-y-2.5">
                  {activeTab === 'register' && (
                    <>
                      <div>
                        <label className="block text-[11px] font-medium text-[var(--text-secondary)] mb-1">Full Name</label>
                        <input
                          type="text"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          placeholder="Your legal name"
                          className="w-full px-3 py-1.5 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-subtle)] text-xs text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--brand-primary)]"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-medium text-[var(--text-secondary)] mb-1">Phone Number (Optional)</label>
                        <input
                          type="tel"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          placeholder="+91 98765 43210"
                          className="w-full px-3 py-1.5 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-subtle)] text-xs text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--brand-primary)]"
                        />
                      </div>
                    </>
                  )}

                  <div>
                    <label className="block text-[11px] font-medium text-[var(--text-secondary)] mb-1">Email Address</label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      className="w-full px-3 py-1.5 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-subtle)] text-xs text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--brand-primary)]"
                      required
                    />
                  </div>

                  {activeTab !== 'forgot' && (
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-[11px] font-medium text-[var(--text-secondary)]">Password</label>
                        {activeTab === 'signin' && (
                          <button
                            type="button"
                            onClick={() => handleTabChange('forgot')}
                            className="text-[10px] text-[var(--brand-primary)] hover:underline cursor-pointer"
                          >
                            Forgot?
                          </button>
                        )}
                      </div>
                      <div className="relative">
                        <input
                          type={showPassword ? 'text' : 'password'}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="••••••••"
                          className="w-full pl-3 pr-8 py-1.5 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-subtle)] text-xs text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--brand-primary)]"
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-2.5 top-2 text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer"
                          aria-label="Toggle password visibility"
                        >
                          {showPassword ? <EyeOff size={13} /> : <Eye size={13} />}
                        </button>
                      </div>
                    </div>
                  )}

                  {activeTab === 'register' && (
                    <div>
                      <label className="block text-[11px] font-medium text-[var(--text-secondary)] mb-1">Confirm Password</label>
                      <input
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full px-3 py-1.5 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-subtle)] text-xs text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--brand-primary)]"
                        required
                      />
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={userLoading}
                    className="w-full py-2 px-3 rounded-lg bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-hover)] text-white font-medium text-xs shadow-xs transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer mt-1"
                  >
                    {userLoading ? (
                      <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                    ) : (
                      <span>
                        {activeTab === 'signin' && 'Sign In'}
                        {activeTab === 'register' && 'Create Account'}
                        {activeTab === 'forgot' && 'Send Reset Link'}
                      </span>
                    )}
                  </button>
                </form>

                {/* Sub links */}
                <div className="pt-2 text-center text-xs text-[var(--text-secondary)]">
                  {activeTab === 'signin' && (
                    <p>
                      Don&apos;t have an account?{' '}
                      <button
                        type="button"
                        onClick={() => handleTabChange('register')}
                        className="text-[var(--brand-primary)] font-medium hover:underline cursor-pointer"
                      >
                        Register
                      </button>
                    </p>
                  )}
                  {activeTab === 'register' && (
                    <p>
                      Already have an account?{' '}
                      <button
                        type="button"
                        onClick={() => handleTabChange('signin')}
                        className="text-[var(--brand-primary)] font-medium hover:underline cursor-pointer"
                      >
                        Sign in
                      </button>
                    </p>
                  )}
                  {activeTab === 'forgot' && (
                    <p>
                      Remembered your password?{' '}
                      <button
                        type="button"
                        onClick={() => handleTabChange('signin')}
                        className="text-[var(--brand-primary)] font-medium hover:underline cursor-pointer"
                      >
                        Back to sign in
                      </button>
                    </p>
                  )}
                </div>

                {/* Guest access option */}
                <div className="pt-2 border-t border-[var(--border-subtle)] text-center">
                  <button
                    type="button"
                    onClick={handleGuestEntry}
                    className="text-[11px] text-[var(--text-muted)] hover:text-[var(--text-secondary)] underline cursor-pointer"
                  >
                    Explore Public Safety Portal as Guest
                  </button>
                </div>

              </div>
            </div>
          )}

          {/* Quick Nav Footer Links */}
          <div className="flex items-center justify-center gap-4 text-[11px] text-[var(--text-muted)]">
            <a 
              href="#crime-map" 
              onClick={(e) => {
                e.preventDefault();
                window.location.hash = 'crime-map';
              }}
              className="hover:text-[var(--text-primary)] transition-colors"
            >
              Crime Radar
            </a>
            <span>•</span>
            <a 
              href="#community-safety" 
              onClick={(e) => {
                e.preventDefault();
                window.location.hash = 'community-safety';
              }}
              className="hover:text-[var(--text-primary)] transition-colors"
            >
              Safety Map
            </a>
            <span>•</span>
            <a 
              href="#police-dashboard" 
              onClick={(e) => {
                e.preventDefault();
                handlePortalSwitch('police');
              }}
              className="hover:text-amber-500 transition-colors"
            >
              Police Portal
            </a>
            <span>•</span>
            <a 
              href="https://safeherwebadmin.vercel.app/" 
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-[var(--brand-primary)] transition-colors inline-flex items-center gap-1"
              title="Open SafeHer Safety Operations Center & Admin Portal"
            >
              <span>Admin Portal</span>
              <ExternalLink size={10} />
            </a>
          </div>

        </div>
      </main>

      {/* Footer */}
      <footer className="w-full border-t border-[var(--border-subtle)] py-4 text-center text-xs text-[var(--text-muted)]">
        <p>© 2026 SafeHer Emergency Response Network • Multi-Role Autonomous Coordination</p>
      </footer>
    </div>
  );
};
