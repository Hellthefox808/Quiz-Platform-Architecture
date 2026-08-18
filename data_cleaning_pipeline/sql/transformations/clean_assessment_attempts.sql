-- =============================================================================
-- Transformation Script: clean_assessment_attempts.sql
-- Description: Standard BigQuery SQL model for cleaning, normalizing, and 
--              transforming raw assessment attempt telemetry into production-grade
--              Silver staged and Gold fact datasets.
-- Dialect: Google Standard SQL (BigQuery)
-- Target: `quiz-platform-prod.quiz_platform_analytics.fct_assessment_attempts`
-- Source: `quiz-platform-prod.quiz_platform_raw.raw_attempts`
-- =============================================================================

CREATE OR REPLACE TABLE `quiz-platform-prod.quiz_platform_analytics.fct_assessment_attempts`
PARTITION BY DATE(started_at_utc)
CLUSTER BY status, quiz_id, user_id
OPTIONS(
  description = "Cleaned and normalized fact table for assessment attempts with UTC timestamps, clamped score metrics [0.0, 100.0], and deduplicated records."
) AS

WITH raw_parsed AS (
  SELECT
    TRIM(CAST(id AS STRING)) AS attempt_id,
    TRIM(CAST(user_id AS STRING)) AS user_id,
    TRIM(CAST(quiz_id AS STRING)) AS quiz_id,
    TRIM(CAST(quiz_version_id AS STRING)) AS quiz_version_id,
    CAST(status AS STRING) AS status_raw,
    CAST(score AS STRING) AS score_raw,
    CAST(total_marks AS STRING) AS total_marks_raw,
    CAST(duration_seconds AS STRING) AS duration_seconds_raw,
    CAST(passed AS STRING) AS passed_raw,
    -- Multi-pattern timestamp parsing to ISO UTC for started_at
    COALESCE(
      SAFE.PARSE_TIMESTAMP('%Y-%m-%dT%H:%M:%E*SZ', CAST(started_at AS STRING)),
      SAFE.PARSE_TIMESTAMP('%Y-%m-%dT%H:%M:%E*S%Ez', CAST(started_at AS STRING)),
      SAFE.PARSE_TIMESTAMP('%Y-%m-%d %H:%M:%E*S%Ez', CAST(started_at AS STRING)),
      SAFE.PARSE_TIMESTAMP('%Y-%m-%d %H:%M:%E*S', CAST(started_at AS STRING)),
      SAFE.PARSE_TIMESTAMP('%Y-%m-%d', CAST(started_at AS STRING)),
      CASE 
        WHEN SAFE_CAST(started_at AS INT64) > 10000000000 
          THEN TIMESTAMP_MILLIS(SAFE_CAST(started_at AS INT64))
        WHEN SAFE_CAST(started_at AS INT64) > 0 
          THEN TIMESTAMP_SECONDS(SAFE_CAST(started_at AS INT64))
        ELSE NULL
      END
    ) AS started_at_utc,
    -- Multi-pattern timestamp parsing to ISO UTC for submitted_at
    COALESCE(
      SAFE.PARSE_TIMESTAMP('%Y-%m-%dT%H:%M:%E*SZ', CAST(submitted_at AS STRING)),
      SAFE.PARSE_TIMESTAMP('%Y-%m-%dT%H:%M:%E*S%Ez', CAST(submitted_at AS STRING)),
      SAFE.PARSE_TIMESTAMP('%Y-%m-%d %H:%M:%E*S%Ez', CAST(submitted_at AS STRING)),
      SAFE.PARSE_TIMESTAMP('%Y-%m-%d %H:%M:%E*S', CAST(submitted_at AS STRING)),
      SAFE.PARSE_TIMESTAMP('%Y-%m-%d', CAST(submitted_at AS STRING)),
      CASE 
        WHEN SAFE_CAST(submitted_at AS INT64) > 10000000000 
          THEN TIMESTAMP_MILLIS(SAFE_CAST(submitted_at AS INT64))
        WHEN SAFE_CAST(submitted_at AS INT64) > 0 
          THEN TIMESTAMP_SECONDS(SAFE_CAST(submitted_at AS INT64))
        ELSE NULL
      END
    ) AS submitted_at_utc,
    -- Multi-pattern timestamp parsing to ISO UTC for expires_at
    COALESCE(
      SAFE.PARSE_TIMESTAMP('%Y-%m-%dT%H:%M:%E*SZ', CAST(expires_at AS STRING)),
      SAFE.PARSE_TIMESTAMP('%Y-%m-%dT%H:%M:%E*S%Ez', CAST(expires_at AS STRING)),
      SAFE.PARSE_TIMESTAMP('%Y-%m-%d %H:%M:%E*S%Ez', CAST(expires_at AS STRING)),
      SAFE.PARSE_TIMESTAMP('%Y-%m-%d %H:%M:%E*S', CAST(expires_at AS STRING)),
      SAFE.PARSE_TIMESTAMP('%Y-%m-%d', CAST(expires_at AS STRING)),
      CASE 
        WHEN SAFE_CAST(expires_at AS INT64) > 10000000000 
          THEN TIMESTAMP_MILLIS(SAFE_CAST(expires_at AS INT64))
        WHEN SAFE_CAST(expires_at AS INT64) > 0 
          THEN TIMESTAMP_SECONDS(SAFE_CAST(expires_at AS INT64))
        ELSE NULL
      END
    ) AS expires_at_utc,
    -- Multi-pattern timestamp parsing for audit tracking
    COALESCE(
      SAFE.PARSE_TIMESTAMP('%Y-%m-%dT%H:%M:%E*SZ', CAST(created_at AS STRING)),
      SAFE.PARSE_TIMESTAMP('%Y-%m-%dT%H:%M:%E*S%Ez', CAST(created_at AS STRING)),
      SAFE.PARSE_TIMESTAMP('%Y-%m-%d %H:%M:%E*S', CAST(created_at AS STRING))
    ) AS created_at_utc,
    COALESCE(
      SAFE.PARSE_TIMESTAMP('%Y-%m-%dT%H:%M:%E*SZ', CAST(updated_at AS STRING)),
      SAFE.PARSE_TIMESTAMP('%Y-%m-%dT%H:%M:%E*S%Ez', CAST(updated_at AS STRING)),
      SAFE.PARSE_TIMESTAMP('%Y-%m-%d %H:%M:%E*S', CAST(updated_at AS STRING))
    ) AS updated_at_utc
  FROM
    `quiz-platform-prod.quiz_platform_raw.raw_attempts`
  WHERE
    id IS NOT NULL AND TRIM(CAST(id AS STRING)) != ''
),

