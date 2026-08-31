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
    setFormData((prev) => ({ ...prev, [field]: value }));
    setSaveSuccess(false);
  };

  const toggleShowKey = (provider) => {
    setShowKeys((prev) => ({ ...prev, [provider]: !prev[provider] }));
  };

  const handleSave = (e) => {
    if (e) e.preventDefault();
    try {
      saveStoredSettings(formData);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3500);
    } catch (err) {
      alert('Failed to save settings to localStorage: ' + err.message);
    }
  };

  const handleResetDefaults = () => {
    if (confirm('Are you sure you want to reset all settings to defaults? Your entered API keys will be cleared from localStorage.')) {
      setFormData({ ...DEFAULT_SETTINGS });
      saveStoredSettings({ ...DEFAULT_SETTINGS });
      setTestResults(null);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    }
  };

  const handleRunDiagnostics = async () => {
    setIsTesting(true);
    setTestResults(null);
    try {
      // Auto-save settings first
      saveStoredSettings(formData);

      const res = await fetch('/api/test-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (res.ok) {
        setTestResults(data.results);
      } else {
        alert('Diagnostic test failed: ' + (data.error || res.statusText));
      }
    } catch (err) {
      alert('Error running diagnostics: ' + err.message);
    } finally {
      setIsTesting(false);
    }
  };

  const handleSetHomebrewPaths = () => {
    setFormData((prev) => ({
      ...prev,
      ffmpeg_path: '/opt/homebrew/opt/ffmpeg-full/bin/ffmpeg',
      yt_dlp_path: '/opt/homebrew/bin/yt-dlp',
    }));
  };

  const handleSetDockerPaths = () => {
    setFormData((prev) => ({
      ...prev,
      ffmpeg_path: '/usr/bin/ffmpeg',
      yt_dlp_path: '/usr/local/bin/yt-dlp',
    }));
  };

  const handleSetSystemPaths = () => {
    setFormData((prev) => ({
      ...prev,
      ffmpeg_path: '/usr/local/bin/ffmpeg',
      yt_dlp_path: '/usr/local/bin/yt-dlp',
    }));
  };

  const aiProviders = [
    {
      id: 'groq',
      name: 'Groq',
      badge: 'Ultra Fast',
      model: 'llama-3.3-70b-versatile',
      color: 'from-orange-500/20 to-amber-500/10 border-orange-500/30 text-orange-300',
      keyField: 'groq_api_key',
      docUrl: 'https://console.groq.com/keys',
      description: 'Llama 3.3 70B with near-instant sub-second inference.',
    },
    {
      id: 'gemini',
      name: 'Google Gemini',
      badge: 'Multimodal',
      model: 'gemini-1.5-flash',
      color: 'from-blue-500/20 to-indigo-500/10 border-blue-500/30 text-blue-300',
      keyField: 'gemini_api_key',
      docUrl: 'https://aistudio.google.com/app/apikey',
      description: 'High-accuracy transcript analysis and Hinglish conversion.',
    },
    {
      id: 'mistral',
      name: 'Mistral AI',
      badge: 'Reasoning',
      model: 'mistral-large-latest',
      color: 'from-amber-500/20 to-yellow-500/10 border-amber-500/30 text-amber-300',
      keyField: 'mistral_api_key',
      docUrl: 'https://console.mistral.ai/api-keys/',
      description: 'Mistral Large model for precise conversational punchlines.',
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
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-white/5 pb-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-indigo-500/20 bg-indigo-500/5 text-indigo-300 text-xs font-semibold uppercase tracking-wider mb-2">
              ⚙️ Client-Side Storage
            </div>
            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-white">
              System Settings & Configuration
            </h1>
            <p className="text-gray-400 text-sm font-light mt-1">
              Configure your AI API keys, tool paths, and MongoDB database. All values are securely stored in your browser&apos;s <span className="text-indigo-300 font-mono">localStorage</span>.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleRunDiagnostics}
              disabled={isTesting}
              className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white font-medium text-xs flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50"
            >
              {isTesting ? (
                <>
                  <svg className="animate-spin h-3.5 w-3.5 text-indigo-400" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  <span>Running Tests...</span>
                </>
              ) : (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>Test Diagnostics</span>
                </>
              )}
            </button>

            <button
              onClick={handleSave}
              className="px-5 py-2.5 gradient-button rounded-xl text-white font-semibold text-xs flex items-center gap-2 transition-all cursor-pointer hover:shadow-indigo-500/20"
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
          <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-sm font-medium flex items-center justify-between animate-fade-in shadow-lg shadow-emerald-500/5">
            <div className="flex items-center gap-3">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-emerald-400 shrink-0" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span>Settings successfully saved to <strong>localStorage</strong>! No data is sent or stored on .env files.</span>
            </div>
            <span className="text-xs text-emerald-400/80 font-mono">Ready</span>
          </div>
        )}

        {/* Diagnostics Results Panel */}
        {testResults && (
          <div className="glass-panel rounded-3xl p-6 border border-white/10 space-y-4 animate-fade-in">
            <h3 className="text-sm font-bold uppercase tracking-wider text-indigo-300 flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              Diagnostic Verification Results
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {/* AI Key Test */}
              <div className={`p-3.5 rounded-2xl border ${testResults.ai?.ok ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-red-500/10 border-red-500/30'}`}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-semibold text-white uppercase">{testResults.ai?.provider} AI</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${testResults.ai?.ok ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
                    {testResults.ai?.ok ? 'Active & Valid' : 'Failed'}
                  </span>
                </div>
                <p className="text-[11px] text-gray-300 font-light truncate">{testResults.ai?.message}</p>
              </div>

              {/* MongoDB Test */}
              <div className={`p-3.5 rounded-2xl border ${testResults.mongodb?.ok ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-red-500/10 border-red-500/30'}`}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-semibold text-white">MongoDB URI</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${testResults.mongodb?.ok ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
                    {testResults.mongodb?.ok ? 'Connected' : 'Failed'}
                  </span>
                </div>
                <p className="text-[11px] text-gray-300 font-light truncate">{testResults.mongodb?.message}</p>
              </div>

              {/* FFmpeg Test */}
              <div className={`p-3.5 rounded-2xl border ${testResults.ffmpeg?.ok ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-red-500/10 border-red-500/30'}`}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-semibold text-white">FFmpeg Binary</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${testResults.ffmpeg?.ok ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
                    {testResults.ffmpeg?.ok ? 'Found' : 'Missing'}
                  </span>
                </div>
                <p className="text-[11px] text-gray-300 font-light truncate font-mono">
                  {testResults.ffmpeg?.ok ? (testResults.ffmpeg?.version || 'Executable OK') : testResults.ffmpeg?.message}
                </p>
              </div>

              {/* yt-dlp Test */}
              <div className={`p-3.5 rounded-2xl border ${testResults.yt_dlp?.ok ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-red-500/10 border-red-500/30'}`}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-semibold text-white">yt-dlp Binary</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${testResults.yt_dlp?.ok ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
                    {testResults.yt_dlp?.ok ? 'Found' : 'Missing'}
                  </span>
                </div>
                <p className="text-[11px] text-gray-300 font-light truncate font-mono">
                  {testResults.yt_dlp?.ok ? (testResults.yt_dlp?.version || 'Executable OK') : testResults.yt_dlp?.message}
                </p>
              </div>
            </div>
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-8">
          {/* SECTION 1: AI Provider Selector & Keys */}
          <div className="glass-panel rounded-3xl p-6 md:p-8 space-y-6">
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <span className="w-8 h-8 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-mono text-sm border border-indigo-500/30">
                  1
                </span>
                AI Engines & API Keys
              </h2>
              <p className="text-gray-400 text-xs font-light mt-1">
                Select your preferred active AI provider and supply API keys. The app will prioritize your active choice and fallback to available keys if needed.
              </p>
            </div>

            {/* Provider Grid Selector */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3">
                Active AI Engine Preference
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {aiProviders.map((provider) => {
                  const isSelected = formData.active_ai_provider === provider.id;
                  return (
                    <div
                      key={provider.id}
                      onClick={() => handleChange('active_ai_provider', provider.id)}
                      className={`p-4 rounded-2xl border cursor-pointer transition-all flex flex-col justify-between ${
                        isSelected
                          ? `bg-gradient-to-br ${provider.color} shadow-lg shadow-indigo-500/10`
                          : 'bg-white/2 border-white/5 hover:bg-white/5 text-gray-400'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className={`text-sm font-bold ${isSelected ? 'text-white' : 'text-gray-300'}`}>
                            {provider.name}
                          </span>
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-black/40 text-gray-300 font-mono">
                            {provider.badge}
                          </span>
                        </div>
                        <p className="text-[11px] text-gray-400 font-light leading-relaxed mb-3">
                          {provider.description}
                        </p>
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-white/5 text-[11px]">
                        <span className="font-mono text-[10px] text-gray-500">{provider.model}</span>
                        {isSelected && (
                          <span className="flex items-center gap-1 text-indigo-400 font-semibold">
                            <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-ping"></span>
                            Active
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* API Key Inputs */}
            <div className="space-y-4 pt-4 border-t border-white/5">
              {aiProviders.map((provider) => {
                const keyVal = formData[provider.keyField] || '';
                const isShowing = showKeys[provider.id];
                const isActive = formData.active_ai_provider === provider.id;

                return (
                  <div key={provider.id} className="p-4 rounded-2xl bg-black/30 border border-white/5 space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-semibold text-white flex items-center gap-2">
                        <span>{provider.name} API Key</span>
                        {isActive && (
                          <span className="px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 text-[10px] font-bold uppercase">
                            Primary
                          </span>
                        )}
                      </label>
                      <a
                        href={provider.docUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[11px] text-indigo-400 hover:text-indigo-300 underline font-light"
                      >
                        Get API Key →
                      </a>
                    </div>

                    <div className="relative">
                      <input
                        type={isShowing ? 'text' : 'password'}
                        value={keyVal}
                        onChange={(e) => handleChange(provider.keyField, e.target.value)}
                        placeholder={`Paste your ${provider.name} API key here (e.g. gsk_..., AIzaSy..., or sk-...)`}
                        className="w-full px-4 py-3 bg-black/50 border border-white/10 rounded-xl text-white font-mono text-xs focus:outline-none focus:border-indigo-500/60 focus:ring-1 focus:ring-indigo-500/40 pr-24"
                      />
                      <button
                        type="button"
                        onClick={() => toggleShowKey(provider.id)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white text-[11px] font-medium transition-all"
                      >
                        {isShowing ? 'Hide' : 'Show'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* SECTION 2: System Tool Paths */}
          <div className="glass-panel rounded-3xl p-6 md:p-8 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div>
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <span className="w-8 h-8 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center font-mono text-sm border border-purple-500/30">
                    2
                  </span>
                  System Binary Paths (FFmpeg &amp; yt-dlp)
                </h2>
                <p className="text-gray-400 text-xs font-light mt-1">
                  Specify the absolute paths to your local binaries used for section downloading and ASS subtitle burning.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleSetDockerPaths}
                  className="px-2.5 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 text-[11px] font-semibold transition-all"
                >
                  ⚡ Server Default (Render / Docker)
                </button>
                <button
                  type="button"
                  onClick={handleSetHomebrewPaths}
                  className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-indigo-300 border border-white/10 text-[11px] font-medium transition-all"
                >
                  Homebrew (Mac)
                </button>
                <button
                  type="button"
                  onClick={handleSetSystemPaths}
                  className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 border border-white/10 text-[11px] font-medium transition-all"
                >
                  /usr/local/bin
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* FFmpeg Path */}
              <div className="p-4 rounded-2xl bg-black/30 border border-white/5 space-y-2">
                <label className="block text-xs font-semibold text-white">
                  FFmpeg Binary Path (<span className="font-mono text-gray-400">ffmpeg_path</span>)
                </label>
                <input
                  type="text"
                  value={formData.ffmpeg_path}
                  onChange={(e) => handleChange('ffmpeg_path', e.target.value)}
                  placeholder="/opt/homebrew/opt/ffmpeg-full/bin/ffmpeg"
                  className="w-full px-4 py-3 bg-black/50 border border-white/10 rounded-xl text-white font-mono text-xs focus:outline-none focus:border-indigo-500/60"
                />
                <p className="text-[11px] text-gray-500 font-light">
                  Tip: Requires full filters (libass) support for burning styled ASS captions.
                </p>
              </div>

              {/* yt-dlp Path */}
              <div className="p-4 rounded-2xl bg-black/30 border border-white/5 space-y-2">
                <label className="block text-xs font-semibold text-white">
                  yt-dlp Binary Path (<span className="font-mono text-gray-400">yt_dlp_path</span>)
                </label>
                <input
                  type="text"
                  value={formData.yt_dlp_path}
                  onChange={(e) => handleChange('yt_dlp_path', e.target.value)}
                  placeholder="/opt/homebrew/bin/yt-dlp"
                  className="w-full px-4 py-3 bg-black/50 border border-white/10 rounded-xl text-white font-mono text-xs focus:outline-none focus:border-indigo-500/60"
                />
                <p className="text-[11px] text-gray-500 font-light">
                  Used to extract precise 20-30s video streams from YouTube in seconds.
                </p>
              </div>
            </div>
          </div>

          {/* SECTION 3: Database Connection */}
          <div className="glass-panel rounded-3xl p-6 md:p-8 space-y-6">
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <span className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-mono text-sm border border-emerald-500/30">
                  3
                </span>
                Database Configuration
              </h2>
              <p className="text-gray-400 text-xs font-light mt-1">
                MongoDB database connection URI for saving projects, clip transcripts, and timings.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-black/30 border border-white/5 space-y-2">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-semibold text-white">
                  MongoDB Connection URI (<span className="font-mono text-gray-400">mongodb_uri</span>)
                </label>
                <button
                  type="button"
                  onClick={() => handleChange('mongodb_uri', 'mongodb://localhost:27017/shorts')}
                  className="text-[11px] text-indigo-400 hover:text-indigo-300 font-light"
                >
                  Reset to Localhost:27017
                </button>
              </div>
              <input
                type="text"
                value={formData.mongodb_uri}
                onChange={(e) => handleChange('mongodb_uri', e.target.value)}
                placeholder="mongodb://localhost:27017/shorts"
                className="w-full px-4 py-3 bg-black/50 border border-white/10 rounded-xl text-white font-mono text-xs focus:outline-none focus:border-indigo-500/60"
              />
              <p className="text-[11px] text-gray-500 font-light">
                Supports local instances (`mongodb://localhost:27017/...`) or MongoDB Atlas clusters (`mongodb+srv://...`).
              </p>
            </div>
          </div>

          {/* Bottom Action Controls */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-white/5">
            <button
              type="button"
              onClick={handleResetDefaults}
              className="text-xs text-red-400 hover:text-red-300 hover:underline transition-all cursor-pointer"
            >
              Reset all settings to default values
            </button>

            <div className="flex items-center gap-3 w-full sm:w-auto">
              <button
                type="button"
                onClick={handleRunDiagnostics}
                disabled={isTesting}
                className="flex-1 sm:flex-none px-5 py-3 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-white font-medium text-xs transition-all cursor-pointer"
              >
                Test Configuration
              </button>

              <button
                type="submit"
                className="flex-1 sm:flex-none px-7 py-3 gradient-button rounded-2xl text-white font-semibold text-sm transition-all cursor-pointer hover:shadow-indigo-500/20 active:scale-95"
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
