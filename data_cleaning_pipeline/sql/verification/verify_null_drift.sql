-- =============================================================================
-- Verification Script: verify_null_drift.sql
-- Description: Mathematically calculates and evaluates pre-transformation baseline
--              null rates (Bronze Raw) vs post-transformation null rates (Gold Marts)
--              across all required, non-nullable business attributes.
-- Constraint: Enforces that Null Rate Drift is strictly < 1.0% (1.0 percentage points)
-- Dialect: Google Standard SQL (BigQuery)
-- Target Layer: `quiz_platform_analytics` (Gold) vs `quiz_platform_raw` (Bronze)
-- =============================================================================

WITH bronze_attempts AS (
  SELECT
    COUNT(*) AS total_rows,
    COUNTIF(id IS NULL OR TRIM(CAST(id AS STRING)) = '') AS id_nulls,
    COUNTIF(user_id IS NULL OR TRIM(CAST(user_id AS STRING)) = '') AS user_id_nulls,
    COUNTIF(quiz_id IS NULL OR TRIM(CAST(quiz_id AS STRING)) = '') AS quiz_id_nulls,
    COUNTIF(quiz_version_id IS NULL OR TRIM(CAST(quiz_version_id AS STRING)) = '') AS quiz_version_id_nulls,
    COUNTIF(status IS NULL OR TRIM(CAST(status AS STRING)) = '') AS status_nulls,
    COUNTIF(started_at IS NULL OR TRIM(CAST(started_at AS STRING)) = '') AS started_at_nulls
  FROM
    `quiz-platform-prod.quiz_platform_raw.raw_attempts`
),

gold_attempts AS (
  SELECT
    COUNT(*) AS total_rows,
    COUNTIF(attempt_id IS NULL OR TRIM(attempt_id) = '') AS attempt_id_nulls,
    COUNTIF(user_id IS NULL OR TRIM(user_id) = '') AS user_id_nulls,
    COUNTIF(quiz_id IS NULL OR TRIM(quiz_id) = '') AS quiz_id_nulls,
    COUNTIF(quiz_version_id IS NULL OR TRIM(quiz_version_id) = '') AS quiz_version_id_nulls,
    COUNTIF(status IS NULL OR TRIM(status) = '') AS status_nulls,
    COUNTIF(started_at_utc IS NULL) AS started_at_utc_nulls
  FROM
    `quiz-platform-prod.quiz_platform_analytics.fct_assessment_attempts`
),

bronze_responses AS (
  SELECT
    COUNT(*) AS total_rows,
    COUNTIF(id IS NULL OR TRIM(CAST(id AS STRING)) = '') AS id_nulls,
    COUNTIF(attempt_id IS NULL OR TRIM(CAST(attempt_id AS STRING)) = '') AS attempt_id_nulls,
    COUNTIF(question_id IS NULL OR TRIM(CAST(question_id AS STRING)) = '') AS question_id_nulls,
    COUNTIF(created_at IS NULL OR TRIM(CAST(created_at AS STRING)) = '') AS created_at_nulls
  FROM
    `quiz-platform-prod.quiz_platform_raw.raw_responses`
),

gold_responses AS (
  SELECT
    COUNT(*) AS total_rows,
    COUNTIF(response_id IS NULL OR TRIM(response_id) = '') AS response_id_nulls,
    COUNTIF(attempt_id IS NULL OR TRIM(attempt_id) = '') AS attempt_id_nulls,
    COUNTIF(question_id IS NULL OR TRIM(question_id) = '') AS question_id_nulls,
    COUNTIF(created_at_utc IS NULL) AS created_at_utc_nulls
  FROM
    `quiz-platform-prod.quiz_platform_analytics.fct_question_responses`
),

bronze_users AS (
  SELECT
    COUNT(*) AS total_rows,
    COUNTIF(id IS NULL OR TRIM(CAST(id AS STRING)) = '') AS id_nulls,
    COUNTIF(email IS NULL OR TRIM(CAST(email AS STRING)) = '') AS email_nulls,
    COUNTIF(role IS NULL OR TRIM(CAST(role AS STRING)) = '') AS role_nulls,
    COUNTIF(status IS NULL OR TRIM(CAST(status AS STRING)) = '') AS status_nulls
  FROM
    `quiz-platform-prod.quiz_platform_raw.raw_users`
),

gold_users AS (
  SELECT
    COUNT(*) AS total_rows,
    COUNTIF(user_id IS NULL OR TRIM(user_id) = '') AS user_id_nulls,
    COUNTIF(email IS NULL OR TRIM(email) = '') AS email_nulls,
    COUNTIF(role IS NULL OR TRIM(role) = '') AS role_nulls,
    COUNTIF(status IS NULL OR TRIM(status) = '') AS status_nulls
  FROM
    `quiz-platform-prod.quiz_platform_analytics.dim_users`
),

