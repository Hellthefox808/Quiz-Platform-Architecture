-- =============================================================================
-- Script: 06_score_bounds_audit.sql
-- Description: Score Boundaries, Range Constraints & Status Domain Auditor
-- Features: FEAT-06 (Out-of-Bounds Score Audit), FEAT-07 (Enum & String Drift)
-- Requirement: R1 (Source Data Profiling & Anomaly Audit)
-- Author: Profiling & Anomaly Audit Worker (Milestone 1)
-- Dialect: Google Standard SQL (BigQuery)
-- =============================================================================

/*
  PURPOSE:
  Audits numeric boundaries, grading metrics, duration limits, and enum conformance:
  - Percentage out of valid [0.0, 100.0] range
  - Negative scores or obtained marks exceeding total marks
  - Zero total marks causing division-by-zero runtime exceptions
  - Negative duration / elapsed time
  - Status enum casing violations, whitespace pollution, and unauthorized enum values
  - Inconsistency between passed flag and percentage vs passing_percentage
*/

WITH attempts_scoring_audit AS (
  SELECT
    id AS attempt_id,
    user_id,
    quiz_id,
    quiz_version_id,
    status,
    score,
    percentage,
    passed,
    total_marks,
    obtained_marks,
    time_taken_seconds,
    
    -- Anomaly Detection Flags
    (percentage < 0.0 OR percentage > 100.0) AS invalid_percentage_bounds,
    (score < 0.0) AS negative_score,
    (obtained_marks > total_marks AND total_marks > 0.0) AS obtained_exceeds_total,
    (total_marks = 0.0 AND (score > 0.0 OR obtained_marks > 0.0)) AS division_by_zero_hazard,
    (time_taken_seconds < 0) AS negative_duration,
    
    -- Status Enum Conformance
    (UPPER(TRIM(status)) NOT IN (
      'CREATED', 'IN_PROGRESS', 'SUBMITTING', 'COMPLETED', 'EXPIRED', 'CANCELLED', 'ABANDONED'
    )) AS invalid_status_enum,
    (status IS NOT NULL AND status != UPPER(TRIM(status))) AS status_casing_or_whitespace_drift

  FROM `quiz_platform_raw.raw_assessment_attempts`
),

results_scoring_audit AS (
  SELECT
    id AS result_id,
    attempt_id,
    final_score,
    percentage,
    passed,
    total_marks,
    obtained_marks,
    time_taken_seconds,

    (percentage < 0.0 OR percentage > 100.0) AS invalid_percentage_bounds,
    (final_score < 0.0) AS negative_score,
    (obtained_marks > total_marks AND total_marks > 0.0) AS obtained_exceeds_total,
    (total_marks = 0.0 AND (final_score > 0.0 OR obtained_marks > 0.0)) AS division_by_zero_hazard,
    (time_taken_seconds < 0) AS negative_duration

  FROM `quiz_platform_raw.raw_results`
),

certificate_pass_consistency_audit AS (
  SELECT
    c.id AS certificate_id,
    c.certificate_code,
    c.attempt_id,
    a.passed AS attempt_passed,
    a.percentage AS attempt_percentage,
    qv.passing_percentage AS required_passing_percentage,
    
    -- Certificate issued to failed attempt
    (a.passed IS FALSE OR a.percentage < qv.passing_percentage) AS illegal_certificate_issuance

  FROM `quiz_platform_raw.raw_certificates` c
  LEFT JOIN `quiz_platform_raw.raw_assessment_attempts` a ON c.attempt_id = a.id
  LEFT JOIN `quiz_platform_raw.raw_quiz_versions` qv ON a.quiz_version_id = qv.id
),

aggregated_metrics AS (
  SELECT
    'raw_assessment_attempts' AS entity_name,
    COUNT(*) AS total_records_scanned,
    COUNTIF(invalid_percentage_bounds) AS invalid_percentage_count,
    COUNTIF(negative_score) AS negative_score_count,
    COUNTIF(obtained_exceeds_total) AS obtained_exceeds_total_count,
    COUNTIF(division_by_zero_hazard) AS division_by_zero_hazard_count,
    COUNTIF(negative_duration) AS negative_duration_count,
    COUNTIF(invalid_status_enum) AS invalid_status_enum_count,
    COUNTIF(status_casing_or_whitespace_drift) AS enum_drift_count,
    0 AS illegal_certificate_count
  FROM attempts_scoring_audit

  UNION ALL

  SELECT
    'raw_results' AS entity_name,
    COUNT(*) AS total_records_scanned,
    COUNTIF(invalid_percentage_bounds) AS invalid_percentage_count,
    COUNTIF(negative_score) AS negative_score_count,
    COUNTIF(obtained_exceeds_total) AS obtained_exceeds_total_count,
    COUNTIF(division_by_zero_hazard) AS division_by_zero_hazard_count,
    COUNTIF(negative_duration) AS negative_duration_count,
    0 AS invalid_status_enum_count,
    0 AS enum_drift_count,
    0 AS illegal_certificate_count
  FROM results_scoring_audit

  UNION ALL

  SELECT
    'raw_certificates' AS entity_name,
    COUNT(*) AS total_records_scanned,
    0 AS invalid_percentage_count,
    0 AS negative_score_count,
    0 AS obtained_exceeds_total_count,
    0 AS division_by_zero_hazard_count,
    0 AS negative_duration_count,
    0 AS invalid_status_enum_count,
    0 AS enum_drift_count,
    COUNTIF(illegal_certificate_issuance) AS illegal_certificate_count
  FROM certificate_pass_consistency_audit
)

SELECT
  entity_name,
  total_records_scanned,
  invalid_percentage_count,
  negative_score_count,
  obtained_exceeds_total_count,
  division_by_zero_hazard_count,
  negative_duration_count,
  invalid_status_enum_count,
  enum_drift_count,
  illegal_certificate_count,
  (
    invalid_percentage_count + negative_score_count + obtained_exceeds_total_count +
    division_by_zero_hazard_count + negative_duration_count + invalid_status_enum_count +
    enum_drift_count + illegal_certificate_count
  ) AS total_scoring_anomalies,
  CASE
    WHEN invalid_percentage_count > 0 OR division_by_zero_hazard_count > 0 OR illegal_certificate_count > 0 THEN 'CRITICAL'
    WHEN negative_score_count > 0 OR obtained_exceeds_total_count > 0 THEN 'HIGH'
    WHEN enum_drift_count > 0 THEN 'MEDIUM'
    ELSE 'CLEAN'
  END AS severity,
  'Clamp percentages to [0.0, 100.0], guard SAFE_DIVIDE, sanitize UPPER(TRIM(status))' AS recommended_remediation
FROM aggregated_metrics
ORDER BY total_scoring_anomalies DESC;
