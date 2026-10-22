# FLASHPOP Studio

A browser-first photo editor and video preview workspace with a Y2K pastel interface.

## Features
- Photo upload and camera capture (front/rear camera switch), brightness, contrast, saturation, warmth, vignette and softening controls, preset looks, rotate/flip, crop presets, sticker overlays, text captions, PNG/JPG export, press-to-compare preview, and undo/redo edit history.
- On-device face landmarks with MediaPipe Face Landmarker to position blush, eye shadow, lipstick and highlights on detected facial points, with a relative-position fallback if the model cannot load.
- Video preview, playback speed, aspect-ratio presets and previewing a selected time range.
- Responsive desktop and mobile layouts.
- Photo edits and face landmark inference run locally in the browser; MediaPipe code/model are fetched from public CDNs on first use.
- Cloud AI is not connected yet: no cloud endpoint or API credentials exist in this repo. The current build does not upload photos to an AI service.

## Deploy to Cloudflare Workers
This repository uses Workers Static Assets.

- Build command: leave blank.
- Deploy command: `npx wrangler deploy`
- Preview command: `npx wrangler dev` (optional).

The `wrangler.jsonc` points to the `public/` directory.

## Limitations
This is an early MVP, not a full Hypic/CapCut replacement. Video trimming is preview-only; it does not render a trimmed file or export MP4. User accounts, persistent cloud libraries, audio tracks, layers, transitions, rendered MP4 export and cloud AI retouch are not implemented. Google Fonts requires an internet connection; the interface otherwise uses local files.

## Local preview
Run a static server from the repository root, for example `python -m http.server 8000`, then open `http://localhost:8000`.
