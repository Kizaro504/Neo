/* NEO GAMING — generated product illustrations (zero external assets) */
(function () {
  "use strict";

  let counter = 0;

  function defs(u, accent, accent2) {
    return `
      <defs>
        <linearGradient id="metal-${u}" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stop-color="#303b4d"/>
          <stop offset=".3" stop-color="#101722"/>
          <stop offset=".62" stop-color="#060b12"/>
          <stop offset="1" stop-color="#1b2432"/>
        </linearGradient>
        <linearGradient id="dark-${u}" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#111a27"/>
          <stop offset="1" stop-color="#04070c"/>
        </linearGradient>
        <linearGradient id="accent-${u}" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stop-color="${accent}"/>
          <stop offset="1" stop-color="${accent2}"/>
        </linearGradient>
        <linearGradient id="accentV-${u}" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0" stop-color="${accent}" stop-opacity=".05"/>
          <stop offset="1" stop-color="${accent}" stop-opacity=".9"/>
        </linearGradient>
        <radialGradient id="halo-${u}" cx=".5" cy=".5" r=".5">
          <stop offset="0" stop-color="${accent}" stop-opacity=".26"/>
          <stop offset=".55" stop-color="${accent}" stop-opacity=".07"/>
          <stop offset="1" stop-color="${accent}" stop-opacity="0"/>
        </radialGradient>
        <radialGradient id="halo2-${u}" cx=".5" cy=".5" r=".5">
          <stop offset="0" stop-color="${accent2}" stop-opacity=".24"/>
          <stop offset="1" stop-color="${accent2}" stop-opacity="0"/>
        </radialGradient>
        <filter id="glow-${u}" x="-100%" y="-100%" width="300%" height="300%">
          <feGaussianBlur stdDeviation="7" result="blur"/>
          <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
        <filter id="softGlow-${u}" x="-80%" y="-80%" width="260%" height="260%">
          <feGaussianBlur stdDeviation="14" result="blur"/>
          <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
        <pattern id="microgrid-${u}" width="26" height="26" patternUnits="userSpaceOnUse">
          <path d="M 26 0 L 0 0 0 26" fill="none" stroke="#ffffff" stroke-opacity=".045" stroke-width=".7"/>
        </pattern>
        <linearGradient id="glass-${u}" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stop-color="#ffffff" stop-opacity=".3"/>
          <stop offset=".35" stop-color="#ffffff" stop-opacity=".02"/>
          <stop offset=".7" stop-color="#ffffff" stop-opacity="0"/>
          <stop offset="1" stop-color="#ffffff" stop-opacity=".1"/>
        </linearGradient>
      </defs>`;
  }

  function artFrame(inner, u, accent, viewBox) {
    return `<svg viewBox="${viewBox}" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
      ${defs(u, accent, accent === "#ff007a" ? "#00f0ff" : "#ff007a")}
      ${inner}
    </svg>`;
  }

  function laptop(accent, accent2, label = "SCAR", panelLabel = "ROG // 18\" QHD OLED") {
    const u = "l" + ++counter;

    let keys = "";
    for (let r = 0; r < 5; r++) {
      for (let c = 0; c < 14; c++) {
        if (r === 4 && c > 2 && c < 10) continue;
        const x = 106 + c * 29;
        const y = 86 + r * 24;
        const isAccent = (r === 0 && c === 0) || (r === 2 && c > 2 && c < 6);
        keys += `<rect x="${x}" y="${y}" width="23" height="16" rx="2.5" fill="${isAccent ? accent : "#101722"}" fill-opacity="${isAccent ? ".72" : "1"}" stroke="${isAccent ? accent : "#394454"}" stroke-opacity="${isAccent ? ".8" : ".36"}" stroke-width=".6"/>`;
      }
    }

    return artFrame(`
      <ellipse cx="324" cy="365" rx="250" ry="36" fill="#000" opacity=".5"/>
      <ellipse cx="320" cy="354" rx="220" ry="25" fill="url(#halo-${u})" filter="url(#softGlow-${u})"/>

      <!-- lid / screen -->
      <path d="M72 56 L540 29 Q563 28 568 51 L602 268 Q605 284 587 287 L113 318 Q94 319 90 301 L57 78 Q54 59 72 56Z"
        fill="url(#metal-${u})" stroke="#536073" stroke-opacity=".65" stroke-width="1.2"/>
      <path d="M83 67 L533 42 Q547 41 550 54 L580 256 Q582 267 569 269 L122 298 Q109 299 107 286 L72 83 Q70 71 83 67Z"
        fill="#040810" stroke="${accent}" stroke-opacity=".3" stroke-width=".8"/>

      <clipPath id="screen-${u}">
        <path d="M90 73 L526 48 Q537 48 539 58 L567 251 Q569 260 559 261 L131 288 Q121 289 119 278 L80 86 Q79 76 90 73Z"/>
      </clipPath>
      <g clip-path="url(#screen-${u})">
        <rect x="70" y="35" width="520" height="275" fill="#050b15"/>
        <rect x="70" y="35" width="520" height="275" fill="url(#microgrid-${u})"/>
        <ellipse cx="340" cy="135" rx="230" ry="110" fill="url(#halo2-${u})"/>
        <path d="M70 215 Q230 150 395 188 T610 138" fill="none" stroke="${accent}" stroke-opacity=".38" stroke-width="1"/>
        <path d="M70 233 Q235 175 400 205 T610 160" fill="none" stroke="${accent2}" stroke-opacity=".2" stroke-width=".8"/>
        <path d="M84 92 L250 82" stroke="#fff" stroke-opacity=".15"/>
        <text x="94" y="100" fill="#c6e6ee" font-family="Consolas,monospace" font-size="7.5" letter-spacing="2.2">NEO OS // COMBAT MODE</text>
        <text x="94" y="158" fill="${accent}" font-family="Bahnschrift, sans-serif" font-size="54" font-weight="700" letter-spacing="-2">${label}</text>
        <text x="96" y="184" fill="#f4f8ff" font-family="Consolas,monospace" font-size="9" letter-spacing="4.5">NEXT-GEN  /  240FPS</text>
        <g opacity=".7">
          <rect x="430" y="106" width="92" height="6" fill="#ffffff" fill-opacity=".08"/>
          <rect x="430" y="106" width="67" height="6" fill="${accent}"/>
          <rect x="430" y="120" width="92" height="6" fill="#ffffff" fill-opacity=".08"/>
          <rect x="430" y="120" width="42" height="6" fill="${accent2}"/>
          <rect x="430" y="134" width="92" height="6" fill="#ffffff" fill-opacity=".08"/>
          <rect x="430" y="134" width="78" height="6" fill="#f4f8ff" fill-opacity=".35"/>
        </g>
        <g>
          <path d="M95 248 L120 239 L145 245 L170 223 L195 231 L220 210 L245 218 L270 200 L295 207 L320 189 L345 198 L370 181 L395 188 L420 172 L445 180 L470 164 L495 172 L520 158" fill="none" stroke="${accent}" stroke-width="1.4" stroke-opacity=".8"/>
          <path d="M95 248 L120 239 L145 245 L170 223 L195 231 L220 210 L245 218 L270 200 L295 207 L320 189 L345 198 L370 181 L395 188 L420 172 L445 180 L470 164 L495 172 L520 158 L520 255 L95 255Z" fill="url(#accentV-${u})" opacity=".18"/>
        </g>
        <g fill="${accent}">
          <circle cx="470" cy="82" r="2.4"/><circle cx="492" cy="86" r="1.4"/><circle cx="512" cy="79" r="1"/>
        </g>
        <path d="M70 35 L292 35 L150 310 L70 310Z" fill="url(#glass-${u})" opacity=".42"/>
      </g>

      <!-- bezel details -->
      <path d="M90 73 L526 48" stroke="#fff" stroke-opacity=".11"/>
      <circle cx="554" cy="55" r="2" fill="${accent}"/>
      <text x="119" y="290" fill="#7f8ea4" font-family="Consolas,monospace" font-size="6" letter-spacing="1.4">${panelLabel}</text>

      <!-- chassis / keyboard -->
      <path d="M113 318 L587 287 L624 345 Q632 357 615 362 L188 392 Q167 393 157 379 L100 327 Q94 319 113 318Z"
        fill="url(#metal-${u})" stroke="#485465" stroke-opacity=".6" stroke-width="1"/>
      <path d="M128 322 L581 292 L610 340 Q615 348 602 351 L191 378 Q176 379 169 368 L118 330 Q114 325 128 322Z"
        fill="#080d14" stroke="#384554" stroke-opacity=".55"/>
      <g transform="matrix(1 -0.105 0.09 1 8 218)" clip-path="url(#baseclip-${u})">
        <clipPath id="baseclip-${u}">
          <path d="M110 100 L586 80 L620 137 L190 157Z"/>
        </clipPath>
        <path d="M110 100 L586 80 L620 137 L190 157Z" fill="#0b111a"/>
        ${keys}
        <rect x="440" y="170" width="92" height="45" rx="4" fill="#0d1520" stroke="${accent}" stroke-opacity=".25"/>
      </g>

      <!-- trackpad + deck details -->
      <path d="M326 327 L480 315 L503 344 L345 358Z" fill="#111925" stroke="#4a5769" stroke-opacity=".5"/>
      <path d="M181 331 L299 323 L313 343 L191 352Z" fill="#0a1019" stroke="#3f4a5a" stroke-opacity=".45"/>
      <g fill="${accent}" opacity=".9">
        <rect x="158" y="346" width="25" height="2.2" rx="1"/>
        <rect x="190" y="345" width="8" height="2.2" rx="1" fill="${accent2}"/>
      </g>
      <g stroke="#566173" stroke-opacity=".4">
        <path d="M558 320 L594 316"/><path d="M560 327 L599 323"/><path d="M562 334 L603 330"/>
      </g>
      <g fill="${accent}">
        <circle cx="601" cy="356" r="2" filter="url(#glow-${u})"/>
        <circle cx="611" cy="356" r="1.3" fill="${accent2}"/>
      </g>
      <path d="M116 366 Q330 353 610 335" fill="none" stroke="${accent}" stroke-opacity=".5" stroke-width="1.4" filter="url(#glow-${u})"/>
      <path d="M128 361 Q335 347 596 332" fill="none" stroke="#fff" stroke-opacity=".14" stroke-width=".6"/>
      <text x="532" y="375" fill="#657389" font-family="Consolas,monospace" font-size="5.5" letter-spacing="1">NG-18 // 0.3MS</text>
    `, u, accent, "0 0 650 420");
  }

  function consolePS(accent, accent2) {
    const u = "p" + ++counter;
    return artFrame(`
      <ellipse cx="230" cy="371" rx="157" ry="23" fill="#000" opacity=".55"/>
      <ellipse cx="230" cy="362" rx="140" ry="22" fill="url(#halo-${u})" filter="url(#softGlow-${u})"/>
      <ellipse cx="230" cy="365" rx="118" ry="14" fill="none" stroke="${accent}" stroke-opacity=".22"/>

      <!-- base -->
      <path d="M154 348 L300 348 L327 362 Q334 370 320 373 L135 373 Q120 371 128 362Z" fill="url(#metal-${u})" stroke="#5a6474" stroke-opacity=".55"/>
      <path d="M173 347 L263 347 L267 354 L169 354Z" fill="#060a10"/>

      <!-- dark core -->
      <path d="M181 69 Q228 47 275 69 L272 343 L184 343Z" fill="url(#dark-${u})" stroke="#384251" stroke-opacity=".8"/>
      <path d="M190 77 Q228 61 266 77 L263 334 L193 334Z" fill="#05080e"/>
      <path d="M220 65 L220 345" stroke="${accent}" stroke-opacity=".4" stroke-width="1.2" filter="url(#glow-${u})"/>
      <path d="M233 64 L233 345" stroke="${accent2}" stroke-opacity=".28" stroke-width=".8"/>

      <!-- left white fin -->
      <path d="M180 61 C133 61 108 93 110 137 L126 305 C130 338 148 354 180 354 L186 354 L186 61Z"
        fill="url(#metal-${u})" stroke="#aab5c7" stroke-opacity=".5" stroke-width="1"/>
      <path d="M183 68 C144 68 119 96 121 137 L136 304 C140 332 154 346 180 347 L180 68Z"
        fill="#dbe3f0" fill-opacity=".09"/>
      <path d="M155 77 C139 83 130 101 132 126 L146 296" fill="none" stroke="#ffffff" stroke-opacity=".3" stroke-width="1.4"/>
      <path d="M126 148 L154 144 M127 158 L155 154 M128 168 L156 164" stroke="#7e8ca1" stroke-opacity=".45"/>

      <!-- right white fin -->
      <path d="M280 61 C327 61 352 93 350 137 L334 305 C330 338 312 354 280 354 L274 354 L274 61Z"
        fill="url(#metal-${u})" stroke="#aab5c7" stroke-opacity=".5" stroke-width="1"/>
      <path d="M277 68 C316 68 341 96 339 137 L324 304 C320 332 306 346 280 347 L280 68Z"
        fill="#dbe3f0" fill-opacity=".09"/>
      <path d="M305 77 C321 83 330 101 328 126 L314 296" fill="none" stroke="#ffffff" stroke-opacity=".3" stroke-width="1.4"/>
      <path d="M330 148 L304 144 M329 158 L303 154 M328 168 L302 164" stroke="#7e8ca1" stroke-opacity=".45"/>

      <!-- accents -->
      <path d="M201 88 L201 323" stroke="${accent}" stroke-opacity=".65" stroke-width="1.6" filter="url(#glow-${u})"/>
      <path d="M259 88 L259 323" stroke="${accent2}" stroke-opacity=".5" stroke-width="1" filter="url(#glow-${u})"/>
      <path d="M187 292 L272 292" stroke="#4d5b70" stroke-width=".8"/>
      <circle cx="230" cy="310" r="5" fill="none" stroke="${accent}" stroke-opacity=".5"/>
      <circle cx="230" cy="310" r="1.8" fill="${accent}"/>
      <rect x="198" y="327" width="14" height="3" rx="1.5" fill="#475367"/>
      <rect x="248" y="327" width="14" height="3" rx="1.5" fill="#475367"/>
      <text x="157" y="332" fill="#8c99ac" font-family="Consolas,monospace" font-size="5" letter-spacing="1.4" transform="rotate(-90 157 332)">PLAYSTATION</text>
      <text x="300" y="323" fill="${accent}" font-family="Consolas,monospace" font-size="6" letter-spacing="1" transform="rotate(-90 300 323)">PRO</text>

      <!-- floating controller -->
      <g transform="translate(311 176) rotate(13)">
        <path d="M18 17 Q55 4 84 19 L91 63 Q93 75 81 77 Q69 78 63 66 L57 53 L42 53 L35 66 Q29 78 17 77 Q5 75 7 63Z"
          fill="url(#metal-${u})" stroke="#b7c1d1" stroke-opacity=".7" stroke-width=".8"/>
        <path d="M30 20 Q55 11 75 23 L80 55 Q81 63 74 64 Q67 64 63 56 L56 43 L42 43 L35 56 Q31 64 24 64 Q17 63 18 55Z"
          fill="#0b111b" opacity=".65"/>
        <path d="M38 34 L58 34" stroke="${accent}" stroke-width="2" stroke-linecap="round" filter="url(#glow-${u})"/>
        <circle cx="24" cy="36" r="4.5" fill="#111a27" stroke="#7a8798" stroke-opacity=".55"/>
        <circle cx="72" cy="37" r="3" fill="#111a27" stroke="#7a8798" stroke-opacity=".55"/>
        <path d="M30 58 L36 58 M33 55 L33 61 M68 57 L72 57" stroke="#69768a" stroke-width=".8"/>
        <path d="M18 17 Q55 4 84 19" fill="none" stroke="${accent}" stroke-opacity=".28" stroke-width="1.2"/>
      </g>
      <g opacity=".5" stroke="${accent}" stroke-width=".8">
        <path d="M346 131 L362 124"/><path d="M353 144 L372 136"/><path d="M356 158 L368 153"/>
      </g>
      <circle cx="341" cy="116" r="2.2" fill="${accent2}" filter="url(#glow-${u})"/>
      <circle cx="360" cy="158" r="1.4" fill="${accent}"/>
    `, u, accent, "0 0 460 420");
  }

  function consoleXbox(accent, accent2) {
    const u = "x" + ++counter;
    let spokes = "";
    for (let i = 0; i < 16; i++) {
      const angle = (i / 16) * Math.PI * 2;
      const x1 = 230 + Math.cos(angle) * 23;
      const y1 = 95 + Math.sin(angle) * 23;
      const x2 = 230 + Math.cos(angle) * 50;
      const y2 = 95 + Math.sin(angle) * 50;
      spokes += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${accent}" stroke-opacity=".27" stroke-width="1"/>`;
    }
    return artFrame(`
      <ellipse cx="230" cy="369" rx="145" ry="23" fill="#000" opacity=".58"/>
      <ellipse cx="230" cy="360" rx="125" ry="21" fill="url(#halo-${u})" filter="url(#softGlow-${u})"/>
      <ellipse cx="230" cy="362" rx="105" ry="13" fill="none" stroke="${accent}" stroke-opacity=".24"/>

      <!-- stand -->
      <path d="M164 340 L298 340 L317 361 Q321 368 307 369 L150 369 Q136 367 145 358Z" fill="url(#metal-${u})" stroke="#4a5667" stroke-opacity=".5"/>
      <path d="M182 340 L278 340 L282 349 L178 349Z" fill="#05090f"/>

      <!-- body -->
      <rect x="143" y="55" width="174" height="290" rx="11" fill="url(#metal-${u})" stroke="#4e5b6d" stroke-opacity=".6"/>
      <rect x="151" y="62" width="158" height="276" rx="8" fill="#070b11"/>
      <rect x="159" y="70" width="142" height="260" rx="5" fill="url(#dark-${u})" stroke="#26313f" stroke-opacity=".8"/>
      <rect x="154" y="63" width="152" height="1" fill="#fff" opacity=".12"/>
      <path d="M159 247 L301 247" stroke="#303c4b" stroke-width=".7"/>

      <!-- top vent -->
      <g transform="translate(0 0)">
        <ellipse cx="230" cy="95" rx="67" ry="20" fill="#05090e" stroke="${accent}" stroke-opacity=".28" stroke-width="1"/>
        <ellipse cx="230" cy="95" rx="54" ry="15" fill="none" stroke="${accent}" stroke-opacity=".22" stroke-width=".8"/>
        ${spokes}
        <ellipse cx="230" cy="95" rx="16" ry="5" fill="${accent}" fill-opacity=".13" stroke="${accent}" stroke-opacity=".44" stroke-width=".8"/>
        <ellipse cx="230" cy="95" rx="5" ry="1.8" fill="${accent}" filter="url(#glow-${u})"/>
      </g>

      <!-- logo + details -->
      <g transform="translate(230 214)" opacity=".85">
        <circle r="22" fill="none" stroke="${accent}" stroke-opacity=".4" stroke-width="1"/>
        <path d="M-13 -10 C-6 -1 -6 1 -13 10 M13 -10 C6 -1 6 1 13 10" fill="none" stroke="${accent}" stroke-width="2.4" stroke-linecap="round" filter="url(#glow-${u})"/>
        <path d="M-4 -15 C0 -6 0 6 -4 15 M4 -15 C0 -6 0 6 4 15" fill="none" stroke="#f4f8ff" stroke-opacity=".55" stroke-width=".8"/>
      </g>
      <text x="230" y="264" fill="#f4f8ff" text-anchor="middle" font-family="Consolas,monospace" font-size="7" letter-spacing="4">XBOX</text>
      <text x="230" y="277" fill="#6c7a8f" text-anchor="middle" font-family="Consolas,monospace" font-size="5" letter-spacing="1.4">SERIES X · 2TB</text>
      <rect x="204" y="301" width="52" height="5" rx="2.5" fill="#111a25" stroke="#3a4758" stroke-opacity=".6"/>
      <circle cx="230" cy="324" r="2" fill="${accent}" filter="url(#glow-${u})"/>
      <path d="M168 323 L188 323 M272 323 L292 323" stroke="#3c4859" stroke-width="1"/>

      <!-- light trails -->
      <g opacity=".55" stroke="${accent}" stroke-width=".8">
        <path d="M324 155 L356 149"/><path d="M327 171 L366 164"/><path d="M325 187 L351 182"/>
      </g>
      <circle cx="344" cy="137" r="2" fill="${accent2}" filter="url(#glow-${u})"/>
      <circle cx="363" cy="183" r="1.2" fill="${accent}"/>
      <g fill="${accent}">
        <circle cx="107" cy="211" r="1.5"/><circle cx="93" cy="242" r="1"/><circle cx="112" cy="274" r="1.7"/>
      </g>
    `, u, accent, "0 0 460 420");
  }

  function gpu(accent, accent2, nebula, label = "RTX 5090") {
    const u = (nebula ? "n" : "g") + ++counter;
    let fans = "";
    const centers = nebula ? [190, 330, 470] : [178, 306, 434];
    centers.forEach((cx, idx) => {
      fans += `<g transform="translate(${cx} 176)">
        <circle r="58" fill="#05090f" stroke="#303b4a" stroke-width="1.2"/>
        <circle r="55" fill="url(#dark-${u})" stroke="${idx === 1 ? accent2 : accent}" stroke-opacity=".38" stroke-width="1"/>
        <circle r="47" fill="none" stroke="#ffffff" stroke-opacity=".06"/>`;
      for (let b = 0; b < 9; b++) {
        fans += `<path d="M0 -8 C18 -36 44 -35 49 -16 C37 3 17 7 0 -8Z" fill="#141d29" stroke="#536173" stroke-opacity=".45" stroke-width=".6" transform="rotate(${b * 40})"/>`;
      }
      fans += `<circle r="14" fill="#0a111a" stroke="${idx === 1 ? accent2 : accent}" stroke-opacity=".5"/>
        <circle r="5" fill="${idx === 1 ? accent2 : accent}" fill-opacity=".45" filter="url(#glow-${u})"/>
        <circle r="1.5" fill="#fff"/>
      </g>`;
    });

    const bodyGradient = nebula ? "url(#accent-${u})" : "url(#metal-${u})";
    return artFrame(`
      <ellipse cx="310" cy="265" rx="235" ry="25" fill="#000" opacity=".55"/>
      <ellipse cx="310" cy="257" rx="192" ry="18" fill="url(#halo-${u})" filter="url(#softGlow-${u})"/>

      <!-- backplate -->
      <path d="M68 66 L558 47 Q586 46 592 72 L598 117 L52 142 L52 91 Q50 68 68 66Z"
        fill="${bodyGradient}" stroke="#4a5769" stroke-opacity=".65" stroke-width="1.2"/>
      <path d="M69 74 L556 55 Q573 54 577 71 L581 105 L60 129 L60 91 Q60 76 69 74Z"
        fill="#080d15" opacity="${nebula ? ".58" : ".45"}"/>
      <path d="M62 125 L583 101" stroke="${accent}" stroke-opacity=".45" stroke-width="1" filter="url(#glow-${u})"/>

      <!-- shroud -->
      <path d="M45 138 L592 114 Q611 114 614 134 L613 211 Q612 229 592 232 L63 259 Q45 261 43 242 L39 157 Q38 139 45 138Z"
        fill="url(#metal-${u})" stroke="#596679" stroke-opacity=".7" stroke-width="1.2"/>
      <path d="M56 145 L580 122 Q589 122 591 131 L591 208 Q591 218 579 220 L70 244 Q59 245 58 235 L53 157 Q52 149 56 145Z"
        fill="#090e16" stroke="#283443" stroke-opacity=".8"/>
      ${fans}
      <path d="M54 236 L591 211" stroke="${accent}" stroke-opacity=".65" stroke-width="1.3" filter="url(#glow-${u})"/>
      <path d="M48 139 L592 115" stroke="#ffffff" stroke-opacity=".14" stroke-width=".7"/>
      <text x="77" y="117" fill="${accent}" font-family="Consolas,monospace" font-size="7" letter-spacing="2.2">${nebula ? "NEBULA // 001" : "GEFORCE RTX"}</text>
      <text x="77" y="101" fill="#f4f8ff" font-family="Bahnschrift,sans-serif" font-size="15" font-weight="700" letter-spacing="1.3">${nebula ? "RTX 5090 NEBULA" : label}</text>
      <text x="500" y="106" fill="#7b899d" font-family="Consolas,monospace" font-size="5" letter-spacing="1">32GB GDDR7</text>

      <!-- io / power -->
      <path d="M592 130 L611 129 L611 201 L592 205Z" fill="#0b111a" stroke="#354252" stroke-opacity=".7"/>
      <g stroke="#5a687b" stroke-width=".8">
        <path d="M598 142 L605 142"/><path d="M598 151 L605 151"/><path d="M598 160 L605 160"/>
      </g>
      <rect x="516" y="83" width="34" height="11" rx="2" fill="#111923" stroke="#4a5769"/>
      <text x="524" y="91" fill="#8b98aa" font-family="Consolas,monospace" font-size="4">12V-2X6</text>
      <g opacity=".9">
        <circle cx="600" cy="225" r="2.4" fill="${accent2}" filter="url(#glow-${u})"/>
        <path d="M42 221 L18 225" stroke="${accent}" stroke-opacity=".35"/>
      </g>
      ${nebula ? `
        <g filter="url(#glow-${u})">
          <path d="M316 56 C292 25 344 15 333 43 C377 26 383 61 342 67Z" fill="none" stroke="${accent2}" stroke-opacity=".8" stroke-width="2.2"/>
          <path d="M469 52 C490 25 520 47 492 64 C531 57 531 88 494 85" fill="none" stroke="${accent}" stroke-opacity=".5" stroke-width="1.2"/>
        </g>
        <g fill="#ffffff">
          <circle cx="126" cy="56" r="1.2"/><circle cx="246" cy="39" r=".8"/><circle cx="380" cy="49" r="1.6"/><circle cx="522" cy="33" r=".9"/><circle cx="560" cy="63" r="1.2"/>
        </g>
        <text x="531" y="245" fill="${accent2}" font-family="Consolas,monospace" font-size="5" letter-spacing="1.3" text-anchor="end">CUSTOM LOOP // NEO LABS</text>
      ` : ""}
    `, u, accent, "0 0 640 300");
  }

  function monitor(accent, accent2) {
    const u = "m" + ++counter;
    return artFrame(`
      <ellipse cx="300" cy="344" rx="180" ry="19" fill="#000" opacity=".55"/>
      <ellipse cx="300" cy="331" rx="140" ry="20" fill="url(#halo-${u})" filter="url(#softGlow-${u})"/>

      <!-- stand -->
      <path d="M278 236 L324 236 L329 301 L271 301Z" fill="url(#metal-${u})" stroke="#536074" stroke-opacity=".55"/>
      <path d="M242 311 L358 311 Q379 312 379 324 Q379 336 358 337 L244 337 Q221 336 221 324 Q221 312 242 311Z" fill="url(#metal-${u})" stroke="#586577" stroke-opacity=".6"/>
      <path d="M254 318 L350 318" stroke="${accent}" stroke-opacity=".33"/>
      <circle cx="300" cy="258" r="5" fill="none" stroke="${accent}" stroke-opacity=".4"/>
      <circle cx="300" cy="258" r="1.5" fill="${accent}"/>

      <!-- screen -->
      <path d="M45 47 Q45 33 60 32 L541 27 Q557 27 558 42 L562 219 Q562 233 547 234 L60 245 Q44 245 43 230Z"
        fill="url(#metal-${u})" stroke="#677386" stroke-opacity=".65" stroke-width="1.2"/>
      <path d="M56 50 Q56 42 67 42 L532 37 Q543 37 544 47 L547 216 Q547 224 537 225 L66 235 Q55 235 55 226Z"
        fill="#03060b" stroke="${accent}" stroke-opacity=".22"/>
      <clipPath id="mscreen-${u}">
        <path d="M63 51 L537 46 L541 218 L67 227Z"/>
      </clipPath>
      <g clip-path="url(#mscreen-${u})">
        <rect x="60" y="38" width="490" height="198" fill="#050a12"/>
        <rect x="60" y="38" width="490" height="198" fill="url(#microgrid-${u})"/>
        <ellipse cx="330" cy="155" rx="250" ry="95" fill="url(#halo2-${u})"/>
        <path d="M60 154 L130 146 L168 122 L201 132 L241 98 L272 120 L313 80 L352 110 L390 74 L430 102 L476 82 L526 105 L550 96 L550 240 L60 240Z" fill="#0a1520" opacity=".85"/>
        <path d="M60 168 L137 159 L180 139 L221 150 L264 125 L302 143 L344 112 L386 137 L430 120 L480 142 L550 128" fill="none" stroke="${accent}" stroke-width="1.3" stroke-opacity=".75"/>
        <path d="M60 177 L137 168 L180 148 L221 159 L264 134 L302 152 L344 121 L386 146 L430 129 L480 151 L550 137" fill="none" stroke="${accent2}" stroke-width=".8" stroke-opacity=".45"/>
        <g opacity=".6" fill="${accent}">
          <rect x="107" y="174" width="4" height="40"/><rect x="115" y="165" width="2" height="49"/>
          <rect x="450" y="159" width="3" height="53"/><rect x="458" y="173" width="2" height="39"/>
          <rect x="342" y="168" width="2" height="44"/>
        </g>
        <path d="M300 212 L340 196 L384 211 L446 198 L500 224" fill="none" stroke="${accent}" stroke-opacity=".2"/>
        <text x="82" y="78" fill="#f4f8ff" font-family="Consolas,monospace" font-size="7" letter-spacing="2">ROG SWIFT OLED</text>
        <text x="82" y="93" fill="${accent}" font-family="Consolas,monospace" font-size="5" letter-spacing="1.5">27" QHD // 240HZ // 0.03MS</text>
        <g transform="translate(467 70)">
          <text fill="${accent}" font-family="Bahnschrift,sans-serif" font-size="22" font-weight="700" text-anchor="middle">240</text>
          <text y="10" fill="#7a8799" font-family="Consolas,monospace" font-size="4.5" text-anchor="middle">FPS / OLED</text>
        </g>
        <path d="M60 38 L250 38 L140 240 L60 240Z" fill="url(#glass-${u})" opacity=".3"/>
      </g>
      <path d="M51 233 L552 223" stroke="${accent}" stroke-opacity=".65" stroke-width="1.1" filter="url(#glow-${u})"/>
      <circle cx="535" cy="234" r="1.6" fill="${accent}"/>
      <text x="74" y="222" fill="#6b798e" font-family="Consolas,monospace" font-size="4.5" letter-spacing="1">NG-27AQDP</text>
      <path d="M51 38 L537 33" stroke="#fff" stroke-opacity=".12"/>
    `, u, accent, "0 0 600 360");
  }

  function keyboard(accent, accent2) {
    const u = "k" + ++counter;
    const keyRows = [
      { y: 107, n: 14, w: 29 },
      { y: 132, n: 14, w: 29 },
      { y: 157, n: 14, w: 29 },
      { y: 182, n: 13, w: 29 },
      { y: 207, n: 11, w: 34 },
    ];
    let keys = "";
    keyRows.forEach((row, r) => {
      for (let c = 0; c < row.n; c++) {
        const x = 108 + c * row.w;
        const highlight =
          (r === 0 && (c === 0 || c === 13)) ||
          (r === 1 && c > 2 && c < 6);
        keys += `<rect x="${x}" y="${row.y}" width="${row.w - 4}" height="20" rx="3"
          fill="${highlight ? accent : "#0d131d"}"
          fill-opacity="${highlight ? ".72" : "1"}"
          stroke="${highlight ? accent : "#34404f"}"
          stroke-opacity="${highlight ? ".8" : ".42"}"
          stroke-width=".7"/>`;
        if (highlight) {
          keys += `<rect x="${x + 3}" y="${row.y + 14}" width="${row.w - 10}" height="2" fill="#fff" fill-opacity=".22"/>`;
        }
      }
    });

    return artFrame(`
      <ellipse cx="295" cy="247" rx="232" ry="22" fill="#000" opacity=".55"/>
      <ellipse cx="295" cy="238" rx="192" ry="22" fill="url(#halo-${u})" filter="url(#softGlow-${u})"/>

      <!-- base -->
      <path d="M55 92 L519 76 Q536 76 541 91 L557 214 Q560 231 541 234 L78 252 Q59 253 55 237 L42 109 Q40 95 55 92Z"
        fill="url(#metal-${u})" stroke="#556276" stroke-opacity=".65" stroke-width="1.2"/>
      <path d="M68 103 L514 88 Q525 88 528 98 L542 208 Q544 218 532 220 L83 237 Q71 238 69 227 L54 118 Q53 106 68 103Z"
        fill="#070c13" stroke="#2b3645" stroke-opacity=".8"/>
      <path d="M91 94 L522 78" stroke="#fff" stroke-opacity=".16"/>

      ${keys}

      <!-- dial + oled -->
      <g transform="translate(501 65)">
        <circle r="13" fill="#0b111b" stroke="${accent}" stroke-opacity=".5" stroke-width="1"/>
        <circle r="7" fill="none" stroke="${accent}" stroke-opacity=".4" stroke-dasharray="2 2"/>
        <path d="M0 -11 L0 -6" stroke="${accent}" stroke-width="1.4" filter="url(#glow-${u})"/>
      </g>
      <g transform="translate(446 58)">
        <rect width="38" height="19" rx="2" fill="#070b11" stroke="${accent2}" stroke-opacity=".42"/>
        <text x="19" y="12" fill="${accent}" text-anchor="middle" font-family="Consolas,monospace" font-size="6">8K</text>
      </g>

      <!-- edge glow -->
      <path d="M61 238 L544 220" stroke="${accent}" stroke-opacity=".7" stroke-width="1.4" filter="url(#glow-${u})"/>
      <path d="M59 244 L545 226" stroke="${accent2}" stroke-opacity=".3" stroke-width=".8"/>
      <path d="M81 230 L93 230 M103 230 L115 230 M125 230 L137 230" stroke="#5b697c" stroke-opacity=".5"/>
      <text x="91" y="228" fill="#657389" font-family="Consolas,monospace" font-size="4.6" letter-spacing="1.2">RAZER // HALL EFFECT</text>
      <g fill="${accent}" opacity=".55">
        <circle cx="89" cy="91" r="1.2"/><circle cx="510" cy="84" r="1.1"/><circle cx="545" cy="144" r="1"/>
      </g>
    `, u, accent, "0 0 580 280");
  }

  function headset(accent, accent2) {
    const u = "h" + ++counter;
    return artFrame(`
      <ellipse cx="260" cy="350" rx="160" ry="21" fill="#000" opacity=".55"/>
      <ellipse cx="260" cy="338" rx="126" ry="20" fill="url(#halo-${u})" filter="url(#softGlow-${u})"/>

      <!-- headband -->
      <path d="M128 208 C120 82 202 42 260 42 C328 42 401 84 394 208" fill="none" stroke="url(#metal-${u})" stroke-width="29" stroke-linecap="round"/>
      <path d="M130 201 C126 94 201 55 260 55 C323 55 395 95 391 201" fill="none" stroke="#080d15" stroke-width="22" stroke-linecap="round"/>
      <path d="M140 172 C137 97 200 66 260 66 C322 66 383 99 380 172" fill="none" stroke="${accent}" stroke-opacity=".23" stroke-width="1.2"/>
      <path d="M158 90 C198 61 247 54 290 68" fill="none" stroke="#ffffff" stroke-opacity=".16" stroke-width="2"/>

      <!-- left cup -->
      <g transform="rotate(-8 156 253)">
        <rect x="104" y="191" width="93" height="128" rx="39" fill="url(#metal-${u})" stroke="#617083" stroke-opacity=".55"/>
        <rect x="115" y="203" width="72" height="102" rx="31" fill="#080d15" stroke="${accent}" stroke-opacity=".32"/>
        <ellipse cx="151" cy="254" rx="29" ry="36" fill="#0d1621" stroke="#445366" stroke-opacity=".6"/>
        <ellipse cx="151" cy="254" rx="17" ry="23" fill="none" stroke="${accent}" stroke-opacity=".55" stroke-width="1.4" filter="url(#glow-${u})"/>
        <circle cx="151" cy="254" r="5" fill="${accent}" fill-opacity=".45" filter="url(#glow-${u})"/>
        <path d="M121 221 Q151 206 181 221" fill="none" stroke="#ffffff" stroke-opacity=".12" stroke-width="1"/>
      </g>

      <!-- right cup -->
      <g transform="rotate(8 366 253)">
        <rect x="323" y="191" width="93" height="128" rx="39" fill="url(#metal-${u})" stroke="#617083" stroke-opacity=".55"/>
        <rect x="333" y="203" width="72" height="102" rx="31" fill="#080d15" stroke="${accent2}" stroke-opacity=".3"/>
        <ellipse cx="369" cy="254" rx="29" ry="36" fill="#0d1621" stroke="#445366" stroke-opacity=".6"/>
        <ellipse cx="369" cy="254" rx="17" ry="23" fill="none" stroke="${accent2}" stroke-opacity=".42" stroke-width="1.2"/>
        <circle cx="369" cy="254" r="5" fill="${accent2}" fill-opacity=".4"/>
        <rect x="349" y="218" width="40" height="4" rx="2" fill="${accent2}" fill-opacity=".3"/>
      </g>

      <!-- mic -->
      <path d="M124 276 C118 327 150 351 202 349" fill="none" stroke="#222d3b" stroke-width="6" stroke-linecap="round"/>
      <path d="M124 276 C118 327 150 351 202 349" fill="none" stroke="${accent}" stroke-opacity=".25" stroke-width="1.5"/>
      <rect x="196" y="341" width="34" height="15" rx="7" fill="#0a111a" stroke="${accent}" stroke-opacity=".42" transform="rotate(4 213 348)"/>
      <circle cx="227" cy="349" r="2.4" fill="${accent}" filter="url(#glow-${u})"/>

      <!-- accents -->
      <g stroke="${accent}" stroke-opacity=".3" stroke-width=".8">
        <path d="M87 179 L71 175"/><path d="M91 191 L73 187"/><path d="M432 176 L450 170"/><path d="M430 190 L452 184"/>
      </g>
      <circle cx="74" cy="207" r="2" fill="${accent}" filter="url(#glow-${u})"/>
      <circle cx="447" cy="204" r="1.4" fill="${accent2}"/>
      <text x="260" y="370" fill="#657389" text-anchor="middle" font-family="Consolas,monospace" font-size="5" letter-spacing="2">ARCTIS NOVA // NEO</text>
    `, u, accent, "0 0 520 400");
  }

  function vr(accent, accent2) {
    const u = "v" + ++counter;
    return artFrame(`
      <ellipse cx="280" cy="292" rx="190" ry="22" fill="#000" opacity=".5"/>
      <ellipse cx="280" cy="282" rx="150" ry="22" fill="url(#halo-${u})" filter="url(#softGlow-${u})"/>

      <!-- rear strap -->
      <path d="M146 142 C104 140 86 169 97 199 C107 227 147 236 177 222" fill="none" stroke="#1d2836" stroke-width="13"/>
      <path d="M414 142 C456 140 474 169 463 199 C453 227 413 236 383 222" fill="none" stroke="#1d2836" stroke-width="13"/>
      <path d="M146 142 C104 140 86 169 97 199" fill="none" stroke="${accent}" stroke-opacity=".25" stroke-width="1.4"/>
      <path d="M414 142 C456 140 474 169 463 199" fill="none" stroke="${accent2}" stroke-opacity=".22" stroke-width="1.2"/>
      <path d="M205 103 C180 92 160 112 174 132" fill="none" stroke="#ffffff" stroke-opacity=".13" stroke-width="7"/>
      <path d="M355 103 C380 92 400 112 386 132" fill="none" stroke="#ffffff" stroke-opacity=".13" stroke-width="7"/>

      <!-- headset body -->
      <path d="M137 103 Q137 68 172 68 L388 68 Q423 68 423 103 L416 188 Q414 222 380 222 L326 222 Q300 222 280 246 Q260 222 234 222 L180 222 Q146 222 144 188Z"
        fill="url(#metal-${u})" stroke="#677487" stroke-opacity=".65" stroke-width="1.2"/>
      <path d="M150 108 Q150 82 177 82 L383 82 Q410 82 410 108 L404 185 Q403 208 381 208 L326 208 Q295 208 280 228 Q265 208 234 208 L179 208 Q157 208 156 185Z"
        fill="#070c13" stroke="#344253" stroke-opacity=".8"/>
      <path d="M150 106 Q211 83 280 92 Q349 83 410 106" fill="none" stroke="#ffffff" stroke-opacity=".12" stroke-width="1"/>

      <!-- faceplate / lenses -->
      <path d="M169 114 Q169 100 185 100 L242 100 Q257 100 257 116 L255 166 Q254 184 236 184 L185 184 Q169 184 169 166Z"
        fill="#0b1420" stroke="${accent}" stroke-opacity=".36"/>
      <path d="M303 114 Q303 100 319 100 L376 100 Q391 100 392 116 L392 166 Q392 184 375 184 L324 184 Q306 184 305 166Z"
        fill="#0b1420" stroke="${accent2}" stroke-opacity=".32"/>
      <path d="M178 113 Q178 108 186 108 L237 108 Q247 108 247 118 L245 165 Q244 176 233 176 L186 176 Q178 176 178 164Z"
        fill="#05090f" stroke="${accent}" stroke-opacity=".24"/>
      <path d="M314 113 Q314 108 322 108 L373 108 Q382 108 383 118 L383 165 Q383 176 374 176 L326 176 Q316 176 315 164Z"
        fill="#05090f" stroke="${accent2}" stroke-opacity=".22"/>
      <ellipse cx="213" cy="143" rx="19" ry="18" fill="url(#halo-${u})" stroke="${accent}" stroke-opacity=".32"/>
      <ellipse cx="348" cy="143" rx="19" ry="18" fill="url(#halo2-${u})" stroke="${accent2}" stroke-opacity=".28"/>
      <path d="M188 127 Q202 118 222 121" fill="none" stroke="#ffffff" stroke-opacity=".17" stroke-width="1.2"/>
      <path d="M322 126 Q338 118 356 121" fill="none" stroke="#ffffff" stroke-opacity=".13" stroke-width="1"/>

      <!-- sensors -->
      <g fill="${accent}">
        <circle cx="178" cy="89" r="2" filter="url(#glow-${u})"/><circle cx="382" cy="89" r="1.6"/>
        <circle cx="280" cy="84" r="1.1" fill="${accent2}"/>
      </g>
      <path d="M263 100 L297 100" stroke="#657389" stroke-opacity=".4"/>
      <text x="280" y="206" fill="${accent}" text-anchor="middle" font-family="Consolas,monospace" font-size="5" letter-spacing="1.8">MIXED REALITY // 512</text>

      <!-- controllers -->
      <g transform="translate(100 248) rotate(-12)" opacity=".8">
        <ellipse cx="28" cy="17" rx="30" ry="17" fill="none" stroke="${accent}" stroke-opacity=".38" stroke-width="2"/>
        <path d="M14 12 Q28 3 43 12 L41 35 Q33 43 28 33 Q23 43 15 35Z" fill="#0a111a" stroke="#4e5b6d" stroke-width=".7"/>
        <circle cx="28" cy="22" r="3" fill="${accent}" fill-opacity=".5"/>
      </g>
      <g transform="translate(436 248) rotate(12)" opacity=".8">
        <ellipse cx="28" cy="17" rx="30" ry="17" fill="none" stroke="${accent2}" stroke-opacity=".33" stroke-width="2"/>
        <path d="M14 12 Q28 3 43 12 L41 35 Q33 43 28 33 Q23 43 15 35Z" fill="#0a111a" stroke="#4e5b6d" stroke-width=".7"/>
        <circle cx="28" cy="22" r="3" fill="${accent2}" fill-opacity=".45"/>
      </g>

      <g opacity=".5" stroke="${accent}" stroke-width=".7">
        <path d="M54 91 L35 84"/><path d="M50 104 L29 98"/><path d="M506 92 L525 84"/><path d="M510 105 L531 98"/>
      </g>
      <circle cx="35" cy="126" r="1.8" fill="${accent}"/>
      <circle cx="527" cy="132" r="1.3" fill="${accent2}"/>
    `, u, accent, "0 0 560 320");
  }

  function productArt(type, accent, accent2) {
    accent = accent || "#00f0ff";
    accent2 = accent2 || "#ff007a";
    switch (type) {
      case "laptop":
        return laptop(accent, accent2);
      case "laptop-blade":
        return laptop(accent, accent2, "BLADE", "RAZER // 16\" OLED");
      case "console-ps":
        return consolePS(accent, accent2);
      case "console-xbox":
        return consoleXbox(accent, accent2);
      case "gpu":
        return gpu(accent, accent2, false);
      case "gpu5080":
        return gpu(accent, accent2, false, "RTX 5080");
      case "gpuNebula":
        return gpu("#ff007a", "#00f0ff", true);
      case "monitor":
        return monitor(accent, accent2);
      case "keyboard":
        return keyboard(accent, accent2);
      case "headset":
        return headset(accent, accent2);
      case "vr":
        return vr(accent, accent2);
      default:
        return gpu(accent, accent2, false);
    }
  }

  function artMarkup(type, accent, accent2, className) {
    return `<div class="product-art ${className || ""}" aria-hidden="true">${productArt(type, accent, accent2)}</div>`;
  }

  window.HXArt = { productArt, artMarkup };
})();
