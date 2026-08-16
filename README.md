# ApexAssess — Enterprise Quiz Management & Online Assessment Platform

[![FastAPI](https://img.shields.io/badge/FastAPI-0.115+-009688.svg?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![React 19](https://img.shields.io/badge/React-19.0-61DAFB.svg?logo=react&logoColor=black)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6.svg?logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Tailwind CSS v4](https://img.shields.io/badge/Tailwind_CSS-v4.0-38B2AC.svg?logo=tailwind-css&logoColor=white)](https://tailwindcss.com)
[![Pytest](https://img.shields.io/badge/pytest-passing-brightgreen.svg?logo=pytest&logoColor=white)](https://pytest.org)
[![Security](https://img.shields.io/badge/OWASP_API_Top_10-Compliant-blue.svg?logo=owasp&logoColor=white)](https://owasp.org)

ApexAssess is a production-grade, enterprise-ready Quiz Management and Online Assessment Platform architected for academic institutions, certification bodies, and technical recruitment workflows.

---

## 🌟 Key Architecture Capabilities

- **Immutable Assessment Versioning**: When an assessment is published or edited, snapshot versions (`QuizVersion`) are preserved so ongoing and past attempts are never corrupted by real-time question edits.
- **Server-Authoritative Clock & Timer**: Exam durations and expirations are strictly enforced by the backend server. Modifying local client clock time has zero impact.
- **Answer Key Protection**: Student attempt snapshots omit correct answer flags (`is_correct`). Scoring and grade evaluations occur entirely server-side.
- **Real-Time Autosave Engine**: Choices are continuously synchronized with debounced patch endpoints, ensuring zero data loss during network hiccups.
- **Automated Anti-Cheating & Integrity**: Idempotent submissions, single-use SHA-256 hashed password reset tokens, BOLA/IDOR query validation, and role-based access control (RBAC).
- **Verifiable Digital Credentials**: Automatically issues cryptographic certificate codes (`CERT-XXXX-XXXX`) with an online verification portal.
- **Deep Analytics & Item Analysis**: Statistical difficulty index calculations, score distributions, category mastery, and multi-factor leaderboards.

---

## ⚡ Quick Start (Local Development)

### 1. Prerequisites
- Python 3.11+ / uv
- Node.js 20+ & npm

### 2. Backend Setup
```bash
# Navigate to backend directory
cd backend

# Create and activate virtual environment
python -m venv .venv
# On Windows:
.venv\Scripts\activate
# On Linux/macOS:
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Seed realistic database (Categories, Quizzes, Questions, Historical Attempts, Admin & Students)
python -m backend.app.seed

# Start API Server (Runs at http://localhost:8000)
uvicorn backend.app.main:app --reload --port 8000
```

### 3. Frontend Setup
```bash
# Navigate to frontend directory
cd frontend

# Install dependencies
npm install

# Start Vite Development Server (Runs at http://localhost:5173)
npm run dev
```

---

## 🔐 Demo Credentials

| Role | Email | Password |
| :--- | :--- | :--- |
| **Administrator** | `admin@assessment.io` | `Admin@12345` |
| **Student** | `alice@student.io` | `Student@12345` |
| **Student** | `bob@student.io` | `Student@12345` |

*(Quick 1-click Demo Login buttons are also available on the login page).*

---

## 🐳 Docker Production Deployment

```bash
# Build and launch complete container stack (Backend, Frontend, PostgreSQL)
docker-compose up --build -d
```
Access the application at `http://localhost`.

---

## 🧪 Automated Testing

Execute the complete asynchronous backend test suite with Pytest:
```bash
pytest backend/tests -v
```

Execute frontend type-checking and production bundle compilation:
```bash
cd frontend && npm run build
```

---

## 📚 Technical Documentation Suite

- [`ARCHITECTURE.md`](file:///d:/QWERTYUIOP/ARCHITECTURE.md) — Domain architecture, state machines, and sequence diagrams.
- [`DATABASE.md`](file:///d:/QWERTYUIOP/DATABASE.md) — Database schema, relationships, indexes, and constraints.
- [`API.md`](file:///d:/QWERTYUIOP/API.md) — Full REST API specifications and request/response models.
- [`SECURITY.md`](file:///d:/QWERTYUIOP/SECURITY.md) — OWASP Top 10 mitigations, BOLA defenses, and security audits.
- [`TESTING.md`](file:///d:/QWERTYUIOP/TESTING.md) — Test strategy and validation test cases.
- [`DEPLOYMENT.md`](file:///d:/QWERTYUIOP/DEPLOYMENT.md) — Containerization, orchestration, and monitoring guide.
- [`ENVIRONMENT.md`](file:///d:/QWERTYUIOP/ENVIRONMENT.md) — Configuration parameters and environment variables.
- [`CONTRIBUTING.md`](file:///d:/QWERTYUIOP/CONTRIBUTING.md) — Engineering standards and workflow guidelines.
