-- =============================================================================
-- Transformation Script: clean_question_responses.sql
-- Description: Standard BigQuery SQL model for cleaning, normalizing, and 
--              transforming raw question response item telemetry into Silver staged
--              and Gold fact response datasets.
-- Dialect: Google Standard SQL (BigQuery)
-- Target: `quiz-platform-prod.quiz_platform_analytics.fct_question_responses`
-- Source: `quiz-platform-prod.quiz_platform_raw.raw_responses`
-- =============================================================================

CREATE OR REPLACE TABLE `quiz-platform-prod.quiz_platform_analytics.fct_question_responses`
PARTITION BY DATE(created_at_utc)
CLUSTER BY attempt_id, question_id, is_correct
OPTIONS(
  description = "Cleaned fact table for item-level assessment responses with sanitized option arrays, safe JSON snapshot extraction, and non-negative response timings."
) AS

WITH raw_extracted AS (
  SELECT
    TRIM(CAST(id AS STRING)) AS response_id,
    TRIM(CAST(attempt_id AS STRING)) AS attempt_id,
    TRIM(CAST(question_id AS STRING)) AS question_id,
    TRIM(CAST(attempt_question_id AS STRING)) AS attempt_question_id,
    CAST(text_response AS STRING) AS text_response,
    CAST(is_correct AS STRING) AS is_correct_raw,
    CAST(marks_awarded AS STRING) AS marks_awarded_raw,
    CAST(time_spent_seconds AS STRING) AS time_spent_raw,
    -- Safe JSON parsing of question snapshots
    SAFE.PARSE_JSON(CAST(question_snapshot AS STRING)) AS parsed_snapshot,
    SAFE.PARSE_JSON(CAST(frozen_options_json AS STRING)) AS parsed_options_json,
    -- Safe array extraction of selected options
    CASE
      WHEN selected_option_ids IS NULL THEN []
      WHEN SAFE.PARSE_JSON(CAST(selected_option_ids AS STRING)) IS NOT NULL 
        THEN JSON_VALUE_ARRAY(SAFE.PARSE_JSON(CAST(selected_option_ids AS STRING)), '$')
      ELSE []
    END AS raw_selected_options,
    -- Timestamp multi-pattern normalization
    COALESCE(
      SAFE.PARSE_TIMESTAMP('%Y-%m-%dT%H:%M:%E*SZ', CAST(created_at AS STRING)),
      SAFE.PARSE_TIMESTAMP('%Y-%m-%dT%H:%M:%E*S%Ez', CAST(created_at AS STRING)),
      SAFE.PARSE_TIMESTAMP('%Y-%m-%d %H:%M:%E*S%Ez', CAST(created_at AS STRING)),
      SAFE.PARSE_TIMESTAMP('%Y-%m-%d %H:%M:%E*S', CAST(created_at AS STRING)),
      CASE 
        WHEN SAFE_CAST(created_at AS INT64) > 10000000000 
          THEN TIMESTAMP_MILLIS(SAFE_CAST(created_at AS INT64))
        WHEN SAFE_CAST(created_at AS INT64) > 0 
          THEN TIMESTAMP_SECONDS(SAFE_CAST(created_at AS INT64))
        ELSE NULL
      END
    ) AS created_at_utc,
    COALESCE(
      SAFE.PARSE_TIMESTAMP('%Y-%m-%dT%H:%M:%E*SZ', CAST(updated_at AS STRING)),
      SAFE.PARSE_TIMESTAMP('%Y-%m-%dT%H:%M:%E*S%Ez', CAST(updated_at AS STRING)),
      SAFE.PARSE_TIMESTAMP('%Y-%m-%d %H:%M:%E*S', CAST(updated_at AS STRING))
    ) AS updated_at_utc
  FROM
    `quiz-platform-prod.quiz_platform_raw.raw_responses`
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
      PARTITION BY response_id
      ORDER BY
        COALESCE(updated_at_utc, created_at_utc, TIMESTAMP('1970-01-01 00:00:00 UTC')) DESC,
        created_at_utc DESC,
        response_id DESC
    ) = 1
)

SELECT
  response_id,
  attempt_id,
  question_id,
  attempt_question_id,
  -- Case-preserving array filtering: removes NULLs, empty strings, trims whitespace, preserves case
  ARRAY(
    SELECT DISTINCT TRIM(opt_id)
    FROM UNNEST(raw_selected_options) AS opt_id
    WHERE opt_id IS NOT NULL AND TRIM(opt_id) != ''
  ) AS selected_option_ids,
  text_response,
  COALESCE(SAFE_CAST(is_correct_raw AS BOOL), FALSE) AS is_correct,
  ROUND(GREATEST(0.0, COALESCE(SAFE_CAST(marks_awarded_raw AS FLOAT64), 0.0)), 2) AS marks_awarded,
  GREATEST(0, COALESCE(SAFE_CAST(time_spent_raw AS INT64), 0)) AS time_spent_seconds,
  -- Extracted question snapshot metadata
  JSON_VALUE(parsed_snapshot, '$.text') AS question_text,
  SAFE_CAST(JSON_VALUE(parsed_snapshot, '$.marks') AS FLOAT64) AS question_marks,
  JSON_VALUE(parsed_snapshot, '$.difficulty') AS difficulty,
  parsed_snapshot IS NOT NULL AS is_snapshot_valid,
  created_at_utc
FROM
  deduplicated;
