# ⚡ ViralClips AI - Turn Long YouTube Videos into Viral Shorts & Reels

AI-powered tool that automatically extracts high-retention viral moments from long-form YouTube videos, generates Hormozi-style animated captions, crops video to 9:16 vertical ratio, and renders downloadable MP4 clips directly on your local machine.

---

## 🚀 Quick Start (Run Locally)

### 1. Prerequisites
Ensure you have Node.js (v18+) and the media processing tools installed on your computer:

#### macOS (via Homebrew):
```bash
brew install ffmpeg yt-dlp
```

#### Ubuntu / Debian:
```bash
sudo apt update
sudo apt install -y ffmpeg python3-pip
pip install yt-dlp --break-system-packages
```

#### Windows:
- Install FFmpeg: `winget install Gyan.FFmpeg`
- Install yt-dlp: `winget install yt-dlp`

---

### 2. Clone & Install

```bash
git clone https://github.com/nittinbhagaaat/shorts.git
cd shorts
npm install
```

---

### 3. Run the Development Server

```bash
npm run dev
```

Open **[http://localhost:3000](http://localhost:3000)** in your browser.

---

## ⚙️ Configuration (In-App Settings)

On the first launch, click **Settings** (`/settings`) to configure your local setup:

1. **AI Model Provider**: Choose Groq (Free / Fast Llama 3.3), Google Gemini, Mistral AI, or OpenAI GPT-4o and paste your API Key.
2. **Local MongoDB URI**:
   - Local: `mongodb://localhost:27017/shorts`
   - Cloud: MongoDB Atlas cluster URI (`mongodb+srv://...`)
3. **Local Binaries**:
   - FFmpeg path (`ffmpeg` or `/opt/homebrew/bin/ffmpeg`)
   - yt-dlp path (`yt-dlp` or `/opt/homebrew/bin/yt-dlp`)

Click **Save Settings**, and you're ready to create viral shorts!

---

## ✨ Features

- 🎯 **AI Moment Detection**: Finds viral hooks, conversational climaxes, and key insights.
- 💬 **Hormozi-Style Captions**: Word-by-word highlighted subtitles with custom styling (Hormozi, Minimalist, Classic).
- 🇮🇳 **Hindi to Hinglish Transliteration**: Automatically converts Devanagari Hindi captions to Romanized Hinglish script.
- 📐 **Smart Video Layouts**: Outputs 9:16 Vertical Shorts/Reels, 16:9 Landscape, or both.
- 🔒 **100% Private & Local**: AI keys and database strings are stored locally in your browser/workspace.
