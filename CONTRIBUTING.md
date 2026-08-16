# Contributing & Engineering Standards

Thank you for contributing to the ApexAssess Platform. Please adhere to the following engineering standards.

---

## 1. Branching Strategy

- `main`: Production-ready, fully-tested code.
- `feat/<feature-name>`: New feature implementations.
- `fix/<bug-description>`: Bug fixes and regressions.

---

## 2. Code Standards

- **Backend (Python)**:
  - Python 3.11+ with strict type hints.
  - Pydantic v2 schemas for all input validation and output serialization.
  - Asynchronous SQLAlchemy 2.0 with explicit session lifecycles.
  - Zero raw SQL string interpolation (prevent SQL injection).
- **Frontend (TypeScript / React)**:
  - React 19 functional components with hooks.
  - Modern Tailwind CSS design tokens (no arbitrary hardcoded hex codes).
  - Explicit TypeScript interface types for all API request/response payloads.

---

## 3. Pull Request Checklist

Before submitting a PR:
1. Run all backend tests: `pytest backend/tests -v` (must pass 100%).
2. Build frontend: `cd frontend && npm run build` (zero TypeScript errors).
3. Ensure no secrets, tokens, or private credentials are committed.
