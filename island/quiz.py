"""Henry-Quiz: ten multiple choice questions in sixty seconds."""

import json
import os
from functools import lru_cache

from .daily import GameError, daily_rng
from .words import DATA_DIR

GAME_ID = "quiz"
TIME_LIMIT = 60  # seconds
NUM_QUESTIONS = 10
CATEGORIES = ["Geography", "Science and Nature", "Entertainment", "Sport", "General Knowledge", "Music"]


@lru_cache(maxsize=None)
def question_bank():
    with open(os.path.join(DATA_DIR, "quiz_questions.json"), encoding="utf-8") as handle:
        return tuple(json.load(handle))


def daily_questions(date):
    """Pick today's questions: one from every category, the rest at random."""
    rng = daily_rng(GAME_ID, date)
    bank = list(question_bank())
    chosen = []
    for category in CATEGORIES:
        options = [q for q in bank if q["category"] == category]
        if options:
            pick = rng.choice(options)
            chosen.append(pick)
            bank.remove(pick)
    rng.shuffle(bank)
    chosen.extend(bank[: max(0, NUM_QUESTIONS - len(chosen))])
    chosen = chosen[:NUM_QUESTIONS]
    rng.shuffle(chosen)

    questions = []
    for q in chosen:
        options = [q["answer"], *q["wrong"]]
        rng.shuffle(options)
        questions.append({
            "category": q["category"],
            "question": q["question"],
            "options": options,
            "answer": options.index(q["answer"]),
        })
    return questions


def new_state(date, started_at):
    return {"questions": daily_questions(date), "answers": [], "score": 0, "started_at": started_at, "finished": False}


def time_left(state, now):
    return max(0, TIME_LIMIT - (now - state["started_at"]))


def answer(state, index, choice, now, grace=2):
    """Answer question ``index`` with option ``choice``. Returns True if right."""
    if state["finished"]:
        raise GameError("The quiz is over.")
    if now - state["started_at"] > TIME_LIMIT + grace:
        state["finished"] = True
        raise GameError("Time's up!")
    if index != len(state["answers"]):
        raise GameError("That question has already been answered.")
    question = state["questions"][index]
    if not isinstance(choice, int) or not 0 <= choice < len(question["options"]):
        raise GameError("Please pick one of the answers.")
    correct = choice == question["answer"]
    state["answers"].append(choice)
    if correct:
        state["score"] += 1
    if len(state["answers"]) >= len(state["questions"]):
        state["finished"] = True
    return correct


def public_state(state, now):
    answered = len(state["answers"])
    questions = []
    for i, q in enumerate(state["questions"]):
        item = {"category": q["category"], "question": q["question"], "options": q["options"]}
        if i < answered or state["finished"]:
            item["answer"] = q["answer"]
            item["chosen"] = state["answers"][i] if i < answered else None
        questions.append(item)
    return {
        "questions": questions,
        "current": answered,
        "score": state["score"],
        "finished": state["finished"],
        "time_left": round(time_left(state, now), 1),
        "time_limit": TIME_LIMIT,
    }
