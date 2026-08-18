"""
Synthetic Data Generator for Quiz Platform Data Cleaning Pipeline.

Generates realistic raw synthetic datasets containing all 8 defect classes:
- DEF-01: Null Inflation (missing PKs, FKs, or non-nullable columns)
- DEF-02: Malformed JSON (unclosed braces, escaped strings, bad types in snapshot/breakdown/details)
- DEF-03: Timezone & Timestamp Variety / Anomalies (+05:30, -04:00, epoch millis, epoch seconds, inverted timestamps)
- DEF-04: Duplicate Records / Retry Storms (duplicate PKs with identical/different timestamps)
- DEF-05: Foreign Key Orphans (attempts pointing to missing users, questions pointing to missing quizzes)
- DEF-06: Out-of-Bounds Scores & Metrics (negative marks, >100% percentage, total_marks = 0, negative duration)
- DEF-07: Enum Casing & String Drift ('completed ', 'in_progress', 'CREATED', invalid enums)
- DEF-08: Array Element Corruption (NULL elements in arrays, untrimmed whitespace, duplicate options)

Also generates pristine ground-truth datasets with zero defects for validation.
"""

import copy
import datetime
import json
import random
import uuid
from typing import Any, Dict, List, Optional, Tuple


class SyntheticDataGenerator:
    """Generates synthetic datasets with configurable defect injection and pristine modes."""

    STATUSES = ["CREATED", "IN_PROGRESS", "SUBMITTING", "COMPLETED", "EXPIRED", "CANCELLED", "ABANDONED"]
    ROLES = ["STUDENT", "INSTRUCTOR", "ADMIN", "PROCTOR"]
    DIFFICULTIES = ["EASY", "MEDIUM", "HARD", "EXPERT"]
    AUDIT_ACTIONS = [
        "USER_LOGIN",
        "ATTEMPT_STARTED",
        "ATTEMPT_SUBMITTED",
        "ATTEMPT_AUTO_SUBMITTED",
        "QUIZ_PUBLISHED",
        "CERTIFICATE_GENERATED",
        "PASSWORD_RESET"
    ]

    def __init__(self, seed: int = 42):
        self.seed = seed
        self.rng = random.Random(seed)

    def reset_seed(self, seed: Optional[int] = None):
        """Reset the random seed for reproducible generation."""
        if seed is not None:
            self.seed = seed
        self.rng = random.Random(self.seed)

    def generate_pristine_dataset(
        self,
        num_users: int = 20,
        num_quizzes: int = 5,
        num_attempts: int = 50,
        questions_per_quiz: int = 5
    ) -> Dict[str, List[Dict[str, Any]]]:
        """
        Generates a completely clean, pristine relational dataset across core entities.
        Contains 0 defects: valid ISO UTC timestamps, normalized enums, valid JSON,
        clean arrays, valid FK relationships, score within [0, 100].
        """
        self.reset_seed(self.seed)
        
        # 1. Users
        users = []
        user_ids = []
        for i in range(num_users):
            u_id = str(uuid.uuid4())
            user_ids.append(u_id)
            created_at = datetime.datetime(2026, 1, 1, 10, 0, 0, tzinfo=datetime.timezone.utc) + datetime.timedelta(days=i)
            users.append({
                "id": u_id,
                "email": f"user_{i}_{u_id[:6]}@example.com",
                "username": f"user_{i}",
                "role": self.rng.choice(self.ROLES),
                "is_active": True,
                "created_at": created_at.strftime("%Y-%m-%dT%H:%M:%SZ"),
                "updated_at": created_at.strftime("%Y-%m-%dT%H:%M:%SZ")
            })

        # 2. Categories
        categories = [
            {"id": str(uuid.uuid4()), "name": "Computer Science", "slug": "computer-science", "is_active": True},
            {"id": str(uuid.uuid4()), "name": "Mathematics", "slug": "mathematics", "is_active": True},
            {"id": str(uuid.uuid4()), "name": "Physics", "slug": "physics", "is_active": True}
        ]

        # 3. Quizzes & Versions
        quizzes = []
        quiz_versions = []
        questions = []
        question_options = []
        quiz_version_ids = []

        for q_idx in range(num_quizzes):
            q_id = str(uuid.uuid4())
            cat = categories[q_idx % len(categories)]
            quizzes.append({
                "id": q_id,
                "title": f"Assessment {q_idx + 1}: {cat['name']} Mastery",
                "slug": f"assessment-{q_idx + 1}",
                "category_id": cat["id"],
                "created_by": user_ids[0],
                "is_published": True,
                "created_at": "2026-01-10T08:00:00Z",
                "updated_at": "2026-01-10T08:00:00Z"
            })

            # Quiz version
            qv_id = str(uuid.uuid4())
            quiz_version_ids.append(qv_id)
            quiz_versions.append({
                "id": qv_id,
                "quiz_id": q_id,
                "version_number": 1,
                "pass_percentage": 60.0,
                "time_limit_minutes": 30,
                "total_marks": float(questions_per_quiz * 10),
                "is_active": True,
                "created_at": "2026-01-10T08:30:00Z"
            })

            # Questions & Options
            for qn_idx in range(questions_per_quiz):
                qn_id = str(uuid.uuid4())
                questions.append({
                    "id": qn_id,
                    "quiz_version_id": qv_id,
                    "question_text": f"What is the principle behind question {qn_idx + 1}?",
                    "question_type": "SINGLE_CHOICE",
                    "difficulty": self.rng.choice(self.DIFFICULTIES),
                    "marks": 10.0,
                    "negative_marks": 0.0,
                    "order_index": qn_idx + 1,
                    "explanation": f"Explanation for question {qn_idx + 1}"
                })

                # 4 options per question
                for opt_idx in range(4):
                    opt_id = str(uuid.uuid4())
                    question_options.append({
                        "id": opt_id,
                        "question_id": qn_id,
                        "option_text": f"Option {chr(65 + opt_idx)}: Concrete description",
                        "is_correct": (opt_idx == 0),
                        "order_index": opt_idx + 1
                    })

        # 4. Assessment Attempts, Responses, Results, Certificates, Audits
        attempts = []
        attempt_questions = []
        answers = []
        results = []
        certificates = []
        audit_logs = []

        base_time = datetime.datetime(2026, 2, 1, 12, 0, 0, tzinfo=datetime.timezone.utc)

        for a_idx in range(num_attempts):
            att_id = str(uuid.uuid4())
            u_id = self.rng.choice(user_ids)
            qv_id = self.rng.choice(quiz_version_ids)
            
            start_dt = base_time + datetime.timedelta(hours=a_idx * 2)
            duration_s = self.rng.randint(600, 1500)
            submit_dt = start_dt + datetime.timedelta(seconds=duration_s)
            expire_dt = start_dt + datetime.timedelta(minutes=30)
            
            status = "COMPLETED" if self.rng.random() > 0.15 else "IN_PROGRESS"
            total_marks = float(questions_per_quiz * 10)
            obtained_marks = float(self.rng.randint(3, questions_per_quiz) * 10) if status == "COMPLETED" else 0.0
            pct = round((obtained_marks / total_marks) * 100.0, 2)
            passed = (pct >= 60.0) if status == "COMPLETED" else False

            attempts.append({
                "id": att_id,
                "user_id": u_id,
                "quiz_version_id": qv_id,
                "status": status,
                "started_at": start_dt.strftime("%Y-%m-%dT%H:%M:%SZ"),
                "submitted_at": submit_dt.strftime("%Y-%m-%dT%H:%M:%SZ") if status == "COMPLETED" else None,
                "expires_at": expire_dt.strftime("%Y-%m-%dT%H:%M:%SZ"),
                "total_marks": total_marks,
                "score": obtained_marks,
                "percentage": pct,
                "passed": passed,
                "created_at": start_dt.strftime("%Y-%m-%dT%H:%M:%SZ"),
                "updated_at": submit_dt.strftime("%Y-%m-%dT%H:%M:%SZ") if status == "COMPLETED" else start_dt.strftime("%Y-%m-%dT%H:%M:%SZ")
            })

            # Attempt question snapshots and answers
            matching_qns = [q for q in questions if q["quiz_version_id"] == qv_id]
            for qn in matching_qns:
                aq_id = str(uuid.uuid4())
                q_opts = [o for o in question_options if o["question_id"] == qn["id"]]
                
                snapshot_obj = {
                    "question_id": qn["id"],
                    "text": qn["question_text"],
                    "marks": qn["marks"],
                    "difficulty": qn["difficulty"],
                    "options": [
                        {"id": o["id"], "text": o["option_text"], "is_correct": o["is_correct"]}
                        for o in q_opts
                    ]
                }

                attempt_questions.append({
                    "id": aq_id,
                    "attempt_id": att_id,
                    "question_id": qn["id"],
                    "question_snapshot": json.dumps(snapshot_obj),
                    "created_at": start_dt.strftime("%Y-%m-%dT%H:%M:%SZ")
                })

                if status == "COMPLETED":
                    correct_opt = next(o for o in q_opts if o["is_correct"])
                    chosen_opt = correct_opt if self.rng.random() > 0.3 else q_opts[1]
                    ans_id = str(uuid.uuid4())
                    answers.append({
                        "id": ans_id,
                        "attempt_id": att_id,
                        "question_id": qn["id"],
                        "selected_option_ids": [chosen_opt["id"]],
                        "text_response": None,
                        "is_correct": (chosen_opt["id"] == correct_opt["id"]),
                        "marks_awarded": qn["marks"] if chosen_opt["id"] == correct_opt["id"] else 0.0,
                        "time_spent_seconds": 120,
                        "created_at": submit_dt.strftime("%Y-%m-%dT%H:%M:%SZ")
                    })

            # Result and certificate
            if status == "COMPLETED":
                res_id = str(uuid.uuid4())
                breakdown_obj = {
                    "total_questions": len(matching_qns),
                    "correct_answers": int(obtained_marks / 10),
                    "incorrect_answers": len(matching_qns) - int(obtained_marks / 10),
                    "score": obtained_marks,
                    "percentage": pct
                }
                results.append({
                    "id": res_id,
                    "attempt_id": att_id,
                    "user_id": u_id,
                    "total_score": obtained_marks,
                    "percentage": pct,
                    "passed": passed,
                    "breakdown": json.dumps(breakdown_obj),
                    "created_at": submit_dt.strftime("%Y-%m-%dT%H:%M:%SZ")
                })

                if passed:
                    cert_id = str(uuid.uuid4())
                    certificates.append({
                        "id": cert_id,
                        "attempt_id": att_id,
                        "user_id": u_id,
                        "certificate_code": f"CERT-2026-{a_idx:04d}-{u_id[:4].upper()}",
                        "issued_at": submit_dt.strftime("%Y-%m-%dT%H:%M:%SZ"),
                        "created_at": submit_dt.strftime("%Y-%m-%dT%H:%M:%SZ")
                    })

            # Audit logs
            audit_logs.append({
                "id": str(uuid.uuid4()),
                "user_id": u_id,
                "action": "ATTEMPT_STARTED",
                "resource_type": "assessment_attempt",
                "resource_id": att_id,
                "details": json.dumps({"client_ip": "192.168.1.100", "user_agent": "Mozilla/5.0"}),
                "created_at": start_dt.strftime("%Y-%m-%dT%H:%M:%SZ")
            })
            if status == "COMPLETED":
                audit_logs.append({
                    "id": str(uuid.uuid4()),
                    "user_id": u_id,
                    "action": "ATTEMPT_SUBMITTED",
                    "resource_type": "assessment_attempt",
                    "resource_id": att_id,
                    "details": json.dumps({"obtained_marks": obtained_marks, "passed": passed}),
                    "created_at": submit_dt.strftime("%Y-%m-%dT%H:%M:%SZ")
                })

        return {
            "users": users,
            "categories": categories,
            "quizzes": quizzes,
            "quiz_versions": quiz_versions,
            "questions": questions,
            "question_options": question_options,
            "assessment_attempts": attempts,
            "attempt_questions": attempt_questions,
            "answers": answers,
            "results": results,
            "certificates": certificates,
            "audit_logs": audit_logs
        }

    def inject_defects(
        self,
        clean_data: Dict[str, List[Dict[str, Any]]],
        defect_types: Optional[List[str]] = None,
        defect_rate: float = 0.2
    ) -> Dict[str, Any]:
        """
        Injects specific defect classes into a clean dataset.
        Returns a dict containing:
        - 'raw_data': mutated dirty dataset
        - 'injected_anomalies': catalog of all injected anomalies with metadata
        """
        data = copy.deepcopy(clean_data)
        if defect_types is None:
            defect_types = ["DEF-01", "DEF-02", "DEF-03", "DEF-04", "DEF-05", "DEF-06", "DEF-07", "DEF-08"]

        anomalies_catalog: List[Dict[str, Any]] = []

        # DEF-01: Null Inflation (injecting NULL into non-nullable attributes)
        if "DEF-01" in defect_types and data.get("assessment_attempts"):
            target_attempts = data["assessment_attempts"]
            count = max(1, int(len(target_attempts) * defect_rate))
            for i in range(count):
                rec = target_attempts[i]
                target_col = self.rng.choice(["user_id", "quiz_version_id", "started_at", "status"])
                orig_val = rec[target_col]
                rec[target_col] = None
                anomalies_catalog.append({
                    "defect_class": "DEF-01",
                    "table": "assessment_attempts",
                    "record_id": rec.get("id"),
                    "column": target_col,
                    "original_value": orig_val,
                    "mutated_value": None,
                    "description": f"Null inflation injected into {target_col}"
                })

        # DEF-02: Malformed / Unclosed JSON
        if "DEF-02" in defect_types and data.get("attempt_questions"):
            target_aqs = data["attempt_questions"]
            count = max(1, int(len(target_aqs) * defect_rate))
            for i in range(count):
                rec = target_aqs[i]
                orig_json = rec["question_snapshot"]
                mutation_choice = i % 3
                if mutation_choice == 0:
                    mutated = orig_json[:len(orig_json)//2] + " ... corrupted unclosed JSON"
                elif mutation_choice == 1:
                    mutated = f"\"\"{{\\\"escaped_twice\\\": true, \\\"val\\\": {i}}}\"\""
                else:
                    mutated = "NON_JSON_PLAIN_TEXT_BLOB_ERROR"
                rec["question_snapshot"] = mutated
                anomalies_catalog.append({
                    "defect_class": "DEF-02",
                    "table": "attempt_questions",
                    "record_id": rec.get("id"),
                    "column": "question_snapshot",
                    "original_value": orig_json,
                    "mutated_value": mutated,
                    "description": "Corrupted / malformed JSON injected"
                })

        # DEF-03: Timezone & Timestamp Variety / Anomalies
        if "DEF-03" in defect_types and data.get("assessment_attempts"):
            target_attempts = data["assessment_attempts"]
            count = max(1, int(len(target_attempts) * defect_rate))
            for i in range(count):
                rec = target_attempts[i]
                if not rec.get("started_at"):
                    continue
                orig_ts = rec["started_at"]
                mutation_choice = i % 5
                if mutation_choice == 0:
                    # +05:30 IST offset
                    mutated = "2026-08-18T21:08:27+05:30"
                elif mutation_choice == 1:
                    # -04:00 EDT offset
                    mutated = "2026-08-18T11:38:27-04:00"
                elif mutation_choice == 2:
                    # epoch millis
                    mutated = "1755530781000"
                elif mutation_choice == 3:
                    # SQL space format
                    mutated = "2026-08-18 15:38:27"
                else:
                    # Chronological inversion (started_at > submitted_at)
                    rec["started_at"] = "2026-08-18T16:00:00Z"
                    rec["submitted_at"] = "2026-08-18T15:00:00Z"
                    mutated = "INVERTED_TIMESTAMPS"
                if mutation_choice != 4:
                    rec["started_at"] = mutated
                anomalies_catalog.append({
                    "defect_class": "DEF-03",
                    "table": "assessment_attempts",
                    "record_id": rec.get("id"),
                    "column": "started_at",
                    "original_value": orig_ts,
                    "mutated_value": mutated,
                    "description": f"Timestamp format / timezone variety injected ({mutation_choice})"
                })

        # DEF-04: Duplicate Records (Retry Storms)
        if "DEF-04" in defect_types and data.get("assessment_attempts"):
            target_attempts = data["assessment_attempts"]
            count = max(1, int(len(target_attempts) * defect_rate))
            for i in range(count):
                base_rec = target_attempts[i]
                dup_rec = copy.deepcopy(base_rec)
                dup_rec["updated_at"] = "2026-08-18T16:05:00Z"  # newer updated_at
                data["assessment_attempts"].append(dup_rec)
                anomalies_catalog.append({
                    "defect_class": "DEF-04",
                    "table": "assessment_attempts",
                    "record_id": base_rec.get("id"),
                    "column": "id",
                    "original_value": base_rec.get("id"),
                    "mutated_value": f"Duplicate PK with id {base_rec.get('id')}",
                    "description": "Idempotent duplicate retry record injected"
                })

        # DEF-05: Foreign Key Orphans
        if "DEF-05" in defect_types and data.get("assessment_attempts"):
            target_attempts = data["assessment_attempts"]
            count = max(1, int(len(target_attempts) * defect_rate))
            for i in range(count):
                rec = target_attempts[len(target_attempts) - 1 - i]
                non_existent_uid = f"missing-user-{uuid.uuid4()}"
                orig_uid = rec.get("user_id")
                rec["user_id"] = non_existent_uid
                anomalies_catalog.append({
                    "defect_class": "DEF-05",
                    "table": "assessment_attempts",
                    "record_id": rec.get("id"),
                    "column": "user_id",
                    "original_value": orig_uid,
                    "mutated_value": non_existent_uid,
                    "description": "Foreign key orphan (non-existent user_id) injected"
                })

        # DEF-06: Out-of-Bounds Scores & Metrics
        if "DEF-06" in defect_types and data.get("assessment_attempts"):
            target_attempts = data["assessment_attempts"]
            count = max(1, int(len(target_attempts) * defect_rate))
            for i in range(count):
                rec = target_attempts[i]
                mutation_choice = i % 4
                if mutation_choice == 0:
                    rec["score"] = -15.0  # negative score
                    rec["percentage"] = -30.0
                elif mutation_choice == 1:
                    rec["score"] = 150.0  # score > total_marks
                    rec["percentage"] = 300.0  # pct > 100
                elif mutation_choice == 2:
                    rec["total_marks"] = 0.0  # zero total marks
                    rec["score"] = 0.0
                else:
                    rec["duration_seconds"] = -600  # negative duration
                anomalies_catalog.append({
                    "defect_class": "DEF-06",
                    "table": "assessment_attempts",
                    "record_id": rec.get("id"),
                    "column": "score / percentage",
                    "original_value": "valid_score",
                    "mutated_value": f"mutation_{mutation_choice}",
                    "description": f"Out-of-bounds score/metric injected ({mutation_choice})"
                })

        # DEF-07: Enum Casing & String Drift
        if "DEF-07" in defect_types and data.get("assessment_attempts"):
            target_attempts = data["assessment_attempts"]
            count = max(1, int(len(target_attempts) * defect_rate))
            for i in range(count):
                rec = target_attempts[i]
                mutation_choice = i % 4
                if mutation_choice == 0:
                    mutated_status = "completed "  # trailing whitespace & lower
                elif mutation_choice == 1:
                    mutated_status = "in_progress"  # lowercase
                elif mutation_choice == 2:
                    mutated_status = "  SUBMITTING  "  # leading/trailing spaces
                else:
                    mutated_status = "INVALID_UNAUTHORIZED_STATUS_VALUE"
                rec["status"] = mutated_status
                anomalies_catalog.append({
                    "defect_class": "DEF-07",
                    "table": "assessment_attempts",
                    "record_id": rec.get("id"),
                    "column": "status",
                    "original_value": "COMPLETED",
                    "mutated_value": mutated_status,
                    "description": f"Enum casing & string drift injected ({mutated_status})"
                })

        # DEF-08: Array Element Corruption (NULLs, whitespace, duplicate elements)
        if "DEF-08" in defect_types and data.get("answers"):
            target_answers = data["answers"]
            count = max(1, int(len(target_answers) * defect_rate))
            for i in range(count):
                rec = target_answers[i]
                orig_arr = rec.get("selected_option_ids", [])
                mutation_choice = i % 3
                if mutation_choice == 0:
                    mutated_arr = [None, "opt_1", None, "  opt_2  "]
                elif mutation_choice == 1:
                    mutated_arr = ["Option A", "option a", "Option A", ""]
                else:
                    mutated_arr = [None, None]
                rec["selected_option_ids"] = mutated_arr
                anomalies_catalog.append({
                    "defect_class": "DEF-08",
                    "table": "answers",
                    "record_id": rec.get("id"),
                    "column": "selected_option_ids",
                    "original_value": orig_arr,
                    "mutated_value": mutated_arr,
                    "description": "Array element corruption (NULLs / whitespace) injected"
                })

        return {
            "raw_data": data,
            "injected_anomalies": anomalies_catalog,
            "total_anomalies_count": len(anomalies_catalog)
        }
