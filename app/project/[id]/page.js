'use client';

import { useState, useEffect, use, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import DashboardLayout from '@/components/DashboardLayout';
import YouTubeUploadModal from '@/components/YouTubeUploadModal';
import { fetchWithSettings, getStoredSettings, safeParseJson } from '@/lib/settings';
import { useAuth } from '@/contexts/AuthContext';

export default function ProjectWorkspace({ params }) {
  const router = useRouter();
  const { user, loading: authLoading, loginWithGoogle } = useAuth();
  const [authError, setAuthError] = useState('');
  const resolvedParams = use(params);
  const projectId = resolvedParams.id;

  const [project, setProject] = useState(null);
  const [clips, setClips] = useState([]);
  const [selectedClip, setSelectedClip] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // YouTube Shorts direct upload and scheduling
  const [isYouTubeUploadOpen, setIsYouTubeUploadOpen] = useState(false);
  const [youtubeUploads, setYoutubeUploads] = useState([]);
  const [isLoadingUploads, setIsLoadingUploads] = useState(false);
  
  // Render & Studio properties state
  const [cropFocus, setCropFocus] = useState('auto'); // 'auto' (camera follows person), 'blurred_fit', 'center', 'left', 'right'
  const [renderFormat, setRenderFormat] = useState('vertical');

  // Video Editor: Custom Text Overlay
  const [hasOverlayText, setHasOverlayText] = useState(false);
  const [overlayText, setOverlayText] = useState('');
  const [overlayTextOpacity, setOverlayTextOpacity] = useState(1.0);
  const [overlayTextYPercent, setOverlayTextYPercent] = useState(14);
  const [overlayTextColor, setOverlayTextColor] = useState('#FFFFFF');
  const [overlayTextSize, setOverlayTextSize] = useState('medium');
  const [overlayTextBg, setOverlayTextBg] = useState(true);

  const [isRendering, setIsRendering] = useState(false);
  const [renderError, setRenderError] = useState('');
  const [renderProgressText, setRenderProgressText] = useState('');

  // Live player tracking state
  const [playerTime, setPlayerTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [previewActiveTab, setPreviewActiveTab] = useState('vertical');

  // Video preview player state
  const [localPreviewUrl, setLocalPreviewUrl] = useState('');
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [videoError, setVideoError] = useState(false);
  const videoRef = useRef(null);

  const fetchProjectData = async () => {
    try {
      const res = await fetchWithSettings(`/api/project/${projectId}`);
      if (!res.ok) {
        if (res.status === 401) {
          router.push(`/login?returnTo=/project/${projectId}`);
          return;
        }
        if (res.status === 403) {
          setAuthError('Access denied: You do not have permission to access this workspace.');
          setIsLoading(false);
          return;
        }
        throw new Error('Failed to load project details');
      }
      const data = await safeParseJson(res);
      setProject(data.project);
      setClips(data.clips || []);
      
      if (selectedClip) {
        const updatedSelected = (data.clips || []).find((c) => c._id === selectedClip._id);
        if (updatedSelected) {
          setSelectedClip(updatedSelected);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchYouTubeUploads = async () => {
    if (!projectId) return;
    try {
      setIsLoadingUploads(true);
      const res = await fetchWithSettings(`/api/youtube/uploads?projectId=${projectId}`);
      if (res.ok) {
        const data = await safeParseJson(res);
        setYoutubeUploads(data.uploads || []);
      }
    } catch (err) {
      console.error('Failed to load YouTube uploads for project:', err);
    } finally {
      setIsLoadingUploads(false);
    }
  };

  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        router.push(`/login?returnTo=/project/${projectId}`);
      } else {
        fetchProjectData();
        fetchYouTubeUploads();
      }
    }
  }, [projectId, user, authLoading]);

  const fetchQuickPreview = async (clipId) => {
    const targetId = clipId || selectedClip?._id;
    if (!targetId) return;
    setIsLoadingPreview(true);
    try {
      const res = await fetchWithSettings(`/api/clip/${targetId}/preview`);
      if (res.ok) {
        const data = await safeParseJson(res);
        if (data.previewUrl) {
          setLocalPreviewUrl(`/api/clip/${targetId}/stream?format=${previewActiveTab}`);
        }
      }
    } catch (err) {
      console.warn('Could not fetch quick preview:', err);
    } finally {
      setIsLoadingPreview(false);
    }
  };

  // Load selected clip settings into form state
  useEffect(() => {
    if (selectedClip) {
      setCropFocus(selectedClip.cropFocus || 'auto');
      setRenderFormat(selectedClip.renderFormat || 'vertical');

      setOverlayText(selectedClip.overlayText || '');
      setHasOverlayText(Boolean(selectedClip.overlayText && selectedClip.overlayText.trim()));
      setOverlayTextOpacity(typeof selectedClip.overlayTextOpacity === 'number' ? selectedClip.overlayTextOpacity : 1.0);
      setOverlayTextYPercent(typeof selectedClip.overlayTextYPercent === 'number' ? selectedClip.overlayTextYPercent : 14);
      setOverlayTextColor(selectedClip.overlayTextColor || '#FFFFFF');
      setOverlayTextSize(selectedClip.overlayTextSize || 'medium');
      setOverlayTextBg(typeof selectedClip.overlayTextBg === 'boolean' ? selectedClip.overlayTextBg : true);

      setRenderError('');
      setVideoError(false);
      setLocalPreviewUrl('');
      setPlayerTime(selectedClip.start || 0);

      if (selectedClip.status === 'completed') {
        setLocalPreviewUrl(`/api/clip/${selectedClip._id}/stream?format=${previewActiveTab}`);
      } else {
        // Automatically check if quick preview exists or extract it
        fetchQuickPreview(selectedClip._id);
      }
    }
  }, [selectedClip?._id]);

  const handleTimeUpdate = (e) => {
    if (!selectedClip) return;
    const current = e.target.currentTime;
    setPlayerTime(selectedClip.start + current);
  };

  useEffect(() => {
    if (renderFormat === 'vertical') {
      setPreviewActiveTab('vertical');
    } else if (renderFormat === 'horizontal') {
      setPreviewActiveTab('horizontal');
    } else if (renderFormat === 'both') {
      if (selectedClip && selectedClip.status === 'completed') {
        if (selectedClip.videoPathVertical) {
          setPreviewActiveTab('vertical');
        } else if (selectedClip.videoPathHorizontal) {
          setPreviewActiveTab('horizontal');
        }
      } else {
        setPreviewActiveTab('vertical');
      }
    }
  }, [renderFormat, selectedClip?._id]);

  useEffect(() => {
    let interval;
    const hasRenderingClips = clips.some((c) => c.status === 'rendering');
    
    if (hasRenderingClips) {
      interval = setInterval(() => {
        fetchProjectData();
      }, 3000);
    }
    
    return () => clearInterval(interval);
  }, [clips]);

  const handleDeleteWorkspace = async () => {
    if (!confirm("Are you sure you want to delete this workspace? This will permanently delete the project, all clips, and all rendered video files.")) {
      return;
    }

    setIsDeleting(true);
    try {
      const res = await fetchWithSettings(`/api/project/${projectId}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        const errData = await safeParseJson(res);
        throw new Error(errData.error || 'Failed to delete workspace');
      }

      window.location.href = '/workspaces';
    } catch (err) {
      console.error(err);
      alert(err.message || 'An error occurred while deleting the workspace');
      setIsDeleting(false);
    }
  };

  const handleRegenerateMoments = async () => {
    if (!project) return;
    const count = prompt("How many viral moments would you like to discover across the video? (1 - 20)", project.targetClips || clips.length || 5);
    if (!count) return;
    const parsedCount = Math.min(20, Math.max(1, parseInt(count, 10) || 5));

    setIsRegenerating(true);
    try {
      const res = await fetchWithSettings('/api/project', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: project.url,
          clipCount: parsedCount,
          regenerate: true
        })
      });

      if (!res.ok) {
        const errData = await safeParseJson(res);
        throw new Error(errData.error || 'Failed to re-scan video');
      }

      const data = await safeParseJson(res);
      setProject(data.project);
      setClips(data.clips || []);
      if (data.clips && data.clips.length > 0) {
        setSelectedClip(data.clips[0]);
      }
    } catch (err) {
      alert(err.message || 'Error re-generating moments');
    } finally {
      setIsRegenerating(false);
    }
  };

  const handleStartRender = async () => {
    if (!selectedClip) return;
    
    setIsRendering(true);
    setRenderError('');
    setRenderProgressText('Initializing ultra-fast rendering...');

    const steps = [
      { delay: 300, text: 'Opening video stream...' },
      { delay: 1000, text: cropFocus === 'auto' ? 'Camera: Auto-framing speaker...' : cropFocus === 'blurred_fit' ? 'FFmpeg: Creating 9:16 blurred background canvas...' : 'Processing 9:16 video layout...' },
      { delay: 2500, text: 'Executing high-speed MP4 render...' },
    ];

    const timeouts = steps.map((step) => 
      setTimeout(() => setRenderProgressText(step.text), step.delay)
    );

    try {
      setSelectedClip((prev) => ({ ...prev, status: 'rendering' }));
      setClips((prev) => prev.map((c) => (c._id === selectedClip._id ? { ...c, status: 'rendering' } : c)));

      const res = await fetchWithSettings(`/api/clip/${selectedClip._id}/render`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          enableSubtitles: false,
          captionStyle: 'none',
          cropFocus,
          renderFormat,
          overlayText: hasOverlayText ? overlayText : '',
          overlayTextOpacity,
          overlayTextYPercent,
          overlayTextColor,
          overlayTextSize,
          overlayTextBg,
        }),
      });

      timeouts.forEach((t) => clearTimeout(t));

      if (!res.ok) {
        const errData = await safeParseJson(res);
        throw new Error(errData.error || 'Failed to render video clip');
      }

      const data = await safeParseJson(res);
      setRenderProgressText('Render complete!');
      
      setSelectedClip(data.clip);
      await fetchProjectData();
    } catch (err) {
      timeouts.forEach((t) => clearTimeout(t));
      const rawMsg = err.message || 'An error occurred during rendering';
      const cleanMsg = rawMsg.includes('Requested format is not available')
        ? 'YouTube video format was unavailable. Please retry rendering or check your YouTube video access.'
        : rawMsg;
      setRenderError(cleanMsg);
      await fetchProjectData();
    } finally {
      setIsRendering(false);
    }
  };

  const handleResetRender = async () => {
    if (!selectedClip) return;
    if (!confirm("Are you sure you want to delete the rendered video files for this clip? This will delete the MP4s and reset the clip status so you can re-edit text overlays or framing.")) {
      return;
    }

    setIsResetting(true);
    setRenderError('');
    
    try {
      const res = await fetchWithSettings(`/api/clip/${selectedClip._id}/render`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        const errData = await safeParseJson(res);
        throw new Error(errData.error || 'Failed to reset clip');
      }

      const data = await safeParseJson(res);
      setSelectedClip(data.clip);
      await fetchProjectData();
    } catch (err) {
      console.error(err);
      setRenderError(err.message || 'An error occurred while resetting the clip');
    } finally {
      setIsResetting(false);
    }
  };

  useEffect(() => {
    if (!window.YT) {
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      const firstScriptTag = document.getElementsByTagName('script')[0];
      firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
    }
  }, []);

  useEffect(() => {
    if (!selectedClip || selectedClip.status === 'completed') {
      setPlayerTime(0);
      setIsPlaying(false);
      return;
    }

    let ytPlayer = null;
    let timePollInterval = null;
    let initAttempts = 0;
    
    const initTimer = setInterval(() => {
      if (window.YT && window.YT.Player) {
        clearInterval(initTimer);
        try {
          ytPlayer = new window.YT.Player('youtube-player-iframe', {
            events: {
              onStateChange: (event) => {
                if (event.data === 1) {
                  setIsPlaying(true);
                } else {
                  setIsPlaying(false);
                }
              },
            },
          });
        } catch (e) {
          console.warn('Failed to initialize YouTube Player API:', e.message);
        }
      } else {
        initAttempts++;
        if (initAttempts > 20) {
          clearInterval(initTimer);
        }
      }
    }, 500);

    timePollInterval = setInterval(() => {
      if (ytPlayer && typeof ytPlayer.getCurrentTime === 'function') {
        try {
          const time = ytPlayer.getCurrentTime();
          setPlayerTime(time);
        } catch (e) {}
      }
    }, 150);

    return () => {
      clearInterval(initTimer);
      clearInterval(timePollInterval);
    };
  }, [selectedClip?._id, isPlaying]);

  const formatDuration = (secs) => {
    if (!secs) return '0:00';
    const mins = Math.floor(secs / 60);
    const rSecs = Math.floor(secs % 60);
    return `${mins}:${rSecs.toString().padStart(2, '0')}`;
  };

  if (!authLoading && !user) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center min-h-[60vh] p-6 text-center space-y-5 max-w-md mx-auto">
          <div className="w-16 h-16 rounded-2xl bg-[#dd2222]/10 border border-[#dd2222]/30 flex items-center justify-center mx-auto text-[#dd2222]">
            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <div>
            <h2 className="text-xl font-bold text-white mb-1.5">Sign In Required</h2>
            <p className="text-[#909cac] text-xs leading-relaxed">
              Workspaces are private and isolated. You must be signed in to access this project.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 w-full justify-center">
            <button
              onClick={() => loginWithGoogle(`/project/${projectId}`)}
              className="px-5 py-2.5 rounded-xl bg-[#1d2125] hover:bg-[#252a30] border border-[#4b5563] text-white text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer shadow-sm"
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
              href={`/login?returnTo=/project/${projectId}`}
              className="px-5 py-2.5 rounded-xl bg-[#dd2222] hover:bg-[#c81e1e] text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-md shadow-[#dd2222]/20"
            >
              Sign In with Email
            </Link>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[70vh]">
          <div className="text-center space-y-2">
            <svg className="animate-spin h-8 w-8 text-[#dd2222] mx-auto" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            <p className="text-[#909cac] font-normal text-xs">Loading workspace and clips...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (authError) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center min-h-[60vh] p-6 text-center space-y-4 max-w-md mx-auto">
          <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/30 flex items-center justify-center mx-auto text-red-400">
            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <div>
            <h2 className="text-xl font-bold text-white mb-1.5">Private Workspace</h2>
            <p className="text-[#909cac] text-xs leading-relaxed">{authError}</p>
          </div>
          <Link href="/workspaces" className="px-5 py-2.5 btn-primary text-xs font-bold inline-block">
            Back to My Workspaces
          </Link>
        </div>
      </DashboardLayout>
    );
  }

  if (!project) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center min-h-[60vh] p-4 text-center">
          <h2 className="text-xl font-bold text-[#ef4444] mb-2">Workspace Not Found</h2>
          <p className="text-[#909cac] mb-4 text-xs">The workspace you are trying to access does not exist or was deleted.</p>
          <Link href="/workspaces" className="px-4 py-2 btn-primary text-xs font-semibold">
            Return to Workspaces
          </Link>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="flex flex-col h-full">
        {/* Workspace Top Header */}
        <header className="border-b border-[#39414b] bg-[#2d3239] px-4 sm:px-6 py-3 flex items-center justify-between gap-4 sticky top-0 z-20">
          <div className="flex items-center gap-2.5 min-w-0">
            <Link
              href="/workspaces"
              className="p-1.5 rounded-[10px] bg-[#1d2125] hover:bg-[#39414b] border border-[#39414b] text-[#eeeff2] transition-colors shrink-0"
              title="Back to all workspaces"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </Link>
            <div className="min-w-0">
              <h1 className="text-sm font-bold text-white truncate max-w-xl">{project.title}</h1>
              <p className="text-[11px] text-[#909cac] font-normal flex items-center gap-1.5 mt-0.5">
                <span>{project.channel}</span>
                <span className="w-1 h-1 rounded-full bg-[#6e7d91]"></span>
                <span>{formatDuration(project.duration)}</span>
                <span className="w-1 h-1 rounded-full bg-[#6e7d91]"></span>
                <span className="text-[#dd2222] font-semibold">{clips.length} Viral Moments</span>
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleRegenerateMoments}
              disabled={isRegenerating || isDeleting}
              className="px-3 py-1.5 rounded-[10px] bg-[#39414b]/60 hover:bg-[#39414b] border border-[#39414b] text-[#eeeff2] text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
              title="Re-scan full video timeline and discover fresh viral moments up to 1m 30s"
            >
              {isRegenerating ? (
                <>
                  <svg className="animate-spin h-3.5 w-3.5 text-[#dd2222]" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  <span>Re-scanning Video...</span>
                </>
              ) : (
                <>
                  <svg className="w-3.5 h-3.5 text-[#dd2222]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  <span>Re-scan Full Video</span>
                </>
              )}
            </button>

            <button
              onClick={handleDeleteWorkspace}
              disabled={isDeleting || isRegenerating}
              className="px-3 py-1.5 rounded-[10px] bg-[#ef4444]/15 hover:bg-[#ef4444]/25 border border-[#ef4444]/30 text-[#ef4444] text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
            >
              {isDeleting ? (
                <>
                  <svg className="animate-spin h-3.5 w-3.5 text-[#ef4444]" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  <span>Deleting...</span>
                </>
              ) : (
                <>
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  <span>Delete</span>
                </>
              )}
            </button>
          </div>
        </header>

        {/* Main Workspace Body */}
        <div className="flex-grow flex flex-col lg:flex-row min-h-0 overflow-hidden relative">
          
          {/* Left Sidebar: Clips Navigator */}
          <aside className="w-full lg:w-72 border-b lg:border-b-0 lg:border-r border-[#39414b] flex flex-col overflow-y-auto max-h-[280px] lg:max-h-none shrink-0 bg-[#1d2125]">
            <div className="p-3 border-b border-[#39414b] sticky top-0 bg-[#2d3239] z-10 flex items-center justify-between">
              <h2 className="font-bold text-xs tracking-wider text-[#dd2222] uppercase">
                Viral Moments ({clips.length})
              </h2>
            </div>
            
            <div className="p-2.5 space-y-2">
              {clips.map((clip) => {
                const isSelected = selectedClip?._id === clip._id;
                return (
                  <div
                    key={clip._id}
                    onClick={() => setSelectedClip(clip)}
                    className={`p-3 rounded-[10px] cursor-pointer border transition-colors ${
                      isSelected
                        ? 'bg-[#360c0c] border-[#dd2222]'
                        : 'bg-[#2d3239] border-[#39414b] hover:border-[#4b5563]'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <h3 className={`font-semibold text-xs line-clamp-1 ${isSelected ? 'text-[#fcf2f2]' : 'text-white'}`}>
                        {clip.title}
                      </h3>
                      <span className="shrink-0 px-1.5 py-0.5 rounded-[10px] bg-[#1d2125] text-[#eeeff2] font-mono text-[10px] font-bold border border-[#39414b]">
                        {formatDuration(clip.duration)}
                      </span>
                    </div>
                    
                    <p className="text-[#909cac] text-[11px] line-clamp-2 leading-snug mb-2 font-normal">
                      {clip.description}
                    </p>

                    <div className="flex items-center justify-between text-[10px]">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[#6e7d91] font-mono">
                          {formatDuration(clip.start)} - {formatDuration(clip.end)}
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-1.5">
                        {clip.youtubeUploadStatus === 'uploaded' && (
                          <span className="text-[10px] text-red-400 flex items-center gap-0.5 font-bold" title="Published YouTube Short">
                            <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>
                            Short
                          </span>
                        )}
                        {clip.youtubeUploadStatus === 'scheduled' && (
                          <span className="text-[10px] text-amber-400 flex items-center gap-0.5 font-bold" title="Scheduled YouTube Short">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                            Scheduled
                          </span>
                        )}
                        {clip.status === 'pending' && (
                          <span className="text-[#909cac] flex items-center gap-1 font-medium">
                            <span className={`w-1.5 h-1.5 rounded-full ${clip.purgedReason === 'expired_10min' ? 'bg-amber-400' : clip.purgedReason === 'uploaded_to_youtube' ? 'bg-emerald-400' : 'bg-[#6e7d91]'}`}></span>
                            {clip.purgedReason === 'uploaded_to_youtube'
                              ? 'Uploaded (Cleaned)'
                              : clip.purgedReason === 'expired_10min'
                              ? 'Expired (10m)'
                              : 'Ready'}
                          </span>
                        )}
                        {clip.status === 'rendering' && (
                          <span className="text-[#f59e0b] flex items-center gap-1 font-semibold">
                            Rendering
                          </span>
                        )}
                        {clip.status === 'completed' && !clip.youtubeUploadStatus && (
                          <span className="text-[#22c55e] flex items-center gap-1 font-bold">
                            Rendered
                          </span>
                        )}
                        {clip.status === 'failed' && (
                          <span className="text-[#ef4444] font-semibold">
                            Failed
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </aside>

          {/* Center/Right: Video Framing & Studio */}
          <section className="flex-grow flex flex-col xl:flex-row overflow-y-auto p-4 sm:p-6 gap-6 bg-[#1d2125]">
            {(() => {
              return !selectedClip ? (
                <div className="flex-grow flex flex-col items-center justify-center text-center p-8 app-panel rounded-[10px] border border-dashed border-[#39414b] min-h-[350px]">
                  <div className="w-12 h-12 rounded-[10px] bg-[#39414b] flex items-center justify-center mb-3 text-[#dd2222]">
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <h3 className="text-sm font-bold text-white mb-1">Select a Viral Clip</h3>
                  <p className="text-[#909cac] text-xs max-w-xs font-normal">
                    Pick any AI moment from the list to preview, adjust camera framing, add text overlays, and export.
                  </p>
                </div>
              ) : (
                <>
                  {/* Left: Player & Controls */}
                  <div className="w-full xl:w-[350px] flex flex-col shrink-0 gap-3">
                    <div className="app-panel p-4 flex flex-col items-center">
                      <div className="flex items-center justify-between w-full mb-2.5">
                        <h3 className="text-xs font-bold text-[#dd2222] uppercase tracking-wider">Preview Player</h3>
                        <span className="text-[10px] text-[#909cac] font-mono">
                          {selectedClip.status === 'completed' 
                            ? 'Rendered Output' 
                            : (isRendering || selectedClip.status === 'rendering')
                            ? 'Rendering...'
                            : localPreviewUrl
                            ? 'HD Clip Preview'
                            : 'Interactive Preview'}
                        </span>
                      </div>
                      
                      {/* Format Switcher */}
                      {(() => {
                        const hasBothRendered = selectedClip && selectedClip.status === 'completed' && selectedClip.videoPathVertical && selectedClip.videoPathHorizontal;
                        const showToggle = renderFormat === 'both' || hasBothRendered;
                        
                        return showToggle && (
                          <div className="flex bg-[#1d2125] p-1 rounded-[10px] border border-[#39414b] mb-2.5 w-full max-w-[260px]">
                            <button
                              onClick={() => setPreviewActiveTab('vertical')}
                              className={`flex-1 py-1 text-[10px] font-bold uppercase rounded-[10px] transition-colors cursor-pointer ${
                                previewActiveTab === 'vertical'
                                  ? 'bg-[#dd2222] text-white'
                                  : 'text-[#909cac] hover:text-white'
                              }`}
                            >
                              Vertical (9:16)
                            </button>
                            <button
                              onClick={() => setPreviewActiveTab('horizontal')}
                              className={`flex-1 py-1 text-[10px] font-bold uppercase rounded-[10px] transition-colors cursor-pointer ${
                                previewActiveTab === 'horizontal'
                                  ? 'bg-[#dd2222] text-white'
                                  : 'text-[#909cac] hover:text-white'
                              }`}
                            >
                              Horizontal (16:9)
                            </button>
                          </div>
                        );
                      })()}

                      {/* Video Player Box */}
                      <div 
                        className={`relative bg-black rounded-[12px] overflow-hidden border border-[#39414b] shadow-2xl flex items-center justify-center transition-all ${
                          previewActiveTab === 'horizontal' 
                            ? 'aspect-[16/9] w-full max-w-[340px]' 
                            : 'aspect-[9/16] w-full max-w-[260px]'
                        }`}
                      >
                        {/* 1. Rendering State HUD */}
                        {(isRendering || selectedClip.status === 'rendering') ? (
                          <div className="absolute inset-0 z-30 flex flex-col items-center justify-center p-4 bg-gradient-to-b from-[#181c20]/95 via-[#1d2125]/95 to-[#121518]/95 backdrop-blur-md">
                            <div className="relative w-14 h-14 mb-3 flex items-center justify-center">
                              <div className="absolute inset-0 rounded-full border-2 border-[#dd2222]/30 animate-ping"></div>
                              <div className="absolute inset-0 rounded-full border-2 border-t-[#dd2222] border-r-transparent border-b-[#dd2222] border-l-transparent animate-spin"></div>
                              <div className="w-9 h-9 rounded-full bg-[#dd2222]/20 border border-[#dd2222]/50 flex items-center justify-center text-[#dd2222]">
                                <svg className="w-5 h-5 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                </svg>
                              </div>
                            </div>
                            <span className="text-[10px] font-bold text-[#dd2222] uppercase tracking-widest mb-1 flex items-center gap-1.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-[#dd2222] animate-ping"></span>
                              AI Rendering Active
                            </span>
                            <p className="text-white text-xs font-semibold text-center mb-2.5 max-w-[210px] leading-snug">
                              {renderProgressText || 'AI vision tracking speaker & rendering short...'}
                            </p>
                            <div className="w-full max-w-[170px] bg-[#2a3038] h-1.5 rounded-full overflow-hidden mb-2">
                              <div className="h-full bg-gradient-to-r from-[#dd2222] to-[#ff5555] rounded-full animate-pulse w-3/4"></div>
                            </div>
                            <span className="text-[10px] text-[#909cac]">Processing 9:16 vertical short</span>
                          </div>
                        ) : selectedClip.status === 'completed' ? (
                          /* 2. Completed Rendered Video */
                          <div className="relative w-full h-full flex items-center justify-center bg-black">
                            <video
                              ref={videoRef}
                              key={`${selectedClip._id}-${previewActiveTab}`}
                              src={`/api/clip/${selectedClip._id}/stream?format=${previewActiveTab}`}
                              controls
                              playsInline
                              autoPlay={false}
                              className="w-full h-full object-cover"
                              poster={project.thumbnail}
                              onTimeUpdate={handleTimeUpdate}
                              onError={() => {
                                const directPath = previewActiveTab === 'horizontal' 
                                  ? (selectedClip.videoPathHorizontal || selectedClip.videoPath) 
                                  : (selectedClip.videoPathVertical || selectedClip.videoPath);
                                if (videoRef.current && directPath && !videoRef.current.src.endsWith(directPath)) {
                                  videoRef.current.src = directPath;
                                } else {
                                  setVideoError(true);
                                }
                              }}
                            />
                            {videoError && (
                              <div className="absolute inset-0 flex flex-col items-center justify-center p-4 bg-black/85 text-center">
                                <p className="text-xs text-red-400 mb-2 font-medium">Rendered file not found</p>
                                <button onClick={handleResetRender} className="btn-secondary text-[11px] py-1 px-3">
                                  Re-render Clip
                                </button>
                              </div>
                            )}
                          </div>
                        ) : localPreviewUrl ? (
                          /* 3. Local High-Definition Clip Preview */
                          <div className="relative w-full h-full flex items-center justify-center bg-black overflow-hidden">
                            {cropFocus === 'blurred_fit' && previewActiveTab === 'vertical' ? (
                              <>
                                <video
                                  src={localPreviewUrl}
                                  className="absolute inset-0 w-full h-full object-cover filter blur-lg scale-110 opacity-70 pointer-events-none"
                                  tabIndex="-1"
                                  aria-hidden="true"
                                  muted
                                />
                                <div className="absolute inset-0 bg-black/20 pointer-events-none" />
                                <video
                                  ref={videoRef}
                                  key={`preview-${selectedClip._id}`}
                                  src={localPreviewUrl}
                                  controls
                                  playsInline
                                  autoPlay={false}
                                  className="relative z-10 w-full object-contain shadow-2xl"
                                  poster={project.thumbnail}
                                  onTimeUpdate={handleTimeUpdate}
                                  onError={() => setLocalPreviewUrl('')}
                                />
                              </>
                            ) : (
                              <video
                                ref={videoRef}
                                key={`preview-${selectedClip._id}`}
                                src={localPreviewUrl}
                                controls
                                playsInline
                                autoPlay={false}
                                className="w-full h-full object-cover"
                                poster={project.thumbnail}
                                onTimeUpdate={handleTimeUpdate}
                                onError={() => setLocalPreviewUrl('')}
                              />
                            )}
                          </div>
                        ) : (
                          /* 4. Pre-Render Studio with Poster & 1-Click Fast HD Preview */
                          <div className="relative w-full h-full flex items-center justify-center bg-black overflow-hidden group">
                            {/* Backdrop Thumbnail */}
                            {project.thumbnail && (
                              <img
                                src={project.thumbnail}
                                alt={selectedClip.title || 'Clip thumbnail'}
                                className={`absolute inset-0 w-full h-full object-cover opacity-60 ${
                                  cropFocus === 'blurred_fit' && previewActiveTab === 'vertical' ? 'filter blur-md scale-110' : 'filter blur-[2px]'
                                }`}
                              />
                            )}
                            {cropFocus === 'blurred_fit' && previewActiveTab === 'vertical' && project.thumbnail && (
                              <div className="relative z-0 w-full aspect-video flex items-center justify-center shadow-2xl border-y border-white/10 overflow-hidden">
                                <img
                                  src={project.thumbnail}
                                  alt="16:9 Fit Preview"
                                  className="w-full h-full object-cover"
                                />
                              </div>
                            )}
                            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-black/60 pointer-events-none"></div>

                            {/* Center Action Overlay */}
                            <div className="relative z-10 flex flex-col items-center justify-center p-3 text-center">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-[#909cac] mb-1">
                                {formatDuration(selectedClip.start)} - {formatDuration(selectedClip.end)}
                              </span>
                              
                              <button
                                type="button"
                                onClick={() => fetchQuickPreview(selectedClip._id)}
                                disabled={isLoadingPreview}
                                className="mb-2 py-2 px-3.5 bg-[#dd2222] hover:bg-[#b91c1c] text-white rounded-[10px] text-xs font-bold uppercase tracking-wider shadow-lg flex items-center gap-1.5 transition-all transform hover:scale-105 cursor-pointer disabled:opacity-50"
                              >
                                {isLoadingPreview ? (
                                  <>
                                    <svg className="w-3.5 h-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
                                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    <span>Extracting Clip...</span>
                                  </>
                                ) : (
                                  <>
                                    <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                                      <path d="M8 5v14l11-7z" />
                                    </svg>
                                    <span>Play HD Preview</span>
                                  </>
                                )}
                              </button>

                              <a
                                href={`https://www.youtube.com/watch?v=${project._id}&t=${Math.floor(selectedClip.start)}s`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-[10px] text-[#909cac] hover:text-white flex items-center gap-1 underline underline-offset-2 transition-colors cursor-pointer"
                              >
                                <span>Watch on YouTube ↗</span>
                              </a>
                            </div>
                          </div>
                        )}

                        {/* Live Custom Text Overlay */}
                        {selectedClip.status !== 'completed' && hasOverlayText && overlayText.trim() && !isRendering && selectedClip.status !== 'rendering' && (
                          <div 
                            className="absolute inset-x-0 pointer-events-none z-20 flex justify-center px-3"
                            style={{
                              top: `${overlayTextYPercent}%`,
                              transform: 'translateY(-50%)',
                            }}
                          >
                            <span 
                              className={`px-3 py-1 text-center font-bold tracking-wide rounded-[8px] transition-all ${
                                overlayTextBg ? 'bg-black/75 shadow-lg' : ''
                              }`}
                              style={{
                                color: overlayTextColor,
                                opacity: overlayTextOpacity,
                                fontSize: overlayTextSize === 'small' ? '12px' : overlayTextSize === 'large' ? '18px' : overlayTextSize === 'huge' ? '22px' : '15px',
                                textShadow: overlayTextBg ? 'none' : '0 2px 4px rgba(0,0,0,0.9)'
                              }}
                            >
                              {overlayText}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Render / Download Action Controls */}
                      <div className="w-full mt-4 flex flex-col gap-2">
                        {selectedClip.status === 'completed' ? (
                          <>
                            {/* Server Storage 10-minute auto-deletion banner */}
                            <div className="flex items-center justify-between text-[11px] px-3 py-1.5 rounded-[8px] bg-amber-500/10 border border-amber-500/20 text-amber-300">
                              <span className="flex items-center gap-1.5 font-medium">
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse"></span>
                                <span>Server Storage Policy: Auto-deletes in 10 min</span>
                              </span>
                              <span className="text-[10px] text-amber-200/80 font-mono">
                                Prevents server full
                              </span>
                            </div>

                            {((selectedClip.renderFormat || 'vertical') === 'vertical' || selectedClip.renderFormat === 'both') && (
                              <a
                                href={`/api/clip/${selectedClip._id}/download?format=vertical`}
                                className="w-full py-2.5 btn-primary text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer"
                              >
                                <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
                                  <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                                </svg>
                                <span>Download Vertical (9:16)</span>
                              </a>
                            )}
                            {(selectedClip.renderFormat === 'horizontal' || selectedClip.renderFormat === 'both') && (
                              <a
                                href={`/api/clip/${selectedClip._id}/download?format=horizontal`}
                                className="w-full py-2.5 btn-secondary text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer"
                              >
                                <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
                                  <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                                </svg>
                                <span>Download Horizontal (16:9)</span>
                              </a>
                            )}
                            <button
                              onClick={handleResetRender}
                              disabled={isResetting}
                              className="w-full py-2 rounded-[10px] text-[#ef4444] hover:bg-[#ef4444]/15 border border-transparent text-xs font-semibold transition-colors flex items-center justify-center gap-1 cursor-pointer disabled:opacity-50"
                            >
                              {isResetting ? (
                                <span>Resetting...</span>
                              ) : (
                                <span>Reset & Re-edit</span>
                              )}
                            </button>
                          </>
                        ) : (
                          <>
                            {/* Storage Policy Notice when purged */}
                            {selectedClip.purgedReason === 'uploaded_to_youtube' && (
                              <div className="p-3 rounded-[10px] bg-emerald-950/40 border border-emerald-500/30 text-xs text-emerald-200 space-y-1">
                                <div className="flex items-center gap-1.5 font-bold text-white">
                                  <span>💾 Server Storage Saved</span>
                                </div>
                                <p className="text-[11px] text-emerald-300/80 leading-relaxed">
                                  Rendered MP4 file was automatically deleted from the server after YouTube upload. Click <strong>Rerender Video Short</strong> below if you want to preview or re-download locally.
                                </p>
                              </div>
                            )}

                            {selectedClip.purgedReason === 'expired_10min' && (
                              <div className="p-3 rounded-[10px] bg-amber-950/40 border border-amber-500/30 text-xs text-amber-200 space-y-1">
                                <div className="flex items-center gap-1.5 font-bold text-white">
                                  <span>⏱️ Video Expired (10-Minute Policy)</span>
                                </div>
                                <p className="text-[11px] text-amber-300/80 leading-relaxed">
                                  Rendered MP4 was automatically deleted after 10 minutes to prevent server storage overflow. Click <strong>Rerender Video Short</strong> below to regenerate anytime.
                                </p>
                              </div>
                            )}

                            <button
                              onClick={handleStartRender}
                              disabled={isRendering}
                              className="w-full py-3 btn-primary text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                            >
                              {isRendering ? (
                                <span className="flex items-center gap-2">
                                  <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                  </svg>
                                  <span>Rendering Short...</span>
                                </span>
                              ) : (
                                <>
                                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                  </svg>
                                  <span>
                                    {selectedClip.purgedReason && selectedClip.purgedReason !== 'none'
                                      ? 'Rerender Video Short'
                                      : 'Render Video Short'}
                                  </span>
                                </>
                              )}
                            </button>
                          </>
                        )}

                        {/* Upload to YouTube Short Button - Just after Preview Action */}
                        <div className="pt-1.5 flex flex-col gap-2">
                          <button
                            type="button"
                            onClick={() => setIsYouTubeUploadOpen(true)}
                            className="w-full py-3 px-4 rounded-[10px] bg-gradient-to-r from-[#dd2222] to-[#b91c1c] hover:from-[#e52d27] hover:to-[#b31217] text-white font-bold text-xs uppercase tracking-wider shadow-lg shadow-red-900/30 flex items-center justify-center gap-2 transition-all transform hover:-translate-y-0.5 active:translate-y-0 cursor-pointer"
                          >
                            <svg className="w-4 h-4 fill-current shrink-0" viewBox="0 0 24 24">
                              <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                            </svg>
                            <span>Upload to YouTube Short</span>
                          </button>

                          {/* Selected Clip YouTube Status Banner */}
                          {selectedClip.youtubeUploadStatus === 'uploaded' && selectedClip.youtubeVideoUrl && (
                            <div className="p-2.5 rounded-[10px] bg-[#14291e] border border-[#22c55e]/40 flex items-center justify-between text-xs text-[#86efac]">
                              <span className="flex items-center gap-1.5 font-bold">
                                <svg className="w-4 h-4 text-[#22c55e]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                                </svg>
                                <span>Published Short</span>
                              </span>
                              <a
                                href={selectedClip.youtubeVideoUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="font-bold underline text-white hover:text-[#86efac] flex items-center gap-1"
                              >
                                Watch ↗
                              </a>
                            </div>
                          )}

                          {selectedClip.youtubeUploadStatus === 'scheduled' && (
                            <div className="p-2.5 rounded-[10px] bg-[#2e1d0d] border border-[#f59e0b]/40 flex items-center justify-between text-xs text-[#fde68a]">
                              <span className="flex items-center gap-1.5 font-bold">
                                <svg className="w-4 h-4 text-[#f59e0b]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                <span>Scheduled Short</span>
                              </span>
                              <span className="font-mono text-[10px] text-[#fcd34d]">
                                {selectedClip.youtubeScheduledTime
                                  ? new Date(selectedClip.youtubeScheduledTime).toLocaleString(undefined, {
                                      month: 'short',
                                      day: 'numeric',
                                      hour: '2-digit',
                                      minute: '2-digit',
                                    })
                                  : 'Scheduled'}
                              </span>
                            </div>
                          )}
                        </div>

                        {isRendering && (
                          <div className="mt-2 text-left p-2.5 rounded-[10px] bg-[#1d2125] border border-[#39414b]">
                            <p className="text-[10px] text-[#dd2222] font-semibold uppercase tracking-wider mb-0.5">Progress</p>
                            <p className="text-xs text-[#eeeff2] font-normal">{renderProgressText}</p>
                          </div>
                        )}

                        {renderError && (
                          <div className="mt-2 p-2.5 bg-[#ef4444]/15 border border-[#ef4444]/30 text-[#fcf2f2] rounded-[10px] text-xs text-left font-medium">
                            {renderError}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Scheduled & Uploaded Shorts Card */}
                    <div className="app-panel p-3.5 space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-bold text-white flex items-center gap-1.5 uppercase tracking-wider">
                          <svg className="w-4 h-4 text-[#dd2222] fill-current" viewBox="0 0 24 24">
                            <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                          </svg>
                          <span>Shorts ({youtubeUploads.length})</span>
                        </h4>
                        <span className="text-[10px] text-[#909cac]">
                          {youtubeUploads.filter(u => u.isScheduled || u.status === 'scheduled').length} Scheduled · {youtubeUploads.filter(u => !u.isScheduled && u.status === 'uploaded').length} Live
                        </span>
                      </div>

                      {isLoadingUploads ? (
                        <div className="p-3 text-center rounded-[8px] bg-[#1d2125] border border-[#39414b] text-[11px] text-[#909cac] flex items-center justify-center gap-2">
                          <div className="w-3 h-3 rounded-full border border-[#dd2222] border-t-transparent animate-spin"></div>
                          <span>Loading Shorts...</span>
                        </div>
                      ) : youtubeUploads.length === 0 ? (
                        <div className="p-3 text-center rounded-[8px] bg-[#1d2125] border border-[#39414b] text-[11px] text-[#909cac]">
                          No Shorts published yet. Render your clip and click &quot;Upload to YouTube Short&quot; to publish or schedule directly!
                        </div>
                      ) : (
                        <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                          {youtubeUploads.map((up) => {
                            const isSched = up.isScheduled || up.status === 'scheduled';
                            return (
                              <div
                                key={up._id}
                                className="p-2.5 rounded-[8px] bg-[#1d2125] border border-[#39414b] hover:border-[#dd2222]/50 transition-colors flex flex-col gap-1.5 text-xs"
                              >
                                <div className="flex items-start justify-between gap-2">
                                  <span className="font-bold text-white line-clamp-1 text-[11px]">
                                    {up.title}
                                  </span>
                                  <span
                                    className={`shrink-0 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${
                                      isSched
                                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                        : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                    }`}
                                  >
                                    {isSched ? 'Scheduled' : 'Live Short'}
                                  </span>
                                </div>

                                <div className="flex items-center justify-between text-[10px] text-[#909cac]">
                                  <span>
                                    {isSched && up.scheduledPublishTime
                                      ? `📅 ${new Date(up.scheduledPublishTime).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}`
                                      : `Uploaded: ${new Date(up.uploadedAt).toLocaleDateString()}`}
                                  </span>
                                  {up.youtubeVideoUrl && (
                                    <a
                                      href={up.youtubeVideoUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-[#dd2222] hover:underline font-bold flex items-center gap-0.5"
                                    >
                                      Watch ↗
                                    </a>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right: Customization Controls & Video Studio */}
                  <div className="flex-grow flex flex-col gap-4 min-w-0">
                    
                    {/* Panel 1: Framing & Camera Tracking */}
                    <div className="app-panel p-4 sm:p-5 space-y-3.5">
                      <div className="flex items-center justify-between">
                        <h3 className="text-xs font-bold tracking-wider text-[#dd2222] uppercase flex items-center gap-1.5">
                          <span>🎥</span>
                          <span>9:16 Camera Framing & Speaker Tracking</span>
                        </h3>
                        <span className="text-[10px] text-[#909cac]">Follow speaking person</span>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                        {[
                          { 
                            id: 'auto', 
                            label: 'AI Speaker', 
                            badge: 'Smart Center',
                            desc: 'Tracks speaker face',
                            icon: '🎯' 
                          },
                          { 
                            id: 'blurred_fit', 
                            label: 'Blurred Canvas', 
                            badge: 'Viral 9:16',
                            desc: '16:9 on blurred BG',
                            icon: '🖼️' 
                          },
                          { 
                            id: 'center', 
                            label: 'Center Crop', 
                            badge: 'Static',
                            desc: 'Fixed 9:16 center',
                            icon: '⏹️' 
                          },
                          { 
                            id: 'left', 
                            label: 'Left Focus', 
                            badge: 'Static',
                            desc: 'Fixed 9:16 left',
                            icon: '◀️' 
                          },
                          { 
                            id: 'right', 
                            label: 'Right Focus', 
                            badge: 'Static',
                            desc: 'Fixed 9:16 right',
                            icon: '▶️' 
                          }
                        ].map((focus) => (
                          <button
                            key={focus.id}
                            onClick={() => setCropFocus(focus.id)}
                            disabled={isRendering || selectedClip.status === 'completed'}
                            className={`p-2.5 rounded-[10px] border text-left transition-colors cursor-pointer flex flex-col justify-between ${
                              cropFocus === focus.id
                                ? 'bg-[#360c0c] border-[#dd2222] text-[#fcf2f2]'
                                : 'bg-[#1d2125] border-[#39414b] text-[#909cac] hover:border-[#4b5563]'
                            }`}
                          >
                            <div className="flex items-center justify-between w-full mb-1">
                              <span className="text-base">{focus.icon}</span>
                              <span className={`text-[9px] px-1.5 py-0.2 rounded font-mono ${
                                cropFocus === focus.id ? 'bg-[#dd2222] text-white' : 'bg-[#2d3239] text-[#909cac]'
                              }`}>
                                {focus.badge}
                              </span>
                            </div>
                            <div>
                              <span className="block text-xs font-bold text-white">{focus.label}</span>
                              <span className="block text-[10px] text-[#6e7d91] mt-0.5">{focus.desc}</span>
                            </div>
                          </button>
                        ))}
                      </div>

                      {/* Format Switcher */}
                      <div className="pt-2 border-t border-[#39414b] flex items-center justify-between gap-4">
                        <label className="text-xs text-[#b9c0ca] font-medium">Output Format:</label>
                        <div className="flex gap-2">
                          {[
                            { id: 'vertical', label: 'Vertical (9:16)' },
                            { id: 'horizontal', label: 'Horizontal (16:9)' },
                            { id: 'both', label: 'Both' }
                          ].map((fmt) => (
                            <button
                              key={fmt.id}
                              onClick={() => setRenderFormat(fmt.id)}
                              disabled={isRendering || selectedClip.status === 'completed'}
                              className={`px-2.5 py-1 text-xs rounded-[8px] font-semibold border transition-colors cursor-pointer ${
                                renderFormat === fmt.id
                                  ? 'bg-[#dd2222] text-white border-[#dd2222]'
                                  : 'bg-[#1d2125] text-[#909cac] border-[#39414b] hover:text-white'
                              }`}
                            >
                              {fmt.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Panel 2: Video Editor: Custom Text Overlay Studio */}
                    <div className="app-panel p-4 sm:p-5 space-y-3.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            id="enable-overlay"
                            checked={hasOverlayText}
                            onChange={(e) => setHasOverlayText(e.target.checked)}
                            disabled={isRendering || selectedClip.status === 'completed'}
                            className="w-4 h-4 accent-[#dd2222] rounded cursor-pointer"
                          />
                          <label htmlFor="enable-overlay" className="text-xs font-bold text-white uppercase tracking-wider cursor-pointer flex items-center gap-1">
                            <span>✏️</span>
                            <span>Add Custom Text to Video (Overlay Studio)</span>
                          </label>
                        </div>
                        <span className="text-[10px] text-[#22c55e] font-semibold bg-[#22c55e]/15 px-2 py-0.5 rounded border border-[#22c55e]/30">
                          Video Editor
                        </span>
                      </div>

                      {hasOverlayText && (
                        <div className="space-y-3 pt-2 border-t border-[#39414b]">
                          <div>
                            <label className="block text-[11px] text-[#b9c0ca] font-medium mb-1">
                              Custom Overlay Text (e.g. Hook headline, call-to-action, social tag)
                            </label>
                            <input
                              type="text"
                              value={overlayText}
                              onChange={(e) => setOverlayText(e.target.value)}
                              disabled={isRendering || selectedClip.status === 'completed'}
                              placeholder="e.g. WAIT TILL THE END 😱 or PART 1 🔥 or @myhandle"
                              className="w-full px-3 py-2 app-input text-xs font-normal"
                            />
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            {/* Text Opacity Slider */}
                            <div>
                              <div className="flex justify-between items-center mb-1">
                                <label className="text-[11px] text-[#b9c0ca] font-medium">Text Opacity</label>
                                <span className="text-[10px] font-mono text-[#f59e0b] font-bold">
                                  {Math.round(overlayTextOpacity * 100)}%
                                </span>
                              </div>
                              <input
                                type="range"
                                min="0.1"
                                max="1.0"
                                step="0.05"
                                value={overlayTextOpacity}
                                onChange={(e) => setOverlayTextOpacity(parseFloat(e.target.value))}
                                disabled={isRendering || selectedClip.status === 'completed'}
                                className="w-full accent-[#dd2222] cursor-pointer"
                              />
                            </div>

                            {/* Overlay Vertical Y Position */}
                            <div>
                              <div className="flex justify-between items-center mb-1">
                                <label className="text-[11px] text-[#b9c0ca] font-medium">Vertical Y Position</label>
                                <span className="text-[10px] font-mono text-[#f59e0b] font-bold">{overlayTextYPercent}%</span>
                              </div>
                              <input
                                type="range"
                                min="5"
                                max="90"
                                step="1"
                                value={overlayTextYPercent}
                                onChange={(e) => setOverlayTextYPercent(parseInt(e.target.value, 10))}
                                disabled={isRendering || selectedClip.status === 'completed'}
                                className="w-full accent-[#dd2222] cursor-pointer"
                              />
                            </div>

                            {/* Font Size */}
                            <div>
                              <label className="block text-[11px] text-[#b9c0ca] font-medium mb-1">Font Size</label>
                              <div className="flex gap-1">
                                {['small', 'medium', 'large', 'huge'].map((sz) => (
                                  <button
                                    type="button"
                                    key={sz}
                                    onClick={() => setOverlayTextSize(sz)}
                                    disabled={isRendering || selectedClip.status === 'completed'}
                                    className={`flex-1 py-1 text-[10px] uppercase font-bold rounded border transition-colors ${
                                      overlayTextSize === sz
                                        ? 'bg-[#dd2222] text-white border-[#dd2222]'
                                        : 'bg-[#1d2125] text-[#909cac] border-[#39414b]'
                                    }`}
                                  >
                                    {sz[0]}
                                  </button>
                                ))}
                              </div>
                            </div>
                          </div>

                          {/* Color Palette & Background Box */}
                          <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                            <div className="flex items-center gap-2">
                              <span className="text-[11px] text-[#b9c0ca]">Color:</span>
                              <div className="flex gap-1.5">
                                {[
                                  { color: '#FFFFFF', name: 'White' },
                                  { color: '#FDE047', name: 'Yellow' },
                                  { color: '#00F3FF', name: 'Cyan' },
                                  { color: '#EF4444', name: 'Red' },
                                  { color: '#22C55E', name: 'Green' },
                                  { color: '#C084FC', name: 'Purple' },
                                ].map((c) => (
                                  <button
                                    key={c.color}
                                    type="button"
                                    onClick={() => setOverlayTextColor(c.color)}
                                    title={c.name}
                                    className={`w-6 h-6 rounded-full border-2 transition-transform cursor-pointer ${
                                      overlayTextColor === c.color ? 'scale-110 border-white ring-2 ring-[#dd2222]' : 'border-transparent opacity-80 hover:opacity-100'
                                    }`}
                                    style={{ backgroundColor: c.color }}
                                  />
                                ))}
                              </div>
                            </div>

                            <label className="flex items-center gap-2 text-xs text-[#b9c0ca] cursor-pointer">
                              <input
                                type="checkbox"
                                checked={overlayTextBg}
                                onChange={(e) => setOverlayTextBg(e.target.checked)}
                                disabled={isRendering || selectedClip.status === 'completed'}
                                className="accent-[#dd2222] rounded"
                              />
                              <span>Dark Backdrop Pill</span>
                            </label>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Panel 3: Scene Virality & Performance Intelligence */}
                    <div className="app-panel p-4 sm:p-5 space-y-3.5">
                      <div className="flex items-center justify-between">
                        <h3 className="text-xs font-bold tracking-wider text-[#dd2222] uppercase flex items-center gap-1.5">
                          <span>⚡</span>
                          <span>Scene Virality & Performance Intelligence</span>
                        </h3>
                        <span className="text-[10px] text-[#22c55e] font-semibold bg-[#22c55e]/15 px-2 py-0.5 rounded border border-[#22c55e]/30">
                          AI Engine Active
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div className="p-3 rounded-[8px] bg-[#1d2125] border border-[#39414b]">
                          <span className="text-[10px] text-[#909cac] uppercase tracking-wider block mb-1">Virality Score</span>
                          <div className="flex items-baseline gap-1.5">
                            <span className="text-xl font-black text-white">{selectedClip.viralityScore || 88}</span>
                            <span className="text-xs text-[#22c55e] font-semibold">/ 100</span>
                          </div>
                          <span className="text-[10px] text-[#909cac] mt-1 block">High audience retention rate</span>
                        </div>

                        <div className="p-3 rounded-[8px] bg-[#1d2125] border border-[#39414b]">
                          <span className="text-[10px] text-[#909cac] uppercase tracking-wider block mb-1">Duration & Bounds</span>
                          <div className="text-sm font-bold text-white">
                            {formatDuration(selectedClip.start)} - {formatDuration(selectedClip.end)}
                          </div>
                          <span className="text-[10px] text-[#909cac] mt-1 block">
                            {Math.round(selectedClip.end - selectedClip.start)}s optimal short duration
                          </span>
                        </div>

                        <div className="p-3 rounded-[8px] bg-[#1d2125] border border-[#39414b]">
                          <span className="text-[10px] text-[#909cac] uppercase tracking-wider block mb-1">Render Engine</span>
                          <div className="text-sm font-bold text-[#22c55e] flex items-center gap-1">
                            <span>🚀</span>
                            <span>Ultra-Fast Pipeline</span>
                          </div>
                          <span className="text-[10px] text-[#909cac] mt-1 block">
                            Sub-5s fast render · 1080x1920 60fps
                          </span>
                        </div>
                      </div>

                      {selectedClip.explanation && (
                        <div className="p-3 rounded-[8px] bg-[#1d2125] border border-[#39414b]">
                          <span className="text-[10px] text-[#dd2222] font-semibold uppercase tracking-wider block mb-1">
                            Scene Hook & Summary
                          </span>
                          <p className="text-xs text-[#c3c8cf] leading-relaxed">
                            {selectedClip.explanation}
                          </p>
                        </div>
                      )}
                    </div>

                  </div>
                </>
              );
            })()}
          </section>

        </div>
      </div>

      {/* YouTube Shorts Direct Upload & Scheduling Modal */}
      <YouTubeUploadModal
        isOpen={isYouTubeUploadOpen}
        onClose={() => setIsYouTubeUploadOpen(false)}
        clip={selectedClip}
        project={project}
        isRenderingParent={isRendering}
        onRequestRender={handleStartRender}
        onUploadSuccess={() => {
          fetchProjectData();
          fetchYouTubeUploads();
        }}
      />
    </DashboardLayout>
  );
}
