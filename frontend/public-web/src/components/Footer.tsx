import React from 'react';
import { Smartphone } from 'lucide-react';
import { APP_CONFIG } from '../config/appConfig';
import type { PageView } from '../types';

const GitHubIcon: React.FC<{ size?: number; className?: string }> = ({ size = 12, className = '' }) => (
  <svg 
    width={size} 
    height={size} 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    className={className}
    aria-hidden="true"
  >
    <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
    <path d="M9 18c-4.51 2-5-2-7-2" />
  </svg>
);

interface FooterProps {
  onNavigate: (view: PageView) => void;
}

export const Footer: React.FC<FooterProps> = ({ onNavigate }) => {
  const handleNav = (view: PageView) => {
    onNavigate(view);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <footer className="border-t border-[var(--border-subtle)] bg-[var(--bg-base)] py-6 px-4 sm:px-6 lg:px-8 text-xs text-[var(--text-secondary)]">
      <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
        
        {/* Brand & Emergency Note */}
        <div className="flex items-center gap-2">
          <img src="/logo.png" alt="SafeHer" className="w-5 h-5 rounded object-cover shrink-0" />
          <span className="font-semibold text-xs text-[var(--text-primary)]">SafeHer</span>
          <span className="text-[var(--text-muted)]">•</span>
          <span className="text-[11px] text-[var(--text-muted)]">
            National Emergency: <strong className="text-[var(--text-primary)] font-mono">112</strong>
          </span>
        </div>

        {/* Navigation Links */}
        <div className="flex flex-wrap items-center justify-center gap-3 text-[11px]">
          <button 
            onClick={() => handleNav('dashboard')} 
            className="hover:text-[var(--brand-primary)] transition-colors cursor-pointer"
          >
            Dashboard
          </button>
          <button 
            onClick={() => handleNav('map')} 
            className="hover:text-[var(--brand-primary)] transition-colors cursor-pointer"
          >
            Map
          </button>
          <button 
            onClick={() => handleNav('contacts')} 
            className="hover:text-[var(--brand-primary)] transition-colors cursor-pointer"
          >
            Contacts
          </button>
          <button 
            onClick={() => handleNav('privacy')} 
            className="hover:text-[var(--brand-primary)] transition-colors cursor-pointer"
          >
            Privacy
          </button>
          <button 
            onClick={() => handleNav('terms')} 
            className="hover:text-[var(--brand-primary)] transition-colors cursor-pointer"
          >
            Terms
          </button>
          <a
            href={APP_CONFIG.apkDownloadUrl}
            download={APP_CONFIG.apkFilename}
            className="inline-flex items-center gap-1 hover:text-[var(--brand-primary)] transition-colors font-medium text-[var(--text-primary)]"
            title={`Download Android APK (${APP_CONFIG.apkSize})`}
          >
            <Smartphone size={11} className="text-[var(--brand-primary)]" />
            <span>Android APK</span>
          </a>
        </div>

        {/* Project Credits / Built By */}
        <div className="flex flex-col sm:flex-row items-center gap-2 text-[11px] text-[var(--text-muted)]">
          <div className="flex items-center gap-1.5">
            <span className="text-[var(--text-secondary)] font-medium">Built by</span>
            <a 
              href="https://github.com/JAGADIESH009" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="font-semibold text-[var(--text-primary)] hover:text-[var(--brand-primary)] transition-colors underline decoration-[var(--border-medium)] hover:decoration-[var(--brand-primary)] underline-offset-2"
            >
              Jagadiesh R
            </a>
            <span>&amp;</span>
            <a 
              href="https://github.com/Bhagyaashreee" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="font-semibold text-[var(--text-primary)] hover:text-[var(--brand-primary)] transition-colors underline decoration-[var(--border-medium)] hover:decoration-[var(--brand-primary)] underline-offset-2"
            >
              Bhagyaashree
            </a>
          </div>
          <span className="hidden sm:inline text-[var(--text-muted)]">•</span>
          <a 
            href={APP_CONFIG.githubRepoUrl} 
            target="_blank" 
            rel="noopener noreferrer" 
            className="inline-flex items-center gap-1 font-medium text-[var(--text-secondary)] hover:text-[var(--brand-primary)] transition-colors"
            title="SafeHer on GitHub"
          >
            <GitHubIcon size={12} />
            <span>Open Source</span>
          </a>
        </div>

      </div>
    </footer>
  );
};
