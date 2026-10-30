import React from 'react';
import { 
  PhoneCall, 
  ShieldAlert, 
  CheckCircle2, 
  Car, 
  Moon, 
  Download,
  ShieldCheck
} from 'lucide-react';
import { APP_CONFIG } from '../config/appConfig';
import type { PageView } from '../types';

interface SafetyResourcesViewProps {
  onNavigate?: (view: PageView) => void;
}

export const SafetyResourcesView: React.FC<SafetyResourcesViewProps> = () => {
  return (
    <div className="py-8 sm:py-10 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto space-y-8 animate-fade-in">
      
      {/* Header */}
      <div className="pb-6 border-b border-[var(--color-border)] flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--color-primary)]">
              Directory & Protocols
            </span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              Direct Dial Ready
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[var(--color-text-primary)]">
            Emergency Resources & Helplines
          </h1>
          <p className="text-xs sm:text-sm text-[var(--color-text-secondary)] mt-1 max-w-2xl">
            Verified Indian emergency response helplines, field protocols, and incident guidance.
          </p>
        </div>
      </div>

      {/* Critical Life-Safety Disclaimer */}
      <div className="p-4 sm:p-5 rounded-2xl bg-[var(--color-surface)] border border-amber-500/30 dark:border-amber-500/20 text-xs text-[var(--color-text-secondary)] flex items-start gap-3.5 shadow-xs">
        <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 flex items-center justify-center shrink-0 mt-0.5">
          <ShieldAlert className="w-4 h-4" />
        </div>
        <div className="space-y-1">
          <p className="font-semibold text-xs text-[var(--color-text-primary)]">
            Official Emergency Disclaimer
          </p>
          <p className="leading-relaxed">
            SafeHer is an auxiliary technology tool for rapid notification and incident evidence archival. 
            <strong className="text-[var(--color-text-primary)] font-semibold"> SafeHer does not replace official police or medical dispatch.</strong> If you are in immediate life-threatening danger, dial <strong className="text-red-600 dark:text-red-400 font-mono font-bold">112</strong> immediately.
          </p>
        </div>
      </div>

      {/* National Helplines Directory */}
      <div className="space-y-3.5">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-[var(--color-text-primary)] uppercase tracking-wide">
            National Emergency Hotlines (India)
          </h2>
          <span className="text-[11px] text-[var(--color-text-muted)]">
            Toll-Free • 24/7 Active
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {APP_CONFIG.emergencyHotlines.map((hotline) => (
            <div
              key={hotline.number}
              className="p-5 rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)] hover:border-[var(--color-border-strong)] transition-all flex flex-col justify-between space-y-4 group"
            >
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
                    Official Line
                  </span>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                </div>
                <h3 className="font-bold text-sm text-[var(--color-text-primary)] group-hover:text-[var(--color-primary)] transition-colors">
                  {hotline.name}
                </h3>
                <p className="text-xs text-[var(--color-text-secondary)] line-clamp-2 leading-relaxed">
                  {hotline.desc}
                </p>
              </div>

              <a
                href={`tel:${hotline.number}`}
                className="w-full py-2.5 px-3.5 rounded-xl bg-[var(--color-surface-elevated)] hover:bg-[var(--color-primary)] hover:text-white border border-[var(--color-border)] text-xs font-mono font-semibold text-[var(--color-text-primary)] flex items-center justify-center gap-2 transition-all shadow-2xs group/btn"
              >
                <PhoneCall className="w-3.5 h-3.5 text-red-500 group-hover/btn:text-white transition-colors" />
                <span>Call {hotline.number}</span>
              </a>
            </div>
          ))}
        </div>
      </div>

      {/* Tactical Field Safety Guides */}
      <div className="space-y-3.5 pt-4 border-t border-[var(--color-border)]">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-[var(--color-text-primary)] uppercase tracking-wide">
            Tactical Safety Protocols
          </h2>
          <span className="text-[11px] text-[var(--color-text-muted)]">
            Preventative Checklists
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          
          {/* Guide 1: Rideshare & Taxi Protocol */}
          <div className="p-6 rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)] space-y-4">
            <div className="flex items-center gap-3 pb-3 border-b border-[var(--color-border)]">
              <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 flex items-center justify-center shrink-0">
                <Car className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-[var(--color-text-primary)]">
                  Cab & Rideshare Protocol
                </h3>
                <p className="text-[11px] text-[var(--color-text-muted)]">
                  Pre-boarding verification & transit checklist
                </p>
              </div>
            </div>

            <ul className="space-y-2.5 text-xs text-[var(--color-text-secondary)] leading-relaxed">
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                <span>Match license plate, driver photo, and vehicle model before opening the door.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                <span>Ask "Who are you picking up?" — do not volunteer your name first.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                <span>Sit in the back right seat to maintain exit options from either side.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                <span>Share active route tracking with trusted contacts before departure.</span>
              </li>
            </ul>
          </div>

          {/* Guide 2: Solo Night Travel */}
          <div className="p-6 rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)] space-y-4">
            <div className="flex items-center gap-3 pb-3 border-b border-[var(--color-border)]">
              <div className="w-9 h-9 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 flex items-center justify-center shrink-0">
                <Moon className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-[var(--color-text-primary)]">
                  Solo Night Transit & Walking
                </h3>
                <p className="text-[11px] text-[var(--color-text-muted)]">
                  Environmental awareness & escape routing
                </p>
              </div>
            </div>

            <ul className="space-y-2.5 text-xs text-[var(--color-text-secondary)] leading-relaxed">
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                <span>Keep one ear free — do not wear dual noise-canceling headphones.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                <span>Stick to illuminated main corridors rather than unmonitored alleys.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                <span>Have the hardware trigger (volume key rapid press) ready in the Android app.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                <span>If feeling followed, immediately enter a 24/7 store, hotel lobby, or petrol station.</span>
              </li>
            </ul>
          </div>

        </div>
      </div>

      {/* Android Native App Hardware Download Banner */}
      <div className="p-6 sm:p-8 rounded-2xl bg-[var(--color-surface-elevated)] border border-[var(--color-border)] flex flex-col sm:flex-row items-center justify-between gap-6">
        <div className="space-y-1.5 text-center sm:text-left">
          <div className="flex items-center justify-center sm:justify-start gap-2">
            <ShieldCheck className="w-4 h-4 text-[var(--color-primary)]" />
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--color-primary)]">
              Native Hardware Protection
            </span>
          </div>
          <h3 className="text-base sm:text-lg font-bold text-[var(--color-text-primary)]">
            SafeHer Native Android Application
          </h3>
          <p className="text-xs text-[var(--color-text-secondary)] max-w-lg leading-relaxed">
            Access locked-screen volume button emergency trigger, automatic siren, background location telemetry, and ambient AI safety scoring.
          </p>
        </div>

        <a
          href={APP_CONFIG.downloadUrl}
          download={APP_CONFIG.apkFilename}
          className="w-full sm:w-auto py-3 px-6 rounded-xl bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white font-semibold text-xs transition-colors shrink-0 flex items-center justify-center gap-2 shadow-xs"
          title={`Download ${APP_CONFIG.apkFilename} (${APP_CONFIG.apkSize})`}
        >
          <Download className="w-4 h-4" />
          <span>Download {APP_CONFIG.apkFilename}</span>
        </a>
      </div>

    </div>
  );
};
