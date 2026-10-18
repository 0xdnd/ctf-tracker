// generate-cyber-audio.mjs
// Dual-Soundtrack Synthesizer for ZeroBox Promo Video (Stealth & Neon Editions)
// Zero-Egress Mathematical DSP 44.1kHz Stereo PCM WAV Generator
// Calibrated for Warm, Non-Fatiguing, Broadcast-Ready Master Levels (Peak ~0.45)
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const audioDir = path.resolve(__dirname, "../public/audio");
const sfxDir = path.join(audioDir, "sfx");

if (!fs.existsSync(audioDir)) fs.mkdirSync(audioDir, { recursive: true });
if (!fs.existsSync(sfxDir)) fs.mkdirSync(sfxDir, { recursive: true });

const SAMPLE_RATE = 44100;
const DURATION = 38.0;
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

  // 16-bit PCM samples
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

// Low-Pass Filter helper to eliminate high-end piercing harshness
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

// Helper to mix stereo buffers with volume gain
function mixBuffer(targetL, targetR, startSec, srcL, srcR, gain = 1.0) {
  const startIdx = Math.floor(startSec * SAMPLE_RATE);
  const len = srcL.length;
  for (let i = 0; i < len; i++) {
    const idx = startIdx + i;
    if (idx >= targetL.length) break;
    targetL[idx] += srcL[i] * gain;
    targetR[idx] += srcR[i] * gain;
  }
}

// Soft Limiter and Master Normalization to comfortable broadcast level (Target: 0.45)
function normalizeAndLimit(left, right, targetPeak = 0.45) {
  let peak = 0;
  for (let i = 0; i < left.length; i++) {
    if (Math.abs(left[i]) > peak) peak = Math.abs(left[i]);
    if (Math.abs(right[i]) > peak) peak = Math.abs(right[i]);
  }
  const factor = targetPeak / Math.max(targetPeak, peak);
  for (let i = 0; i < left.length; i++) {
    left[i] = Math.tanh(left[i] * factor);
    right[i] = Math.tanh(right[i] * factor);
  }
}

// ----------------------------------------------------
// 1. REFINED GRANULAR FOLEY GENERATORS (Warm, Soft, Balanced)
// ----------------------------------------------------

function generateSoftBootBlip() {
  const dur = 0.035;
  const len = Math.floor(dur * SAMPLE_RATE);
  const L = new Float32Array(len);
  const R = new Float32Array(len);
  for (let i = 0; i < len; i++) {
    const t = i / SAMPLE_RATE;
    const env = Math.exp(-t * 90);
    const click = Math.sin(2 * Math.PI * 4200 * t) * env * 0.18;
    L[i] = click * 0.9;
    R[i] = click * 1.1;
  }
  applyLowPass(L, 4800);
  applyLowPass(R, 4800);
  return { L, R };
}

function generateWarmCyberBraam(dur = 2.2, subFreq = 40, brassFreq = 80) {
  const len = Math.floor(dur * SAMPLE_RATE);
  const L = new Float32Array(len);
  const R = new Float32Array(len);
  for (let i = 0; i < len; i++) {
    const t = i / SAMPLE_RATE;
    const env = Math.exp(-t * 1.4);
    const sub = Math.sin(2 * Math.PI * (subFreq * Math.exp(-t * 0.5)) * t) * 0.42;
    const saw = Math.sin(2 * Math.PI * brassFreq * t) * 0.22;
    const sample = (sub + saw) * env;
    L[i] = sample;
    R[i] = sample;
  }
  applyLowPass(L, 1200);
  applyLowPass(R, 1200);
  return { L, R };
}

function generateSoftUiClick(freq = 950) {
  const dur = 0.04;
  const len = Math.floor(dur * SAMPLE_RATE);
  const L = new Float32Array(len);
  const R = new Float32Array(len);
  for (let i = 0; i < len; i++) {
    const t = i / SAMPLE_RATE;
    const env = Math.exp(-t * 80);
    const tone = Math.sin(2 * Math.PI * freq * t) * env * 0.16;
    L[i] = tone;
    R[i] = tone;
  }
  return { L, R };
}

