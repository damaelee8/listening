"""Local transcription companion for the TOEFL listening web app."""

from __future__ import annotations

import os
import tempfile
from pathlib import Path

from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from faster_whisper import WhisperModel

from segmenter import words_to_sentences


MODEL_SIZE = os.getenv("WHISPER_MODEL", "medium.en")
DEVICE = os.getenv("WHISPER_DEVICE", "auto")
COMPUTE_TYPE = os.getenv("WHISPER_COMPUTE_TYPE", "int8")

app = FastAPI(title="TOEFL Listening Transcriber", version="0.1.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=False,
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)

_model: WhisperModel | None = None


def get_model() -> WhisperModel:
    global _model
    if _model is None:
        _model = WhisperModel(MODEL_SIZE, device=DEVICE, compute_type=COMPUTE_TYPE)
    return _model


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok", "model": MODEL_SIZE}


@app.post("/transcribe")
async def transcribe(file: UploadFile = File(...)) -> dict[str, object]:
    suffix = Path(file.filename or "audio.mp3").suffix or ".mp3"
    temp_path: Path | None = None
    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as target:
            temp_path = Path(target.name)
            while chunk := await file.read(1024 * 1024):
                target.write(chunk)

        segments, info = get_model().transcribe(
            str(temp_path),
            language="en",
            beam_size=5,
            word_timestamps=True,
            vad_filter=True,
            condition_on_previous_text=True,
        )

        words: list[dict[str, object]] = []
        full_text: list[str] = []
        for segment in segments:
            full_text.append(segment.text.strip())
            for word in segment.words or []:
                words.append({"word": word.word, "start": word.start, "end": word.end})

        sentences = words_to_sentences(words)
        if not sentences:
            raise HTTPException(status_code=422, detail="没有识别到清晰的英文语音")

        return {
            "language": info.language,
            "duration": round(float(info.duration), 2),
            "text": " ".join(full_text),
            "sentences": sentences,
        }
    except HTTPException:
        raise
    except Exception as error:
        raise HTTPException(status_code=500, detail=f"转写失败：{error}") from error
    finally:
        if temp_path and temp_path.exists():
            temp_path.unlink(missing_ok=True)
