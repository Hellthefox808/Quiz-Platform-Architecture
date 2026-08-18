# Project: Quiz Platform Data Quality, Profiling & Cleaning Pipeline

## Architecture
The Quiz Platform data cleaning and quality engineering pipeline follows an enterprise Medallion Lakehouse Architecture built on Google Cloud BigQuery and Dataform / dbt, validated by Dataplex profiling and automated assertions.

```
+-----------------------------------------------------------------------------------+
|                            BRONZE LAYER (Raw Ingestion)                           |
|  - Raw attempt logs, telemetry, question snapshots, results, audit events         |
|  - Dataform declarations: raw_attempts, raw_responses, raw_quizzes, raw_audits    |
+-----------------------------------------------------------------------------------+
                                         │
                                         ▼
+-----------------------------------------------------------------------------------+
|                        SILVER LAYER (Cleaned & Normalized)                        |
|  - SAFE.PARSE_JSON & safe accessors (JSON_VALUE, JSON_QUERY_ARRAY)                |
|  - Case-preserving ARRAY_FILTER & ARRAY_TRANSFORM (trimming & deduplication)      |
|  - Multi-pattern COALESCE(SAFE.PARSE_TIMESTAMP(...)) to ISO UTC                  |
|  - Score & percentage bounds clamping [0.0, 100.0]                                |
|  - QUALIFY ROW_NUMBER() OVER (...) network retry deduplication                    |
|  - Status enum normalization (COMPLETED, IN_PROGRESS, ABANDONED, etc.)           |
+-----------------------------------------------------------------------------------+
                                         │
                                         ▼
+-----------------------------------------------------------------------------------+
|                         GOLD LAYER (Analytical Marts)                             |
|  - fct_assessment_attempts (partitioned by DATE(started_at_utc), clustered)       |
|  - fct_question_responses (flattened question & option analytical records)        |
|  - dim_quizzes, dim_users (conformed dimensions)                                  |
|  - fct_audit_events (parsed security & audit action telemetry)                    |
+-----------------------------------------------------------------------------------+
                                         │
                                         ▼
+-----------------------------------------------------------------------------------+
|                  DATA QUALITY, ASSERTIONS & DATAPLEX VERIFICATION                 |
|  - Dataform SQLX assertions (non-null PKs, referential integrity, ranges, enums)  |
|  - Dataplex DataScan profiling & YAML DQ rules                                    |
|  - Automated pre/post comparative profiling (drift < 1.0%, 100% defect fix)       |
+-----------------------------------------------------------------------------------+
```