function generateSoftOdometer(dur = 0.8) {
  const len = Math.floor(dur * SAMPLE_RATE);
  const L = new Float32Array(len);
  const R = new Float32Array(len);
  const numClicks = Math.floor(dur * 24);
  for (let c = 0; c < numClicks; c++) {
    const cTime = c * (dur / numClicks);
    const startIdx = Math.floor(cTime * SAMPLE_RATE);
    const clickLen = Math.floor(0.015 * SAMPLE_RATE);
    for (let i = 0; i < clickLen && startIdx + i < len; i++) {
      const t = i / SAMPLE_RATE;
      const env = Math.exp(-t * 150);
      const click = Math.sin(2 * Math.PI * 1800 * t) * env * 0.12;
      L[startIdx + i] += click;
      R[startIdx + i] += click;
    }
  }
  applyLowPass(L, 3500);
  applyLowPass(R, 3500);
  return { L, R };
}

function generateSoftTyping(dur = 0.8, count = 10) {
  const len = Math.floor(dur * SAMPLE_RATE);
  const L = new Float32Array(len);
  const R = new Float32Array(len);
  for (let k = 0; k < count; k++) {
    const kTime = (k / count) * dur * 0.9;
    const startIdx = Math.floor(kTime * SAMPLE_RATE);
    const clickLen = Math.floor(0.03 * SAMPLE_RATE);
    const pan = (k % 2 === 0 ? -0.2 : 0.2);
    for (let i = 0; i < clickLen && startIdx + i < len; i++) {
      const t = i / SAMPLE_RATE;
      const thud = Math.sin(2 * Math.PI * 160 * t) * Math.exp(-t * 80) * 0.14;
      const click = Math.sin(2 * Math.PI * 2200 * t) * Math.exp(-t * 120) * 0.10;
      const sample = thud + click;
      L[startIdx + i] += sample * (1 - pan);
      R[startIdx + i] += sample * (1 + pan);
    }
  }
  applyLowPass(L, 3600);
  applyLowPass(R, 3600);
  return { L, R };
}

function generateSoftWhoosh(dur = 0.6) {
  const len = Math.floor(dur * SAMPLE_RATE);
  const L = new Float32Array(len);
  const R = new Float32Array(len);
  for (let i = 0; i < len; i++) {
    const t = i / SAMPLE_RATE;
    const env = Math.sin(Math.PI * (t / dur));
    const noise = (Math.random() * 2 - 1) * env * 0.14;
    L[i] = noise;
    R[i] = noise;
  }
  applyLowPass(L, 2400);
  applyLowPass(R, 2400);
  return { L, R };
}

function generateSoftFlagFanfare() {
  const dur = 0.9;
  const len = Math.floor(dur * SAMPLE_RATE);
  const L = new Float32Array(len);
  const R = new Float32Array(len);
  const notes = [
    { freq: 587.33, offset: 0.0, dur: 0.12 },
    { freq: 783.99, offset: 0.11, dur: 0.12 },
    { freq: 1046.5, offset: 0.22, dur: 0.65 },
  ];
  notes.forEach(({ freq, offset, dur: nDur }) => {
    const startIdx = Math.floor(offset * SAMPLE_RATE);
    const nLen = Math.floor(nDur * SAMPLE_RATE);
    for (let i = 0; i < nLen && startIdx + i < len; i++) {
      const t = i / SAMPLE_RATE;
      const env = Math.exp(-t * 4.2);
      const tone = Math.sin(2 * Math.PI * freq * t) * env * 0.22;
      L[startIdx + i] += tone;
      R[startIdx + i] += tone;
    }
  });
  applyLowPass(L, 3200);
  applyLowPass(R, 3200);
  return { L, R };
}

