from typing import Any, Dict, List, Optional, Tuple


class ScoringResult:
    def __init__(
        self,
        total_marks: float,
        obtained_marks: float,
        percentage: float,
        passed: bool,
        correct_count: int,
        incorrect_count: int,
        unanswered_count: int,
        answers_evaluation: List[Dict[str, Any]],
    ):
        self.total_marks = round(total_marks, 2)
        self.obtained_marks = round(obtained_marks, 2)
        self.percentage = round(percentage, 2)
        self.passed = passed
        self.correct_count = correct_count
        self.incorrect_count = incorrect_count
        self.unanswered_count = unanswered_count
        self.answers_evaluation = answers_evaluation


class ScoringService:
    @staticmethod
    def evaluate_attempt(
        questions_with_options: List[Dict[str, Any]],
        answers_by_attempt_q_id: Dict[str, Optional[str]],
        passing_percentage: float,
        negative_marking_enabled: bool = False,
        negative_mark_value: float = 0.0,
    ) -> ScoringResult:
        """
        Pure function to evaluate student answers against question snapshots and official correct options.
        questions_with_options: list of dicts with keys:
          - attempt_question_id: str
          - question_id: str
          - marks: float
          - correct_option_id: str
        answers_by_attempt_q_id: dict mapping attempt_question_id -> selected_option_id
        """
        total_marks = 0.0
        obtained_marks = 0.0
        correct_count = 0
        incorrect_count = 0
        unanswered_count = 0
        evaluations = []

        for q in questions_with_options:
            aq_id = q["attempt_question_id"]
            q_marks = float(q["marks"])
            correct_opt_id = q["correct_option_id"]
            selected_opt_id = answers_by_attempt_q_id.get(aq_id)

            total_marks += q_marks

            if not selected_opt_id:
                # Unanswered
                unanswered_count += 1
                marks_awarded = 0.0
                is_correct = False
            elif selected_opt_id == correct_opt_id:
                # Correct
                correct_count += 1
                marks_awarded = q_marks
                is_correct = True
            else:
                # Incorrect
                incorrect_count += 1
                is_correct = False
                if negative_marking_enabled and negative_mark_value > 0:
                    marks_awarded = -abs(float(negative_mark_value))
                else:
                    marks_awarded = 0.0

            obtained_marks += marks_awarded
            evaluations.append({
                "attempt_question_id": aq_id,
                "selected_option_id": selected_opt_id,
                "correct_option_id": correct_opt_id,
                "is_correct": is_correct,
                "marks_awarded": marks_awarded,
            })

        # Calculate percentage (clamped to 0 at bottom if negative marks exceeded total)
        if total_marks > 0:
            raw_percentage = (obtained_marks / total_marks) * 100.0
            percentage = max(0.0, min(100.0, raw_percentage))
        else:
            percentage = 0.0

        passed = percentage >= passing_percentage

        return ScoringResult(
            total_marks=total_marks,
            obtained_marks=obtained_marks,
            percentage=percentage,
            passed=passed,
            correct_count=correct_count,
            incorrect_count=incorrect_count,
            unanswered_count=unanswered_count,
            answers_evaluation=evaluations,
        )
