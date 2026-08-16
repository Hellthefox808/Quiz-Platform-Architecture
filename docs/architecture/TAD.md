# Technical Architecture Document (TAD) — ApexAssess

## 1. System Overview

ApexAssess is an enterprise-grade Online Assessment & Quiz Management Platform engineered as a modular monolith. It provides high transactional integrity, immutable assessment versioning, server-authoritative timers, and automated OWASP API Security defenses.

---

## 2. Technical Stack Matrix

- **Backend**: Python 3.11+ / FastAPI, SQLAlchemy 2.0 (Async), Pydantic v2, SlowAPI, PyJWT, Bcrypt.
- **Frontend**: React 19 + TypeScript + Tailwind CSS v4 + Vite + Lucide Icons + Recharts.
- **Database**: PostgreSQL 16+ / SQLite (Async aiosqlite).
- **Deployment**: Docker, Docker Compose, Nginx Reverse Proxy.
- **Testing**: Pytest Asyncio, HTTPX AsyncClient.

---

## 3. Core Architectural Modules

```text
backend/app/
├── api/v1/          # Versioned REST Routers (auth, users, categories, quizzes, questions, attempts, analytics, audit, certificates)
├── core/            # Config, Security, Database, Exceptions, Correlation Middleware
├── models/          # SQLAlchemy Domain Models (User, Quiz, QuizVersion, Question, Attempt, Result, AuditLog)
├── schemas/         # Pydantic Request/Response DTOs
├── services/        # Pure Business Logic (Scoring, Assessment Engine, Auth, Quiz, Analytics, Leaderboard)
└── main.py          # FastAPI Gateway Assembly
```

---

## 4. Key Invariants & Guarantees

1. **Server as Single Source of Truth**: Roles, timer countdowns, scores, pass/fail status, and answer correctness are computed and enforced solely on the backend.
2. **Immutable Versioning**: Running exams execute against a frozen snapshot of questions and options (`AttemptQuestion`), immune to admin edits on live quizzes.
3. **OWASP API Security Top 10**: Complete mitigation of BOLA (API1), Broken Authentication (API2), Mass Assignment (API3), Resource Consumption (API4), and BFLA (API5).
4. **Idempotency & Concurrency Safety**: Assessment submissions are transactional and idempotent, returning consistent cached results under duplicate or concurrent calls.
5. **Real-Time Synchronized Autosave**: Debounced `PATCH` requests persist student choices with full state synchronization.
