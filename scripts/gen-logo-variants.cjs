// One-off, idempotent: generates 64/128/224px webp variants of the logos via ffmpeg (no npm deps).
const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const pub = path.join(__dirname, '..', 'public');
for (const name of ['zerobox', 'htb', 'midnight', 'oled']) {
  const src = path.join(pub, `logo-${name}.webp`);
  for (const n of [64, 128, 224]) {
    const out = path.join(pub, `logo-${name}-${n}.webp`);
    if (fs.existsSync(out) && fs.statSync(out).mtimeMs >= fs.statSync(src).mtimeMs) continue;
    const r = spawnSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-i', src,
      '-vf', `scale=${n}:${n}:flags=lanczos,format=yuva420p`, '-c:v', 'libwebp', '-quality', '85', '-lossless', '0', out], { stdio: 'inherit' });
    if (r.status !== 0) { console.error('ffmpeg failed for', out); process.exit(1); }
    console.log('wrote', path.relative(process.cwd(), out));
  }
}
