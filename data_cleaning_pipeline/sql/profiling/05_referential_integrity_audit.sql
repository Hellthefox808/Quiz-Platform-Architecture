-- =============================================================================
-- Script: 05_referential_integrity_audit.sql
-- Description: Foreign Key Referential Integrity & Orphaned Records Auditor
-- Feature: FEAT-05 (Anomaly Profiler: Foreign Key Orphan Audit)
-- Requirement: R1 (Source Data Profiling & Anomaly Audit)
-- Author: Profiling & Anomaly Audit Worker (Milestone 1)
-- Dialect: Google Standard SQL (BigQuery)
-- =============================================================================

/*
  PURPOSE:
  Scans all relational dependencies and foreign key constraints across the 11 raw entities.
  Identifies orphaned child records lacking corresponding parent dimensions
  (e.g., attempt questions without attempts, attempts with deleted users or deleted quizzes).
  Generates metrics for quarantine routing and surrogate key enrichment.
*/

WITH orphan_attempts_users AS (
  SELECT
    'REL-01' AS relationship_id,
    'raw_users' AS parent_table,
    'id' AS parent_pk_column,
    'raw_assessment_attempts' AS child_table,
    'user_id' AS child_fk_column,
    COUNT(c.id) AS total_child_records,
    COUNTIF(p.id IS NULL AND c.user_id IS NOT NULL) AS orphan_records_count
  FROM `quiz_platform_raw.raw_assessment_attempts` c
  LEFT JOIN `quiz_platform_raw.raw_users` p ON c.user_id = p.id
),

orphan_attempts_quizzes AS (
  SELECT
    'REL-02' AS relationship_id,
    'raw_quizzes' AS parent_table,
    'id' AS parent_pk_column,
    'raw_assessment_attempts' AS child_table,
    'quiz_id' AS child_fk_column,
    COUNT(c.id) AS total_child_records,
    COUNTIF(p.id IS NULL AND c.quiz_id IS NOT NULL) AS orphan_records_count
  FROM `quiz_platform_raw.raw_assessment_attempts` c
  LEFT JOIN `quiz_platform_raw.raw_quizzes` p ON c.quiz_id = p.id
),

orphan_attempts_quiz_versions AS (
  SELECT
    'REL-03' AS relationship_id,
    'raw_quiz_versions' AS parent_table,
    'id' AS parent_pk_column,
    'raw_assessment_attempts' AS child_table,
    'quiz_version_id' AS child_fk_column,
    COUNT(c.id) AS total_child_records,
    COUNTIF(p.id IS NULL AND c.quiz_version_id IS NOT NULL) AS orphan_records_count
  FROM `quiz_platform_raw.raw_assessment_attempts` c
  LEFT JOIN `quiz_platform_raw.raw_quiz_versions` p ON c.quiz_version_id = p.id
),

orphan_attempt_questions_attempts AS (
  SELECT
    'REL-04' AS relationship_id,
    'raw_assessment_attempts' AS parent_table,
    'id' AS parent_pk_column,
    'raw_attempt_questions' AS child_table,
    'attempt_id' AS child_fk_column,
    COUNT(c.id) AS total_child_records,
    COUNTIF(p.id IS NULL AND c.attempt_id IS NOT NULL) AS orphan_records_count
  FROM `quiz_platform_raw.raw_attempt_questions` c
  LEFT JOIN `quiz_platform_raw.raw_assessment_attempts` p ON c.attempt_id = p.id
),

orphan_attempt_questions_questions AS (
  SELECT
    'REL-05' AS relationship_id,
    'raw_questions' AS parent_table,
    'id' AS parent_pk_column,
    'raw_attempt_questions' AS child_table,
    'question_id' AS child_fk_column,
    COUNT(c.id) AS total_child_records,
    COUNTIF(p.id IS NULL AND c.question_id IS NOT NULL) AS orphan_records_count
  FROM `quiz_platform_raw.raw_attempt_questions` c
  LEFT JOIN `quiz_platform_raw.raw_questions` p ON c.question_id = p.id
),

orphan_results_attempts AS (
  SELECT
    'REL-06' AS relationship_id,
    'raw_assessment_attempts' AS parent_table,
    'id' AS parent_pk_column,
    'raw_results' AS child_table,
    'attempt_id' AS child_fk_column,
    COUNT(c.id) AS total_child_records,
    COUNTIF(p.id IS NULL AND c.attempt_id IS NOT NULL) AS orphan_records_count
  FROM `quiz_platform_raw.raw_results` c
  LEFT JOIN `quiz_platform_raw.raw_assessment_attempts` p ON c.attempt_id = p.id
),

