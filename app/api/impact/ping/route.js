import { NextResponse } from 'next/server';
import { dbConnect } from '@/lib/db';
import VisitorImpact from '@/models/VisitorImpact';
import Clip from '@/models/Clip';
import Project from '@/models/Project';

// Common timezone to country mapping
const TIMEZONE_TO_COUNTRY = {
  'Asia/Kolkata': { country: 'India', code: 'IND', city: 'Kolkata' },
  'Asia/Calcutta': { country: 'India', code: 'IND', city: 'Mumbai' },
  'America/New_York': { country: 'United States', code: 'USA', city: 'New York' },
  'America/Los_Angeles': { country: 'United States', code: 'USA', city: 'Los Angeles' },
  'America/Chicago': { country: 'United States', code: 'USA', city: 'Chicago' },
  'America/Denver': { country: 'United States', code: 'USA', city: 'Denver' },
  'America/Toronto': { country: 'Canada', code: 'CAN', city: 'Toronto' },
  'America/Vancouver': { country: 'Canada', code: 'CAN', city: 'Vancouver' },
  'Europe/London': { country: 'United Kingdom', code: 'GBR', city: 'London' },
  'Europe/Berlin': { country: 'Germany', code: 'DEU', city: 'Berlin' },
  'Europe/Paris': { country: 'France', code: 'FRA', city: 'Paris' },
  'Australia/Sydney': { country: 'Australia', code: 'AUS', city: 'Sydney' },
  'Australia/Melbourne': { country: 'Australia', code: 'AUS', city: 'Melbourne' },
  'America/Sao_Paulo': { country: 'Brazil', code: 'BRA', city: 'São Paulo' },
  'Asia/Tokyo': { country: 'Japan', code: 'JPN', city: 'Tokyo' },
  'Asia/Seoul': { country: 'South Korea', code: 'KOR', city: 'Seoul' },
  'Asia/Singapore': { country: 'Singapore', code: 'SGP', city: 'Singapore' },
  'Asia/Dubai': { country: 'United Arab Emirates', code: 'ARE', city: 'Dubai' },
  'Europe/Madrid': { country: 'Spain', code: 'ESP', city: 'Madrid' },
  'Europe/Rome': { country: 'Italy', code: 'ITA', city: 'Rome' },
  'Europe/Amsterdam': { country: 'Netherlands', code: 'NLD', city: 'Amsterdam' },
  'Africa/Johannesburg': { country: 'South Africa', code: 'ZAF', city: 'Johannesburg' },
  'America/Mexico_City': { country: 'Mexico', code: 'MEX', city: 'Mexico City' },
  'America/Buenos_Aires': { country: 'Argentina', code: 'ARG', city: 'Buenos Aires' },
  'Asia/Jakarta': { country: 'Indonesia', code: 'IDN', city: 'Jakarta' },
  'Asia/Manila': { country: 'Philippines', code: 'PHL', city: 'Manila' },
  'Asia/Karachi': { country: 'Pakistan', code: 'PAK', city: 'Karachi' },
  'Africa/Cairo': { country: 'Egypt', code: 'EGY', city: 'Cairo' },
  'Africa/Lagos': { country: 'Nigeria', code: 'NGA', city: 'Lagos' },
};

export async function POST(request) {
  try {
    await dbConnect();

    const body = await request.json().catch(() => ({}));
    const {
      timezone = '',
      language = '',
      platform = '',
      screen = '',
      coords = null,
      clientCountry = '',
      clientCity = '',
      userId = null,
    } = body;

    // Detect IP from headers
    const forwarded = request.headers.get('x-forwarded-for') || '';
    const realIp = request.headers.get('x-real-ip') || forwarded.split(',')[0].trim() || '127.0.0.1';

    // Header country detection (Vercel, Cloudflare, AWS CloudFront)
    const headerCountry = request.headers.get('x-vercel-ip-country') || request.headers.get('cf-ipcountry') || '';

    // Determine country & city using timezone and headers
    let country = 'India';
    let countryCode = 'IND';
    let city = clientCity || '';

    if (TIMEZONE_TO_COUNTRY[timezone]) {
      const match = TIMEZONE_TO_COUNTRY[timezone];
      country = match.country;
      countryCode = match.code;
      if (!city) city = match.city;
    } else if (clientCountry) {
      country = clientCountry;
      countryCode = clientCountry.slice(0, 3).toUpperCase();
    } else if (headerCountry) {
      country = headerCountry;
      countryCode = headerCountry;
    }

    // Query real clips in database
    const totalClipsInDB = await Clip.countDocuments();
    const totalProjectsInDB = await Project.countDocuments();

    // Check if this visitor exists
    let visitor = null;
    if (realIp && realIp !== '127.0.0.1') {
      visitor = await VisitorImpact.findOne({ ip: realIp });
    } else {
      visitor = await VisitorImpact.findOne({ timezone, platform });
    }

    if (visitor) {
      visitor.visits += 1;
      visitor.lastSeen = new Date();
      if (city && !visitor.city) visitor.city = city;
      if (coords?.latitude) {
        visitor.latitude = coords.latitude;
        visitor.longitude = coords.longitude;
      }
      visitor.clipsGenerated = totalClipsInDB;
      visitor.projectsCreated = totalProjectsInDB;
      await visitor.save();
    } else {
      visitor = await VisitorImpact.create({
        ip: realIp,
        country,
        countryCode,
        city: city || 'Local',
        timezone,
        language,
        platform,
        device: screen,
        latitude: coords?.latitude || null,
        longitude: coords?.longitude || null,
        userId: userId || null,
        visits: 1,
        clipsGenerated: totalClipsInDB,
        projectsCreated: totalProjectsInDB,
        lastSeen: new Date(),
        createdAt: new Date(),
      });
    }

    // Get real counts for this country
    const countryVisitors = await VisitorImpact.countDocuments({ country });
    const totalVisitors = await VisitorImpact.countDocuments();

    return NextResponse.json({
      success: true,
      visitor: {
        id: visitor._id,
        country: visitor.country,
        countryCode: visitor.countryCode,
        city: visitor.city,
        timezone: visitor.timezone,
        visits: visitor.visits,
        countryVisitors,
        totalVisitors,
        realClips: totalClipsInDB,
        realProjects: totalProjectsInDB,
        isRealData: true,
      },
    });
  } catch (err) {
    console.error('Impact Ping Error:', err);
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}
