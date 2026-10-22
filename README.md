# FLASHPOP Studio — browser-first starter

Responsive starter project for a photo editor plus an extensible video-editor foundation. It uses plain HTML, CSS and JavaScript modules; no build step and no application server are required for image editing.

## Project structure

```text
src/
  index.html
  css/
    styles.css
  js/
    app.js             # UI wiring and mode switching
    photo-editor.js    # Canvas-based photo processing and PNG export
    video-editor.js    # Video preview, clip list and project settings
```

## Run locally

Because JavaScript modules are used, open the folder with a local static server rather than double-clicking `index.html` (browser security rules can block modules on `file://`). For example, if Python is installed:

```bash
cd src
python -m http.server 8000
```

Then open `http://localhost:8000`.

You can also publish the `src` directory as a static site on a free static hosting tier. This starter itself does not require a backend, account, paid API or video-processing server.

## Implemented in this starter

- Responsive desktop and mobile layout, separate Photo and Video modes.
- Load an image, adjust brightness/contrast/saturation/warmth, apply quick looks, rotate, flip, and export PNG.
- Load local video files, preview a selected clip, list/remove clips, inspect duration metadata, set aspect ratio and playback speed.
- Object URLs are revoked when clips are removed or cleared.

## Video roadmap (not yet implemented)

1. Non-destructive in/out points and a real seekable timeline.
2. Multiple tracks for video, overlays, text, and audio.
3. Transitions and title animations.
4. Local rendering/export via WebCodecs where supported, with FFmpeg.wasm as an optional compatibility path. Benchmark memory and browser support before enabling long/high-resolution exports.
5. Save project metadata locally in IndexedDB; media files remain local unless the user explicitly exports or uploads them.

**Important:** the current Video mode is a preview and clip-list foundation, not a finished CapCut replacement. It does not yet trim/merge media or export an edited MP4. Advanced AI tools (background removal, object removal, generative edits) are separate future work and should not be advertised as implemented.

## Notes

- Image processing is performed in the browser with Canvas.
- The photo editor currently exports PNG. JPEG/WebP quality controls can be added later.
- Large images and videos can use significant memory. Add file-size warnings and more testing before public launch.
- Google Fonts is optional; remove the `@import` in `styles.css` for a fully offline/no-external-request setup.
