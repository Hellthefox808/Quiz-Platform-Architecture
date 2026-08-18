-- =============================================================================
-- Verification Script: verify_all_assertions.sql
-- Description: Master data quality verification script that executes all automated
--              test assertions across the Quiz Platform Gold analytical marts.
-- Output: Consolidated executive scorecard reporting pass/fail status, violation counts,
--         and compliance across all 6 Data Quality dimensions.
-- Dialect: Google Standard SQL (BigQuery)
-- Target Layer: `quiz_platform_analytics` (Gold Marts)
-- =============================================================================

WITH assertion_results AS (
  -- ---------------------------------------------------------------------------
  -- 1. COMPLETENESS: Non-Null Primary & Foreign Keys in Attempts
  -- ---------------------------------------------------------------------------
  SELECT
    'ASSERT-01' AS assertion_id,
    'Non-Null Primary & Mandatory Foreign Keys in Assessment Attempts' AS assertion_name,
    'COMPLETENESS' AS quality_dimension,
    'fct_assessment_attempts' AS target_model,
    (SELECT COUNT(*) FROM `quiz-platform-prod.quiz_platform_analytics.fct_assessment_attempts`) AS records_evaluated,
    (
      SELECT COUNTIF(
        attempt_id IS NULL OR TRIM(attempt_id) = '' OR
        user_id IS NULL OR TRIM(user_id) = '' OR
        quiz_id IS NULL OR TRIM(quiz_id) = '' OR
        started_at_utc IS NULL OR
        status IS NULL OR TRIM(status) = ''
      )
      FROM `quiz-platform-prod.quiz_platform_analytics.fct_assessment_attempts`
    ) AS violations_detected

  UNION ALL

  -- ---------------------------------------------------------------------------
  -- 2. UNIQUENESS: Attempt Primary Key Uniqueness
  -- ---------------------------------------------------------------------------
  SELECT
    'ASSERT-02' AS assertion_id,
    'Primary Key Uniqueness in Assessment Attempts (Zero Duplicates)' AS assertion_name,
    'UNIQUENESS' AS quality_dimension,
    'fct_assessment_attempts' AS target_model,
    (SELECT COUNT(*) FROM `quiz-platform-prod.quiz_platform_analytics.fct_assessment_attempts`) AS records_evaluated,
    (
      SELECT COUNT(*) - COUNT(DISTINCT attempt_id)
      FROM `quiz-platform-prod.quiz_platform_analytics.fct_assessment_attempts`
    ) AS violations_detected

  UNION ALL

  -- ---------------------------------------------------------------------------
  -- 3. CONFORMANCE: Attempt Score & Percentage Bounds [0.0, 100.0]
  -- ---------------------------------------------------------------------------
  SELECT
    'ASSERT-03' AS assertion_id,
    'Score & Percentage Range Boundaries [0.0, 100.0]' AS assertion_name,
    'CONFORMANCE' AS quality_dimension,
    'fct_assessment_attempts' AS target_model,
    (SELECT COUNT(*) FROM `quiz-platform-prod.quiz_platform_analytics.fct_assessment_attempts`) AS records_evaluated,
    (
      SELECT COUNTIF(
        score < 0.0 OR
        total_marks < 0.0 OR
        percentage < 0.0 OR
        percentage > 100.0 OR
        duration_seconds < 0
      )
      FROM `quiz-platform-prod.quiz_platform_analytics.fct_assessment_attempts`
    ) AS violations_detected

  UNION ALL

  -- ---------------------------------------------------------------------------
  -- 4. CONFORMANCE: Attempt Status Allowed Enum Domain
  -- ---------------------------------------------------------------------------
  SELECT
    'ASSERT-04' AS assertion_id,
    'Attempt Status Permitted Lifecycle Enum Values' AS assertion_name,
    'CONFORMANCE' AS quality_dimension,
    'fct_assessment_attempts' AS target_model,
    (SELECT COUNT(*) FROM `quiz-platform-prod.quiz_platform_analytics.fct_assessment_attempts`) AS records_evaluated,
    (
      SELECT COUNTIF(
        status NOT IN ('CREATED', 'IN_PROGRESS', 'SUBMITTING', 'COMPLETED', 'EXPIRED', 'CANCELLED', 'ABANDONED')
      )
      FROM `quiz-platform-prod.quiz_platform_analytics.fct_assessment_attempts`
    ) AS violations_detected

  UNION ALL

  -- ---------------------------------------------------------------------------
  -- 5. CONSISTENCY: Timestamp Monotonicity & Chronological Validity
  -- ---------------------------------------------------------------------------
  SELECT
    'ASSERT-05' AS assertion_id,
    'Attempt Timestamp Monotonicity (expires >= started, submitted >= started)' AS assertion_name,
    'CONSISTENCY' AS quality_dimension,
    'fct_assessment_attempts' AS target_model,
    (SELECT COUNT(*) FROM `quiz-platform-prod.quiz_platform_analytics.fct_assessment_attempts`) AS records_evaluated,
    (
      SELECT COUNTIF(
        started_at_utc IS NULL OR
        (expires_at_utc IS NOT NULL AND expires_at_utc < started_at_utc) OR
        (submitted_at_utc IS NOT NULL AND submitted_at_utc < started_at_utc)
      )
      FROM `quiz-platform-prod.quiz_platform_analytics.fct_assessment_attempts`
    ) AS violations_detected

  UNION ALL

  -- ---------------------------------------------------------------------------
  -- 6. COMPLETENESS & UNIQUENESS: Question Responses Primary & Foreign Keys
  -- ---------------------------------------------------------------------------
  SELECT
    'ASSERT-06' AS assertion_id,
    'Non-Null & Unique Keys in Question Responses' AS assertion_name,
    'COMPLETENESS / UNIQUENESS' AS quality_dimension,
    'fct_question_responses' AS target_model,
    (SELECT COUNT(*) FROM `quiz-platform-prod.quiz_platform_analytics.fct_question_responses`) AS records_evaluated,
    (
      (SELECT COUNTIF(response_id IS NULL OR TRIM(response_id) = '' OR attempt_id IS NULL OR TRIM(attempt_id) = '' OR question_id IS NULL OR TRIM(question_id) = '' OR created_at_utc IS NULL) FROM `quiz-platform-prod.quiz_platform_analytics.fct_question_responses`) +
      (SELECT COUNT(*) - COUNT(DISTINCT response_id) FROM `quiz-platform-prod.quiz_platform_analytics.fct_question_responses`)
    ) AS violations_detected

  UNION ALL

  -- ---------------------------------------------------------------------------
  -- 7. ACCURACY: Question Snapshot JSON Structural Validity
  -- ---------------------------------------------------------------------------
  SELECT
    'ASSERT-07' AS assertion_id,
    'Question Snapshot JSON Parsing & Structural Integrity' AS assertion_name,
    'ACCURACY' AS quality_dimension,
    'fct_question_responses' AS target_model,
    (SELECT COUNT(*) FROM `quiz-platform-prod.quiz_platform_analytics.fct_question_responses`) AS records_evaluated,
    (
      SELECT COUNTIF(is_snapshot_valid IS NULL)
      FROM `quiz-platform-prod.quiz_platform_analytics.fct_question_responses`
    ) AS violations_detected

  UNION ALL

  -- ---------------------------------------------------------------------------
  -- 8. ACCURACY: Selected Options Array Cleanliness (No NULLs, No Whitespace)
  -- ---------------------------------------------------------------------------
  SELECT
    'ASSERT-08' AS assertion_id,
    'Selected Options Array Cleanliness (No NULLs, Whitespace Trimmed)' AS assertion_name,
    'ACCURACY' AS quality_dimension,
    'fct_question_responses' AS target_model,
    (SELECT COUNT(*) FROM `quiz-platform-prod.quiz_platform_analytics.fct_question_responses`) AS records_evaluated,
    (
      SELECT COUNTIF(
        (
          SELECT COUNT(1)
          FROM UNNEST(selected_option_ids) AS opt
          WHERE opt IS NULL OR TRIM(opt) = '' OR opt != TRIM(opt)
        ) > 0
      )
      FROM `quiz-platform-prod.quiz_platform_analytics.fct_question_responses`
    ) AS violations_detected

  UNION ALL

  -- ---------------------------------------------------------------------------
  -- 9. INTEGRITY: Response to Attempt Referential Linkage
  -- ---------------------------------------------------------------------------
  SELECT
    'ASSERT-09' AS assertion_id,
    'Question Response Parent Attempt Referential Integrity' AS assertion_name,
    'INTEGRITY' AS quality_dimension,
    'fct_question_responses' AS target_model,
    (SELECT COUNT(*) FROM `quiz-platform-prod.quiz_platform_analytics.fct_question_responses`) AS records_evaluated,
    (
      SELECT COUNTIF(
        attempt_id NOT IN (SELECT attempt_id FROM `quiz-platform-prod.quiz_platform_analytics.fct_assessment_attempts`)
      )
      FROM `quiz-platform-prod.quiz_platform_analytics.fct_question_responses`
    ) AS violations_detected

  UNION ALL

  -- ---------------------------------------------------------------------------
  -- 10. UNIQUENESS & CONFORMANCE: Dim Users Account Integrity
  -- ---------------------------------------------------------------------------
  SELECT
    'ASSERT-10' AS assertion_id,
    'Conformed Dim Users Primary Key Uniqueness & Role Conformance' AS assertion_name,
    'UNIQUENESS / CONFORMANCE' AS quality_dimension,
    'dim_users' AS target_model,
    (SELECT COUNT(*) FROM `quiz-platform-prod.quiz_platform_analytics.dim_users`) AS records_evaluated,
    (
      (SELECT COUNT(*) - COUNT(DISTINCT user_id) FROM `quiz-platform-prod.quiz_platform_analytics.dim_users`) +
      (SELECT COUNTIF(role NOT IN ('STUDENT', 'INSTRUCTOR', 'ADMIN', 'PROCTOR') OR status NOT IN ('ACTIVE', 'SUSPENDED', 'INACTIVE')) FROM `quiz-platform-prod.quiz_platform_analytics.dim_users`)
    ) AS violations_detected

  UNION ALL

  -- ---------------------------------------------------------------------------
  -- 11. UNIQUENESS & COMPLETENESS: Dim Quizzes Integrity
  -- ---------------------------------------------------------------------------
  SELECT
    'ASSERT-11' AS assertion_id,
    'Conformed Dim Quizzes Primary Key Uniqueness & Title Non-Null' AS assertion_name,
    'UNIQUENESS / COMPLETENESS' AS quality_dimension,
    'dim_quizzes' AS target_model,
    (SELECT COUNT(*) FROM `quiz-platform-prod.quiz_platform_analytics.dim_quizzes`) AS records_evaluated,
    (
      (SELECT COUNT(*) - COUNT(DISTINCT quiz_id) FROM `quiz-platform-prod.quiz_platform_analytics.dim_quizzes`) +
      (SELECT COUNTIF(title IS NULL OR TRIM(title) = '' OR slug IS NULL OR TRIM(slug) = '') FROM `quiz-platform-prod.quiz_platform_analytics.dim_quizzes`)
    ) AS violations_detected

  UNION ALL

  -- ---------------------------------------------------------------------------
  -- 12. ACCURACY: Audit Events JSON Payload Validity
  -- ---------------------------------------------------------------------------
  SELECT
    'ASSERT-12' AS assertion_id,
    'Audit Events Details JSON Structural Validity' AS assertion_name,
    'ACCURACY' AS quality_dimension,
    'fct_audit_events' AS target_model,
    (SELECT COUNT(*) FROM `quiz-platform-prod.quiz_platform_analytics.fct_audit_events`) AS records_evaluated,
    (
      SELECT COUNTIF(is_valid_json IS NULL OR is_valid_json = FALSE)
      FROM `quiz-platform-prod.quiz_platform_analytics.fct_audit_events`
    ) AS violations_detected
)

SELECT
  assertion_id,
  assertion_name,
  quality_dimension,
  target_model,
  records_evaluated,
  violations_detected,
  0 AS threshold_allowed,
  CASE
    WHEN violations_detected = 0 THEN 'PASSED'
    ELSE 'FAILED'
  END AS assertion_status,
  CURRENT_TIMESTAMP() AS executed_at_utc
FROM
  assertion_results
ORDER BY
  assertion_id;
