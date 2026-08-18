"""
Tier 1: Comprehensive Feature Coverage Test Suite (FEAT-01 through FEAT-28).

Validates isolated feature compilation, execution, transformation logic,
automated assertions, and Dataplex verification across all 28 features (140+ tests).
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


class TestTier1FeatureCoverage:
    """Tier 1: Feature Coverage Unit & Execution Tests."""

    @pytest.fixture(autouse=True)
    def setup_generator(self):
        self.generator = SyntheticDataGenerator(seed=100)
        self.engine = PipelineEngine()

    def setup_method(self, method=None):
        self.generator = SyntheticDataGenerator(seed=100)
        self.engine = PipelineEngine()

    # -------------------------------------------------------------
    # FEAT-01: Anomaly Profiler: Null Inflation Audit
    # -------------------------------------------------------------
    def test_feat_01_01_null_inflation_empty_table(self):
        profile = self.engine.profile_table([])
        assert profile["row_count"] == 0
        assert profile["columns"] == {}

    def test_feat_01_02_null_inflation_zero_nulls(self):
        records = [{"id": f"id_{i}", "val": i} for i in range(10)]
        profile = self.engine.profile_table(records)
        assert profile["row_count"] == 10
        assert profile["columns"]["id"]["null_count"] == 0
        assert profile["columns"]["id"]["null_ratio"] == 0.0

    def test_feat_01_03_null_inflation_half_nulls(self):
        records = [{"id": f"id_{i}", "val": None if i % 2 == 0 else i} for i in range(10)]
        profile = self.engine.profile_table(records)
        assert profile["columns"]["val"]["null_count"] == 5
        assert profile["columns"]["val"]["null_ratio"] == 0.5

    def test_feat_01_04_null_inflation_multi_column_audit(self):
        records = [
            {"a": "1", "b": None, "c": "x"},
            {"a": None, "b": "2", "c": "y"},
            {"a": "3", "b": "3", "c": None},
        ]
        profile = self.engine.profile_table(records)
        assert profile["columns"]["a"]["null_count"] == 1
        assert profile["columns"]["b"]["null_count"] == 1
        assert profile["columns"]["c"]["null_count"] == 1

    def test_feat_01_05_null_inflation_pk_null_alert(self):
        records = [{"id": None, "score": 100.0}, {"id": "valid", "score": 90.0}]
        profile = self.engine.profile_table(records)
        assert profile["columns"]["id"]["null_count"] == 1
        assert profile["columns"]["id"]["null_ratio"] == 0.5

    # -------------------------------------------------------------
    # FEAT-02: Anomaly Profiler: Malformed JSON Audit
    # -------------------------------------------------------------
    def test_feat_02_01_malformed_json_unclosed_brace(self):
        bad_json = '{"question": "What is Python?", "options": ['
        assert self.engine.safe_parse_json(bad_json) is None

    def test_feat_02_02_malformed_json_double_escaped_string(self):
        double_escaped = '"{\\"escaped\\": true}"'
        parsed = self.engine.safe_parse_json(double_escaped)
        assert isinstance(parsed, dict)
        assert parsed.get("escaped") is True

    def test_feat_02_03_malformed_json_plain_string(self):
        plain_text = "NOT_A_JSON_PAYLOAD"
        assert self.engine.safe_parse_json(plain_text) is None

    def test_feat_02_04_malformed_json_valid_nested_payload(self):
        valid_json = '{"user": {"id": "123", "meta": {"role": "admin"}}}'
        parsed = self.engine.safe_parse_json(valid_json)
        assert parsed is not None
        assert parsed["user"]["meta"]["role"] == "admin"

    def test_feat_02_05_malformed_json_empty_string(self):
        assert self.engine.safe_parse_json("") is None
        assert self.engine.safe_parse_json("   ") is None

    # -------------------------------------------------------------
    # FEAT-03: Anomaly Profiler: Timezone & Timestamp Audit
    # -------------------------------------------------------------
    def test_feat_03_01_timestamp_audit_iso_zulu(self):
        res = self.engine.parse_timestamp_utc("2026-08-18T15:38:27Z")
        assert res == "2026-08-18T15:38:27Z"

    def test_feat_03_02_timestamp_audit_positive_offset(self):
        res = self.engine.parse_timestamp_utc("2026-08-18T21:08:27+05:30")
        assert res == "2026-08-18T15:38:27Z"

    def test_feat_03_03_timestamp_audit_sql_space_format(self):
        res = self.engine.parse_timestamp_utc("2026-08-18 15:38:27")
        assert res == "2026-08-18T15:38:27Z"

    def test_feat_03_04_timestamp_audit_epoch_millis(self):
        res = self.engine.parse_timestamp_utc("1755530781000")
        assert res is not None
        assert res.endswith("Z")

    def test_feat_03_05_timestamp_audit_corrupted_format(self):
        assert self.engine.parse_timestamp_utc("INVALID_DATE_TIME") is None
        assert self.engine.parse_timestamp_utc("32-13-2026 99:99:99") is None

    # -------------------------------------------------------------
    # FEAT-04: Anomaly Profiler: Duplicate Record Audit
    # -------------------------------------------------------------
    def test_feat_04_01_duplicate_audit_zero_duplicates(self):
        records = [{"id": f"pk_{i}", "val": i} for i in range(10)]
        deduped = self.engine.deduplicate_records(records, pk_field="id")
        assert len(deduped) == 10

    def test_feat_04_02_duplicate_audit_retry_burst_5x(self):
        records = [{"id": "pk_1", "updated_at": f"2026-08-18T10:0{i}:00Z", "v": i} for i in range(5)]
        deduped = self.engine.deduplicate_records(records, pk_field="id")
        assert len(deduped) == 1
        assert deduped[0]["v"] == 4  # Freshest updated_at kept

    def test_feat_04_03_duplicate_audit_collision_rate_calc(self):
        records = [
            {"id": "a", "v": 1},
            {"id": "a", "v": 2},
            {"id": "b", "v": 1},
            {"id": "c", "v": 1},
        ]
        deduped = self.engine.deduplicate_records(records, pk_field="id")
        assert len(deduped) == 3
        duplicate_count = len(records) - len(deduped)
        assert duplicate_count == 1

    def test_feat_04_04_duplicate_audit_multi_key_uniqueness(self):
        records = [
            {"id": "k1", "updated_at": "2026-01-01T00:00:00Z"},
            {"id": "k2", "updated_at": "2026-01-01T00:00:00Z"},
            {"id": "k1", "updated_at": "2026-01-02T00:00:00Z"}
        ]
        deduped = self.engine.deduplicate_records(records, pk_field="id")
        assert len(deduped) == 2

    def test_feat_04_05_duplicate_audit_timestamp_delta(self):
        records = [
            {"id": "att_1", "updated_at": "2026-08-18T12:00:00Z", "status": "IN_PROGRESS"},
            {"id": "att_1", "updated_at": "2026-08-18T12:15:00Z", "status": "COMPLETED"}
        ]
        deduped = self.engine.deduplicate_records(records, pk_field="id")
        assert len(deduped) == 1
        assert deduped[0]["status"] == "COMPLETED"

    # -------------------------------------------------------------
    # FEAT-05: Anomaly Profiler: Foreign Key Orphan Audit
    # -------------------------------------------------------------
    def test_feat_05_01_fk_orphan_zero_orphans(self):
        parents = [{"id": "u1"}, {"id": "u2"}]
        children = [{"id": "c1", "user_id": "u1"}, {"id": "c2", "user_id": "u2"}]
        res = self.engine.assert_referential_integrity(children, "user_id", parents, "id")
        assert res["passed"] is True
        assert res["violations_count"] == 0

    def test_feat_05_02_fk_orphan_missing_parent(self):
        parents = [{"id": "u1"}]
        children = [{"id": "c1", "user_id": "u1"}, {"id": "c2", "user_id": "u_missing"}]
        res = self.engine.assert_referential_integrity(children, "user_id", parents, "id")
        assert res["passed"] is False
        assert res["violations_count"] == 1

    def test_feat_05_03_fk_orphan_all_orphans(self):
        parents = []
        children = [{"id": "c1", "user_id": "u1"}, {"id": "c2", "user_id": "u2"}]
        res = self.engine.assert_referential_integrity(children, "user_id", parents, "id")
        assert res["passed"] is False
        assert res["violations_count"] == 2

    def test_feat_05_04_fk_orphan_null_fk_handling(self):
        parents = [{"id": "u1"}]
        children = [{"id": "c1", "user_id": None}]
        res = self.engine.assert_referential_integrity(children, "user_id", parents, "id")
        assert res["passed"] is True

    def test_feat_05_05_fk_orphan_multi_parent_verification(self):
        parents = [{"id": f"p_{i}"} for i in range(100)]
        children = [{"id": f"c_{i}", "parent_id": f"p_{i % 100}"} for i in range(500)]
        res = self.engine.assert_referential_integrity(children, "parent_id", parents, "id")
        assert res["passed"] is True

    # -------------------------------------------------------------
    # FEAT-06: Anomaly Profiler: Out-of-Bounds Score Audit
    # -------------------------------------------------------------
    def test_feat_06_01_score_bounds_negative_marks_detection(self):
        records = [{"score": -10.0, "percentage": -20.0}]
        res = self.engine.assert_numeric_range(records, "score", 0.0, None)
        assert res["passed"] is False

    def test_feat_06_02_score_bounds_percentage_exceeds_100(self):
        records = [{"percentage": 105.0}]
        res = self.engine.assert_numeric_range(records, "percentage", 0.0, 100.0)
        assert res["passed"] is False

    def test_feat_06_03_score_bounds_zero_total_marks(self):
        score, pct, dur = self.engine.clamp_score(obtained_marks=10.0, total_marks=0.0)
        assert pct == 0.0
        assert score == 10.0

    def test_feat_06_04_score_bounds_negative_duration(self):
        records = [{"duration_seconds": -500}]
        res = self.engine.assert_numeric_range(records, "duration_seconds", 0.0, None)
        assert res["passed"] is False

    def test_feat_06_05_score_bounds_valid_exact_extremes(self):
        records = [{"percentage": 0.0}, {"percentage": 100.0}]
        res = self.engine.assert_numeric_range(records, "percentage", 0.0, 100.0)
        assert res["passed"] is True

    # -------------------------------------------------------------
    # FEAT-07: Anomaly Profiler: Enum & String Drift Audit
    # -------------------------------------------------------------
    def test_feat_07_01_enum_drift_trailing_whitespace(self):
        records = [{"status": "COMPLETED "}]
        res = self.engine.assert_status_enum_domain(records, "status")
        assert res["passed"] is False

    def test_feat_07_02_enum_drift_lowercase_status(self):
        records = [{"status": "completed"}]
        res = self.engine.assert_status_enum_domain(records, "status")
        assert res["passed"] is False

    def test_feat_07_03_enum_drift_unauthorized_value(self):
        records = [{"status": "DELETED"}]
        res = self.engine.assert_status_enum_domain(records, "status")
        assert res["passed"] is False

    def test_feat_07_04_enum_drift_all_valid_domain_values(self):
        records = [{"status": s} for s in self.engine.VALID_STATUS_ENUMS]
        res = self.engine.assert_status_enum_domain(records, "status")
        assert res["passed"] is True

    def test_feat_07_05_enum_drift_null_status(self):
        records = [{"status": None}]
        res = self.engine.assert_status_enum_domain(records, "status")
        assert res["passed"] is False

    # -------------------------------------------------------------
    # FEAT-08: Anomaly Profiler: Array Element Null & Whitespace
    # -------------------------------------------------------------
    def test_feat_08_01_array_null_element_detection(self):
        records = [{"options": ["A", None, "B"]}]
        res = self.engine.assert_array_validity(records, "options")
        assert res["passed"] is False

    def test_feat_08_02_array_whitespace_element_detection(self):
        records = [{"options": ["  Option A  ", "Option B"]}]
        res = self.engine.assert_array_validity(records, "options")
        assert res["passed"] is False

    def test_feat_08_03_array_empty_string_detection(self):
        records = [{"options": ["Option A", ""]}]
        res = self.engine.assert_array_validity(records, "options")
        assert res["passed"] is False

    def test_feat_08_04_array_valid_clean_array(self):
        records = [{"options": ["Option A", "Option B", "Option C"]}]
        res = self.engine.assert_array_validity(records, "options")
        assert res["passed"] is True

    def test_feat_08_05_array_empty_list(self):
        records = [{"options": []}]
        res = self.engine.assert_array_validity(records, "options")
        assert res["passed"] is True

    # -------------------------------------------------------------
    # FEAT-09: Bronze Staging & Schema Declarations
    # -------------------------------------------------------------
    def test_feat_09_01_bronze_schema_clean_ingestion(self):
        pristine = self.generator.generate_pristine_dataset(num_users=5, num_quizzes=2, num_attempts=5)
        silver = self.engine.clean_bronze_to_silver(pristine)
        assert "stg_assessment_attempts" in silver
        assert len(silver["stg_assessment_attempts"]) == 5

    def test_feat_09_02_bronze_schema_required_columns(self):
        pristine = self.generator.generate_pristine_dataset(num_users=2, num_quizzes=1, num_attempts=2)
        silver = self.engine.clean_bronze_to_silver(pristine)
        att = silver["stg_assessment_attempts"][0]
        for col in ["attempt_id", "user_id", "quiz_version_id", "status", "started_at_utc"]:
            assert col in att

    def test_feat_09_03_bronze_schema_type_casting(self):
        raw = {"assessment_attempts": [{
            "id": "att_1", "user_id": "u_1", "score": "50.5", "total_marks": "100.0", "status": "COMPLETED"
        }]}
        silver = self.engine.clean_bronze_to_silver(raw)
        att = silver["stg_assessment_attempts"][0]
        assert isinstance(att["score"], float)
        assert isinstance(att["percentage"], float)

    def test_feat_09_04_bronze_schema_empty_input(self):
        silver = self.engine.clean_bronze_to_silver({})
        assert silver["stg_assessment_attempts"] == []

    def test_feat_09_05_bronze_schema_table_metadata(self):
        pristine = self.generator.generate_pristine_dataset(num_users=1, num_quizzes=1, num_attempts=1)
        silver = self.engine.clean_bronze_to_silver(pristine)
        assert "dim_users" in silver
        assert "dim_quizzes" in silver
        assert "stg_question_responses" in silver

    # -------------------------------------------------------------
    # FEAT-10: Robust JSON Safe Parsing & Safe Accessors
    # -------------------------------------------------------------
    def test_feat_10_01_safe_parse_json_valid(self):
        res = self.engine.safe_parse_json('{"a": 10, "b": "test"}')
        assert res == {"a": 10, "b": "test"}

    def test_feat_10_02_safe_parse_json_malformed_returns_none(self):
        res = self.engine.safe_parse_json('{"a": 10,')
        assert res is None

    def test_feat_10_03_json_value_scalar_extraction(self):
        json_str = '{"user": {"profile": {"name": "Alice"}}}'
        val = self.engine.json_value(json_str, "$.user.profile.name")
        assert val == "Alice"

    def test_feat_10_04_json_query_structure_extraction(self):
        json_str = '{"user": {"profile": {"name": "Alice"}}}'
        val = self.engine.json_query(json_str, "$.user.profile")
        assert val == {"name": "Alice"}

    def test_feat_10_05_json_query_array_extraction(self):
        json_str = '{"items": [1, 2, 3]}'
        val = self.engine.json_query_array(json_str, "$.items")
        assert val == [1, 2, 3]

    # -------------------------------------------------------------
    # FEAT-11: Case-Preserving Array Sanitization
    # -------------------------------------------------------------
    def test_feat_11_01_array_null_filtering(self):
        arr = ["A", None, "B", None]
        cleaned = self.engine.sanitize_array(arr)
        assert cleaned == ["A", "B"]

    def test_feat_11_02_array_whitespace_trimming(self):
        arr = ["  Option A  ", " Option B "]
        cleaned = self.engine.sanitize_array(arr)
        assert cleaned == ["Option A", "Option B"]

    def test_feat_11_03_array_deduplication_preserving_case(self):
        arr = ["Option A", "option a", "Option A", "Option B"]
        cleaned = self.engine.sanitize_array(arr)
        assert cleaned == ["Option A", "option a", "Option B"]

    def test_feat_11_04_array_empty_elements_dropped(self):
        arr = ["", "   ", "Valid Option", ""]
        cleaned = self.engine.sanitize_array(arr)
        assert cleaned == ["Valid Option"]

    def test_feat_11_05_array_special_characters_preserved(self):
        arr = ["α-Helix", "β-Sheet", "π ≈ 3.14159"]
        cleaned = self.engine.sanitize_array(arr)
        assert cleaned == ["α-Helix", "β-Sheet", "π ≈ 3.14159"]

    # -------------------------------------------------------------
    # FEAT-12: Universal ISO UTC Timestamp Normalization
    # -------------------------------------------------------------
    def test_feat_12_01_utc_zulu_timestamp(self):
        res = self.engine.parse_timestamp_utc("2026-08-18T10:00:00Z")
        assert res == "2026-08-18T10:00:00Z"

    def test_feat_12_02_positive_offset_ist(self):
        res = self.engine.parse_timestamp_utc("2026-08-18T15:30:00+05:30")
        assert res == "2026-08-18T10:00:00Z"

    def test_feat_12_03_negative_offset_edt(self):
        res = self.engine.parse_timestamp_utc("2026-08-18T06:00:00-04:00")
        assert res == "2026-08-18T10:00:00Z"

    def test_feat_12_04_epoch_milliseconds(self):
        res = self.engine.parse_timestamp_utc("1755511200000")
        assert res is not None
        assert res.endswith("Z")

    def test_feat_12_05_invalid_timestamp_returns_none(self):
        assert self.engine.parse_timestamp_utc("INVALID") is None

    # -------------------------------------------------------------
    # FEAT-13: Idempotent Deduplication Engine
    # -------------------------------------------------------------
    def test_feat_13_01_deduplicate_keeps_freshest_updated_at(self):
        records = [
            {"id": "1", "updated_at": "2026-01-01T10:00:00Z", "val": "old"},
            {"id": "1", "updated_at": "2026-01-01T10:05:00Z", "val": "new"}
        ]
        res = self.engine.deduplicate_records(records, pk_field="id")
        assert len(res) == 1
        assert res[0]["val"] == "new"

    def test_feat_13_02_deduplicate_tie_break_created_at(self):
        records = [
            {"id": "1", "updated_at": "2026-01-01T10:00:00Z", "created_at": "2026-01-01T09:00:00Z", "val": "first"},
            {"id": "1", "updated_at": "2026-01-01T10:00:00Z", "created_at": "2026-01-01T09:05:00Z", "val": "second"}
        ]
        res = self.engine.deduplicate_records(records, pk_field="id")
        assert len(res) == 1
        assert res[0]["val"] == "second"

    def test_feat_13_03_deduplicate_preserves_unique_records(self):
        records = [{"id": f"u_{i}", "val": i} for i in range(50)]
        res = self.engine.deduplicate_records(records, pk_field="id")
        assert len(res) == 50

    def test_feat_13_04_deduplicate_empty_input(self):
        assert self.engine.deduplicate_records([]) == []

    def test_feat_13_05_deduplicate_identical_clones(self):
        rec = {"id": "1", "v": 10}
        records = [rec, copy.deepcopy(rec), copy.deepcopy(rec)]
        res = self.engine.deduplicate_records(records, pk_field="id")
        assert len(res) == 1

    # -------------------------------------------------------------
    # FEAT-14: Score Bounds Clamping & Metric Logic
    # -------------------------------------------------------------
    def test_feat_14_01_clamp_negative_score_to_zero(self):
        score, pct, dur = self.engine.clamp_score(obtained_marks=-15.0, total_marks=100.0)
        assert score == 0.0
        assert pct == 0.0

    def test_feat_14_02_clamp_score_exceeding_100_percent(self):
        score, pct, dur = self.engine.clamp_score(obtained_marks=150.0, total_marks=100.0)
        assert score == 150.0
        assert pct == 100.0

    def test_feat_14_03_clamp_total_marks_zero_division_guard(self):
        score, pct, dur = self.engine.clamp_score(obtained_marks=0.0, total_marks=0.0)
        assert pct == 0.0

    def test_feat_14_04_clamp_standard_score(self):
        score, pct, dur = self.engine.clamp_score(obtained_marks=75.0, total_marks=100.0, duration_seconds=300)
        assert score == 75.0
        assert pct == 75.0
        assert dur == 300

    def test_feat_14_05_clamp_rounding_precision(self):
        score, pct, dur = self.engine.clamp_score(obtained_marks=79.19999999999999, total_marks=100.0)
        assert pct == 79.20

    # -------------------------------------------------------------
    # FEAT-15: Status Enum Normalization & Casting
    # -------------------------------------------------------------
    def test_feat_15_01_normalize_status_trim_and_upper(self):
        assert self.engine.normalize_status_enum(" completed ") == "COMPLETED"

    def test_feat_15_02_normalize_status_in_progress(self):
        assert self.engine.normalize_status_enum("in_progress") == "IN_PROGRESS"

    def test_feat_15_03_normalize_status_invalid_to_unknown(self):
        assert self.engine.normalize_status_enum("DELETED_STATUS") == "UNKNOWN"

    def test_feat_15_04_normalize_status_all_seven_enums(self):
        for s in ["CREATED", "IN_PROGRESS", "SUBMITTING", "COMPLETED", "EXPIRED", "CANCELLED", "ABANDONED"]:
            assert self.engine.normalize_status_enum(s.lower()) == s

    def test_feat_15_05_normalize_status_null_input(self):
        assert self.engine.normalize_status_enum(None) == "UNKNOWN"

    # -------------------------------------------------------------
    # FEAT-16: Referential Integrity & Quarantine Strategy
    # -------------------------------------------------------------
    def test_feat_16_01_quarantine_valid_attempts_routed_to_gold(self):
        users = [{"id": "u1"}]
        attempts = [{"id": "a1", "user_id": "u1", "status": "COMPLETED", "score": 10.0, "total_marks": 10.0}]
        silver = self.engine.clean_bronze_to_silver({"users": users, "assessment_attempts": attempts})
        gold_out = self.engine.materialize_silver_to_gold(silver)
        assert len(gold_out["gold"]["fct_assessment_attempts"]) == 1
        assert len(gold_out["quarantine"]["quarantine_orphaned_attempts"]) == 0

    def test_feat_16_02_quarantine_orphaned_attempts_isolated(self):
        users = [{"id": "u1"}]
        attempts = [{"id": "a1", "user_id": "missing_user", "status": "COMPLETED", "score": 10.0, "total_marks": 10.0}]
        silver = self.engine.clean_bronze_to_silver({"users": users, "assessment_attempts": attempts})
        gold_out = self.engine.materialize_silver_to_gold(silver)
        assert len(gold_out["gold"]["fct_assessment_attempts"]) == 0
        assert len(gold_out["quarantine"]["quarantine_orphaned_attempts"]) == 1

    def test_feat_16_03_quarantine_null_pk_isolated(self):
        users = [{"id": "u1"}]
        attempts = [{"id": None, "user_id": "u1", "status": "COMPLETED"}]
        silver = self.engine.clean_bronze_to_silver({"users": users, "assessment_attempts": attempts})
        gold_out = self.engine.materialize_silver_to_gold(silver)
        assert len(gold_out["gold"]["fct_assessment_attempts"]) == 0
        assert len(gold_out["quarantine"]["quarantine_orphaned_attempts"]) == 1

    def test_feat_16_04_quarantine_reason_metadata(self):
        users = [{"id": "u1"}]
        attempts = [{"id": "a1", "user_id": "missing", "status": "COMPLETED"}]
        silver = self.engine.clean_bronze_to_silver({"users": users, "assessment_attempts": attempts})
        gold_out = self.engine.materialize_silver_to_gold(silver)
        q_rec = gold_out["quarantine"]["quarantine_orphaned_attempts"][0]
        assert "quarantine_reason" in q_rec

    def test_feat_16_05_quarantine_split_verification(self):
        users = [{"id": "u1"}, {"id": "u2"}]
        attempts = [
            {"id": "a1", "user_id": "u1", "status": "COMPLETED"},
            {"id": "a2", "user_id": "u_bad", "status": "COMPLETED"},
            {"id": "a3", "user_id": "u2", "status": "COMPLETED"}
        ]
        silver = self.engine.clean_bronze_to_silver({"users": users, "assessment_attempts": attempts})
        gold_out = self.engine.materialize_silver_to_gold(silver)
        assert len(gold_out["gold"]["fct_assessment_attempts"]) == 2
        assert len(gold_out["quarantine"]["quarantine_orphaned_attempts"]) == 1

    # -------------------------------------------------------------
    # FEAT-17: Gold Analytical Marts (Fact & Dim Models)
    # -------------------------------------------------------------
    def test_feat_17_01_gold_fct_assessment_attempts_schema(self):
        pristine = self.generator.generate_pristine_dataset(num_users=2, num_quizzes=1, num_attempts=2)
        res = self.engine.run_full_pipeline(pristine)
        fct = res["gold"]["fct_assessment_attempts"][0]
        for key in ["attempt_id", "user_id", "status", "started_at_utc", "percentage", "passed"]:
            assert key in fct

    def test_feat_17_02_gold_fct_question_responses_schema(self):
        pristine = self.generator.generate_pristine_dataset(num_users=2, num_quizzes=1, num_attempts=2)
        res = self.engine.run_full_pipeline(pristine)
        fct = res["gold"]["fct_question_responses"][0]
        for key in ["response_id", "attempt_id", "question_id", "selected_option_ids", "is_correct"]:
            assert key in fct

    def test_feat_17_03_gold_dim_users_schema(self):
        pristine = self.generator.generate_pristine_dataset(num_users=2, num_quizzes=1, num_attempts=1)
        res = self.engine.run_full_pipeline(pristine)
        assert len(res["gold"]["dim_users"]) == 2

    def test_feat_17_04_gold_dim_quizzes_schema(self):
        pristine = self.generator.generate_pristine_dataset(num_users=2, num_quizzes=3, num_attempts=1)
        res = self.engine.run_full_pipeline(pristine)
        assert len(res["gold"]["dim_quizzes"]) == 3

    def test_feat_17_05_gold_fct_certificates_schema(self):
        pristine = self.generator.generate_pristine_dataset(num_users=5, num_quizzes=1, num_attempts=10)
        res = self.engine.run_full_pipeline(pristine)
        assert "fct_certificates" in res["gold"]

    # -------------------------------------------------------------
    # FEAT-18: Assertion: Primary Key Uniqueness & Non-Null
    # -------------------------------------------------------------
    def test_feat_18_01_assert_pk_unique_passes_on_clean(self):
        records = [{"attempt_id": "a1"}, {"attempt_id": "a2"}]
        res = self.engine.assert_pk_unique_not_null(records, "attempt_id")
        assert res["passed"] is True

    def test_feat_18_02_assert_pk_unique_fails_on_null(self):
        records = [{"attempt_id": None}, {"attempt_id": "a2"}]
        res = self.engine.assert_pk_unique_not_null(records, "attempt_id")
        assert res["passed"] is False

    def test_feat_18_03_assert_pk_unique_fails_on_duplicate(self):
        records = [{"attempt_id": "a1"}, {"attempt_id": "a1"}]
        res = self.engine.assert_pk_unique_not_null(records, "attempt_id")
        assert res["passed"] is False

    def test_feat_18_04_assert_pk_unique_fails_on_empty_string(self):
        records = [{"attempt_id": ""}, {"attempt_id": "a2"}]
        res = self.engine.assert_pk_unique_not_null(records, "attempt_id")
        assert res["passed"] is False

    def test_feat_18_05_assert_pk_unique_empty_table(self):
        res = self.engine.assert_pk_unique_not_null([], "attempt_id")
        assert res["passed"] is True

    # -------------------------------------------------------------
    # FEAT-19: Assertion: Referential Integrity Constraints
    # -------------------------------------------------------------
    def test_feat_19_01_assert_fk_passes_valid(self):
        parents = [{"id": "u1"}]
        children = [{"user_id": "u1"}]
        res = self.engine.assert_referential_integrity(children, "user_id", parents, "id")
        assert res["passed"] is True

    def test_feat_19_02_assert_fk_fails_missing_parent(self):
        parents = [{"id": "u1"}]
        children = [{"user_id": "u2"}]
        res = self.engine.assert_referential_integrity(children, "user_id", parents, "id")
        assert res["passed"] is False

    def test_feat_19_03_assert_fk_multiple_violations(self):
        parents = [{"id": "u1"}]
        children = [{"user_id": "u2"}, {"user_id": "u3"}]
        res = self.engine.assert_referential_integrity(children, "user_id", parents, "id")
        assert res["violations_count"] == 2

    def test_feat_19_04_assert_fk_ignores_none_child(self):
        parents = [{"id": "u1"}]
        children = [{"user_id": None}]
        res = self.engine.assert_referential_integrity(children, "user_id", parents, "id")
        assert res["passed"] is True

    def test_feat_19_05_assert_fk_custom_pk_field(self):
        parents = [{"user_code": "u1"}]
        children = [{"user_id": "u1"}]
        res = self.engine.assert_referential_integrity(children, "user_id", parents, "user_code")
        assert res["passed"] is True

    # -------------------------------------------------------------
    # FEAT-20: Assertion: Numeric Range Bounds
    # -------------------------------------------------------------
    def test_feat_20_01_assert_range_passes_in_bounds(self):
        records = [{"pct": 0.0}, {"pct": 50.0}, {"pct": 100.0}]
        res = self.engine.assert_numeric_range(records, "pct", 0.0, 100.0)
        assert res["passed"] is True

    def test_feat_20_02_assert_range_fails_negative(self):
        records = [{"pct": -1.0}]
        res = self.engine.assert_numeric_range(records, "pct", 0.0, 100.0)
        assert res["passed"] is False

    def test_feat_20_03_assert_range_fails_exceeding_max(self):
        records = [{"pct": 100.1}]
        res = self.engine.assert_numeric_range(records, "pct", 0.0, 100.0)
        assert res["passed"] is False

    def test_feat_20_04_assert_range_non_numeric_type(self):
        records = [{"pct": "not_a_number"}]
        res = self.engine.assert_numeric_range(records, "pct", 0.0, 100.0)
        assert res["passed"] is False

    def test_feat_20_05_assert_range_duration_non_negative(self):
        records = [{"duration": 0}, {"duration": 1200}]
        res = self.engine.assert_numeric_range(records, "duration", 0.0, None)
        assert res["passed"] is True

    # -------------------------------------------------------------
    # FEAT-21: Assertion: Status Enum Domain Conformance
    # -------------------------------------------------------------
    def test_feat_21_01_assert_enum_passes_valid_status(self):
        records = [{"status": "COMPLETED"}, {"status": "IN_PROGRESS"}]
        res = self.engine.assert_status_enum_domain(records, "status")
        assert res["passed"] is True

    def test_feat_21_02_assert_enum_fails_unauthorized_value(self):
        records = [{"status": "ARCHIVED"}]
        res = self.engine.assert_status_enum_domain(records, "status")
        assert res["passed"] is False

    def test_feat_21_03_assert_enum_fails_lowercase(self):
        records = [{"status": "completed"}]
        res = self.engine.assert_status_enum_domain(records, "status")
        assert res["passed"] is False

    def test_feat_21_04_assert_enum_fails_whitespace(self):
        records = [{"status": " COMPLETED "}]
        res = self.engine.assert_status_enum_domain(records, "status")
        assert res["passed"] is False

    def test_feat_21_05_assert_enum_custom_domain_set(self):
        records = [{"role": "ADMIN"}, {"role": "STUDENT"}]
        res = self.engine.assert_status_enum_domain(records, "role", allowed_values={"ADMIN", "STUDENT", "INSTRUCTOR"})
        assert res["passed"] is True

    # -------------------------------------------------------------
    # FEAT-22: Assertion: Timestamp Monotonicity & Validity
    # -------------------------------------------------------------
    def test_feat_22_01_assert_monotonic_passes_valid(self):
        records = [{
            "started_at_utc": "2026-08-18T10:00:00Z",
            "submitted_at_utc": "2026-08-18T10:30:00Z"
        }]
        res = self.engine.assert_timestamps_monotonic(records, "started_at_utc", "submitted_at_utc")
        assert res["passed"] is True

    def test_feat_22_02_assert_monotonic_fails_inversion(self):
        records = [{
            "started_at_utc": "2026-08-18T10:30:00Z",
            "submitted_at_utc": "2026-08-18T10:00:00Z"
        }]
        res = self.engine.assert_timestamps_monotonic(records, "started_at_utc", "submitted_at_utc")
        assert res["passed"] is False

    def test_feat_22_03_assert_monotonic_equal_timestamps(self):
        records = [{
            "started_at_utc": "2026-08-18T10:00:00Z",
            "submitted_at_utc": "2026-08-18T10:00:00Z"
        }]
        res = self.engine.assert_timestamps_monotonic(records, "started_at_utc", "submitted_at_utc")
        assert res["passed"] is True

    def test_feat_22_04_assert_monotonic_null_end_allowed(self):
        records = [{
            "started_at_utc": "2026-08-18T10:00:00Z",
            "submitted_at_utc": None
        }]
        res = self.engine.assert_timestamps_monotonic(records, "started_at_utc", "submitted_at_utc")
        assert res["passed"] is True

    def test_feat_22_05_assert_monotonic_invalid_format(self):
        records = [{
            "started_at_utc": "BAD_DATE",
            "submitted_at_utc": "2026-08-18T10:00:00Z"
        }]
        res = self.engine.assert_timestamps_monotonic(records, "started_at_utc", "submitted_at_utc")
        assert res["passed"] is False

    # -------------------------------------------------------------
    # FEAT-23: Assertion: Question Snapshot & Array Integrity
    # -------------------------------------------------------------
    def test_feat_23_01_assert_array_passes_clean(self):
        records = [{"opts": ["opt_1", "opt_2"]}]
        res = self.engine.assert_array_validity(records, "opts")
        assert res["passed"] is True

    def test_feat_23_02_assert_array_fails_null_element(self):
        records = [{"opts": ["opt_1", None]}]
        res = self.engine.assert_array_validity(records, "opts")
        assert res["passed"] is False

    def test_feat_23_03_assert_array_fails_untrimmed_element(self):
        records = [{"opts": ["opt_1", " opt_2 "]}]
        res = self.engine.assert_array_validity(records, "opts")
        assert res["passed"] is False

    def test_feat_23_04_assert_json_validity_passes_valid(self):
        records = [{"snapshot": '{"text": "Q1", "marks": 10}'}]
        res = self.engine.assert_json_validity(records, "snapshot")
        assert res["passed"] is True

    def test_feat_23_05_assert_json_validity_fails_corrupt(self):
        records = [{"snapshot": '{"text": "Q1", '}]
        res = self.engine.assert_json_validity(records, "snapshot")
        assert res["passed"] is False

    # -------------------------------------------------------------
    # FEAT-24: Automated Assertion Suite Runner & Reporter
    # -------------------------------------------------------------
    def test_feat_24_01_assertion_suite_runs_all_on_clean_gold(self):
        pristine = self.generator.generate_pristine_dataset(num_users=5, num_quizzes=2, num_attempts=5)
        res = self.engine.run_full_pipeline(pristine)
        assertions = self.engine.run_all_assertions(res["gold"])
        assert assertions["all_passed"] is True
        assert assertions["failed_count"] == 0

    def test_feat_24_02_assertion_suite_catches_corrupted_gold(self):
        pristine = self.generator.generate_pristine_dataset(num_users=2, num_quizzes=1, num_attempts=2)
        res = self.engine.run_full_pipeline(pristine)
        res["gold"]["fct_assessment_attempts"][0]["percentage"] = 150.0
        assertions = self.engine.run_all_assertions(res["gold"])
        assert assertions["all_passed"] is False
        assert assertions["failed_count"] > 0

    def test_feat_24_03_assertion_suite_structured_details(self):
        pristine = self.generator.generate_pristine_dataset(num_users=2, num_quizzes=1, num_attempts=2)
        res = self.engine.run_full_pipeline(pristine)
        assertions = self.engine.run_all_assertions(res["gold"])
        assert "details" in assertions
        assert len(assertions["details"]) == assertions["total_assertions"]

    def test_feat_24_04_assertion_suite_certificate_invariant(self):
        certs = [{"attempt_id": "a1"}]
        attempts = [{"attempt_id": "a1", "passed": False}]
        res = self.engine.assert_certificate_invariant(certs, attempts)
        assert res["passed"] is False

    def test_feat_24_05_assertion_suite_certificate_valid(self):
        certs = [{"attempt_id": "a1"}]
        attempts = [{"attempt_id": "a1", "passed": True}]
        res = self.engine.assert_certificate_invariant(certs, attempts)
        assert res["passed"] is True

    # -------------------------------------------------------------
    # FEAT-25: Dataplex Profiling Scans & YAML Rules
    # -------------------------------------------------------------
    def test_feat_25_01_dataplex_profile_computation(self):
        records = [
            {"score": 10.0, "user_id": "u1"},
            {"score": 20.0, "user_id": "u2"},
            {"score": 30.0, "user_id": "u1"}
        ]
        profile = self.engine.profile_table(records)
        assert profile["columns"]["score"]["mean"] == 20.0
        assert profile["columns"]["user_id"]["distinct_count"] == 2

    def test_feat_25_02_dataplex_min_max_metrics(self):
        records = [{"score": 5.0}, {"score": 95.0}]
        profile = self.engine.profile_table(records)
        assert profile["columns"]["score"]["min_value"] == 5.0
        assert profile["columns"]["score"]["max_value"] == 95.0

    def test_feat_25_03_dataplex_null_ratio_precision(self):
        records = [{"val": 1}, {"val": None}, {"val": 3}, {"val": None}]
        profile = self.engine.profile_table(records)
        assert profile["columns"]["val"]["null_ratio"] == 0.5

    def test_feat_25_04_dataplex_distinct_ratio_precision(self):
        records = [{"k": "a"}, {"k": "a"}, {"k": "b"}, {"k": "b"}]
        profile = self.engine.profile_table(records)
        assert profile["columns"]["k"]["distinct_ratio"] == 0.5

    def test_feat_25_05_dataplex_empty_record_profile(self):
        profile = self.engine.profile_table([])
        assert profile["row_count"] == 0

    # -------------------------------------------------------------
    # FEAT-26: Comparative Pre/Post Transformation Profiler
    # -------------------------------------------------------------
    def test_feat_26_01_null_drift_zero_drift_passes(self):
        base = {"columns": {"user_id": {"null_ratio": 0.0}}}
        post = {"columns": {"user_id": {"null_ratio": 0.0}}}
        res = self.engine.evaluate_null_drift(base, post, ["user_id"])
        assert res["overall_drift_pass"] is True
        assert res["column_drift"]["user_id"]["drift_percentage_points"] == 0.0

    def test_feat_26_02_null_drift_under_one_percent_passes(self):
        base = {"columns": {"user_id": {"null_ratio": 0.05}}}
        post = {"columns": {"user_id": {"null_ratio": 0.058}}}
        res = self.engine.evaluate_null_drift(base, post, ["user_id"])
        assert res["overall_drift_pass"] is True

    def test_feat_26_03_null_drift_boundary_0_99_passes(self):
        base = {"columns": {"user_id": {"null_ratio": 0.0}}}
        post = {"columns": {"user_id": {"null_ratio": 0.0099}}}
        res = self.engine.evaluate_null_drift(base, post, ["user_id"])
        assert res["overall_drift_pass"] is True

    def test_feat_26_04_null_drift_over_one_percent_fails(self):
        base = {"columns": {"user_id": {"null_ratio": 0.0}}}
        post = {"columns": {"user_id": {"null_ratio": 0.015}}}
        res = self.engine.evaluate_null_drift(base, post, ["user_id"])
        assert res["overall_drift_pass"] is False

    def test_feat_26_05_null_drift_multi_column_evaluation(self):
        base = {"columns": {"a": {"null_ratio": 0.0}, "b": {"null_ratio": 0.0}}}
        post = {"columns": {"a": {"null_ratio": 0.005}, "b": {"null_ratio": 0.02}}}
        res = self.engine.evaluate_null_drift(base, post, ["a", "b"])
        assert res["overall_drift_pass"] is False
        assert res["column_drift"]["a"]["passed"] is True
        assert res["column_drift"]["b"]["passed"] is False

    # -------------------------------------------------------------
    # FEAT-27: 100% Defect Remediation Audit
    # -------------------------------------------------------------
    def test_feat_27_01_remediation_perfect_clean_data(self):
        pristine = self.generator.generate_pristine_dataset(num_users=2, num_quizzes=1, num_attempts=2)
        res = self.engine.run_full_pipeline(pristine)
        eval_res = self.engine.evaluate_defect_remediation([], res["gold"])
        assert eval_res["is_100_percent_remediated"] is True
        assert eval_res["remediation_rate_pct"] == 100.0

    def test_feat_27_02_remediation_injected_defects_all_fixed(self):
        pristine = self.generator.generate_pristine_dataset(num_users=5, num_quizzes=2, num_attempts=10)
        dirty_out = self.generator.inject_defects(pristine, defect_rate=0.2)
        pipeline_res = self.engine.run_full_pipeline(dirty_out["raw_data"])
        eval_res = self.engine.evaluate_defect_remediation(dirty_out["injected_anomalies"], pipeline_res["gold"])
        assert eval_res["is_100_percent_remediated"] is True
        assert eval_res["remediation_rate_pct"] == 100.0

    def test_feat_27_03_remediation_detects_unresolved_defect(self):
        pristine = self.generator.generate_pristine_dataset(num_users=2, num_quizzes=1, num_attempts=2)
        pipeline_res = self.engine.run_full_pipeline(pristine)
        pipeline_res["gold"]["fct_assessment_attempts"][0]["status"] = "dirty_status"
        fake_anomaly = [{
            "defect_class": "DEF-07",
            "record_id": pipeline_res["gold"]["fct_assessment_attempts"][0]["attempt_id"],
            "column": "status"
        }]
        eval_res = self.engine.evaluate_defect_remediation(fake_anomaly, pipeline_res["gold"])
        assert eval_res["is_100_percent_remediated"] is False
        assert eval_res["unresolved_count"] == 1

    def test_feat_27_04_remediation_all_8_defect_classes(self):
        pristine = self.generator.generate_pristine_dataset(num_users=10, num_quizzes=2, num_attempts=20)
        dirty_out = self.generator.inject_defects(pristine, defect_types=[f"DEF-0{i}" for i in range(1, 9)], defect_rate=0.25)
        pipeline_res = self.engine.run_full_pipeline(dirty_out["raw_data"])
        eval_res = self.engine.evaluate_defect_remediation(dirty_out["injected_anomalies"], pipeline_res["gold"])
        assert eval_res["is_100_percent_remediated"] is True

    def test_feat_27_05_remediation_empty_anomalies(self):
        eval_res = self.engine.evaluate_defect_remediation([], {})
        assert eval_res["is_100_percent_remediated"] is True

    # -------------------------------------------------------------
    # FEAT-28: Data Dictionary & Transformation Documentation
    # -------------------------------------------------------------
    def test_feat_28_01_data_dictionary_contract_fields(self):
        pristine = self.generator.generate_pristine_dataset(num_users=2, num_quizzes=1, num_attempts=2)
        res = self.engine.run_full_pipeline(pristine)
        fct = res["gold"]["fct_assessment_attempts"][0]
        expected_fields = {"attempt_id", "user_id", "quiz_version_id", "status", "started_at_utc", "score", "percentage", "passed"}
        assert expected_fields.issubset(set(fct.keys()))

    def test_feat_28_02_data_dictionary_dim_users_contract(self):
        pristine = self.generator.generate_pristine_dataset(num_users=2, num_quizzes=1, num_attempts=1)
        res = self.engine.run_full_pipeline(pristine)
        dim_u = res["gold"]["dim_users"][0]
        assert {"id", "email", "username", "role"}.issubset(set(dim_u.keys()))

    def test_feat_28_03_data_dictionary_fct_responses_contract(self):
        pristine = self.generator.generate_pristine_dataset(num_users=2, num_quizzes=1, num_attempts=2)
        res = self.engine.run_full_pipeline(pristine)
        fct_r = res["gold"]["fct_question_responses"][0]
        assert {"response_id", "attempt_id", "question_id", "selected_option_ids"}.issubset(set(fct_r.keys()))

    def test_feat_28_04_data_dictionary_quarantine_schema(self):
        users = [{"id": "u1"}]
        attempts = [{"id": "a1", "user_id": "bad_user", "status": "COMPLETED"}]
        silver = self.engine.clean_bronze_to_silver({"users": users, "assessment_attempts": attempts})
        gold_out = self.engine.materialize_silver_to_gold(silver)
        q_item = gold_out["quarantine"]["quarantine_orphaned_attempts"][0]
        assert "quarantine_reason" in q_item

    def test_feat_28_05_data_dictionary_audit_events_schema(self):
        pristine = self.generator.generate_pristine_dataset(num_users=2, num_quizzes=1, num_attempts=2)
        res = self.engine.run_full_pipeline(pristine)
        audit = res["gold"]["fct_audit_events"][0]
        assert {"audit_id", "user_id", "action", "resource_type", "resource_id"}.issubset(set(audit.keys()))
