"""
Tier 2: Boundary Value Analysis & Corner Cases Test Suite.

Validates extreme values, edge conditions, format quirks, float precision limits,
corrupted inputs, and boundary thresholds across all features (140+ tests).
"""

import datetime
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


class TestTier2BoundariesCorners:
    """Tier 2: Boundary & Corner Cases Test Suite."""

    @pytest.fixture(autouse=True)
    def setup_engine(self):
        self.engine = PipelineEngine()
        self.generator = SyntheticDataGenerator(seed=200)

    def setup_method(self, method=None):
        self.engine = PipelineEngine()
        self.generator = SyntheticDataGenerator(seed=200)

    # =============================================================
    # 1. Null Drift Exact Threshold Boundaries (15 tests)
    # =============================================================
    def test_bva_drift_01_exact_zero_drift(self):
        base = {"columns": {"user_id": {"null_ratio": 0.0}}}
        post = {"columns": {"user_id": {"null_ratio": 0.0}}}
        res = self.engine.evaluate_null_drift(base, post, ["user_id"])
        assert res["overall_drift_pass"] is True
        assert res["column_drift"]["user_id"]["drift_percentage_points"] == 0.0

    def test_bva_drift_02_drift_0_1_pct(self):
        base = {"columns": {"c": {"null_ratio": 0.05}}}
        post = {"columns": {"c": {"null_ratio": 0.051}}}
        res = self.engine.evaluate_null_drift(base, post, ["c"])
        assert res["overall_drift_pass"] is True

    def test_bva_drift_03_drift_0_5_pct(self):
        base = {"columns": {"c": {"null_ratio": 0.10}}}
        post = {"columns": {"c": {"null_ratio": 0.105}}}
        res = self.engine.evaluate_null_drift(base, post, ["c"])
        assert res["overall_drift_pass"] is True

    def test_bva_drift_04_drift_0_8_pct(self):
        base = {"columns": {"c": {"null_ratio": 0.10}}}
        post = {"columns": {"c": {"null_ratio": 0.108}}}
        res = self.engine.evaluate_null_drift(base, post, ["c"])
        assert res["overall_drift_pass"] is True

    def test_bva_drift_05_drift_0_9_pct(self):
        base = {"columns": {"c": {"null_ratio": 0.10}}}
        post = {"columns": {"c": {"null_ratio": 0.109}}}
        res = self.engine.evaluate_null_drift(base, post, ["c"])
        assert res["overall_drift_pass"] is True

    def test_bva_drift_06_drift_0_99_pct(self):
        base = {"columns": {"c": {"null_ratio": 0.00}}}
        post = {"columns": {"c": {"null_ratio": 0.0099}}}
        res = self.engine.evaluate_null_drift(base, post, ["c"])
        assert res["overall_drift_pass"] is True

    def test_bva_drift_07_drift_0_999_pct(self):
        base = {"columns": {"c": {"null_ratio": 0.00}}}
        post = {"columns": {"c": {"null_ratio": 0.00999}}}
        res = self.engine.evaluate_null_drift(base, post, ["c"])
        assert res["overall_drift_pass"] is True

    def test_bva_drift_08_drift_exact_1_0_pct_boundary(self):
        base = {"columns": {"c": {"null_ratio": 0.00}}}
        post = {"columns": {"c": {"null_ratio": 0.010}}}
        res = self.engine.evaluate_null_drift(base, post, ["c"])
        assert res["overall_drift_pass"] is False

    def test_bva_drift_09_drift_1_001_pct_fails(self):
        base = {"columns": {"c": {"null_ratio": 0.00}}}
        post = {"columns": {"c": {"null_ratio": 0.01001}}}
        res = self.engine.evaluate_null_drift(base, post, ["c"])
        assert res["overall_drift_pass"] is False

    def test_bva_drift_10_drift_1_05_pct_fails(self):
        base = {"columns": {"c": {"null_ratio": 0.05}}}
        post = {"columns": {"c": {"null_ratio": 0.0605}}}
        res = self.engine.evaluate_null_drift(base, post, ["c"])
        assert res["overall_drift_pass"] is False

    def test_bva_drift_11_drift_1_5_pct_fails(self):
        base = {"columns": {"c": {"null_ratio": 0.00}}}
        post = {"columns": {"c": {"null_ratio": 0.015}}}
        res = self.engine.evaluate_null_drift(base, post, ["c"])
        assert res["overall_drift_pass"] is False

    def test_bva_drift_12_drift_5_0_pct_fails(self):
        base = {"columns": {"c": {"null_ratio": 0.00}}}
        post = {"columns": {"c": {"null_ratio": 0.050}}}
        res = self.engine.evaluate_null_drift(base, post, ["c"])
        assert res["overall_drift_pass"] is False

    def test_bva_drift_13_drift_50_0_pct_fails(self):
        base = {"columns": {"c": {"null_ratio": 0.00}}}
        post = {"columns": {"c": {"null_ratio": 0.50}}}
        res = self.engine.evaluate_null_drift(base, post, ["c"])
        assert res["overall_drift_pass"] is False

    def test_bva_drift_14_drift_100_0_pct_fails(self):
        base = {"columns": {"c": {"null_ratio": 0.00}}}
        post = {"columns": {"c": {"null_ratio": 1.00}}}
        res = self.engine.evaluate_null_drift(base, post, ["c"])
        assert res["overall_drift_pass"] is False

    def test_bva_drift_15_drift_negative_delta_pass(self):
        base = {"columns": {"c": {"null_ratio": 0.05}}}
        post = {"columns": {"c": {"null_ratio": 0.045}}}
        res = self.engine.evaluate_null_drift(base, post, ["c"])
        assert res["overall_drift_pass"] is True

    # =============================================================
    # 2. Array Sanitization Boundaries (20 tests)
    # =============================================================
    def test_bva_array_01_empty_list(self):
        assert self.engine.sanitize_array([]) == []

    def test_bva_array_02_none_input(self):
        assert self.engine.sanitize_array(None) == []

    def test_bva_array_03_single_null_element(self):
        assert self.engine.sanitize_array([None]) == []

    def test_bva_array_04_multiple_nulls(self):
        assert self.engine.sanitize_array([None, None, None, None]) == []

    def test_bva_array_05_whitespace_spaces_only(self):
        assert self.engine.sanitize_array([" ", "   ", "     "]) == []

    def test_bva_array_06_whitespace_tabs_newlines(self):
        assert self.engine.sanitize_array(["\t", "\n", "\r\n", "  \t\n  "]) == []

    def test_bva_array_07_mixed_casing_preserved(self):
        arr = ["Option A", "option a", "OPTION A"]
        assert self.engine.sanitize_array(arr) == ["Option A", "option a", "OPTION A"]

    def test_bva_array_08_duplicate_same_casing(self):
        arr = ["Option A", "Option A", "Option A"]
        assert self.engine.sanitize_array(arr) == ["Option A"]

    def test_bva_array_09_duplicate_untrimmed_same_casing(self):
        arr = ["Option A", "  Option A  ", "Option A\t"]
        assert self.engine.sanitize_array(arr) == ["Option A"]

    def test_bva_array_10_unicode_greek_letters(self):
        arr = ["Alpha α", "Beta β", "Gamma γ", "Delta δ"]
        assert self.engine.sanitize_array(arr) == ["Alpha α", "Beta β", "Gamma γ", "Delta δ"]

    def test_bva_array_11_unicode_emojis(self):
        arr = ["🔥 Fire Option", "⚡ Electric Option", "🔥 Fire Option"]
        assert self.engine.sanitize_array(arr) == ["🔥 Fire Option", "⚡ Electric Option"]

    def test_bva_array_12_unicode_math_formulas(self):
        arr = ["f(x) = x² + 2x + 1", "∫₀^∞ e^(-x) dx = 1", "O(n log n)"]
        assert self.engine.sanitize_array(arr) == ["f(x) = x² + 2x + 1", "∫₀^∞ e^(-x) dx = 1", "O(n log n)"]

    def test_bva_array_13_unicode_cjk_characters(self):
        arr = ["選択肢 A (Option A)", "選択肢 B (Option B)", "  選択肢 A (Option A)  "]
        assert self.engine.sanitize_array(arr) == ["選択肢 A (Option A)", "選択肢 B (Option B)"]

    def test_bva_array_14_single_element_array(self):
        assert self.engine.sanitize_array(["Unique"]) == ["Unique"]

    def test_bva_array_15_numeric_items_in_array(self):
        assert self.engine.sanitize_array([1, 2, 3, 1]) == ["1", "2", "3"]

    def test_bva_array_16_boolean_items_in_array(self):
        assert self.engine.sanitize_array([True, False, True]) == ["True", "False"]

    def test_bva_array_17_large_array_1000_items(self):
        large = [f"Option_{i}" for i in range(1000)]
        cleaned = self.engine.sanitize_array(large)
        assert len(cleaned) == 1000

    def test_bva_array_18_large_array_with_500_duplicates(self):
        arr = [f"Option_{i % 500}" for i in range(1000)]
        cleaned = self.engine.sanitize_array(arr)
        assert len(cleaned) == 500

    def test_bva_array_19_non_list_type_string(self):
        assert self.engine.sanitize_array("Not a list") == []

    def test_bva_array_20_non_list_type_dict(self):
        assert self.engine.sanitize_array({"a": 1}) == []

    # =============================================================
    # 3. Timestamp Normalization Extremes (25 tests)
    # =============================================================
    def test_bva_ts_01_epoch_zero(self):
        assert self.engine.parse_timestamp_utc("1970-01-01T00:00:00Z") == "1970-01-01T00:00:00Z"

    def test_bva_ts_02_epoch_zero_numeric(self):
        assert self.engine.parse_timestamp_utc(0) == "1970-01-01T00:00:00Z"

    def test_bva_ts_03_leap_year_2024_feb_29(self):
        assert self.engine.parse_timestamp_utc("2024-02-29T23:59:59Z") == "2024-02-29T23:59:59Z"

    def test_bva_ts_04_leap_year_2028_feb_29(self):
        assert self.engine.parse_timestamp_utc("2028-02-29T12:00:00Z") == "2028-02-29T12:00:00Z"

    def test_bva_ts_05_leap_year_2000_century(self):
        assert self.engine.parse_timestamp_utc("2000-02-29T10:00:00Z") == "2000-02-29T10:00:00Z"

    def test_bva_ts_06_non_leap_year_feb_29_invalid(self):
        assert self.engine.parse_timestamp_utc("2025-02-29T12:00:00Z") is None

    def test_bva_ts_07_year_2038_rollover(self):
        assert self.engine.parse_timestamp_utc("2038-01-19T03:14:07Z") == "2038-01-19T03:14:07Z"

    def test_bva_ts_08_year_2038_numeric(self):
        assert self.engine.parse_timestamp_utc(2147483647) == "2038-01-19T03:14:07Z"

    def test_bva_ts_09_far_future_2099(self):
        assert self.engine.parse_timestamp_utc("2099-12-31T23:59:59Z") == "2099-12-31T23:59:59Z"

    def test_bva_ts_10_extreme_positive_offset_14_hours(self):
        res = self.engine.parse_timestamp_utc("2026-08-18T14:00:00+14:00")
        assert res == "2026-08-18T00:00:00Z"

    def test_bva_ts_11_extreme_negative_offset_12_hours(self):
        res = self.engine.parse_timestamp_utc("2026-08-18T00:00:00-12:00")
        assert res == "2026-08-18T12:00:00Z"

    def test_bva_ts_12_fractional_seconds_micro(self):
        res = self.engine.parse_timestamp_utc("2026-08-18T10:00:00.123456Z")
        assert res == "2026-08-18T10:00:00Z"

    def test_bva_ts_13_fractional_seconds_milli(self):
        res = self.engine.parse_timestamp_utc("2026-08-18T10:00:00.500Z")
        assert res == "2026-08-18T10:00:00Z"

    def test_bva_ts_14_midnight_boundary(self):
        res = self.engine.parse_timestamp_utc("2026-08-18T00:00:00Z")
        assert res == "2026-08-18T00:00:00Z"

    def test_bva_ts_15_end_of_day_boundary(self):
        res = self.engine.parse_timestamp_utc("2026-08-18T23:59:59Z")
        assert res == "2026-08-18T23:59:59Z"

    def test_bva_ts_16_negative_epoch_invalid(self):
        assert self.engine.parse_timestamp_utc(-1000) is None

    def test_bva_ts_17_ultra_huge_epoch_invalid(self):
        assert self.engine.parse_timestamp_utc(999999999999999999) is None

    def test_bva_ts_18_slash_format_datetime(self):
        res = self.engine.parse_timestamp_utc("2026/08/18 15:38:27")
        assert res == "2026-08-18T15:38:27Z"

    def test_bva_ts_19_date_only_format(self):
        res = self.engine.parse_timestamp_utc("2026-08-18")
        assert res == "2026-08-18T00:00:00Z"

    def test_bva_ts_20_slash_date_only(self):
        res = self.engine.parse_timestamp_utc("2026/08/18")
        assert res == "2026-08-18T00:00:00Z"

    def test_bva_ts_21_space_format_with_offset(self):
        res = self.engine.parse_timestamp_utc("2026-08-18 21:08:27 +05:30")
        assert res == "2026-08-18T15:38:27Z"

    def test_bva_ts_22_empty_string(self):
        assert self.engine.parse_timestamp_utc("") is None

    def test_bva_ts_23_whitespace_string(self):
        assert self.engine.parse_timestamp_utc("   ") is None

    def test_bva_ts_24_non_string_type_list(self):
        assert self.engine.parse_timestamp_utc(["2026-08-18"]) is None

    def test_bva_ts_25_non_string_type_dict(self):
        assert self.engine.parse_timestamp_utc({"ts": "2026-08-18"}) is None

    # =============================================================
    # 4. Score Bounds & Arithmetic Extremes (25 tests)
    # =============================================================
    def test_bva_score_01_both_zero(self):
        s, p, d = self.engine.clamp_score(0.0, 0.0)
        assert s == 0.0 and p == 0.0

    def test_bva_score_02_zero_obtained_100_total(self):
        s, p, d = self.engine.clamp_score(0.0, 100.0)
        assert s == 0.0 and p == 0.0

    def test_bva_score_03_100_obtained_100_total(self):
        s, p, d = self.engine.clamp_score(100.0, 100.0)
        assert s == 100.0 and p == 100.0

    def test_bva_score_04_negative_tiny(self):
        s, p, d = self.engine.clamp_score(-0.0001, 100.0)
        assert s == 0.0 and p == 0.0

    def test_bva_score_05_negative_large(self):
        s, p, d = self.engine.clamp_score(-1000.0, 100.0)
        assert s == 0.0 and p == 0.0

    def test_bva_score_06_exceeding_tiny(self):
        s, p, d = self.engine.clamp_score(100.001, 100.0)
        assert s == 100.00 and p == 100.0

    def test_bva_score_07_exceeding_huge(self):
        s, p, d = self.engine.clamp_score(100000.0, 100.0)
        assert s == 100000.0 and p == 100.0

    def test_bva_score_08_fractional_marks_79_2(self):
        s, p, d = self.engine.clamp_score(79.19999999999999, 100.0)
        assert p == 79.20

    def test_bva_score_09_fractional_marks_one_third(self):
        s, p, d = self.engine.clamp_score(33.333333333333336, 100.0)
        assert p == 33.33

    def test_bva_score_10_fractional_marks_two_thirds(self):
        s, p, d = self.engine.clamp_score(66.66666666666667, 100.0)
        assert p == 66.67

    def test_bva_score_11_duration_zero(self):
        s, p, d = self.engine.clamp_score(50.0, 100.0, duration_seconds=0)
        assert d == 0

    def test_bva_score_12_duration_negative(self):
        s, p, d = self.engine.clamp_score(50.0, 100.0, duration_seconds=-500)
        assert d == 0

    def test_bva_score_13_duration_large(self):
        s, p, d = self.engine.clamp_score(50.0, 100.0, duration_seconds=86400)
        assert d == 86400

    def test_bva_score_14_obtained_as_string(self):
        s, p, d = self.engine.clamp_score("85.5", "100.0")
        assert s == 85.5 and p == 85.5

    def test_bva_score_15_obtained_as_invalid_string(self):
        s, p, d = self.engine.clamp_score("INVALID", "100.0")
        assert s == 0.0 and p == 0.0

    def test_bva_score_16_total_as_invalid_string(self):
        s, p, d = self.engine.clamp_score(50.0, "INVALID")
        assert p == 0.0

    def test_bva_score_17_duration_as_invalid_string(self):
        s, p, d = self.engine.clamp_score(50.0, 100.0, duration_seconds="INVALID")
        assert d == 0

    def test_bva_score_18_obtained_none(self):
        s, p, d = self.engine.clamp_score(None, 100.0)
        assert s == 0.0 and p == 0.0

    def test_bva_score_19_total_none(self):
        s, p, d = self.engine.clamp_score(50.0, None)
        assert p == 0.0

    def test_bva_score_20_duration_none(self):
        s, p, d = self.engine.clamp_score(50.0, 100.0, duration_seconds=None)
        assert d == 0

    def test_bva_score_21_negative_total_marks(self):
        s, p, d = self.engine.clamp_score(50.0, -100.0)
        assert p == 0.0

    def test_bva_score_22_total_marks_0_01(self):
        s, p, d = self.engine.clamp_score(0.005, 0.01)
        assert p == 50.0

    def test_bva_score_23_total_marks_1000(self):
        s, p, d = self.engine.clamp_score(750.0, 1000.0)
        assert p == 75.0

    def test_bva_score_24_both_none(self):
        s, p, d = self.engine.clamp_score(None, None, None)
        assert s == 0.0 and p == 0.0 and d == 0

    def test_bva_score_25_decimal_obtained_total(self):
        s, p, d = self.engine.clamp_score(12.34, 56.78)
        assert round(s, 2) == 12.34
        assert p == round((12.34 / 56.78) * 100.0, 2)

    # =============================================================
    # 5. JSON Parsing & Extraction Boundaries (20 tests)
    # =============================================================
    def test_bva_json_01_empty_string(self):
        assert self.engine.safe_parse_json("") is None

    def test_bva_json_02_spaces_only(self):
        assert self.engine.safe_parse_json("   ") is None

    def test_bva_json_03_none_input(self):
        assert self.engine.safe_parse_json(None) is None

    def test_bva_json_04_literal_null(self):
        assert self.engine.safe_parse_json("null") is None

    def test_bva_json_05_literal_true(self):
        assert self.engine.safe_parse_json("true") is True

    def test_bva_json_06_literal_false(self):
        assert self.engine.safe_parse_json("false") is False

    def test_bva_json_07_literal_number(self):
        assert self.engine.safe_parse_json("12345") == 12345

    def test_bva_json_08_empty_object(self):
        assert self.engine.safe_parse_json("{}") == {}

    def test_bva_json_09_empty_array(self):
        assert self.engine.safe_parse_json("[]") == []

    def test_bva_json_10_deep_nested_structure(self):
        deep = {"a": {"b": {"c": {"d": {"e": 42}}}}}
        raw = json.dumps(deep)
        val = self.engine.json_value(raw, "$.a.b.c.d.e")
        assert val == "42"

    def test_bva_json_11_missing_key_in_path(self):
        raw = json.dumps({"a": {"b": 1}})
        assert self.engine.json_value(raw, "$.a.non_existent") is None

    def test_bva_json_12_double_escaped_json_string(self):
        double_esc = '"{\\"sub\\": \\"val\\"}"'
        parsed = self.engine.safe_parse_json(double_esc)
        assert parsed == {"sub": "val"}

    def test_bva_json_13_unclosed_brace(self):
        assert self.engine.safe_parse_json('{"key": "value"') is None

    def test_bva_json_14_unclosed_bracket(self):
        assert self.engine.safe_parse_json('{"key": [1, 2') is None

    def test_bva_json_15_trailing_comma(self):
        assert self.engine.safe_parse_json('{"key": "value",}') is None

    def test_bva_json_16_single_quotes_json(self):
        assert self.engine.safe_parse_json("{'key': 'value'}") is None

    def test_bva_json_17_unicode_keys_and_values(self):
        payload = {"질문": "파이썬이란?", "답변": "프로그래밍 언어"}
        raw = json.dumps(payload)
        parsed = self.engine.safe_parse_json(raw)
        assert parsed["질문"] == "파이썬이란?"

    def test_bva_json_18_json_query_array_returns_none_for_object(self):
        raw = json.dumps({"a": {"b": 1}})
        assert self.engine.json_query_array(raw, "$.a") is None

    def test_bva_json_19_json_query_array_valid_array(self):
        raw = json.dumps({"a": [1, 2, 3]})
        assert self.engine.json_query_array(raw, "$.a") == [1, 2, 3]

    def test_bva_json_20_already_parsed_dict(self):
        obj = {"a": 1}
        assert self.engine.safe_parse_json(obj) == {"a": 1}

    # =============================================================
    # 6. Deduplication Extremes & Collisions (15 tests)
    # =============================================================
    def test_bva_dedup_01_empty_list(self):
        assert self.engine.deduplicate_records([]) == []

    def test_bva_dedup_02_single_item(self):
        rec = [{"id": "1", "updated_at": "2026-01-01T00:00:00Z"}]
        assert self.engine.deduplicate_records(rec) == rec

    def test_bva_dedup_03_100_identical_records(self):
        recs = [{"id": "1", "updated_at": "2026-01-01T00:00:00Z", "val": i} for i in range(100)]
        deduped = self.engine.deduplicate_records(recs, pk_field="id")
        assert len(deduped) == 1

    def test_bva_dedup_04_differing_created_at_tie_breaker(self):
        recs = [
            {"id": "1", "updated_at": "2026-01-01T00:00:00Z", "created_at": "2026-01-01T00:00:00Z", "v": 1},
            {"id": "1", "updated_at": "2026-01-01T00:00:00Z", "created_at": "2026-01-01T00:01:00Z", "v": 2}
        ]
        deduped = self.engine.deduplicate_records(recs, pk_field="id")
        assert len(deduped) == 1
        assert deduped[0]["v"] == 2

    def test_bva_dedup_05_differing_id_string_tie_breaker(self):
        recs = [
            {"pk": "1", "id": "a", "updated_at": "2026-01-01T00:00:00Z"},
            {"pk": "1", "id": "z", "updated_at": "2026-01-01T00:00:00Z"}
        ]
        deduped = self.engine.deduplicate_records(recs, pk_field="pk", order_by_fields=["updated_at", "id"])
        assert len(deduped) == 1
        assert deduped[0]["id"] == "z"

    def test_bva_dedup_06_none_pk_grouped_together(self):
        recs = [
            {"id": None, "updated_at": "2026-01-01T00:00:00Z", "v": 1},
            {"id": None, "updated_at": "2026-01-01T00:05:00Z", "v": 2}
        ]
        deduped = self.engine.deduplicate_records(recs, pk_field="id")
        assert len(deduped) == 1
        assert deduped[0]["v"] == 2

    def test_bva_dedup_07_none_updated_at_handled(self):
        recs = [
            {"id": "1", "updated_at": None, "v": 1},
            {"id": "1", "updated_at": "2026-01-01T00:00:00Z", "v": 2}
        ]
        deduped = self.engine.deduplicate_records(recs, pk_field="id")
        assert len(deduped) == 1
        assert deduped[0]["v"] == 2

    def test_bva_dedup_08_both_none_updated_at(self):
        recs = [
            {"id": "1", "updated_at": None, "created_at": "2026-01-01T00:00:00Z", "v": 1},
            {"id": "1", "updated_at": None, "created_at": "2026-01-01T00:05:00Z", "v": 2}
        ]
        deduped = self.engine.deduplicate_records(recs, pk_field="id")
        assert len(deduped) == 1
        assert deduped[0]["v"] == 2

    def test_bva_dedup_09_multiple_distinct_pks(self):
        recs = [{"id": str(i), "updated_at": "2026-01-01T00:00:00Z"} for i in range(200)]
        deduped = self.engine.deduplicate_records(recs, pk_field="id")
        assert len(deduped) == 200

    def test_bva_dedup_10_interleaved_duplicates(self):
        recs = [
            {"id": "1", "updated_at": "2026-01-01T00:00:00Z", "v": 1},
            {"id": "2", "updated_at": "2026-01-01T00:00:00Z", "v": 1},
            {"id": "1", "updated_at": "2026-01-01T00:10:00Z", "v": 2},
            {"id": "2", "updated_at": "2026-01-01T00:05:00Z", "v": 2}
        ]
        deduped = self.engine.deduplicate_records(recs, pk_field="id")
        assert len(deduped) == 2
        d_map = {r["id"]: r["v"] for r in deduped}
        assert d_map["1"] == 2
        assert d_map["2"] == 2

    def test_bva_dedup_11_all_identical_no_updated_at(self):
        recs = [{"id": "1", "val": "x"}, {"id": "1", "val": "x"}]
        deduped = self.engine.deduplicate_records(recs, pk_field="id")
        assert len(deduped) == 1

    def test_bva_dedup_12_numeric_pks(self):
        recs = [{"id": 100, "updated_at": "2026-01-01T00:00:00Z"}, {"id": 100, "updated_at": "2026-01-02T00:00:00Z"}]
        deduped = self.engine.deduplicate_records(recs, pk_field="id")
        assert len(deduped) == 1

    def test_bva_dedup_13_mixed_type_pks(self):
        recs = [{"id": "100", "v": 1}, {"id": 100, "v": 2}]
        deduped = self.engine.deduplicate_records(recs, pk_field="id")
        assert len(deduped) == 2

    def test_bva_dedup_14_large_scale_dedup_10000_to_1000(self):
        recs = [{"id": str(i % 1000), "updated_at": f"2026-01-01T{i%24:02d}:00:00Z"} for i in range(10000)]
        deduped = self.engine.deduplicate_records(recs, pk_field="id")
        assert len(deduped) == 1000

    def test_bva_dedup_15_custom_order_by_single_field(self):
        recs = [{"id": "a", "seq": 1}, {"id": "a", "seq": 99}]
        deduped = self.engine.deduplicate_records(recs, pk_field="id", order_by_fields=["seq"])
        assert len(deduped) == 1
        assert deduped[0]["seq"] == 99

    # =============================================================
    # 7. Referential Integrity & Quarantine Boundaries (15 tests)
    # =============================================================
    def test_bva_ri_01_empty_parent_and_child(self):
        res = self.engine.assert_referential_integrity([], "user_id", [], "id")
        assert res["passed"] is True

    def test_bva_ri_02_empty_parent_non_empty_child(self):
        res = self.engine.assert_referential_integrity([{"user_id": "u1"}], "user_id", [], "id")
        assert res["passed"] is False
        assert res["violations_count"] == 1

    def test_bva_ri_03_non_empty_parent_empty_child(self):
        res = self.engine.assert_referential_integrity([], "user_id", [{"id": "u1"}], "id")
        assert res["passed"] is True

    def test_bva_ri_04_parent_has_null_id(self):
        parents = [{"id": None}, {"id": "u1"}]
        children = [{"user_id": "u1"}]
        res = self.engine.assert_referential_integrity(children, "user_id", parents, "id")
        assert res["passed"] is True

    def test_bva_ri_05_child_has_none_fk(self):
        parents = [{"id": "u1"}]
        children = [{"user_id": None}]
        res = self.engine.assert_referential_integrity(children, "user_id", parents, "id")
        assert res["passed"] is True

    def test_bva_ri_06_uuid_casing_sensitivity(self):
        parents = [{"id": "UUID-ABC-123"}]
        children = [{"user_id": "uuid-abc-123"}]
        res = self.engine.assert_referential_integrity(children, "user_id", parents, "id")
        assert res["passed"] is False

    def test_bva_ri_07_all_children_orphaned(self):
        parents = [{"id": "u1"}]
        children = [{"user_id": f"orphan_{i}"} for i in range(50)]
        res = self.engine.assert_referential_integrity(children, "user_id", parents, "id")
        assert res["passed"] is False
        assert res["violations_count"] == 50

    def test_bva_ri_08_all_children_valid(self):
        parents = [{"id": f"u_{i}"} for i in range(50)]
        children = [{"user_id": f"u_{i}"} for i in range(50)]
        res = self.engine.assert_referential_integrity(children, "user_id", parents, "id")
        assert res["passed"] is True

    def test_bva_ri_09_quarantine_isolation_100_percent(self):
        silver = {
            "dim_users": [{"id": "u1"}],
            "stg_assessment_attempts": [{"attempt_id": f"a_{i}", "user_id": f"orphan_{i}"} for i in range(20)]
        }
        gold_out = self.engine.materialize_silver_to_gold(silver)
        assert len(gold_out["gold"]["fct_assessment_attempts"]) == 0
        assert len(gold_out["quarantine"]["quarantine_orphaned_attempts"]) == 20

    def test_bva_ri_10_quarantine_isolation_zero_percent(self):
        silver = {
            "dim_users": [{"id": f"u_{i}"} for i in range(20)],
            "stg_assessment_attempts": [{"attempt_id": f"a_{i}", "user_id": f"u_{i}", "status": "COMPLETED"} for i in range(20)]
        }
        gold_out = self.engine.materialize_silver_to_gold(silver)
        assert len(gold_out["gold"]["fct_assessment_attempts"]) == 20
        assert len(gold_out["quarantine"]["quarantine_orphaned_attempts"]) == 0

    def test_bva_ri_11_null_attempt_id_quarantined(self):
        silver = {
            "dim_users": [{"id": "u1"}],
            "stg_assessment_attempts": [{"attempt_id": None, "user_id": "u1"}]
        }
        gold_out = self.engine.materialize_silver_to_gold(silver)
        assert len(gold_out["gold"]["fct_assessment_attempts"]) == 0
        assert len(gold_out["quarantine"]["quarantine_orphaned_attempts"]) == 1

    def test_bva_ri_12_empty_attempt_id_quarantined(self):
        silver = {
            "dim_users": [{"id": "u1"}],
            "stg_assessment_attempts": [{"attempt_id": "", "user_id": "u1"}]
        }
        gold_out = self.engine.materialize_silver_to_gold(silver)
        assert len(gold_out["gold"]["fct_assessment_attempts"]) == 0
        assert len(gold_out["quarantine"]["quarantine_orphaned_attempts"]) == 1

    def test_bva_ri_13_multiple_parent_lookups(self):
        parents = [{"id": f"u_{i}"} for i in range(1000)]
        children = [{"user_id": f"u_{i % 1000}"} for i in range(5000)]
        res = self.engine.assert_referential_integrity(children, "user_id", parents, "id")
        assert res["passed"] is True

    def test_bva_ri_14_missing_parent_at_boundary(self):
        parents = [{"id": f"u_{i}"} for i in range(10)]
        children = [{"user_id": "u_9"}, {"user_id": "u_10"}]
        res = self.engine.assert_referential_integrity(children, "user_id", parents, "id")
        assert res["passed"] is False
        assert res["violations_count"] == 1

    def test_bva_ri_15_non_string_parent_id(self):
        parents = [{"id": 1}, {"id": 2}]
        children = [{"user_id": 1}]
        res = self.engine.assert_referential_integrity(children, "user_id", parents, "id")
        assert res["passed"] is True

    # =============================================================
    # 8. Enum Domain & String Extremes (15 tests)
    # =============================================================
    def test_bva_enum_01_created_mixed_casing(self):
        assert self.engine.normalize_status_enum("cReAtEd") == "CREATED"

    def test_bva_enum_02_in_progress_mixed_casing(self):
        assert self.engine.normalize_status_enum("In_PrOgReSs") == "IN_PROGRESS"

    def test_bva_enum_03_submitting_mixed_casing(self):
        assert self.engine.normalize_status_enum("Submitting") == "SUBMITTING"

    def test_bva_enum_04_completed_mixed_casing(self):
        assert self.engine.normalize_status_enum("Completed") == "COMPLETED"

    def test_bva_enum_05_expired_mixed_casing(self):
        assert self.engine.normalize_status_enum("ExPiReD") == "EXPIRED"

    def test_bva_enum_06_cancelled_mixed_casing(self):
        assert self.engine.normalize_status_enum("Cancelled") == "CANCELLED"

    def test_bva_enum_07_abandoned_mixed_casing(self):
        assert self.engine.normalize_status_enum("Abandoned") == "ABANDONED"

    def test_bva_enum_08_tabs_and_newlines_wrapped(self):
        assert self.engine.normalize_status_enum("\tCOMPLETED\n") == "COMPLETED"

    def test_bva_enum_09_carriage_return_wrapped(self):
        assert self.engine.normalize_status_enum("\r\nIN_PROGRESS\r\n") == "IN_PROGRESS"

    def test_bva_enum_10_unknown_arbitrary_string(self):
        assert self.engine.normalize_status_enum("SOME_RANDOM_STATE") == "UNKNOWN"

    def test_bva_enum_11_empty_string(self):
        assert self.engine.normalize_status_enum("") == "UNKNOWN"

    def test_bva_enum_12_spaces_only(self):
        assert self.engine.normalize_status_enum("     ") == "UNKNOWN"

    def test_bva_enum_13_numeric_status(self):
        assert self.engine.normalize_status_enum(123) == "UNKNOWN"

    def test_bva_enum_14_boolean_status(self):
        assert self.engine.normalize_status_enum(True) == "UNKNOWN"

    def test_bva_enum_15_none_status(self):
        assert self.engine.normalize_status_enum(None) == "UNKNOWN"

    # =============================================================
    # 9. Monotonicity & Chronology Extremes (15 tests)
    # =============================================================
    def test_bva_mono_01_exact_millisecond_equal(self):
        recs = [{"s": "2026-08-18T10:00:00Z", "e": "2026-08-18T10:00:00Z"}]
        res = self.engine.assert_timestamps_monotonic(recs, "s", "e")
        assert res["passed"] is True

    def test_bva_mono_02_one_second_after(self):
        recs = [{"s": "2026-08-18T10:00:00Z", "e": "2026-08-18T10:00:01Z"}]
        res = self.engine.assert_timestamps_monotonic(recs, "s", "e")
        assert res["passed"] is True

    def test_bva_mono_03_one_second_before(self):
        recs = [{"s": "2026-08-18T10:00:01Z", "e": "2026-08-18T10:00:00Z"}]
        res = self.engine.assert_timestamps_monotonic(recs, "s", "e")
        assert res["passed"] is False

    def test_bva_mono_04_one_microsecond_before(self):
        recs = [{"s": "2026-08-18T10:00:00.000002Z", "e": "2026-08-18T10:00:00.000001Z"}]
        res = self.engine.assert_timestamps_monotonic(recs, "s", "e")
        assert res["passed"] is False

    def test_bva_mono_05_cross_day_boundary(self):
        recs = [{"s": "2026-08-18T23:59:59Z", "e": "2026-08-19T00:00:01Z"}]
        res = self.engine.assert_timestamps_monotonic(recs, "s", "e")
        assert res["passed"] is True

    def test_bva_mono_06_cross_month_boundary(self):
        recs = [{"s": "2026-08-31T23:59:59Z", "e": "2026-09-01T00:00:00Z"}]
        res = self.engine.assert_timestamps_monotonic(recs, "s", "e")
        assert res["passed"] is True

    def test_bva_mono_07_cross_year_boundary(self):
        recs = [{"s": "2026-12-31T23:59:59Z", "e": "2027-01-01T00:00:00Z"}]
        res = self.engine.assert_timestamps_monotonic(recs, "s", "e")
        assert res["passed"] is True

    def test_bva_mono_08_both_none(self):
        recs = [{"s": None, "e": None}]
        res = self.engine.assert_timestamps_monotonic(recs, "s", "e")
        assert res["passed"] is True

    def test_bva_mono_09_start_none_end_present(self):
        recs = [{"s": None, "e": "2026-08-18T10:00:00Z"}]
        res = self.engine.assert_timestamps_monotonic(recs, "s", "e")
        assert res["passed"] is True

    def test_bva_mono_10_start_present_end_none(self):
        recs = [{"s": "2026-08-18T10:00:00Z", "e": None}]
        res = self.engine.assert_timestamps_monotonic(recs, "s", "e")
        assert res["passed"] is True

    def test_bva_mono_11_multiple_records_all_valid(self):
        recs = [
            {"s": f"2026-08-18T{i:02d}:00:00Z", "e": f"2026-08-18T{i:02d}:30:00Z"}
            for i in range(24)
        ]
        res = self.engine.assert_timestamps_monotonic(recs, "s", "e")
        assert res["passed"] is True

    def test_bva_mono_12_multiple_records_one_inversion(self):
        recs = [
            {"s": "2026-08-18T10:00:00Z", "e": "2026-08-18T10:30:00Z"},
            {"s": "2026-08-18T11:00:00Z", "e": "2026-08-18T10:45:00Z"}
        ]
        res = self.engine.assert_timestamps_monotonic(recs, "s", "e")
        assert res["passed"] is False
        assert res["violations_count"] == 1

    def test_bva_mono_13_corrupted_start_string(self):
        recs = [{"s": "NOT_A_DATE", "e": "2026-08-18T10:00:00Z"}]
        res = self.engine.assert_timestamps_monotonic(recs, "s", "e")
        assert res["passed"] is False

    def test_bva_mono_14_corrupted_end_string(self):
        recs = [{"s": "2026-08-18T10:00:00Z", "e": "NOT_A_DATE"}]
        res = self.engine.assert_timestamps_monotonic(recs, "s", "e")
        assert res["passed"] is False

    def test_bva_mono_15_empty_table(self):
        res = self.engine.assert_timestamps_monotonic([], "s", "e")
        assert res["passed"] is True
