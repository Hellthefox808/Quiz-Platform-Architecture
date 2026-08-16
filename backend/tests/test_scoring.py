import pytest
from backend.app.services.scoring_service import ScoringService


def test_standard_mcq_scoring_all_correct():
    questions = [
        {"attempt_question_id": "aq1", "question_id": "q1", "marks": 2.0, "correct_option_id": "opt1"},
        {"attempt_question_id": "aq2", "question_id": "q2", "marks": 3.0, "correct_option_id": "opt5"},
    ]
    answers = {
        "aq1": "opt1",
        "aq2": "opt5",
    }
    result = ScoringService.evaluate_attempt(
        questions_with_options=questions,
        answers_by_attempt_q_id=answers,
        passing_percentage=60.0,
        negative_marking_enabled=False,
    )

    assert result.total_marks == 5.0
    assert result.obtained_marks == 5.0
    assert result.percentage == 100.0
    assert result.passed is True
    assert result.correct_count == 2
    assert result.incorrect_count == 0
    assert result.unanswered_count == 0


def test_standard_mcq_with_unanswered_and_wrong():
    questions = [
        {"attempt_question_id": "aq1", "question_id": "q1", "marks": 2.0, "correct_option_id": "opt1"},
        {"attempt_question_id": "aq2", "question_id": "q2", "marks": 2.0, "correct_option_id": "opt2"},
        {"attempt_question_id": "aq3", "question_id": "q3", "marks": 2.0, "correct_option_id": "opt3"},
        {"attempt_question_id": "aq4", "question_id": "q4", "marks": 4.0, "correct_option_id": "opt4"},
    ]
    answers = {
        "aq1": "opt1",  # Correct (+2)
        "aq2": "wrong_opt",  # Wrong (0)
        "aq3": None,  # Unanswered (0)
        # aq4 omitted -> Unanswered (0)
    }
    result = ScoringService.evaluate_attempt(
        questions_with_options=questions,
        answers_by_attempt_q_id=answers,
        passing_percentage=50.0,
        negative_marking_enabled=False,
    )

    assert result.total_marks == 10.0
    assert result.obtained_marks == 2.0
    assert result.percentage == 20.0
    assert result.passed is False
    assert result.correct_count == 1
    assert result.incorrect_count == 1
    assert result.unanswered_count == 2


def test_negative_marking_penalty():
    questions = [
        {"attempt_question_id": "aq1", "question_id": "q1", "marks": 4.0, "correct_option_id": "opt1"},
        {"attempt_question_id": "aq2", "question_id": "q2", "marks": 4.0, "correct_option_id": "opt2"},
        {"attempt_question_id": "aq3", "question_id": "q3", "marks": 2.0, "correct_option_id": "opt3"},
    ]
    # aq1 correct (+4), aq2 wrong (-1), aq3 unanswered (0) => total = 10, obtained = 3
    answers = {
        "aq1": "opt1",
        "aq2": "wrong",
        "aq3": None,
    }
    result = ScoringService.evaluate_attempt(
        questions_with_options=questions,
        answers_by_attempt_q_id=answers,
        passing_percentage=40.0,
        negative_marking_enabled=True,
        negative_mark_value=1.0,
    )

    assert result.total_marks == 10.0
    assert result.obtained_marks == 3.0
    assert result.percentage == 30.0
    assert result.passed is False
    assert result.correct_count == 1
    assert result.incorrect_count == 1
    assert result.unanswered_count == 1


def test_negative_marking_clamped_percentage():
    # If all answers are wrong with negative marks, percentage is clamped at 0%
    questions = [
        {"attempt_question_id": "aq1", "question_id": "q1", "marks": 2.0, "correct_option_id": "opt1"},
    ]
    answers = {
        "aq1": "wrong",
    }
    result = ScoringService.evaluate_attempt(
        questions_with_options=questions,
        answers_by_attempt_q_id=answers,
        passing_percentage=50.0,
        negative_marking_enabled=True,
        negative_mark_value=1.0,
    )
    assert result.obtained_marks == -1.0
    assert result.percentage == 0.0
    assert result.passed is False
