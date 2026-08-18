-- =============================================================================
-- Script: 04_duplicate_records_audit.sql
-- Description: Primary Key Collisions & Network Retry Duplication Auditor
-- Feature: FEAT-04 (Anomaly Profiler: Duplicate Record Audit)
-- Requirement: R1 (Source Data Profiling & Anomaly Audit)
-- Author: Profiling & Anomaly Audit Worker (Milestone 1)
-- Dialect: Google Standard SQL (BigQuery)
-- =============================================================================

/*
  PURPOSE:
  Identifies duplicate primary keys, composite natural key collisions, and
  client network retry storms across raw ingested tables.
  Calculates collision rates and cluster distributions to inform window-based
  idempotent deduplication strategies.
*/

WITH attempts_pk_duplicates AS (
  SELECT
    'raw_assessment_attempts' AS table_name,
    'id' AS key_type,
    id AS key_value,
    COUNT(*) AS occurrence_count,
    MIN(created_at) AS earliest_seen,
    MAX(created_at) AS latest_seen
  FROM `quiz_platform_raw.raw_assessment_attempts`
  WHERE id IS NOT NULL
  GROUP BY id
  HAVING COUNT(*) > 1
),

attempts_retry_clusters AS (
  -- Telemetry retry storm on natural submission key: user_id + quiz_version_id + started_at
  SELECT
    'raw_assessment_attempts' AS table_name,
    'NATURAL_KEY (user_id + quiz_version_id + started_at)' AS key_type,
    CONCAT(COALESCE(user_id, 'NULL'), ' | ', COALESCE(quiz_version_id, 'NULL'), ' | ', CAST(started_at AS STRING)) AS key_value,
    COUNT(*) AS occurrence_count,
    MIN(created_at) AS earliest_seen,
    MAX(created_at) AS latest_seen
  FROM `quiz_platform_raw.raw_assessment_attempts`
  GROUP BY user_id, quiz_version_id, started_at
  HAVING COUNT(*) > 1
),

attempt_questions_pk_duplicates AS (
  SELECT
    'raw_attempt_questions' AS table_name,
    'id' AS key_type,
    id AS key_value,
    COUNT(*) AS occurrence_count,
    MIN(created_at) AS earliest_seen,
    MAX(created_at) AS latest_seen
  FROM `quiz_platform_raw.raw_attempt_questions`
  WHERE id IS NOT NULL
  GROUP BY id
  HAVING COUNT(*) > 1
),

results_pk_duplicates AS (
  SELECT
    'raw_results' AS table_name,
    'id' AS key_type,
    id AS key_value,
    COUNT(*) AS occurrence_count,
    MIN(created_at) AS earliest_seen,
    MAX(created_at) AS latest_seen
  FROM `quiz_platform_raw.raw_results`
  WHERE id IS NOT NULL
  GROUP BY id
  HAVING COUNT(*) > 1
),

results_attempt_id_duplicates AS (
  -- 1-to-1 attempt_id invariant in results table
  SELECT
    'raw_results' AS table_name,
    'UNIQUE_KEY (attempt_id)' AS key_type,
    attempt_id AS key_value,
    COUNT(*) AS occurrence_count,
    MIN(created_at) AS earliest_seen,
    MAX(created_at) AS latest_seen
  FROM `quiz_platform_raw.raw_results`
  WHERE attempt_id IS NOT NULL
  GROUP BY attempt_id
  HAVING COUNT(*) > 1
),

users_email_duplicates AS (
  SELECT
    'raw_users' AS table_name,
    'UNIQUE_KEY (email)' AS key_type,
    LOWER(TRIM(email)) AS key_value,
    COUNT(*) AS occurrence_count,
    MIN(created_at) AS earliest_seen,
    MAX(created_at) AS latest_seen
  FROM `quiz_platform_raw.raw_users`
  WHERE email IS NOT NULL
  GROUP BY LOWER(TRIM(email))
  HAVING COUNT(*) > 1
),

