# Driver Safety AI — Full Stack Monorepo

Real-Time Driver Safety & Health Monitoring.
Next.js 15 frontend + FastAPI backend in one repo.

```
driver-safety-fullstack/
├── frontend/          ← Next.js 15, Tailwind v4, Framer Motion
│   ├── app/
│   │   ├── page.tsx          Landing page
│   │   ├── dashboard/page.tsx Live fleet dashboard (connects to backend)
│   │   └── globals.css
│   ├── components/    All landing page sections
│   └── lib/
│       └── api.ts     Typed API client + WebSocket helpers
├── backend/           ← FastAPI, SQLAlchemy, Celery, Redis
│   ├── app/
│   │   ├── main.py           FastAPI entry point
│   │   ├── api/v1/endpoints/ auth, core, analytics
│   │   ├── services/         DetectionEngine, WebSocket manager
│   │   └── ...
│   └── tests/
├── docker-compose.yml     Full stack (one command)
├── docker-compose.dev.yml DB + Redis only (for native dev)
└── .env.example
```

---

## Quick Start — Docker (recommended)

```bash
# 1. Clone / extract the project
cd driver-safety-fullstack

# 2. Copy env (defaults work for local Docker)
cp .env.example .env

# 3. Start everything
docker compose up --build
```

| URL | Service |
|-----|---------|
| http://localhost:3000 | Landing page |
| http://localhost:3000/dashboard | Fleet dashboard (login required) |
| http://localhost:8000/docs | API explorer (Swagger UI) |
| http://localhost:8000/health | Backend health check |

---

## Quick Start — Native (faster hot-reload)

### 1. Databases via Docker
```bash
docker compose -f docker-compose.dev.yml up -d
# Starts only postgres:5432 + redis:6379
```

### 2. Backend
```bash
cd backend
python -m venv venv
source venv/bin/activate          # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env              # edit SECRET_KEY if you like

uvicorn app.main:app --reload --port 8000
```

### 3. Celery worker (optional, needed for background tasks)
```bash
# In a new terminal (same venv)
cd backend
celery -A app.worker worker --loglevel=info
```

### 4. Frontend
```bash
cd frontend
npm install
npm run dev          # → http://localhost:3000
```

---

## First login

1. Open http://localhost:8000/docs
2. `POST /api/v1/auth/register` with your email + password
3. Open http://localhost:3000/dashboard → sign in

---

## Using the npm scripts (from root)

```bash
npm run dev          # start Next.js dev server
npm run docker:up    # docker compose up --build
npm run docker:down  # docker compose down
npm run docker:logs  # follow all container logs
npm run test:be      # pytest (backend must have venv active)
```

---

## Environment variables

All vars live in `.env` at the root. The docker-compose uses
hardcoded dev defaults so you don't need `.env` just for Docker.

For native dev, copy `.env.example` → `.env` and set:

| Variable | What to set |
|----------|-------------|
| `SECRET_KEY` | 64 random chars (`python3 -c "import secrets; print(secrets.token_hex(32))"`) |
| `DATABASE_URL` | Keep default for local |
| `REDIS_URL` | Keep default for local |
| `NEXT_PUBLIC_API_URL` | `http://localhost:8000/api/v1` |

---

## Project URLs at a glance

```
Landing page      → http://localhost:3000
Fleet dashboard   → http://localhost:3000/dashboard
API root          → http://localhost:8000
Swagger UI        → http://localhost:8000/docs
ReDoc             → http://localhost:8000/redoc
Health            → http://localhost:8000/health
WS status         → http://localhost:8000/health/ws
```
