"use client";
import { useEffect, useMemo, useState } from "react";
import { CalendarDays, Check, CheckCircle2, Cloud, Flame, LockKeyhole, Medal, MessageCircle, Moon, Send, Sparkles, Sun, ThumbsDown, ThumbsUp, Trash2, Trophy, X } from "lucide-react";
import TechText from "../components/TechText";
import SideRays from "../components/SideRays";
import AeroShards from "../components/AeroShards";

const people = ["Kartik Kumar", "Tanmay Awasthi", "Kanika Dwivedi", "Krish Chaddha", "Krishna Kumar Gaur", "Avantika Yadav", "Kshitij Rajput"];
const storageKey = "myth-phase-3-progress";
const atNoon = (date = new Date()) => { const value = new Date(date); value.setHours(12, 0, 0, 0); return value; };
const isSunday = (date) => date.getDay() === 0;
// The tracker runs Monday–Saturday. Sunday never consumes a challenge day.
const completedOperationalDaysThisMonth = () => {
  const today = atNoon();
  let count = 0;
  for (let date = new Date(today.getFullYear(), today.getMonth(), 1, 12); date <= today; date.setDate(date.getDate() + 1)) {
    if (!isSunday(date)) count += 1;
  }
  return count;
};
const defaultTrackerDay = Math.min(30, Math.max(1, completedOperationalDaysThisMonth()));
const trackerDayKey = "myth-phase-3-current-day";
const feedbackKey = "myth-phase-3-feedback";
const feedbackVotesKey = "myth-phase-3-feedback-votes";
const feedbackVoterKey = "myth-phase-3-feedback-voter";
const blank = () => Object.fromEntries(people.map((name) => [name, Object.fromEntries(Array.from({ length: 30 }, (_, i) => [i + 1, { vocab: false, speech: false, report: false, vocabAt: null, speechAt: null, reportAt: null }]))]));
const storedJson = (key, fallback) => { try { return JSON.parse(localStorage.getItem(key) || "") || fallback; } catch { return fallback; } };
const initials = (name) => name.split(" ").map((word) => word[0]).join("").slice(0, 2);
const challengeDate = (day, currentDay) => {
  const date = atNoon();
  // On Sunday, keep the tracker on Saturday's challenge day.
  if (isSunday(date)) date.setDate(date.getDate() - 1);
  let remaining = Math.abs(day - currentDay);
  const direction = Math.sign(day - currentDay);
  while (remaining > 0) {
    date.setDate(date.getDate() + direction);
    if (!isSunday(date)) remaining -= 1;
  }
  return date;
};
const taskFields = (day, currentDay) => challengeDate(day, currentDay).getDay() === 6 ? ["speech", "report"] : ["vocab", "speech"];
const scheduleColumns = (currentDay) => {
  const columns = [];
  let previousDate = null;
  for (let day = 1; day <= 30; day += 1) {
    const date = challengeDate(day, currentDay);
    if (previousDate) {
      const gapDate = new Date(previousDate);
      gapDate.setDate(gapDate.getDate() + 1);
      while (gapDate < date) {
        if (isSunday(gapDate)) columns.push({ key: `rest-${gapDate.toISOString()}`, afterDay: day - 1, rest: true });
        gapDate.setDate(gapDate.getDate() + 1);
      }
    }
    columns.push({ key: `day-${day}`, day, rest: false });
    previousDate = date;
  }
  return columns;
};
const status = (item, day, currentDay) => { const fields = taskFields(day, currentDay); if (!fields.length) return "rest"; const complete = fields.filter((field) => item[field]).length; return complete === fields.length ? "done" : complete ? "partial" : day < currentDay - 1 ? "missed" : "pending"; };
function streak(days, currentDay) { let best = 0, current = 0; for (let d = 1; d <= 30; d += 1) { const fields = taskFields(d, currentDay); if (!fields.length) continue; current = fields.every((field) => days[d][field]) ? current + 1 : 0; best = Math.max(best, current); } return best; }
const timestampKey = (field) => `${field}At`;
function earlySubmissionPoints(progress, currentDay) { const points = Object.fromEntries(people.map((person) => [person, 0])); for (let day = 1; day <= 30; day += 1) { for (const field of taskFields(day, currentDay)) { const submissions = people.map((person) => ({ person, timestamp: progress[person][day][timestampKey(field)] })).filter(({ timestamp }) => timestamp).sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp)); submissions.forEach(({ person }, rank) => { points[person] += Math.max(8, 20 - rank * 2); }); } } return points; }

