# 🎬 clip.studio

<p align="center">
  <img src="public/logo.png" alt="clip.studio logo" width="100" height="100" style="border-radius: 20px;" />
</p>

<p align="center">
  <strong>Open-Source AI Viral Shorts & Subtitle Studio</strong><br />
  Transform long-form YouTube videos into high-retention vertical Shorts (35–40s complete scenes) with frame-synchronized Alex Hormozi animated captions, intelligent scene boundary detection, and local-first privacy.
</p>

---

## 🌟 Key Features

- **🧠 Complete Scene & Narrative Extraction**: Extracts complete, standalone 35–40s conversational arcs (full jokes with setups & punchlines, complete educational lessons, and full story scenes) without cutting dialogues mid-sentence.
- **💬 Frame-Synced Animated Subtitles**:
  - **Alex Hormozi Style**: Dynamic word-by-word active yellow highlights with thick outlines.
  - **Minimalist**: Clean, sleek subtitle lower-third box.
  - **Classic**: Traditional centered bordered captions.
  - **Clean Video Mode**: Option to render pure, cropped video with zero on-screen captions.
- **🌐 Multilingual & Hinglish Translation**: Automatically transcribes Hindi audio into Romanized **Hinglish** (e.g. *"Namaste Dosto"*) or preserves original Devanagari script.
- **⚡ Multi-Model AI Engine**: Support for **Groq** (ultra-fast LLaMA & GPT-OSS), **Mistral AI**, **Google Gemini**, and **OpenAI**.
- **🔒 Local-First Privacy**: All API keys, MongoDB connection strings, and binary paths are stored directly in your browser's `localStorage`. No credentials are leaked or saved on the server.
- **📐 Dual Aspect Ratio Export**: Generate **9:16 Vertical** Shorts/Reels/TikToks (with Left, Center, or Right framing focus) or **16:9 Horizontal** widescreen videos.

---

## 📋 Table of Contents

