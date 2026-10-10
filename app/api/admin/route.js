import { NextResponse } from 'next/server';

export async function POST(request) {
  const { pin } = await request.json();
  const valid = pin === (process.env.ADMIN_PIN || '1080');
  return NextResponse.json({ valid });
}
