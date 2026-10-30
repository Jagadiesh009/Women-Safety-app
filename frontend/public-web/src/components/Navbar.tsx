import React, { useState } from 'react';
import { 
  ShieldCheck, 
  Sun, 
  Moon, 
  Menu, 
  X, 
  User as UserIcon, 
  LogOut, 
  ChevronDown, 
  LayoutDashboard, 
  MapPin, 
  LogIn,
  Smartphone,
  Users,
  Radio
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { APP_CONFIG } from '../config/appConfig';
import type { PageView } from '../types';

interface NavbarProps {
  currentView: PageView;
  onNavigate: (view: PageView) => void;
  onOpenAccountModal: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ 
  currentView, 
  onNavigate, 
  onOpenAccountModal 
}) => {
  const { toggleTheme, isDark } = useTheme();
  const { user, isGuest, signOut } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);

  // Primary Destinations
  const primaryLinks: { label: string; view: PageView; icon: React.ReactNode }[] = [
    { label: 'Dashboard', view: 'dashboard', icon: <LayoutDashboard size={14} /> },
    { label: 'Map', view: 'map', icon: <MapPin size={14} /> },
    { label: 'Crime Radar', view: 'crime-map', icon: <Radio size={14} /> },
    { label: 'Safety Map', view: 'community-safety', icon: <ShieldCheck size={14} /> },
  ];

  const handleLinkClick = (view: PageView) => {
    onNavigate(view);
    setMobileMenuOpen(false);
    setUserDropdownOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSignOut = async () => {
    setUserDropdownOpen(false);
    setMobileMenuOpen(false);
    await signOut();
    onNavigate('welcome');
  };

  return (
    <header className="sticky top-0 z-30 bg-[var(--bg-base)]/85 backdrop-blur-md border-b border-[var(--border-subtle)] transition-colors">
      <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14 sm:h-16 gap-4">
          
          {/* Left: SafeHer Logo & Brand + Desktop Navigation */}
          <div className="flex items-center gap-6">
            <button 
              onClick={() => handleLinkClick('dashboard')}
              className="flex items-center gap-2.5 text-left focus:outline-none group cursor-pointer shrink-0" 
              aria-label="SafeHer Home"
            >
              <div className="w-8 h-8 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-medium)] p-1 flex items-center justify-center shadow-xs group-hover:border-[var(--brand-primary)] transition-colors shrink-0">
                <img 
                  src="/logo.png" 
                  alt="SafeHer Logo" 
                  className="w-full h-full rounded object-cover" 
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = 'none';
                  }} 
                />
                <ShieldCheck className="w-4 h-4 text-[var(--brand-primary)]" style={{ display: 'none' }} />
              </div>
              <span className="font-bold text-sm tracking-tight text-[var(--text-primary)]">SafeHer</span>
            </button>

            {/* Desktop Navigation Links */}
            <nav className="hidden md:flex items-center gap-1" aria-label="Main Navigation">
              {primaryLinks.map((link) => (
                <button 
                  key={link.view} 
                  onClick={() => handleLinkClick(link.view)} 
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs transition-colors cursor-pointer ${
                    currentView === link.view 
                      ? 'bg-[var(--bg-elevated)] text-[var(--text-primary)] font-semibold border border-[var(--border-subtle)]' 
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)]/60 font-medium'
                  }`}
                >
                  {link.icon}
                  <span>{link.label}</span>
                </button>
              ))}

              {user && (
                <button 
                  onClick={() => handleLinkClick('contacts')} 
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs transition-colors cursor-pointer ${
                    currentView === 'contacts' 
                      ? 'bg-[var(--bg-elevated)] text-[var(--text-primary)] font-semibold border border-[var(--border-subtle)]' 
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)]/60 font-medium'
                  }`}
                >
                  <Users size={14} />
                  <span>Contacts</span>
                </button>
              )}
            </nav>
          </div>

          {/* Right Action Bar: Theme, APK Download, Auth */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Android APK Download Action */}
            <a
              href={APP_CONFIG.apkDownloadUrl}
              download={APP_CONFIG.apkFilename}
              className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-[var(--bg-elevated)] hover:bg-[var(--bg-hover)] border border-[var(--border-subtle)] hover:border-[var(--brand-primary)] text-[var(--text-primary)] text-xs font-medium transition-colors shrink-0 cursor-pointer"
              title={`Download SafeHer Android APK (${APP_CONFIG.apkSize})`}
            >
              <Smartphone size={13} className="text-[var(--brand-primary)]" />
              <span>Android APK</span>
            </a>

            {/* Theme Toggle Button */}
            <button
              onClick={toggleTheme}
              className="p-1.5 rounded-md bg-[var(--bg-elevated)] hover:bg-[var(--bg-hover)] border border-[var(--border-subtle)] text-[var(--text-primary)] transition-colors cursor-pointer"
              aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode`}
              title={isDark ? "Switch to light theme" : "Switch to dark theme"}
            >
              {isDark ? <Sun size={13} /> : <Moon size={13} />}
            </button>

            {/* Account / Authentication State */}
            {user ? (
              <div className="relative">
                <button 
                  onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                  className="flex items-center gap-2 py-1 px-2.5 rounded-md bg-[var(--bg-elevated)] hover:bg-[var(--bg-hover)] border border-[var(--border-subtle)] hover:border-[var(--brand-primary)] transition-colors cursor-pointer"
                  aria-label="User Account Menu"
                >
                  {user.photoURL ? (
                    <img src={user.photoURL} alt={user.displayName || 'User'} className="w-5 h-5 rounded-full object-cover" />
                  ) : (
                    <div className="w-5 h-5 rounded-full bg-[var(--brand-primary)] text-white text-[10px] font-bold flex items-center justify-center">
                      {user.displayName?.[0]?.toUpperCase() || user.email?.[0]?.toUpperCase() || 'U'}
                    </div>
                  )}
                  <span className="text-xs font-medium text-[var(--text-primary)] hidden md:inline max-w-[90px] truncate">
                    {user.displayName?.split(' ')[0] || user.email?.split('@')[0] || 'Account'}
                  </span>
                  <ChevronDown size={12} className="text-[var(--text-muted)]" />
                </button>

                {/* Dropdown Menu */}
                {userDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-48 py-1 bg-[var(--bg-surface)] border border-[var(--border-medium)] rounded-lg shadow-lg z-50 text-xs animate-fade-in">
                    <div className="px-3 py-2 border-b border-[var(--border-subtle)]">
                      <p className="font-semibold text-[var(--text-primary)] truncate">
                        {user.displayName || 'SafeHer User'}
                      </p>
                      <p className="text-[10px] text-[var(--text-muted)] truncate font-mono">
                        {user.email}
                      </p>
                    </div>

                    <button 
                      onClick={() => handleLinkClick('profile')}
                      className="w-full px-3 py-2 text-left text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] flex items-center gap-2 transition-colors cursor-pointer"
                    >
                      <UserIcon size={13} />
                      <span>Profile</span>
                    </button>

                    <button 
                      onClick={() => handleLinkClick('contacts')}
                      className="w-full px-3 py-2 text-left text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] flex items-center gap-2 transition-colors cursor-pointer"
                    >
                      <Users size={13} />
                      <span>Contacts</span>
                    </button>

                    <div className="border-t border-[var(--border-subtle)] my-1"></div>

                    <button 
                      onClick={handleSignOut}
                      className="w-full px-3 py-2 text-left text-red-600 dark:text-red-400 hover:bg-red-500/10 flex items-center gap-2 transition-colors cursor-pointer"
                    >
                      <LogOut size={13} />
                      <span>Sign Out</span>
                    </button>
                  </div>
                )}
              </div>
            ) : isGuest ? (
              <div className="flex items-center gap-2">
                <span className="hidden sm:inline-block text-[10px] text-[var(--text-muted)]">
                  Guest
                </span>
                <button
                  onClick={onOpenAccountModal}
                  className="px-2.5 py-1.5 rounded-md bg-[var(--brand-primary)] hover:bg-[var(--brand-hover)] text-white text-xs font-medium transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <LogIn size={12} />
                  <span>Sign In</span>
                </button>
              </div>
            ) : (
              <button
                onClick={onOpenAccountModal}
                className="px-2.5 py-1.5 rounded-md bg-[var(--brand-primary)] hover:bg-[var(--brand-hover)] text-white text-xs font-medium transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <LogIn size={12} />
                <span>Sign In</span>
              </button>
            )}

            {/* Mobile Hamburger Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-1.5 rounded-md bg-[var(--bg-elevated)] border border-[var(--border-subtle)] text-[var(--text-primary)] cursor-pointer"
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X size={15} /> : <Menu size={15} />}
            </button>

          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-[var(--border-subtle)] py-2.5 space-y-1 bg-[var(--bg-base)] animate-fade-in">
            {primaryLinks.map((link) => (
              <button
                key={link.view}
                onClick={() => handleLinkClick(link.view)}
                className={`w-full flex items-center gap-2 px-3 py-2 rounded-md text-xs transition-colors cursor-pointer ${
                  currentView === link.view
                    ? 'bg-[var(--bg-elevated)] text-[var(--text-primary)] font-semibold'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)]/60 font-medium'
                }`}
              >
                {link.icon}
                <span>{link.label}</span>
              </button>
            ))}

            {user && (
              <button
                onClick={() => handleLinkClick('contacts')}
                className={`w-full flex items-center gap-2 px-3 py-2 rounded-md text-xs transition-colors cursor-pointer ${
                  currentView === 'contacts'
                    ? 'bg-[var(--bg-elevated)] text-[var(--text-primary)] font-semibold'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)]/60 font-medium'
                }`}
              >
                <Users size={14} />
                <span>Emergency Contacts</span>
              </button>
            )}

            <a
              href={APP_CONFIG.apkDownloadUrl}
              download={APP_CONFIG.apkFilename}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-md text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)]/60 transition-colors"
            >
              <Smartphone size={14} className="text-[var(--brand-primary)]" />
              <span>Download Android APK</span>
            </a>

            {user && (
              <button
                onClick={handleSignOut}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-md text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer"
              >
                <LogOut size={14} />
                <span>Sign Out ({user.email})</span>
              </button>
            )}
          </div>
        )}

      </div>
    </header>
  );
};