deduplicated AS (
  SELECT
    *
  FROM
    raw_parsed
  QUALIFY
    ROW_NUMBER() OVER(
      PARTITION BY attempt_id
      ORDER BY
        COALESCE(updated_at_utc, created_at_utc, started_at_utc, TIMESTAMP('1970-01-01 00:00:00 UTC')) DESC,
        created_at_utc DESC,
        attempt_id DESC
    ) = 1
)

SELECT
  attempt_id,
  user_id,
  quiz_id,
  quiz_version_id,
  -- Normalize status enum with uppercase conversion and fallback
  CASE
    WHEN UPPER(TRIM(status_raw)) IN ('CREATED', 'IN_PROGRESS', 'SUBMITTING', 'COMPLETED', 'EXPIRED', 'CANCELLED', 'ABANDONED')
      THEN UPPER(TRIM(status_raw))
    ELSE 'UNKNOWN'
  END AS status,
  started_at_utc,
  submitted_at_utc,
  expires_at_utc,
  -- Calculate non-negative duration
  GREATEST(
    0,
    COALESCE(
      SAFE_CAST(duration_seconds_raw AS INT64),
      CAST(TIMESTAMP_DIFF(submitted_at_utc, started_at_utc, SECOND) AS INT64),
      0
    )
  ) AS duration_seconds,
  -- Clamped scores and safe percentage computation
  ROUND(GREATEST(0.0, COALESCE(SAFE_CAST(total_marks_raw AS FLOAT64), 0.0)), 2) AS total_marks,
  ROUND(GREATEST(0.0, COALESCE(SAFE_CAST(score_raw AS FLOAT64), 0.0)), 2) AS score,
  ROUND(
    LEAST(
      100.0,
      GREATEST(
        0.0,
        COALESCE(
          SAFE_DIVIDE(
            GREATEST(0.0, COALESCE(SAFE_CAST(score_raw AS FLOAT64), 0.0)),
            NULLIF(GREATEST(0.0, COALESCE(SAFE_CAST(total_marks_raw AS FLOAT64), 0.0)), 0.0)
          ) * 100.0,
          0.0
        )
      )
    ),
    2
  ) AS percentage,
  -- Determine pass boolean
  COALESCE(
    SAFE_CAST(passed_raw AS BOOL),
    CASE 
      WHEN SAFE_DIVIDE(GREATEST(0.0, COALESCE(SAFE_CAST(score_raw AS FLOAT64), 0.0)), NULLIF(GREATEST(0.0, COALESCE(SAFE_CAST(total_marks_raw AS FLOAT64), 0.0)), 0.0)) >= 0.6 
        THEN TRUE 
      ELSE FALSE 
    END
  ) AS passed,
  CURRENT_TIMESTAMP() AS ingested_at_utc
FROM
  deduplicated;
