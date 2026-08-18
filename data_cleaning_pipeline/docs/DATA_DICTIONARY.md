# Quiz Platform: Enterprise Data Dictionary & Data Catalog

**Document ID**: `DATA-DICT-QUIZ-PROD-V1`  
**Target Environment**: Google Cloud BigQuery / Dataplex  
**Primary Dataset (Gold / Analytics)**: `quiz-platform-prod.quiz_platform_analytics`  
**Source Dataset (Bronze / Raw)**: `quiz-platform-prod.quiz_platform_raw`  
**Assertions Dataset**: `quiz-platform-prod.quiz_platform_assertions`  
**Last Updated**: 2026-08-18  

---

## 1. Executive Architecture & Governance Overview

The Quiz Platform (ApexAssess) data warehouse is architected according to the **Medallion Lakehouse Pattern** in Google Cloud BigQuery. Data transitions across three structured tiers:
1. **Bronze Layer (Raw Ingestion)**: Immutable append-only ingestion of raw application logs, webhook payloads, attempt telemetry, and audit event streams.
2. **Silver Layer (Cleaned & Normalized)**: Cleaned, deduplicated, schema-standardized, and type-safe relational views. All timestamps are normalized to ISO UTC, JSON payloads are securely parsed without failure, score boundaries are clamped, and enums are domain-harmonized.
3. **Gold Layer (Analytical Marts)**: Production-grade dimensional and fact models optimized with date-based partitioning and multi-column clustering for high-concurrency analytical queries, Looker Studio BI reporting, and machine learning feature stores.

```
+---------------------------------------------------------------------------------------------------------+
|                                    MEDALLION LAKEHOUSE DATA ARCHITECTURE                                |
+---------------------------------------------------------------------------------------------------------+
|                                                                                                         |
|   +--------------------------+     +-------------------------------+     +--------------------------+   |
|   |       BRONZE LAYER       |     |          SILVER LAYER         |     |        GOLD LAYER        |   |
|   |      (Raw Telemetry)     | --> |     (Cleaned & Normalized)    | --> |    (Analytical Marts)    |   |
|   |                          |     |                               |     |                          |   |
|   | - raw_attempts           |     | - stg_assessment_attempts     |     | - fct_assessment_attempts|   |
|   | - raw_responses          |     | - stg_question_responses      |     | - fct_question_responses |   |
|   | - raw_quizzes            |     | - stg_users                   |     | - dim_quizzes            |   |
|   | - raw_users              |     | - stg_quizzes                 |     | - dim_users              |   |
|   | - raw_questions          |     | - stg_audit_logs              |     | - fct_audit_events       |   |
|   | - raw_audit_logs         |     +-------------------------------+     +--------------------------+   |
|   +--------------------------+                                                         │                |
|                                                                                        ▼                |
|                                                                          +--------------------------+   |
|                                                                          |    DATAPLEX & QUALITY    |   |
|                                                                          |  - AutoDQ YAML Rules     |   |
|                                                                          |  - Profiling Scans       |   |
|                                                                          |  - Null Drift < 1.0%     |   |
|                                                                          +--------------------------+   |
+---------------------------------------------------------------------------------------------------------+
```

---

## 2. Service Level Agreements (SLA) & Operational Invariants

| Layer / Model | Ingestion SLA | Refresh Cadence | Query Latency Target (p95) | Availability SLA | Retention Policy |
|---|---|---|---|---|---|
| **Bronze Raw Sources** | Real-time Streaming / Micro-batch | Continuous (< 60s) | N/A (Append-only storage) | 99.99% | 365 Days Partition Expiration |
| **Silver Staging Views** | Near Real-time (Virtual Views) | Dynamic on Query | < 1.5s | 99.95% | Inherited from Bronze |
| **Gold Fact Marts** | Daily / Micro-batch Materialization | Hourly / Scheduled | < 800ms (Partition Pruned) | 99.99% | Indefinite (Long-term Analytics) |
| **Gold Conformed Dims** | Scheduled Batch Materialization | Every 6 Hours | < 250ms | 99.99% | Indefinite |

---

## 3. Bronze Layer Catalog (Raw Source Declarations)

