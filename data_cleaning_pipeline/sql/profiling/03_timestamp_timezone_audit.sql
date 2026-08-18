-- =============================================================================
-- Script: 03_timestamp_timezone_audit.sql
-- Description: Multi-Format Timestamp & Timezone Offset Anomaly Auditor
-- Feature: FEAT-03 (Anomaly Profiler: Timezone & Timestamp Audit)
-- Requirement: R1 (Source Data Profiling & Anomaly Audit)
-- Author: Profiling & Anomaly Audit Worker (Milestone 1)
-- Dialect: Google Standard SQL (BigQuery)
-- =============================================================================

/*
  PURPOSE:
  Audits raw datetime and timestamp string representations across all operational
  telemetry sources. Identifies non-UTC timezone offsets (+05:30, -04:00),
  epoch timestamps (millisecond and second precision), unformatted SQL strings lacking
  timezones, unparseable strings, and chronological inversions (e.g. started_at > expires_at).
*/

WITH raw_timestamps AS (
  -- Assessment Attempts (Key temporal entity)
  SELECT
    'raw_assessment_attempts' AS table_name,
    id AS record_id,
    'started_at' AS column_name,
    CAST(started_at AS STRING) AS raw_ts_value,
    CAST(expires_at AS STRING) AS paired_expires_at,
    CAST(submitted_at AS STRING) AS paired_submitted_at
  FROM `quiz_platform_raw.raw_assessment_attempts`

  UNION ALL

  SELECT
    'raw_assessment_attempts' AS table_name,
    id AS record_id,
    'expires_at' AS column_name,
    CAST(expires_at AS STRING) AS raw_ts_value,
    NULL AS paired_expires_at,
    NULL AS paired_submitted_at
  FROM `quiz_platform_raw.raw_assessment_attempts`

  UNION ALL

  SELECT
    'raw_assessment_attempts' AS table_name,
    id AS record_id,
    'submitted_at' AS column_name,
    CAST(submitted_at AS STRING) AS raw_ts_value,
    NULL AS paired_expires_at,
    NULL AS paired_submitted_at
  FROM `quiz_platform_raw.raw_assessment_attempts`
  WHERE submitted_at IS NOT NULL

  UNION ALL

  -- Audit Logs
  SELECT
    'raw_audit_logs' AS table_name,
    id AS record_id,
    'created_at' AS column_name,
    CAST(created_at AS STRING) AS raw_ts_value,
    NULL AS paired_expires_at,
    NULL AS paired_submitted_at
  FROM `quiz_platform_raw.raw_audit_logs`

  UNION ALL

  -- Certificates
  SELECT
    'raw_certificates' AS table_name,
    id AS record_id,
    'issued_at' AS column_name,
    CAST(issued_at AS STRING) AS raw_ts_value,
    NULL AS paired_expires_at,
    NULL AS paired_submitted_at
  FROM `quiz_platform_raw.raw_certificates`
),

classified_formats AS (
  SELECT
    table_name,
    record_id,
    column_name,
    raw_ts_value,
    
    -- Format Detection Logic
    CASE
      WHEN raw_ts_value IS NULL THEN 'NULL_TIMESTAMP'
      
      -- Format 1: ISO 8601 Zulu UTC (e.g. 2026-08-18T15:38:27Z or microseconds)
      WHEN REGEXP_CONTAINS(raw_ts_value, r'^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$') THEN 'ISO_8601_ZULU_UTC'
      
      -- Format 2: ISO 8601 with Offset (e.g. 2026-08-18T21:08:27+05:30 or -04:00)
      WHEN REGEXP_CONTAINS(raw_ts_value, r'^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?[+-]\d{2}:?\d{2}$') THEN 'ISO_8601_WITH_OFFSET'
      
      -- Format 3: SQL Datetime without TZ (e.g. 2026-08-18 15:38:27 or microseconds)
      WHEN REGEXP_CONTAINS(raw_ts_value, r'^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}(\.\d+)?$') THEN 'SQL_DATETIME_NO_TZ'
      
      -- Format 4: SQL Datetime with Offset (e.g. 2026-08-18 21:08:27+05:30)
      WHEN REGEXP_CONTAINS(raw_ts_value, r'^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}(\.\d+)?[+-]\d{2}:?\d{2}$') THEN 'SQL_DATETIME_WITH_OFFSET'
      
      -- Format 5: Epoch Milliseconds (13 digits)
      WHEN REGEXP_CONTAINS(raw_ts_value, r'^\d{13}$') THEN 'EPOCH_MILLISECONDS'
      
      -- Format 6: Epoch Seconds (10 digits)
      WHEN REGEXP_CONTAINS(raw_ts_value, r'^\d{10}$') THEN 'EPOCH_SECONDS'
      
      -- Format 7: Date only
      WHEN REGEXP_CONTAINS(raw_ts_value, r'^\d{4}-\d{2}-\d{2}$') THEN 'DATE_ONLY'
      
      ELSE 'UNPARSEABLE_FORMAT'
    END AS detected_format,

    -- Multi-Branch Normalized UTC Timestamp
    COALESCE(
      SAFE.PARSE_TIMESTAMP('%Y-%m-%dT%H:%M:%E*SZ', raw_ts_value),
      SAFE.PARSE_TIMESTAMP('%Y-%m-%dT%H:%M:%E*S%Ez', raw_ts_value),
      SAFE.PARSE_TIMESTAMP('%Y-%m-%d %H:%M:%E*S', raw_ts_value),
      SAFE.PARSE_TIMESTAMP('%Y-%m-%d %H:%M:%E*S%Ez', raw_ts_value),
      SAFE.PARSE_TIMESTAMP('%Y-%m-%d', raw_ts_value),
      CASE
        WHEN REGEXP_CONTAINS(raw_ts_value, r'^\d{13}$') THEN TIMESTAMP_MILLIS(SAFE_CAST(raw_ts_value AS INT64))
        WHEN REGEXP_CONTAINS(raw_ts_value, r'^\d{10}$') THEN TIMESTAMP_SECONDS(SAFE_CAST(raw_ts_value AS INT64))
        ELSE NULL
      END
    ) AS parsed_utc_timestamp

  FROM raw_timestamps
),

