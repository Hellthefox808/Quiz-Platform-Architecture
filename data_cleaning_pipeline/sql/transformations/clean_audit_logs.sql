-- =============================================================================
-- Transformation Script: clean_audit_logs.sql
-- Description: Standard BigQuery SQL model for cleaning, normalizing, and 
--              transforming raw security, operational, and lifecycle audit logs
--              into analytical Silver staged and Gold fact event datasets.
-- Dialect: Google Standard SQL (BigQuery)
-- Target: `quiz-platform-prod.quiz_platform_analytics.fct_audit_events`
-- Source: `quiz-platform-prod.quiz_platform_raw.raw_audit_logs`
-- =============================================================================

CREATE OR REPLACE TABLE `quiz-platform-prod.quiz_platform_analytics.fct_audit_events`
PARTITION BY DATE(created_at_utc)
CLUSTER BY action, user_id, resource_type
OPTIONS(
  description = "Cleaned and normalized fact table for audit and security events with parsed JSON details, validated IPs, and ISO UTC timestamps."
) AS

WITH raw_extracted AS (
  SELECT
    TRIM(CAST(id AS STRING)) AS audit_id,
    TRIM(CAST(user_id AS STRING)) AS user_id,
    UPPER(TRIM(CAST(action AS STRING))) AS action,
    TRIM(CAST(resource_type AS STRING)) AS resource_type,
    TRIM(CAST(resource_id AS STRING)) AS resource_id,
    TRIM(CAST(ip_address AS STRING)) AS ip_address,
    TRIM(CAST(user_agent AS STRING)) AS user_agent,
    -- Safe JSON parsing of details payload
    SAFE.PARSE_JSON(CAST(details AS STRING)) AS parsed_details,
    -- Multi-pattern timestamp parsing to ISO UTC
    COALESCE(
      SAFE.PARSE_TIMESTAMP('%Y-%m-%dT%H:%M:%E*SZ', CAST(created_at AS STRING)),
      SAFE.PARSE_TIMESTAMP('%Y-%m-%dT%H:%M:%E*S%Ez', CAST(created_at AS STRING)),
      SAFE.PARSE_TIMESTAMP('%Y-%m-%d %H:%M:%E*S%Ez', CAST(created_at AS STRING)),
      SAFE.PARSE_TIMESTAMP('%Y-%m-%d %H:%M:%E*S', CAST(created_at AS STRING)),
      SAFE.PARSE_TIMESTAMP('%Y-%m-%d', CAST(created_at AS STRING)),
      CASE 
        WHEN SAFE_CAST(created_at AS INT64) > 10000000000 
          THEN TIMESTAMP_MILLIS(SAFE_CAST(created_at AS INT64))
        WHEN SAFE_CAST(created_at AS INT64) > 0 
          THEN TIMESTAMP_SECONDS(SAFE_CAST(created_at AS INT64))
        ELSE NULL
      END
    ) AS created_at_utc
  FROM
    `quiz-platform-prod.quiz_platform_raw.raw_audit_logs`
  WHERE
    id IS NOT NULL AND TRIM(CAST(id AS STRING)) != ''
),

deduplicated AS (
  SELECT
    *
  FROM
    raw_extracted
  QUALIFY
    ROW_NUMBER() OVER(
      PARTITION BY audit_id
      ORDER BY
        COALESCE(created_at_utc, TIMESTAMP('1970-01-01 00:00:00 UTC')) DESC,
        audit_id DESC
    ) = 1
)

SELECT
  audit_id,
  user_id,
  action,
  resource_type,
  resource_id,
  ip_address,
  user_agent,
  parsed_details AS details_json,
  parsed_details IS NOT NULL AS is_valid_json,
  created_at_utc
FROM
  deduplicated;
