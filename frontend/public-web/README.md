# SafeHer Public Website

The official public website and companion portal for **SafeHer — Women's Safety Application Using AI, IoT & Cloud Computing**.

This frontend is independently configured and deployed from the Safety Operations Center (SOC) admin dashboard, providing direct Android APK releases, interactive safety simulation, architecture overview, and support intake.

---

## Architecture & Tech Stack

- **Framework**: React 19 + TypeScript + Vite
- **Styling**: Vanilla CSS with SafeHer Signature Theme Tokens (Burgundy / Rose / Dark & Light mode)
- **Icons**: Lucide React
- **Authentication**: Firebase Web Authentication (Google Sign-In)
- **Routing & Deployment**: SPA Rewrites via `vercel.json` for independent Vercel hosting

---

## Key Features

1. **Direct Android APK Download**:
   - Centrally configured in `src/config/appConfig.ts`:
     `https://github.com/JAGADIESH009/Women-Safety-app/releases/download/v1.1/safeher.v1.1.apk`
   - Direct download links near the Hero and in the dedicated Download section without intermediate repository or dashboard hops.
   - Comprehensive release specifications (v1.1, 34.6 MB, Android 8.0+).
   - 4-step installation guide with clear explanation of Android browser install permissions.

2. **Interactive Safety Sandbox**:
   - **Emergency SOS Dispatch**: Live simulation of the 3-second alert countdown, evidence recording audio wave visualizer, and simulated SMS dispatch payload.
   - **Discreet Fake Call**: Interactive simulation of the native Android discreet caller escape screen with timer and answer/decline controls.
   - **Safety Readiness Engine**: Interactive compliance calculator evaluating identity authentication, GPS availability, and trusted contacts configuration.

3. **Verified System Capabilities**:
   - Describes only verified technical features implemented in the SafeHer codebase: FastAPI backend, scikit-learn predictive risk model, MQTT panic pendants, and AWS S3 evidence archival.

4. **Support Ticket & Contact Gateway**:
   - Form validation with anti-spam honeypot.
   - Generates local tracking reference IDs (`SH-XXXXXX`).
   - Secure mailto dispatch to the official maintainer inbox (`support@safeher.org`).

5. **Firebase Authentication**:
   - Google Sign-In with popup and graceful handling of authorized domains.
   - Zero exposure of server secrets or administrative credentials.

---

## Environment Variables

Copy `.env.example` to `.env` and fill in any customized values:

```bash
# Direct Verified Android APK Download URL
VITE_APK_DOWNLOAD_URL=https://github.com/JAGADIESH009/Women-Safety-app/releases/latest/download/SafeHer.apk

# Firebase Web Client Configuration
VITE_FIREBASE_API_KEY=AIzaSyC51tyvDN_2xKimU_PAbTd2GyZyiGydsl4
VITE_FIREBASE_AUTH_DOMAIN=women-protection-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=women-protection-project
VITE_FIREBASE_STORAGE_BUCKET=women-protection-project.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=592378767800
VITE_FIREBASE_APP_ID=1:592378767800:web:69dd4029293212612e474d
VITE_FIREBASE_MEASUREMENT_ID=G-WGX52916TY

# Support & Portal Links
VITE_ADMIN_PORTAL_URL=https://safeher-admin-panel.vercel.app/
VITE_GITHUB_REPO_URL=https://github.com/JAGADIESH009/Women-Safety-app
VITE_SUPPORT_EMAIL=support@safeher.org
```

---

## Local Development

```bash
cd frontend/public-web
npm install
npm run dev
```

The development server will start at `http://localhost:5173/`.

### Production Build

```bash
npm run build
npm run preview
```

---

## Vercel Deployment

This project is configured to deploy independently from `frontend/admin/`.
- **Root Directory**: `frontend/public-web`
- **Framework Preset**: Vite
- **Build Command**: `npm run build`
- **Output Directory**: `dist`
