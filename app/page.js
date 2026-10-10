"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Check,
  CheckCircle2,
  Cloud,
  Copy,
  Flame,
  LockKeyhole,
  Medal,
  Moon,
  Send,
  Sparkles,
  Sun,
  Trophy,
  X,
} from "lucide-react";
import TechText from "../components/TechText";
import SideRays from "../components/SideRays";
import AeroShards from "../components/AeroShards";
const P = [
    "Kartik Kumar",
    "Tanmay Awasthi",
    "Kanika Dwivedi",
    "Krish Chaddha",
    "Krishna Kumar Gaur",
    "Avantika Yadav",
    "Kshitij Rajput",
  ],
  K = "myth-phase-3-progress",
  now = Math.min(30, Math.max(1, new Date().getDate())),
  initial = () =>
    Object.fromEntries(
      P.map((p) => [
        p,
        Object.fromEntries(
          Array.from({ length: 30 }, (_, i) => [
            i + 1,
            { vocab: false, speech: false },
          ]),
        ),
      ]),
    ),
  ini = (n) =>
    n
      .split(" ")
      .map((x) => x[0])
      .join("")
      .slice(0, 2),
  mono = "font-mono tabular-nums";
function streak(d) {
  let a = 0,
    b = 0;
  for (let i = 1; i < 31; i++) {
    if (d[i].vocab && d[i].speech) {
      b++;
      a = Math.max(a, b);
    } else b = 0;
  }
  return a;
}
function status(x, d) {
  return x.vocab && x.speech
    ? "done"
    : x.vocab || x.speech
      ? "partial"
      : d < now - 1
        ? "missed"
        : "pending";
}
export default function Home() {
  const [progress, setProgress] = useState(initial),
    [admin, setAdmin] = useState(false),
    [modal, setModal] = useState(false),
    [pin, setPin] = useState(""),
    [error, setError] = useState(""),
    [filter, setFilter] = useState("all"),
    [cloud, setCloud] = useState(false),
    [theme, setTheme] = useState("dark"),
    [toastState, setToast] = useState(),
    [hasEntered, setHasEntered] = useState(false),
    ref = useRef();
  const toast = (m, t = "ok") => {
    setToast({ m, t });
    setTimeout(() => setToast(), 2200);
  };
  useEffect(() => {
    let t = localStorage.getItem("myth-theme") || "dark";
    setTheme(t);
    document.documentElement.classList.toggle("dark", t === "dark");
    (async () => {
      let fallback = JSON.parse(localStorage.getItem(K) || "null") || initial();
      try {
        let d = await (await fetch("/api/progress")).json();
        if (d.configured) {
          setCloud(true);
          if (d.records?.length) {
            let n = initial();
            d.records.forEach(
              (r) =>
                n[r.participant] &&
                n[r.participant][r.day] &&
                (n[r.participant][r.day] = { vocab: r.vocab, speech: r.speech }),
            );
            setProgress(n);
          } else {
            setProgress(fallback);
          }
        } else {
          setProgress(fallback);
        }
      } catch {
        setProgress(fallback);
      }
    })();
  }, []);
  useEffect(() => setHasEntered(localStorage.getItem("myth_entered") === "true"), []);
  useEffect(() => {
    if (!modal) return;
    let f = () => ref.current?.querySelectorAll("button,input") || [],
      h = (e) => {
        if (e.key === "Escape") setModal(false);
        if (e.key === "Tab") {
          let x = f(),
            a = x[0],
            z = x[x.length - 1];
          if (e.shiftKey && document.activeElement === a) {
            e.preventDefault();
            z.focus();
          }
          if (!e.shiftKey && document.activeElement === z) {
            e.preventDefault();
            a.focus();
          }
        }
      };
    addEventListener("keydown", h);
    setTimeout(() => f()[1]?.focus(), 1);
    return () => removeEventListener("keydown", h);
  }, [modal]);
  let stats = useMemo(() => {
    let rows = P.map((name) => {
        let d = progress[name],
          done = Object.values(d).filter((x) => x.vocab && x.speech).length,
          tasks = Object.values(d).reduce(
            (a, x) => a + +x.vocab + +x.speech,
            0,
          ),
          s = streak(d);
        return { name, done, tasks, s, score: done * 100 + s * 10 + tasks };
      }).sort((a, b) => b.score - a.score),
      tasks = rows.reduce((a, x) => a + x.tasks, 0);
    return { rows, tasks, cons: Math.round((tasks / (P.length * 60)) * 100) };
  }, [progress]);
  let days =
    filter === "all"
      ? Array.from({ length: 30 }, (_, i) => i + 1)
      : filter === "back"
        ? Array.from({ length: Math.max(0, now - 1) }, (_, i) => i + 1)
        : Array.from({ length: 7 }, (_, i) => (+filter - 1) * 7 + i + 1).filter(
            (x) => x < 31,
          );
  async function toggle(p, d, k) {
    if (!admin) return toast("Admin mode required to edit", "lock");
    let task = { ...progress[p][d], [k]: !progress[p][d] },
      n = { ...progress, [p]: { ...progress[p], [d]: task } };
    setProgress(n);
    localStorage.setItem(K, JSON.stringify(n));
    if (cloud)
      try {
        let r = await fetch("/api/progress", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ participant: p, day: d, ...task }),
        });
        if (!r.ok) throw 0;
        toast("Saved to Cloud");
      } catch {
        toast("Saved on this device", "lock");
      }
    else toast("Saved on this device");
  }
  async function unlock(e) {
    e.preventDefault();
    let d = await (
      await fetch("/api/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin }),
      })
    ).json();
    if (d.valid) {
      setAdmin(true);
      setModal(false);
      toast("Admin mode unlocked");
    } else {
      setError("Incorrect PIN. Try again.");
      ref.current.classList.add("shake");
      setTimeout(() => ref.current?.classList.remove("shake"), 430);
    }
  }
  function copy() {
    navigator.clipboard.writeText(
      `🏹 TEAM MYTH — PHASE 3\nDay ${now} of 30 · ${stats.cons}% consistency\n\n${stats.rows
        .slice(0, 3)
        .map(
          (x, i) =>
            `${["🥇", "🥈", "🥉"][i]} ${x.name} — ${x.done} days · ${x.s}-day streak`,
        )
        .join("\n")}`,
    );
    toast("WhatsApp report copied");
  }
  let setT = () => {
    let x = theme === "dark" ? "light" : "dark";
    setTheme(x);
    localStorage.setItem("myth-theme", x);
    document.documentElement.classList.toggle("dark", x === "dark");
  };
  const enterDashboard = () => { localStorage.setItem("myth_entered", "true"); setHasEntered(true); };
  if (!hasEntered) return <main className="landing"><AeroShards /><div className="landing-content"><p className="landing-badge">✦ TEAM MYTH PRESENTS</p><h1>MYTH <span>— PHASE 3</span></h1><p className="landing-subtitle">Speak with Conviction. Build Consistency. One Day at a Time.</p><button onClick={enterDashboard}>Get Started <b>→</b></button></div><small>30-Day Speaking &amp; Technical Communication Challenge · 7 Participants</small></main>;
  return (
    <main className="app">
      <SideRays />
      <nav>
        <div className="brand">
          <b>M</b>
          <div>
            <strong>TEAM MYTH</strong>
            <span>● Live Phase 3</span>
          </div>
        </div>
        <div className="nav">
          <i className={mono}>
            Day {now} <em>of 30</em>
          </i>
          <button onClick={setT} aria-label="Theme">
            {theme === "dark" ? <Sun /> : <Moon />}
          </button>
          <button
            className={admin ? "on" : ""}
            onClick={() => (admin ? setAdmin(false) : setModal(true))}
          >
            <LockKeyhole /> {admin ? "Editing on" : "Admin unlock"}
          </button>
        </div>
      </nav>
      <section className="hero">
        <p>
          <Sparkles /> ENGLISH INITIATIVE · PHASE 3
        </p>
        <h1>
          Build momentum.
          <br />
          <span>One day at a time.</span>
        </h1>
        <small>
          <Cloud /> {cloud ? "Cloud sync active" : "Device-saved workspace"}
        </small>
      </section>
      <section className="bento">
        <Card
          title="Team consistency"
          value={`${stats.cons}%`}
          sub="Across every Vocab + Speech check-in"
          ring={stats.cons}
        />
        <Card
          title="Total submissions"
          value={`${stats.tasks}`}
          sub={`of ${P.length * 60} team targets`}
        />
        <article>
          <label>
            Active pace <Flame />
          </label>
          <div className="person">
            <b>{ini(stats.rows[0].name)}</b>
            <strong>
              {stats.rows[0].name}
              <small>Leading the rhythm</small>
            </strong>
          </div>
          <p className="orange">
            <Flame /> <i className={mono}>{stats.rows[0].s} day streak</i>
          </p>
        </article>
        <article className="share">
          <Send />
          <div>
            <strong>Celebrate the wins</strong>
            <p>Send today’s standings to the group.</p>
          </div>
          <button onClick={copy}>Copy WhatsApp report</button>
        </article>
      </section>
      <Title text="Top performers" />
      <section className="podium">
        {stats.rows.slice(0, 3).map((x, i) => (
          <article className={`place p${i + 1}`} key={x.name}>
            <Medal />
            <small>
              0{i + 1} · {["GOLD", "SILVER", "BRONZE"][i]}
            </small>
            <div className="person">
              <b>{ini(x.name)}</b>
              <strong>
                {x.name}
                <small>{x.done} completed days</small>
              </strong>
            </div>
            <footer>
              <i className={mono}>{x.score} score</i>
              <span>
                <Flame /> {x.s} streak
              </span>
            </footer>
          </article>
        ))}
      </section>
      <section className="matrix">
        <header>
          <div>
            <p>30-DAY OPERATING SYSTEM</p>
            <h2>Daily progress matrix</h2>
            <small>
              Vocabulary and speaking practice, with the full team in view.
            </small>
          </div>
          <b>{admin ? "Editing enabled" : "Viewer mode"}</b>
        </header>
        <div className="tabs">
          {[
            ["all", "All Days"],
            ["1", "Week 1 · D1–D7"],
            ["2", "Week 2 · D8–D14"],
            ["3", "Week 3 · D15–D21"],
            ["4", "Week 4 · D22–D30"],
            ["back", "Pending Backlogs"],
          ].map((x) => (
            <button
              className={filter === x[0] ? "active" : ""}
              onClick={() => setFilter(x[0])}
            >
              {x[1]}
            </button>
          ))}
        </div>
        <div className="legend">
          ● Complete　● Partial　● Pending　● Missed{" "}
          <span>V Vocab · S Speech</span>
        </div>
        <div className="scroll">
          <table>
            <thead>
              <tr>
                <th>Participant</th>
                {days.map((d) => (
                  <th className={d === now ? "today" : ""}>
                    Day
                    <br />
                    {d}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {P.map((p) => {
                let r = stats.rows.find((x) => x.name === p);
                return (
                  <tr>
                    <td>
                      <b>{ini(p)}</b>
                      <div>
                        <strong>{p}</strong>
                        <small>
                          {p === "Kartik Kumar" ? "Team lead" : "Member"} ·{" "}
                          <i className={mono}>{r.score} pts</i>
                        </small>
                      </div>
                    </td>
                    {days.map((d) => (
                      <td>
                        <div className={status(progress[p][d], d)}>
                          <Chip
                            x="V"
                            v={progress[p][d].vocab}
                            f={() => toggle(p, d, "vocab")}
                          />
                          <Chip
                            x="S"
                            v={progress[p][d].speech}
                            f={() => toggle(p, d, "speech")}
                          />
                        </div>
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <footer>
          V Vocabulary: 5–7 words　 ·　 S Speech: 2–10 min audio/video
        </footer>
      </section>
      {toastState && (
        <aside className={toastState.t}>
          {toastState.t === "lock" ? <LockKeyhole /> : <CheckCircle2 />}
          {toastState.m}
        </aside>
      )}
      {modal && (
        <div className="back" onMouseDown={() => setModal(false)}>
          <form
            ref={ref}
            onMouseDown={(e) => e.stopPropagation()}
            onSubmit={unlock}
          >
            <button
              className="close"
              type="button"
              onClick={() => setModal(false)}
            >
              <X />
            </button>
            <LockKeyhole />
            <p>RESTRICTED WORKSPACE</p>
            <h2>Admin unlock</h2>
            <small>Enter the team PIN to update daily submissions.</small>
            <input
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              placeholder="••••"
              type="password"
            />
            <em>{error}</em>
            <button>Unlock workspace</button>
          </form>
        </div>
      )}
      <section className="myth-tech-footer" aria-label="Team MYTH interactive banner">
        <TechText text="MYTH" accentColor="#f59e0b" />
      </section>
    </main>
  );
}
function Chip({ x, v, f }) {
  return (
    <button className={v ? "checked" : ""} onClick={f}>
      {v ? <Check /> : x}
    </button>
  );
}
function Card({ title, value, sub, ring }) {
  return (
    <article>
      <label>{title}</label>
      <strong className={mono}>{value}</strong>
      {ring !== undefined && (
        <div className="ring text-zinc-900 dark:text-zinc-100 font-bold font-mono text-sm md:text-base" style={{ "--p": ring * 3.6 + "deg" }}>
          <span>{ring}%</span>
        </div>
      )}
      <p>{sub}</p>
    </article>
  );
}
function Title({ text }) {
  return (
    <div className="title">
      <p>LIVE LEADERBOARD</p>
      <h2>{text}</h2>
    </div>
  );
}
