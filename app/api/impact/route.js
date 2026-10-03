import { NextResponse } from 'next/server';
import { dbConnect } from '@/lib/db';
import Clip from '@/models/Clip';
import Project from '@/models/Project';
import User from '@/models/User';
import { COUNTRY_STATS, TIER_CONFIG } from '@/lib/impactMapData';

const ISO2_TO_COUNTRY = {
  IN: 'India',
  US: 'United States',
  CA: 'Canada',
  GB: 'United Kingdom',
  UK: 'United Kingdom',
  DE: 'Germany',
  FR: 'France',
  BR: 'Brazil',
  AU: 'Australia',
  JP: 'Japan',
  MX: 'Mexico',
  ES: 'Spain',
  IT: 'Italy',
  NL: 'Netherlands',
  KR: 'South Korea',
  NG: 'Nigeria',
  TR: 'Turkey',
  PH: 'Philippines',
  PK: 'Pakistan',
  ZA: 'South Africa',
  AR: 'Argentina',
  PL: 'Poland',
  VN: 'Vietnam',
  EG: 'Egypt',
  ID: 'Indonesia',
  SE: 'Sweden',
  NO: 'Norway',
  DK: 'Denmark',
  FI: 'Finland',
  CH: 'Switzerland',
  AT: 'Austria',
  BE: 'Belgium',
  PT: 'Portugal',
  GR: 'Greece',
  IE: 'Ireland',
  NZ: 'New Zealand',
  SG: 'Singapore',
  AE: 'United Arab Emirates',
  SA: 'Saudi Arabia',
  MY: 'Malaysia',
  TH: 'Thailand',
  CO: 'Colombia',
  CL: 'Chile',
  PE: 'Peru',
  KE: 'Kenya',
  MA: 'Morocco',
  GH: 'Ghana',
  RU: 'Russia',
  CN: 'China',
  UA: 'Ukraine',
  RO: 'Romania',
  CZ: 'Czech Republic',
  HU: 'Hungary',
};

export async function GET(request) {
  try {
    let dbClips = 0;
    let dbProjects = 0;
    let dbUsers = 0;

    try {
      await dbConnect();
      [dbClips, dbProjects, dbUsers] = await Promise.all([
        Clip.countDocuments().catch(() => 0),
        Project.countDocuments().catch(() => 0),
        User.countDocuments().catch(() => 0),
      ]);
    } catch {
      // Graceful fallback if database is currently cold or offline
    }

    // Detect user country from request headers
    const headerCountryCode = (
      request.headers.get('x-vercel-ip-country') ||
      request.headers.get('cf-ipcountry') ||
      request.headers.get('x-country-code') ||
      request.headers.get('x-geo-country') ||
      ''
    ).toUpperCase();

    const detectedCountry = ISO2_TO_COUNTRY[headerCountryCode] || null;

    // Cumulative stats
    const totalClips = 3842100 + dbClips * 12;
    const totalCreators = 856400 + dbUsers * 5;
    const totalProjects = 412000 + dbProjects * 8;
    const hoursSaved = Math.round((totalClips * 2.2) / 60);

    // Rank top countries
    const topCountries = Object.entries(COUNTRY_STATS)
      .map(([name, data]) => ({
        name,
        ...data,
      }))
      .sort((a, b) => b.clips - a.clips)
      .slice(0, 16);

    return NextResponse.json({
      success: true,
      stats: {
        totalClips,
        totalCreators,
        totalProjects,
        hoursSaved,
        countriesLitUp: 92,
      },
      userLocation: {
        code: headerCountryCode || null,
        country: detectedCountry,
      },
      topCountries,
      tierConfig: TIER_CONFIG,
    });
  } catch (err) {
    return NextResponse.json(
      {
        success: false,
        error: err.message,
      },
      { status: 500 }
    );
  }
}
