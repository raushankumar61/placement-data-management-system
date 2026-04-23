# 🎓 PlaceCloud — Cloud-Based Placement Management System

A full-stack, production-ready campus placement management platform built with React, Node.js, Firebase, and Tailwind CSS.

![PlaceCloud](https://img.shields.io/badge/PlaceCloud-v1.0.0-00A3FF?style=flat-square)
![React](https://img.shields.io/badge/React-18-61DAFB?style=flat-square&logo=react)
![Firebase](https://img.shields.io/badge/Firebase-10-FFCA28?style=flat-square&logo=firebase)
![Node.js](https://img.shields.io/badge/Node.js-20-339933?style=flat-square&logo=node.js)

---

## ✨ Features

### Roles & Dashboards
| Role | Key Features |
|------|-------------|
| **Admin / Placement Officer** | Student CRUD, bulk import/export, job management, analytics charts, PDF/Excel reports, notifications, recruiter approval |
| **Student** | Profile builder, filtered job board, one-click apply, application timeline tracker |
| **Recruiter** | Post jobs, filter candidates by CGPA/branch/skills, shortlist & download resumes |
| **Faculty / Coordinator** | Monitor department students, CGPA distribution charts, verification tools |

### Platform
- 🔐 Firebase Auth — Email/Password + Google OAuth (SSO)
- ⚡ Real-time Firestore listeners (no refresh needed)
- 📊 Recharts analytics dashboards
- 📥 Excel/CSV bulk import & export (SheetJS)
- 📄 PDF report generation (jsPDF + autoTable)
- 🎨 Glassmorphism dark UI with Framer Motion animations
- 📱 Fully responsive (mobile-first)
- 🛡️ Role-based access control with Firestore security rules
- 🚀 CI/CD via GitHub Actions → Firebase Hosting + Cloud Run

---

## 📁 Project Structure

```
placement-system/
├── frontend/                 # Vite + React + Tailwind
│   ├── src/
│   │   ├── components/
│   │   │   ├── common/       # Navbar, DashboardLayout
│   │   │   └── landing/      # Hero, Features, Stats, Testimonials
│   │   ├── pages/
│   │   │   ├── Landing.jsx
│   │   │   ├── Login.jsx
│   │   │   ├── Register.jsx
│   │   │   ├── admin/        # Dashboard, Students, Jobs, Applications, Reports, Notifications, Recruiters
│   │   │   ├── student/      # Dashboard, Profile, JobBoard, Applications
│   │   │   ├── recruiter/    # Dashboard, PostJob, Candidates
│   │   │   └── faculty/      # Dashboard
│   │   ├── context/          # AuthContext
│   │   └── services/         # firebase.js, api.js (Axios)
│   └── package.json
│
├── backend/                  # Node.js + Express REST API
│   ├── routes/               # auth, students, jobs, applications, recruiters, reports, notifications
│   ├── middleware/            # Firebase token verification
│   ├── config/               # Firebase Admin SDK
│   ├── server.js
│   ├── Dockerfile
│   └── package.json
│
├── firestore.rules            # Firestore security rules
├── firestore.indexes.json     # Composite indexes
├── firebase.json              # Hosting + Cloud Run rewrite config
├── docker-compose.yml         # Local dev with Docker
├── .github/workflows/         # CI/CD pipeline
└── README.md
```

---

## 🚀 Quick Start (Local Development)

### Prerequisites
- Node.js 18+
- A Firebase project ([create one](https://console.firebase.google.com))

### 1. Clone the repository
```bash
git clone https://github.com/YOUR_USERNAME/placement-system.git
cd placement-system
```

### 2. Configure Firebase (Frontend)
```bash
cd frontend
cp .env.example .env.local
# Edit .env.local with your Firebase project values
```

### 3. Configure Backend
```bash
cd ../backend
cp .env.example .env
# Edit .env with your Firebase Admin SDK credentials
```

### 4. Install dependencies
```bash
# From project root
cd frontend && npm install
cd ../backend && npm install
```

### 5. Run development servers
```bash
# Terminal 1 — Frontend (port 3000)
cd frontend && npm run dev

# Terminal 2 — Backend (port 5000)
cd backend && npm run dev
```

Visit `http://localhost:3000` 🎉

---

## 🔥 Firebase Setup

### Step 1 — Create Firebase Project
1. Go to [Firebase Console](https://console.firebase.google.com)
2. Create a new project
3. Enable **Authentication** → Email/Password + Google
4. Enable **Firestore Database** (Start in production mode)
5. Enable **Storage**

### Step 2 — Get Web Config (Frontend)
1. Project Settings → Your Apps → Add Web App
2. Copy the config values to `frontend/.env.local`

### Step 3 — Get Service Account (Backend)
1. Project Settings → Service Accounts
2. Generate new private key (downloads JSON)
3. Set `FIREBASE_SERVICE_ACCOUNT_KEY` in `backend/.env` as the JSON string:
```bash
FIREBASE_SERVICE_ACCOUNT_KEY='{"type":"service_account","project_id":"..."}'
```

### Step 4 — Deploy Firestore Rules
```bash
npm install -g firebase-tools
firebase login
firebase use YOUR_PROJECT_ID
firebase deploy --only firestore:rules,firestore:indexes
```

---

## ☁️ Cloud Deployment

### Option A — Firebase Hosting + Cloud Run (Recommended)

#### Deploy Backend to Cloud Run
```bash
cd backend
gcloud builds submit --tag gcr.io/YOUR_PROJECT_ID/placement-backend
gcloud run deploy placement-backend \
  --image gcr.io/YOUR_PROJECT_ID/placement-backend \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars "NODE_ENV=production,FIREBASE_PROJECT_ID=YOUR_PROJECT_ID,FIREBASE_SERVICE_ACCOUNT_KEY=..."
```

#### Deploy Frontend to Firebase Hosting
```bash
cd frontend
npm run build
firebase deploy --only hosting
```

### Option B — Render (Simpler alternative)
1. Create account at [render.com](https://render.com)
2. New Web Service → connect your GitHub repo
3. **Root Directory:** `backend`
4. **Build Command:** `npm install`
5. **Start Command:** `node server.js`
6. Set environment variables in Render dashboard
7. For frontend: New Static Site → Root Dir: `frontend`, Build: `npm run build`, Publish: `dist`

### Option C — Docker Compose (Self-hosted)
```bash
docker-compose up --build
```

---

## 🔐 GitHub Actions CI/CD

### Required GitHub Secrets
Set these in **Settings → Secrets → Actions**:

| Secret | Description |
|--------|-------------|
| `GCP_PROJECT_ID` | Your Google Cloud project ID |
| `GCP_SA_KEY` | GCP Service Account JSON (for Cloud Run deploy) |
| `FIREBASE_SERVICE_ACCOUNT` | Firebase service account JSON (for Hosting deploy) |
| `FIREBASE_SERVICE_ACCOUNT_KEY` | Firebase Admin SDK JSON string (runtime) |
| `VITE_FIREBASE_API_KEY` | Firebase web API key |
| `VITE_FIREBASE_AUTH_DOMAIN` | Firebase auth domain |
| `VITE_FIREBASE_PROJECT_ID` | Firebase project ID |
| `VITE_FIREBASE_STORAGE_BUCKET` | Firebase storage bucket |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | Firebase messaging sender ID |
| `VITE_FIREBASE_APP_ID` | Firebase app ID |
| `VITE_API_URL` | Deployed backend URL (e.g., `https://placement-backend-xxx.run.app/api/v1`) |
| `FRONTEND_URL` | Deployed frontend URL |

---

## 🌐 API Reference

Base URL: `/api/v1`

All endpoints require `Authorization: Bearer <Firebase ID Token>` header.

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/auth/verify-token` | Verify Firebase token, return profile |
| GET | `/students` | List all students (admin/faculty) |
| POST | `/students` | Create student (admin) |
| PUT | `/students/:id` | Update student |
| DELETE | `/students/:id` | Delete student (admin) |
| POST | `/students/bulk-import` | Bulk import via Excel/CSV |
| GET | `/jobs` | List all jobs |
| POST | `/jobs` | Post new job (admin/recruiter) |
| PUT | `/jobs/:id` | Update job |
| DELETE | `/jobs/:id` | Delete job |
| GET | `/applications` | List applications |
| POST | `/applications` | Submit application (student) |
| PUT | `/applications/:id/status` | Update status (admin/recruiter) |
| GET | `/reports/placement` | Placement summary report |
| POST | `/notifications/send` | Send notification (admin) |
| GET | `/recruiters` | List recruiters |
| PUT | `/recruiters/:id/verify` | Approve/suspend recruiter |

---

## 🗃️ Firestore Collections

```
users/{uid}            → name, email, role, department, createdAt
students/{uid}         → cgpa, branch, skills[], resumeURL, placementStatus, projects[]
jobs/{jobId}           → title, company, eligibility{}, deadline, postedBy, status
applications/{appId}   → studentId, jobId, status, appliedAt
recruiters/{uid}       → companyName, contactEmail, verified
notifications/{id}     → message, targetRole, sentAt, read[]
interviews/{id}        → studentId, recruiterId, dateTime, venue
```

---

## 🎨 Design System

- **Font:** Syne (headings) + DM Sans (body)
- **Primary Color:** `#00A3FF` (Electric Blue)
- **Accent Color:** `#F5A623` (Gold)
- **Background:** `#050811` (Deep Navy)
- **Cards:** Glassmorphism — `bg-white/5 backdrop-blur-md border-white/10`
- **Animations:** Framer Motion — page transitions, staggered list entrances, counter animations

---

## 📜 License

DSCE © 2025 PlaceCloud
