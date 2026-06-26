'use strict';

const { Router }   = require('express');
const { getPool }  = require('../db');
const requireAuth  = require('../middleware/requireAuth');
const router = Router();

const MYSQL_RELEASE_DATES = {
  '8.0.11': '2018-04-19', '8.0.12': '2018-07-27', '8.0.13': '2018-10-22',
  '8.0.14': '2019-01-21', '8.0.15': '2019-02-01', '8.0.16': '2019-04-25',
  '8.0.17': '2019-07-22', '8.0.18': '2019-10-14', '8.0.19': '2020-01-13',
  '8.0.20': '2020-04-27', '8.0.21': '2020-07-13', '8.0.22': '2020-10-19',
  '8.0.23': '2021-01-18', '8.0.24': '2021-04-20', '8.0.25': '2021-05-11',
  '8.0.26': '2021-07-20', '8.0.27': '2021-10-19', '8.0.28': '2022-01-18',
  '8.0.29': '2022-04-26', '8.0.30': '2022-07-26', '8.0.31': '2022-10-11',
  '8.0.32': '2023-01-17', '8.0.33': '2023-04-18', '8.0.34': '2023-07-18',
  '8.0.35': '2023-10-25', '8.0.36': '2024-01-16', '8.0.37': '2024-04-30',
  '8.0.38': '2024-07-01', '8.0.39': '2024-07-23', '8.0.40': '2024-10-15',
  '8.0.41': '2025-01-14', '8.0.42': '2025-04-15',
  '8.4.0': '2024-04-30', '8.4.1': '2024-07-01', '8.4.2': '2024-10-15',
  '8.4.3': '2025-01-14', '8.4.4': '2025-04-15',
  '9.0.0': '2024-07-01', '9.1.0': '2024-10-15', '9.2.0': '2025-01-14', '9.3.0': '2025-04-15',
};

/**
 * vetSQL — placeholder security gate.
 * Returns false (blocked) if the SQL should NOT be executed.
 * Returns true  (allowed) if safe to proceed.
 * Currently only blocks "DELETE EVERYTHING ...". Expand as needed.
 */
function vetSQL(sql) {
  const upper = sql.trim().toUpperCase();
  if (upper.startsWith('DELETE EVERYTHING')) return false;
  return true;
}

const SQL_KEYWORD_RE = /^(SELECT|INSERT|UPDATE|DELETE|CREATE|ALTER|DROP|SHOW|DESCRIBE|DESC|EXPLAIN|TRUNCATE|GRANT|REVOKE|USE|CALL|SET|REPLACE|WITH|BEGIN|COMMIT|ROLLBACK|START|FLUSH|OPTIMIZE|ANALYZE|CHECK|REPAIR)\b/i;

function isSQLCommand(str) { return SQL_KEYWORD_RE.test(str.trim()); }

function sqlResponseType(sql) {
  const first = sql.trim().split(/\s+/)[0].toUpperCase();
  if (['SELECT','SHOW','DESCRIBE','DESC','EXPLAIN','WITH'].includes(first)) return 'select';
  if (['INSERT','UPDATE','DELETE','REPLACE'].includes(first))               return 'write';
  return 'ddl';
}

