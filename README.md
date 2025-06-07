## 📄 README.md

# WAvideo Converter

WAvideo Converter is a lightweight macOS desktop application built with Electron that allows you to convert video files to WhatsApp-compatible formats (MP4, MOV, WebM). The app runs entirely on your device — no server, no internet connection needed.

---

## ✅ Features
- Convert video files to WhatsApp-compatible format
- Select output format (MP4, MOV, WebM)
- Shows progress bar, estimated time, and allows cancelling
- Saves to Downloads folder (or lets user choose destination)
- Finder shortcut to open the saved file's location
- Light/Dark theme toggle

---

## 🚀 Getting Started

### Prerequisites
- Node.js (v18+ recommended)
- MacOS with FFmpeg installed (`brew install ffmpeg`)

### Setup
```bash
git clone https://github.com/patrikbjorkenheim/wawideo.git
cd wawideo
npm install
```

### Run
```bash
npm start
```

### Build (for macOS DMG)
```bash
npm run make
```

---

## 📂 Folder Structure
```
├── index.html
├── main.js
├── preload.js
├── renderer.js
├── icon.icns
├── package.json
```

---

## ✍️ Author
Created by Patrik Björkenheim 🇫🇮

---

## 📜 License
MIT License

---

## 🗒 Changelog
See `CHANGELOG.md` for version history
