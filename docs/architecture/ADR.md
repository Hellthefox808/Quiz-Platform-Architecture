# Architecture Decision Records (ADRs) — ApexAssess

## ADR-001: Modular Monolith Architecture
- **Context**: The platform requires clean domain boundaries (Quizzes, Versions, Questions, Attempts, Scoring, Results, Analytics, Audit) without microservice network latency or distributed transaction overhead.
- **Decision**: Implement a Modular Monolith in FastAPI with domain-driven service layers and repository abstractions.
- **Consequences**: Fast local testing, single atomic database transactions, straightforward debugging, and simple horizontal scaling behind a reverse proxy.

## ADR-002: PostgreSQL as Canonical System of Truth
- **Context**: Online assessments require strict ACID guarantees, foreign-key cascade protections, and transactional isolation during attempt creation and grading.
- **Decision**: Use PostgreSQL 16+ (with async SQLAlchemy 2.0 and asyncpg) as the persistent source of truth.
- **Consequences**: Strong consistency, zero lost updates on concurrent submissions, and transactional integrity.

## ADR-003: Immutable Assessment Versioning
- **Context**: Modifying a published assessment must never corrupt running examination sessions or invalidate historical student scorecards.
- **Decision**: Decouple `Quiz` from `QuizVersion`. When an attempt starts, copy question metadata into frozen `AttemptQuestion` records linked to that specific `QuizVersion`.
- **Consequences**: Changes to question wording, marks, or options only take effect on subsequent attempts and do not alter existing or in-progress tests.

## ADR-004: Server-Authoritative Clock & Timer
- **Context**: Students taking high-stakes assessments must not be able to extend test duration by modifying local client hardware clocks or JavaScript timers.
- **Decision**: The backend calculates `expires_at = UTC_NOW + duration_seconds` upon attempt creation. The client receives `expires_at` and `server_time` strictly for countdown display. Official test expiration is evaluated server-side on every request.
- **Consequences**: Zero client-side time manipulation vulnerability; automated server-side expiration transition.

## ADR-005: Answer Key Redaction & Pure Server-Side Scoring
- **Context**: Inspecting DOM or network packets must never reveal the correct answer key during an active test.
- **Decision**: Active attempt queries strip `is_correct` from the options snapshot. Scoring is performed exclusively on the backend by `ScoringService`.
- **Consequences**: Impossible for clients to intercept answer keys; client-submitted scores are never accepted.

## ADR-006: Idempotent Submission Handling
- **Context**: Unstable network connections or double-clicks can generate duplicate `POST /submit` requests.
- **Decision**: The submission transaction checks if the attempt is already `COMPLETED` or `EXPIRED`. If so, it returns the existing `ResultResponse` immediately without re-scoring or mutating records.
- **Consequences**: Safe retries, zero race condition anomalies, and deterministic single-result generation.

## ADR-007: Object-Level Authorization (BOLA/IDOR Defense)
- **Context**: In REST APIs with predictable or UUID-based URLs, attackers attempt to view or modify other users' assessment attempts.
- **Decision**: All attempt queries, answer patches, and result lookups explicitly filter on `user_id == current_user.id` (unless the requester has verified `Role.ADMIN`).
- **Consequences**: Full compliance with OWASP API1 (Broken Object Level Authorization).

## ADR-008: Rate Limiting & Resource Consumption
- **Context**: Brute-force authentication and submission spam can degrade platform availability.
- **Decision**: Apply SlowAPI token bucket rate limiting on `/auth/login` (5/min), attempt start (10/min), and autosave (120/min).
- **Consequences**: Mitigates OWASP API4 (Unrestricted Resource Consumption) and credential stuffing attacks.
