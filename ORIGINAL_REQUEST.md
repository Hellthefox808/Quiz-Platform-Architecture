# Original User Request

## 2026-08-18T15:38:27Z

<USER_REQUEST>
Build an automated data quality assessment, profiling, and cleaning pipeline for the Quiz Platform's analytics, attempt logs, and question response datasets using BigQuery SQL, Dataform / dbt transformations, and Dataplex profiling verification.

Working directory: d:\QWERTYUIOP\data_cleaning_pipeline
Integrity mode: development

## Requirements

### R1. Source Data Profiling & Anomaly Audit
Perform deep data profiling on assessment attempts, response records, user performance metrics, and audit event logs. Identify data quality issues including null inflation, unparsed or malformed JSON payloads, timestamp timezone offsets, duplicate records, and invalid foreign keys.

### R2. Transformation & Cleansing Pipeline
Create modular, idempotent BigQuery SQL / Dataform / dbt transformation models:
- Sanitize and flatten JSON structures using SAFE.PARSE_JSON and safe accessors (JSON_VALUE, JSON_QUERY_ARRAY).
- Handle arrays with case-preserving deduplication (ARRAY_FILTER, ARRAY_TRANSFORM) ensuring no NULL elements.
- Normalize datetimes and duration measurements to standard ISO UTC formats using COALESCE with SAFE.PARSE_*.
- Enforce schema constraints, data types, and primary/foreign key mappings without loss of valid information.

### R3. Automated Data Quality Assertions
Implement automated test assertions (Dataform assertions / dbt tests) covering:
- Non-null constraints on primary keys, user IDs, and attempt timestamps.
- Referential integrity between attempts, quizzes, questions, and users.
- Score and percentage range bounds (0.0 to 100.0, valid marks calculation).
- Accepted value checks on status enums (COMPLETED, IN_PROGRESS, ABANDONED).

### R4. Post-Transformation Profiling & Verification
Profile the transformed datasets and compare against source baseline:
- Verify that null rate drift is <1% for all valid non-nullable fields.
- Verify 100% resolution of detected structural and formatting anomalies.
- Document a transformation summary mapping each identified defect to its SQL remediation.

## Acceptance Criteria

### Data Profiling & Defect Discovery
- [ ] Initial data profiling report completed documenting baseline null rates, distinct values, and anomalies.
- [ ] All detected formatting errors, JSON corruption, and schema misalignments are cataloged.

### Cleansing Pipeline Execution
- [ ] Transformation SQL models compile and execute successfully on the target dataset.
- [ ] Case sensitivity is strictly preserved on all textual columns.
- [ ] JSON payloads and nested records are cleanly extracted and structured.

### Quality & Regression Verification
- [ ] All automated data quality assertion tests pass with 0 failures.
- [ ] Comparative profile confirms complete defect remediation with zero data corruption.
- [ ] Final cleaning documentation report generated with before/after evidence.
</USER_REQUEST>
