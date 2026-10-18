import http from "http";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 3300;
const HOST = "0.0.0.0";
const BRAIN_DIR = "C:\\Users\\DANIEL\\.gemini\\antigravity\\brain\\016526e4-f0c4-4b96-b8dd-6a9bdccd18e8";
const PUBLIC_DIR = path.resolve(__dirname, "../public");
const OUT_DIR = path.resolve(__dirname, "../out");

const IMAGES = {
  // New Keynote-Grade Upgraded Stills
  "act5-live": path.join(BRAIN_DIR, "preview-act5-livegraph.png"),
  "act6-keynote": path.join(BRAIN_DIR, "preview-act6-keynote.png"),
  "vertical-clean": path.join(BRAIN_DIR, "preview-vertical-clean.png"),

  // Real Authentic Project Screenshots
  "table": path.resolve(PUBLIC_DIR, "images/landing/table-1938.webp"),
  "hero": path.resolve(PUBLIC_DIR, "images/landing/hero-app-1575.webp"),
  "exam": path.resolve(PUBLIC_DIR, "images/landing/exam-2226.webp"),
  "graph": path.resolve(PUBLIC_DIR, "images/landing/graph-2400.webp"),
  "vault": path.resolve(PUBLIC_DIR, "images/landing/vault-1350.webp"),
  
  // Rendered Still Captures with Living Overlays
  "real-vertical": path.join(BRAIN_DIR, "preview-real-vertical-30fps.png"),
  "real-table": path.join(BRAIN_DIR, "preview-real-act2-table.png"),
  "real-kanban": path.join(BRAIN_DIR, "preview-real-act3-kanban.png"),
  "real-exam": path.join(BRAIN_DIR, "preview-real-act5-examgraph.png"),
  
  // 3D Box Wallpapers
  "boxes-wide": path.resolve(PUBLIC_DIR, "images/boxes-overload-16x9.jpg"),
  "boxes-mobile": path.resolve(PUBLIC_DIR, "images/boxes-overload-9x16.jpg"),
  
  // Video Acts
  "act1": path.join(BRAIN_DIR, "preview-v4-coldopen.png"),
  "act6": path.join(BRAIN_DIR, "preview-v5-grandfinale.png"),
};

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const pathname = url.pathname;

  // 1. Direct MP4 Streaming & Downloads (Mobile Vertical)
  if (pathname === "/video/mobile" || pathname === "/download/mobile") {
    const videoPath = fs.existsSync(path.join(OUT_DIR, "zerobox-mobile-30fps-v2.mp4"))
      ? path.join(OUT_DIR, "zerobox-mobile-30fps-v2.mp4")
      : path.join(OUT_DIR, "zerobox-mobile-30fps.mp4");
    if (!fs.existsSync(videoPath)) {
      res.writeHead(404, { "Content-Type": "text/plain" });
      res.end("Video file not found or still rendering.");
      return;
    }
    const stat = fs.statSync(videoPath);
    if (pathname === "/download/mobile") {
      res.writeHead(200, {
        "Content-Type": "video/mp4",
        "Content-Length": stat.size,
        "Content-Disposition": 'attachment; filename="zerobox-mobile-30fps.mp4"',
      });
      fs.createReadStream(videoPath).pipe(res);
      return;
    }

    const range = req.headers.range;
    if (range) {
      const parts = range.replace(/bytes=/, "").split("-");
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : stat.size - 1;
      const chunksize = end - start + 1;
      const file = fs.createReadStream(videoPath, { start, end });
      res.writeHead(206, {
        "Content-Range": `bytes ${start}-${end}/${stat.size}`,
        "Accept-Ranges": "bytes",
        "Content-Length": chunksize,
        "Content-Type": "video/mp4",
      });
      file.pipe(res);
      return;
    } else {
      res.writeHead(200, {
        "Content-Length": stat.size,
        "Content-Type": "video/mp4",
        "Accept-Ranges": "bytes",
      });
      fs.createReadStream(videoPath).pipe(res);
      return;
    }
  }

  // 1b. Direct MP4 Streaming & Downloads (Landscape Showcase)
  if (pathname === "/video/showcase" || pathname === "/download/showcase") {
    const videoPath = fs.existsSync(path.join(OUT_DIR, "zerobox-showcase-30fps-v2.mp4"))
      ? path.join(OUT_DIR, "zerobox-showcase-30fps-v2.mp4")
      : path.join(OUT_DIR, "zerobox-showcase-30fps.mp4");
    if (!fs.existsSync(videoPath)) {
      res.writeHead(404, { "Content-Type": "text/plain" });
      res.end("Video file not found or still rendering.");
      return;
    }
    const stat = fs.statSync(videoPath);
    if (pathname === "/download/showcase") {
      res.writeHead(200, {
        "Content-Type": "video/mp4",
        "Content-Length": stat.size,
        "Content-Disposition": 'attachment; filename="zerobox-showcase-30fps.mp4"',
      });
      fs.createReadStream(videoPath).pipe(res);
      return;
    }

    const range = req.headers.range;
    if (range) {
      const parts = range.replace(/bytes=/, "").split("-");
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : stat.size - 1;
      const chunksize = end - start + 1;
      const file = fs.createReadStream(videoPath, { start, end });
      res.writeHead(206, {
        "Content-Range": `bytes ${start}-${end}/${stat.size}`,
        "Accept-Ranges": "bytes",
        "Content-Length": chunksize,
        "Content-Type": "video/mp4",
      });
      file.pipe(res);
      return;
    } else {
      res.writeHead(200, {
        "Content-Length": stat.size,
        "Content-Type": "video/mp4",
        "Accept-Ranges": "bytes",
      });
      fs.createReadStream(videoPath).pipe(res);
      return;
    }
  }

  // 2. Direct Image Downloads for Real Project Captures
  const DOWNLOAD_MAP = {
    "/download/table": { file: IMAGES.table, name: "zerobox-real-table-1938.webp", mime: "image/webp" },
    "/download/hero": { file: IMAGES.hero, name: "zerobox-real-dashboard-1575.webp", mime: "image/webp" },
    "/download/exam": { file: IMAGES.exam, name: "zerobox-real-exam-hud-2226.webp", mime: "image/webp" },
    "/download/graph": { file: IMAGES.graph, name: "zerobox-real-attack-graph-2400.webp", mime: "image/webp" },
    "/download/vault": { file: IMAGES.vault, name: "zerobox-real-evidence-vault-1350.webp", mime: "image/webp" },
    "/download/boxes-wide": { file: IMAGES["boxes-wide"], name: "zerobox-boxes-overload-16x9.jpg", mime: "image/jpeg" },
    "/download/boxes-mobile": { file: IMAGES["boxes-mobile"], name: "zerobox-boxes-wallpaper-9x16.jpg", mime: "image/jpeg" },
  };

  if (DOWNLOAD_MAP[pathname]) {
    const item = DOWNLOAD_MAP[pathname];
    if (fs.existsSync(item.file)) {
      res.writeHead(200, {
        "Content-Type": item.mime,
        "Content-Disposition": `attachment; filename="${item.name}"`,
      });
      fs.createReadStream(item.file).pipe(res);
      return;
    }
  }

  // 3. Static preview images
  if (pathname.startsWith("/img/")) {
    const key = pathname.replace("/img/", "");
    const imgPath = IMAGES[key];
    if (imgPath && fs.existsSync(imgPath)) {
      const ext = path.extname(imgPath).toLowerCase();
      const mime =
        ext === ".jpg" || ext === ".jpeg"
          ? "image/jpeg"
          : ext === ".webp"
          ? "image/webp"
          : "image/png";
      res.writeHead(200, { "Content-Type": mime, "Cache-Control": "no-cache" });
      fs.createReadStream(imgPath).pipe(res);
      return;
    }
  }

  // 4. Brand assets
  if (pathname.startsWith("/brand/")) {
    const assetPath = path.join(PUBLIC_DIR, pathname);
    if (fs.existsSync(assetPath)) {
      const ext = path.extname(assetPath).toLowerCase();
      const mime =
        ext === ".webp"
          ? "image/webp"
          : ext === ".png"
          ? "image/png"
          : "application/octet-stream";
      res.writeHead(200, { "Content-Type": mime });
      fs.createReadStream(assetPath).pipe(res);
      return;
    }
  }

  // 5. Main Mobile Web App
  res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
  res.end(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover">
  <title>ZEROBOX · Real Project Showcase & Downloads</title>
  <meta name="apple-mobile-web-app-capable" content="yes">
  <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
  <meta name="theme-color" content="#000000">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; -webkit-tap-highlight-color: transparent; }
    body {
      background-color: #000000;
      color: #ffffff;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      padding-bottom: 50px;
    }
    header {
      background: rgba(8, 8, 11, 0.95);
      border-bottom: 1px solid rgba(56, 189, 248, 0.25);
      padding: 16px 20px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      position: sticky;
      top: 0;
      z-index: 100;
      backdrop-filter: blur(12px);
    }
    .brand {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .logo-img {
      width: 36px;
      height: 36px;
      border-radius: 9px;
      background: rgba(56, 189, 248, 0.1);
      border: 1px solid #38bdf8;
      box-shadow: 0 0 15px rgba(56, 189, 248, 0.4);
    }
    .brand-title {
      font-size: 18px;
      font-weight: 800;
      letter-spacing: -0.02em;
    }
    .brand-sub {
      font-size: 11px;
      color: #38bdf8;
      font-family: monospace;
      font-weight: 600;
    }
    .studio-pill {
      background: #38bdf8;
      color: #000000;
      font-size: 12px;
      font-weight: 800;
      padding: 8px 14px;
      border-radius: 20px;
      text-decoration: none;
      box-shadow: 0 0 16px rgba(56, 189, 248, 0.5);
      display: flex;
      align-items: center;
      gap: 6px;
    }

    /* Download Banner Section */
    .download-card {
      margin: 16px 16px 8px 16px;
      background: linear-gradient(135deg, rgba(56, 189, 248, 0.14) 0%, rgba(10, 10, 13, 0.95) 100%);
      border: 2px solid #38bdf8;
      border-radius: 16px;
      padding: 18px 20px;
      box-shadow: 0 0 30px rgba(56, 189, 248, 0.3);
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .download-title {
      font-size: 16px;
      font-weight: 900;
      color: #ffffff;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .download-desc {
      font-size: 12px;
      color: #94a3b8;
      line-height: 1.4;
    }
    .dl-btn-grid {
      display: flex;
      flex-direction: column;
      gap: 8px;
      margin-top: 4px;
    }
    .dl-btn {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 12px 16px;
      border-radius: 12px;
      text-decoration: none;
      font-size: 13px;
      font-weight: 700;
      transition: all 0.2s ease;
    }
    .dl-btn-primary {
      background: #38bdf8;
      color: #000000;
      box-shadow: 0 0 15px rgba(56, 189, 248, 0.4);
    }
    .dl-btn-secondary {
      background: rgba(255, 255, 255, 0.08);
      color: #ffffff;
      border: 1px solid rgba(255, 255, 255, 0.15);
    }
    .dl-btn-accent {
      background: rgba(56, 189, 248, 0.12);
      color: #38bdf8;
      border: 1px solid rgba(56, 189, 248, 0.4);
    }
    .dl-badge {
      font-size: 10px;
      font-family: monospace;
      padding: 2px 6px;
      border-radius: 4px;
      background: rgba(0, 0, 0, 0.3);
    }

    /* Embedded Video Player */
    .video-card {
      margin: 8px 16px;
      background: #0a0a0d;
      border: 1px solid rgba(56, 189, 248, 0.3);
      border-radius: 16px;
      overflow: hidden;
      display: flex;
      flex-direction: column;
    }
    .video-card-head {
      background: #08080b;
      padding: 10px 16px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.08);
      font-size: 12px;
      font-family: monospace;
      color: #38bdf8;
      font-weight: 700;
      display: flex;
      justify-content: space-between;
    }
    .video-player {
      width: 100%;
      max-height: 520px;
      background: #000000;
      display: block;
      outline: none;
    }

    /* Nav Tabs */
    .nav-tabs {
      display: flex;
      overflow-x: auto;
      gap: 8px;
      padding: 12px 16px;
      background: #060608;
      border-bottom: 1px solid rgba(255, 255, 255, 0.08);
      scrollbar-width: none;
      margin-top: 8px;
    }
    .nav-tabs::-webkit-scrollbar { display: none; }
    .tab-btn {
      flex-shrink: 0;
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.1);
      color: #94a3b8;
      font-size: 13px;
      font-weight: 600;
      padding: 8px 14px;
      border-radius: 18px;
      cursor: pointer;
      transition: all 0.2s ease;
    }
    .tab-btn.active {
      background: #38bdf8;
      color: #000000;
      border-color: #38bdf8;
      font-weight: 800;
      box-shadow: 0 0 12px rgba(56, 189, 248, 0.4);
    }

    /* Interactive Frame Viewer */
    .viewer {
      padding: 16px;
      display: flex;
      flex-direction: column;
      align-items: center;
    }
    .card-wrap {
      width: 100%;
      max-width: 600px;
      background: #09090c;
      border: 1px solid rgba(255, 255, 255, 0.12);
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 10px 40px rgba(0, 0, 0, 0.7);
    }
    .card-head {
      padding: 12px 16px;
      background: #07070a;
      border-bottom: 1px solid rgba(255, 255, 255, 0.08);
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .card-tag {
      font-size: 11px;
      font-weight: 800;
      font-family: monospace;
      color: #38bdf8;
      background: rgba(56, 189, 248, 0.12);
      border: 1px solid rgba(56, 189, 248, 0.3);
      padding: 3px 8px;
      border-radius: 4px;
    }
    .card-desc {
      font-size: 11px;
      color: #94a3b8;
      font-family: monospace;
    }
    .card-img-wrap {
      width: 100%;
      background: #000000;
      position: relative;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 240px;
    }
    .card-img {
      width: 100%;
      height: auto;
      display: block;
      max-height: 70vh;
      object-fit: contain;
    }
    .card-foot {
      padding: 14px 16px;
      background: #07070a;
      border-top: 1px solid rgba(255, 255, 255, 0.08);
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    .card-foot-title {
      font-size: 15px;
      font-weight: 800;
      color: #ffffff;
    }
    .card-foot-meta {
      font-size: 12px;
      color: #94a3b8;
      line-height: 1.4;
    }
    .action-row {
      display: flex;
      gap: 10px;
      margin-top: 4px;
    }
    .action-btn {
      flex: 1;
      padding: 10px 14px;
      border-radius: 10px;
      font-size: 13px;
      font-weight: 700;
      text-align: center;
      text-decoration: none;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
    }
    .btn-primary {
      background: #38bdf8;
      color: #000000;
    }
    .btn-secondary {
      background: rgba(255, 255, 255, 0.08);
      color: #ffffff;
      border: 1px solid rgba(255, 255, 255, 0.15);
    }
  </style>
</head>
<body>
  <header>
    <div class="brand">
      <img src="/brand/logo-oled.webp" class="logo-img" alt="ZEROBOX Logo">
      <div>
        <div class="brand-title">ZEROBOX</div>
        <div class="brand-sub">REAL PROJECT HUB · 30 FPS</div>
      </div>
    </div>
    <a href="https://intranet-those-acquisition-publishing.trycloudflare.com" target="_blank" class="studio-pill">
      ▶ Remotion Studio
    </a>
  </header>

  <!-- 1. Direct Download Center for Mobile -->
  <div class="download-card">
    <div class="download-title">
      <span>📥</span> 1-Tap Download to Your Phone
    </div>
    <div class="download-desc">
      Download the realistic project MP4 videos and full-resolution actual project assets directly to your phone:
    </div>
    <div class="dl-btn-grid">
      <a href="/download/mobile" download="zerobox-mobile-30fps.mp4" class="dl-btn dl-btn-primary">
        <span>📱 Download Vertical Video (.MP4)</span>
        <span class="dl-badge">30 FPS · 1080x1920</span>
      </a>
      <a href="/download/showcase" download="zerobox-showcase-30fps.mp4" class="dl-btn dl-btn-secondary">
        <span>🖥️ Download Landscape Video (.MP4)</span>
        <span class="dl-badge">30 FPS · 1920x1080</span>
      </a>
      <a href="/download/table" download="zerobox-real-table-1938.webp" class="dl-btn dl-btn-accent">
        <span>📊 Real Target Inventory Table</span>
        <span class="dl-badge">1938x1773 High-Res</span>
      </a>
      <a href="/download/hero" download="zerobox-real-dashboard-1575.webp" class="dl-btn dl-btn-accent">
        <span>📋 Real Dashboard & Kanban</span>
        <span class="dl-badge">1575x1719 High-Res</span>
      </a>
      <a href="/download/exam" download="zerobox-real-exam-hud-2226.webp" class="dl-btn dl-btn-accent">
        <span>⏱️ Real 24h OSCP Exam HUD</span>
        <span class="dl-badge">2226x2052 High-Res</span>
      </a>
      <a href="/download/graph" download="zerobox-real-attack-graph-2400.webp" class="dl-btn dl-btn-accent">
        <span>🕸️ Real Pivoting Attack Graph</span>
        <span class="dl-badge">2400x780 High-Res</span>
      </a>
      <a href="/download/vault" download="zerobox-real-evidence-vault-1350.webp" class="dl-btn dl-btn-accent">
        <span>🔒 Real Evidence Vault</span>
        <span class="dl-badge">1350x1050 High-Res</span>
      </a>
    </div>
  </div>

  <!-- 2. Embedded Video Player for Instant Phone Playback -->
  <div class="video-card">
    <div class="video-card-head">
      <span>▶ PLAY RENDERED MP4 INLINE</span>
      <span>30 FPS · 35.0s</span>
    </div>
    <video controls playsinline preload="metadata" poster="/img/real-vertical" class="video-player">
      <source src="/video/mobile" type="video/mp4">
      Your browser does not support the video tag.
    </video>
  </div>

  <!-- 3. Navigation Tabs for Authentic Project Assets & Stills -->
  <div class="nav-tabs" id="tabs">
    <button class="tab-btn active" onclick="showCard('table')">📊 Real Target Table</button>
    <button class="tab-btn" onclick="showCard('hero')">📋 Real Dashboard & Kanban</button>
    <button class="tab-btn" onclick="showCard('exam')">⏱️ Real 24h Exam HUD</button>
    <button class="tab-btn" onclick="showCard('graph')">🕸️ Real Attack Graph</button>
    <button class="tab-btn" onclick="showCard('vault')">🔒 Real Evidence Vault</button>
    <button class="tab-btn" onclick="showCard('real-vertical')">📱 30 FPS Mobile Still</button>
    <button class="tab-btn" onclick="showCard('real-table')">🎯 Act 2 Video Still</button>
    <button class="tab-btn" onclick="showCard('real-kanban')">📋 Act 3 Video Still</button>
    <button class="tab-btn" onclick="showCard('real-exam')">🗺️ Act 5 Video Still</button>
    <button class="tab-btn" onclick="showCard('boxes-wide')">📦 3D Boxes Art (Wide)</button>
    <button class="tab-btn" onclick="showCard('boxes-mobile')">📱 3D Boxes (Mobile)</button>
  </div>

  <!-- 4. Interactive Frame Inspector -->
  <div class="viewer">
    <div class="card-wrap" id="cardContainer">
      <div class="card-head">
        <span class="card-tag" id="cardTag">REAL PROJECT ASSET // TABLE</span>
        <span class="card-desc" id="cardMeta">1938x1773 High-Res</span>
      </div>
      <div class="card-img-wrap">
        <img id="mainImg" src="/img/table" class="card-img" alt="Showcase frame">
      </div>
      <div class="card-foot">
        <div class="card-foot-title" id="cardTitle">Target Inventory & Multi-Select Table</div>
        <div class="card-foot-meta" id="cardDesc">
          Actual production table from ctf-tracker with Sequel, Synced, Devel, Jerry, Knife, Dancing, HTB cubes, Linux/Windows badges, and multi-select toolbar.
        </div>
        <div class="action-row">
          <a href="/img/table" target="_blank" class="action-btn btn-secondary" id="btnZoom">
            🔍 Full Resolution
          </a>
          <a href="/download/table" class="action-btn btn-primary" id="btnDownload">
            ⬇️ Download Image
          </a>
        </div>
      </div>
    </div>
  </div>

  <script>
    const CARDS = {
      table: {
        tag: "REAL PROJECT ASSET // TABLE",
        meta: "1938x1773 High-Res",
        img: "/img/table",
        dl: "/download/table",
        title: "Target Inventory & Multi-Select Table",
        desc: "Actual production table from ctf-tracker with Sequel, Synced, Devel, Jerry, Knife, Dancing, HTB cubes, Linux/Windows badges, and multi-select toolbar."
      },
      hero: {
        tag: "REAL PROJECT ASSET // DASHBOARD",
        meta: "1575x1719 High-Res",
        img: "/img/hero",
        dl: "/download/hero",
        title: "Main Dashboard & Foothold / Completed Kanban",
        desc: "Actual production dashboard featuring the 8-icon navigation rail, search bar '/', filter row, Foothold cards (Three, Unified, Included), and Completed cards (Sequel, Synced, Devel)."
      },
      exam: {
        tag: "REAL PROJECT ASSET // EXAM HUD",
        meta: "2226x2052 High-Res",
        img: "/img/exam",
        dl: "/download/exam",
        title: "OffSec OSCP (PEN-200) 24h Exam HUD",
        desc: "Actual 24h exam simulator with Candidate Alex Morgan, 20:59:54 countdown clock, score 30/100, proof compliance warning banner, and AD target set (CORP-WEB01, CORP-SRV01, CORP-DC01)."
      },
      graph: {
        tag: "REAL PROJECT ASSET // ATTACK GRAPH",
        meta: "2400x780 High-Res",
        img: "/img/graph",
        dl: "/download/graph",
        title: "Live Pivoting Attack Graph Topology",
        desc: "Actual visual topology graph mapping pivot chains: Included -> SSH tunnel :22 -> Bike -> chisel :8000 -> Unified -> ligolo agent :11601 -> Funnel."
      },
      vault: {
        tag: "REAL PROJECT ASSET // EVIDENCE VAULT",
        meta: "1350x1050 High-Res",
        img: "/img/vault",
        dl: "/download/vault",
        title: "Encrypted Evidence & Proof Vault",
        desc: "Actual proof vault storing credentials and flags for Oopsie, Three, Funnel, Unified, Bike with principal tags (web_deploy, admin, root, svc_backup, mike)."
      },
      "real-vertical": {
        tag: "VIDEO STILL // 30 FPS MOBILE",
        meta: "1080x1920 @ 30 FPS",
        img: "/img/real-vertical",
        dl: "/download/mobile",
        title: "9:16 Vertical Smartphone Composition",
        desc: "Rendered still showing the real project table inside the live mobile HUD with audio equalizers, telemetry counters, and OLED black aesthetics."
      },
      "real-table": {
        tag: "ACT II VIDEO STILL // TABLE VIEW",
        meta: "1920x1080 @ 30 FPS",
        img: "/img/real-table",
        dl: "/img/real-table",
        title: "Act 2: Real Table with Living Highlights",
        desc: "Video still capturing the real table with glowing selection box over Sequel and active target indicator."
      },
      "real-kanban": {
        tag: "ACT III VIDEO STILL // KANBAN DRAG",
        meta: "1920x1080 @ 30 FPS",
        img: "/img/real-kanban",
        dl: "/img/real-kanban",
        title: "Act 3: Real Kanban with Interactive Card Drag",
        desc: "Video still capturing the actual hero-app Kanban view with Three (10.129.1.14) being dragged across into Completed."
      },
      "real-exam": {
        tag: "ACT V VIDEO STILL // EXAM & GRAPH",
        meta: "1920x1080 @ 30 FPS",
        img: "/img/real-exam",
        dl: "/img/real-exam",
        title: "Act 5: Split Real Exam HUD & Pivoting Graph",
        desc: "Video still capturing the real OffSec exam HUD and visual pivot graph side-by-side with live countdown timer."
      },
      "boxes-wide": {
        tag: "3D WALLPAPER // 16:9 WIDE",
        meta: "3840x2160 4K",
        img: "/img/boxes-wide",
        dl: "/download/boxes-wide",
        title: "Tactical Boxes Swarm & Cyber Containers",
        desc: "3D isometric cyber scene overflowing with glowing open blue cyber boxes and holographic cubes on an OLED black floor."
      },
      "boxes-mobile": {
        tag: "3D WALLPAPER // 9:16 MOBILE",
        meta: "1080x1920 Lockscreen",
        img: "/img/boxes-mobile",
        dl: "/download/boxes-mobile",
        title: "Vertical Glowing Boxes Tower",
        desc: "Towering stack of glowing open electric blue boxes with cyan laser beams tailored for smartphone lockscreens."
      }
    };

    function showCard(key) {
      const data = CARDS[key];
      if (!data) return;

      document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
      event.target.classList.add('active');

      document.getElementById('cardTag').textContent = data.tag;
      document.getElementById('cardMeta').textContent = data.meta;
      document.getElementById('mainImg').src = data.img;
      document.getElementById('cardTitle').textContent = data.title;
      document.getElementById('cardDesc').textContent = data.desc;
      document.getElementById('btnZoom').href = data.img;
      document.getElementById('btnDownload').href = data.dl;
    }
  </script>
</body>
</html>`);
});

server.listen(PORT, HOST, () => {
  console.log(`[MOBILE HUB] Serving on http://${HOST}:${PORT}`);
});