const CONSOLE_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Database Console — HelloNode</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    html, body { height: 100%; }
    body { min-height: 100vh; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #060d22; overflow-x: hidden; }
    .bg { position: fixed; inset: 0; z-index: 0; pointer-events: none; } .bg svg { width: 100%; height: 100%; }
    .topbar { position: relative; z-index: 10; display: flex; align-items: center; justify-content: space-between; padding: 14px 32px; background: rgba(255,255,255,0.06); backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px); border-bottom: 1px solid rgba(255,255,255,0.08); }
    .topbar-left { display: flex; align-items: center; gap: 12px; }
    .logo-mark { width: 36px; height: 36px; background: linear-gradient(135deg, #3b5bdb, #1a237e); border-radius: 9px; display: flex; align-items: center; justify-content: center; text-decoration: none; }
    .app-name { font-size: 15px; font-weight: 700; color: rgba(255,255,255,0.9); }
    .breadcrumb { font-size: 13px; color: rgba(255,255,255,0.4); padding: 0 8px; }
    .page-name { font-size: 13px; color: rgba(255,255,255,0.7); font-weight: 500; }
    .back-btn { padding: 7px 16px; background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.15); border-radius: 8px; color: rgba(255,255,255,0.75); font-size: 13px; font-weight: 500; text-decoration: none; transition: all 0.18s ease; }
    .back-btn:hover { background: rgba(255,255,255,0.14); color: white; }
    .main { position: relative; z-index: 1; max-width: 960px; margin: 0 auto; padding: 40px 24px 60px; }
    h1 { font-size: 28px; font-weight: 800; color: white; letter-spacing: -0.6px; margin-bottom: 6px; }
    .subtitle { font-size: 14px; color: rgba(255,255,255,0.45); margin-bottom: 28px; }
    .console-card { background: rgba(255,255,255,0.04); backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px); border: 1px solid rgba(255,255,255,0.09); border-radius: 16px; padding: 24px; display: flex; flex-direction: column; gap: 14px; }
    .label { font-size: 12px; font-weight: 600; color: rgba(255,255,255,0.5); text-transform: uppercase; letter-spacing: 0.7px; margin-bottom: 6px; }
    textarea#sql-input { width: 100%; min-height: 120px; max-height: 320px; background: rgba(0,0,0,0.45); border: 1.5px solid rgba(255,255,255,0.12); border-radius: 10px; color: #e2e8f0; font-family: 'SF Mono','Fira Code','Courier New',monospace; font-size: 14px; line-height: 1.6; padding: 12px 14px; resize: vertical; outline: none; transition: border-color 0.18s ease; }
    textarea#sql-input:focus { border-color: #3b5bdb; box-shadow: 0 0 0 3px rgba(59,91,219,0.18); }
    textarea#sql-input::placeholder { color: rgba(255,255,255,0.22); }
    .btn-row { display: flex; gap: 10px; align-items: center; }
    .execute-btn { padding: 10px 24px; background: linear-gradient(135deg, #3b5bdb, #1a237e); color: white; border: none; border-radius: 8px; font-size: 14px; font-weight: 600; cursor: pointer; transition: all 0.18s ease; font-family: inherit; }
    .execute-btn:hover:not(:disabled) { background: linear-gradient(135deg, #4c6ef5, #283593); box-shadow: 0 6px 20px rgba(59,91,219,0.45); transform: translateY(-1px); }
    .execute-btn:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }
    .clear-btn { padding: 10px 18px; background: rgba(255,255,255,0.07); border: 1px solid rgba(255,255,255,0.12); border-radius: 8px; color: rgba(255,255,255,0.6); font-size: 14px; font-weight: 500; cursor: pointer; transition: all 0.18s ease; font-family: inherit; }
    .clear-btn:hover { background: rgba(255,255,255,0.12); color: white; }
    .hint { font-size: 12px; color: rgba(255,255,255,0.28); margin-left: auto; }
    textarea#output { width: 100%; min-height: 340px; background: rgba(0,0,0,0.6); border: 1.5px solid rgba(255,255,255,0.08); border-radius: 10px; color: #6ee7a0; font-family: 'SF Mono','Fira Code','Courier New',monospace; font-size: 13px; line-height: 1.65; padding: 14px; resize: vertical; outline: none; }
    textarea#output:focus { border-color: rgba(110,231,160,0.3); }
    .divider { height: 1px; background: rgba(255,255,255,0.07); margin: 4px 0; }
  </style>
</head>
<body>
  <div class="bg">
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1920 1080" preserveAspectRatio="xMidYMid slice">
      <defs>
        <linearGradient id="bgG" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#050c1e"/><stop offset="45%" stop-color="#09132e"/><stop offset="100%" stop-color="#0e1c42"/></linearGradient>
        <radialGradient id="cg" cx="50%" cy="50%" r="55%"><stop offset="0%" stop-color="#1a3a8a" stop-opacity="0.2"/><stop offset="100%" stop-color="#060d22" stop-opacity="0"/></radialGradient>
        <filter id="led" x="-80%" y="-80%" width="260%" height="260%"><feGaussianBlur in="SourceGraphic" stdDeviation="2.5" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
      </defs>
      <rect width="1920" height="1080" fill="url(#bgG)"/><rect width="1920" height="1080" fill="url(#cg)"/>
      <g opacity="0.025" stroke="#3a6fff" stroke-width="1"><line x1="0" y1="108" x2="1920" y2="108"/><line x1="0" y1="216" x2="1920" y2="216"/><line x1="0" y1="324" x2="1920" y2="324"/><line x1="0" y1="432" x2="1920" y2="432"/><line x1="0" y1="540" x2="1920" y2="540"/><line x1="192" y1="0" x2="192" y2="1080"/><line x1="384" y1="0" x2="384" y2="1080"/><line x1="576" y1="0" x2="576" y2="1080"/><line x1="768" y1="0" x2="768" y2="1080"/><line x1="960" y1="0" x2="960" y2="1080"/><line x1="1152" y1="0" x2="1152" y2="1080"/><line x1="1344" y1="0" x2="1344" y2="1080"/><line x1="1536" y1="0" x2="1536" y2="1080"/><line x1="1728" y1="0" x2="1728" y2="1080"/></g>
      <g opacity="0.09" transform="translate(72,70)"><rect x="0" y="0" width="162" height="540" rx="7" fill="#091a56" stroke="#1e3fa0" stroke-width="2"/><rect x="10" y="10" width="142" height="30" rx="4" fill="#0d2478"/><rect x="10" y="48" width="142" height="22" rx="2" fill="#0a1c60"/><circle cx="142" cy="59" r="4" fill="#00ee77" filter="url(#led)"/><rect x="10" y="74" width="142" height="22" rx="2" fill="#0a1c60"/><circle cx="142" cy="85" r="4" fill="#00ee77" filter="url(#led)"/><rect x="10" y="100" width="142" height="22" rx="2" fill="#0a1c60"/><circle cx="142" cy="111" r="4" fill="#ffaa00" filter="url(#led)"/><rect x="10" y="126" width="142" height="22" rx="2" fill="#0a1c60"/><circle cx="142" cy="137" r="4" fill="#00ee77" filter="url(#led)"/><rect x="10" y="152" width="142" height="22" rx="2" fill="#0a1c60"/><circle cx="142" cy="163" r="4" fill="#ff3333" filter="url(#led)"/><rect x="10" y="178" width="142" height="44" rx="2" fill="#070f40"/><circle cx="140" cy="194" r="3" fill="#00aaff" filter="url(#led)"/><circle cx="140" cy="214" r="3" fill="#00aaff" filter="url(#led)"/><rect x="10" y="252" width="142" height="22" rx="2" fill="#0a1c60"/><circle cx="142" cy="263" r="4" fill="#00ee77" filter="url(#led)"/><rect x="10" y="498" width="142" height="30" rx="4" fill="#0d2478"/></g>
      <g opacity="0.07" transform="translate(1660,140)"><rect x="0" y="0" width="152" height="490" rx="6" fill="#091a56" stroke="#1e3fa0" stroke-width="2"/><rect x="10" y="44" width="132" height="20" rx="2" fill="#0a1c60"/><circle cx="132" cy="54" r="3.5" fill="#00ee77" filter="url(#led)"/><rect x="10" y="68" width="132" height="20" rx="2" fill="#0a1c60"/><circle cx="132" cy="78" r="3.5" fill="#ff3333" filter="url(#led)"/><rect x="10" y="92" width="132" height="20" rx="2" fill="#0a1c60"/><circle cx="132" cy="102" r="3.5" fill="#00ee77" filter="url(#led)"/><rect x="10" y="116" width="132" height="20" rx="2" fill="#0a1c60"/><circle cx="132" cy="126" r="3.5" fill="#ffaa00" filter="url(#led)"/><rect x="10" y="188" width="132" height="40" rx="2" fill="#070f40"/><circle cx="130" cy="200" r="3" fill="#00aaff" filter="url(#led)"/><rect x="10" y="450" width="132" height="28" rx="3" fill="#0d2478"/></g>
      <g font-family="Georgia,'Times New Roman',serif" fill="#5580ff"><text x="310" y="105" font-size="70" opacity="0.055">&#x3A3;</text><text x="820" y="145" font-size="62" opacity="0.055">&#x3C0;</text><text x="1270" y="130" font-size="66" opacity="0.055">&#x221E;</text><text x="680" y="280" font-size="76" opacity="0.05">&#x2207;</text><text x="920" y="330" font-size="62" opacity="0.055">&#x3BB;</text><text x="490" y="720" font-size="76" opacity="0.05">&#x2124;</text><text x="1160" y="770" font-size="66" opacity="0.055">&#x2229;</text><text x="1595" y="785" font-size="78" opacity="0.05">&#x3A0;</text></g>
    </svg>
  </div>
  <header class="topbar">
    <div class="topbar-left">
      <a href="/dashboard" class="logo-mark"><svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M12 2L2 7l10 5 10-5-10-5z" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M2 17l10 5 10-5" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M2 12l10 5 10-5" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></a>
      <span class="app-name">HelloNode</span>
      <span class="breadcrumb">/</span>
      <span class="page-name">Database Console</span>
    </div>
    <a href="/dashboard" class="back-btn">&#8592; Dashboard</a>
  </header>
  <main class="main">
    <h1>Database Console</h1>
    <p class="subtitle">Execute SQL queries directly against the database &mdash; results appear below in real time.</p>
    <div class="console-card">
      <div>
        <div class="label">SQL Command</div>
        <textarea id="sql-input" placeholder="SELECT * FROM hello_log ORDER BY created_at DESC LIMIT 10;" spellcheck="false" autocorrect="off" autocapitalize="off"></textarea>
      </div>
      <div class="btn-row">
        <button id="execute-btn" class="execute-btn">&#9654; Execute</button>
        <button id="clear-btn" class="clear-btn">Clear output</button>
        <span class="hint">Ctrl+Enter to run</span>
      </div>
      <div class="divider"></div>
      <div>
        <div class="label">Output</div>
        <textarea id="output" readonly placeholder="Results will appear here..."></textarea>
      </div>
    </div>
  </main>
  <script>
    const sqlInput = document.getElementById('sql-input');
    const outputEl = document.getElementById('output');
    const execBtn  = document.getElementById('execute-btn');
    const clearBtn = document.getElementById('clear-btn');

    sqlInput.addEventListener('keydown', e => {
      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); executeQuery(); }
    });
    execBtn.addEventListener('click', executeQuery);
    clearBtn.addEventListener('click', () => { outputEl.value = ''; });

    function appendLine(text) {
      outputEl.value += (outputEl.value ? '\\n' : '') + text;
      outputEl.scrollTop = outputEl.scrollHeight;
    }
    function replaceLastEllipsis(text) {
      const lines = outputEl.value.split('\\n');
      for (let i = lines.length - 1; i >= 0; i--) {
        if (lines[i] === '...') { lines[i] = text; break; }
      }
      outputEl.value = lines.join('\\n');
      outputEl.scrollTop = outputEl.scrollHeight;
    }
    function formatResult(data) {
      if (data.error) return 'ERROR: ' + data.error;
      if (data.type === 'select') {
        if (!data.rows || data.rows.length === 0) return '(empty result set)';
        return formatTable(data.rows) + '\\n(' + data.rows.length + ' row' + (data.rows.length !== 1 ? 's' : '') + ')';
      }
      if (data.type === 'write') {
        let msg = 'Query OK \u2014 ' + data.affectedRows + ' row(s) affected';
        if (data.insertId) msg += ', insertId: ' + data.insertId;
        return msg;
      }
      if (data.type === 'ddl') return 'Query OK';
      return JSON.stringify(data, null, 2);
    }
    function formatTable(rows) {
      const keys = Object.keys(rows[0]);
      const widths = {};
      keys.forEach(k => {
        widths[k] = k.length;
        rows.forEach(r => { const v = r[k] === null ? 'NULL' : String(r[k]); if (v.length > widths[k]) widths[k] = v.length; });
        widths[k] = Math.min(widths[k], 48);
      });
      const header = keys.map(k => k.padEnd(widths[k])).join(' | ');
      const sep    = keys.map(k => '-'.repeat(widths[k])).join('-+-');
      const body   = rows.map(r => keys.map(k => { const v = r[k] === null ? 'NULL' : String(r[k]); return v.substring(0, widths[k]).padEnd(widths[k]); }).join(' | '));
      return [header, sep, ...body].join('\\n');
    }
    async function executeQuery() {
      const sql = sqlInput.value.trim();
      if (!sql) return;
      const ts = new Date().toLocaleTimeString();
      appendLine('[' + ts + '] > ' + sql);
      appendLine('...');
      execBtn.disabled = true; execBtn.textContent = 'Executing\u2026';
      try {
        const res  = await fetch('/developer?cmd=db_cmd', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sql }) });
        const data = await res.json();
        replaceLastEllipsis(formatResult(data));
      } catch (err) {
        replaceLastEllipsis('Network error: ' + err.message);
      } finally {
        execBtn.disabled = false; execBtn.textContent = '\u25b6 Execute';
      }
    }
  </script>
