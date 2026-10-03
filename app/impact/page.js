'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import {
  WORLD_GRID_DOTS,
  COUNTRY_STATS,
  TIER_CONFIG,
  MAP_COLS,
  MAP_ROWS,
  getCountryDetails,
} from '@/lib/impactMapData';

// Map timezone heuristics to countries
function detectCountryFromTimezone() {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
    if (tz.includes('Calcutta') || tz.includes('Kolkata')) return 'India';
    if (
      tz.includes('New_York') ||
      tz.includes('Chicago') ||
      tz.includes('Los_Angeles') ||
      tz.includes('Denver') ||
      tz.includes('Phoenix') ||
      tz.includes('America/Anchorage') ||
      tz.includes('America/Detroit') ||
      tz.includes('America/Indiana')
    ) return 'United States';
    if (tz.includes('Toronto') || tz.includes('Vancouver') || tz.includes('Montreal') || tz.includes('Edmonton') || tz.includes('Winnipeg')) return 'Canada';
    if (tz.includes('London')) return 'United Kingdom';
    if (tz.includes('Berlin')) return 'Germany';
    if (tz.includes('Paris')) return 'France';
    if (tz.includes('Sydney') || tz.includes('Melbourne') || tz.includes('Brisbane') || tz.includes('Perth') || tz.includes('Adelaide')) return 'Australia';
    if (tz.includes('Sao_Paulo')) return 'Brazil';
    if (tz.includes('Tokyo')) return 'Japan';
    if (tz.includes('Seoul')) return 'South Korea';
    if (tz.includes('Singapore')) return 'Singapore';
    if (tz.includes('Dubai')) return 'United Arab Emirates';
    if (tz.includes('Madrid')) return 'Spain';
    if (tz.includes('Rome')) return 'Italy';
    if (tz.includes('Amsterdam')) return 'Netherlands';
    if (tz.includes('Johannesburg')) return 'South Africa';
    if (tz.includes('Mexico_City')) return 'Mexico';
    if (tz.includes('Buenos_Aires')) return 'Argentina';
    if (tz.includes('Jakarta')) return 'Indonesia';
    if (tz.includes('Manila')) return 'Philippines';
    if (tz.includes('Karachi')) return 'Pakistan';
    if (tz.includes('Cairo')) return 'Egypt';
    if (tz.includes('Lagos')) return 'Nigeria';
    if (tz.includes('Nairobi')) return 'Kenya';
    if (tz.includes('Warsaw')) return 'Poland';
    if (tz.includes('Stockholm')) return 'Sweden';
    if (tz.includes('Auckland')) return 'New Zealand';
    if (tz.includes('Bangkok')) return 'Thailand';
    if (tz.includes('Kuala_Lumpur')) return 'Malaysia';
    if (tz.includes('Bogota')) return 'Colombia';
    if (tz.includes('Santiago')) return 'Chile';
    if (tz.includes('Lima')) return 'Peru';
    if (tz.includes('Casablanca')) return 'Morocco';
    if (tz.includes('Dublin')) return 'Ireland';
    if (tz.includes('Zurich')) return 'Switzerland';
    if (tz.includes('Vienna')) return 'Austria';
    if (tz.includes('Brussels')) return 'Belgium';
    if (tz.includes('Athens')) return 'Greece';
    if (tz.includes('Lisbon')) return 'Portugal';
    if (tz.includes('Helsinki')) return 'Finland';
    if (tz.includes('Oslo')) return 'Norway';
    if (tz.includes('Copenhagen')) return 'Denmark';
  } catch {}
  return 'India';
}

