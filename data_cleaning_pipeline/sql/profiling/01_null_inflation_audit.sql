-- =============================================================================
-- Script: 01_null_inflation_audit.sql
-- Description: Comprehensive Null Inflation & Column-Level Completeness Profiler
-- Feature: FEAT-01 (Anomaly Profiler: Null Inflation Audit)
-- Requirement: R1 (Source Data Profiling & Anomaly Audit)
-- Author: Profiling & Anomaly Audit Worker (Milestone 1)
-- Dialect: Google Standard SQL (BigQuery)
-- =============================================================================

/*
  PURPOSE:
  Quantifies null inflation, missing business keys, and column-level sparsity
  across all 11 core source entities in the raw telemetry and operational ingestion stream.
  Identifies critical completeness violations where primary keys, foreign keys, or
  mandatory audit metrics are unexpectedly NULL.
*/

WITH attempts_profile AS (
  SELECT
    'raw_assessment_attempts' AS table_name,
    COUNT(*) AS total_rows,
    -- Primary & Foreign Keys
    COUNTIF(id IS NULL) AS null_id,
    COUNTIF(user_id IS NULL) AS null_user_id,
    COUNTIF(quiz_id IS NULL) AS null_quiz_id,
    COUNTIF(quiz_version_id IS NULL) AS null_quiz_version_id,
    -- Status & Enums
    COUNTIF(status IS NULL) AS null_status,
    -- Timestamps
    COUNTIF(started_at IS NULL) AS null_started_at,
    COUNTIF(expires_at IS NULL) AS null_expires_at,
    COUNTIF(submitted_at IS NULL) AS null_submitted_at,
    COUNTIF(auto_submitted_at IS NULL) AS null_auto_submitted_at,
    -- Scores & Metrics
    COUNTIF(score IS NULL) AS null_score,
    COUNTIF(percentage IS NULL) AS null_percentage,
    COUNTIF(passed IS NULL) AS null_passed,
    COUNTIF(correct_answers IS NULL) AS null_correct_answers,
    COUNTIF(incorrect_answers IS NULL) AS null_incorrect_answers,
    COUNTIF(unanswered IS NULL) AS null_unanswered,
    COUNTIF(total_marks IS NULL) AS null_total_marks,
    COUNTIF(obtained_marks IS NULL) AS null_obtained_marks,
    COUNTIF(time_taken_seconds IS NULL) AS null_time_taken_seconds,
    -- Ingestion Metadata
    COUNTIF(created_at IS NULL) AS null_created_at,
    COUNTIF(updated_at IS NULL) AS null_updated_at
  FROM `quiz_platform_raw.raw_assessment_attempts`
),

attempt_questions_profile AS (
  SELECT
    'raw_attempt_questions' AS table_name,
    COUNT(*) AS total_rows,
    COUNTIF(id IS NULL) AS null_id,
    COUNTIF(attempt_id IS NULL) AS null_attempt_id,
    COUNTIF(question_id IS NULL) AS null_question_id,
    COUNTIF(question_order IS NULL) AS null_question_order,
    COUNTIF(marks IS NULL) AS null_marks,
    COUNTIF(question_snapshot IS NULL) AS null_question_snapshot,
    COUNTIF(created_at IS NULL) AS null_created_at,
    COUNTIF(updated_at IS NULL) AS null_updated_at
  FROM `quiz_platform_raw.raw_attempt_questions`
),

results_profile AS (
  SELECT
    'raw_results' AS table_name,
    COUNT(*) AS total_rows,
    COUNTIF(id IS NULL) AS null_id,
    COUNTIF(attempt_id IS NULL) AS null_attempt_id,
    COUNTIF(user_id IS NULL) AS null_user_id,
    COUNTIF(quiz_id IS NULL) AS null_quiz_id,
    COUNTIF(quiz_version_id IS NULL) AS null_quiz_version_id,
    COUNTIF(final_score IS NULL) AS null_final_score,
    COUNTIF(percentage IS NULL) AS null_percentage,
    COUNTIF(passed IS NULL) AS null_passed,
    COUNTIF(total_marks IS NULL) AS null_total_marks,
    COUNTIF(obtained_marks IS NULL) AS null_obtained_marks,
    COUNTIF(correct_count IS NULL) AS null_correct_count,
    COUNTIF(incorrect_count IS NULL) AS null_incorrect_count,
    COUNTIF(unanswered_count IS NULL) AS null_unanswered_count,
    COUNTIF(time_taken_seconds IS NULL) AS null_time_taken_seconds,
    COUNTIF(breakdown IS NULL) AS null_breakdown,
    COUNTIF(created_at IS NULL) AS null_created_at,
    COUNTIF(updated_at IS NULL) AS null_updated_at
  FROM `quiz_platform_raw.raw_results`
),

