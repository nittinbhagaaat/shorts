'use client';

import { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/settings-client';
import SetupRequiredModal from '@/components/SetupRequiredModal';

export default function ProjectWorkspace({ params }) {
  const router = useRouter();
  const resolvedParams = use(params);
  const projectId = resolvedParams.id;

  const [project, setProject] = useState(null);
  const [clips, setClips] = useState([]);
  const [selectedClip, setSelectedClip] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // Render properties state
  const [captionStyle, setCaptionStyle] = useState('hormozi');
  const [cropFocus, setCropFocus] = useState('center');
  const [captionLanguage, setCaptionLanguage] = useState('original');
  const [renderFormat, setRenderFormat] = useState('vertical');
  const [isRendering, setIsRendering] = useState(false);
  const [renderError, setRenderError] = useState('');
  const [renderProgressText, setRenderProgressText] = useState('');

  // Editable transcript state
  const [editableTranscript, setEditableTranscript] = useState([]);

  // Live player tracking state
  const [playerTime, setPlayerTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [previewActiveTab, setPreviewActiveTab] = useState('vertical');

  // Fetch project and clips
  const fetchProjectData = async () => {
    try {
      const res = await apiFetch(`/api/project/${projectId}`);
      if (!res.ok) throw new Error('Failed to load project details');
      const data = await res.json();
      setProject(data.project);
      setClips(data.clips || []);
      
      // Keep selected clip updated if it was selected
      if (selectedClip) {
        const updatedSelected = data.clips.find(c => c._id === selectedClip._id);
        if (updatedSelected) {
          setSelectedClip(updatedSelected);
        }
      }
    } catch (err) {
      console.error('Error loading project details:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProjectData();
  }, [projectId]);

  // Load selected clip settings into form state
  useEffect(() => {
    if (selectedClip) {
      setCaptionStyle(selectedClip.captionStyle || 'hormozi');
      setCropFocus(selectedClip.cropFocus || 'center');
      const prefLang = selectedClip.captionLanguage || 'original';
      setCaptionLanguage(prefLang);
      setRenderFormat(selectedClip.renderFormat || 'vertical');

      const activeTranscript = prefLang === 'hinglish' && selectedClip.hinglishTranscript && selectedClip.hinglishTranscript.length > 0
        ? selectedClip.hinglishTranscript
        : selectedClip.transcript || [];

      setEditableTranscript(activeTranscript);
      setRenderError('');
    }
  }, [selectedClip?._id]);

  // Sync preview active tab when selected clip or layout switches
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

  // Long polling if rendering is happening in the background
  useEffect(() => {
    let interval;
    const hasRenderingClips = clips.some(c => c.status === 'rendering');
    
    if (hasRenderingClips) {
      interval = setInterval(() => {
        fetchProjectData();
      }, 3000);
    }
    
    return () => clearInterval(interval);
  }, [clips]);

  const handleTranscriptChange = (index, value) => {
    const updated = [...editableTranscript];
    updated[index].text = value;
    setEditableTranscript(updated);
  };

  const handleToggleLanguage = (lang) => {
    setCaptionLanguage(lang);
    const activeTranscript = lang === 'hinglish' && selectedClip.hinglishTranscript && selectedClip.hinglishTranscript.length > 0
      ? selectedClip.hinglishTranscript
      : selectedClip.transcript || [];
    setEditableTranscript(activeTranscript);
  };

  const handleDeleteWorkspace = async () => {
    if (!confirm("Are you sure you want to delete this workspace? This will permanently delete the project, all clips, and all rendered video files.")) {
      return;
    }

    setIsDeleting(true);
    try {
      const res = await apiFetch(`/api/project/${projectId}`, {
        method: 'DELETE'
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to delete workspace');
      }

      // Redirect back to dashboard workspaces
      router.push('/workspaces');
    } catch (err) {
      console.error(err);
      alert(err.message || 'An error occurred while deleting the workspace');
      setIsDeleting(false);
    }
  };

  const handleStartRender = async () => {
    if (!selectedClip) return;
    
    setIsRendering(true);
    setRenderError('');
    setRenderProgressText('Initializing rendering workspace with local tool paths...');

    // Progress updates simulator
    const steps = [
      { delay: 1000, text: 'Opening YouTube video stream using range requests...' },
      { delay: 3500, text: 'Downloading clip segment (20-30s) with yt-dlp...' },
      { delay: 6500, text: 'Generating ASS subtitles with custom styling tokens...' },
      { delay: 9000, text: 'Executing FFmpeg filters (Aspect Crop & Subtitles)...' },
      { delay: 13000, text: 'Merging audio and exporting final video container...' },
    ];

    const timeouts = steps.map(step => 
      setTimeout(() => setRenderProgressText(step.text), step.delay)
    );

    try {
      // Mark as rendering locally in client UI immediately
      setSelectedClip(prev => ({ ...prev, status: 'rendering' }));
      setClips(prev => prev.map(c => c._id === selectedClip._id ? { ...c, status: 'rendering' } : c));

      const res = await apiFetch(`/api/clip/${selectedClip._id}/render`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          captionStyle,
          cropFocus,
          transcript: editableTranscript,
          captionLanguage,
          renderFormat
        })
      });

      timeouts.forEach(t => clearTimeout(t));

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to render video clip');
      }

      const data = await res.json();
      setRenderProgressText('Render complete!');
      
      setSelectedClip(data.clip);
      await fetchProjectData();
    } catch (err) {
      timeouts.forEach(t => clearTimeout(t));
      setRenderError(err.message || 'An error occurred during rendering');
      await fetchProjectData();
    } finally {
      setIsRendering(false);
    }
  };

  const handleResetRender = async () => {
    if (!selectedClip) return;
    if (!confirm("Are you sure you want to delete the rendered video files for this clip? This will delete the MP4s and reset the clip status so you can edit the transcription and styles again.")) {
      return;
    }

    setIsResetting(true);
    setRenderError('');
    
    try {
      const res = await apiFetch(`/api/clip/${selectedClip._id}/render`, {
        method: 'DELETE'
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to reset clip');
      }

      const data = await res.json();
      setSelectedClip(data.clip);
      await fetchProjectData();
    } catch (err) {
      console.error(err);
      setRenderError(err.message || 'An error occurred while resetting the clip');
    } finally {
      setIsResetting(false);
    }
  };

  // Inject YouTube Iframe API script on mount
  useEffect(() => {
    if (!window.YT) {
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      const firstScriptTag = document.getElementsByTagName('script')[0];
      firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
    }
  }, []);

  // Poll for player playback time and state
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
              }
            }
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

  // Subtitle custom overlay style helpers
  const getSubtitlePositionStyle = (style) => {
    if (style === 'hormozi') {
      return { top: '45%', bottom: 'auto' };
    }
    return { bottom: '15%', top: 'auto' };
  };

  const renderLiveCaptionText = (segment, currentTime, style) => {
    if (!segment) return null;
    
    if (style === 'hormozi') {
      const words = segment.text.split(/\s+/).filter(Boolean);
      if (words.length === 0) return null;

      const durationPerWord = segment.duration / words.length;
      const elapsed = currentTime - segment.start;
      const activeIdx = Math.min(words.length - 1, Math.floor(elapsed / durationPerWord));

      return (
        <span 
          className="px-4 block text-center font-black tracking-wide leading-tight uppercase" 
          style={{
            fontFamily: 'Impact, Arial Black, sans-serif',
            fontSize: '24px',
            textShadow: '3px 3px 0 #000, -3px -3px 0 #000, 3px -3px 0 #000, -3px 3px 0 #000, 0 3px 0 #000, 3px 0 0 #000, 0 -3px 0 #000, -3px 0 0 #000, 3px 3px 5px rgba(0,0,0,0.9)'
          }}
        >
          {words.map((word, idx) => {
            const isActive = idx === activeIdx;
            return (
              <span 
                key={idx} 
                className={`${isActive ? 'text-yellow-400 font-extrabold scale-105' : 'text-white'} mx-1 transition-all duration-75 inline-block`}
              >
                {word}
              </span>
            );
          })}
        </span>
      );
    }

    if (style === 'minimalist') {
      return (
        <span 
          className="px-4 text-center block text-white font-semibold"
          style={{
            fontFamily: 'Arial, sans-serif',
            fontSize: '16px',
            textShadow: '1px 1px 3px rgba(0,0,0,0.8)'
          }}
        >
          {segment.text}
        </span>
      );
    }

    // classic
    return (
      <span 
        className="px-3 py-1 bg-black/85 text-white rounded-lg text-center block max-w-[90%] mx-auto font-semibold"
        style={{
          fontFamily: 'Arial, sans-serif',
          fontSize: '16px',
          lineHeight: '1.4'
        }}
      >
        {segment.text}
      </span>
    );
  };

  const formatDuration = (secs) => {
    if (!secs) return '0:00';
    const mins = Math.floor(secs / 60);
    const rSecs = Math.floor(secs % 60);
    return `${mins}:${rSecs.toString().padStart(2, '0')}`;
  };

  const hasHinglishOption = selectedClip && selectedClip.hinglishTranscript && 
    selectedClip.hinglishTranscript.length > 0 &&
    selectedClip.hinglishTranscript.some((s, idx) => selectedClip.transcript[idx] && s.text !== selectedClip.transcript[idx].text);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#15181b] text-white flex items-center justify-center font-sans">
        <div className="text-center space-y-4">
          <svg className="animate-spin h-10 w-10 text-[#dd2222] mx-auto" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <p className="text-[#909cac] font-light text-sm">Loading workspace environment...</p>
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="min-h-screen bg-[#15181b] text-white flex flex-col items-center justify-center p-4 font-sans">
        <div className="glass-panel rounded-3xl p-8 max-w-md text-center space-y-4 border border-white/8">
          <h2 className="text-2xl font-bold text-[#e95353]">Workspace Not Found</h2>
          <p className="text-[#909cac] text-sm font-light">The workspace you are trying to access does not exist or was deleted.</p>
          <Link href="/workspaces" className="inline-flex px-5 py-2.5 gradient-button rounded-xl font-medium text-xs">
            Back to Workspaces
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#15181b] flex flex-col text-white font-sans">
      {/* Mandatory First-Time Setup Modal */}
      <SetupRequiredModal />

      {/* Header Bar */}
      <header className="border-b border-white/8 bg-[#1d2125]/90 backdrop-blur-xl px-6 py-4 relative z-20 flex items-center justify-between">
        <div className="flex items-center gap-4 min-w-0">
          <Link href="/workspaces" className="p-2 rounded-xl hover:bg-white/5 border border-white/5 hover:border-white/10 transition-all shrink-0 text-[#909cac] hover:text-white" title="Back to Workspaces">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </Link>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#dd2222]/20 text-[#ef9595] font-mono font-semibold border border-[#dd2222]/30">
                Workspace
              </span>
              <h1 className="text-base font-bold truncate pr-4 text-white">{project.title}</h1>
            </div>
            <p className="text-xs text-[#909cac] font-light flex items-center gap-1 mt-0.5">
              <span>{project.channel}</span>
              <span className="w-1 h-1 rounded-full bg-[#4b5563]"></span>
              <span>{formatDuration(project.duration)}</span>
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-3 shrink-0">
          <Link
            href="/settings"
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 text-[#909cac] hover:text-white text-xs transition-all flex items-center gap-1.5"
            title="Settings"
          >
            <span>⚙️ Settings</span>
          </Link>

          <button
            onClick={handleDeleteWorkspace}
            disabled={isDeleting}
            className="px-3 py-1.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 hover:border-red-500/40 text-red-400 text-xs font-medium transition-all cursor-pointer disabled:opacity-50 flex items-center gap-1"
          >
            {isDeleting ? (
              <>
                <svg className="animate-spin h-3.5 w-3.5 text-red-400" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                <span>Deleting...</span>
              </>
            ) : (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                <span>Delete Workspace</span>
              </>
            )}
          </button>
        </div>
      </header>

      {/* Workspace Grid */}
      <div className="flex-grow flex flex-col md:flex-row min-h-0 overflow-hidden relative z-10">
        
        {/* Left Side: AI Clips List */}
        <aside className="w-full md:w-96 border-b md:border-b-0 md:border-r border-white/8 flex flex-col overflow-y-auto max-h-[400px] md:max-h-none shrink-0 bg-[#1d2125]/60">
          <div className="p-4 border-b border-white/8 sticky top-0 bg-[#1d2125]/95 backdrop-blur-md z-10 flex items-center justify-between">
            <h2 className="font-semibold text-xs tracking-wider text-[#ef9595] uppercase">AI-Curated Moments ({clips.length})</h2>
          </div>
          
          <div className="p-3 space-y-3">
            {clips.map((clip) => {
              const isSelected = selectedClip?._id === clip._id;
              return (
                <div
                  key={clip._id}
                  onClick={() => setSelectedClip(clip)}
                  className={`p-4 rounded-2xl cursor-pointer border transition-all ${
                    isSelected
                      ? 'bg-[#dd2222]/15 border-[#dd2222]/50 shadow-lg shadow-red-600/10'
                      : 'bg-white/2 border-white/5 hover:bg-white/5 hover:border-white/10'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <h3 className={`font-semibold text-sm line-clamp-1 leading-snug ${isSelected ? 'text-[#ef9595]' : 'text-white'}`}>
                      {clip.title}
                    </h3>
                    <span className="shrink-0 px-2 py-0.5 rounded bg-black/60 text-white font-mono text-[10px] font-semibold">
                      {formatDuration(clip.duration)}s
                    </span>
                  </div>
                  
                  <p className="text-[#909cac] text-xs line-clamp-2 leading-relaxed font-light mb-3">
                    {clip.description}
                  </p>

                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-[#6e7d91] font-mono">
                      {formatDuration(clip.start)} - {formatDuration(clip.end)}
                    </span>
                    
                    {/* Status Badge */}
                    <div className="flex items-center gap-1.5 text-xs font-semibold">
                      {clip.status === 'pending' && (
                        <span className="text-[#909cac] flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#6e7d91]"></span>
                          Ready to Render
                        </span>
                      )}
                      {clip.status === 'rendering' && (
                        <span className="text-[#f59e0b] flex items-center gap-1 animate-pulse">
                          <svg className="animate-spin h-3.5 w-3.5 text-[#f59e0b]" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                          </svg>
                          Rendering
                        </span>
                      )}
                      {clip.status === 'completed' && (
                        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                          <span className="text-emerald-400 flex items-center gap-1 mr-1">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                            Rendered
                          </span>
                          {((clip.renderFormat || 'vertical') === 'vertical' || clip.renderFormat === 'both') && (
                            <a
                              href={`/api/clip/${clip._id}/download?format=vertical`}
                              className="text-[10px] bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded font-bold"
                              title="Download Vertical (9:16)"
                            >
                              ↓ 9:16
                            </a>
                          )}
                          {(clip.renderFormat === 'horizontal' || clip.renderFormat === 'both') && (
                            <a
                              href={`/api/clip/${clip._id}/download?format=horizontal`}
                              className="text-[10px] bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700 px-2 py-0.5 rounded font-bold"
                              title="Download Horizontal (16:9)"
                            >
                              ↓ 16:9
                            </a>
                          )}
                        </div>
                      )}
                      {clip.status === 'failed' && (
                        <span className="text-red-400 flex items-center gap-1">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                          </svg>
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

        {/* Right Side: Workspace Player & Settings */}
        <section className="flex-grow flex flex-col lg:flex-row overflow-y-auto p-6 gap-6 bg-black/10">
          {(() => {
            const activeSubtitle = editableTranscript.find(
              (seg) => playerTime >= seg.start && playerTime <= seg.start + seg.duration
            );

            return !selectedClip ? (
              <div className="flex-grow flex flex-col items-center justify-center text-center p-12 glass-panel rounded-3xl h-full border border-dashed border-white/10">
                <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center mb-4 text-[#ef9595]">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold mb-1 text-white">Editor Workspace</h3>
                <p className="text-[#909cac] text-sm max-w-sm font-light">Select any AI-generated clip from the sidebar on the left to start framing, editing captions, and rendering.</p>
              </div>
            ) : (
            <>
              {/* Left Column: Player Column */}
              <div className="w-full lg:w-[420px] flex flex-col shrink-0 gap-4">
                <div className="glass-panel rounded-3xl p-5 flex flex-col items-center border border-white/8">
                  <h3 className="text-xs font-semibold text-[#ef9595] uppercase self-start mb-3">Live Video Preview</h3>
                  
                  {/* Preview Tab Selector */}
                  {(() => {
                    const hasBothRendered = selectedClip && selectedClip.status === 'completed' && selectedClip.videoPathVertical && selectedClip.videoPathHorizontal;
                    const showToggle = renderFormat === 'both' || hasBothRendered;
                    
                    return showToggle && (
                      <div className="flex bg-black/40 p-1 rounded-xl border border-white/8 mb-3 w-full max-w-[280px]">
                        <button
                          onClick={() => setPreviewActiveTab('vertical')}
                          className={`flex-1 py-1.5 text-[10px] font-semibold uppercase tracking-wider rounded-lg transition-all cursor-pointer ${
                            previewActiveTab === 'vertical'
                              ? 'gradient-button text-white shadow'
                              : 'text-[#909cac] hover:text-white'
                          }`}
                        >
                          Vertical (9:16)
                        </button>
                        <button
                          onClick={() => setPreviewActiveTab('horizontal')}
                          className={`flex-1 py-1.5 text-[10px] font-semibold uppercase tracking-wider rounded-lg transition-all cursor-pointer ${
                            previewActiveTab === 'horizontal'
                              ? 'gradient-button text-white shadow'
                              : 'text-[#909cac] hover:text-white'
                          }`}
                        >
                          Horizontal (16:9)
                        </button>
                      </div>
                    );
                  })()}

                  {/* Video Box Container */}
                  <div 
                    className={`relative bg-black rounded-2xl overflow-hidden border border-white/10 shadow-2xl flex items-center justify-center transition-all duration-300 ${
                      previewActiveTab === 'horizontal' 
                        ? 'aspect-[16/9] w-full max-w-[340px]' 
                        : 'aspect-[9/16] w-full max-w-[280px]'
                    }`}
                  >
                    {selectedClip.status === 'completed' ? (
                      <video
                        key={`${selectedClip._id}-${previewActiveTab}`}
                        src={previewActiveTab === 'horizontal' 
                          ? (selectedClip.videoPathHorizontal || selectedClip.videoPath) 
                          : (selectedClip.videoPathVertical || selectedClip.videoPath)
                        }
                        controls
                        className="w-full h-full object-cover"
                        poster={project.thumbnail}
                      />
                    ) : (
                      <iframe
                        id="youtube-player-iframe"
                        src={`https://www.youtube.com/embed/${project._id}?start=${Math.floor(selectedClip.start)}&end=${Math.ceil(selectedClip.end)}&autoplay=0&controls=1&modestbranding=1&enablejsapi=1`}
                        className={previewActiveTab === 'horizontal'
                          ? "absolute w-full h-full pointer-events-auto"
                          : "absolute w-[177%] h-[100%] max-w-none pointer-events-auto"
                        }
                        title="YouTube original clip section"
                        allowFullScreen
                      />
                    )}

                    {/* Live HTML dynamic subtitles overlay */}
                    {selectedClip.status !== 'completed' && activeSubtitle && (
                      <div 
                        className="absolute inset-x-0 pointer-events-none z-10 flex items-center justify-center px-4"
                        style={getSubtitlePositionStyle(captionStyle)}
                      >
                        {renderLiveCaptionText(activeSubtitle, playerTime, captionStyle)}
                      </div>
                    )}
                  </div>

                  <div className="w-full mt-4 flex flex-col gap-2">
                    {selectedClip.status === 'completed' ? (
                      <>
                         {((selectedClip.renderFormat || 'vertical') === 'vertical' || selectedClip.renderFormat === 'both') && (
                          <a
                            href={`/api/clip/${selectedClip._id}/download?format=vertical`}
                            className="w-full py-3.5 gradient-button rounded-xl text-white font-semibold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                            </svg>
                            Download Vertical Video (9:16)
                          </a>
                        )}
                        {(selectedClip.renderFormat === 'horizontal' || selectedClip.renderFormat === 'both') && (
                          <a
                            href={`/api/clip/${selectedClip._id}/download?format=horizontal`}
                            className="w-full py-3.5 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 hover:border-zinc-600 rounded-xl text-white font-semibold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                            </svg>
                            Download Horizontal Video (16:9)
                          </a>
                        )}
                        <button
                          onClick={handleResetRender}
                          disabled={isResetting}
                          className="w-full py-2.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 hover:border-red-500/40 rounded-xl text-red-400 text-xs font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer mt-2 disabled:opacity-50"
                        >
                          {isResetting ? (
                            <>
                              <svg className="animate-spin h-4 w-4 text-red-400" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                              </svg>
                              <span>Deleting rendered files...</span>
                            </>
                          ) : (
                            <>
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                              <span>Delete Rendered Video (Reset Clip)</span>
                            </>
                          )}
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={handleStartRender}
                        disabled={isRendering}
                        className="w-full py-4 gradient-button rounded-xl text-white font-semibold text-xs uppercase tracking-wider hover:shadow-red-600/30 active:scale-95 disabled:opacity-50 disabled:pointer-events-none transition-all flex items-center justify-center gap-2 cursor-pointer"
                      >
                        {isRendering ? (
                          <span className="flex items-center gap-2">
                            <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                            </svg>
                            <span>Rendering Video...</span>
                          </span>
                        ) : (
                          <>
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm0 2h12v10H4V5z" clipRule="evenodd" />
                            </svg>
                            <span>Render Video Clip</span>
                          </>
                        )}
                      </button>
                    )}

                    {isRendering && (
                      <div className="mt-3 text-left p-3.5 rounded-2xl bg-white/5 border border-white/5 animate-pulse">
                        <p className="text-[10px] text-[#ef9595] font-semibold uppercase tracking-wider mb-1">Rendering Logs</p>
                        <p className="text-xs text-gray-300 font-light">{renderProgressText}</p>
                      </div>
                    )}

                    {renderError && (
                      <div className="mt-3 p-3.5 bg-red-500/10 border border-red-500/20 text-red-300 rounded-2xl text-xs text-left font-medium">
                        {renderError}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Right Column: Controls & Caption Editor */}
              <div className="flex-grow flex flex-col gap-6">
                
                {/* Style & Alignment Panel */}
                <div className="glass-panel rounded-3xl p-6 space-y-6 border border-white/8">
                  <h3 className="text-xs font-semibold tracking-wider text-[#ef9595] uppercase">Short Framing &amp; Typography</h3>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    {/* Caption Style Picker */}
                    <div>
                      <label className="block text-xs text-[#909cac] font-medium uppercase tracking-wider mb-2">Caption Typography Style</label>
                      <div className="grid grid-cols-3 gap-2">
                        {[
                          { 
                            id: 'hormozi', 
                            label: 'Hormozi', 
                            preview: (
                              <div className="flex flex-col items-center justify-center h-10 w-full rounded bg-black/40 border border-white/5 font-extrabold text-[9px] tracking-wide text-white uppercase mt-1">
                                <span>TALK <span className="text-yellow-400">IS CHEAP</span></span>
                              </div>
                            )
                          },
                          { 
                            id: 'minimalist', 
                            label: 'Minimalist', 
                            preview: (
                              <div className="flex flex-col justify-end items-center h-10 w-full rounded bg-black/40 border border-white/5 text-[8px] text-white/95 mt-1 pb-1">
                                <span>Talk is cheap</span>
                              </div>
                            )
                          },
                          { 
                            id: 'classic', 
                            label: 'Classic', 
                            preview: (
                              <div className="flex flex-col justify-end items-center h-10 w-full rounded bg-black/40 border border-white/5 text-[8px] mt-1 pb-1">
                                <span className="bg-black/85 px-1 py-0.5 rounded text-white">Talk is cheap</span>
                              </div>
                            )
                          }
                        ].map((style) => (
                          <button
                            key={style.id}
                            onClick={() => setCaptionStyle(style.id)}
                            disabled={isRendering}
                            className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between h-24 ${
                              captionStyle === style.id
                                ? 'bg-[#dd2222]/15 border-[#dd2222]/50 text-[#ef9595] font-semibold'
                                : 'bg-white/2 border-white/5 hover:bg-white/5 text-[#909cac]'
                            }`}
                          >
                            <span className="block text-xs font-semibold">{style.label}</span>
                            {style.preview}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Crop focus Picker */}
                    <div>
                      <label className="block text-xs text-[#909cac] font-medium uppercase tracking-wider mb-2">Aspect Crop Focus (9:16)</label>
                      <div className="grid grid-cols-3 gap-2">
                        {[
                          { id: 'left', label: 'Left' },
                          { id: 'center', label: 'Center' },
                          { id: 'right', label: 'Right' }
                        ].map((focus) => (
                          <button
                            key={focus.id}
                            onClick={() => setCropFocus(focus.id)}
                            disabled={isRendering}
                            className={`py-3 px-3 rounded-2xl border text-center transition-all cursor-pointer ${
                              cropFocus === focus.id
                                ? 'bg-[#dd2222]/15 border-[#dd2222]/50 text-[#ef9595] font-semibold'
                                : 'bg-white/2 border-white/5 hover:bg-white/5 text-[#909cac]'
                            }`}
                          >
                            <span className="block text-xs">{focus.label} Frame</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Subtitles Script language toggle */}
                    {hasHinglishOption && (
                      <div className="col-span-1 sm:col-span-2 pt-4 border-t border-white/8">
                        <label className="block text-xs text-[#909cac] font-medium uppercase tracking-wider mb-2">Subtitles Script (Hindi Video Detected)</label>
                        <div className="flex gap-3">
                          {[
                            { id: 'original', label: 'Original Hindi (Devanagari)', preview: 'नमस्ते दोस्तों' },
                            { id: 'hinglish', label: 'Hinglish (Latin Script)', preview: 'Namaste Dosto' }
                          ].map((lang) => (
                            <button
                              key={lang.id}
                              onClick={() => handleToggleLanguage(lang.id)}
                              disabled={isRendering}
                              className={`flex-grow py-3 px-4 rounded-2xl border text-left transition-all cursor-pointer flex justify-between items-center ${
                                captionLanguage === lang.id
                                  ? 'bg-[#dd2222]/15 border-[#dd2222]/50 text-[#ef9595] font-semibold shadow-lg shadow-red-600/10'
                                  : 'bg-white/2 border-white/5 hover:bg-white/5 text-[#909cac]'
                              }`}
                            >
                              <div>
                                <span className="block text-xs">{lang.label}</span>
                                <span className="block text-[10px] text-[#6e7d91] font-light mt-0.5">{lang.preview}</span>
                              </div>
                              {captionLanguage === lang.id && (
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-[#dd2222]" viewBox="0 0 20 20" fill="currentColor">
                                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                </svg>
                              )}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Output Layout Picker */}
                    <div className="col-span-1 sm:col-span-2 pt-4 border-t border-white/8">
                      <label className="block text-xs text-[#909cac] font-medium uppercase tracking-wider mb-2">Output Video Layout</label>
                      <div className="grid grid-cols-3 gap-2">
                        {[
                          { id: 'vertical', label: 'Vertical (9:16)', desc: 'TikTok/Shorts ratio' },
                          { id: 'horizontal', label: 'Horizontal (16:9)', desc: 'Standard widescreen' },
                          { id: 'both', label: 'Both Layouts', desc: 'Output both formats' }
                        ].map((fmt) => (
                          <button
                            key={fmt.id}
                            onClick={() => setRenderFormat(fmt.id)}
                            disabled={isRendering}
                            className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                              renderFormat === fmt.id
                                ? 'bg-[#dd2222]/15 border-[#dd2222]/50 text-[#ef9595] font-semibold'
                                : 'bg-white/2 border-white/5 hover:bg-white/5 text-[#909cac]'
                            }`}
                          >
                            <span className="block text-xs font-semibold">{fmt.label}</span>
                            <span className="block text-[10px] text-[#6e7d91] mt-1 leading-normal font-light">{fmt.desc}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Subtitle / Caption Text Editor */}
                <div className="glass-panel rounded-3xl p-6 flex flex-col gap-4 border border-white/8">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-xs font-semibold tracking-wider text-[#ef9595] uppercase">Subtitles Transcription Editor</h3>
                      <p className="text-[11px] text-[#909cac] font-light mt-0.5">Edit lines below to correct spelling errors before rendering.</p>
                    </div>
                    <span className="text-[10px] px-2.5 py-1 rounded-full bg-white/5 border border-white/5 text-[#909cac] font-mono">
                      {editableTranscript.length} lines
                    </span>
                  </div>

                  <div className="space-y-2.5 max-h-[350px] overflow-y-auto pr-2">
                    {editableTranscript.length === 0 ? (
                      <div className="text-center py-10 text-[#6e7d91] font-light text-sm">
                        No captions segment available for this range.
                      </div>
                    ) : (
                      editableTranscript.map((segment, idx) => (
                        <div key={idx} className="flex gap-3 items-center">
                          <span className="shrink-0 text-[10px] font-mono text-[#6e7d91] w-12 text-right">
                            {formatDuration(segment.start)}
                          </span>
                          <input
                            type="text"
                            disabled={isRendering}
                            value={segment.text}
                            onChange={(e) => handleTranscriptChange(idx, e.target.value)}
                            className="flex-grow px-3.5 py-2.5 bg-[#15181b]/90 border border-white/8 rounded-xl text-xs focus:outline-none focus:border-[#dd2222]/60 text-white font-light"
                          />
                        </div>
                      ))
                    )}
                  </div>
                </div>

              </div>
            </>
          ) })()}
        </section>

      </div>
    </div>
  );
}
