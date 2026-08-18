-- =============================================================================
-- Script: 02_malformed_json_audit.sql
-- Description: Semi-Structured JSON Payload & Structural Integrity Auditor
-- Feature: FEAT-02 (Anomaly Profiler: Malformed JSON Audit)
-- Requirement: R1 (Source Data Profiling & Anomaly Audit)
-- Author: Profiling & Anomaly Audit Worker (Milestone 1)
-- Dialect: Google Standard SQL (BigQuery)
-- =============================================================================

/*
  PURPOSE:
  Detects malformed, unclosed, double-escaped, or non-compliant JSON payloads
  across semi-structured columns:
  - raw_attempt_questions.question_snapshot
  - raw_results.breakdown
  - raw_audit_logs.details
  Uses SAFE.PARSE_JSON and safe accessors to validate parseability, schema integrity,
  and mandatory key availability without crashing the analytics pipeline.
*/

WITH raw_json_entities AS (
  -- 1. Attempt Question Snapshots
  SELECT
    'raw_attempt_questions' AS table_name,
    id AS record_id,
    'question_snapshot' AS json_column,
    CAST(question_snapshot AS STRING) AS raw_payload,
    SAFE.PARSE_JSON(CAST(question_snapshot AS STRING)) AS parsed_json,
    'QUESTION_SNAPSHOT' AS schema_type
  FROM `quiz_platform_raw.raw_attempt_questions`

  UNION ALL

  -- 2. Assessment Results Breakdown
  SELECT
    'raw_results' AS table_name,
    id AS record_id,
    'breakdown' AS json_column,
    CAST(breakdown AS STRING) AS raw_payload,
    SAFE.PARSE_JSON(CAST(breakdown AS STRING)) AS parsed_json,
    'RESULTS_BREAKDOWN' AS schema_type
  FROM `quiz_platform_raw.raw_results`

  UNION ALL

  -- 3. Audit Logs Details
  SELECT
    'raw_audit_logs' AS table_name,
    id AS record_id,
    'details' AS json_column,
    CAST(details AS STRING) AS raw_payload,
    SAFE.PARSE_JSON(CAST(details AS STRING)) AS parsed_json,
    'AUDIT_DETAILS' AS schema_type
  FROM `quiz_platform_raw.raw_audit_logs`
),

