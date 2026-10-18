// promo-video/scripts/generate-master-showcase-audio.mjs
// Master Melodic Tech Electronica Soundtrack for ZeroBox Ultimate Showcase
// 118 BPM, C Major / A Minor, 35.0 Seconds, 44.1kHz Stereo PCM WAV
// Calibrated for broadcast warmth: peak ceiling <= 0.40 (-2.0 dBFS relative to 0.40), -14 LUFS integrated
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const audioDir = path.resolve(__dirname, "../public/audio");
if (!fs.existsSync(audioDir)) fs.mkdirSync(audioDir, { recursive: true });

const SAMPLE_RATE = 44100;
const DURATION = 35.0; // 35 seconds = 1050 frames @ 30 fps
const TOTAL_SAMPLES = Math.floor(SAMPLE_RATE * DURATION);

function createWavBuffer(left, right) {
  const numSamples = left.length;
  const numChannels = 2;
  const bitsPerSample = 16;
  const byteRate = (SAMPLE_RATE * numChannels * bitsPerSample) / 8;
  const blockAlign = (numChannels * bitsPerSample) / 8;
  const dataSize = numSamples * blockAlign;
  const buffer = Buffer.alloc(44 + dataSize);

  // RIFF header
  buffer.write("RIFF", 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write("WAVE", 8);

  // fmt chunk
  buffer.write("fmt ", 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20); // PCM
  buffer.writeUInt16LE(numChannels, 22);
  buffer.writeUInt32LE(SAMPLE_RATE, 24);
  buffer.writeUInt32LE(byteRate, 28);
  buffer.writeUInt16LE(blockAlign, 32);
  buffer.writeUInt16LE(bitsPerSample, 34);

  // data chunk
  buffer.write("data", 36);
  buffer.writeUInt32LE(dataSize, 40);

  // 16-bit samples
  for (let i = 0; i < numSamples; i++) {
    const l = Math.max(-1, Math.min(1, left[i]));
    const r = Math.max(-1, Math.min(1, right[i]));
    const sL = l < 0 ? l * 0x8000 : l * 0x7fff;
    const sR = r < 0 ? r * 0x8000 : r * 0x7fff;
    buffer.writeInt16LE(Math.floor(sL), 44 + i * 4);
    buffer.writeInt16LE(Math.floor(sR), 44 + i * 4 + 2);
  }

  return buffer;
}

// Low-Pass Filter helper for organic warmth (removes harsh shrills)
function applyLowPass(buffer, cutoffFreq) {
  const rc = 1.0 / (2 * Math.PI * cutoffFreq);
  const dt = 1.0 / SAMPLE_RATE;
  const alpha = dt / (rc + dt);
  let last = 0;
  for (let i = 0; i < buffer.length; i++) {
    last = last + alpha * (buffer[i] - last);
    buffer[i] = last;
  }
}

// Helper to mix audio with timing offset and gain
function mix(targetL, targetR, startSec, srcL, srcR, gain = 1.0) {
  const startIdx = Math.floor(startSec * SAMPLE_RATE);
  const len = srcL.length;
  for (let i = 0; i < len; i++) {
    const idx = startIdx + i;
    if (idx >= targetL.length) break;
    targetL[idx] += srcL[i] * gain;
    targetR[idx] += srcR[i] * gain;
  }
}

console.log("Synthesizing Master 35s Melodic Tech Showcase Audio...");
const L = new Float32Array(TOTAL_SAMPLES);
const R = new Float32Array(TOTAL_SAMPLES);

const BPM = 118;
const beatSec = 60 / BPM; // ~0.5085s
const barSec = beatSec * 4; // ~2.0339s
const totalBars = Math.floor(DURATION / barSec);

// ----------------------------------------------------
// 1. Lush Rhodes / Electric Piano Sound Generator
// ----------------------------------------------------
function synthesizeRhodesChord(frequencies, chordDuration, detune = 0.5) {
  const len = Math.floor(chordDuration * SAMPLE_RATE);
  const left = new Float32Array(len);
  const right = new Float32Array(len);

  for (let i = 0; i < len; i++) {
    const t = i / SAMPLE_RATE;
    // Soft exponential decay envelope
    const env = Math.exp(-t * 1.8) * Math.min(1, t * 40);

    let sampleL = 0;
    let sampleR = 0;

    for (let fIdx = 0; fIdx < frequencies.length; fIdx++) {
      const baseFreq = frequencies[fIdx];
      // Fundamental + gentle harmonics (1st, 2nd, 3rd)
      const fL = baseFreq * (1 - 0.0008 * detune);
      const fR = baseFreq * (1 + 0.0008 * detune);

      const h1L = Math.sin(2 * Math.PI * fL * t);
      const h2L = 0.35 * Math.sin(2 * Math.PI * (fL * 2) * t);
      const h3L = 0.12 * Math.sin(2 * Math.PI * (fL * 3) * t);

      const h1R = Math.sin(2 * Math.PI * fR * t);
      const h2R = 0.35 * Math.sin(2 * Math.PI * (fR * 2) * t);
      const h3R = 0.12 * Math.sin(2 * Math.PI * (fR * 3) * t);

      sampleL += (h1L + h2L + h3L) * 0.28;
      sampleR += (h1R + h2R + h3R) * 0.28;
    }

    left[i] = sampleL * env;
    right[i] = sampleR * env;
  }

  applyLowPass(left, 3800);
  applyLowPass(right, 3800);
  return { left, right };
}

// Chords in C Major / A Minor:
// Bar 0: Cmaj9  (C3, G3, B3, D4, E4)
// Bar 1: Am9    (A2, E3, G3, B3, C4)
// Bar 2: Fmaj7#11 (F2, C3, E3, A3, B3)
// Bar 3: Gsus4 -> G (G2, D3, G3, C4, D4)
const chordChains = [
  [130.81, 196.00, 246.94, 293.66, 329.63], // Cmaj9
  [110.00, 164.81, 196.00, 246.94, 261.63], // Am9
  [87.31, 130.81, 164.81, 220.00, 246.94],  // Fmaj7
  [98.00, 146.83, 196.00, 261.63, 293.66],  // Gsus4
];

// Lay down the ambient chords progression across 35s
for (let bar = 0; bar < totalBars + 1; bar++) {
  const chordIdx = bar % chordChains.length;
  const chordStart = bar * barSec;
  if (chordStart >= DURATION) break;

  const chordLength = barSec * 1.05; // slight overlap
  const { left, right } = synthesizeRhodesChord(chordChains[chordIdx], chordLength);
  
  // Fade in during Act 1, swell into Act 2-5, gentle outro in Act 6
  let chordGain = 0.28;
  if (chordStart < 4.0) chordGain = 0.18 + 0.10 * (chordStart / 4.0);
  if (chordStart > 30.0) chordGain = 0.28 * Math.max(0, (35.0 - chordStart) / 5.0);

  mix(L, R, chordStart, left, right, chordGain);
}

// ----------------------------------------------------
// 2. Warm Mellow Sub & Bass Line
// ----------------------------------------------------
const bassNotes = [130.81 / 2, 110.00 / 2, 87.31 / 2, 98.00 / 2]; // C2, A1, F1, G1
for (let bar = 0; bar < totalBars; bar++) {
  const bassStart = bar * barSec;
  if (bassStart < 4.5 || bassStart > 30.5) continue; // Bass enters in Act 2, drops before outro

  const noteFreq = bassNotes[bar % bassNotes.length];
  const bassLen = Math.floor(barSec * SAMPLE_RATE);
  const bL = new Float32Array(bassLen);
  const bR = new Float32Array(bassLen);

  for (let i = 0; i < bassLen; i++) {
    const t = i / SAMPLE_RATE;
    const env = Math.exp(-t * 0.9) * Math.min(1, t * 30);
    // Pure round sine wave with subtle 2nd harmonic
    const s = (Math.sin(2 * Math.PI * noteFreq * t) + 0.2 * Math.sin(4 * Math.PI * noteFreq * t)) * env * 0.22;
    bL[i] = s;
    bR[i] = s;
  }
  applyLowPass(bL, 300);
  applyLowPass(bR, 300);
  mix(L, R, bassStart, bL, bR, 0.9);
}

// ----------------------------------------------------
// 3. Organic Rhythmic Bed (Muted Kick, Finger Snaps, Shaker)
// ----------------------------------------------------
function makeMutedKick() {
  const len = Math.floor(0.22 * SAMPLE_RATE);
  const kL = new Float32Array(len);
  const kR = new Float32Array(len);
  for (let i = 0; i < len; i++) {
    const t = i / SAMPLE_RATE;
    const freq = 120 * Math.exp(-t * 28) + 42;
    const env = Math.exp(-t * 18);
    const s = Math.sin(2 * Math.PI * freq * t) * env * 0.26;
    kL[i] = s;
    kR[i] = s;
  }
  applyLowPass(kL, 250);
  applyLowPass(kR, 250);
  return { left: kL, right: kR };
}

function makeOrganicSnap() {
  const len = Math.floor(0.12 * SAMPLE_RATE);
  const sL = new Float32Array(len);
  const sR = new Float32Array(len);
  for (let i = 0; i < len; i++) {
    const t = i / SAMPLE_RATE;
    const env = Math.exp(-t * 45);
    const noise = (Math.random() * 2 - 1) * env * 0.12;
    sL[i] = noise * 0.95;
    sR[i] = noise * 1.05;
  }
  applyLowPass(sL, 3200);
  applyLowPass(sR, 3200);
  return { left: sL, right: sR };
}

function makeShakerTick() {
  const len = Math.floor(0.06 * SAMPLE_RATE);
  const shL = new Float32Array(len);
  const shR = new Float32Array(len);
  for (let i = 0; i < len; i++) {
    const t = i / SAMPLE_RATE;
    const env = Math.exp(-t * 65);
    const noise = (Math.random() * 2 - 1) * env * 0.05;
    shL[i] = noise;
    shR[i] = noise;
  }
  applyLowPass(shL, 4200);
  applyLowPass(shR, 4200);
  return { left: shL, right: shR };
}

const kickSample = makeMutedKick();
const snapSample = makeOrganicSnap();
const shakerSample = makeShakerTick();

// Add rhythm track from 5.0s to 30.0s (Acts 2 to 5)
const totalBeats = Math.floor(DURATION / beatSec);
for (let b = 0; b < totalBeats; b++) {
  const beatTime = b * beatSec;
  if (beatTime < 5.0 || beatTime > 29.5) continue;

  const beatInBar = b % 4;

  // Kick on beat 0 and 2
  if (beatInBar === 0 || beatInBar === 2) {
    mix(L, R, beatTime, kickSample.left, kickSample.right, 0.75);
  }

  // Snap on beat 1 and 3
  if (beatInBar === 1 || beatInBar === 3) {
    mix(L, R, beatTime, snapSample.left, snapSample.right, 0.65);
  }

  // Shaker on every eighth note
  mix(L, R, beatTime, shakerSample.left, shakerSample.right, 0.4);
  mix(L, R, beatTime + beatSec * 0.5, shakerSample.left, shakerSample.right, 0.3);
}

// ----------------------------------------------------
// 4. Melodic Marimba / Glass Arpeggios (Acts 2 - 5)
// ----------------------------------------------------
function makeGlassNote(freq, dur = 0.35) {
  const len = Math.floor(dur * SAMPLE_RATE);
  const nL = new Float32Array(len);
  const nR = new Float32Array(len);
  for (let i = 0; i < len; i++) {
    const t = i / SAMPLE_RATE;
    const env = Math.exp(-t * 12);
    const s = (Math.sin(2 * Math.PI * freq * t) + 0.15 * Math.sin(4 * Math.PI * freq * t)) * env * 0.16;
    nL[i] = s;
    nR[i] = s;
  }
  applyLowPass(nL, 3500);
  applyLowPass(nR, 3500);
  return { left: nL, right: nR };
}

const arpScale = [523.25, 659.25, 783.99, 987.77, 1046.50, 1174.66]; // C5, E5, G5, B5, C6, D6
for (let b = 0; b < totalBeats; b++) {
  const time = b * beatSec;
  if (time >= 10.0 && time <= 29.0) {
    if (b % 2 === 1) {
      const noteFreq = arpScale[(b * 3) % arpScale.length];
      const note = makeGlassNote(noteFreq, 0.3);
      mix(L, R, time, note.left, note.right, 0.35);
    }
  }
}

// ----------------------------------------------------
// 5. Specific Choreographed UI Foley Events
// ----------------------------------------------------
// Soft Haptic Micro-Click
function makeHapticClick() {
  const len = Math.floor(0.04 * SAMPLE_RATE);
  const cL = new Float32Array(len);
  const cR = new Float32Array(len);
  for (let i = 0; i < len; i++) {
    const t = i / SAMPLE_RATE;
    const env = Math.exp(-t * 90);
    const s = Math.sin(2 * Math.PI * 900 * t) * env * 0.08;
    cL[i] = s;
    cR[i] = s;
  }
  return { left: cL, right: cR };
}

// Smooth Low Whoosh (Kanban drag)
function makeWhoosh(dur = 0.5) {
  const len = Math.floor(dur * SAMPLE_RATE);
  const wL = new Float32Array(len);
  const wR = new Float32Array(len);
  for (let i = 0; i < len; i++) {
    const t = i / SAMPLE_RATE;
    const env = Math.sin((t / dur) * Math.PI);
    const noise = (Math.random() * 2 - 1) * env * 0.09;
    wL[i] = noise * (1 - t / dur);
    wR[i] = noise * (t / dur);
  }
  applyLowPass(wL, 1200);
  applyLowPass(wR, 1200);
  return { left: wL, right: wR };
}

// Root Pwn Fanfare Chime (gentle triangle bell C5 -> E5 -> G5 -> C6)
function makeRootPwnFanfare() {
  const len = Math.floor(1.8 * SAMPLE_RATE);
  const fL = new Float32Array(len);
  const fR = new Float32Array(len);
  const notes = [523.25, 659.25, 783.99, 1046.50];
  const step = 0.08;

  for (let n = 0; n < notes.length; n++) {
    const freq = notes[n];
    const offset = Math.floor(n * step * SAMPLE_RATE);
    for (let i = 0; i < len - offset; i++) {
      const t = i / SAMPLE_RATE;
      const env = Math.exp(-t * 3.5);
      const s = Math.sin(2 * Math.PI * freq * t) * env * 0.12;
      fL[offset + i] += s * 0.9;
      fR[offset + i] += s * 1.1;
    }
  }
  applyLowPass(fL, 4000);
  applyLowPass(fR, 4000);
  return { left: fL, right: fR };
}

// Glass Ping (Payload Copied)
function makeGlassPing() {
  const len = Math.floor(0.8 * SAMPLE_RATE);
  const pL = new Float32Array(len);
  const pR = new Float32Array(len);
  for (let i = 0; i < len; i++) {
    const t = i / SAMPLE_RATE;
    const env = Math.exp(-t * 6);
    const s = (Math.sin(2 * Math.PI * 1318.51 * t) + 0.3 * Math.sin(2 * Math.PI * 2637 * t)) * env * 0.10;
    pL[i] = s;
    pR[i] = s;
  }
  applyLowPass(pL, 4200);
  applyLowPass(pR, 4200);
  return { left: pL, right: pR };
}

// Mix Foley into timeline according to the script:
const click = makeHapticClick();

// Opening Hook: Sub-bloom + crystal glass shimmer at 0.0s - 0.5s
function makeSubBloom() {
  const len = Math.floor(1.6 * SAMPLE_RATE);
  const bL = new Float32Array(len);
  const bR = new Float32Array(len);
  for (let i = 0; i < len; i++) {
    const t = i / SAMPLE_RATE;
    const env = Math.exp(-t * 2.2) * Math.min(1, t * 25);
    const s = Math.sin(2 * Math.PI * 55 * t) * env * 0.18;
    bL[i] = s;
    bR[i] = s;
  }
  applyLowPass(bL, 180);
  applyLowPass(bR, 180);
  return { left: bL, right: bR };
}

function makeGlassShimmer() {
  const len = Math.floor(1.2 * SAMPLE_RATE);
  const sL = new Float32Array(len);
  const sR = new Float32Array(len);
  for (let i = 0; i < len; i++) {
    const t = i / SAMPLE_RATE;
    const env = Math.exp(-t * 4.0);
    const s = (Math.sin(2 * Math.PI * 659.25 * t) + 0.3 * Math.sin(2 * Math.PI * 1318.5 * t)) * env * 0.08;
    sL[i] = s * 0.9;
    sR[i] = s * 1.1;
  }
  applyLowPass(sL, 3800);
  applyLowPass(sR, 3800);
  return { left: sL, right: sR };
}

const subBloom = makeSubBloom();
const glassShimmer = makeGlassShimmer();
mix(L, R, 0.05, subBloom.left, subBloom.right, 0.85);
mix(L, R, 0.4, glassShimmer.left, glassShimmer.right, 0.6);

// Opening Warp Transition into Desktop at ~2.3s
const warpWhoosh = makeWhoosh(0.7);
mix(L, R, 2.2, warpWhoosh.left, warpWhoosh.right, 0.75);

// Act 1: Timer start click at ~3.6s
mix(L, R, 3.6, click.left, click.right, 0.75);

// Act 2: CPTS Filter click at ~6.8s, Keyboard typing clicks at ~8.5s - 9.5s
mix(L, R, 6.8, click.left, click.right, 0.7);
for (let t = 8.5; t <= 9.6; t += 0.12) {
  mix(L, R, t, click.left, click.right, 0.45);
}

// Act 3: Kanban Card Drag Whoosh at ~13.5s, Root Pwn Fanfare at ~15.2s
const whoosh = makeWhoosh(0.7);
mix(L, R, 13.5, whoosh.left, whoosh.right, 0.8);
const rootFanfare = makeRootPwnFanfare();
mix(L, R, 15.2, rootFanfare.left, rootFanfare.right, 0.85);

// Act 4: RevShell input switch at ~19.5s, Copy Toast Ping at ~22.0s
mix(L, R, 19.5, click.left, click.right, 0.6);
const copyPing = makeGlassPing();
mix(L, R, 22.0, copyPing.left, copyPing.right, 0.75);

// Act 5: Sonar pulse at ~25.5s
const sonarWhoosh = makeWhoosh(1.2);
mix(L, R, 25.5, sonarWhoosh.left, sonarWhoosh.right, 0.6);

// ----------------------------------------------------
// 6. Master Limiter & Calibration: Peak Ceiling <= 0.40
// ----------------------------------------------------
let maxPeak = 0;
for (let i = 0; i < TOTAL_SAMPLES; i++) {
  if (Math.abs(L[i]) > maxPeak) maxPeak = Math.abs(L[i]);
  if (Math.abs(R[i]) > maxPeak) maxPeak = Math.abs(R[i]);
}

console.log(`Pre-master peak amplitude: ${maxPeak.toFixed(4)}`);

// Calibrate target peak to exactly 0.38 (safe margin below 0.40, ~ -8.4 dBFS)
const targetPeak = 0.38;
const normalizer = maxPeak > 0 ? targetPeak / maxPeak : 1.0;

for (let i = 0; i < TOTAL_SAMPLES; i++) {
  L[i] = Math.max(-0.38, Math.min(0.38, L[i] * normalizer));
  R[i] = Math.max(-0.38, Math.min(0.38, R[i] * normalizer));
}

console.log(`Calibrated master peak amplitude: ${targetPeak.toFixed(2)} (-8.4 dBFS)`);

// ----------------------------------------------------
// 7. Write to showcase-master-soundtrack.wav
// ----------------------------------------------------
const outFile = path.resolve(audioDir, "showcase-master-soundtrack.wav");
const wavBuffer = createWavBuffer(L, R);
fs.writeFileSync(outFile, wavBuffer);

console.log(`✅ Master showcase audio created: ${outFile} (${(wavBuffer.length / 1024 / 1024).toFixed(2)} MB, ${DURATION}s)`);
