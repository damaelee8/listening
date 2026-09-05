"""Convert faster-whisper word timestamps into practice-friendly sentences."""

from __future__ import annotations

import re
from typing import Any, Iterable


END_PUNCTUATION = re.compile(r"[.!?][\"')\]]*$")


def _finish(words: list[dict[str, Any]], sentence_id: int) -> dict[str, Any]:
    text = "".join(word["word"] for word in words).strip()
    return {
        "id": sentence_id,
        "start": round(float(words[0]["start"]), 2),
        "end": round(float(words[-1]["end"]), 2),
        "text": text,
    }


def words_to_sentences(
    words: Iterable[dict[str, Any]],
    *,
    max_words: int = 25,
    pause_seconds: float = 0.8,
) -> list[dict[str, Any]]:
    """Split timestamped words using punctuation, pauses, and a length guardrail."""
    source = [word for word in words if word.get("word", "").strip()]
    if not source:
        return []

    sentences: list[dict[str, Any]] = []
    current: list[dict[str, Any]] = []

    for index, word in enumerate(source):
        current.append(word)
        next_word = source[index + 1] if index + 1 < len(source) else None
        pause = float(next_word["start"]) - float(word["end"]) if next_word else 0
        has_ending = bool(END_PUNCTUATION.search(str(word["word"])))
        should_split = has_ending or len(current) >= max_words or pause >= pause_seconds or next_word is None

        # Avoid tiny fragments unless this is the final word.
        if should_split and (has_ending or len(current) >= 3 or next_word is None):
            sentences.append(_finish(current, len(sentences) + 1))
            current = []

    if current:
        sentences.append(_finish(current, len(sentences) + 1))

    return sentences
