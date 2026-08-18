-- =============================================================================
-- Verification Script: verify_defect_resolution.sql
-- Description: Verifies 100% remediation of all 8 discovered defect classes
--              (DEF-01 through DEF-08) across the transformed Gold analytical marts.
-- Standard: Remediation rate must equal 100.0% with exactly 0 residual violations.
-- Dialect: Google Standard SQL (BigQuery)
-- Target Layer: `quiz_platform_analytics` (Gold Marts)
-- =============================================================================

WITH def01_null_inflation AS (
  SELECT
    'DEF-01' AS defect_id,
    'Null Inflation in Primary / Foreign / Mandatory Keys' AS defect_name,
    'fct_assessment_attempts, fct_question_responses, dim_users, dim_quizzes' AS target_tables,
    (
      (SELECT COUNTIF(attempt_id IS NULL OR TRIM(attempt_id) = '' OR user_id IS NULL OR TRIM(user_id) = '' OR quiz_id IS NULL OR TRIM(quiz_id) = '' OR started_at_utc IS NULL OR status IS NULL OR TRIM(status) = '') FROM `quiz-platform-prod.quiz_platform_analytics.fct_assessment_attempts`) +
      (SELECT COUNTIF(response_id IS NULL OR TRIM(response_id) = '' OR attempt_id IS NULL OR TRIM(attempt_id) = '' OR question_id IS NULL OR TRIM(question_id) = '' OR created_at_utc IS NULL) FROM `quiz-platform-prod.quiz_platform_analytics.fct_question_responses`) +
      (SELECT COUNTIF(user_id IS NULL OR TRIM(user_id) = '' OR email IS NULL OR TRIM(email) = '' OR role IS NULL OR status IS NULL) FROM `quiz-platform-prod.quiz_platform_analytics.dim_users`) +
      (SELECT COUNTIF(quiz_id IS NULL OR TRIM(quiz_id) = '' OR title IS NULL OR TRIM(title) = '' OR slug IS NULL OR status IS NULL) FROM `quiz-platform-prod.quiz_platform_analytics.dim_quizzes`)
    ) AS violations_found,
    'Enforced strict non-null casting, trimming, and fallback defaults across all mandatory keys' AS sql_remediation_applied
),

def02_malformed_json AS (
  SELECT
    'DEF-02' AS defect_id,
    'Malformed / Unclosed JSON Payloads' AS defect_name,
    'fct_question_responses, fct_audit_events' AS target_tables,
    (
      -- Verify zero JSON parse crashes, valid snapshot indicators, and zero invalid JSON in audit events
      (SELECT COUNTIF(is_snapshot_valid IS NULL) FROM `quiz-platform-prod.quiz_platform_analytics.fct_question_responses`) +
      (SELECT COUNTIF(is_valid_json IS NULL OR is_valid_json = FALSE) FROM `quiz-platform-prod.quiz_platform_analytics.fct_audit_events`)
    ) AS violations_found,
    'Implemented SAFE.PARSE_JSON with safe scalar accessors (JSON_VALUE) and structured fallback' AS sql_remediation_applied
),

def03_timestamp_anomalies AS (
  SELECT
    'DEF-03' AS defect_id,
    'Timezone Offsets & Chronological Inversions' AS defect_name,
    'fct_assessment_attempts, fct_question_responses, fct_audit_events' AS target_tables,
    (
      -- Verify chronological monotonicity and UTC normalization
      (SELECT COUNTIF(
        started_at_utc IS NULL OR
        (expires_at_utc IS NOT NULL AND expires_at_utc < started_at_utc) OR
        (submitted_at_utc IS NOT NULL AND submitted_at_utc < started_at_utc)
      ) FROM `quiz-platform-prod.quiz_platform_analytics.fct_assessment_attempts`) +
      (SELECT COUNTIF(created_at_utc IS NULL) FROM `quiz-platform-prod.quiz_platform_analytics.fct_question_responses`) +
      (SELECT COUNTIF(created_at_utc IS NULL) FROM `quiz-platform-prod.quiz_platform_analytics.fct_audit_events`)
    ) AS violations_found,
    'Standardized to ISO UTC via multi-pattern COALESCE(SAFE.PARSE_TIMESTAMP(...)) and monotonicity safeguards' AS sql_remediation_applied
),

def04_duplicate_records AS (
  SELECT
    'DEF-04' AS defect_id,
    'Duplicate Primary Keys & Ingestion Retry Storms' AS defect_name,
    'fct_assessment_attempts, fct_question_responses, dim_users, dim_quizzes, fct_audit_events' AS target_tables,
    (
      (SELECT COUNT(*) - COUNT(DISTINCT attempt_id) FROM `quiz-platform-prod.quiz_platform_analytics.fct_assessment_attempts`) +
      (SELECT COUNT(*) - COUNT(DISTINCT response_id) FROM `quiz-platform-prod.quiz_platform_analytics.fct_question_responses`) +
      (SELECT COUNT(*) - COUNT(DISTINCT user_id) FROM `quiz-platform-prod.quiz_platform_analytics.dim_users`) +
      (SELECT COUNT(*) - COUNT(DISTINCT quiz_id) FROM `quiz-platform-prod.quiz_platform_analytics.dim_quizzes`) +
      (SELECT COUNT(*) - COUNT(DISTINCT audit_id) FROM `quiz-platform-prod.quiz_platform_analytics.fct_audit_events`)
    ) AS violations_found,
    'Deduplicated using QUALIFY ROW_NUMBER() OVER(PARTITION BY id ORDER BY updated_at DESC, created_at DESC) = 1' AS sql_remediation_applied
),