</body>
</html>`;

const VALID_GET_CMDS = ['db', 'db_schema', 'db_statistics', 'db_console'];

function buildDbPage(user) {
  const avatarHTML = user.picture
    ? `<img src="${user.picture}" class="avatar" alt="${user.name}" referrerpolicy="no-referrer"/>`
    : `<div class="avatar-fallback">${(user.name[0] || 'U').toUpperCase()}</div>`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Database Management — HelloNode</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    html, body { height: 100%; }
    body { min-height: 100vh; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #060d22; overflow-x: hidden; }
    .bg { position: fixed; inset: 0; z-index: 0; pointer-events: none; } .bg svg { width: 100%; height: 100%; }

    /* ── Topbar ── */
    .topbar { position: relative; z-index: 10; display: flex; align-items: center; justify-content: space-between; padding: 14px 32px; background: rgba(255,255,255,0.06); backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px); border-bottom: 1px solid rgba(255,255,255,0.08); }
    .topbar-left { display: flex; align-items: center; gap: 12px; }
    .logo-mark { width: 36px; height: 36px; background: linear-gradient(135deg, #3b5bdb, #1a237e); border-radius: 9px; display: flex; align-items: center; justify-content: center; text-decoration: none; flex-shrink: 0; }
    .app-name { font-size: 15px; font-weight: 700; color: rgba(255,255,255,0.9); }
    .breadcrumb { font-size: 13px; color: rgba(255,255,255,0.35); padding: 0 4px; }
    .page-name { font-size: 13px; color: rgba(255,255,255,0.65); font-weight: 500; }
    .topbar-right { display: flex; align-items: center; gap: 14px; }
    .avatar, .avatar-fallback { width: 34px; height: 34px; border-radius: 50%; object-fit: cover; border: 2px solid rgba(255,255,255,0.2); }
    .avatar-fallback { background: linear-gradient(135deg, #3b5bdb, #1a237e); display: flex; align-items: center; justify-content: center; font-size: 14px; font-weight: 700; color: white; }
    .user-name { font-size: 13px; font-weight: 500; color: rgba(255,255,255,0.75); }
    .back-btn { padding: 7px 16px; background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.15); border-radius: 8px; color: rgba(255,255,255,0.75); font-size: 13px; font-weight: 500; text-decoration: none; transition: all 0.18s ease; }
    .back-btn:hover { background: rgba(255,255,255,0.14); color: white; }

    /* ── Main layout ── */
    .main { position: relative; z-index: 1; max-width: 900px; margin: 0 auto; padding: 44px 24px 72px; }
    .page-header { margin-bottom: 32px; }
    h1 { font-size: 30px; font-weight: 800; color: white; letter-spacing: -0.6px; margin-bottom: 5px; }
    .subtitle { font-size: 14px; color: rgba(255,255,255,0.42); }

    /* ── Card ── */
    .card { background: rgba(255,255,255,0.04); backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px); border: 1px solid rgba(255,255,255,0.09); border-radius: 18px; padding: 28px 28px 32px; }

    /* ── Selector row ── */
    .selector-row { display: flex; align-items: center; gap: 14px; margin-bottom: 28px; }
    .selector-label { font-size: 13px; font-weight: 600; color: rgba(255,255,255,0.5); text-transform: uppercase; letter-spacing: 0.7px; white-space: nowrap; }
    .table-select { flex: 1; max-width: 340px; appearance: none; -webkit-appearance: none; background: rgba(0,0,0,0.35) url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath d='M1 1l5 5 5-5' stroke='rgba(255,255,255,0.4)' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E") no-repeat right 14px center; border: 1.5px solid rgba(255,255,255,0.12); border-radius: 10px; color: rgba(255,255,255,0.85); font-size: 14px; font-family: inherit; padding: 10px 38px 10px 14px; cursor: pointer; outline: none; transition: border-color 0.18s; }
    .table-select:focus { border-color: #3b5bdb; box-shadow: 0 0 0 3px rgba(59,91,219,0.18); }
    .table-select option { background: #0e1c42; color: white; }

    /* ── Loading / empty states ── */
    .state-msg { font-size: 14px; color: rgba(255,255,255,0.3); text-align: center; padding: 40px 0; display: none; }
    .state-msg.visible { display: block; }
    .spinner { display: inline-block; width: 18px; height: 18px; border: 2px solid rgba(255,255,255,0.15); border-top-color: #748ffc; border-radius: 50%; animation: spin 0.7s linear infinite; vertical-align: middle; margin-right: 8px; }
    @keyframes spin { to { transform: rotate(360deg); } }

    /* ── Summary strip ── */
    #summary { display: none; }
    #summary.visible { display: flex; gap: 14px; flex-wrap: wrap; margin-bottom: 24px; }
    .stat-pill { flex: 1; min-width: 120px; background: rgba(59,91,219,0.12); border: 1px solid rgba(59,91,219,0.25); border-radius: 12px; padding: 14px 18px; }
    .stat-pill .stat-label { font-size: 11px; font-weight: 600; color: rgba(255,255,255,0.4); text-transform: uppercase; letter-spacing: 0.8px; margin-bottom: 4px; }
    .stat-pill .stat-value { font-size: 20px; font-weight: 700; color: white; letter-spacing: -0.3px; }
    .stat-pill .stat-value.mono { font-family: 'SF Mono', 'Fira Code', monospace; font-size: 16px; }

    /* ── Field table ── */
    #fields-section { display: none; }
    #fields-section.visible { display: block; }
    .section-label { font-size: 12px; font-weight: 600; color: rgba(255,255,255,0.4); text-transform: uppercase; letter-spacing: 0.7px; margin-bottom: 10px; }
    .field-table-wrap { border-radius: 10px; overflow: hidden; border: 1px solid rgba(255,255,255,0.08); }
    table.field-table { width: 100%; border-collapse: collapse; font-size: 13.5px; }
    table.field-table thead tr { background: linear-gradient(90deg, rgba(59,91,219,0.5), rgba(26,35,126,0.5)); }
    table.field-table thead th { padding: 11px 16px; text-align: left; font-size: 11px; font-weight: 700; color: rgba(255,255,255,0.65); text-transform: uppercase; letter-spacing: 0.8px; white-space: nowrap; }
    table.field-table tbody tr { border-top: 1px solid rgba(255,255,255,0.05); transition: background 0.12s; }
    table.field-table tbody tr:nth-child(odd)  { background: rgba(255,255,255,0.025); }
    table.field-table tbody tr:nth-child(even) { background: rgba(0,0,0,0.15); }
    table.field-table tbody tr:hover { background: rgba(59,91,219,0.12); }
    table.field-table tbody td { padding: 10px 16px; color: rgba(255,255,255,0.82); vertical-align: middle; }
    td.td-name { font-family: 'SF Mono','Fira Code',monospace; font-size: 13px; color: #a5b4fc; font-weight: 500; }
    td.td-pk { text-align: center; }
    .pk-badge { display: inline-flex; align-items: center; justify-content: center; background: linear-gradient(135deg,#3b5bdb,#1a237e); border-radius: 5px; padding: 2px 8px; font-size: 10px; font-weight: 700; color: white; letter-spacing: 0.5px; }
    td.td-type { font-family: 'SF Mono','Fira Code',monospace; font-size: 12px; color: #6ee7b7; }
    td.td-size { font-family: 'SF Mono','Fira Code',monospace; font-size: 12px; color: rgba(255,255,255,0.45); }

    /* ── Error banner ── */
    .error-banner { display: none; background: rgba(220,38,38,0.12); border: 1px solid rgba(220,38,38,0.3); border-radius: 10px; padding: 14px 18px; color: #fca5a5; font-size: 13.5px; margin-bottom: 20px; }
    .error-banner.visible { display: block; }
  </style>
</head>
<body>
  <div class="bg"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1920 1080" preserveAspectRatio="xMidYMid slice">
    <defs><linearGradient id="bgG" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#050c1e"/><stop offset="45%" stop-color="#09132e"/><stop offset="100%" stop-color="#0e1c42"/></linearGradient><radialGradient id="cg" cx="50%" cy="50%" r="55%"><stop offset="0%" stop-color="#1a3a8a" stop-opacity="0.2"/><stop offset="100%" stop-color="#060d22" stop-opacity="0"/></radialGradient><filter id="led" x="-80%" y="-80%" width="260%" height="260%"><feGaussianBlur in="SourceGraphic" stdDeviation="2.5" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>
    <rect width="1920" height="1080" fill="url(#bgG)"/><rect width="1920" height="1080" fill="url(#cg)"/>
    <g opacity="0.03" stroke="#3a6fff" stroke-width="1"><line x1="0" y1="108" x2="1920" y2="108"/><line x1="0" y1="216" x2="1920" y2="216"/><line x1="0" y1="324" x2="1920" y2="324"/><line x1="0" y1="432" x2="1920" y2="432"/><line x1="0" y1="540" x2="1920" y2="540"/><line x1="0" y1="648" x2="1920" y2="648"/><line x1="192" y1="0" x2="192" y2="1080"/><line x1="384" y1="0" x2="384" y2="1080"/><line x1="576" y1="0" x2="576" y2="1080"/><line x1="768" y1="0" x2="768" y2="1080"/><line x1="960" y1="0" x2="960" y2="1080"/><line x1="1152" y1="0" x2="1152" y2="1080"/><line x1="1344" y1="0" x2="1344" y2="1080"/><line x1="1536" y1="0" x2="1536" y2="1080"/><line x1="1728" y1="0" x2="1728" y2="1080"/></g>
    <g opacity="0.09" transform="translate(72,70)"><rect x="0" y="0" width="162" height="540" rx="7" fill="#091a56" stroke="#1e3fa0" stroke-width="2"/><rect x="10" y="48" width="142" height="22" rx="2" fill="#0a1c60"/><circle cx="142" cy="59" r="4" fill="#00ee77" filter="url(#led)"/><rect x="10" y="74" width="142" height="22" rx="2" fill="#0a1c60"/><circle cx="142" cy="85" r="4" fill="#00ee77" filter="url(#led)"/><rect x="10" y="100" width="142" height="22" rx="2" fill="#0a1c60"/><circle cx="142" cy="111" r="4" fill="#ffaa00" filter="url(#led)"/><rect x="10" y="498" width="142" height="30" rx="4" fill="#0d2478"/></g>
    <g font-family="Georgia,'Times New Roman',serif" fill="#5580ff"><text x="310" y="105" font-size="70" opacity="0.055">&#x3A3;</text><text x="920" y="330" font-size="62" opacity="0.055">&#x3BB;</text><text x="490" y="720" font-size="76" opacity="0.05">&#x2124;</text></g>
  </svg></div>

  <header class="topbar">
    <div class="topbar-left">
      <a href="/dashboard" class="logo-mark"><svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M12 2L2 7l10 5 10-5-10-5z" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M2 17l10 5 10-5" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M2 12l10 5 10-5" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></a>
      <span class="app-name">HelloNode</span>
      <span class="breadcrumb">/</span>
      <span class="page-name">Database Management</span>
    </div>
    <div class="topbar-right">
      ${avatarHTML}
      <span class="user-name">${user.name}</span>
      <a href="/dashboard" class="back-btn">&#8592; Dashboard</a>
    </div>
  </header>

  <main class="main">
    <div class="page-header">
      <h1>Database Management</h1>
      <p class="subtitle">Inspect tables, field definitions, row counts and storage usage.</p>
    </div>

    <div class="card">
      <div class="selector-row">
        <span class="selector-label">Tables</span>
        <select id="table-select" class="table-select" disabled>
          <option value="">— loading… —</option>
        </select>
      </div>

      <div id="error-banner" class="error-banner"></div>
      <div id="loading-msg" class="state-msg"><span class="spinner"></span>Loading schema…</div>
      <div id="empty-msg" class="state-msg">Select a table above to inspect it.</div>

      <div id="summary"></div>

      <div id="fields-section">
        <div class="section-label">Field Definitions</div>
        <div class="field-table-wrap">
          <table class="field-table">
            <thead><tr>
              <th>Field Name</th>
              <th style="text-align:center">Primary</th>
              <th>Type</th>
              <th>Size</th>
            </tr></thead>
            <tbody id="fields-tbody"></tbody>
          </table>
        </div>
      </div>
    </div>
  </main>

  <script>
    const sel         = document.getElementById('table-select');
    const summary     = document.getElementById('summary');
    const fieldsSection = document.getElementById('fields-section');
    const fieldsTbody = document.getElementById('fields-tbody');
    const loadingMsg  = document.getElementById('loading-msg');
    const emptyMsg    = document.getElementById('empty-msg');
    const errorBanner = document.getElementById('error-banner');

    let schemaData = {};   // { tableName: { fields: [...] } }
    let statsData  = {};   // { tableName: { rows, size_kb } }

    function showError(msg) {
      errorBanner.textContent = msg;
      errorBanner.classList.add('visible');
    }
    function hideError() { errorBanner.classList.remove('visible'); }

    async function loadData() {
      loadingMsg.classList.add('visible');
      hideError();
      try {
        const [schemaRes, statsRes] = await Promise.all([
          fetch('/developer?cmd=db_schema'),
          fetch('/developer?cmd=db_statistics')
        ]);
        if (!schemaRes.ok || !statsRes.ok) throw new Error('Server returned an error response.');
        const schemaJson = await schemaRes.json();
        const statsJson  = await statsRes.json();
        if (schemaJson.error) throw new Error(schemaJson.error);
        if (statsJson.error)  throw new Error(statsJson.error);

        schemaJson.schema.forEach(t => { schemaData[t.table] = t; });
        statsJson.tables.forEach(t  => { statsData[t.table]  = t; });

        populateDropdown(Object.keys(schemaData).sort());
      } catch (err) {
        showError('Could not load database schema: ' + err.message);
        sel.innerHTML = '<option value="">— unavailable —</option>';
      } finally {
        loadingMsg.classList.remove('visible');
      }
    }

    function populateDropdown(tables) {
      sel.innerHTML = '<option value="">— select a table —</option>' +
        tables.map(t => \`<option value="\${t}">\${t}</option>\`).join('');
      sel.disabled = false;
      emptyMsg.classList.add('visible');
    }

    function renderTable(tableName) {
      const schema = schemaData[tableName];
      const stats  = statsData[tableName]  || {};
      if (!schema) return;

      const fields   = schema.fields || [];
      const rowCount = stats.rows    ?? '—';
      const sizeKb   = stats.size_kb != null ? stats.size_kb : '—';

      // Summary pills
      summary.innerHTML = \`
        <div class="stat-pill">
          <div class="stat-label">Table</div>
          <div class="stat-value mono">\${tableName}</div>
        </div>
        <div class="stat-pill">
          <div class="stat-label">Fields</div>
          <div class="stat-value">\${fields.length}</div>
        </div>
        <div class="stat-pill">
          <div class="stat-label">Rows</div>
          <div class="stat-value">\${rowCount.toLocaleString !== undefined ? rowCount.toLocaleString() : rowCount}</div>
        </div>
        <div class="stat-pill">
          <div class="stat-label">Size</div>
          <div class="stat-value mono">\${sizeKb} kB</div>
        </div>\`;
      summary.classList.add('visible');

      // Field rows
      fieldsTbody.innerHTML = fields.map(f => \`
        <tr>
          <td class="td-name">\${f.name}</td>
          <td class="td-pk">\${f.primary ? '<span class="pk-badge">PK</span>' : ''}</td>
          <td class="td-type">\${f.type}</td>
          <td class="td-size">\${f.size != null ? f.size : '—'}</td>
        </tr>\`).join('');
      fieldsSection.classList.add('visible');
    }

    function clearDetail() {
      summary.classList.remove('visible');
      fieldsSection.classList.remove('visible');
      emptyMsg.classList.add('visible');
    }

    sel.addEventListener('change', () => {
      emptyMsg.classList.remove('visible');
      if (!sel.value) { clearDetail(); return; }
      renderTable(sel.value);
    });

    loadData();
  </script>
</body>
</html>`;
}


