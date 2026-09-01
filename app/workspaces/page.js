'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import DashboardLayout from '@/components/DashboardLayout';
import { fetchWithSettings } from '@/lib/settings';

export default function WorkspacesPage() {
  const router = useRouter();
  const [projects, setProjects] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('newest');
  const [deletingId, setDeletingId] = useState(null);
  const [deleteModalId, setDeleteModalId] = useState(null);

  const fetchProjects = async () => {
    setIsLoading(true);
    try {
      const res = await fetchWithSettings('/api/project');
      if (!res.ok) throw new Error('Failed to fetch workspaces');
      const data = await res.json();
      setProjects(data.projects || []);
    } catch (err) {
      console.error('Error fetching workspaces:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  const handleDelete = async (id) => {
    setDeletingId(id);
    try {
      const res = await fetchWithSettings(`/api/project/${id}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Failed to delete workspace');
      setProjects((prev) => prev.filter((p) => p._id !== id));
      setDeleteModalId(null);
    } catch (err) {
      console.error(err);
      alert('Error deleting workspace: ' + err.message);
    } finally {
      setDeletingId(null);
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

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const filteredProjects = projects
    .filter((p) => {
      const q = searchQuery.toLowerCase();
      return (
        (p.title || '').toLowerCase().includes(q) ||
        (p.channel || '').toLowerCase().includes(q) ||
        (p._id || '').toLowerCase().includes(q)
      );
    })
    .sort((a, b) => {
      if (sortBy === 'newest') return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
      if (sortBy === 'oldest') return new Date(a.createdAt || 0) - new Date(b.createdAt || 0);
      if (sortBy === 'longest') return (b.duration || 0) - (a.duration || 0);
      if (sortBy === 'shortest') return (a.duration || 0) - (b.duration || 0);
      return 0;
    });

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto w-full px-4 sm:px-6 py-8 sm:py-12 space-y-6">
        
        {/* Header section */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#39414b]">
          <div>
            <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-[10px] border border-[#731111] bg-[#360c0c] text-[#fcf2f2] text-xs font-semibold uppercase tracking-wider mb-1.5">
              📁 Video Workspaces
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white">
              Workspaces <span className="text-[#dd2222]">Manager</span>
            </h1>
            <p className="text-[#909cac] text-xs sm:text-sm font-normal mt-0.5">
              Manage your imported YouTube videos, generated clips, custom captions, and rendered MP4 shorts.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={fetchProjects}
              className="p-2.5 rounded-[10px] bg-[#2d3239] hover:bg-[#39414b] border border-[#39414b] text-[#eeeff2] transition-colors cursor-pointer"
              title="Refresh workspaces"
            >
              <svg className={`w-4 h-4 ${isLoading ? 'animate-spin text-[#dd2222]' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
            <Link
              href="/"
              className="px-4 py-2.5 btn-primary text-xs flex items-center gap-1.5 cursor-pointer"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              <span>New Workspace</span>
            </Link>
          </div>
        </div>

        {/* Search and Filters Bar */}
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <input
              type="text"
              placeholder="Search workspaces by title, channel, or video ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 app-input text-xs font-normal"
            />
            <svg className="w-4 h-4 text-[#6e7d91] absolute left-3 top-1/2 -translate-y-1/2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#909cac] hover:text-white text-xs"
              >
                Clear
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <span className="text-xs text-[#909cac] font-medium shrink-0">Sort:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-3 py-2.5 app-input text-xs w-full sm:w-auto"
            >
              <option value="newest" className="bg-[#2d3239]">Newest Created</option>
              <option value="oldest" className="bg-[#2d3239]">Oldest Created</option>
              <option value="longest" className="bg-[#2d3239]">Longest Duration</option>
              <option value="shortest" className="bg-[#2d3239]">Shortest Duration</option>
            </select>
          </div>
        </div>

        {/* Workspaces Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map((n) => (
              <div key={n} className="app-card h-[300px] p-3 flex flex-col justify-between">
                <div className="bg-[#39414b] rounded-[10px] aspect-video w-full mb-3"></div>
                <div className="space-y-2 flex-grow">
                  <div className="h-4 bg-[#39414b] rounded-[10px] w-3/4"></div>
                  <div className="h-3 bg-[#39414b] rounded-[10px] w-1/2"></div>
                </div>
                <div className="h-9 bg-[#39414b] rounded-[10px] w-full mt-3"></div>
              </div>
            ))}
          </div>
        ) : filteredProjects.length === 0 ? (
          <div className="app-panel p-10 text-center max-w-md mx-auto space-y-3 my-8">
            <div className="w-12 h-12 rounded-[10px] bg-[#39414b] flex items-center justify-center mx-auto text-[#909cac]">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            </div>
            <div>
              <h3 className="text-base font-bold text-white">No workspaces found</h3>
              <p className="text-[#909cac] text-xs font-normal mt-1">
                {searchQuery
                  ? `No video workspaces match "${searchQuery}". Try a different search.`
                  : 'You haven’t created any workspaces yet. Paste a YouTube URL to get started!'}
              </p>
            </div>
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 px-4 py-2 btn-primary text-xs font-semibold"
            >
              <span>Create Workspace</span>
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredProjects.map((project) => (
              <div
                key={project._id}
                className="app-card overflow-hidden flex flex-col justify-between group relative"
              >
                {/* Thumbnail */}
                <div className="relative aspect-video w-full overflow-hidden bg-black/40">
                  <img
                    src={project.thumbnail}
                    alt={project.title}
                    className="object-cover w-full h-full"
                  />

                  <div className="absolute top-2 left-2 flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-[10px] bg-[#1d2125]/90 text-[10px] font-bold text-[#fcf2f2] border border-[#39414b]">
                      ID: {project._id}
                    </span>
                  </div>

                  {/* Delete Button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setDeleteModalId(project._id);
                    }}
                    className="absolute top-2 right-2 p-1.5 rounded-[10px] bg-[#1d2125]/80 hover:bg-[#dd2222] text-white border border-[#39414b] transition-colors cursor-pointer z-10"
                    title="Delete Workspace"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>

                  <div className="absolute bottom-2 right-2 px-2 py-0.5 rounded-[10px] bg-[#1d2125]/90 text-white text-[10px] font-mono font-bold border border-[#39414b]">
                    {formatDuration(project.duration)}
                  </div>
                </div>

                {/* Card Body */}
                <div className="p-4 flex-grow flex flex-col justify-between space-y-3">
                  <div>
                    <h3 className="text-white font-semibold text-sm line-clamp-2 leading-snug mb-1.5">
                      {project.title}
                    </h3>

                    <div className="flex items-center justify-between text-xs text-[#909cac]">
                      <span className="flex items-center gap-1 font-normal truncate max-w-[150px]">
                        <svg className="w-3 h-3 text-[#dd2222] shrink-0" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-6-3a2 2 0 11-4 0 2 2 0 014 0zm-2 4a5 5 0 00-4.546 2.916A5.986 5.986 0 0010 16a5.986 5.986 0 004.546-2.084A5 5 0 0010 11z" clipRule="evenodd" />
                        </svg>
                        {project.channel}
                      </span>
                      <span className="text-[10px] text-[#6e7d91] font-mono">
                        {formatDate(project.createdAt)}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => router.push(`/project/${project._id}`)}
                    className="w-full py-2.5 btn-secondary text-xs flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <span>Open Workspace</span>
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {deleteModalId && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
            <div className="app-panel p-6 max-w-sm w-full space-y-4 border border-[#ef4444]/40">
              <div className="w-10 h-10 rounded-[10px] bg-[#ef4444]/15 border border-[#ef4444]/30 text-[#ef4444] flex items-center justify-center">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </div>

              <div>
                <h3 className="text-base font-bold text-white">Delete Workspace?</h3>
                <p className="text-[#909cac] text-xs font-normal mt-1">
                  This will permanently delete the project records and all rendered MP4 files on your disk.
                </p>
              </div>

              <div className="flex items-center gap-2.5 pt-1">
                <button
                  type="button"
                  disabled={deletingId === deleteModalId}
                  onClick={() => setDeleteModalId(null)}
                  className="flex-1 py-2 rounded-[10px] btn-secondary text-xs font-medium cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={deletingId === deleteModalId}
                  onClick={() => handleDelete(deleteModalId)}
                  className="flex-1 py-2 rounded-[10px] bg-[#dd2222] hover:bg-[#b91c1c] text-white font-semibold text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  {deletingId === deleteModalId ? (
                    <span>Deleting...</span>
                  ) : (
                    <span>Yes, Delete</span>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </DashboardLayout>
  );
}
