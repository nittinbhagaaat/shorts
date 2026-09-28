'use client';

import { useState, useEffect, use, useRef } from 'react';
import Link from 'next/link';
import DashboardLayout from '@/components/DashboardLayout';
import YouTubeUploadModal from '@/components/YouTubeUploadModal';
import { fetchWithSettings, getStoredSettings } from '@/lib/settings';
import { devanagariToHinglish, transliterateTranscript } from '@/lib/transliterate';

export default function ProjectWorkspace({ params }) {
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
  const [enableSubtitles, setEnableSubtitles] = useState(true);
  const [captionStyle, setCaptionStyle] = useState('hormozi');
  const [cropFocus, setCropFocus] = useState('auto'); // 'auto' (camera follows person), 'center', 'left', 'right'
  const [captionLanguage, setCaptionLanguage] = useState('original');
  const [renderFormat, setRenderFormat] = useState('vertical');
  const [captionPosition, setCaptionPosition] = useState('lower');
  const [captionYPercent, setCaptionYPercent] = useState(72);
  const [captionAlign, setCaptionAlign] = useState('center');

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

  // Editable transcript state
  const [editableTranscript, setEditableTranscript] = useState([]);

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

  const fetchYouTubeUploads = async () => {
    if (!projectId) return;
    try {
      setIsLoadingUploads(true);
      const res = await fetchWithSettings(`/api/youtube/uploads?projectId=${projectId}`);
      if (res.ok) {
        const data = await res.json();
        setYoutubeUploads(data.uploads || []);
      }
    } catch (err) {
      console.error('Failed to load YouTube uploads for project:', err);
    } finally {
      setIsLoadingUploads(false);
    }
  };

  useEffect(() => {
    fetchProjectData();
    fetchYouTubeUploads();
  }, [projectId]);

  const fetchQuickPreview = async (clipId) => {
    const targetId = clipId || selectedClip?._id;
    if (!targetId) return;
    setIsLoadingPreview(true);
    try {
      const res = await fetchWithSettings(`/api/clip/${targetId}/preview`);
      if (res.ok) {
        const data = await res.json();
        if (data.previewUrl) {
          setLocalPreviewUrl(data.previewUrl);
        }
      }
    } catch (err) {
      console.warn('Could not fetch quick preview:', err);
    } finally {
      setIsLoadingPreview(false);
    }
  };

  const handleToggleClipSubtitles = async (enabled, explicitStyle = null) => {
    if (!selectedClip) return;
    const nextStyle = enabled
      ? (explicitStyle || (captionStyle && captionStyle !== 'none' ? captionStyle : 'hormozi'))
      : 'none';

    setEnableSubtitles(enabled);
    setCaptionStyle(nextStyle);

    setSelectedClip((prev) => (prev ? { ...prev, enableSubtitles: enabled, captionStyle: nextStyle } : prev));
    setClips((prev) =>
      prev.map((c) => (c._id === selectedClip._id ? { ...c, enableSubtitles: enabled, captionStyle: nextStyle } : c))
    );

    try {
      await fetchWithSettings(`/api/clip/${selectedClip._id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          enableSubtitles: enabled,
          captionStyle: nextStyle,
        }),
      });
    } catch (err) {
      console.warn('Failed to save clip subtitle preference:', err);
    }
  };

  // Load selected clip settings into form state
  useEffect(() => {
    if (selectedClip) {
      const isClipSubtitlesEnabled = selectedClip.enableSubtitles !== false && selectedClip.captionStyle !== 'none';
      setEnableSubtitles(isClipSubtitlesEnabled);
      setCaptionStyle(isClipSubtitlesEnabled ? (selectedClip.captionStyle && selectedClip.captionStyle !== 'none' ? selectedClip.captionStyle : 'hormozi') : 'none');
      setCropFocus(selectedClip.cropFocus || 'auto');
      const prefLang = selectedClip.captionLanguage || 'original';
      setCaptionLanguage(prefLang);
      setRenderFormat(selectedClip.renderFormat || 'vertical');

      setCaptionPosition(selectedClip.captionPosition || 'lower');
      setCaptionYPercent(typeof selectedClip.captionYPercent === 'number' ? selectedClip.captionYPercent : 72);
      setCaptionAlign(selectedClip.captionAlign || 'center');

      setOverlayText(selectedClip.overlayText || '');
      setHasOverlayText(Boolean(selectedClip.overlayText && selectedClip.overlayText.trim()));
      setOverlayTextOpacity(typeof selectedClip.overlayTextOpacity === 'number' ? selectedClip.overlayTextOpacity : 1.0);
      setOverlayTextYPercent(typeof selectedClip.overlayTextYPercent === 'number' ? selectedClip.overlayTextYPercent : 14);
      setOverlayTextColor(selectedClip.overlayTextColor || '#FFFFFF');
      setOverlayTextSize(selectedClip.overlayTextSize || 'medium');
      setOverlayTextBg(typeof selectedClip.overlayTextBg === 'boolean' ? selectedClip.overlayTextBg : true);

      let activeTranscript = selectedClip.transcript || [];
      if (prefLang === 'hinglish') {
        const source = (selectedClip.hinglishTranscript && selectedClip.hinglishTranscript.length > 0)
          ? selectedClip.hinglishTranscript
          : selectedClip.transcript;
        activeTranscript = transliterateTranscript(source);
      } else if (prefLang === 'english' && selectedClip.englishTranscript?.length > 0) {
        activeTranscript = selectedClip.englishTranscript;
      }

      setEditableTranscript(activeTranscript);
      setRenderError('');
      setVideoError(false);
      setLocalPreviewUrl('');
      setPlayerTime(selectedClip.start || 0);

      if (selectedClip.status === 'completed') {
        const completedPath = previewActiveTab === 'horizontal'
          ? (selectedClip.videoPathHorizontal || selectedClip.videoPath)
          : (selectedClip.videoPathVertical || selectedClip.videoPath);
        setLocalPreviewUrl(completedPath || '');
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

  const handleJumpToTranscript = (segment) => {
    if (!segment) return;
    setPlayerTime(segment.start + 0.05);
    if (videoRef.current) {
      const targetSec = Math.max(0, segment.start - (selectedClip?.start || 0));
      videoRef.current.currentTime = targetSec;
      videoRef.current.play().catch(() => {});
    }
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

  const handleTranscriptChange = (index, value) => {
    const updated = [...editableTranscript];
    updated[index].text = value;
    setEditableTranscript(updated);
  };

  const handleToggleLanguage = (lang) => {
    setCaptionLanguage(lang);
    let activeTranscript = selectedClip?.transcript || [];
    if (lang === 'hinglish') {
      const source = (selectedClip?.hinglishTranscript && selectedClip.hinglishTranscript.length > 0)
        ? selectedClip.hinglishTranscript
        : (selectedClip?.transcript || []);
      activeTranscript = transliterateTranscript(source);
    } else if (lang === 'english' && selectedClip?.englishTranscript?.length > 0) {
      activeTranscript = selectedClip.englishTranscript;
    }
    setEditableTranscript(activeTranscript);
  };

  const handleCaptionPositionPreset = (preset) => {
    setCaptionPosition(preset);
    if (preset === 'top') setCaptionYPercent(15);
    else if (preset === 'upper') setCaptionYPercent(30);
    else if (preset === 'center') setCaptionYPercent(50);
    else if (preset === 'lower') setCaptionYPercent(72);
    else if (preset === 'bottom') setCaptionYPercent(86);
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
          regenerate: true,
          enableSubtitles: getStoredSettings().enableSubtitlesDefault !== false
        })
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to re-scan video');
      }

      const data = await res.json();
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
    setRenderProgressText('Initializing rendering workspace...');

    const steps = [
      { delay: 1000, text: 'Opening video stream using configured tools...' },
      { delay: 3500, text: 'Downloading clip segment in HD...' },
      { delay: 6500, text: cropFocus === 'auto' ? 'AI Vision: Tracking speaker & centering camera...' : 'Processing video layout...' },
      { delay: 9500, text: 'Generating ASS subtitles and custom text overlays...' },
      { delay: 13000, text: 'Executing FFmpeg filters and exporting final container...' },
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
          enableSubtitles: enableSubtitles && captionStyle !== 'none',
          captionStyle: (enableSubtitles && captionStyle !== 'none') ? captionStyle : 'none',
          cropFocus,
          transcript: editableTranscript,
          captionLanguage,
          renderFormat,
          captionPosition,
          captionYPercent,
          captionAlign,
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
    if (!confirm("Are you sure you want to delete the rendered video files for this clip? This will delete the MP4s and reset the clip status so you can re-edit captions, text overlays, and styles.")) {
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

  /**
   * Renders real-time live captions matching any of the 10 visual styles
   */
  const renderLiveCaptionText = (segment, currentTime, style) => {
    if (!segment) return null;
    let segText = segment.text || '';
    if (captionLanguage === 'hinglish') {
      segText = devanagariToHinglish(segText);
    }
    const rawWords = segText.split(/\s+/).filter(Boolean);
    if (rawWords.length === 0) return null;

    const durationPerWord = (segment.duration || 1) / Math.max(1, rawWords.length);
    const elapsed = currentTime - segment.start;
    const activeIdx = Math.max(0, Math.min(rawWords.length - 1, Math.floor(elapsed / durationPerWord)));

    // 1. Hormozi Pop
    if (style === 'hormozi') {
      return (
        <span 
          className="px-3 py-1 block text-center font-black tracking-wide uppercase shadow-2xl" 
          style={{
            fontFamily: 'Arial, sans-serif',
            fontSize: '18px',
            backgroundColor: 'rgba(0,0,0,0.75)',
            borderRadius: '10px',
            textShadow: '0 2px 4px rgba(0,0,0,0.9)'
          }}
        >
          {rawWords.map((word, idx) => {
            const isActive = idx === activeIdx;
            return (
              <span 
                key={idx} 
                className={`${isActive ? 'text-[#f59e0b] font-black scale-105' : 'text-white'} mx-1 inline-block transition-transform`}
              >
                {word}
              </span>
            );
          })}
        </span>
      );
    }

    // 2. MrBeast Bouncy
    if (style === 'mrbeast') {
      return (
        <span 
          className="px-3 py-1 block text-center font-black tracking-wider uppercase" 
          style={{
            fontFamily: 'Impact, sans-serif',
            fontSize: '20px',
            textShadow: '2px 2px 0 #000, -2px -2px 0 #000, 2px -2px 0 #000, -2px 2px 0 #000, 0 3px 6px rgba(0,0,0,0.9)'
          }}
        >
          {rawWords.map((word, idx) => {
            const isActive = idx === activeIdx;
            return (
              <span 
                key={idx} 
                className={`${isActive ? 'text-[#22c55e]' : 'text-[#fde047]'} mx-1 inline-block transform -rotate-1`}
              >
                {word}
              </span>
            );
          })}
        </span>
      );
    }

    // 3. Cyberpunk Neon
    if (style === 'neon') {
      return (
        <span 
          className="px-3 py-1 block text-center font-extrabold tracking-widest uppercase bg-black/80 rounded-[8px]" 
          style={{
            fontFamily: 'Arial, sans-serif',
            fontSize: '17px',
            boxShadow: '0 0 15px rgba(0, 243, 255, 0.4)'
          }}
        >
          {rawWords.map((word, idx) => {
            const isActive = idx === activeIdx;
            return (
              <span 
                key={idx} 
                className={`${isActive ? 'text-white' : 'text-[#00f3ff]'} mx-1 inline-block`}
              >
                {word}
              </span>
            );
          })}
        </span>
      );
    }

    // 4. Minimalist Clean
    if (style === 'minimalist') {
      return (
        <span 
          className="px-3.5 py-1 text-center block text-white font-medium bg-black/60 rounded-[12px] backdrop-blur-sm"
          style={{
            fontFamily: 'Arial, sans-serif',
            fontSize: '14px',
          }}
        >
          {segText}
        </span>
      );
    }

    // 5. Classic Subtitle
    if (style === 'classic') {
      return (
        <span 
          className="px-3 py-1 bg-black/85 text-white rounded-[6px] text-center block max-w-[90%] mx-auto font-medium"
          style={{
            fontFamily: 'Arial, sans-serif',
            fontSize: '14px',
            lineHeight: '1.4',
            textShadow: '0 1px 2px rgba(0,0,0,0.8)'
          }}
        >
          {segText}
        </span>
      );
    }

    // 6. Karaoke Fire
    if (style === 'karaoke') {
      return (
        <span 
          className="px-3 py-1 block text-center font-black tracking-wide uppercase bg-black/70 rounded-[10px]" 
          style={{
            fontFamily: 'Impact, Arial, sans-serif',
            fontSize: '18px',
          }}
        >
          {rawWords.map((word, idx) => {
            const isActive = idx === activeIdx;
            return (
              <span 
                key={idx} 
                className={`${isActive ? 'text-[#f97316]' : 'text-white'} mx-1 inline-block`}
                style={{
                  textShadow: isActive ? '0 0 10px #f97316' : '0 2px 4px black'
                }}
              >
                {word}
              </span>
            );
          })}
        </span>
      );
    }

    // 7. Retro VHS 90s
    if (style === 'retro') {
      return (
        <span 
          className="px-3 py-1 bg-[#1a1400]/90 text-[#fde047] font-mono text-center block rounded border border-[#fde047]/40"
          style={{
            fontSize: '15px',
            textShadow: '2px 2px 0px #000'
          }}
        >
          {segText}
        </span>
      );
    }

    // 8. Cinematic Editorial Serif
    if (style === 'cinematic') {
      return (
        <span 
          className="px-3.5 py-1 text-[#fdfbf7] font-serif italic text-center block bg-black/50 rounded-[4px]"
          style={{
            fontSize: '16px',
            letterSpacing: '0.04em',
            textShadow: '0 2px 4px rgba(0,0,0,0.8)'
          }}
        >
          &ldquo;{segText}&rdquo;
        </span>
      );
    }

    // 9. Bold Red Badge
    if (style === 'bold_badge') {
      return (
        <span 
          className="px-3.5 py-1 bg-[#dc2626] text-white font-black text-center block rounded-[8px] uppercase tracking-wider shadow-lg"
          style={{
            fontFamily: 'Arial, sans-serif',
            fontSize: '15px',
            textShadow: '0 2px 4px rgba(0,0,0,0.7)'
          }}
        >
          {segText}
        </span>
      );
    }

    // 10. Comic Pop Art
    if (style === 'comic') {
      return (
        <span 
          className="px-3 py-1 block text-center font-black uppercase italic bg-[#000000]/85 rounded-[12px]" 
          style={{
            fontFamily: 'Trebuchet MS, Comic Sans MS, sans-serif',
            fontSize: '18px',
          }}
        >
          {rawWords.map((word, idx) => {
            const isActive = idx === activeIdx;
            return (
              <span 
                key={idx} 
                className={`${isActive ? 'text-[#ff4500]' : 'text-[#facc15]'} mx-1 inline-block`}
                style={{
                  textShadow: '2px 2px 0 #000'
                }}
              >
                {word}
              </span>
            );
          })}
        </span>
      );
    }

    return (
      <span className="px-3 py-1 bg-black/80 text-white rounded text-center block font-medium">
        {segText}
      </span>
    );
  };

  const formatDuration = (secs) => {
    if (!secs) return '0:00';
    const mins = Math.floor(secs / 60);
    const rSecs = Math.floor(secs % 60);
    return `${mins}:${rSecs.toString().padStart(2, '0')}`;
  };

  // Caption languages available
  const hasHinglish = Boolean(selectedClip && ((selectedClip.transcript && selectedClip.transcript.length > 0) || (selectedClip.hinglishTranscript && selectedClip.hinglishTranscript.length > 0)));
  const hasEnglish = selectedClip && selectedClip.englishTranscript && selectedClip.englishTranscript.length > 0;

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
                        {captionLanguage === 'hinglish' ? devanagariToHinglish(clip.title) : clip.title}
                      </h3>
                      <span className="shrink-0 px-1.5 py-0.5 rounded-[10px] bg-[#1d2125] text-[#eeeff2] font-mono text-[10px] font-bold border border-[#39414b]">
                        {formatDuration(clip.duration)}
                      </span>
                    </div>
                    
                    <p className="text-[#909cac] text-[11px] line-clamp-2 leading-snug mb-2 font-normal">
                      {captionLanguage === 'hinglish' ? devanagariToHinglish(clip.description) : clip.description}
                    </p>

                    <div className="flex items-center justify-between text-[10px]">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[#6e7d91] font-mono">
                          {formatDuration(clip.start)} - {formatDuration(clip.end)}
                        </span>
                        {clip.enableSubtitles === false || clip.captionStyle === 'none' ? (
                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-[#1d2125] text-[#909cac] font-mono border border-[#39414b]" title="Clean video, no subtitles">
                            🚫 Clean
                          </span>
                        ) : (
                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-[#360c0c] text-[#f87171] font-mono border border-[#dd2222]/30" title="Subtitles enabled">
                            💬 Subs
                          </span>
                        )}
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
                            <span className="w-1.5 h-1.5 rounded-full bg-[#6e7d91]"></span>
                            Ready
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

          {/* Center/Right: Video Framing & Subtitle Studio */}
          <section className="flex-grow flex flex-col xl:flex-row overflow-y-auto p-4 sm:p-6 gap-6 bg-[#1d2125]">
            {(() => {
              const activeSubtitle = editableTranscript.find(
                (seg) => playerTime >= seg.start && playerTime <= seg.start + (seg.duration || 2)
              ) || editableTranscript[0] || null;

              return !selectedClip ? (
                <div className="flex-grow flex flex-col items-center justify-center text-center p-8 app-panel rounded-[10px] border border-dashed border-[#39414b] min-h-[350px]">
                  <div className="w-12 h-12 rounded-[10px] bg-[#39414b] flex items-center justify-center mb-3 text-[#dd2222]">
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <h3 className="text-sm font-bold text-white mb-1">Select a Viral Clip</h3>
                  <p className="text-[#909cac] text-xs max-w-xs font-normal">
                    Pick any AI moment from the list to preview, adjust camera framing, customize caption styles, and add overlays.
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
                              {renderProgressText || 'AI vision tracking speaker & burning subtitles...'}
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
                              src={previewActiveTab === 'horizontal' 
                                ? (selectedClip.videoPathHorizontal || selectedClip.videoPath) 
                                : (selectedClip.videoPathVertical || selectedClip.videoPath)
                              }
                              controls
                              playsInline
                              autoPlay={false}
                              className="w-full h-full object-cover"
                              poster={project.thumbnail}
                              onTimeUpdate={handleTimeUpdate}
                              onError={() => setVideoError(true)}
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
                          <div className="relative w-full h-full flex items-center justify-center bg-black">
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
                          </div>
                        ) : (
                          /* 4. Pre-Render Studio with Poster & 1-Click Fast HD Preview */
                          <div className="relative w-full h-full flex items-center justify-center bg-black overflow-hidden group">
                            {/* Backdrop Thumbnail */}
                            {project.thumbnail && (
                              <img
                                src={project.thumbnail}
                                alt={selectedClip.title || 'Clip thumbnail'}
                                className="absolute inset-0 w-full h-full object-cover opacity-60 filter blur-[2px]"
                              />
                            )}
                            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-black/60"></div>

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

                        {/* Live Subtitle Overlay with Custom Position */}
                        {selectedClip.status !== 'completed' && enableSubtitles && captionStyle !== 'none' && activeSubtitle && !isRendering && selectedClip.status !== 'rendering' && (
                          <div 
                            className="absolute inset-x-0 pointer-events-none z-20 flex px-3 transition-all"
                            style={{
                              top: `${captionYPercent}%`,
                              transform: 'translateY(-50%)',
                              justifyContent: captionAlign === 'left' ? 'flex-start' : captionAlign === 'right' ? 'flex-end' : 'center',
                            }}
                          >
                            {renderLiveCaptionText(activeSubtitle, playerTime, captionStyle)}
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

                      {/* Individual Clip Subtitle Toggle Bar */}
                      <div className="w-full mt-3 bg-[#1d2125] border border-[#39414b] rounded-[10px] p-3 shadow-md">
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <span className="text-xl shrink-0">{enableSubtitles && captionStyle !== 'none' ? '💬' : '🚫'}</span>
                            <div className="min-w-0">
                              <div className="text-xs font-bold text-white flex items-center gap-1.5 flex-wrap">
                                <span>Subtitles on this clip:</span>
                                <span className={`text-[10px] px-2 py-0.5 rounded font-extrabold uppercase tracking-wide ${
                                  enableSubtitles && captionStyle !== 'none'
                                    ? 'bg-[#22c55e]/20 text-[#22c55e] border border-[#22c55e]/30'
                                    : 'bg-[#ef4444]/20 text-[#ef4444] border border-[#ef4444]/30'
                                }`}>
                                  {enableSubtitles && captionStyle !== 'none' ? 'ON' : 'OFF (Clean Video)'}
                                </span>
                              </div>
                              <p className="text-[11px] text-[#909cac] truncate mt-0.5">
                                {enableSubtitles && captionStyle !== 'none'
                                  ? 'Animated viral captions will be burned into this short'
                                  : '100% clean video with NO subtitles will be generated'}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center bg-[#111315] p-1 rounded-[8px] border border-[#2b313a] shrink-0">
                            <button
                              type="button"
                              onClick={() => handleToggleClipSubtitles(true)}
                              disabled={isRendering || selectedClip.status === 'completed'}
                              className={`px-3 py-1.5 text-xs font-bold rounded-[6px] transition-all cursor-pointer flex items-center gap-1.5 ${
                                enableSubtitles && captionStyle !== 'none'
                                  ? 'bg-[#dd2222] text-white shadow-sm'
                                  : 'text-[#909cac] hover:text-white'
                              }`}
                            >
                              <span>💬</span>
                              <span>On</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleToggleClipSubtitles(false)}
                              disabled={isRendering || selectedClip.status === 'completed'}
                              className={`px-3 py-1.5 text-xs font-bold rounded-[6px] transition-all cursor-pointer flex items-center gap-1.5 ${
                                !enableSubtitles || captionStyle === 'none'
                                  ? 'bg-[#ef4444] text-white shadow-sm'
                                  : 'text-[#909cac] hover:text-white'
                              }`}
                            >
                              <span>🚫</span>
                              <span>Off</span>
                            </button>
                          </div>
                        </div>
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

                  {/* Right: Customization Controls & Subtitle Editor */}
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

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                        {[
                          { 
                            id: 'auto', 
                            label: 'AI Active Speaker', 
                            badge: 'Smart Center',
                            desc: 'Camera follows person',
                            icon: '🎯' 
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

                    {/* Panel 2: Subtitle Typography Styles & Master Toggle */}
                    <div className="app-panel p-4 sm:p-5 space-y-3.5">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2 border-b border-[#2b313a]">
                        <div>
                          <h3 className="text-xs font-bold tracking-wider text-[#dd2222] uppercase flex items-center gap-1.5">
                            <span>✨</span>
                            <span>Subtitle Typography Styles</span>
                          </h3>
                          <p className="text-[11px] text-[#909cac] mt-0.5">
                            Burn animated viral subtitles into your short or generate 100% clean video.
                          </p>
                        </div>

                        {/* Master Subtitle Switch */}
                        <div className="flex items-center gap-2 self-start sm:self-auto">
                          <span className={`text-[11px] font-semibold ${enableSubtitles && captionStyle !== 'none' ? 'text-[#22c55e]' : 'text-[#909cac]'}`}>
                            {enableSubtitles && captionStyle !== 'none' ? 'Subtitles: ON' : 'Subtitles: OFF'}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleToggleClipSubtitles(!enableSubtitles || captionStyle === 'none')}
                            disabled={isRendering || selectedClip.status === 'completed'}
                            className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                              enableSubtitles && captionStyle !== 'none' ? 'bg-[#dd2222]' : 'bg-[#39414b]'
                            }`}
                          >
                            <span
                              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                                enableSubtitles && captionStyle !== 'none' ? 'translate-x-5' : 'translate-x-0'
                              }`}
                            />
                          </button>
                        </div>
                      </div>

                      {(!enableSubtitles || captionStyle === 'none') && (
                        <div className="p-2.5 rounded-[8px] bg-[#1d2125] border border-[#39414b] flex items-center justify-between gap-2 text-[#909cac] text-[11px]">
                          <div className="flex items-center gap-2">
                            <span className="text-base shrink-0">🚫</span>
                            <span><strong>Subtitles are disabled:</strong> This short will be rendered as clean video with zero burned-in captions.</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleToggleClipSubtitles(true, 'hormozi')}
                            className="px-2.5 py-1 rounded-[6px] bg-[#360c0c] border border-[#dd2222]/40 text-[#f87171] text-xs font-semibold hover:bg-[#dd2222] hover:text-white transition-colors cursor-pointer shrink-0"
                          >
                            Enable Subtitles
                          </button>
                        </div>
                      )}

                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
                        {[
                          {
                            id: 'none',
                            label: 'No Subtitles',
                            badge: 'Clean Video',
                            preview: <span className="text-[10px] font-bold text-[#ef4444] uppercase flex items-center gap-1">🚫 Clean Video</span>,
                            bg: 'bg-black/50'
                          },
                          {
                            id: 'hormozi',
                            label: 'Hormozi Pop',
                            badge: 'Viral Hook',
                            preview: <span className="text-[10px] font-black text-white uppercase">TALK <span className="text-[#f59e0b]">IS CHEAP</span></span>,
                            bg: 'bg-black'
                          },
                          {
                            id: 'mrbeast',
                            label: 'MrBeast',
                            badge: 'Energetic',
                            preview: <span className="text-[10px] font-black text-[#fde047] uppercase italic">NO <span className="text-[#22c55e]">WAY!</span></span>,
                            bg: 'bg-[#111]'
                          },
                          {
                            id: 'neon',
                            label: 'Cyberpunk',
                            badge: 'Neon Glow',
                            preview: <span className="text-[10px] font-bold text-[#00f3ff] uppercase drop-shadow-[0_0_8px_#00f3ff]">FUTURE</span>,
                            bg: 'bg-[#050b14]'
                          },
                          {
                            id: 'minimalist',
                            label: 'Minimalist',
                            badge: 'Aesthetic',
                            preview: <span className="text-[9px] font-medium text-white px-1.5 py-0.5 rounded bg-white/20">Clean aesthetic</span>,
                            bg: 'bg-[#1f242d]'
                          },
                          {
                            id: 'classic',
                            label: 'Classic',
                            badge: 'Cinema',
                            preview: <span className="text-[10px] font-semibold text-white drop-shadow">Talk is cheap</span>,
                            bg: 'bg-black/60'
                          },
                          {
                            id: 'karaoke',
                            label: 'Karaoke Fire',
                            badge: 'Animated',
                            preview: <span className="text-[10px] font-black text-white uppercase">HOT <span className="text-[#f97316]">FIRE</span></span>,
                            bg: 'bg-black'
                          },
                          {
                            id: 'retro',
                            label: 'Retro VHS',
                            badge: '90s CRT',
                            preview: <span className="text-[9px] font-mono font-bold text-[#fde047]">&gt; PLAY 1995</span>,
                            bg: 'bg-[#141208]'
                          },
                          {
                            id: 'cinematic',
                            label: 'Cinematic',
                            badge: 'Editorial',
                            preview: <span className="text-[10px] font-serif italic text-[#fdfbf7]">&ldquo;Storytelling&rdquo;</span>,
                            bg: 'bg-[#18181b]'
                          },
                          {
                            id: 'bold_badge',
                            label: 'Red Badge',
                            badge: 'High Impact',
                            preview: <span className="text-[9px] font-black text-white px-1 py-0.5 rounded bg-[#dc2626] uppercase">BREAKING</span>,
                            bg: 'bg-[#2b1010]'
                          },
                          {
                            id: 'comic',
                            label: 'Pop Comic',
                            badge: 'Playful',
                            preview: <span className="text-[10px] font-black italic text-[#facc15] uppercase">POW!</span>,
                            bg: 'bg-[#201c05]'
                          }
                        ].map((st) => {
                          const isSelected = st.id === 'none'
                            ? (!enableSubtitles || captionStyle === 'none')
                            : (enableSubtitles && captionStyle === st.id);

                          return (
                            <button
                              key={st.id}
                              onClick={() => {
                                if (st.id === 'none') {
                                  handleToggleClipSubtitles(false);
                                } else {
                                  handleToggleClipSubtitles(true, st.id);
                                }
                              }}
                              disabled={isRendering || selectedClip.status === 'completed'}
                              className={`p-2 rounded-[10px] border text-left transition-colors cursor-pointer flex flex-col justify-between h-20 ${
                                isSelected
                                  ? 'bg-[#360c0c] border-[#dd2222] ring-1 ring-[#dd2222]'
                                  : 'bg-[#1d2125] border-[#39414b] text-[#909cac] hover:border-[#4b5563]'
                              }`}
                            >
                              <div className="flex items-center justify-between w-full">
                                <span className="block text-[11px] font-bold text-white truncate">{st.label}</span>
                                <span className="text-[8px] text-[#6e7d91] font-mono">{st.badge}</span>
                              </div>
                              <div className={`w-full py-1 px-1.5 rounded-[6px] ${st.bg} flex items-center justify-center border border-white/10`}>
                                {st.preview}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Panel 3: Caption Positioning & Alignment */}
                    <div className="app-panel p-4 sm:p-5 space-y-3.5">
                      <div className="flex items-center justify-between">
                        <h3 className="text-xs font-bold tracking-wider text-[#dd2222] uppercase flex items-center gap-1.5">
                          <span>📍</span>
                          <span>Subtitle Position & Alignment</span>
                        </h3>
                        <span className="text-[11px] text-[#909cac] font-mono">Y: {captionYPercent}%</span>
                      </div>

                      {(!enableSubtitles || captionStyle === 'none') && (
                        <div className="p-2.5 rounded-[8px] bg-[#1d2125] border border-[#39414b] text-[#909cac] text-[11px] flex items-center gap-2">
                          <span>ℹ️</span>
                          <span>Subtitles are currently turned off for this clip. Enable subtitles above to customize positioning.</span>
                        </div>
                      )}

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Vertical Position Presets & Slider */}
                        <div>
                          <label className="block text-[11px] text-[#b9c0ca] font-medium mb-1.5">
                            Vertical Position (Presets & Slider)
                          </label>
                          <div className="flex gap-1.5 mb-2">
                            {[
                              { id: 'top', label: 'Top (15%)' },
                              { id: 'upper', label: 'Upper (30%)' },
                              { id: 'center', label: 'Center (50%)' },
                              { id: 'lower', label: 'Lower (72%)' },
                              { id: 'bottom', label: 'Bottom (86%)' },
                            ].map((pos) => (
                              <button
                                key={pos.id}
                                type="button"
                                onClick={() => handleCaptionPositionPreset(pos.id)}
                                disabled={isRendering || selectedClip.status === 'completed'}
                                className={`flex-1 py-1 px-1 text-[10px] font-semibold rounded-[6px] border transition-colors cursor-pointer ${
                                  captionPosition === pos.id
                                    ? 'bg-[#dd2222] text-white border-[#dd2222]'
                                    : 'bg-[#1d2125] text-[#909cac] border-[#39414b] hover:text-white'
                                }`}
                              >
                                {pos.label}
                              </button>
                            ))}
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] text-[#909cac]">Top</span>
                            <input
                              type="range"
                              min="10"
                              max="90"
                              disabled={isRendering || selectedClip.status === 'completed'}
                              value={captionYPercent}
                              onChange={(e) => {
                                setCaptionYPercent(parseInt(e.target.value, 10));
                                setCaptionPosition('custom');
                              }}
                              className="w-full accent-[#dd2222] cursor-pointer"
                            />
                            <span className="text-[10px] text-[#909cac]">Bottom</span>
                          </div>
                        </div>

                        {/* Horizontal Alignment */}
                        <div>
                          <label className="block text-[11px] text-[#b9c0ca] font-medium mb-1.5">
                            Horizontal Text Alignment
                          </label>
                          <div className="grid grid-cols-3 gap-2">
                            {[
                              { id: 'left', label: 'Left', icon: '⬅️' },
                              { id: 'center', label: 'Center', icon: '↔️' },
                              { id: 'right', label: 'Right', icon: '➡️' }
                            ].map((al) => (
                              <button
                                key={al.id}
                                type="button"
                                onClick={() => setCaptionAlign(al.id)}
                                disabled={isRendering || selectedClip.status === 'completed'}
                                className={`py-1.5 px-2 text-xs font-semibold rounded-[8px] border text-center transition-colors cursor-pointer flex items-center justify-center gap-1.5 ${
                                  captionAlign === al.id
                                    ? 'bg-[#360c0c] border-[#dd2222] text-[#fcf2f2]'
                                    : 'bg-[#1d2125] border-[#39414b] text-[#909cac] hover:text-white'
                                }`}
                              >
                                <span>{al.icon}</span>
                                <span>{al.label}</span>
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Panel 4: Video Editor: Custom Text Overlay Studio */}
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

                    {/* Panel 5: Subtitle Language Toggle & Transcript Editor */}
                    <div className="app-panel p-4 sm:p-5 space-y-3.5">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <h3 className="text-xs font-bold tracking-wider text-[#dd2222] uppercase flex items-center gap-1.5">
                          <span>🌐</span>
                          <span>Caption Language & Subtitle Editor</span>
                        </h3>
                        
                        {/* Language switcher pills */}
                        <div className="flex bg-[#1d2125] p-0.5 rounded-[8px] border border-[#39414b]">
                          <button
                            type="button"
                            onClick={() => handleToggleLanguage('original')}
                            disabled={isRendering || selectedClip.status === 'completed'}
                            className={`px-2.5 py-1 text-xs font-semibold rounded-[6px] transition-colors cursor-pointer ${
                              captionLanguage === 'original'
                                ? 'bg-[#dd2222] text-white'
                                : 'text-[#909cac] hover:text-white'
                            }`}
                          >
                            Original Speech
                          </button>

                          {hasHinglish && (
                            <button
                              type="button"
                              onClick={() => handleToggleLanguage('hinglish')}
                              disabled={isRendering || selectedClip.status === 'completed'}
                              className={`px-2.5 py-1 text-xs font-semibold rounded-[6px] transition-colors cursor-pointer ${
                                captionLanguage === 'hinglish'
                                  ? 'bg-[#dd2222] text-white'
                                  : 'text-[#909cac] hover:text-white'
                              }`}
                            >
                              Hinglish (Roman)
                            </button>
                          )}

                          {hasEnglish && (
                            <button
                              type="button"
                              onClick={() => handleToggleLanguage('english')}
                              disabled={isRendering || selectedClip.status === 'completed'}
                              className={`px-2.5 py-1 text-xs font-semibold rounded-[6px] transition-colors cursor-pointer ${
                                captionLanguage === 'english'
                                  ? 'bg-[#dd2222] text-white'
                                  : 'text-[#909cac] hover:text-white'
                              }`}
                            >
                              English Subtitles
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                        {editableTranscript.length === 0 ? (
                          <div className="text-center py-6 text-[#909cac] text-xs">
                            No transcript segment found for this timestamp range.
                          </div>
                        ) : (
                          editableTranscript.map((segment, idx) => (
                            <div key={idx} className="flex gap-2 items-center group">
                              <button
                                type="button"
                                onClick={() => handleJumpToTranscript(segment)}
                                title="Click to preview this subtitle line in player"
                                className="shrink-0 text-[10px] font-mono text-[#6e7d91] group-hover:text-[#dd2222] transition-colors w-14 text-right cursor-pointer flex items-center justify-end gap-1"
                              >
                                <span className="opacity-0 group-hover:opacity-100 text-[8px]">▶</span>
                                <span>{formatDuration(segment.start)}</span>
                              </button>
                              <input
                                type="text"
                                disabled={isRendering || selectedClip.status === 'completed'}
                                value={segment.text}
                                onFocus={() => handleJumpToTranscript(segment)}
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
