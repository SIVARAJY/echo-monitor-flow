# 🏥 SepsisGuard v3.0 — Intelligent ICU Monitoring System

> **A next-generation hospital ICU monitoring platform with AI-powered sepsis prediction, real-time vital sign tracking, smart escalation protocols, and clinical decision support tools.**

[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

---

## 🌟 What Makes SepsisGuard Unique

SepsisGuard goes beyond traditional patient monitors. It introduces **5 innovative features** that don't exist in typical hospital monitoring systems:

| Feature | Description |
|---------|-------------|
| 🧠 **AI Sepsis Prediction** | Forecasts patient deterioration 1–6 hours ahead using linear regression on vital trend data |
| 🔔 **Smart Escalation** | Automatically triggers "CODE SEPSIS" red alerts if a patient stays critical for >2 minutes |
| 📊 **Vitals Heatmap** | Real-time matrix showing dangerous vital-to-vital correlations |
| 🏥 **Shift Handoff Report** | Printable clinical summary with AI forecasts for physician shift changes |
| 🌡️ **Radar Comparison** | Side-by-side SVG radar visualization of multiple patients' vitals |
| 👨‍⚕️ **Physician Association** | Filtered views: doctors ONLY see their assigned patients |
| 🎨 **Light Clinical Theme** | High-contrast, modern hospital UI utilizing a soothing cyan (`#caf0f8`) and bold blue (`#0077b6`) palette |

---

## 🚀 Quick Start

### Prerequisites

- **Node.js** v18+
- **MySQL** 8.0+ (MySQL Workbench recommended)
- **npm** or **yarn**

### 1. Clone the Repository

```bash
git clone https://github.com/SIVARAJY/echo-monitor-flow.git
cd echo-monitor-flow
```

### 2. Set Up the Database

Open MySQL Workbench and run the setup script:

```sql
-- File: backend/mysql/setup.sql
SOURCE backend/mysql/setup.sql;
```

Or use the automated setup:

```bash
cd backend/api
npm install
node run-setup.js
```

This creates the `sepsisguard` database with `doctors` and `staff_users` tables, plus seed data.

### 3. Start the Backend API

```bash
cd backend/api
node server.js
```

The API runs on `http://localhost:3001` with endpoints:
- `GET /api/health` — Connection check
- `GET /api/doctors` — List doctors
- `POST /api/auth/login` — Staff authentication
- `POST /api/auth/register` — Staff registration
- `GET /api/staff` — List staff

### 4. Start the Frontend

```bash
cd frontend
npm install
npm run dev
```

The app runs on `http://localhost:5173` (or the port Vite assigns).

### 5. Default Login Credentials

| Role | Staff ID | Access Key |
|------|----------|------------|
| Receptionist | `r0` | `0` |
| Physician | `d0` | `0` |
| Machine Hub | `p0` | `0` |

---

## 🏗️ Architecture

```
echo-monitor-flow/
├── frontend/                  # React + Vite + TypeScript
│   ├── src/
│   │   ├── components/
│   │   │   ├── LoginScreen.tsx          # Role-based login/register
│   │   │   ├── ReceptionDashboard.tsx   # Patient admission & queue
│   │   │   ├── DoctorDashboard.tsx      # Physician portal (main hub)
│   │   │   ├── ProfessionalMonitor.tsx  # Full-screen ICU monitor
│   │   │   ├── MachineHub.tsx           # Vital sign simulation
│   │   │   ├── CorrelationHeatmap.tsx   # 🆕 Vital correlation matrix
│   │   │   ├── HandoffReport.tsx        # 🆕 Printable shift report
│   │   │   └── RadarCompare.tsx         # 🆕 Multi-patient radar
│   │   ├── hooks/
│   │   │   ├── useAuth.ts              # MySQL authentication
│   │   │   ├── usePatients.ts          # Per-doctor MySQL polling & CRUD
│   │   │   ├── useDoctors.ts           # Physician directory management
│   │   │   └── useEscalation.ts        # Smart escalation timers
│   │   └── lib/
│   │       └── sepsisEngine.ts         # Scoring + AI Deterioration Engine
│   └── package.json
├── backend/
│   ├── api/
│   │   ├── server.js                   # Express API server
│   │   └── run-setup.js                # DB setup script
│   └── mysql/
│       └── setup.sql                   # Database schema & seeds
└── README.md
```

---

## 📋 Feature Details

### 🧠 AI Sepsis Prediction Timeline

Located in the **Physician Portal**, every patient card now shows:
- **AI FORECAST** bar with trend direction (improving/stable/worsening)
- **1-hour prediction**: Projected risk score and level
- **4-hour prediction**: Projected risk score and level
- **Time to critical**: Countdown showing estimated hours until CRITICAL threshold
- **Confidence score**: Based on R² of the linear regression model

The prediction uses real-time linear regression on the patient's `trendHistory` array, analyzing score changes per hour to extrapolate future risk.

---

### 🔔 Smart Escalation Protocol Engine

When a patient remains in **danger** or **critical** status for more than **2 minutes**:

1. **Countdown timer** appears on the patient card showing seconds until escalation
2. **CODE SEPSIS overlay** covers the entire screen with a red alert
3. **Browser push notification** is sent (with user permission)
4. **Escalation log** tracks all events with timestamps
5. Physicians can **acknowledge** individual patients or all at once

The escalation resets when the patient recovers (risk level drops below danger).

---

### 📊 Vitals Correlation Heatmap

Visible in the **Professional Monitor** (full-screen patient view):

- Canvas-rendered 6×6 matrix comparing all vital signs
- **Color coding**: Green → normal, Yellow → warning, Red → dangerous correlation
- **Special patterns detected**:
  - HR↑ + BP↓ → Septic shock signature
  - SpO2↓ + RR↑ → Respiratory failure
- **Live updating** as vitals change in real-time

---

### 🏥 Shift Handoff Report Generator

Click the **"Handoff"** button in the Physician Portal header:

- **Hospital-branded header** with timestamp
- **Summary statistics**: Total active patients, critical/danger counts, peak risk score
- **Per-patient cards** with:
  - Current vitals snapshot with 6-parameter grid
  - Sparkline trend graphs
  - AI forecast (1h and 4h predictions)
  - Active sepsis flags
  - Attending physician info
- **Print-optimized CSS** — renders cleanly on paper with `Ctrl+P`
- **Clinical footer** with generation timestamp and disclaimer

---

### 🌡️ Multi-Patient Radar Chart Comparison

Click the **"Compare"** button in the Physician Portal header:

- **Patient selector sidebar** — choose up to 4 patients
- **SVG radar chart** with 6 axes (HR, SYS, DIA, RR, SpO2, Temp)
- **Normalized values** so different scales are comparable
- **Normal zone overlay** (dashed green polygon)
- **Color-coded overlays** — each patient gets a distinct color
- **Dot markers** at each vital vertex for precision reading
- **Legend** with patient names, colors, and risk scores

---

## 🔐 Role-Based Access

| Role | Dashboard | Capabilities |
|------|-----------|-------------|
| **Receptionist** | Reception | Admit patients, view queue, discharge patients |
| **Physician** | Physician Portal | Monitor all patients, AI predictions, escalation alerts, handoff reports, radar comparison, full-screen monitor |
| **Machine Hub** | Machine Hub | Simulate vital changes, apply clinical scenarios |

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, TypeScript, Vite, Tailwind CSS |
| UI Components | Radix UI, shadcn/ui, Lucide Icons |
| State Management | React hooks, TanStack React Query |
| Backend API | Express.js, MySQL2 |
| Database | MySQL 8.0, Supabase (realtime sync) |
| Charting | Custom Canvas/SVG rendering |
| Notifications | Web Speech API, Web Notifications API |

---

## 📄 License

MIT License — see [LICENSE](LICENSE) for details.

---

**Made with ❤️ by SIVARAJY** | [GitHub](https://github.com/SIVARAJY/echo-monitor-flow)
