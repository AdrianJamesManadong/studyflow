import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

/* ─── Design tokens (same as Home) ─────────────────────────────── */
const C = {
  bg:        "#080812",
  surface:   "#0f0f1e",
  surface2:  "#13132a",
  border:    "#1c1c38",
  indigo:    "#5b50f0",
  indigoFg:  "#a5a0fa",
  emerald:   "#10b981",
  text:      "#eeeef8",
  textSoft:  "#b0b0cc",
  muted:     "#5a5a7a",
};

const SECTIONS = [
  {
    id: "information",
    title: "Information we collect",
    icon: "📋",
    content: [
      "When you create an account, we collect your email address and a hashed password — nothing else is required to get started.",
      "As you use StudyFlow, we store the data you create: subjects, assignments, grades, notes, and calendar events. This data belongs to you.",
      "We do not collect any analytics, tracking pixels, or behavioural data. We don't know which pages you visit or how long you spend on them.",
    ],
  },
  {
    id: "usage",
    title: "How we use your data",
    icon: "🛠️",
    content: [
      "Your data is used solely to power your StudyFlow experience — to display your subjects, assignments, grades, and notes back to you.",
      "We do not sell, rent, or share your personal data with any third party for marketing or advertising purposes.",
      "The built-in AI Assistant sends your questions to an AI model to generate responses. These queries are not stored or used to train any model.",
    ],
  },
  {
    id: "storage",
    title: "Data storage & security",
    icon: "🔒",
    content: [
      "StudyFlow uses Supabase for authentication and database storage. Your data is encrypted at rest and in transit using industry-standard TLS.",
      "Passwords are never stored in plain text. Authentication is handled entirely by Supabase's secure auth system.",
      "We follow responsible security practices and will notify you promptly if we ever become aware of a data breach affecting your account.",
    ],
  },
  {
    id: "rights",
    title: "Your rights",
    icon: "✅",
    content: [
      "You can delete your account and all associated data at any time from your account settings. Deletion is permanent and immediate.",
      "You can export or request a copy of your data by contacting us directly. We'll respond within a reasonable timeframe.",
      "You are always in control of what you add to StudyFlow. We will never add, modify, or remove your academic data without your action.",
    ],
  },
  {
    id: "cookies",
    title: "Cookies",
    icon: "🍪",
    content: [
      "StudyFlow uses only essential session cookies required to keep you logged in. We do not use advertising cookies or third-party tracking cookies.",
      "You can clear cookies at any time through your browser settings. Doing so will log you out of your account.",
    ],
  },
  {
    id: "changes",
    title: "Changes to this policy",
    icon: "📝",
    content: [
      "If we make significant changes to this Privacy Policy, we will notify you via email or a notice within the app before the changes take effect.",
      "Continued use of StudyFlow after any changes constitutes your acceptance of the updated policy.",
      "This policy was last updated in 2025. StudyFlow is a student-built project and this policy reflects our genuine, straightforward approach to your privacy.",
    ],
  },
];

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