certificates_code_duplicates AS (
  SELECT
    'raw_certificates' AS table_name,
    'UNIQUE_KEY (certificate_code)' AS key_type,
    certificate_code AS key_value,
    COUNT(*) AS occurrence_count,
    MIN(created_at) AS earliest_seen,
    MAX(created_at) AS latest_seen
  FROM `quiz_platform_raw.raw_certificates`
  WHERE certificate_code IS NOT NULL
  GROUP BY certificate_code
  HAVING COUNT(*) > 1
),

audit_logs_pk_duplicates AS (
  SELECT
    'raw_audit_logs' AS table_name,
    'id' AS key_type,
    id AS key_value,
    COUNT(*) AS occurrence_count,
    MIN(created_at) AS earliest_seen,
    MAX(created_at) AS latest_seen
  FROM `quiz_platform_raw.raw_audit_logs`
  WHERE id IS NOT NULL
  GROUP BY id
  HAVING COUNT(*) > 1
),

-- Combine all duplicate clusters
all_duplicate_clusters AS (
  SELECT * FROM attempts_pk_duplicates
  UNION ALL SELECT * FROM attempts_retry_clusters
  UNION ALL SELECT * FROM attempt_questions_pk_duplicates
  UNION ALL SELECT * FROM results_pk_duplicates
  UNION ALL SELECT * FROM results_attempt_id_duplicates
  UNION ALL SELECT * FROM users_email_duplicates
  UNION ALL SELECT * FROM certificates_code_duplicates
  UNION ALL SELECT * FROM audit_logs_pk_duplicates
),

table_level_stats AS (
  SELECT
    'raw_assessment_attempts' AS table_name,
    COUNT(*) AS total_rows,
    COUNT(DISTINCT id) AS distinct_pk_count
  FROM `quiz_platform_raw.raw_assessment_attempts`

  UNION ALL

  SELECT
    'raw_attempt_questions' AS table_name,
    COUNT(*) AS total_rows,
    COUNT(DISTINCT id) AS distinct_pk_count
  FROM `quiz_platform_raw.raw_attempt_questions`

  UNION ALL

  SELECT
    'raw_results' AS table_name,
    COUNT(*) AS total_rows,
    COUNT(DISTINCT id) AS distinct_pk_count
  FROM `quiz_platform_raw.raw_results`

  UNION ALL

  SELECT
    'raw_users' AS table_name,
    COUNT(*) AS total_rows,
    COUNT(DISTINCT id) AS distinct_pk_count
  FROM `quiz_platform_raw.raw_users`

  UNION ALL

  SELECT
    'raw_certificates' AS table_name,
    COUNT(*) AS total_rows,
    COUNT(DISTINCT id) AS distinct_pk_count
  FROM `quiz_platform_raw.raw_certificates`

  UNION ALL

  SELECT
    'raw_audit_logs' AS table_name,
    COUNT(*) AS total_rows,
    COUNT(DISTINCT id) AS distinct_pk_count
  FROM `quiz_platform_raw.raw_audit_logs`
)

-- Summary Scorecard per Table
SELECT
  t.table_name,
  t.total_rows,
  t.distinct_pk_count,
  (t.total_rows - t.distinct_pk_count) AS duplicate_rows_count,
  ROUND(SAFE_DIVIDE((t.total_rows - t.distinct_pk_count) * 100.0, t.total_rows), 2) AS duplicate_collision_pct,
  COALESCE(SUM(c.occurrence_count), 0) AS total_clustered_duplicate_events,
  COUNT(c.key_value) AS distinct_duplicate_keys_count,
  CASE
    WHEN (t.total_rows - t.distinct_pk_count) > 0 THEN 'CRITICAL'
    WHEN COUNT(c.key_value) > 0 THEN 'HIGH'
    ELSE 'CLEAN'
  END AS severity,
  'Deduplicate using QUALIFY ROW_NUMBER() OVER(PARTITION BY id ORDER BY updated_at DESC, created_at DESC) = 1' AS recommended_remediation
FROM table_level_stats t
LEFT JOIN all_duplicate_clusters c ON t.table_name = c.table_name
GROUP BY t.table_name, t.total_rows, t.distinct_pk_count
ORDER BY duplicate_rows_count DESC, duplicate_collision_pct DESC;
