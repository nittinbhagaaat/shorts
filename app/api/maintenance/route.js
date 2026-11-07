// app/api/maintenance/route.js
import { NextResponse } from 'next/server';
import { getAuthUser, isUserAdmin, ADMIN_EMAIL } from '@/lib/auth';
import { extractServerConfig } from '@/lib/serverConfig';
import { getMaintenanceStatus, setMaintenanceStatus } from '@/lib/maintenance';

export const dynamic = 'force-dynamic';

export async function GET(req) {
  try {
    const { mongodbUri } = extractServerConfig(req);
    const authUser = await getAuthUser(req);
    const isAdmin = Boolean(authUser && isUserAdmin(authUser));
    const config = await getMaintenanceStatus(mongodbUri);

    return NextResponse.json(
      {
        enabled: Boolean(config.enabled),
        message: config.message,
        estimatedTime: config.estimatedTime,
        updatedAt: config.updatedAt,
        isAdmin,
      },
      {
        headers: {
          'Cache-Control': 'private, no-store, no-cache, must-revalidate, max-age=0',
          'Pragma': 'no-cache',
          'Vary': 'Cookie, Authorization',
        },
      }
    );
  } catch (err) {
    console.error('API MAINTENANCE GET: Error:', err);
    return NextResponse.json(
      { enabled: false, error: err.message },
      {
        status: 500,
        headers: {
          'Cache-Control': 'private, no-store, no-cache, must-revalidate, max-age=0',
          'Pragma': 'no-cache',
        },
      }
    );
  }
}

export async function POST(req) {
  try {
    const authUser = await getAuthUser(req);
    const isAdmin = isUserAdmin(authUser);

    if (!isAdmin) {
      return NextResponse.json(
        { error: 'Forbidden: Admin access required.' },
        { status: 403 }
      );
    }

    const { mongodbUri } = extractServerConfig(req);
    const body = await req.json();
    const { enabled, message, estimatedTime } = body;

    const updated = await setMaintenanceStatus(
      {
        enabled: Boolean(enabled),
        message,
        estimatedTime,
        updatedBy: authUser?.email || ADMIN_EMAIL,
      },
      mongodbUri
    );

    return NextResponse.json({
      success: true,
      message: `Maintenance mode ${updated.enabled ? 'activated' : 'deactivated'} successfully.`,
      maintenance: updated,
    });
  } catch (err) {
    console.error('API MAINTENANCE POST: Error:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to update maintenance status' },
      { status: 500 }
    );
  }
}