### 3.1 `raw_attempts`
- **BigQuery Identifier**: `quiz-platform-prod.quiz_platform_raw.raw_attempts`
- **Description**: Raw streaming telemetry of assessment attempts captured at client boundaries. Contains mixed timestamp offsets, duplicate retry transmissions, and dirty strings.

| Column Name | Physical Type | Nullable | Description | Sample Raw Value |
|---|---|---|---|---|
| `id` | `STRING` | NO (Mandatory) | Client-generated or system UUID for attempt | `"7f1d4a82-1234-5678-90ab-cdef12345678"` |
| `user_id` | `STRING` | NO | Identifier of the test taker | `"usr_987654321"` |
| `quiz_id` | `STRING` | NO | Associated quiz identifier | `"qz_456789123"` |
| `quiz_version_id` | `STRING` | NO | Version identifier snapshot taken at attempt initiation | `"qv_11223344"` |
| `status` | `STRING` | YES | Raw attempt lifecycle string (mixed case, whitespace) | `" completed "`, `"in_progress"` |
| `score` | `STRING` / `FLOAT64` | YES | Raw score (may contain negative marks or string floats) | `"-5.0"`, `"85.50"` |
| `total_marks` | `STRING` / `FLOAT64` | YES | Raw total marks (may contain 0.0) | `"100.0"`, `"0.0"` |
| `duration_seconds`| `STRING` / `INT64` | YES | Elapsed test duration in seconds (may be negative) | `"-120"`, `"3600"` |
| `passed` | `STRING` / `BOOL` | YES | Raw pass boolean string or boolean literal | `"true"`, `false` |
| `started_at` | `STRING` | YES | Timestamp string (ISO Zulu, `+05:30`, `-04:00`, epoch ms) | `"2026-08-18T10:00:00+05:30"`, `"1755530781000"` |
| `submitted_at` | `STRING` | YES | Timestamp string when test was submitted | `"2026-08-18T11:00:00Z"` |
| `expires_at` | `STRING` | YES | Timestamp string when test timer expires | `"2026-08-18 11:30:00"` |
| `created_at` | `STRING` | YES | Ingestion record creation timestamp | `"2026-08-18 04:30:00"` |
| `updated_at` | `STRING` | YES | Last record modification timestamp | `"2026-08-18 05:00:00"` |

### 3.2 `raw_responses`
- **BigQuery Identifier**: `quiz-platform-prod.quiz_platform_raw.raw_responses`
- **Description**: Raw item-level responses submitted for each question during an assessment attempt. Contains unparsed JSON strings and options arrays with NULLs.

| Column Name | Physical Type | Nullable | Description | Sample Raw Value |
|---|---|---|---|---|
| `id` | `STRING` | NO | Response record UUID | `"resp_0011223344"` |
| `attempt_id` | `STRING` | NO | Foreign key referencing `raw_attempts.id` | `"7f1d4a82-1234-5678-90ab-cdef12345678"` |
| `question_id` | `STRING` | NO | Foreign key referencing question item | `"q_99887766"` |
| `attempt_question_id`| `STRING` | YES | Reference to specific question snapshot instance | `"aq_55443322"` |
| `selected_option_ids`| `STRING` / `ARRAY` | YES | JSON array or stringified list of selected options | `'["opt_1", null, "opt_2", " opt_1 "]'` |
| `text_response` | `STRING` | YES | Free-form textual response for essay/coding questions | `"SELECT * FROM users;"` |
| `is_correct` | `STRING` / `BOOL` | YES | Accuracy determination indicator | `"true"`, `false` |
| `marks_awarded` | `STRING` / `FLOAT64` | YES | Raw marks scored on this item (may be negative) | `"-1.0"`, `"4.0"` |
| `time_spent_seconds`| `STRING` / `INT64` | YES | Time spent on item in seconds | `"45"` |
| `question_snapshot` | `STRING` | YES | Unescaped or malformed JSON payload of frozen question | `'{"text":"What is SQL?","marks":4}'` |
| `frozen_options_json`| `STRING` | YES | JSON array of frozen option objects at test time | `'[{"id":"opt_1","text":"Structured Query Language"}]'` |
| `created_at` | `STRING` | YES | Timestamp when answer was submitted | `"2026-08-18T10:15:30Z"` |

