import { useState, useEffect, useRef, useCallback } from "react";

// ─── CONFIG — API calls go through /api/schedule serverless function ─────────
// This keeps your Groq key secret on the server. Set GROQ_API_KEY in Vercel env vars.
const API_ENDPOINT = typeof window !== "undefined" && window.location.hostname !== "localhost"
  ? "/api/schedule"
  : "https://api.groq.com/openai/v1/chat/completions";

// ─── STYLES ────────────────────────────────────────────────────────────────
const STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700&family=DM+Sans:wght@300;400;500&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  :root {
    --cream:   #FAF6EF;
    --sage:    #5C7A5E;
    --sage-lt: #8BAF8D;
    --gold:    #C8963E;
    --gold-lt: #E8B96A;
    --charcoal:#2C2C2C;
    --muted:   #7A7A7A;
    --white:   #FFFFFF;
    --error:   #C0392B;
    --card-bg: rgba(255,255,255,0.72);
    --shadow:  0 8px 32px rgba(44,44,44,0.10);
  }

  body { font-family: 'DM Sans', sans-serif; background: var(--cream); color: var(--charcoal); min-height: 100vh; }

  .app { min-height: 100vh; position: relative; overflow-x: hidden; }

  /* GEOMETRIC BG */
  .geo-bg {
    position: fixed; inset: 0; z-index: 0; pointer-events: none;
    background:
      radial-gradient(ellipse 80% 60% at 10% 20%, rgba(92,122,94,0.08) 0%, transparent 60%),
      radial-gradient(ellipse 60% 80% at 90% 80%, rgba(200,150,62,0.07) 0%, transparent 60%),
      var(--cream);
  }
  .geo-bg::before {
    content: '';
    position: absolute; inset: 0;
    background-image: url("data:image/svg+xml,%3Csvg width='80' height='80' viewBox='0 0 80 80' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' stroke='%235C7A5E' stroke-width='0.4' opacity='0.18'%3E%3Cpolygon points='40,2 78,21 78,59 40,78 2,59 2,21'/%3E%3Cpolygon points='40,12 70,27 70,53 40,68 10,53 10,27'/%3E%3Cline x1='40' y1='2' x2='40' y2='78'/%3E%3Cline x1='2' y1='21' x2='78' y2='59'/%3E%3Cline x1='78' y1='21' x2='2' y2='59'/%3E%3C/g%3E%3C/svg%3E");
    background-size: 80px 80px;
  }

  .page { position: relative; z-index: 1; }

  /* NAV */
  .nav {
    display: flex; align-items: center; justify-content: space-between;
    padding: 18px 48px; background: rgba(250,246,239,0.88);
    backdrop-filter: blur(12px); border-bottom: 1px solid rgba(92,122,94,0.12);
    position: sticky; top: 0; z-index: 100;
  }
  .nav-inner { max-width: 1400px; margin: 0 auto; width: 100%; display: flex; align-items: center; justify-content: space-between; }
  .nav-logo { font-family: 'Playfair Display', serif; font-size: 1.4rem; color: var(--sage); font-weight: 700; letter-spacing: -0.5px; display: flex; align-items: center; gap: 10px; cursor: pointer; }
  .nav-logo span { font-size: 1.6rem; }
  .nav-tabs { display: flex; gap: 4px; }
  .nav-tab { padding: 8px 18px; border-radius: 20px; border: none; background: transparent; font-family: 'DM Sans', sans-serif; font-size: 0.85rem; color: var(--muted); cursor: pointer; transition: all 0.2s; font-weight: 500; }
  .nav-tab:hover { background: rgba(92,122,94,0.08); color: var(--sage); }
  .nav-tab.active { background: var(--sage); color: white; }

  /* LANDING */
  .landing-wrap { max-width: 1400px; margin: 0 auto; padding: 0 48px; }
  .hero { padding: 100px 0 60px; text-align: center; max-width: 860px; margin: 0 auto; }
  .hero-badge { display: inline-flex; align-items: center; gap: 8px; background: rgba(200,150,62,0.12); border: 1px solid rgba(200,150,62,0.3); color: var(--gold); padding: 6px 16px; border-radius: 20px; font-size: 0.78rem; font-weight: 500; letter-spacing: 0.05em; margin-bottom: 28px; text-transform: uppercase; }
  .hero h1 { font-family: 'Playfair Display', serif; font-size: clamp(2.6rem, 5vw, 5rem); line-height: 1.1; color: var(--charcoal); margin-bottom: 20px; font-weight: 700; }
  .hero h1 em { color: var(--sage); font-style: normal; }
  .hero p { font-size: 1.15rem; color: var(--muted); line-height: 1.7; margin-bottom: 40px; font-weight: 300; max-width: 600px; margin-left: auto; margin-right: auto; }
  .hero-cta { display: flex; gap: 14px; justify-content: center; flex-wrap: wrap; margin-bottom: 0; }
  .btn-primary { padding: 14px 32px; background: var(--sage); color: white; border: none; border-radius: 12px; font-family: 'DM Sans', sans-serif; font-size: 0.95rem; font-weight: 500; cursor: pointer; transition: all 0.2s; letter-spacing: 0.02em; }
  .btn-primary:hover { background: #4a6a4c; transform: translateY(-1px); box-shadow: 0 6px 20px rgba(92,122,94,0.3); }
  .btn-secondary { padding: 14px 32px; background: transparent; color: var(--sage); border: 1.5px solid var(--sage); border-radius: 12px; font-family: 'DM Sans', sans-serif; font-size: 0.95rem; font-weight: 500; cursor: pointer; transition: all 0.2s; }
  .btn-secondary:hover { background: rgba(92,122,94,0.06); }
  .btn-gold { padding: 14px 32px; background: var(--gold); color: white; border: none; border-radius: 12px; font-family: 'DM Sans', sans-serif; font-size: 0.95rem; font-weight: 500; cursor: pointer; transition: all 0.2s; }
  .btn-gold:hover { background: #b5822f; transform: translateY(-1px); box-shadow: 0 6px 20px rgba(200,150,62,0.3); }
  .btn-sm { padding: 9px 20px; font-size: 0.83rem; border-radius: 9px; }

  .features { display: grid; grid-template-columns: repeat(4, 1fr); gap: 24px; padding: 60px 0 80px; max-width: 1400px; margin: 0 auto; }
  @media(max-width:1100px){ .features { grid-template-columns: repeat(2,1fr); } }
  @media(max-width:600px){ .features { grid-template-columns: 1fr; } }
  .feature-card { background: var(--card-bg); backdrop-filter: blur(10px); border-radius: 18px; padding: 28px 24px; border: 1px solid rgba(92,122,94,0.10); box-shadow: var(--shadow); transition: transform 0.2s; }
  .feature-card:hover { transform: translateY(-3px); }
  .feature-icon { font-size: 2rem; margin-bottom: 14px; }
  .feature-card h3 { font-family: 'Playfair Display', serif; font-size: 1.05rem; margin-bottom: 8px; color: var(--charcoal); }
  .feature-card p { font-size: 0.85rem; color: var(--muted); line-height: 1.6; }

  /* SETUP WIZARD */
  .wizard { max-width: 860px; margin: 0 auto; padding: 48px 48px; }
  @media(max-width:900px){ .wizard { padding: 32px 24px; } }
  .wizard-header { margin-bottom: 40px; }
  .wizard-header h2 { font-family: 'Playfair Display', serif; font-size: 2rem; color: var(--charcoal); margin-bottom: 8px; }
  .wizard-header p { color: var(--muted); font-size: 0.92rem; }
  .progress-bar { height: 3px; background: rgba(92,122,94,0.15); border-radius: 3px; margin-bottom: 40px; overflow: hidden; }
  .progress-fill { height: 100%; background: linear-gradient(90deg, var(--sage), var(--gold)); border-radius: 3px; transition: width 0.4s ease; }
  .step-label { font-size: 0.78rem; color: var(--muted); margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.08em; }

  .form-card { background: var(--card-bg); backdrop-filter: blur(10px); border-radius: 20px; padding: 36px; border: 1px solid rgba(92,122,94,0.12); box-shadow: var(--shadow); margin-bottom: 24px; }
  .form-card h3 { font-family: 'Playfair Display', serif; font-size: 1.3rem; margin-bottom: 6px; color: var(--charcoal); }
  .form-card .sub { font-size: 0.85rem; color: var(--muted); margin-bottom: 24px; }

  .form-group { margin-bottom: 20px; }
  .form-label { display: block; font-size: 0.85rem; font-weight: 500; color: var(--charcoal); margin-bottom: 8px; }
  .form-input { width: 100%; padding: 12px 16px; border: 1.5px solid rgba(92,122,94,0.2); border-radius: 10px; font-family: 'DM Sans', sans-serif; font-size: 0.9rem; background: rgba(255,255,255,0.8); color: var(--charcoal); transition: border-color 0.2s; outline: none; }
  .form-input:focus { border-color: var(--sage); background: white; }
  .form-select { appearance: none; background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%235C7A5E' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E"); background-repeat: no-repeat; background-position: right 14px center; padding-right: 40px; }

  .tag-input-row { display: flex; gap: 8px; margin-bottom: 12px; }
  .tag-input-row .form-input { flex: 1; }
  .tags { display: flex; flex-wrap: wrap; gap: 8px; }
  .tag { display: flex; align-items: center; gap: 6px; background: rgba(92,122,94,0.12); border: 1px solid rgba(92,122,94,0.2); color: var(--sage); padding: 6px 12px; border-radius: 20px; font-size: 0.82rem; font-weight: 500; }
  .tag-remove { cursor: pointer; opacity: 0.6; font-size: 1rem; line-height: 1; }
  .tag-remove:hover { opacity: 1; }

  .radio-group { display: flex; flex-wrap: wrap; gap: 10px; }
  .radio-option { display: flex; align-items: center; gap: 8px; padding: 10px 16px; border: 1.5px solid rgba(92,122,94,0.2); border-radius: 10px; cursor: pointer; transition: all 0.2s; font-size: 0.88rem; }
  .radio-option:hover { border-color: var(--sage); background: rgba(92,122,94,0.04); }
  .radio-option.selected { border-color: var(--sage); background: rgba(92,122,94,0.1); color: var(--sage); font-weight: 500; }
  .radio-option input { display: none; }

  .busy-time-row { display: grid; grid-template-columns: 1fr 1fr 1fr auto; gap: 10px; align-items: end; margin-bottom: 12px; }
  .btn-icon { width: 38px; height: 38px; display: flex; align-items: center; justify-content: center; background: rgba(192,57,43,0.08); border: 1px solid rgba(192,57,43,0.2); border-radius: 8px; cursor: pointer; font-size: 1rem; transition: all 0.2s; }
  .btn-icon:hover { background: rgba(192,57,43,0.15); }

  .wizard-nav { display: flex; justify-content: space-between; align-items: center; margin-top: 8px; }
  .step-counter { font-size: 0.82rem; color: var(--muted); }

  /* PRAYER TIMES BANNER */
  .prayer-banner { background: linear-gradient(135deg, var(--sage) 0%, #3d5e3f 100%); color: white; border-radius: 16px; padding: 20px 24px; margin-bottom: 28px; display: flex; align-items: center; gap: 16px; flex-wrap: wrap; }
  .prayer-banner h4 { font-family: 'Playfair Display', serif; font-size: 1rem; margin-bottom: 4px; }
  .prayer-banner p { font-size: 0.82rem; opacity: 0.85; }
  .prayer-times-grid { display: flex; gap: 16px; flex-wrap: wrap; margin-top: 12px; }
  .prayer-pill { background: rgba(255,255,255,0.15); border-radius: 20px; padding: 5px 14px; font-size: 0.8rem; display: flex; align-items: center; gap: 6px; }
  .prayer-pill.next { background: rgba(200,150,62,0.5); font-weight: 600; }

  /* TIMETABLE */
  .timetable-page { max-width: 1300px; margin: 0 auto; padding: 40px 48px; position: relative; z-index: 2; }
  .timetable-page h2 { font-family: 'Playfair Display', serif; font-size: 2.2rem; margin-bottom: 6px; }
  .timetable-page .sub { color: var(--muted); font-size: 0.9rem; margin-bottom: 32px; }
  @media(min-width:1100px){
    .timetable-days { display: grid; grid-template-columns: repeat(3,1fr); gap: 28px; }
    .day-header { margin-top: 0; }
  }

  .day-header { font-family: 'Playfair Display', serif; font-size: 1.1rem; color: var(--charcoal); margin: 28px 0 14px; padding-bottom: 8px; border-bottom: 2px solid rgba(92,122,94,0.15); display: flex; align-items: center; gap: 10px; }
  .day-header span { font-size: 0.75rem; font-family: 'DM Sans', sans-serif; background: rgba(92,122,94,0.1); color: var(--sage); padding: 3px 10px; border-radius: 10px; font-weight: 500; }

  .block { display: flex; align-items: stretch; gap: 12px; margin-bottom: 8px; }
  .block-time { width: 72px; min-width: 72px; text-align: right; font-size: 0.75rem; color: var(--muted); padding-top: 13px; font-weight: 600; line-height: 1.3; }
  .block-card { flex: 1; border-radius: 12px; padding: 12px 16px; border-left: 4px solid; transition: transform 0.15s, box-shadow 0.15s; cursor: pointer; }
  .block-card:hover { transform: translateX(2px); box-shadow: 0 4px 16px rgba(0,0,0,0.07); }
  .block-card.study  { background: #EAF0EA; border-color: var(--sage); }
  .block-card.prayer { background: #FDF3E3; border-color: var(--gold); }
  .block-card.break  { background: #EEF4EE; border-color: var(--sage-lt); }
  .block-card.busy   { background: #F0F0F0; border-color: #AAAAAA; }
  .block-card.done   { opacity: 0.45; }
  .block-title { font-weight: 600; font-size: 0.88rem; margin-bottom: 2px; display: flex; align-items: center; gap: 7px; color: var(--charcoal); }
  .block-sub { font-size: 0.76rem; color: var(--muted); margin-bottom: 4px; }
  .block-check { width: 18px; height: 18px; border: 1.5px solid rgba(92,122,94,0.4); border-radius: 5px; display: inline-flex; align-items: center; justify-content: center; font-size: 0.7rem; margin-left: auto; cursor: pointer; flex-shrink: 0; background: white; }
  .block-check.checked { background: var(--sage); border-color: var(--sage); color: white; }
  .type-badge { font-size: 0.65rem; text-transform: uppercase; letter-spacing: 0.07em; font-weight: 700; opacity: 0.55; }

  /* STUDY TIMER */
  .timer-page { max-width: 680px; margin: 0 auto; padding: 48px 48px; text-align: center; position: relative; z-index: 2; }
  .timer-page h2 { font-family: 'Playfair Display', serif; font-size: 2rem; margin-bottom: 6px; }
  .timer-page .sub { color: var(--muted); margin-bottom: 40px; font-size: 0.9rem; }
  .timer-display { font-family: 'Playfair Display', serif; font-size: clamp(4rem, 18vw, 7rem); color: var(--charcoal); line-height: 1; margin-bottom: 10px; letter-spacing: -2px; font-weight: 700; transition: color 0.3s; }
  .timer-display.running { color: var(--sage); }
  .timer-display.break-mode { color: var(--gold); }
  .timer-label { font-size: 0.85rem; color: var(--muted); text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 36px; font-weight: 500; }
  .timer-controls { display: flex; gap: 14px; justify-content: center; margin-bottom: 40px; }
  .timer-circle-bg { width: 260px; height: 260px; border-radius: 50%; background: rgba(92,122,94,0.06); border: 2px solid rgba(92,122,94,0.12); margin: 0 auto 30px; display: flex; align-items: center; justify-content: center; position: relative; }
  .timer-svg { position: absolute; inset: -4px; width: calc(100% + 8px); height: calc(100% + 8px); transform: rotate(-90deg); }
  .timer-track { fill: none; stroke: rgba(92,122,94,0.1); stroke-width: 3; }
  .timer-prog { fill: none; stroke: var(--sage); stroke-width: 3; stroke-linecap: round; transition: stroke-dashoffset 0.5s linear, stroke 0.3s; }
  .timer-prog.break-mode { stroke: var(--gold); }

  .session-picker { display: flex; flex-wrap: wrap; gap: 10px; justify-content: center; margin-bottom: 32px; }
  .session-pill { padding: 8px 18px; border-radius: 20px; border: 1.5px solid rgba(92,122,94,0.2); background: transparent; font-family: 'DM Sans', sans-serif; font-size: 0.82rem; cursor: pointer; transition: all 0.2s; color: var(--charcoal); }
  .session-pill.active { background: var(--sage); border-color: var(--sage); color: white; }

  .today-sessions { text-align: left; background: var(--card-bg); border-radius: 16px; padding: 20px; border: 1px solid rgba(92,122,94,0.12); box-shadow: var(--shadow); }
  .today-sessions h4 { font-family: 'Playfair Display', serif; font-size: 1rem; margin-bottom: 14px; color: var(--charcoal); }
  .session-item { display: flex; align-items: center; gap: 12px; padding: 10px 0; border-bottom: 1px solid rgba(92,122,94,0.08); cursor: pointer; transition: background 0.15s; border-radius: 8px; padding: 10px 8px; }
  .session-item:hover { background: rgba(92,122,94,0.04); }
  .session-item:last-child { border-bottom: none; }
  .session-dot { width: 10px; height: 10px; border-radius: 50%; background: var(--sage); flex-shrink: 0; }
  .session-dot.done { background: var(--muted); }
  .session-dot.prayer { background: var(--gold); }
  .session-info { flex: 1; }
  .session-name { font-size: 0.88rem; font-weight: 500; }
  .session-time { font-size: 0.75rem; color: var(--muted); }
  .session-check { font-size: 1rem; }

  /* LOADING */
  .loading-screen { display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 60vh; gap: 20px; }
  .spinner { width: 48px; height: 48px; border: 3px solid rgba(92,122,94,0.15); border-top-color: var(--sage); border-radius: 50%; animation: spin 0.8s linear infinite; }
  @keyframes spin { to { transform: rotate(360deg); } }
  .loading-screen p { color: var(--muted); font-size: 0.9rem; }

  /* LOCATION PICKER */
  .country-grid { display: flex; flex-wrap: wrap; gap: 8px; }
  .country-btn { padding: 9px 14px; border-radius: 10px; border: 1.5px solid rgba(92,122,94,0.2); background: rgba(255,255,255,0.7); font-family: 'DM Sans', sans-serif; font-size: 0.83rem; cursor: pointer; transition: all 0.18s; color: var(--charcoal); white-space: nowrap; }
  .country-btn:hover { border-color: var(--sage); background: rgba(92,122,94,0.06); }
  .country-btn.selected { border-color: var(--sage); background: var(--sage); color: white; font-weight: 500; }
  .city-grid { display: flex; flex-wrap: wrap; gap: 8px; }
  .city-btn { padding: 8px 16px; border-radius: 20px; border: 1.5px solid rgba(92,122,94,0.2); background: rgba(255,255,255,0.7); font-family: 'DM Sans', sans-serif; font-size: 0.83rem; cursor: pointer; transition: all 0.18s; color: var(--charcoal); }
  .city-btn:hover { border-color: var(--gold); background: rgba(200,150,62,0.06); }
  .city-btn.selected { border-color: var(--gold); background: var(--gold); color: white; font-weight: 500; }
  .location-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }

  /* MISC */
  .error-msg { background: rgba(192,57,43,0.08); border: 1px solid rgba(192,57,43,0.2); color: var(--error); padding: 12px 16px; border-radius: 10px; font-size: 0.85rem; margin-bottom: 16px; }
  .success-msg { background: rgba(92,122,94,0.1); border: 1px solid rgba(92,122,94,0.2); color: var(--sage); padding: 12px 16px; border-radius: 10px; font-size: 0.85rem; margin-bottom: 16px; }
  .divider { height: 1px; background: rgba(92,122,94,0.1); margin: 20px 0; }
  .text-center { text-align: center; }
  .mt-16 { margin-top: 16px; }
  .flex-center { display: flex; align-items: center; justify-content: center; gap: 12px; }
  .ai-thinking { display: flex; align-items: center; gap: 12px; color: var(--sage); font-size: 0.88rem; padding: 16px; background: rgba(92,122,94,0.07); border-radius: 12px; margin-bottom: 20px; }
  .dots { display: flex; gap: 4px; }
  .dot { width: 6px; height: 6px; border-radius: 50%; background: var(--sage); animation: pulse 1.2s infinite; }
  .dot:nth-child(2) { animation-delay: 0.2s; }
  .dot:nth-child(3) { animation-delay: 0.4s; }
  @keyframes pulse { 0%,100%{opacity:0.3} 50%{opacity:1} }
  .fade-in { animation: fadeIn 0.4s ease; }
  @keyframes fadeIn { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:none} }

  @media(max-width:600px){
    .nav{ padding:14px 16px; } .nav-tabs{ display:none; }
    .landing-wrap{ padding: 0 16px; }
    .hero{ padding:50px 0 40px; }
    .wizard{ padding:32px 16px; } .form-card{ padding:22px 16px; }
    .busy-time-row{ grid-template-columns:1fr 1fr; grid-template-rows: auto auto; }
    .timetable-page{ padding:28px 16px; }
    .timer-page{ padding:28px 16px; }
    .location-row{ grid-template-columns:1fr; }
    .features{ padding: 40px 0 50px; }
  }
`;

// ─── HARDCODED PRAYER TIMES (used when API is blocked by sandbox) ────────────
// Times are typical UK/Europe spring averages; accurate enough for scheduling.
const PRAYER_TIMES_DB = {
  // 🇬🇧 UK
  "London":       { Fajr:"04:32", Dhuhr:"13:02", Asr:"16:47", Maghrib:"20:12", Isha:"21:42" },
  "Birmingham":   { Fajr:"04:28", Dhuhr:"13:05", Asr:"16:50", Maghrib:"20:17", Isha:"21:48" },
  "Manchester":   { Fajr:"04:22", Dhuhr:"13:05", Asr:"16:52", Maghrib:"20:22", Isha:"21:55" },
  "Bristol":      { Fajr:"04:38", Dhuhr:"13:08", Asr:"16:50", Maghrib:"20:18", Isha:"21:48" },
  "Bradford":     { Fajr:"04:20", Dhuhr:"13:04", Asr:"16:51", Maghrib:"20:23", Isha:"21:56" },
  "Cardiff":      { Fajr:"04:40", Dhuhr:"13:10", Asr:"16:51", Maghrib:"20:20", Isha:"21:50" },
  "Edinburgh":    { Fajr:"04:08", Dhuhr:"13:07", Asr:"16:57", Maghrib:"20:38", Isha:"22:14" },
  "Glasgow":      { Fajr:"04:06", Dhuhr:"13:08", Asr:"16:58", Maghrib:"20:40", Isha:"22:17" },
  "Leeds":        { Fajr:"04:21", Dhuhr:"13:04", Asr:"16:51", Maghrib:"20:23", Isha:"21:56" },
  "Leicester":    { Fajr:"04:27", Dhuhr:"13:04", Asr:"16:49", Maghrib:"20:17", Isha:"21:48" },
  "Liverpool":    { Fajr:"04:24", Dhuhr:"13:07", Asr:"16:52", Maghrib:"20:24", Isha:"21:57" },
  "Newcastle":    { Fajr:"04:14", Dhuhr:"13:02", Asr:"16:50", Maghrib:"20:28", Isha:"22:04" },
  "Nottingham":   { Fajr:"04:25", Dhuhr:"13:03", Asr:"16:49", Maghrib:"20:18", Isha:"21:50" },
  "Oxford":       { Fajr:"04:33", Dhuhr:"13:03", Asr:"16:47", Maghrib:"20:13", Isha:"21:43" },
  "Sheffield":    { Fajr:"04:22", Dhuhr:"13:03", Asr:"16:50", Maghrib:"20:21", Isha:"21:54" },
  // 🇳🇱 Netherlands
  "Amsterdam":    { Fajr:"04:18", Dhuhr:"13:26", Asr:"17:08", Maghrib:"20:54", Isha:"22:18" },
  "Rotterdam":    { Fajr:"04:20", Dhuhr:"13:27", Asr:"17:07", Maghrib:"20:52", Isha:"22:16" },
  "Utrecht":      { Fajr:"04:19", Dhuhr:"13:26", Asr:"17:07", Maghrib:"20:53", Isha:"22:17" },
  "Eindhoven":    { Fajr:"04:23", Dhuhr:"13:27", Asr:"17:06", Maghrib:"20:50", Isha:"22:13" },
  "Groningen":    { Fajr:"04:08", Dhuhr:"13:23", Asr:"17:07", Maghrib:"20:58", Isha:"22:26" },
  // 🇩🇪 Germany
  "Berlin":       { Fajr:"03:58", Dhuhr:"13:18", Asr:"17:05", Maghrib:"20:54", Isha:"22:22" },
  "Hamburg":      { Fajr:"03:52", Dhuhr:"13:22", Asr:"17:09", Maghrib:"21:02", Isha:"22:34" },
  "Munich":       { Fajr:"04:10", Dhuhr:"13:22", Asr:"17:03", Maghrib:"20:45", Isha:"22:09" },
  "Cologne":      { Fajr:"04:15", Dhuhr:"13:28", Asr:"17:10", Maghrib:"20:54", Isha:"22:19" },
  "Frankfurt":    { Fajr:"04:14", Dhuhr:"13:27", Asr:"17:07", Maghrib:"20:50", Isha:"22:13" },
  "Stuttgart":    { Fajr:"04:16", Dhuhr:"13:28", Asr:"17:06", Maghrib:"20:49", Isha:"22:12" },
  // 🇫🇷 France
  "Paris":        { Fajr:"04:24", Dhuhr:"13:30", Asr:"17:10", Maghrib:"20:57", Isha:"22:22" },
  "Lyon":         { Fajr:"04:28", Dhuhr:"13:30", Asr:"17:06", Maghrib:"20:49", Isha:"22:11" },
  "Marseille":    { Fajr:"04:35", Dhuhr:"13:32", Asr:"17:04", Maghrib:"20:43", Isha:"22:03" },
  "Toulouse":     { Fajr:"04:40", Dhuhr:"13:38", Asr:"17:09", Maghrib:"20:47", Isha:"22:08" },
  "Lille":        { Fajr:"04:15", Dhuhr:"13:29", Asr:"17:12", Maghrib:"21:00", Isha:"22:27" },
  "Bordeaux":     { Fajr:"04:48", Dhuhr:"13:42", Asr:"17:14", Maghrib:"20:52", Isha:"22:13" },
  "Nice":         { Fajr:"04:33", Dhuhr:"13:30", Asr:"17:03", Maghrib:"20:40", Isha:"21:59" },
  "Strasbourg":   { Fajr:"04:13", Dhuhr:"13:24", Asr:"17:06", Maghrib:"20:49", Isha:"22:14" },
  // 🇧🇪 Belgium
  "Brussels":     { Fajr:"04:17", Dhuhr:"13:29", Asr:"17:10", Maghrib:"20:56", Isha:"22:21" },
  "Antwerp":      { Fajr:"04:15", Dhuhr:"13:28", Asr:"17:11", Maghrib:"20:58", Isha:"22:24" },
  "Ghent":        { Fajr:"04:16", Dhuhr:"13:29", Asr:"17:11", Maghrib:"20:58", Isha:"22:24" },
  // 🇸🇪 Sweden
  "Stockholm":    { Fajr:"03:32", Dhuhr:"13:08", Asr:"17:06", Maghrib:"21:03", Isha:"22:47" },
  "Gothenburg":   { Fajr:"03:44", Dhuhr:"13:13", Asr:"17:08", Maghrib:"21:02", Isha:"22:43" },
  "Malmo":        { Fajr:"03:52", Dhuhr:"13:15", Asr:"17:07", Maghrib:"20:58", Isha:"22:35" },
  "Uppsala":      { Fajr:"03:28", Dhuhr:"13:07", Asr:"17:05", Maghrib:"21:04", Isha:"22:50" },
  // 🇩🇰 Denmark
  "Copenhagen":   { Fajr:"03:53", Dhuhr:"13:17", Asr:"17:07", Maghrib:"20:59", Isha:"22:36" },
  "Aarhus":       { Fajr:"03:50", Dhuhr:"13:18", Asr:"17:08", Maghrib:"21:02", Isha:"22:40" },
  "Odense":       { Fajr:"03:55", Dhuhr:"13:19", Asr:"17:07", Maghrib:"20:59", Isha:"22:36" },
  // 🇳🇴 Norway
  "Oslo":         { Fajr:"03:28", Dhuhr:"13:13", Asr:"17:05", Maghrib:"21:09", Isha:"22:57" },
  "Bergen":       { Fajr:"03:38", Dhuhr:"13:22", Asr:"17:09", Maghrib:"21:15", Isha:"23:02" },
  "Stavanger":    { Fajr:"03:44", Dhuhr:"13:23", Asr:"17:09", Maghrib:"21:13", Isha:"22:58" },
  // 🇵🇰 Pakistan
  "Karachi":      { Fajr:"05:02", Dhuhr:"12:22", Asr:"15:45", Maghrib:"18:44", Isha:"20:05" },
  "Lahore":       { Fajr:"04:38", Dhuhr:"12:09", Asr:"15:34", Maghrib:"18:37", Isha:"20:04" },
  "Islamabad":    { Fajr:"04:31", Dhuhr:"12:05", Asr:"15:31", Maghrib:"18:37", Isha:"20:05" },
  "Peshawar":     { Fajr:"04:28", Dhuhr:"12:06", Asr:"15:32", Maghrib:"18:39", Isha:"20:07" },
  "Quetta":       { Fajr:"04:44", Dhuhr:"12:17", Asr:"15:39", Maghrib:"18:43", Isha:"20:07" },
  // 🇧🇩 Bangladesh
  "Dhaka":        { Fajr:"04:35", Dhuhr:"11:56", Asr:"15:18", Maghrib:"18:17", Isha:"19:35" },
  "Chittagong":   { Fajr:"04:28", Dhuhr:"11:50", Asr:"15:13", Maghrib:"18:13", Isha:"19:32" },
  "Rajshahi":     { Fajr:"04:40", Dhuhr:"12:00", Asr:"15:21", Maghrib:"18:19", Isha:"19:37" },
  "Sylhet":       { Fajr:"04:30", Dhuhr:"11:53", Asr:"15:15", Maghrib:"18:15", Isha:"19:33" },
  // 🇮🇳 India
  "Delhi":        { Fajr:"04:33", Dhuhr:"12:09", Asr:"15:35", Maghrib:"18:44", Isha:"20:07" },
  "Mumbai":       { Fajr:"05:00", Dhuhr:"12:33", Asr:"15:56", Maghrib:"18:58", Isha:"20:16" },
  "Bangalore":    { Fajr:"05:04", Dhuhr:"12:28", Asr:"15:50", Maghrib:"18:39", Isha:"19:53" },
  "Chennai":      { Fajr:"04:58", Dhuhr:"12:21", Asr:"15:44", Maghrib:"18:34", Isha:"19:50" },
  "Hyderabad":    { Fajr:"05:01", Dhuhr:"12:25", Asr:"15:48", Maghrib:"18:38", Isha:"19:54" },
  "Kolkata":      { Fajr:"04:20", Dhuhr:"11:50", Asr:"15:15", Maghrib:"18:17", Isha:"19:38" },
  // 🇿🇦 South Africa
  "Johannesburg": { Fajr:"05:18", Dhuhr:"12:10", Asr:"15:22", Maghrib:"18:02", Isha:"19:17" },
  "Cape Town":    { Fajr:"05:30", Dhuhr:"12:17", Asr:"15:26", Maghrib:"18:00", Isha:"19:12" },
  "Durban":       { Fajr:"05:10", Dhuhr:"12:02", Asr:"15:16", Maghrib:"17:58", Isha:"19:14" },
  "Pretoria":     { Fajr:"05:17", Dhuhr:"12:10", Asr:"15:22", Maghrib:"18:03", Isha:"19:18" },
  // 🇺🇸 United States
  "New York":     { Fajr:"04:38", Dhuhr:"12:57", Asr:"16:31", Maghrib:"19:52", Isha:"21:17" },
  "Chicago":      { Fajr:"04:25", Dhuhr:"12:51", Asr:"16:31", Maghrib:"19:58", Isha:"21:26" },
  "Los Angeles":  { Fajr:"04:57", Dhuhr:"13:00", Asr:"16:30", Maghrib:"19:45", Isha:"21:04" },
  "Houston":      { Fajr:"05:00", Dhuhr:"13:10", Asr:"16:41", Maghrib:"19:57", Isha:"21:17" },
  "Dallas":       { Fajr:"05:02", Dhuhr:"13:12", Asr:"16:43", Maghrib:"19:58", Isha:"21:17" },
  "Detroit":      { Fajr:"04:14", Dhuhr:"12:45", Asr:"16:26", Maghrib:"19:53", Isha:"21:21" },
  "Philadelphia": { Fajr:"04:34", Dhuhr:"12:54", Asr:"16:29", Maghrib:"19:49", Isha:"21:14" },
  "Phoenix":      { Fajr:"04:53", Dhuhr:"12:56", Asr:"16:22", Maghrib:"19:39", Isha:"20:57" },
  "San Francisco":{ Fajr:"05:02", Dhuhr:"13:08", Asr:"16:40", Maghrib:"19:57", Isha:"21:17" },
  // 🇨🇦 Canada
  "Toronto":      { Fajr:"04:16", Dhuhr:"12:46", Asr:"16:28", Maghrib:"19:55", Isha:"21:23" },
  "Montreal":     { Fajr:"04:05", Dhuhr:"12:42", Asr:"16:26", Maghrib:"19:55", Isha:"21:25" },
  "Vancouver":    { Fajr:"04:18", Dhuhr:"13:05", Asr:"16:48", Maghrib:"20:16", Isha:"21:44" },
  "Calgary":      { Fajr:"04:08", Dhuhr:"13:03", Asr:"16:47", Maghrib:"20:17", Isha:"21:47" },
  "Edmonton":     { Fajr:"03:55", Dhuhr:"13:04", Asr:"16:51", Maghrib:"20:28", Isha:"22:01" },
  "Ottawa":       { Fajr:"04:08", Dhuhr:"12:43", Asr:"16:26", Maghrib:"19:53", Isha:"21:21" },
  // 🇦🇺 Australia
  "Sydney":       { Fajr:"05:28", Dhuhr:"12:02", Asr:"15:10", Maghrib:"17:54", Isha:"19:08" },
  "Melbourne":    { Fajr:"05:38", Dhuhr:"12:10", Asr:"15:14", Maghrib:"17:50", Isha:"19:02" },
  "Brisbane":     { Fajr:"05:06", Dhuhr:"11:44", Asr:"14:55", Maghrib:"17:40", Isha:"18:56" },
  "Perth":        { Fajr:"05:22", Dhuhr:"12:19", Asr:"15:30", Maghrib:"18:10", Isha:"19:24" },
  // 🇲🇾 Malaysia
  "Kuala Lumpur": { Fajr:"05:47", Dhuhr:"13:10", Asr:"16:31", Maghrib:"19:21", Isha:"20:31" },
  "Penang":       { Fajr:"05:46", Dhuhr:"13:09", Asr:"16:30", Maghrib:"19:20", Isha:"20:30" },
  "Johor Bahru":  { Fajr:"05:49", Dhuhr:"13:11", Asr:"16:32", Maghrib:"19:20", Isha:"20:30" },
  // 🇸🇦 Saudi Arabia
  "Mecca":        { Fajr:"05:16", Dhuhr:"12:29", Asr:"15:50", Maghrib:"18:37", Isha:"20:01" },
  "Medina":       { Fajr:"05:14", Dhuhr:"12:29", Asr:"15:51", Maghrib:"18:39", Isha:"20:05" },
  "Riyadh":       { Fajr:"05:02", Dhuhr:"12:17", Asr:"15:38", Maghrib:"18:33", Isha:"20:01" },
  "Jeddah":       { Fajr:"05:19", Dhuhr:"12:32", Asr:"15:52", Maghrib:"18:38", Isha:"20:01" },
  "Dammam":       { Fajr:"04:52", Dhuhr:"12:05", Asr:"15:27", Maghrib:"18:26", Isha:"19:54" },
  // 🇦🇪 UAE
  "Dubai":        { Fajr:"04:57", Dhuhr:"12:11", Asr:"15:32", Maghrib:"18:28", Isha:"19:56" },
  "Abu Dhabi":    { Fajr:"04:59", Dhuhr:"12:12", Asr:"15:33", Maghrib:"18:28", Isha:"19:56" },
  "Sharjah":      { Fajr:"04:56", Dhuhr:"12:10", Asr:"15:31", Maghrib:"18:27", Isha:"19:55" },
  // 🇹🇷 Turkey
  "Istanbul":     { Fajr:"04:38", Dhuhr:"13:10", Asr:"16:47", Maghrib:"20:06", Isha:"21:32" },
  "Ankara":       { Fajr:"04:30", Dhuhr:"13:03", Asr:"16:42", Maghrib:"20:03", Isha:"21:31" },
  "Izmir":        { Fajr:"04:46", Dhuhr:"13:16", Asr:"16:52", Maghrib:"20:08", Isha:"21:32" },
  // 🇪🇬 Egypt
  "Cairo":        { Fajr:"04:30", Dhuhr:"12:02", Asr:"15:27", Maghrib:"18:19", Isha:"19:44" },
  "Alexandria":   { Fajr:"04:28", Dhuhr:"12:03", Asr:"15:29", Maghrib:"18:22", Isha:"19:48" },
  "Giza":         { Fajr:"04:30", Dhuhr:"12:02", Asr:"15:27", Maghrib:"18:19", Isha:"19:44" },
  "Luxor":        { Fajr:"04:22", Dhuhr:"11:55", Asr:"15:21", Maghrib:"18:14", Isha:"19:40" },
};

// ─── PRAYER TIMES — live API first, hardcoded as fallback ───────────────────
async function fetchPrayerTimes(city, country) {
  // 1. Always try the live Aladhan API first — gives accurate times for today's date
  try {
    const url = `https://api.aladhan.com/v1/timingsByCity?city=${encodeURIComponent(city)}&country=${encodeURIComponent(country)}&method=2`;
    const res = await fetch(url);
    const data = await res.json();
    if (data.code === 200 && data.data?.timings) {
      const t = data.data.timings;
      // Strip seconds e.g. "18:15 (BST)" → "18:15"
      const clean = s => s?.split(" ")[0]?.slice(0, 5) || s;
      return {
        Fajr:    clean(t.Fajr),
        Dhuhr:   clean(t.Dhuhr),
        Asr:     clean(t.Asr),
        Maghrib: clean(t.Maghrib),
        Isha:    clean(t.Isha),
      };
    }
  } catch (_) {}

  // 2. Fall back to hardcoded approximate times (used in sandboxed preview only)
  const hardcoded = PRAYER_TIMES_DB[city];
  if (hardcoded) return hardcoded;

  throw new Error(`No prayer times found for "${city}". Please select a different city.`);
}

// ─── AI SCHEDULING (Groq - Llama 3.3 70B — free) ───────────────────────────
async function generateScheduleAI(userPrefs, prayerTimes) {
  const { subjects, burnout, sessionLength, studyGoal, busyTimes } = userPrefs;
  const prompt = `You are an expert study scheduler for Muslim students. Generate a 3-day study schedule (Monday, Tuesday, Wednesday) that adapts around these prayer times (24h format): ${JSON.stringify(prayerTimes)}.

User preferences:
- Subjects: ${subjects.join(", ")}
- Burns out easily: ${burnout}
- Preferred session length: ${sessionLength} minutes
- Study goal: ${studyGoal} hours/day
- Busy times: ${busyTimes.map(b => `${b.day} ${b.start}-${b.end} (${b.label})`).join("; ") || "none"}

Rules:
- NEVER schedule study during prayer times (each prayer has a 15-min window)
- Add short breaks between sessions
- Alternate subjects to reduce burnout
- Keep sessions at the preferred length
- Schedule light review after Isha, heavy study in the morning

Respond ONLY with valid JSON in this exact format, no extra text, no markdown:
{
  "days": [
    {
      "name": "Monday",
      "blocks": [
        {"time": "08:00", "duration": 45, "type": "study", "subject": "Math", "note": "Focus: algebra"},
        {"time": "09:00", "duration": 15, "type": "prayer", "subject": "Fajr prayer", "note": ""},
        {"time": "09:20", "duration": 10, "type": "break", "subject": "Short break", "note": ""},
        {"time": "09:30", "duration": 45, "type": "study", "subject": "Physics", "note": "Read chapter 3"}
      ]
    }
  ],
  "tips": ["tip1", "tip2", "tip3"]
}`;

  const response = await fetch("/api/schedule", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "llama-3.3-70b-versatile",
      max_tokens: 2000,
      temperature: 0.7,
      messages: [{ role: "user", content: prompt }],
    }),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err?.error?.message || "AI scheduling failed — check your Groq API key in Vercel env vars");
  }
  const data = await response.json();
  const text = data.choices?.[0]?.message?.content || "";
  const clean = text.replace(/```json|```/g, "").trim();
  return JSON.parse(clean);
}

// ─── HELPERS ────────────────────────────────────────────────────────────────
function toMinutes(t) {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}
function formatTime(totalSecs) {
  const m = Math.floor(totalSecs / 60).toString().padStart(2, "0");
  const s = (totalSecs % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}
function nextPrayer(prayerTimes) {
  const now = new Date();
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const prayers = Object.entries(prayerTimes).map(([name, t]) => ({ name, min: toMinutes(t) }));
  const upcoming = prayers.find(p => p.min > nowMin);
  return upcoming || prayers[0];
}
const DAYS = ["Monday", "Tuesday", "Wednesday"];

// ─── COMPONENTS ─────────────────────────────────────────────────────────────

function PrayerBanner({ prayerTimes }) {
  const next = nextPrayer(prayerTimes);
  return (
    <div className="prayer-banner">
      <div style={{ fontSize: "2rem" }}>🕌</div>
      <div style={{ flex: 1 }}>
        <h4>Today's Prayer Times</h4>
        <p>Next: <strong>{next.name}</strong> at <strong>{prayerTimes[next.name]}</strong></p>
        <div className="prayer-times-grid">
          {Object.entries(prayerTimes).map(([name, time]) => (
            <div key={name} className={`prayer-pill${name === next.name ? " next" : ""}`}>
              🤲 {name} · {time}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Landing({ onStart }) {
  return (
    <div className="page fade-in">
      <div className="landing-wrap">
        <div className="hero">
          <div className="hero-badge">☪️ Prayer-Aware Scheduling</div>
          <h1>Study smarter,<br /><em>worship better</em></h1>
          <p>Sloth Study builds your personalised AI study schedule around your local prayer times — so you never have to choose between faith and education.</p>
          <div className="hero-cta">
            <button className="btn-primary" onClick={onStart}>Build My Schedule →</button>
            <button className="btn-secondary">See Example</button>
          </div>
        </div>
        <div className="features">
          {[
            { icon: "🕌", title: "Prayer-Aware", desc: "Auto-fetches your local Adhan times and builds breaks around each prayer." },
            { icon: "🤖", title: "AI Scheduling", desc: "Llama AI crafts a bespoke timetable based on your subjects, burnout risk, and preferences." },
            { icon: "⏱️", title: "Study Timer", desc: "Session timer with Pomodoro-style breaks and one-tap session completion." },
            { icon: "📚", title: "Multi-Subject", desc: "Juggle multiple subjects with smart alternation to maximise retention." },
          ].map(f => (
            <div key={f.title} className="feature-card">
              <div className="feature-icon">{f.icon}</div>
              <h3>{f.title}</h3>
              <p>{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── LOCATION DATA ──────────────────────────────────────────────────────────
const LOCATION_DATA = {
  "🇬🇧 United Kingdom": {
    country: "United Kingdom",
    cities: ["Birmingham", "Bradford", "Bristol", "Cardiff", "Edinburgh", "Glasgow", "Leeds", "Leicester", "Liverpool", "London", "Manchester", "Newcastle", "Nottingham", "Oxford", "Sheffield"],
  },
  "🇳🇱 Netherlands": {
    country: "Netherlands",
    cities: ["Amsterdam", "Eindhoven", "Groningen", "Rotterdam", "Utrecht"],
  },
  "🇩🇪 Germany": {
    country: "Germany",
    cities: ["Berlin", "Cologne", "Frankfurt", "Hamburg", "Munich", "Stuttgart"],
  },
  "🇫🇷 France": {
    country: "France",
    cities: ["Bordeaux", "Lille", "Lyon", "Marseille", "Nice", "Paris", "Strasbourg", "Toulouse"],
  },
  "🇧🇪 Belgium": {
    country: "Belgium",
    cities: ["Antwerp", "Brussels", "Ghent"],
  },
  "🇸🇪 Sweden": {
    country: "Sweden",
    cities: ["Gothenburg", "Malmo", "Stockholm", "Uppsala"],
  },
  "🇩🇰 Denmark": {
    country: "Denmark",
    cities: ["Aarhus", "Copenhagen", "Odense"],
  },
  "🇳🇴 Norway": {
    country: "Norway",
    cities: ["Bergen", "Oslo", "Stavanger"],
  },
  "🇵🇰 Pakistan": {
    country: "Pakistan",
    cities: ["Islamabad", "Karachi", "Lahore", "Peshawar", "Quetta"],
  },
  "🇧🇩 Bangladesh": {
    country: "Bangladesh",
    cities: ["Chittagong", "Dhaka", "Rajshahi", "Sylhet"],
  },
  "🇮🇳 India": {
    country: "India",
    cities: ["Bangalore", "Chennai", "Delhi", "Hyderabad", "Kolkata", "Mumbai"],
  },
  "🇿🇦 South Africa": {
    country: "South Africa",
    cities: ["Cape Town", "Durban", "Johannesburg", "Pretoria"],
  },
  "🇺🇸 United States": {
    country: "United States",
    cities: ["Chicago", "Dallas", "Detroit", "Houston", "Los Angeles", "New York", "Philadelphia", "Phoenix", "San Francisco"],
  },
  "🇨🇦 Canada": {
    country: "Canada",
    cities: ["Calgary", "Edmonton", "Montreal", "Ottawa", "Toronto", "Vancouver"],
  },
  "🇦🇺 Australia": {
    country: "Australia",
    cities: ["Brisbane", "Melbourne", "Perth", "Sydney"],
  },
  "🇲🇾 Malaysia": {
    country: "Malaysia",
    cities: ["Johor Bahru", "Kuala Lumpur", "Penang"],
  },
  "🇸🇦 Saudi Arabia": {
    country: "Saudi Arabia",
    cities: ["Dammam", "Jeddah", "Mecca", "Medina", "Riyadh"],
  },
  "🇦🇪 UAE": {
    country: "United Arab Emirates",
    cities: ["Abu Dhabi", "Dubai", "Sharjah"],
  },
  "🇹🇷 Turkey": {
    country: "Turkey",
    cities: ["Ankara", "Istanbul", "Izmir"],
  },
  "🇪🇬 Egypt": {
    country: "Egypt",
    cities: ["Alexandria", "Cairo", "Giza", "Luxor"],
  },
};

// Step 1: Location
function StepLocation({ data, onChange }) {
  const countryKeys = Object.keys(LOCATION_DATA);
  const selectedCountryKey = data.countryKey || "";
  const cities = selectedCountryKey ? LOCATION_DATA[selectedCountryKey].cities : [];

  const handleCountrySelect = (key) => {
    const info = LOCATION_DATA[key];
    onChange({ countryKey: key, country: info.country, city: "" });
  };

  const handleCitySelect = (city) => {
    onChange({ ...data, city });
  };

  return (
    <div className="form-card">
      <h3>📍 Your Location</h3>
      <p className="sub">Pick your country first, then choose your city — we'll fetch exact prayer times for you.</p>

      <div className="form-group">
        <label className="form-label">1. Select your country</label>
        <div className="country-grid">
          {countryKeys.map(key => (
            <button
              key={key}
              className={`country-btn${selectedCountryKey === key ? " selected" : ""}`}
              onClick={() => handleCountrySelect(key)}
            >
              {key}
            </button>
          ))}
        </div>
      </div>

      {selectedCountryKey && (
        <div className="form-group fade-in" style={{ marginTop: 24 }}>
          <label className="form-label">2. Select your city</label>
          <div className="city-grid">
            {cities.map(city => (
              <button
                key={city}
                className={`city-btn${data.city === city ? " selected" : ""}`}
                onClick={() => handleCitySelect(city)}
              >
                {city}
              </button>
            ))}
          </div>
        </div>
      )}

      {data.city && (
        <div className="success-msg fade-in" style={{ marginTop: 16 }}>
          ✅ <strong>{data.city}</strong>, {selectedCountryKey.split(" ").slice(1).join(" ")} selected
        </div>
      )}
    </div>
  );
}

// Step 2: Subjects
function StepSubjects({ data, onChange }) {
  const [input, setInput] = useState("");
  const add = () => {
    if (input.trim() && !data.subjects.includes(input.trim())) {
      onChange({ ...data, subjects: [...data.subjects, input.trim()] });
      setInput("");
    }
  };
  const remove = s => onChange({ ...data, subjects: data.subjects.filter(x => x !== s) });
  return (
    <div className="form-card">
      <h3>📚 Your Subjects</h3>
      <p className="sub">Add the subjects you need to study. We'll rotate them to prevent burnout.</p>
      <div className="tag-input-row">
        <input className="form-input" placeholder="e.g. Mathematics" value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === "Enter" && add()} />
        <button className="btn-primary" onClick={add}>Add</button>
      </div>
      <div className="tags">
        {data.subjects.map(s => (
          <div key={s} className="tag">{s}<span className="tag-remove" onClick={() => remove(s)}>×</span></div>
        ))}
      </div>
      {data.subjects.length === 0 && <p style={{ fontSize: "0.82rem", color: "var(--muted)", marginTop: 8 }}>No subjects added yet.</p>}
    </div>
  );
}

// Step 3: Preferences
const BURNOUT = ["Never", "Sometimes", "Often", "Always"];
const LENGTHS = ["25", "45", "60", "90"];
const GOALS = ["1", "2", "3", "4", "5", "6"];

function StepPreferences({ data, onChange }) {
  return (
    <div className="form-card">
      <h3>🧠 Study Preferences</h3>
      <p className="sub">Help us tailor your schedule to how you actually work.</p>
      <div className="form-group">
        <label className="form-label">How often do you burn out?</label>
        <div className="radio-group">
          {BURNOUT.map(v => (
            <label key={v} className={`radio-option${data.burnout === v ? " selected" : ""}`}>
              <input type="radio" checked={data.burnout === v} onChange={() => onChange({ ...data, burnout: v })} /> {v}
            </label>
          ))}
        </div>
      </div>
      <div className="form-group">
        <label className="form-label">Preferred session length (minutes)</label>
        <div className="radio-group">
          {LENGTHS.map(v => (
            <label key={v} className={`radio-option${data.sessionLength === v ? " selected" : ""}`}>
              <input type="radio" checked={data.sessionLength === v} onChange={() => onChange({ ...data, sessionLength: v })} /> {v} min
            </label>
          ))}
        </div>
      </div>
      <div className="form-group">
        <label className="form-label">Daily study goal (hours)</label>
        <div className="radio-group">
          {GOALS.map(v => (
            <label key={v} className={`radio-option${data.studyGoal === v ? " selected" : ""}`}>
              <input type="radio" checked={data.studyGoal === v} onChange={() => onChange({ ...data, studyGoal: v })} /> {v}h
            </label>
          ))}
        </div>
      </div>
    </div>
  );
}

// Step 4: Busy Times
const WEEKDAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
function StepBusyTimes({ data, onChange }) {
  const [newBusy, setNewBusy] = useState({ day: "Monday", start: "09:00", end: "17:00", label: "" });
  const add = () => {
    if (newBusy.label.trim()) {
      onChange({ ...data, busyTimes: [...data.busyTimes, { ...newBusy }] });
      setNewBusy({ day: "Monday", start: "09:00", end: "17:00", label: "" });
    }
  };
  const remove = i => onChange({ ...data, busyTimes: data.busyTimes.filter((_, j) => j !== i) });
  return (
    <div className="form-card">
      <h3>🗓️ Busy Times</h3>
      <p className="sub">Tell us when you're unavailable (school, work, family commitments).</p>
      {data.busyTimes.map((b, i) => (
        <div key={i} className="busy-time-row" style={{ marginBottom: 10 }}>
          <div>
            <div className="form-label" style={{ fontSize: "0.75rem" }}>Label</div>
            <div className="tag" style={{ height: 38, borderRadius: 10 }}>{b.label}</div>
          </div>
          <div>
            <div className="form-label" style={{ fontSize: "0.75rem" }}>{b.day}</div>
            <div style={{ fontSize: "0.82rem", color: "var(--muted)", padding: "10px 0" }}>{b.start} – {b.end}</div>
          </div>
          <div />
          <div className="btn-icon" onClick={() => remove(i)}>🗑</div>
        </div>
      ))}
      <div className="divider" />
      <div className="busy-time-row">
        <div className="form-group" style={{ margin: 0 }}>
          <label className="form-label" style={{ fontSize: "0.78rem" }}>Label</label>
          <input className="form-input" placeholder="e.g. School" value={newBusy.label}
            onChange={e => setNewBusy({ ...newBusy, label: e.target.value })} />
        </div>
        <div className="form-group" style={{ margin: 0 }}>
          <label className="form-label" style={{ fontSize: "0.78rem" }}>Day</label>
          <select className="form-input form-select" value={newBusy.day} onChange={e => setNewBusy({ ...newBusy, day: e.target.value })}>
            {WEEKDAYS.map(d => <option key={d}>{d}</option>)}
          </select>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label" style={{ fontSize: "0.78rem" }}>Start</label>
            <input type="time" className="form-input" value={newBusy.start} onChange={e => setNewBusy({ ...newBusy, start: e.target.value })} />
          </div>
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label" style={{ fontSize: "0.78rem" }}>End</label>
            <input type="time" className="form-input" value={newBusy.end} onChange={e => setNewBusy({ ...newBusy, end: e.target.value })} />
          </div>
        </div>
        <button className="btn-primary" style={{ alignSelf: "flex-end", height: 40 }} onClick={add}>+ Add</button>
      </div>
    </div>
  );
}

// ─── TIMETABLE VIEW ─────────────────────────────────────────────────────────
function TimetableView({ schedule, prayerTimes, onStartTimer, completedBlocks, onToggleBlock }) {
  if (!schedule) return null;
  const typeColors = { study: "#5C7A5E", prayer: "#C8963E", break: "#8BAF8D", busy: "#7A7A7A" };
  return (
    <div className="timetable-page fade-in">
      <h2>Your Study Schedule 📖</h2>
      <p className="sub">Generated by AI, adapted to your prayer times. Tap any session to start the timer.</p>
      <PrayerBanner prayerTimes={prayerTimes} />
      {schedule.tips && (
        <div style={{ background: "rgba(200,150,62,0.08)", border: "1px solid rgba(200,150,62,0.2)", borderRadius: 14, padding: "16px 20px", marginBottom: 28 }}>
          <div style={{ fontFamily: "'Playfair Display',serif", fontSize: "0.95rem", marginBottom: 10, color: "var(--gold)" }}>✨ AI Tips</div>
          {schedule.tips.map((tip, i) => <div key={i} style={{ fontSize: "0.83rem", color: "var(--charcoal)", marginBottom: 5 }}>• {tip}</div>)}
        </div>
      )}
      <div className="timetable-days">
      {schedule.days.map(day => (
        <div key={day.name}>
          <div className="day-header">{day.name} <span>{day.blocks.filter(b => b.type === "study").length} study blocks</span></div>
          {day.blocks.map((block, i) => {
            const key = `${day.name}-${i}`;
            const done = completedBlocks[key];
            return (
              <div key={key} className="block">
                <div className="block-time">{block.time}<br /><span style={{ fontSize: "0.7rem" }}>{block.duration}m</span></div>
                <div className={`block-card ${block.type}${done ? " done" : ""}`}
                  onClick={() => block.type === "study" && onStartTimer(block)}>
                  <div className="block-title">
                    <span>{block.type === "prayer" ? "🤲" : block.type === "study" ? "📖" : block.type === "break" ? "☕" : "🔒"}</span>
                    {block.subject}
                    {block.type === "study" && (
                      <div className={`block-check${done ? " checked" : ""}`} onClick={e => { e.stopPropagation(); onToggleBlock(key); }}>
                        {done ? "✓" : ""}
                      </div>
                    )}
                  </div>
                  {block.note && <div className="block-sub">{block.note}</div>}
                  <div className="type-badge" style={{ color: typeColors[block.type] }}>{block.type} · {block.duration}min</div>
                </div>
              </div>
            );
          })}
        </div>
      ))}
      </div>
    </div>
  );
}

// ─── STUDY TIMER ─────────────────────────────────────────────────────────────
const STUDY_PRESETS = [
  { label: "25 min", secs: 1500, isBreak: false },
  { label: "45 min", secs: 2700, isBreak: false },
  { label: "60 min", secs: 3600, isBreak: false },
  { label: "90 min", secs: 5400, isBreak: false },
];
const BREAK_PRESETS = [
  { label: "5 min", secs: 300, isBreak: true },
  { label: "10 min", secs: 600, isBreak: true },
  { label: "15 min", secs: 900, isBreak: true },
];

function StudyTimer({ schedule, completedBlocks, onToggleBlock }) {
  const [mode, setMode] = useState("study");
  const [duration, setDuration] = useState(25 * 60);
  const [remaining, setRemaining] = useState(25 * 60);
  const [running, setRunning] = useState(false);
  const [activeSession, setActiveSession] = useState(null);
  const [showTimer, setShowTimer] = useState(true);
  const intervalRef = useRef(null);

  const start = () => { setRunning(true); };
  const pause = () => { setRunning(false); };
  const reset = () => { setRunning(false); setRemaining(duration); };

  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(() => {
        setRemaining(r => { if (r <= 1) { clearInterval(intervalRef.current); setRunning(false); return 0; } return r - 1; });
      }, 1000);
    } else clearInterval(intervalRef.current);
    return () => clearInterval(intervalRef.current);
  }, [running]);

  const setPreset = (p) => {
    setRunning(false);
    setMode(p.isBreak ? "break" : "study");
    setDuration(p.secs);
    setRemaining(p.secs);
  };

  const progress = remaining / duration;
  const circumference = 2 * Math.PI * 118;

  // Use actual current day, fall back to Monday if not in schedule
  const DAY_NAMES = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
  const todayName = DAY_NAMES[new Date().getDay()];
  const todaySchedule = schedule?.days?.find(d => d.name === todayName) || schedule?.days?.[0];
  const todaySessions = todaySchedule?.blocks || [];
  const displayDayName = todaySchedule?.name || "Today";

  return (
    <div className="timer-page fade-in">
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
        <h2 style={{ margin: 0 }}>Study Timer ⏱️</h2>
        <button
          onClick={() => setShowTimer(t => !t)}
          style={{ background: showTimer ? "rgba(92,122,94,0.1)" : "var(--sage)", color: showTimer ? "var(--sage)" : "white", border: "1.5px solid var(--sage)", borderRadius: 20, padding: "7px 18px", fontSize: "0.82rem", cursor: "pointer", fontFamily: "'DM Sans',sans-serif", fontWeight: 500, transition: "all 0.2s" }}
        >
          {showTimer ? "⏹ Hide Timer" : "▶ Show Timer"}
        </button>
      </div>
      <p className="sub">Stay focused. Your schedule adapts around your prayers.</p>

      {/* PRESET PICKERS */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: "0.75rem", color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.07em", fontWeight: 600, marginBottom: 8 }}>📖 Study</div>
        <div className="session-picker" style={{ marginBottom: 16 }}>
          {STUDY_PRESETS.map(p => (
            <button key={p.label} className={`session-pill${duration === p.secs && mode === "study" ? " active" : ""}`} onClick={() => setPreset(p)}>{p.label}</button>
          ))}
        </div>
        <div style={{ fontSize: "0.75rem", color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.07em", fontWeight: 600, marginBottom: 8 }}>☕ Break</div>
        <div className="session-picker" style={{ marginBottom: 0 }}>
          {BREAK_PRESETS.map(p => (
            <button key={p.label}
              className={`session-pill${duration === p.secs && mode === "break" ? " active" : ""}`}
              style={mode === "break" && duration === p.secs ? { background: "var(--gold)", borderColor: "var(--gold)", color: "white" } : { borderColor: "rgba(200,150,62,0.3)", color: "var(--gold)" }}
              onClick={() => setPreset(p)}>{p.label}
            </button>
          ))}
        </div>
      </div>

      {/* TIMER CIRCLE — toggleable */}
      {showTimer && (
        <>
          <div className="timer-circle-bg">
            <svg className="timer-svg" viewBox="0 0 260 260">
              <circle className="timer-track" cx="130" cy="130" r="118" />
              <circle className={`timer-prog${mode === "break" ? " break-mode" : ""}`} cx="130" cy="130" r="118"
                strokeDasharray={circumference}
                strokeDashoffset={circumference * (1 - progress)} />
            </svg>
            <div>
              <div className={`timer-display${running ? " running" : ""}${mode === "break" ? " break-mode" : ""}`}>
                {formatTime(remaining)}
              </div>
              <div className="timer-label">{mode === "break" ? "☕ Break Time" : activeSession ? activeSession.subject : "Study Session"}</div>
            </div>
          </div>
          <div className="timer-controls">
            {!running
              ? <button className="btn-primary" onClick={start}>{remaining === duration ? "▶ Start" : "▶ Resume"}</button>
              : <button className="btn-secondary" onClick={pause}>⏸ Pause</button>
            }
            <button className="btn-secondary" onClick={reset}>↺ Reset</button>
          </div>
        </>
      )}

      {todaySessions.length > 0 && (
        <div className="today-sessions">
          <h4>Today's Sessions — {displayDayName}</h4>
          {todaySessions.map((s, i) => {
            const key = `${displayDayName}-${i}`;
            const done = completedBlocks[key];
            return (
              <div key={key} className="session-item" onClick={() => { setActiveSession(s); if (s.type === "study") { setPreset({ secs: s.duration * 60, isBreak: false }); } }}>
                <div className={`session-dot${done ? " done" : s.type === "prayer" ? " prayer" : ""}`} />
                <div className="session-info">
                  <div className="session-name">{s.subject}</div>
                  <div className="session-time">{s.time} · {s.duration} min · {s.type}</div>
                </div>
                {s.type === "study" && (
                  <span className="session-check" onClick={e => { e.stopPropagation(); onToggleBlock(key); }}>
                    {done ? "✅" : "⬜"}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── LOCALSTORAGE HELPERS ────────────────────────────────────────────────────
function load(key, fallback) {
  try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; } catch { return fallback; }
}
function save(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
}
function clearAll() {
  ["ss_location","ss_subjects","ss_prefs","ss_busy","ss_prayerTimes","ss_schedule","ss_completed","ss_tab"].forEach(k => localStorage.removeItem(k));
}

// ─── MAIN APP ────────────────────────────────────────────────────────────────
const STEPS = ["Location", "Subjects", "Preferences", "Busy Times"];

export default function App() {
  const [tab, setTab] = useState(() => load("ss_tab", "home"));
  const [step, setStep] = useState(0);
  const [location, setLocation] = useState(() => load("ss_location", { city: "", country: "", countryKey: "" }));
  const [subjects, setSubjects] = useState(() => load("ss_subjects", { subjects: [] }));
  const [prefs, setPrefs] = useState(() => load("ss_prefs", { burnout: "Sometimes", sessionLength: "45", studyGoal: "3" }));
  const [busy, setBusy] = useState(() => load("ss_busy", { busyTimes: [] }));
  const [prayerTimes, setPrayerTimes] = useState(() => load("ss_prayerTimes", null));
  const [schedule, setSchedule] = useState(() => load("ss_schedule", null));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [completedBlocks, setCompletedBlocks] = useState(() => load("ss_completed", {}));
  const [showReset, setShowReset] = useState(false);

  // Persist everything whenever it changes
  useEffect(() => { save("ss_tab", tab); }, [tab]);
  useEffect(() => { save("ss_location", location); }, [location]);
  useEffect(() => { save("ss_subjects", subjects); }, [subjects]);
  useEffect(() => { save("ss_prefs", prefs); }, [prefs]);
  useEffect(() => { save("ss_busy", busy); }, [busy]);
  useEffect(() => { save("ss_prayerTimes", prayerTimes); }, [prayerTimes]);
  useEffect(() => { save("ss_schedule", schedule); }, [schedule]);
  useEffect(() => { save("ss_completed", completedBlocks); }, [completedBlocks]);

  const toggleBlock = key => setCompletedBlocks(prev => ({ ...prev, [key]: !prev[key] }));

  const handleReset = () => {
    clearAll();
    setTab("home"); setStep(0);
    setLocation({ city: "", country: "", countryKey: "" });
    setSubjects({ subjects: [] });
    setPrefs({ burnout: "Sometimes", sessionLength: "45", studyGoal: "3" });
    setBusy({ busyTimes: [] });
    setPrayerTimes(null); setSchedule(null); setCompletedBlocks({});
    setShowReset(false);
  };

  const handleNextStep = async () => {
    if (step < STEPS.length - 1) { setStep(s => s + 1); return; }
    setLoading(true);
    setError("");
    try {
      const pt = await fetchPrayerTimes(location.city, location.country);
      setPrayerTimes(pt);
      const userPrefs = { ...subjects, ...prefs, ...busy };
      const sched = await generateScheduleAI(userPrefs, pt);
      setSchedule(sched);
      setTab("timetable");
    } catch (e) {
      setError("⚠️ " + e.message + ". Please check your city/country and try again.");
    } finally {
      setLoading(false);
    }
  };

  const canProceed = () => {
    if (step === 0) return location.city.trim() && location.country.trim();
    if (step === 1) return subjects.subjects.length > 0;
    return true;
  };

  const hasExistingSchedule = !!schedule;

  // Inject styles once into <head> — avoids flicker from re-rendering <style> tag
  useEffect(() => {
    const el = document.createElement("style");
    el.id = "sloth-study-styles";
    el.textContent = STYLES;
    if (!document.getElementById("sloth-study-styles")) {
      document.head.appendChild(el);
    }
    return () => {}; // leave styles in head even on unmount
  }, []);

  return (
    <>
      <div className="app">
        <div className="geo-bg" />
        <nav className="nav">
          <div className="nav-inner">
            <div className="nav-logo" onClick={() => setTab("home")}>
              <span>🦥</span> Sloth Study
            </div>
            <div className="nav-tabs">
              {["home", "setup", "timetable", "timer"].map(t => (
                <button key={t} className={`nav-tab${tab === t ? " active" : ""}`}
                  onClick={() => { if (t === "setup") setStep(0); setTab(t); }}>
                  {{ home: "Home", setup: "Setup", timetable: "Schedule", timer: "Timer" }[t]}
                </button>
              ))}
              {hasExistingSchedule && (
                <button className="nav-tab" style={{ color: "var(--error)", fontSize: "0.78rem" }}
                  onClick={() => setShowReset(true)}>↺ Reset</button>
              )}
            </div>
          </div>
        </nav>

        {/* RESET CONFIRM MODAL */}
        {showReset && (
          <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div style={{ background: "var(--cream)", borderRadius: 20, padding: 32, maxWidth: 360, width: "90%", textAlign: "center", boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }}>
              <div style={{ fontSize: "2.5rem", marginBottom: 12 }}>🗑️</div>
              <h3 style={{ fontFamily: "'Playfair Display',serif", marginBottom: 8 }}>Start fresh?</h3>
              <p style={{ color: "var(--muted)", fontSize: "0.88rem", marginBottom: 24 }}>This will delete your saved schedule and all preferences.</p>
              <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
                <button className="btn-secondary btn-sm" onClick={() => setShowReset(false)}>Cancel</button>
                <button className="btn-primary btn-sm" style={{ background: "var(--error)" }} onClick={handleReset}>Yes, reset</button>
              </div>
            </div>
          </div>
        )}

        {tab === "home" && (
          <div className="page fade-in">
            {hasExistingSchedule && (
              <div style={{ maxWidth: 1400, margin: "0 auto", padding: "24px 48px 0" }}>
                <div style={{ background: "rgba(92,122,94,0.1)", border: "1px solid rgba(92,122,94,0.25)", borderRadius: 14, padding: "16px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: "0.9rem", color: "var(--sage)" }}>👋 Welcome back!</div>
                    <div style={{ fontSize: "0.82rem", color: "var(--muted)" }}>Your schedule for {location.city} is saved and ready.</div>
                  </div>
                  <button className="btn-primary btn-sm" onClick={() => setTab("timetable")}>View Schedule →</button>
                </div>
              </div>
            )}
            <Landing onStart={() => { setTab("setup"); setStep(0); }} />
          </div>
        )}

        {tab === "setup" && (
          <div className="page wizard">
            <div className="wizard-header">
              <h2>Build Your Schedule</h2>
              <p>Answer a few questions so we can create the perfect prayer-aware study plan.</p>
            </div>
            <div className="progress-bar">
              <div className="progress-fill" style={{ width: `${((step + 1) / STEPS.length) * 100}%` }} />
            </div>
            <div className="step-label">Step {step + 1} of {STEPS.length} — {STEPS[step]}</div>
            {error && <div className="error-msg">{error}</div>}
            {loading && (
              <div className="ai-thinking">
                <div className="dots"><div className="dot"/><div className="dot"/><div className="dot"/></div>
                AI is crafting your schedule around prayer times…
              </div>
            )}
            <div className="fade-in" key={step}>
              {step === 0 && <StepLocation data={location} onChange={setLocation} />}
              {step === 1 && <StepSubjects data={subjects} onChange={setSubjects} />}
              {step === 2 && <StepPreferences data={prefs} onChange={setPrefs} />}
              {step === 3 && <StepBusyTimes data={busy} onChange={setBusy} />}
            </div>
            <div className="wizard-nav">
              <button className="btn-secondary btn-sm" onClick={() => step > 0 ? setStep(s => s - 1) : setTab("home")}>
                ← {step === 0 ? "Home" : "Back"}
              </button>
              <span className="step-counter">{step + 1} / {STEPS.length}</span>
              <button className="btn-primary btn-sm" disabled={!canProceed() || loading} onClick={handleNextStep}>
                {step === STEPS.length - 1 ? (loading ? "Generating…" : "✨ Generate Schedule") : "Next →"}
              </button>
            </div>
          </div>
        )}

        {tab === "timetable" && (
          schedule
            ? <TimetableView schedule={schedule} prayerTimes={prayerTimes} completedBlocks={completedBlocks}
                onToggleBlock={toggleBlock} onStartTimer={block => { setTab("timer"); }} />
            : <div className="page loading-screen">
                <div className="spinner" />
                <p>No schedule yet. <span style={{ color: "var(--sage)", cursor: "pointer" }} onClick={() => setTab("setup")}>Run setup first →</span></p>
              </div>
        )}

        {tab === "timer" && (
          <StudyTimer schedule={schedule} completedBlocks={completedBlocks} onToggleBlock={toggleBlock} />
        )}
      </div>
    </>
  );
}