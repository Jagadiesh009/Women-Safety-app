/**
 * SafeHer Central Configuration
 * Contains verified URLs, APK asset links, hotlines, and metadata.
 */

const VERIFIED_RELEASE_APK_URL = 'https://github.com/JAGADIESH009/Women-Safety-app/releases/download/v1.1/safeher.v1.1.apk';
const CONFIGURED_DOWNLOAD_URL = import.meta.env.VITE_APK_DOWNLOAD_URL;
const ACTIVE_DOWNLOAD_URL = (CONFIGURED_DOWNLOAD_URL && !CONFIGURED_DOWNLOAD_URL.includes('/latest/download/SafeHer.apk'))
  ? CONFIGURED_DOWNLOAD_URL 
  : VERIFIED_RELEASE_APK_URL;

export const APP_CONFIG = {
  name: 'SafeHer',
  tagline: "Women's Safety Application Using AI, IoT & Cloud Computing",
  version: '1.1',
  apkSize: '34.6 MB',
  apkFilename: 'safeher.v1.1.apk',
  minAndroidVersion: 'Android 8.0 (Oreo) or higher',
  releaseDate: 'October 2026',
  
  // Single centrally configured download URL
  downloadUrl: ACTIVE_DOWNLOAD_URL,
  apkDownloadUrl: ACTIVE_DOWNLOAD_URL,
  
  // Official Links
  githubRepoUrl: import.meta.env.VITE_GITHUB_REPO_URL || 'https://github.com/JAGADIESH009/Women-Safety-app',
  supportEmail: import.meta.env.VITE_SUPPORT_EMAIL || 'support@safeher.org',

  // Verified Emergency Numbers
  emergencyHotlines: [
    { name: 'National Emergency Number', number: '112', desc: 'Unified pan-India emergency response' },
    { name: 'Women Helpline', number: '1091', desc: 'Dedicated 24/7 women distress assistance' },
    { name: 'Police Control Room', number: '100', desc: 'Direct immediate police dispatch' },
    { name: 'Domestic Abuse Helpline', number: '181', desc: 'Toll-free women in distress counseling & rescue' },
    { name: 'Ambulance & Medical', number: '108', desc: 'Emergency medical services' },
    { name: 'Childline Helpdesk', number: '1098', desc: 'Child protection & rescue assistance' },
  ],

  // Core Pillars verified in the codebase
  techPillars: [
    {
      title: 'Real-Time Edge SOS',
      subtitle: 'Zero latency trigger',
      description: 'One-tap emergency siren and instant alert trigger with active audio recording and live GPS telemetry broadcast.',
      tag: 'Hardware & Mobile',
    },
    {
      title: 'Scikit-Learn AI Scoring',
      subtitle: 'FastAPI AI Engine',
      description: 'Machine learning risk evaluation assessing route vulnerability, time-of-day variables, and situational readiness.',
      tag: 'Machine Learning',
    },
    {
      title: 'IoT & MQTT Connectivity',
      subtitle: 'Wearable Hardware Bridge',
      description: 'Ultra-low power MQTT broker communication enabling discreet Bluetooth panic pendants and wearable triggers.',
      tag: 'IoT Infrastructure',
    },
    {
      title: 'Cloud & Evidence Archival',
      subtitle: 'AWS S3 & PostgreSQL',
      description: 'Tamper-resistant encrypted evidence storage on AWS S3 with instant Redis caching and Firebase Cloud Messaging.',
      tag: 'Cloud Computing',
    },
  ]
};
