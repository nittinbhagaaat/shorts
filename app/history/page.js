'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import DashboardLayout from '@/components/DashboardLayout';

export default function PlatformHistoryPage() {
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
    fetchUploads();
  }, []);

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

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto w-full px-4 sm:px-6 py-8 sm:py-10 space-y-8">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-[#39414b]">
          <div>
            <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-[10px] border border-[#dd2222]/40 bg-[#360c0c] text-[#fcf2f2] text-xs font-semibold uppercase tracking-wider mb-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[#dd2222] animate-pulse"></span>
              YouTube Shorts Hub
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Platform <span className="text-[#dd2222]">History</span>
            </h1>
            <p className="text-[#909cac] text-xs sm:text-sm font-normal mt-1 max-w-2xl">
              Track, review, and manage all scheduled and published YouTube Shorts created from your video studio.
            </p>
          </div>

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
        </div>

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

          {/* Search Input */}
          <div className="relative w-full sm:w-72">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by title, tags, or channel..."
              className="w-full px-3 py-1.5 pl-8 app-input text-xs"
            />
            <svg
              className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-[#909cac]"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0118 0z" />
            </svg>
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-2 text-[#909cac] hover:text-white text-xs cursor-pointer"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* History List */}
        {isLoading ? (
          <div className="p-12 text-center rounded-[12px] bg-[#2d3239] border border-[#39414b] space-y-3">
            <div className="w-6 h-6 border-2 border-[#dd2222] border-t-transparent rounded-full animate-spin mx-auto"></div>
            <p className="text-xs text-[#909cac]">Loading your YouTube Shorts publishing history...</p>
          </div>
        ) : filteredUploads.length === 0 ? (
          <div className="p-12 text-center rounded-[12px] bg-[#2d3239] border border-[#39414b] space-y-3">
            <div className="w-12 h-12 rounded-full bg-[#1d2125] border border-[#39414b] flex items-center justify-center text-xl mx-auto text-[#909cac]">
              📹
            </div>
            <h3 className="text-sm font-bold text-white">
              {searchQuery ? 'No matching Shorts found' : 'No YouTube Shorts published yet'}
            </h3>
            <p className="text-xs text-[#909cac] max-w-md mx-auto">
              {searchQuery
                ? 'Try clearing your search query or switching tabs.'
                : 'Select any project workspace, generate a vertical 9:16 Short with captions, and click "Upload to YouTube Short" to schedule or publish directly!'}
            </p>
            {!searchQuery && (
              <Link
                href="/workspaces"
                className="inline-block mt-2 px-4 py-2 btn-primary text-xs font-semibold cursor-pointer"
              >
                Go to Workspaces →
              </Link>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {filteredUploads.map((item) => {
              const isSched = item.isScheduled || item.status === 'scheduled';

              return (
                <div
                  key={item._id}
                  className="p-4 sm:p-5 rounded-[12px] bg-[#2d3239] border border-[#39414b] hover:border-[#dd2222]/50 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div className="min-w-0 flex-1 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`px-2.5 py-0.5 rounded-[6px] text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 ${
                          isSched
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                            : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                        }`}
                      >
                        {isSched ? '🕒 Scheduled' : '🚀 Published Live'}
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded-[6px] bg-[#1d2125] text-[#909cac] border border-[#39414b]">
                        9:16 Vertical
                      </span>
                      {item.duration > 0 && (
                        <span className="text-[10px] px-2 py-0.5 rounded-[6px] bg-[#1d2125] text-[#909cac] border border-[#39414b]">
                          {item.duration}s
                        </span>
                      )}
                    </div>

                    <h3 className="text-sm font-bold text-white line-clamp-1">
                      {item.title}
                    </h3>

                    {item.description && (
                      <p className="text-xs text-[#909cac] line-clamp-2 leading-relaxed">
                        {item.description}
                      </p>
                    )}

                    <div className="flex flex-wrap items-center gap-3 text-[11px] text-[#6e7d91] pt-1">
                      <span className="flex items-center gap-1 text-[#b9c0ca]">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#dd2222]"></span>
                        {item.channelTitle || 'Connected YouTube Channel'}
                      </span>
                      <span>·</span>
                      <span>
                        {isSched && item.scheduledPublishTime
                          ? `Scheduled Release: ${new Date(item.scheduledPublishTime).toLocaleString()}`
                          : `Uploaded: ${new Date(item.uploadedAt).toLocaleString()}`}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5 shrink-0 self-start md:self-center pt-2 md:pt-0 border-t md:border-t-0 border-[#39414b]">
                    {item.projectId && (
                      <Link
                        href={`/project/${item.projectId}`}
                        className="px-3 py-1.5 rounded-[8px] bg-[#1d2125] hover:bg-[#39414b] text-[#eeeff2] border border-[#39414b] text-xs font-semibold transition-colors flex items-center gap-1.5"
                      >
                        <span>Open Studio</span>
                      </Link>
                    )}
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

      </div>
    </DashboardLayout>
  );
}