users_profile AS (
  SELECT
    'raw_users' AS table_name,
    COUNT(*) AS total_rows,
    COUNTIF(id IS NULL) AS null_id,
    COUNTIF(email IS NULL) AS null_email,
    COUNTIF(name IS NULL) AS null_name,
    COUNTIF(role IS NULL) AS null_role,
    COUNTIF(status IS NULL) AS null_status,
    COUNTIF(created_at IS NULL) AS null_created_at,
    COUNTIF(updated_at IS NULL) AS null_updated_at,
    COUNTIF(last_login_at IS NULL) AS null_last_login_at
  FROM `quiz_platform_raw.raw_users`
),

quizzes_profile AS (
  SELECT
    'raw_quizzes' AS table_name,
    COUNT(*) AS total_rows,
    COUNTIF(id IS NULL) AS null_id,
    COUNTIF(title IS NULL) AS null_title,
    COUNTIF(slug IS NULL) AS null_slug,
    COUNTIF(description IS NULL) AS null_description,
    COUNTIF(category_id IS NULL) AS null_category_id,
    COUNTIF(status IS NULL) AS null_status,
    COUNTIF(created_by IS NULL) AS null_created_by,
    COUNTIF(created_at IS NULL) AS null_created_at,
    COUNTIF(updated_at IS NULL) AS null_updated_at
  FROM `quiz_platform_raw.raw_quizzes`
),

quiz_versions_profile AS (
  SELECT
    'raw_quiz_versions' AS table_name,
    COUNT(*) AS total_rows,
    COUNTIF(id IS NULL) AS null_id,
    COUNTIF(quiz_id IS NULL) AS null_quiz_id,
    COUNTIF(version_number IS NULL) AS null_version_number,
    COUNTIF(duration_seconds IS NULL) AS null_duration_seconds,
    COUNTIF(passing_percentage IS NULL) AS null_passing_percentage,
    COUNTIF(max_attempts IS NULL) AS null_max_attempts,
    COUNTIF(negative_marking_enabled IS NULL) AS null_negative_marking_enabled,
    COUNTIF(negative_mark_value IS NULL) AS null_negative_mark_value,
    COUNTIF(created_at IS NULL) AS null_created_at
  FROM `quiz_platform_raw.raw_quiz_versions`
),

questions_profile AS (
  SELECT
    'raw_questions' AS table_name,
    COUNT(*) AS total_rows,
    COUNTIF(id IS NULL) AS null_id,
    COUNTIF(quiz_version_id IS NULL) AS null_quiz_version_id,
    COUNTIF(question_text IS NULL) AS null_question_text,
    COUNTIF(question_type IS NULL) AS null_question_type,
    COUNTIF(marks IS NULL) AS null_marks,
    COUNTIF(difficulty IS NULL) AS null_difficulty,
    COUNTIF(explanation IS NULL) AS null_explanation,
    COUNTIF(position IS NULL) AS null_position,
    COUNTIF(created_at IS NULL) AS null_created_at,
    COUNTIF(updated_at IS NULL) AS null_updated_at
  FROM `quiz_platform_raw.raw_questions`
),

question_options_profile AS (
  SELECT
    'raw_question_options' AS table_name,
    COUNT(*) AS total_rows,
    COUNTIF(id IS NULL) AS null_id,
    COUNTIF(question_id IS NULL) AS null_question_id,
    COUNTIF(option_text IS NULL) AS null_option_text,
    COUNTIF(position IS NULL) AS null_position,
    COUNTIF(is_correct IS NULL) AS null_is_correct,
    COUNTIF(created_at IS NULL) AS null_created_at
  FROM `quiz_platform_raw.raw_question_options`
),

categories_profile AS (
  SELECT
    'raw_categories' AS table_name,
    COUNT(*) AS total_rows,
    COUNTIF(id IS NULL) AS null_id,
    COUNTIF(name IS NULL) AS null_name,
    COUNTIF(slug IS NULL) AS null_slug,
    COUNTIF(description IS NULL) AS null_description,
    COUNTIF(is_active IS NULL) AS null_is_active,
    COUNTIF(created_at IS NULL) AS null_created_at,
    COUNTIF(updated_at IS NULL) AS null_updated_at
  FROM `quiz_platform_raw.raw_categories`
),

