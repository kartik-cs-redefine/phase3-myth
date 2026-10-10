import { NextResponse } from 'next/server';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const configured = Boolean(url && key);
const headers = () => ({ apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' });

export async function GET() {
  if (!configured) return NextResponse.json({ configured: false, records: [] });
  try {
    const response = await fetch(`${url}/rest/v1/progress?select=participant,day,vocab,speech,updated_at`, { headers: headers(), cache: 'no-store' });
    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json({ configured: true, records: [], error: errorText, status: response.status }, { status: 500 });
    }
    return NextResponse.json({ configured: true, records: await response.json() });
  } catch (err) { return NextResponse.json({ configured: true, records: [], error: err.message }, { status: 503 }); }
}

export async function PUT(request) {
  const { participant, day, vocab, speech } = await request.json();
  if (!configured) return NextResponse.json({ configured: false });
  if (!participant || !Number.isInteger(day)) return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
  try {
    const response = await fetch(`${url}/rest/v1/progress?on_conflict=participant,day`, {
      method: 'POST', headers: { ...headers(), Prefer: 'resolution=merge-duplicates,return=representation' },
      body: JSON.stringify({ participant, day, vocab, speech, updated_at: new Date().toISOString() })
    });
    if (!response.ok) throw new Error('Supabase write failed');
    return NextResponse.json({ configured: true, record: (await response.json())[0] });
  } catch { return NextResponse.json({ error: 'Database unavailable' }, { status: 503 }); }
}
