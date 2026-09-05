from segmenter import words_to_sentences


def test_splits_on_punctuation_and_preserves_timestamps():
    words = [
        {"word": " Hello", "start": 0.2, "end": 0.7},
        {"word": " world.", "start": 0.8, "end": 1.3},
        {"word": " This", "start": 1.5, "end": 1.8},
        {"word": " is", "start": 1.9, "end": 2.1},
        {"word": " TOEFL.", "start": 2.2, "end": 2.8},
    ]

    result = words_to_sentences(words)

    assert result == [
        {"id": 1, "start": 0.2, "end": 1.3, "text": "Hello world."},
        {"id": 2, "start": 1.5, "end": 2.8, "text": "This is TOEFL."},
    ]


def test_splits_on_long_pause():
    words = [
        {"word": " One", "start": 0.0, "end": 0.2},
        {"word": " short", "start": 0.3, "end": 0.5},
        {"word": " thought", "start": 0.6, "end": 0.9},
        {"word": " Another", "start": 2.0, "end": 2.4},
        {"word": " complete", "start": 2.5, "end": 2.9},
        {"word": " thought", "start": 3.0, "end": 3.4},
    ]

    result = words_to_sentences(words)

    assert len(result) == 2
    assert result[0]["end"] == 0.9
    assert result[1]["start"] == 2.0
