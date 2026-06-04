# AI Smart Campus Attendance & Analytics Platform

A production-level, full-stack AI-powered smart attendance system featuring real-time face recognition, liveness verification, dynamic database synchronization, and automated PDF analytics reports.

---

## 🚀 Key Features

*   **Biometric Scanning**: Facial detection using **YuNet** and recognition using **SFace** ONNX models.
*   **Anti-Spoofing & Liveness**: Checks texture sharpness (Laplacian variance) and illumination contrast (HSV histograms) to block photos/screen spoofs.
*   **Mobile Phone Streamer**: Dynamic QR code pairing that streams smartphone video frames directly to the backend over WebSockets.
*   **Futuristic Glassmorphic UI**: Ultra-premium dark theme dashboard with animated metrics, live logs feed, and unauthorized intruder alerts.
*   **AI Analytics Panels**: Low-attendance flags (&lt;75%), frequent absentee profiles, weekly scanning heatmaps, and trend rate charts.
*   **Automated PDF Reporting**: Generates corporate-grade attendance log reports using ReportLab.

---

## 📂 Project Structure

```
attendence project/
├── backend/
│   ├── app/
│   │   ├── ai/                # face_processor.py (biometrics) & liveness.py (anti-spoof)
│   │   ├── routers/           # students.py, attendance.py, analytics.py, reports.py
│   │   ├── services/          # pdf_generator.py (ReportLab report builder)
│   │   ├── config.py          # Port config and dynamically resolved IP address
│   │   ├── database.py        # SQLAlchemy session manager
│   │   ├── models.py          # SQLAlchemy relational models
│   │   ├── schemas.py         # Pydantic schemas for REST APIs
│   │   └── websocket.py       # Live WebSocket broad-caster
│   ├── data/                  # SQLite DB, registered dataset crops, and unknown alerts
│   ├── models/                # Downloaded ONNX model binaries (YuNet & SFace)
│   ├── requirements.txt       # Backend Python dependencies
│   ├── run.py                 # Backend startup entrypoint
│   └── seed.py                # Database mock data generator
├── frontend/
│   ├── src/
│   │   ├── components/        # GlassCard.jsx, StatCard.jsx, Navbar.jsx
│   │   ├── pages/             # Dashboard, LiveCamera, MobileCamera, ImageUpload, etc.
│   │   ├── services/          # api.js (resolves dynamic host ports)
│   │   ├── index.css          # Cyber gradient theme animations and scanlines
│   │   ├── App.jsx            # React router mapping
│   │   └── main.jsx
│   ├── package.json           # Node dependencies
│   ├── tailwind.config.js     # Cyberpunk glow configs
│   └── vite.config.js         # Port sharing host configuration
├── setup.bat                  # Automated Windows startup script
└── README.md                  # System manual and API document
```

---

## 🗄️ Database Schema

The database supports SQLite for local testing and PostgreSQL/MySQL for production deployments via SQLAlchemy.

### 1. `students` (Profile Metadata)
| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | Integer | Primary Key | Auto-increment identifier |
| `student_id` | String(50) | Unique, Index | Unique student register code (e.g. `STU001`) |
| `name` | String(100) | Not Null | Full student name |
| `email` | String(100) | Unique, Index | Active contact email |
| `phone` | String(20) | Nullable | Optional mobile contact number |
| `enrollment_date` | Date | Default: Today | Timeline enrollment date |
| `status` | String(20) | Default: `Active` | Profile status (`Active` / `Inactive`) |
| `created_at` | DateTime | Default: UTC Now | Log registration time |

### 2. `student_images` (Registered Biometrics)
| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | Integer | Primary Key | Auto-increment identifier |
| `student_id` | String(50) | Foreign Key | Links to `students.student_id` |
| `file_path` | String(255) | Not Null | Path to cropped face file on disk |
| `embedding` | Text | Not Null | JSON-serialized 128D float embedding array |

### 3. `attendance` (Check-In Logs)
| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | Integer | Primary Key | Auto-increment identifier |
| `student_id` | String(50) | Foreign Key | Links to `students.student_id` |
| `date` | Date | Default: Today, Index | Calender date of attendance |
| `timestamp` | DateTime | Default: UTC Now | Clock-in time |
| `status` | String(20) | Default: `PRESENT` | Check-in status (`PRESENT`, `LATE`, `ABSENT`) |
| `method` | String(30) | Default: `LIVE_CAMERA` | Capture device (`LIVE_CAMERA`, `MOBILE_CAMERA`, `UPLOAD`, `MANUAL`) |

