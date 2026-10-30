import React, { useState } from 'react';
import { 
  Download, 
  ShieldCheck, 
  CheckCircle2, 
  FileCheck, 
  ExternalLink, 
  Info
} from 'lucide-react';
import { APP_CONFIG } from '../config/appConfig';

export const DownloadSection: React.FC = () => {
  const [downloadTriggered, setDownloadTriggered] = useState(false);

  const handleDownloadClick = () => {
    setDownloadTriggered(true);
    // Auto-reset message after 8 seconds
    setTimeout(() => setDownloadTriggered(false), 8000);
  };

  return (
    <section id="download" className="section download-section">
      <div className="container">
        <div className="section-header">
          <div className="section-tag">
            <span className="badge badge-brand">Official Mobile Release</span>
          </div>
          <h2>Install SafeHer for Android</h2>
          <p>
            Get the full native mobile experience directly on your Android smartphone.
            Direct APK download with verified cryptographic integrity.
          </p>
        </div>

        {/* Main Download Card */}
        <div className="card download-card-main">
          <div className="download-card-grid">
            {/* Left Col: Primary Action & Info */}
            <div className="download-main-left">
              <div className="flex items-center gap-3 mb-4">
                <div className="app-logo-badge">
                  <img src="/logo.png" alt="SafeHer Icon" className="w-12 h-12 rounded-xl object-cover shadow-sm" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold">SafeHer for Android</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="badge badge-brand">v{APP_CONFIG.version} APK</span>
                    <span className="badge badge-success">Verified Production</span>
                  </div>
                </div>
              </div>

              <p className="text-secondary text-sm mb-6">
                Direct release build compiled for Android devices. Features zero third-party trackers,
                hardened local contact storage, and seamless edge-to-cloud incident dispatch.
              </p>

              {/* Direct APK Download CTA */}
              <div className="download-cta-block">
                <a 
                  href={APP_CONFIG.downloadUrl}
                  download={APP_CONFIG.apkFilename}
                  onClick={handleDownloadClick}
                  className="btn btn-primary btn-lg download-button-prominent"
                  id="section-download-apk-button"
                  title={`Direct download ${APP_CONFIG.apkFilename}`}
                >
                  <Download size={22} />
                  <span>Download {APP_CONFIG.apkFilename} ({APP_CONFIG.apkSize})</span>
                </a>

                {downloadTriggered && (
                  <div className="download-started-alert">
                    <CheckCircle2 size={16} className="text-emerald flex-shrink-0" />
                    <span>Download initiated! Check your browser's download notifications.</span>
                  </div>
                )}
              </div>

              {/* Android Browser Permission Note */}
              <div className="android-permission-callout">
                <div className="callout-icon">
                  <Info size={18} className="text-brand" />
                </div>
                <div className="callout-body">
                  <h4 className="font-semibold text-sm mb-1">Installing APK Outside Google Play</h4>
                  <p className="text-xs text-secondary leading-relaxed">
                    Because this is an independent verified release, Android may display a standard prompt:
                    <em> "File might be harmful"</em> or request permission to <em>"Install unknown apps"</em>.
                    This is standard Android behavior for direct APK installations. SafeHer is open-source and free of malware.
                  </p>
                </div>
              </div>
            </div>

            {/* Right Col: Technical Specifications */}
            <div className="download-main-right">
              <div className="specs-card">
                <h4 className="specs-card-title flex items-center gap-2">
                  <FileCheck size={16} className="text-brand" />
                  <span>Release Asset Specifications</span>
                </h4>

                <div className="specs-table">
                  <div className="spec-row">
                    <span className="spec-name">Asset File</span>
                    <span className="spec-val font-mono">{APP_CONFIG.apkFilename}</span>
                  </div>
                  <div className="spec-row">
                    <span className="spec-name">Release Version</span>
                    <span className="spec-val font-mono">v{APP_CONFIG.version} (Production)</span>
                  </div>
                  <div className="spec-row">
                    <span className="spec-name">File Size</span>
                    <span className="spec-val font-mono">{APP_CONFIG.apkSize}</span>
                  </div>
                  <div className="spec-row">
                    <span className="spec-name">OS Requirement</span>
                    <span className="spec-val">{APP_CONFIG.minAndroidVersion}</span>
                  </div>
                  <div className="spec-row">
                    <span className="spec-name">Architecture</span>
                    <span className="spec-val font-mono">Universal (arm64-v8a / armeabi-v7a / x86)</span>
                  </div>
                  <div className="spec-row">
                    <span className="spec-name">Verification</span>
                    <span className="spec-val text-emerald flex items-center gap-1">
                      <ShieldCheck size={14} />
                      <span>GitHub Verified Asset</span>
                    </span>
                  </div>
                </div>

                {/* Direct Repository Link */}
                <div className="mt-4 pt-4 border-t border-subtle">
                  <a 
                    href={APP_CONFIG.githubRepoUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-muted hover:text-brand flex items-center justify-between"
                  >
                    <span>View GitHub Release & Source Code</span>
                    <ExternalLink size={12} />
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 4-Step Installation Guide */}
        <div className="install-steps-section mt-12">
          <h3 className="text-xl font-bold text-center mb-8">4 Easy Steps to Install SafeHer on Android</h3>
          
          <div className="install-steps-grid">
            <div className="card install-step-card">
              <div className="step-badge">Step 1</div>
              <h4 className="font-semibold text-base mb-2">Download APK</h4>
              <p className="text-xs text-secondary">
                Tap the download button above to retrieve <code>{APP_CONFIG.apkFilename}</code> directly to your device storage.
              </p>
            </div>

            <div className="card install-step-card">
              <div className="step-badge">Step 2</div>
              <h4 className="font-semibold text-base mb-2">Confirm Download</h4>
              <p className="text-xs text-secondary">
                When Chrome or your browser asks to confirm, tap <strong>"Download anyway"</strong>.
              </p>
            </div>

            <div className="card install-step-card">
              <div className="step-badge">Step 3</div>
              <h4 className="font-semibold text-base mb-2">Enable Install Permission</h4>
              <p className="text-xs text-secondary">
                Open the downloaded file. If prompted, toggle on <strong>"Allow from this source"</strong> in Android Settings.
              </p>
            </div>

            <div className="card install-step-card">
              <div className="step-badge">Step 4</div>
              <h4 className="font-semibold text-base mb-2">Grant Permissions</h4>
              <p className="text-xs text-secondary">
                Launch SafeHer and grant Location and SMS access to activate the one-tap emergency SOS network.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
