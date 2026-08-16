# System Architecture & Technical Specifications

This document outlines the architecture, data flows, state machines, and system invariants governing the ApexAssess Online Assessment Platform.

---

## 1. High-Level System Architecture

```mermaid
graph TD
    Client[React 19 Frontend SPA] -->|HTTPS / JSON REST API| Gateway[FastAPI Application Gateway]
    
    subgraph Core Middlewares
        Gateway --> CID[X-Request-ID Correlation Middleware]
        Gateway --> RateLimit[SlowAPI Token Bucket Rate Limiter]
        Gateway --> AuthMiddleware[JWT Authentication & RBAC Guard]
    end
    
    subgraph Domain Services
        AuthMiddleware --> AuthService[Auth & Security Service]
        AuthMiddleware --> QuizService[Quiz Authoring & Versioning Service]
        AuthMiddleware --> AssessmentService[Assessment Engine & Autosave Service]
        AuthMiddleware --> ScoringService[Server-Side Scoring Engine]
        AuthMiddleware --> AnalyticsService[Item Analysis & KPI Service]
        AuthMiddleware --> LeaderboardService[Rankings Service]
        AuthMiddleware --> CertService[Certificate & Verification Service]
    end
    
    subgraph Data Tier
        AssessmentService --> SQL[(PostgreSQL / SQLite Storage)]
        QuizService --> SQL
        AnalyticsService --> SQL
    end
```

---

## 2. Immutable Assessment Versioning

One of the most critical requirements for high-stakes online examinations is that modifying or editing a quiz in the administrator panel must **never mutate ongoing student examination attempts** or alter historical records.

```mermaid
sequenceDiagram
    autonumber
    actor Admin
    actor Student
    participant QuizAPI as Quiz Service
    participant AttemptAPI as Assessment Service
    participant DB as Relational Database

    Admin->>QuizAPI: Create Quiz Draft (v1)
    QuizAPI->>DB: Insert Quiz & QuizVersion(v1)
    Admin->>QuizAPI: Publish Quiz (v1)
    QuizAPI->>DB: Update Quiz status = PUBLISHED

    Student->>AttemptAPI: POST /attempts/quizzes/{id}/start
    AttemptAPI->>DB: Fetch Active QuizVersion(v1)
    AttemptAPI->>DB: Snapshot Questions into AttemptQuestion (omitting is_correct)
    AttemptAPI->>DB: Set expires_at = now() + duration_seconds
    AttemptAPI-->>Student: Return AttemptSession (questions without answer keys)

    Note over Admin,QuizAPI: Admin updates quiz question marks & options
    Admin->>QuizAPI: Edit Quiz / Add Question
    QuizAPI->>DB: Increment version_number -> QuizVersion(v2)

    Note over Student,AttemptAPI: Student continues taking exam on frozen snapshot v1
    Student->>AttemptAPI: PATCH /attempts/{id}/answers (Option B)
    AttemptAPI->>DB: Autosave response against v1 AttemptQuestion
    Student->>AttemptAPI: POST /attempts/{id}/submit
    AttemptAPI->>DB: Score against QuizVersion v1 Question Key
```

---

## 3. Server-Authoritative Clock & Timer

The assessment countdown is **strictly server-authoritative**:
1. When an attempt starts, `expires_at = UTC_NOW + duration_seconds`.
2. The initial response payload contains `server_time = UTC_NOW` and `expires_at`.
3. The client sets a local interval to decrement the UI display for fluid UX.
4. When any request (`PATCH /answers` or `POST /submit`) arrives at the server, the server validates:
   $$\text{server\_now} \le \text{expires\_at} + \Delta_{\text{grace}}$$
   (where $\Delta_{\text{grace}} = 5\text{ seconds}$ accounts for network packet transit).
5. If $\text{server\_now} > \text{expires\_at}$, the attempt state machine transitions to `EXPIRED` and automatically scores the answers received up to that point.

---

## 4. Assessment Attempt State Machine

```mermaid
stateDiagram-v2
    [*] --> IN_PROGRESS: POST /attempts/quizzes/{id}/start
    IN_PROGRESS --> IN_PROGRESS: PATCH /attempts/{id}/answers (Autosave)
    IN_PROGRESS --> COMPLETED: POST /attempts/{id}/submit (Manual Submission)
    IN_PROGRESS --> EXPIRED: Server Clock > expires_at (Auto-Submission)
    COMPLETED --> [*]
    EXPIRED --> [*]
```

### Invariants:
- **Idempotency**: Submitting an attempt that is already `COMPLETED` or `EXPIRED` returns the existing `ResultResponse` without altering scores or records.
- **Answer Key Concealment**: `AttemptQuestion.frozen_options_json` contains:
  ```json
  [
    {"id": "uuid-1", "option_text": "Option A", "position": 1},
    {"id": "uuid-2", "option_text": "Option B", "position": 2}
  ]
  ```
  The boolean `is_correct` is **never** sent to the client during an active test.

---

## 5. Scoring Algorithm

The scoring engine executes purely on the backend. For each `AttemptQuestion` in the attempt:
- **Correct Selection**: $\text{Marks Awarded} = +\text{Question Marks}$
- **Incorrect Selection (Negative Marking Enabled)**: $\text{Marks Awarded} = -\text{Negative Mark Value}$
- **Incorrect Selection (Negative Marking Disabled)**: $\text{Marks Awarded} = 0$
- **Unanswered**: $\text{Marks Awarded} = 0$

$$\text{Final Marks} = \max(0, \sum \text{Marks Awarded})$$
$$\text{Percentage} = \text{round}\left(\frac{\text{Final Marks}}{\text{Total Marks}} \times 100, 2\right)$$
$$\text{Passed} = \text{Percentage} \ge \text{Passing Percentage}$$
