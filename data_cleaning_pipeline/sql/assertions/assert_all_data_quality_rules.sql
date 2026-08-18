-- =============================================================================
-- Standalone BigQuery Assertion Suite: assert_all_data_quality_rules.sql
-- Description: Consolidated automated data quality assertions suite executing
--              across all Gold analytical marts (fct_assessment_attempts,
--              fct_question_responses, dim_users, dim_quizzes).
--              Identifies, tags, and classifies all constraint violations with
--              granular diagnostics, rule IDs, and failure severity levels.
-- Dialect: Google Standard SQL (BigQuery)
-- Target: Returns 0 rows on clean data; returns violation records on anomalies.
-- =============================================================================

WITH 
-- -----------------------------------------------------------------------------
-- RULE 1: (FEAT-18) Primary Key Uniqueness & Non-Null on fct_assessment_attempts
-- -----------------------------------------------------------------------------
rule_1_pk_attempts AS (
  SELECT
    'DQ-RULE-01' AS rule_id,
    'assert_attempts_pk_unique_not_null' AS rule_name,
    'FEAT-18' AS feature_code,
    'quiz-platform-prod.quiz_platform_analytics.fct_assessment_attempts' AS target_table,
    COALESCE(attempt_id, '<NULL>') AS record_id,
    'CRITICAL' AS severity,
    'PRIMARY_KEY_VIOLATION' AS violation_category,
    CASE
      WHEN attempt_id IS NULL THEN 'attempt_id is NULL'
      WHEN TRIM(attempt_id) = '' THEN 'attempt_id is an empty string'
      WHEN COUNT(*) OVER (PARTITION BY attempt_id) > 1 THEN 
        CONCAT('Duplicate attempt_id detected (occurrences: ', CAST(COUNT(*) OVER (PARTITION BY attempt_id) AS STRING), ')')
      ELSE 'Unknown PK anomaly'
    END AS violation_details,
    CURRENT_TIMESTAMP() AS evaluated_at_utc
  FROM
    `quiz-platform-prod.quiz_platform_analytics.fct_assessment_attempts`
  WHERE
    attempt_id IS NULL
    OR TRIM(attempt_id) = ''
    OR attempt_id IN (
      SELECT attempt_id
      FROM `quiz-platform-prod.quiz_platform_analytics.fct_assessment_attempts`
      WHERE attempt_id IS NOT NULL AND TRIM(attempt_id) != ''
      GROUP BY attempt_id
      HAVING COUNT(*) > 1
    )
),

-- -----------------------------------------------------------------------------
-- RULE 2: (FEAT-19) Referential Integrity Constraints on fct_assessment_attempts
-- -----------------------------------------------------------------------------
rule_2_referential_integrity AS (
  SELECT
    'DQ-RULE-02' AS rule_id,
    'assert_attempts_referential_integrity' AS rule_name,
    'FEAT-19' AS feature_code,
    'quiz-platform-prod.quiz_platform_analytics.fct_assessment_attempts' AS target_table,
    a.attempt_id AS record_id,
    'CRITICAL' AS severity,
    'REFERENTIAL_INTEGRITY_VIOLATION' AS violation_category,
    CONCAT(
      'Orphaned foreign key detected: ',
      CASE
        WHEN a.user_id IS NOT NULL AND u.user_id IS NULL AND a.quiz_id IS NOT NULL AND q.quiz_id IS NULL 
          THEN CONCAT('Missing user_id (', a.user_id, ') and missing quiz_id (', a.quiz_id, ')')
        WHEN a.user_id IS NOT NULL AND u.user_id IS NULL 
          THEN CONCAT('Missing user_id in dim_users: ', a.user_id)
        WHEN a.quiz_id IS NOT NULL AND q.quiz_id IS NULL 
          THEN CONCAT('Missing quiz_id in dim_quizzes: ', a.quiz_id)
        ELSE 'Unresolved orphan status'
      END
    ) AS violation_details,
    CURRENT_TIMESTAMP() AS evaluated_at_utc
  FROM
    `quiz-platform-prod.quiz_platform_analytics.fct_assessment_attempts` AS a
  LEFT JOIN
    `quiz-platform-prod.quiz_platform_analytics.dim_users` AS u
  ON
    a.user_id = u.user_id
  LEFT JOIN
    `quiz-platform-prod.quiz_platform_analytics.dim_quizzes` AS q
  ON
    a.quiz_id = q.quiz_id
  WHERE
    (a.user_id IS NOT NULL AND u.user_id IS NULL)
    OR (a.quiz_id IS NOT NULL AND q.quiz_id IS NULL)
),

