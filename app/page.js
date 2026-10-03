'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';

export default function HomePage() {
  const router = useRouter();
  const { user, loginWithGoogle } = useAuth();
  const [url, setUrl] = useState('');
  const [clipCount, setClipCount] = useState(5);
  const [minDuration, setMinDuration] = useState(30);
  const [maxDuration, setMaxDuration] = useState(60);
  const [durationPreset, setDurationPreset] = useState('30-60');
  const [copySuccess, setCopySuccess] = useState(false);
  const [activePreviewStyle, setActivePreviewStyle] = useState('hormozi');
  const [openFaqIndex, setOpenFaqIndex] = useState(null);
  const inputRef = useRef(null);

  // Sample videos for quick 1-click test
  const sampleVideos = [
    {
      title: 'Delhi Flat Hunting Documentary',
      url: 'https://www.youtube.com/watch?v=yus6MDyrMnc',
      label: 'Docu / Vlog',
    },
    {
      title: 'Finance & Wealth Masterclass',
      url: 'https://www.youtube.com/watch?v=f_Vp_7HwFfE',
      label: 'Podcast / Talk',
    },
    {
      title: 'Sam Altman on Future of AI',
      url: 'https://www.youtube.com/watch?v=L_Guz73e6fw',
      label: 'Tech Interview',
    },
  ];

  const handlePasteClipboard = async () => {
    try {
      if (navigator.clipboard) {
        const text = await navigator.clipboard.readText();
        if (text && (text.includes('youtube.com') || text.includes('youtu.be'))) {
          setUrl(text.trim());
          setCopySuccess(true);
          setTimeout(() => setCopySuccess(false), 2000);
        }
      }
    } catch (_) {}
  };

  const handleSelectSample = (sampleUrl) => {
    setUrl(sampleUrl);
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  const handleStartClipping = (e) => {
    e.preventDefault();
    if (!url.trim()) {
      if (inputRef.current) inputRef.current.focus();
      return;
    }
    // Navigate into the dashboard with pre-filled YouTube URL, clip count, and duration bounds
    router.push(`/dashboard?url=${encodeURIComponent(url.trim())}&clipCount=${clipCount}&minDuration=${minDuration}&maxDuration=${maxDuration}`);
  };

  // Subtitle Preview Styles Showcase Data
  const subtitleStyles = [
    {
      id: 'hormozi',
      name: 'Hormozi Viral',
      badge: 'Most Popular',
      font: 'font-black uppercase',
      bgStyle: 'bg-black/90 px-3 py-1.5 rounded-lg border border-yellow-400/30',
      words: [
        { text: 'NOBODY', color: 'text-white' },
        { text: 'TELLS', color: 'text-white' },
        { text: 'YOU', color: 'text-white' },
        { text: 'THIS', color: 'text-yellow-400 font-extrabold' },
      ],
      description: 'Ultra-bold font with explosive gold active-word highlighting. Proven #1 on TikTok & Shorts.',
    },
    {
      id: 'mrbeast',
      name: 'MrBeast Energy',
      badge: 'High Impact',
      font: 'font-extrabold uppercase',
      bgStyle: 'bg-black/80 px-3 py-1.5 rounded-lg border border-green-400/30',
      words: [
        { text: 'THIS', color: 'text-white' },
        { text: 'IS', color: 'text-white' },
        { text: 'ABSOLUTELY', color: 'text-emerald-400 font-black' },
        { text: 'INSANE!', color: 'text-yellow-300 font-black' },
      ],
      description: 'Punchy saturated colors with comic high-energy emphasis for maximum retention.',
    },
    {
      id: 'cyberpunk',
      name: 'Cyberpunk Neon',
      badge: 'Futuristic',
      font: 'font-mono font-bold tracking-wider',
      bgStyle: 'bg-[#0f172a]/95 px-3 py-1.5 rounded-lg border border-cyan-400/40 shadow-lg shadow-cyan-500/20',
      words: [
        { text: 'FUTURE', color: 'text-cyan-300' },
        { text: 'OF', color: 'text-slate-300' },
        { text: 'CREATION', color: 'text-pink-400 font-extrabold' },
      ],
      description: 'Electric cyan and neon magenta typography with sleek futuristic letter-spacing.',
    },
    {
      id: 'karaoke',
      name: 'Karaoke Fire',
      badge: 'Dynamic',
      font: 'font-extrabold',
      bgStyle: 'bg-black/85 px-3 py-1.5 rounded-lg border border-orange-500/30',
      words: [
        { text: 'Listen', color: 'text-orange-400 font-bold' },
        { text: 'to', color: 'text-white' },
        { text: 'every', color: 'text-white' },
        { text: 'single', color: 'text-white' },
        { text: 'word.', color: 'text-yellow-400' },
      ],
      description: 'Dynamic word progression that lights up synchronously as the speaker delivers each syllable.',
    },
    {
      id: 'redalert',
      name: 'Breaking Impact',
      badge: 'Urgent',
      font: 'font-black uppercase tracking-tight',
      bgStyle: 'bg-[#360c0c] px-3.5 py-1.5 rounded-lg border border-[#dd2222]',
      words: [
        { text: 'BREAKING:', color: 'text-[#dd2222] font-black' },
        { text: 'THE', color: 'text-white' },
        { text: 'SECRET', color: 'text-white' },
        { text: 'IS', color: 'text-white' },
        { text: 'OUT', color: 'text-yellow-400' },
      ],
      description: 'News-alert red badge styling engineered to freeze scrollers in the first 2 seconds.',
    },
    {
      id: 'popcomic',
      name: 'Pop Comic',
      badge: 'Playful',
      font: 'font-extrabold tracking-wide',
      bgStyle: 'bg-yellow-400 px-3.5 py-1.5 rounded-lg border-2 border-black text-black shadow-md',
      words: [
        { text: 'WAIT', color: 'text-black font-black' },
        { text: 'UNTIL', color: 'text-black' },
        { text: 'THE', color: 'text-black' },
        { text: 'END!', color: 'text-red-600 font-black' },
      ],
      description: 'Comic-book yellow strip with black border that pops against any video background.',
    },
  ];

  // FAQ Items
  const faqItems = [
    {
      q: 'Is ClipStudio really 100% free with no watermarks?',
      a: 'Yes, completely free. Unlike Opus Clip, Klap, or Munch which charge $19 to $29/month and place heavy watermarks on free accounts, ClipStudio lets you import YouTube videos, generate 9:16 vertical shorts, customize animated subtitles, and download clean 1080x1920 MP4 files without watermarks or credit limits.',
    },
    {
      q: 'How does ClipStudio prevent cutting people off mid-sentence?',
      a: 'Most clippers slice videos strictly by time (e.g. cutting arbitrarily at 15 or 30 seconds). ClipStudio uses semantic dialogue boundary detection: our AI scans sentence stops, conversational pauses, and speech closures to extract complete 35–45 second scenes with an opening hook and a satisfying resolution.',
    },
    {
      q: 'How does the Hindi to Hinglish transliteration feature work?',
      a: 'ClipStudio is the only video clipper built natively for Indian and bilingual creators. When importing Hindi videos, it automatically transliterates Devanagari Hindi into high-retention Roman Hinglish so your subtitles are easy to read and hook 10x more viewers.',
    },
    {
      q: 'Can I publish or schedule directly to YouTube Shorts?',
      a: 'Yes! Connect your YouTube channel with one click under Settings. From any workspace, click "Upload to YouTube Short" to publish immediately or schedule for a specific date and time. ClipStudio automatically generates viral titles, hashtags (#Shorts), and SEO tags.',
    },
    {
      q: 'Can I bring my own AI API keys?',
      a: 'Yes. You can use our default integrated AI or configure your own free API keys for Groq LPU (supersonic processing), Google Gemini 2.0 Flash, Mistral AI, or OpenAI GPT-4o directly in your personal Settings.',
    },
    {
      q: 'What video aspect ratios and camera crops are supported?',
      a: 'You can render in Vertical 9:16 (for YouTube Shorts, Instagram Reels, TikTok), Horizontal 16:9 widescreen, or both simultaneously. For vertical videos, you can choose AI Smart Center, Left Focus, Right Focus, or Center Crop.',
    },
  ];

  const currentPreview = subtitleStyles.find((s) => s.id === activePreviewStyle) || subtitleStyles[0];

  return (
    <div className="min-h-screen bg-[#0f1216] text-[#f6f7f8] flex flex-col font-sans selection:bg-[#dd2222] selection:text-white">
      
      {/* ======================================================== */}
      {/* STANDALONE TOP NAVIGATION BAR                            */}
      {/* ======================================================== */}
      <header className="sticky top-0 z-50 backdrop-blur-md bg-[#171a1f]/85 border-b border-[#2d3239]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 sm:h-20 flex items-center justify-between">
          
          {/* Brand Logo */}
          <Link href="/" className="flex items-center gap-3 group">
            <img
              src="/logo.png"
              alt="clip.studio logo"
              className="w-9 h-9 sm:w-10 sm:h-10 rounded-[10px] object-cover border border-[#dd2222]/50 shadow-md group-hover:scale-105 transition-transform"
            />
            <div>
              <span className="font-extrabold text-lg sm:text-xl text-white tracking-tight">
                clip<span className="text-[#dd2222]">.studio</span>
              </span>
              <span className="hidden sm:inline-block ml-2 px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-[#360c0c] text-[#dd2222] border border-[#731111]/50">
                100% Free
              </span>
            </div>
          </Link>

          {/* Center Nav Links */}
          <nav className="hidden md:flex items-center gap-8 text-xs font-semibold text-[#b9c0ca]">
            <a href="#features" className="hover:text-white transition-colors">Features</a>
            <a href="#subtitles" className="hover:text-white transition-colors">Subtitle Styles</a>
            <a href="#compare" className="hover:text-white transition-colors">Comparison</a>
            <a href="#how-it-works" className="hover:text-white transition-colors">How It Works</a>
            <Link href="/impact" className="hover:text-white transition-colors flex items-center gap-1.5">
              <span>Our Impact</span>
              <span className="w-1.5 h-1.5 rounded-full bg-[#dd2222]"></span>
            </Link>
            <a href="#faq" className="hover:text-white transition-colors">FAQ</a>
          </nav>

          {/* Right Action Buttons */}
          <div className="flex items-center gap-3">
            {user ? (
              <div className="flex items-center gap-3">
                <Link
                  href="/dashboard"
                  className="px-4 py-2 sm:px-5 sm:py-2.5 btn-primary text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-[#dd2222]/20"
                >
                  <span>Open Studio</span>
                  <span>→</span>
                </Link>
                <Link href="/workspaces" className="hidden sm:block text-xs font-semibold text-[#b9c0ca] hover:text-white">
                  My Workspaces
                </Link>
              </div>
            ) : (
              <div className="flex items-center gap-2.5">
                <Link
                  href="/login"
                  className="px-3.5 py-2 text-xs font-semibold text-[#b9c0ca] hover:text-white transition-colors"
                >
                  Sign In
                </Link>
                <Link
                  href="/dashboard"
                  className="px-4 py-2 sm:px-5 sm:py-2.5 btn-primary text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-[#dd2222]/20"
                >
                  <span>Start Free</span>
                  <span>→</span>
                </Link>
              </div>
            )}
          </div>

        </div>
      </header>

      {/* ======================================================== */}
      {/* MAIN MARKETING CONTENT                                   */}
      {/* ======================================================== */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-20 space-y-20 sm:space-y-32">
        
        {/* ======================================================== */}
        {/* HERO SECTION                                             */}
        {/* ======================================================== */}
        <section className="text-center relative pt-4 flex flex-col items-center">
          
          {/* Subtle Ambient Red Glow */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-80 sm:w-[500px] h-80 sm:h-[500px] bg-[#dd2222]/15 rounded-full blur-3xl pointer-events-none -z-10" />

          {/* Top Pill Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-[#731111] bg-[#360c0c]/80 text-[#fcf2f2] text-xs font-semibold uppercase tracking-wider mb-6 backdrop-blur-sm">
            <span className="w-2 h-2 rounded-full bg-[#dd2222] animate-pulse"></span>
            <span>The #1 Free YouTube Clipping Platform • 0$ Forever • No Watermarks</span>
          </div>

          {/* Main Headline */}
          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black tracking-tight text-white max-w-4xl leading-[1.1] mb-6">
            Turn Long YouTube Videos into{' '}
            <span className="text-[#dd2222]">
              Viral Shorts in 1 Click
            </span>
          </h1>

          {/* Subtitle */}
          <p className="text-[#b9c0ca] text-sm sm:text-lg font-normal max-w-2xl leading-relaxed mb-10">
            The world&apos;s best free AI video clipping platform. Automatically extracts complete 40s high-retention scenes, frames active speakers in 9:16 vertical, adds animated Hormozi subtitles, and schedules directly to YouTube Shorts.
          </p>

          {/* The Viral Clipper Input Station */}
          <div className="w-full max-w-3xl app-panel p-5 sm:p-7 border border-[#39414b] shadow-2xl relative text-left">
            <form onSubmit={handleStartClipping} className="space-y-4">
              
              {/* Main URL Input Box */}
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#dd2222]">
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                  </svg>
                </div>

                <input
                  ref={inputRef}
                  type="url"
                  required
                  placeholder="Paste any YouTube Video URL (e.g. https://www.youtube.com/watch?v=...)"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  className="w-full pl-11 pr-24 py-4 app-input text-xs sm:text-sm font-medium border-[#39414b] focus:border-[#dd2222] transition-colors"
                />

                {/* Paste from clipboard button */}
                <div className="absolute inset-y-0 right-2 flex items-center gap-1.5">
                  {url ? (
                    <button
                      type="button"
                      onClick={() => setUrl('')}
                      className="px-2.5 py-1 text-xs text-[#909cac] hover:text-white transition-colors cursor-pointer"
                      title="Clear input"
                    >
                      ✕
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handlePasteClipboard}
                      className="px-2.5 py-1.5 rounded-lg bg-[#2d3239] hover:bg-[#39414b] border border-[#4b5563] text-white text-xs font-medium flex items-center gap-1 transition-colors cursor-pointer"
                      title="Paste from clipboard"
                    >
                      <svg className="w-3.5 h-3.5 text-[#dd2222]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                      </svg>
                      <span>{copySuccess ? 'Pasted!' : 'Paste'}</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Sample Videos Chips */}
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <span className="text-[11px] text-[#909cac] font-semibold flex items-center gap-1">
                  <span>⚡ Try sample:</span>
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {sampleVideos.map((sample, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleSelectSample(sample.url)}
                      className="px-2.5 py-1 rounded-[8px] bg-[#1d2125] hover:bg-[#252a30] border border-[#39414b] hover:border-[#dd2222]/50 text-[#b9c0ca] hover:text-white text-[11px] font-medium transition-all cursor-pointer flex items-center gap-1.5"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-[#dd2222]"></span>
                      <span>{sample.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Clip Count Selector */}
              <div className="p-3.5 rounded-[10px] bg-[#1d2125] border border-[#39414b] space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-white flex items-center gap-1.5">
                    <span className="text-[#dd2222]">✂️</span>
                    <span>Viral Moments to Extract (1 – 20 Clips)</span>
                  </label>
                  <span className="text-xs font-bold text-[#dd2222] font-mono px-2.5 py-0.5 rounded bg-[#360c0c] border border-[#731111]">
                    {clipCount} {clipCount === 1 ? 'Viral Short' : 'Viral Shorts'}
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min="1"
                    max="20"
                    step="1"
                    value={clipCount}
                    onChange={(e) => setClipCount(parseInt(e.target.value, 10))}
                    className="w-full accent-[#dd2222] cursor-pointer"
                  />
                  <input
                    type="number"
                    min="1"
                    max="20"
                    value={clipCount}
                    onChange={(e) => {
                      const val = parseInt(e.target.value, 10);
                      if (!isNaN(val)) setClipCount(Math.min(20, Math.max(1, val)));
                    }}
                    className="w-14 px-2 py-1 text-center font-mono font-bold text-xs app-input rounded-[8px]"
                  />
                </div>

                {/* Preset quick buttons */}
                <div className="flex items-center justify-between gap-1.5 pt-1">
                  <span className="text-[10px] text-[#909cac] font-medium">Quick presets:</span>
                  <div className="flex gap-1.5">
                    {[1, 3, 5, 10, 15, 20].map((num) => (
                      <button
                        type="button"
                        key={num}
                        onClick={() => setClipCount(num)}
                        className={`px-2.5 py-0.5 rounded-[6px] text-[11px] font-semibold transition-colors cursor-pointer border ${
                          clipCount === num
                            ? 'bg-[#dd2222] text-white border-[#dd2222]'
                            : 'bg-[#2d3239] text-[#909cac] border-[#39414b] hover:text-white'
                        }`}
                      >
                        {num}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Clip Duration Selector */}
              <div className="p-3.5 rounded-[10px] bg-[#1d2125] border border-[#39414b] space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-white flex items-center gap-1.5">
                    <span className="text-[#dd2222]">⏱️</span>
                    <span>Clip Duration Range</span>
                  </label>
                  <span className="text-xs font-bold text-[#dd2222] font-mono px-2.5 py-0.5 rounded bg-[#360c0c] border border-[#731111]">
                    {minDuration}s – {maxDuration}s
                  </span>
                </div>

                {/* Duration Presets */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { id: '15-30', label: '15s – 30s', desc: 'Punchy & Roasts', min: 15, max: 30 },
                    { id: '30-60', label: '30s – 60s', desc: 'Standard Viral', min: 30, max: 60 },
                    { id: '60-90', label: '60s – 90s', desc: 'Conversations', min: 60, max: 90 },
                    { id: 'custom', label: 'Custom Range', desc: 'Set your bounds', min: minDuration, max: maxDuration }
                  ].map((preset) => (
                    <button
                      type="button"
                      key={preset.id}
                      onClick={() => {
                        setDurationPreset(preset.id);
                        if (preset.id !== 'custom') {
                          setMinDuration(preset.min);
                          setMaxDuration(preset.max);
                        }
                      }}
                      className={`p-2 rounded-[8px] border text-left transition-colors cursor-pointer flex flex-col justify-between ${
                        durationPreset === preset.id
                          ? 'bg-[#360c0c] border-[#dd2222] text-[#fcf2f2]'
                          : 'bg-[#2d3239] border-[#39414b] text-[#909cac] hover:border-[#4b5563]'
                      }`}
                    >
                      <span className="block text-xs font-bold text-white">{preset.label}</span>
                      <span className="block text-[10px] text-[#909cac] mt-0.5">{preset.desc}</span>
                    </button>
                  ))}
                </div>

                {/* Custom sliders if custom preset is selected */}
                {durationPreset === 'custom' && (
                  <div className="pt-2 border-t border-[#39414b] space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <div className="flex items-center justify-between text-[11px] mb-1">
                          <span className="text-[#909cac]">Min Duration:</span>
                          <span className="font-mono font-bold text-white">{minDuration}s</span>
                        </div>
                        <input
                          type="range"
                          min="10"
                          max={Math.max(10, maxDuration - 5)}
                          step="5"
                          value={minDuration}
                          onChange={(e) => setMinDuration(Math.min(maxDuration - 5, parseInt(e.target.value, 10)))}
                          className="w-full accent-[#dd2222] cursor-pointer"
                        />
                      </div>
                      <div>
                        <div className="flex items-center justify-between text-[11px] mb-1">
                          <span className="text-[#909cac]">Max Duration:</span>
                          <span className="font-mono font-bold text-white">{maxDuration}s</span>
                        </div>
                        <input
                          type="range"
                          min={minDuration + 5}
                          max="180"
                          step="5"
                          value={maxDuration}
                          onChange={(e) => setMaxDuration(Math.max(minDuration + 5, parseInt(e.target.value, 10)))}
                          className="w-full accent-[#dd2222] cursor-pointer"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Primary CTA Button */}
              <button
                type="submit"
                className="w-full py-4 btn-primary text-sm sm:text-base font-bold flex items-center justify-center gap-2.5 cursor-pointer transition-all shadow-lg shadow-[#dd2222]/20 hover:scale-[1.01]"
              >
                <span className="text-lg">✂️</span>
                <span>Generate Viral Shorts Free</span>
                <svg className="w-4 h-4 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </button>

              {/* Micro Trust Proof Row */}
              <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-[11px] text-[#909cac] pt-2 border-t border-[#39414b]">
                <span className="flex items-center gap-1.5">
                  <span className="text-emerald-400">✓</span> 100% Free Forever
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="text-emerald-400">✓</span> Zero Watermarks
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="text-emerald-400">✓</span> 40s Complete Dialogue
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="text-emerald-400">✓</span> Active Speaker Centering
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="text-emerald-400">✓</span> Direct YouTube Scheduler
                </span>
              </div>
            </form>
          </div>
        </section>

        {/* ======================================================== */}
        {/* LIVE SOCIAL PROOF & METRICS STRIP                        */}
        {/* ======================================================== */}
        <section className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 w-full">
          <div className="app-panel p-6 text-center border border-[#39414b] rounded-[10px]">
            <div className="text-2xl sm:text-3xl font-black text-white font-mono">50,000+</div>
            <p className="text-[#909cac] text-xs font-medium mt-1">Shorts Generated</p>
          </div>
          <div className="app-panel p-6 text-center border border-[#39414b] rounded-[10px]">
            <div className="text-2xl sm:text-3xl font-black text-emerald-400 font-mono">$0.00</div>
            <p className="text-[#909cac] text-xs font-medium mt-1">Free Forever Guarantee</p>
          </div>
          <div className="app-panel p-6 text-center border border-[#39414b] rounded-[10px]">
            <div className="text-2xl sm:text-3xl font-black text-[#2cb7d3] font-mono">9 Styles</div>
            <p className="text-[#909cac] text-xs font-medium mt-1">Animated Viral Subtitles</p>
          </div>
          <div className="app-panel p-6 text-center border border-[#39414b] rounded-[10px]">
            <div className="text-2xl sm:text-3xl font-black text-[#dd2222] font-mono">0 Watermarks</div>
            <p className="text-[#909cac] text-xs font-medium mt-1">Clean 1080x1920 MP4s</p>
          </div>
        </section>

        {/* ======================================================== */}
        {/* INTERACTIVE SUBTITLE & PREVIEW SHOWCASE                  */}
        {/* ======================================================== */}
        <section id="subtitles" className="space-y-8">
          <div className="text-center max-w-2xl mx-auto space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-[#731111] bg-[#360c0c] text-[#fcf2f2] text-xs font-semibold uppercase tracking-wider">
              🎨 Interactive Subtitle Studio
            </div>
            <h2 className="text-2xl sm:text-4xl font-extrabold text-white">
              Subtitles Engineered for <span className="text-[#dd2222]">85%+ Retention</span>
            </h2>
            <p className="text-[#909cac] text-xs sm:text-sm">
              Viewers swipe away when subtitles are boring. Pick from 9 custom animated word-highlighting typography presets.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            
            {/* Style Selector Tabs (Left Side) */}
            <div className="lg:col-span-6 space-y-3">
              {subtitleStyles.map((style) => (
                <button
                  key={style.id}
                  onClick={() => setActivePreviewStyle(style.id)}
                  className={`w-full p-4 rounded-[10px] text-left transition-all cursor-pointer flex items-center justify-between border ${
                    activePreviewStyle === style.id
                      ? 'bg-[#360c0c] border-[#dd2222] shadow-md'
                      : 'bg-[#1d2125] border-[#2d3239] hover:bg-[#252a30] text-[#909cac]'
                  }`}
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className={`text-sm font-bold ${activePreviewStyle === style.id ? 'text-white' : 'text-[#b9c0ca]'}`}>
                        {style.name}
                      </span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-[#171a1f] text-[#2cb7d3] border border-[#39414b]">
                        {style.badge}
                      </span>
                    </div>
                    <p className="text-[11px] text-[#909cac] mt-0.5">{style.description}</p>
                  </div>

                  <div className="pl-3">
                    <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${
                      activePreviewStyle === style.id ? 'border-[#dd2222] bg-[#dd2222]' : 'border-[#4b5563]'
                    }`}>
                      {activePreviewStyle === style.id && (
                        <div className="w-2 h-2 rounded-full bg-white" />
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>

            {/* 9:16 Phone Mockup Preview (Right Side) */}
            <div className="lg:col-span-6 flex justify-center">
              <div className="relative w-[270px] sm:w-[310px] aspect-[9/16] bg-[#0d0f12] rounded-[36px] border-4 border-[#39414b] shadow-2xl overflow-hidden flex flex-col justify-between p-4">
                
                {/* Phone Notch */}
                <div className="w-24 h-4 bg-[#1d2125] rounded-full mx-auto mb-2 flex items-center justify-center">
                  <div className="w-2 h-2 rounded-full bg-[#39414b]" />
                </div>

                {/* Video Mockup Simulated Screen */}
                <div className="relative flex-1 rounded-2xl bg-gradient-to-b from-[#1a1f29] via-[#0f141c] to-[#0a0d13] flex flex-col justify-between p-3.5 overflow-hidden">
                  
                  {/* Simulated Video Overlay Tags */}
                  <div className="flex items-center justify-between z-10">
                    <span className="px-2 py-0.5 rounded bg-black/60 backdrop-blur-sm text-[10px] font-mono text-white flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></span>
                      <span>0:38 / 0:45</span>
                    </span>
                    <span className="px-2 py-0.5 rounded bg-[#dd2222] text-[10px] font-bold text-white uppercase">
                      Viral Moment
                    </span>
                  </div>

                  {/* Speaker Avatar Silhouette */}
                  <div className="absolute inset-0 flex items-center justify-center opacity-30">
                    <svg className="w-32 h-32 text-gray-500" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                    </svg>
                  </div>

                  {/* Active Subtitle Preview Displayed Over Video */}
                  <div className="z-10 text-center my-auto px-2">
                    <div className={`inline-block ${currentPreview.bgStyle} transition-all duration-300`}>
                      <div className={`text-base sm:text-lg ${currentPreview.font} flex items-center justify-center gap-1.5 flex-wrap`}>
                        {currentPreview.words.map((w, i) => (
                          <span key={i} className={w.color}>
                            {w.text}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Simulated Player Controls */}
                  <div className="z-10 space-y-1.5">
                    <div className="h-1 bg-white/20 rounded-full overflow-hidden">
                      <div className="h-full bg-[#dd2222] w-2/3" />
                    </div>
                    <div className="flex items-center justify-between text-[9px] text-[#909cac]">
                      <span>9:16 Active Speaker Cropped</span>
                      <span>1080x1920 HD</span>
                    </div>
                  </div>
                </div>

                {/* Phone Home Bar */}
                <div className="w-20 h-1 bg-[#39414b] rounded-full mx-auto mt-2" />
              </div>
            </div>

          </div>
        </section>

        {/* ======================================================== */}
        {/* WHY CLIPSTUDIO CRUSHES PAID TOOLS (COMPARISON TABLE)     */}
        {/* ======================================================== */}
        <section id="compare" className="space-y-6">
          <div className="text-center max-w-2xl mx-auto space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 text-xs font-semibold uppercase tracking-wider">
              💰 Compare & Save
            </div>
            <h2 className="text-2xl sm:text-4xl font-extrabold text-white">
              ClipStudio vs. <span className="text-[#dd2222]">Expensive Paid Tools</span>
            </h2>
            <p className="text-[#909cac] text-xs sm:text-sm">
              Why pay $29/month for limited minutes and watermarks? Here is how ClipStudio compares to Opus Clip and Munch.
            </p>
          </div>

          <div className="app-panel overflow-hidden border border-[#39414b] rounded-[10px]">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead>
                  <tr className="border-b border-[#39414b] bg-[#1d2125]">
                    <th className="p-4 text-[#909cac] font-semibold">Feature</th>
                    <th className="p-4 text-[#dd2222] font-black bg-[#360c0c]/50 border-x border-[#731111]/50">
                      ClipStudio (Free)
                    </th>
                    <th className="p-4 text-[#909cac] font-semibold">Opus Clip ($29/mo)</th>
                    <th className="p-4 text-[#909cac] font-semibold">Klap / Munch ($39/mo)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#39414b] text-white">
                  <tr>
                    <td className="p-4 font-medium text-white">Monthly Subscription</td>
                    <td className="p-4 font-bold text-emerald-400 bg-[#360c0c]/25 border-x border-[#731111]/40">
                      $0 / Free Forever
                    </td>
                    <td className="p-4 text-[#909cac]">$19 – $29 / month</td>
                    <td className="p-4 text-[#909cac]">$29 – $49 / month</td>
                  </tr>
                  <tr>
                    <td className="p-4 font-medium text-white">Watermark on Videos</td>
                    <td className="p-4 font-bold text-emerald-400 bg-[#360c0c]/25 border-x border-[#731111]/40">
                      Zero Watermarks
                    </td>
                    <td className="p-4 text-[#ef4444]">Heavy watermark on free</td>
                    <td className="p-4 text-[#ef4444]">Watermark on free tier</td>
                  </tr>
                  <tr>
                    <td className="p-4 font-medium text-white">Clip Limits per Month</td>
                    <td className="p-4 font-bold text-emerald-400 bg-[#360c0c]/25 border-x border-[#731111]/40">
                      Unlimited Free
                    </td>
                    <td className="p-4 text-[#909cac]">60 – 90 mins / month</td>
                    <td className="p-4 text-[#909cac]">Limited credits</td>
                  </tr>
                  <tr>
                    <td className="p-4 font-medium text-white">Semantic Dialogue Completeness</td>
                    <td className="p-4 font-bold text-emerald-400 bg-[#360c0c]/25 border-x border-[#731111]/40">
                      40s Full Scenes (No Cuts)
                    </td>
                    <td className="p-4 text-[#909cac]">Often cuts mid-sentence</td>
                    <td className="p-4 text-[#909cac]">Arbitrary time cuts</td>
                  </tr>
                  <tr>
                    <td className="p-4 font-medium text-white">Hindi to Hinglish Transliteration</td>
                    <td className="p-4 font-bold text-emerald-400 bg-[#360c0c]/25 border-x border-[#731111]/40">
                      ✓ Built-in Native
                    </td>
                    <td className="p-4 text-[#ef4444]">❌ No Hinglish</td>
                    <td className="p-4 text-[#ef4444]">❌ Not supported</td>
                  </tr>
                  <tr>
                    <td className="p-4 font-medium text-white">Direct 1-Click YouTube Upload</td>
                    <td className="p-4 font-bold text-emerald-400 bg-[#360c0c]/25 border-x border-[#731111]/40">
                      ✓ Included Free
                    </td>
                    <td className="p-4 text-[#909cac]">Pro tier only</td>
                    <td className="p-4 text-[#909cac]">Pro tier only</td>
                  </tr>
                  <tr>
                    <td className="p-4 font-medium text-white">Supported AI Engines</td>
                    <td className="p-4 font-bold text-emerald-400 bg-[#360c0c]/25 border-x border-[#731111]/40">
                      Groq, Mistral, Gemini, OpenAI
                    </td>
                    <td className="p-4 text-[#909cac]">Proprietary only</td>
                    <td className="p-4 text-[#909cac]">Proprietary only</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* ======================================================== */}
        {/* 6 CORE SUPERPOWERS                                       */}
        {/* ======================================================== */}
        <section id="features" className="space-y-8">
          <div className="text-center max-w-2xl mx-auto space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-[#731111] bg-[#360c0c] text-[#fcf2f2] text-xs font-semibold uppercase tracking-wider">
              ⚡ Feature Highlights
            </div>
            <h2 className="text-2xl sm:text-4xl font-extrabold text-white">
              Everything You Need to <span className="text-[#dd2222]">Dominate Shorts</span>
            </h2>
            <p className="text-[#909cac] text-xs sm:text-sm">
              Built from the ground up for high audience retention, dynamic viral styling, and instant publishing.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            
            {/* Feature 1 */}
            <div className="app-card p-6 border border-[#39414b] rounded-[10px] space-y-3">
              <div className="w-10 h-10 rounded-xl bg-[#dd2222]/10 border border-[#dd2222]/30 flex items-center justify-center text-[#dd2222] text-lg font-bold">
                🎯
              </div>
              <h3 className="text-base font-bold text-white">Complete 40s Scenes</h3>
              <p className="text-[#909cac] text-xs leading-relaxed">
                Never cut guests off mid-thought. Our AI understands sentence structure and extracts complete conversational units with an opening hook and a satisfying punchline.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="app-card p-6 border border-[#39414b] rounded-[10px] space-y-3">
              <div className="w-10 h-10 rounded-xl bg-[#2cb7d3]/10 border border-[#2cb7d3]/30 flex items-center justify-center text-[#2cb7d3] text-lg font-bold">
                🎙️
              </div>
              <h3 className="text-base font-bold text-white">Active Speaker Centering</h3>
              <p className="text-[#909cac] text-xs leading-relaxed">
                Automatically tracks who is speaking and frames them in 9:16 vertical using Lanczos interpolation, or choose fixed Left, Center, or Right focus points.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="app-card p-6 border border-[#39414b] rounded-[10px] space-y-3">
              <div className="w-10 h-10 rounded-xl bg-yellow-500/10 border border-yellow-500/30 flex items-center justify-center text-yellow-400 text-lg font-bold">
                🔥
              </div>
              <h3 className="text-base font-bold text-white">9 Subtitle Typography Styles</h3>
              <p className="text-[#909cac] text-xs leading-relaxed">
                Choose from Hormozi viral, MrBeast high energy, Cyberpunk Neon, Pop Comic, Retro CRT, or Clean Video with customizable vertical positioning and word-highlight colors.
              </p>
            </div>

            {/* Feature 4 */}
            <div className="app-card p-6 border border-[#39414b] rounded-[10px] space-y-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 text-lg font-bold">
                🇮🇳
              </div>
              <h3 className="text-base font-bold text-white">Hindi to Hinglish Transliteration</h3>
              <p className="text-[#909cac] text-xs leading-relaxed">
                The only platform that turns Devanagari Hindi into Roman Hinglish text, letting Indian creators hook bilingual viewers across YouTube Shorts and Instagram Reels.
              </p>
            </div>

            {/* Feature 5 */}
            <div className="app-card p-6 border border-[#39414b] rounded-[10px] space-y-3">
              <div className="w-10 h-10 rounded-xl bg-[#dd2222]/10 border border-[#dd2222]/30 flex items-center justify-center text-[#dd2222] text-lg font-bold">
                🚀
              </div>
              <h3 className="text-base font-bold text-white">Direct YouTube Shorts Upload</h3>
              <p className="text-[#909cac] text-xs leading-relaxed">
                Schedule or publish directly to your connected YouTube channel right from your workspace. Generates viral titles, SEO tags, and descriptions automatically.
              </p>
            </div>

            {/* Feature 6 */}
            <div className="app-card p-6 border border-[#39414b] rounded-[10px] space-y-3">
              <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400 text-lg font-bold">
                ⚡
              </div>
              <h3 className="text-base font-bold text-white">Multi-Model AI Flexibility</h3>
              <p className="text-[#909cac] text-xs leading-relaxed">
                Powered by your choice of Groq LPU for supersonic speeds, Mistral Large, Google Gemini 2.0 Flash, or OpenAI GPT-4o with full custom API key support.
              </p>
            </div>

          </div>
        </section>

        {/* ======================================================== */}
        {/* HOW IT WORKS (3 SIMPLE STEPS)                            */}
        {/* ======================================================== */}
        <section id="how-it-works" className="space-y-8">
          <div className="text-center max-w-2xl mx-auto space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-[#731111] bg-[#360c0c] text-[#fcf2f2] text-xs font-semibold uppercase tracking-wider">
              🚀 Fast & Effortless
            </div>
            <h2 className="text-2xl sm:text-4xl font-extrabold text-white">
              How It Works in <span className="text-[#dd2222]">3 Simple Steps</span>
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Step 1 */}
            <div className="app-panel p-6 border border-[#39414b] rounded-[10px] space-y-3">
              <div className="w-9 h-9 rounded-full bg-[#dd2222] text-white font-mono font-bold flex items-center justify-center text-sm shadow-md">
                1
              </div>
              <h3 className="text-base font-bold text-white">Paste YouTube Link</h3>
              <p className="text-[#909cac] text-xs leading-relaxed">
                Drop any long-form YouTube video URL into the box. No video file uploading, no storage limits, and no local downloading required.
              </p>
            </div>

            {/* Step 2 */}
            <div className="app-panel p-6 border border-[#39414b] rounded-[10px] space-y-3">
              <div className="w-9 h-9 rounded-full bg-[#dd2222] text-white font-mono font-bold flex items-center justify-center text-sm shadow-md">
                2
              </div>
              <h3 className="text-base font-bold text-white">AI Extracts Viral Clips</h3>
              <p className="text-[#909cac] text-xs leading-relaxed">
                Our AI scans the transcript, scores moments for virality, crops the frame to 9:16 vertical, and generates animated word-by-word subtitles.
              </p>
            </div>

            {/* Step 3 */}
            <div className="app-panel p-6 border border-[#39414b] rounded-[10px] space-y-3">
              <div className="w-9 h-9 rounded-full bg-[#dd2222] text-white font-mono font-bold flex items-center justify-center text-sm shadow-md">
                3
              </div>
              <h3 className="text-base font-bold text-white">Download or Publish</h3>
              <p className="text-[#909cac] text-xs leading-relaxed">
                Export pristine 1080x1920 MP4 files without watermarks, or push directly to your YouTube channel with auto-generated hashtags and titles.
              </p>
            </div>

          </div>
        </section>

        {/* ======================================================== */}
        {/* CREATOR TESTIMONIALS                                     */}
        {/* ======================================================== */}
        <section className="space-y-8">
          <div className="text-center max-w-2xl mx-auto space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-yellow-500/30 bg-yellow-500/10 text-yellow-400 text-xs font-semibold uppercase tracking-wider">
              ⭐ Loved By Creators
            </div>
            <h2 className="text-2xl sm:text-4xl font-extrabold text-white">
              Trusted by <span className="text-[#dd2222]">Viral Creators & Podcasters</span>
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="app-panel p-5 border border-[#39414b] rounded-[10px] space-y-3">
              <div className="flex text-yellow-400 text-xs">★★★★★</div>
              <p className="text-white text-xs leading-relaxed italic">
                &ldquo;I was paying $29/mo for Opus Clip until I found ClipStudio. Zero watermarks, better subtitle styles, and the Hinglish transliteration is a total game changer for Indian audiences.&rdquo;
              </p>
              <div className="pt-2 border-t border-[#39414b]">
                <p className="text-xs font-bold text-white">Aman Sharma</p>
                <p className="text-[11px] text-[#909cac]">Tech & Finance Podcaster (240k subs)</p>
              </div>
            </div>

            <div className="app-panel p-5 border border-[#39414b] rounded-[10px] space-y-3">
              <div className="flex text-yellow-400 text-xs">★★★★★</div>
              <p className="text-white text-xs leading-relaxed italic">
                &ldquo;The dialogue is actually complete! Other AI clippers always cut my guests off mid-sentence. ClipStudio extracts full 40s stories with real hooks that retain 80%+ viewers.&rdquo;
              </p>
              <div className="pt-2 border-t border-[#39414b]">
                <p className="text-xs font-bold text-white">Pooja Nair</p>
                <p className="text-[11px] text-[#909cac]">Lifestyle & Documentary Creator</p>
              </div>
            </div>

            <div className="app-panel p-5 border border-[#39414b] rounded-[10px] space-y-3">
              <div className="flex text-yellow-400 text-xs">★★★★★</div>
              <p className="text-white text-xs leading-relaxed italic">
                &ldquo;Direct 1-click YouTube Shorts scheduling from the workspace saves our media agency over 15 hours every single week. Best free tool on the internet.&rdquo;
              </p>
              <div className="pt-2 border-t border-[#39414b]">
                <p className="text-xs font-bold text-white">Marcus Vance</p>
                <p className="text-[11px] text-[#909cac]">Head of Short-Form Growth, Apex Media</p>
              </div>
            </div>
          </div>
        </section>

        {/* ======================================================== */}
        {/* FREQUENTLY ASKED QUESTIONS (ACCORDION)                   */}
        {/* ======================================================== */}
        <section id="faq" className="space-y-6 max-w-3xl mx-auto w-full">
          <div className="text-center space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-[#731111] bg-[#360c0c] text-[#fcf2f2] text-xs font-semibold uppercase tracking-wider">
              ❓ Answers to Your Questions
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white">
              Frequently Asked <span className="text-[#dd2222]">Questions</span>
            </h2>
          </div>

          <div className="space-y-2.5">
            {faqItems.map((item, idx) => {
              const isOpen = openFaqIndex === idx;
              return (
                <div
                  key={idx}
                  className="app-panel border border-[#39414b] rounded-[10px] overflow-hidden transition-colors"
                >
                  <button
                    type="button"
                    onClick={() => setOpenFaqIndex(isOpen ? null : idx)}
                    className="w-full p-4 text-left font-bold text-xs sm:text-sm text-white flex items-center justify-between gap-4 cursor-pointer hover:bg-[#323842]"
                  >
                    <span>{item.q}</span>
                    <span className={`text-[#dd2222] font-mono text-base transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}>
                      ▼
                    </span>
                  </button>
                  {isOpen && (
                    <div className="px-4 pb-4 pt-1 text-xs text-[#b9c0ca] leading-relaxed border-t border-[#39414b]/60">
                      {item.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* ======================================================== */}
        {/* BOTTOM CALL TO ACTION BANNER                             */}
        {/* ======================================================== */}
        <section className="app-panel p-8 sm:p-14 text-center rounded-2xl border border-[#731111] bg-gradient-to-b from-[#360c0c] to-[#1d2125] relative overflow-hidden space-y-5">
          <h2 className="text-3xl sm:text-5xl font-black text-white">
            Ready to 10x Your Reach with <span className="text-[#dd2222]">Viral Shorts?</span>
          </h2>
          <p className="text-[#b9c0ca] text-xs sm:text-sm max-w-lg mx-auto leading-relaxed">
            No watermarks. No subscriptions. No credit cards. Start clipping high-retention vertical shorts now.
          </p>
          <div className="pt-3 flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => {
                window.scrollTo({ top: 0, behavior: 'smooth' });
                if (inputRef.current) inputRef.current.focus();
              }}
              className="w-full sm:w-auto px-7 py-3.5 btn-primary text-xs sm:text-sm font-bold flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-[#dd2222]/30"
            >
              <span>✂️ Clip a YouTube Video Now</span>
            </button>
            {!user && (
              <button
                type="button"
                onClick={() => loginWithGoogle('/')}
                className="w-full sm:w-auto px-6 py-3.5 rounded-[10px] bg-[#1d2125] hover:bg-[#252a30] border border-[#4b5563] text-white text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.65v3.03h3.88c2.27-2.09 3.66-5.17 3.66-9.12z" />
                  <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.03c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.13C3.27 21.43 7.35 24 12 24z" />
                  <path fill="#FBBC05" d="M5.28 14.29c-.25-.72-.38-1.49-.38-2.29s.13-1.57.38-2.29V6.58H1.25C.45 8.18 0 10.03 0 12s.45 3.82 1.25 5.42l4.03-3.13z" />
                  <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.35 0 3.27 2.57 1.25 6.58l4.03 3.13c.95-2.83 3.6-4.96 6.72-4.96z" />
                </svg>
                <span>Sign In Free with Google</span>
              </button>
            )}
          </div>
        </section>

      </main>

      {/* ======================================================== */}
      {/* FOOTER                                                   */}
      {/* ======================================================== */}
      <footer className="w-full border-t border-[#2d3239] bg-[#12151a] py-10 px-4 sm:px-6 lg:px-8 mt-20">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6 text-xs text-[#909cac]">
          <div className="flex items-center gap-3">
            <span className="font-extrabold text-white text-base">
              clip<span className="text-[#dd2222]">.studio</span>
            </span>
            <span className="text-[#6e7d91]">|</span>
            <span>The #1 Free YouTube Clipping Platform</span>
          </div>

          <div className="flex items-center gap-6">
            <Link href="/impact" className="hover:text-white transition-colors">
              Our Impact
            </Link>
            <Link href="/dashboard" className="text-white hover:text-[#dd2222] transition-colors font-semibold">
              Studio Dashboard
            </Link>
            <Link href="/workspaces" className="hover:text-white transition-colors">
              Workspaces
            </Link>
            <Link href="/settings" className="hover:text-white transition-colors">
              Settings & API Keys
            </Link>
          </div>

          <div className="text-[11px] text-[#6e7d91]">
            &copy; {new Date().getFullYear()} clip.studio • Free & Open Source
          </div>
        </div>
      </footer>

    </div>
  );
}
