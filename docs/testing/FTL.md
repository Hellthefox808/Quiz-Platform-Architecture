# Functional Test List (FTL) — ApexAssess

**Document Version**: 1.0  
**Test Level**: System / Functional / API / Integration / E2E / Security  
**Primary Roles**: Admin, Student  
**Status**: 100% Passing Automated Verification  

---

## 1. Automated Test Coverage & Execution Matrix

| Test Suite File | Test Function | Test ID Mapping | Scenario & Verification Objective | Result |
| :--- | :--- | :--- | :--- | :--- |
| `test_auth_and_security.py` | `test_broken_function_level_authorization_bfla` | `AUTHZ-001` | Student attempting to access administrative analytics/routes is rejected with `403 FORBIDDEN`. | `PASSED` |
| `test_auth_and_security.py` | `test_broken_object_level_authorization_bola_idor` | `AUTHZ-010`, `AUTHZ-011` | Student A attempting to access Student B's attempt or answers is rejected with `404 NOT_FOUND`. | `PASSED` |
| `test_auth_and_security.py` | `test_mass_assignment_protection_on_registration` | `AUTH-007`, `AUTHZ-021` | Client sending `"role": "ADMIN"` in registration payload is sanitized; account remains `STUDENT`. | `PASSED` |
| `test_auth_and_security.py` | `test_no_answer_leakage_during_active_exam` | `DISC-011`, `SEC-006` | Active attempt question snapshot strictly omits `is_correct` flags from all option objects. | `PASSED` |
| `test_auth_and_security.py` | `test_password_reset_token_single_use` | `AUTH-022`, `AUTH-023` | Password reset tokens are single-use SHA-256 digests; reuse attempts are rejected. | `PASSED` |
| `test_timer_and_versioning.py` | `test_immutable_assessment_versioning_and_snapshot` | `VER-001–003`, `E2E-005` | Active attempt on v1 retains frozen question snapshot even after Admin publishes v2 with modified marks/text. | `PASSED` |
| `test_timer_and_versioning.py` | `test_server_authoritative_timer_and_expiration` | `TIME-001–009`, `E2E-004` | Server-authoritative `expires_at` auto-submits expired attempts; client clock tampering has zero effect. | `PASSED` |
| `test_scoring.py` | `test_standard_mcq_scoring_all_correct` | `SCORE-001`, `SUB-003` | All correct answers evaluate to 100% score and `PASSED` status. | `PASSED` |
| `test_scoring.py` | `test_standard_mcq_with_unanswered_and_wrong` | `SCORE-002–003`, `SUB-002` | Unanswered and wrong answers without negative marking award 0 marks without penalty. | `PASSED` |
| `test_scoring.py` | `test_negative_marking_penalty` | `SCORE-004`, `E2E-018` | Negative marking subtracts penalty marks per incorrect choice while awarding full marks for correct choices. | `PASSED` |
| `test_scoring.py` | `test_negative_marking_clamped_percentage` | `SCORE-005–006` | Negative score total is clamped to 0.0 lower bound, preventing negative percentage anomalies. | `PASSED` |
| `test_master_e2e.py` | `test_complete_master_e2e_scenario` | `E2E-001` (Master 40-Step) | Complete clean-state lifecycle: Category $\to$ Quiz $\to$ Questions $\to$ Publish Checklist $\to$ Student Start $\to$ Autosave $\to$ Submit $\to$ Certificate Verification $\to$ Leaderboard $\to$ Admin Analytics $\to$ Audit Trail. | `PASSED` |

---

## 2. Verification of Critical Security & Assessment Invariants

```text
[✓] Invariant 1: Student cannot create Admin account (Mass assignment protected via Pydantic schemas).
[✓] Invariant 2: Student cannot access another student's attempt (BOLA protected via user_id matching).
[✓] Invariant 3: Student cannot alter score (Scoring is strictly server-side).
[✓] Invariant 4: Student cannot extend official time (Server-authoritative timestamps & grace period).
[✓] Invariant 5: Completed attempt cannot return to active state (State machine strictly enforced).
[✓] Invariant 6: Attempt cannot exceed maximum allowed attempts (Evaluated atomically at start).
[✓] Invariant 7: Active attempt cannot silently change versions (Frozen AttemptQuestion snapshot).
[✓] Invariant 8: One attempt cannot produce conflicting final results (Idempotent submission).
[✓] Invariant 9: Failed email does not undo completed assessment (Decoupled side effects).
[✓] Invariant 10: Historical assessment data remains consistent (Referential integrity preserved).
```

---

## 3. Test Suite Execution Command

```bash
# Run complete test suite with verbose output
backend\.venv\Scripts\pytest.exe backend/tests -v
```