-- -----------------------------------------------------------------------------
-- RULE 3: (FEAT-20) Numeric Range Bounds on fct_assessment_attempts
-- -----------------------------------------------------------------------------
rule_3_numeric_bounds AS (
  SELECT
    'DQ-RULE-03' AS rule_id,
    'assert_attempts_percentage_bounds' AS rule_name,
    'FEAT-20' AS feature_code,
    'quiz-platform-prod.quiz_platform_analytics.fct_assessment_attempts' AS target_table,
    a.attempt_id AS record_id,
    'HIGH' AS severity,
    'NUMERIC_RANGE_VIOLATION' AS violation_category,
    CONCAT(
      'Out of bounds numeric metric: ',
      CASE
        WHEN a.percentage IS NULL THEN 'percentage is NULL'
        WHEN a.percentage < 0.0 THEN CONCAT('percentage is negative: ', CAST(a.percentage AS STRING))
        WHEN a.percentage > 100.0 THEN CONCAT('percentage exceeds 100.0: ', CAST(a.percentage AS STRING))
        WHEN a.score < 0.0 THEN CONCAT('score is negative: ', CAST(a.score AS STRING))
        WHEN a.total_marks < 0.0 THEN CONCAT('total_marks is negative: ', CAST(a.total_marks AS STRING))
        WHEN a.duration_seconds < 0 THEN CONCAT('duration_seconds is negative: ', CAST(a.duration_seconds AS STRING))
        ELSE 'Metric anomaly'
      END
    ) AS violation_details,
    CURRENT_TIMESTAMP() AS evaluated_at_utc
  FROM
    `quiz-platform-prod.quiz_platform_analytics.fct_assessment_attempts` AS a
  WHERE
    a.percentage < 0.0
    OR a.percentage > 100.0
    OR a.percentage IS NULL
    OR a.score < 0.0
    OR a.total_marks < 0.0
    OR a.duration_seconds < 0
),

-- -----------------------------------------------------------------------------
-- RULE 4: (FEAT-21) Status Enum Domain Conformance on fct_assessment_attempts
-- -----------------------------------------------------------------------------
rule_4_status_enum AS (
  SELECT
    'DQ-RULE-04' AS rule_id,
    'assert_attempts_status_valid_enum' AS rule_name,
    'FEAT-21' AS feature_code,
    'quiz-platform-prod.quiz_platform_analytics.fct_assessment_attempts' AS target_table,
    a.attempt_id AS record_id,
    'HIGH' AS severity,
    'ENUM_DOMAIN_VIOLATION' AS violation_category,
    CONCAT('Invalid status enum value: ', COALESCE(CONCAT('\'', a.status, '\''), '<NULL>')) AS violation_details,
    CURRENT_TIMESTAMP() AS evaluated_at_utc
  FROM
    `quiz-platform-prod.quiz_platform_analytics.fct_assessment_attempts` AS a
  WHERE
    a.status IS NULL
    OR a.status NOT IN (
      'CREATED',
      'IN_PROGRESS',
      'SUBMITTING',
      'COMPLETED',
      'EXPIRED',
      'CANCELLED',
      'ABANDONED'
    )
),

-- -----------------------------------------------------------------------------
-- RULE 5: (FEAT-22) Timestamp Monotonicity & Validity on fct_assessment_attempts
-- -----------------------------------------------------------------------------
rule_5_timestamp_monotonicity AS (
  SELECT
    'DQ-RULE-05' AS rule_id,
    'assert_attempts_timestamps_monotonic' AS rule_name,
    'FEAT-22' AS feature_code,
    'quiz-platform-prod.quiz_platform_analytics.fct_assessment_attempts' AS target_table,
    a.attempt_id AS record_id,
    'HIGH' AS severity,
    'TIMESTAMP_CHRONOLOGY_VIOLATION' AS violation_category,
    CASE
      WHEN a.started_at_utc IS NULL THEN 'started_at_utc timestamp is NULL'
      WHEN a.submitted_at_utc IS NOT NULL AND a.submitted_at_utc < a.started_at_utc THEN
        CONCAT('Chronological inversion: submitted_at_utc (', CAST(a.submitted_at_utc AS STRING), ') precedes started_at_utc (', CAST(a.started_at_utc AS STRING), ')')
      WHEN a.expires_at_utc IS NOT NULL AND a.expires_at_utc < a.started_at_utc THEN
        CONCAT('Chronological inversion: expires_at_utc (', CAST(a.expires_at_utc AS STRING), ') precedes started_at_utc (', CAST(a.started_at_utc AS STRING), ')')
      ELSE 'Timestamp ordering anomaly'
    END AS violation_details,
    CURRENT_TIMESTAMP() AS evaluated_at_utc
  FROM
    `quiz-platform-prod.quiz_platform_analytics.fct_assessment_attempts` AS a
  WHERE
    a.started_at_utc IS NULL
    OR (a.submitted_at_utc IS NOT NULL AND a.submitted_at_utc < a.started_at_utc)
    OR (a.expires_at_utc IS NOT NULL AND a.expires_at_utc < a.started_at_utc)
),

