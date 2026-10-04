'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import {
  WORLD_GRID_DOTS,
  TIER_CONFIG,
  MAP_COLS,
  MAP_ROWS,
  getCountryFlag,
  getCountryDetails,
} from '@/lib/impactMapData';

export default function ImpactPage() {
  const { user } = useAuth();

  // Location-Only Metrics State
  const [locationStats, setLocationStats] = useState({
    totalUsers: 1,
    totalCities: 1,
    totalCountries: 1,
    topLocation: 'Kolkata, India',
  });

  // Recorded Locations list from database
  const [recordedLocations, setRecordedLocations] = useState([]);
  const [countryStats, setCountryStats] = useState({});

  // Browser Geolocation / Telemetry State
  const [detectedLocation, setDetectedLocation] = useState({
    city: 'Kolkata',
    country: 'India',
    countryCode: 'IND',
    timezone: 'Asia/Kolkata',
    latitude: null,
    longitude: null,
    gpsActive: false,
  });

  // Map Filter & Interaction States
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTierFilter, setActiveTierFilter] = useState('all'); // 'all', 'hotspots', 'steady', 'few', 'my-location'
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [hoveredDot, setHoveredDot] = useState(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const mapContainerRef = useRef(null);

  // 1. Detect Browser Location & Sync with Database
  useEffect(() => {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Kolkata';

    let detectedCity = 'Kolkata';
    let detectedCountry = 'India';
    let detectedCode = 'IND';

    if (tz.includes('Kolkata') || tz.includes('Calcutta')) {
      detectedCity = 'Kolkata';
      detectedCountry = 'India';
      detectedCode = 'IND';
    } else if (tz.includes('New_York')) {
      detectedCity = 'New York';
      detectedCountry = 'United States';
      detectedCode = 'USA';
    } else if (tz.includes('Los_Angeles')) {
      detectedCity = 'Los Angeles';
      detectedCountry = 'United States';
      detectedCode = 'USA';
    } else if (tz.includes('Chicago')) {
      detectedCity = 'Chicago';
      detectedCountry = 'United States';
      detectedCode = 'USA';
    } else if (tz.includes('Toronto')) {
      detectedCity = 'Toronto';
      detectedCountry = 'Canada';
      detectedCode = 'CAN';
    } else if (tz.includes('London')) {
      detectedCity = 'London';
      detectedCountry = 'United Kingdom';
      detectedCode = 'GBR';
    } else if (tz.includes('Berlin')) {
      detectedCity = 'Berlin';
      detectedCountry = 'Germany';
      detectedCode = 'DEU';
    } else if (tz.includes('Paris')) {
      detectedCity = 'Paris';
      detectedCountry = 'France';
      detectedCode = 'FRA';
    } else if (tz.includes('Sydney') || tz.includes('Melbourne')) {
      detectedCity = 'Sydney';
      detectedCountry = 'Australia';
      detectedCode = 'AUS';
    } else if (tz.includes('Sao_Paulo')) {
      detectedCity = 'São Paulo';
      detectedCountry = 'Brazil';
      detectedCode = 'BRA';
    } else if (tz.includes('Tokyo')) {
      detectedCity = 'Tokyo';
      detectedCountry = 'Japan';
      detectedCode = 'JPN';
    }

    setDetectedLocation({
      city: detectedCity,
      country: detectedCountry,
      countryCode: detectedCode,
      timezone: tz,
      latitude: null,
      longitude: null,
      gpsActive: false,
    });

    async function recordLocationAndFetchData() {
      try {
        // Send user location record to database (upserts & increments user count)
        await fetch('/api/impact/ping', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            city: detectedCity,
            country: detectedCountry,
            countryCode: detectedCode,
            timezone: tz,
          }),
        }).catch(() => {});

        // Fetch location metrics from database
        const res = await fetch('/api/impact');
        if (res.ok) {
          const data = await res.json();
          if (data.stats) setLocationStats(data.stats);
          if (data.locations) setRecordedLocations(data.locations);
          if (data.countryStats) {
            setCountryStats(data.countryStats);
            setSelectedLocation(getCountryDetails(detectedCountry, data.countryStats));
          }
        }
      } catch (err) {
        console.error('Error syncing location data:', err);
      }
    }

    recordLocationAndFetchData();
  }, []);

  // Request browser GPS position on demand
  const handleRequestGPS = () => {
    if (typeof navigator !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const coords = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          };
          setDetectedLocation((prev) => ({
            ...prev,
            ...coords,
            gpsActive: true,
          }));

          // Send updated coordinates to database
          await fetch('/api/impact/ping', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              city: detectedLocation.city,
              country: detectedLocation.country,
              countryCode: detectedLocation.countryCode,
              timezone: detectedLocation.timezone,
              latitude: coords.latitude,
              longitude: coords.longitude,
            }),
          }).catch(() => {});
        },
        (err) => {
          console.warn('Geolocation unavailable:', err.message);
        }
      );
    }
  };

  // Center coordinate of user's detected location for beacon
  const userCountryBeacon = useMemo(() => {
    const userDots = WORLD_GRID_DOTS.filter((d) => d.country === detectedLocation.country);
    if (!userDots.length) return null;
    const avgX = userDots.reduce((acc, d) => acc + d.x, 0) / userDots.length;
    const avgY = userDots.reduce((acc, d) => acc + d.y, 0) / userDots.length;
    return {
      x: avgX * 5.8 + 22,
      y: avgY * 5.8 + 20,
      city: detectedLocation.city,
      country: detectedLocation.country,
      flag: getCountryFlag(detectedLocation.country),
    };
  }, [detectedLocation.country, detectedLocation.city]);

  // Filtered dots with dynamic tiers based on user location data
  const filteredDots = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return WORLD_GRID_DOTS.map((dot) => {
      let isDimmed = false;

      // Real tier from user location database: darker for more users, lighter for less
      const locData = countryStats[dot.country];
      const effectiveTier = locData ? locData.tier : dot.tier;

      if (query && !dot.country.toLowerCase().includes(query)) {
        isDimmed = true;
      } else if (activeTierFilter === 'hotspots') {
        if (effectiveTier !== 3) isDimmed = true;
      } else if (activeTierFilter === 'steady') {
        if (effectiveTier !== 2) isDimmed = true;
      } else if (activeTierFilter === 'few') {
        if (effectiveTier !== 1) isDimmed = true;
      } else if (activeTierFilter === 'my-location') {
        if (dot.country !== detectedLocation.country) isDimmed = true;
      }

      const isUserLocation = dot.country === detectedLocation.country;

      return {
        ...dot,
        tier: effectiveTier,
        isDimmed,
        isUserLocation,
      };
    });
  }, [searchQuery, activeTierFilter, detectedLocation.country, countryStats]);

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
    const details = getCountryDetails(dot.country, countryStats);
    setSelectedLocation(details);
  };

  return (
    <div className="min-h-screen bg-[#06090c] text-[#f6f7f8] flex flex-col font-sans selection:bg-[#dd2222] selection:text-white">
      {/* ======================================================== */}
      {/* HEADER / NAVIGATION                                      */}
      {/* ======================================================== */}
      <header className="sticky top-0 z-50 backdrop-blur-md bg-[#0d1218]/90 border-b border-[#1b232e]">
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
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 sm:py-12 flex flex-col gap-8">
        
        {/* Top Hero Section */}
        <section className="flex flex-col items-center text-center max-w-3xl mx-auto gap-4">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#111923] border border-[#223144] text-[11px] font-bold text-[#b9c0ca] uppercase tracking-wider">
            <span className="w-2 h-2 rounded-full bg-[#22c55e] animate-ping"></span>
            <span>Live User Location Distribution</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight leading-tight">
            Our Impact Across The World
          </h1>

          <p className="text-sm sm:text-base text-[#9aa4b2] leading-relaxed">
            Real user locations recorded across the globe. Darker dots represent areas with more users;
            lighter dots represent emerging user locations.
          </p>

          {/* User Location Detected Banner */}
          <div className="w-full max-w-xl bg-[#0f151e] border border-[#202b3b] rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs shadow-lg">
            <div className="flex items-center gap-3">
              <span className="text-2xl">{getCountryFlag(detectedLocation.country)}</span>
              <div className="text-left">
                <div className="font-bold text-white flex items-center gap-2">
                  <span>Your Location: {detectedLocation.city}, {detectedLocation.country}</span>
                  <span className="px-1.5 py-0.5 rounded bg-[#1e293b] text-[10px] text-[#38bdf8] font-mono">
                    {detectedLocation.timezone}
                  </span>
                </div>
                <div className="text-[11px] text-[#808d9e] mt-0.5">
                  Location recorded & user count updated
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleRequestGPS}
                className="px-3 py-1.5 rounded-lg bg-[#182332] hover:bg-[#202e42] border border-[#293b54] text-[11px] font-semibold text-[#cbd5e1] transition-colors"
                title="Get precise GPS coordinates"
              >
                {detectedLocation.gpsActive ? '✓ GPS Active' : '📍 Detect GPS'}
              </button>
              <button
                onClick={() => {
                  setActiveTierFilter('my-location');
                  setSelectedLocation(getCountryDetails(detectedLocation.country, countryStats));
                }}
                className="px-3 py-1.5 rounded-lg bg-[#dd2222] hover:bg-[#b81d1d] text-white text-[11px] font-bold shadow-md transition-colors"
              >
                Locate Me
              </button>
            </div>
          </div>
        </section>

        {/* ======================================================== */}
        {/* LOCATION-ONLY METRICS BAR                                */}
        {/* ======================================================== */}
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <div className="bg-[#0d1219] border border-[#1b2532] rounded-2xl p-4 sm:p-5 flex flex-col gap-1 shadow-sm">
            <div className="text-xs font-semibold text-[#8b97a8] uppercase tracking-wider flex items-center justify-between">
              <span>Total Active Users</span>
              <span className="w-2 h-2 rounded-full bg-[#22c55e]"></span>
            </div>
            <div className="text-2xl sm:text-3xl font-black text-white">
              {locationStats?.totalUsers ?? 1}
            </div>
            <div className="text-[11px] text-[#9aa4b2]">
              Recorded Across Worldwide Locations
            </div>
          </div>

          <div className="bg-[#0d1219] border border-[#1b2532] rounded-2xl p-4 sm:p-5 flex flex-col gap-1 shadow-sm">
            <div className="text-xs font-semibold text-[#8b97a8] uppercase tracking-wider flex items-center justify-between">
              <span>Cities Reached</span>
              <span className="text-xs">🏙️</span>
            </div>
            <div className="text-2xl sm:text-3xl font-black text-[#ea7635]">
              {locationStats?.totalCities ?? 1}
            </div>
            <div className="text-[11px] text-[#9aa4b2]">
              Unique Cities with Active Users
            </div>
          </div>

          <div className="bg-[#0d1219] border border-[#1b2532] rounded-2xl p-4 sm:p-5 flex flex-col gap-1 shadow-sm">
            <div className="text-xs font-semibold text-[#8b97a8] uppercase tracking-wider flex items-center justify-between">
              <span>Countries Active</span>
              <span className="text-xs">🌍</span>
            </div>
            <div className="text-2xl sm:text-3xl font-black text-[#d3a06e]">
              {locationStats?.totalCountries ?? 1}
            </div>
            <div className="text-[11px] text-[#9aa4b2]">
              Lit Up on World Map
            </div>
          </div>

          <div className="bg-[#0d1219] border border-[#1b2532] rounded-2xl p-4 sm:p-5 flex flex-col gap-1 shadow-sm">
            <div className="text-xs font-semibold text-[#8b97a8] uppercase tracking-wider flex items-center justify-between">
              <span>Top User Location</span>
              <span className="text-xs">🔥</span>
            </div>
            <div className="text-xl sm:text-2xl font-black text-white truncate">
              {locationStats?.topLocation || 'Kolkata, India'}
            </div>
            <div className="text-[11px] text-[#38bdf8] font-medium">
              Highest User Concentration
            </div>
          </div>
        </section>

        {/* ======================================================== */}
        {/* REFINED HIGH-RESOLUTION WORLD MAP (158 x 76 Grid)        */}
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
                placeholder="Search country or city (e.g. India, Kolkata)..."
                className="w-full bg-[#0d1219] border border-[#1f2937] focus:border-[#dd2222] rounded-xl pl-9 pr-8 py-2 text-xs text-white placeholder-[#606d80] outline-none transition-colors"
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
                    : 'bg-[#121822] text-[#9aa4b2] hover:text-white border border-[#202b3b]'
                }`}
              >
                All 3,795 Dots
              </button>
              <button
                onClick={() => setActiveTierFilter('hotspots')}
                className={`px-3 py-1.5 rounded-lg font-semibold transition-all flex items-center gap-1.5 whitespace-nowrap ${
                  activeTierFilter === 'hotspots'
                    ? 'bg-[#9d350f] text-white font-bold'
                    : 'bg-[#121822] text-[#9aa4b2] hover:text-white border border-[#202b3b]'
                }`}
              >
                <span className="w-2.5 h-2.5 rounded-sm bg-[#9d350f]"></span>
                <span>Hotspots (More Users)</span>
              </button>
              <button
                onClick={() => setActiveTierFilter('steady')}
                className={`px-3 py-1.5 rounded-lg font-semibold transition-all flex items-center gap-1.5 whitespace-nowrap ${
                  activeTierFilter === 'steady'
                    ? 'bg-[#dd661a] text-white font-bold'
                    : 'bg-[#121822] text-[#9aa4b2] hover:text-white border border-[#202b3b]'
                }`}
              >
                <span className="w-2.5 h-2.5 rounded-sm bg-[#dd661a]"></span>
                <span>Steady Stream</span>
              </button>
              <button
                onClick={() => setActiveTierFilter('few')}
                className={`px-3 py-1.5 rounded-lg font-semibold transition-all flex items-center gap-1.5 whitespace-nowrap ${
                  activeTierFilter === 'few'
                    ? 'bg-[#d3a06e] text-black font-bold'
                    : 'bg-[#121822] text-[#9aa4b2] hover:text-white border border-[#202b3b]'
                }`}
              >
                <span className="w-2.5 h-2.5 rounded-sm bg-[#d3a06e]"></span>
                <span>A Few Users</span>
              </button>
              <button
                onClick={() => {
                  setActiveTierFilter('my-location');
                  setSelectedLocation(getCountryDetails(detectedLocation.country, countryStats));
                }}
                className={`px-3 py-1.5 rounded-lg font-semibold transition-all flex items-center gap-1.5 whitespace-nowrap ${
                  activeTierFilter === 'my-location'
                    ? 'bg-[#dd2222] text-white font-bold'
                    : 'bg-[#121822] text-[#9aa4b2] hover:text-white border border-[#202b3b]'
                }`}
              >
                <span>📍 My Location</span>
              </button>
            </div>
          </div>

          {/* World Map Container */}
          <div
            ref={mapContainerRef}
            onMouseMove={handleDotMouseMove}
            onMouseLeave={() => setHoveredDot(null)}
            className="relative bg-[#040608] border border-[#161d26] rounded-3xl p-4 sm:p-6 shadow-2xl overflow-hidden flex flex-col gap-5"
          >
            {/* SVG Refined Grid (960 x 480 ViewBox) */}
            <div className="w-full overflow-x-auto pb-2">
              <svg
                viewBox="0 0 960 480"
                className="w-full min-w-[760px] h-auto select-none transition-all"
                style={{ filter: 'drop-shadow(0 4px 20px rgba(0,0,0,0.6))' }}
              >
                <defs>
                  {/* Subtle radial glow under active hotspot regions */}
                  <radialGradient id="hotspotGlow" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor="#9d350f" stopOpacity="0.4" />
                    <stop offset="100%" stopColor="#040608" stopOpacity="0" />
                  </radialGradient>
                </defs>

                {/* Background glow behind India */}
                <ellipse cx="660" cy="220" rx="35" ry="40" fill="url(#hotspotGlow)" />

                {/* Render All 3,795 Refined Dots */}
                <g>
                  {filteredDots.map((dot, idx) => {
                    const tierConf = TIER_CONFIG[dot.tier] || TIER_CONFIG[0];
                    const cx = dot.x * 5.8 + 22;
                    const cy = dot.y * 5.8 + 20;

                    const isHovered = hoveredDot?.x === dot.x && hoveredDot?.y === dot.y;
                    const isSameCountry = hoveredDot && hoveredDot.country === dot.country;

                    let fill = tierConf.color;
                    let stroke = 'transparent';
                    let strokeWidth = 0;
                    let opacity = 1;

                    if (dot.isDimmed) {
                      opacity = 0.12;
                    }

                    if (dot.isUserLocation && activeTierFilter === 'my-location') {
                      stroke = '#ffffff';
                      strokeWidth = 1.0;
                    }

                    if (isSameCountry) {
                      stroke = '#ffffff';
                      strokeWidth = 0.8;
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
                        x={cx - 2.3}
                        y={cy - 2.3}
                        width={4.6}
                        height={4.6}
                        rx={1.0}
                        fill={fill}
                        stroke={stroke}
                        strokeWidth={strokeWidth}
                        opacity={opacity}
                        className="cursor-pointer transition-all duration-100"
                        onMouseEnter={(e) => handleDotMouseEnter(dot, e)}
                        onClick={() => handleDotClick(dot)}
                      />
                    );
                  })}
                </g>

                {/* Animated Pulsing Beacon for User's Detected Location */}
                {userCountryBeacon && !filteredDots.find((d) => d.country === detectedLocation.country)?.isDimmed && (
                  <g pointerEvents="none">
                    {/* Outer ripple ring */}
                    <circle
                      cx={userCountryBeacon.x}
                      cy={userCountryBeacon.y}
                      r="10"
                      fill="none"
                      stroke="#dd2222"
                      strokeWidth="1.5"
                    >
                      <animate
                        attributeName="r"
                        values="5; 22; 5"
                        dur="2.4s"
                        repeatCount="indefinite"
                      />
                      <animate
                        attributeName="opacity"
                        values="0.9; 0; 0.9"
                        dur="2.4s"
                        repeatCount="indefinite"
                      />
                    </circle>

                    {/* Secondary ripple */}
                    <circle
                      cx={userCountryBeacon.x}
                      cy={userCountryBeacon.y}
                      r="6"
                      fill="none"
                      stroke="#dd661a"
                      strokeWidth="1.2"
                    >
                      <animate
                        attributeName="r"
                        values="3; 14; 3"
                        dur="2.4s"
                        begin="0.7s"
                        repeatCount="indefinite"
                      />
                      <animate
                        attributeName="opacity"
                        values="0.8; 0; 0.8"
                        dur="2.4s"
                        begin="0.7s"
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
                    <g transform={`translate(${userCountryBeacon.x - 42}, ${userCountryBeacon.y - 26})`}>
                      <rect
                        width="84"
                        height="18"
                        rx="4"
                        fill="#0d1218"
                        stroke="#dd2222"
                        strokeWidth="1"
                        filter="drop-shadow(0 2px 5px rgba(0,0,0,0.8))"
                      />
                      <text
                        x="42"
                        y="12"
                        textAnchor="middle"
                        fill="#ffffff"
                        fontSize="8.5"
                        fontWeight="bold"
                        fontFamily="sans-serif"
                      >
                        📍 You ({userCountryBeacon.city})
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
                  left: `${Math.min(tooltipPos.x + 12, 700)}px`,
                  top: `${Math.max(tooltipPos.y - 85, 10)}px`,
                }}
              >
                {(() => {
                  const details = getCountryDetails(hoveredDot?.country, countryStats) || {};
                  const isUser = hoveredDot?.country === detectedLocation.country;
                  const tier = TIER_CONFIG[hoveredDot?.tier] || TIER_CONFIG[0];
                  return (
                    <div className="bg-[#0e131b]/95 backdrop-blur-md border border-[#222c3b] rounded-xl p-3 shadow-2xl text-xs flex flex-col gap-1 min-w-[200px]">
                      <div className="flex items-center justify-between gap-2 border-b border-[#1f2836] pb-1.5">
                        <div className="flex items-center gap-1.5 font-bold text-white text-sm">
                          <span>{details?.flag || '🌍'}</span>
                          <span>{hoveredDot?.country || 'Unknown'}</span>
                        </div>
                        {isUser && (
                          <span className="text-[10px] font-black uppercase px-1.5 py-0.5 rounded bg-[#380e0e] text-[#dd2222] border border-[#dd2222]/40">
                            Your Region
                          </span>
                        )}
                      </div>

                      <div className="flex items-center justify-between text-[11px] pt-0.5">
                        <span className="text-[#8895a7]">Activity Tier:</span>
                        <span className="font-semibold" style={{ color: tier?.color || '#d3a06e' }}>
                          {tier?.label || 'A few downloads'}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-[#8895a7]">Recorded Users:</span>
                        <span className="text-white font-semibold">
                          {details?.usersCount ?? 0} {details?.usersCount === 1 ? 'user' : 'users'}
                        </span>
                      </div>

                      {details?.topCity && (
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-[#8895a7]">Primary City:</span>
                          <span className="text-[#d3a06e] font-semibold">
                            {details.topCity}
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>
            )}

            {/* Bottom Legend Matching Reference Image */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pt-3 border-t border-[#161d26] text-xs text-[#8c97a5]">
              {/* Left Legend Items */}
              <div className="flex flex-wrap items-center gap-4 sm:gap-6">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-[2px] bg-[#10453f] inline-block border border-[#14534c]"></span>
                  <span className="text-[#8895a7]">No downloads yet</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-[2px] bg-[#d3a06e] inline-block"></span>
                  <span className="text-[#d1d5db]">A few downloads</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-[2px] bg-[#dd661a] inline-block"></span>
                  <span className="text-[#d1d5db]">A steady stream</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-[2px] bg-[#9d350f] inline-block"></span>
                  <span className="text-[#d1d5db]">A hotspot (More Users)</span>
                </div>
              </div>

              {/* Right Count */}
              <div className="text-xs sm:text-sm font-semibold text-[#8c97a5] font-mono">
                <strong className="text-white font-bold">{locationStats?.totalCountries ?? 1}</strong> countries lit up so far
              </div>
            </div>
          </div>
        </section>

        {/* Selected Country Spotlight Banner */}
        {selectedLocation && (
          <section className="bg-[#0d1219] border border-[#1e2736] rounded-2xl p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-lg">
            <div className="flex items-center gap-4">
              <span className="text-3xl sm:text-4xl">{selectedLocation?.flag || '🌍'}</span>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-bold text-white">{selectedLocation?.name || ''}</h3>
                  <span
                    className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full"
                    style={{
                      backgroundColor:
                        selectedLocation?.tier === 3 ? '#360c0c' : selectedLocation?.tier === 2 ? '#331908' : '#241f17',
                      color:
                        selectedLocation?.tier === 3 ? '#dd2222' : selectedLocation?.tier === 2 ? '#f97316' : '#d3a06e',
                    }}
                  >
                    {selectedLocation?.label || 'Active'}
                  </span>
                  {selectedLocation?.name === detectedLocation.country && (
                    <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-[#1e3a8a] text-blue-300">
                      Your Region 📍
                    </span>
                  )}
                </div>
                <p className="text-xs text-[#9aa4b2] mt-0.5">
                  Primary Location: <strong className="text-white">{selectedLocation?.topCity || selectedLocation?.name}</strong> • Real Location Recorded
                </p>
              </div>
            </div>

            <div className="flex items-center gap-6 sm:gap-8 text-xs">
              <div>
                <div className="text-[#7d8b9d] uppercase tracking-wider text-[10px]">Active Users</div>
                <div className="text-base sm:text-lg font-bold text-white">
                  {selectedLocation?.usersCount ?? 1}
                </div>
              </div>
              <div>
                <div className="text-[#7d8b9d] uppercase tracking-wider text-[10px]">Activity Tier</div>
                <div className="text-base sm:text-lg font-bold text-[#d3a06e]">
                  {selectedLocation?.label || 'A few downloads'}
                </div>
              </div>
              <Link
                href="/dashboard"
                className="px-4 py-2 btn-primary text-xs font-bold rounded-lg shadow whitespace-nowrap"
              >
                Open Studio →
              </Link>
            </div>
          </section>
        )}

        {/* ======================================================== */}
        {/* RECORDED LOCATIONS DIRECTORY                             */}
        {/* ======================================================== */}
        {recordedLocations.length > 0 && (
          <section className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">Active User Locations</h2>
                <p className="text-xs sm:text-sm text-[#8c97a5]">
                  Real recorded locations where creators have accessed the platform.
                </p>
              </div>
              <span className="text-xs font-semibold text-[#8c97a5]">Ranked by Users</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
              {recordedLocations.map((loc, idx) => {
                const isUser = loc.city.toLowerCase() === detectedLocation.city.toLowerCase();
                return (
                  <div
                    key={`${loc.city}-${loc.country}-${idx}`}
                    onClick={() => {
                      setSelectedLocation(getCountryDetails(loc.country, countryStats));
                      setSearchQuery(loc.country);
                      mapContainerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }}
                    className={`bg-[#0d1219] border rounded-2xl p-4 flex items-center justify-between cursor-pointer hover:border-[#dd2222]/50 hover:bg-[#121822] transition-all group ${
                      isUser ? 'border-[#dd2222] shadow-md shadow-[#dd2222]/10' : 'border-[#1b2532]'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{getCountryFlag(loc.country)}</span>
                      <div>
                        <div className="text-xs font-bold text-white group-hover:text-[#dd2222] transition-colors flex items-center gap-1.5">
                          <span>{loc.city}, {loc.country}</span>
                          {isUser && (
                            <span className="w-1.5 h-1.5 rounded-full bg-[#dd2222]"></span>
                          )}
                        </div>
                        <div className="text-[10px] text-[#718096]">
                          Last seen: {new Date(loc.lastActive).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-base font-bold text-white">
                        {loc.usersCount} {loc.usersCount === 1 ? 'User' : 'Users'}
                      </div>
                      <div className="text-[10px] text-[#38bdf8]">
                        #{idx + 1}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* ======================================================== */}
        {/* CALL TO ACTION                                           */}
        {/* ======================================================== */}
        <section className="bg-[#0e131b] border border-[#1d2736] rounded-3xl p-8 sm:p-12 text-center flex flex-col items-center gap-4 shadow-xl">
          <div className="w-12 h-12 rounded-2xl bg-[#360c0c] border border-[#dd2222]/50 flex items-center justify-center text-xl text-[#dd2222]">
            🌍
          </div>
          <h2 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
            Put Your Content On The Map
          </h2>
          <p className="text-sm sm:text-base text-[#9aa4b2] max-w-xl">
            Start clipping YouTube videos into high-retention shorts. Completely free with your own AI API keys.
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
              href="/workspaces"
              className="px-5 py-3 rounded-xl bg-[#141b24] hover:bg-[#1b2533] text-xs font-semibold text-white border border-[#243142] transition-colors"
            >
              View Workspaces
            </Link>
          </div>
        </section>
      </main>

      {/* ======================================================== */}
      {/* FOOTER                                                   */}
      {/* ======================================================== */}
      <footer className="w-full border-t border-[#18212c] bg-[#070a0e] py-10 px-4 sm:px-6 lg:px-8 mt-12">
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
            &copy; {new Date().getFullYear()} clip.studio • Live Real-Time Data
          </div>
        </div>
      </footer>
    </div>
  );
}
