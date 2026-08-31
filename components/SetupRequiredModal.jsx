'use client';

import { useState, useEffect } from 'react';
import { getStoredSettings, saveStoredSettings, isAppConfigured } from '@/lib/settings-client';

export default function SetupRequiredModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [settings, setSettings] = useState(null);
  
  // Modal form states
  const [selectedProvider, setSelectedProvider] = useState('groq');
  const [apiKey, setApiKey] = useState('');
  const [mongoUri, setMongoUri] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const checkConfiguration = () => {
    const loaded = getStoredSettings();
    setSettings(loaded);
    const configured = isAppConfigured(loaded);
    setIsOpen(!configured);

    if (!configured) {
      setSelectedProvider(loaded.active_ai_provider || 'groq');
      setMongoUri(loaded.mongodb_uri || '');
      const keyMap = {
        groq: loaded.groq_api_key || '',
        gemini: loaded.gemini_api_key || '',
        mistral: loaded.mistral_api_key || '',
        openai: loaded.openai_api_key || '',
      };
      setApiKey(keyMap[loaded.active_ai_provider || 'groq'] || '');
    }
  };

  useEffect(() => {
    checkConfiguration();

    const handleSettingsUpdate = () => {
      checkConfiguration();
    };

    window.addEventListener('viralclips:settings_updated', handleSettingsUpdate);
    return () => window.removeEventListener('viralclips:settings_updated', handleSettingsUpdate);
  }, []);

  const handleProviderChange = (providerId) => {
    setSelectedProvider(providerId);
    setErrorMessage('');
    if (settings) {
      const keyField = `${providerId}_api_key`;
      setApiKey(settings[keyField] || '');
    }
  };

  const handleSave = (e) => {
    e.preventDefault();
    setErrorMessage('');

    const cleanMongo = mongoUri.trim();
    const cleanKey = apiKey.trim();

    if (!cleanMongo) {
      setErrorMessage('Please enter your MongoDB Connection URI (e.g. mongodb+srv://... or mongodb://localhost:27017/shorts)');
      return;
    }

    if (!cleanKey) {
      setErrorMessage(`Please enter your ${selectedProvider.toUpperCase()} API Key`);
      return;
    }

    setIsSaving(true);

    try {
      const keyField = `${selectedProvider}_api_key`;
      const updated = {
        ...settings,
        active_ai_provider: selectedProvider,
        mongodb_uri: cleanMongo,
        [keyField]: cleanKey,
        ffmpeg_path: '/usr/bin/ffmpeg',
        yt_dlp_path: '/usr/local/bin/yt-dlp',
      };

      saveStoredSettings(updated);
      setIsOpen(false);
    } catch (err) {
      setErrorMessage('Failed to save settings: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  const providers = [
    {
      id: 'groq',
      name: 'Groq (Recommended)',
      badge: 'Ultra Fast / Free',
      model: 'Llama 3.3 70B',
      docUrl: 'https://console.groq.com/keys',
      placeholder: 'gsk_...',
    },
    {
      id: 'gemini',
      name: 'Google Gemini',
      badge: 'Free Tier',
      model: 'Gemini 1.5 Flash',
      docUrl: 'https://aistudio.google.com/app/apikey',
      placeholder: 'AIzaSy...',
    },
    {
      id: 'mistral',
      name: 'Mistral AI',
      badge: 'Free Tier',
      model: 'Mistral Small',
      docUrl: 'https://console.mistral.ai/api-keys/',
      placeholder: '...',
    },
    {
      id: 'openai',
      name: 'OpenAI',
      badge: 'GPT-4o',
      model: 'GPT-4o mini',
      docUrl: 'https://platform.openai.com/api-keys',
      placeholder: 'sk-...',
    },
  ];

  const activeProviderObj = providers.find((p) => p.id === selectedProvider) || providers[0];

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-xl flex items-center justify-center p-4 overflow-y-auto animate-fade-in">
      <div className="relative w-full max-w-xl glass-panel rounded-3xl p-6 sm:p-8 border border-[#dd2222]/30 shadow-2xl shadow-red-600/10 space-y-6 my-8">
        
        {/* Header with badge */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="px-3 py-1 rounded-full bg-[#dd2222]/15 border border-[#dd2222]/35 text-[#ef9595] text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#dd2222] animate-ping"></span>
              Setup Required
            </span>
            <span className="text-[11px] text-[#909cac] font-mono">100% Client-Side</span>
          </div>

          <h2 className="text-2xl font-extrabold text-white tracking-tight">
            Connect AI &amp; Database to Start
          </h2>
          <p className="text-[#909cac] text-xs font-light leading-relaxed">
            Please enter your MongoDB URI and at least one AI API key. All credentials are saved strictly in your browser&apos;s <span className="text-[#f3c4c4] font-mono font-semibold">localStorage</span>.
          </p>
        </div>

        {errorMessage && (
          <div className="p-3.5 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs font-medium flex items-center gap-2.5 animate-shake">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 shrink-0 text-red-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-5">
          {/* 1. MongoDB URI */}
          <div className="p-4 rounded-2xl bg-[#15181b]/70 border border-white/8 space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-white flex items-center gap-1.5">
                <span className="w-5 h-5 rounded-lg bg-[#dd2222]/20 text-[#ef9595] flex items-center justify-center font-mono text-[10px] border border-[#dd2222]/30">
                  1
                </span>
                MongoDB Connection URI
              </label>
              <button
                type="button"
                onClick={() => setMongoUri('mongodb://localhost:27017/shorts')}
                className="text-[10px] text-[#2cb7d3] hover:text-[#5ccae1] font-light"
              >
                Use Localhost:27017
              </button>
            </div>

            <input
              type="text"
              required
              value={mongoUri}
              onChange={(e) => setMongoUri(e.target.value)}
              placeholder="mongodb+srv://user:pass@cluster0.xxx.mongodb.net/shorts or mongodb://localhost:27017/shorts"
              className="w-full px-3.5 py-2.5 bg-[#1d2125]/90 border border-white/10 rounded-xl text-white font-mono text-xs focus:outline-none focus:border-[#dd2222]/70 focus:ring-1 focus:ring-[#dd2222]/40"
            />
          </div>

          {/* 2. AI Engine Selector & Key */}
          <div className="p-4 rounded-2xl bg-[#15181b]/70 border border-white/8 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-white flex items-center gap-1.5">
                <span className="w-5 h-5 rounded-lg bg-[#2cb7d3]/20 text-[#2cb7d3] flex items-center justify-center font-mono text-[10px] border border-[#2cb7d3]/30">
                  2
                </span>
                Choose AI Engine &amp; API Key
              </label>
              <a
                href={activeProviderObj.docUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[10px] text-[#2cb7d3] hover:text-[#5ccae1] underline font-light"
              >
                Get Free {activeProviderObj.name} Key →
              </a>
            </div>

            {/* Provider Pill Selector */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {providers.map((p) => {
                const isSel = selectedProvider === p.id;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => handleProviderChange(p.id)}
                    className={`py-2 px-2.5 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center justify-center ${
                      isSel
                        ? 'bg-[#dd2222]/20 border-[#dd2222]/60 text-white font-semibold shadow-md shadow-red-600/10'
                        : 'bg-white/2 border-white/5 hover:bg-white/5 text-[#909cac]'
                    }`}
                  >
                    <span className="text-xs">{p.id.toUpperCase()}</span>
                    <span className="text-[9px] text-[#6e7d91] font-light">{p.model}</span>
                  </button>
                );
              })}
            </div>

            {/* Key Input */}
            <div className="relative pt-1">
              <input
                type={showKey ? 'text' : 'password'}
                required
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder={`Paste your ${activeProviderObj.name} API Key (${activeProviderObj.placeholder})`}
                className="w-full px-3.5 py-2.5 bg-[#1d2125]/90 border border-white/10 rounded-xl text-white font-mono text-xs focus:outline-none focus:border-[#dd2222]/70 focus:ring-1 focus:ring-[#dd2222]/40 pr-16"
              />
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                className="absolute right-2 top-[13px] px-2 py-0.5 rounded bg-white/5 hover:bg-white/10 text-[#909cac] hover:text-white text-[10px] transition-all"
              >
                {showKey ? 'Hide' : 'Show'}
              </button>
            </div>
          </div>

          {/* Server Managed Binaries Notice */}
          <div className="p-3 rounded-xl bg-[#2cb7d3]/10 border border-[#2cb7d3]/20 text-[#5ccae1] text-[11px] flex items-center justify-between font-light">
            <span className="flex items-center gap-1.5">
              <span>⚡</span>
              <span>FFmpeg &amp; yt-dlp: Pre-installed &amp; managed by Hosting Server</span>
            </span>
            <span className="font-mono text-[10px] font-semibold text-emerald-400">Active</span>
          </div>

          {/* Submit Action */}
          <button
            type="submit"
            disabled={isSaving}
            className="w-full py-3.5 gradient-button rounded-2xl text-white font-bold text-sm hover:shadow-red-600/30 active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-2"
          >
            {isSaving ? (
              <span>Saving...</span>
            ) : (
              <>
                <span>Save &amp; Start Creating Shorts</span>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </>
            )}
          </button>
        </form>

      </div>
    </div>
  );
}
