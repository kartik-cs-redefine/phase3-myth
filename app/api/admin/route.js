import { NextResponse } from 'next/server';
import { createHmac, timingSafeEqual } from 'crypto';

const cookieName = 'myth-admin-session';
const production = process.env.NODE_ENV === 'production';
const adminPin = process.env.ADMIN_PIN || (production ? '' : '1080');

export const hasAdminSession = (request) => {
  if (!adminPin) return false;
  const session = request.cookies.get(cookieName)?.value;
  const expected = createHmac('sha256', adminPin).update('myth-admin-session').digest('hex');
  if (!session || session.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(session), Buffer.from(expected));
};

export async function POST(request) {
  let payload;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ valid: false, error: 'Invalid JSON payload' }, { status: 400 });
  }
  if (!adminPin || typeof payload.pin !== 'string') return NextResponse.json({ valid: false }, { status: 401 });
  const pin = Buffer.from(payload.pin);
  const expected = Buffer.from(adminPin);
  const valid = pin.length === expected.length && timingSafeEqual(pin, expected);
  const response = NextResponse.json({ valid });
  if (valid) {
    response.cookies.set(cookieName, createHmac('sha256', adminPin).update('myth-admin-session').digest('hex'), {
      httpOnly: true,
      sameSite: 'strict',
      secure: production,
      path: '/',
      maxAge: 60 * 60 * 8
    });
  }
  return response;
}
