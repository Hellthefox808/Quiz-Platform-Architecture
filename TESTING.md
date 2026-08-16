# Testing Strategy & Automated Test Suite

The ApexAssess quality assurance suite comprises unit, integration, security, and end-to-end (E2E) automated tests.

---

## 1. Test Architecture

```
backend/tests/
├── conftest.py                   # Async fixtures (test client, in-memory DB, auth tokens)
├── test_scoring.py               # Pure scoring algorithm unit tests (MCQ, negative marks, clamping)
├── test_timer_and_versioning.py  # Server-side timer expiry and immutable versioning tests
├── test_auth_and_security.py     # OWASP security tests (BOLA, BFLA, mass assignment, token reuse)
└── test_master_e2e.py            # Complete 40-step multi-persona E2E lifecycle test
```

---

## 2. Test Coverage Matrix

| Test Module | Scenarios Covered |
| :--- | :--- |
| `test_scoring.py` | Full score calculation, partial marks, negative marking penalties, zero-mark lower boundary clamping. |
| `test_timer_and_versioning.py` | Attempt started on v1 remains unchanged after admin edits questions to v2. Expired attempt auto-submission. |
| `test_auth_and_security.py` | 1. Student access to `/admin` blocked (`403 FORBIDDEN`).<br>2. Student cannot register as `ADMIN` (Mass Assignment protection).<br>3. BOLA/IDOR protection (Student B cannot access Student A's attempt).<br>4. Active exam payload contains zero `is_correct` flags.<br>5. Password reset token reuse prevention. |
| `test_master_e2e.py` | Complete end-to-end simulation: Category creation -> Quiz draft -> Versioning -> Publishing checklist -> Student catalog search -> Exam start -> Real-time autosave -> Final submission -> Certificate generation -> Public certificate verification. |

---

## 3. Running Backend Tests

```bash
# Activate virtual environment
cd backend
.venv\Scripts\activate  # Windows
# source .venv/bin/activate  # Linux/macOS

# Execute Pytest suite
pytest backend/tests -v --tb=short
```

---

## 4. Running Frontend Type-Checking & Bundle Verification

```bash
cd frontend
npm run build
```
