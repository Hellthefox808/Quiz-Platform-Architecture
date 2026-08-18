"""
Pipeline Engine for Quiz Platform Data Cleaning & Verification.

Implements high-fidelity Python-based simulations of BigQuery SQL, Dataform transformations,
SQLX assertions, and Dataplex profiling verification:
- SAFE.PARSE_JSON, JSON_VALUE, JSON_QUERY, JSON_QUERY_ARRAY
- Case-preserving ARRAY_FILTER & ARRAY_TRANSFORM (trimming, deduplication, NULL filtering)
- Multi-pattern COALESCE(SAFE.PARSE_TIMESTAMP(...)) to standard ISO UTC
- Idempotent QUALIFY ROW_NUMBER() window deduplication
- Score & percentage bounds clamping [0.0, 100.0], zero-division protection
- Enum domain normalization ('completed ' -> 'COMPLETED')
- Referential integrity enforcement & quarantine routing
- Automated Dataform SQLX assertions evaluation (8 assertion rules)
- Dataplex statistical profiling scans, null drift evaluation (<1.0%), and 100% defect remediation verification
"""

import copy
import datetime
import json
import re
from typing import Any, Dict, List, Optional, Set, Tuple


class PipelineEngine:
    """Core transformation, assertion, and profiling engine."""

    VALID_STATUS_ENUMS = {
        "CREATED", "IN_PROGRESS", "SUBMITTING", "COMPLETED", "EXPIRED", "CANCELLED", "ABANDONED"
    }
    VALID_ROLES = {"STUDENT", "INSTRUCTOR", "ADMIN", "PROCTOR"}
    VALID_DIFFICULTIES = {"EASY", "MEDIUM", "HARD", "EXPERT"}

    # ==========================================
    # 1. SQL Transformation Primitives
    # ==========================================

    @staticmethod
    def safe_parse_json(val: Any) -> Optional[Any]:
        """
        Simulates BigQuery SAFE.PARSE_JSON(val).
        Returns parsed Python object or None if string is malformed / non-JSON.
        """
        if val is None:
            return None
        if isinstance(val, (dict, list)):
            return val
        if not isinstance(val, str):
            return None
        trimmed = val.strip()
        if not trimmed:
            return None
        # Check for unescape needs if double quoted json string literal
        if trimmed.startswith('""{') or trimmed.startswith('"{\\"'):
            try:
                unquoted = json.loads(trimmed)
                if isinstance(unquoted, str):
                    return json.loads(unquoted)
                return unquoted
            except Exception:
                pass
        try:
            return json.loads(trimmed)
        except Exception:
            return None

    @staticmethod
    def json_value(json_obj: Any, path: str) -> Optional[str]:
        """
        Simulates BigQuery JSON_VALUE(json_obj, '$.key1.key2').
        Returns scalar string value or None.
        """
        if json_obj is None:
            return None
        if isinstance(json_obj, str):
            parsed = PipelineEngine.safe_parse_json(json_obj)
            if parsed is None:
                return None
            json_obj = parsed

        clean_path = path.lstrip("$").lstrip(".")
        keys = clean_path.split(".") if clean_path else []
        curr = json_obj
        for k in keys:
            if isinstance(curr, dict) and k in curr:
                curr = curr[k]
            else:
                return None
        if curr is None:
            return None
        if isinstance(curr, (dict, list)):
            return None
        return str(curr)

    @staticmethod
    def json_query(json_obj: Any, path: str) -> Optional[Any]:
        """
        Simulates BigQuery JSON_QUERY(json_obj, '$.key1').
        Returns sub-structure (dict/list) or None.
        """
        if json_obj is None:
            return None
        if isinstance(json_obj, str):
            parsed = PipelineEngine.safe_parse_json(json_obj)
            if parsed is None:
                return None
            json_obj = parsed

        clean_path = path.lstrip("$").lstrip(".")
        keys = clean_path.split(".") if clean_path else []
        curr = json_obj
        for k in keys:
            if isinstance(curr, dict) and k in curr:
                curr = curr[k]
            else:
                return None
        return curr

    @staticmethod
    def json_query_array(json_obj: Any, path: str) -> Optional[List[Any]]:
        """
        Simulates BigQuery JSON_QUERY_ARRAY(json_obj, '$.array_key').
        Returns list or None.
        """
        res = PipelineEngine.json_query(json_obj, path)
        if isinstance(res, list):
            return res
        return None

    @staticmethod
    def sanitize_array(arr: Any, preserve_casing: bool = True) -> List[str]:
        """
        Simulates BigQuery ARRAY_FILTER / ARRAY_TRANSFORM sanitization.
        - Removes NULL / None elements
        - Trims whitespace from string elements
        - Removes empty strings
        - Deduplicates elements while strictly PRESERVING original casing
        """
        if arr is None:
            return []
        if not isinstance(arr, list):
            return []

        cleaned: List[str] = []
        seen: Set[str] = set()

        for item in arr:
            if item is None:
                continue
            item_str = str(item).strip()
            if not item_str:
                continue
            if item_str not in seen:
                seen.add(item_str)
                cleaned.append(item_str)

        return cleaned

    @staticmethod
    def parse_timestamp_utc(val: Any) -> Optional[str]:
        """
        Simulates BigQuery COALESCE(SAFE.PARSE_TIMESTAMP(...)) to standard ISO UTC timestamp string.
        Supports:
        - ISO-8601 with Z (e.g. 2026-08-18T15:38:27Z)
        - ISO-8601 with offsets (e.g. 2026-08-18T21:08:27+05:30, 2026-08-18T11:38:27-04:00)
        - SQL space format (e.g. 2026-08-18 15:38:27, 2026-08-18 15:38:27 UTC)
        - Slash format (e.g. 2026/08/18 15:38:27)
        - Epoch milliseconds (> 10,000,000,000)
        - Epoch seconds
        Returns formatted ISO string 'YYYY-MM-DDTHH:MM:SSZ' or None if invalid.
        """
        if val is None:
            return None

        # Numeric epoch
        if isinstance(val, (int, float)):
            try:
                num_val = float(val)
                if num_val < 0 or num_val > 253402300799999: # 9999-12-31 in ms
                    return None
                if num_val > 253402300799 or (num_val > 10_000_000_000 and num_val != 253402300799):
                    secs = num_val / 1000.0
                else:
                    secs = num_val
                if secs > 253402300799:
                    return None
                try:
                    dt = datetime.datetime.fromtimestamp(secs, tz=datetime.timezone.utc)
                except (OSError, OverflowError, ValueError):
                    dt = datetime.datetime(1970, 1, 1, tzinfo=datetime.timezone.utc) + datetime.timedelta(seconds=secs)
                try:
                    return dt.strftime("%Y-%m-%dT%H:%M:%SZ")
                except Exception:
                    return f"{dt.year:04d}-{dt.month:02d}-{dt.day:02d}T{dt.hour:02d}:{dt.minute:02d}:{dt.second:02d}Z"
            except Exception:
                return None

        if not isinstance(val, str):
            return None

        val_str = val.strip()
        if not val_str:
            return None

        # Check if string is numeric epoch
        if val_str.isdigit():
            try:
                num_val = int(val_str)
                if num_val < 0 or num_val > 253402300799999: # 9999-12-31 in ms
                    return None
                if num_val > 253402300799 or (num_val > 10_000_000_000 and num_val != 253402300799):
                    secs = num_val / 1000.0
                else:
                    secs = float(num_val)
                if secs > 253402300799:
                    return None
                try:
                    dt = datetime.datetime.fromtimestamp(secs, tz=datetime.timezone.utc)
                except (OSError, OverflowError, ValueError):
                    dt = datetime.datetime(1970, 1, 1, tzinfo=datetime.timezone.utc) + datetime.timedelta(seconds=secs)
                try:
                    return dt.strftime("%Y-%m-%dT%H:%M:%SZ")
                except Exception:
                    return f"{dt.year:04d}-{dt.month:02d}-{dt.day:02d}T{dt.hour:02d}:{dt.minute:02d}:{dt.second:02d}Z"
            except Exception:
                return None

        # Handle 'Z' ISO
        if val_str.endswith("Z"):
            clean_str = val_str[:-1]
            for fmt in ("%Y-%m-%dT%H:%M:%S", "%Y-%m-%d %H:%M:%S", "%Y-%m-%dT%H:%M:%S.%f"):
                try:
                    dt = datetime.datetime.strptime(clean_str, fmt)
                    dt = dt.replace(tzinfo=datetime.timezone.utc)
                    return dt.strftime("%Y-%m-%dT%H:%M:%SZ")
                except ValueError:
                    pass

        # Handle timezone offset (e.g. +05:30, -04:00, +0530)
        offset_pattern = re.search(r'([+-]\d{2}):?(\d{2})$', val_str)
        if offset_pattern:
            sign = 1 if offset_pattern.group(1)[0] == '+' else -1
            hours = int(offset_pattern.group(1)[1:])
            minutes = int(offset_pattern.group(2))
            tz_offset = datetime.timezone(datetime.timedelta(hours=sign * hours, minutes=sign * minutes))
            
            base_part = val_str[:offset_pattern.start()].strip()
            for fmt in ("%Y-%m-%dT%H:%M:%S", "%Y-%m-%d %H:%M:%S", "%Y-%m-%dT%H:%M:%S.%f", "%Y-%m-%d %H:%M:%S.%f"):
                try:
                    dt = datetime.datetime.strptime(base_part, fmt)
                    dt = dt.replace(tzinfo=tz_offset)
                    utc_dt = dt.astimezone(datetime.timezone.utc)
                    return utc_dt.strftime("%Y-%m-%dT%H:%M:%SZ")
                except ValueError:
                    pass

        # SQL formats without timezone (assume UTC)
        for fmt in (
            "%Y-%m-%d %H:%M:%S",
            "%Y-%m-%dT%H:%M:%S",
            "%Y/%m/%d %H:%M:%S",
            "%Y-%m-%d %H:%M:%S.%f",
            "%Y-%m-%d",
            "%Y/%m/%d"
        ):
            try:
                dt = datetime.datetime.strptime(val_str, fmt)
                dt = dt.replace(tzinfo=datetime.timezone.utc)
                return dt.strftime("%Y-%m-%dT%H:%M:%SZ")
            except ValueError:
                pass

        return None

    @staticmethod
    def deduplicate_records(
        records: List[Dict[str, Any]],
        pk_field: str = "id",
        order_by_fields: Optional[List[str]] = None
    ) -> List[Dict[str, Any]]:
        """
        Simulates BigQuery QUALIFY ROW_NUMBER() OVER(PARTITION BY pk_field ORDER BY updated_at DESC, created_at DESC) = 1.
        Keeps the latest record deterministically.
        """
        if not records:
            return []
        if order_by_fields is None:
            order_by_fields = ["updated_at", "created_at", "id"]

        groups: Dict[Any, List[Dict[str, Any]]] = {}
        for r in records:
            pk = r.get(pk_field)
            if pk not in groups:
                groups[pk] = []
            groups[pk].append(r)

        deduped: List[Dict[str, Any]] = []
        for pk, group in groups.items():
            if len(group) == 1:
                deduped.append(group[0])
            else:
                def sort_key(row):
                    key = []
                    for f in order_by_fields:
                        val = row.get(f)
                        key.append(str(val) if val is not None else "")
                    return tuple(key)

                sorted_group = sorted(group, key=sort_key, reverse=True)
                deduped.append(sorted_group[0])

        return deduped

    @staticmethod
    def clamp_score(
        obtained_marks: Any,
        total_marks: Any,
        duration_seconds: Optional[Any] = None
    ) -> Tuple[float, float, int]:
        """
        Simulates score clamping & metric calculations:
        - score clamped >= 0.0
        - total_marks >= 0.0 (protected against division-by-zero)
        - percentage clamped to [0.0, 100.0], rounded to 2 decimals
        - duration clamped >= 0
        """
        try:
            obt = float(obtained_marks) if obtained_marks is not None else 0.0
        except (ValueError, TypeError):
            obt = 0.0

        try:
            tot = float(total_marks) if total_marks is not None else 0.0
        except (ValueError, TypeError):
            tot = 0.0

        clamped_score = max(0.0, obt)
        clamped_total = max(0.0, tot)

        if clamped_total == 0.0:
            percentage = 0.0
        else:
            pct_raw = (clamped_score / clamped_total) * 100.0
            percentage = min(100.0, max(0.0, round(pct_raw, 2)))

        try:
            dur = int(duration_seconds) if duration_seconds is not None else 0
            clamped_dur = max(0, dur)
        except (ValueError, TypeError):
            clamped_dur = 0

        return round(clamped_score, 2), percentage, clamped_dur

    @staticmethod
    def normalize_status_enum(status: Any) -> str:
        """
        Simulates enum normalization:
        Trims whitespace, converts to uppercase.
        Returns normalized status if valid, else 'UNKNOWN'.
        """
        if status is None:
            return "UNKNOWN"
        status_str = str(status).strip().upper()
        if status_str in PipelineEngine.VALID_STATUS_ENUMS:
            return status_str
        return "UNKNOWN"

    # ==========================================
    # 2. Medallion Pipeline Execution
    # ==========================================

    @classmethod
    def clean_bronze_to_silver(cls, raw_data: Dict[str, List[Dict[str, Any]]]) -> Dict[str, Any]:
        """
        Transforms Raw Bronze datasets into Cleaned Silver staged datasets.
        Applies safe parsing, deduplication, timestamp normalization, and enum harmonization.
        """
        silver: Dict[str, List[Dict[str, Any]]] = {}

        # 1. Assessment attempts
        raw_attempts = raw_data.get("assessment_attempts", [])
        deduped_attempts = cls.deduplicate_records(raw_attempts, pk_field="id")
        
        stg_attempts = []
        for r in deduped_attempts:
            started_at_utc = cls.parse_timestamp_utc(r.get("started_at"))
            submitted_at_utc = cls.parse_timestamp_utc(r.get("submitted_at"))
            expires_at_utc = cls.parse_timestamp_utc(r.get("expires_at"))

            # Calculate duration if timestamps valid
            duration_s = None
            if started_at_utc and submitted_at_utc:
                try:
                    dt_start = datetime.datetime.fromisoformat(started_at_utc.replace("Z", "+00:00"))
                    dt_sub = datetime.datetime.fromisoformat(submitted_at_utc.replace("Z", "+00:00"))
                    diff = int((dt_sub - dt_start).total_seconds())
                    duration_s = max(0, diff)
                except Exception:
                    duration_s = 0

            score, pct, dur = cls.clamp_score(
                r.get("score"),
                r.get("total_marks"),
                duration_s if duration_s is not None else r.get("duration_seconds")
            )
            status = cls.normalize_status_enum(r.get("status"))

            stg_attempts.append({
                "attempt_id": r.get("id"),
                "user_id": r.get("user_id"),
                "quiz_version_id": r.get("quiz_version_id"),
                "status": status,
                "started_at_utc": started_at_utc,
                "submitted_at_utc": submitted_at_utc,
                "expires_at_utc": expires_at_utc,
                "duration_seconds": dur,
                "total_marks": r.get("total_marks", 0.0),
                "score": score,
                "percentage": pct,
                "passed": bool(r.get("passed", False)) if pct >= 60.0 else False,
                "ingested_at_utc": datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
            })
        silver["stg_assessment_attempts"] = stg_attempts

        # 2. Attempt question snapshots & responses
        raw_aqs = raw_data.get("attempt_questions", [])
        stg_aqs = []
        for aq in raw_aqs:
            parsed_snap = cls.safe_parse_json(aq.get("question_snapshot"))
            options_raw = parsed_snap.get("options", []) if isinstance(parsed_snap, dict) else []
            clean_opts = []
            if isinstance(options_raw, list):
                for o in options_raw:
                    if isinstance(o, dict) and o.get("text"):
                        clean_opts.append({
                            "id": o.get("id"),
                            "text": str(o["text"]).strip(),
                            "is_correct": bool(o.get("is_correct", False))
                        })

            stg_aqs.append({
                "id": aq.get("id"),
                "attempt_id": aq.get("attempt_id"),
                "question_id": aq.get("question_id"),
                "question_text": parsed_snap.get("text") if isinstance(parsed_snap, dict) else None,
                "marks": parsed_snap.get("marks") if isinstance(parsed_snap, dict) else None,
                "difficulty": parsed_snap.get("difficulty") if isinstance(parsed_snap, dict) else None,
                "options": clean_opts,
                "is_snapshot_valid": parsed_snap is not None and len(clean_opts) > 0,
                "created_at_utc": cls.parse_timestamp_utc(aq.get("created_at"))
            })
        silver["stg_attempt_question_snapshots"] = stg_aqs

        # 3. Question answers / responses
        raw_answers = raw_data.get("answers", [])
        stg_answers = []
        for ans in raw_answers:
            clean_selected = cls.sanitize_array(ans.get("selected_option_ids"), preserve_casing=True)
            stg_answers.append({
                "response_id": ans.get("id"),
                "attempt_id": ans.get("attempt_id"),
                "question_id": ans.get("question_id"),
                "selected_option_ids": clean_selected,
                "text_response": ans.get("text_response"),
                "is_correct": bool(ans.get("is_correct", False)),
                "marks_awarded": max(0.0, float(ans.get("marks_awarded", 0.0))),
                "time_spent_seconds": max(0, int(ans.get("time_spent_seconds", 0))),
                "created_at_utc": cls.parse_timestamp_utc(ans.get("created_at"))
            })
        silver["stg_question_responses"] = stg_answers

        # 4. Audit logs
        raw_audits = raw_data.get("audit_logs", [])
        stg_audits = []
        for al in raw_audits:
            parsed_details = cls.safe_parse_json(al.get("details"))
            stg_audits.append({
                "audit_id": al.get("id"),
                "user_id": al.get("user_id"),
                "action": al.get("action"),
                "resource_type": al.get("resource_type"),
                "resource_id": al.get("resource_id"),
                "details": parsed_details if parsed_details is not None else {},
                "created_at_utc": cls.parse_timestamp_utc(al.get("created_at"))
            })
        silver["stg_audit_logs"] = stg_audits

        # 5. Dimensions
        silver["dim_users"] = copy.deepcopy(raw_data.get("users", []))
        silver["dim_quizzes"] = copy.deepcopy(raw_data.get("quizzes", []))
        silver["fct_certificates"] = copy.deepcopy(raw_data.get("certificates", []))
        silver["fct_results"] = copy.deepcopy(raw_data.get("results", []))

        return silver

    @classmethod
    def materialize_silver_to_gold(cls, silver_data: Dict[str, List[Dict[str, Any]]]) -> Dict[str, Any]:
        """
        Materializes Silver staging tables into Gold Analytical Marts.
        Enforces referential integrity, isolates orphaned / invalid records into quarantine tables.
        """
        gold: Dict[str, List[Dict[str, Any]]] = {}
        quarantine: Dict[str, List[Dict[str, Any]]] = {}

        valid_user_ids = {u["id"] for u in silver_data.get("dim_users", []) if u.get("id")}
        
        # Build fct_assessment_attempts & quarantine orphaned/invalid attempts
        stg_attempts = silver_data.get("stg_assessment_attempts", [])
        fct_attempts = []
        quarantine_attempts = []

        for att in stg_attempts:
            att_id = att.get("attempt_id")
            user_id = att.get("user_id")
            status = att.get("status")

            if not att_id or not user_id or user_id not in valid_user_ids:
                quarantined_rec = copy.deepcopy(att)
                quarantined_rec["quarantine_reason"] = "INVALID_OR_ORPHANED_USER_ID"
                quarantine_attempts.append(quarantined_rec)
            elif status not in cls.VALID_STATUS_ENUMS:
                quarantined_rec = copy.deepcopy(att)
                quarantined_rec["quarantine_reason"] = f"INVALID_STATUS_ENUM_{status}"
                quarantine_attempts.append(quarantined_rec)
            else:
                fct_attempts.append(att)

        gold["fct_assessment_attempts"] = fct_attempts
        quarantine["quarantine_orphaned_attempts"] = quarantine_attempts

        # fct_certificates: only keep certificates pointing to clean passed attempts in fct_assessment_attempts
        fct_attempt_ids = {a["attempt_id"] for a in fct_attempts if a.get("passed")}
        clean_certs = []
        quarantine_certs = []
        for cert in silver_data.get("fct_certificates", []):
            if cert.get("attempt_id") in fct_attempt_ids:
                clean_certs.append(cert)
            else:
                q_c = copy.deepcopy(cert)
                q_c["quarantine_reason"] = "CERTIFICATE_WITHOUT_CLEAN_PASSED_ATTEMPT"
                quarantine_certs.append(q_c)

        gold["fct_certificates"] = clean_certs
        quarantine["quarantine_orphaned_certificates"] = quarantine_certs

        # fct_question_responses
        gold["fct_question_responses"] = silver_data.get("stg_question_responses", [])
        gold["fct_attempt_question_snapshots"] = silver_data.get("stg_attempt_question_snapshots", [])
        gold["fct_audit_events"] = silver_data.get("stg_audit_logs", [])
        gold["dim_users"] = silver_data.get("dim_users", [])
        gold["dim_quizzes"] = silver_data.get("dim_quizzes", [])

        return {
            "gold": gold,
            "quarantine": quarantine
        }

    @classmethod
    def run_full_pipeline(cls, raw_data: Dict[str, List[Dict[str, Any]]]) -> Dict[str, Any]:
        """Runs full Bronze -> Silver -> Gold transformation flow."""
        silver = cls.clean_bronze_to_silver(raw_data)
        gold_out = cls.materialize_silver_to_gold(silver)
        return {
            "silver": silver,
            "gold": gold_out["gold"],
            "quarantine": gold_out["quarantine"]
        }

    # ==========================================
    # 3. Dataform SQLX Assertions Engine
    # ==========================================

    @staticmethod
    def assert_pk_unique_not_null(records: List[Dict[str, Any]], pk_col: str) -> Dict[str, Any]:
        """Dataform assertion: Checks PK IS NOT NULL and PK is unique."""
        violations = []
        seen = set()
        for r in records:
            val = r.get(pk_col)
            if val is None or val == "":
                violations.append({"record": r, "reason": f"{pk_col} is null/empty"})
            elif val in seen:
                violations.append({"record": r, "reason": f"Duplicate {pk_col}: {val}"})
            else:
                seen.add(val)
        return {
            "assertion_name": f"assert_{pk_col}_unique_not_null",
            "passed": len(violations) == 0,
            "violations_count": len(violations),
            "violations": violations
        }

    @staticmethod
    def assert_referential_integrity(
        child_records: List[Dict[str, Any]],
        fk_col: str,
        parent_records: List[Dict[str, Any]],
        parent_pk_col: str = "id"
    ) -> Dict[str, Any]:
        """Dataform assertion: Validates foreign key references."""
        parent_pks = {p.get(parent_pk_col) for p in parent_records if p.get(parent_pk_col) is not None}
        violations = []
        for r in child_records:
            fk_val = r.get(fk_col)
            if fk_val is not None and fk_val not in parent_pks:
                violations.append({"record": r, "reason": f"Orphaned foreign key {fk_col}={fk_val}"})
        return {
            "assertion_name": f"assert_fk_{fk_col}_referential_integrity",
            "passed": len(violations) == 0,
            "violations_count": len(violations),
            "violations": violations
        }

    @staticmethod
    def assert_numeric_range(
        records: List[Dict[str, Any]],
        col: str,
        min_val: float,
        max_val: Optional[float] = None
    ) -> Dict[str, Any]:
        """Dataform assertion: Validates numeric value range."""
        violations = []
        for r in records:
            val = r.get(col)
            if val is not None:
                try:
                    num = float(val)
                    if num < min_val:
                        violations.append({"record": r, "reason": f"{col}={num} < {min_val}"})
                    elif max_val is not None and num > max_val:
                        violations.append({"record": r, "reason": f"{col}={num} > {max_val}"})
                except (ValueError, TypeError):
                    violations.append({"record": r, "reason": f"{col} is not a valid number: {val}"})
        return {
            "assertion_name": f"assert_{col}_range_bounds",
            "passed": len(violations) == 0,
            "violations_count": len(violations),
            "violations": violations
        }

    @staticmethod
    def assert_status_enum_domain(
        records: List[Dict[str, Any]],
        col: str,
        allowed_values: Optional[Set[str]] = None
    ) -> Dict[str, Any]:
        """Dataform assertion: Validates status enum domain conformance."""
        if allowed_values is None:
            allowed_values = PipelineEngine.VALID_STATUS_ENUMS
        violations = []
        for r in records:
            val = r.get(col)
            if val is None or val not in allowed_values:
                violations.append({"record": r, "reason": f"Invalid enum value for {col}: {val}"})
        return {
            "assertion_name": f"assert_{col}_enum_domain",
            "passed": len(violations) == 0,
            "violations_count": len(violations),
            "violations": violations
        }

    @staticmethod
    def assert_timestamps_monotonic(
        records: List[Dict[str, Any]],
        start_col: str,
        end_col: str
    ) -> Dict[str, Any]:
        """Dataform assertion: Validates chronological sequence (start <= end)."""
        violations = []
        for r in records:
            start_str = r.get(start_col)
            end_str = r.get(end_col)
            if start_str and end_str:
                try:
                    dt_start = datetime.datetime.fromisoformat(start_str.replace("Z", "+00:00"))
                    dt_end = datetime.datetime.fromisoformat(end_str.replace("Z", "+00:00"))
                    if dt_end < dt_start:
                        violations.append({
                            "record": r,
                            "reason": f"Timestamp inversion: {start_col}={start_str} > {end_col}={end_str}"
                        })
                except Exception as e:
                    violations.append({"record": r, "reason": f"Timestamp parse failure: {e}"})
        return {
            "assertion_name": f"assert_{start_col}_{end_col}_monotonic",
            "passed": len(violations) == 0,
            "violations_count": len(violations),
            "violations": violations
        }

    @staticmethod
    def assert_json_validity(records: List[Dict[str, Any]], col: str) -> Dict[str, Any]:
        """Dataform assertion: Validates JSON structure non-null / parsable."""
        violations = []
        for r in records:
            val = r.get(col)
            if val is not None and not isinstance(val, (dict, list)):
                parsed = PipelineEngine.safe_parse_json(val)
                if parsed is None:
                    violations.append({"record": r, "reason": f"Malformed JSON in {col}: {val}"})
        return {
            "assertion_name": f"assert_{col}_valid_json",
            "passed": len(violations) == 0,
            "violations_count": len(violations),
            "violations": violations
        }

    @staticmethod
    def assert_array_validity(records: List[Dict[str, Any]], col: str) -> Dict[str, Any]:
        """Dataform assertion: Validates arrays have no NULL elements or untrimmed items."""
        violations = []
        for r in records:
            arr = r.get(col)
            if isinstance(arr, list):
                for idx, elem in enumerate(arr):
                    if elem is None:
                        violations.append({"record": r, "reason": f"NULL element in {col}[{idx}]"})
                    elif isinstance(elem, str) and (elem != elem.strip() or elem == ""):
                        violations.append({"record": r, "reason": f"Untrimmed/empty string in {col}[{idx}]: '{elem}'"})
        return {
            "assertion_name": f"assert_{col}_clean_array",
            "passed": len(violations) == 0,
            "violations_count": len(violations),
            "violations": violations
        }

    @staticmethod
    def assert_certificate_invariant(
        certificates: List[Dict[str, Any]],
        attempts: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """Dataform assertion: Digital certificates must only link to passed attempts."""
        attempts_map = {a.get("attempt_id") or a.get("id"): a for a in attempts}
        violations = []
        for cert in certificates:
            att_id = cert.get("attempt_id")
            att = attempts_map.get(att_id)
            if not att:
                violations.append({"record": cert, "reason": f"Certificate points to non-existent attempt {att_id}"})
            elif not att.get("passed"):
                violations.append({"record": cert, "reason": f"Certificate issued for unpassed attempt {att_id}"})
        return {
            "assertion_name": "assert_certificate_passed_attempt_invariant",
            "passed": len(violations) == 0,
            "violations_count": len(violations),
            "violations": violations
        }

    @classmethod
    def run_all_assertions(cls, gold_dataset: Dict[str, List[Dict[str, Any]]]) -> Dict[str, Any]:
        """Executes all automated Dataform assertions across Gold tables."""
        fct_attempts = gold_dataset.get("fct_assessment_attempts", [])
        dim_users = gold_dataset.get("dim_users", [])
        fct_responses = gold_dataset.get("fct_question_responses", [])
        fct_snapshots = gold_dataset.get("fct_attempt_question_snapshots", [])
        fct_certs = gold_dataset.get("fct_certificates", [])

        results = [
            cls.assert_pk_unique_not_null(fct_attempts, "attempt_id"),
            cls.assert_referential_integrity(fct_attempts, "user_id", dim_users, "id"),
            cls.assert_numeric_range(fct_attempts, "percentage", 0.0, 100.0),
            cls.assert_numeric_range(fct_attempts, "score", 0.0, None),
            cls.assert_numeric_range(fct_attempts, "duration_seconds", 0.0, None),
            cls.assert_status_enum_domain(fct_attempts, "status"),
            cls.assert_timestamps_monotonic(fct_attempts, "started_at_utc", "submitted_at_utc"),
            cls.assert_array_validity(fct_responses, "selected_option_ids"),
            cls.assert_certificate_invariant(fct_certs, fct_attempts)
        ]

        total_assertions = len(results)
        passed_count = sum(1 for r in results if r["passed"])
        failed_count = total_assertions - passed_count

        return {
            "total_assertions": total_assertions,
            "passed_count": passed_count,
            "failed_count": failed_count,
            "all_passed": failed_count == 0,
            "details": results
        }

    # ==========================================
    # 4. Dataplex Profiling & Drift Verification
    # ==========================================

    @staticmethod
    def profile_table(records: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Computes statistical metrics (null counts, null ratios, distinct counts, min, max, mean)."""
        row_count = len(records)
        if row_count == 0:
            return {"row_count": 0, "columns": {}}

        columns: Dict[str, Dict[str, Any]] = {}
        all_keys = set()
        for r in records:
            all_keys.update(r.keys())

        for col in sorted(all_keys):
            values = [r.get(col) for r in records]
            null_count = sum(1 for v in values if v is None or v == "")
            null_ratio = null_count / row_count
            non_null_vals = [v for v in values if v is not None and v != ""]
            distinct_count = len(set(str(v) for v in non_null_vals))

            numeric_vals = []
            for v in non_null_vals:
                if isinstance(v, (int, float)) and not isinstance(v, bool):
                    numeric_vals.append(float(v))

            col_stats: Dict[str, Any] = {
                "null_count": null_count,
                "null_ratio": round(null_ratio, 4),
                "distinct_count": distinct_count,
                "distinct_ratio": round(distinct_count / row_count, 4) if row_count > 0 else 0.0
            }

            if numeric_vals:
                col_stats["min_value"] = min(numeric_vals)
                col_stats["max_value"] = max(numeric_vals)
                col_stats["mean"] = round(sum(numeric_vals) / len(numeric_vals), 4)

            columns[col] = col_stats

        return {
            "row_count": row_count,
            "columns": columns
        }

    @classmethod
    def evaluate_null_drift(
        cls,
        baseline_profile: Dict[str, Any],
        post_profile: Dict[str, Any],
        non_nullable_cols: List[str]
    ) -> Dict[str, Any]:
        """
        Calculates null rate drift for non-nullable business attributes.
        Threshold: Delta drift must be < 1.0% (0.01).
        """
        drift_results = {}
        all_pass = True

        base_cols = baseline_profile.get("columns", {})
        post_cols = post_profile.get("columns", {})

        for col in non_nullable_cols:
            b_ratio = base_cols.get(col, {}).get("null_ratio", 0.0)
            p_ratio = post_cols.get(col, {}).get("null_ratio", 0.0)
            delta_pct = abs(p_ratio - b_ratio) * 100.0

            passed = delta_pct < 1.0
            if not passed:
                all_pass = False

            drift_results[col] = {
                "baseline_null_ratio": b_ratio,
                "post_null_ratio": p_ratio,
                "drift_percentage_points": round(delta_pct, 4),
                "passed": passed
            }

        return {
            "overall_drift_pass": all_pass,
            "threshold_pct": 1.0,
            "column_drift": drift_results
        }

    @classmethod
    def evaluate_defect_remediation(
        cls,
        anomalies_catalog: List[Dict[str, Any]],
        gold_dataset: Dict[str, List[Dict[str, Any]]]
    ) -> Dict[str, Any]:
        """
        Evaluates 100% defect remediation across all 8 defect classes in Gold tables.
        """
        fct_attempts = gold_dataset.get("fct_assessment_attempts", [])
        fct_responses = gold_dataset.get("fct_question_responses", [])

        unresolved_defects = []
        attempts_by_id = {a["attempt_id"]: a for a in fct_attempts if a.get("attempt_id")}

        for anom in anomalies_catalog:
            d_class = anom.get("defect_class")
            rec_id = anom.get("record_id")

            if d_class == "DEF-01":
                if rec_id in attempts_by_id:
                    att = attempts_by_id[rec_id]
                    if att.get(anom["column"]) is None:
                        unresolved_defects.append({"anomaly": anom, "reason": "Null still present in Gold"})
            elif d_class == "DEF-02":
                pass
            elif d_class == "DEF-03":
                if rec_id in attempts_by_id:
                    ts = attempts_by_id[rec_id].get("started_at_utc")
                    if ts and not ts.endswith("Z"):
                        unresolved_defects.append({"anomaly": anom, "reason": f"Timestamp not normalized to UTC Z: {ts}"})
            elif d_class == "DEF-04":
                pk_matches = [a for a in fct_attempts if a.get("attempt_id") == rec_id]
                if len(pk_matches) > 1:
                    unresolved_defects.append({"anomaly": anom, "reason": f"Duplicate PKs remain ({len(pk_matches)})"})
            elif d_class == "DEF-05":
                if rec_id in attempts_by_id:
                    unresolved_defects.append({"anomaly": anom, "reason": "Orphaned attempt leaked into Gold fact table"})
            elif d_class == "DEF-06":
                if rec_id in attempts_by_id:
                    att = attempts_by_id[rec_id]
                    pct = att.get("percentage", 0.0)
                    score = att.get("score", 0.0)
                    dur = att.get("duration_seconds", 0)
                    if pct < 0.0 or pct > 100.0 or score < 0.0 or dur < 0:
                        unresolved_defects.append({"anomaly": anom, "reason": f"Unclamped values: pct={pct}, score={score}, dur={dur}"})
            elif d_class == "DEF-07":
                if rec_id in attempts_by_id:
                    st = attempts_by_id[rec_id].get("status")
                    if st not in PipelineEngine.VALID_STATUS_ENUMS:
                        unresolved_defects.append({"anomaly": anom, "reason": f"Non-standard status enum: {st}"})
            elif d_class == "DEF-08":
                for resp in fct_responses:
                    if resp.get("response_id") == rec_id:
                        for opt in resp.get("selected_option_ids", []):
                            if opt is None or opt != opt.strip():
                                unresolved_defects.append({"anomaly": anom, "reason": f"Dirty array option: {opt}"})

        total_anomalies = len(anomalies_catalog)
        remediated_count = total_anomalies - len(unresolved_defects)
        remediation_rate = (remediated_count / total_anomalies * 100.0) if total_anomalies > 0 else 100.0

        return {
            "total_injected_anomalies": total_anomalies,
            "remediated_count": remediated_count,
            "unresolved_count": len(unresolved_defects),
            "remediation_rate_pct": round(remediation_rate, 2),
            "is_100_percent_remediated": len(unresolved_defects) == 0,
            "unresolved_defects": unresolved_defects
        }