export default function Privacy() {
  const navigate = useNavigate();
  const mobile   = useIsMobile();
  const [scrolled, setScrolled] = useState(false);
  const [visible, setVisible]   = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 80);
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", onScroll);
    return () => { clearTimeout(t); window.removeEventListener("scroll", onScroll); };
  }, []);

  return (
    <div style={{ fontFamily:"'Plus Jakarta Sans',sans-serif", background:C.bg, color:C.text, minHeight:"100vh", overflowX:"hidden" }}>

      {/* ambient blobs */}
      <div style={{ position:"fixed", top:"-20%", left:"-15%", width:500, height:500, borderRadius:"50%", background:`radial-gradient(circle,${C.indigo}10,transparent 70%)`, pointerEvents:"none", zIndex:0 }} />
      <div style={{ position:"fixed", bottom:"10%", right:"-10%", width:380, height:380, borderRadius:"50%", background:"radial-gradient(circle,#7c3aed0c,transparent 70%)", pointerEvents:"none", zIndex:0 }} />

      {/* ── NAV ── */}
      <nav style={{
        position:"fixed", top:0, left:0, right:0, zIndex:300,
        display:"flex", alignItems:"center", justifyContent:"space-between",
        padding: mobile ? "14px 20px" : "16px 52px",
        background: scrolled ? "rgba(8,8,18,.95)" : "transparent",
        backdropFilter: scrolled ? "blur(24px)" : "none",
        borderBottom: scrolled ? `1px solid ${C.border}` : "1px solid transparent",
        transition:"background .3s, border-color .3s",
      }}>
        <button onClick={() => navigate("/")} style={{ background:"none", border:"none", cursor:"pointer", fontSize: mobile ? 17 : 20, fontWeight:800, letterSpacing:"-0.5px", color:C.text, fontFamily:"'Plus Jakarta Sans',sans-serif" }}>
          <span style={{ color:C.indigo }}>Study</span>Flow
        </button>
        <div style={{ display:"flex", gap:10 }}>
          <button style={{ background:"transparent", color:C.muted, border:`1px solid ${C.border}`, borderRadius:8, padding:"8px 16px", fontSize:13, cursor:"pointer", fontFamily:"'Plus Jakarta Sans',sans-serif" }} onClick={() => navigate("/login")}>Sign In</button>
          <button style={{ background:C.indigo, color:"#fff", border:"none", borderRadius:8, padding:"8px 18px", fontSize:13, fontWeight:600, cursor:"pointer", fontFamily:"'Plus Jakarta Sans',sans-serif" }} onClick={() => navigate("/register")}>Get Started</button>
        </div>
      </nav>

      {/* ── HERO ── */}
      <div style={{
        position:"relative", zIndex:1,
        maxWidth:780, margin:"0 auto",
        padding: mobile ? "110px 20px 48px" : "140px 24px 64px",
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(20px)",
        transition:"opacity .7s ease, transform .7s ease",
      }}>
        {/* back link */}
        <button onClick={() => navigate("/")} style={{ background:"none", border:"none", cursor:"pointer", fontSize:13, color:C.muted, marginBottom:28, display:"flex", alignItems:"center", gap:6, fontFamily:"'Plus Jakarta Sans',sans-serif", padding:0 }}>
          ← Back to home
        </button>

        <div style={{
          display:"inline-flex", alignItems:"center", gap:6,
          fontSize:10, fontWeight:700, letterSpacing:"1.5px", textTransform:"uppercase",
          color:C.indigoFg, background:`${C.indigo}18`, border:`1px solid ${C.indigo}30`,
          borderRadius:100, padding:"5px 14px", marginBottom:18,
        }}>✦ Legal</div>

        <h1 style={{ fontSize: mobile ? 34 : 48, fontWeight:800, letterSpacing:"-1.5px", lineHeight:1.1, marginBottom:16 }}>
          Privacy Policy
        </h1>
        <p style={{ fontSize: mobile ? 14 : 15, color:C.muted, lineHeight:1.8, maxWidth:560, marginBottom:32 }}>
          StudyFlow is a student-built project. We keep this simple: your data is yours, we don't sell it, and we only collect what's needed to make the app work.
        </p>

        {/* last updated badge */}
        <div style={{ display:"inline-flex", alignItems:"center", gap:8, background:C.surface, border:`1px solid ${C.border}`, borderRadius:8, padding:"8px 14px", fontSize:12, color:C.muted }}>
          <span style={{ width:6, height:6, borderRadius:"50%", background:C.emerald, display:"inline-block", boxShadow:`0 0 6px ${C.emerald}99` }} />
          Last updated · 2025
        </div>
      </div>

      {/* ── CONTENT ── */}
      <div style={{ position:"relative", zIndex:1, maxWidth:780, margin:"0 auto", padding: mobile ? "0 20px 80px" : "0 24px 100px" }}>

        {/* table of contents */}
        <div style={{
          background:C.surface, border:`1px solid ${C.border}`, borderRadius:14,
          padding: mobile ? "20px" : "24px 28px", marginBottom: mobile ? 32 : 48,
          opacity: visible ? 1 : 0,
          transform: visible ? "translateY(0)" : "translateY(16px)",
          transition:"opacity .6s ease .15s, transform .6s ease .15s",
        }}>
          <div style={{ fontSize:11, fontWeight:700, letterSpacing:"1.5px", textTransform:"uppercase", color:C.indigo, marginBottom:14 }}>Contents</div>
          <div style={{ display:"flex", flexDirection:"column", gap:4 }}>
            {SECTIONS.map((s, i) => (
              <button key={s.id} onClick={() => document.getElementById(s.id)?.scrollIntoView({ behavior:"smooth" })}
                style={{ background:"none", border:"none", cursor:"pointer", textAlign:"left", fontSize:13, color:C.muted, padding:"5px 0", fontFamily:"'Plus Jakarta Sans',sans-serif", display:"flex", alignItems:"center", gap:10 }}>
                <span style={{ fontSize:10, color:C.indigo, fontWeight:700, minWidth:16 }}>{String(i+1).padStart(2,"0")}</span>
                {s.title}
              </button>
            ))}
          </div>
        </div>

        {/* sections */}
        <div style={{ display:"flex", flexDirection:"column", gap: mobile ? 20 : 24 }}>
          {SECTIONS.map((s, i) => (
            <div key={s.id} id={s.id} style={{
              background:C.surface, border:`1px solid ${C.border}`, borderRadius:16,
              padding: mobile ? "24px 20px" : "32px 32px",
              opacity: visible ? 1 : 0,
              transform: visible ? "translateY(0)" : "translateY(18px)",
              transition:`opacity .55s ease ${i*.07 + .2}s, transform .55s ease ${i*.07 + .2}s`,
            }}>
              <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:20 }}>
                <div style={{ width:38, height:38, borderRadius:10, background:`${C.indigo}18`, border:`1px solid ${C.indigo}28`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:18, flexShrink:0 }}>{s.icon}</div>
                <div>
                  <div style={{ fontSize:10, fontWeight:700, letterSpacing:"1px", textTransform:"uppercase", color:C.indigo, marginBottom:3 }}>Section {String(i+1).padStart(2,"0")}</div>
                  <h2 style={{ fontSize: mobile ? 15 : 17, fontWeight:700, color:C.text }}>{s.title}</h2>
                </div>
              </div>
              <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
                {s.content.map((para, j) => (
                  <div key={j} style={{ display:"flex", gap:12, alignItems:"flex-start" }}>
                    <span style={{ width:5, height:5, borderRadius:"50%", background:C.indigo, flexShrink:0, marginTop:8 }} />
                    <p style={{ fontSize: mobile ? 13 : 14, color:C.textSoft, lineHeight:1.8, margin:0 }}>{para}</p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* contact footer card */}
        <div style={{
          marginTop: mobile ? 28 : 36,
          background:`${C.indigo}10`, border:`1px solid ${C.indigo}28`, borderRadius:16,
          padding: mobile ? "24px 20px" : "32px",
          textAlign:"center",
          opacity: visible ? 1 : 0,
          transition:"opacity .6s ease .8s",
        }}>
          <div style={{ fontSize:24, marginBottom:12 }}>💬</div>
          <h3 style={{ fontSize: mobile ? 15 : 17, fontWeight:700, color:C.text, marginBottom:8 }}>Questions about your privacy?</h3>
          <p style={{ fontSize: mobile ? 13 : 14, color:C.muted, lineHeight:1.7, maxWidth:420, margin:"0 auto 20px" }}>
            StudyFlow is a student project and we're happy to answer any questions directly. Reach out and we'll get back to you.
          </p>
          <button style={{ background:C.indigo, color:"#fff", border:"none", borderRadius:9, padding:"11px 26px", fontSize:14, fontWeight:600, cursor:"pointer", fontFamily:"'Plus Jakarta Sans',sans-serif" }} onClick={() => navigate("/")}>
            Back to StudyFlow
          </button>
        </div>
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        html { scroll-behavior: smooth; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: ${C.bg}; }
        ::-webkit-scrollbar-thumb { background: ${C.indigo}44; border-radius: 4px; }
      `}</style>
    </div>
  );
}