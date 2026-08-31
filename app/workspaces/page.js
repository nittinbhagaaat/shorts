'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/DashboardLayout';
import { apiFetch } from '@/lib/settings-client';

export default function WorkspacesPage() {
  const router = useRouter();
  const [projects, setProjects] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState('');

  const fetchWorkspaces = async () => {
    try {
      setIsLoading(true);
      setError('');
      const res = await apiFetch('/api/project');
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to fetch workspaces');
      }
      const data = await res.json();
      setProjects(data.projects || []);
    } catch (err) {
      console.error('Error fetching workspaces:', err);
      setError(err.message || 'Failed to load workspaces');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchWorkspaces();
  }, []);

  const handleDeleteProject = async (id, title) => {
    if (!confirm(`Are you sure you want to delete workspace "${title}"? All generated clips and rendered video files will be permanently deleted.`)) {
      return;
    }

    try {
      const res = await apiFetch(`/api/project/${id}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to delete workspace');
      }

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

  const filteredProjects = projects.filter((project) => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) return true;
    return (
      (project.title && project.title.toLowerCase().includes(query)) ||
      (project.channel && project.channel.toLowerCase().includes(query)) ||
      (project._id && project._id.toLowerCase().includes(query))
    );
  });

  return (
    <DashboardLayout>
      <div className="max-w-6xl w-full mx-auto px-4 sm:px-6 py-8 md:py-12 space-y-8">
        
        {/* Top Header & Search Bar */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-white/8 pb-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-[#dd2222]/30 bg-[#dd2222]/10 text-[#ef9595] text-xs font-semibold uppercase tracking-wider mb-2">
              📁 Workspace Manager
            </div>
            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-white">
              Workspaces ({projects.length})
            </h1>
            <p className="text-[#909cac] text-sm font-light mt-1">
              Browse, manage, edit, and export your AI-extracted shorts projects.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="px-5 py-2.5 gradient-button rounded-xl text-white font-semibold text-xs flex items-center gap-2 transition-all cursor-pointer hover:shadow-red-600/30"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              <span>New Workspace</span>
            </Link>
          </div>
        </div>

        {/* Filter and Search Bar Controls */}
        <div className="flex flex-col sm:flex-row items-center gap-3 justify-between">
          <div className="relative w-full sm:w-80">
            <input
              type="text"
              placeholder="Search by title, channel..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-[#15181b]/90 border border-white/10 rounded-2xl text-white placeholder-[#6e7d91] focus:outline-none focus:border-[#dd2222]/60 text-xs font-light"
            />
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4 text-[#909cac] absolute left-3.5 top-1/2 -translate-y-1/2"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              onClick={fetchWorkspaces}
              className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-[#d7dbe0] hover:text-white border border-white/5 transition-all text-xs flex items-center gap-1.5 cursor-pointer"
              title="Refresh list"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {/* Error Notification */}
        {error && (
          <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-300 text-sm font-medium flex items-center gap-3">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-red-400 shrink-0" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <span>{error}</span>
          </div>
        )}

        {/* Workspaces List / Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((n) => (
              <div key={n} className="glass-card rounded-3xl h-[340px] animate-pulse flex flex-col justify-between p-5">
                <div className="bg-white/5 rounded-2xl aspect-video w-full mb-4"></div>
                <div className="space-y-3 flex-grow">
                  <div className="h-4 bg-white/5 rounded w-3/4"></div>
                  <div className="h-3 bg-white/5 rounded w-1/2"></div>
                </div>
                <div className="h-10 bg-white/5 rounded-2xl w-full mt-4"></div>
              </div>
            ))}
          </div>
        ) : filteredProjects.length === 0 ? (
          <div className="glass-panel rounded-3xl p-12 md:p-16 text-center max-w-md mx-auto space-y-4 border border-white/8">
            <div className="w-16 h-16 rounded-3xl bg-[#dd2222]/10 border border-[#dd2222]/20 flex items-center justify-center mx-auto text-[#ef9595]">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-bold text-white mb-1">
                {searchQuery ? 'No matching workspaces found' : 'No workspaces yet'}
              </h3>
              <p className="text-[#909cac] text-xs font-light">
                {searchQuery
                  ? 'Try searching with a different keyword or clear the search query.'
                  : 'Start by pasting any long YouTube video URL from the Home dashboard.'}
              </p>
            </div>
            {!searchQuery && (
              <Link
                href="/"
                className="inline-flex items-center gap-2 px-5 py-2.5 gradient-button rounded-xl text-white font-semibold text-xs"
              >
                <span>🚀 Create First Workspace</span>
              </Link>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProjects.map((project) => (
              <div
                key={project._id}
                className="glass-card rounded-3xl overflow-hidden flex flex-col justify-between group relative border border-white/8 hover:border-[#dd2222]/40 transition-all"
              >
                {/* Thumbnail Header */}
                <div className="relative aspect-video w-full overflow-hidden bg-black/40">
                  <img
                    src={project.thumbnail}
                    alt={project.title}
                    className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-500"
                  />

                  {/* Top Bar Actions */}
                  <div className="absolute top-3 inset-x-3 flex items-center justify-between pointer-events-none">
                    <span className="px-2.5 py-1 rounded-full bg-black/70 backdrop-blur-md text-[10px] font-mono font-bold text-[#ef9595] border border-white/10 uppercase">
                      ID: {project._id}
                    </span>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteProject(project._id, project.title);
                      }}
                      className="p-2 rounded-xl bg-black/70 hover:bg-[#dd2222] text-white/80 hover:text-white border border-white/10 backdrop-blur-md transition-all cursor-pointer pointer-events-auto"
                      title="Delete Workspace"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>

                  {/* Duration Badge */}
                  <div className="absolute bottom-3 right-3 px-2 py-0.5 rounded-lg bg-black/80 backdrop-blur-md text-white text-[11px] font-semibold font-mono border border-white/10">
                    {formatDuration(project.duration)}
                  </div>
                </div>

                {/* Content Details */}
                <div className="p-5 flex-grow flex flex-col justify-between space-y-4">
                  <div>
                    <h3 className="text-white font-bold text-sm line-clamp-2 leading-snug group-hover:text-[#ef9595] transition-colors mb-2">
                      {project.title}
                    </h3>
                    <p className="text-[#909cac] text-xs flex items-center gap-1.5 font-light">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#dd2222]"></span>
                      <span>{project.channel}</span>
                    </p>
                  </div>

                  <div className="pt-2 border-t border-white/8 flex items-center justify-between">
                    <span className="text-[11px] text-[#6e7d91] font-light">
                      {project.transcript ? `${project.transcript.length} lines` : 'Ready'}
                    </span>

                    <button
                      onClick={() => router.push(`/project/${project._id}`)}
                      className="px-4 py-2 rounded-xl gradient-button text-white font-semibold text-xs flex items-center gap-1.5 transition-all cursor-pointer"
                    >
                      <span>Open Workspace</span>
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

      </div>
    </DashboardLayout>
  );
}