orphan_certificates_attempts AS (
  SELECT
    'REL-07' AS relationship_id,
    'raw_assessment_attempts' AS parent_table,
    'id' AS parent_pk_column,
    'raw_certificates' AS child_table,
    'attempt_id' AS child_fk_column,
    COUNT(c.id) AS total_child_records,
    COUNTIF(p.id IS NULL AND c.attempt_id IS NOT NULL) AS orphan_records_count
  FROM `quiz_platform_raw.raw_certificates` c
  LEFT JOIN `quiz_platform_raw.raw_assessment_attempts` p ON c.attempt_id = p.id
),

orphan_questions_versions AS (
  SELECT
    'REL-08' AS relationship_id,
    'raw_quiz_versions' AS parent_table,
    'id' AS parent_pk_column,
    'raw_questions' AS child_table,
    'quiz_version_id' AS child_fk_column,
    COUNT(c.id) AS total_child_records,
    COUNTIF(p.id IS NULL AND c.quiz_version_id IS NOT NULL) AS orphan_records_count
  FROM `quiz_platform_raw.raw_questions` c
  LEFT JOIN `quiz_platform_raw.raw_quiz_versions` p ON c.quiz_version_id = p.id
),

orphan_options_questions AS (
  SELECT
    'REL-09' AS relationship_id,
    'raw_questions' AS parent_table,
    'id' AS parent_pk_column,
    'raw_question_options' AS child_table,
    'question_id' AS child_fk_column,
    COUNT(c.id) AS total_child_records,
    COUNTIF(p.id IS NULL AND c.question_id IS NOT NULL) AS orphan_records_count
  FROM `quiz_platform_raw.raw_question_options` c
  LEFT JOIN `quiz_platform_raw.raw_questions` p ON c.question_id = p.id
),

orphan_quizzes_categories AS (
  SELECT
    'REL-10' AS relationship_id,
    'raw_categories' AS parent_table,
    'id' AS parent_pk_column,
    'raw_quizzes' AS child_table,
    'category_id' AS child_fk_column,
    COUNT(c.id) AS total_child_records,
    COUNTIF(p.id IS NULL AND c.category_id IS NOT NULL) AS orphan_records_count
  FROM `quiz_platform_raw.raw_quizzes` c
  LEFT JOIN `quiz_platform_raw.raw_categories` p ON c.category_id = p.id
),

orphan_audit_users AS (
  SELECT
    'REL-11' AS relationship_id,
    'raw_users' AS parent_table,
    'id' AS parent_pk_column,
    'raw_audit_logs' AS child_table,
    'user_id' AS child_fk_column,
    COUNT(c.id) AS total_child_records,
    COUNTIF(p.id IS NULL AND c.user_id IS NOT NULL) AS orphan_records_count
  FROM `quiz_platform_raw.raw_audit_logs` c
  LEFT JOIN `quiz_platform_raw.raw_users` p ON c.user_id = p.id
),

all_referential_relationships AS (
  SELECT * FROM orphan_attempts_users
  UNION ALL SELECT * FROM orphan_attempts_quizzes
  UNION ALL SELECT * FROM orphan_attempts_quiz_versions
  UNION ALL SELECT * FROM orphan_attempt_questions_attempts
  UNION ALL SELECT * FROM orphan_attempt_questions_questions
  UNION ALL SELECT * FROM orphan_results_attempts
  UNION ALL SELECT * FROM orphan_certificates_attempts
  UNION ALL SELECT * FROM orphan_questions_versions
  UNION ALL SELECT * FROM orphan_options_questions
  UNION ALL SELECT * FROM orphan_quizzes_categories
  UNION ALL SELECT * FROM orphan_audit_users
)

SELECT
  relationship_id,
  child_table,
  child_fk_column,
  parent_table,
  parent_pk_column,
  total_child_records,
  orphan_records_count,
  ROUND(SAFE_DIVIDE(orphan_records_count * 100.0, total_child_records), 2) AS orphan_rate_pct,
  CASE
    WHEN orphan_records_count > 0 AND child_table IN ('raw_assessment_attempts', 'raw_attempt_questions', 'raw_results') THEN 'CRITICAL'
    WHEN orphan_records_count > 0 THEN 'HIGH'
    ELSE 'CLEAN'
  END AS severity,
  CASE
    WHEN orphan_records_count > 0 THEN 'Isolate in quarantine table or route with is_orphaned_flag = TRUE'
    ELSE 'Valid referential integrity'
  END AS recommended_remediation
FROM all_referential_relationships
ORDER BY
  CASE severity
    WHEN 'CRITICAL' THEN 1
    WHEN 'HIGH' THEN 2
    ELSE 3
  END,
  orphan_records_count DESC;
