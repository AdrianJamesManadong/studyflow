import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";

/* ─── Design tokens ─────────────────────────────────────────────── */
const C = {
  bg:        "#080812",
  surface:   "#0f0f1e",
  surface2:  "#13132a",
  border:    "#1c1c38",
  borderHi:  "#2e2e58",
  indigo:    "#5b50f0",
  indigoMid: "#7c74f5",
  indigoFg:  "#a5a0fa",
  emerald:   "#10b981",
  amber:     "#f59e0b",
  violet:    "#8b5cf6",
  text:      "#eeeef8",
  textSoft:  "#b0b0cc",
  muted:     "#5a5a7a",
};

/* ─── Data ──────────────────────────────────────────────────────── */
const FEATURES = [
  { icon: "🗂️", label: "Subjects",      desc: "Colour-coded courses with instant access to all your materials." },
  { icon: "📋", label: "Assignments",   desc: "Track tasks, deadlines, and statuses — nothing slips through." },
  { icon: "📊", label: "Grades",        desc: "Log scores, compute averages, visualise progress over time." },
  { icon: "📝", label: "Notes",         desc: "Capture lecture notes tied directly to your subjects." },
  { icon: "📅", label: "Calendar",      desc: "Your whole semester at a glance — exams, due dates, blocks." },
  { icon: "🍅", label: "Pomodoro",      desc: "Built-in focus timer with configurable work/break intervals." },
  { icon: "🤖", label: "AI Assistant",  desc: "Ask anything about your coursework, get instant answers." },
  { icon: "🔔", label: "Reminders",     desc: "Timely alerts for upcoming deadlines, always one step ahead." },
];

const PROMOS = [
  { icon: "🆓", tag: "Always Free",    title: "Free forever.", desc: "Every core feature — no trial, no expiry. Just sign up.", color: C.indigo },
  { icon: "🤖", tag: "AI-Powered",     title: "An AI tutor.",  desc: "The built-in assistant explains concepts instantly, in context.", color: C.emerald },
  { icon: "🔒", tag: "Secure",         title: "Your data.",    desc: "Enterprise-grade auth via Supabase. Private and encrypted.", color: C.amber },
];

const STATS = [
  { value: "10+", label: "Students", icon: "👨‍🎓" },
  { value: "8",    label: "Tools in one", icon: "🛠️" },
  { value: "100%", label: "Free forever", icon: "🆓" },
  { value: "24/7", label: "AI available", icon: "🤖" },
];

const TEAM_VALUES = [
  {
    icon: "🎯",
    title: "Built for focus",
    desc: "We obsessed over every distraction and stripped it out. StudyFlow exists for one thing: helping you study better.",
  },
  {
    icon: "💡",
    title: "Student-first design",
    desc: "Every feature started as a real problem a student faced. No enterprise bloat, no filler — just what actually helps.",
  },
  {
    icon: "🌱",
    title: "Always evolving",
    desc: "We ship fast and listen closely. If something doesn't work for you, we want to know — and we'll fix it.",
  },
];

/* ─── Hooks ─────────────────────────────────────────────────────── */
function useInView(threshold = 0.1) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setVisible(true); obs.disconnect(); } },
      { threshold }
    );
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, [threshold]);
  return [ref, visible];
}

function useIsMobile() {
  const [mobile, setMobile] = useState(false);
  useEffect(() => {
    const check = () => setMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);
  return mobile;
}

/* ─── Helpers ───────────────────────────────────────────────────── */
const scrollTo = id => document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

function getFormattedDate() {
  return new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
}

/* ─── Feature card with isolated hover state ────────────────────── */
function FeatureCard({ feature, visible, delay }) {
  const [hov, setHov] = useState(false);
  return (
    <div
      className="feat-card"
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        background: C.surface,
        border: `1px solid ${hov ? C.indigo + "55" : C.border}`,
        borderRadius: 14,
        padding: "22px 20px",
        opacity: visible ? 1 : 0,
        transform: visible ? (hov ? "translateY(-5px)" : "translateY(0)") : "translateY(24px)",
        boxShadow: hov ? `0 16px 48px ${C.indigo}18` : "none",
        transition: `opacity .5s ease ${delay}s, transform .4s ease, border-color .2s, box-shadow .2s`,
        cursor: "default",
      }}
    >
      <div style={{ fontSize: 26, marginBottom: 12 }}>{feature.icon}</div>
      <div style={{ fontSize: 14, fontWeight: 700, color: C.text, marginBottom: 6 }}>{feature.label}</div>
      <div style={{ fontSize: 13, color: C.muted, lineHeight: 1.6 }}>{feature.desc}</div>
    </div>
  );
}