### 4. `unknown_logs` (Security Alerts)
| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | Integer | Primary Key | Auto-increment identifier |
| `image_path` | String(255) | Not Null | Snapshot crop file path |
| `timestamp` | DateTime | Default: UTC Now | Detection event time |
| `resolved` | Boolean | Default: `False` | Alert status flag |

---

## 🔌 API Documentation

### Students API
*   `GET /api/students/`: Lists all registered profiles with calculated attendance percentages.
*   `GET /api/students/{student_id}`: Retrieves details, images, and history of a student.
*   `POST /api/students/`: Registers a student (verifies unique email/ID).
*   `PUT /api/students/{student_id}`: Updates name, email, phone, or status.
*   `DELETE /api/students/{student_id}`: Deletes profile, files, and attendance logs.
*   `POST /api/students/{student_id}/images`: Uploads profile photo, runs face detection (asserts single face), extracts and caches embedding.

### Attendance API
*   `GET /api/attendance/logs`: Fetches the latest global attendance logs.
*   `POST /api/attendance/mark`: Forces/overrides a manual attendance log.
*   `POST /api/attendance/upload`: Standard multipart image check-in. Detects all faces, validates liveness, matches embeddings, and returns results.

### Analytics API
*   `GET /api/analytics/stats`: Fetches today's total active, present, absent count, and rates.
*   `GET /api/analytics/alerts`: Lists students below 75% and streaks of consecutive absences.
*   `GET /api/analytics/trends`: Returns daily present/absent rates over the past N days.
*   `GET /api/analytics/heatmap`: Calculates hourly and weekday scan frequencies.
*   `GET /api/analytics/unknown-logs`: Fetches security alarms of unrecognized faces.
*   `POST /api/analytics/unknown-logs/clear`: Wipes the threat intruder tables.

### Reports API
*   `GET /api/reports/download?days=30`: Builds and streams a corporate ReportLab PDF report.

---

## ⚙️ Setup and Installation

### Quick Automated Setup (Windows)
1.  Double-click `setup.bat` in the workspace root.
2.  Wait for dependencies to install and the database to seed.
3.  Follow the console instructions to run.

### Manual Setup
#### 1. Setup Backend
```bash
cd backend
python -m venv venv
# Activate virtual environment
venv\Scripts\activate      # Windows
source venv/bin/activate    # macOS/Linux

# Install packages
pip install -r requirements.txt

# Seed initial database
python seed.py

# Launch server
python run.py
```

#### 2. Setup Frontend
```bash
cd ../frontend
npm install --legacy-peer-deps
npm run dev
```

Open your browser at `http://localhost:5173`.

---

## 📱 Mobile Phone Camera Setup
1.  Verify that your computer and mobile phone are connected to the **same Wi-Fi network**.
2.  Open the Admin Dashboard on your laptop.
3.  Scan the displayed **QR Code** with your smartphone.
4.  Open the link, click **Start Capture**, and position your phone. The streamed frames are processed on your laptop backend, and the attendance logs are updated on your dashboard in real-time.

---

## ☁️ Deployment Instructions

### 1. Deploying Backend on Render
1.  Create a Render account and link your GitHub repository.
2.  Create a new **Web Service**.
3.  Configure parameters:
    *   **Runtime**: `Python`
    *   **Build Command**: `pip install -r backend/requirements.txt`
    *   **Start Command**: `python backend/run.py` (ensure port is read from env variable or defaults)
4.  Add environment variables in Render settings:
    *   `DATABASE_URL`: Set your production PostgreSQL/MySQL connection string (e.g. `postgresql://user:pass@host/db`). If omitted, it defaults to a local SQLite database in Render persistent disks.
    *   `PORT`: `8000` (Render will override as needed).
5.  Deploy.

### 2. Deploying Frontend on Vercel
1.  Create a Vercel account.
2.  Create a new project pointing to your GitHub repository.
3.  Configure the root directory to `frontend`.
4.  Configure parameters:
    *   **Framework Preset**: `Vite`
    *   **Build Command**: `npm run build`
    *   **Output Directory**: `dist`
5.  Deploy.
