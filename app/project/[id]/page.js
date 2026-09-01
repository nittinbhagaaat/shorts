'use client';

import { useState, useEffect, use } from 'react';
import Link from 'next/link';
import DashboardLayout from '@/components/DashboardLayout';
import { fetchWithSettings } from '@/lib/settings';

export default function ProjectWorkspace({ params }) {
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

  const fetchProjectData = async () => {
    try {
      const res = await fetchWithSettings(`/api/project/${projectId}`);
      if (!res.ok) throw new Error('Failed to load project details');
      const data = await res.json();
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
      const res = await fetchWithSettings(`/api/project/${projectId}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to delete workspace');
      }

      window.location.href = '/workspaces';
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
    setRenderProgressText('Initializing rendering workspace...');

    const steps = [
      { delay: 1000, text: 'Opening video stream using configured tools...' },
      { delay: 3500, text: 'Downloading clip segment (20-30s) at 1080p...' },
      { delay: 6500, text: 'Generating ASS subtitles and mapping styling tokens...' },
      { delay: 9000, text: 'Executing FFmpeg filters (Cropping & Subtitles)...' },
      { delay: 13000, text: 'Exporting final video container...' },
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
          captionStyle,
          cropFocus,
          transcript: editableTranscript,
          captionLanguage,
          renderFormat,
        }),
      });

      timeouts.forEach((t) => clearTimeout(t));

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to render video clip');
      }

      const data = await res.json();
      setRenderProgressText('Render complete!');
      
      setSelectedClip(data.clip);
      await fetchProjectData();
    } catch (err) {
      timeouts.forEach((t) => clearTimeout(t));
      setRenderError(err.message || 'An error occurred during rendering');
      await fetchProjectData();
    } finally {
      setIsRendering(false);
    }
  };

  const handleResetRender = async () => {
    if (!selectedClip) return;
    if (!confirm("Are you sure you want to delete the rendered video files for this clip? This will delete the MP4s and reset the clip status so you can re-edit captions and styles.")) {
      return;
    }

    setIsResetting(true);
    setRenderError('');
    
    try {
      const res = await fetchWithSettings(`/api/clip/${selectedClip._id}/render`, {
        method: 'DELETE',
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

  const getSubtitlePositionStyle = (style) => {
    if (style === 'hormozi') {
      return { top: '45%', bottom: 'auto' };
    }
    return { bottom: '15%', top: 'auto' };
  };

  const renderLiveCaptionText = (segment, currentTime, style) => {
    if (!segment) return null;
    
    if (style === 'hormozi') {
      const words = (segment.text || '').split(/\s+/).filter(Boolean);
      if (words.length === 0) return null;

      const durationPerWord = (segment.duration || 1) / words.length;
      const elapsed = currentTime - segment.start;
      const activeIdx = Math.min(words.length - 1, Math.floor(elapsed / durationPerWord));

      return (
        <span 
          className="px-3 block text-center font-black tracking-wide leading-tight uppercase" 
          style={{
            fontFamily: 'Arial, sans-serif',
            fontSize: '20px',
            backgroundColor: 'rgba(0,0,0,0.7)',
            borderRadius: '10px',
            padding: '4px 8px'
          }}
        >
          {words.map((word, idx) => {
            const isActive = idx === activeIdx;
            return (
              <span 
                key={idx} 
                className={`${isActive ? 'text-[#f59e0b] font-extrabold' : 'text-white'} mx-1 inline-block`}
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
          className="px-3 py-1 text-center block text-white font-medium bg-black/60 rounded-[10px]"
          style={{
            fontFamily: 'Arial, sans-serif',
            fontSize: '14px',
          }}
        >
          {segment.text}
        </span>
      );
    }

    return (
      <span 
        className="px-3 py-1 bg-black/85 text-white rounded-[10px] text-center block max-w-[90%] mx-auto font-medium"
        style={{
          fontFamily: 'Arial, sans-serif',
          fontSize: '14px',
          lineHeight: '1.4',
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
              onClick={handleDeleteWorkspace}
              disabled={isDeleting}
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
          <aside className="w-full lg:w-72 border-b lg:border-b-0 lg:border-r border-[#39414b] flex flex-col overflow-y-auto max-h-[300px] lg:max-h-none shrink-0 bg-[#1d2125]">
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
                      <span className="text-[#6e7d91] font-mono">
                        {formatDuration(clip.start)} - {formatDuration(clip.end)}
                      </span>
                      
                      <div>
                        {clip.status === 'pending' && (
                          <span className="text-[#909cac] flex items-center gap-1 font-medium">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#6e7d91]"></span>
                            Ready
                          </span>
                        )}
                        {clip.status === 'rendering' && (
                          <span className="text-[#f59e0b] flex items-center gap-1 font-semibold">
                            Rendering
                          </span>
                        )}
                        {clip.status === 'completed' && (
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

          {/* Center/Right: Video Framing & Subtitle Studio */}
          <section className="flex-grow flex flex-col xl:flex-row overflow-y-auto p-4 sm:p-6 gap-6 bg-[#1d2125]">
            {(() => {
              const activeSubtitle = editableTranscript.find(
                (seg) => playerTime >= seg.start && playerTime <= seg.start + seg.duration
              );

              return !selectedClip ? (
                <div className="flex-grow flex flex-col items-center justify-center text-center p-8 app-panel rounded-[10px] border border-dashed border-[#39414b] min-h-[350px]">
                  <div className="w-12 h-12 rounded-[10px] bg-[#39414b] flex items-center justify-center mb-3 text-[#dd2222]">
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <h3 className="text-sm font-bold text-white mb-1">Select a Viral Clip</h3>
                  <p className="text-[#909cac] text-xs max-w-xs font-normal">
                    Pick any AI moment from the list to inspect timestamps, customize subtitle typography, and export.
                  </p>
                </div>
              ) : (
                <>
                  {/* Left: Player & Controls */}
                  <div className="w-full xl:w-[340px] flex flex-col shrink-0 gap-3">
                    <div className="app-panel p-4 flex flex-col items-center">
                      <div className="flex items-center justify-between w-full mb-2.5">
                        <h3 className="text-xs font-bold text-[#dd2222] uppercase tracking-wider">Preview Player</h3>
                        <span className="text-[10px] text-[#909cac] font-mono">
                          {selectedClip.status === 'completed' ? 'Output' : 'Source Segment'}
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
                        className={`relative bg-black rounded-[10px] overflow-hidden border border-[#39414b] flex items-center justify-center transition-all ${
                          previewActiveTab === 'horizontal' 
                            ? 'aspect-[16/9] w-full max-w-[300px]' 
                            : 'aspect-[9/16] w-full max-w-[240px]'
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
                            title="YouTube clip section preview"
                            allowFullScreen
                          />
                        )}

                        {/* Live dynamic subtitles overlay for preview */}
                        {selectedClip.status !== 'completed' && activeSubtitle && (
                          <div 
                            className="absolute inset-x-0 pointer-events-none z-10 flex items-center justify-center px-3"
                            style={getSubtitlePositionStyle(captionStyle)}
                          >
                            {renderLiveCaptionText(activeSubtitle, playerTime, captionStyle)}
                          </div>
                        )}
                      </div>

                      {/* Render / Download Action Controls */}
                      <div className="w-full mt-4 flex flex-col gap-2">
                        {selectedClip.status === 'completed' ? (
                          <>
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
                                <span>Render Video Short</span>
                              </>
                            )}
                          </button>
                        )}

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
                  </div>

                  {/* Right: Customization Controls & Subtitle Editor */}
                  <div className="flex-grow flex flex-col gap-4 min-w-0">
                    
                    {/* Caption Styling & Aspect Framing */}
                    <div className="app-panel p-4 sm:p-5 space-y-4">
                      <h3 className="text-xs font-bold tracking-wider text-[#dd2222] uppercase">
                        Short Customization Options
                      </h3>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Caption Typography Style */}
                        <div>
                          <label className="block text-xs text-[#b9c0ca] font-medium uppercase tracking-wider mb-1.5">
                            Subtitle Typography Style
                          </label>
                          <div className="grid grid-cols-3 gap-2">
                            {[
                              { 
                                id: 'hormozi', 
                                label: 'Hormozi', 
                                preview: (
                                  <div className="flex flex-col items-center justify-center h-9 w-full rounded-[10px] bg-[#1d2125] border border-[#39414b] font-black text-[9px] tracking-wide text-white uppercase mt-1">
                                    <span>TALK <span className="text-[#f59e0b]">IS CHEAP</span></span>
                                  </div>
                                )
                              },
                              { 
                                id: 'minimalist', 
                                label: 'Minimalist', 
                                preview: (
                                  <div className="flex flex-col justify-end items-center h-9 w-full rounded-[10px] bg-[#1d2125] border border-[#39414b] text-[8px] text-white/95 mt-1 pb-1 font-semibold">
                                    <span>Talk is cheap</span>
                                  </div>
                                )
                              },
                              { 
                                id: 'classic', 
                                label: 'Classic', 
                                preview: (
                                  <div className="flex flex-col justify-end items-center h-9 w-full rounded-[10px] bg-[#1d2125] border border-[#39414b] text-[8px] mt-1 pb-1">
                                    <span className="bg-[#39414b] px-1 py-0.5 rounded-[10px] text-white font-medium">Talk is cheap</span>
                                  </div>
                                )
                              }
                            ].map((style) => (
                              <button
                                key={style.id}
                                onClick={() => setCaptionStyle(style.id)}
                                disabled={isRendering || selectedClip.status === 'completed'}
                                className={`p-2.5 rounded-[10px] border text-left transition-colors cursor-pointer flex flex-col justify-between h-20 ${
                                  captionStyle === style.id
                                    ? 'bg-[#360c0c] border-[#dd2222] text-[#fcf2f2]'
                                    : 'bg-[#1d2125] border-[#39414b] text-[#909cac]'
                                }`}
                              >
                                <span className="block text-xs font-bold">{style.label}</span>
                                {style.preview}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Aspect Crop Focus */}
                        <div>
                          <label className="block text-xs text-[#b9c0ca] font-medium uppercase tracking-wider mb-1.5">
                            9:16 Framing Crop Focus
                          </label>
                          <div className="grid grid-cols-3 gap-2">
                            {[
                              { id: 'left', label: 'Left' },
                              { id: 'center', label: 'Center' },
                              { id: 'right', label: 'Right' }
                            ].map((focus) => (
                              <button
                                key={focus.id}
                                onClick={() => setCropFocus(focus.id)}
                                disabled={isRendering || selectedClip.status === 'completed'}
                                className={`py-2 px-2 rounded-[10px] border text-center transition-colors cursor-pointer text-xs font-semibold ${
                                  cropFocus === focus.id
                                    ? 'bg-[#360c0c] border-[#dd2222] text-[#fcf2f2]'
                                    : 'bg-[#1d2125] border-[#39414b] text-[#909cac]'
                                }`}
                              >
                                {focus.label}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Output Format Picker */}
                        <div className="col-span-1 md:col-span-2 pt-2 border-t border-[#39414b]">
                          <label className="block text-xs text-[#b9c0ca] font-medium uppercase tracking-wider mb-1.5">
                            Output Render Format
                          </label>
                          <div className="grid grid-cols-3 gap-2">
                            {[
                              { id: 'vertical', label: 'Vertical (9:16)', desc: 'Shorts & TikTok' },
                              { id: 'horizontal', label: 'Horizontal (16:9)', desc: 'Widescreen HD' },
                              { id: 'both', label: 'Both Layouts', desc: 'Output 9:16 & 16:9' }
                            ].map((fmt) => (
                              <button
                                key={fmt.id}
                                onClick={() => setRenderFormat(fmt.id)}
                                disabled={isRendering || selectedClip.status === 'completed'}
                                className={`p-2.5 rounded-[10px] border text-left transition-colors cursor-pointer flex flex-col justify-between ${
                                  renderFormat === fmt.id
                                    ? 'bg-[#360c0c] border-[#dd2222] text-[#fcf2f2]'
                                    : 'bg-[#1d2125] border-[#39414b] text-[#909cac]'
                                }`}
                              >
                                <span className="block text-xs font-bold">{fmt.label}</span>
                                <span className="block text-[10px] text-[#6e7d91] mt-0.5 leading-normal">{fmt.desc}</span>
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Hinglish Language Selector */}
                        {hasHinglishOption && (
                          <div className="col-span-1 md:col-span-2 pt-2 border-t border-[#39414b]">
                            <label className="block text-xs text-[#b9c0ca] font-medium uppercase tracking-wider mb-1.5">
                              Caption Language (Hindi Video Detected)
                            </label>
                            <div className="flex gap-2.5">
                              {[
                                { id: 'original', label: 'Original Hindi (Devanagari)', preview: 'नमस्ते दोस्तों' },
                                { id: 'hinglish', label: 'Hinglish (Roman Script)', preview: 'Namaste Dosto' }
                              ].map((lang) => (
                                <button
                                  key={lang.id}
                                  onClick={() => handleToggleLanguage(lang.id)}
                                  disabled={isRendering || selectedClip.status === 'completed'}
                                  className={`flex-grow py-2 px-3 rounded-[10px] border text-left transition-colors cursor-pointer flex justify-between items-center ${
                                    captionLanguage === lang.id
                                      ? 'bg-[#360c0c] border-[#dd2222] text-[#fcf2f2]'
                                      : 'bg-[#1d2125] border-[#39414b] text-[#909cac]'
                                  }`}
                                >
                                  <div>
                                    <span className="block text-xs font-bold">{lang.label}</span>
                                    <span className="block text-[10px] text-[#6e7d91] mt-0.5">{lang.preview}</span>
                                  </div>
                                  {captionLanguage === lang.id && (
                                    <span className="text-[#dd2222] text-xs font-bold">✓</span>
                                  )}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Subtitle / Caption Transcript Editor */}
                    <div className="app-panel p-4 sm:p-5 space-y-3">
                      <div className="flex items-center justify-between">
                        <h3 className="text-xs font-bold tracking-wider text-[#dd2222] uppercase">
                          Transcript & Subtitle Editor
                        </h3>
                        <span className="text-[11px] text-[#909cac]">
                          {selectedClip.status === 'completed'
                            ? 'Rendered with these captions'
                            : 'Edit text before clicking render'}
                        </span>
                      </div>

                      <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                        {editableTranscript.length === 0 ? (
                          <div className="text-center py-6 text-[#909cac] text-xs">
                            No transcript segment for this timestamp.
                          </div>
                        ) : (
                          editableTranscript.map((segment, idx) => (
                            <div key={idx} className="flex gap-2 items-center">
                              <span className="shrink-0 text-[10px] font-mono text-[#6e7d91] w-12 text-right">
                                {formatDuration(segment.start)}
                              </span>
                              <input
                                type="text"
                                disabled={isRendering || selectedClip.status === 'completed'}
                                value={segment.text}
                                onChange={(e) => handleTranscriptChange(idx, e.target.value)}
                                className="flex-grow px-3 py-1.5 app-input text-xs font-normal disabled:opacity-60"
                              />
                            </div>
                          ))
                        )}
                      </div>
                    </div>

                  </div>
                </>
              );
            })()}
          </section>

        </div>
      </div>
    </DashboardLayout>
  );
}