certificates_profile AS (
  SELECT
    'raw_certificates' AS table_name,
    COUNT(*) AS total_rows,
    COUNTIF(id IS NULL) AS null_id,
    COUNTIF(certificate_code IS NULL) AS null_certificate_code,
    COUNTIF(user_id IS NULL) AS null_user_id,
    COUNTIF(attempt_id IS NULL) AS null_attempt_id,
    COUNTIF(quiz_id IS NULL) AS null_quiz_id,
    COUNTIF(issued_at IS NULL) AS null_issued_at,
    COUNTIF(created_at IS NULL) AS null_created_at
  FROM `quiz_platform_raw.raw_certificates`
),

audit_logs_profile AS (
  SELECT
    'raw_audit_logs' AS table_name,
    COUNT(*) AS total_rows,
    COUNTIF(id IS NULL) AS null_id,
    COUNTIF(user_id IS NULL) AS null_user_id,
    COUNTIF(action IS NULL) AS null_action,
    COUNTIF(resource_type IS NULL) AS null_resource_type,
    COUNTIF(resource_id IS NULL) AS null_resource_id,
    COUNTIF(ip_address IS NULL) AS null_ip_address,
    COUNTIF(user_agent IS NULL) AS null_user_agent,
    COUNTIF(details IS NULL) AS null_details,
    COUNTIF(created_at IS NULL) AS null_created_at
  FROM `quiz_platform_raw.raw_audit_logs`
),

