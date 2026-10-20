"""Henry-Wordle: guess the secret five letter word in six tries."""

import random
from functools import lru_cache

from .daily import GameError, daily_rng
from .words import load_words

GAME_ID = "wordle"
WORD_LENGTH = 5
MAX_ATTEMPTS = 6
# Points awarded for solving the word on attempt 1, 2, 3, ...
SCORES = {1: 10, 2: 5, 3: 4, 4: 3, 5: 2, 6: 1}

CORRECT = "correct"  # green: right letter, right spot
PRESENT = "present"  # yellow: right letter, wrong spot
ABSENT = "absent"  # grey: letter not in the word


def answers():
    """Possible secret words (answers.txt)."""
    return load_words("answers.txt")


@lru_cache(maxsize=None)
def valid_guesses():
    """Every word a player may guess (guesses.txt plus every answer)."""
    return frozenset(load_words("guesses.txt")) | frozenset(answers())


def pick_daily_word(date):
    """Randomly pick the secret word for ``date`` (the same for everybody)."""
    return daily_rng(GAME_ID, date).choice(answers())


def evaluate_guess(guess, secret):
    """Compare ``guess`` with ``secret`` using the classic two-pass method.

    The first pass marks letters in exactly the right spot (green) and counts
    the secret letters that are left over. The second pass marks remaining
    letters as present (yellow) only while unmatched copies of that letter are
    still available, so repeated letters are coloured correctly.
    """
    guess = guess.lower()
    secret = secret.lower()
    result = [ABSENT] * len(guess)
    remaining = {}

    for i, (g, s) in enumerate(zip(guess, secret)):
        if g == s:
            result[i] = CORRECT
        else:
            remaining[s] = remaining.get(s, 0) + 1

    for i, g in enumerate(guess):
        if result[i] != CORRECT and remaining.get(g, 0) > 0:
            result[i] = PRESENT
            remaining[g] -= 1

    return result


def score_for_attempt(attempt):
    """Points for solving the word on the given (1-based) attempt."""
    return SCORES.get(attempt, 0)


def new_state(secret):
    return {"secret": secret, "guesses": [], "finished": False, "won": False, "score": 0}


def apply_guess(state, guess):
    """Apply a guess to a game state. Raises ``ValueError`` for bad guesses."""
    if state["finished"]:
        raise GameError("This game is already finished.")
    guess = (guess or "").strip().lower()
    if len(guess) != WORD_LENGTH or not guess.isalpha():
        raise GameError(f"Guesses must be {WORD_LENGTH} letters.")
    if guess not in valid_guesses():
        raise GameError("Not in the word list.")

    result = evaluate_guess(guess, state["secret"])
    state["guesses"].append({"word": guess, "result": result})
    attempts = len(state["guesses"])
    if guess == state["secret"]:
        state["finished"] = True
        state["won"] = True
        state["score"] = score_for_attempt(attempts)
    elif attempts >= MAX_ATTEMPTS:
        state["finished"] = True
    return state


def public_state(state):
    """The state that is safe to send to the browser (hides the secret)."""
    data = {
        "guesses": state["guesses"],
        "finished": state["finished"],
        "won": state["won"],
        "score": state["score"],
        "attempts_left": MAX_ATTEMPTS - len(state["guesses"]),
        "max_attempts": MAX_ATTEMPTS,
        "word_length": WORD_LENGTH,
    }
    if state["finished"]:
        data["answer"] = state["secret"]
    return data


def play_cli():  # pragma: no cover - interactive helper
    """Play a round of Henry-Wordle in the terminal."""
    secret = random.choice(answers())
    state = new_state(secret)
    colours = {CORRECT: "\033[42m", PRESENT: "\033[43m", ABSENT: "\033[47m"}
    print(f"Henry-Wordle! Guess the {WORD_LENGTH} letter word.")
    while not state["finished"]:
        remaining = MAX_ATTEMPTS - len(state["guesses"])
        guess = input(f"Guess ({remaining} left): ")
        try:
            apply_guess(state, guess)
        except GameError as error:
            print(error)
            continue
        last = state["guesses"][-1]
        print("".join(f"{colours[r]}\033[30m {c.upper()} \033[0m" for c, r in zip(last["word"], last["result"])))
    if state["won"]:
        print(f"You got it! {state['score']} points.")
    else:
        print(f"Out of guesses - the word was {secret.upper()}.")


if __name__ == "__main__":  # pragma: no cover
    play_cli()
