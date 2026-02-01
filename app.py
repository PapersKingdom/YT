from __future__ import annotations

import os
import shutil
import tempfile
from pathlib import Path
from typing import Any

from flask import Flask, jsonify, render_template, request, send_file
from yt_dlp import YoutubeDL

app = Flask(__name__)

DOWNLOAD_DIR = Path(os.environ.get("YT_DOWNLOAD_DIR", tempfile.gettempdir()))


def _extract_info(url: str) -> dict[str, Any]:
    ydl_opts = {
        "skip_download": True,
        "quiet": True,
        "no_warnings": True,
        "nocheckcertificate": True,
    }
    with YoutubeDL(ydl_opts) as ydl:
        return ydl.extract_info(url, download=False)


@app.get("/")
def index() -> str:
    return render_template("index.html")


@app.post("/api/info")
def api_info():
    payload = request.get_json(silent=True) or {}
    url = payload.get("url")
    if not url:
        return jsonify({"error": "URL is required."}), 400

    info = _extract_info(url)
    return jsonify(
        {
            "title": info.get("title"),
            "uploader": info.get("uploader"),
            "duration": info.get("duration"),
            "thumbnail": info.get("thumbnail"),
            "webpage_url": info.get("webpage_url"),
            "formats": info.get("formats", []),
        }
    )


@app.post("/api/formats")
def api_formats():
    payload = request.get_json(silent=True) or {}
    url = payload.get("url")
    if not url:
        return jsonify({"error": "URL is required."}), 400

    info = _extract_info(url)
    formats = info.get("formats", [])
    simplified = []
    for entry in formats:
        simplified.append(
            {
                "format_id": entry.get("format_id"),
                "format_note": entry.get("format_note"),
                "ext": entry.get("ext"),
                "resolution": entry.get("resolution"),
                "fps": entry.get("fps"),
                "filesize": entry.get("filesize"),
                "tbr": entry.get("tbr"),
                "acodec": entry.get("acodec"),
                "vcodec": entry.get("vcodec"),
            }
        )

    return jsonify(
        {
            "title": info.get("title"),
            "thumbnail": info.get("thumbnail"),
            "duration": info.get("duration"),
            "uploader": info.get("uploader"),
            "formats": simplified,
        }
    )


@app.post("/api/download")
def api_download():
    payload = request.get_json(silent=True) or {}
    url = payload.get("url")
    if not url:
        return jsonify({"error": "URL is required."}), 400

    format_id = payload.get("format_id")
    extract_audio = payload.get("extract_audio", False)
    audio_format = payload.get("audio_format", "mp3")
    subtitle_langs = payload.get("subtitle_langs") or []

    temp_dir = Path(tempfile.mkdtemp(dir=DOWNLOAD_DIR))
    outtmpl = str(temp_dir / "%(title)s.%(ext)s")

    ydl_opts = {
        "outtmpl": outtmpl,
        "format": format_id or "bestvideo+bestaudio/best",
        "noplaylist": False,
        "writesubtitles": bool(subtitle_langs),
        "subtitleslangs": subtitle_langs,
        "quiet": True,
        "no_warnings": True,
    }

    if extract_audio:
        ydl_opts.update(
            {
                "format": "bestaudio/best",
                "postprocessors": [
                    {
                        "key": "FFmpegExtractAudio",
                        "preferredcodec": audio_format,
                    }
                ],
            }
        )

    with YoutubeDL(ydl_opts) as ydl:
        ydl.extract_info(url, download=True)

    downloaded_files = list(temp_dir.glob("*"))
    if not downloaded_files:
        shutil.rmtree(temp_dir, ignore_errors=True)
        return jsonify({"error": "Download failed."}), 500

    primary_file = max(downloaded_files, key=lambda item: item.stat().st_size)

    response = send_file(primary_file, as_attachment=True)

    @response.call_on_close
    def _cleanup() -> None:
        shutil.rmtree(temp_dir, ignore_errors=True)

    return response


@app.get("/health")
def health():
    return jsonify({"status": "ok"})


if __name__ == "__main__":
    app.run(debug=True, host="0.0.0.0", port=5000)