### 3.3 `raw_users`
- **BigQuery Identifier**: `quiz-platform-prod.quiz_platform_raw.raw_users`
- **Description**: Raw user accounts and authentication telemetry.

| Column Name | Physical Type | Nullable | Description | Sample Raw Value |
|---|---|---|---|---|
| `id` | `STRING` | NO | User UUID | `"usr_1001"` |
| `email` | `STRING` | NO | User email address (may contain mixed case/whitespace) | `" Student@ApexAssess.COM "` |
| `name` | `STRING` | YES | User full name | `"Jane Doe"` |
| `role` | `STRING` | YES | User permission role | `"student"`, `"ADMIN "` |
| `status` | `STRING` | YES | Account state | `"active"`, `"SUSPENDED"` |
| `last_login_at` | `STRING` | YES | Raw timestamp of last login | `"2026-08-18 09:00:00"` |
| `created_at` | `STRING` | YES | Account registration timestamp | `"2026-01-01T00:00:00Z"` |

### 3.4 `raw_quizzes`
- **BigQuery Identifier**: `quiz-platform-prod.quiz_platform_raw.raw_quizzes`
- **Description**: Raw quiz definitions, metadata, and publication states.

| Column Name | Physical Type | Nullable | Description | Sample Raw Value |
|---|---|---|---|---|
| `id` | `STRING` | NO | Quiz UUID | `"qz_2001"` |
| `title` | `STRING` | NO | Assessment title | `"BigQuery Data Engineering Masterclass"` |
| `slug` | `STRING` | NO | URL slug identifier | `"bigquery-data-engineering"` |
| `category_id` | `STRING` | YES | Associated category identifier | `"cat_cloud_data"` |
| `created_by` | `STRING` | YES | Creator user UUID | `"usr_instructor_01"` |
| `status` | `STRING` | YES | Publication status | `"published"`, `"DRAFT"` |
| `created_at` | `STRING` | YES | Creation timestamp | `"2026-02-15T12:00:00Z"` |
| `updated_at` | `STRING` | YES | Last modification timestamp | `"2026-08-10T14:30:00Z"` |

### 3.5 `raw_audit_logs`
- **BigQuery Identifier**: `quiz-platform-prod.quiz_platform_raw.raw_audit_logs`
- **Description**: Raw platform audit events, security actions, and compliance logs.

| Column Name | Physical Type | Nullable | Description | Sample Raw Value |
|---|---|---|---|---|
| `id` | `STRING` | NO | Audit event UUID | `"aud_9001"` |
| `user_id` | `STRING` | YES | Acting user UUID | `"usr_1001"` |
| `action` | `STRING` | NO | Performed action identifier | `"ATTEMPT_SUBMITTED"`, `"QUIZ_PUBLISHED"` |
| `resource_type` | `STRING` | NO | Target entity type | `"ASSESSMENT_ATTEMPT"`, `"USER"` |
| `resource_id` | `STRING` | NO | Target entity UUID | `"7f1d4a82-1234-5678-90ab-cdef12345678"` |
| `ip_address` | `STRING` | YES | Originating client IP address | `"192.168.1.100"` |
| `user_agent` | `STRING` | YES | HTTP user agent header | `"Mozilla/5.0 (Windows NT 10.0; Win64; x64)"` |
| `details` | `STRING` | YES | Semi-structured JSON action metadata payload | `'{"duration":1800,"score":92.5,"browser":"Chrome"}'` |
| `created_at` | `STRING` | YES | Audit event timestamp | `"2026-08-18T11:00:01Z"` |

---

## 4. Silver Layer Catalog (Cleaned & Staged Models)

Silver models are implemented as Dataform SQLX views and BigQuery staged transformations. They encapsulate all defensive cleaning logic:
- **`stg_assessment_attempts`**: Deduplicated by `attempt_id`, timestamps parsed to UTC `TIMESTAMP`, scores clamped to `[0.0, 100.0]`, enums mapped to domain set.
- **`stg_question_responses`**: Deduplicated by `response_id`, question snapshots safely extracted via `SAFE.PARSE_JSON` and `JSON_VALUE`, option arrays sanitized without NULLs or whitespace while strictly preserving case.
- **`stg_users`**: Deduplicated by `user_id`, email normalized to lowercase and trimmed, roles domain-standardized.
- **`stg_quizzes`**: Deduplicated by `quiz_id`, slugs and titles trimmed, publication statuses harmonized.
- **`stg_audit_logs`**: Deduplicated by `audit_id`, `details` JSON verified and parsed into native BigQuery `JSON`.

