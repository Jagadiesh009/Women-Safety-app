# Smart Women Security Application Using AI, IoT, and Cloud

![Flutter](https://img.shields.io/badge/Mobile-Flutter-blue)
![FastAPI](https://img.shields.io/badge/Backend-FastAPI-green)
![Database](https://img.shields.io/badge/Database-PostgreSQL-blue)
![Cloud](https://img.shields.io/badge/Cloud-Docker%20%7C%20AWS%20S3-orange)
![Status](https://img.shields.io/badge/Status-Production%20MVP-success)

A production-quality MVP for a women's safety platform built using AI, IoT, and cloud computing. The system provides emergency SOS functionality, live GPS tracking, push notifications, evidence storage, and a dedicated admin dashboard for monitoring and responding to incidents.

This project prioritises reliability, security, and core SOS functionality over mock AI features.

## 👥 Authors and Contributors

**Project Contributors**

- [Jagadiesh009](https://github.com/Jagadiesh009) — GitHub Profile
- [jagadiesh7003](https://github.com/jagadiesh7003) — GitHub Profile
- [Bhagyaashreee](https://github.com/Bhagyaashreee) — GitHub Profile

**Repository:** [Jagadiesh009/Women-Safety-app](https://github.com/Jagadiesh009/Women-Safety-app)

## 📖 Project Overview

Personal safety emergencies demand fast, dependable communication. Delays in alerting trusted contacts or authorities, unreliable location sharing, and a lack of verifiable evidence can all reduce the effectiveness of a response.

This project implements a complete safety platform in which a user can trigger an SOS alert from a mobile app, share live location data, and have the incident visible to administrators through a dedicated dashboard.

### Project Objectives

- Provide a reliable one-tap SOS emergency workflow.
- Track and transmit GPS location securely during active incidents.
- Notify relevant parties through push notifications.
- Store incident evidence in cloud storage.
- Provide an admin dashboard for incident monitoring and response.
- Apply a risk-scoring model using machine learning.
- Protect user data through secure authentication and privacy-aware design.
- Present only real data, never dummy or mocked values as real statistics.

### Key Features

- Emergency SOS alerts with GPS tracking.
- Cross-platform Flutter mobile application.
- Modular FastAPI backend (modular monolith).
- Real-time updates using Redis and WebSockets.
- Push notifications through Firebase Cloud Messaging.
- AI-based risk scoring using Scikit-learn.
- Cloud evidence storage on AWS S3.
- Dedicated admin dashboard.
- Dockerised infrastructure for PostgreSQL and Redis.
- Secure authentication using bcrypt and JWT.

## 🏗️ System Architecture

The system follows a layered architecture, with each component responsible for a distinct part of the platform.

```text
┌─────────────────────────────────────────────┐
│                   Users                     │
│        Flutter Mobile Application           │
└──────────────────────┬──────────────────────┘
                       ▼
┌─────────────────────────────────────────────┐
│            Authentication Layer             │
│         bcrypt Hashing │ JWT Tokens         │
└──────────────────────┬──────────────────────┘
                       ▼
┌─────────────────────────────────────────────┐
│       FastAPI Backend (Modular Monolith)    │
│  Auth │ Emergencies │ GPS Tracking │ Alerts │
└───────┬───────────────┬──────────────┬──────┘
        ▼               ▼              ▼
┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│  PostgreSQL  │ │    Redis     │ │   AWS S3     │
│  Persistent  │ │ Caching and  │ │   Evidence   │
│  Data        │ │ WebSockets   │ │   Storage    │
└──────────────┘ └──────────────┘ └──────────────┘
        ▼               ▼
┌─────────────────────────────────────────────┐
│           Notification and Response         │
│   Firebase Cloud Messaging │ Admin Dashboard│
└─────────────────────────────────────────────┘
```

## ⚙️ System Components

The platform is organised into three main parts.

### 1. Mobile Frontend

**Location:** `frontend/`

A Flutter application used by end users. It handles user registration and login, SOS triggering, GPS location sharing, and receiving notifications through Firebase Cloud Messaging.

### 2. Backend Services

**Location:** `backend/`

A FastAPI modular monolith that handles:

- User authentication and authorisation.
- Emergency creation and management.
- GPS tracking and incident association.
- Notification dispatch.
- Real-time communication through WebSockets.
- AI risk scoring.

### 3. Infrastructure

**Files:** `docker-compose.yml`, `render.yaml`, `.env.example`

PostgreSQL stores persistent data, Redis supports caching and real-time WebSocket communication, and Docker provides containerisation. AWS S3 is used for evidence storage.

### 4. Admin Dashboard

A dedicated web dashboard for administrators to monitor incidents and respond to emergencies. The repository records a production deployment named `safeher-admin-dashboard`.

## 🛠️ Technologies and Requirements

| Component | Technology |
|---|---|
| Mobile application | Flutter, Dart |
| Push notifications | Firebase Cloud Messaging |
| Backend framework | Python, FastAPI |
| ORM | SQLAlchemy |
| Database | PostgreSQL |
| Caching and real-time | Redis, WebSockets |
| AI / ML | Scikit-learn (risk scoring model) |
| Authentication | bcrypt, JWT |
| Containerisation | Docker, Docker Compose |
| Evidence storage | AWS S3 |

### Language Composition

| Language | Share |
|---|---|
| JavaScript | 38.2% |
| TypeScript | 27.8% |
| Python | 17.6% |
| HTML | 15.5% |
| CSS | 0.7% |
| Kotlin | 0.1% |

## 📁 Repository Directory Structure

```text
Women-Safety-app/
│
├── README.md
├── contributers.md
├── docker-compose.yml
├── render.yaml
├── .env.example
├── read_db.py
│
├── backend/          # FastAPI services and core logic
├── frontend/         # Flutter mobile application
├── docs/             # Technical documentation
└── .agents/          # Agent configuration
```

| Folder | Purpose |
|---|---|
| `backend/` | FastAPI services and core logic |
| `frontend/mobile/` | Flutter mobile application |
| `docs/` | Technical documentation |

## 🚀 How to Run the Project

### Prerequisites

- Docker and Docker Compose
- Python 3
- Flutter SDK

### Step 1 — Clone the repository

```bash
git clone https://github.com/Jagadiesh009/Women-Safety-app.git
cd Women-Safety-app
```

### Step 2 — Configure environment variables

Copy `.env.example` to `.env` and fill in the actual values.

```bash
cp .env.example .env
```

### Step 3 — Start the infrastructure (Docker)

Ensure Docker is running, then execute:

```bash
docker-compose up -d
```

This starts PostgreSQL and Redis.

### Step 4 — Run the backend

```bash
cd backend
python -m venv venv
venv\Scripts\activate        # Windows
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

On macOS or Linux, activate the virtual environment with `source venv/bin/activate`.

### Step 5 — Run the mobile frontend

Make sure Flutter is installed.

```bash
cd frontend/mobile
flutter pub get
flutter run
```

## 🔐 Security and Privacy Model

- Passwords are hashed using **bcrypt**.
- **JWT** tokens are used for authentication.
- GPS data is transmitted securely and stored with association to active incidents.
- No dummy or mocked data is presented as real statistics.
- Secrets are kept in environment variables and are never committed (`.env` is git-ignored).

## 🧠 AI Risk Scoring

A Scikit-learn model is used for risk scoring. The project deliberately favours dependable SOS functionality over decorative AI features, so risk scores should be treated as a supporting signal and not as a replacement for emergency response.

## 🎯 Applications

- Personal safety and emergency alerting.
- Live location sharing during incidents.
- Campus, workplace, and community safety programmes.
- Administrative monitoring of safety incidents.
- Academic and research demonstrations of AI, IoT, and cloud-based safety systems.

## ⚠️ Limitations

- The application depends on network connectivity and GPS availability.
- Location accuracy depends on the user's device and environment.
- Risk scoring is only as reliable as its training data; validate it before operational use.
- Push notification delivery depends on Firebase and device settings.
- This is an MVP and should undergo security review and load testing before large-scale deployment.
- It is not a replacement for official emergency services.

## 🔮 Future Enhancements

- Integration with dedicated IoT wearable devices.
- Direct integration with local emergency services.
- Offline SOS fallback (for example, SMS).
- Improved and validated risk-scoring models.
- Expanded analytics in the admin dashboard.
- Automated testing and CI/CD pipelines.

## 📚 References and Technical Background

The project uses established concepts and technologies from:

- Mobile application development with Flutter.
- RESTful APIs and WebSockets with FastAPI.
- Relational data modelling with PostgreSQL and SQLAlchemy.
- Token-based authentication with JWT and bcrypt password hashing.
- Machine learning with Scikit-learn.
- Containerisation with Docker and cloud storage with AWS S3.