function generateSoftClipboardPing() {
  const dur = 0.35;
  const len = Math.floor(dur * SAMPLE_RATE);
  const L = new Float32Array(len);
  const R = new Float32Array(len);
  for (let i = 0; i < len; i++) {
    const t = i / SAMPLE_RATE;
    const env = Math.exp(-t * 14);
    const tone1 = Math.sin(2 * Math.PI * 1800 * t) * 0.16;
    const tone2 = t > 0.04 ? Math.sin(2 * Math.PI * 2700 * (t - 0.04)) * 0.20 * Math.exp(-(t - 0.04) * 16) : 0;
    const sample = (tone1 + tone2) * env;
    L[i] = sample;
    R[i] = sample;
  }
  applyLowPass(L, 4000);
  applyLowPass(R, 4000);
  return { L, R };
}

function generateSoftSonarPing(dur = 2.2, freq = 980) {
  const len = Math.floor(dur * SAMPLE_RATE);
  const L = new Float32Array(len);
  const R = new Float32Array(len);
  for (let i = 0; i < len; i++) {
    const t = i / SAMPLE_RATE;
    const env = Math.exp(-t * 2.2);
    const direct = Math.sin(2 * Math.PI * freq * t) * env * 0.22;
    const delay = t > 0.12 ? Math.sin(2 * Math.PI * freq * (t - 0.12)) * Math.exp(-(t - 0.12) * 2.6) * 0.10 : 0;
    L[i] = direct + delay * 0.7;
    R[i] = direct + delay * 0.3;
  }
  applyLowPass(L, 2200);
  applyLowPass(R, 2200);
  return { L, R };
}

function generateSoftCrtShutdown(dur = 0.75) {
  const len = Math.floor(dur * SAMPLE_RATE);
  const L = new Float32Array(len);
  const R = new Float32Array(len);
  for (let i = 0; i < len; i++) {
    const t = i / SAMPLE_RATE;
    const freq = 9000 * Math.exp(-t * 8) + 60;
    const whistle = Math.sin(2 * Math.PI * freq * t) * Math.exp(-t * 4.5) * 0.18;
    L[i] = whistle;
    R[i] = whistle;
  }
  applyLowPass(L, 3000);
  applyLowPass(R, 3000);
  return { L, R };
}

// ----------------------------------------------------
// 2. BUILD VERSION A: "TACTICAL STEALTH AMBIENT" SOUNDTRACK
// ----------------------------------------------------
console.log("Synthesizing Soundtrack A: Tactical Stealth Ambient...");
const stealthL = new Float32Array(TOTAL_SAMPLES);
const stealthR = new Float32Array(TOTAL_SAMPLES);

// Atmospheric D-Minor Pad
for (let i = 0; i < TOTAL_SAMPLES; i++) {
  const t = i / SAMPLE_RATE;
  const lfo = 0.5 + 0.5 * Math.sin(2 * Math.PI * 0.12 * t);
  const d2 = Math.sin(2 * Math.PI * 73.42 * t);
  const a2 = Math.sin(2 * Math.PI * 110.0 * t);
  const f3 = Math.sin(2 * Math.PI * 174.61 * t);
  const pad = (d2 * 0.45 + a2 * 0.3 + f3 * 0.25) * (0.08 + 0.03 * lfo);

  const fadeIn = Math.min(1, t / 1.8);
  const fadeOut = Math.min(1, Math.max(0, (DURATION - t) / 2.0));
  const silence = (t >= 33.22 && t <= 33.30) ? 0 : 1;

  stealthL[i] += pad * fadeIn * fadeOut * silence;
  stealthR[i] += pad * fadeIn * fadeOut * silence;
}
applyLowPass(stealthL, 1800);
applyLowPass(stealthR, 1800);

// Stealth Rhythm (124 BPM, Muted & Warm)
const BPM_A = 124;
const beatSec_A = 60 / BPM_A;
const totalBeats_A = Math.floor(DURATION / beatSec_A);

