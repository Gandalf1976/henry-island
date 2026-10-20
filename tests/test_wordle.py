import pytest

from island import wordle
from island.words import load_words


def test_word_lists_are_five_letters():
    assert all(len(w) == 5 for w in load_words("answers.txt"))
    assert all(len(w) == 5 for w in load_words("guesses.txt"))
    assert set(wordle.answers()) <= wordle.valid_guesses()
    assert len(wordle.valid_guesses()) > len(wordle.answers())


@pytest.mark.parametrize(
    "guess, secret, expected",
    [
        ("crane", "crane", ["correct"] * 5),
        ("plumb", "crane", ["absent"] * 5),
        ("nacre", "crane", ["present", "present", "present", "present", "correct"]),
        # Repeated letters: only as many yellows/greens as the secret has.
        ("speed", "abide", ["absent", "absent", "present", "absent", "present"]),
        ("eerie", "theme", ["present", "absent", "absent", "absent", "correct"]),
        ("lolly", "hello", ["absent", "present", "correct", "correct", "absent"]),
    ],
)
def test_evaluate_guess_two_pass(guess, secret, expected):
    assert wordle.evaluate_guess(guess, secret) == expected


def test_scores_by_attempt():
    assert [wordle.score_for_attempt(n) for n in range(1, 8)] == [10, 5, 4, 3, 2, 1, 0]


def test_daily_word_is_stable_and_changes():
    assert wordle.pick_daily_word("2025-12-01") == wordle.pick_daily_word("2025-12-01")
    words = {wordle.pick_daily_word(f"2025-12-{d:02d}") for d in range(1, 29)}
    assert len(words) > 20
    assert words <= set(wordle.answers())


def test_game_loop_win_on_third_try():
    state = wordle.new_state("crane")
    wordle.apply_guess(state, "plumb")
    wordle.apply_guess(state, "stone")
    wordle.apply_guess(state, "CRANE")
    assert state["finished"] and state["won"] and state["score"] == 4


def test_game_loop_loses_after_six():
    state = wordle.new_state("crane")
    for _ in range(6):
        wordle.apply_guess(state, "plumb")
    assert state["finished"] and not state["won"] and state["score"] == 0
    with pytest.raises(ValueError):
        wordle.apply_guess(state, "crane")


def test_invalid_guesses_do_not_use_attempts():
    state = wordle.new_state("crane")
    for bad in ["cran", "cranes", "zzzzz", "cr4ne", ""]:
        with pytest.raises(ValueError):
            wordle.apply_guess(state, bad)
    assert state["guesses"] == []


def test_public_state_hides_secret_until_finished():
    state = wordle.new_state("crane")
    assert "answer" not in wordle.public_state(state)
    assert "crane" not in str(wordle.public_state(state))
    wordle.apply_guess(state, "crane")
    assert wordle.public_state(state)["answer"] == "crane"