---

## 5. Gold Layer Catalog (Analytical Marts & Fact Tables)

### 5.1 `fct_assessment_attempts`
- **BigQuery Identifier**: `quiz-platform-prod.quiz_platform_analytics.fct_assessment_attempts`
- **Table Type**: Materialized Fact Table
- **Partitioning**: `PARTITION BY DATE(started_at_utc)`
- **Clustering**: `CLUSTER BY status, quiz_id, user_id`
- **Business Purpose**: Core analytical table powering student score reporting, assessment completion metrics, passing rate KPIs, and compliance audits.

| Column Name | BigQuery Data Type | Nullable | PK / FK | Business Description & Validation Constraint |
|---|---|---|---|---|
| `attempt_id` | `STRING` | **NO** | **PK** | Unique UUID identifier for the assessment attempt. Guaranteed unique. |
| `user_id` | `STRING` | **NO** | **FK** | Foreign key referencing `dim_users.user_id`. |
| `quiz_id` | `STRING` | **NO** | **FK** | Foreign key referencing `dim_quizzes.quiz_id`. |
| `quiz_version_id` | `STRING` | **NO** | Business Key | Version identifier of the quiz snapshot taken at test start. |
| `status` | `STRING` | **NO** | Dimension | Standardized lifecycle status: `CREATED`, `IN_PROGRESS`, `SUBMITTING`, `COMPLETED`, `EXPIRED`, `CANCELLED`, `ABANDONED`. |
| `started_at_utc` | `TIMESTAMP` | **NO** | Partition Key | Normalized ISO UTC timestamp when the student started the attempt. |
| `submitted_at_utc` | `TIMESTAMP` | YES | Telemetry | Normalized ISO UTC timestamp when the attempt was submitted (NULL if in-progress or abandoned). |
| `expires_at_utc` | `TIMESTAMP` | YES | Invariant | Normalized ISO UTC timestamp when attempt expires (`expires_at_utc >= started_at_utc`). |
| `duration_seconds` | `INT64` | **NO** | Metric | Total elapsed time in seconds. Calculated and clamped $\ge 0$. |
| `total_marks` | `FLOAT64` | **NO** | Metric | Total possible marks for the assessment. Clamped $\ge 0.0$. |
| `score` | `FLOAT64` | **NO** | Metric | Total obtained marks. Non-negative clamped float ($\ge 0.0$), 2-decimal precision. |
| `percentage` | `FLOAT64` | **NO** | Metric | Normalized score percentage strictly clamped $\in [0.0, 100.0]$. Rounded to 2 decimals. |
| `passed` | `BOOL` | **NO** | Flag | Boolean flag indicating whether the attempt met the passing threshold ($\ge 60.0\%$). |
| `is_orphaned` | `BOOL` | **NO** | Integrity Flag | Boolean flag indicating whether parent user/quiz was missing in source. |
| `user_role` | `STRING` | YES | Enrichment | User role at query time (`STUDENT`, `INSTRUCTOR`, `ADMIN`, `PROCTOR`). |
| `quiz_title` | `STRING` | YES | Enrichment | Human-readable title of the assessment quiz. |
| `ingested_at_utc` | `TIMESTAMP` | **NO** | Metadata | UTC timestamp when record was materialized into Gold mart. |

### 5.2 `fct_question_responses`
- **BigQuery Identifier**: `quiz-platform-prod.quiz_platform_analytics.fct_question_responses`
- **Table Type**: Materialized Fact Table
- **Partitioning**: `PARTITION BY DATE(created_at_utc)`
- **Clustering**: `CLUSTER BY attempt_id, question_id, is_correct`
- **Business Purpose**: Granular item-level response analytics, distractor analysis, question difficulty calibration, and psychometric evaluation.

