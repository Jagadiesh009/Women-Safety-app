import React from 'react';
import { 
  Radio, 
  Users, 
  Cpu, 
  Cloud, 
  PhoneOutgoing, 
  Map, 
  Smartphone,
  Globe,
  CheckCircle2,
  XCircle,
  AlertCircle
} from 'lucide-react';
import { APP_CONFIG } from '../config/appConfig';

interface FeaturesProps {
  onExploreDashboard?: () => void;
}

export const Features: React.FC<FeaturesProps> = ({ onExploreDashboard }) => {
  const verifiedFeatures = [
    {
      id: 'sos-dispatch',
      icon: Radio,
      category: 'Mission-Critical SOS',
      title: 'One-Tap Emergency SOS & Evidence Archival',
      description: 'Instant SOS trigger with a 3-second countdown window to prevent false alarms. Automatically initiates emergency audio recording and begins continuous high-frequency GPS coordinate streaming.',
      techStack: ['FastAPI Emergency Router', 'React Native Audio Capture', 'PostgreSQL Incidents Table'],
      highlight: '< 3s Alert Broadcast',
      color: 'var(--status-emergency)',
      bgColor: 'var(--status-emergency-bg)',
    },
    {
      id: 'trusted-network',
      icon: Users,
      category: 'Trusted Network',
      title: 'Automated SMS & Maps Dispatch to Contacts',
      description: 'Dispatches emergency SMS alerts directly to your designated guardian contacts containing live Google Maps tracking links, current battery level, and timestamped distress coordinates.',
      techStack: ['Android SMS Gateway', 'Encrypted Local Contact Store', 'Google Maps Geo-URI'],
      highlight: 'Carrier SMS Fallback',
      color: 'var(--status-success)',
      bgColor: 'var(--status-success-bg)',
    },
    {
      id: 'ai-risk-scoring',
      icon: Cpu,
      category: 'Artificial Intelligence',
      title: 'FastAPI Scikit-Learn Safety Risk Scoring',
      description: 'Backend intelligence module built with Scikit-learn to calculate real-time situational risk scores. Evaluates route history, time-of-day variables, and proactive device readiness.',
      techStack: ['Python Scikit-Learn Model', 'FastAPI AI Service', 'Dynamic Readiness Score'],
      highlight: 'Predictive Assessment',
      color: 'var(--brand-primary)',
      bgColor: 'var(--brand-subtle)',
    },
    {
      id: 'iot-cloud-arch',
      icon: Cloud,
      category: 'IoT & Cloud Systems',
      title: 'MQTT Wearable Pendants & AWS S3 Evidence Vault',
      description: 'Integrated MQTT messaging broker for tethered wearable panic pendants and physical triggers. Incident evidence is stored securely in AWS S3 buckets with tamper-proof audit trails.',
      techStack: ['MQTT Broker Protocol', 'AWS S3 Object Storage', 'Redis Telemetry Pub/Sub'],
      highlight: 'Hardware-Trigger Capable',
      color: 'var(--rose-accent)',
      bgColor: 'var(--brand-subtle)',
    },
    {
      id: 'discreet-fake-call',
      icon: PhoneOutgoing,
      category: 'Discreet Escape',
      title: 'Simulated Incoming Fake Call Generator',
      description: 'A discreet safety escape tool designed to generate an authentic-looking full-screen incoming phone call. Enables a natural, non-confrontational exit from unsafe or suspicious environments.',
      techStack: ['Native Call Screen Simulator', 'Custom Caller ID', 'One-Touch Quick Trigger'],
      highlight: 'Discreet Safety Exit',
      color: 'var(--status-warning)',
      bgColor: 'var(--status-warning-bg)',
    },
    {
      id: 'safe-navigation-reports',
      icon: Map,
      category: 'Geospatial Intelligence',
      title: 'Safe Zone Mapping & Community Hazard Reporting',
      description: 'Interactive map displaying verified safe zones, emergency police stations, and 24/7 medical facilities. Community members can submit verified hazard reports to alert other women.',
      techStack: ['Leaflet / OpenStreetMap', 'GPS Geofencing', 'FastAPI Locations Router'],
      highlight: 'Verified Safe Havens',
      color: 'var(--status-success)',
      bgColor: 'var(--status-success-bg)',
    },
  ];

  const platformMatrix = [
    {
      feature: 'Background SOS Activation (Volume Buttons)',
      web: false,
      android: true,
      notes: 'Requires native Android Accessibility / Key listener service with screen off.',
    },
    {
      feature: 'Automated Carrier SMS Dispatch',
      web: false,
      android: true,
      notes: 'Web browsers cannot dispatch cellular SMS texts without manual user messaging app interaction.',
    },
    {
      feature: 'Continuous Background GPS Streaming',
      web: false,
      android: true,
      notes: 'Native Android keeps background GPS service alive even when phone is locked.',
    },
    {
      feature: 'AWS S3 Encrypted Audio Archival',
      web: false,
      android: true,
      notes: 'Android app captures 10s ambient microphone recording automatically upon SOS.',
    },
    {
      feature: 'Emergency Contacts Management',
      web: true,
      android: true,
      notes: 'Fully supported on Web & Android; synchronizes over FastAPI & Firebase.',
    },
    {
      feature: 'Emergency Medical Profile (Blood Group / Allergies)',
      web: true,
      android: true,
      notes: 'Fully supported on Web & Android with cloud backup.',
    },
    {
      feature: 'Discreet Fake Call Simulation',
      web: true,
      android: true,
      notes: 'Web provides simulated desktop/mobile browser call; Android provides native full-screen lock simulation.',
    },
    {
      feature: 'Community Incident Reporting',
      web: true,
      android: true,
      notes: 'Fully supported on both platforms with timestamped evidence.',
    },
    {
      feature: 'Emergency Helplines Directory (112, 1091)',
      web: true,
      android: true,
      notes: 'Instant 1-click dial on both platforms.',
    },
  ];

  return (
    <section id="features" className="section features-section">
      <div className="container space-y-12">
        {/* Section Header */}
        <div className="section-header">
          <div className="section-tag">
            <span className="badge badge-brand">Verified Technical Capabilities</span>
          </div>
          <h2>Engineered for Reliability When Everything Else Fails</h2>
          <p>
            Unlike theoretical prototypes, every SafeHer capability is implemented and backed by real mobile,
            cloud, and machine learning components in the official repository.
          </p>
        </div>

        {/* Feature Grid */}
        <div className="features-grid">
          {verifiedFeatures.map((feat) => {
            const Icon = feat.icon;
            return (
              <div key={feat.id} className="card feature-card">
                <div className="feature-card-header">
                  <div 
                    className="feature-icon-box"
                    style={{ backgroundColor: feat.bgColor, color: feat.color }}
                  >
                    <Icon size={24} />
                  </div>
                  <span className="badge" style={{ backgroundColor: feat.bgColor, color: feat.color }}>
                    {feat.highlight}
                  </span>
                </div>

                <div className="feature-category">{feat.category}</div>
                <h3 className="feature-title">{feat.title}</h3>
                <p className="feature-desc">{feat.description}</p>

                {/* Technical Stack Tags */}
                <div className="feature-tech-tags">
                  {feat.techStack.map((tech) => (
                    <span key={tech} className="tech-tag">
                      {tech}
                    </span>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* Platform Capability Comparison Matrix */}
        <div className="p-1 rounded-[2rem] bg-white/5 border border-white/10 shadow-xl">
          <div className="p-6 sm:p-8 rounded-[calc(2rem-0.25rem)] bg-[var(--color-surface)] border border-[var(--color-border)] space-y-6">
            
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[var(--color-border)]">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-primary)]">
                  Architectural Transparency
                </span>
                <h3 className="text-xl font-bold text-[var(--color-text-primary)] mt-0.5">
                  Web Companion vs Android Native App Matrix
                </h3>
                <p className="text-xs text-[var(--color-text-secondary)] mt-1">
                  We never pretend the browser can perform background device hardware actions without native OS permissions.
                </p>
              </div>

              <div className="flex items-center gap-4 text-xs font-semibold">
                <div className="flex items-center gap-1.5 text-blue-500">
                  <Globe className="w-4 h-4" />
                  <span>Web Companion</span>
                </div>
                <div className="flex items-center gap-1.5 text-[var(--color-primary)]">
                  <Smartphone className="w-4 h-4" />
                  <span>Android Native App</span>
                </div>
              </div>
            </div>

            {/* Comparison Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[var(--color-border)] text-[var(--color-text-muted)] text-[11px] uppercase tracking-wider">
                    <th className="py-3 px-4 font-bold">Safety Capability</th>
                    <th className="py-3 px-4 font-bold text-center w-28">Web Companion</th>
                    <th className="py-3 px-4 font-bold text-center w-28">Android Native</th>
                    <th className="py-3 px-4 font-bold hidden md:table-cell">Technical Reason / Requirement</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--color-border)]">
                  {platformMatrix.map((item, idx) => (
                    <tr key={idx} className="hover:bg-[var(--color-surface-hover)] transition-colors">
                      <td className="py-3.5 px-4 font-semibold text-[var(--color-text-primary)]">
                        {item.feature}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        {item.web ? (
                          <span className="inline-flex items-center gap-1 text-emerald-500 font-bold">
                            <CheckCircle2 className="w-4 h-4" />
                            <span className="text-[11px]">Supported</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[var(--color-text-muted)]">
                            <XCircle className="w-4 h-4" />
                            <span className="text-[11px]">Native Only</span>
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span className="inline-flex items-center gap-1 text-emerald-500 font-bold">
                          <CheckCircle2 className="w-4 h-4" />
                          <span className="text-[11px]">Full Native</span>
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-[11px] text-[var(--color-text-secondary)] hidden md:table-cell">
                        {item.notes}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-700 dark:text-amber-300 flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>Need 24/7 locked-screen safety and carrier SMS alerts?</span>
              </div>
              <div className="flex items-center gap-2">
                {onExploreDashboard && (
                  <button
                    onClick={onExploreDashboard}
                    className="py-1.5 px-3 rounded-lg border border-amber-500/30 text-amber-800 dark:text-amber-200 font-bold text-[11px] hover:bg-amber-500/10"
                  >
                    Open Dashboard
                  </button>
                )}
                <a
                  href={APP_CONFIG.downloadUrl}
                  download={APP_CONFIG.apkFilename}
                  className="py-1.5 px-3 rounded-lg bg-[var(--color-primary)] text-white font-bold text-[11px] hover:opacity-90 shrink-0"
                  title={`Download ${APP_CONFIG.apkFilename} (${APP_CONFIG.apkSize})`}
                >
                  Download {APP_CONFIG.apkFilename}
                </a>
              </div>
            </div>

          </div>
        </div>
      </div>
    </section>
  );
};