## Feature Inventory
| # | Feature | Description | Requirement | Milestone | Source |
|---|---------|-------------|-------------|-----------|--------|
| FEAT-01 | Anomaly Profiler: Null Inflation Audit | Scan all columns across 14 entities for null counts and null percentages | R1 | M1 | Survey |
| FEAT-02 | Anomaly Profiler: Malformed JSON Audit | Detect unclosed, double-escaped, or non-JSON strings in snapshots and breakdown fields | R1 | M1 | Survey |
| FEAT-03 | Anomaly Profiler: Timezone & Timestamp Audit | Audit multi-format datetime strings, non-UTC offsets (+05:30, -04:00), and epoch millisecond timestamps | R1 | M1 | Survey |
| FEAT-04 | Anomaly Profiler: Duplicate Record Audit | Audit duplicate primary keys and idempotent retry storms | R1 | M1 | Survey |
| FEAT-05 | Anomaly Profiler: Foreign Key Orphan Audit | Identify orphaned child attempts and response records lacking parent references | R1 | M1 | Survey |
| FEAT-06 | Anomaly Profiler: Out-of-Bounds Score Audit | Identify negative marks, percentage > 100%, and division-by-zero anomalies | R1 | M1 | Survey |
| FEAT-07 | Anomaly Profiler: Enum & String Drift Audit | Audit non-standard status values, mixed casing, and trailing whitespace | R1 | M1 | Survey |
| FEAT-08 | Automated Anomaly Audit Summary Report | Generate comprehensive audit scorecards and anomaly taxonomy tables | R1 | M1 | Survey |
| FEAT-09 | Bronze Staging & Schema Declarations | Dataform `declaration` blocks and raw schema models for source telemetry | R2 | M2 | Survey |
| FEAT-10 | Robust JSON Parsing & Safe Accessors | Implement `SAFE.PARSE_JSON`, `JSON_VALUE`, and `JSON_QUERY_ARRAY` without crashing | R2 | M2 | Survey |
| FEAT-11 | Case-Preserving Array Sanitization | Clean arrays with `ARRAY_FILTER` / `ARRAY_TRANSFORM`, remove NULLs/whitespace, strictly preserve casing | R2 | M2 | Survey |
| FEAT-12 | Universal ISO UTC Timestamp Normalization | Parse varied formats via `COALESCE(SAFE.PARSE_TIMESTAMP(...))` to ISO UTC timestamps | R2 | M2 | Survey |
| FEAT-13 | Idempotent Deduplication Engine | Deduplicate using `QUALIFY ROW_NUMBER() OVER(PARTITION BY id ORDER BY updated_at DESC) = 1` | R2 | M2 | Survey |
| FEAT-14 | Score Bounds Clamping & Metric Logic | Clamp percentage to `[0.0, 100.0]`, handle negative marks, guard against `total_marks = 0` | R2 | M2 | Survey |
| FEAT-15 | Status Enum Normalization & Casting | Standardize attempt statuses (`CREATED`, `IN_PROGRESS`, `SUBMITTING`, `COMPLETED`, `EXPIRED`, `CANCELLED`, `ABANDONED`) | R2 | M2 | Survey |
| FEAT-16 | Referential Integrity & Quarantine Strategy | Handle or isolate orphaned records with deterministic fallback keys | R2 | M2 | Survey |
| FEAT-17 | Gold Analytical Marts (Fact & Dim Models) | Partitioned & clustered fact models (`fct_assessment_attempts`, `fct_question_responses`, etc.) | R2 | M2 | Survey |
| FEAT-18 | Assertion: Primary Key Uniqueness & Non-Null | Enforce `id IS NOT NULL` and unique constraints on all core models | R3 | M3 | Survey |
| FEAT-19 | Assertion: Referential Integrity Constraints | Validate foreign keys between attempts, users, quizzes, and attempt questions | R3 | M3 | Survey |
| FEAT-20 | Assertion: Numeric Range Bounds | Validate percentage in `[0.0, 100.0]` and duration `>= 0` | R3 | M3 | Survey |
| FEAT-21 | Assertion: Status Enum Domain Conformance | Validate all status values belong to permitted enum sets | R3 | M3 | Survey |
| FEAT-22 | Assertion: Timestamp Monotonicity & Validity | Enforce `submitted_at >= started_at` and non-null ISO UTC strings | R3 | M3 | Survey |
| FEAT-23 | Assertion: Question Snapshot & Array Integrity | Enforce parsed JSON validity and non-empty valid option arrays | R3 | M3 | Survey |
| FEAT-24 | Automated Assertion Suite Runner & Reporter | Integrated Dataform assertion test runner with structured failure logging | R3 | M3 | Survey |
| FEAT-25 | Dataplex Profiling Scans & YAML Rules | Dataplex statistical profiling configuration and YAML data quality rule definitions | R4 | M4 | Survey |
| FEAT-26 | Comparative Pre/Post Transformation Profiler | Mathematical verification of $< 1.0\%$ null rate drift across non-nullable attributes | R4 | M4 | Survey |
| FEAT-27 | 100% Defect Remediation Audit | Quantitative verification that all R1 anomalies are $100\%$ resolved in Gold marts | R4 | M4 | Survey |
| FEAT-28 | Data Dictionary & Transformation Documentation | Comprehensive data dictionary, schema contracts, and pipeline operational documentation | R4 | M4 | Survey |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M0 | Survey & Architecture | Scope mapping, defect taxonomy, architecture design | none | DONE |
| M1 | Source Anomaly Profiler (R1) | SQL audit queries, anomaly profiling engine, baseline reports | M0 | IN_PROGRESS |
| M2 | Core Cleansing Pipeline (R2) | Staging, Silver transforms, Gold marts, BigQuery SQL/Dataform models | M1 | PLANNED |
| M3 | Data Quality Assertions (R3) | Dataform SQLX assertions, non-null/FK/range/enum validation suite | M2 | PLANNED |
| M4 | Verification & Dataplex (R4) | Null drift verification (<1%), 100% remediation audit, data dictionary | M3 | PLANNED |
| M5 | E2E Testing & Hardening | Opaque-box E2E test suite (Tiers 1-4) + Adversarial stress testing (Tier 5) | Parallel / M4 | PLANNED |

