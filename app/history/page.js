'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import DashboardLayout from '@/components/DashboardLayout';
import { useAuth } from '@/contexts/AuthContext';

export default function PlatformHistoryPage() {
  const { user, loading: authLoading, loginWithGoogle } = useAuth();
  const [uploads, setUploads] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filterTab, setFilterTab] = useState('all'); // 'all' | 'scheduled' | 'uploaded'
  const [searchQuery, setSearchQuery] = useState('');
  const [channelStatus, setChannelStatus] = useState(null);

  const fetchUploads = async () => {
    try {
      setIsLoading(true);
      const [uploadsRes, statusRes] = await Promise.all([
        fetch('/api/youtube/uploads'),
        fetch('/api/youtube/status'),
      ]);

      if (uploadsRes.ok) {
        const data = await uploadsRes.json();
        setUploads(data.uploads || []);
      }

      if (statusRes.ok) {
        const statusData = await statusRes.json();
        setChannelStatus(statusData.connected ? statusData.account : null);
      }
    } catch (err) {
      console.error('Failed to fetch platform uploads:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading) {
      if (user) {
        fetchUploads();
      } else {
        setUploads([]);
        setChannelStatus(null);
        setIsLoading(false);
      }
    }
  }, [user, authLoading]);

  const scheduledCount = uploads.filter((u) => u.isScheduled || u.status === 'scheduled').length;
  const publishedCount = uploads.filter((u) => !u.isScheduled && u.status === 'uploaded').length;

  const filteredUploads = uploads
    .filter((item) => {
      const isSched = item.isScheduled || item.status === 'scheduled';
      if (filterTab === 'scheduled') return isSched;
      if (filterTab === 'uploaded') return !isSched;
      return true;
    })
    .filter((item) => {
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        item.title?.toLowerCase().includes(q) ||
        item.description?.toLowerCase().includes(q) ||
        item.channelTitle?.toLowerCase().includes(q)
      );
    });

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleDateString() + ', ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <DashboardLayout>
      <div className="p-4 sm:p-8 max-w-7xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#39414b] pb-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="w-2 h-2 rounded-full bg-[#dd2222]"></span>
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#909cac]">
                YouTube Shorts Hub
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Platform <span className="text-[#dd2222]">History</span>
            </h1>
            <p className="text-[#909cac] text-xs sm:text-sm font-normal mt-1 max-w-2xl">
              Track, review, and manage all scheduled and published YouTube Shorts created from your video studio.
            </p>
          </div>

          {user && (
            <div className="flex items-center gap-2.5 self-start md:self-auto">
              <button
                onClick={fetchUploads}
                disabled={isLoading}
                className="px-3.5 py-2 btn-secondary text-xs flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <svg className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                <span>Refresh</span>
              </button>

              <Link
                href="/"
                className="px-4 py-2 btn-primary text-xs flex items-center gap-2 cursor-pointer"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                <span>Create New Short</span>
              </Link>
            </div>
          )}
        </div>

        {/* Private Account Lock if Unauthenticated */}
        {!authLoading && !user ? (
          <div className="app-panel p-10 text-center max-w-lg mx-auto space-y-5 my-12 border border-[#39414b] shadow-2xl">
            <div className="w-14 h-14 rounded-2xl bg-[#dd2222]/10 border border-[#dd2222]/30 flex items-center justify-center mx-auto text-[#dd2222]">
              <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Private Publishing History</h3>
              <p className="text-[#909cac] text-xs font-normal mt-1.5 max-w-sm mx-auto leading-relaxed">
                Publishing records and scheduled Shorts are private to each creator's account. Sign in with Google or Email to access your publishing history.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <button
                onClick={() => loginWithGoogle('/history')}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-[#1d2125] hover:bg-[#252a30] border border-[#4b5563] text-white text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer shadow-sm"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.65v3.03h3.88c2.27-2.09 3.66-5.17 3.66-9.12z" />
                  <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.03c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.13C3.27 21.43 7.35 24 12 24z" />
                  <path fill="#FBBC05" d="M5.28 14.29c-.25-.72-.38-1.49-.38-2.29s.13-1.57.38-2.29V6.58H1.25C.45 8.18 0 10.03 0 12s.45 3.82 1.25 5.42l4.03-3.13z" />
                  <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.35 0 3.27 2.57 1.25 6.58l4.03 3.13c.95-2.83 3.6-4.96 6.72-4.96z" />
                </svg>
                <span>Sign In with Google</span>
              </button>
              <Link
                href="/login?returnTo=/history"
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-[#dd2222] hover:bg-[#c81e1e] text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-md shadow-[#dd2222]/20"
              >
                <span>Sign In with Email</span>
              </Link>
            </div>
          </div>
        ) : (
          <>
            {/* Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-4 rounded-[12px] bg-[#2d3239] border border-[#39414b]">
                <div className="flex items-center justify-between text-[#909cac] text-xs mb-1">
                  <span>Total Uploads</span>
                  <span className="p-1.5 rounded-[8px] bg-[#1d2125] text-white">🎬</span>
                </div>
                <div className="text-2xl font-extrabold text-white">{uploads.length}</div>
                <p className="text-[11px] text-[#6e7d91] mt-1">Shorts generated & published</p>
              </div>

              <div className="p-4 rounded-[12px] bg-[#2d3239] border border-[#39414b]">
                <div className="flex items-center justify-between text-[#909cac] text-xs mb-1">
                  <span>Published Live</span>
                  <span className="p-1.5 rounded-[8px] bg-[#1d2125] text-emerald-400">🚀</span>
                </div>
                <div className="text-2xl font-extrabold text-emerald-400">{publishedCount}</div>
                <p className="text-[11px] text-[#6e7d91] mt-1">Live on YouTube</p>
              </div>

              <div className="p-4 rounded-[12px] bg-[#2d3239] border border-[#39414b]">
                <div className="flex items-center justify-between text-[#909cac] text-xs mb-1">
                  <span>Scheduled Queue</span>
                  <span className="p-1.5 rounded-[8px] bg-[#1d2125] text-amber-400">🕒</span>
                </div>
                <div className="text-2xl font-extrabold text-amber-400">{scheduledCount}</div>
                <p className="text-[11px] text-[#6e7d91] mt-1">Awaiting auto-release</p>
              </div>

              <div className="p-4 rounded-[12px] bg-[#2d3239] border border-[#39414b]">
                <div className="flex items-center justify-between text-[#909cac] text-xs mb-1">
                  <span>Target Channel</span>
                  <span className="p-1.5 rounded-[8px] bg-[#1d2125] text-[#dd2222]">📺</span>
                </div>
                {channelStatus ? (
                  <div>
                    <div className="text-sm font-bold text-white truncate">{channelStatus.channelTitle}</div>
                    <p className="text-[11px] text-emerald-400 mt-1 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                      Connected
                    </p>
                  </div>
                ) : (
                  <div>
                    <div className="text-sm font-bold text-[#909cac]">Not Connected</div>
                    <Link href="/settings" className="text-[11px] text-[#dd2222] hover:underline mt-1 block">
                      Connect in Settings →
                    </Link>
                  </div>
                )}
              </div>
            </div>

            {/* Filter & Search Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#2d3239] p-3 rounded-[12px] border border-[#39414b]">
              {/* Tabs */}
              <div className="flex bg-[#1d2125] p-1 rounded-[10px] border border-[#39414b] w-full sm:w-auto">
                {[
                  { id: 'all', label: `All (${uploads.length})` },
                  { id: 'uploaded', label: `Published (${publishedCount})` },
                  { id: 'scheduled', label: `Scheduled (${scheduledCount})` },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setFilterTab(tab.id)}
                    className={`flex-1 sm:flex-initial px-3.5 py-1.5 rounded-[8px] text-xs font-semibold transition-all cursor-pointer ${
                      filterTab === tab.id
                        ? 'bg-[#dd2222] text-white shadow'
                        : 'text-[#909cac] hover:text-white'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Search */}
              <div className="relative w-full sm:w-72">
                <input
                  type="text"
                  placeholder="Search by title, tags, or channel..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full px-3.5 py-2 pl-9 app-input text-xs"
                />
                <svg
                  className="w-4 h-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-[#909cac]"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
              </div>
            </div>

            {/* Content List */}
            {isLoading ? (
              <div className="p-12 text-center bg-[#2d3239] rounded-[14px] border border-[#39414b] flex flex-col items-center justify-center gap-3">
                <div className="w-8 h-8 rounded-full border-2 border-[#dd2222] border-t-transparent animate-spin"></div>
                <span className="text-xs text-[#909cac]">Loading publishing records...</span>
              </div>
            ) : filteredUploads.length === 0 ? (
              <div className="p-12 text-center bg-[#2d3239] rounded-[14px] border border-[#39414b] space-y-3">
                <div className="w-12 h-12 rounded-[12px] bg-[#1d2125] flex items-center justify-center mx-auto text-xl">
                  📭
                </div>
                <h3 className="text-base font-bold text-white">No YouTube Shorts in this view</h3>
                <p className="text-xs text-[#909cac] max-w-sm mx-auto">
                  {searchQuery
                    ? 'No uploads match your search criteria. Try a different term.'
                    : 'Render clips from your workspaces and publish or schedule them directly to YouTube.'}
                </p>
                <Link
                  href="/"
                  className="inline-flex items-center gap-1.5 px-4 py-2 btn-primary text-xs font-semibold mt-2"
                >
                  <span>Go to Studio</span>
                  <span>→</span>
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredUploads.map((item) => {
                  const isSched = item.isScheduled || item.status === 'scheduled';
                  return (
                    <div
                      key={item._id}
                      className="p-4 sm:p-5 rounded-[12px] bg-[#2d3239] border border-[#39414b] hover:border-[#4b5563] transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
                    >
                      <div className="space-y-1.5 min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          {isSched ? (
                            <span className="px-2.5 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
                              <span>🕒</span> Scheduled Release
                            </span>
                          ) : (
                            <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
                              <span>🚀</span> Published Live
                            </span>
                          )}
                          <span className="text-[10px] text-[#6e7d91] font-mono bg-[#1d2125] px-2 py-0.5 rounded-[6px]">
                            9:16 Vertical
                          </span>
                          {item.duration > 0 && (
                            <span className="text-[10px] text-[#909cac] font-mono">
                              {Math.round(item.duration)}s
                            </span>
                          )}
                        </div>

                        <h3 className="text-sm sm:text-base font-bold text-white truncate">
                          {item.title}
                        </h3>

                        {item.description && (
                          <p className="text-xs text-[#909cac] line-clamp-1">
                            {item.description}
                          </p>
                        )}

                        <div className="flex flex-wrap items-center gap-3 text-[11px] text-[#6e7d91] pt-1">
                          <span className="flex items-center gap-1 text-[#909cac]">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#dd2222]"></span>
                            {item.channelTitle || 'Connected Channel'}
                          </span>
                          <span>•</span>
                          <span>
                            {isSched
                              ? `Releases: ${formatDate(item.scheduledPublishTime)}`
                              : `Uploaded: ${formatDate(item.uploadedAt)}`}
                          </span>
                          {item.privacyStatus && (
                            <>
                              <span>•</span>
                              <span className="capitalize">{item.privacyStatus}</span>
                            </>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0 self-start md:self-center">
                        <Link
                          href={`/project/${item.projectId}`}
                          className="px-3.5 py-1.5 rounded-[8px] bg-[#1d2125] hover:bg-[#39414b] text-[#f6f7f8] border border-[#39414b] text-xs font-semibold transition-colors"
                        >
                          Open Studio
                        </Link>
                        {item.youtubeVideoUrl && (
                          <a
                            href={item.youtubeVideoUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-3.5 py-1.5 rounded-[8px] bg-[#dd2222] hover:bg-[#b91c1c] text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-red-950/40 transition-colors"
                          >
                            <span>Watch Short</span>
                            <span>↗</span>
                          </a>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}

      </div>
    </DashboardLayout>
  );
}
