'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import DashboardLayout from '@/components/DashboardLayout';
import { getStoredSettings, saveStoredSettings, DEFAULT_SETTINGS, fetchWithSettings } from '@/lib/settings';
import { useAuth } from '@/contexts/AuthContext';

export default function SettingsPage() {
  const { user, loading: authLoading } = useAuth();
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [saveStatus, setSaveStatus] = useState('');
  
  // YouTube integration state
  const [ytAccount, setYtAccount] = useState(null);
  const [isCheckingYt, setIsCheckingYt] = useState(true);
  const [isDisconnectingYt, setIsDisconnectingYt] = useState(false);
  const [ytBanner, setYtBanner] = useState(null);
  const [copiedRedirectUri, setCopiedRedirectUri] = useState(false);
  const [ytMeta, setYtMeta] = useState({ isConfigured: true, googleProjectId: '79839125649' });

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
  });

  const fetchYouTubeStatus = async () => {
    try {
      setIsCheckingYt(true);
      const res = await fetchWithSettings('/api/youtube/status');
      if (res.ok) {
        const data = await res.json();
        setYtAccount(data.connected ? data.account : null);
        setYtMeta({
          isConfigured: data.isConfigured !== false,
          googleProjectId: data.googleProjectId || '79839125649',
        });
      }
    } catch (err) {
      console.error('Failed to fetch YouTube status:', err);
    } finally {
      setIsCheckingYt(false);
    }
  };

  const handleDisconnectYouTube = async () => {
    if (!confirm('Are you sure you want to disconnect this YouTube channel?')) return;
    try {
      setIsDisconnectingYt(true);
      const res = await fetchWithSettings('/api/youtube/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'disconnect' }),
      });
      if (res.ok) {
        setYtAccount(null);
        setYtBanner({ type: 'success', message: 'YouTube channel disconnected.' });
        setTimeout(() => setYtBanner(null), 4000);
      }
    } catch (err) {
      console.error('Failed to disconnect YouTube:', err);
      setYtBanner({ type: 'error', message: 'Failed to disconnect YouTube account.' });
    } finally {
      setIsDisconnectingYt(false);
    }
  };

  useEffect(() => {
    const loaded = getStoredSettings();
    setSettings(loaded);

    if (!authLoading) {
      if (user) {
        fetchYouTubeStatus();
      } else {
        setYtAccount(null);
        setIsCheckingYt(false);
      }
    }

    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('youtube') === 'connected') {
        const ch = params.get('channel');
        setYtBanner({
          type: 'success',
          message: ch ? `Successfully connected YouTube channel "${ch}"!` : 'Successfully connected YouTube channel!',
        });
        setTimeout(() => setYtBanner(null), 5000);
      } else if (params.get('youtube_error')) {
        setYtBanner({
          type: 'error',
          message: `YouTube connection error: ${params.get('youtube_error')}`,
        });
        setTimeout(() => setYtBanner(null), 6000);
      }
    }
  }, [user, authLoading]);

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
      badge: '🧠 High Reasoning',
      badgeColor: 'text-[#f59e0b] bg-[#360c0c] border-[#731111]',
      description: 'Free tier access to Mistral Small, Open Mistral 7B, and Open Mixtral 8x7B models.',
      keyField: 'mistralKey',
      modelField: 'mistralModel',
      models: [
        { label: 'Mistral Small Latest (Recommended)', value: 'mistral-small-latest' },
        { label: 'Open Mistral 7B (Fast)', value: 'open-mistral-7b' },
        { label: 'Open Mixtral 8x7B', value: 'open-mixtral-8x7b' },
        { label: 'Mistral Large Latest', value: 'mistral-large-latest' },
      ],
      placeholder: 'TFb...',
      docsUrl: 'https://console.mistral.ai/api-keys/',
    },
    {
      id: 'gemini',
      name: 'Google Gemini',
      badge: '✨ Multimodal',
      badgeColor: 'text-[#2cb7d3] bg-[#0f2d34] border-[#1e7d8f]',
      description: 'Google AI Studio gives 15 RPM & 1M TPM for free with Gemini 1.5 & 2.0 Flash models.',
      keyField: 'geminiKey',
      modelField: 'geminiModel',
      models: [
        { label: 'Gemini 1.5 Flash (Recommended)', value: 'gemini-1.5-flash' },
        { label: 'Gemini 2.0 Flash', value: 'gemini-2.0-flash' },
        { label: 'Gemini 1.5 Pro', value: 'gemini-1.5-pro' },
      ],
      placeholder: 'AIzaSy...',
      docsUrl: 'https://aistudio.google.com/app/apikey',
    },
    {
      id: 'openai',
      name: 'OpenAI GPT',
      badge: '🎯 Highly Accurate',
      badgeColor: 'text-[#22c55e] bg-[#1d2125] border-[#39414b]',
      description: 'Fast, high accuracy structured outputs with GPT-4o Mini or GPT-4o.',
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

  // Active selected provider object
  const activeProvider = providers.find((p) => p.id === (settings.aiProvider || 'mistral')) || providers[1];
  const activeTestState = testStates[activeProvider.id];

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto w-full px-4 sm:px-6 py-8 sm:py-12 space-y-8">
        
        {/* Page Title & Overview */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-[#39414b]">
          <div>
            <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-[10px] border border-[#731111] bg-[#360c0c] text-[#fcf2f2] text-xs font-semibold uppercase tracking-wider mb-1.5">
              🔒 Client-Side Preferences
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white">
              Application <span className="text-[#dd2222]">Settings</span>
            </h1>
            <p className="text-[#909cac] text-xs sm:text-sm font-normal mt-0.5 max-w-xl">
              Configure your active AI provider and YouTube Channel connection. Database and binary paths are securely loaded from server environment variables.
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

        {/* YouTube Connection Status Banner */}
        {ytBanner && (
          <div
            className={`flex items-center justify-between gap-3 p-3.5 rounded-[10px] text-xs font-medium border ${
              ytBanner.type === 'success'
                ? 'bg-[#22c55e]/15 border-[#22c55e]/30 text-[#86efac]'
                : 'bg-[#ef4444]/15 border-[#ef4444]/30 text-[#fca5a5]'
            }`}
          >
            <div className="flex items-center gap-2">
              <span className="font-bold">{ytBanner.type === 'success' ? '✓' : '✕'}</span>
              <span>{ytBanner.message}</span>
            </div>
            <button
              onClick={() => setYtBanner(null)}
              className="text-[#909cac] hover:text-white text-xs cursor-pointer font-bold px-1"
            >
              ✕
            </button>
          </div>
        )}

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

        {/* Section 1: AI Provider Selection & Inputs (Only selected provider shown) */}
        <section className="space-y-4">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#dd2222]"></span>
              1. AI Provider & Models
            </h2>
            <p className="text-[#909cac] text-xs font-normal mt-0.5">
              Select your AI provider below. Only the selected provider’s configuration and API keys will be shown.
            </p>
          </div>

          {/* Provider Selection Tabs */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {providers.map((p) => {
              const isSelected = (settings.aiProvider || 'mistral') === p.id;
              const hasKey = Boolean(settings[p.keyField]);

              return (
                <button
                  type="button"
                  key={p.id}
                  onClick={() => handleChange('aiProvider', p.id)}
                  className={`p-3.5 rounded-[12px] text-left cursor-pointer transition-all border flex flex-col justify-between ${
                    isSelected
                      ? 'bg-[#360c0c] border-[#dd2222] shadow-md shadow-red-950/40'
                      : 'bg-[#2d3239] border-[#39414b] hover:border-[#4b5563]'
                  }`}
                >
                  <div>
                    <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-[8px] border mb-2 ${p.badgeColor}`}>
                      {p.badge}
                    </span>
                    <h3 className="font-bold text-white text-sm">{p.name}</h3>
                  </div>

                  <div className="mt-3 pt-2 border-t border-[#39414b] flex items-center justify-between text-[11px] w-full">
                    <span className="text-[#6e7d91]">Status</span>
                    <span className={hasKey ? 'text-[#22c55e] font-semibold' : 'text-[#909cac]'}>
                      {hasKey ? '✓ Set' : 'Empty'}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* ONLY the Selected Provider Configuration Card is Shown */}
          <div className="app-panel p-5 border-[#dd2222] bg-[#2d3239] space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#39414b]">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-[10px] bg-[#1d2125] border border-[#39414b] flex items-center justify-center font-extrabold text-xs text-[#dd2222]">
                  {activeProvider.name.slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <h4 className="font-bold text-white text-sm flex items-center gap-2">
                    {activeProvider.name} Configuration
                    <span className="text-[10px] bg-[#dd2222]/20 text-[#fcf2f2] border border-[#dd2222]/40 px-2 py-0.5 rounded-[10px] font-bold">
                      ACTIVE
                    </span>
                  </h4>
                  <a
                    href={activeProvider.docsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[11px] text-[#2cb7d3] hover:underline font-normal"
                  >
                    Get API Key from {activeProvider.name} →
                  </a>
                </div>
              </div>

              <button
                type="button"
                disabled={activeTestState.loading || !settings[activeProvider.keyField]}
                onClick={() =>
                  runDiagnosticTest(activeProvider.id, {
                    type: 'ai',
                    aiConfig: {
                      provider: activeProvider.id,
                      key: settings[activeProvider.keyField],
                      model: settings[activeProvider.modelField],
                    },
                  })
                }
                className="px-3 py-1.5 btn-secondary text-xs disabled:opacity-40 flex items-center gap-1.5 cursor-pointer self-start sm:self-auto"
              >
                {activeTestState.loading ? (
                  <>
                    <svg className="animate-spin h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    <span>Verifying...</span>
                  </>
                ) : (
                  <span>⚡ Test {activeProvider.name}</span>
                )}
              </button>
            </div>

            {/* Test Results */}
            {activeTestState.result && (
              <div className="p-3 rounded-[10px] bg-[#22c55e]/15 border border-[#22c55e]/30 text-[#f6f7f8] text-xs font-medium flex items-center gap-2">
                <span className="text-[#22c55e]">✓</span> {activeTestState.result}
              </div>
            )}
            {activeTestState.error && (
              <div className="p-3 rounded-[10px] bg-[#ef4444]/15 border border-[#ef4444]/30 text-[#f6f7f8] text-xs font-medium flex items-center gap-2">
                <span className="text-[#ef4444]">✕</span> {activeTestState.error}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* API Key Input */}
              <div>
                <label className="block text-xs font-semibold text-[#b9c0ca] uppercase tracking-wider mb-1">
                  {activeProvider.name} API Key
                </label>
                <div className="relative">
                  <input
                    type={showKeys[activeProvider.id] ? 'text' : 'password'}
                    value={settings[activeProvider.keyField] || ''}
                    onChange={(e) => handleChange(activeProvider.keyField, e.target.value)}
                    placeholder={activeProvider.placeholder}
                    className="w-full px-3 py-2 app-input text-xs font-mono pr-9"
                  />
                  <button
                    type="button"
                    onClick={() => toggleShowKey(activeProvider.id)}
                    className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-[#909cac] hover:text-white"
                    title={showKeys[activeProvider.id] ? 'Hide Key' : 'Show Key'}
                  >
                    {showKeys[activeProvider.id] ? (
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
                    {settings[activeProvider.modelField] || activeProvider.models[0].value}
                  </span>
                </div>
                <select
                  value={settings[activeProvider.modelField] || activeProvider.models[0].value}
                  onChange={(e) => handleChange(activeProvider.modelField, e.target.value)}
                  className="w-full px-3 py-2 app-input text-xs mb-2"
                >
                  {activeProvider.models.map((m) => (
                    <option key={m.value} value={m.value} className="bg-[#2d3239] text-white">
                      {m.label}
                    </option>
                  ))}
                </select>
                <input
                  type="text"
                  placeholder="Or type custom model ID..."
                  value={settings[activeProvider.modelField] || ''}
                  onChange={(e) => handleChange(activeProvider.modelField, e.target.value)}
                  className="w-full px-3 py-1.5 app-input text-[11px] font-mono text-[#b9c0ca]"
                />
              </div>
            </div>
          </div>
        </section>

        {/* Section 2: YouTube Shorts Channel Integration */}
        <section className="space-y-4 pt-2">
          <div className="flex items-center justify-between">
            <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#dd2222]"></span>
              2. YouTube Channel Connection
            </h2>
            <Link
              href="/history"
              className="text-xs text-[#dd2222] hover:underline flex items-center gap-1 font-semibold"
            >
              <span>View Publishing History</span>
              <span>→</span>
            </Link>
          </div>

          <div className="app-panel p-5 space-y-4">
            {!authLoading && !user ? (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-[12px] bg-[#1d2125] border border-[#39414b]">
                <div className="space-y-1">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <span>Sign In Required</span>
                    <span className="px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 text-[10px] font-mono uppercase font-bold">
                      Account Linked
                    </span>
                  </h3>
                  <p className="text-xs text-[#909cac] max-w-xl leading-relaxed">
                    YouTube channel connections are strictly isolated to your personal account. Sign in with Google or Email to connect and manage your YouTube channel.
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Link
                    href="/login?returnTo=/settings"
                    className="px-5 py-2.5 rounded-[10px] bg-[#dd2222] hover:bg-[#b91c1c] text-white text-xs font-bold uppercase tracking-wider shadow-lg shadow-red-900/40 flex items-center justify-center gap-2 transition-transform hover:scale-105"
                  >
                    <span>Sign In to Connect</span>
                  </Link>
                </div>
              </div>
            ) : isCheckingYt ? (
              <div className="flex items-center gap-2 text-xs text-[#909cac] p-4 rounded-[10px] bg-[#1d2125] border border-[#39414b]">
                <div className="w-3.5 h-3.5 rounded-full border-2 border-[#dd2222] border-t-transparent animate-spin"></div>
                <span>Checking connected YouTube channel status...</span>
              </div>
            ) : ytAccount ? (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-[12px] bg-[#1d2125] border border-[#22c55e]/40">
                <div className="flex items-center gap-3 min-w-0">
                  {ytAccount.channelThumbnail ? (
                    <img
                      src={ytAccount.channelThumbnail}
                      alt={ytAccount.channelTitle}
                      className="w-12 h-12 rounded-full object-cover border-2 border-[#dd2222] shrink-0"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-[#dd2222] flex items-center justify-center text-white font-bold text-sm shrink-0">
                      YT
                    </div>
                  )}
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-sm text-white truncate">{ytAccount.channelTitle}</h3>
                      <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 shrink-0">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                        Connected
                      </span>
                    </div>
                    <p className="text-xs text-[#909cac] truncate mt-0.5">
                      {ytAccount.channelHandle ? `@${ytAccount.channelHandle.replace(/^@/, '')}` : `ID: ${ytAccount.channelId}`}
                      {ytAccount.subscriberCount && ` · ${Number(ytAccount.subscriberCount).toLocaleString()} subscribers`}
                    </p>
                    <p className="text-[10px] text-[#6e7d91] mt-0.5">
                      Ready for direct Shorts upload and schedule publishing (max 90s vertical 9:16).
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <a
                    href="/api/youtube/auth"
                    className="px-3.5 py-1.5 rounded-[8px] bg-[#2d3239] hover:bg-[#39414b] text-[#eeeff2] border border-[#39414b] text-xs font-semibold transition-colors"
                  >
                    Switch Channel
                  </a>
                  <button
                    onClick={handleDisconnectYouTube}
                    disabled={isDisconnectingYt}
                    className="px-3.5 py-1.5 rounded-[8px] bg-[#ef4444]/15 hover:bg-[#ef4444]/25 text-[#ef4444] border border-[#ef4444]/30 text-xs font-semibold transition-colors disabled:opacity-50 cursor-pointer"
                  >
                    {isDisconnectingYt ? 'Disconnecting...' : 'Disconnect'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-[12px] bg-[#360c0c]/60 border border-[#731111]">
                <div className="space-y-1">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <span>No YouTube Channel Connected</span>
                    <span className="px-2 py-0.5 rounded-full bg-red-500/20 border border-red-500/40 text-red-300 text-[10px] font-mono uppercase font-bold">
                      Ready to Connect
                    </span>
                  </h3>
                  <p className="text-xs text-[#909cac] max-w-xl leading-relaxed">
                    Connect your YouTube channel using Google OAuth2 to publish your AI-generated vertical Shorts directly with auto-generated titles, tags, descriptions, and hashtags.
                  </p>
                </div>
                <a
                  href="/api/youtube/auth"
                  className="px-5 py-2.5 rounded-[10px] bg-[#dd2222] hover:bg-[#b91c1c] text-white text-xs font-bold uppercase tracking-wider shadow-lg shadow-red-900/40 flex items-center justify-center gap-2 transition-transform hover:scale-105 shrink-0"
                >
                  <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                  </svg>
                  <span>Connect YouTube Channel</span>
                </a>
              </div>
            )}

            {/* Google OAuth Setup & 'This app is blocked' Troubleshooting Guide */}
            <div className="p-4 rounded-[12px] bg-[#1d2125] border border-[#39414b] space-y-3 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-bold text-white flex items-center gap-2 text-xs">
                  <span className="p-1 rounded bg-amber-500/10 text-amber-400">⚠️</span>
                  <span>Why Google Shows &quot;This app is blocked&quot; &amp; How to Fix It</span>
                </span>
                <span className="text-[10px] text-[#f59e0b] bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20 font-mono font-semibold">
                  Project: {ytMeta.googleProjectId || '79839125649'}
                </span>
              </div>

              <div className="p-3 rounded-[8px] bg-[#171a1d] border border-[#2d3239] text-[#909cac] text-[11px] leading-relaxed space-y-1.5">
                <p>
                  <strong className="text-white">Why did Google block this?</strong> YouTube upload requires sensitive permissions (<code className="text-[#e2e8f0]">youtube.upload</code>). While your Google Cloud OAuth consent screen is in <strong>Testing</strong> mode, Google automatically blocks any Google account that is not explicitly registered under your project&apos;s <strong>Test users</strong> list.
                </p>
              </div>

              <div className="space-y-2">
                <p className="text-[#b9c0ca] text-[11px] font-semibold">
                  Follow these 3 quick steps in Google Cloud Console to unblock your account:
                </p>
                <ol className="list-decimal list-inside space-y-2 text-[#909cac] text-[11px] pl-1">
                  <li className="leading-relaxed">
                    <strong className="text-white">Add your email as a Test User:</strong> Open{' '}
                    <a
                      href={`https://console.cloud.google.com/apis/credentials/consent?project=${ytMeta.googleProjectId || '79839125649'}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#dd2222] hover:underline font-semibold"
                    >
                      OAuth consent screen (Project {ytMeta.googleProjectId || '79839125649'}) ↗
                    </a>
                    , scroll down to the <strong>Test users</strong> section, click <strong>+ ADD USERS</strong>, type the exact Gmail/Google email you are connecting with, and click <strong>Save</strong>.
                  </li>
                  <li className="leading-relaxed">
                    <strong className="text-white">Verify YouTube API is enabled:</strong> Ensure{' '}
                    <a
                      href={`https://console.cloud.google.com/apis/library/youtube.googleapis.com?project=${ytMeta.googleProjectId || '79839125649'}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#dd2222] hover:underline font-semibold"
                    >
                      YouTube Data API v3 ↗
                    </a>{' '}
                    shows as <strong>ENABLED</strong> for your project.
                  </li>
                  <li className="leading-relaxed">
                    <strong className="text-white">Connect and bypass the Unverified Warning:</strong> Return here and click <strong>Connect YouTube Channel</strong>. Select your test user Gmail. Google will show &quot;Google hasn&apos;t verified this app&quot;. Click <strong className="text-white">Advanced</strong> (at the bottom) &rarr; Click <strong className="text-white">Go to Shorts AI (unsafe)</strong> &rarr; Click <strong className="text-white">Continue</strong>.
                  </li>
                </ol>
              </div>
            </div>

            <div className="pt-3 border-t border-[#39414b] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-[#909cac]">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                <span>Google OAuth credentials securely managed on server via <code className="text-[#fcf2f2] font-mono text-[11px]">.env.local</code>.</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  const redirect = `${window.location.origin}/api/youtube/callback`;
                  navigator.clipboard.writeText(redirect);
                  setCopiedRedirectUri(true);
                  setTimeout(() => setCopiedRedirectUri(false), 2500);
                }}
                className="px-2.5 py-1 rounded-[6px] bg-[#1d2125] hover:bg-[#39414b] text-[11px] text-[#eeeff2] border border-[#39414b] transition-colors cursor-pointer self-start sm:self-auto flex items-center gap-1"
              >
                {copiedRedirectUri ? (
                  <span className="text-[#22c55e]">✓ Copied Redirect URI</span>
                ) : (
                  <span>📋 Copy Redirect URI</span>
                )}
              </button>
            </div>
          </div>
        </section>


        {/* Data Management & Backup */}
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
