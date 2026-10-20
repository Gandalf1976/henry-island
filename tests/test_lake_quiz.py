import random
from collections import Counter

import pytest

from island import lake, quiz


def test_daily_lake_word_and_scramble():
    state = lake.new_state("2025-12-01", 0)
    assert len(state["target"]) == 9
    assert Counter(state["letters"]) == Counter(state["target"])
    assert "".join(state["letters"]) != state["target"]
    assert lake.new_state("2025-12-01", 0)["letters"] == state["letters"]


def make_state(target="lunchtime"):
    state = lake.new_state("2025-12-01", 0)
    state["target"] = target
    state["letters"] = lake.scramble(target, random.Random(1))
    return state


def test_can_make_uses_each_tile_once():
    assert lake.can_make("tune", list("lunchtime"))
    assert not lake.can_make("tutu", list("lunchtime"))


def test_lake_scoring():
    state = make_state()
    assert lake.submit_word(state, "lunch", now=10) == 1
    assert lake.submit_word(state, "LUNCHTIME", now=20) == 6
    assert state["score"] == 7 and state["found_target"]
    for bad in ["lunch", "it", "xyzzy", "lunches", "qqq"]:
        with pytest.raises(ValueError):
            lake.submit_word(state, bad, now=30)
    assert state["score"] == 7


def test_lake_time_limit():
    state = make_state()
    with pytest.raises(ValueError):
        lake.submit_word(state, "lunch", now=lake.TIME_LIMIT + 5)
    assert state["finished"] and state["score"] == 0


def test_quiz_bank_has_every_category():
    bank = quiz.question_bank()
    assert {q["category"] for q in bank} == set(quiz.CATEGORIES)
    for q in bank:
        assert len(q["wrong"]) == 3 and q["answer"] not in q["wrong"]


def test_daily_questions():
    questions = quiz.daily_questions("2025-12-01")
    assert len(questions) == quiz.NUM_QUESTIONS
    assert {q["category"] for q in questions} == set(quiz.CATEGORIES)
    assert len({q["question"] for q in questions}) == quiz.NUM_QUESTIONS
    assert questions == quiz.daily_questions("2025-12-01")
    assert questions != quiz.daily_questions("2025-12-02")


def test_quiz_scoring_and_order():
    state = quiz.new_state("2025-12-01", 0)
    first = state["questions"][0]
    assert quiz.answer(state, 0, first["answer"], now=1) is True
    with pytest.raises(ValueError):
        quiz.answer(state, 0, first["answer"], now=2)  # can't answer twice
    wrong = (state["questions"][1]["answer"] + 1) % 4
    assert quiz.answer(state, 1, wrong, now=3) is False
    assert state["score"] == 1
    public = quiz.public_state(state, now=3)
    assert "answer" not in public["questions"][2]


def test_quiz_time_limit():
    state = quiz.new_state("2025-12-01", 0)
    with pytest.raises(ValueError):
        quiz.answer(state, 0, 0, now=quiz.TIME_LIMIT + 5)
    assert state["finished"]
