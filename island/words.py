"""Loading of the word list files in ``island/data``."""

import os
from functools import lru_cache

DATA_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "data")


@lru_cache(maxsize=None)
def load_words(filename):
    """Return the lower-case words (one per line) from a data file as a tuple."""
    with open(os.path.join(DATA_DIR, filename), encoding="utf-8") as handle:
        words = (line.strip().lower() for line in handle)
        return tuple(word for word in words if word and word.isalpha())
