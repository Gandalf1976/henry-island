"""Henry-Lake: make as many words as possible from nine shuffled letters."""

from collections import Counter
from functools import lru_cache

from .daily import daily_rng
from .words import load_words

GAME_ID = "lake"
TIME_LIMIT = 120  # seconds
MIN_WORD_LENGTH = 3
WORD_POINTS = 1
FULL_WORD_BONUS = 5


def nine_letter_words():
    return load_words("lake_words.txt")


@lru_cache(maxsize=None)
def dictionary():
    return frozenset(load_words("dictionary.txt")) | frozenset(nine_letter_words())


def pick_daily_word(date):
    return daily_rng(GAME_ID, date).choice(nine_letter_words())


def scramble(word, rng):
    """Shuffle the letters of ``word`` so they are not in the original order."""
    letters = list(word)
    for _ in range(20):
        rng.shuffle(letters)
        if "".join(letters) != word:
            break
    return letters


def can_make(word, letters):
    """True if ``word`` can be built from ``letters`` (each tile used once)."""
    need = Counter(word)
    have = Counter(letters)
    return all(have[c] >= n for c, n in need.items())


def new_state(date, started_at):
    target = pick_daily_word(date)
    letters = scramble(target, daily_rng(GAME_ID + "-shuffle", date))
    return {
        "target": target,
        "letters": letters,
        "words": [],
        "score": 0,
        "found_target": False,
        "started_at": started_at,
        "finished": False,
    }


def time_left(state, now):
    return max(0, TIME_LIMIT - (now - state["started_at"]))


def submit_word(state, word, now, grace=2):
    """Try to add ``word``. Returns the points scored; raises ``ValueError``."""
    if state["finished"]:
        raise ValueError("The game is over.")
    if now - state["started_at"] > TIME_LIMIT + grace:
        state["finished"] = True
        raise ValueError("Time's up!")
    word = (word or "").strip().lower()
    if not word.isalpha() or len(word) < MIN_WORD_LENGTH:
        raise ValueError(f"Words need at least {MIN_WORD_LENGTH} letters.")
    if word in state["words"]:
        raise ValueError("You already found that word.")
    if not can_make(word, state["letters"]):
        raise ValueError("You can't make that word from these letters.")
    if word not in dictionary():
        raise ValueError("That's not in our dictionary.")

    points = WORD_POINTS
    if len(word) == len(state["target"]):
        points += FULL_WORD_BONUS
        state["found_target"] = True
    state["words"].append(word)
    state["score"] += points
    return points


def public_state(state, now):
    data = {
        "letters": state["letters"],
        "words": state["words"],
        "score": state["score"],
        "found_target": state["found_target"],
        "finished": state["finished"],
        "time_left": round(time_left(state, now), 1),
        "time_limit": TIME_LIMIT,
    }
    if state["finished"]:
        data["answer"] = state["target"]
    return data
