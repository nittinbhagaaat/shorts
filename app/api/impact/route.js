import { NextResponse } from 'next/server';
import { dbConnect } from '@/lib/db';
import UserLocation from '@/models/UserLocation';
import { TIER_CONFIG } from '@/lib/impactMapData';

export async function GET() {
  try {
    await dbConnect();

    // Query location records only
    let locations = await UserLocation.find({}).sort({ usersCount: -1 }).lean();

    // If no locations exist yet, initialize default record for Kolkata, India
    if (!locations || locations.length === 0) {
      const defaultLoc = await UserLocation.findOneAndUpdate(
        { city: 'Kolkata', country: 'India' },
        {
          $setOnInsert: {
            countryCode: 'IND',
            usersCount: 1,
            lastActive: new Date(),
            createdAt: new Date(),
          },
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
      locations = [defaultLoc.toObject ? defaultLoc.toObject() : defaultLoc];
    }

    // Calculate aggregated metrics from location records only
    const totalUsers = locations.reduce((acc, loc) => acc + (loc.usersCount || 0), 0);
    const uniqueCountries = Array.from(new Set(locations.map((l) => l.country)));
    const totalCities = locations.length;
    const topLocation = locations[0] ? `${locations[0].city}, ${locations[0].country}` : 'Kolkata, India';

    // Group users by country for map coloring (darker for more users, lighter for less)
    const countryStats = {};
    for (const loc of locations) {
      const c = loc.country;
      if (!countryStats[c]) {
        countryStats[c] = {
          name: c,
          code: loc.countryCode || c.slice(0, 3).toUpperCase(),
          usersCount: 0,
          cities: [],
          topCity: loc.city,
          lastActive: loc.lastActive,
        };
      }
      countryStats[c].usersCount += loc.usersCount;
      countryStats[c].cities.push({
        city: loc.city,
        users: loc.usersCount,
      });
      if (new Date(loc.lastActive) > new Date(countryStats[c].lastActive)) {
        countryStats[c].lastActive = loc.lastActive;
      }
    }

    // Determine color tier per country: darker for more users, lighter for less users
    for (const c of Object.keys(countryStats)) {
      const u = countryStats[c].usersCount;
      let tier = 1; // "A few downloads" (lighter)
      if (u >= 15) {
        tier = 3; // "A hotspot" (dark red / darker)
      } else if (u >= 5) {
        tier = 2; // "A steady stream" (orange)
      }
      countryStats[c].tier = tier;
      countryStats[c].label =
        tier === 3 ? 'A hotspot' : tier === 2 ? 'A steady stream' : 'A few downloads';
    }

    return NextResponse.json({
      success: true,
      stats: {
        totalUsers,
        totalCities,
        totalCountries: uniqueCountries.length,
        topLocation,
      },
      locations,
      countryStats,
      tierConfig: TIER_CONFIG,
    });
  } catch (err) {
    console.error('Impact Location Data Error:', err);
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}
