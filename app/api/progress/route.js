import { NextResponse } from 'next/server';
import { hasAdminSession } from '../admin/route';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, '');
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const configured = Boolean(url && key);
const participants = new Set(['Kartik Kumar', 'Tanmay Awasthi', 'Kanika Dwivedi', 'Krish Chaddha', 'Krishna Kumar Gaur', 'Avantika Yadav', 'Kshitij Rajput']);
const headers = () => ({ apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' });

export async function GET() {
  if (!configured) return NextResponse.json({ configured: false, records: [] });
  try {
    const response = await fetch(`${url}/rest/v1/progress?select=participant,day,vocab,speech,weekly_report,vocab_submitted_at,speech_submitted_at,weekly_report_submitted_at,updated_at`, { headers: headers(), cache: 'no-store' });
    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json({ configured: true, records: [], error: errorText, status: response.status }, { status: 500 });
    }
    return NextResponse.json({ configured: true, records: await response.json() });
  } catch (err) { return NextResponse.json({ configured: true, records: [], error: err.message }, { status: 503 }); }
}

export async function PUT(request) {
  let payload;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 });
  }
  const { participant, day, vocab, speech, report, vocabAt, speechAt, reportAt } = payload;
  if (!hasAdminSession(request)) return NextResponse.json({ error: 'Admin authorization required' }, { status: 401 });
  if (!configured) return NextResponse.json({ configured: false });
  if (typeof participant !== 'string' || !participants.has(participant) || !Number.isInteger(day) || day < 1 || day > 30 || typeof vocab !== 'boolean' || typeof speech !== 'boolean' || typeof report !== 'boolean' || ![vocabAt, speechAt, reportAt].every((value) => value === null || (typeof value === 'string' && !Number.isNaN(Date.parse(value))))) {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
  }
  try {
    const response = await fetch(`${url}/rest/v1/progress?on_conflict=participant,day`, {
      method: 'POST', headers: { ...headers(), Prefer: 'resolution=merge-duplicates,return=representation' },
      body: JSON.stringify({ participant, day, vocab, speech, weekly_report: report, vocab_submitted_at: vocabAt, speech_submitted_at: speechAt, weekly_report_submitted_at: reportAt, updated_at: new Date().toISOString() })
    });
    if (!response.ok) throw new Error(await response.text());
    return NextResponse.json({ configured: true, record: (await response.json())[0] });
  } catch (error) { return NextResponse.json({ error: 'Database unavailable', detail: error.message }, { status: 503 }); }
}
