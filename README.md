# WAvideo Web

WAvideo is now a polished, browser-based WhatsApp video optimizer. Drop any video file, choose a compression profile, and get an H.264/AAC MP4 that's ready to share on WhatsApp in seconds. Everything runs locally via FFmpeg WebAssembly &mdash; your media never leaves the page.

## ✨ Highlights

- **Professional UI** – Gradient glassmorphism interface with live progress, metadata, and result preview.
- **WhatsApp-safe presets** – Tuned CRF/bitrate profiles, optional 30s status trim, automatic 720p/30fps output by default.
- **On-device processing** – Powered by [`@ffmpeg/ffmpeg`](https://github.com/ffmpegwasm/ffmpeg.wasm). No servers, no uploads.
- **Smart metadata** – Detects original resolution, duration, and file size before conversion.
- **Instant download** – Generates a WhatsApp-friendly filename and warns when files exceed the 16&nbsp;MB share limit.

## 🚀 Get Started

1. Clone or download this repository.
2. Open `index.html` directly in a modern Chromium, Safari, or Firefox browser **or** run a small static server:

   ```bash
   # using npm
   npx serve

   # or with Python 3
   python -m http.server
   ```

3. Drop any video into the converter, adjust the options, and hit **Convert for WhatsApp**.

> ℹ️ The first conversion needs to download the FFmpeg WebAssembly core (~9&nbsp;MB). Subsequent conversions reuse the module and are instant.

## ⚙️ Conversion Pipeline

- Video codec: H.264 (`libx264`, Main@L3.1) with CRF presets tuned for WhatsApp.
- Audio codec: AAC, 96 kbps, 48 kHz stereo.
- Optional trim: Force a 30-second cut for WhatsApp Status clips.
- Resolution guard: Longest edge capped between 720&nbsp;px and 1920&nbsp;px (configurable).
- Packaging: `+faststart` for instant playback and metadata stripped for privacy.

## 🧩 Project Structure

```
├── index.html    # Application shell and UI markup
├── styles.css    # Gradient glassmorphism design system
├── app.js        # FFmpeg.wasm orchestration and UI logic
└── icon.icns     # Legacy app icon (optional branding)
```

## 🧪 Browser Support

- Works best on the latest Chrome, Edge, Brave, Safari, and Firefox.
- Mobile browsers handle uploads up to the available memory budget (large 4K files may struggle on low-RAM devices).
- No additional build step required. Just serve the folder or deploy it to any static host.

## ⚠️ Limitations

- FFmpeg.wasm runs client-side, so conversions depend on your device's CPU and memory.
- Very large or long videos may exceed WhatsApp's 16&nbsp;MB limit even after compression—try the **Compact** preset or trim the clip.
- Requires network access the first time to download the FFmpeg core (the app falls back from jsDelivr to unpkg automatically if one CDN is blocked).

## 🙌 Credits

Originally created by Patrik Björkenheim. Refreshed for the web with FFmpeg.wasm and a new UI.

## 📄 License

MIT
