import React, { useState } from 'react';
import { 
  Download, 
  ShieldCheck, 
  Radio, 
  CheckCircle2, 
  Sparkles, 
  ArrowRight, 
  ShieldAlert, 
  Info,
  Activity
} from 'lucide-react';
import { APP_CONFIG } from '../config/appConfig';
import type { PageView } from '../types';

interface HeroProps {
  onTriggerDemo?: () => void;
  onNavigate?: (view: PageView) => void;
}

export const Hero: React.FC<HeroProps> = ({ onTriggerDemo, onNavigate }) => {
  const [phoneSosActive, setPhoneSosActive] = useState(false);
  const [phoneCountdown, setPhoneCountdown] = useState<number | null>(null);

  const handlePhoneSosClick = () => {
    if (phoneSosActive) {
      setPhoneSosActive(false);
      setPhoneCountdown(null);
      return;
    }

    setPhoneCountdown(3);
    const interval = setInterval(() => {
      setPhoneCountdown((prev) => {
        if (prev === null || prev <= 1) {
          clearInterval(interval);
          setPhoneSosActive(true);
          return null;
        }
        return prev - 1;
      });
    }, 1000);
  };

  return (
    <section className="hero-section">
      <div className="hero-glow-backdrop" />
      <div className="container">
        <div className="hero-grid">
          {/* Left Column: Headlines & Download CTAs */}
          <div className="hero-content">
            {/* System Release Tag */}
            <div className="hero-badge-wrap">
              <span className="badge badge-brand">
                <Sparkles size={13} />
                <span>Production Release v{APP_CONFIG.version}</span>
              </span>
              <span className="badge badge-success">
                <ShieldCheck size={13} />
                <span>Verified Release APK</span>
              </span>
            </div>

            <h1 className="hero-title">
              Proactive Protection When <span className="text-highlight">Seconds Matter</span>
            </h1>

            <p className="hero-subtitle">
              SafeHer is an autonomous personal security ecosystem engineered with AI risk evaluation, 
              IoT hardware trigger integration, multi-channel emergency broadcast, and tamper-resistant cloud telemetry.
            </p>

            {/* Direct APK Download Area */}
            <div className="hero-download-card">
              <div className="download-actions">
                <a 
                  href={APP_CONFIG.apkDownloadUrl}
                  download={APP_CONFIG.apkFilename}
                  className="btn btn-primary btn-lg hero-cta-btn"
                  id="hero-download-apk-button"
                  title={`Direct download SafeHer Android APK v${APP_CONFIG.version}`}
                >
                  <Download size={20} />
                  <span>Download SafeHer for Android</span>
                </a>

                <button 
                  onClick={() => onNavigate ? onNavigate('dashboard') : (onTriggerDemo && onTriggerDemo())}
                  className="btn btn-secondary btn-lg"
                  title="Launch Web Safety Dashboard & Simulator"
                >
                  <Activity size={18} className="text-[var(--color-primary)]" />
                  <span>Launch Web Dashboard</span>
                  <ArrowRight size={17} />
                </button>
              </div>

              {/* APK Specs & Browser Permission Notice */}
              <div className="apk-metadata-row">
                <div className="apk-specs">
                  <span className="spec-item">
                    <strong>Format:</strong> Android APK
                  </span>
                  <span className="spec-dot">•</span>
                  <span className="spec-item">
                    <strong>Size:</strong> {APP_CONFIG.apkSize}
                  </span>
                  <span className="spec-dot">•</span>
                  <span className="spec-item">
                    <strong>Req:</strong> {APP_CONFIG.minAndroidVersion}
                  </span>
                </div>

                <div className="install-notice-hint">
                  <Info size={14} className="text-muted flex-shrink-0" />
                  <span>
                    Direct download without app store logins. When installing, Android may ask to permit <em>"Install unknown apps"</em> from your browser.
                  </span>
                </div>
              </div>
            </div>

            {/* Verification Proof Items */}
            <div className="hero-proof-list">
              <div className="proof-item">
                <CheckCircle2 size={16} className="text-emerald" />
                <span>Direct SMS dispatch to trusted contacts with live maps</span>
              </div>
              <div className="proof-item">
                <CheckCircle2 size={16} className="text-emerald" />
                <span>FastAPI Scikit-Learn risk analysis & route safety</span>
              </div>
              <div className="proof-item">
                <CheckCircle2 size={16} className="text-emerald" />
                <span>MQTT panic pendant tethering & AWS S3 cloud evidence</span>
              </div>
            </div>
          </div>

          {/* Right Column: Interactive SafeHer Mobile Companion Device */}
          <div className="hero-device-col">
            <div className="phone-mockup-wrapper animate-float">
              {/* Phone Outer Chassis */}
              <div className="phone-chassis">
                <div className="phone-speaker-notch" />

                {/* Phone Inner Screen UI */}
                <div className="phone-screen">
                  {/* Status Bar */}
                  <div className="phone-status-bar">
                    <span className="font-mono text-xs">09:41</span>
                    <div className="status-icons">
                      <span className="status-bar-pill">5G</span>
                      <span className="status-bar-pill">98%</span>
                    </div>
                  </div>

                  {/* App Header */}
                  <div className="phone-app-header">
                    <div className="flex items-center gap-2">
                      <img src="/logo.png" alt="SafeHer" className="w-5 h-5 rounded object-cover" />
                      <span className="font-bold text-sm">SafeHer Shield</span>
                    </div>
                    <span className="phone-live-indicator">
                      <span className="live-dot" />
                      GUARD ON
                    </span>
                  </div>

                  {/* Central SOS Trigger Button */}
                  <div className="phone-center-zone">
                    <button
                      onClick={handlePhoneSosClick}
                      className={`phone-sos-button ${phoneSosActive ? 'active' : ''} ${phoneCountdown !== null ? 'counting' : ''}`}
                      aria-label="Interactive SOS Test Button"
                      id="interactive-phone-sos-button"
                    >
                      <div className="sos-pulse-ring ring-1" />
                      <div className="sos-pulse-ring ring-2" />
                      <div className="sos-button-core">
                        {phoneCountdown !== null ? (
                          <div className="countdown-display">
                            <span className="count-number">{phoneCountdown}</span>
                            <span className="count-label">HOLD TO ABORT</span>
                          </div>
                        ) : phoneSosActive ? (
                          <div className="active-display">
                            <Radio size={28} className="animate-spin text-white mb-1" />
                            <span className="sos-text">ACTIVE</span>
                            <span className="sub-text">TAP TO RESET</span>
                          </div>
                        ) : (
                          <div className="idle-display">
                            <ShieldAlert size={32} className="text-white mb-1" />
                            <span className="sos-text">SOS</span>
                            <span className="sub-text">TAP TO TEST</span>
                          </div>
                        )}
                      </div>
                    </button>
                    <p className="phone-status-hint">
                      {phoneSosActive ? (
                        <span className="text-emergency font-semibold">Broadcasting Live Telemetry to SOC</span>
                      ) : phoneCountdown !== null ? (
                        <span className="text-warning font-semibold">Counting down... Tap to cancel</span>
                      ) : (
                        'Tap the SOS button to simulate emergency broadcast'
                      )}
                    </p>
                  </div>

                  {/* Phone Bottom Cards */}
                  <div className="phone-quick-cards">
                    <div className="phone-card">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-semibold text-secondary">AI Risk Level</span>
                        <span className="badge badge-success text-[10px] py-0 px-1.5">LOW (0.12)</span>
                      </div>
                      <p className="text-[11px] text-muted">Ambient noise normal • Safe zone verified</p>
                    </div>

                    <div className="phone-card">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-semibold text-secondary">Trusted Guardians</span>
                        <span className="text-[11px] font-mono font-bold text-brand">3 Linked</span>
                      </div>
                      <p className="text-[11px] text-muted">Ready for SMS & Google Maps dispatch</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
