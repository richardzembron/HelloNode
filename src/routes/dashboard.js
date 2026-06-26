'use strict';

const { Router }  = require('express');
const requireAuth = require('../middleware/requireAuth');
const router      = Router();

const ICONS = {
  app: `<svg viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="5.5" height="5.5" rx="1.2"/><rect x="9.25" y="3" width="5.5" height="5.5" rx="1.2"/><rect x="15.5" y="3" width="5.5" height="5.5" rx="1.2"/><rect x="3" y="9.25" width="5.5" height="5.5" rx="1.2"/><rect x="9.25" y="9.25" width="5.5" height="5.5" rx="1.2"/><rect x="15.5" y="9.25" width="5.5" height="5.5" rx="1.2"/><rect x="3" y="15.5" width="5.5" height="5.5" rx="1.2"/><rect x="9.25" y="15.5" width="5.5" height="5.5" rx="1.2"/><rect x="15.5" y="15.5" width="5.5" height="5.5" rx="1.2"/></svg>`,
  source: `<svg viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/><line x1="15" y1="4" x2="9" y2="20"/></svg>`,
  database: `<svg viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/></svg>`,
  formats: `<svg viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="8" y1="11" x2="16" y2="11"/><line x1="8" y1="14" x2="11" y2="14"/><line x1="13" y1="14" x2="16" y2="14"/><line x1="8" y1="17" x2="11" y2="17"/><line x1="13" y1="17" x2="16" y2="17"/></svg>`,
  functions: `<svg viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M8 3c-1.2 0-2 .8-2 2v2.5c0 1.4-.6 2.5-2 2.5 1.4 0 2 1.1 2 2.5V15c0 1.2.8 2 2 2"/><path d="M16 3c1.2 0 2 .8 2 2v2.5c0 1.4.6 2.5 2 2.5-1.4 0-2 1.1-2 2.5V15c0 1.2-.8 2-2 2"/><line x1="10" y1="10" x2="14" y2="14"/><line x1="14" y1="10" x2="10" y2="14"/></svg>`,
  documents: `<svg viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h10l4 4v12a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1z"/><polyline points="14 4 14 8 18 8"/><line x1="7" y1="11" x2="15" y2="11" stroke-width="1.3"/><line x1="7" y1="14" x2="15" y2="14" stroke-width="1.3"/><line x1="7" y1="17" x2="11" y2="17" stroke-width="1.3"/><rect x="13" y="2" width="9" height="13" rx="1" fill="rgba(255,255,255,0.12)" stroke-width="1.2"/></svg>`,
  status: `<svg viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20a8 8 0 1 0-8-8"/><path d="M12 4v1M4.93 7.93l.7.7M4 12H3"/><path d="M12 12l-3-4" stroke-width="1.8"/><circle cx="12" cy="12" r="1.5" fill="white" stroke="none"/><circle cx="6" cy="16" r="1.2" fill="#00ee77" stroke="none"/><circle cx="12" cy="19" r="1.2" fill="#ffaa00" stroke="none"/><circle cx="18" cy="16" r="1.2" fill="#00ee77" stroke="none"/></svg>`,
  log: `<svg viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="3" width="20" height="18" rx="2"/><path d="M6 3v18" stroke-width="1.2"/><circle cx="4" cy="8" r="1" fill="white" stroke="none"/><circle cx="4" cy="12" r="1" fill="white" stroke="none"/><circle cx="4" cy="16" r="1" fill="white" stroke="none"/><line x1="9" y1="8" x2="18" y2="8" stroke-width="1.2"/><line x1="9" y1="12" x2="15" y2="12" stroke-width="1.2"/><line x1="9" y1="16" x2="18" y2="16" stroke-width="1.2"/></svg>`,
};

const TILES = [
  { key: 'app',       label: 'App'       },
  { key: 'source',    label: 'Source'    },
  { key: 'database',  label: 'Database'  },
  { key: 'formats',   label: 'Formats'   },
  { key: 'functions', label: 'Functions' },
  { key: 'documents', label: 'Documents' },
  { key: 'status',    label: 'Status'    },
  { key: 'log',       label: 'Log'       },
];

