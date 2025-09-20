# FFmpeg WASM runtime

This directory is reserved for the browser build of FFmpeg used by the renderer.

The following files from `@ffmpeg/ffmpeg@0.12.4` and its `@ffmpeg/core-st` dependency should live alongside this README:

- `ffmpeg.min.js`
- `ffmpeg-core.js`
- `ffmpeg-core.wasm`
- `ffmpeg-core.worker.js`

When network access is available you can populate the directory with:

```bash
npm install --no-save @ffmpeg/ffmpeg@0.12.4 @ffmpeg/core-st@0.12.4
cp node_modules/@ffmpeg/ffmpeg/dist/ffmpeg.min.js vendor/ffmpeg/
cp node_modules/@ffmpeg/core-st/dist/ffmpeg-core.* vendor/ffmpeg/
```

The runtime loader will first try these local copies and fall back to the CDN builds if they are missing.