-- -----------------------------------------------------------------------------
-- RULE 6: (FEAT-23) Question Snapshot JSON Validity on fct_question_responses
-- -----------------------------------------------------------------------------
rule_6_snapshot_json AS (
  SELECT
    'DQ-RULE-06' AS rule_id,
    'assert_responses_snapshot_valid_json' AS rule_name,
    'FEAT-23' AS feature_code,
    'quiz-platform-prod.quiz_platform_analytics.fct_question_responses' AS target_table,
    r.response_id AS record_id,
    'HIGH' AS severity,
    'JSON_STRUCTURE_VIOLATION' AS violation_category,
    'Question snapshot payload failed JSON validation or is corrupted' AS violation_details,
    CURRENT_TIMESTAMP() AS evaluated_at_utc
  FROM
    `quiz-platform-prod.quiz_platform_analytics.fct_question_responses` AS r
  WHERE
    r.is_snapshot_valid IS NOT TRUE
),

-- -----------------------------------------------------------------------------
-- RULE 7: (FEAT-23) Option Array Integrity on fct_question_responses
-- -----------------------------------------------------------------------------
rule_7_array_integrity AS (
  SELECT
    'DQ-RULE-07' AS rule_id,
    'assert_responses_option_array_no_nulls' AS rule_name,
    'FEAT-23' AS feature_code,
    'quiz-platform-prod.quiz_platform_analytics.fct_question_responses' AS target_table,
    r.response_id AS record_id,
    'HIGH' AS severity,
    'ARRAY_ELEMENT_VIOLATION' AS violation_category,
    'selected_option_ids array contains NULL element, empty identifier, or untrimmed whitespace' AS violation_details,
    CURRENT_TIMESTAMP() AS evaluated_at_utc
  FROM
    `quiz-platform-prod.quiz_platform_analytics.fct_question_responses` AS r
  WHERE
    r.selected_option_ids IS NULL
    OR EXISTS (
      SELECT 1
      FROM UNNEST(r.selected_option_ids) AS opt_elem
      WHERE opt_elem IS NULL
        OR TRIM(opt_elem) = ''
        OR opt_elem != TRIM(opt_elem)
    )
),

-- -----------------------------------------------------------------------------
-- RULE 8: (FEAT-18) Primary Key Uniqueness & Non-Null on fct_question_responses
-- -----------------------------------------------------------------------------
rule_8_pk_responses AS (
  SELECT
    'DQ-RULE-08' AS rule_id,
    'assert_responses_pk_unique_not_null' AS rule_name,
    'FEAT-18' AS feature_code,
    'quiz-platform-prod.quiz_platform_analytics.fct_question_responses' AS target_table,
    COALESCE(response_id, '<NULL>') AS record_id,
    'CRITICAL' AS severity,
    'PRIMARY_KEY_VIOLATION' AS violation_category,
    CASE
      WHEN response_id IS NULL THEN 'response_id is NULL'
      WHEN TRIM(response_id) = '' THEN 'response_id is an empty string'
      WHEN COUNT(*) OVER (PARTITION BY response_id) > 1 THEN 
        CONCAT('Duplicate response_id detected (occurrences: ', CAST(COUNT(*) OVER (PARTITION BY response_id) AS STRING), ')')
      ELSE 'Unknown PK anomaly'
    END AS violation_details,
    CURRENT_TIMESTAMP() AS evaluated_at_utc
  FROM
    `quiz-platform-prod.quiz_platform_analytics.fct_question_responses`
  WHERE
    response_id IS NULL
    OR TRIM(response_id) = ''
    OR response_id IN (
      SELECT response_id
      FROM `quiz-platform-prod.quiz_platform_analytics.fct_question_responses`
      WHERE response_id IS NOT NULL AND TRIM(response_id) != ''
      GROUP BY response_id
      HAVING COUNT(*) > 1
    )
),

-- -----------------------------------------------------------------------------
-- Unified Consolidator
-- -----------------------------------------------------------------------------
all_violations AS (
  SELECT * FROM rule_1_pk_attempts
  UNION ALL
  SELECT * FROM rule_2_referential_integrity
  UNION ALL
  SELECT * FROM rule_3_numeric_bounds
  UNION ALL
  SELECT * FROM rule_4_status_enum
  UNION ALL
  SELECT * FROM rule_5_timestamp_monotonicity
  UNION ALL
  SELECT * FROM rule_6_snapshot_json
  UNION ALL
  SELECT * FROM rule_7_array_integrity
  UNION ALL
  SELECT * FROM rule_8_pk_responses
)

SELECT
  rule_id,
  rule_name,
  feature_code,
  target_table,
  record_id,
  severity,
  violation_category,
  violation_details,
  evaluated_at_utc
FROM
  all_violations
ORDER BY
  CASE severity
    WHEN 'CRITICAL' THEN 1
    WHEN 'HIGH' THEN 2
    WHEN 'MEDIUM' THEN 3
    ELSE 4
  END ASC,
  rule_id ASC,
  record_id ASC;