export default function Home() {
  const [progress, setProgress] = useState(blank), [admin, setAdmin] = useState(false), [modal, setModal] = useState(false), [pin, setPin] = useState(""), [error, setError] = useState(""), [filter, setFilter] = useState("all"), [cloud, setCloud] = useState(false), [theme, setTheme] = useState("dark"), [toast, setToast] = useState(null), [entered, setEntered] = useState(false), [launching, setLaunching] = useState(false), [dataLoading, setDataLoading] = useState(true), [trackerDay, setTrackerDay] = useState(defaultTrackerDay), [dayModal, setDayModal] = useState(false), [draftDay, setDraftDay] = useState(""), [feedback, setFeedback] = useState([]), [feedbackDraft, setFeedbackDraft] = useState(""), [feedbackSending, setFeedbackSending] = useState(false), [feedbackVotes, setFeedbackVotes] = useState({}), [voterId, setVoterId] = useState("");
  const notify = (message, type = "ok") => { setToast({ message, type }); window.setTimeout(() => setToast(null), 2200); };
  useEffect(() => {
    const savedTheme = localStorage.getItem("myth-theme") || "dark";
    setTheme(savedTheme); document.documentElement.classList.toggle("dark", savedTheme === "dark");
    const savedTrackerDay = Number(localStorage.getItem(trackerDayKey));
    setTrackerDay(Number.isInteger(savedTrackerDay) && savedTrackerDay >= 1 && savedTrackerDay <= 30 ? savedTrackerDay : defaultTrackerDay);
    const fallback = JSON.parse(localStorage.getItem(storageKey) || "null") || blank();
    (async () => { try {
      const response = await fetch("/api/progress", { cache: "no-store" }); const data = await response.json();
      if (!response.ok || !data.configured) return setProgress(fallback);
      setCloud(true); const remote = blank();
      (data.records || []).forEach((row) => { if (remote[row.participant]?.[row.day]) remote[row.participant][row.day] = { vocab: Boolean(row.vocab), speech: Boolean(row.speech), report: Boolean(row.weekly_report), vocabAt: row.vocab_submitted_at, speechAt: row.speech_submitted_at, reportAt: row.weekly_report_submitted_at }; });
      setProgress(remote);
      const settingsResponse = await fetch("/api/settings", { cache: "no-store" });
      const settings = await settingsResponse.json();
      if (settingsResponse.ok && Number.isInteger(settings.currentDay)) { setTrackerDay(settings.currentDay); localStorage.setItem(trackerDayKey, String(settings.currentDay)); }
    } catch { setProgress(fallback); } finally { setDataLoading(false); } })();
  }, []);
  useEffect(() => {
    const fallback = storedJson(feedbackKey, []);
    setFeedback(fallback); setFeedbackVotes(storedJson(feedbackVotesKey, {}));
    let nextVoterId = localStorage.getItem(feedbackVoterKey);
    if (!nextVoterId) { nextVoterId = crypto.randomUUID(); localStorage.setItem(feedbackVoterKey, nextVoterId); }
    setVoterId(nextVoterId);
    (async () => { try {
      const response = await fetch("/api/feedback", { cache: "no-store" }); const data = await response.json();
      if (response.ok && data.configured) setFeedback(data.feedback || []);
    } catch { /* Local feedback remains available offline. */ } })();
  }, []);
  const stats = useMemo(() => {
    const earlyPoints = earlySubmissionPoints(progress, trackerDay); const rows = people.map((name) => { const memberDays = progress[name], completed = Object.entries(memberDays).filter(([day, item]) => { const fields = taskFields(Number(day), trackerDay); return fields.length && fields.every((field) => item[field]); }).length, tasks = Object.entries(memberDays).reduce((sum, [day, item]) => sum + taskFields(Number(day), trackerDay).filter((field) => item[field]).length, 0), run = streak(memberDays, trackerDay); return { name, completed, tasks, run, earlyPoints: earlyPoints[name], score: tasks * 10 + earlyPoints[name] }; }).sort((a, b) => b.score - a.score);
    const targets = people.length * Array.from({ length: 30 }, (_, i) => taskFields(i + 1, trackerDay).length).reduce((sum, count) => sum + count, 0); const tasks = rows.reduce((sum, row) => sum + row.tasks, 0); return { rows, tasks, targets, consistency: Math.round(tasks / targets * 100) };
  }, [progress, trackerDay]);
  const days = useMemo(() => {
    const columns = scheduleColumns(trackerDay);
    if (filter === "all") return columns;
    if (filter === "back") return columns.filter((column) => (column.rest ? column.afterDay : column.day) < trackerDay);
    const firstDay = (Number(filter) - 1) * 7 + 1;
    const lastDay = Math.min(30, firstDay + 6);
    return columns.filter((column) => {
      const relatedDay = column.rest ? column.afterDay : column.day;
      return relatedDay >= firstDay && relatedDay <= lastDay;
    });
  }, [filter, trackerDay]);
  async function toggle(person, day, field) {
    if (!admin) return notify("Admin mode required to edit", "lock");
    const checked = !progress[person][day][field], value = { ...progress[person][day], vocabAt: progress[person][day].vocabAt ?? null, speechAt: progress[person][day].speechAt ?? null, reportAt: progress[person][day].reportAt ?? null, [field]: checked, [timestampKey(field)]: checked ? new Date().toISOString() : null }, next = { ...progress, [person]: { ...progress[person], [day]: value } };
    setProgress(next); localStorage.setItem(storageKey, JSON.stringify(next));
    if (!cloud) return notify("Saved on this device", "lock");
    try { const response = await fetch("/api/progress", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ participant: person, day, ...value }) }); if (!response.ok) throw new Error(); notify("Saved to cloud"); } catch { notify("Cloud save failed — retained locally", "lock"); }
  }
  async function unlock(event) {
    event.preventDefault(); setError("");
    try { const response = await fetch("/api/admin", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ pin }) }); if (!(await response.json()).valid) throw new Error(); setAdmin(true); setModal(false); setPin(""); notify("Admin mode unlocked"); } catch { setError("Incorrect PIN. Try again."); }
  }
  async function saveTrackerDay(event) {
    event.preventDefault();
    const nextDay = Number(draftDay);
    if (!Number.isInteger(nextDay) || nextDay < 1 || nextDay > 30) return notify("Enter a day from 1 to 30", "lock");
    setTrackerDay(nextDay); localStorage.setItem(trackerDayKey, String(nextDay)); setDayModal(false);
    if (!cloud) return notify("Tracker day saved on this device", "lock");
    try {
      const response = await fetch("/api/settings", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ currentDay: nextDay }) });
      if (!response.ok) throw new Error();
      notify(`Tracker set to Day ${nextDay}`);
    } catch { notify("Cloud save failed — retained on this device", "lock"); }
  }
  const toggleTheme = () => { const next = theme === "dark" ? "light" : "dark"; setThemeState(next); };
  function setThemeState(next) { setTheme(next); localStorage.setItem("myth-theme", next); document.documentElement.classList.toggle("dark", next === "dark"); }
  async function copyReport() { try { await navigator.clipboard.writeText(`TEAM MYTH — PHASE 3\nDay ${trackerDay} of 30 · ${stats.consistency}% consistency\n\n${stats.rows.slice(0, 3).map((row, i) => `${["🥇", "🥈", "🥉"][i]} ${row.name}`).join("\n")}`); notify("WhatsApp report copied"); } catch { notify("Could not copy the report", "lock"); } }
  async function submitFeedback(event) {
    event.preventDefault(); const message = feedbackDraft.trim();
    if (!message) return notify("Write feedback before sending", "lock");
    setFeedbackSending(true);
    const localFeedback = { id: `local-${Date.now()}`, message, created_at: new Date().toISOString(), score: 0 };
    try {
      if (!cloud) throw new Error();
      const response = await fetch("/api/feedback", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ message }) });
      const data = await response.json(); if (!response.ok) throw new Error();
      setFeedback((current) => [data.feedback, ...current]); setFeedbackDraft(""); notify("Anonymous feedback shared");
    } catch {
      setFeedback((current) => { const next = [localFeedback, ...current]; localStorage.setItem(feedbackKey, JSON.stringify(next)); return next; });
      setFeedbackDraft(""); notify("Saved on this device", "lock");
    } finally { setFeedbackSending(false); }
  }
  async function voteFeedback(feedbackId, vote) {
    const previousVote = feedbackVotes[feedbackId] || 0;
    if (previousVote === vote) return;
    const applyVote = (score) => setFeedback((current) => current.map((item) => item.id === feedbackId ? { ...item, score } : item));
    const nextVotes = { ...feedbackVotes, [feedbackId]: vote };
    setFeedbackVotes(nextVotes); localStorage.setItem(feedbackVotesKey, JSON.stringify(nextVotes));
    applyVote((feedback.find((item) => item.id === feedbackId)?.score || 0) + vote - previousVote);
    try {
      if (!cloud || typeof feedbackId !== "number" || !voterId) throw new Error();
      const response = await fetch("/api/feedback", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ feedbackId, voterId, vote }) });
      const data = await response.json(); if (!response.ok) throw new Error();
      applyVote(data.vote.score);
    } catch {
      setFeedback((current) => { localStorage.setItem(feedbackKey, JSON.stringify(current)); return current; });
      notify("Vote saved on this device", "lock");
    }
  }
  async function deleteFeedback(feedbackId) {
    if (!window.confirm("Delete this feedback permanently? Its votes will also be removed.")) return;
    const removeFromScreen = () => setFeedback((current) => { const next = current.filter((item) => item.id !== feedbackId); localStorage.setItem(feedbackKey, JSON.stringify(next)); return next; });
    if (!cloud || typeof feedbackId !== "number") { removeFromScreen(); return notify("Deleted from this device", "lock"); }
    try {
      const response = await fetch("/api/feedback", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ feedbackId }) });
      if (!response.ok) throw new Error();
      removeFromScreen(); notify("Feedback deleted from cloud");
    } catch { notify("Cloud delete failed", "lock"); }
  }
  const featuredFeedback = useMemo(() => feedback.reduce((best, item) => !best || item.score > best.score ? item : best, null), [feedback]);
  const enterDashboard = () => {
    if (launching) return;
    setLaunching(true);
    window.setTimeout(() => { setEntered(true); setLaunching(false); }, 900);
  };
  if (!entered) return <main className={`landing ${launching ? "launching" : ""}`}><AeroShards /><div className="landing-content"><p className="landing-badge">✦ TEAM MYTH PRESENTS</p><h1>ENGLISH <span>— PHASE 3</span></h1><p className="landing-subtitle">Speak with Conviction. Build Consistency. One Day at a Time.</p><button onClick={enterDashboard} disabled={launching}>Get Started <b>→</b></button></div><div className="launch-portal" aria-hidden="true"><i /><i /><i /></div><small>30-Day Speaking &amp; Technical Communication Challenge · 7 Participants</small></main>;
  return <main className={`app ${dataLoading ? "dashboard-loading" : "dashboard-ready"}`}><SideRays />
    {dataLoading && <DashboardLoading />}
    <nav><div className="brand"><b>M</b><div><strong>TEAM MYTH</strong><span>● Live Phase 3</span></div></div><div className="nav"><i>Day {trackerDay} <em>of 30</em></i><button onClick={toggleTheme} aria-label="Toggle theme">{theme === "dark" ? <Sun /> : <Moon />}</button>{admin && <button onClick={() => { setDraftDay(String(trackerDay)); setDayModal(true); }}><CalendarDays /> Set day</button>}<button className={admin ? "on" : ""} onClick={() => admin ? setAdmin(false) : setModal(true)}><LockKeyhole /> {admin ? "Editing on" : "Admin unlock"}</button></div></nav>
    <section className="hero"><p><Sparkles /> ENGLISH INITIATIVE · PHASE 3</p><h1>Build momentum.<br /><span>One day at a time.</span></h1><small><Cloud /> {cloud ? "Cloud sync active" : "Device-saved workspace"}</small></section>
    <section className="bento"><Card title="Team consistency" value={`${stats.consistency}%`} sub="Across every scheduled check-in" ring={stats.consistency} /><Card title="Total submissions" value={stats.tasks} sub={`of ${stats.targets} team targets`} /><article><label>Active pace <Flame /></label><div className="person"><b>{initials(stats.rows[0].name)}</b><strong>{stats.rows[0].name}<small>Leading the rhythm</small></strong></div><p className="orange"><Flame /> {stats.rows[0].run} day streak</p></article><article className="share"><Send /><div><strong>Celebrate the wins</strong><p>Send today’s standings to the group.</p></div><button onClick={copyReport}>Copy WhatsApp report</button></article></section>
    <FeedbackBoard feedback={feedback} featuredFeedback={featuredFeedback} draft={feedbackDraft} sending={feedbackSending} votes={feedbackVotes} admin={admin} onDraftChange={setFeedbackDraft} onSubmit={submitFeedback} onVote={voteFeedback} onDelete={deleteFeedback} />
    <Title text="Top performers" /><section className="podium">{stats.rows.slice(0, 3).map((row, i) => <article className={`place p${i + 1}`} key={row.name}><Medal /><small>0{i + 1} · {["GOLD", "SILVER", "BRONZE"][i]}</small><div className="person"><b>{initials(row.name)}</b><strong>{row.name}<small>{row.completed} completed days</small></strong></div><footer><i>{row.score} score · {row.earlyPoints} early</i><span><Flame /> {row.run} streak</span></footer></article>)}</section>
    <section className="matrix"><header><div><p>30-DAY OPERATING SYSTEM</p><h2>Daily progress matrix</h2><small>Vocabulary Monday–Friday, speech Monday–Saturday, and a Saturday report.</small></div><b>{admin ? "Editing enabled" : "Viewer mode"}</b></header><div className="tabs">{[["all", "All Days"], ["1", "Week 1 · D1–D7"], ["2", "Week 2 · D8–D14"], ["3", "Week 3 · D15–D21"], ["4", "Week 4 · D22–D30"], ["back", "Pending Backlogs"]].map(([value, label]) => <button key={value} className={filter === value ? "active" : ""} onClick={() => setFilter(value)}>{label}</button>)}</div><div className="legend">● Complete　● Partial　● Pending　● Missed <span><b className="vocab-key">V Vocabulary</b> · <b className="speech-key">S Speech</b> · <b className="report-key">R Weekly report</b></span></div><div className="scroll"><table><thead><tr><th>Participant</th>{days.map((column) => <th key={column.key} className={!column.rest && column.day === trackerDay ? "today" : ""}>{column.rest ? <>Rest<br />day</> : <>Day<br />{column.day}</>}</th>)}</tr></thead><tbody>{people.map((person) => { const row = stats.rows.find((item) => item.name === person); return <tr key={person}><td><b>{initials(person)}</b><div><strong>{person}</strong><small>{person === "Kartik Kumar" ? "Team lead" : "Member"} · <i>{row.score} pts</i></small></div></td>{days.map((column) => { if (column.rest) return <td key={column.key}><div className="rest">Rest day</div></td>; const fields = taskFields(column.day, trackerDay); return <td key={column.key}><div className={status(progress[person][column.day], column.day, trackerDay)}>{fields.map((field) => <Chip key={field} label={field === "report" ? "R" : field === "vocab" ? "V" : "S"} tone={field} value={progress[person][column.day][field]} onClick={() => toggle(person, column.day, field)} />)}</div></td>; })}</tr>; })}</tbody></table></div><footer>V Vocabulary: Monday–Friday　 ·　S Speech: Monday–Saturday　 ·　R Weekly report: Saturday</footer></section>
    {toast && <aside className={toast.type}>{toast.type === "lock" ? <LockKeyhole /> : <CheckCircle2 />}{toast.message}</aside>}
    {modal && <div className="back" onMouseDown={() => setModal(false)}><form onMouseDown={(event) => event.stopPropagation()} onSubmit={unlock}><button className="close" type="button" onClick={() => setModal(false)}><X /></button><LockKeyhole /><p>RESTRICTED WORKSPACE</p><h2>Admin unlock</h2><small>Enter the team PIN to update daily submissions.</small><input value={pin} onChange={(event) => setPin(event.target.value)} placeholder="••••" type="password" autoFocus /><em>{error}</em><button>Unlock workspace</button></form></div>}
    {dayModal && <div className="back" onMouseDown={() => setDayModal(false)}><form onMouseDown={(event) => event.stopPropagation()} onSubmit={saveTrackerDay}><button className="close" type="button" onClick={() => setDayModal(false)}><X /></button><CalendarDays /><p>TRACKER CONTROL</p><h2>Set current tracker day</h2><small>Use the group&apos;s actual challenge day, not today&apos;s calendar date.</small><input value={draftDay} onChange={(event) => setDraftDay(event.target.value)} min="1" max="30" inputMode="numeric" type="number" autoFocus /><em></em><button>Save tracker day</button></form></div>}
    <section className="myth-tech-footer" aria-label="Team MYTH interactive banner"><TechText text="MYTH" fontSize={300} fontWeight={700} accentColor="#f59e0b" /></section>
  </main>;
}
function Chip({ label, tone, value, onClick }) { return <button className={`${tone} ${value ? "checked" : ""}`} onClick={onClick} aria-label={`${label} complete`}>{value ? <Check /> : label}</button>; }
function Card({ title, value, sub, ring }) { return <article><label>{title}</label><strong>{value}</strong>{ring !== undefined && <div className="ring" style={{ "--p": `${ring * 3.6}deg` }}><span>{ring}%</span></div>}<p>{sub}</p></article>; }
function DashboardLoading() { return <div className="dashboard-loader" role="status" aria-live="polite"><div className="loader-orbit"><i /><i /><i /></div><div><strong>Preparing your team workspace</strong><span>Syncing the latest challenge progress</span></div></div>; }
function FeedbackBoard({ feedback, featuredFeedback, draft, sending, votes, admin, onDraftChange, onSubmit, onVote, onDelete }) {
  const orderedFeedback = [...feedback].sort((a, b) => b.score - a.score || new Date(b.created_at) - new Date(a.created_at));
  return <section className="feedback-board" aria-labelledby="feedback-title"><header><div><p>TEAM VOICE</p><h2 id="feedback-title">Anonymous feedback</h2><small>Share an idea, friction, or win. Your name is never shown.</small></div><MessageCircle /></header>{featuredFeedback && <article className="featured-feedback"><div className="featured-mark"><Trophy /></div><div><span>Most supported feedback</span><p>{featuredFeedback.message}</p></div><b>{featuredFeedback.score > 0 ? "+" : ""}{featuredFeedback.score}</b></article>}<div className="feedback-grid"><form className="feedback-form" onSubmit={onSubmit}><label htmlFor="feedback-message">Write anonymously</label><textarea id="feedback-message" value={draft} onChange={(event) => onDraftChange(event.target.value)} maxLength="1000" placeholder="What should the team keep, change, or try next?" /><div><small>{draft.length}/1000</small><button disabled={sending}>{sending ? "Sharing..." : "Share feedback"}</button></div></form><div className="feedback-list" aria-live="polite">{orderedFeedback.length ? orderedFeedback.map((item) => <article key={item.id}><p>{item.message}</p><footer><small>{new Date(item.created_at).toLocaleDateString(undefined, { day: "numeric", month: "short" })}</small><div><button className={votes[item.id] === 1 ? "selected" : ""} onClick={() => onVote(item.id, 1)} aria-label="Upvote feedback"><ThumbsUp /> <span>{item.score}</span></button><button className={votes[item.id] === -1 ? "selected down" : ""} onClick={() => onVote(item.id, -1)} aria-label="Downvote feedback"><ThumbsDown /></button>{admin ? <button className="delete-feedback" onClick={() => onDelete(item.id)} aria-label="Delete feedback"><Trash2 /></button> : null}</div></footer></article>) : <div className="feedback-empty"><MessageCircle /><p>No feedback yet. Start the conversation.</p></div>}</div></div></section>;
}
function Title({ text }) { return <div className="title"><p>LIVE LEADERBOARD</p><h2>{text}</h2></div>; }
