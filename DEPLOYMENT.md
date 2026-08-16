# Deployment & Operations Guide

ApexAssess is designed for containerized deployment across cloud environments (AWS ECS/EKS, GCP Cloud Run/GKE, Azure App Service, DigitalOcean, or bare metal).

---

## 1. Docker Compose Production Setup

ApexAssess provides a production-grade multi-container stack:

```bash
# 1. Clone repository
git clone <repository_url>
cd assessment-platform

# 2. Configure production environment variables
cp .env.example .env
# Edit .env with your production SECRET_KEY and PostgreSQL credentials

# 3. Build and launch services
docker-compose up --build -d

# 4. Initialize database seed data
docker-compose exec backend python -m backend.app.seed

# 5. Check container health
docker-compose ps
```

---

## 2. Service Architecture

- **`assessment_web` (Port 80)**: Nginx reverse proxy serving the compiled React 19 SPA assets and proxying `/api/` traffic to the backend.
- **`assessment_api` (Port 8000)**: Asynchronous FastAPI instance powered by Uvicorn workers.
- **`assessment_db` (Port 5432)**: PostgreSQL 16+ database with persistent volume storage.

---

## 3. Health & Liveness Checks

ApexAssess exposes standard observability endpoints:
- `GET /api/v1/health`: Basic liveness probe (returns `{ "status": "ok" }`).
- `GET /api/v1/ready`: Readiness probe verifying database connection pool health.

Configure container orchestrator probes:
```yaml
livenessProbe:
  httpGet:
    path: /api/v1/health
    port: 8000
  initialDelaySeconds: 5
  periodSeconds: 10

readinessProbe:
  httpGet:
    path: /api/v1/ready
    port: 8000
  initialDelaySeconds: 5
  periodSeconds: 5
```