classified_json_anomalies AS (
  SELECT
    table_name,
    record_id,
    json_column,
    schema_type,
    SUBSTR(raw_payload, 1, 120) AS raw_payload_preview,
    
    -- Status flags
    raw_payload IS NULL AS is_null_payload,
    parsed_json IS NOT NULL AS is_valid_json,
    
    -- Check for double-escaped string literals (e.g. "\"{\\\"version\\\": 1}\"" or "\"{")
    (
      raw_payload IS NOT NULL 
      AND (
        STARTS_WITH(TRIM(raw_payload), '"{')
        OR STARTS_WITH(TRIM(raw_payload), '\"{\\')
        OR (STARTS_WITH(TRIM(raw_payload), '"') AND ENDS_WITH(TRIM(raw_payload), '"') AND REGEXP_CONTAINS(raw_payload, r'\\"[a-zA-Z0-9_]+\\":'))
      )
    ) AS is_double_escaped,

    -- Specific Schema Validations
    CASE
      -- Question Snapshot validations
      WHEN schema_type = 'QUESTION_SNAPSHOT' AND parsed_json IS NOT NULL THEN
        CASE
          WHEN JSON_VALUE(parsed_json, '$.question_text') IS NULL THEN 'MISSING_QUESTION_TEXT'
          WHEN JSON_VALUE(parsed_json, '$.marks') IS NULL THEN 'MISSING_MARKS'
          WHEN JSON_QUERY_ARRAY(parsed_json, '$.options') IS NULL THEN 'MISSING_OPTIONS_ARRAY'
          WHEN ARRAY_LENGTH(JSON_QUERY_ARRAY(parsed_json, '$.options')) = 0 THEN 'EMPTY_OPTIONS_ARRAY'
          ELSE 'VALID_SCHEMA'
        END

      -- Results Breakdown validations
      WHEN schema_type = 'RESULTS_BREAKDOWN' AND parsed_json IS NOT NULL THEN
        CASE
          WHEN JSON_QUERY(parsed_json, '$.category_breakdown') IS NULL 
               AND JSON_QUERY(parsed_json, '$.question_breakdown') IS NULL 
               AND JSON_VALUE(parsed_json, '$.total_questions') IS NULL THEN 'INCOMPLETE_BREAKDOWN_SCHEMA'
          ELSE 'VALID_SCHEMA'
        END

      -- Audit Details validations
      WHEN schema_type = 'AUDIT_DETAILS' AND parsed_json IS NOT NULL THEN 'VALID_SCHEMA'
      
      ELSE 'UNPARSEABLE_OR_NULL'
    END AS schema_validation_status,

    -- Defect Classification
    CASE
      WHEN raw_payload IS NULL THEN 'NULL_PAYLOAD'
      WHEN parsed_json IS NULL AND (
        STARTS_WITH(TRIM(raw_payload), '"{') OR STARTS_WITH(TRIM(raw_payload), '\"{\\')
      ) THEN 'DOUBLE_ESCAPED_JSON'
      WHEN parsed_json IS NULL THEN 'MALFORMED_SYNTAX'
      WHEN schema_type = 'QUESTION_SNAPSHOT' AND JSON_VALUE(parsed_json, '$.question_text') IS NULL THEN 'MISSING_REQUIRED_KEY'
      WHEN schema_type = 'QUESTION_SNAPSHOT' AND JSON_QUERY_ARRAY(parsed_json, '$.options') IS NULL THEN 'MISSING_ARRAY_STRUCTURE'
      ELSE 'CLEAN'
    END AS defect_category

  FROM raw_json_entities
),

aggregated_table_summary AS (
  SELECT
    table_name,
    json_column,
    COUNT(*) AS total_rows,
    COUNTIF(is_null_payload) AS null_payload_count,
    COUNTIF(is_valid_json) AS valid_json_count,
    COUNTIF(NOT is_null_payload AND NOT is_valid_json) AS malformed_json_count,
    COUNTIF(is_double_escaped) AS double_escaped_count,
    COUNTIF(defect_category = 'MISSING_REQUIRED_KEY') AS missing_required_keys_count,
    COUNTIF(defect_category = 'MISSING_ARRAY_STRUCTURE') AS missing_array_structure_count,
    ROUND(SAFE_DIVIDE(COUNTIF(defect_category != 'CLEAN') * 100.0, COUNT(*)), 2) AS defect_rate_pct
  FROM classified_json_anomalies
  GROUP BY table_name, json_column
)

-- Return full anomaly audit report
SELECT
  s.table_name,
  s.json_column,
  s.total_rows,
  s.valid_json_count,
  s.malformed_json_count,
  s.double_escaped_count,
  s.missing_required_keys_count,
  s.missing_array_structure_count,
  s.defect_rate_pct,
  CASE
    WHEN s.malformed_json_count > 0 OR s.double_escaped_count > 0 THEN 'CRITICAL'
    WHEN s.missing_required_keys_count > 0 THEN 'HIGH'
    WHEN s.defect_rate_pct > 0 THEN 'MEDIUM'
    ELSE 'CLEAN'
  END AS severity,
  'Apply SAFE.PARSE_JSON() with unescape fallback and JSON_VALUE/JSON_QUERY_ARRAY safe accessors' AS recommended_remediation
FROM aggregated_table_summary s
ORDER BY
  CASE severity
    WHEN 'CRITICAL' THEN 1
    WHEN 'HIGH' THEN 2
    WHEN 'MEDIUM' THEN 3
    ELSE 4
  END,
  defect_rate_pct DESC;
