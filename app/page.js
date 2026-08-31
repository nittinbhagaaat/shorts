'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import DashboardLayout from '@/components/DashboardLayout';
import { apiFetch, getStoredSettings, isAppConfigured } from '@/lib/settings-client';

export default function HomeDashboard() {
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

    const handleSettingsUpdate = (e) => {
      setSettings(e.detail);
    };

    window.addEventListener('viralclips:settings_updated', handleSettingsUpdate);

    async function fetchProjects() {
      try {
        const res = await apiFetch('/api/project');
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

    return () => window.removeEventListener('viralclips:settings_updated', handleSettingsUpdate);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!url.trim()) return;

    if (!isAppConfigured(settings)) {
      setError('Please configure your MongoDB URI and at least one AI API key first.');
      return;
    }

    setIsLoading(true);
    setError('');
    setStatusText('Analyzing YouTube video...');

    // Progress updates simulator
    const steps = [
      { delay: 1000, text: 'Fetching video metadata and caption tracks...' },
      { delay: 3000, text: 'Extracting speech transcripts & checking Hindi/Hinglish...' },
      { delay: 6000, text: `Invoking AI model (${settings?.active_ai_provider || 'groq'})...` },
      { delay: 9000, text: 'Curating viral hooks and calculating optimal 20-30s timestamps...' },
      { delay: 12000, text: 'Saving workspace and preparing editor...' },
    ];

    const timeouts = steps.map((step) =>
      setTimeout(() => setStatusText(step.text), step.delay)
    );

    try {
      const res = await apiFetch('/api/project', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, settings }),
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
      }, 500);
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
      const res = await apiFetch(`/api/project/${id}`, {
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
    const rSecs = Math.floor(secs % 60);

    if (hours > 0) {
      return `${hours}:${rMins.toString().padStart(2, '0')}:${rSecs.toString().padStart(2, '0')}`;
    }
    return `${mins}:${rSecs.toString().padStart(2, '0')}`;
  };

  const activeProvider = settings?.active_ai_provider || 'groq';

  return (
    <DashboardLayout>
      <div className="max-w-6xl w-full mx-auto px-4 sm:px-6 py-8 md:py-12 flex flex-col space-y-10">
        
        {/* Hero Section */}
        <div className="text-center max-w-3xl mx-auto space-y-4 animate-fade-in">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full border border-[#dd2222]/30 bg-[#dd2222]/10 text-[#ef9595] text-xs font-semibold uppercase tracking-wider">
            🚀 Studio AI Clipper &amp; Subtitles
          </div>
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-white">
            Turn Long YouTube Videos Into <span className="gradient-text">Viral Shorts</span>
          </h1>
          <p className="text-[#909cac] text-base sm:text-lg font-light leading-relaxed">
            Paste any YouTube URL. AI extracts top conversational moments (&lt;30s), converts Hindi to Hinglish, crops to 9:16 vertical, and generates animated Alex Hormozi captions.
          </p>
        </div>

        {/* Input Panel */}
        <div className="w-full max-w-3xl mx-auto glass-panel rounded-3xl p-6 md:p-8 shadow-2xl border border-white/8">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="relative">
              <input
                type="url"
                required
                disabled={isLoading}
                placeholder="Paste YouTube Video URL (e.g. https://www.youtube.com/watch?v=...)"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="w-full px-5 py-4 md:py-5 bg-[#15181b]/90 border border-white/10 rounded-2xl text-white placeholder-[#6e7d91] focus:outline-none focus:ring-2 focus:ring-[#dd2222]/50 focus:border-[#dd2222]/60 transition-all font-light text-sm md:text-base"
              />
              <div className="absolute inset-y-0 right-0 flex items-center pr-4">
                {isLoading && (
                  <svg className="animate-spin h-6 w-6 text-[#dd2222]" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                )}
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-3 px-4 py-3 bg-red-500/10 border border-red-500/20 text-red-300 rounded-xl text-xs sm:text-sm font-medium animate-shake">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 shrink-0 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading || !url.trim()}
              className="w-full py-4 md:py-5 gradient-button rounded-2xl text-white font-semibold text-base md:text-lg hover:shadow-red-600/40 active:scale-95 disabled:opacity-50 disabled:pointer-events-none transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  <span className="text-sm md:text-base">{statusText}</span>
                </span>
              ) : (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                  </svg>
                  <span>Identify &amp; Create Shorts Workspace</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* Dashboard Metric Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="glass-panel rounded-2xl p-5 border border-white/8 space-y-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[#909cac]">Total Workspaces</span>
            <div className="text-2xl font-bold text-white">{projects.length}</div>
            <p className="text-[11px] text-[#6e7d91] font-light">Saved video projects</p>
          </div>

          <div className="glass-panel rounded-2xl p-5 border border-white/8 space-y-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[#909cac]">Active AI Engine</span>
            <div className="text-2xl font-bold text-[#ef9595] uppercase">{activeProvider}</div>
            <p className="text-[11px] text-[#6e7d91] font-light">Llama 3.3 / Gemini / GPT</p>
          </div>

          <div className="glass-panel rounded-2xl p-5 border border-white/8 space-y-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[#909cac]">Caption Styles</span>
            <div className="text-2xl font-bold text-[#5ccae1]">3 Types</div>
            <p className="text-[11px] text-[#6e7d91] font-light">Hormozi, Minimalist, Classic</p>
          </div>

          <div className="glass-panel rounded-2xl p-5 border border-white/8 space-y-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[#909cac]">Config Storage</span>
            <div className="text-2xl font-bold text-emerald-400">Local Only</div>
            <p className="text-[11px] text-[#6e7d91] font-light">Zero server credentials</p>
          </div>
        </div>

        {/* Recent Workspaces Highlights */}
        <div className="space-y-6 pt-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl md:text-2xl font-bold tracking-tight text-white flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-[#dd2222]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Recent Workspaces
            </h2>

            <Link
              href="/workspaces"
              className="text-xs text-[#ef9595] hover:text-white font-medium flex items-center gap-1 transition-all"
            >
              <span>View all workspaces</span>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>

          {isFetchingProjects ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map((n) => (
                <div key={n} className="glass-card rounded-3xl h-[320px] animate-pulse flex flex-col justify-between p-4">
                  <div className="bg-white/5 rounded-2xl aspect-video w-full mb-4"></div>
                  <div className="space-y-2 flex-grow">
                    <div className="h-4 bg-white/5 rounded w-3/4"></div>
                    <div className="h-3 bg-white/5 rounded w-1/2"></div>
                  </div>
                  <div className="h-10 bg-white/5 rounded-2xl w-full mt-4"></div>
                </div>
              ))}
            </div>
          ) : projects.length === 0 ? (
            <div className="glass-panel rounded-3xl p-12 text-center max-w-md mx-auto space-y-3">
              <div className="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center mx-auto text-[#909cac]">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z" />
                </svg>
              </div>
              <h3 className="text-base font-semibold text-[#d7dbe0]">No workspaces initialized yet</h3>
              <p className="text-[#6e7d91] text-xs font-light">Paste a YouTube link above to create your first shorts workspace.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {projects.slice(0, 6).map((project) => (
                <div key={project._id} className="glass-card rounded-3xl overflow-hidden flex flex-col justify-between group relative border border-white/8 hover:border-[#dd2222]/40 transition-all">
                  <div className="relative aspect-video w-full overflow-hidden bg-black/40">
                    <img
                      src={project.thumbnail}
                      alt={project.title}
                      className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-500"
                    />

                    {/* Delete button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteProject(project._id);
                      }}
                      className="absolute top-2 right-2 p-2 rounded-xl bg-black/70 hover:bg-red-600 text-white/80 hover:text-white border border-white/10 backdrop-blur-md transition-all cursor-pointer z-20"
                      title="Delete Workspace"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>

                    <div className="absolute bottom-2 right-2 px-2 py-0.5 rounded-lg bg-black/80 text-white text-[11px] font-semibold font-mono border border-white/10">
                      {formatDuration(project.duration)}
                    </div>
                  </div>

                  <div className="p-5 flex-grow flex flex-col justify-between space-y-3">
                    <div>
                      <h3 className="text-white font-bold text-sm line-clamp-2 leading-snug group-hover:text-[#ef9595] transition-colors mb-1">
                        {project.title}
                      </h3>
                      <p className="text-[#909cac] text-xs flex items-center gap-1 font-light">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#dd2222]"></span>
                        <span>{project.channel}</span>
                      </p>
                    </div>

                    <button
                      onClick={() => router.push(`/project/${project._id}`)}
                      className="w-full py-2.5 rounded-xl gradient-button text-white font-semibold text-xs transition-all flex items-center justify-center gap-1 cursor-pointer"
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

      </div>
    </DashboardLayout>
  );
}
