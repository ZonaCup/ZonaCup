import { NextResponse } from 'next/server';
import { isRiotConfigured } from '@/lib/riot';

export async function GET() {
  return NextResponse.json({
    configured: isRiotConfigured(),
  });
}