bronze_quizzes AS (
  SELECT
    COUNT(*) AS total_rows,
    COUNTIF(id IS NULL OR TRIM(CAST(id AS STRING)) = '') AS id_nulls,
    COUNTIF(title IS NULL OR TRIM(CAST(title AS STRING)) = '') AS title_nulls,
    COUNTIF(slug IS NULL OR TRIM(CAST(slug AS STRING)) = '') AS slug_nulls,
    COUNTIF(status IS NULL OR TRIM(CAST(status AS STRING)) = '') AS status_nulls
  FROM
    `quiz-platform-prod.quiz_platform_raw.raw_quizzes`
),

gold_quizzes AS (
  SELECT
    COUNT(*) AS total_rows,
    COUNTIF(quiz_id IS NULL OR TRIM(quiz_id) = '') AS quiz_id_nulls,
    COUNTIF(title IS NULL OR TRIM(title) = '') AS title_nulls,
    COUNTIF(slug IS NULL OR TRIM(slug) = '') AS slug_nulls,
    COUNTIF(status IS NULL OR TRIM(status) = '') AS status_nulls
  FROM
    `quiz-platform-prod.quiz_platform_analytics.dim_quizzes`
),

bronze_audits AS (
  SELECT
    COUNT(*) AS total_rows,
    COUNTIF(id IS NULL OR TRIM(CAST(id AS STRING)) = '') AS id_nulls,
    COUNTIF(user_id IS NULL OR TRIM(CAST(user_id AS STRING)) = '') AS user_id_nulls,
    COUNTIF(action IS NULL OR TRIM(CAST(action AS STRING)) = '') AS action_nulls,
    COUNTIF(resource_type IS NULL OR TRIM(CAST(resource_type AS STRING)) = '') AS resource_type_nulls
  FROM
    `quiz-platform-prod.quiz_platform_raw.raw_audit_logs`
),

gold_audits AS (
  SELECT
    COUNT(*) AS total_rows,
    COUNTIF(audit_id IS NULL OR TRIM(audit_id) = '') AS audit_id_nulls,
    COUNTIF(user_id IS NULL OR TRIM(user_id) = '') AS user_id_nulls,
    COUNTIF(action IS NULL OR TRIM(action) = '') AS action_nulls,
    COUNTIF(resource_type IS NULL OR TRIM(resource_type) = '') AS resource_type_nulls
  FROM
    `quiz-platform-prod.quiz_platform_analytics.fct_audit_events`
),

