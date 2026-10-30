import React, { useState } from 'react';
import { 
  Home, 
  Bell, 
  Users, 
  FileText, 
  MapPin, 
  Smartphone, 
  User, 
  Settings, 
  LogOut, 
  Search, 
  ChevronDown, 
  Menu, 
  X
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Footer } from './Footer';
import type { PageView } from '../types';

interface AuthenticatedLayoutProps {
  currentView: PageView;
  onNavigate: (view: PageView) => void;
  children: React.ReactNode;
}

export const AuthenticatedLayout: React.FC<AuthenticatedLayoutProps> = ({
  currentView,
  onNavigate,
  children,
}) => {
  const { user, profile, isGuest, signOut } = useAuth();
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);

  const displayName = isGuest ? 'Guest' : (profile?.name || user?.displayName || user?.email?.split('@')[0] || 'User');
  const displaySubtitle = isGuest ? 'Guest Mode' : (user?.email || 'Active Account');

  const navItems = [
    { id: 'dashboard' as PageView, label: 'Home', icon: Home },
    { id: 'emergency' as PageView, label: 'Emergency', icon: Bell },
    { id: 'contacts' as PageView, label: 'Contacts', icon: Users },
    { id: 'incidents' as PageView, label: 'Incidents', icon: FileText },
    { id: 'map' as PageView, label: 'Map', icon: MapPin },
    { id: 'mobile-app' as PageView, label: 'Our Mobile App', icon: Smartphone },
    { id: 'profile' as PageView, label: 'Profile', icon: User },
    { id: 'settings' as PageView, label: 'Settings', icon: Settings },
  ];

  const handleNavClick = (view: PageView) => {
    onNavigate(view);
    setMobileSidebarOpen(false);
  };

  const handleSignOut = async () => {
    await signOut();
    onNavigate('welcome');
  };

  return (
    <div className="min-h-screen bg-[#FAF7F6] text-[#28151D] flex flex-col md:flex-row antialiased selection:bg-[#A61945] selection:text-white">
      
      {/* Mobile Top Header */}
      <div className="md:hidden flex items-center justify-between px-4 py-3 bg-[#F7EEEE] border-b border-[#EEE5E7] sticky top-0 z-40">
        <button
          onClick={() => handleNavClick('dashboard')}
          className="flex items-center gap-2.5 text-left focus:outline-none cursor-pointer"
          aria-label="SafeHer Home"
        >
          <div className="w-8 h-8 rounded-lg bg-white border border-[#EEE5E7] p-0.5 flex items-center justify-center shadow-xs shrink-0 overflow-hidden">
            <img 
              src="/logo.png" 
              alt="SafeHer Logo" 
              className="w-full h-full rounded-md object-cover" 
            />
          </div>
          <span className="font-bold text-base tracking-tight text-[#28151D]">SafeHer</span>
        </button>
        <button
          onClick={() => setMobileSidebarOpen(!mobileSidebarOpen)}
          className="p-2 rounded-lg text-[#28151D] hover:bg-[#EEDFE2] transition-colors"
          aria-label="Toggle navigation menu"
        >
          {mobileSidebarOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* Left Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-60 bg-[#F7EEEE] border-r border-[#EEE5E7] flex flex-col justify-between py-6 px-4 transition-transform duration-200 md:static md:translate-x-0 ${
          mobileSidebarOpen ? 'translate-x-0 shadow-xl' : '-translate-x-full md:shadow-none'
        }`}
      >
        <div className="space-y-6">
          <button
            onClick={() => handleNavClick('dashboard')}
            className="flex items-center gap-2.5 px-2 text-left focus:outline-none w-full group cursor-pointer"
            aria-label="SafeHer Home"
          >
            <div className="w-8 h-8 rounded-lg bg-white border border-[#EEE5E7] p-0.5 flex items-center justify-center shadow-xs shrink-0 overflow-hidden group-hover:border-[#A61945]/40 transition-colors">
              <img 
                src="/logo.png" 
                alt="SafeHer Logo" 
                className="w-full h-full rounded-md object-cover" 
              />
            </div>
            <span className="font-bold text-lg tracking-tight text-[#28151D]">SafeHer</span>
          </button>

          {/* Navigation Links */}
          <nav className="space-y-1" aria-label="Main Navigation">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentView === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleNavClick(item.id)}
                  className={`w-full flex items-center gap-3.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 cursor-pointer text-left relative ${
                    isActive
                      ? 'bg-[#FBE9EF] text-[#A61945] font-semibold'
                      : 'text-[#5C4953] hover:text-[#28151D] hover:bg-[#F2E5E8]'
                  }`}
                >
                  {isActive && (
                    <div className="absolute left-0 top-2 bottom-2 w-1 rounded-r bg-[#A61945]" />
                  )}
                  <Icon size={18} className={isActive ? 'text-[#A61945]' : 'text-[#81747D]'} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Bottom: Logout */}
        <div className="pt-4 border-t border-[#E8DBDF]">
          <button
            onClick={handleSignOut}
            className="w-full flex items-center gap-3.5 px-3 py-2.5 rounded-xl text-sm font-medium text-[#A61945] hover:bg-[#FBE9EF] transition-colors cursor-pointer text-left"
          >
            <LogOut size={18} />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Backdrop for Mobile Drawer */}
      {mobileSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/20 z-40 md:hidden backdrop-blur-xs"
          onClick={() => setMobileSidebarOpen(false)}
        />
      )}

      {/* Main Container: Top Bar + Content */}
      <div className="flex-1 flex flex-col min-w-0">
        
        {/* Desktop Top Navigation Bar */}
        <header className="h-[70px] bg-[#FAF7F6] border-b border-[#EEE5E7] px-6 lg:px-8 flex items-center justify-between gap-4 sticky top-0 z-30">
          
          {/* Search Box */}
          <div className="relative w-full max-w-md">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#81747D]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search incidents, contacts..."
              className="w-full pl-10 pr-4 py-2 rounded-xl bg-white border border-[#EEE5E7] text-xs text-[#28151D] placeholder:text-[#9E929A] focus:outline-none focus:border-[#A61945] focus:ring-1 focus:ring-[#A61945]/30 transition-all shadow-xs"
            />
          </div>

          {/* Right Header Actions */}
          <div className="flex items-center gap-4 shrink-0">
            {/* Notification Bell */}
            <button
              onClick={() => onNavigate('incidents')}
              className="w-9 h-9 rounded-full bg-white border border-[#EEE5E7] flex items-center justify-center text-[#5C4953] hover:text-[#28151D] hover:border-[#D9CCD0] relative transition-colors cursor-pointer shadow-xs"
              aria-label="View notifications"
            >
              <Bell size={16} />
              <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-[#A61945]" />
            </button>

            {/* User Profile Dropdown Button */}
            <div className="relative">
              <button
                onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                className="flex items-center gap-3 p-1 rounded-full hover:bg-white/80 transition-colors cursor-pointer"
                aria-label="User profile menu"
              >
                <div className="w-9 h-9 rounded-full bg-[#FBE9EF] border border-[#EEE5E7] flex items-center justify-center text-xs font-bold text-[#A61945] shrink-0 overflow-hidden shadow-xs">
                  {user?.photoURL ? (
                    <img src={user.photoURL} alt={displayName} className="w-full h-full object-cover" />
                  ) : (
                    displayName.charAt(0).toUpperCase()
                  )}
                </div>
                <div className="hidden sm:block text-left">
                  <div className="text-xs font-semibold text-[#28151D] leading-tight flex items-center gap-1">
                    <span>{displayName}</span>
                    <ChevronDown size={13} className="text-[#81747D]" />
                  </div>
                  <div className="text-[11px] text-[#81747D] leading-tight truncate max-w-[120px]">
                    {displaySubtitle}
                  </div>
                </div>
              </button>

              {userDropdownOpen && (
                <div className="absolute right-0 mt-2 w-48 rounded-xl bg-white border border-[#EEE5E7] shadow-lg py-1.5 z-50 animate-in fade-in-50 zoom-in-95">
                  <button
                    onClick={() => {
                      setUserDropdownOpen(false);
                      onNavigate('profile');
                    }}
                    className="w-full px-4 py-2 text-left text-xs font-medium text-[#28151D] hover:bg-[#FAF7F6] flex items-center gap-2"
                  >
                    <User size={14} className="text-[#81747D]" />
                    <span>My Profile</span>
                  </button>
                  <button
                    onClick={() => {
                      setUserDropdownOpen(false);
                      onNavigate('settings');
                    }}
                    className="w-full px-4 py-2 text-left text-xs font-medium text-[#28151D] hover:bg-[#FAF7F6] flex items-center gap-2"
                  >
                    <Settings size={14} className="text-[#81747D]" />
                    <span>Settings</span>
                  </button>
                  <div className="my-1 border-t border-[#EEE5E7]" />
                  <button
                    onClick={handleSignOut}
                    className="w-full px-4 py-2 text-left text-xs font-medium text-[#A61945] hover:bg-[#FBE9EF] flex items-center gap-2"
                  >
                    <LogOut size={14} />
                    <span>Sign Out</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Main Content Workspace */}
        <main className="flex-1 p-6 lg:p-8 max-w-[1440px] w-full mx-auto">
          {children}
        </main>

        {/* Global Layout Footer with Project Credits */}
        <Footer onNavigate={onNavigate} />
      </div>
    </div>
  );
};