-- Unpivot column-level metrics into a unified schema
unpivoted_column_metrics AS (
  -- Assessment Attempts
  SELECT table_name, 'id' AS column_name, 'PRIMARY_KEY' AS column_role, total_rows, null_id AS null_count FROM attempts_profile
  UNION ALL SELECT table_name, 'user_id', 'FOREIGN_KEY', total_rows, null_user_id FROM attempts_profile
  UNION ALL SELECT table_name, 'quiz_id', 'FOREIGN_KEY', total_rows, null_quiz_id FROM attempts_profile
  UNION ALL SELECT table_name, 'quiz_version_id', 'FOREIGN_KEY', total_rows, null_quiz_version_id FROM attempts_profile
  UNION ALL SELECT table_name, 'status', 'BUSINESS_REQUIRED', total_rows, null_status FROM attempts_profile
  UNION ALL SELECT table_name, 'started_at', 'BUSINESS_REQUIRED', total_rows, null_started_at FROM attempts_profile
  UNION ALL SELECT table_name, 'expires_at', 'BUSINESS_REQUIRED', total_rows, null_expires_at FROM attempts_profile
  UNION ALL SELECT table_name, 'submitted_at', 'OPTIONAL_STATE', total_rows, null_submitted_at FROM attempts_profile
  UNION ALL SELECT table_name, 'auto_submitted_at', 'OPTIONAL_STATE', total_rows, null_auto_submitted_at FROM attempts_profile
  UNION ALL SELECT table_name, 'score', 'BUSINESS_METRIC', total_rows, null_score FROM attempts_profile
  UNION ALL SELECT table_name, 'percentage', 'BUSINESS_METRIC', total_rows, null_percentage FROM attempts_profile
  UNION ALL SELECT table_name, 'passed', 'BUSINESS_METRIC', total_rows, null_passed FROM attempts_profile
  UNION ALL SELECT table_name, 'correct_answers', 'BUSINESS_METRIC', total_rows, null_correct_answers FROM attempts_profile
  UNION ALL SELECT table_name, 'incorrect_answers', 'BUSINESS_METRIC', total_rows, null_incorrect_answers FROM attempts_profile
  UNION ALL SELECT table_name, 'unanswered', 'BUSINESS_METRIC', total_rows, null_unanswered FROM attempts_profile
  UNION ALL SELECT table_name, 'total_marks', 'BUSINESS_METRIC', total_rows, null_total_marks FROM attempts_profile
  UNION ALL SELECT table_name, 'obtained_marks', 'BUSINESS_METRIC', total_rows, null_obtained_marks FROM attempts_profile
  UNION ALL SELECT table_name, 'time_taken_seconds', 'BUSINESS_METRIC', total_rows, null_time_taken_seconds FROM attempts_profile
  UNION ALL SELECT table_name, 'created_at', 'AUDIT_TIMESTAMP', total_rows, null_created_at FROM attempts_profile
  UNION ALL SELECT table_name, 'updated_at', 'AUDIT_TIMESTAMP', total_rows, null_updated_at FROM attempts_profile

  -- Attempt Questions
  UNION ALL SELECT table_name, 'id', 'PRIMARY_KEY', total_rows, null_id FROM attempt_questions_profile
  UNION ALL SELECT table_name, 'attempt_id', 'FOREIGN_KEY', total_rows, null_attempt_id FROM attempt_questions_profile
  UNION ALL SELECT table_name, 'question_id', 'FOREIGN_KEY', total_rows, null_question_id FROM attempt_questions_profile
  UNION ALL SELECT table_name, 'question_order', 'BUSINESS_REQUIRED', total_rows, null_question_order FROM attempt_questions_profile
  UNION ALL SELECT table_name, 'marks', 'BUSINESS_METRIC', total_rows, null_marks FROM attempt_questions_profile
  UNION ALL SELECT table_name, 'question_snapshot', 'PAYLOAD_JSON', total_rows, null_question_snapshot FROM attempt_questions_profile

  -- Results
  UNION ALL SELECT table_name, 'id', 'PRIMARY_KEY', total_rows, null_id FROM results_profile
  UNION ALL SELECT table_name, 'attempt_id', 'FOREIGN_KEY', total_rows, null_attempt_id FROM results_profile
  UNION ALL SELECT table_name, 'user_id', 'FOREIGN_KEY', total_rows, null_user_id FROM results_profile
  UNION ALL SELECT table_name, 'quiz_id', 'FOREIGN_KEY', total_rows, null_quiz_id FROM results_profile
  UNION ALL SELECT table_name, 'quiz_version_id', 'FOREIGN_KEY', total_rows, null_quiz_version_id FROM results_profile
  UNION ALL SELECT table_name, 'final_score', 'BUSINESS_METRIC', total_rows, null_final_score FROM results_profile
  UNION ALL SELECT table_name, 'percentage', 'BUSINESS_METRIC', total_rows, null_percentage FROM results_profile
  UNION ALL SELECT table_name, 'passed', 'BUSINESS_METRIC', total_rows, null_passed FROM results_profile
  UNION ALL SELECT table_name, 'total_marks', 'BUSINESS_METRIC', total_rows, null_total_marks FROM results_profile
  UNION ALL SELECT table_name, 'obtained_marks', 'BUSINESS_METRIC', total_rows, null_obtained_marks FROM results_profile
  UNION ALL SELECT table_name, 'breakdown', 'PAYLOAD_JSON', total_rows, null_breakdown FROM results_profile

  -- Users
  UNION ALL SELECT table_name, 'id', 'PRIMARY_KEY', total_rows, null_id FROM users_profile
  UNION ALL SELECT table_name, 'email', 'BUSINESS_REQUIRED', total_rows, null_email FROM users_profile
  UNION ALL SELECT table_name, 'name', 'BUSINESS_REQUIRED', total_rows, null_name FROM users_profile
  UNION ALL SELECT table_name, 'role', 'BUSINESS_REQUIRED', total_rows, null_role FROM users_profile
  UNION ALL SELECT table_name, 'status', 'BUSINESS_REQUIRED', total_rows, null_status FROM users_profile

  -- Quizzes & Quiz Versions
  UNION ALL SELECT table_name, 'id', 'PRIMARY_KEY', total_rows, null_id FROM quizzes_profile
  UNION ALL SELECT table_name, 'title', 'BUSINESS_REQUIRED', total_rows, null_title FROM quizzes_profile
  UNION ALL SELECT table_name, 'slug', 'BUSINESS_REQUIRED', total_rows, null_slug FROM quizzes_profile
  UNION ALL SELECT table_name, 'category_id', 'FOREIGN_KEY', total_rows, null_category_id FROM quizzes_profile
  UNION ALL SELECT table_name, 'id', 'PRIMARY_KEY', total_rows, null_id FROM quiz_versions_profile
  UNION ALL SELECT table_name, 'quiz_id', 'FOREIGN_KEY', total_rows, null_quiz_id FROM quiz_versions_profile
  UNION ALL SELECT table_name, 'duration_seconds', 'BUSINESS_REQUIRED', total_rows, null_duration_seconds FROM quiz_versions_profile
  UNION ALL SELECT table_name, 'passing_percentage', 'BUSINESS_REQUIRED', total_rows, null_passing_percentage FROM quiz_versions_profile

  -- Questions & Options
  UNION ALL SELECT table_name, 'id', 'PRIMARY_KEY', total_rows, null_id FROM questions_profile
  UNION ALL SELECT table_name, 'quiz_version_id', 'FOREIGN_KEY', total_rows, null_quiz_version_id FROM questions_profile
  UNION ALL SELECT table_name, 'question_text', 'BUSINESS_REQUIRED', total_rows, null_question_text FROM questions_profile
  UNION ALL SELECT table_name, 'marks', 'BUSINESS_METRIC', total_rows, null_marks FROM questions_profile
  UNION ALL SELECT table_name, 'id', 'PRIMARY_KEY', total_rows, null_id FROM question_options_profile
  UNION ALL SELECT table_name, 'question_id', 'FOREIGN_KEY', total_rows, null_question_id FROM question_options_profile
  UNION ALL SELECT table_name, 'option_text', 'BUSINESS_REQUIRED', total_rows, null_option_text FROM question_options_profile

  -- Categories & Certificates & Audit Logs
  UNION ALL SELECT table_name, 'id', 'PRIMARY_KEY', total_rows, null_id FROM categories_profile
  UNION ALL SELECT table_name, 'name', 'BUSINESS_REQUIRED', total_rows, null_name FROM categories_profile
  UNION ALL SELECT table_name, 'id', 'PRIMARY_KEY', total_rows, null_id FROM certificates_profile
  UNION ALL SELECT table_name, 'certificate_code', 'BUSINESS_REQUIRED', total_rows, null_certificate_code FROM certificates_profile
  UNION ALL SELECT table_name, 'attempt_id', 'FOREIGN_KEY', total_rows, null_attempt_id FROM certificates_profile
  UNION ALL SELECT table_name, 'id', 'PRIMARY_KEY', total_rows, null_id FROM audit_logs_profile
  UNION ALL SELECT table_name, 'action', 'BUSINESS_REQUIRED', total_rows, null_action FROM audit_logs_profile
  UNION ALL SELECT table_name, 'details', 'PAYLOAD_JSON', total_rows, null_details FROM audit_logs_profile
)