router.get('/', async (req, res) => {
  const query_ts = new Date().toISOString();
  const { cmd }  = req.query;

  if (!cmd || cmd.trim() === '') {
    return res.status(400).json({ query_ts, error: 'Missing required query parameter: cmd', valid_commands: VALID_GET_CMDS });
  }
  if (!VALID_GET_CMDS.includes(cmd)) {
    return res.status(400).json({ query_ts, error: `Unknown command: "${cmd}"`, valid_commands: VALID_GET_CMDS });
  }

  if (cmd === 'db') {
    if (!req.isAuthenticated()) return res.redirect('/login');
    return res.status(200).type('html').send(buildDbPage(req.user));
  }

  if (cmd === 'db_console') {
    if (!req.isAuthenticated()) return res.redirect('/login');
    return res.status(200).type('html').send(CONSOLE_HTML);
  }

  const pool = getPool();
  if (!pool) return res.status(503).json({ query_ts, error: 'Database not available' });

  if (cmd === 'db_schema') {
    try {
      const [columns] = await pool.execute(`SELECT TABLE_NAME, COLUMN_NAME, DATA_TYPE, CHARACTER_MAXIMUM_LENGTH, NUMERIC_PRECISION, COLUMN_KEY, IS_NULLABLE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() ORDER BY TABLE_NAME, ORDINAL_POSITION`);
      const tableMap = {};
      for (const col of columns) {
        if (!tableMap[col.TABLE_NAME]) tableMap[col.TABLE_NAME] = { table: col.TABLE_NAME, fields: [] };
        tableMap[col.TABLE_NAME].fields.push({ name: col.COLUMN_NAME, type: col.DATA_TYPE, size: col.CHARACTER_MAXIMUM_LENGTH ?? col.NUMERIC_PRECISION ?? null, primary: col.COLUMN_KEY === 'PRI', nullable: col.IS_NULLABLE === 'YES' });
      }
      return res.status(200).json({ query_ts, cmd, schema: Object.values(tableMap) });
    } catch (err) {
      return res.status(500).json({ query_ts, error: 'Database query failed' });
    }
  }

  if (cmd === 'db_statistics') {
    try {
      const [[versionRow]]    = await pool.execute('SELECT VERSION() AS version');
      const [[uptimeRow]]     = await pool.execute("SHOW GLOBAL STATUS LIKE 'Uptime'");
      const [[tableCountRow]] = await pool.execute('SELECT COUNT(*) AS count FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE()');
      const version = versionRow.version, uptimeSeconds = parseInt(uptimeRow.Value, 10), tableCount = Number(tableCountRow.count);
      const releaseDate = MYSQL_RELEASE_DATES[version] || 'unknown';
      const [tables] = await pool.execute('SELECT TABLE_NAME, ROUND((DATA_LENGTH + INDEX_LENGTH) / 1024, 2) AS size_kb FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() ORDER BY TABLE_NAME');
      const tables_detail = await Promise.all(tables.map(async t => {
        const [[{ count }]] = await pool.execute(`SELECT COUNT(*) AS count FROM \`${t.TABLE_NAME}\``);
        return { table: t.TABLE_NAME, rows: Number(count), size_kb: t.size_kb };
      }));
      return res.status(200).json({ query_ts, cmd, server: { version, release_date: releaseDate, uptime_seconds: uptimeSeconds, table_count: tableCount }, tables: tables_detail });
    } catch (err) {
      return res.status(500).json({ query_ts, error: 'Database query failed' });
    }
  }
});

