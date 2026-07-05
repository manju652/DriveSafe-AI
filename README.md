# 🚗 DriverSafetyAI – AI-Powered Real-Time Driver Safety Monitoring [LIVE :"https://drive-safe-ai-tau.vercel.app/"]

> An AI-powered full-stack web application that monitors driver behavior in real time using computer vision and facial landmark detection to improve road safety by detecting fatigue, distraction, drowsiness, and risky driving behavior.

![Next.js](https://img.shields.io/badge/Next.js-15-black?logo=next.js)
![React](https://img.shields.io/badge/React-19-61DAFB?logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript)
![FastAPI](https://img.shields.io/badge/FastAPI-009688?logo=fastapi)
![Python](https://img.shields.io/badge/Python-3.11-3776AB?logo=python)
![MediaPipe](https://img.shields.io/badge/MediaPipe-AI-orange)
![OpenCV](https://img.shields.io/badge/OpenCV-Computer%20Vision-5C3EE8?logo=opencv)
![Neon](https://img.shields.io/badge/Neon-PostgreSQL-00E599)
![Redis](https://img.shields.io/badge/Redis-DC382D?logo=redis)
![Docker](https://img.shields.io/badge/Docker-2496ED?logo=docker)
![Vercel](https://img.shields.io/badge/Vercel-Frontend-black?logo=vercel)
![Render](https://img.shields.io/badge/Render-Backend-46E3B7)

---

# 📖 Overview

DriverSafetyAI is a full-stack AI-powered driver monitoring platform that uses **MediaPipe Face Mesh** and **OpenCV** to analyze a driver's facial landmarks in real time.

The system continuously monitors driver attention and detects:

- 😴 Drowsiness
- 👁️ Eye Closure
- 🥱 Yawning
- 📱 Mobile Phone Usage
- 🚗 Driver Distraction
- 🧠 Fatigue Level
- 🎯 Head Pose
- 🚨 Real-Time Risk Score

Fleet managers can monitor drivers through a modern dashboard with live analytics and alerts.

---

# ✨ Features

## 🚗 Driver Monitoring

- Real-Time Face Detection
- Eye Aspect Ratio (EAR)
- Mouth Aspect Ratio (MAR)
- Blink Detection
- Yawn Detection
- Head Pose Estimation
- Face Landmark Detection
- Driver Attention Monitoring
- Fatigue Detection
- Live Risk Score Calculation

---

## 📊 Fleet Dashboard

- Live Driver Camera
- Fleet Statistics
- Driver Monitoring Dashboard
- Active Trips
- Live Alerts
- Safety Score
- Driver Management
- Real-Time Metrics

---

## 🔐 Authentication

- JWT Authentication
- Secure Login
- Fleet Manager Registration
- Protected Dashboard Routes

---

## 🤖 AI Detection Features

The application calculates:

- Eye Aspect Ratio (EAR)
- Mouth Aspect Ratio (MAR)
- Blink Count
- PERCLOS
- Head Pitch
- Head Roll
- Head Yaw
- Fatigue Percentage
- Attention Percentage
- Overall Driver Risk Score

---

# 🛠 Tech Stack

## Frontend

- Next.js 15
- React 19
- TypeScript
- Tailwind CSS
- Framer Motion
- Lucide React

---

## Backend

- FastAPI
- Python
- SQLAlchemy
- Alembic
- JWT Authentication
- Uvicorn

---

## AI & Computer Vision

- MediaPipe Face Mesh
- OpenCV
- NumPy

---

## Database

- PostgreSQL
- Neon Serverless PostgreSQL

---

## Cache & Background Services

- Redis

---

## DevOps & Deployment

- Docker
- Docker Compose
- GitHub
- Vercel
- Render

---

# 📂 Project Structure

```text
DriveSafe-AI
│
├── driver-safety-fullstack
│   │
│   ├── frontend
│   │   ├── app
│   │   ├── components
│   │   ├── lib
│   │   ├── public
│   │   ├── package.json
│   │   └── next.config.ts
│   │
│   ├── backend
│   │   ├── app
│   │   ├── ai
│   │   ├── models
│   │   ├── routes
│   │   ├── schemas
│   │   ├── services
│   │   ├── utils
│   │   └── requirements.txt
│   │
│   ├── docker-compose.yml
│   └── README.md
│
└── README.md
```

---

# 🚀 Getting Started

## Clone Repository

```bash
git clone https://github.com/manju652/DriveSafe-AI.git

cd DriveSafe-AI/driver-safety-fullstack
```

---

# 💻 Frontend Setup

```bash
cd frontend

npm install

npm run dev
```

Frontend runs at:

```
http://localhost:3000
```

---

# ⚙ Backend Setup

```bash
cd backend

python -m venv venv
```

Windows

```bash
venv\Scripts\activate
```

Linux / macOS

```bash
source venv/bin/activate
```

Install dependencies

```bash
pip install -r requirements.txt
```

Run FastAPI

```bash
uvicorn app.main:app --reload
```

Backend:

```
http://localhost:8000
```

Swagger Docs:

```
http://localhost:8000/docs
```

---

# 🌐 Environment Variables

## Frontend (.env.local)

```env
NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1
```

Production

```env
NEXT_PUBLIC_API_URL=https://drivesafe-ai-1.onrender.com/api/v1
```

---

## Backend (.env)

```env
DATABASE_URL=postgresql://<neon_database_connection>

SECRET_KEY=your_secret_key

ALGORITHM=HS256

ACCESS_TOKEN_EXPIRE_MINUTES=60

REDIS_URL=redis://localhost:6379
```

---

# ☁️ Cloud Services

| Service | Purpose |
|---------|---------|
| Neon | Serverless PostgreSQL Database |
| Redis | In-Memory Cache & Background Tasks |
| Render | Backend Deployment |
| Vercel | Frontend Deployment |
| GitHub | Version Control |

---

# 🚀 Deployment

## Frontend

Hosted on **Vercel**

```
https://drive-safe-ai-tau.vercel.app
```

---

## Backend

Hosted on **Render**

```
https://drivesafe-ai-1.onrender.com
```

API Documentation

```
https://drivesafe-ai-1.onrender.com/docs
```

---

## Database

Hosted on **Neon Serverless PostgreSQL**

---

# 📸 Screenshots

## Landing Page

<img width="1920" height="1080" alt="image" src="https://github.com/user-attachments/assets/33b8ee82-2dce-4534-8895-d8b6e663b8d9" />


---

## Login Page

<img width="1920" height="1080" alt="image" src="https://github.com/user-attachments/assets/95b7d248-cf1f-441c-8d1c-72602aa73f69" />


---

## Fleet Dashboard

<img width="1920" height="1080" alt="image" src="https://github.com/user-attachments/assets/92ec0ae0-6157-40c7-a666-66dcf29c92a8" />


---

## Live Driver Detection
<img width="1920" height="1080" alt="image" src="https://github.com/user-attachments/assets/7f433387-c80e-4a08-a462-521504d3f2b6" />



---

# 📊 AI Metrics

| Metric | Description |
|---------|-------------|
| EAR | Eye Closure Detection |
| MAR | Mouth Opening Detection |
| Blink Count | Driver Alertness |
| PERCLOS | Fatigue Detection |
| Head Pose | Driver Attention |
| Yawn Count | Drowsiness Detection |
| Risk Score | Overall Driver Safety |

---

# 🔮 Future Enhancements

- Voice Alert System
- WhatsApp Notifications
- SMS Alerts
- Email Notifications
- GPS Tracking
- Driver Trip History
- Analytics Dashboard
- Mobile Application
- Multi-Camera Monitoring
- AI Model Optimization

---

# 👨‍💻 Author

**Manju Namana**

### GitHub

https://github.com/manju652

### LinkedIn

Add your LinkedIn profile link here.

---

# ⭐ Support

If you found this project helpful, please consider giving it a ⭐ on GitHub.

---

# 📄 License

This project is licensed under the MIT License.

---

## ❤️ Built With

- Next.js
- React
- TypeScript
- FastAPI
- Python
- MediaPipe
- OpenCV
- PostgreSQL
- Neon
- Redis
- Docker
- Vercel
- Render
