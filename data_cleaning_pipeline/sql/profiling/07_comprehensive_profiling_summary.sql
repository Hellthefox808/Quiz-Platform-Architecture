-- =============================================================================
-- Script: 07_comprehensive_profiling_summary.sql
-- Description: Executive Data Quality Scorecard & Anomaly Profiling Summary
-- Feature: FEAT-08 (Automated Anomaly Audit Summary Report)
-- Requirement: R1 (Source Data Profiling & Anomaly Audit)
-- Author: Profiling & Anomaly Audit Worker (Milestone 1)
-- Dialect: Google Standard SQL (BigQuery)
-- =============================================================================

/*
  PURPOSE:
  Synthesizes anomaly discovery metrics across all 8 defect categories (FEAT-01 to FEAT-08)
  into a unified executive scorecard. Provides exact defect counts, affected source entities,
  severity ratings, and recommended BigQuery/Dataform SQL remediation logic.
*/

WITH anomaly_null_inflation AS (
  SELECT
    'ANOM-01' AS defect_id,
    'Null Inflation on Mandatory Keys' AS anomaly_category,
    'raw_assessment_attempts, raw_users, raw_quizzes' AS affected_entities,
    (
      SELECT COUNTIF(id IS NULL OR user_id IS NULL OR quiz_id IS NULL OR started_at IS NULL)
      FROM `quiz_platform_raw.raw_assessment_attempts`
    ) AS defect_count,
    (SELECT COUNT(*) FROM `quiz_platform_raw.raw_assessment_attempts`) AS total_scanned,
    'CRITICAL' AS severity,
    'Silver / Staging' AS target_remediation_layer,
    'Filter out corrupted PK nulls; route missing FKs to quarantine' AS remediation_sql
),

anomaly_malformed_json AS (
  SELECT
    'ANOM-02' AS defect_id,
    'Malformed & Double-Escaped JSON' AS anomaly_category,
    'raw_attempt_questions.question_snapshot, raw_results.breakdown, raw_audit_logs.details' AS affected_entities,
    (
      SELECT COUNTIF(SAFE.PARSE_JSON(CAST(question_snapshot AS STRING)) IS NULL AND question_snapshot IS NOT NULL)
      FROM `quiz_platform_raw.raw_attempt_questions`
    ) + (
      SELECT COUNTIF(SAFE.PARSE_JSON(CAST(breakdown AS STRING)) IS NULL AND breakdown IS NOT NULL)
      FROM `quiz_platform_raw.raw_results`
    ) + (
      SELECT COUNTIF(SAFE.PARSE_JSON(CAST(details AS STRING)) IS NULL AND details IS NOT NULL)
      FROM `quiz_platform_raw.raw_audit_logs`
    ) AS defect_count,
    (
      (SELECT COUNT(*) FROM `quiz_platform_raw.raw_attempt_questions`) +
      (SELECT COUNT(*) FROM `quiz_platform_raw.raw_results`) +
      (SELECT COUNT(*) FROM `quiz_platform_raw.raw_audit_logs`)
    ) AS total_scanned,
    'CRITICAL' AS severity,
    'Silver / Intermediate' AS target_remediation_layer,
    'Apply SAFE.PARSE_JSON() with unescape fallback and safe accessors JSON_VALUE/JSON_QUERY' AS remediation_sql
),

anomaly_timestamp_tz AS (
  SELECT
    'ANOM-03' AS defect_id,
    'Non-UTC Offsets & Epoch Timestamps' AS anomaly_category,
    'raw_assessment_attempts, raw_audit_logs, raw_certificates' AS affected_entities,
    (
      SELECT COUNTIF(
        NOT REGEXP_CONTAINS(CAST(started_at AS STRING), r'^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$')
        AND started_at IS NOT NULL
      )
      FROM `quiz_platform_raw.raw_assessment_attempts`
    ) AS defect_count,
    (SELECT COUNT(*) FROM `quiz_platform_raw.raw_assessment_attempts`) AS total_scanned,
    'HIGH' AS severity,
    'Silver / Staging' AS target_remediation_layer,
    'Multi-branch COALESCE(SAFE.PARSE_TIMESTAMP(...), TIMESTAMP_MILLIS(...)) normalizing to UTC' AS remediation_sql
),

anomaly_duplicate_records AS (
  SELECT
    'ANOM-04' AS defect_id,
    'Duplicate Primary Keys & Retry Storms' AS anomaly_category,
    'raw_assessment_attempts, raw_attempt_questions, raw_results' AS affected_entities,
    (
      SELECT (COUNT(*) - COUNT(DISTINCT id))
      FROM `quiz_platform_raw.raw_assessment_attempts`
    ) + (
      SELECT (COUNT(*) - COUNT(DISTINCT id))
      FROM `quiz_platform_raw.raw_attempt_questions`
    ) AS defect_count,
    (
      (SELECT COUNT(*) FROM `quiz_platform_raw.raw_assessment_attempts`) +
      (SELECT COUNT(*) FROM `quiz_platform_raw.raw_attempt_questions`)
    ) AS total_scanned,
    'CRITICAL' AS severity,
    'Silver / Intermediate' AS target_remediation_layer,
    'QUALIFY ROW_NUMBER() OVER(PARTITION BY id ORDER BY updated_at DESC, created_at DESC) = 1' AS remediation_sql
),