## Interface Contracts
### Raw Bronze -> Silver Intermediate
- **Input**: Raw text/JSON strings, mixed timestamp formats (`+05:30`, `-04:00`, `Z`, `epoch_ms`), unescaped JSON.
- **Output**: Cleaned columns with strictly typed schema: `TIMESTAMP` in UTC, parsed `JSON` objects, cleaned `ARRAY<STRING>` with original casing, normalized uppercase `ENUM` strings.

### Silver Intermediate -> Gold Marts
- **Output Tables**:
  - `fct_assessment_attempts`: `attempt_id STRING`, `user_id STRING`, `quiz_id STRING`, `quiz_version_id STRING`, `status STRING`, `started_at_utc TIMESTAMP`, `submitted_at_utc TIMESTAMP`, `duration_seconds INT64`, `total_marks FLOAT64`, `obtained_marks FLOAT64`, `percentage FLOAT64`, `is_passed BOOL`, `breakdown JSON`, `ingested_at TIMESTAMP`.
  - `fct_question_responses`: `attempt_question_id STRING`, `attempt_id STRING`, `question_id STRING`, `selected_option_ids ARRAY<STRING>`, `text_response STRING`, `is_correct BOOL`, `marks_awarded FLOAT64`, `response_time_seconds INT64`.

## Code Layout
```
d:\QWERTYUIOP\data_cleaning_pipeline\
├── dataform.json                     # Dataform root project configuration
├── package.json                      # Dataform / npm dependencies
├── definitions/
│   ├── sources/                      # Bronze Layer (declarations & raw inputs)
│   │   ├── raw_attempts.sqlx
│   │   ├── raw_responses.sqlx
│   │   ├── raw_quizzes.sqlx
│   │   └── raw_users.sqlx
│   ├── staging/                      # Silver Layer (cleaning & normalization)
│   │   ├── stg_assessment_attempts.sqlx
│   │   ├── stg_question_responses.sqlx
│   │   └── stg_audit_logs.sqlx
│   ├── marts/                        # Gold Layer (analytical fact & dim marts)
│   │   ├── fct_assessment_attempts.sqlx
│   │   ├── fct_question_responses.sqlx
│   │   ├── dim_quizzes.sqlx
│   │   └── dim_users.sqlx
│   └── assertions/                   # Dataform Automated Assertions
│       ├── assert_attempts_pk_unique_not_null.sqlx
│       ├── assert_attempts_referential_integrity.sqlx
│       ├── assert_attempts_percentage_bounds.sqlx
│       ├── assert_attempts_status_valid_enum.sqlx
│       ├── assert_responses_snapshot_valid_json.sqlx
│       └── assert_attempts_timestamps_monotonic.sqlx
├── sql/
│   ├── profiling/                    # BigQuery SQL Anomaly Profiling Scripts
│   │   ├── 01_null_inflation_audit.sql
│   │   ├── 02_malformed_json_audit.sql
│   │   ├── 03_timestamp_timezone_audit.sql
│   │   ├── 04_duplicate_records_audit.sql
│   │   ├── 05_referential_integrity_audit.sql
│   │   ├── 06_score_bounds_audit.sql
│   │   └── 07_comprehensive_profiling_summary.sql
│   ├── transformations/              # Standalone Pure BigQuery SQL Models
│   │   ├── clean_assessment_attempts.sql
│   │   ├── clean_question_responses.sql
│   │   └── clean_audit_logs.sql
│   └── verification/                 # Post-Transformation Verification Queries
│       ├── verify_null_drift.sql
│       ├── verify_defect_resolution.sql
│       └── verify_all_assertions.sql
├── dataplex/
│   ├── dataplex_profile_spec.yaml    # Dataplex statistical profile scan spec
│   └── dataplex_dq_rules.yaml        # Dataplex data quality rules
├── docs/
│   ├── DATA_DICTIONARY.md            # Comprehensive data catalog & schemas
│   └── TRANSFORMATION_LOG.md         # Anomaly remediation & lineage documentation
└── tests/
    ├── e2e_test_runner.py            # Comprehensive E2E test execution harness
    ├── test_tier1_feature_coverage.py
    ├── test_tier2_boundaries_corners.py
    ├── test_tier3_cross_feature.py
    ├── test_tier4_workloads.py
    └── test_tier5_adversarial.py
```
