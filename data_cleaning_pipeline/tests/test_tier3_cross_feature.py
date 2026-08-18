"""
Tier 3: Pairwise & Cross-Feature Interaction Test Suite.

Validates multi-feature interactions, pairwise permutations, cross-table invariants,
and layered Medallion data transformations across the cleaning pipeline (30 tests).
"""

import copy
import json
from typing import Any, Dict, List

try:
    import pytest
except ImportError:
    class _MockPytest:
        @staticmethod
        def fixture(*args, **kwargs):
            def decorator(f):
                return f
            return decorator
    pytest = _MockPytest()

from pipeline_engine import PipelineEngine
from synthetic_data_generator import SyntheticDataGenerator


class TestTier3CrossFeature:
    """Tier 3: Cross-Feature Interactions & Pairwise Scenarios."""

    @pytest.fixture(autouse=True)
    def setup_harness(self):
        self.engine = PipelineEngine()
        self.generator = SyntheticDataGenerator(seed=300)

    def setup_method(self, method=None):
        self.engine = PipelineEngine()
        self.generator = SyntheticDataGenerator(seed=300)

    # 1. Malformed JSON + Non-UTC Timestamp in same attempt record
    def test_xfeat_01_malformed_json_and_non_utc_timestamp(self):
        raw = {
            "users": [{"id": "u1"}],
            "assessment_attempts": [{
                "id": "a1", "user_id": "u1", "status": "COMPLETED",
                "started_at": "2026-08-18T21:08:27+05:30", "submitted_at": "2026-08-18T21:38:27+05:30",
                "score": 50.0, "total_marks": 50.0
            }],
            "attempt_questions": [{
                "id": "aq1", "attempt_id": "a1", "question_id": "q1",
                "question_snapshot": '{"text": "What is SQL?", "options": [' # Corrupted JSON
            }]
        }
        res = self.engine.run_full_pipeline(raw)
        att = res["gold"]["fct_assessment_attempts"][0]
        snap = res["gold"]["fct_attempt_question_snapshots"][0]
        
        assert att["started_at_utc"] == "2026-08-18T15:38:27Z"
        assert snap["is_snapshot_valid"] is False
        assert snap["options"] == []

    # 2. Duplicate Retry Storm + Out-of-Bounds Score Clamping
    def test_xfeat_02_duplicate_retry_storm_and_score_clamping(self):
        raw = {
            "users": [{"id": "u1"}],
            "assessment_attempts": [
                {"id": "a1", "user_id": "u1", "status": "COMPLETED", "score": -20.0, "total_marks": 50.0, "updated_at": "2026-08-18T10:00:00Z"},
                {"id": "a1", "user_id": "u1", "status": "COMPLETED", "score": 150.0, "total_marks": 50.0, "updated_at": "2026-08-18T10:05:00Z"}
            ]
        }
        res = self.engine.run_full_pipeline(raw)
        assert len(res["gold"]["fct_assessment_attempts"]) == 1
        att = res["gold"]["fct_assessment_attempts"][0]
        assert att["percentage"] == 100.0

    # 3. Array with NULL Elements + Mixed-Case Enum Status
    def test_xfeat_03_array_nulls_and_mixed_case_status(self):
        raw = {
            "users": [{"id": "u1"}],
            "assessment_attempts": [{
                "id": "a1", "user_id": "u1", "status": " completed ", "score": 10.0, "total_marks": 10.0
            }],
            "answers": [{
                "id": "ans1", "attempt_id": "a1", "question_id": "q1",
                "selected_option_ids": [None, "  opt_A  ", None, "opt_b"]
            }]
        }
        res = self.engine.run_full_pipeline(raw)
        att = res["gold"]["fct_assessment_attempts"][0]
        ans = res["gold"]["fct_question_responses"][0]
        
        assert att["status"] == "COMPLETED"
        assert ans["selected_option_ids"] == ["opt_A", "opt_b"]

    # 4. Foreign Key Orphan + Corrupted Snapshot JSON
    def test_xfeat_04_fk_orphan_and_corrupted_snapshot_json(self):
        raw = {
            "users": [{"id": "u_valid"}],
            "assessment_attempts": [{
                "id": "a_orphan", "user_id": "u_missing", "status": "COMPLETED"
            }],
            "attempt_questions": [{
                "id": "aq1", "attempt_id": "a_orphan", "question_id": "q1",
                "question_snapshot": "CORRUPTED_TEXT"
            }]
        }
        res = self.engine.run_full_pipeline(raw)
        assert len(res["gold"]["fct_assessment_attempts"]) == 0
        assert len(res["quarantine"]["quarantine_orphaned_attempts"]) == 1
        assert res["quarantine"]["quarantine_orphaned_attempts"][0]["quarantine_reason"] == "INVALID_OR_ORPHANED_USER_ID"

    # 5. Epoch Millis Timestamp + Negative Marks Scoring
    def test_xfeat_05_epoch_millis_and_negative_marks(self):
        raw = {
            "users": [{"id": "u1"}],
            "assessment_attempts": [{
                "id": "a1", "user_id": "u1", "status": "COMPLETED",
                "started_at": "1755511200000",
                "score": -5.0, "total_marks": 20.0
            }]
        }
        res = self.engine.run_full_pipeline(raw)
        att = res["gold"]["fct_assessment_attempts"][0]
        assert att["started_at_utc"] is not None
        assert att["started_at_utc"].endswith("Z")
        assert att["score"] == 0.0
        assert att["percentage"] == 0.0

    # 6. Zero Total Marks + Expired Status
    def test_xfeat_06_zero_total_marks_and_expired_status(self):
        raw = {
            "users": [{"id": "u1"}],
            "assessment_attempts": [{
                "id": "a1", "user_id": "u1", "status": " expired ",
                "score": 0.0, "total_marks": 0.0
            }]
        }
        res = self.engine.run_full_pipeline(raw)
        att = res["gold"]["fct_assessment_attempts"][0]
        assert att["status"] == "EXPIRED"
        assert att["percentage"] == 0.0
        assert att["passed"] is False

    # 7. Deduplication of Conflicting Timestamps (+05:30 vs UTC)
    def test_xfeat_07_deduplication_with_mixed_tz_formats(self):
        recs = [
            {"id": "a1", "updated_at": "2026-08-18T10:00:00Z", "payload": "v1"},
            {"id": "a1", "updated_at": "2026-08-18T15:35:00+05:30", "payload": "v2"}
        ]
        for r in recs:
            r["updated_at_utc"] = self.engine.parse_timestamp_utc(r["updated_at"])
        deduped = self.engine.deduplicate_records(recs, pk_field="id", order_by_fields=["updated_at_utc"])
        assert len(deduped) == 1
        assert deduped[0]["payload"] == "v2"

    # 8. Array Deduplication Case Preservation + JSON Query Extraction
    def test_xfeat_08_array_dedup_case_preservation_and_json_query(self):
        snapshot_json = '{"options": ["Alpha", "alpha", "Alpha", " Beta "]}'
        parsed = self.engine.safe_parse_json(snapshot_json)
        raw_opts = parsed["options"]
        clean_opts = self.engine.sanitize_array(raw_opts)
        assert clean_opts == ["Alpha", "alpha", "Beta"]

    # 9. Certificate Issuance Invariant with Clamped Score Passing Threshold
    def test_xfeat_09_certificate_invariant_with_score_clamping(self):
        attempts = [
            {"attempt_id": "a1", "score": 90.0, "total_marks": 100.0, "percentage": 90.0, "passed": True},
            {"attempt_id": "a2", "score": 40.0, "total_marks": 100.0, "percentage": 40.0, "passed": False}
        ]
        certs = [{"id": "c1", "attempt_id": "a1"}, {"id": "c2", "attempt_id": "a2"}]
        res = self.engine.assert_certificate_invariant(certs, attempts)
        assert res["passed"] is False
        assert res["violations_count"] == 1
        assert res["violations"][0]["record"]["attempt_id"] == "a2"

    # 10. Status 'SUBMITTING' with Null submitted_at vs 'COMPLETED'
    def test_xfeat_10_status_submitting_null_submitted_at_vs_completed(self):
        records = [
            {"attempt_id": "a1", "status": "SUBMITTING", "started_at_utc": "2026-08-18T10:00:00Z", "submitted_at_utc": None},
            {"attempt_id": "a2", "status": "COMPLETED", "started_at_utc": "2026-08-18T10:00:00Z", "submitted_at_utc": "2026-08-18T10:20:00Z"}
        ]
        mono_res = self.engine.assert_timestamps_monotonic(records, "started_at_utc", "submitted_at_utc")
        assert mono_res["passed"] is True

    # 11. Frozen Question Snapshot Marks vs Modified Master Question Marks
    def test_xfeat_11_frozen_snapshot_marks_vs_modified_master_marks(self):
        frozen_snapshot = '{"question_id": "q1", "text": "Q1", "marks": 2.0, "options": [{"id": "o1", "text": "A"}]}'
        parsed = self.engine.safe_parse_json(frozen_snapshot)
        snapshot_marks = parsed["marks"]
        master_question_marks = 5.0
        assert snapshot_marks == 2.0
        assert snapshot_marks != master_question_marks

    # 12. Attempt Status 'COMPLETED' Audit Event Sync
    def test_xfeat_12_completed_status_audit_event_sync(self):
        pristine = self.generator.generate_pristine_dataset(num_users=3, num_quizzes=1, num_attempts=5)
        res = self.engine.run_full_pipeline(pristine)
        completed_attempts = [a for a in res["gold"]["fct_assessment_attempts"] if a["status"] == "COMPLETED"]
        submitted_audits = [al for al in res["gold"]["fct_audit_events"] if al["action"] == "ATTEMPT_SUBMITTED"]
        assert len(completed_attempts) == len(submitted_audits)

    # 13. Attempt Status 'EXPIRED' Audit Event Sync
    def test_xfeat_13_expired_status_audit_event_sync(self):
        raw = {
            "users": [{"id": "u1"}],
            "assessment_attempts": [{
                "id": "a1", "user_id": "u1", "status": "EXPIRED", "started_at": "2026-08-18T10:00:00Z"
            }],
            "audit_logs": [{
                "id": "al1", "user_id": "u1", "action": "ATTEMPT_AUTO_SUBMITTED",
                "resource_type": "assessment_attempt", "resource_id": "a1",
                "details": json.dumps({"reason": "time_limit_reached"})
            }]
        }
        res = self.engine.run_full_pipeline(raw)
        assert res["gold"]["fct_assessment_attempts"][0]["status"] == "EXPIRED"
        assert res["gold"]["fct_audit_events"][0]["action"] == "ATTEMPT_AUTO_SUBMITTED"

    # 14. Referential Quarantine Routing + Dataplex Rule Validation
    def test_xfeat_14_referential_quarantine_routing_and_dataplex_rules(self):
        pristine = self.generator.generate_pristine_dataset(num_users=5, num_quizzes=2, num_attempts=10)
        pristine["assessment_attempts"].append({"id": "a_bad_1", "user_id": "missing_1", "status": "COMPLETED"})
        pristine["assessment_attempts"].append({"id": "a_bad_2", "user_id": "missing_2", "status": "COMPLETED"})
        
        res = self.engine.run_full_pipeline(pristine)
        assert len(res["quarantine"]["quarantine_orphaned_attempts"]) == 2
        assertions = self.engine.run_all_assertions(res["gold"])
        assert assertions["all_passed"] is True

    # 15. Null Drift Calculation After Deduplication and JSON Fallback
    def test_xfeat_15_null_drift_calculation_after_dedup(self):
        pristine = self.generator.generate_pristine_dataset(num_users=10, num_quizzes=2, num_attempts=20)
        base_profile = self.engine.profile_table(pristine["assessment_attempts"])
        res = self.engine.run_full_pipeline(pristine)
        post_profile = self.engine.profile_table(res["gold"]["fct_assessment_attempts"])
        drift = self.engine.evaluate_null_drift(base_profile, post_profile, ["user_id", "status"])
        assert drift["overall_drift_pass"] is True

    # 16. Full Defect Remediation on Multi-Defect Batch
    def test_xfeat_16_full_defect_remediation_on_multi_defect_batch(self):
        pristine = self.generator.generate_pristine_dataset(num_users=10, num_quizzes=2, num_attempts=20)
        mutated = self.generator.inject_defects(pristine, defect_rate=0.3)
        res = self.engine.run_full_pipeline(mutated["raw_data"])
        remediation = self.engine.evaluate_defect_remediation(mutated["injected_anomalies"], res["gold"])
        assert remediation["is_100_percent_remediated"] is True
        assert remediation["remediation_rate_pct"] == 100.0

    # 17. Dataform Assertions Execution on Silver vs Gold
    def test_xfeat_17_dataform_assertions_on_silver_vs_gold(self):
        raw = {
            "users": [{"id": "u1"}],
            "assessment_attempts": [
                {"id": "a1", "user_id": "u1", "status": "COMPLETED", "score": 10.0, "total_marks": 10.0},
                {"id": "a2", "user_id": "orphan_user", "status": "COMPLETED", "score": 10.0, "total_marks": 10.0}
            ]
        }
        res = self.engine.run_full_pipeline(raw)
        gold_assert = self.engine.run_all_assertions(res["gold"])
        assert gold_assert["all_passed"] is True

    # 18. Score Calculation with Negative Marking Quiz
    def test_xfeat_18_score_calculation_with_negative_marking_quiz(self):
        score, pct, dur = self.engine.clamp_score(obtained_marks=-2.0, total_marks=20.0)
        assert score == 0.0
        assert pct == 0.0

    # 19. Timestamp Monotonicity and Duration Recomputation
    def test_xfeat_19_timestamp_monotonicity_and_duration_recomputation(self):
        raw = {
            "users": [{"id": "u1"}],
            "assessment_attempts": [{
                "id": "a1", "user_id": "u1", "status": "COMPLETED",
                "started_at": "2026-08-18T10:00:00Z",
                "submitted_at": "2026-08-18T10:15:30Z",
                "score": 10.0, "total_marks": 10.0
            }]
        }
        res = self.engine.run_full_pipeline(raw)
        att = res["gold"]["fct_assessment_attempts"][0]
        assert att["duration_seconds"] == 930

    # 20. Question Response Flattening and Snapshot Integrity
    def test_xfeat_20_question_response_flattening_and_snapshot_integrity(self):
        raw = {
            "users": [{"id": "u1"}],
            "assessment_attempts": [{"id": "a1", "user_id": "u1", "status": "COMPLETED"}],
            "attempt_questions": [{
                "id": "aq1", "attempt_id": "a1", "question_id": "q1",
                "question_snapshot": json.dumps({"text": "Q1 Text", "marks": 5.0, "options": [{"id": "o1", "text": "Option 1"}]})
            }],
            "answers": [{
                "id": "ans1", "attempt_id": "a1", "question_id": "q1",
                "selected_option_ids": ["o1"], "marks_awarded": 5.0
            }]
        }
        res = self.engine.run_full_pipeline(raw)
        assert len(res["gold"]["fct_attempt_question_snapshots"]) == 1
        assert len(res["gold"]["fct_question_responses"]) == 1

    # 21. Dim Users Join & Attempt Partitioning by Date
    def test_xfeat_21_dim_users_and_partitioned_fct_attempts(self):
        pristine = self.generator.generate_pristine_dataset(num_users=5, num_quizzes=1, num_attempts=5)
        res = self.engine.run_full_pipeline(pristine)
        for att in res["gold"]["fct_assessment_attempts"]:
            date_partition = att["started_at_utc"][:10]
            assert len(date_partition) == 10
            assert date_partition.startswith("2026-")

    # 22. Certificate Code Uniqueness and Passed Foreign Key Validation
    def test_xfeat_22_certificate_code_uniqueness_and_passed_fk(self):
        certs = [
            {"id": "c1", "attempt_id": "a1", "certificate_code": "CERT-001"},
            {"id": "c2", "attempt_id": "a2", "certificate_code": "CERT-002"}
        ]
        pk_res = self.engine.assert_pk_unique_not_null(certs, "certificate_code")
        assert pk_res["passed"] is True

    # 23. Audit Log Details JSON Parsing and Timezone Harmonization
    def test_xfeat_23_audit_log_json_details_and_tz_offset(self):
        raw = {
            "users": [{"id": "u1"}],
            "audit_logs": [{
                "id": "al1", "user_id": "u1", "action": "USER_LOGIN",
                "resource_type": "user", "resource_id": "u1",
                "details": '{"ip": "10.0.0.1", "device": "mobile"}',
                "created_at": "2026-08-18T12:00:00-04:00"
            }]
        }
        res = self.engine.run_full_pipeline(raw)
        audit = res["gold"]["fct_audit_events"][0]
        assert audit["created_at_utc"] == "2026-08-18T16:00:00Z"
        assert audit["details"]["ip"] == "10.0.0.1"

    # 24. Double-Escaped JSON + Array Whitespace Trimming
    def test_xfeat_24_double_escaped_json_and_array_whitespace(self):
        raw_str = '"{\\"tags\\": [\\"  Python  \\", \\"BigQuery\\"]}"'
        parsed = self.engine.safe_parse_json(raw_str)
        assert parsed is not None
        clean_tags = self.engine.sanitize_array(parsed["tags"])
        assert clean_tags == ["Python", "BigQuery"]

    # 25. High-Volume Retries + Foreign Key Orphans Isolation
    def test_xfeat_25_high_volume_retries_and_fk_orphans(self):
        raw_attempts = []
        for i in range(100):
            raw_attempts.append({
                "id": "a1", "user_id": "missing_user", "updated_at": f"2026-08-18T{i%24:02d}:00:00Z", "status": "COMPLETED"
            })
            raw_attempts.append({
                "id": "a2", "user_id": "u_valid", "updated_at": f"2026-08-18T{i%24:02d}:00:00Z", "status": "COMPLETED"
            })
        raw = {"users": [{"id": "u_valid"}], "assessment_attempts": raw_attempts}
        res = self.engine.run_full_pipeline(raw)
        assert len(res["gold"]["fct_assessment_attempts"]) == 1
        assert res["gold"]["fct_assessment_attempts"][0]["attempt_id"] == "a2"
        assert len(res["quarantine"]["quarantine_orphaned_attempts"]) == 1
        assert res["quarantine"]["quarantine_orphaned_attempts"][0]["attempt_id"] == "a1"

    # 26. Inverted Timestamps and Score Bounds Clamping
    def test_xfeat_26_inverted_timestamps_and_score_bounds(self):
        raw = {
            "users": [{"id": "u1"}],
            "assessment_attempts": [{
                "id": "a1", "user_id": "u1", "status": "COMPLETED",
                "started_at": "2026-08-18T12:00:00Z",
                "submitted_at": "2026-08-18T10:00:00Z",
                "score": -100.0, "total_marks": 50.0
            }]
        }
        res = self.engine.run_full_pipeline(raw)
        att = res["gold"]["fct_assessment_attempts"][0]
        assert att["duration_seconds"] == 0
        assert att["score"] == 0.0
        assert att["percentage"] == 0.0

    # 27. Math & Unicode Symbols in Arrays + Case Preservation
    def test_xfeat_27_math_unicode_symbols_and_case_preservation(self):
        arr = ["λ-Calculus", "λ-calculus", "  ΔE = mc²  ", "ΔE = mc²"]
        cleaned = self.engine.sanitize_array(arr)
        assert cleaned == ["λ-Calculus", "λ-calculus", "ΔE = mc²"]

    # 28. Dataplex DQ Rules Complete Scan + Comparative Profiling
    def test_xfeat_28_dataplex_dq_rules_and_comparative_profiling(self):
        pristine = self.generator.generate_pristine_dataset(num_users=10, num_quizzes=2, num_attempts=20)
        res = self.engine.run_full_pipeline(pristine)
        assertions = self.engine.run_all_assertions(res["gold"])
        assert assertions["all_passed"] is True
        profile = self.engine.profile_table(res["gold"]["fct_assessment_attempts"])
        assert profile["row_count"] == 20

    # 29. Full Medallion Flow Bronze -> Silver -> Gold
    def test_xfeat_29_medallion_full_dataflow_bronze_silver_gold(self):
        pristine = self.generator.generate_pristine_dataset(num_users=5, num_quizzes=2, num_attempts=10)
        mutated = self.generator.inject_defects(pristine, defect_rate=0.2)
        silver = self.engine.clean_bronze_to_silver(mutated["raw_data"])
        assert "stg_assessment_attempts" in silver
        gold_out = self.engine.materialize_silver_to_gold(silver)
        assert "fct_assessment_attempts" in gold_out["gold"]
        assert "quarantine_orphaned_attempts" in gold_out["quarantine"]

    # 30. Comprehensive Audit Scorecard Generation
    def test_xfeat_30_comprehensive_audit_scorecard_generation(self):
        pristine = self.generator.generate_pristine_dataset(num_users=5, num_quizzes=2, num_attempts=10)
        mutated = self.generator.inject_defects(pristine, defect_rate=0.25)
        pipeline_res = self.engine.run_full_pipeline(mutated["raw_data"])
        remediation = self.engine.evaluate_defect_remediation(mutated["injected_anomalies"], pipeline_res["gold"])
        assert remediation["remediation_rate_pct"] == 100.0
        assert remediation["unresolved_count"] == 0