for (let b = 0; b < totalBeats_A; b++) {
  const beatTime = b * beatSec_A;
  if (beatTime >= 33.2) break;

  // Soft round kick
  if (beatTime >= 2.4 && beatTime < 33.0) {
    const startIdx = Math.floor(beatTime * SAMPLE_RATE);
    const kLen = Math.floor(0.18 * SAMPLE_RATE);
    for (let i = 0; i < kLen && startIdx + i < TOTAL_SAMPLES; i++) {
      const t = i / SAMPLE_RATE;
      const freq = 90 * Math.exp(-t * 24) + 38;
      const sample = Math.sin(2 * Math.PI * freq * t) * Math.exp(-t * 14) * 0.36;
      stealthL[startIdx + i] += sample;
      stealthR[startIdx + i] += sample;
    }
  }

  // Soft rimshot on beats 2 & 4
  const beatInBar = b % 4;
  if (beatTime >= 4.0 && beatTime < 33.0 && (beatInBar === 1 || beatInBar === 3)) {
    const startIdx = Math.floor(beatTime * SAMPLE_RATE);
    const sLen = Math.floor(0.12 * SAMPLE_RATE);
    for (let i = 0; i < sLen && startIdx + i < TOTAL_SAMPLES; i++) {
      const t = i / SAMPLE_RATE;
      const tone = Math.sin(2 * Math.PI * 220 * t) * Math.exp(-t * 22) * 0.16;
      stealthL[startIdx + i] += tone;
      stealthR[startIdx + i] += tone;
    }
  }

  // Rolling Warm Bass
  if (beatTime >= 3.8 && beatTime < 33.0) {
    const bar = Math.floor(b / 4);
    let root = 36.71; // D1
    if (bar % 4 === 1) root = 58.27; // Bb1
    if (bar % 4 === 2) root = 48.99; // G1
    if (bar % 4 === 3) root = 55.0;  // A1

    for (let s = 0; s < 4; s++) {
      const stepTime = beatTime + s * (beatSec_A / 4);
      const startIdx = Math.floor(stepTime * SAMPLE_RATE);
      const bLen = Math.floor((beatSec_A / 4) * 0.8 * SAMPLE_RATE);
      for (let i = 0; i < bLen && startIdx + i < TOTAL_SAMPLES; i++) {
        const t = i / SAMPLE_RATE;
        const sub = Math.sin(2 * Math.PI * root * t) * 0.22;
        const warmSaw = Math.sin(2 * Math.PI * root * 2 * t) * 0.08;
        const sSample = (sub + warmSaw) * Math.exp(-t * 5);
        stealthL[startIdx + i] += sSample;
        stealthR[startIdx + i] += sSample;
      }
    }
  }
}

// Synchronize Gentle Foley across Stealth Timeline
const softBlip = generateSoftBootBlip();
[0.07, 0.33, 0.60, 0.87, 1.13].forEach((t) => mixBuffer(stealthL, stealthR, t, softBlip.L, softBlip.R, 0.5));

const braamA = generateWarmCyberBraam(2.0, 42, 84);
mixBuffer(stealthL, stealthR, 1.26, braamA.L, braamA.R, 0.65);

const clickA = generateSoftUiClick(1100);
[2.15, 2.45, 2.75].forEach((t) => mixBuffer(stealthL, stealthR, t, clickA.L, clickA.R, 0.4));

const whooshA = generateSoftWhoosh(0.6);
mixBuffer(stealthL, stealthR, 5.0, whooshA.L, whooshA.R, 0.45);

const odoA = generateSoftOdometer(0.8);
mixBuffer(stealthL, stealthR, 6.0, odoA.L, odoA.R, 0.5);

const typingA = generateSoftTyping(0.8, 12);
mixBuffer(stealthL, stealthR, 7.1, typingA.L, typingA.R, 0.45);
mixBuffer(stealthL, stealthR, 17.0, typingA.L, typingA.R, 0.45);
mixBuffer(stealthL, stealthR, 24.1, typingA.L, typingA.R, 0.4);

