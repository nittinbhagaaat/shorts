'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { fetchWithSettings } from '@/lib/settings';

export default function YouTubeUploadModal({
  isOpen,
  onClose,
  clip,
  project,
  onUploadSuccess,
  onRequestRender,
  isRenderingParent = false,
}) {
  const [account, setAccount] = useState(null);
  const [isCheckingAccount, setIsCheckingAccount] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [uploadSuccess, setUploadSuccess] = useState(null);
  const [uploadProgressStep, setUploadProgressStep] = useState('');

  // Form states
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [hashtagsInput, setHashtagsInput] = useState('');
  const [privacyStatus, setPrivacyStatus] = useState('public');
  const [isScheduled, setIsScheduled] = useState(false);
  const [scheduleDateTime, setScheduleDateTime] = useState('');

  useEffect(() => {
    if (!isOpen) return;

    // Check connected YouTube account
    async function checkAccount() {
      setIsCheckingAccount(true);
      setUploadError('');
      setUploadSuccess(null);
      try {
        const res = await fetchWithSettings('/api/youtube/status');
        const data = await res.json();
        if (data.connected && data.account) {
          setAccount(data.account);
        } else {
          setAccount(null);
        }
      } catch (e) {
        console.error('Failed to fetch YouTube status:', e);
        setAccount(null);
      } finally {
        setIsCheckingAccount(false);
      }
    }

    checkAccount();

    // Populate initial form fields from clip
    if (clip) {
      let initialTitle = clip.youtubeTitle || clip.title || 'Viral Moment';
      if (!initialTitle.toLowerCase().includes('#shorts')) {
        initialTitle = `${initialTitle.trim()} #Shorts`;
      }
      setTitle(initialTitle);

      setDescription(clip.youtubeDescription || clip.description || '');

      const tags = clip.tags && clip.tags.length > 0
        ? clip.tags.join(', ')
        : 'shorts, youtube shorts, viral shorts, trending';
      setTagsInput(tags);

      const hashtags = clip.hashtags && clip.hashtags.length > 0
        ? clip.hashtags.join(' ')
        : '#Shorts #ViralShorts #Trending #Comedy';
      setHashtagsInput(hashtags);

      // Default schedule time: 3 hours in the future
      const future = new Date(Date.now() + 3 * 60 * 60 * 1000);
      future.setMinutes(Math.ceil(future.getMinutes() / 15) * 15);
      const isoLocal = new Date(future.getTime() - future.getTimezoneOffset() * 60000)
        .toISOString()
        .slice(0, 16);
      setScheduleDateTime(isoLocal);
      setIsScheduled(false);
      setPrivacyStatus('public');
    }
  }, [isOpen, clip?._id]);

  if (!isOpen || !clip) return null;

  const isRendered = Boolean(
    clip.status === 'completed' || clip.videoPathVertical || clip.videoPath
  );

  const handleUploadSubmit = async (e) => {
    e.preventDefault();
    if (!account) {
      setUploadError('Please connect your YouTube channel in Settings before uploading.');
      return;
    }

    if (!isRendered) {
      setUploadError(
        clip.purgedReason && clip.purgedReason !== 'none'
          ? 'Video files were purged to save server storage. Please close this modal and click "Rerender Video Short" first.'
          : 'Please render the vertical Short first so the MP4 video is ready for upload.'
      );
      return;
    }

    if (!title.trim()) {
      setUploadError('Video title is required.');
      return;
    }

    let finalPublishTime = null;
    if (isScheduled) {
      if (!scheduleDateTime) {
        setUploadError('Please select a date and time for scheduling.');
        return;
      }
      const dateObj = new Date(scheduleDateTime);
      if (isNaN(dateObj.getTime()) || dateObj.getTime() <= Date.now() + 60000) {
        setUploadError('Scheduled time must be at least a few minutes in the future.');
        return;
      }
      finalPublishTime = dateObj.toISOString();
    }

    setIsUploading(true);
    setUploadError('');
    setUploadSuccess(null);

    const steps = [
      'Verifying vertical 9:16 Short constraints...',
      'Authorizing with YouTube Data API v3...',
      'Streaming Short video to YouTube...',
      'Applying SEO metadata, tags & hashtags...',
      isScheduled ? 'Setting scheduled publication timer...' : 'Finalizing instant publication...',
    ];

    let stepIdx = 0;
    setUploadProgressStep(steps[0]);
    const stepInterval = setInterval(() => {
      stepIdx++;
      if (stepIdx < steps.length) {
        setUploadProgressStep(steps[stepIdx]);
      }
    }, 1800);

    try {
      const parsedTags = tagsInput
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);

      const parsedHashtags = hashtagsInput
        .split(/\s+/)
        .map((h) => (h.startsWith('#') ? h : `#${h}`))
        .filter((h) => h.length > 1);

      const payload = {
        clipId: clip._id,
        title: title.trim(),
        description: description.trim(),
        tags: parsedTags,
        hashtags: parsedHashtags,
        seoKeywords: clip.seoKeywords || [],
        privacyStatus: isScheduled ? 'private' : privacyStatus,
        scheduledPublishTime: finalPublishTime,
      };

      const res = await fetchWithSettings('/api/youtube/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      clearInterval(stepInterval);

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to upload Short to YouTube.');
      }

      setUploadSuccess(data);
      if (onUploadSuccess) {
        onUploadSuccess(data);
      }
    } catch (err) {
      clearInterval(stepInterval);
      console.error(err);
      setUploadError(err.message || 'An error occurred during YouTube upload.');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="app-panel w-full max-w-2xl max-h-[92vh] flex flex-col rounded-[14px] border border-[#39414b] shadow-2xl bg-[#23272d] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Top Header */}
        <div className="px-5 py-4 border-b border-[#39414b] flex items-center justify-between bg-[#2d3239] shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#dd2222] flex items-center justify-center text-white shadow-md">
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
              </svg>
            </div>
            <div>
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <span>Upload YouTube Short</span>
                <span className="px-2 py-0.5 rounded-full bg-[#dd2222]/20 border border-[#dd2222]/40 text-[#fca5a5] text-[10px] font-mono font-bold uppercase">
                  9:16 Vertical Only
                </span>
              </h2>
              <p className="text-[11px] text-[#909cac]">
                Publish directly or schedule viral Shorts with pre-optimized SEO tags & hashtags.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={isUploading}
            className="p-1.5 rounded-lg text-[#909cac] hover:text-white hover:bg-[#39414b] transition-colors cursor-pointer"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-5 overflow-y-auto space-y-4">
          
          {/* Connected YouTube Channel Card */}
          {isCheckingAccount ? (
            <div className="p-3 rounded-[10px] bg-[#1d2125] border border-[#39414b] text-xs text-[#909cac] flex items-center gap-2">
              <div className="w-3.5 h-3.5 rounded-full border-2 border-[#dd2222] border-t-transparent animate-spin"></div>
              <span>Checking connected YouTube channel...</span>
            </div>
          ) : account ? (
            <div className="p-3 rounded-[10px] bg-[#1d2125] border border-[#39414b] flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                {account.channelThumbnail ? (
                  <img
                    src={account.channelThumbnail}
                    alt={account.channelTitle}
                    className="w-9 h-9 rounded-full object-cover border border-[#dd2222]/50 shrink-0"
                  />
                ) : (
                  <div className="w-9 h-9 rounded-full bg-[#dd2222] flex items-center justify-center text-white font-bold text-xs shrink-0">
                    YT
                  </div>
                )}
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-xs text-white truncate">{account.channelTitle}</span>
                    <span className="w-2 h-2 rounded-full bg-[#22c55e] shrink-0" title="Connected"></span>
                  </div>
                  <p className="text-[10px] text-[#909cac] truncate">
                    {account.channelHandle || `Channel ID: ${account.channelId}`}
                  </p>
                </div>
              </div>

              <Link
                href="/settings"
                target="_blank"
                className="text-[10px] text-[#909cac] hover:text-white px-2.5 py-1 rounded bg-[#2d3239] border border-[#39414b] transition-colors shrink-0"
              >
                Switch Channel
              </Link>
            </div>
          ) : (
            <div className="p-4 rounded-[10px] bg-[#360c0c] border border-[#731111] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h4 className="font-bold text-xs text-[#fca5a5]">No YouTube Channel Connected</h4>
                <p className="text-[11px] text-[#909cac] mt-0.5">
                  Connect your Google YouTube account to enable 1-click publishing & scheduling.
                </p>
              </div>
              <Link
                href="/settings"
                className="px-3.5 py-1.5 bg-[#dd2222] hover:bg-[#b91c1c] text-white text-xs font-bold rounded-[8px] transition-colors shrink-0 text-center"
              >
                Connect in Settings
              </Link>
            </div>
          )}

          {/* Success State Screen */}
          {uploadSuccess ? (
            <div className="p-6 rounded-[12px] bg-[#1d2125] border border-[#22c55e]/40 text-center space-y-4">
              <div className="w-14 h-14 rounded-full bg-[#22c55e]/15 border border-[#22c55e]/30 text-[#22c55e] flex items-center justify-center mx-auto">
                <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
              </div>

              <div>
                <h3 className="text-base font-bold text-white mb-1">
                  {uploadSuccess.isScheduled ? 'Short Successfully Scheduled!' : 'Short Successfully Uploaded!'}
                </h3>
                <p className="text-xs text-[#909cac] max-w-md mx-auto">
                  {uploadSuccess.isScheduled
                    ? `Your Short has been scheduled on ${uploadSuccess.upload?.channelTitle || 'YouTube'}. YouTube will hold it private until your chosen publish time.`
                    : `Your Short has been uploaded directly to ${uploadSuccess.upload?.channelTitle || 'your YouTube channel'}!`}
                </p>
              </div>

              {/* Storage Cleaned Alert Banner */}
              <div className="p-3 rounded-[10px] bg-emerald-950/40 border border-emerald-500/30 text-xs text-emerald-200 flex items-center justify-center gap-2">
                <svg className="w-4 h-4 text-emerald-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span>💾 <strong>Server Storage Cleaned:</strong> Rendered video files were automatically purged from the server to save disk space.</span>
              </div>

              {uploadSuccess.shortUrl && (
                <div className="pt-2">
                  <a
                    href={uploadSuccess.shortUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#dd2222] hover:bg-[#b91c1c] text-white rounded-[10px] text-xs font-bold uppercase tracking-wider shadow-lg transition-transform hover:scale-105"
                  >
                    <span>Watch Short on YouTube</span>
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </a>
                </div>
              )}

              <div className="pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-1.5 btn-secondary text-xs"
                >
                  Done
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleUploadSubmit} className="space-y-4">
              
              {/* Not Rendered Warning Banner */}
              {!isRendered && (
                <div className="p-3.5 rounded-[10px] bg-[#360c0c] border border-[#dd2222]/40 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 text-xs text-[#fca5a5]">
                    <svg className="w-4 h-4 shrink-0 text-[#dd2222]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <span>
                      {clip.purgedReason === 'uploaded_to_youtube'
                        ? 'Rendered video was deleted after YouTube upload. Please re-render if you wish to upload again.'
                        : clip.purgedReason === 'expired_10min'
                        ? 'Video expired after 10 minutes and was deleted to save server storage. Please re-render first.'
                        : 'This Short must be rendered in 9:16 vertical format before uploading.'}
                    </span>
                  </div>
                  {onRequestRender && (
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onRequestRender();
                      }}
                      disabled={isRenderingParent}
                      className="px-3 py-1 bg-[#dd2222] hover:bg-[#b91c1c] text-white text-xs font-bold rounded-[8px] transition-colors shrink-0 cursor-pointer disabled:opacity-50"
                    >
                      {isRenderingParent ? 'Rendering...' : clip.purgedReason && clip.purgedReason !== 'none' ? 'Rerender Now' : 'Render Now'}
                    </button>
                  )}
                </div>
              )}

              {/* Error Banner */}
              {uploadError && (
                <div className="p-3 rounded-[10px] bg-[#ef4444]/15 border border-[#ef4444]/30 text-[#fca5a5] text-xs font-medium flex items-center gap-2">
                  <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>{uploadError}</span>
                </div>
              )}

              {/* Title Field */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-white flex items-center gap-1.5">
                    <span>Short Title</span>
                    <span className="text-[10px] text-[#f87171] font-normal">(must contain #Shorts)</span>
                  </label>
                  <span className={`text-[10px] font-mono ${title.length > 90 ? 'text-[#f59e0b]' : 'text-[#909cac]'}`}>
                    {title.length} / 100
                  </span>
                </div>
                <input
                  type="text"
                  required
                  maxLength={100}
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  disabled={isUploading}
                  placeholder="When the joke lands too hard! 😂 #Shorts"
                  className="w-full px-3 py-2 app-input text-xs font-medium text-white"
                />
              </div>

              {/* Description Field */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-white flex items-center gap-1.5">
                    <span>Description & SEO Keywords</span>
                    <span className="text-[10px] text-[#22c55e] font-normal">✓ Auto-Optimized</span>
                  </label>
                  <span className="text-[10px] text-[#909cac] font-mono">
                    {description.length} chars
                  </span>
                </div>
                <textarea
                  rows={5}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  disabled={isUploading}
                  placeholder="Tell viewers about this Short, with hook lines and keyword tags..."
                  className="w-full px-3 py-2 app-input text-xs font-mono leading-relaxed"
                />
              </div>

              {/* Hashtags & Tags 2-Column Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Hashtags */}
                <div>
                  <label className="block text-xs font-bold text-white mb-1">
                    Hashtags <span className="text-[10px] text-[#909cac] font-normal">(space-separated)</span>
                  </label>
                  <input
                    type="text"
                    value={hashtagsInput}
                    onChange={(e) => setHashtagsInput(e.target.value)}
                    disabled={isUploading}
                    placeholder="#Shorts #Viral #Comedy"
                    className="w-full px-3 py-1.5 app-input text-xs"
                  />
                  <div className="flex flex-wrap gap-1 mt-1.5 max-h-12 overflow-y-auto">
                    {hashtagsInput.split(/\s+/).filter(Boolean).slice(0, 6).map((tag, i) => (
                      <span key={i} className="text-[9px] px-1.5 py-0.5 rounded bg-[#1d2125] text-[#dd2222] font-mono border border-[#39414b]">
                        {tag.startsWith('#') ? tag : `#${tag}`}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Search Tags */}
                <div>
                  <label className="block text-xs font-bold text-white mb-1">
                    Search Tags <span className="text-[10px] text-[#909cac] font-normal">(comma-separated)</span>
                  </label>
                  <input
                    type="text"
                    value={tagsInput}
                    onChange={(e) => setTagsInput(e.target.value)}
                    disabled={isUploading}
                    placeholder="shorts, funny, comedy, best clips"
                    className="w-full px-3 py-1.5 app-input text-xs"
                  />
                  <p className="text-[10px] text-[#909cac] mt-1">
                    Used by YouTube algorithm to categorize and recommend your Short.
                  </p>
                </div>
              </div>

              {/* Publishing Controls: Privacy & Scheduling */}
              <div className="p-3.5 rounded-[10px] bg-[#1d2125] border border-[#39414b] space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  
                  {/* Mode: Instant vs Scheduled */}
                  <div>
                    <label className="block text-xs font-bold text-white mb-1.5">
                      Publishing Mode
                    </label>
                    <div className="flex bg-[#2d3239] p-0.5 rounded-[8px] border border-[#39414b]">
                      <button
                        type="button"
                        onClick={() => setIsScheduled(false)}
                        className={`px-3 py-1 text-xs font-semibold rounded-[6px] transition-colors cursor-pointer ${
                          !isScheduled ? 'bg-[#dd2222] text-white' : 'text-[#909cac] hover:text-white'
                        }`}
                      >
                        🚀 Upload Now
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsScheduled(true)}
                        className={`px-3 py-1 text-xs font-semibold rounded-[6px] transition-colors cursor-pointer ${
                          isScheduled ? 'bg-[#dd2222] text-white' : 'text-[#909cac] hover:text-white'
                        }`}
                      >
                        🕒 Schedule
                      </button>
                    </div>
                  </div>

                  {/* Privacy Status */}
                  <div>
                    <label className="block text-xs font-bold text-white mb-1.5">
                      Privacy Status
                    </label>
                    {isScheduled ? (
                      <span className="text-[11px] text-[#f59e0b] bg-[#360c0c] px-2.5 py-1 rounded-[6px] border border-[#731111] inline-block font-medium">
                        Private until scheduled time
                      </span>
                    ) : (
                      <select
                        value={privacyStatus}
                        onChange={(e) => setPrivacyStatus(e.target.value)}
                        disabled={isUploading}
                        className="px-3 py-1.5 app-input text-xs font-medium"
                      >
                        <option value="public">🌐 Public (Immediate)</option>
                        <option value="unlisted">🔗 Unlisted (Link only)</option>
                        <option value="private">🔒 Private (Hidden)</option>
                      </select>
                    )}
                  </div>

                </div>

                {/* Scheduling Datetime Picker */}
                {isScheduled && (
                  <div className="pt-2 border-t border-[#39414b] flex flex-col sm:flex-row sm:items-center gap-3">
                    <div className="flex-1">
                      <label className="block text-xs font-bold text-white mb-1">
                        Select Publish Date & Time (Your Local Time)
                      </label>
                      <input
                        type="datetime-local"
                        required={isScheduled}
                        value={scheduleDateTime}
                        onChange={(e) => setScheduleDateTime(e.target.value)}
                        disabled={isUploading}
                        className="w-full px-3 py-1.5 app-input text-xs font-mono"
                      />
                    </div>
                    <div className="text-[11px] text-[#909cac] max-w-xs leading-snug">
                      YouTube will store the video privately and automatically flip it to public at your selected time.
                    </div>
                  </div>
                )}
              </div>

              {/* Upload Progress Status Overlay */}
              {isUploading && (
                <div className="p-3.5 rounded-[10px] bg-[#1d2125] border border-[#dd2222]/40 text-center space-y-2">
                  <div className="flex items-center justify-center gap-2 text-xs font-bold text-white">
                    <div className="w-4 h-4 rounded-full border-2 border-[#dd2222] border-t-transparent animate-spin"></div>
                    <span>{uploadProgressStep}</span>
                  </div>
                  <div className="w-full bg-[#2d3239] h-1.5 rounded-full overflow-hidden">
                    <div className="bg-[#dd2222] h-full w-2/3 animate-pulse"></div>
                  </div>
                  <p className="text-[10px] text-[#909cac]">
                    Please keep this window open while the video uploads directly to YouTube.
                  </p>
                </div>
              )}

              {/* Action Buttons */}
              <div className="pt-3 border-t border-[#39414b] flex items-center justify-end gap-2.5 shrink-0">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={isUploading}
                  className="px-4 py-2 btn-secondary text-xs cursor-pointer disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={isUploading || !account || !isRendered}
                  className="px-5 py-2.5 bg-[#dd2222] hover:bg-[#b91c1c] text-white text-xs font-bold uppercase tracking-wider rounded-[8px] flex items-center gap-2 shadow-lg transition-transform hover:scale-105 cursor-pointer disabled:opacity-50 disabled:hover:scale-100"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                  </svg>
                  <span>
                    {isUploading
                      ? 'Publishing Short...'
                      : isScheduled
                      ? 'Schedule YouTube Short'
                      : 'Publish Short to YouTube'}
                  </span>
                </button>
              </div>

            </form>
          )}

        </div>

      </div>
    </div>
  );
}