function buildPage(user) {
  const avatarHTML = user.picture
    ? `<img src="${user.picture}" class="avatar" alt="${user.name}" referrerpolicy="no-referrer"/>`
    : `<div class="avatar-fallback">${(user.name[0] || 'U').toUpperCase()}</div>`;

  const tilesHTML = TILES.map(({ key, label }) => `
    <a href="#${key}" class="tile">
      <div class="icon-wrap">${ICONS[key]}</div>
      <span class="tile-label">${label}</span>
    </a>`).join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Hello World — HelloNode</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    html, body { height: 100%; }
    body { min-height: 100vh; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background: #060d22; overflow-x: hidden; }
    .bg { position: fixed; inset: 0; z-index: 0; width: 100%; height: 100%; pointer-events: none; }
    .bg svg { width: 100%; height: 100%; }
    .topbar { position: relative; z-index: 10; display: flex; align-items: center; justify-content: space-between; padding: 14px 32px; background: rgba(255,255,255,0.06); backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px); border-bottom: 1px solid rgba(255,255,255,0.08); }
    .topbar-left { display: flex; align-items: center; gap: 12px; }
    .logo-mark { width: 36px; height: 36px; background: linear-gradient(135deg, #3b5bdb, #1a237e); border-radius: 9px; display: flex; align-items: center; justify-content: center; }
    .app-name { font-size: 15px; font-weight: 700; color: rgba(255,255,255,0.9); letter-spacing: -0.2px; }
    .topbar-right { display: flex; align-items: center; gap: 14px; }
    .avatar, .avatar-fallback { width: 36px; height: 36px; border-radius: 50%; object-fit: cover; border: 2px solid rgba(255,255,255,0.2); }
    .avatar-fallback { background: linear-gradient(135deg, #3b5bdb, #1a237e); display: flex; align-items: center; justify-content: center; font-size: 15px; font-weight: 700; color: white; }
    .user-name { font-size: 13.5px; font-weight: 500; color: rgba(255,255,255,0.8); }
    .logout-btn { padding: 7px 16px; background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.15); border-radius: 8px; color: rgba(255,255,255,0.75); font-size: 13px; font-weight: 500; text-decoration: none; transition: all 0.18s ease; }
    .logout-btn:hover { background: rgba(255,255,255,0.14); color: white; }
    .main { position: relative; z-index: 1; display: flex; flex-direction: column; align-items: center; padding: 60px 24px 48px; min-height: calc(100vh - 65px); }
    h1 { font-size: 52px; font-weight: 800; color: white; letter-spacing: -2px; line-height: 1.1; text-align: center; margin-bottom: 12px; }
    h1 span { color: #748ffc; }
    .subtitle { font-size: 17px; color: rgba(255,255,255,0.5); text-align: center; margin-bottom: 52px; font-weight: 400; }
    .grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px; width: 100%; max-width: 820px; }
    .tile { display: flex; flex-direction: column; align-items: center; gap: 14px; padding: 28px 16px 22px; background: rgba(255,255,255,0.07); backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px); border: 1px solid rgba(255,255,255,0.1); border-radius: 20px; text-decoration: none; transition: all 0.2s ease; }
    .tile:hover { background: rgba(255,255,255,0.13); border-color: rgba(255,255,255,0.2); transform: translateY(-5px); box-shadow: 0 20px 40px rgba(0,0,0,0.35); }
    .tile:active { transform: translateY(-2px); }
    .icon-wrap { width: 128px; height: 128px; background: linear-gradient(145deg, #3b5bdb 0%, #1a237e 100%); border-radius: 28px; display: flex; align-items: center; justify-content: center; box-shadow: 0 10px 28px rgba(59,91,219,0.45), inset 0 1px 0 rgba(255,255,255,0.15); transition: box-shadow 0.2s ease; }
    .tile:hover .icon-wrap { box-shadow: 0 16px 40px rgba(59,91,219,0.6), inset 0 1px 0 rgba(255,255,255,0.2); }
    .icon-wrap svg { width: 68px; height: 68px; }
    .tile-label { font-size: 13.5px; font-weight: 600; color: rgba(255,255,255,0.85); letter-spacing: 0.3px; text-align: center; }
    @media (max-width: 680px) { .grid { grid-template-columns: repeat(2, 1fr); } h1 { font-size: 36px; } }
  </style>
</head>
<body>
  <div class="bg">
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1920 1080" preserveAspectRatio="xMidYMid slice">
      <defs>
        <linearGradient id="bgG" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#050c1e"/><stop offset="45%" stop-color="#09132e"/><stop offset="100%" stop-color="#0e1c42"/></linearGradient>
        <radialGradient id="cg" cx="50%" cy="50%" r="55%"><stop offset="0%" stop-color="#1a3a8a" stop-opacity="0.22"/><stop offset="100%" stop-color="#060d22" stop-opacity="0"/></radialGradient>
        <filter id="led" x="-80%" y="-80%" width="260%" height="260%"><feGaussianBlur in="SourceGraphic" stdDeviation="2.5" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
      </defs>
      <rect width="1920" height="1080" fill="url(#bgG)"/>
      <rect width="1920" height="1080" fill="url(#cg)"/>
      <g opacity="0.03" stroke="#3a6fff" stroke-width="1"><line x1="0" y1="108" x2="1920" y2="108"/><line x1="0" y1="216" x2="1920" y2="216"/><line x1="0" y1="324" x2="1920" y2="324"/><line x1="0" y1="432" x2="1920" y2="432"/><line x1="0" y1="540" x2="1920" y2="540"/><line x1="0" y1="648" x2="1920" y2="648"/><line x1="0" y1="756" x2="1920" y2="756"/><line x1="0" y1="864" x2="1920" y2="864"/><line x1="192" y1="0" x2="192" y2="1080"/><line x1="384" y1="0" x2="384" y2="1080"/><line x1="576" y1="0" x2="576" y2="1080"/><line x1="768" y1="0" x2="768" y2="1080"/><line x1="960" y1="0" x2="960" y2="1080"/><line x1="1152" y1="0" x2="1152" y2="1080"/><line x1="1344" y1="0" x2="1344" y2="1080"/><line x1="1536" y1="0" x2="1536" y2="1080"/><line x1="1728" y1="0" x2="1728" y2="1080"/></g>
      <g opacity="0.10" transform="translate(72,70)"><rect x="0" y="0" width="162" height="540" rx="7" fill="#091a56" stroke="#1e3fa0" stroke-width="2"/><rect x="10" y="10" width="142" height="30" rx="4" fill="#0d2478"/><rect x="10" y="48" width="142" height="22" rx="2" fill="#0a1c60"/><circle cx="142" cy="59" r="4" fill="#00ee77" filter="url(#led)"/><rect x="10" y="74" width="142" height="22" rx="2" fill="#0a1c60"/><circle cx="142" cy="85" r="4" fill="#00ee77" filter="url(#led)"/><rect x="10" y="100" width="142" height="22" rx="2" fill="#0a1c60"/><circle cx="142" cy="111" r="4" fill="#ffaa00" filter="url(#led)"/><rect x="10" y="126" width="142" height="22" rx="2" fill="#0a1c60"/><circle cx="142" cy="137" r="4" fill="#00ee77" filter="url(#led)"/><rect x="10" y="152" width="142" height="22" rx="2" fill="#0a1c60"/><circle cx="142" cy="163" r="4" fill="#ff3333" filter="url(#led)"/><rect x="10" y="178" width="142" height="44" rx="2" fill="#070f40"/><circle cx="140" cy="194" r="3" fill="#00aaff" filter="url(#led)"/><circle cx="140" cy="214" r="3" fill="#00aaff" filter="url(#led)"/><rect x="10" y="226" width="142" height="22" rx="2" fill="#0a1c60"/><circle cx="142" cy="237" r="4" fill="#00ee77" filter="url(#led)"/><rect x="10" y="252" width="142" height="22" rx="2" fill="#0a1c60"/><circle cx="142" cy="263" r="4" fill="#00ee77" filter="url(#led)"/><rect x="10" y="278" width="142" height="22" rx="2" fill="#0a1c60"/><circle cx="142" cy="289" r="4" fill="#ffaa00" filter="url(#led)"/><rect x="10" y="304" width="142" height="22" rx="2" fill="#0a1c60"/><circle cx="142" cy="315" r="4" fill="#00ee77" filter="url(#led)"/><rect x="10" y="498" width="142" height="30" rx="4" fill="#0d2478"/></g>
      <g opacity="0.08" transform="translate(1660,140)"><rect x="0" y="0" width="152" height="490" rx="6" fill="#091a56" stroke="#1e3fa0" stroke-width="2"/><rect x="10" y="44" width="132" height="20" rx="2" fill="#0a1c60"/><circle cx="132" cy="54" r="3.5" fill="#00ee77" filter="url(#led)"/><rect x="10" y="68" width="132" height="20" rx="2" fill="#0a1c60"/><circle cx="132" cy="78" r="3.5" fill="#ff3333" filter="url(#led)"/><rect x="10" y="92" width="132" height="20" rx="2" fill="#0a1c60"/><circle cx="132" cy="102" r="3.5" fill="#00ee77" filter="url(#led)"/><rect x="10" y="116" width="132" height="20" rx="2" fill="#0a1c60"/><circle cx="132" cy="126" r="3.5" fill="#ffaa00" filter="url(#led)"/><rect x="10" y="140" width="132" height="40" rx="2" fill="#070f40"/><circle cx="130" cy="152" r="3" fill="#00aaff" filter="url(#led)"/><circle cx="130" cy="172" r="3" fill="#00aaff" filter="url(#led)"/><rect x="10" y="184" width="132" height="20" rx="2" fill="#0a1c60"/><circle cx="132" cy="194" r="3.5" fill="#00ee77" filter="url(#led)"/><rect x="10" y="208" width="132" height="20" rx="2" fill="#0a1c60"/><circle cx="132" cy="218" r="3.5" fill="#00ee77" filter="url(#led)"/><rect x="10" y="450" width="132" height="28" rx="3" fill="#0d2478"/></g>
      <g font-family="Georgia,'Times New Roman',serif" fill="#5580ff">
        <text x="310" y="105" font-size="70" opacity="0.06">&#x3A3;</text><text x="820" y="145" font-size="62" opacity="0.06">&#x3C0;</text><text x="1270" y="130" font-size="66" opacity="0.06">&#x221E;</text>
        <text x="430" y="360" font-size="68" opacity="0.06">&#x2202;</text><text x="680" y="280" font-size="76" opacity="0.06">&#x2207;</text><text x="920" y="330" font-size="62" opacity="0.06">&#x3BB;</text><text x="1380" y="350" font-size="66" opacity="0.06">&#x3C6;</text><text x="1570" y="270" font-size="78" opacity="0.06">&#x211D;</text>
        <text x="360" y="545" font-size="72" opacity="0.06">&#x3B2;</text><text x="1010" y="530" font-size="62" opacity="0.06">&#x2200;</text><text x="1475" y="515" font-size="74" opacity="0.06">&#x2295;</text>
        <text x="490" y="720" font-size="76" opacity="0.06">&#x2124;</text><text x="1160" y="770" font-size="66" opacity="0.06">&#x2229;</text><text x="1595" y="785" font-size="78" opacity="0.06">&#x3A0;</text>
        <text x="345" y="940" font-size="68" opacity="0.06">&#x222A;</text><text x="1295" y="950" font-size="70" opacity="0.06">&#x3BC;</text><text x="1515" y="975" font-size="76" opacity="0.06">&#x3C3;</text>
      </g>
    </svg>
  </div>
  <header class="topbar">
    <div class="topbar-left">
      <div class="logo-mark"><svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M12 2L2 7l10 5 10-5-10-5z" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M2 17l10 5 10-5" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M2 12l10 5 10-5" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></div>
      <span class="app-name">HelloNode</span>
    </div>
    <div class="topbar-right">
      ${avatarHTML}
      <span class="user-name">${user.name}</span>
      <a href="/auth/logout" class="logout-btn">Sign out</a>
    </div>
  </header>
  <main class="main">
    <h1>Hello <span>World</span></h1>
    <p class="subtitle">What do you want to do?</p>
    <div class="grid">${tilesHTML}</div>
  </main>
</body>
</html>`;
}

router.get('/', requireAuth, (req, res) => {
  res.type('html').send(buildPage(req.user));
});

module.exports = router;