// Root pwn triumph
const pwnSubA = generateWarmCyberBraam(1.2, 40, 75);
mixBuffer(stealthL, stealthR, 13.66, pwnSubA.L, pwnSubA.R, 0.55);
const flagFanfareA = generateSoftFlagFanfare();
mixBuffer(stealthL, stealthR, 13.66, flagFanfareA.L, flagFanfareA.R, 0.65);

const copyPingA = generateSoftClipboardPing();
mixBuffer(stealthL, stealthR, 19.67, copyPingA.L, copyPingA.R, 0.65);

const sonarA1 = generateSoftSonarPing(2.2, 980);
mixBuffer(stealthL, stealthR, 28.0, sonarA1.L, sonarA1.R, 0.6);
const sonarA2 = generateSoftSonarPing(2.0, 1020);
mixBuffer(stealthL, stealthR, 31.4, sonarA2.L, sonarA2.R, 0.55);

const outroBraamA = generateWarmCyberBraam(2.8, 38, 76);
mixBuffer(stealthL, stealthR, 33.3, outroBraamA.L, outroBraamA.R, 0.7);

const crtA = generateSoftCrtShutdown(0.65);
mixBuffer(stealthL, stealthR, 37.4, crtA.L, crtA.R, 0.6);

// Master Soft Limiter & Normalization for Stealth
normalizeAndLimit(stealthL, stealthR, 0.42);

// Save Soundtrack A
const stealthPath = path.join(audioDir, "cyber-soundtrack-stealth.wav");
fs.writeFileSync(stealthPath, createWavBuffer(stealthL, stealthR));
console.log(`  -> Saved: ${stealthPath} (Peak: 0.42 limit)`);

// ----------------------------------------------------
// 3. BUILD VERSION B: "CINEMATIC NEON WARMTH / LO-FI SYNTHWAVE"
// ----------------------------------------------------
console.log("\nSynthesizing Soundtrack B: Cinematic Neon Warmth (Lo-Fi Synthwave)...");
const neonL = new Float32Array(TOTAL_SAMPLES);
const neonR = new Float32Array(TOTAL_SAMPLES);

// Warm Analog Synthwave Chords (D minor -> Bb major -> C major -> A minor)
const BPM_B = 118;
const beatSec_B = 60 / BPM_B;
const barSec_B = beatSec_B * 4;

const chords = [
  [146.83, 174.61, 220.0],  // D minor (D3, F3, A3)
  [116.54, 146.83, 174.61], // Bb major (Bb2, D3, F3)
  [130.81, 164.81, 196.0],  // C major (C3, E3, G3)
  [110.0, 130.81, 164.81],  // A minor (A2, C3, E3)
];

for (let i = 0; i < TOTAL_SAMPLES; i++) {
  const t = i / SAMPLE_RATE;
  if (t >= 33.22 && t <= 33.30) continue; // silence gap

  const barIdx = Math.floor(t / barSec_B) % chords.length;
  const currentChord = chords[barIdx];

  let chordSample = 0;
  currentChord.forEach((freq) => {
    chordSample += Math.sin(2 * Math.PI * freq * t) * 0.08;
    chordSample += Math.sin(2 * Math.PI * (freq * 2) * t) * 0.04; // octave warmth
  });

  const fadeIn = Math.min(1, t / 2.0);
  const fadeOut = Math.min(1, Math.max(0, (DURATION - t) / 2.2));

  neonL[i] += chordSample * fadeIn * fadeOut;
  neonR[i] += chordSample * fadeIn * fadeOut;
}
applyLowPass(neonL, 2200);
applyLowPass(neonR, 2200);