SELECT
  table_name,
  column_name,
  column_role,
  total_rows,
  null_count,
  (total_rows - null_count) AS non_null_count,
  ROUND(SAFE_DIVIDE(null_count * 100.0, total_rows), 2) AS null_percentage,
  CASE
    WHEN column_role = 'PRIMARY_KEY' AND null_count > 0 THEN TRUE
    WHEN column_role = 'FOREIGN_KEY' AND null_count > 0 THEN TRUE
    WHEN column_role = 'BUSINESS_REQUIRED' AND null_count > 0 THEN TRUE
    ELSE FALSE
  END AS is_critical_null_inflation,
  CASE
    WHEN column_role = 'PRIMARY_KEY' AND null_count > 0 THEN 'CRITICAL'
    WHEN column_role = 'FOREIGN_KEY' AND null_count > 0 THEN 'HIGH'
    WHEN column_role = 'BUSINESS_REQUIRED' AND null_count > 0 THEN 'HIGH'
    WHEN column_role = 'BUSINESS_METRIC' AND null_count > 0 THEN 'MEDIUM'
    WHEN null_count > 0 THEN 'LOW'
    ELSE 'CLEAN'
  END AS severity,
  CASE
    WHEN column_role = 'PRIMARY_KEY' AND null_count > 0 THEN 'Drop corrupted record or reject ingestion batch'
    WHEN column_role = 'FOREIGN_KEY' AND null_count > 0 THEN 'Flag for quarantine routing or assign surrogate key'
    WHEN column_role = 'PAYLOAD_JSON' AND null_count > 0 THEN 'Default to empty JSON object `{}`'
    WHEN column_role = 'BUSINESS_METRIC' AND null_count > 0 THEN 'Impute with 0.0 or recalculate from child records'
    ELSE 'No remediation required'
  END AS recommended_remediation
FROM unpivoted_column_metrics
ORDER BY
  CASE severity
    WHEN 'CRITICAL' THEN 1
    WHEN 'HIGH' THEN 2
    WHEN 'MEDIUM' THEN 3
    WHEN 'LOW' THEN 4
    ELSE 5
  END,
  null_percentage DESC,
  table_name,
  column_name;