-- Chronological Sequence Inversions on Assessment Attempts
chronology_audit AS (
  SELECT
    id AS attempt_id,
    started_at AS raw_started_at,
    expires_at AS raw_expires_at,
    submitted_at AS raw_submitted_at,
    
    COALESCE(
      SAFE.PARSE_TIMESTAMP('%Y-%m-%dT%H:%M:%E*SZ', CAST(started_at AS STRING)),
      SAFE.PARSE_TIMESTAMP('%Y-%m-%dT%H:%M:%E*S%Ez', CAST(started_at AS STRING)),
      SAFE.PARSE_TIMESTAMP('%Y-%m-%d %H:%M:%E*S', CAST(started_at AS STRING)),
      TIMESTAMP_MILLIS(SAFE_CAST(started_at AS INT64))
    ) AS parsed_started_at,
    
    COALESCE(
      SAFE.PARSE_TIMESTAMP('%Y-%m-%dT%H:%M:%E*SZ', CAST(expires_at AS STRING)),
      SAFE.PARSE_TIMESTAMP('%Y-%m-%dT%H:%M:%E*S%Ez', CAST(expires_at AS STRING)),
      SAFE.PARSE_TIMESTAMP('%Y-%m-%d %H:%M:%E*S', CAST(expires_at AS STRING)),
      TIMESTAMP_MILLIS(SAFE_CAST(expires_at AS INT64))
    ) AS parsed_expires_at,
    
    COALESCE(
      SAFE.PARSE_TIMESTAMP('%Y-%m-%dT%H:%M:%E*SZ', CAST(submitted_at AS STRING)),
      SAFE.PARSE_TIMESTAMP('%Y-%m-%dT%H:%M:%E*S%Ez', CAST(submitted_at AS STRING)),
      SAFE.PARSE_TIMESTAMP('%Y-%m-%d %H:%M:%E*S', CAST(submitted_at AS STRING)),
      TIMESTAMP_MILLIS(SAFE_CAST(submitted_at AS INT64))
    ) AS parsed_submitted_at
  FROM `quiz_platform_raw.raw_assessment_attempts`
),

chronology_violations AS (
  SELECT
    attempt_id,
    parsed_started_at,
    parsed_expires_at,
    parsed_submitted_at,
    CASE
      WHEN parsed_expires_at < parsed_started_at THEN 'EXPIRES_BEFORE_STARTED'
      WHEN parsed_submitted_at IS NOT NULL AND parsed_submitted_at < parsed_started_at THEN 'SUBMITTED_BEFORE_STARTED'
      ELSE 'VALID_CHRONOLOGY'
    END AS sequence_defect
  FROM chronology_audit
  WHERE parsed_expires_at < parsed_started_at 
     OR (parsed_submitted_at IS NOT NULL AND parsed_submitted_at < parsed_started_at)
),

format_summary AS (
  SELECT
    table_name,
    column_name,
    COUNT(*) AS total_records,
    COUNTIF(detected_format = 'ISO_8601_ZULU_UTC') AS iso_zulu_utc_count,
    COUNTIF(detected_format = 'ISO_8601_WITH_OFFSET') AS non_utc_offset_count,
    COUNTIF(detected_format = 'SQL_DATETIME_NO_TZ') AS sql_no_tz_count,
    COUNTIF(detected_format IN ('EPOCH_MILLISECONDS', 'EPOCH_SECONDS')) AS epoch_numeric_count,
    COUNTIF(detected_format = 'UNPARSEABLE_FORMAT') AS unparseable_count,
    COUNTIF(parsed_utc_timestamp IS NULL AND raw_ts_value IS NOT NULL) AS parse_failure_count,
    ROUND(
      SAFE_DIVIDE(
        COUNTIF(detected_format != 'ISO_8601_ZULU_UTC' AND detected_format != 'NULL_TIMESTAMP') * 100.0,
        COUNT(*)
      ), 2
    ) AS non_standard_format_pct
  FROM classified_formats
  GROUP BY table_name, column_name
)

-- Report Format Health & Anomaly Summary
SELECT
  s.table_name,
  s.column_name,
  s.total_records,
  s.iso_zulu_utc_count,
  s.non_utc_offset_count,
  s.sql_no_tz_count,
  s.epoch_numeric_count,
  s.unparseable_count,
  s.parse_failure_count,
  s.non_standard_format_pct,
  (SELECT COUNT(*) FROM chronology_violations) AS chronological_inversion_anomalies,
  CASE
    WHEN s.unparseable_count > 0 THEN 'CRITICAL'
    WHEN s.non_utc_offset_count > 0 OR s.epoch_numeric_count > 0 THEN 'HIGH'
    WHEN s.sql_no_tz_count > 0 THEN 'MEDIUM'
    ELSE 'CLEAN'
  END AS severity,
  'Standardize with COALESCE(SAFE.PARSE_TIMESTAMP(...), TIMESTAMP_MILLIS(...)) to ISO UTC' AS recommended_remediation
FROM format_summary s
ORDER BY
  CASE severity
    WHEN 'CRITICAL' THEN 1
    WHEN 'HIGH' THEN 2
    WHEN 'MEDIUM' THEN 3
    ELSE 4
  END,
  non_standard_format_pct DESC;
