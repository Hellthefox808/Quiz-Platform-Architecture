# E2E Test Infra: Quiz Platform Data Cleaning Pipeline

## Test Philosophy
- **Requirement-Driven & Opaque-Box**: Derived strictly from `ORIGINAL_REQUEST.md` and user specifications, evaluating external inputs and output tables/contracts without coupling to internal transformation quirks.
- **Methodology**: Systematic 4-tier testing hierarchy combining Category-Partition, Boundary Value Analysis (BVA), Pairwise Combinatorial Testing, and Real-World Workload Simulation, followed by Tier 5 Adversarial Coverage Hardening.
- **Progressive Testability**: Verification checks provide incremental validation at every layer (source raw data -> silver transformations -> gold marts -> assertions -> post-verification).

## Feature Inventory & Test Mapping
| # | Feature | Requirement | Tier 1 (Feature) | Tier 2 (Boundary) | Tier 3 (Pairwise) | Tier 4 (Workload) |
|---|---------|-------------|:----------------:|:-----------------:|:-----------------:|:-----------------:|
| FEAT-01 | Null Inflation Audit | R1 | 5 | 5 | ✓ | ✓ |
| FEAT-02 | Malformed JSON Audit | R1 | 5 | 5 | ✓ | ✓ |
| FEAT-03 | Timezone & Timestamp Audit | R1 | 5 | 5 | ✓ | ✓ |
| FEAT-04 | Duplicate Record Audit | R1 | 5 | 5 | ✓ | ✓ |
| FEAT-05 | Foreign Key Orphan Audit | R1 | 5 | 5 | ✓ | ✓ |
| FEAT-06 | Out-of-Bounds Score Audit | R1 | 5 | 5 | ✓ | ✓ |
| FEAT-07 | Enum & String Drift Audit | R1 | 5 | 5 | ✓ | ✓ |
| FEAT-08 | Anomaly Summary Report | R1 | 5 | 5 | ✓ | ✓ |
| FEAT-09 | Bronze Schema Declarations | R2 | 5 | 5 | ✓ | ✓ |
| FEAT-10 | Robust JSON Safe Parsing | R2 | 5 | 5 | ✓ | ✓ |
| FEAT-11 | Case-Preserving Array Sanitization | R2 | 5 | 5 | ✓ | ✓ |
| FEAT-12 | Universal ISO UTC Timestamps | R2 | 5 | 5 | ✓ | ✓ |
| FEAT-13 | Idempotent Deduplication Engine | R2 | 5 | 5 | ✓ | ✓ |
| FEAT-14 | Score Clamping & Metric Logic | R2 | 5 | 5 | ✓ | ✓ |
| FEAT-15 | Status Enum Normalization | R2 | 5 | 5 | ✓ | ✓ |
| FEAT-16 | Referential Integrity & Quarantine | R2 | 5 | 5 | ✓ | ✓ |
| FEAT-17 | Gold Analytical Marts | R2 | 5 | 5 | ✓ | ✓ |
| FEAT-18 | Assertion: PK Uniqueness & Non-Null | R3 | 5 | 5 | ✓ | ✓ |
| FEAT-19 | Assertion: Referential Integrity | R3 | 5 | 5 | ✓ | ✓ |
| FEAT-20 | Assertion: Numeric Range Bounds | R3 | 5 | 5 | ✓ | ✓ |
| FEAT-21 | Assertion: Status Enum Domain | R3 | 5 | 5 | ✓ | ✓ |
| FEAT-22 | Assertion: Timestamp Monotonicity | R3 | 5 | 5 | ✓ | ✓ |
| FEAT-23 | Assertion: Question Snapshot/Array | R3 | 5 | 5 | ✓ | ✓ |
| FEAT-24 | Assertion Suite Execution | R3 | 5 | 5 | ✓ | ✓ |
| FEAT-25 | Dataplex Profiling & YAML Rules | R4 | 5 | 5 | ✓ | ✓ |
| FEAT-26 | Comparative Profiling (<1% Drift) | R4 | 5 | 5 | ✓ | ✓ |
| FEAT-27 | 100% Defect Remediation Audit | R4 | 5 | 5 | ✓ | ✓ |
| FEAT-28 | Data Dictionary & Lineage Docs | R4 | 5 | 5 | ✓ | ✓ |

## Test Architecture & Test Runner
- **Location**: `d:\QWERTYUIOP\data_cleaning_pipeline\tests\`
- **Runner Entry Point**: `python d:\QWERTYUIOP\data_cleaning_pipeline\tests\e2e_test_runner.py`
- **Execution Mode**:
  1. Automated syntax & compilation validator (Dataform CLI compile & BigQuery SQL AST check).
  2. Data pipeline simulation & test harness verifying transformation logic against generated synthetic datasets containing all 8 defect classes.
  3. Assertion verification verifying zero assertion failures across clean gold tables and proper detection on corrupted tables.
  4. Mathematical drift engine verifying `< 1.0%` null rate drift and `100%` anomaly fix rate.

## Real-World Application Scenarios (Tier 4)
| # | Scenario | Features Exercised | Complexity |
|---|----------|--------------------|------------|
| 1 | High-Concurrency Exam Submissions with Retry Storms & Network Duplicates | FEAT-04, FEAT-12, FEAT-13, FEAT-18 | High |
| 2 | Distributed Mobile Clients with Diverse Timezones (+05:30, -04:00, Epoch ms) | FEAT-03, FEAT-12, FEAT-22 | High |
| 3 | Malformed Snapshot Payloads & Escaped Question Options | FEAT-02, FEAT-10, FEAT-11, FEAT-23 | High |
| 4 | Negative Scoring, Maximum Marks Clamping & Zero Total Marks Protection | FEAT-06, FEAT-14, FEAT-20 | Medium |
| 5 | End-to-End Medallion Ingestion & Dataplex Quality Assurance Audit | FEAT-01 to FEAT-28 | Comprehensive |

## Coverage Thresholds
- **Tier 1 (Feature Coverage)**: $\ge 140$ test cases ($28 \text{ features} \times 5$).
- **Tier 2 (Boundary & Corner Cases)**: $\ge 140$ test cases ($28 \text{ features} \times 5$).
- **Tier 3 (Cross-Feature Combinations)**: $\ge 28$ test cases.
- **Tier 4 (Real-World Application Scenarios)**: $\ge 5$ end-to-end integration workflows.
- **Tier 5 (Adversarial Coverage Hardening)**: White-box challenger verification of edge cases and mutation fuzzing.
- **Target Pass Rate**: $100\%$ pass on all tiers, zero regressions, zero integrity violations.
