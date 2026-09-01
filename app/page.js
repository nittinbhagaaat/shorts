'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import DashboardLayout from '@/components/DashboardLayout';
import { fetchWithSettings, getStoredSettings } from '@/lib/settings';

export default function HomePage() {
  const router = useRouter();
  const [url, setUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [statusText, setStatusText] = useState('');
  const [projects, setProjects] = useState([]);
  const [isFetchingProjects, setIsFetchingProjects] = useState(true);
  const [error, setError] = useState('');
  const [settings, setSettings] = useState(null);

  // Fetch past projects and load settings
  useEffect(() => {
    setSettings(getStoredSettings());

    async function fetchProjects() {
      try {
        const res = await fetchWithSettings('/api/project');
        if (!res.ok) throw new Error('Failed to fetch projects');
        const data = await res.json();
        setProjects(data.projects || []);
      } catch (err) {
        console.error('Error loading projects:', err);
      } finally {
        setIsFetchingProjects(false);
      }
    }
    fetchProjects();

    const handleSettingsUpdate = (e) => setSettings(e.detail);
    window.addEventListener('shorts_settings_updated', handleSettingsUpdate);
    return () => window.removeEventListener('shorts_settings_updated', handleSettingsUpdate);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!url.trim()) return;

    setIsLoading(true);
    setError('');
    setStatusText('Analyzing YouTube URL...');

    const steps = [
      { delay: 1000, text: 'Fetching video metadata from YouTube...' },
      { delay: 3000, text: 'Downloading caption tracks and transcript...' },
      { delay: 6000, text: `Running ${settings?.aiProvider?.toUpperCase() || 'AI'} analysis on transcript segments...` },
      { delay: 9000, text: 'Curating viral hooks and extracting optimal timestamps...' },
      { delay: 12000, text: 'Saving project and initializing workspace...' },
    ];

    const timeouts = steps.map((step) =>
      setTimeout(() => setStatusText(step.text), step.delay)
    );

    try {
      const res = await fetchWithSettings('/api/project', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });

      timeouts.forEach((t) => clearTimeout(t));

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to process video');
      }

      const data = await res.json();
      setStatusText('Workspace ready! Redirecting...');

      setTimeout(() => {
        router.push(`/project/${data.project._id}`);
      }, 400);
    } catch (err) {
      timeouts.forEach((t) => clearTimeout(t));
      setError(err.message || 'An error occurred during analysis');
      setIsLoading(false);
    }
  };

  const handleDeleteProject = async (id) => {
    if (!confirm('Are you sure you want to delete this workspace? This will permanently delete all generated clips and rendered MP4 files.')) {
      return;
    }

    try {
      const res = await fetchWithSettings(`/api/project/${id}`, {
        method: 'DELETE',
      });

      if (!res.ok) throw new Error('Failed to delete workspace');
      setProjects((prev) => prev.filter((p) => p._id !== id));
    } catch (err) {
      console.error('Error deleting project:', err);
      alert(err.message || 'Failed to delete workspace');
    }
  };

  const formatDuration = (secs) => {
    if (!secs) return '0:00';
    const mins = Math.floor(secs / 60);
    const hours = Math.floor(mins / 60);
    const rMins = mins % 60;
    const rSecs = secs % 60;

    if (hours > 0) {
      return `${hours}:${rMins.toString().padStart(2, '0')}:${rSecs.toString().padStart(2, '0')}`;
    }
    return `${mins}:${rSecs.toString().padStart(2, '0')}`;
  };

  const currentProvider = settings?.aiProvider || 'mistral';
  const providerDisplay = {
    mistral: 'Mistral AI',
    gemini: 'Google Gemini',
    openai: 'OpenAI GPT',
    groq: 'Groq LPU',
  };

  return (
    <DashboardLayout>
      <div className="flex-1 flex flex-col justify-between">
        {/* Main Content Area */}
        <main className="max-w-5xl w-full mx-auto px-4 sm:px-6 py-8 sm:py-12 flex flex-col items-center">
          
          {/* Top Hero Banner */}
          <div className="text-center mb-8 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-[10px] border border-[#731111] bg-[#360c0c] text-[#fcf2f2] text-xs font-semibold uppercase tracking-wider mb-3">
              <span className="w-2 h-2 rounded-full bg-[#dd2222]"></span>
              Powered by {providerDisplay[currentProvider]} Engine
            </div>

            <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight mb-3 text-white">
              Create Viral <span className="text-[#dd2222]">Shorts</span> in Seconds
            </h1>

            <p className="text-[#b9c0ca] text-sm sm:text-base font-normal leading-relaxed">
              Paste any long-form YouTube video URL. clip.studio analyzes the transcript, extracts 35–40s complete scenes with full meaningful dialogue, cuts to 9:16 vertical layout, and burns in custom subtitles.
            </p>
          </div>

          {/* Input Panel */}
          <div className="w-full max-w-2xl app-panel p-5 sm:p-7 mb-12">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="relative">
                <input
                  type="url"
                  required
                  disabled={isLoading}
                  placeholder="Paste YouTube Video URL (e.g. https://www.youtube.com/watch?v=...)"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  className="w-full px-4 py-3.5 app-input text-sm font-normal"
                />
                <div className="absolute inset-y-0 right-0 flex items-center pr-3.5">
                  {isLoading && (
                    <svg className="animate-spin h-5 w-5 text-[#dd2222]" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                  )}
                </div>
              </div>

              {error && (
                <div className="flex items-center gap-2.5 px-3.5 py-2.5 bg-[#ef4444]/15 border border-[#ef4444]/30 text-[#fcf2f2] rounded-[10px] text-xs font-medium">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 shrink-0 text-[#ef4444]" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  <span>{error}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading || !url.trim()}
                className="w-full py-3.5 btn-primary text-sm flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:pointer-events-none"
              >
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    <span>{statusText}</span>
                  </span>
                ) : (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                    </svg>
                    <span>Generate Viral Shorts</span>
                  </>
                )}
              </button>

              <div className="flex flex-wrap items-center justify-between text-xs text-[#909cac] pt-2 px-1 border-t border-[#39414b]">
                <span className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#22c55e]"></span>
                  Engine: {providerDisplay[currentProvider]} ({settings?.aiProvider === 'groq' ? settings?.groqModel : settings?.aiProvider === 'mistral' ? settings?.mistralModel : settings?.aiProvider === 'gemini' ? settings?.geminiModel : settings?.openaiModel || 'default'})
                </span>
                <Link href="/settings" className="text-[#2cb7d3] hover:underline font-medium">
                  Settings & Keys →
                </Link>
              </div>
            </form>
          </div>

          {/* Feature Highlights Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 w-full max-w-3xl mb-12">
            <div className="p-3.5 rounded-[10px] bg-[#2d3239] border border-[#39414b] text-center">
              <span className="text-base block mb-1">🎬</span>
              <h4 className="text-white font-semibold text-xs">9:16 Vertical Cropping</h4>
              <p className="text-[#909cac] text-[11px] font-normal mt-0.5">Left/Center/Right framing</p>
            </div>
            <div className="p-3.5 rounded-[10px] bg-[#2d3239] border border-[#39414b] text-center">
              <span className="text-base block mb-1">🔥</span>
              <h4 className="text-white font-semibold text-xs">Hormozi Subtitles</h4>
              <p className="text-[#909cac] text-[11px] font-normal mt-0.5">Animated highlighted words</p>
            </div>
            <div className="p-3.5 rounded-[10px] bg-[#2d3239] border border-[#39414b] text-center">
              <span className="text-base block mb-1">🌐</span>
              <h4 className="text-white font-semibold text-xs">Hinglish Conversion</h4>
              <p className="text-[#909cac] text-[11px] font-normal mt-0.5">Hindi to Roman script</p>
            </div>
            <div className="p-3.5 rounded-[10px] bg-[#2d3239] border border-[#39414b] text-center">
              <span className="text-base block mb-1">⚡</span>
              <h4 className="text-white font-semibold text-xs">4 AI Engines</h4>
              <p className="text-[#909cac] text-[11px] font-normal mt-0.5">Groq, Mistral, Gemini, OpenAI</p>
            </div>
          </div>

          {/* Recent Workspaces Preview */}
          <div className="w-full">
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-[#39414b]">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-[#dd2222]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>Recent Workspaces</span>
              </h2>

              <Link
                href="/workspaces"
                className="text-xs text-[#2cb7d3] hover:underline font-semibold flex items-center gap-1"
              >
                <span>View All ({projects.length})</span>
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            </div>

            {isFetchingProjects ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[1, 2, 3].map((n) => (
                  <div key={n} className="app-card h-[280px] p-3 flex flex-col justify-between">
                    <div className="bg-[#39414b] rounded-[10px] aspect-video w-full mb-3"></div>
                    <div className="space-y-2 flex-grow">
                      <div className="h-3.5 bg-[#39414b] rounded-[10px] w-3/4"></div>
                      <div className="h-3 bg-[#39414b] rounded-[10px] w-1/2"></div>
                    </div>
                    <div className="h-9 bg-[#39414b] rounded-[10px] w-full mt-3"></div>
                  </div>
                ))}
              </div>
            ) : projects.length === 0 ? (
              <div className="app-panel p-8 text-center max-w-md mx-auto">
                <div className="w-12 h-12 rounded-[10px] bg-[#39414b] flex items-center justify-center mx-auto mb-3">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-[#909cac]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z" />
                  </svg>
                </div>
                <h3 className="text-sm font-semibold text-white mb-1">No workspaces yet</h3>
                <p className="text-[#909cac] text-xs">Paste a YouTube link above to initialize your first viral clips workspace.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {projects.slice(0, 3).map((project) => (
                  <div key={project._id} className="app-card overflow-hidden flex flex-col justify-between group relative">
                    <div className="relative aspect-video w-full overflow-hidden bg-black/40">
                      <img 
                        src={project.thumbnail} 
                        alt={project.title}
                        className="object-cover w-full h-full"
                      />
                      
                      {/* Delete Workspace Button */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteProject(project._id);
                        }}
                        className="absolute top-2 right-2 p-1.5 rounded-[10px] bg-[#1d2125]/80 hover:bg-[#dd2222] text-white border border-[#39414b] transition-colors cursor-pointer z-20"
                        title="Delete Workspace"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>

                      <div className="absolute bottom-2 right-2 px-2 py-0.5 rounded-[10px] bg-[#1d2125]/90 text-white text-[10px] font-bold font-mono border border-[#39414b]">
                        {formatDuration(project.duration)}
                      </div>
                    </div>
                    
                    <div className="p-4 flex-grow flex flex-col justify-between space-y-3">
                      <div>
                        <h3 className="text-white font-semibold text-sm line-clamp-2 leading-snug mb-1">
                          {project.title}
                        </h3>
                        <p className="text-[#909cac] text-xs flex items-center gap-1 font-normal truncate">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 text-[#dd2222]" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-6-3a2 2 0 11-4 0 2 2 0 014 0zm-2 4a5 5 0 00-4.546 2.916A5.986 5.986 0 0010 16a5.986 5.986 0 004.546-2.084A5 5 0 0010 11z" clipRule="evenodd" />
                          </svg>
                          {project.channel}
                        </p>
                      </div>

                      <button
                        onClick={() => router.push(`/project/${project._id}`)}
                        className="w-full py-2.5 btn-secondary text-xs flex items-center justify-center gap-1 cursor-pointer"
                      >
                        <span>Open Workspace</span>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </main>

        {/* Footer */}
        <footer className="w-full text-center py-6 border-t border-[#39414b] mt-12 bg-[#2d3239]">
          <p className="text-[#909cac] text-xs font-normal">
            &copy; {new Date().getFullYear()} clip.studio • open source
          </p>
        </footer>
      </div>
    </DashboardLayout>
  );
}
