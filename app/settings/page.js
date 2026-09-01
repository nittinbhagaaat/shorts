'use client';

import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { getStoredSettings, saveStoredSettings, DEFAULT_SETTINGS } from '@/lib/settings';

export default function SettingsPage() {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [isLoaded, setIsLoaded] = useState(false);
  const [saveStatus, setSaveStatus] = useState('');
  
  const [showKeys, setShowKeys] = useState({
    mistral: false,
    gemini: false,
    openai: false,
    groq: false,
  });

  const [testStates, setTestStates] = useState({
    mistral: { loading: false, result: null, error: null },
    gemini: { loading: false, result: null, error: null },
    openai: { loading: false, result: null, error: null },
    groq: { loading: false, result: null, error: null },
    ffmpeg: { loading: false, result: null, error: null },
    ytDlp: { loading: false, result: null, error: null },
    mongodb: { loading: false, result: null, error: null },
  });

  useEffect(() => {
    const loaded = getStoredSettings();
    setSettings(loaded);
    setIsLoaded(true);
  }, []);

  const handleChange = (field, value) => {
    setSettings((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const toggleShowKey = (provider) => {
    setShowKeys((prev) => ({
      ...prev,
      [provider]: !prev[provider],
    }));
  };

  const handleSave = () => {
    try {
      saveStoredSettings(settings);
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus(''), 3000);
    } catch (err) {
      console.error(err);
      setSaveStatus('error');
    }
  };

  const handleResetDefaults = () => {
    if (confirm('Are you sure you want to reset all settings to default values?')) {
      setSettings(DEFAULT_SETTINGS);
      saveStoredSettings(DEFAULT_SETTINGS);
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus(''), 3000);
    }
  };

  const handleExportJson = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(settings, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `clip-studio-settings-${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleImportJson = (e) => {
    const fileReader = new FileReader();
    if (e.target.files && e.target.files[0]) {
      fileReader.readAsText(e.target.files[0], "UTF-8");
      fileReader.onload = (event) => {
        try {
          const parsed = JSON.parse(event.target.result);
          const merged = { ...DEFAULT_SETTINGS, ...parsed };
          setSettings(merged);
          saveStoredSettings(merged);
          setSaveStatus('saved');
          setTimeout(() => setSaveStatus(''), 3000);
        } catch (err) {
          alert('Failed to parse settings JSON file: ' + err.message);
        }
      };
    }
  };

  const runDiagnosticTest = async (testType, payload = {}) => {
    setTestStates((prev) => ({
      ...prev,
      [testType]: { loading: true, result: null, error: null },
    }));

    try {
      const res = await fetch('/api/test-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (res.ok && data.success) {
        setTestStates((prev) => ({
          ...prev,
          [testType]: { loading: false, result: data.message, error: null },
        }));
      } else {
        setTestStates((prev) => ({
          ...prev,
          [testType]: { loading: false, result: null, error: data.error || 'Test failed' },
        }));
      }
    } catch (err) {
      setTestStates((prev) => ({
        ...prev,
        [testType]: { loading: false, result: null, error: err.message || 'Network error' },
      }));
    }
  };

  const providers = [
    {
      id: 'groq',
      name: 'Groq Cloud LPU',
      badge: '⚡ Ultra Fast',
      badgeColor: 'text-[#2cb7d3] bg-[#0f2d34] border-[#1e7d8f]',
      description: 'Ultra high-speed LPU inference with OpenAI GPT-OSS 120B/20B, Qwen 3.6/3.8, and Groq Compound models.',
      keyField: 'groqKey',
      modelField: 'groqModel',
      models: [
        { label: 'openai/gpt-oss-120b (Recommended - OpenAI 120B)', value: 'openai/gpt-oss-120b' },
        { label: 'openai/gpt-oss-20b (OpenAI 20B)', value: 'openai/gpt-oss-20b' },
        { label: 'openai/gpt-oss-safeguard-20b', value: 'openai/gpt-oss-safeguard-20b' },
        { label: 'qwen/qwen3.6-27b (Alibaba Cloud 27B)', value: 'qwen/qwen3.6-27b' },
        { label: 'qwen/qwen3.8-27b (Alibaba Cloud 27B)', value: 'qwen/qwen3.8-27b' },
        { label: 'groq/compound (Groq Compound)', value: 'groq/compound' },
        { label: 'groq/compound-mini (Groq Compound Mini)', value: 'groq/compound-mini' },
        { label: 'canopylabs/orpheus-v1-english (Canopy Labs)', value: 'canopylabs/orpheus-v1-english' },
        { label: 'canopylabs/orpheus-arabic-saudi (Canopy Labs)', value: 'canopylabs/orpheus-arabic-saudi' },
        { label: 'meta-llama/llama-prompt-guard-2-86m', value: 'meta-llama/llama-prompt-guard-2-86m' },
        { label: 'meta-llama/llama-prompt-guard-2-22m', value: 'meta-llama/llama-prompt-guard-2-22m' },
        { label: 'llama-3.3-70b-versatile (Meta Llama 3.3)', value: 'llama-3.3-70b-versatile' },
        { label: 'llama3-8b-8192 (Meta Llama 3 8B)', value: 'llama3-8b-8192' },
        { label: 'mixtral-8x7b-32768 (Mixtral 8x7B)', value: 'mixtral-8x7b-32768' },
      ],
      placeholder: 'gsk_...',
      docsUrl: 'https://console.groq.com/keys',
    },
    {
      id: 'mistral',
      name: 'Mistral AI',
      badge: '🧠 High Reasoning (Free Tier)',
      badgeColor: 'text-[#f59e0b] bg-[#360c0c] border-[#731111]',
      description: 'Free tier access to Mistral Small, Open Mistral 7B, and Open Mixtral 8x7B models.',
      keyField: 'mistralKey',
      modelField: 'mistralModel',
      models: [
        { label: 'Mistral Small Latest (Free Tier - Recommended)', value: 'mistral-small-latest' },
        { label: 'Open Mistral 7B (Free Tier - Fast)', value: 'open-mistral-7b' },
        { label: 'Open Mixtral 8x7B (Free Tier)', value: 'open-mixtral-8x7b' },
        { label: 'Mistral Large Latest', value: 'mistral-large-latest' },
      ],
      placeholder: 'TFb...',
      docsUrl: 'https://console.mistral.ai/api-keys/',
    },
    {
      id: 'gemini',
      name: 'Google Gemini',
      badge: '✨ Multimodal (Free Tier)',
      badgeColor: 'text-[#2cb7d3] bg-[#0f2d34] border-[#1e7d8f]',
      description: 'Google AI Studio Free Tier gives 15 requests/minute & 1M tokens/minute for free with Gemini 1.5 & 2.0 Flash.',
      keyField: 'geminiKey',
      modelField: 'geminiModel',
      models: [
        { label: 'Gemini 1.5 Flash (100% Free Tier - Recommended)', value: 'gemini-1.5-flash' },
        { label: 'Gemini 2.0 Flash (Free Tier)', value: 'gemini-2.0-flash' },
        { label: 'Gemini 1.5 Pro (Free Tier - 2 RPM)', value: 'gemini-1.5-pro' },
      ],
      placeholder: 'AIzaSy...',
      docsUrl: 'https://aistudio.google.com/app/apikey',
    },
    {
      id: 'openai',
      name: 'OpenAI GPT',
      badge: '🎯 Highly Accurate',
      badgeColor: 'text-[#22c55e] bg-[#1d2125] border-[#39414b]',
      description: 'Fast, high accuracy structured outputs with GPT-4o Mini or GPT-3.5 Turbo.',
      keyField: 'openaiKey',
      modelField: 'openaiModel',
      models: [
        { label: 'GPT-4o Mini (Standard - Recommended)', value: 'gpt-4o-mini' },
        { label: 'GPT-3.5 Turbo', value: 'gpt-3.5-turbo' },
        { label: 'GPT-4o', value: 'gpt-4o' },
      ],
      placeholder: 'sk-proj-...',
      docsUrl: 'https://platform.openai.com/api-keys',
    },
  ];

  if (!isLoaded) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="flex items-center gap-2.5 text-[#909cac] text-xs font-normal">
            <svg className="animate-spin h-4 w-4 text-[#dd2222]" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            <span>Loading settings from localStorage...</span>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto w-full px-4 sm:px-6 py-8 sm:py-12 space-y-8">
        
        {/* Page Title & Overview */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-[#39414b]">
          <div>
            <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-[10px] border border-[#731111] bg-[#360c0c] text-[#fcf2f2] text-xs font-semibold uppercase tracking-wider mb-1.5">
              🔒 100% Client-Side LocalStorage
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white">
              Application <span className="text-[#dd2222]">Settings</span>
            </h1>
            <p className="text-[#909cac] text-xs sm:text-sm font-normal mt-0.5 max-w-2xl">
              Configure your AI models, local FFmpeg/yt-dlp tools, and database connection. All API keys and paths are stored in your browser’s <code className="text-[#fcf2f2] bg-[#1d2125] px-1.5 py-0.5 rounded-[10px] font-mono text-xs border border-[#39414b]">localStorage</code> and never saved to server files.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start md:self-auto">
            <button
              onClick={handleSave}
              className="px-4 py-2.5 btn-primary text-xs flex items-center gap-1.5 cursor-pointer"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span>Save Configuration</span>
            </button>
          </div>
        </div>

        {/* Save Feedback Banner */}
        {saveStatus === 'saved' && (
          <div className="flex items-center gap-2.5 p-3.5 bg-[#22c55e]/15 border border-[#22c55e]/30 text-[#f6f7f8] rounded-[10px] text-xs font-medium">
            <svg className="w-4 h-4 shrink-0 text-[#22c55e]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>All settings successfully updated and saved in your browser’s localStorage!</span>
          </div>
        )}

        {saveStatus === 'error' && (
          <div className="flex items-center gap-2.5 p-3.5 bg-[#ef4444]/15 border border-[#ef4444]/30 text-[#fcf2f2] rounded-[10px] text-xs font-medium">
            <svg className="w-4 h-4 shrink-0 text-[#ef4444]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>Failed to save settings. Please check your browser storage permissions.</span>
          </div>
        )}

        {/* Section 1: AI Provider Selection & Keys */}
        <section className="space-y-4">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#dd2222]"></span>
              1. AI Models & Providers
            </h2>
            <p className="text-[#909cac] text-xs font-normal mt-0.5">
              Select your primary AI engine for identifying viral shorts and Hinglish captioning. You can configure multiple keys as fallbacks.
            </p>
          </div>

          {/* Active Provider Selector Radios */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {providers.map((p) => {
              const isSelected = settings.aiProvider === p.id;
              const hasKey = Boolean(settings[p.keyField]);

              return (
                <div
                  key={p.id}
                  onClick={() => handleChange('aiProvider', p.id)}
                  className={`p-3.5 rounded-[10px] cursor-pointer transition-colors border flex flex-col justify-between relative ${
                    isSelected
                      ? 'bg-[#360c0c] border-[#dd2222]'
                      : 'bg-[#2d3239] border-[#39414b] hover:border-[#4b5563]'
                  }`}
                >
                  <div>
                    <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-[10px] border mb-2 ${p.badgeColor}`}>
                      {p.badge}
                    </span>
                    <h3 className="font-bold text-white text-sm">{p.name}</h3>
                    <p className="text-[#909cac] text-xs font-normal mt-1 line-clamp-2">
                      {p.description}
                    </p>
                  </div>

                  <div className="mt-3 pt-2.5 border-t border-[#39414b] flex items-center justify-between text-[11px]">
                    <span className="text-[#6e7d91] font-medium">Status</span>
                    <span className={hasKey ? 'text-[#22c55e] font-semibold' : 'text-[#909cac]'}>
                      {hasKey ? '✓ Configured' : 'No Key'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Provider Specific Configuration Cards */}
          <div className="space-y-3 pt-1">
            {providers.map((p) => {
              const isCurrent = settings.aiProvider === p.id;
              const testState = testStates[p.id];

              return (
                <div
                  key={p.id}
                  className={`app-panel p-4 sm:p-5 ${
                    isCurrent ? 'border-[#dd2222] bg-[#2d3239]' : 'border-[#39414b] bg-[#2d3239]'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3 pb-2.5 border-b border-[#39414b]">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-[10px] bg-[#1d2125] border border-[#39414b] flex items-center justify-center font-bold text-xs text-[#dd2222]">
                        {p.name.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <h4 className="font-bold text-white text-sm flex items-center gap-2">
                          {p.name}
                          {isCurrent && (
                            <span className="text-[10px] bg-[#dd2222]/20 text-[#fcf2f2] border border-[#dd2222]/40 px-2 py-0.5 rounded-[10px] font-bold">
                              ACTIVE DEFAULT
                            </span>
                          )}
                        </h4>
                        <a
                          href={p.docsUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[11px] text-[#2cb7d3] hover:underline font-normal"
                        >
                          Get API Key from {p.name} →
                        </a>
                      </div>
                    </div>

                    <button
                      type="button"
                      disabled={testState.loading || !settings[p.keyField]}
                      onClick={() =>
                        runDiagnosticTest(p.id, {
                          type: 'ai',
                          aiConfig: {
                            provider: p.id,
                            key: settings[p.keyField],
                            model: settings[p.modelField],
                          },
                        })
                      }
                      className="px-3 py-1.5 btn-secondary text-xs disabled:opacity-40 flex items-center gap-1.5 cursor-pointer"
                    >
                      {testState.loading ? (
                        <>
                          <svg className="animate-spin h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                          </svg>
                          <span>Verifying...</span>
                        </>
                      ) : (
                        <span>⚡ Test {p.name}</span>
                      )}
                    </button>
                  </div>

                  {/* Feedback Message */}
                  {testState.result && (
                    <div className="mb-3 p-2.5 rounded-[10px] bg-[#22c55e]/15 border border-[#22c55e]/30 text-[#f6f7f8] text-xs font-medium flex items-center gap-2">
                      <span className="text-[#22c55e]">✓</span> {testState.result}
                    </div>
                  )}
                  {testState.error && (
                    <div className="mb-3 p-2.5 rounded-[10px] bg-[#ef4444]/15 border border-[#ef4444]/30 text-[#f6f7f8] text-xs font-medium flex items-center gap-2">
                      <span className="text-[#ef4444]">✕</span> {testState.error}
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {/* API Key Input */}
                    <div>
                      <label className="block text-xs font-semibold text-[#b9c0ca] uppercase tracking-wider mb-1">
                        {p.name} API Key
                      </label>
                      <div className="relative">
                        <input
                          type={showKeys[p.id] ? 'text' : 'password'}
                          value={settings[p.keyField] || ''}
                          onChange={(e) => handleChange(p.keyField, e.target.value)}
                          placeholder={p.placeholder}
                          className="w-full px-3 py-2 app-input text-xs font-mono pr-9"
                        />
                        <button
                          type="button"
                          onClick={() => toggleShowKey(p.id)}
                          className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-[#909cac] hover:text-white"
                          title={showKeys[p.id] ? 'Hide Key' : 'Show Key'}
                        >
                          {showKeys[p.id] ? (
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                            </svg>
                          ) : (
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Model Selector */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-xs font-semibold text-[#b9c0ca] uppercase tracking-wider">
                          Model Architecture
                        </label>
                        <span className="text-[10px] text-[#2cb7d3] font-mono">
                          {settings[p.modelField] || p.models[0].value}
                        </span>
                      </div>
                      <select
                        value={settings[p.modelField] || p.models[0].value}
                        onChange={(e) => handleChange(p.modelField, e.target.value)}
                        className="w-full px-3 py-2 app-input text-xs mb-1.5"
                      >
                        {p.models.map((m) => (
                          <option key={m.value} value={m.value} className="bg-[#2d3239] text-white">
                            {m.label}
                          </option>
                        ))}
                      </select>
                      <input
                        type="text"
                        placeholder="Or type custom model ID..."
                        value={settings[p.modelField] || ''}
                        onChange={(e) => handleChange(p.modelField, e.target.value)}
                        className="w-full px-3 py-1.5 app-input text-[11px] font-mono text-[#b9c0ca]"
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Section 2: Local CLI Binaries */}
        <section className="space-y-4 pt-2">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#2cb7d3]"></span>
              2. Video Rendering & Download Binaries
            </h2>
            <p className="text-[#909cac] text-xs font-normal mt-0.5">
              Specify the local execution paths for FFmpeg (video subtitle burning and 9:16 cropping) and yt-dlp (fast video downloads).
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* FFmpeg Path Card */}
            <div className="app-panel p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-white text-xs">FFmpeg Binary Path</h4>
                  <p className="text-[#909cac] text-[11px] font-normal">Burn ASS subtitles & 9:16 crop</p>
                </div>
                <button
                  type="button"
                  disabled={testStates.ffmpeg.loading}
                  onClick={() =>
                    runDiagnosticTest('ffmpeg', {
                      type: 'ffmpeg',
                      ffmpegPath: settings.ffmpegPath,
                    })
                  }
                  className="px-2.5 py-1 btn-secondary text-xs disabled:opacity-40 cursor-pointer"
                >
                  {testStates.ffmpeg.loading ? 'Testing...' : 'Test FFmpeg'}
                </button>
              </div>

              {testStates.ffmpeg.result && (
                <div className="p-2 rounded-[10px] bg-[#22c55e]/15 border border-[#22c55e]/30 text-[#f6f7f8] text-[11px] font-mono">
                  ✓ {testStates.ffmpeg.result}
                </div>
              )}
              {testStates.ffmpeg.error && (
                <div className="p-2 rounded-[10px] bg-[#ef4444]/15 border border-[#ef4444]/30 text-[#f6f7f8] text-[11px]">
                  ✕ {testStates.ffmpeg.error}
                </div>
              )}

              <input
                type="text"
                value={settings.ffmpegPath}
                onChange={(e) => handleChange('ffmpegPath', e.target.value)}
                placeholder="/opt/homebrew/opt/ffmpeg-full/bin/ffmpeg or ffmpeg"
                className="w-full px-3 py-2 app-input font-mono text-xs"
              />
            </div>

            {/* yt-dlp Path Card */}
            <div className="app-panel p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-white text-xs">yt-dlp Binary Path</h4>
                  <p className="text-[#909cac] text-[11px] font-normal">Video segment downloader</p>
                </div>
                <button
                  type="button"
                  disabled={testStates.ytDlp.loading}
                  onClick={() =>
                    runDiagnosticTest('ytDlp', {
                      type: 'yt_dlp',
                      ytDlpPath: settings.ytDlpPath,
                    })
                  }
                  className="px-2.5 py-1 btn-secondary text-xs disabled:opacity-40 cursor-pointer"
                >
                  {testStates.ytDlp.loading ? 'Testing...' : 'Test yt-dlp'}
                </button>
              </div>

              {testStates.ytDlp.result && (
                <div className="p-2 rounded-[10px] bg-[#22c55e]/15 border border-[#22c55e]/30 text-[#f6f7f8] text-[11px] font-mono">
                  ✓ {testStates.ytDlp.result}
                </div>
              )}
              {testStates.ytDlp.error && (
                <div className="p-2 rounded-[10px] bg-[#ef4444]/15 border border-[#ef4444]/30 text-[#f6f7f8] text-[11px]">
                  ✕ {testStates.ytDlp.error}
                </div>
              )}

              <input
                type="text"
                value={settings.ytDlpPath}
                onChange={(e) => handleChange('ytDlpPath', e.target.value)}
                placeholder="/opt/homebrew/bin/yt-dlp or yt-dlp"
                className="w-full px-3 py-2 app-input font-mono text-xs"
              />
            </div>
          </div>
        </section>

        {/* Section 3: Subtitles & Rendering Defaults */}
        <section className="space-y-4 pt-2">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#f59e0b]"></span>
              3. Subtitles & Rendering Defaults
            </h2>
            <p className="text-[#909cac] text-xs font-normal mt-0.5">
              Configure whether generated video shorts default to having animated captions or clean video rendering.
            </p>
          </div>

          <div className="app-panel p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h4 className="font-bold text-white text-xs">Default Subtitle Mode</h4>
              <p className="text-[#909cac] text-[11px] font-normal">Choose whether new video shorts default to burned-in styled subtitles or clean video.</p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleChange('enableSubtitlesDefault', true)}
                className={`px-3 py-1.5 rounded-[10px] text-xs font-semibold border transition-colors cursor-pointer ${
                  settings.enableSubtitlesDefault !== false
                    ? 'bg-[#360c0c] border-[#dd2222] text-[#fcf2f2]'
                    : 'bg-[#1d2125] border-[#39414b] text-[#909cac]'
                }`}
              >
                💬 With Subtitles (Default)
              </button>
              <button
                type="button"
                onClick={() => handleChange('enableSubtitlesDefault', false)}
                className={`px-3 py-1.5 rounded-[10px] text-xs font-semibold border transition-colors cursor-pointer ${
                  settings.enableSubtitlesDefault === false
                    ? 'bg-[#360c0c] border-[#dd2222] text-[#fcf2f2]'
                    : 'bg-[#1d2125] border-[#39414b] text-[#909cac]'
                }`}
              >
                🚫 No Subtitles (Clean Video)
              </button>
            </div>
          </div>
        </section>

        {/* Section 4: Database Connection */}
        <section className="space-y-4 pt-2">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#22c55e]"></span>
              4. MongoDB Database Connection
            </h2>
            <p className="text-[#909cac] text-xs font-normal mt-0.5">
              Workspaces and clip metadata are stored in your MongoDB instance.
            </p>
          </div>

          <div className="app-panel p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-bold text-white text-xs">MongoDB Connection URI</h4>
                <p className="text-[#909cac] text-[11px] font-normal">Localhost or MongoDB Atlas connection string</p>
              </div>
              <button
                type="button"
                disabled={testStates.mongodb.loading}
                onClick={() =>
                  runDiagnosticTest('mongodb', {
                    type: 'mongodb',
                    mongodbUri: settings.mongodbUri,
                  })
                }
                className="px-3 py-1 btn-secondary text-xs disabled:opacity-40 cursor-pointer"
              >
                {testStates.mongodb.loading ? 'Connecting...' : 'Test DB Connection'}
              </button>
            </div>

            {testStates.mongodb.result && (
              <div className="p-2 rounded-[10px] bg-[#22c55e]/15 border border-[#22c55e]/30 text-[#f6f7f8] text-xs font-medium">
                ✓ {testStates.mongodb.result}
              </div>
            )}
            {testStates.mongodb.error && (
              <div className="p-2 rounded-[10px] bg-[#ef4444]/15 border border-[#ef4444]/30 text-[#f6f7f8] text-xs font-medium">
                ✕ {testStates.mongodb.error}
              </div>
            )}

            <input
              type="text"
              value={settings.mongodbUri}
              onChange={(e) => handleChange('mongodbUri', e.target.value)}
              placeholder="mongodb://localhost:27017/shorts"
              className="w-full px-3 py-2 app-input font-mono text-xs"
            />
          </div>
        </section>

        {/* Section 4: Data Management & Backup */}
        <section className="pt-4 border-t border-[#39414b] flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={handleExportJson}
              className="px-3 py-2 btn-secondary text-xs flex items-center gap-1.5 cursor-pointer"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              <span>Export JSON</span>
            </button>

            <label className="px-3 py-2 btn-secondary text-xs flex items-center gap-1.5 cursor-pointer">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
              <span>Import JSON</span>
              <input type="file" accept=".json" onChange={handleImportJson} className="hidden" />
            </label>

            <button
              onClick={handleResetDefaults}
              className="px-3 py-2 rounded-[10px] text-xs text-[#ef4444] hover:bg-[#ef4444]/15 border border-transparent transition-colors cursor-pointer"
            >
              Reset Defaults
            </button>
          </div>

          <button
            onClick={handleSave}
            className="w-full sm:w-auto px-6 py-2.5 btn-primary text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span>Save All Configuration</span>
          </button>
        </section>

      </div>
    </DashboardLayout>
  );
}