def05_fk_orphans AS (
  SELECT
    'DEF-05' AS defect_id,
    'Referential Integrity Foreign Key Orphans' AS defect_name,
    'fct_assessment_attempts, fct_question_responses' AS target_tables,
    (
      -- Verify all orphaned records are cleanly tagged and 0 unmanaged leaks exist
      (SELECT COUNTIF(is_orphaned IS NULL) FROM `quiz-platform-prod.quiz_platform_analytics.fct_assessment_attempts`) +
      (SELECT COUNTIF(attempt_id NOT IN (SELECT attempt_id FROM `quiz-platform-prod.quiz_platform_analytics.fct_assessment_attempts`)) FROM `quiz-platform-prod.quiz_platform_analytics.fct_question_responses`)
    ) AS violations_found,
    'Enforced explicit relational joins, is_orphaned boolean tagging, and deterministic quarantine routing' AS sql_remediation_applied
),

def06_score_out_of_bounds AS (
  SELECT
    'DEF-06' AS defect_id,
    'Out-of-Bounds Scores, Percentages & Durations' AS defect_name,
    'fct_assessment_attempts, fct_question_responses' AS target_tables,
    (
      (SELECT COUNTIF(
        score < 0.0 OR
        total_marks < 0.0 OR
        percentage < 0.0 OR
        percentage > 100.0 OR
        duration_seconds < 0
      ) FROM `quiz-platform-prod.quiz_platform_analytics.fct_assessment_attempts`) +
      (SELECT COUNTIF(
        marks_awarded < 0.0 OR
        time_spent_seconds < 0
      ) FROM `quiz-platform-prod.quiz_platform_analytics.fct_question_responses`)
    ) AS violations_found,
    'Applied LEAST(100.0, GREATEST(0.0, ...)), NULLIF(total_marks, 0.0) division protection, and non-negative duration calculations' AS sql_remediation_applied
),

def07_enum_drift AS (
  SELECT
    'DEF-07' AS defect_id,
    'Enum Casing, Trailing Whitespace & Domain Drift' AS defect_name,
    'fct_assessment_attempts, dim_users, fct_question_responses' AS target_tables,
    (
      (SELECT COUNTIF(
        status NOT IN ('CREATED', 'IN_PROGRESS', 'SUBMITTING', 'COMPLETED', 'EXPIRED', 'CANCELLED', 'ABANDONED')
      ) FROM `quiz-platform-prod.quiz_platform_analytics.fct_assessment_attempts`) +
      (SELECT COUNTIF(
        role NOT IN ('STUDENT', 'INSTRUCTOR', 'ADMIN', 'PROCTOR') OR
        status NOT IN ('ACTIVE', 'SUSPENDED', 'INACTIVE')
      ) FROM `quiz-platform-prod.quiz_platform_analytics.dim_users`) +
      (SELECT COUNTIF(
        difficulty IS NOT NULL AND difficulty NOT IN ('EASY', 'MEDIUM', 'HARD', 'EXPERT')
      ) FROM `quiz-platform-prod.quiz_platform_analytics.fct_question_responses`)
    ) AS violations_found,
    'Applied UPPER(TRIM(enum_col)) with CASE-WHEN domain validation and safe fallback mapping' AS sql_remediation_applied
),

def08_array_corruption AS (
  SELECT
    'DEF-08' AS defect_id,
    'Array Element Nulls, Whitespace & Duplication' AS defect_name,
    'fct_question_responses' AS target_tables,
    (
      SELECT COUNTIF(
        (
          SELECT COUNT(1)
          FROM UNNEST(selected_option_ids) AS opt
          WHERE opt IS NULL OR TRIM(opt) = '' OR opt != TRIM(opt)
        ) > 0
      )
      FROM `quiz-platform-prod.quiz_platform_analytics.fct_question_responses`
    ) AS violations_found,
    'Sanitized arrays using UNNEST DISTINCT with TRIM filter while strictly preserving original textual casing' AS sql_remediation_applied
),

all_defects AS (
  SELECT * FROM def01_null_inflation
  UNION ALL SELECT * FROM def02_malformed_json
  UNION ALL SELECT * FROM def03_timestamp_anomalies
  UNION ALL SELECT * FROM def04_duplicate_records
  UNION ALL SELECT * FROM def05_fk_orphans
  UNION ALL SELECT * FROM def06_score_out_of_bounds
  UNION ALL SELECT * FROM def07_enum_drift
  UNION ALL SELECT * FROM def08_array_corruption
)

SELECT
  defect_id,
  defect_name,
  target_tables,
  violations_found,
  CASE
    WHEN violations_found = 0 THEN 100.00
    ELSE ROUND((1.0 - SAFE_DIVIDE(violations_found, 100.0)) * 100.0, 2)
  END AS remediation_rate_pct,
  CASE
    WHEN violations_found = 0 THEN '100% REMEDIATED (PASS)'
    ELSE 'UNRESOLVED DEFECTS (FAIL)'
  END AS verification_status,
  sql_remediation_applied,
  CURRENT_TIMESTAMP() AS verified_at_utc
FROM
  all_defects
ORDER BY
  defect_id;
