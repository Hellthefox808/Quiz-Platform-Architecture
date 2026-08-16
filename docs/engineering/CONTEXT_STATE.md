# Context State — ApexAssess Assessment Platform

## Current System Status
- **System**: ApexAssess Online Assessment Platform
- **Architecture**: Modular Monolith (FastAPI + React 19 + TypeScript + Tailwind CSS v4 + PostgreSQL/SQLite)
- **Status**: Production-Ready, Tested & Verified
- **Backend**: FastAPI with async SQLAlchemy 2.0, Pydantic v2, SlowAPI, PyJWT, Bcrypt
- **Frontend**: React 19 + TypeScript + Vite + Tailwind CSS v4 + Lucide Icons + Recharts
- **Database**: PostgreSQL 16+ / SQLite (aiosqlite)
- **CI/CD**: GitHub Actions (`.github/workflows/ci.yml`)

## Implemented & Verified Features
1. **Authentication & RBAC**:
   - Student & Admin registration, login with Bcrypt hashing and JWT bearer tokens.
   - Single-use SHA-256 password reset tokens with rate limiting.
   - Mass-assignment and privilege escalation defense.
2. **Assessment Engine**:
   - Decoupled immutable versioning (`QuizVersion`).
   - Server-authoritative timer calculation (`started_at`, `expires_at`, grace period, auto-expiry).
   - Answer key redaction (`is_correct` stripped from active attempt payloads).
   - Real-time debounced autosave (`PATCH /attempts/{id}/answers`).
   - Idempotent and transactional submission (`POST /attempts/{id}/submit`).
3. **Scoring Engine**:
   - Single-choice MCQ evaluation with marks.
   - Negative marking penalty subtraction.
   - Zero-mark boundary clamping.
4. **Governance & Dashboards**:
   - Student Dashboard with KPIs, recent attempts, category proficiency breakdown.
   - Multi-factor deterministic Leaderboard (Overall, Category, Weekly, Monthly).
   - Admin Executive Dashboard with score distributions and popular quizzes.
   - Quiz Authoring Wizard with pre-flight checklist validation.
   - MCQ Question Bank with Bulk JSON/CSV Import and row-by-row error reporting.
   - User Access Governance (Search, Inspect, Activate/Suspend).
   - Taxonomy Category Governance with dependency protection.
   - Verifiable Digital Certificates (`CERT-XXXX-XXXX`) with online public verification tool.
   - Immutable Administrative & Security Audit Trail (`audit_logs`).

## Quality Gates & Verification Evidence
- **Pytest Async Suite**: 12/12 passing (`test_scoring.py`, `test_timer_and_versioning.py`, `test_auth_and_security.py`, `test_master_e2e.py`).
- **Frontend Build**: `npm run build` cleanly generates production bundle with 0 TypeScript errors.
- **OWASP API Security**: API1 (BOLA), API2 (Auth), API3 (Mass Assignment), API4 (Resource Consumption), API5 (BFLA) fully mitigated.

## Open Defects & Known Limitations
- **P0**: 0
- **P1**: 0
- **P2**: 0
- **Known Limitations**: Real-time video proctoring and AI cheating detection are intentionally out of MVP scope per PRD §5 / FSD §92.
