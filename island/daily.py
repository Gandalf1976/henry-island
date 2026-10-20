"""Helpers for working out "today" and for picking the same random content
for every player on a given day."""

import os
import random
import time
from datetime import datetime
from zoneinfo import ZoneInfo


def now():
    """Current time as a UNIX timestamp (patched in tests)."""
    return time.time()


def timezone_name():
    return os.environ.get("ISLAND_TIMEZONE", "Europe/London")


def today():
    """Today's date (ISO format) in the island's timezone."""
    return datetime.fromtimestamp(now(), ZoneInfo(timezone_name())).date().isoformat()


def daily_rng(game, date):
    """A random generator that gives every player the same puzzle for a day.

    ``ISLAND_SECRET`` is mixed into the seed so the daily puzzles cannot be
    predicted by somebody reading the source code.
    """
    secret = os.environ.get("ISLAND_SECRET", "")
    return random.Random(f"henry-island:{secret}:{game}:{date}")


class GameError(ValueError):
    """A friendly message for the player, e.g. "Not in the word list."."""
