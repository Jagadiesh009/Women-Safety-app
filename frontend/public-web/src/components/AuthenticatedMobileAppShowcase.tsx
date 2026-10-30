import React from 'react';
import { Download, CheckCircle } from 'lucide-react';
import { APP_CONFIG } from '../config/appConfig';

export const AuthenticatedMobileAppShowcase: React.FC = () => {
  return (
    <div className="space-y-8 animate-in fade-in-50 duration-200">
      
      {/* Header */}
      <div>
        <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-[#FBE9EF] border border-[#A61945]/20 mb-2">
          <span className="w-1.5 h-1.5 rounded-full bg-[#A61945]" />
          <span className="text-[11px] font-bold tracking-widest uppercase text-[#A61945]">
            SafeHer for Android
          </span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#28151D]">
          Our Mobile App
        </h1>
        <p className="text-sm text-[#81747D] mt-1 max-w-xl">
          Take SafeHer everywhere you go. Your full women's safety companion with one-tap SOS, offline siren, and live background telemetry.
        </p>
      </div>

      {/* Main Grid: Info + 3D Phone Mockup */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center bg-white border border-[#EEE5E7] rounded-2xl p-6 sm:p-10 shadow-xs">
        
        {/* Left Column: Details & Download Button */}
        <div className="lg:col-span-6 space-y-6">
          <div className="space-y-4">
            <h2 className="text-xl sm:text-2xl font-bold text-[#28151D] leading-tight">
              Safety, Always Within Reach.
            </h2>
            <p className="text-sm text-[#5C4953] leading-relaxed">
              Equipped with locked-screen volume button triggers, immediate automated SOS calling, real-time GPS telemetry broadcasts, and zero-latency emergency circle sync.
            </p>
          </div>

          {/* Key Features List */}
          <div className="space-y-2.5 pt-1">
            <div className="flex items-center gap-2.5 text-xs text-[#28151D]">
              <CheckCircle size={15} className="text-[#059669] shrink-0" />
              <span>Instant hardware volume-button panic trigger</span>
            </div>
            <div className="flex items-center gap-2.5 text-xs text-[#28151D]">
              <CheckCircle size={15} className="text-[#059669] shrink-0" />
              <span>Direct SMS coordinates broadcast to emergency circle</span>
            </div>
            <div className="flex items-center gap-2.5 text-xs text-[#28151D]">
              <CheckCircle size={15} className="text-[#059669] shrink-0" />
              <span>Real-time cloud sync with this desktop companion console</span>
            </div>
            <div className="flex items-center gap-2.5 text-xs text-[#28151D]">
              <CheckCircle size={15} className="text-[#059669] shrink-0" />
              <span>Offline audible siren & active telemetry recording</span>
            </div>
          </div>

          {/* Download Action */}
          <div className="pt-2">
            <a
              href={APP_CONFIG.apkDownloadUrl}
              download={APP_CONFIG.apkFilename}
              className="inline-flex items-center gap-2.5 px-6 py-3.5 rounded-xl bg-[#A61945] hover:bg-[#8C1338] text-white text-xs font-semibold tracking-wide transition-all duration-200 active:scale-[0.98] shadow-sm cursor-pointer"
              title={`Download SafeHer for Android (${APP_CONFIG.apkSize})`}
            >
              <Download size={16} />
              <span>Download for Android (APK)</span>
            </a>
            <div className="text-[11px] text-[#81747D] mt-2">
              Version {APP_CONFIG.version} • {APP_CONFIG.apkSize} APK • Compatible with Android 8.0+
            </div>
          </div>
        </div>

        {/* Right Column: 3D Phone Showcase */}
        <div className="lg:col-span-6 flex justify-center items-center py-2">
          <div className="phone-3d-wrapper relative w-full max-w-[255px] sm:max-w-[275px]">
            
            {/* Ambient Glow */}
            <div className="absolute -inset-4 rounded-[56px] bg-gradient-to-tr from-[#A61945]/15 via-rose-500/10 to-transparent blur-2xl -z-10 pointer-events-none" />

            {/* Realistic Phone Frame */}
            <div className="phone-3d-chassis relative w-full aspect-[458/1024] rounded-[44px] bg-[#0E0C0D] p-[10px] shadow-[0_28px_60px_-15px_rgba(40,21,29,0.35)] border border-white/20 select-none">
              
              {/* Outer Metallic Bezel */}
              <div className="absolute inset-0 rounded-[44px] border border-white/10 pointer-events-none" />

              {/* Hardware Buttons */}
              <div className="absolute -left-[3px] top-[90px] w-[3px] h-[32px] rounded-l bg-neutral-600/80" />
              <div className="absolute -left-[3px] top-[130px] w-[3px] h-[32px] rounded-l bg-neutral-600/80" />
              <div className="absolute -right-[3px] top-[105px] w-[3px] h-[40px] rounded-r bg-neutral-600/80" />

              {/* Inner Phone Screen UI with Real SafeHer Dashboard Screenshot */}
              <div className="relative w-full h-full rounded-[34px] bg-[#FAF7F6] overflow-hidden border border-white/10 shadow-inner">
                {/* Authentic Mobile App Screenshot */}
                <img 
                  src="/safeher-app-screen.png" 
                  alt="SafeHer Mobile App Live Dashboard showing safety readiness, emergency SOS trigger, and real-time location sharing" 
                  className="w-full h-full object-cover object-top select-none pointer-events-none"
                  loading="eager"
                  decoding="async"
                />

                {/* Diagonal Glass Reflection */}
                <div 
                  className="absolute inset-0 pointer-events-none z-30 opacity-25 bg-gradient-to-tr from-transparent via-white/15 to-transparent" 
                  aria-hidden="true"
                />
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
