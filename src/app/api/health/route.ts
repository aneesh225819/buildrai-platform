/**
 * Health Check Endpoint
 * Used by load balancers and monitoring systems
 *
 * Note: This is a basic health check that only verifies the service is running.
 * Database connectivity is checked separately to avoid health check failures
 * during deployment when secrets may not be fully configured yet.
 */

import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'buildrai-platform',
    version: process.env.npm_package_version || '1.0.0',
    environment: process.env.NODE_ENV || 'production',
    uptime: process.uptime(),
  }, { status: 200 });
}
