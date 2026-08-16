# Security Architecture & OWASP Mitigations

ApexAssess implements defense-in-depth controls aligned with the **OWASP API Security Top 10** standards.

---

## 1. Threat Model & Mitigations Matrix

| OWASP Vulnerability | Risk Scenario | ApexAssess Architectural Defense |
| :--- | :--- | :--- |
| **API1: Broken Object Level Authorization (BOLA / IDOR)** | Student A submits answers for or reads attempt results belonging to Student B. | All attempt query filters enforce `AND user_id = current_user.id`. Even if Student A guesses Attempt UUID B, the backend returns `404 NOT_FOUND`. |
| **API2: Broken Authentication** | Token reuse after logout, weak passwords, brute-force password guessing. | JWTs signed with `HS256`, 1-day max TTL. Password reset tokens are single-use SHA-256 digests. Rate limiting on `/auth/login` (5/min). |
| **API3: Broken Object Property Level Authorization (Mass Assignment)** | User registers and passes `"role": "ADMIN"` in JSON body. | Pydantic `UserCreate` schema excludes `role` and `status` fields. All registrations default strictly to `Role.STUDENT`. |
| **API4: Unrestricted Resource Consumption** | Brute force or API spamming degrading assessment performance. | SlowAPI token bucket middleware restricts auth (5 req/min), attempt start (10 req/min), and autosaves (60 req/min). |
| **API5: Broken Function Level Authorization (BFLA)** | Student calls administrative quiz creation or publishing endpoints. | FastAPI dependency `require_admin` inspects JWT `role` claims on all administrative routes, rejecting unauthorized calls with `403 FORBIDDEN`. |
| **API6: Server-Side Request Forgery (SSRF)** | Malicious URLs in quiz thumbnail or certificate generators. | URLs are validated and stored as static references without backend fetching. |
| **API7: Security Misconfiguration** | Unhandled stack traces leaking SQL queries or table names. | Global exception handlers intercept unhandled exceptions and format them into uniform JSON errors omitting sensitive internal paths. |
| **API8: Lack of Protection from Automated Threats** | Scripted rapid answering to bypass timers. | Timestamps are tracked per attempt. Timers are server-authoritative. Attempts submitted after `expires_at` are automatically transitioned to `EXPIRED`. |
| **API9: Improper Inventory Management** | Undocumented endpoints exposing draft quizzes or questions. | Clear OpenAPI route tagging (`v1`), with drafts hidden from student catalog queries. |
| **API10: Unsafe Consumption of APIs** | Third-party dependencies injecting malicious data. | Pydantic strict model validation on all external inputs. |

---

## 2. Examination Integrity Invariants

### 1. Answer Key Redaction During Active Exams
When `POST /attempts/quizzes/{id}/start` or `GET /attempts/{id}` is queried, the response serializes `AttemptQuestion.frozen_options_json` where each option contains only `{id, option_text, position}`. The `is_correct` field is stripped at the database query layer.

### 2. Idempotent Submissions
Submitting an already completed assessment does not re-score or mutate existing marks.

### 3. Rate Limiting Limits
```python
AUTH_LIMIT = "5/minute"
ATTEMPT_START_LIMIT = "10/minute"
AUTOSAVE_LIMIT = "120/minute"
SUBMISSION_LIMIT = "10/minute"
```
