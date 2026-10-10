'use client';

import { useEffect, useMemo, useState } from 'react';
import { Award, Check, CheckCircle2, ChevronDown, CircleHelp, Clock3, Copy, Crown, Flame, LockKeyhole, Medal, ShieldCheck, Sparkles, Trophy, X } from 'lucide-react';

const PEOPLE = [
  'Kartik Kumar', 'Tanmay Awasthi', 'Kanika Dwivedi', 'Krish Chaddha',
  'Krishna Kumar Gaur', 'Avantika Yadav', 'Kshitij Rajput'
];
const STORE = 'myth-phase-3-progress';
const dayNow = Math.min(30, Math.max(1, new Date().getDate()));

const emptyProgress = () => Object.fromEntries(PEOPLE.map(person => [person, Object.fromEntries(Array.from({ length: 30 }, (_, i) => [i + 1, { vocab: false, speech: false }]))]));
const initials = name => name.split(' ').map(s => s[0]).join('').slice(0, 2);

function dayState(task, day) {
  const count = Number(task.vocab) + Number(task.speech);
  if (count === 2) return { label: 'Completed', tone: 'complete' };
  if (count === 1) return { label: 'Partial', tone: 'partial' };
  if (day < dayNow - 1) return { label: 'Missed', tone: 'missed' };
  return { label: 'Pending', tone: 'pending' };
}

function longestStreak(days) {
  let best = 0, active = 0;
  for (let d = 1; d <= 30; d++) { if (days[d].vocab && days[d].speech) { active++; best = Math.max(best, active); } else active = 0; }
  return best;
}