| Column Name | BigQuery Data Type | Nullable | PK / FK | Business Description & Validation Constraint |
|---|---|---|---|---|
| `response_id` | `STRING` | **NO** | **PK** | Unique UUID identifier for the question response record. |
| `attempt_id` | `STRING` | **NO** | **FK** | Foreign key referencing `fct_assessment_attempts.attempt_id`. |
| `question_id` | `STRING` | **NO** | **FK** | Foreign key referencing question master item. |
| `attempt_question_id`| `STRING` | YES | FK | Foreign key referencing frozen question snapshot instance. |
| `selected_option_ids`| `ARRAY<STRING>` | **NO** | Content | Sanitized array of selected option UUIDs (NULLs removed, whitespace trimmed, case strictly preserved). |
| `text_response` | `STRING` | YES | Content | Textual response submitted by the student for free-text items. |
| `is_correct` | `BOOL` | **NO** | Metric | Boolean indicating whether the student response was graded correct. |
| `marks_awarded` | `FLOAT64` | **NO** | Metric | Item marks awarded. Clamped $\ge 0.0$ with 2-decimal precision. |
| `time_spent_seconds`| `INT64` | **NO** | Metric | Time spent answering this specific item in seconds (clamped $\ge 0$). |
| `question_text` | `STRING` | YES | Snapshot | Question prompt extracted safely from question snapshot JSON. |
| `question_marks` | `FLOAT64` | YES | Snapshot | Total item baseline marks extracted from snapshot JSON. |
| `difficulty` | `STRING` | YES | Dimension | Question difficulty rating: `EASY`, `MEDIUM`, `HARD`, `EXPERT`. |
| `is_snapshot_valid` | `BOOL` | **NO** | DQ Indicator | Boolean flag indicating whether raw question snapshot was valid JSON. |
| `created_at_utc` | `TIMESTAMP` | **NO** | Partition Key | Normalized ISO UTC timestamp when response was logged. |

### 5.3 `dim_users`
- **BigQuery Identifier**: `quiz-platform-prod.quiz_platform_analytics.dim_users`
- **Table Type**: Conformed Dimension Table
- **Clustering**: `CLUSTER BY role, status, user_id`
- **Business Purpose**: Centralized user identity dimension providing demographic and role-based slicing.

| Column Name | BigQuery Data Type | Nullable | PK / FK | Business Description & Validation Constraint |
|---|---|---|---|---|
| `user_id` | `STRING` | **NO** | **PK** | Unique UUID identifier for user account. |
| `email` | `STRING` | **NO** | Unique Key | Lowercased, trimmed, and validated email address. |
| `name` | `STRING` | YES | Attribute | Cleaned display name of user. |
| `role` | `STRING` | **NO** | Dimension | User permission role: `STUDENT`, `INSTRUCTOR`, `ADMIN`, `PROCTOR`. |
| `status` | `STRING` | **NO** | Dimension | Account lifecycle state: `ACTIVE`, `SUSPENDED`, `INACTIVE`. |
| `last_login_at_utc` | `TIMESTAMP` | YES | Telemetry | Normalized ISO UTC timestamp of most recent login. |
| `created_at_utc` | `TIMESTAMP` | **NO** | Telemetry | Normalized ISO UTC timestamp of account registration. |

### 5.4 `dim_quizzes`
- **BigQuery Identifier**: `quiz-platform-prod.quiz_platform_analytics.dim_quizzes`
- **Table Type**: Conformed Dimension Table
- **Clustering**: `CLUSTER BY category_id, status, quiz_id`
- **Business Purpose**: Conformed assessment catalog dimension providing subject hierarchy and quiz metadata.

| Column Name | BigQuery Data Type | Nullable | PK / FK | Business Description & Validation Constraint |
|---|---|---|---|---|
| `quiz_id` | `STRING` | **NO** | **PK** | Unique UUID identifier for quiz definition. |
| `title` | `STRING` | **NO** | Attribute | Sanitized title of the quiz assessment. |
| `slug` | `STRING` | **NO** | Unique Key | URL-safe slug identifier (lowercase, trimmed). |
| `category_id` | `STRING` | YES | FK | Foreign key referencing category catalog. |
| `created_by` | `STRING` | YES | FK | Creator user UUID reference. |
| `status` | `STRING` | **NO** | Dimension | Publication state: `DRAFT`, `PUBLISHED`, `ARCHIVED`. |
| `created_at_utc` | `TIMESTAMP` | **NO** | Telemetry | Normalized ISO UTC timestamp of quiz creation. |
| `updated_at_utc` | `TIMESTAMP` | **NO** | Telemetry | Normalized ISO UTC timestamp of last quiz update. |