// Round Analog Groove for Neon
const totalBeats_B = Math.floor(DURATION / beatSec_B);
for (let b = 0; b < totalBeats_B; b++) {
  const beatTime = b * beatSec_B;
  if (beatTime >= 33.2) break;

  // Round lo-fi kick on beat 1 & 3
  const beatInBar = b % 4;
  if (beatTime >= 2.0 && beatTime < 33.0 && (beatInBar === 0 || beatInBar === 2)) {
    const startIdx = Math.floor(beatTime * SAMPLE_RATE);
    const kLen = Math.floor(0.20 * SAMPLE_RATE);
    for (let i = 0; i < kLen && startIdx + i < TOTAL_SAMPLES; i++) {
      const t = i / SAMPLE_RATE;
      const freq = 80 * Math.exp(-t * 20) + 36;
      const sample = Math.sin(2 * Math.PI * freq * t) * Math.exp(-t * 12) * 0.34;
      neonL[startIdx + i] += sample;
      neonR[startIdx + i] += sample;
    }
  }

  // Soft warm snare on 2 & 4
  if (beatTime >= 4.0 && beatTime < 33.0 && (beatInBar === 1 || beatInBar === 3)) {
    const startIdx = Math.floor(beatTime * SAMPLE_RATE);
    const sLen = Math.floor(0.14 * SAMPLE_RATE);
    for (let i = 0; i < sLen && startIdx + i < TOTAL_SAMPLES; i++) {
      const t = i / SAMPLE_RATE;
      const body = Math.sin(2 * Math.PI * 175 * t) * Math.exp(-t * 18) * 0.18;
      const noise = (Math.random() * 2 - 1) * Math.exp(-t * 28) * 0.06;
      neonL[startIdx + i] += body + noise;
      neonR[startIdx + i] += body + noise;
    }
  }

  // Melodic Bell / Glass Arpeggio for Neon
  if (beatTime >= 2.0 && beatTime < 33.0) {
    const startIdx = Math.floor(beatTime * SAMPLE_RATE);
    const bellNotes = [587.33, 659.25, 783.99, 880.0, 1046.5];
    const freq = bellNotes[b % bellNotes.length];
    const bLen = Math.floor(0.25 * SAMPLE_RATE);
    for (let i = 0; i < bLen && startIdx + i < TOTAL_SAMPLES; i++) {
      const t = i / SAMPLE_RATE;
      const tone = Math.sin(2 * Math.PI * freq * t) * Math.exp(-t * 10) * 0.10;
      const pan = Math.sin(b * 0.8) * 0.3;
      neonL[startIdx + i] += tone * (1 - pan);
      neonR[startIdx + i] += tone * (1 + pan);
    }
  }
}

// Gentle Foley for Neon
mixBuffer(neonL, neonR, 1.26, braamA.L, braamA.R, 0.60);
mixBuffer(neonL, neonR, 5.0, whooshA.L, whooshA.R, 0.40);
mixBuffer(neonL, neonR, 6.0, odoA.L, odoA.R, 0.45);
mixBuffer(neonL, neonR, 7.1, typingA.L, typingA.R, 0.40);
mixBuffer(neonL, neonR, 13.66, flagFanfareA.L, flagFanfareA.R, 0.60);
mixBuffer(neonL, neonR, 17.0, typingA.L, typingA.R, 0.40);
mixBuffer(neonL, neonR, 19.67, copyPingA.L, copyPingA.R, 0.60);
mixBuffer(neonL, neonR, 28.0, sonarA1.L, sonarA1.R, 0.55);
mixBuffer(neonL, neonR, 33.3, outroBraamA.L, outroBraamA.R, 0.68);
mixBuffer(neonL, neonR, 37.4, crtA.L, crtA.R, 0.55);

// Master Soft Limiter & Normalization for Neon
normalizeAndLimit(neonL, neonR, 0.42);

// Save Soundtrack B
const neonPath = path.join(audioDir, "cyber-soundtrack-neon.wav");
fs.writeFileSync(neonPath, createWavBuffer(neonL, neonR));
console.log(`  -> Saved: ${neonPath} (Peak: 0.42 limit)`);

// Also save default cyber-soundtrack.wav as stealth for backward compat
fs.copyFileSync(stealthPath, path.join(audioDir, "cyber-soundtrack.wav"));
console.log("  -> Synced default cyber-soundtrack.wav to stealth master.");

console.log("\n Dual soundtrack synthesis successfully finished!");