export default function Home() {
  const [progress, setProgress] = useState(emptyProgress);
  const [admin, setAdmin] = useState(false);
  const [modal, setModal] = useState(false);
  const [pin, setPin] = useState('');
  const [pinError, setPinError] = useState('');
  const [activeFilter, setActiveFilter] = useState('All');
  const [isCloud, setIsCloud] = useState(false);
  const [saveState, setSaveState] = useState('Loading tracker…');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const load = async () => {
      const fallback = JSON.parse(localStorage.getItem(STORE) || 'null') || emptyProgress();
      try {
        const res = await fetch('/api/progress', { cache: 'no-store' });
        const data = await res.json();
        if (data.configured && data.records?.length) {
          const next = emptyProgress();
          data.records.forEach(r => { if (next[r.participant]?.[r.day]) next[r.participant][r.day] = { vocab: r.vocab, speech: r.speech }; });
          setProgress(next); setIsCloud(true); setSaveState('Synced live');
        } else { setProgress(fallback); setIsCloud(false); setSaveState('Saved on this device'); }
      } catch { setProgress(fallback); setSaveState('Saved on this device'); }
    };
    load();
  }, []);

  const stats = useMemo(() => {
    const rows = PEOPLE.map(name => {
      const days = progress[name];
      const complete = Object.values(days).filter(x => x.vocab && x.speech).length;
      const totalTasks = Object.values(days).reduce((n, x) => n + Number(x.vocab) + Number(x.speech), 0);
      const streak = longestStreak(days);
      return { name, complete, tasks: totalTasks, streak, score: complete * 100 + streak * 10 + totalTasks };
    }).sort((a, b) => b.score - a.score || b.complete - a.complete);
    const allTasks = PEOPLE.length * 30 * 2;
    const doneTasks = rows.reduce((n, p) => n + p.tasks, 0);
    return { rows, doneTasks, consistency: Math.round(doneTasks / allTasks * 100), completeDays: rows.reduce((n, p) => n + p.complete, 0) };
  }, [progress]);

  const visibleDays = useMemo(() => {
    if (activeFilter === 'Backlogs') return Array.from({ length: Math.max(dayNow - 1, 0) }, (_, i) => i + 1);
    if (activeFilter === 'All') return Array.from({ length: 30 }, (_, i) => i + 1);
    const week = Number(activeFilter.replace('Week ', ''));
    return Array.from({ length: 7 }, (_, i) => (week - 1) * 7 + i + 1).filter(d => d <= 30);
  }, [activeFilter]);

  async function toggle(person, day, task) {
    if (!admin) return;
    const nextTask = { ...progress[person][day], [task]: !progress[person][day][task] };
    const next = { ...progress, [person]: { ...progress[person], [day]: nextTask } };
    setProgress(next); localStorage.setItem(STORE, JSON.stringify(next)); setSaveState('Saving…');
    if (isCloud) {
      try { const res = await fetch('/api/progress', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ participant: person, day, ...nextTask }) }); if (!res.ok) throw new Error(); setSaveState('Synced live'); }
      catch { setSaveState('Saved locally — cloud retry needed'); }
    } else setSaveState('Saved on this device');
  }

  async function unlock(e) {
    e.preventDefault(); setPinError('');
    try { const res = await fetch('/api/admin', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ pin }) }); const { valid } = await res.json(); if (valid) { setAdmin(true); setModal(false); setPin(''); } else setPinError('That PIN is not correct.'); }
    catch { setPinError('Could not verify the PIN.'); }
  }

  function copyLeaderboard() {
    const text = `🏹 TEAM MYTH — Phase 3 Leaderboard\nDay ${dayNow} • ${stats.consistency}% Team Consistency\n\n${stats.rows.slice(0, 3).map((p, i) => `${['🥇', '🥈', '🥉'][i]} ${p.name} — ${p.complete} completed days | ${p.streak}-day streak`).join('\n')}\n\nKeep the energy high! जय बजरंगबली 🔥`;
    navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1800);
  }

  return <main className="min-h-screen overflow-hidden">
    <div className="aurora" /><div className="grid-glow" />
    <section className="relative mx-auto max-w-[1600px] px-4 pb-12 pt-5 sm:px-8 sm:pt-8">
      <header className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="hanuman-mark"><Flame size={23} fill="currentColor" /></div>
          <div><p className="eyebrow">ENGLISH INITIATIVE</p><h1>TEAM MYTH <span>— PHASE 3</span></h1></div>
        </div>
        <button className={admin ? 'admin-button unlocked' : 'admin-button'} onClick={() => admin ? setAdmin(false) : setModal(true)}>{admin ? <><ShieldCheck size={16}/> Admin active</> : <><LockKeyhole size={16}/> Admin unlock</>}</button>
      </header>

      <div className="hero-line"><span className="live-dot" /> <span>{isCloud ? 'LIVE CLOUD TRACKER' : 'DEVICE-SAVED TRACKER'}</span><span className="hero-separator">•</span><span>{saveState}</span></div>

      <section className="stats-grid">
        <Stat icon={<Clock3/>} label="Current phase day" value={`Day ${dayNow}`} sub="30-day speaking sprint" tint="orange" />
        <Stat icon={<CheckCircle2/>} label="Completed days" value={stats.completeDays} sub={`of ${PEOPLE.length * 30} possible`} tint="teal" />
        <Stat icon={<Award/>} label="Team consistency" value={`${stats.consistency}%`} sub={`${stats.doneTasks} task check-ins`} tint="gold" />
        <Stat icon={<Flame/>} label="Best active streak" value={`${stats.rows[0]?.streak || 0} days`} sub={stats.rows[0]?.name || 'No activity yet'} tint="pink" />
      </section>

      <section className="podium-section">
        <div className="section-heading"><div><p className="eyebrow">LIVE RANKINGS</p><h2>Momentum leaders <Sparkles size={18}/></h2></div><p>Completed days · streak · consistency</p></div>
        <div className="podium-grid">
          {[1, 0, 2].map((rank) => { const p = stats.rows[rank]; const medals = [<Crown key="c"/>, <Medal key="s"/>, <Award key="b"/>]; return <article className={`podium-card rank-${rank + 1}`} key={rank}>
            <div className="rank-medal">{medals[rank]}</div><div className="avatar">{initials(p.name)}</div><div className="podium-info"><span className="rank-label">{['1ST PLACE', '2ND PLACE', '3RD PLACE'][rank]}</span><h3>{p.name}</h3><div><b>{p.complete}</b> days <i/> <b><Flame size={13}/> {p.streak}</b> streak</div></div><div className="score">{Math.round(p.tasks / 60 * 100)}<small>%</small></div>
          </article>; })}
        </div>
      </section>

      <section className="tracker-shell">
        <div className="tracker-head"><div><p className="eyebrow">DAILY CHECK-IN MATRIX</p><h2>Progress board</h2><p className="muted">Tap each task only when it’s actually done.</p></div><button className="copy-button" onClick={copyLeaderboard}>{copied ? <Check size={16}/> : <Copy size={16}/>} {copied ? 'Copied!' : 'Copy leaderboard'}</button></div>
        <div className="filters">{['All', 'Week 1', 'Week 2', 'Week 3', 'Week 4', 'Week 5', 'Backlogs'].map(filter => <button onClick={() => setActiveFilter(filter)} className={activeFilter === filter ? 'filter active' : 'filter'} key={filter}>{filter === 'Backlogs' && <CircleHelp size={13}/>} {filter}</button>)}</div>
        <div className="legend"><span><b className="legend-dot done"/> Completed</span><span><b className="legend-dot partial"/> Partial</span><span><b className="legend-dot pending"/> Pending</span><span><b className="legend-dot missed"/> Missed</span>{admin && <em><ShieldCheck size={14}/> Editing enabled</em>}</div>
        <div className="table-scroll"><table><thead><tr><th className="person-col">Member</th>{visibleDays.map(day => <th key={day} className={day === dayNow ? 'today' : ''}><span>DAY</span>{day}</th>)}<th className="summary-col">Completion</th></tr></thead>
          <tbody>{PEOPLE.map(person => { const row = stats.rows.find(x => x.name === person); return <tr key={person}><td className="person-cell"><div className="small-avatar">{initials(person)}</div><div><b>{person}</b><span>{person === 'Kartik Kumar' ? 'Team Lead' : 'Member'}</span></div></td>{visibleDays.map(day => { const task = progress[person][day], state = dayState(task, day); return <td key={day} className="task-cell"><div className={`day-tile ${state.tone}`} title={`Day ${day}: ${state.label}`}><button aria-label={`${person}, day ${day}, vocabulary`} disabled={!admin} onClick={() => toggle(person, day, 'vocab')} className={task.vocab ? 'tick checked vocab' : 'tick'}><span>V</span>{task.vocab && <Check size={12}/>}</button><button aria-label={`${person}, day ${day}, speech`} disabled={!admin} onClick={() => toggle(person, day, 'speech')} className={task.speech ? 'tick checked speech' : 'tick'}><span>S</span>{task.speech && <Check size={12}/>}</button></div></td>})}<td className="completion"><b>{row.complete}/30</b><div><i style={{ width: `${row.complete / 30 * 100}%` }} /></div></td></tr>; })}</tbody></table></div>
        <div className="table-note"><span>V <b>Vocabulary (5–7 words)</b></span><span>S <b>Speech (audio/video, 2–10 min)</b></span><span>🟡 Pending becomes missed after the one-day grace window.</span></div>
      </section>
    </section>
    {modal && <div className="modal-backdrop" onMouseDown={() => setModal(false)}><form className="pin-modal" onSubmit={unlock} onMouseDown={e => e.stopPropagation()}><button className="close" type="button" onClick={() => setModal(false)}><X size={19}/></button><div className="lock-orb"><LockKeyhole size={27}/></div><p className="eyebrow">RESTRICTED ACCESS</p><h2>Admin unlock</h2><p>Enter Kartik’s PIN to manage daily check-ins.</p><input autoFocus value={pin} onChange={e => setPin(e.target.value)} inputMode="numeric" type="password" placeholder="Enter PIN" /><small className="pin-error">{pinError}</small><button className="unlock-submit">Unlock editor <ChevronDown size={17}/></button></form></div>}
  </main>;
}

function Stat({ icon, label, value, sub, tint }) { return <article className={`stat-card ${tint}`}><div className="stat-icon">{icon}</div><div><p>{label}</p><h2>{value}</h2><span>{sub}</span></div></article>; }
