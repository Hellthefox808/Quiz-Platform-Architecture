# REST API Specifications

The ApexAssess API adheres to OpenAPI 3.1 standards with standard HTTP status codes, structured JSON responses, and correlation tracking.

**Base URL**: `/api/v1`  
**Authentication Header**: `Authorization: Bearer <JWT_TOKEN>`  
**Correlation Header**: `X-Request-ID: <UUID>` (echoed back in all responses)

---

## 1. Authentication Endpoints (`/auth`)

### `POST /auth/register`
Creates a student account.
- **Request Body**:
  ```json
  {
    "name": "Jane Doe",
    "email": "jane@example.com",
    "password": "Password@123"
  }
  ```
- **Response (201 Created)**:
  ```json
  {
    "id": "uuid",
    "name": "Jane Doe",
    "email": "jane@example.com",
    "role": "STUDENT",
    "status": "ACTIVE"
  }
  ```

### `POST /auth/login`
Authenticates a user and issues a signed JWT.
- **Request Body**:
  ```json
  {
    "email": "jane@example.com",
    "password": "Password@123"
  }
  ```
- **Response (200 OK)**:
  ```json
  {
    "access_token": "eyJhbGciOi...",
    "token_type": "bearer",
    "expires_in": 86400,
    "user": { ... }
  }
  ```

### `POST /auth/forgot-password` & `POST /auth/reset-password`
Generates and consumes single-use SHA-256 hashed password reset tokens.

---

## 2. Assessment Engine Endpoints (`/attempts`)

### `POST /attempts/quizzes/{quiz_id}/start`
Starts a new assessment attempt or resumes an active one.
- **Response (201 Created)**:
  ```json
  {
    "id": "attempt-uuid",
    "quiz_id": "quiz-uuid",
    "quiz_title": "Distributed Systems",
    "status": "IN_PROGRESS",
    "started_at": "2026-08-16T18:00:00Z",
    "expires_at": "2026-08-16T18:30:00Z",
    "server_time": "2026-08-16T18:00:00Z",
    "duration_seconds": 1800,
    "questions": [
      {
        "attempt_question_id": "aq-uuid-1",
        "question_order": 1,
        "question_text": "What is the primary role of Paxos?",
        "marks": 2.0,
        "selected_option_id": null,
        "options": [
          {"id": "opt-1", "option_text": "Consensus in asynchronous network", "position": 1},
          {"id": "opt-2", "option_text": "Data compression", "position": 2}
        ]
      }
    ]
  }
  ```

### `PATCH /attempts/{attempt_id}/answers`
Autosaves or updates the selected choice for a question.
- **Request Body**:
  ```json
  {
    "attempt_question_id": "aq-uuid-1",
    "selected_option_id": "opt-1"
  }
  ```
- **Response (200 OK)**:
  ```json
  {
    "attempt_question_id": "aq-uuid-1",
    "selected_option_id": "opt-1",
    "answered_at": "2026-08-16T18:05:12Z"
  }
  ```

### `POST /attempts/{attempt_id}/submit`
Submits an assessment attempt for atomic grading and result computation.
- **Response (200 OK)**:
  ```json
  {
    "id": "result-uuid",
    "attempt_id": "attempt-uuid",
    "quiz_title": "Distributed Systems",
    "total_marks": 10.0,
    "obtained_marks": 8.0,
    "percentage": 80.0,
    "passing_percentage": 60.0,
    "passed": true,
    "correct_count": 4,
    "incorrect_count": 1,
    "unanswered_count": 0,
    "time_taken_seconds": 920,
    "certificate_code": "CERT-2026-ABCD",
    "submitted_at": "2026-08-16T18:15:20Z",
    "questions_review": [ ... ]
  }
  ```

---

## 3. Administrative Endpoints

- `POST /quizzes`: Create draft assessment.
- `GET /quizzes/{id}/publish-checklist`: Evaluate pre-flight publishing readiness checklist.
- `POST /quizzes/{id}/publish`: Publish assessment to students.
- `POST /questions/quizzes/{quiz_id}`: Create question in active draft version.
- `POST /questions/quizzes/{quiz_id}/bulk-import`: Bulk JSON/CSV questions import with validation.
- `GET /analytics/admin`: Aggregate platform KPIs, score distributions, and popular quizzes.
- `GET /analytics/admin/questions`: Statistical item analysis and difficulty index.
- `GET /audit-logs`: Query immutable administrative audit trails.
- `GET /certificates/verify/{code}`: Public endpoint to verify digital certificate credentials.
