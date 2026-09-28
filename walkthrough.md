# YouTube Shorts Generator Walkthrough

We have upgraded the YouTube Shorts Generator application with studio-grade video editing capabilities, AI active speaker camera tracking, 10 viral subtitle styles, custom overlay text with opacity control, and flexible Hinglish/English subtitles!

---

## 🚀 Key Improvements & New Features

### 1. 🎯 Improved Viral Clipping & Clip Count Selector (Max: 20)
- **Strict Relevance Filter:** The AI clipping engine in `lib/ai.js` now strictly filters out video intros, sponsor plugs, subscribe prompts, and transition banter. It prioritizes moments with an irresistible 3-second hook, high informational or comedic value, and a complete conversational payoff (joke punchline, key takeaway, or debate conclusion).
- **User Clip Count Selector:** When pasting a YouTube link on the homepage (`app/page.js`), users can choose exactly how many clips to generate (between 1 and 20 clips) using an interactive slider and quick preset chips (`1`, `3`, `5`, `10`, `15`, `20`).
- **Viral Scoring:** Every clip is assigned a viral retention score (1-100) and ranked so only the highest-performing moments are generated.

### 2. 🎥 AI Active Speaker Auto-Framing (Camera Follows Person)
- **Smart Camera Centering:** Implemented in `scripts/auto_framing.py` using PyAV and a mobile SSDLite neural detector running on PyTorch.
- **Dynamic 9:16 Auto-Tracking:** Analyzes the horizontal position of the speaker/face across video frames, applies exponential moving average (EMA) smoothing to eliminate camera jitter, and constructs a cinematic FFmpeg camera panning filter to keep the speaking person centered in the 9:16 vertical crop.
- **Framing Options:**
  - `AI Active Speaker`: Smart camera that dynamically tracks the person.
  - `Center Crop`: Fixed center 9:16 framing.
  - `Left Focus`: Fixed left-third framing.
  - `Right Focus`: Fixed right-third framing.

### 3. ✨ 10 Diverse Viral Caption Typography Styles
Available in both the interactive live video preview and the burned-in ASS subtitle rendering:
1. **Hormozi Pop (`hormozi`):** Bold uppercase white text with electric bright yellow active word highlights and 5px black outline.
2. **MrBeast Bouncy (`mrbeast`):** Ultra-bold yellow text with energetic lime-green active punch highlights and a 6px comic outline.
3. **Cyberpunk Neon (`neon`):** Electric glowing cyan text with luminous magenta/purple drop aura.
4. **Minimalist Clean (`minimalist`):** Elegant modern sans-serif inside a semi-transparent dark rounded pill backdrop.
5. **Classic Subtitle (`classic`):** Timeless crisp white cinema/broadcast subtitles with clean drop shadow.
6. **Karaoke Fire (`karaoke`):** Active word ignites into fiery flame-orange with glowing illumination.
7. **Retro VHS 90s (`retro`):** Monospace CRT amber-yellow typography with authentic 90s video shadow.
8. **Cinematic Serif (`cinematic`):** Sophisticated editorial Georgia/Playfair serif in soft ivory cream.
9. **Red Badge (`bold_badge`):** High-urgency solid crimson red banner badge with bold white text.
10. **Pop Comic (`comic`):** Playful banana-yellow comic display font with heavy 6px cartoon stroke.

### 4. 📍 Full Caption Positioning & Alignment
- **Vertical Presets & Slider:** Quick 1-click positioning for **Top** (15%), **Upper** (30%), **Center** (50%), **Lower Third** (72% - recommended for Shorts/Reels), and **Bottom** (86%), with a precision 10%–90% Y-axis slider.
- **Horizontal Alignment:** Align subtitles to **Left**, **Center**, or **Right**.
- **1:1 Preview Parity:** Live HTML preview and burned FFmpeg ASS subtitles use exact matching pixel margin coordinates.

### 5. ✏️ Video Editor: Custom Text Overlay Studio
- **Overlay Text Input:** Add hook titles, episode numbers, or social handles (e.g. `WAIT TILL THE END 😱`, `PART 1 🔥`, `@mychannel`).
- **Text Opacity Control:** Adjustable transparency from 10% to 100% using native ASS alpha color mapping (`&HAA...&`).
- **Vertical Position Slider:** Custom Y-positioning from 5% to 90%.
- **Typography Sizing & Colors:** Choose from Small, Medium, Large, or Huge fonts across White, Yellow, Cyan, Red, Green, and Purple palettes with optional dark backdrop pill.

### 6. 🌐 Hinglish, English & Original Captions
- **Triple Script Support:**
  - `Original Speech`: Verbatim speech transcription.
  - `Hinglish (Roman Script)`: Modern conversational Romanized Hindi without Devanagari characters (e.g., `Namaste dosto, aaj main aapko bataunga...`).
  - `English Subtitles`: Clean, concise English translated subtitles for global reach.
- **Instant Toggle:** Switch between languages in the workspace; the live player overlay and editable transcript rows update immediately.

---

## 🛠️ Verification & Build Results

- **Next.js Production Build:** Completed successfully with zero compiler errors:
  ```bash
  ✓ Compiled successfully in 1029ms
  ✓ 9/9 pages statically generated
  ```
- **ESLint Validation:** Zero lint errors across all routes and components.
- **PyTorch SSDLite Vision Model:** Initialized and cached locally for instant active speaker auto-framing.
- **ASS Subtitle Generator:** All 10 styles, positioning margins, and custom text overlays verified via unit tests.