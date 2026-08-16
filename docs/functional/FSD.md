# Functional Specification Document (FSD) — ApexAssess

**Document Version**: 1.0  
**Document Status**: Production-Oriented Functional Specification  
**Primary Roles**: Admin, Student  
**Application Type**: Responsive Web Application (React 19 + TypeScript)  
**API Style**: REST / JSON (`/api/v1`)  
**Primary Functional Model**: Server-Authoritative Online Assessment  

---

## 1. Functional Traceability Matrix

| Feature Code | Domain & Name | Backend Implementation | Frontend UI Screen | Verified Test |
| :--- | :--- | :--- | :--- | :--- |
| **AUTH-001** | Student Registration | `POST /api/v1/auth/register` | `AuthPage.tsx` (Register tab) | `test_auth_and_security.py` |
| **AUTH-002** | User Login (RBAC) | `POST /api/v1/auth/login` | `AuthPage.tsx` (Login tab) | `test_auth_and_security.py` |
| **AUTH-004/005** | Password Recovery | `POST /api/v1/auth/forgot-password` & `reset-password` | `AuthPage.tsx` (Forgot Password) | `test_auth_and_security.py` |
| **AUTHZ-001/002** | BFLA & BOLA Access Control | `require_admin` & `user_id == current_user.id` | Global Route Guards | `test_auth_and_security.py` |
| **USER-001–005** | Student Governance | `GET/PATCH /api/v1/users` | `UserManager.tsx` | `test_master_e2e.py` |
| **CAT-001–003** | Taxonomy Categories | `GET/POST/PUT/DELETE /api/v1/categories` | `CategoryManager.tsx` | `test_master_e2e.py` |
| **QUIZ-001–007** | Quiz Lifecycle & Checklist | `GET/POST/PUT /api/v1/quizzes`, `/publish-checklist` | `QuizManager.tsx` | `test_master_e2e.py` |
| **VERSION-001–003** | Immutable Assessment Versioning | `QuizVersion` & `AttemptQuestion` snapshots | `QuizManager.tsx` / `QuestionBank.tsx` | `test_timer_and_versioning.py` |
| **QUESTION-001–005** | Question Bank & Bulk Import | `GET/POST/PUT /api/v1/questions`, `/bulk-import` | `QuestionBank.tsx` | `test_master_e2e.py` |
| **DISCOVERY-001–003** | Student Quiz Catalog | `GET /api/v1/quizzes` (filtered) | `QuizCatalog.tsx` | `test_master_e2e.py` |
| **ATTEMPT-001–006** | Attempt Creation & Snapshot | `POST /api/v1/attempts/quizzes/{id}/start` | `QuizDetail.tsx` | `test_master_e2e.py` |
| **TIMER-001–006** | Server-Authoritative Timer | `started_at`, `expires_at`, Auto-Expiry | `ActiveAssessment.tsx` | `test_timer_and_versioning.py` |
| **ANSWER-001–006** | Debounced Autosave Engine | `PATCH /api/v1/attempts/{id}/answers` | `ActiveAssessment.tsx` | `test_master_e2e.py` |
| **SUBMIT-001–004** | Transactional & Idempotent Submit | `POST /api/v1/attempts/{id}/submit` | `ActiveAssessment.tsx` (Submit Modal) | `test_master_e2e.py` |
| **SCORE-001–005** | Server-Side Scoring Engine | `ScoringService` (MCQ, Negative Marks) | Backend Engine | `test_scoring.py` |
| **RESULT-001–004** | Graded Result & Explanations | `GET /api/v1/attempts/results/{id}` | `ResultView.tsx` | `test_master_e2e.py` |
| **HISTORY-001–003** | Attempt History | `GET /api/v1/attempts/history/my` | `AttemptHistory.tsx` | `test_master_e2e.py` |
| **DASH-001–003** | Student & Admin Dashboards | `GET /api/v1/analytics/student`, `/admin` | `StudentDashboard.tsx`, `AdminDashboard.tsx` | `test_master_e2e.py` |
| **LEADER-001–004** | Multi-Factor Leaderboard | `GET /api/v1/leaderboard` | `LeaderboardView.tsx` | `test_master_e2e.py` |
| **AUDIT-001** | Immutable Audit Trail | `GET /api/v1/audit-logs` | `AuditLogsView.tsx` | `test_master_e2e.py` |
| **CERT-001** | Verifiable Digital Credentials | `GET /api/v1/certificates/my`, `/verify/{code}` | `CertificatesView.tsx` | `test_master_e2e.py` |

---

## 2. Core Functional Doctrines

1. **Identity & Authorization**: Every protected endpoint authenticates the user via JWT bearer token and enforces role and object ownership before executing domain actions.
2. **Assessment Snapshot Invariant**: An active examination operates strictly against frozen `AttemptQuestion` records. Changes to question text or answer options in the admin console create a new `QuizVersion` without mutating live student sessions.
3. **Server Authority**: The browser provides intent (option selections); the backend computes marks, percentages, pass/fail status, and official time expirations.
4. **Answer Key Concealment**: Student-facing attempt payloads never serialize `is_correct` flags during an active test.
5. **Idempotency & Concurrency Safety**: Submissions are transactional and return cached results on duplicate calls.