anomaly_referential_orphans AS (
  SELECT
    'ANOM-05' AS defect_id,
    'Foreign Key Referential Orphans' AS anomaly_category,
    'raw_assessment_attempts, raw_attempt_questions, raw_results' AS affected_entities,
    (
      SELECT COUNT(a.id)
      FROM `quiz_platform_raw.raw_assessment_attempts` a
      LEFT JOIN `quiz_platform_raw.raw_users` u ON a.user_id = u.id
      WHERE u.id IS NULL AND a.user_id IS NOT NULL
    ) + (
      SELECT COUNT(aq.id)
      FROM `quiz_platform_raw.raw_attempt_questions` aq
      LEFT JOIN `quiz_platform_raw.raw_assessment_attempts` a ON aq.attempt_id = a.id
      WHERE a.id IS NULL AND aq.attempt_id IS NOT NULL
    ) AS defect_count,
    (
      (SELECT COUNT(*) FROM `quiz_platform_raw.raw_assessment_attempts`) +
      (SELECT COUNT(*) FROM `quiz_platform_raw.raw_attempt_questions`)
    ) AS total_scanned,
    'CRITICAL' AS severity,
    'Silver / Quarantine' AS target_remediation_layer,
    'Left join with dimensions; isolate unresolvable records into quarantine tables' AS remediation_sql
),

anomaly_score_bounds AS (
  SELECT
    'ANOM-06' AS defect_id,
    'Out-of-Bounds Scores & Zero-Mark Hazards' AS anomaly_category,
    'raw_assessment_attempts, raw_results' AS affected_entities,
    (
      SELECT COUNTIF(
        percentage < 0.0 OR percentage > 100.0 OR score < 0.0 
        OR (total_marks = 0.0 AND score > 0.0) OR time_taken_seconds < 0
      )
      FROM `quiz_platform_raw.raw_assessment_attempts`
    ) AS defect_count,
    (SELECT COUNT(*) FROM `quiz_platform_raw.raw_assessment_attempts`) AS total_scanned,
    'HIGH' AS severity,
    'Silver / Intermediate' AS target_remediation_layer,
    'Clamp percentage to LEAST(100.0, GREATEST(0.0, score)); safe divide with NULLIF(total_marks, 0)' AS remediation_sql
),

anomaly_enum_drift AS (
  SELECT
    'ANOM-07' AS defect_id,
    'Enum Casing, Whitespace & Value Drift' AS anomaly_category,
    'raw_assessment_attempts.status, raw_users.role, raw_quizzes.status' AS affected_entities,
    (
      SELECT COUNTIF(
        status != UPPER(TRIM(status)) 
        OR UPPER(TRIM(status)) NOT IN ('CREATED', 'IN_PROGRESS', 'SUBMITTING', 'COMPLETED', 'EXPIRED', 'CANCELLED', 'ABANDONED')
      )
      FROM `quiz_platform_raw.raw_assessment_attempts`
    ) AS defect_count,
    (SELECT COUNT(*) FROM `quiz_platform_raw.raw_assessment_attempts`) AS total_scanned,
    'MEDIUM' AS severity,
    'Silver / Staging' AS target_remediation_layer,
    'Normalize with UPPER(TRIM(status)) and CASE domain mapping' AS remediation_sql
),

anomaly_array_nulls AS (
  SELECT
    'ANOM-08' AS defect_id,
    'Array NULL Elements & Whitespace Pollution' AS anomaly_category,
    'raw_attempt_questions.question_snapshot.options' AS affected_entities,
    (
      SELECT COUNTIF(
        SAFE.PARSE_JSON(CAST(question_snapshot AS STRING)) IS NOT NULL
        AND JSON_QUERY_ARRAY(SAFE.PARSE_JSON(CAST(question_snapshot AS STRING)), '$.options') IS NOT NULL
        AND EXISTS(
          SELECT 1 
          FROM UNNEST(JSON_QUERY_ARRAY(SAFE.PARSE_JSON(CAST(question_snapshot AS STRING)), '$.options')) AS opt
          WHERE opt IS NULL OR TRIM(JSON_VALUE(opt, '$.option_text')) = ''
        )
      )
      FROM `quiz_platform_raw.raw_attempt_questions`
    ) AS defect_count,
    (SELECT COUNT(*) FROM `quiz_platform_raw.raw_attempt_questions`) AS total_scanned,
    'HIGH' AS severity,
    'Silver / Intermediate' AS target_remediation_layer,
    'Sanitize via ARRAY_FILTER(arr, x -> x IS NOT NULL) and case-preserving deduplication' AS remediation_sql
),

combined_scorecard AS (
  SELECT * FROM anomaly_null_inflation
  UNION ALL SELECT * FROM anomaly_malformed_json
  UNION ALL SELECT * FROM anomaly_timestamp_tz
  UNION ALL SELECT * FROM anomaly_duplicate_records
  UNION ALL SELECT * FROM anomaly_referential_orphans
  UNION ALL SELECT * FROM anomaly_score_bounds
  UNION ALL SELECT * FROM anomaly_enum_drift
  UNION ALL SELECT * FROM anomaly_array_nulls
)

SELECT
  defect_id,
  anomaly_category,
  affected_entities,
  total_scanned,
  defect_count,
  ROUND(SAFE_DIVIDE(defect_count * 100.0, total_scanned), 2) AS defect_rate_pct,
  severity,
  target_remediation_layer,
  remediation_sql,
  CASE
    WHEN defect_count = 0 THEN 'PASS (Clean)'
    WHEN severity = 'CRITICAL' THEN 'ACTION_REQUIRED (Pipeline Blocker)'
    ELSE 'ACTION_REQUIRED (Remediation Needed)'
  END AS audit_status
FROM combined_scorecard
ORDER BY
  CASE severity
    WHEN 'CRITICAL' THEN 1
    WHEN 'HIGH' THEN 2
    WHEN 'MEDIUM' THEN 3
    ELSE 4
  END,
  defect_rate_pct DESC;