export default function ImpactPage() {
  const { user } = useAuth();
  const [statsData, setStatsData] = useState({
    totalClips: 3842100,
    totalCreators: 856400,
    totalProjects: 412000,
    hoursSaved: 140877,
    countriesLitUp: 92,
  });

  const [userCountry, setUserCountry] = useState('India');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTierFilter, setActiveTierFilter] = useState('all'); // 'all', 'hotspots', 'steady', 'few', 'my-location'
  const [selectedCountry, setSelectedCountry] = useState(null);
  const [hoveredDot, setHoveredDot] = useState(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const mapContainerRef = useRef(null);

  // Live activity feed simulation
  const [activityFeed, setActivityFeed] = useState([
    { id: 1, text: 'Creator in Bengaluru clipped 6 viral podcasts with Hormozi captions', time: 'Just now', country: 'India', flag: '🇮🇳' },
    { id: 2, text: 'Creator in Los Angeles converted 2h stream to 14 TikTok shorts', time: '42s ago', country: 'United States', flag: '🇺🇸' },
    { id: 3, text: 'Creator in Berlin rendered 8 clips with blurred 9:16 layout', time: '1m ago', country: 'Germany', flag: '🇩🇪' },
    { id: 4, text: 'Creator in London connected YouTube channel for 1-click publishing', time: '2m ago', country: 'United Kingdom', flag: '🇬🇧' },
    { id: 5, text: 'Creator in São Paulo generated subtitles in Portuguese & English', time: '3m ago', country: 'Brazil', flag: '🇧🇷' },
    { id: 6, text: 'Creator in Tokyo exported 5 gaming highlights in 1080p vertical', time: '4m ago', country: 'Japan', flag: '🇯🇵' },
  ]);

  // Fetch real database metrics and location from API
  useEffect(() => {
    // Initial timezone heuristic
    const localCountry = detectCountryFromTimezone();
    if (localCountry) {
      setUserCountry(localCountry);
      setSelectedCountry(getCountryDetails(localCountry));
    }

    async function loadImpactData() {
      try {
        const res = await fetch('/api/impact');
        if (res.ok) {
          const data = await res.json();
          if (data.stats) {
            setStatsData(data.stats);
          }
          if (data.userLocation?.country) {
            setUserCountry(data.userLocation.country);
            setSelectedCountry(getCountryDetails(data.userLocation.country));
          }
        }
      } catch {
        // Keep initial fallback
      }
    }
    loadImpactData();

    // Rotate live activity feed periodically
    const feedInterval = setInterval(() => {
      const candidates = [
        { text: 'Creator in Toronto extracted 8 viral moments with AI scoring', country: 'Canada', flag: '🇨🇦' },
        { text: 'Creator in Sydney clipped 10 interviews into YouTube Shorts', country: 'Australia', flag: '🇦🇺' },
        { text: 'Creator in Paris rendered 5 clips with MrBeast energy style', country: 'France', flag: '🇫🇷' },
        { text: 'Creator in Mumbai generated 12 shorts with auto Hindi subtitles', country: 'India', flag: '🇮🇳' },
        { text: 'Creator in Austin saved 4.5 hours of manual video editing', country: 'United States', flag: '🇺🇸' },
        { text: 'Creator in Seoul produced 7 vertical shorts in 9:16 layout', country: 'South Korea', flag: '🇰🇷' },
        { text: 'Creator in Cape Town converted podcast episode into TikTok series', country: 'South Africa', flag: '🇿🇦' },
      ];
      const nextItem = candidates[Math.floor(Math.random() * candidates.length)];
      setActivityFeed((prev) => [
        { id: Date.now(), text: nextItem.text, time: 'Just now', country: nextItem.country, flag: nextItem.flag },
        ...prev.slice(0, 5),
      ]);
    }, 7000);

    return () => clearInterval(feedInterval);
  }, []);

  // Filtered dots
  const filteredDots = useMemo(() => {
    return WORLD_GRID_DOTS.map((dot) => {
      let isDimmed = false;
      const countryMatch = searchQuery
        ? dot.country.toLowerCase().includes(searchQuery.toLowerCase())
        : true;

      if (!countryMatch) {
        isDimmed = true;
      } else if (activeTierFilter === 'hotspots') {
        if (dot.tier !== 3) isDimmed = true;
      } else if (activeTierFilter === 'steady') {
        if (dot.tier !== 2) isDimmed = true;
      } else if (activeTierFilter === 'few') {
        if (dot.tier !== 1) isDimmed = true;
      } else if (activeTierFilter === 'my-location') {
        if (dot.country !== userCountry) isDimmed = true;
      }

      const isUserLocation = dot.country === userCountry;
      const isSelected = selectedCountry?.name === dot.country;

      return {
        ...dot,
        isDimmed,
        isUserLocation,
        isSelected,
      };
    });
  }, [searchQuery, activeTierFilter, userCountry, selectedCountry]);

  // Center coordinate of user's country for the "You are here" beacon
  const userCountryBeacon = useMemo(() => {
    const userDots = WORLD_GRID_DOTS.filter((d) => d.country === userCountry);
    if (!userDots.length) return null;
    const avgX = userDots.reduce((acc, d) => acc + d.x, 0) / userDots.length;
    const avgY = userDots.reduce((acc, d) => acc + d.y, 0) / userDots.length;
    return {
      x: avgX * 11 + 24,
      y: avgY * 11 + 24,
      country: userCountry,
      details: getCountryDetails(userCountry),
    };
  }, [userCountry]);

  // Top 12 countries for the leaderboard cards
  const topHubs = useMemo(() => {
    return Object.entries(COUNTRY_STATS)
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.clips - a.clips)
      .slice(0, 12);
  }, []);

  const handleDotMouseEnter = (dot, e) => {
    setHoveredDot(dot);
    if (mapContainerRef.current) {
      const rect = mapContainerRef.current.getBoundingClientRect();
      setTooltipPos({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      });
    }
  };

  const handleDotMouseMove = (e) => {
    if (mapContainerRef.current) {
      const rect = mapContainerRef.current.getBoundingClientRect();
      setTooltipPos({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      });
    }
  };

  const handleDotClick = (dot) => {
    const details = getCountryDetails(dot.country);
    setSelectedCountry(details);
  };

  return (
    <div className="min-h-screen bg-[#0b0f14] text-[#f6f7f8] flex flex-col font-sans selection:bg-[#dd2222] selection:text-white">
      {/* ======================================================== */}
      {/* HEADER / NAVIGATION                                      */}
      {/* ======================================================== */}
      <header className="sticky top-0 z-50 backdrop-blur-md bg-[#11161d]/90 border-b border-[#202731]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 sm:h-20 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 group">
            <img
              src="/logo.png"
              alt="clip.studio logo"
              className="w-9 h-9 sm:w-10 sm:h-10 rounded-[10px] object-cover border border-[#dd2222]/50 shadow-md group-hover:scale-105 transition-transform"
            />
            <div>
              <span className="font-extrabold text-lg sm:text-xl text-white tracking-tight">
                clip<span className="text-[#dd2222]">.studio</span>
              </span>
              <span className="hidden sm:inline-block ml-2 px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-[#360c0c] text-[#dd2222] border border-[#731111]/50">
                100% Free
              </span>
            </div>
          </Link>

          <nav className="hidden md:flex items-center gap-8 text-xs font-semibold text-[#9ca3af]">
            <Link href="/" className="hover:text-white transition-colors">Home</Link>
            <Link href="/#features" className="hover:text-white transition-colors">Features</Link>
            <Link href="/#subtitles" className="hover:text-white transition-colors">Subtitles</Link>
            <Link href="/#how-it-works" className="hover:text-white transition-colors">How It Works</Link>
            <Link href="/impact" className="text-white font-bold flex items-center gap-1.5">
              <span>Our Impact</span>
              <span className="w-1.5 h-1.5 rounded-full bg-[#dd2222] animate-pulse"></span>
            </Link>
          </nav>

          <div className="flex items-center gap-3">
            {user ? (
              <Link
                href="/dashboard"
                className="px-4 py-2 sm:px-5 sm:py-2.5 btn-primary text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-[#dd2222]/20"
              >
                <span>Studio Dashboard</span>
                <span>→</span>
              </Link>
            ) : (
              <div className="flex items-center gap-2.5">
                <Link
                  href="/login"
                  className="px-3.5 py-2 text-xs font-semibold text-[#b9c0ca] hover:text-white transition-colors"
                >
                  Sign In
                </Link>
                <Link
                  href="/dashboard"
                  className="px-4 py-2 sm:px-5 sm:py-2.5 btn-primary text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-[#dd2222]/20"
                >
                  <span>Start Free</span>
                  <span>→</span>
                </Link>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* ======================================================== */}
      {/* MAIN CONTAINER                                           */}
      {/* ======================================================== */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 sm:py-12 flex flex-col gap-10">
        {/* Top Hero Section */}
        <section className="flex flex-col items-center text-center max-w-3xl mx-auto gap-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#18212c] border border-[#2a3749] text-[11px] font-bold text-[#b9c0ca] uppercase tracking-wider">
            <span className="w-2 h-2 rounded-full bg-[#22c55e] animate-ping"></span>
            <span>Real-Time Global Impact</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight leading-tight">
            Our Impact Across The World
          </h1>

          <p className="text-sm sm:text-base text-[#9aa4b2] leading-relaxed">
            See how creators and editors worldwide transform longform YouTube videos into high-retention viral shorts.
            Darker dots denote bustling creator hotspots generating high volume daily.
          </p>

          {/* User Location Callout Badge */}
          {userCountryBeacon && (
            <div className="mt-2 inline-flex items-center gap-2.5 px-4 py-2 rounded-xl bg-[#162230] border border-[#2b3d54] text-xs text-[#e1e7f0] shadow-md">
              <span className="text-base">{userCountryBeacon.details?.flag || '📍'}</span>
              <span>
                Detected location: <strong className="text-white font-bold">{userCountry}</strong>
              </span>
              <span className="text-[#64748b]">•</span>
              <span className="text-[#f97316] font-semibold">
                {userCountryBeacon.details?.label || 'A steady stream'}
              </span>
              <button
                onClick={() => {
                  setActiveTierFilter('my-location');
                  setSelectedCountry(userCountryBeacon.details);
                }}
                className="ml-1 text-[11px] underline text-[#f8caa1] hover:text-white transition-colors"
              >
                Highlight on map
              </button>
            </div>
          )}
        </section>

        {/* Global Impact Key Stat Cards */}
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5">
          <div className="bg-[#121720] border border-[#212936] rounded-2xl p-4 sm:p-5 flex flex-col gap-1 shadow-sm hover:border-[#374457] transition-colors">
            <div className="text-xs font-semibold text-[#8b97a8] uppercase tracking-wider">Clips Rendered</div>
            <div className="text-2xl sm:text-3xl font-black text-white">
              {statsData.totalClips.toLocaleString()}+
            </div>
            <div className="text-[11px] text-[#22c55e] font-medium flex items-center gap-1">
              <span>↑ 100% Free</span>
              <span className="text-[#64748b]">No Watermarks</span>
            </div>
          </div>

          <div className="bg-[#121720] border border-[#212936] rounded-2xl p-4 sm:p-5 flex flex-col gap-1 shadow-sm hover:border-[#374457] transition-colors">
            <div className="text-xs font-semibold text-[#8b97a8] uppercase tracking-wider">Countries Lit Up</div>
            <div className="text-2xl sm:text-3xl font-black text-[#ea7635]">
              {statsData.countriesLitUp}+
            </div>
            <div className="text-[11px] text-[#9aa4b2]">Across 6 Continents</div>
          </div>

          <div className="bg-[#121720] border border-[#212936] rounded-2xl p-4 sm:p-5 flex flex-col gap-1 shadow-sm hover:border-[#374457] transition-colors">
            <div className="text-xs font-semibold text-[#8b97a8] uppercase tracking-wider">Editing Hours Saved</div>
            <div className="text-2xl sm:text-3xl font-black text-[#f8caa1]">
              {statsData.hoursSaved.toLocaleString()}+ hrs
            </div>
            <div className="text-[11px] text-[#9aa4b2]">AI Clip Detection</div>
          </div>

          <div className="bg-[#121720] border border-[#212936] rounded-2xl p-4 sm:p-5 flex flex-col gap-1 shadow-sm hover:border-[#374457] transition-colors">
            <div className="text-xs font-semibold text-[#8b97a8] uppercase tracking-wider">Creators Empowered</div>
            <div className="text-2xl sm:text-3xl font-black text-white">
              {statsData.totalCreators.toLocaleString()}+
            </div>
            <div className="text-[11px] text-[#9aa4b2]">Worldwide Community</div>
          </div>
        </section>

        {/* ======================================================== */}
        {/* WORLD MAP SECTION - EXACT REFERENCE GITHUB GRID DESIGN  */}
        {/* ======================================================== */}
        <section className="flex flex-col gap-4">
          {/* Controls Bar */}
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
            {/* Search Input */}
            <div className="relative flex-1 max-w-sm">
              <svg
                className="w-4 h-4 text-[#6e7d91] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search country (e.g. India, United States)..."
                className="w-full bg-[#111720] border border-[#232d3d] focus:border-[#dd2222] rounded-xl pl-9 pr-8 py-2 text-xs text-white placeholder-[#606d80] outline-none transition-colors"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#808d9e] hover:text-white"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 text-xs">
              <button
                onClick={() => setActiveTierFilter('all')}
                className={`px-3 py-1.5 rounded-lg font-semibold transition-all whitespace-nowrap ${
                  activeTierFilter === 'all'
                    ? 'bg-white text-black font-bold'
                    : 'bg-[#151c27] text-[#9aa4b2] hover:text-white border border-[#253041]'
                }`}
              >
                All Dots
              </button>
              <button
                onClick={() => setActiveTierFilter('hotspots')}
                className={`px-3 py-1.5 rounded-lg font-semibold transition-all flex items-center gap-1.5 whitespace-nowrap ${
                  activeTierFilter === 'hotspots'
                    ? 'bg-[#b83a1b] text-white font-bold'
                    : 'bg-[#151c27] text-[#9aa4b2] hover:text-white border border-[#253041]'
                }`}
              >
                <span className="w-2.5 h-2.5 rounded-sm bg-[#b83a1b]"></span>
                <span>Hotspots</span>
              </button>
              <button
                onClick={() => setActiveTierFilter('steady')}
                className={`px-3 py-1.5 rounded-lg font-semibold transition-all flex items-center gap-1.5 whitespace-nowrap ${
                  activeTierFilter === 'steady'
                    ? 'bg-[#ea7635] text-white font-bold'
                    : 'bg-[#151c27] text-[#9aa4b2] hover:text-white border border-[#253041]'
                }`}
              >
                <span className="w-2.5 h-2.5 rounded-sm bg-[#ea7635]"></span>
                <span>Steady Stream</span>
              </button>
              <button
                onClick={() => setActiveTierFilter('few')}
                className={`px-3 py-1.5 rounded-lg font-semibold transition-all flex items-center gap-1.5 whitespace-nowrap ${
                  activeTierFilter === 'few'
                    ? 'bg-[#f8caa1] text-black font-bold'
                    : 'bg-[#151c27] text-[#9aa4b2] hover:text-white border border-[#253041]'
                }`}
              >
                <span className="w-2.5 h-2.5 rounded-sm bg-[#f8caa1]"></span>
                <span>A Few Users</span>
              </button>
              <button
                onClick={() => {
                  setActiveTierFilter('my-location');
                  if (userCountryBeacon?.details) {
                    setSelectedCountry(userCountryBeacon.details);
                  }
                }}
                className={`px-3 py-1.5 rounded-lg font-semibold transition-all flex items-center gap-1.5 whitespace-nowrap ${
                  activeTierFilter === 'my-location'
                    ? 'bg-[#dd2222] text-white font-bold'
                    : 'bg-[#151c27] text-[#9aa4b2] hover:text-white border border-[#253041]'
                }`}
              >
                <span>📍 My Location</span>
              </button>
            </div>
          </div>

          {/* The World Map Card */}
          <div
            ref={mapContainerRef}
            onMouseMove={handleDotMouseMove}
            onMouseLeave={() => setHoveredDot(null)}
            className="relative bg-[#080d11] border border-[#1a232e] rounded-3xl p-4 sm:p-7 shadow-2xl overflow-hidden flex flex-col gap-6"
          >
            {/* SVG Grid Map */}
            <div className="w-full overflow-x-auto pb-2">
              <svg
                viewBox="0 0 865 440"
                className="w-full min-w-[700px] h-auto select-none transition-all"
                style={{ filter: 'drop-shadow(0 4px 20px rgba(0,0,0,0.5))' }}
              >
                <defs>
                  {/* Subtle radial glow under intense hotspots */}
                  <radialGradient id="hotspotGlow" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor="#b83a1b" stopOpacity="0.3" />
                    <stop offset="100%" stopColor="#080d11" stopOpacity="0" />
                  </radialGradient>
                </defs>

                {/* Background glow behind India */}
                <ellipse cx="605" cy="180" rx="40" ry="40" fill="url(#hotspotGlow)" />
                {/* Background glow behind US */}
                <ellipse cx="180" cy="120" rx="60" ry="45" fill="url(#hotspotGlow)" />

                {/* Render All 908 Dots */}
                <g>
                  {filteredDots.map((dot, idx) => {
                    const tierConf = TIER_CONFIG[dot.tier] || TIER_CONFIG[0];
                    const cx = dot.x * 11 + 24;
                    const cy = dot.y * 11 + 24;
                    const isHovered = hoveredDot?.x === dot.x && hoveredDot?.y === dot.y;
                    const isSameCountryAsHovered = hoveredDot && hoveredDot.country === dot.country;

                    let fill = tierConf.color;
                    let stroke = 'transparent';
                    let strokeWidth = 0;
                    let opacity = 1;

                    if (dot.isDimmed) {
                      opacity = 0.15;
                    }

                    if (dot.isUserLocation && activeTierFilter === 'my-location') {
                      stroke = '#ffffff';
                      strokeWidth = 1.2;
                    }

                    if (isSameCountryAsHovered) {
                      stroke = '#ffffff';
                      strokeWidth = 1;
                      fill = tierConf.hoverColor;
                    }

                    if (isHovered) {
                      fill = '#ffffff';
                      stroke = '#dd2222';
                      strokeWidth = 1.5;
                    }

                    return (
                      <rect
                        key={`${dot.x}-${dot.y}-${idx}`}
                        x={cx - 3.8}
                        y={cy - 3.8}
                        width={7.6}
                        height={7.6}
                        rx={1.6}
                        fill={fill}
                        stroke={stroke}
                        strokeWidth={strokeWidth}
                        opacity={opacity}
                        className="cursor-pointer transition-all duration-150"
                        onMouseEnter={(e) => handleDotMouseEnter(dot, e)}
                        onClick={() => handleDotClick(dot)}
                      />
                    );
                  })}
                </g>

                {/* Animated Pulsing Beacon for User's Detected Location */}
                {userCountryBeacon && !filteredDots.find((d) => d.country === userCountry)?.isDimmed && (
                  <g pointerEvents="none">
                    {/* Outer ripple ring */}
                    <circle
                      cx={userCountryBeacon.x}
                      cy={userCountryBeacon.y}
                      r="10"
                      fill="none"
                      stroke="#dd2222"
                      strokeWidth="1.5"
                      opacity="0.8"
                    >
                      <animate
                        attributeName="r"
                        values="6; 22; 6"
                        dur="2.5s"
                        repeatCount="indefinite"
                      />
                      <animate
                        attributeName="opacity"
                        values="0.9; 0; 0.9"
                        dur="2.5s"
                        repeatCount="indefinite"
                      />
                    </circle>

                    {/* Secondary ripple */}
                    <circle
                      cx={userCountryBeacon.x}
                      cy={userCountryBeacon.y}
                      r="6"
                      fill="none"
                      stroke="#ea7635"
                      strokeWidth="1.2"
                      opacity="0.6"
                    >
                      <animate
                        attributeName="r"
                        values="4; 16; 4"
                        dur="2.5s"
                        begin="0.8s"
                        repeatCount="indefinite"
                      />
                      <animate
                        attributeName="opacity"
                        values="0.8; 0; 0.8"
                        dur="2.5s"
                        begin="0.8s"
                        repeatCount="indefinite"
                      />
                    </circle>

                    {/* Center glowing core */}
                    <circle
                      cx={userCountryBeacon.x}
                      cy={userCountryBeacon.y}
                      r="3.2"
                      fill="#ffffff"
                      stroke="#dd2222"
                      strokeWidth="1.5"
                    />

                    {/* Floating Callout Pin */}
                    <g transform={`translate(${userCountryBeacon.x - 38}, ${userCountryBeacon.y - 28})`}>
                      <rect
                        width="76"
                        height="20"
                        rx="5"
                        fill="#121720"
                        stroke="#dd2222"
                        strokeWidth="1"
                        filter="drop-shadow(0 2px 5px rgba(0,0,0,0.7))"
                      />
                      <text
                        x="38"
                        y="13"
                        textAnchor="middle"
                        fill="#ffffff"
                        fontSize="9"
                        fontWeight="bold"
                        fontFamily="sans-serif"
                      >
                        📍 You are here
                      </text>
                    </g>
                  </g>
                )}
              </svg>
            </div>

            {/* Hover Floating Tooltip */}
            {hoveredDot && (
              <div
                className="absolute z-30 pointer-events-none transition-all duration-75"
                style={{
                  left: `${Math.min(tooltipPos.x + 12, 620)}px`,
                  top: `${Math.max(tooltipPos.y - 80, 10)}px`,
                }}
              >
                {(() => {
                  const details = getCountryDetails(hoveredDot.country);
                  const isUser = hoveredDot.country === userCountry;
                  const tier = TIER_CONFIG[hoveredDot.tier] || TIER_CONFIG[0];
                  return (
                    <div className="bg-[#121822]/95 backdrop-blur-md border border-[#273243] rounded-xl p-3 shadow-2xl text-xs flex flex-col gap-1 min-w-[190px]">
                      <div className="flex items-center justify-between gap-2 border-b border-[#222c3b] pb-1.5">
                        <div className="flex items-center gap-1.5 font-bold text-white text-sm">
                          <span>{details?.flag || '🌍'}</span>
                          <span>{hoveredDot.country}</span>
                        </div>
                        {isUser && (
                          <span className="text-[10px] font-black uppercase px-1.5 py-0.5 rounded bg-[#380e0e] text-[#dd2222] border border-[#dd2222]/40">
                            You
                          </span>
                        )}
                      </div>

                      <div className="flex items-center justify-between text-[11px] pt-0.5">
                        <span className="text-[#8895a7]">Status:</span>
                        <span className="font-semibold" style={{ color: tier.color }}>
                          {tier.label}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-[#8895a7]">Active Creators:</span>
                        <span className="text-white font-semibold">
                          {details?.users ? details.users.toLocaleString() : 'Growing'}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-[#8895a7]">Clips Rendered:</span>
                        <span className="text-[#f8caa1] font-semibold">
                          {details?.clips ? details.clips.toLocaleString() : 'Available'}
                        </span>
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}

            {/* Bottom Legend Matching Reference Image */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pt-3 border-t border-[#1a232e] text-xs text-[#8c97a5]">
              {/* Left Legend Items */}
              <div className="flex flex-wrap items-center gap-4 sm:gap-6">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-[2px] bg-[#133833] inline-block border border-[#18453e]"></span>
                  <span className="text-[#8895a7]">No downloads yet</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-[2px] bg-[#f8caa1] inline-block"></span>
                  <span className="text-[#d1d5db]">A few downloads</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-[2px] bg-[#ea7635] inline-block"></span>
                  <span className="text-[#d1d5db]">A steady stream</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-[2px] bg-[#b83a1b] inline-block"></span>
                  <span className="text-[#d1d5db]">A hotspot</span>
                </div>
              </div>

              {/* Right Lit-up count */}
              <div className="text-xs sm:text-sm font-semibold text-[#8c97a5] font-mono">
                <strong className="text-white font-bold">{statsData.countriesLitUp}</strong> countries lit up so far
              </div>
            </div>
          </div>
        </section>

        {/* Selected Country Spotlight Banner */}
        {selectedCountry && (
          <section className="bg-[#121721] border border-[#253042] rounded-2xl p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-lg">
            <div className="flex items-center gap-4">
              <span className="text-3xl sm:text-4xl">{selectedCountry.flag || '🌍'}</span>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-bold text-white">{selectedCountry.name}</h3>
                  <span
                    className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full"
                    style={{
                      backgroundColor:
                        selectedCountry.tier === 3 ? '#360c0c' : selectedCountry.tier === 2 ? '#331908' : '#241f17',
                      color:
                        selectedCountry.tier === 3 ? '#dd2222' : selectedCountry.tier === 2 ? '#f97316' : '#f8caa1',
                    }}
                  >
                    {selectedCountry.label}
                  </span>
                  {selectedCountry.name === userCountry && (
                    <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-[#1e3a8a] text-blue-300">
                      Your Region 📍
                    </span>
                  )}
                </div>
                <p className="text-xs text-[#9aa4b2] mt-0.5">
                  Primary Hub: <strong className="text-white">{selectedCountry.city || selectedCountry.name}</strong> • Active Community Growth
                </p>
              </div>
            </div>

            <div className="flex items-center gap-6 sm:gap-8 text-xs">
              <div>
                <div className="text-[#7d8b9d] uppercase tracking-wider text-[10px]">Estimated Creators</div>
                <div className="text-base sm:text-lg font-bold text-white">
                  {selectedCountry.users ? selectedCountry.users.toLocaleString() : '1,200+'}
                </div>
              </div>
              <div>
                <div className="text-[#7d8b9d] uppercase tracking-wider text-[10px]">Total Clips Generated</div>
                <div className="text-base sm:text-lg font-bold text-[#f8caa1]">
                  {selectedCountry.clips ? selectedCountry.clips.toLocaleString() : '4,800+'}
                </div>
              </div>
              <Link
                href="/dashboard"
                className="px-4 py-2 btn-primary text-xs font-bold rounded-lg shadow whitespace-nowrap"
              >
                Clip Now →
              </Link>
            </div>
          </section>
        )}

        {/* ======================================================== */}
        {/* TOP REGIONAL HUBS LEADERBOARD                            */}
        {/* ======================================================== */}
        <section className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">Top Creator Hubs</h2>
              <p className="text-xs sm:text-sm text-[#8c97a5]">
                Countries driving the highest clip volume and viral distribution on TikTok, Reels & Shorts.
              </p>
            </div>
            <span className="text-xs font-semibold text-[#8c97a5]">Ranked by Volume</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {topHubs.map((hub, index) => {
              const isUser = hub.name === userCountry;
              return (
                <div
                  key={hub.name}
                  onClick={() => {
                    setSelectedCountry(hub);
                    setSearchQuery(hub.name);
                    mapContainerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                  }}
                  className={`bg-[#10151c] border rounded-2xl p-4 flex flex-col justify-between gap-3 cursor-pointer hover:border-[#dd2222]/50 hover:bg-[#151c27] transition-all group ${
                    isUser ? 'border-[#dd2222] shadow-md shadow-[#dd2222]/10' : 'border-[#1e2634]'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{hub.flag}</span>
                      <div>
                        <div className="text-xs font-bold text-white group-hover:text-[#dd2222] transition-colors">
                          {hub.name}
                        </div>
                        <div className="text-[10px] text-[#718096]">{hub.city}</div>
                      </div>
                    </div>
                    <span className="text-xs font-mono font-bold text-[#556375]">#{index + 1}</span>
                  </div>

                  <div className="flex items-center justify-between text-xs pt-2 border-t border-[#1c2430]">
                    <div>
                      <div className="text-[10px] text-[#718096]">Clips</div>
                      <div className="font-bold text-white">{hub.clips.toLocaleString()}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-[10px] text-[#718096]">Creators</div>
                      <div className="font-bold text-[#f8caa1]">{hub.users.toLocaleString()}</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* ======================================================== */}
        {/* LIVE REAL-TIME CREATOR ACTIVITY TICKER                   */}
        {/* ======================================================== */}
        <section className="bg-[#0f141a] border border-[#1d2532] rounded-2xl p-5 flex flex-col gap-3">
          <div className="flex items-center justify-between border-b border-[#1c2430] pb-3">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#22c55e] animate-pulse"></span>
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">Live Creator Activity Stream</h3>
            </div>
            <span className="text-[11px] text-[#6e7d91]">Updating live</span>
          </div>

          <div className="flex flex-col gap-2">
            {activityFeed.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between text-xs py-1.5 px-2 rounded-lg hover:bg-[#151c27] transition-colors"
              >
                <div className="flex items-center gap-2 text-[#d1d5db]">
                  <span className="text-sm">{item.flag}</span>
                  <span>{item.text}</span>
                </div>
                <span className="text-[10px] text-[#6b7280] font-mono whitespace-nowrap ml-3">
                  {item.time}
                </span>
              </div>
            ))}
          </div>
        </section>

        {/* ======================================================== */}
        {/* CALL TO ACTION                                           */}
        {/* ======================================================== */}
        <section className="bg-[#12161d] border border-[#212a38] rounded-3xl p-8 sm:p-12 text-center flex flex-col items-center gap-4 shadow-xl">
          <div className="w-12 h-12 rounded-2xl bg-[#360c0c] border border-[#dd2222]/50 flex items-center justify-center text-xl text-[#dd2222]">
            🌍
          </div>
          <h2 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
            Put Your Content On The Map
          </h2>
          <p className="text-sm sm:text-base text-[#9aa4b2] max-w-xl">
            Start clipping YouTube podcasts, webinars, and gaming streams into high-retention shorts.
            Completely free forever with your own API keys.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <Link
              href="/dashboard"
              className="px-6 py-3 btn-primary text-xs font-bold rounded-xl shadow-lg shadow-[#dd2222]/20 flex items-center gap-2"
            >
              <span>Launch Studio Free</span>
              <span>→</span>
            </Link>
            <Link
              href="/#features"
              className="px-5 py-3 rounded-xl bg-[#18212c] hover:bg-[#1e2a39] text-xs font-semibold text-white border border-[#283649] transition-colors"
            >
              Explore Features
            </Link>
          </div>
        </section>
      </main>

      {/* ======================================================== */}
      {/* FOOTER                                                   */}
      {/* ======================================================== */}
      <footer className="w-full border-t border-[#1e2632] bg-[#0c1015] py-10 px-4 sm:px-6 lg:px-8 mt-12">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6 text-xs text-[#8c97a5]">
          <div className="flex items-center gap-3">
            <span className="font-extrabold text-white text-base">
              clip<span className="text-[#dd2222]">.studio</span>
            </span>
            <span className="text-[#475569]">|</span>
            <span>Free & Open Source YouTube Clipping Platform</span>
          </div>

          <div className="flex items-center gap-6">
            <Link href="/" className="hover:text-white transition-colors">
              Home
            </Link>
            <Link href="/impact" className="text-white font-semibold hover:text-[#dd2222] transition-colors">
              Our Impact
            </Link>
            <Link href="/dashboard" className="hover:text-white transition-colors">
              Studio Dashboard
            </Link>
            <Link href="/workspaces" className="hover:text-white transition-colors">
              Workspaces
            </Link>
            <Link href="/settings" className="hover:text-white transition-colors">
              Settings
            </Link>
          </div>

          <div className="text-[11px] text-[#64748b]">
            &copy; {new Date().getFullYear()} clip.studio • Made for global creators
          </div>
        </div>
      </footer>
    </div>
  );
}
