'use strict';

const { Router } = require('express');
const router = Router();

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function buildPage(msg, buttonText, buttonHref) {
  const safeMsg = escapeHtml(msg);
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Problem — HelloNode</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    html, body { height: 100%; }
    body { min-height: 100vh; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #060d22; overflow-x: hidden; }
    .bg { position: fixed; inset: 0; z-index: 0; pointer-events: none; } .bg svg { width: 100%; height: 100%; }
    .topbar { position: relative; z-index: 10; display: flex; align-items: center; padding: 14px 32px; background: rgba(255,255,255,0.06); backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px); border-bottom: 1px solid rgba(255,255,255,0.08); }
    .logo-mark { width: 36px; height: 36px; background: linear-gradient(135deg, #3b5bdb, #1a237e); border-radius: 9px; display: flex; align-items: center; justify-content: center; text-decoration: none; }
    .app-name { font-size: 15px; font-weight: 700; color: rgba(255,255,255,0.9); margin-left: 12px; }
    .main { position: relative; z-index: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: calc(100vh - 65px); padding: 40px 24px; text-align: center; }
    .emoji-wrap { width: 128px; height: 128px; background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.1); border-radius: 32px; display: flex; align-items: center; justify-content: center; margin-bottom: 28px; box-shadow: 0 8px 32px rgba(0,0,0,0.3); }
    .emoji-wrap span { font-size: 72px; line-height: 1; user-select: none; }
    h1 { font-size: 26px; font-weight: 800; color: white; letter-spacing: -0.5px; margin-bottom: 16px; }
    .msg { max-width: 480px; font-size: 15px; line-height: 1.65; color: rgba(255,255,255,0.6); background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.08); border-radius: 12px; padding: 16px 20px; margin-bottom: 32px; word-break: break-word; }
    .btn { display: inline-block; padding: 12px 28px; background: linear-gradient(135deg, #3b5bdb, #1a237e); color: white; text-decoration: none; border-radius: 10px; font-size: 15px; font-weight: 600; transition: all 0.18s ease; letter-spacing: 0.1px; }
    .btn:hover { background: linear-gradient(135deg, #4c6ef5, #283593); box-shadow: 0 8px 24px rgba(59,91,219,0.48); transform: translateY(-1px); }
  </style>
</head>
<body>
  <div class="bg">
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1920 1080" preserveAspectRatio="xMidYMid slice">
      <defs>
        <linearGradient id="bgG" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#050c1e"/><stop offset="45%" stop-color="#09132e"/><stop offset="100%" stop-color="#0e1c42"/></linearGradient>
        <radialGradient id="cg" cx="50%" cy="50%" r="55%"><stop offset="0%" stop-color="#1a3a8a" stop-opacity="0.18"/><stop offset="100%" stop-color="#060d22" stop-opacity="0"/></radialGradient>
        <filter id="led" x="-80%" y="-80%" width="260%" height="260%"><feGaussianBlur in="SourceGraphic" stdDeviation="2.5" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
      </defs>
      <rect width="1920" height="1080" fill="url(#bgG)"/><rect width="1920" height="1080" fill="url(#cg)"/>
      <g opacity="0.025" stroke="#3a6fff" stroke-width="1"><line x1="0" y1="108" x2="1920" y2="108"/><line x1="0" y1="216" x2="1920" y2="216"/><line x1="0" y1="324" x2="1920" y2="324"/><line x1="192" y1="0" x2="192" y2="1080"/><line x1="384" y1="0" x2="384" y2="1080"/><line x1="576" y1="0" x2="576" y2="1080"/><line x1="768" y1="0" x2="768" y2="1080"/><line x1="960" y1="0" x2="960" y2="1080"/><line x1="1152" y1="0" x2="1152" y2="1080"/><line x1="1344" y1="0" x2="1344" y2="1080"/><line x1="1536" y1="0" x2="1536" y2="1080"/><line x1="1728" y1="0" x2="1728" y2="1080"/></g>
      <g opacity="0.08" transform="translate(72,70)"><rect x="0" y="0" width="162" height="540" rx="7" fill="#091a56" stroke="#1e3fa0" stroke-width="2"/><rect x="10" y="48" width="142" height="22" rx="2" fill="#0a1c60"/><circle cx="142" cy="59" r="4" fill="#00ee77" filter="url(#led)"/><rect x="10" y="74" width="142" height="22" rx="2" fill="#0a1c60"/><circle cx="142" cy="85" r="4" fill="#ffaa00" filter="url(#led)"/><rect x="10" y="100" width="142" height="22" rx="2" fill="#0a1c60"/><circle cx="142" cy="111" r="4" fill="#ff3333" filter="url(#led)"/><rect x="10" y="498" width="142" height="30" rx="4" fill="#0d2478"/></g>
      <g opacity="0.06" transform="translate(1660,140)"><rect x="0" y="0" width="152" height="490" rx="6" fill="#091a56" stroke="#1e3fa0" stroke-width="2"/><rect x="10" y="44" width="132" height="20" rx="2" fill="#0a1c60"/><circle cx="132" cy="54" r="3.5" fill="#ff3333" filter="url(#led)"/><rect x="10" y="68" width="132" height="20" rx="2" fill="#0a1c60"/><circle cx="132" cy="78" r="3.5" fill="#ffaa00" filter="url(#led)"/><rect x="10" y="450" width="132" height="28" rx="3" fill="#0d2478"/></g>
      <g font-family="Georgia,'Times New Roman',serif" fill="#5580ff"><text x="310" y="105" font-size="70" opacity="0.05">&#x3A3;</text><text x="1270" y="130" font-size="66" opacity="0.05">&#x221E;</text><text x="490" y="720" font-size="76" opacity="0.05">&#x2124;</text><text x="1595" y="785" font-size="78" opacity="0.05">&#x3A0;</text></g>
    </svg>
  </div>
  <header class="topbar">
    <a href="/" class="logo-mark"><svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M12 2L2 7l10 5 10-5-10-5z" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M2 17l10 5 10-5" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M2 12l10 5 10-5" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></a>
    <span class="app-name">HelloNode</span>
  </header>
  <main class="main">
    <div class="emoji-wrap"><span>&#x1F64F;</span></div>
    <h1>Sorry, ran into a problem</h1>
    <div class="msg">${safeMsg}</div>
    <a href="${escapeHtml(buttonHref)}" class="btn">${escapeHtml(buttonText)}</a>
  </main>
</body>
</html>`;
}

router.get('/', (req, res) => {
  const msg        = req.query.msg || 'An unexpected error occurred.';
  const loggedIn   = req.isAuthenticated && req.isAuthenticated();
  const buttonText = loggedIn ? 'Go to Dashboard' : 'Go to Login';
  const buttonHref = loggedIn ? '/dashboard'       : '/login';
  res.status(200).type('html').send(buildPage(msg, buttonText, buttonHref));
});

module.exports = router;
