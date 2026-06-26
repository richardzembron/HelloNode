'use strict';

const { Router } = require('express');
const router = Router();

// ── If already logged in, skip login and go straight to dashboard ─────────────
router.get('/', (req, res, next) => {
  if (req.isAuthenticated && req.isAuthenticated()) return res.redirect('/dashboard');
  next();
});

const HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Sign In — HelloNode</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    html, body { height: 100%; }

    body {
      min-height: 100vh;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto,
                   'Helvetica Neue', Arial, sans-serif;
      background: #060d22;
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
    }

    .bg {
      position: fixed;
      inset: 0;
      z-index: 0;
      width: 100%;
      height: 100%;
    }
    .bg svg { width: 100%; height: 100%; }

    .page {
      position: relative;
      z-index: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      padding: 24px;
      width: 100%;
    }

    .card {
      background: rgba(255, 255, 255, 0.97);
      backdrop-filter: blur(28px);
      -webkit-backdrop-filter: blur(28px);
      border-radius: 20px;
      padding: 44px 40px 38px;
      width: 100%;
      max-width: 420px;
      box-shadow:
        0 40px 80px rgba(0, 0, 0, 0.55),
        0 0 0 1px rgba(255, 255, 255, 0.08),
        inset 0 1px 0 rgba(255, 255, 255, 0.6);
    }

    .logo-mark {
      display: flex;
      justify-content: center;
      margin-bottom: 22px;
    }
    .logo-inner {
      width: 50px;
      height: 50px;
      background: linear-gradient(135deg, #3b5bdb, #1a237e);
      border-radius: 14px;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 8px 20px rgba(59, 91, 219, 0.45);
    }

    h1 {
      font-size: 21px;
      font-weight: 700;
      color: #111827;
      text-align: center;
      margin-bottom: 26px;
      letter-spacing: -0.4px;
      line-height: 1.35;
    }

    /* ── Google button — now an <a> tag ── */
    .google-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 10px;
      width: 100%;
      padding: 11px 16px;
      background: #ffffff;
      border: 1.5px solid #dadce0;
      border-radius: 8px;
      cursor: pointer;
      font-size: 14px;
      font-weight: 600;
      color: #3c4043;
      text-decoration: none;           /* important for <a> */
      transition: all 0.18s ease;
      font-family: inherit;
      letter-spacing: 0.1px;
    }
    .google-btn:hover {
      background: #f8f9fa;
      border-color: #bdc1c6;
      box-shadow: 0 2px 10px rgba(0, 0, 0, 0.12);
      color: #3c4043;
    }
    .google-btn:active { background: #f1f3f4; }

    .divider {
      display: flex;
      align-items: center;
      gap: 14px;
      margin: 20px 0;
      color: #9ca3af;
      font-size: 12px;
      font-weight: 500;
      text-transform: uppercase;
      letter-spacing: 0.6px;
    }
    .divider::before, .divider::after {
      content: '';
      flex: 1;
      height: 1px;
      background: #e5e7eb;
    }

    .form-group { margin-bottom: 16px; }

    label {
      display: block;
      font-size: 13px;
      font-weight: 600;
      color: #374151;
      margin-bottom: 6px;
    }

    input[type="email"],
    input[type="password"] {
      width: 100%;
      padding: 11px 14px;
      border: 1.5px solid #e5e7eb;
      border-radius: 8px;
      font-size: 14px;
      color: #111827;
      background: #f9fafb;
      transition: all 0.18s ease;
      font-family: inherit;
      outline: none;
    }
    input:focus {
      border-color: #3b5bdb;
      background: #fff;
      box-shadow: 0 0 0 3px rgba(59, 91, 219, 0.13);
    }
    input::placeholder { color: #9ca3af; }

    .forgot-row {
      display: flex;
      justify-content: flex-end;
      margin-bottom: 20px;
      margin-top: -8px;
    }
    .forgot-row a {
      font-size: 12.5px;
      color: #3b5bdb;
      text-decoration: none;
      font-weight: 500;
    }
    .forgot-row a:hover { text-decoration: underline; }

    .submit-btn {
      width: 100%;
      padding: 12px 16px;
      background: linear-gradient(135deg, #3b5bdb 0%, #1a237e 100%);
      color: white;
      border: none;
      border-radius: 8px;
      font-size: 15px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.18s ease;
      font-family: inherit;
      letter-spacing: 0.2px;
    }
    .submit-btn:hover {
      background: linear-gradient(135deg, #4c6ef5 0%, #283593 100%);
      box-shadow: 0 8px 24px rgba(59, 91, 219, 0.48);
      transform: translateY(-1px);
    }
    .submit-btn:active { transform: translateY(0); box-shadow: none; }

    .error-msg {
      background: #fef2f2;
      border: 1px solid #fecaca;
      border-radius: 8px;
      padding: 10px 14px;
      font-size: 13px;
      color: #dc2626;
      text-align: center;
      margin-bottom: 16px;
    }

    .signup-row {
      text-align: center;
      margin-top: 20px;
      font-size: 13px;
      color: #6b7280;
    }
    .signup-row a {
      color: #3b5bdb;
      text-decoration: none;
      font-weight: 600;
    }
    .signup-row a:hover { text-decoration: underline; }
  </style>
</head>
<body>

  <div class="bg">
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1920 1080"
         preserveAspectRatio="xMidYMid slice">
      <defs>
        <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%"   stop-color="#050c1e"/>
          <stop offset="45%"  stop-color="#09132e"/>
          <stop offset="100%" stop-color="#0e1c42"/>
        </linearGradient>
        <radialGradient id="centerGlow" cx="50%" cy="50%" r="55%">
          <stop offset="0%"   stop-color="#1a3a8a" stop-opacity="0.28"/>
          <stop offset="100%" stop-color="#060d22" stop-opacity="0"/>
        </radialGradient>
        <filter id="led" x="-80%" y="-80%" width="260%" height="260%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="2.5" result="b"/>
          <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
      </defs>
      <rect width="1920" height="1080" fill="url(#bgGrad)"/>
      <rect width="1920" height="1080" fill="url(#centerGlow)"/>
      <g opacity="0.035" stroke="#3a6fff" stroke-width="1">
        <line x1="0" y1="108"  x2="1920" y2="108"/>  <line x1="0" y1="216"  x2="1920" y2="216"/>
        <line x1="0" y1="324"  x2="1920" y2="324"/>  <line x1="0" y1="432"  x2="1920" y2="432"/>
        <line x1="0" y1="540"  x2="1920" y2="540"/>  <line x1="0" y1="648"  x2="1920" y2="648"/>
        <line x1="0" y1="756"  x2="1920" y2="756"/>  <line x1="0" y1="864"  x2="1920" y2="864"/>
        <line x1="192"  y1="0" x2="192"  y2="1080"/> <line x1="384"  y1="0" x2="384"  y2="1080"/>
        <line x1="576"  y1="0" x2="576"  y2="1080"/> <line x1="768"  y1="0" x2="768"  y2="1080"/>
        <line x1="960"  y1="0" x2="960"  y2="1080"/> <line x1="1152" y1="0" x2="1152" y2="1080"/>
        <line x1="1344" y1="0" x2="1344" y2="1080"/> <line x1="1536" y1="0" x2="1536" y2="1080"/>
        <line x1="1728" y1="0" x2="1728" y2="1080"/>
      </g>
      <g opacity="0.14" transform="translate(72,70)">
        <rect x="0" y="0" width="162" height="540" rx="7" fill="#091a56" stroke="#1e3fa0" stroke-width="2"/>
        <rect x="10" y="10" width="142" height="30" rx="4" fill="#0d2478"/>
        <text x="22" y="31" font-size="11" fill="#4a7cff" font-family="monospace" opacity="0.9">SRV-RACK-01</text>
        <rect x="10" y="48"  width="142" height="22" rx="2" fill="#0a1c60"/> <rect x="14" y="52"  width="95" height="14" rx="1" fill="#0e2370"/> <circle cx="142" cy="59"  r="4" fill="#00ee77" filter="url(#led)"/>
        <rect x="10" y="74"  width="142" height="22" rx="2" fill="#0a1c60"/> <rect x="14" y="78"  width="95" height="14" rx="1" fill="#0e2370"/> <circle cx="142" cy="85"  r="4" fill="#00ee77" filter="url(#led)"/>
        <rect x="10" y="100" width="142" height="22" rx="2" fill="#0a1c60"/> <rect x="14" y="104" width="95" height="14" rx="1" fill="#0e2370"/> <circle cx="142" cy="111" r="4" fill="#ffaa00" filter="url(#led)"/>
        <rect x="10" y="126" width="142" height="22" rx="2" fill="#0a1c60"/> <rect x="14" y="130" width="95" height="14" rx="1" fill="#0e2370"/> <circle cx="142" cy="137" r="4" fill="#00ee77" filter="url(#led)"/>
        <rect x="10" y="152" width="142" height="22" rx="2" fill="#0a1c60"/> <rect x="14" y="156" width="95" height="14" rx="1" fill="#0e2370"/> <circle cx="142" cy="163" r="4" fill="#00ee77" filter="url(#led)"/>
        <rect x="10" y="178" width="142" height="22" rx="2" fill="#0a1c60"/> <rect x="14" y="182" width="95" height="14" rx="1" fill="#0e2370"/> <circle cx="142" cy="189" r="4" fill="#ff3333" filter="url(#led)"/>
        <rect x="10" y="204" width="142" height="44" rx="2" fill="#070f40"/>
        <rect x="14" y="212" width="110" height="8" rx="1" fill="#0c1e6a"/> <circle cx="140" cy="216" r="3" fill="#00aaff" filter="url(#led)"/>
        <rect x="14" y="228" width="110" height="8" rx="1" fill="#0c1e6a"/> <circle cx="140" cy="232" r="3" fill="#00aaff" filter="url(#led)"/>
        <rect x="10" y="252" width="142" height="22" rx="2" fill="#0a1c60"/> <rect x="14" y="256" width="95" height="14" rx="1" fill="#0e2370"/> <circle cx="142" cy="263" r="4" fill="#00ee77" filter="url(#led)"/>
        <rect x="10" y="278" width="142" height="22" rx="2" fill="#0a1c60"/> <rect x="14" y="282" width="95" height="14" rx="1" fill="#0e2370"/> <circle cx="142" cy="289" r="4" fill="#00ee77" filter="url(#led)"/>
        <rect x="10" y="304" width="142" height="22" rx="2" fill="#0a1c60"/> <rect x="14" y="308" width="95" height="14" rx="1" fill="#0e2370"/> <circle cx="142" cy="315" r="4" fill="#ffaa00" filter="url(#led)"/>
        <rect x="10" y="330" width="142" height="22" rx="2" fill="#0a1c60"/> <rect x="14" y="334" width="95" height="14" rx="1" fill="#0e2370"/> <circle cx="142" cy="341" r="4" fill="#00ee77" filter="url(#led)"/>
        <rect x="10" y="356" width="142" height="22" rx="2" fill="#0a1c60"/> <rect x="14" y="360" width="95" height="14" rx="1" fill="#0e2370"/> <circle cx="142" cy="367" r="4" fill="#00ee77" filter="url(#led)"/>
        <rect x="10" y="382" width="142" height="22" rx="2" fill="#0a1c60"/> <rect x="14" y="386" width="95" height="14" rx="1" fill="#0e2370"/> <circle cx="142" cy="393" r="4" fill="#ff3333" filter="url(#led)"/>
        <rect x="10" y="408" width="142" height="22" rx="2" fill="#0a1c60"/> <rect x="14" y="412" width="95" height="14" rx="1" fill="#0e2370"/> <circle cx="142" cy="419" r="4" fill="#00ee77" filter="url(#led)"/>
        <rect x="10" y="498" width="142" height="30" rx="4" fill="#0d2478"/>
        <rect x="20" y="507" width="28" height="12" rx="2" fill="#091a56"/> <rect x="54" y="507" width="28" height="12" rx="2" fill="#091a56"/> <rect x="88" y="507" width="28" height="12" rx="2" fill="#091a56"/>
      </g>
      <g opacity="0.11" transform="translate(1650,140)">
        <rect x="0" y="0" width="152" height="490" rx="6" fill="#091a56" stroke="#1e3fa0" stroke-width="2"/>
        <rect x="10" y="10" width="132" height="28" rx="3" fill="#0d2478"/>
        <text x="18" y="29" font-size="11" fill="#4a7cff" font-family="monospace" opacity="0.9">SRV-RACK-02</text>
        <rect x="10" y="44" width="132" height="20" rx="2" fill="#0a1c60"/> <circle cx="132" cy="54"  r="3.5" fill="#00ee77" filter="url(#led)"/>
        <rect x="10" y="68" width="132" height="20" rx="2" fill="#0a1c60"/> <circle cx="132" cy="78"  r="3.5" fill="#00ee77" filter="url(#led)"/>
        <rect x="10" y="92" width="132" height="20" rx="2" fill="#0a1c60"/> <circle cx="132" cy="102" r="3.5" fill="#ff3333" filter="url(#led)"/>
        <rect x="10" y="116" width="132" height="20" rx="2" fill="#0a1c60"/> <circle cx="132" cy="126" r="3.5" fill="#00ee77" filter="url(#led)"/>
        <rect x="10" y="140" width="132" height="20" rx="2" fill="#0a1c60"/> <circle cx="132" cy="150" r="3.5" fill="#ffaa00" filter="url(#led)"/>
        <rect x="10" y="164" width="132" height="20" rx="2" fill="#0a1c60"/> <circle cx="132" cy="174" r="3.5" fill="#00ee77" filter="url(#led)"/>
        <rect x="10" y="188" width="132" height="40" rx="2" fill="#070f40"/>
        <circle cx="130" cy="200" r="3" fill="#00aaff" filter="url(#led)"/> <circle cx="130" cy="220" r="3" fill="#00aaff" filter="url(#led)"/>
        <rect x="10" y="232" width="132" height="20" rx="2" fill="#0a1c60"/> <circle cx="132" cy="242" r="3.5" fill="#00ee77" filter="url(#led)"/>
        <rect x="10" y="256" width="132" height="20" rx="2" fill="#0a1c60"/> <circle cx="132" cy="266" r="3.5" fill="#00ee77" filter="url(#led)"/>
        <rect x="10" y="280" width="132" height="20" rx="2" fill="#0a1c60"/> <circle cx="132" cy="290" r="3.5" fill="#ffaa00" filter="url(#led)"/>
        <rect x="10" y="304" width="132" height="20" rx="2" fill="#0a1c60"/> <circle cx="132" cy="314" r="3.5" fill="#00ee77" filter="url(#led)"/>
        <rect x="10" y="328" width="132" height="20" rx="2" fill="#0a1c60"/> <circle cx="132" cy="338" r="3.5" fill="#00ee77" filter="url(#led)"/>
        <rect x="10" y="450" width="132" height="28" rx="3" fill="#0d2478"/>
      </g>
      <g opacity="0.07" transform="translate(1838,380)">
        <rect x="0" y="0" width="90" height="360" rx="5" fill="#091a56" stroke="#1e3fa0" stroke-width="1.5"/>
        <rect x="7" y="18" width="76" height="18" rx="2" fill="#0a1c60"/> <circle cx="76" cy="27" r="3" fill="#00ee77"/>
        <rect x="7" y="40" width="76" height="18" rx="2" fill="#0a1c60"/> <circle cx="76" cy="49" r="3" fill="#00ee77"/>
        <rect x="7" y="62" width="76" height="18" rx="2" fill="#0a1c60"/> <circle cx="76" cy="71" r="3" fill="#ff3333"/>
        <rect x="7" y="84" width="76" height="18" rx="2" fill="#0a1c60"/> <circle cx="76" cy="93" r="3" fill="#00ee77"/>
        <rect x="7" y="106" width="76" height="36" rx="2" fill="#070f40"/>
        <circle cx="74" cy="118" r="2.5" fill="#00aaff"/> <circle cx="74" cy="134" r="2.5" fill="#00aaff"/>
        <rect x="7" y="146" width="76" height="18" rx="2" fill="#0a1c60"/> <circle cx="76" cy="155" r="3" fill="#00ee77"/>
        <rect x="7" y="168" width="76" height="18" rx="2" fill="#0a1c60"/> <circle cx="76" cy="177" r="3" fill="#ffaa00"/>
        <rect x="7" y="190" width="76" height="18" rx="2" fill="#0a1c60"/> <circle cx="76" cy="199" r="3" fill="#00ee77"/>
      </g>
      <g opacity="0.09" transform="translate(22,660)">
        <rect x="0" y="0" width="135" height="370" rx="6" fill="#091a56" stroke="#1e3fa0" stroke-width="1.5"/>
        <rect x="8" y="10" width="119" height="26" rx="3" fill="#0d2478"/>
        <text x="16" y="27" font-size="10" fill="#4a7cff" font-family="monospace" opacity="0.8">SRV-RACK-03</text>
        <rect x="8" y="42"  width="119" height="20" rx="2" fill="#0a1c60"/> <circle cx="118" cy="52"  r="3.5" fill="#00ee77" filter="url(#led)"/>
        <rect x="8" y="66"  width="119" height="20" rx="2" fill="#0a1c60"/> <circle cx="118" cy="76"  r="3.5" fill="#00ee77" filter="url(#led)"/>
        <rect x="8" y="90"  width="119" height="20" rx="2" fill="#0a1c60"/> <circle cx="118" cy="100" r="3.5" fill="#ff3333" filter="url(#led)"/>
        <rect x="8" y="114" width="119" height="20" rx="2" fill="#0a1c60"/> <circle cx="118" cy="124" r="3.5" fill="#00ee77" filter="url(#led)"/>
        <rect x="8" y="138" width="119" height="40" rx="2" fill="#070f40"/>
        <circle cx="116" cy="150" r="3" fill="#00aaff" filter="url(#led)"/> <circle cx="116" cy="168" r="3" fill="#00aaff" filter="url(#led)"/>
        <rect x="8" y="182" width="119" height="20" rx="2" fill="#0a1c60"/> <circle cx="118" cy="192" r="3.5" fill="#ffaa00" filter="url(#led)"/>
        <rect x="8" y="206" width="119" height="20" rx="2" fill="#0a1c60"/> <circle cx="118" cy="216" r="3.5" fill="#00ee77" filter="url(#led)"/>
        <rect x="8" y="320" width="119" height="28" rx="3" fill="#0d2478"/>
      </g>
      <g font-family="Georgia, 'Times New Roman', serif" fill="#5580ff">
        <text x="318"  y="118"  font-size="74" opacity="0.085">&#x3A3;</text>
        <text x="590"  y="96"   font-size="92" opacity="0.072">&#x222B;</text>
        <text x="808"  y="152"  font-size="66" opacity="0.09">&#x3C0;</text>
        <text x="1040" y="108"  font-size="82" opacity="0.074">&#x221A;</text>
        <text x="1268" y="138"  font-size="70" opacity="0.082">&#x221E;</text>
        <text x="1462" y="92"   font-size="76" opacity="0.072">&#x394;</text>
        <text x="248"  y="318"  font-size="62" opacity="0.075">&#x3B1;</text>
        <text x="438"  y="374"  font-size="72" opacity="0.09">&#x2202;</text>
        <text x="672"  y="292"  font-size="80" opacity="0.073">&#x2207;</text>
        <text x="918"  y="342"  font-size="66" opacity="0.083">&#x3BB;</text>
        <text x="1148" y="298"  font-size="74" opacity="0.072">&#x3B8;</text>
        <text x="1372" y="358"  font-size="70" opacity="0.09">&#x3C6;</text>
        <text x="1572" y="280"  font-size="82" opacity="0.074">&#x211D;</text>
        <text x="362"  y="558"  font-size="76" opacity="0.075">&#x3B2;</text>
        <text x="572"  y="522"  font-size="70" opacity="0.083">&#x2248;</text>
        <text x="772"  y="592"  font-size="74" opacity="0.073">&#x2208;</text>
        <text x="1010" y="542"  font-size="66" opacity="0.09">&#x2200;</text>
        <text x="1232" y="578"  font-size="72" opacity="0.075">&#x2203;</text>
        <text x="1472" y="524"  font-size="78" opacity="0.082">&#x2295;</text>
        <text x="1682" y="568"  font-size="70" opacity="0.073">&#x3B3;</text>
        <text x="284"  y="754"  font-size="70" opacity="0.083">&#xB1;</text>
        <text x="492"  y="728"  font-size="80" opacity="0.073">&#x2124;</text>
        <text x="722"  y="796"  font-size="72" opacity="0.082">&#x2115;</text>
        <text x="942"  y="748"  font-size="76" opacity="0.074">&#x2282;</text>
        <text x="1162" y="778"  font-size="70" opacity="0.09">&#x2229;</text>
        <text x="1382" y="742"  font-size="74" opacity="0.075">&#x2102;</text>
        <text x="1592" y="796"  font-size="82" opacity="0.082">&#x3A0;</text>
        <text x="344"  y="956"  font-size="72" opacity="0.075">&#x222A;</text>
        <text x="562"  y="984"  font-size="66" opacity="0.083">&#x2261;</text>
        <text x="792"  y="948"  font-size="76" opacity="0.073">&#x221D;</text>
        <text x="1072" y="976"  font-size="70" opacity="0.082">&#x3B4;</text>
        <text x="1292" y="958"  font-size="74" opacity="0.075">&#x3BC;</text>
        <text x="1512" y="986"  font-size="80" opacity="0.083">&#x3C3;</text>
        <text x="1742" y="952"  font-size="68" opacity="0.073">&#x3A9;</text>
      </g>
    </svg>
  </div>

  <div class="page">
    <div class="card">

      <div class="logo-mark">
        <div class="logo-inner">
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
            <path d="M12 2L2 7l10 5 10-5-10-5z" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M2 17l10 5 10-5"            stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M2 12l10 5 10-5"            stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </div>
      </div>

      <h1>Sign in to Your Account</h1>

      <!-- ── Google Sign-In — links to /auth/google to start OAuth flow ── -->
      <a href="/auth/google" class="google-btn">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="20" height="20">
          <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
          <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
          <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
          <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.34-8.16 2.34-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
        </svg>
        Continue with Google
      </a>

      <div class="divider">or</div>

      <form action="#" onsubmit="return false;">
        <div class="form-group">
          <label for="email">Email address</label>
          <input type="email" id="email" name="email"
                 placeholder="you@example.com" autocomplete="email"/>
        </div>
        <div class="form-group">
          <label for="password">Password</label>
          <input type="password" id="password" name="password"
                 placeholder="&bull;&bull;&bull;&bull;&bull;&bull;&bull;&bull;"
                 autocomplete="current-password"/>
        </div>
        <div class="forgot-row">
          <a href="#">Forgot password?</a>
        </div>
        <button class="submit-btn" type="submit">Sign In</button>
      </form>

      <div class="signup-row">
        Don&rsquo;t have an account? <a href="#">Sign up</a>
      </div>

    </div>
  </div>

</body>
</html>`;

router.get('/', (req, res) => {
  res.status(200).type('html').send(HTML);
});

module.exports = router;