1. [Prerequisites](#-1-prerequisites)
2. [Installation](#-2-installation)
3. [Installing Video Binaries (FFmpeg & yt-dlp)](#-3-installing-video-binaries-ffmpeg--yt-dlp)
4. [Setting Up MongoDB](#-4-setting-up-mongodb)
5. [Getting AI API Keys](#-5-getting-ai-api-keys)
6. [Running the Application](#-6-running-the-application)
7. [In-App Settings & Diagnostic Testing](#-7-in-app-settings--diagnostic-testing)
8. [Troubleshooting & FAQ](#-8-troubleshooting--faq)

---

## 💻 1. Prerequisites

Before installing, make sure you have the following installed on your machine:

- **Node.js**: `v18.17.0` or later (Node.js 20+ recommended). [Download Node.js](https://nodejs.org/)
- **npm**, **yarn**, **pnpm**, or **bun** package manager.
- **Git**: [Download Git](https://git-scm.com/)

---

## 🚀 2. Installation

Clone the repository and install project dependencies:

```bash
# 1. Clone the repository
git clone https://github.com/nittinbhagaaat/shorts.git

# 2. Navigate into the project folder
cd shorts

# 3. Install dependencies
npm install
```

---

## 🛠️ 3. Installing Video Binaries (FFmpeg & yt-dlp)

`clip.studio` relies on two command-line tools:
1. **FFmpeg** (with `libass` enabled) to crop 9:16 videos and burn animated subtitle styles.
2. **yt-dlp** to download high-resolution YouTube video sections and transcripts.

### A. Install FFmpeg (with `libass` Subtitle Support)

> [!IMPORTANT]
> To burn animated subtitles onto videos, FFmpeg **must** be compiled with `libass` support.

#### macOS (via Homebrew):
```bash
# Install ffmpeg-full which includes libass and all subtitle filters
brew tap homebrew-ffmpeg/ffmpeg
brew install homebrew-ffmpeg/ffmpeg/ffmpeg-full

# Binary path will be:
# /opt/homebrew/opt/ffmpeg-full/bin/ffmpeg (Apple Silicon M1/M2/M3/M4)
# /usr/local/opt/ffmpeg-full/bin/ffmpeg (Intel Mac)
```

#### Ubuntu / Debian Linux:
```bash
sudo apt update
sudo apt install -y ffmpeg libass-dev
```

#### Windows:
- **Using Chocolatey**:
  ```powershell
  choco install ffmpeg-full
  ```
- **Using Scoop**:
  ```powershell
  scoop install ffmpeg
  ```
- **Manual Download**: Download the `full` build from [Gyan.dev FFmpeg Builds](https://www.gyan.dev/ffmpeg/builds/) and add its `bin` directory to your system `PATH`.

---

### B. Install yt-dlp

#### macOS (via Homebrew):
```bash
brew install yt-dlp
```

#### Ubuntu / Debian Linux:
```bash
sudo wget https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -O /usr/local/bin/yt-dlp
sudo chmod a+rx /usr/local/bin/yt-dlp
```

#### Windows:
```powershell
winget install yt-dlp
# or
choco install yt-dlp
```

#### Via Python (Cross-Platform):
```bash
pip install -U yt-dlp
```

---

## 🍃 4. Setting Up MongoDB

`clip.studio` uses MongoDB to store workspaces, video metadata, and extracted clip timestamps. You can use either a **Local MongoDB instance** or a **Free Cloud MongoDB Atlas cluster**.

---

### Option A: Local MongoDB (Recommended for Offline Development)

#### macOS (via Homebrew):
```bash
brew tap mongodb/brew
brew install mongodb-community
brew services start mongodb-community
```
Your local connection URI is:
```
mongodb://localhost:27017/shorts
```

#### Ubuntu / Debian:
```bash
sudo apt install -y mongodb-org
sudo systemctl start mongod
sudo systemctl enable mongod
```

#### Windows:
Download and run the MSI installer from [MongoDB Community Server](https://www.mongodb.com/try/download/community).

---

### Option B: MongoDB Atlas (Free Cloud Database)

If you prefer a hosted database without running MongoDB locally:

1. **Create an Account**: Sign up at [MongoDB Atlas](https://www.mongodb.com/cloud/atlas/register).
2. **Create a Free Cluster**:
   - Choose the **M0 Free Tier** (Shared).
   - Select your preferred cloud provider and region.
   - Click **Create Deployment**.
3. **Set Up Security & Credentials**:
   - Under **Database Access** -> Click **Add New Database User**.
   - Choose **Password** authentication, enter a username and password (e.g. `admin` and a strong password).
   - Under **Network Access** -> Click **Add IP Address** -> Select **Allow Access from Anywhere** (`0.0.0.0/0`) or enter your current IP.
4. **Copy Connection String**:
   - Under **Clusters** -> Click **Connect** -> **Drivers** -> Select **Node.js**.
   - Copy your connection string URI:
     ```
     mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/shorts?retryWrites=true&w=majority
     ```
   - Replace `<username>` and `<password>` with your database credentials.

---

## 🔑 5. Getting AI API Keys

You only need **at least one** AI provider to curate clips and generate Hinglish translations. You can configure multiple providers and switch between them in Settings.

| Provider | Best For | Free Tier Available? | Get API Key |
| :--- | :--- | :--- | :--- |
| **Groq** | ⚡ Ultra-fast LLaMA & GPT-OSS | **Yes (Free Generous Tier)** | [Groq Console](https://console.groq.com/keys) |
| **Mistral AI** | 🎯 Default balanced model | **Yes (Experiment / Free)** | [Mistral AI Console](https://console.mistral.ai/api-keys/) |
| **Google Gemini** | 🧠 Large context & multi-language | **Yes (Google AI Studio Free Tier)** | [Google AI Studio](https://aistudio.google.com/app/apikey) |
| **OpenAI** | 🏆 High precision (GPT-4o mini) | Paid (Pay-as-you-go) | [OpenAI Platform](https://platform.openai.com/api-keys) |

---

### Step-by-Step API Key Instructions

#### 1. Groq (Recommended - Ultra Fast):
1. Sign up / Log in to [Groq Console](https://console.groq.com/keys).
2. Click **Create API Key**.
3. Copy the key (starts with `gsk_...`).
4. Supported free models: `openai/gpt-oss-120b`, `llama-3.3-70b-versatile`, `qwen/qwen3.6-27b`, `groq/compound`.

#### 2. Mistral AI:
1. Sign up at [Mistral AI Console](https://console.mistral.ai/api-keys/).
2. Navigate to **API Keys** -> **Create new key**.
3. Copy the key (starts with `...`).

#### 3. Google Gemini:
1. Go to [Google AI Studio](https://aistudio.google.com/app/apikey).
2. Click **Create API Key** and select a Google Cloud project.
3. Copy the generated key (starts with `AIzaSy...`).

#### 4. OpenAI:
1. Log in to [OpenAI Platform](https://platform.openai.com/api-keys).
2. Navigate to **API Keys** -> **Create new secret key**.
3. Copy your key (starts with `sk-...`).

---

## 🏃 6. Running the Application

Start the local development server:

```bash
npm run dev
```

Open your browser and navigate to:
```
http://localhost:3000
```

---

## ⚙️ 7. In-App Settings & Diagnostic Testing

`clip.studio` features a dedicated **Settings Page** (`http://localhost:3000/settings`) where all configurations are managed client-side:

<p align="center">
  <img src="public/logo.png" width="60" height="60" />
</p>

1. **Select Active AI Provider**: Choose your preferred provider (Groq, Mistral, Gemini, or OpenAI) and paste your API key.
2. **Select / Type AI Model**: Select from the dropdown or enter any custom model identifier (e.g. `openai/gpt-oss-120b`, `llama-3.3-70b-versatile`).
3. **Verify FFmpeg & yt-dlp Paths**: Click the **Test FFmpeg** and **Test yt-dlp** diagnostic buttons to ensure the binaries are detected and functional.
4. **Verify MongoDB**: Paste your MongoDB URI and click **Test DB Connection** to ensure database connectivity.
5. **Configure Subtitle Default**: Set whether new clips default to **With Subtitles** or **Clean Video**.
6. **Save Settings**: Click **Save Settings** to save all tokens to your browser's `localStorage`.

---

## ❓ 8. Troubleshooting & FAQ

### Q: Subtitles are not appearing on rendered videos
- Make sure you are using **FFmpeg with `libass` enabled**.
- On macOS, install `ffmpeg-full` via `brew install homebrew-ffmpeg/ffmpeg/ffmpeg-full`.
- In the clip workspace customizer, ensure the **Subtitle Mode** is set to **💬 With Subtitles**.

### Q: yt-dlp download is failing or timing out
- Make sure `yt-dlp` is up to date:
  ```bash
  yt-dlp -U
  ```
- Test yt-dlp directly on `/settings` using the **Test yt-dlp** button.

### Q: MongoDB connection failed (MongooseServerSelectionError)
- **If using local MongoDB**: Ensure the service is running (`brew services start mongodb-community` or `sudo systemctl start mongod`).
- **If using MongoDB Atlas**: Ensure your IP address is whitelisted under **Network Access** (`0.0.0.0/0` allows connections from anywhere).

### Q: Hindi / Devanagari subtitles show boxes or missing characters
- `clip.studio` automatically formats ASS subtitle styles with `Arial Unicode MS` / `Devanagari MT`, ensuring proper glyph rendering for Hindi, Hinglish, and English scripts.

---

## 📄 License

This project is licensed under the **MIT License**. Feel free to use, modify, and distribute it for personal and commercial video production.

---

<p align="center">
  Made with ❤️ by the <strong>clip.studio</strong> open source community.
</p>
