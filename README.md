# FLASHPOP Studio

A browser-first photo editor and video preview workspace with a Y2K pastel interface.

## Features
- Photo upload, brightness, contrast, saturation, warmth, vignette, preset looks, rotate/flip, text captions, PNG/JPG export, and press-to-compare preview.
- Video preview, playback speed, aspect-ratio presets and previewing a selected time range.
- Responsive desktop and mobile layouts.
- Photo editing runs locally in the browser.

## Deploy to Cloudflare Workers
This repository uses Workers Static Assets.

- Build command: leave blank.
- Deploy command: `npx wrangler deploy`
- Preview command: `npx wrangler dev` (optional).

The `wrangler.jsonc` points to the `public/` directory.

## Limitations
This is an early MVP, not a full Hypic/CapCut replacement. Video trimming is preview-only; it does not render a trimmed file or export MP4. User accounts, persistent cloud libraries, audio tracks, layers, transitions and AI effects are not implemented. Google Fonts requires an internet connection; the interface otherwise uses local files.

## Local preview
Run a static server from the repository root, for example `python -m http.server 8000`, then open `http://localhost:8000`.