router.post('/', requireAuth, async (req, res) => {
  const query_ts = new Date().toISOString();
  const { cmd }  = req.query;

  if (cmd !== 'db_cmd') {
    return res.status(400).json({ query_ts, error: `Unknown POST command: "${cmd}"` });
  }

  const { sql } = req.body;
  if (!sql || typeof sql !== 'string' || sql.trim() === '') {
    return res.status(400).json({ query_ts, error: 'Missing or empty sql field in request body' });
  }

  const trimmed = sql.trim();

  if (!isSQLCommand(trimmed)) {
    return res.status(400).json({ query_ts, error: 'Input does not start with a recognised SQL keyword' });
  }

  if (!vetSQL(trimmed)) {
    return res.status(403).json({ query_ts, error: 'Not Permitted' });
  }

  const pool = getPool();
  if (!pool) return res.status(503).json({ query_ts, error: 'Database not available' });

  try {
    const [rows] = await pool.query(trimmed);
    const type   = sqlResponseType(trimmed);
    if (type === 'select') return res.status(200).json({ query_ts, type: 'select', rowCount: rows.length, rows });
    if (type === 'write')  return res.status(200).json({ query_ts, type: 'write', affectedRows: rows.affectedRows, insertId: rows.insertId || null, changedRows: rows.changedRows || 0 });
    return res.status(200).json({ query_ts, type: 'ddl', message: 'Query executed successfully' });
  } catch (err) {
    console.error('db_cmd error:', err.message);
    return res.status(200).json({ query_ts, error: err.message });
  }
});

module.exports = router;
