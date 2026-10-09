'use client';

import { useState, useEffect } from 'react';
import { getStoredSettings, saveStoredSettings } from '@/lib/settings';

export default function ApiKeyModal({ isOpen, onClose, onSuccess, initialReason = '' }) {
  const [provider, setProvider] = useState('groq');
  const [keyInput, setKeyInput] = useState('');
  const [model, setModel] = useState('llama-3.3-70b-versatile');
  const [showPassword, setShowPassword] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState(null); // { success: boolean, message: string }
  const [copiedLink, setCopiedLink] = useState(false);
  const [showAlternativeProviders, setShowAlternativeProviders] = useState(false);
  const [showFaq, setShowFaq] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const current = getStoredSettings();
      // If user already has a groq key loaded, populate it
      if (current.groqKey) {
        setKeyInput(current.groqKey);
      } else {
        setKeyInput('');
      }
      setProvider(current.aiProvider || 'groq');
      setModel(current.groqModel || 'llama-3.3-70b-versatile');
      setTestResult(null);
      setIsTesting(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handlePasteClipboard = async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.readText) {
        const text = await navigator.clipboard.readText();
        if (text && text.trim()) {
          setKeyInput(text.trim());
          setTestResult(null);
        }
      }
    } catch (_) {
      // Clipboard permissions denied
    }
  };

  const handleCopyLink = () => {
    try {
      navigator.clipboard.writeText('https://console.groq.com/keys');
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    } catch (_) {}
  };

  const handleSaveAndVerify = async (skipTest = false) => {
    const trimmedKey = keyInput.trim();
    if (!trimmedKey) {
      setTestResult({
        success: false,
        message: 'Please paste your API key before saving.',
      });
      return;
    }

    if (skipTest) {
      // Save directly to localStorage
      saveSettings(trimmedKey);
      setTestResult({
        success: true,
        message: 'API Key saved successfully!',
      });
      setTimeout(() => {
        if (onSuccess) onSuccess();
        if (onClose) onClose();
      }, 700);
      return;
    }

    setIsTesting(true);
    setTestResult(null);

    try {
      const res = await fetch('/api/test-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'ai',
          aiConfig: {
            provider,
            key: trimmedKey,
            model,
          },
        }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        saveSettings(trimmedKey);
        setTestResult({
          success: true,
          message: '✓ Verified & connected successfully! Saving configuration...',
        });
        setTimeout(() => {
          if (onSuccess) onSuccess();
          if (onClose) onClose();
        }, 1100);
      } else {
        setTestResult({
          success: false,
          message: data.error || 'Connection failed. Please verify that you copied the complete key.',
        });
      }
    } catch (err) {
      setTestResult({
        success: false,
        message: err.message || 'Network test failed. You can choose "Save Without Test" below.',
      });
    } finally {
      setIsTesting(false);
    }
  };

  const saveSettings = (key) => {
    const current = getStoredSettings();
    if (provider === 'groq') {
      saveStoredSettings({
        ...current,
        aiProvider: 'groq',
        groqKey: key,
        groqModel: model || 'llama-3.3-70b-versatile',
      });
    } else if (provider === 'mistral') {
      saveStoredSettings({
        ...current,
        aiProvider: 'mistral',
        mistralKey: key,
        mistralModel: model || 'mistral-small-latest',
      });
    } else if (provider === 'gemini') {
      saveStoredSettings({
        ...current,
        aiProvider: 'gemini',
        geminiKey: key,
        geminiModel: model || 'gemini-1.5-flash',
      });
    } else if (provider === 'openai') {
      saveStoredSettings({
        ...current,
        aiProvider: 'openai',
        openaiKey: key,
        openaiModel: model || 'gpt-4o-mini',
      });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-sm overflow-y-auto">
      <div
        className="relative w-full max-w-2xl bg-[#202428] border border-[#39414b] rounded-2xl shadow-2xl shadow-black/80 overflow-hidden my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header Glow Bar */}
        <div className="h-1.5 w-full bg-gradient-to-r from-[#dd2222] via-[#f59e0b] to-[#2cb7d3]"></div>

        {/* Modal Header */}
        <div className="p-5 sm:p-6 border-b border-[#39414b] flex items-start justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full border border-[#22c55e]/30 bg-[#22c55e]/10 text-[#86efac] text-xs font-semibold mb-2">
              <span className="w-2 h-2 rounded-full bg-[#22c55e] animate-pulse"></span>
              100% Free AI • Takes 60 Seconds • No Credit Card
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight flex items-center gap-2">
              <span>Connect Your Free AI Engine</span>
              <span className="text-[#dd2222]">⚡</span>
            </h2>
            <p className="text-sm text-[#909cac] mt-1 max-w-lg">
              {initialReason ||
                'To automatically analyze your YouTube video and extract the best viral moments, connect Groq in 5 easy steps.'}
            </p>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-[#909cac] hover:text-white hover:bg-[#2d3239] transition-colors cursor-pointer shrink-0"
            aria-label="Close modal"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 space-y-6 max-h-[72vh] overflow-y-auto">
          {/* Quick Step-by-Step Cards */}
          <div className="space-y-3.5">
            {/* Step 1 */}
            <div className="p-4 rounded-xl bg-[#282d33] border border-[#39414b] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="w-7 h-7 rounded-lg bg-[#dd2222] text-white font-extrabold text-sm flex items-center justify-center shrink-0 mt-0.5">
                  1
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white">Open Groq Website</h4>
                  <p className="text-xs text-[#909cac] mt-0.5">
                    Click the button to open Groq’s official key console in a new browser tab.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
                <a
                  href="https://console.groq.com/keys"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3.5 py-2 rounded-lg bg-[#dd2222] hover:bg-[#c81e1e] text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-md shadow-[#dd2222]/20 cursor-pointer"
                >
                  <span>Open Groq Console</span>
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </a>
                <button
                  type="button"
                  onClick={handleCopyLink}
                  title="Copy link"
                  className="p-2 rounded-lg bg-[#1d2125] hover:bg-[#39414b] text-[#909cac] hover:text-white border border-[#39414b] text-xs cursor-pointer transition-colors"
                >
                  {copiedLink ? '✓ Copied' : '📋'}
                </button>
              </div>
            </div>

            {/* Step 2 */}
            <div className="p-4 rounded-xl bg-[#282d33] border border-[#39414b] flex items-start gap-3">
              <div className="w-7 h-7 rounded-lg bg-[#39414b] text-[#f6f7f8] font-extrabold text-sm flex items-center justify-center shrink-0 mt-0.5">
                2
              </div>
              <div className="flex-1">
                <h4 className="text-sm font-bold text-white">Sign In with Google</h4>
                <p className="text-xs text-[#909cac] mt-0.5 leading-relaxed">
                  On the Groq page, click <strong className="text-white">“Continue with Google”</strong> (or GitHub/Email). It creates your free account in 5 seconds. <span className="text-[#86efac] font-medium">No credit card or payment is ever asked.</span>
                </p>
              </div>
            </div>

            {/* Step 3 */}
            <div className="p-4 rounded-xl bg-[#282d33] border border-[#39414b] flex items-start gap-3">
              <div className="w-7 h-7 rounded-lg bg-[#39414b] text-[#f6f7f8] font-extrabold text-sm flex items-center justify-center shrink-0 mt-0.5">
                3
              </div>
              <div className="flex-1">
                <h4 className="text-sm font-bold text-white">Click “Create API Key”</h4>
                <p className="text-xs text-[#909cac] mt-0.5 leading-relaxed">
                  Look for the orange/coral button on Groq that says <strong className="text-white">“Create API Key”</strong>. Enter any name (e.g. <span className="text-[#f59e0b] font-mono">Shorts</span>) and click <strong className="text-white">“Submit”</strong>.
                </p>
              </div>
            </div>

            {/* Step 4 */}
            <div className="p-4 rounded-xl bg-[#282d33] border border-[#39414b] flex items-start gap-3">
              <div className="w-7 h-7 rounded-lg bg-[#39414b] text-[#f6f7f8] font-extrabold text-sm flex items-center justify-center shrink-0 mt-0.5">
                4
              </div>
              <div className="flex-1">
                <h4 className="text-sm font-bold text-white">Copy Your Secret Key</h4>
                <p className="text-xs text-[#909cac] mt-0.5 leading-relaxed">
                  A secret code starting with <strong className="text-[#2cb7d3] font-mono">gsk_...</strong> will appear. Click the <strong className="text-white">“Copy”</strong> button next to it.
                </p>
                <div className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#1d2125] border border-[#39414b] text-[11px] text-[#909cac]">
                  <span>⚠️</span>
                  <span>Groq only shows this code once, so make sure to copy it before closing their popup.</span>
                </div>
              </div>
            </div>

            {/* Step 5: Input & Paste */}
            <div className="p-4 sm:p-5 rounded-xl bg-[#2d3239] border-2 border-[#dd2222]/80 shadow-lg shadow-[#dd2222]/10 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-lg bg-[#22c55e] text-black font-extrabold text-sm flex items-center justify-center shrink-0">
                    5
                  </div>
                  <h4 className="text-sm font-bold text-white">Paste Your Key Below & Save</h4>
                </div>
                <button
                  type="button"
                  onClick={handlePasteClipboard}
                  className="px-2.5 py-1 rounded-lg bg-[#39414b] hover:bg-[#4b5563] text-white text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                  <span>Paste from Clipboard</span>
                </button>
              </div>

              {/* Input Form */}
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={keyInput}
                  onChange={(e) => {
                    setKeyInput(e.target.value);
                    if (testResult) setTestResult(null);
                  }}
                  placeholder="gsk_..."
                  className="w-full bg-[#1d2125] border border-[#39414b] focus:border-[#dd2222] rounded-xl px-4 py-3 text-sm text-white placeholder-[#6e7d91] font-mono tracking-wide focus:outline-none transition-all pr-12"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#909cac] hover:text-white p-1"
                  title={showPassword ? 'Hide Key' : 'Show Key'}
                >
                  {showPassword ? (
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

              {/* Status & Feedback Alert */}
              {testResult && (
                <div
                  className={`p-3 rounded-xl text-xs font-medium flex items-center justify-between gap-3 ${
                    testResult.success
                      ? 'bg-[#22c55e]/15 border border-[#22c55e]/30 text-[#86efac]'
                      : 'bg-[#ef4444]/15 border border-[#ef4444]/30 text-[#fca5a5]'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm">{testResult.success ? '✓' : '✕'}</span>
                    <span>{testResult.message}</span>
                  </div>
                  {!testResult.success && (
                    <button
                      type="button"
                      onClick={() => handleSaveAndVerify(true)}
                      className="px-2.5 py-1 rounded bg-[#39414b] hover:bg-[#4b5563] text-white text-[11px] underline cursor-pointer shrink-0"
                    >
                      Save Anyway
                    </button>
                  )}
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
                <button
                  type="button"
                  disabled={isTesting || !keyInput.trim()}
                  onClick={() => handleSaveAndVerify(false)}
                  className="w-full sm:flex-1 py-3 px-4 rounded-xl bg-[#dd2222] hover:bg-[#c81e1e] disabled:opacity-50 text-white font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-lg shadow-[#dd2222]/25 cursor-pointer"
                >
                  {isTesting ? (
                    <>
                      <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                      </svg>
                      <span>Testing Groq Connection...</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span>Verify & Save Groq Key</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  disabled={isTesting || !keyInput.trim()}
                  onClick={() => handleSaveAndVerify(true)}
                  className="w-full sm:w-auto py-3 px-4 rounded-xl bg-[#1d2125] hover:bg-[#39414b] text-[#b9c0ca] hover:text-white border border-[#39414b] text-xs font-semibold cursor-pointer transition-all"
                >
                  Save Directly
                </button>
              </div>
            </div>
          </div>

          {/* Alternative Providers Toggle */}
          <div className="pt-2 border-t border-[#39414b]">
            <button
              type="button"
              onClick={() => setShowAlternativeProviders(!showAlternativeProviders)}
              className="text-xs text-[#909cac] hover:text-white flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <span>{showAlternativeProviders ? '▼' : '▶'}</span>
              <span>Already have an OpenAI, Google Gemini, or Mistral key?</span>
            </button>

            {showAlternativeProviders && (
              <div className="mt-3 p-4 rounded-xl bg-[#1d2125] border border-[#39414b] space-y-3">
                <div className="text-xs text-[#909cac]">
                  Select your preferred alternative AI provider below:
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'groq', name: 'Groq (Free)', badge: '⚡ Ultra Fast' },
                    { id: 'gemini', name: 'Google Gemini', badge: '✨ Free Tier' },
                    { id: 'mistral', name: 'Mistral AI', badge: '🧠 Smart' },
                    { id: 'openai', name: 'OpenAI GPT', badge: '🎯 Accurate' },
                  ].map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => {
                        setProvider(p.id);
                        const current = getStoredSettings();
                        if (p.id === 'groq') {
                          setKeyInput(current.groqKey || '');
                          setModel(current.groqModel || 'llama-3.3-70b-versatile');
                        } else if (p.id === 'gemini') {
                          setKeyInput(current.geminiKey || '');
                          setModel(current.geminiModel || 'gemini-1.5-flash');
                        } else if (p.id === 'mistral') {
                          setKeyInput(current.mistralKey || '');
                          setModel(current.mistralModel || 'mistral-small-latest');
                        } else if (p.id === 'openai') {
                          setKeyInput(current.openaiKey || '');
                          setModel(current.openaiModel || 'gpt-4o-mini');
                        }
                      }}
                      className={`p-2.5 rounded-lg text-left border transition-all text-xs ${
                        provider === p.id
                          ? 'bg-[#360c0c] border-[#dd2222] text-white font-bold'
                          : 'bg-[#282d33] border-[#39414b] text-[#909cac] hover:text-white'
                      }`}
                    >
                      <div className="font-semibold">{p.name}</div>
                      <div className="text-[10px] text-[#6e7d91]">{p.badge}</div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Quick FAQ / Peace of Mind */}
          <div className="pt-2 border-t border-[#39414b]">
            <button
              type="button"
              onClick={() => setShowFaq(!showFaq)}
              className="text-xs text-[#909cac] hover:text-white flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <span>{showFaq ? '▼' : '▶'}</span>
              <span>Frequently Asked Questions for Non-Tech Users</span>
            </button>

            {showFaq && (
              <div className="mt-3 space-y-2.5 text-xs text-[#b9c0ca]">
                <div className="p-3 rounded-lg bg-[#1d2125] border border-[#39414b]/60">
                  <div className="font-bold text-white mb-1">Q: Will Groq ask me for credit card or payment?</div>
                  <div className="text-[#909cac]">
                    A: No! Groq’s free tier gives you high-speed AI access without requiring any payment method or credit card information.
                  </div>
                </div>
                <div className="p-3 rounded-lg bg-[#1d2125] border border-[#39414b]/60">
                  <div className="font-bold text-white mb-1">Q: Is my API key safe?</div>
                  <div className="text-[#909cac]">
                    A: Yes! Your API key is saved strictly inside your browser’s private storage (localStorage) and is only used to generate clips for your videos.
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 sm:p-5 bg-[#1d2125] border-t border-[#39414b] flex items-center justify-between text-xs text-[#909cac]">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#22c55e]"></span>
            <span>Active default engine: Groq LPU (Llama 3.3 70B)</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="hover:text-white text-xs underline cursor-pointer"
          >
            I’ll do this later
          </button>
        </div>
      </div>
    </div>
  );
}
