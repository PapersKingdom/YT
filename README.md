# YtPulse

YtPulse is a local YouTube downloader powered by `yt-dlp` with a Tailwind CSS UI. It runs without external APIs and supports advanced features like format selection, audio-only downloads, and subtitles.

## Features
- Format picker with resolution/codec details
- Audio extraction (MP3, M4A, WAV, FLAC)
- Subtitle selection
- Playlist-aware downloads
- Modern Tailwind-based interface

## Setup

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python app.py
```

Then open `http://localhost:5000`.

## Notes
- Requires FFmpeg for audio extraction.
- `yt-dlp` supports many video platforms beyond YouTube.
