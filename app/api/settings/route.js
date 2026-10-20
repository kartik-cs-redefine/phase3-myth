import { NextResponse } from 'next/server';
import { hasAdminSession } from '../admin/route';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, '');
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const configured = Boolean(url && key);
const headers = () => ({ apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' });

export async function GET() {
  if (!configured) return NextResponse.json({ configured: false });
  try {
    const response = await fetch(`${url}/rest/v1/tracker_settings?id=eq.1&select=current_day`, { headers: headers(), cache: 'no-store' });
    if (!response.ok) throw new Error(await response.text());
    const [settings] = await response.json();
    return NextResponse.json({ configured: true, currentDay: settings?.current_day ?? null });
  } catch {
    return NextResponse.json({ configured: true, error: 'Settings unavailable' }, { status: 503 });
  }
}

export async function PUT(request) {
  if (!hasAdminSession(request)) return NextResponse.json({ error: 'Admin authorization required' }, { status: 401 });
  let payload;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 });
  }
  const { currentDay } = payload;
  if (!Number.isInteger(currentDay) || currentDay < 1 || currentDay > 30) return NextResponse.json({ error: 'Invalid tracker day' }, { status: 400 });
  if (!configured) return NextResponse.json({ configured: false });
  try {
    const response = await fetch(`${url}/rest/v1/tracker_settings?on_conflict=id`, {
      method: 'POST',
      headers: { ...headers(), Prefer: 'resolution=merge-duplicates,return=representation' },
      body: JSON.stringify({ id: 1, current_day: currentDay, updated_at: new Date().toISOString() })
    });
    if (!response.ok) throw new Error(await response.text());
    return NextResponse.json({ configured: true, currentDay: (await response.json())[0].current_day });
  } catch {
    return NextResponse.json({ error: 'Settings unavailable' }, { status: 503 });
  }
}