/* ─── Mini dashboard mock ───────────────────────────────────────── */
function DashboardMock({ mobile }) {
  const cards = [
    { icon: "🗂️", val: "5",   label: "SUBJECTS",   color: C.indigo },
    { icon: "📋", val: "3",   label: "DUE",        color: C.amber },
    { icon: "📊", val: "87%", label: "AVERAGE",    color: C.emerald },
    { icon: "📝", val: "12",  label: "NOTES",      color: C.indigoFg },
  ];
  const sidebar = ["⊞ Dashboard","🗂️ Subjects","📋 Tasks","📊 Grades","📝 Notes","📅 Calendar","🍅 Pomodoro","🤖 AI"];

  return (
    <div style={{
      background: "#07070f",
      border: `1px solid ${C.border}`,
      borderRadius: 16,
      overflow: "hidden",
      boxShadow: `0 32px 80px ${C.indigo}18, 0 0 0 1px ${C.indigo}0c`,
      fontSize: 10,
    }}>
      {/* title bar */}
      <div style={{ display: "flex", alignItems: "center", gap: 5, padding: "9px 12px", background: "#04040b", borderBottom: `1px solid ${C.border}` }}>
        {["#ff5f57","#febc2e","#28c840"].map(bg => <span key={bg} style={{ width: 8, height: 8, borderRadius: "50%", background: bg, display: "inline-block" }} />)}
        <span style={{ fontSize: 8, color: C.muted, marginLeft: 6, fontFamily: "monospace" }}>studyflow.app/dashboard</span>
      </div>
      <div style={{ display: "flex", height: mobile ? 220 : 270 }}>
        {/* sidebar — hidden on very small mock */}
        {!mobile && (
          <div style={{ width: 110, background: "#04040b", borderRight: `1px solid ${C.border}`, padding: "10px 0", flexShrink: 0 }}>
            <div style={{ fontWeight: 800, fontSize: 10, padding: "0 8px 5px", color: C.text }}>
              <span style={{ color: C.indigo }}>Study</span>Flow
            </div>
            <div style={{ fontSize: 8, color: C.muted, padding: "0 8px 7px", borderBottom: `1px solid ${C.border}` }}>Hey, Adrian 🌟</div>
            {sidebar.map((s, i) => (
              <div key={s} style={{
                display: "flex", alignItems: "center", gap: 5,
                padding: "4px 7px", margin: "1px 4px", borderRadius: 5, fontSize: 8,
                background: i === 0 ? C.indigo : "transparent",
                color: i === 0 ? "#fff" : C.muted,
              }}>{s}</div>
            ))}
          </div>
        )}
        {/* main */}
        <div style={{ flex: 1, padding: "10px 12px", overflow: "hidden" }}>
          <div style={{ fontWeight: 700, fontSize: 12, color: C.text, marginBottom: 1 }}>{getGreeting()}, Adrian 👋</div>
          <div style={{ fontSize: 8, color: C.muted, marginBottom: 8 }}>{getFormattedDate()}</div>
          <div style={{ display: "flex", gap: 4, marginBottom: 8 }}>
            {cards.map(c => (
              <div key={c.label} style={{ flex: 1, background: C.surface, border: `1px solid ${c.color}33`, borderRadius: 7, padding: "6px 5px" }}>
                <div style={{ fontSize: 11 }}>{c.icon}</div>
                <div style={{ fontSize: 13, fontWeight: 800, color: c.color, lineHeight: 1, margin: "2px 0" }}>{c.val}</div>
                <div style={{ fontSize: 6.5, color: C.muted, letterSpacing: "0.6px" }}>{c.label}</div>
              </div>
            ))}
          </div>
          <div style={{ fontSize: 7, color: C.muted, letterSpacing: "1px", marginBottom: 4, fontWeight: 600 }}>QUICK ACTIONS</div>
          <div style={{ display: "flex", gap: 3, flexWrap: "wrap", marginBottom: 8 }}>
            {["Add Subject","New Task","Log Grade","Write Note","Pomodoro","Ask AI"].map(a => (
              <div key={a} style={{ background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 4, padding: "3px 6px", fontSize: 7, color: C.muted }}>{a}</div>
            ))}
          </div>
          {/* bar chart */}
          <div style={{ background: C.surface, borderRadius: 7, padding: "7px 8px", border: `1px solid ${C.border}` }}>
            <div style={{ fontSize: 7, color: C.muted, marginBottom: 5 }}>Weekly Study Hours</div>
            <div style={{ display: "flex", alignItems: "flex-end", gap: 3, height: 36 }}>
              {[["M",40],["T",65],["W",50],["T",80],["F",70],["S",30],["S",55]].map(([d,h],i) => (
                <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 2, height: "100%" }}>
                  <div style={{ width: "100%", height: `${h}%`, borderRadius: "2px 2px 0 0", background: i === 3 ? C.indigo : C.indigo + "44" }} />
                  <div style={{ fontSize: 6.5, color: C.muted }}>{d}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Main component ────────────────────────────────────────────── */
export default function Home() {
  const navigate  = useNavigate();
  const mobile    = useIsMobile();
  const [scrolled, setScrolled] = useState(false);
  const [heroVis,  setHeroVis]  = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [featRef,  featVis]     = useInView(0.04);
  const [promoRef, promoVis]    = useInView(0.08);
  const [aboutRef, aboutVis]    = useInView(0.06);
  const [ctaRef,   ctaVis]      = useInView(0.1);

  useEffect(() => {
    const t = setTimeout(() => setHeroVis(true), 80);
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", onScroll);
    return () => { clearTimeout(t); window.removeEventListener("scroll", onScroll); };
  }, []);

  // close menu on resize to desktop
  useEffect(() => { if (!mobile) setMenuOpen(false); }, [mobile]);

  const navHandle = (id) => { scrollTo(id); setMenuOpen(false); };

  return (
    <div style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", background: C.bg, color: C.text, minHeight: "100vh", overflowX: "hidden", position: "relative" }}>

      {/* ── ambient blobs ── */}
      <div style={{ position:"fixed", top:"-20%", left:"-15%", width: mobile?320:600, height: mobile?320:600, borderRadius:"50%", background:`radial-gradient(circle,${C.indigo}12,transparent 70%)`, pointerEvents:"none", zIndex:0 }} />
      <div style={{ position:"fixed", top:"50%", right:"-15%", width: mobile?240:480, height: mobile?240:480, borderRadius:"50%", background:"radial-gradient(circle,#7c3aed10,transparent 70%)", pointerEvents:"none", zIndex:0 }} />
      <div style={{ position:"fixed", bottom:"5%", left:"25%", width: mobile?200:360, height: mobile?200:360, borderRadius:"50%", background:"radial-gradient(circle,#0ea5e90d,transparent 70%)", pointerEvents:"none", zIndex:0 }} />

      {/* ── NAV ── */}
      <nav style={{
        position:"fixed", top:0, left:0, right:0, zIndex:300,
        display:"flex", alignItems:"center", justifyContent:"space-between",
        padding: mobile ? "14px 20px" : "16px 52px",
        background: scrolled || menuOpen ? "rgba(8,8,18,.95)" : "transparent",
        backdropFilter: scrolled || menuOpen ? "blur(24px)" : "none",
        borderBottom: scrolled || menuOpen ? `1px solid ${C.border}` : "1px solid transparent",
        transition: "background .3s, border-color .3s",
      }}>
        <span style={{ fontSize: mobile ? 17 : 20, fontWeight: 800, letterSpacing: "-0.5px", userSelect:"none" }}>
          <span style={{ color: C.indigo }}>Study</span>Flow
        </span>

        {/* desktop nav */}
        {!mobile && (
          <div style={{ display:"flex", alignItems:"center", gap:24 }}>
            <button style={navBtn} onClick={() => scrollTo("features")}>Features</button>
            <button style={navBtn} onClick={() => scrollTo("whyus")}>Why Us</button>
            <button style={navBtn} onClick={() => scrollTo("about")}>About</button>
            <button style={{ ...navBtn, border:`1px solid ${C.border}`, borderRadius:7, padding:"7px 15px" }} onClick={() => navigate("/login")}>Sign In</button>
            <button style={{ background:C.indigo, color:"#fff", border:"none", borderRadius:8, padding:"9px 20px", fontSize:13, fontWeight:600, cursor:"pointer" }} onClick={() => navigate("/register")}>
              Get Started Free
            </button>
          </div>
        )}

        {/* mobile hamburger */}
        {mobile && (
          <button onClick={() => setMenuOpen(o => !o)} style={{ background:"none", border:"none", cursor:"pointer", padding:4, display:"flex", flexDirection:"column", gap:5 }}>
            {[0,1,2].map(i => (
              <span key={i} style={{
                display:"block", width:22, height:2, borderRadius:2,
                background: C.textSoft,
                transform: menuOpen && i===0 ? "rotate(45deg) translate(5px,5px)" : menuOpen && i===1 ? "scaleX(0)" : menuOpen && i===2 ? "rotate(-45deg) translate(5px,-5px)" : "none",
                transition:"transform .25s",
              }} />
            ))}
          </button>
        )}
      </nav>

      {/* ── mobile drawer ── */}
      {mobile && (
        <div style={{
          position:"fixed", top:0, left:0, right:0, zIndex:250,
          background:"rgba(8,8,18,.97)", backdropFilter:"blur(28px)",
          borderBottom:`1px solid ${C.border}`,
          padding:"72px 24px 28px",
          transform: menuOpen ? "translateY(0)" : "translateY(-110%)",
          transition:"transform .35s cubic-bezier(.4,0,.2,1)",
          display:"flex", flexDirection:"column", gap:4,
        }}>
          {[["features","Features"],["whyus","Why Us"],["about","About"]].map(([id,label]) => (
            <button key={id} style={{ background:"none", border:"none", cursor:"pointer", fontSize:18, color:C.text, fontWeight:600, padding:"12px 0", textAlign:"left", borderBottom:`1px solid ${C.border}` }} onClick={() => navHandle(id)}>{label}</button>
          ))}
          <div style={{ display:"flex", gap:10, marginTop:16 }}>
            <button style={{ flex:1, background:C.surface2, border:`1px solid ${C.border}`, borderRadius:10, padding:"13px", fontSize:15, color:C.textSoft, cursor:"pointer", fontFamily:"'Plus Jakarta Sans',sans-serif" }} onClick={() => { navigate("/login"); setMenuOpen(false); }}>Sign In</button>
            <button style={{ flex:2, background:C.indigo, border:"none", borderRadius:10, padding:"13px", fontSize:15, color:"#fff", fontWeight:700, cursor:"pointer", fontFamily:"'Plus Jakarta Sans',sans-serif" }} onClick={() => { navigate("/register"); setMenuOpen(false); }}>Get Started Free</button>
          </div>
        </div>
      )}

      {/* ── HERO ── */}
      <section style={{
        position:"relative", zIndex:1,
        display:"flex", flexDirection: mobile ? "column" : "row",
        alignItems:"center", justifyContent:"space-between",
        gap: mobile ? 40 : 52,
        maxWidth:1300, margin:"0 auto",
        padding: mobile ? "108px 20px 60px" : "140px 52px 100px",
      }}>
        {/* copy */}
        <div style={{
          flex:"0 0 auto", maxWidth: mobile ? "100%" : 500,
          opacity: heroVis ? 1 : 0,
          transform: heroVis ? "translateY(0)" : "translateY(28px)",
          transition:"opacity .8s ease, transform .8s ease",
          textAlign: mobile ? "center" : "left",
        }}>
          <div style={eyebrow}>✦ Academic Command Center</div>
          <h1 style={{ fontSize: mobile ? 38 : 62, fontWeight:800, lineHeight:1.06, letterSpacing:"-2px", marginBottom:18 }}>
            Your studies,<br />
            <span style={{ background:`linear-gradient(105deg,${C.indigo},${C.indigoFg})`, WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent" }}>
              finally organised.
            </span>
          </h1>
          <p style={{ fontSize: mobile ? 15 : 16, color:C.muted, lineHeight:1.75, marginBottom: mobile ? 28 : 32, maxWidth:460 }}>
            StudyFlow unifies subjects, assignments, grades, notes, calendar, Pomodoro timer, and an AI assistant — one focused workspace built for students who mean business.
          </p>
          <div style={{ display:"flex", gap:10, flexWrap:"wrap", justifyContent: mobile ? "center" : "flex-start", marginBottom:24 }}>
            <button style={{ background:C.indigo, color:"#fff", border:"none", borderRadius:10, padding: mobile ? "14px 28px" : "13px 28px", fontSize:15, fontWeight:700, cursor:"pointer", width: mobile ? "100%" : "auto" }} onClick={() => navigate("/register")}>
              Start for Free →
            </button>
            <button style={{ background:"transparent", color:C.muted, border:`1px solid ${C.border}`, borderRadius:10, padding: mobile ? "14px 24px" : "13px 24px", fontSize:15, cursor:"pointer", width: mobile ? "100%" : "auto", fontFamily:"'Plus Jakarta Sans',sans-serif" }} onClick={() => navigate("/login")}>
              I have an account
            </button>
          </div>
          {/* proof tags */}
          <div style={{ display:"flex", gap:7, flexWrap:"wrap", justifyContent: mobile ? "center" : "flex-start", marginBottom:14 }}>
            {["📊 Grades","🍅 Pomodoro","🤖 AI","📅 Calendar"].map(t => (
              <span key={t} style={{ fontSize:11, color:C.indigoFg, background:`${C.indigo}14`, border:`1px solid ${C.indigo}28`, borderRadius:6, padding:"4px 9px" }}>{t}</span>
            ))}
          </div>
          {/* social proof */}
          <div style={{ display:"flex", alignItems:"center", gap:6, justifyContent: mobile ? "center" : "flex-start" }}>
            {[0,1,2].map(i => <span key={i} style={{ width:7, height:7, borderRadius:"50%", background:C.emerald, boxShadow:`0 0 7px ${C.emerald}99` }} />)}
            <span style={{ fontSize:12, color:C.muted }}>Trusted by 500+ students</span>
          </div>
        </div>

        {/* visual */}
        <div style={{
          flex:"1 1 auto", maxWidth: mobile ? "100%" : 680, minWidth:0, position:"relative",
          opacity: heroVis ? 1 : 0,
          transform: heroVis
            ? mobile ? "translateY(0)" : "perspective(1100px) rotateY(-3deg) rotateX(2deg)"
            : mobile ? "translateY(24px)" : "perspective(1100px) rotateY(-3deg) rotateX(2deg) translateY(30px)",
          transition:"opacity 1s ease .2s, transform 1s ease .2s",
        }}>
          <DashboardMock mobile={mobile} />
          {/* floating badge — top */}
          <div className="badge-float" style={{
            position:"absolute", top: mobile ? -14 : -20, right: mobile ? 8 : 16,
            display:"flex", alignItems:"center", gap:9,
            background:C.surface2, border:`1px solid ${C.border}`,
            borderRadius:10, padding:"9px 12px",
            boxShadow:`0 8px 28px #00000044`,
          }}>
            <span style={{ fontSize:15 }}>🍅</span>
            <div>
              <div style={{ fontSize:10, fontWeight:700, color:C.text }}>Focus session</div>
              <div style={{ fontSize:9, color:C.emerald }}>25:00 remaining</div>
            </div>
          </div>
          {/* floating badge — bottom */}
          <div className="badge-slidein" style={{
            position:"absolute", bottom: mobile ? -14 : -18, left: mobile ? 8 : 16,
            display:"flex", alignItems:"center", gap:9,
            background:C.surface2, border:`1px solid ${C.border}`,
            borderRadius:10, padding:"9px 12px",
            boxShadow:`0 8px 28px #00000044`,
          }}>
            <span style={{ fontSize:15 }}>🎉</span>
            <div>
              <div style={{ fontSize:10, fontWeight:700, color:C.text }}>Assignment submitted!</div>
              <div style={{ fontSize:9, color:C.indigoFg }}>Math Problem Set · just now</div>
            </div>
          </div>
        </div>
      </section>

      {/* ── DIVIDER ── */}
      <div style={{ position:"relative", zIndex:1, textAlign:"center", padding: mobile ? "22px 20px" : "30px 48px", borderTop:`1px solid ${C.border}`, borderBottom:`1px solid ${C.border}`, background:C.surface }}>
        <span style={{ fontSize: mobile ? 12 : 13, color:C.muted, letterSpacing:"0.5px" }}>Everything a student needs, nothing they don't.</span>
      </div>

      {/* ── FEATURES ── */}
      <section id="features" ref={featRef} style={{ position:"relative", zIndex:1, maxWidth:1200, margin:"0 auto", padding: mobile ? "64px 20px" : "96px 52px" }}>
        <div style={{ textAlign:"center", marginBottom: mobile ? 40 : 60 }}>
          <p style={sectionEye}>All your tools</p>
          <h2 style={{ fontSize: mobile ? 30 : 42, fontWeight:800, letterSpacing:"-1.2px", marginBottom:12 }}>One app. Every tool.</h2>
          <p style={{ fontSize:14, color:C.muted, maxWidth:380, margin:"0 auto", lineHeight:1.7 }}>From planning your week to acing your exams — StudyFlow has it covered.</p>
        </div>
        <div style={{
          display:"grid",
          gridTemplateColumns: mobile ? "1fr 1fr" : "repeat(4,1fr)",
          gap: mobile ? 10 : 14,
        }}>
          {FEATURES.map((f,i) => <FeatureCard key={f.label} feature={f} visible={featVis} delay={i * .055} />)}
        </div>
      </section>

      {/* ── WHY US ── */}
      <section id="whyus" ref={promoRef} style={{ position:"relative", zIndex:1, maxWidth:1100, margin:"0 auto", padding: mobile ? "0 20px 64px" : "0 52px 96px" }}>
        <div style={{ textAlign:"center", marginBottom: mobile ? 36 : 56 }}>
          <p style={sectionEye}>Why StudyFlow</p>
          <h2 style={{ fontSize: mobile ? 30 : 42, fontWeight:800, letterSpacing:"-1.2px", marginBottom:12 }}>Built different.</h2>
          <p style={{ fontSize:14, color:C.muted, maxWidth:340, margin:"0 auto", lineHeight:1.7 }}>No fluff, no paywalls — the tools that actually help you study.</p>
        </div>
        <div style={{ display:"grid", gridTemplateColumns: mobile ? "1fr" : "repeat(3,1fr)", gap: mobile ? 12 : 18 }}>
          {PROMOS.map((p,i) => (
            <div key={p.tag} style={{
              position:"relative", overflow:"hidden",
              background:C.surface, borderRadius:16,
              border:`1px solid ${promoVis ? p.color+"2e" : C.border}`,
              padding: mobile ? "24px 20px" : "30px 24px",
              display:"flex", flexDirection: mobile ? "row" : "column",
              alignItems: mobile ? "flex-start" : "flex-start",
              gap: mobile ? 16 : 14,
              opacity: promoVis ? 1 : 0,
              transform: promoVis ? "translateY(0)" : "translateY(22px)",
              transition:`opacity .5s ease ${i*.1}s, transform .5s ease ${i*.1}s, border-color .5s ease ${i*.1}s`,
            }}>
              {/* glow */}
              <div style={{ position:"absolute", inset:0, background:`radial-gradient(ellipse at top left,${p.color}0c,transparent 65%)`, pointerEvents:"none" }} />
              <div style={{ width:46, height:46, borderRadius:12, flexShrink:0, display:"flex", alignItems:"center", justifyContent:"center", background:`${p.color}15`, border:`1px solid ${p.color}28`, fontSize:22 }}>{p.icon}</div>
              <div>
                <div style={{ fontSize:10, fontWeight:700, letterSpacing:"1px", textTransform:"uppercase", color:p.color, background:`${p.color}14`, border:`1px solid ${p.color}28`, borderRadius:5, padding:"3px 8px", display:"inline-block", marginBottom:8 }}>{p.tag}</div>
                <h3 style={{ fontSize: mobile ? 16 : 17, fontWeight:700, color:C.text, marginBottom:6 }}>{p.title}</h3>
                <p style={{ fontSize:13, color:C.muted, lineHeight:1.65 }}>{p.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── ABOUT ── */}
      <section id="about" ref={aboutRef} style={{
        position:"relative", zIndex:1,
        borderTop:`1px solid ${C.border}`,
        background: C.surface,
        padding: mobile ? "64px 20px" : "96px 52px",
        overflow:"hidden",
      }}>
        {/* subtle background glow */}
        <div style={{ position:"absolute", top:"30%", right:"-10%", width:500, height:400, borderRadius:"50%", background:`radial-gradient(circle,${C.violet}0a,transparent 65%)`, pointerEvents:"none" }} />
        <div style={{ position:"absolute", bottom:"10%", left:"-5%", width:400, height:300, borderRadius:"50%", background:`radial-gradient(circle,${C.indigo}08,transparent 65%)`, pointerEvents:"none" }} />

        <div style={{ maxWidth:1100, margin:"0 auto", position:"relative" }}>

          {/* header */}
          <div style={{
            textAlign:"center", marginBottom: mobile ? 48 : 72,
            opacity: aboutVis ? 1 : 0,
            transform: aboutVis ? "translateY(0)" : "translateY(20px)",
            transition:"opacity .6s ease, transform .6s ease",
          }}>
            <p style={sectionEye}>About StudyFlow</p>
            <h2 style={{ fontSize: mobile ? 30 : 42, fontWeight:800, letterSpacing:"-1.2px", marginBottom:16 }}>
              Made by a student,<br />
              <span style={{ background:`linear-gradient(105deg,${C.indigo},${C.indigoFg})`, WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent" }}>
                for every student.
              </span>
            </h2>
            <p style={{ fontSize: mobile ? 14 : 15, color:C.muted, maxWidth:520, margin:"0 auto", lineHeight:1.8 }}>
              StudyFlow started as a frustration. Juggling five different apps — a planner here, a grade tracker there, sticky notes everywhere — was exhausting. So we built one thing that does it all, done right.
            </p>
          </div>

          {/* stats row */}
          <div style={{
            display:"grid",
            gridTemplateColumns: mobile ? "1fr 1fr" : "repeat(4,1fr)",
            gap: mobile ? 10 : 14,
            marginBottom: mobile ? 48 : 72,
          }}>
            {STATS.map((s, i) => (
              <div key={s.label} style={{
                background: C.surface2,
                border:`1px solid ${C.border}`,
                borderRadius:14,
                padding: mobile ? "20px 16px" : "28px 20px",
                textAlign:"center",
                opacity: aboutVis ? 1 : 0,
                transform: aboutVis ? "translateY(0)" : "translateY(20px)",
                transition:`opacity .5s ease ${i*.08 + .1}s, transform .5s ease ${i*.08 + .1}s`,
              }}>
                <div style={{ fontSize: mobile ? 24 : 28, marginBottom:10 }}>{s.icon}</div>
                <div style={{ fontSize: mobile ? 26 : 34, fontWeight:800, color:C.text, letterSpacing:"-1px", lineHeight:1 }}>{s.value}</div>
                <div style={{ fontSize: mobile ? 11 : 12, color:C.muted, marginTop:6, letterSpacing:"0.4px" }}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* two-column: story + values */}
          <div style={{
            display:"grid",
            gridTemplateColumns: mobile ? "1fr" : "1fr 1fr",
            gap: mobile ? 32 : 52,
            alignItems:"start",
          }}>

            {/* story */}
            <div style={{
              opacity: aboutVis ? 1 : 0,
              transform: aboutVis ? "translateY(0)" : "translateY(22px)",
              transition:"opacity .6s ease .25s, transform .6s ease .25s",
            }}>
              <div style={{ fontSize:10, fontWeight:700, letterSpacing:"1.5px", textTransform:"uppercase", color:C.indigoFg, marginBottom:16 }}>Our story</div>
              <p style={{ fontSize: mobile ? 14 : 15, color:C.textSoft, lineHeight:1.85, marginBottom:20 }}>
                It started right after the final week of class — the one where we presented our system project. That moment sparked something. After discovering Vite and React, I built my very first project: a simple to-do list.
              </p>
              <p style={{ fontSize: mobile ? 14 : 15, color:C.textSoft, lineHeight:1.85, marginBottom:20 }}>
                But the more I worked on it, the more I thought — why stop at a to-do list? I wanted something I could actually use in the next school year. Something that could handle not just tasks, but everything a student juggles every day.
              </p>
              <p style={{ fontSize: mobile ? 14 : 15, color:C.textSoft, lineHeight:1.85 }}>
                So I kept building. StudyFlow grew into a full academic workspace — and now I'm sharing it, hoping it helps other students stay organised, never miss a deadline, and actually enjoy managing their studies.
              </p>

              {/* inline founder tag */}
              <div style={{
                display:"inline-flex", alignItems:"center", gap:12,
                marginTop:28, background:C.surface, border:`1px solid ${C.border}`,
                borderRadius:12, padding:"12px 16px",
              }}>
                <div style={{ width:36, height:36, borderRadius:"50%", background:`${C.indigo}22`, border:`1px solid ${C.indigo}44`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:16 }}>👨‍💻</div>
                <div>
                  <div style={{ fontSize:13, fontWeight:700, color:C.text }}>Adrian</div>
                  <div style={{ fontSize:11, color:C.muted }}>Founder · Student · Builder</div>
                </div>
              </div>
            </div>

            {/* values */}
            <div style={{
              display:"flex", flexDirection:"column", gap: mobile ? 12 : 14,
              opacity: aboutVis ? 1 : 0,
              transform: aboutVis ? "translateY(0)" : "translateY(22px)",
              transition:"opacity .6s ease .35s, transform .6s ease .35s",
            }}>
              <div style={{ fontSize:10, fontWeight:700, letterSpacing:"1.5px", textTransform:"uppercase", color:C.indigoFg, marginBottom:4 }}>What we stand for</div>
              {TEAM_VALUES.map((v, i) => (
                <div key={v.title} style={{
                  display:"flex", gap:16, alignItems:"flex-start",
                  background: C.surface2,
                  border:`1px solid ${C.border}`,
                  borderRadius:14,
                  padding: mobile ? "18px 16px" : "20px 18px",
                  opacity: aboutVis ? 1 : 0,
                  transform: aboutVis ? "translateY(0)" : "translateY(16px)",
                  transition:`opacity .5s ease ${i*.1 + .4}s, transform .5s ease ${i*.1 + .4}s`,
                }}>
                  <div style={{ fontSize:22, flexShrink:0, marginTop:2 }}>{v.icon}</div>
                  <div>
                    <div style={{ fontSize: mobile ? 13 : 14, fontWeight:700, color:C.text, marginBottom:6 }}>{v.title}</div>
                    <div style={{ fontSize: mobile ? 12 : 13, color:C.muted, lineHeight:1.65 }}>{v.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      </section>

      {/* ── CTA ── */}
      <section ref={ctaRef} style={{
        position:"relative", zIndex:1, textAlign:"center",
        padding: mobile ? "72px 24px" : "110px 52px",
        background:`linear-gradient(180deg,${C.bg} 0%,#0a0a1c 50%,${C.bg} 100%)`,
        overflow:"hidden",
      }}>
        <div style={{ position:"absolute", top:"50%", left:"50%", transform:"translate(-50%,-50%)", width: mobile?400:800, height:280, pointerEvents:"none", background:`radial-gradient(ellipse,${C.indigo}18,transparent 65%)` }} />
        <div style={{ position:"relative", opacity: ctaVis?1:0, transform: ctaVis?"translateY(0)":"translateY(18px)", transition:"opacity .7s ease, transform .7s ease" }}>
          <div style={eyebrow}>✦ Free to use</div>
          <h2 style={{ fontSize: mobile ? 28 : 46, fontWeight:800, letterSpacing:"-1.5px", margin: mobile ? "16px 0 12px" : "20px 0 14px" }}>
            Ready to take control<br />of your studies?
          </h2>
          <p style={{ fontSize: mobile ? 14 : 15, color:C.muted, maxWidth:380, margin:"0 auto 28px" }}>
            Create your free account and get started in under a minute.
          </p>
          <div style={{ display:"flex", gap:10, justifyContent:"center", flexDirection: mobile ? "column" : "row", alignItems:"center", maxWidth: mobile ? 320 : "none", margin:"0 auto" }}>
            <button style={{ background:C.indigo, color:"#fff", border:"none", borderRadius:10, padding: mobile ? "15px 32px" : "14px 36px", fontSize: mobile ? 15 : 16, fontWeight:700, cursor:"pointer", width: mobile ? "100%" : "auto", fontFamily:"'Plus Jakarta Sans',sans-serif" }} onClick={() => navigate("/register")}>
              Create Free Account →
            </button>
            <button style={{ background:"transparent", color:C.muted, border:`1px solid ${C.border}`, borderRadius:10, padding: mobile ? "15px 32px" : "14px 28px", fontSize: mobile ? 15 : 16, cursor:"pointer", width: mobile ? "100%" : "auto", fontFamily:"'Plus Jakarta Sans',sans-serif" }} onClick={() => navigate("/login")}>
              Sign In
            </button>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer style={{
        position:"relative", zIndex:1,
        display:"flex", flexDirection: mobile ? "column" : "row",
        alignItems: mobile ? "flex-start" : "center",
        justifyContent:"space-between", gap: mobile ? 16 : 0,
        padding: mobile ? "24px 20px" : "24px 52px",
        borderTop:`1px solid ${C.border}`,
      }}>
        <div>
          <div style={{ fontSize:17, fontWeight:800 }}><span style={{ color:C.indigo }}>Study</span>Flow</div>
          <div style={{ fontSize:11, color:C.muted, marginTop:3, maxWidth:240 }}>The academic command centre for students who mean business.</div>
        </div>
        <div style={{ display:"flex", gap:20 }}>
          {[["Sign In","/login"],["Register","/register"],["Privacy","/privacy"]].map(([l,r]) => (
            <button key={l} style={{ background:"none", border:"none", cursor:"pointer", fontSize:13, color:C.muted, fontFamily:"'Plus Jakarta Sans',sans-serif" }} onClick={() => navigate(r)}>{l}</button>
          ))}
        </div>
        <span style={{ fontSize:12, color:C.muted }}>© {new Date().getFullYear()} StudyFlow · Built for students.</span>
      </footer>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        html { scroll-behavior: smooth; }
        body { background: ${C.bg}; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: ${C.bg}; }
        ::-webkit-scrollbar-thumb { background: ${C.indigo}44; border-radius: 4px; }
        button { font-family: 'Plus Jakarta Sans', sans-serif; }

        @keyframes badgeFloat {
          0%,100% { transform: translateY(0); }
          50% { transform: translateY(-5px); }
        }
        @keyframes badgeSlide {
          from { opacity:0; transform: translateX(-14px); }
          to   { opacity:1; transform: translateX(0); }
        }
        .badge-float  { animation: badgeFloat 3.2s ease-in-out infinite; }
        .badge-slidein { animation: badgeSlide 0.65s ease 1s both; }
      `}</style>
    </div>
  );
}

/* ─── Shared style snippets ─────────────────────────────────────── */
const navBtn = {
  background: "none", border: "none", cursor: "pointer",
  fontSize: 13, color: C.muted, fontFamily: "'Plus Jakarta Sans',sans-serif",
};
const eyebrow = {
  display: "inline-flex", alignItems: "center", gap: 6,
  fontSize: 10, fontWeight: 700, letterSpacing: "1.5px", textTransform: "uppercase",
  color: C.indigoFg, background: `${C.indigo}18`, border: `1px solid ${C.indigo}30`,
  borderRadius: 100, padding: "5px 14px", marginBottom: 18,
};
const sectionEye = {
  fontSize: 10, letterSpacing: "2px", textTransform: "uppercase",
  color: C.indigo, marginBottom: 10, fontWeight: 700,
};