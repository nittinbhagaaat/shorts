import { NextResponse } from 'next/server';
import { dbConnect } from '@/lib/db';
import UserLocation from '@/models/UserLocation';

const TIMEZONE_MAP = {
  'Asia/Kolkata': { city: 'Kolkata', country: 'India', code: 'IND' },
  'Asia/Calcutta': { city: 'Kolkata', country: 'India', code: 'IND' },
  'America/New_York': { city: 'New York', country: 'United States', code: 'USA' },
  'America/Los_Angeles': { city: 'Los Angeles', country: 'United States', code: 'USA' },
  'America/Chicago': { city: 'Chicago', country: 'United States', code: 'USA' },
  'America/Denver': { city: 'Denver', country: 'United States', code: 'USA' },
  'America/Toronto': { city: 'Toronto', country: 'Canada', code: 'CAN' },
  'America/Vancouver': { city: 'Vancouver', country: 'Canada', code: 'CAN' },
  'Europe/London': { city: 'London', country: 'United Kingdom', code: 'GBR' },
  'Europe/Berlin': { city: 'Berlin', country: 'Germany', code: 'DEU' },
  'Europe/Paris': { city: 'Paris', country: 'France', code: 'FRA' },
  'Australia/Sydney': { city: 'Sydney', country: 'Australia', code: 'AUS' },
  'Australia/Melbourne': { city: 'Melbourne', country: 'Australia', code: 'AUS' },
  'America/Sao_Paulo': { city: 'São Paulo', country: 'Brazil', code: 'BRA' },
  'Asia/Tokyo': { city: 'Tokyo', country: 'Japan', code: 'JPN' },
  'Asia/Seoul': { city: 'Seoul', country: 'South Korea', code: 'KOR' },
  'Asia/Singapore': { city: 'Singapore', country: 'Singapore', code: 'SGP' },
  'Asia/Dubai': { city: 'Dubai', country: 'United Arab Emirates', code: 'ARE' },
  'Europe/Madrid': { city: 'Madrid', country: 'Spain', code: 'ESP' },
  'Europe/Rome': { city: 'Rome', country: 'Italy', code: 'ITA' },
  'Europe/Amsterdam': { city: 'Amsterdam', country: 'Netherlands', code: 'NLD' },
  'Africa/Johannesburg': { city: 'Johannesburg', country: 'South Africa', code: 'ZAF' },
  'America/Mexico_City': { city: 'Mexico City', country: 'Mexico', code: 'MEX' },
  'America/Buenos_Aires': { city: 'Buenos Aires', country: 'Argentina', code: 'ARG' },
  'Asia/Jakarta': { city: 'Jakarta', country: 'Indonesia', code: 'IDN' },
  'Asia/Manila': { city: 'Manila', country: 'Philippines', code: 'PHL' },
  'Asia/Karachi': { city: 'Karachi', country: 'Pakistan', code: 'PAK' },
  'Africa/Cairo': { city: 'Cairo', country: 'Egypt', code: 'EGY' },
  'Africa/Lagos': { city: 'Lagos', country: 'Nigeria', code: 'NGA' },
};

function capitalize(str) {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
}

export async function POST(request) {
  try {
    await dbConnect();

    const body = await request.json().catch(() => ({}));
    let {
      city = '',
      country = '',
      countryCode = '',
      timezone = '',
      latitude = null,
      longitude = null,
    } = body;

    // Timezone heuristic if location not provided
    if ((!city || !country) && timezone && TIMEZONE_MAP[timezone]) {
      const match = TIMEZONE_MAP[timezone];
      city = city || match.city;
      country = country || match.country;
      countryCode = countryCode || match.code;
    }

    // Header country fallback
    const headerCountry = request.headers.get('x-vercel-ip-country') || request.headers.get('cf-ipcountry') || '';
    if (!country && headerCountry) {
      country = headerCountry;
      countryCode = headerCountry;
    }

    // Default to Kolkata, India if undetermined
    city = capitalize(city.trim()) || 'Kolkata';
    country = capitalize(country.trim()) || 'India';
    countryCode = (countryCode.trim() || country.slice(0, 3)).toUpperCase();

    // Find existing location record case-insensitively
    const existing = await UserLocation.findOne({
      city: { $regex: new RegExp(`^${city}$`, 'i') },
      country: { $regex: new RegExp(`^${country}$`, 'i') },
    });

    let locationRecord;
    if (existing) {
      locationRecord = await UserLocation.findByIdAndUpdate(
        existing._id,
        {
          $inc: { usersCount: 1 },
          $set: {
            countryCode: countryCode || existing.countryCode,
            lastActive: new Date(),
            ...(latitude ? { latitude } : {}),
            ...(longitude ? { longitude } : {}),
          },
        },
        { new: true }
      );
    } else {
      locationRecord = await UserLocation.findOneAndUpdate(
        { city, country },
        {
          $inc: { usersCount: 1 },
          $set: {
            countryCode,
            lastActive: new Date(),
            ...(latitude ? { latitude } : {}),
            ...(longitude ? { longitude } : {}),
          },
          $setOnInsert: {
            createdAt: new Date(),
          },
        },
        {
          upsert: true,
          new: true,
          setDefaultsOnInsert: true,
        }
      );
    }

    return NextResponse.json({
      success: true,
      location: {
        city: locationRecord.city,
        country: locationRecord.country,
        countryCode: locationRecord.countryCode,
        usersCount: locationRecord.usersCount,
        lastActive: locationRecord.lastActive,
      },
    });
  } catch (err) {
    console.error('User Location Ping Error:', err);
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}
