import { NextResponse } from 'next/server';
import { hasAdminSession } from '../admin/route';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, '');
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const configured = Boolean(url && key);
const headers = () => ({ apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' });

export async function GET() {
  if (!configured) return NextResponse.json({ configured: false, feedback: [] });
  try {
    const [feedbackResponse, votesResponse] = await Promise.all([
      fetch(`${url}/rest/v1/feedback?select=id,message,created_at&order=created_at.desc&limit=100`, { headers: headers(), cache: 'no-store' }),
      fetch(`${url}/rest/v1/feedback_votes?select=feedback_id,vote`, { headers: headers(), cache: 'no-store' })
    ]);
    if (!feedbackResponse.ok || !votesResponse.ok) throw new Error('Feedback tables are unavailable');
    const [feedback, votes] = await Promise.all([feedbackResponse.json(), votesResponse.json()]);
    const scores = new Map();
    votes.forEach(({ feedback_id, vote }) => scores.set(feedback_id, (scores.get(feedback_id) || 0) + vote));
    return NextResponse.json({ configured: true, feedback: feedback.map((item) => ({ ...item, score: scores.get(item.id) || 0 })) });
  } catch {
    return NextResponse.json({ configured: true, feedback: [], error: 'Feedback unavailable' }, { status: 503 });
  }
}

export async function POST(request) {
  let payload;
  try { payload = await request.json(); } catch { return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 }); }
  const message = typeof payload.message === 'string' ? payload.message.trim() : '';
  if (!message || message.length > 1000) return NextResponse.json({ error: 'Feedback must be between 1 and 1000 characters' }, { status: 400 });
  if (!configured) return NextResponse.json({ configured: false });
  try {
    const response = await fetch(`${url}/rest/v1/feedback`, { method: 'POST', headers: { ...headers(), Prefer: 'return=representation' }, body: JSON.stringify({ message }) });
    if (!response.ok) throw new Error();
    return NextResponse.json({ configured: true, feedback: { ...(await response.json())[0], score: 0 } }, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Feedback could not be saved' }, { status: 503 });
  }
}

export async function PUT(request) {
  let payload;
  try { payload = await request.json(); } catch { return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 }); }
  const { feedbackId, voterId, vote } = payload;
  if (!Number.isInteger(feedbackId) || feedbackId < 1 || typeof voterId !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(voterId) || ![-1, 1].includes(vote)) return NextResponse.json({ error: 'Invalid vote' }, { status: 400 });
  if (!configured) return NextResponse.json({ configured: false });
  try {
    const response = await fetch(`${url}/rest/v1/rpc/cast_feedback_vote`, { method: 'POST', headers: headers(), body: JSON.stringify({ p_feedback_id: feedbackId, p_voter_id: voterId, p_vote: vote }) });
    if (!response.ok) throw new Error(await response.text());
    return NextResponse.json({ configured: true, vote: (await response.json())[0] });
  } catch (error) {
    const response = { error: 'Vote could not be saved' };
    if (process.env.NODE_ENV !== 'production') response.detail = error.message;
    return NextResponse.json(response, { status: 503 });
  }
}

export async function DELETE(request) {
  if (!hasAdminSession(request)) return NextResponse.json({ error: 'Admin authorization required' }, { status: 401 });
  let payload;
  try { payload = await request.json(); } catch { return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 }); }
  const { feedbackId } = payload;
  if (!Number.isInteger(feedbackId) || feedbackId < 1) return NextResponse.json({ error: 'Invalid feedback ID' }, { status: 400 });
  if (!configured) return NextResponse.json({ configured: false });
  try {
    const response = await fetch(`${url}/rest/v1/feedback?id=eq.${feedbackId}`, { method: 'DELETE', headers: { ...headers(), Prefer: 'return=representation' } });
    if (!response.ok) throw new Error(await response.text());
    const deleted = await response.json();
    if (!deleted.length) return NextResponse.json({ error: 'Feedback not found' }, { status: 404 });
    return NextResponse.json({ configured: true, deletedId: feedbackId });
  } catch (error) {
    const response = { error: 'Feedback could not be deleted' };
    if (process.env.NODE_ENV !== 'production') response.detail = error.message;
    return NextResponse.json(response, { status: 503 });
  }
}