column_drift_matrix AS (
  -- Attempts Columns
  SELECT 'fct_assessment_attempts' AS target_table, 'attempt_id' AS column_name,
         b.total_rows AS pre_total_rows, b.id_nulls AS pre_null_count,
         g.total_rows AS post_total_rows, g.attempt_id_nulls AS post_null_count
  FROM bronze_attempts b CROSS JOIN gold_attempts g
  UNION ALL
  SELECT 'fct_assessment_attempts', 'user_id', b.total_rows, b.user_id_nulls, g.total_rows, g.user_id_nulls
  FROM bronze_attempts b CROSS JOIN gold_attempts g
  UNION ALL
  SELECT 'fct_assessment_attempts', 'quiz_id', b.total_rows, b.quiz_id_nulls, g.total_rows, g.quiz_id_nulls
  FROM bronze_attempts b CROSS JOIN gold_attempts g
  UNION ALL
  SELECT 'fct_assessment_attempts', 'quiz_version_id', b.total_rows, b.quiz_version_id_nulls, g.total_rows, g.quiz_version_id_nulls
  FROM bronze_attempts b CROSS JOIN gold_attempts g
  UNION ALL
  SELECT 'fct_assessment_attempts', 'status', b.total_rows, b.status_nulls, g.total_rows, g.status_nulls
  FROM bronze_attempts b CROSS JOIN gold_attempts g
  UNION ALL
  SELECT 'fct_assessment_attempts', 'started_at_utc', b.total_rows, b.started_at_nulls, g.total_rows, g.started_at_utc_nulls
  FROM bronze_attempts b CROSS JOIN gold_attempts g

  -- Responses Columns
  UNION ALL
  SELECT 'fct_question_responses', 'response_id', b.total_rows, b.id_nulls, g.total_rows, g.response_id_nulls
  FROM bronze_responses b CROSS JOIN gold_responses g
  UNION ALL
  SELECT 'fct_question_responses', 'attempt_id', b.total_rows, b.attempt_id_nulls, g.total_rows, g.attempt_id_nulls
  FROM bronze_responses b CROSS JOIN gold_responses g
  UNION ALL
  SELECT 'fct_question_responses', 'question_id', b.total_rows, b.question_id_nulls, g.total_rows, g.question_id_nulls
  FROM bronze_responses b CROSS JOIN gold_responses g
  UNION ALL
  SELECT 'fct_question_responses', 'created_at_utc', b.total_rows, b.created_at_nulls, g.total_rows, g.created_at_utc_nulls
  FROM bronze_responses b CROSS JOIN gold_responses g

  -- Users Columns
  UNION ALL
  SELECT 'dim_users', 'user_id', b.total_rows, b.id_nulls, g.total_rows, g.user_id_nulls
  FROM bronze_users b CROSS JOIN gold_users g
  UNION ALL
  SELECT 'dim_users', 'email', b.total_rows, b.email_nulls, g.total_rows, g.email_nulls
  FROM bronze_users b CROSS JOIN gold_users g
  UNION ALL
  SELECT 'dim_users', 'role', b.total_rows, b.role_nulls, g.total_rows, g.role_nulls
  FROM bronze_users b CROSS JOIN gold_users g
  UNION ALL
  SELECT 'dim_users', 'status', b.total_rows, b.status_nulls, g.total_rows, g.status_nulls
  FROM bronze_users b CROSS JOIN gold_users g

  -- Quizzes Columns
  UNION ALL
  SELECT 'dim_quizzes', 'quiz_id', b.total_rows, b.id_nulls, g.total_rows, g.quiz_id_nulls
  FROM bronze_quizzes b CROSS JOIN gold_quizzes g
  UNION ALL
  SELECT 'dim_quizzes', 'title', b.total_rows, b.title_nulls, g.total_rows, g.title_nulls
  FROM bronze_quizzes b CROSS JOIN gold_quizzes g
  UNION ALL
  SELECT 'dim_quizzes', 'slug', b.total_rows, b.slug_nulls, g.total_rows, g.slug_nulls
  FROM bronze_quizzes b CROSS JOIN gold_quizzes g
  UNION ALL
  SELECT 'dim_quizzes', 'status', b.total_rows, b.status_nulls, g.total_rows, g.status_nulls
  FROM bronze_quizzes b CROSS JOIN gold_quizzes g

  -- Audit Logs Columns
  UNION ALL
  SELECT 'fct_audit_events', 'audit_id', b.total_rows, b.id_nulls, g.total_rows, g.audit_id_nulls
  FROM bronze_audits b CROSS JOIN gold_audits g
  UNION ALL
  SELECT 'fct_audit_events', 'user_id', b.total_rows, b.user_id_nulls, g.total_rows, g.user_id_nulls
  FROM bronze_audits b CROSS JOIN gold_audits g
  UNION ALL
  SELECT 'fct_audit_events', 'action', b.total_rows, b.action_nulls, g.total_rows, g.action_nulls
  FROM bronze_audits b CROSS JOIN gold_audits g
  UNION ALL
  SELECT 'fct_audit_events', 'resource_type', b.total_rows, b.resource_type_nulls, g.total_rows, g.resource_type_nulls
  FROM bronze_audits b CROSS JOIN gold_audits g
),

drift_evaluation AS (
  SELECT
    target_table,
    column_name,
    pre_total_rows,
    pre_null_count,
    ROUND(SAFE_DIVIDE(pre_null_count * 100.0, NULLIF(pre_total_rows, 0)), 4) AS pre_null_rate_pct,
    post_total_rows,
    post_null_count,
    ROUND(SAFE_DIVIDE(post_null_count * 100.0, NULLIF(post_total_rows, 0)), 4) AS post_null_rate_pct,
    ROUND(
      SAFE_DIVIDE(post_null_count * 100.0, NULLIF(post_total_rows, 0)) -
      SAFE_DIVIDE(pre_null_count * 100.0, NULLIF(pre_total_rows, 0)),
      4
    ) AS drift_percentage_points,
    1.00 AS max_allowed_drift_pct,
    CASE
      WHEN (
        SAFE_DIVIDE(post_null_count * 100.0, NULLIF(post_total_rows, 0)) -
        SAFE_DIVIDE(pre_null_count * 100.0, NULLIF(pre_total_rows, 0))
      ) < 1.00 THEN 'PASS'
      ELSE 'FAIL'
    END AS verification_status,
    CURRENT_TIMESTAMP() AS evaluated_at_utc
  FROM
    column_drift_matrix
)

SELECT
  target_table,
  column_name,
  pre_total_rows,
  pre_null_count,
  pre_null_rate_pct,
  post_total_rows,
  post_null_count,
  post_null_rate_pct,
  drift_percentage_points,
  max_allowed_drift_pct,
  verification_status,
  evaluated_at_utc
FROM
  drift_evaluation
ORDER BY
  target_table,
  column_name;
