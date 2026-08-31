'use client';

import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { getStoredSettings, saveStoredSettings, DEFAULT_SETTINGS } from '@/lib/settings-client';

export default function SettingsPage() {
  const [formData, setFormData] = useState({ ...DEFAULT_SETTINGS });
  const [showKeys, setShowKeys] = useState({
    groq: false,
    gemini: false,
    mistral: false,
    openai: false,
  });
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResults, setTestResults] = useState(null);

  useEffect(() => {
    const loaded = getStoredSettings();
    setFormData(loaded);
  }, []);

  const handleChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
    setSaveSuccess(false);
  };

  const toggleShowKey = (provider) => {
    setShowKeys((prev) => ({
      ...prev,
      [provider]: !prev[provider],
    }));
  };

  const handleSave = (e) => {
    if (e) e.preventDefault();
    try {
      saveStoredSettings(formData);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 4000);
    } catch (err) {
      alert('Failed to save settings: ' + err.message);
    }
  };

  const handleResetDefaults = () => {
    if (confirm('Are you sure you want to reset all settings to defaults? Your entered API keys and custom paths will be cleared.')) {
      setFormData({ ...DEFAULT_SETTINGS });
      saveStoredSettings({ ...DEFAULT_SETTINGS });
      setSaveSuccess(true);
      setTestResults(null);
      setTimeout(() => setSaveSuccess(false), 4000);
    }
  };

  const handleRunDiagnostics = async () => {
    setIsTesting(true);
    setTestResults(null);

    try {
      const res = await fetch('/api/test-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      setTestResults(data.results || data);
    } catch (err) {
      setTestResults({
        error: 'Failed to run diagnostics: ' + err.message,
      });
    } finally {
      setIsTesting(false);
    }
  };

  const aiProviders = [
    {
      id: 'groq',
      name: 'Groq',
      badge: 'Ultra Fast / Free',
      model: 'llama-3.3-70b-versatile',
      color: 'from-[#dd2222]/20 to-[#971717]/10 border-[#dd2222]/40 text-[#ef9595]',
      keyField: 'groq_api_key',
      docUrl: 'https://console.groq.com/keys',
      description: 'Llama 3.3 70B & Qwen models with instant sub-second inference.',
    },
    {
      id: 'gemini',
      name: 'Google Gemini',
      badge: 'Free Tier',
      model: 'gemini-1.5-flash',
      color: 'from-[#2cb7d3]/20 to-[#1e7d8f]/10 border-[#2cb7d3]/40 text-[#9adcea]',
      keyField: 'gemini_api_key',
      docUrl: 'https://aistudio.google.com/app/apikey',
      description: 'Google Gemini 1.5 Flash with deep context understanding.',
    },
    {
      id: 'mistral',
      name: 'Mistral AI',
      badge: 'Free Tier',
      model: 'mistral-small-latest',
      color: 'from-[#f59e0b]/20 to-[#731111]/10 border-[#f59e0b]/40 text-[#f59e0b]',
      keyField: 'mistral_api_key',
      docUrl: 'https://console.mistral.ai/api-keys/',
      description: 'Mistral Small free model for fast conversational punchlines.',
    },
    {
      id: 'openai',
      name: 'OpenAI',
      badge: 'GPT-4o',
      model: 'gpt-4o-mini',
      color: 'from-emerald-500/20 to-teal-500/10 border-emerald-500/30 text-emerald-300',
      keyField: 'openai_api_key',
      docUrl: 'https://platform.openai.com/api-keys',
      description: 'OpenAI GPT-4o mini for fast and reliable structured output.',
    },
  ];

  return (
    <DashboardLayout>
      <div className="max-w-5xl w-full mx-auto px-4 sm:px-6 py-8 md:py-12 space-y-8">
        
        {/* Header Title */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-white/8 pb-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-[10px] border border-[#dd2222]/30 bg-[#dd2222]/10 text-[#ef9595] text-xs font-semibold uppercase tracking-wider mb-2">
              ⚙️ Client-Side Storage
            </div>
            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-white">
              System Settings &amp; Configuration
            </h1>
            <p className="text-[#909cac] text-sm font-light mt-1">
              Configure your AI API keys and MongoDB database. All values are securely stored in your browser&apos;s <span className="text-[#ef9595] font-mono">localStorage</span>.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleRunDiagnostics}
              disabled={isTesting}
              className="px-4 py-2.5 rounded-[10px] bg-white/5 hover:bg-white/10 border border-white/10 text-white font-medium text-xs flex items-center gap-2 transition-colors cursor-pointer disabled:opacity-50"
            >
              {isTesting ? (
                <>
                  <svg className="animate-spin h-3.5 w-3.5 text-[#ef9595]" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  <span>Running Tests...</span>
                </>
              ) : (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-[#ef9595]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>Test Diagnostics</span>
                </>
              )}
            </button>

            <button
              onClick={handleSave}
              className="px-5 py-2.5 bg-[#dd2222] hover:bg-[#b91c1c] rounded-[10px] text-white font-semibold text-xs flex items-center gap-2 transition-colors cursor-pointer"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span>Save Configuration</span>
            </button>
          </div>
        </div>

        {/* Success Toast / Notification */}
        {saveSuccess && (
          <div className="p-4 rounded-[10px] bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-sm font-medium flex items-center justify-between animate-fade-in">
            <div className="flex items-center gap-3">
              <span className="text-xl">✅</span>
              <div>
                <p className="font-semibold text-white">Settings saved successfully!</p>
                <p className="text-emerald-400/80 text-xs font-light">
                  All configuration is saved in your browser&apos;s localStorage and attached to your API requests.
                </p>
              </div>
            </div>
            <button
              onClick={() => setSaveSuccess(false)}
              className="text-emerald-400 hover:text-white text-xs px-2 py-1 cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Diagnostics Results Banner */}
        {testResults && (
          <div className="glass-panel rounded-2xl p-6 space-y-4 border border-white/10">
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <span>🔍 Diagnostic Health Check Results</span>
              </h3>
              <span className="text-[11px] text-[#909cac]">Tested on Live Environment</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {/* MongoDB Status */}
              <div className={`p-3.5 rounded-[10px] border ${testResults.mongodb?.ok ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-red-500/10 border-red-500/30'}`}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-white">MongoDB</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-[10px] font-mono font-bold ${testResults.mongodb?.ok ? 'bg-emerald-500/20 text-emerald-300' : 'bg-red-500/20 text-red-300'}`}>
                    {testResults.mongodb?.ok ? 'ACTIVE' : 'FAILED'}
                  </span>
                </div>
                <p className="text-[11px] text-[#909cac] line-clamp-2">
                  {testResults.mongodb?.message || 'Not checked'}
                </p>
              </div>

              {/* Active AI Status */}
              <div className={`p-3.5 rounded-[10px] border ${testResults.ai?.ok ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-amber-500/10 border-amber-500/30'}`}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-white">AI ({testResults.ai?.provider || formData.active_ai_provider})</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-[10px] font-mono font-bold ${testResults.ai?.ok ? 'bg-emerald-500/20 text-emerald-300' : 'bg-amber-500/20 text-amber-300'}`}>
                    {testResults.ai?.ok ? 'VALID' : 'INVALID'}
                  </span>
                </div>
                <p className="text-[11px] text-[#909cac] line-clamp-2">
                  {testResults.ai?.message || 'No key provided'}
                </p>
              </div>

              {/* FFmpeg Status */}
              <div className={`p-3.5 rounded-[10px] border ${testResults.ffmpeg?.ok ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-red-500/10 border-red-500/30'}`}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-white">FFmpeg Binary</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-[10px] font-mono font-bold ${testResults.ffmpeg?.ok ? 'bg-emerald-500/20 text-emerald-300' : 'bg-red-500/20 text-red-300'}`}>
                    {testResults.ffmpeg?.ok ? 'FOUND' : 'MISSING'}
                  </span>
                </div>
                <p className="text-[11px] text-[#909cac] line-clamp-2 font-mono">
                  {testResults.ffmpeg?.version || testResults.ffmpeg?.message || 'No executable found'}
                </p>
              </div>

              {/* yt-dlp Status */}
              <div className={`p-3.5 rounded-[10px] border ${testResults.yt_dlp?.ok ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-red-500/10 border-red-500/30'}`}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-white">yt-dlp Binary</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-[10px] font-mono font-bold ${testResults.yt_dlp?.ok ? 'bg-emerald-500/20 text-emerald-300' : 'bg-red-500/20 text-red-300'}`}>
                    {testResults.yt_dlp?.ok ? 'FOUND' : 'MISSING'}
                  </span>
                </div>
                <p className="text-[11px] text-[#909cac] line-clamp-2 font-mono">
                  {testResults.yt_dlp?.version || testResults.yt_dlp?.message || 'No executable found'}
                </p>
              </div>
            </div>
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-8">
          
          {/* SECTION 1: AI Provider Selection & Keys */}
          <div className="glass-panel rounded-2xl p-6 md:p-8 space-y-6 border border-white/8">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div>
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <span className="w-8 h-8 rounded-[10px] bg-[#dd2222]/20 text-[#ef9595] flex items-center justify-center font-mono text-sm border border-[#dd2222]/30">
                    1
                  </span>
                  AI Generation Engine
                </h2>
                <p className="text-[#909cac] text-xs font-light mt-1">
                  Select your primary AI provider for extracting viral moments and Hinglish transcript transliteration.
                </p>
              </div>

              <span className="text-[11px] font-mono text-[#ef9595] bg-[#dd2222]/10 px-3 py-1 rounded-[10px] border border-[#dd2222]/20 w-fit">
                Active: {formData.active_ai_provider.toUpperCase()}
              </span>
            </div>

            {/* Provider Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {aiProviders.map((provider) => {
                const isActive = formData.active_ai_provider === provider.id;
                const keyVal = formData[provider.keyField] || '';
                const isKeyPresent = Boolean(keyVal.trim());

                return (
                  <div
                    key={provider.id}
                    className={`glass-card rounded-[10px] p-5 space-y-4 border transition-colors cursor-pointer relative ${
                      isActive
                        ? 'border-[#dd2222]/60 bg-[#dd2222]/10'
                        : 'border-white/5 hover:border-white/10'
                    }`}
                    onClick={() => handleChange('active_ai_provider', provider.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <input
                          type="radio"
                          name="active_ai_provider"
                          checked={isActive}
                          onChange={() => handleChange('active_ai_provider', provider.id)}
                          className="text-[#dd2222] focus:ring-[#dd2222]"
                        />
                        <span className="text-sm font-bold text-white">{provider.name}</span>
                        <span className="text-[10px] px-2 py-0.5 rounded-[10px] bg-white/5 text-[#909cac] border border-white/5">
                          {provider.badge}
                        </span>
                      </div>

                      <a
                        href={provider.docUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="text-[10px] text-[#2cb7d3] hover:text-[#5ccae1] underline font-light"
                      >
                        Get Key →
                      </a>
                    </div>

                    <p className="text-xs text-[#909cac] font-light leading-relaxed">
                      {provider.description}
                    </p>

                    <div className="space-y-1.5" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-between">
                        <label className="text-[11px] font-semibold text-[#d7dbe0]">
                          API Key
                        </label>
                        <span className={`text-[10px] font-mono ${isKeyPresent ? 'text-emerald-400' : 'text-[#f59e0b]'}`}>
                          {isKeyPresent ? '● Configured' : '○ Not set'}
                        </span>
                      </div>

                      <div className="relative">
                        <input
                          type={showKeys[provider.id] ? 'text' : 'password'}
                          value={formData[provider.keyField]}
                          onChange={(e) => handleChange(provider.keyField, e.target.value)}
                          placeholder={`Enter ${provider.name} API Key`}
                          className="w-full px-3.5 py-2.5 bg-[#15181b] border border-white/10 rounded-[10px] text-white font-mono text-xs focus:outline-none focus:border-[#dd2222]/60 pr-16"
                        />
                        <button
                          type="button"
                          onClick={() => toggleShowKey(provider.id)}
                          className="absolute right-2 top-2 px-2 py-0.5 rounded-[10px] bg-white/5 hover:bg-white/10 text-[#909cac] hover:text-white text-[10px] transition-colors cursor-pointer"
                        >
                          {showKeys[provider.id] ? 'Hide' : 'Show'}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* SECTION 2: Local System Binaries */}
          <div className="glass-panel rounded-2xl p-6 md:p-8 space-y-6 border border-white/8">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div>
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <span className="w-8 h-8 rounded-[10px] bg-[#2cb7d3]/20 text-[#2cb7d3] flex items-center justify-center font-mono text-sm border border-[#2cb7d3]/30">
                    2
                  </span>
                  Local System Binaries (FFmpeg &amp; yt-dlp)
                </h2>
                <p className="text-[#909cac] text-xs font-light mt-1">
                  Runs directly on your machine. Leave as default CLI names or enter custom paths.
                </p>
              </div>

              <span className="px-3 py-1 rounded-[10px] bg-[#2cb7d3]/10 text-[#2cb7d3] border border-[#2cb7d3]/20 text-xs font-mono font-semibold flex items-center gap-1.5 w-fit">
                <span className="w-2 h-2 rounded-full bg-[#2cb7d3]"></span>
                Local Machine
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* FFmpeg Path */}
              <div className="p-4 rounded-[10px] bg-[#15181b] border border-white/8 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-semibold text-white">
                    FFmpeg Binary Path
                  </label>
                  <button
                    type="button"
                    onClick={() => handleChange('ffmpeg_path', 'ffmpeg')}
                    className="text-[10px] text-[#2cb7d3] hover:text-[#5ccae1] cursor-pointer"
                  >
                    Reset to "ffmpeg"
                  </button>
                </div>
                <input
                  type="text"
                  value={formData.ffmpeg_path || 'ffmpeg'}
                  onChange={(e) => handleChange('ffmpeg_path', e.target.value)}
                  placeholder="ffmpeg or /opt/homebrew/bin/ffmpeg"
                  className="w-full px-3.5 py-2.5 bg-[#1d2125] border border-white/10 rounded-[10px] text-white font-mono text-xs focus:outline-none focus:border-[#dd2222]/60"
                />
                <p className="text-[11px] text-[#6e7d91] font-light">
                  Required for video framing, subtitle burning, and rendering (install via `brew install ffmpeg`).
                </p>
              </div>

              {/* yt-dlp Path */}
              <div className="p-4 rounded-[10px] bg-[#15181b] border border-white/8 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-semibold text-white">
                    yt-dlp Binary Path
                  </label>
                  <button
                    type="button"
                    onClick={() => handleChange('yt_dlp_path', 'yt-dlp')}
                    className="text-[10px] text-[#2cb7d3] hover:text-[#5ccae1] cursor-pointer"
                  >
                    Reset to "yt-dlp"
                  </button>
                </div>
                <input
                  type="text"
                  value={formData.yt_dlp_path || 'yt-dlp'}
                  onChange={(e) => handleChange('yt_dlp_path', e.target.value)}
                  placeholder="yt-dlp or /opt/homebrew/bin/yt-dlp"
                  className="w-full px-3.5 py-2.5 bg-[#1d2125] border border-white/10 rounded-[10px] text-white font-mono text-xs focus:outline-none focus:border-[#dd2222]/60"
                />
                <p className="text-[11px] text-[#6e7d91] font-light">
                  Required for fast video segment downloads (install via `brew install yt-dlp` or `pip install yt-dlp`).
                </p>
              </div>
            </div>
          </div>

          {/* SECTION 3: Database Connection */}
          <div className="glass-panel rounded-2xl p-6 md:p-8 space-y-6 border border-white/8">
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <span className="w-8 h-8 rounded-[10px] bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-mono text-sm border border-emerald-500/30">
                  3
                </span>
                MongoDB Database Storage
              </h2>
              <p className="text-[#909cac] text-xs font-light mt-1">
                Enter your connection string to persist your workspaces, extracted hooks, and custom subtitle changes.
              </p>
            </div>

            <div className="p-4 rounded-[10px] bg-[#15181b] border border-white/8 space-y-2">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-semibold text-white">
                  MongoDB Connection URI (<span className="font-mono text-[#909cac]">mongodb_uri</span>)
                </label>
                <button
                  type="button"
                  onClick={() => handleChange('mongodb_uri', 'mongodb://localhost:27017/shorts')}
                  className="text-[11px] text-[#2cb7d3] hover:text-[#5ccae1] font-light cursor-pointer"
                >
                  Use Localhost:27017
                </button>
              </div>
              <input
                type="text"
                value={formData.mongodb_uri}
                onChange={(e) => handleChange('mongodb_uri', e.target.value)}
                placeholder="mongodb+srv://user:password@cluster0.xxx.mongodb.net/shorts or mongodb://localhost:27017/shorts"
                className="w-full px-4 py-3 bg-[#1d2125] border border-white/10 rounded-[10px] text-white font-mono text-xs focus:outline-none focus:border-[#dd2222]/60"
              />
              <p className="text-[11px] text-[#6e7d91] font-light">
                Supports MongoDB Atlas clusters (`mongodb+srv://...`) or local instances (`mongodb://localhost:27017/...`).
              </p>
            </div>
          </div>

          {/* SECTION 4: YouTube Authentication (Optional) */}
          <div className="glass-panel rounded-2xl p-6 md:p-8 space-y-6 border border-white/8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <span className="w-8 h-8 rounded-[10px] bg-[#2cb7d3]/20 text-[#2cb7d3] flex items-center justify-center font-mono text-sm border border-[#2cb7d3]/30">
                    4
                  </span>
                  YouTube Authentication & Cookies (Optional)
                </h2>
                <p className="text-[#909cac] text-xs font-light mt-1">
                  Automatic stream bypass is enabled by default. If you need to render age-restricted or private videos, paste your YouTube cookies here.
                </p>
              </div>
              <span className="text-[10px] text-[#909cac] bg-white/5 px-2.5 py-1 rounded-[10px] border border-white/5 w-fit">
                Optional
              </span>
            </div>

            <div className="p-4 rounded-[10px] bg-[#15181b] border border-white/8 space-y-2">
              <label className="block text-xs font-semibold text-white">
                Netscape cookies.txt content (<span className="font-mono text-[#909cac]">youtube_cookies</span>)
              </label>
              <textarea
                rows={3}
                value={formData.youtube_cookies || ''}
                onChange={(e) => handleChange('youtube_cookies', e.target.value)}
                placeholder="# Netscape HTTP Cookie File&#10;.youtube.com  TRUE  /  TRUE  1799999999  VISITOR_INFO1_LIVE  ..."
                className="w-full px-4 py-3 bg-[#1d2125] border border-white/10 rounded-[10px] text-white font-mono text-xs focus:outline-none focus:border-[#dd2222]/60 resize-y"
              />
              <p className="text-[11px] text-[#6e7d91] font-light">
                Export using browser extensions like <em>Get cookies.txt LOCALLY</em> if accessing age-restricted YouTube videos.
              </p>
            </div>
          </div>

          {/* Bottom Action Controls */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-white/8">
            <button
              type="button"
              onClick={handleResetDefaults}
              className="text-xs text-red-400 hover:text-red-300 hover:underline transition-colors cursor-pointer"
            >
              Reset all settings to default values
            </button>

            <div className="flex items-center gap-3 w-full sm:w-auto">
              <button
                type="button"
                onClick={handleRunDiagnostics}
                disabled={isTesting}
                className="flex-1 sm:flex-none px-5 py-3 rounded-[10px] bg-white/5 hover:bg-white/10 border border-white/10 text-white font-medium text-xs transition-colors cursor-pointer"
              >
                Test Configuration
              </button>

              <button
                type="submit"
                className="flex-1 sm:flex-none px-7 py-3 bg-[#dd2222] hover:bg-[#b91c1c] rounded-[10px] text-white font-semibold text-sm transition-colors cursor-pointer active:scale-95"
              >
                Save Settings
              </button>
            </div>
          </div>
        </form>

      </div>
    </DashboardLayout>
  );
}