### 5.5 `fct_audit_events`
- **BigQuery Identifier**: `quiz-platform-prod.quiz_platform_analytics.fct_audit_events`
- **Table Type**: Materialized Fact Table
- **Partitioning**: `PARTITION BY DATE(created_at_utc)`
- **Clustering**: `CLUSTER BY action, user_id, resource_type`
- **Business Purpose**: Security, audit trail, proctoring telemetry, and administrative action analysis.

| Column Name | BigQuery Data Type | Nullable | PK / FK | Business Description & Validation Constraint |
|---|---|---|---|---|
| `audit_id` | `STRING` | **NO** | **PK** | Unique UUID identifier for the audit event. |
| `user_id` | `STRING` | YES | FK | Foreign key reference to acting user. |
| `action` | `STRING` | **NO** | Dimension | Standardized event action (`ATTEMPT_SUBMITTED`, `USER_LOGIN`, etc.). |
| `resource_type` | `STRING` | **NO** | Dimension | Target entity type affected by the event. |
| `resource_id` | `STRING` | **NO** | Reference | Target entity UUID identifier. |
| `ip_address` | `STRING` | YES | Telemetry | Client IP address at event time. |
| `user_agent` | `STRING` | YES | Telemetry | Client HTTP user agent header. |
| `details_json` | `JSON` | YES | Semi-Structured| Parsed native BigQuery JSON payload containing event metadata. |
| `is_valid_json` | `BOOL` | **NO** | DQ Indicator | Boolean flag indicating whether raw details payload was valid JSON. |
| `created_at_utc` | `TIMESTAMP` | **NO** | Partition Key | Normalized ISO UTC timestamp when event occurred. |

---

## 6. Quarantine & Exception Routing Schema

### 6.1 `quarantine_orphaned_attempts`
- **BigQuery Identifier**: `quiz-platform-prod.quiz_platform_analytics.quarantine_orphaned_attempts`
- **Description**: Isolation table capturing assessment attempt records that fail referential integrity constraints (referencing non-existent users or quiz definitions).
- **Schema**:
  - `attempt_id` (`STRING`): Ingested attempt UUID.
  - `user_id` (`STRING`): Unresolvable user identifier.
  - `quiz_id` (`STRING`): Unresolvable quiz identifier.
  - `quarantine_reason` (`STRING`): Explanatory reason (e.g. `'ORPHAN_USER_NOT_FOUND'`, `'ORPHAN_QUIZ_NOT_FOUND'`).
  - `raw_payload` (`JSON`): Complete raw attempt payload for forensic replay.
  - `quarantined_at_utc` (`TIMESTAMP`): Timestamp of quarantine isolation.

---

## 7. Downstream Consumption & BI Matrix

| Consumer Application | Primary Tables Queried | Key Metrics / Dimensions | Optimization Strategy |
|---|---|---|---|
| **Executive Performance Dashboard** | `fct_assessment_attempts`, `dim_quizzes` | Completion Rate, Average Percentage, Pass/Fail Ratio by Quiz | Partition pruning on `DATE(started_at_utc)` |
| **Item Distractor Analysis** | `fct_question_responses`, `fct_assessment_attempts` | Option Selection Distribution, Question Discrimination Index | Cluster pruning on `[question_id, is_correct]` |
| **Security & Proctoring Monitor** | `fct_audit_events`, `dim_users` | Rapid Retries, Suspicious IP switches, Off-hours Submissions | Cluster pruning on `[action, user_id]` |
| **Student Transcripts & Certification** | `fct_assessment_attempts`, `dim_users`, `dim_quizzes` | Verified Scores, Completed Attempt Timestamps, Pass Verification | Indexed lookup on `attempt_id` |
