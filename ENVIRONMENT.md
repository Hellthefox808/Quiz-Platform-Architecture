# Environment Variables & Configuration Matrix

This document lists all configuration keys supported by the ApexAssess backend service.

---

## Configuration Variables

| Variable | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `APP_NAME` | `string` | `"ApexAssess"` | Application display name. |
| `APP_ENV` | `string` | `"development"` | Environment (`development`, `staging`, `production`). |
| `DEBUG` | `boolean` | `false` | Enables verbose debug outputs and docs. |
| `API_V1_PREFIX` | `string` | `"/api/v1"` | API URL prefix. |
| `SECRET_KEY` | `string` | *Required* | 32+ character entropy string for JWT signing. |
| `ALGORITHM` | `string` | `"HS256"` | JWT cryptographic algorithm. |
| `ACCESS_TOKEN_EXPIRE_MINUTES`| `integer` | `1440` (24h) | Access token time-to-live. |
| `PASSWORD_RESET_TOKEN_EXPIRE_MINUTES` | `integer` | `15` | Password reset token expiration window. |
| `DATABASE_URL` | `string` | `"sqlite+aiosqlite:///./quiz_platform.db"` | Async SQLAlchemy database connection URI. |
| `SYNC_DATABASE_URL` | `string` | `"sqlite:///./quiz_platform.db"` | Synchronous database connection URI for migrations. |
| `CORS_ORIGINS` | `list[str]`| `["http://localhost:5173"]` | Permitted browser origins for CORS requests. |
| `RATE_LIMIT_PER_MINUTE` | `integer` | `60` | Global default endpoint rate limit. |
| `RATE_LIMIT_AUTH` | `integer` | `5` | Strict rate limit on login/register endpoints. |
| `RATE_LIMIT_SUBMISSION` | `integer` | `10` | Strict rate limit on assessment start/submit. |
