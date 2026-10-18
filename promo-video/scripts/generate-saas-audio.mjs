// generate-saas-audio.mjs
// Modern Neoclassical & Indie Electronic Tech Soundtrack for ZeroBox Modern SaaS Promo
// 116 BPM, C Major / A Minor, 30.0 Seconds, 44.1kHz Stereo PCM WAV
// 100% Zero-Egress, Calibrated for Soft, Non-Fatiguing, High-Production Broadcast (Peak 0.38)
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const audioDir = path.resolve(__dirname, "../public/audio");
if (!fs.existsSync(audioDir)) fs.mkdirSync(audioDir, { recursive: true });

const SAMPLE_RATE = 44100;
const DURATION = 30.0; // 30 seconds = 900 frames at 30 fps
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

// Low-Pass Filter helper for organic warmth
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

// Helper to mix audio with timing offset
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

console.log("Synthesizing Modern SaaS Electronic Soundtrack (30.0s)...");
const L = new Float32Array(TOTAL_SAMPLES);
const R = new Float32Array(TOTAL_SAMPLES);

const BPM = 116;
const beatSec = 60 / BPM; // ~0.5172s
const barSec = beatSec * 4; // ~2.0689s
const totalBeats = Math.floor(DURATION / beatSec);

// ----------------------------------------------------
// 1. Lush Electric Piano / Rhodes Ambient Chords
// ----------------------------------------------------
// Chords progression: Cmaj7 -> Am7 -> Fmaj7 -> Gsus4 -> Cmaj7
const chordProgression = [
  [130.81, 164.81, 196.0, 246.94], // Cmaj7 (C3, E3, G3, B3)
  [110.0, 130.81, 164.81, 196.0],  // Am7 (A2, C3, E3, G3)
  [87.31, 130.81, 174.61, 220.0],  // Fmaj7 (F2, C3, F3, A3)
  [98.0, 146.83, 196.0, 261.63],   // Gsus4/G (G2, D3, G3, C4)
];

console.log("Generating warm electric piano / Rhodes ambient chords...");
for (let i = 0; i < TOTAL_SAMPLES; i++) {
  const t = i / SAMPLE_RATE;
  if (t >= 28.5) continue; // gentle outro fade

  const barIdx = Math.floor(t / barSec) % chordProgression.length;
  const currentChord = chordProgression[barIdx];
  const barTime = t % barSec;

  // Gentle Rhodes bell hammer transient + warm sustained body
  const chordEnv = Math.exp(-barTime * 0.85);
  let chordSample = 0;
  currentChord.forEach((freq, idx) => {
    // Pure sine with gentle second harmonic for electric piano bell tone
    const fundamental = Math.sin(2 * Math.PI * freq * t) * 0.09;
    const harmonic = Math.sin(2 * Math.PI * (freq * 2) * t) * 0.035 * Math.exp(-barTime * 2.2);
    chordSample += fundamental + harmonic;
  });

  // Slow stereo tremolo / chorus
  const tremolo = 1 + 0.12 * Math.sin(2 * Math.PI * 1.5 * t);
  const fadeIn = Math.min(1, t / 1.5);
  const fadeOut = Math.min(1, Math.max(0, (DURATION - t) / 2.0));

  L[i] += chordSample * chordEnv * tremolo * fadeIn * fadeOut;
  R[i] += chordSample * chordEnv * (2 - tremolo) * fadeIn * fadeOut;
}
applyLowPass(L, 2400);
applyLowPass(R, 2400);

// ----------------------------------------------------
// 2. Mellow Organic Drums & Soft Bass
// ----------------------------------------------------
console.log("Generating mellow organic drum groove & warm sub bass...");

function addSoftKick(startSec) {
  const startIdx = Math.floor(startSec * SAMPLE_RATE);
  const len = Math.floor(0.18 * SAMPLE_RATE);
  for (let i = 0; i < len && startIdx + i < TOTAL_SAMPLES; i++) {
    const t = i / SAMPLE_RATE;
    const freq = 75 * Math.exp(-t * 22) + 36;
    const sample = Math.sin(2 * Math.PI * freq * t) * Math.exp(-t * 12) * 0.28;
    L[startIdx + i] += sample;
    R[startIdx + i] += sample;
  }
}

function addFingerSnap(startSec) {
  const startIdx = Math.floor(startSec * SAMPLE_RATE);
  const len = Math.floor(0.08 * SAMPLE_RATE);
  for (let i = 0; i < len && startIdx + i < TOTAL_SAMPLES; i++) {
    const t = i / SAMPLE_RATE;
    const snapTone = Math.sin(2 * Math.PI * 1450 * t) * Math.exp(-t * 45) * 0.10;
    const snapNoise = (Math.random() * 2 - 1) * Math.exp(-t * 60) * 0.07;
    L[startIdx + i] += (snapTone + snapNoise) * 0.9;
    R[startIdx + i] += (snapTone + snapNoise) * 1.1;
  }
}

function addSoftShaker(startSec, vol = 0.05) {
  const startIdx = Math.floor(startSec * SAMPLE_RATE);
  const len = Math.floor(0.035 * SAMPLE_RATE);
  for (let i = 0; i < len && startIdx + i < TOTAL_SAMPLES; i++) {
    const t = i / SAMPLE_RATE;
    const noise = (Math.random() * 2 - 1) * Math.exp(-t * 85) * vol;
    L[startIdx + i] += noise;
    R[startIdx + i] += noise;
  }
}

function addWarmBass(startSec, durSec, freq) {
  const startIdx = Math.floor(startSec * SAMPLE_RATE);
  const len = Math.floor(durSec * SAMPLE_RATE);
  for (let i = 0; i < len && startIdx + i < TOTAL_SAMPLES; i++) {
    const t = i / SAMPLE_RATE;
    const sub = Math.sin(2 * Math.PI * freq * t) * 0.22;
    const warmOver = Math.sin(2 * Math.PI * (freq * 2) * t) * 0.06;
    const sample = (sub + warmOver) * Math.exp(-t * 3.5);
    L[startIdx + i] += sample;
    R[startIdx + i] += sample;
  }
}

for (let b = 0; b < totalBeats; b++) {
  const beatTime = b * beatSec;
  if (beatTime >= 27.5) break;

  const beatInBar = b % 4;

  // Soft kick on beat 1 & 3 (starts at 2.0s)
  if (beatTime >= 2.0 && (beatInBar === 0 || beatInBar === 2)) {
    addSoftKick(beatTime);
  }

  // Finger snap on beats 2 & 4 (starts at 4.0s)
  if (beatTime >= 4.0 && (beatInBar === 1 || beatInBar === 3)) {
    addFingerSnap(beatTime);
  }

  // 16th note soft shakers (starts at 4.0s)
  if (beatTime >= 4.0) {
    for (let s = 0; s < 4; s++) {
      const stepTime = beatTime + s * (beatSec / 4);
      addSoftShaker(stepTime, s === 0 ? 0.06 : 0.03);
    }
  }

  // Warm Bassline (starts at 4.0s)
  if (beatTime >= 4.0) {
    const barIdx = Math.floor(b / 4) % chordProgression.length;
    const rootNotes = [65.41, 55.0, 43.65, 48.99]; // C2, A1, F1, G1
    const rootFreq = rootNotes[barIdx];
    if (beatInBar === 0 || beatInBar === 2) {
      addWarmBass(beatTime, beatSec * 0.9, rootFreq);
    }
  }
}

// ----------------------------------------------------
// 3. Delicate Marimba & Crystal Bell Arpeggios
// ----------------------------------------------------
console.log("Generating delicate marimba & bell arpeggios...");
const arpeggioNotes = [
  523.25, 659.25, 783.99, 1046.5, // C5, E5, G5, C6
  440.0, 523.25, 659.25, 880.0,   // A4, C5, E5, A5
  349.23, 440.0, 523.25, 698.46,  // F4, A4, C5, F5
  392.0, 493.88, 587.33, 783.99,  // G4, B4, D5, G5
];

for (let b = 0; b < totalBeats; b++) {
  const beatTime = b * beatSec;
  if (beatTime < 4.0 || beatTime >= 27.0) continue;

  for (let s = 0; s < 2; s++) {
    const stepTime = beatTime + s * (beatSec / 2);
    const startIdx = Math.floor(stepTime * SAMPLE_RATE);
    const noteIdx = (b * 2 + s) % arpeggioNotes.length;
    const freq = arpeggioNotes[noteIdx];
    const mLen = Math.floor(0.22 * SAMPLE_RATE);
    const pan = Math.sin((b * 2 + s) * 0.7) * 0.35;

    for (let i = 0; i < mLen && startIdx + i < TOTAL_SAMPLES; i++) {
      const t = i / SAMPLE_RATE;
      const marimba = Math.sin(2 * Math.PI * freq * t) * Math.exp(-t * 14) * 0.08;
      L[startIdx + i] += marimba * (1 - pan);
      R[startIdx + i] += marimba * (1 + pan);
    }
  }
}

// ----------------------------------------------------
// 4. Modern Haptic UI Foley (Tactile, Soft, Elegant)
// ----------------------------------------------------
console.log("Adding modern haptic UI Foley...");

function createHapticTap(freq = 1600) {
  const dur = 0.03;
  const len = Math.floor(dur * SAMPLE_RATE);
  const tapL = new Float32Array(len);
  const tapR = new Float32Array(len);
  for (let i = 0; i < len; i++) {
    const t = i / SAMPLE_RATE;
    const tone = Math.sin(2 * Math.PI * freq * t) * Math.exp(-t * 90) * 0.14;
    tapL[i] = tone;
    tapR[i] = tone;
  }
  return { tapL, tapR };
}

function createSmoothAirWhoosh(dur = 0.5) {
  const len = Math.floor(dur * SAMPLE_RATE);
  const wL = new Float32Array(len);
  const wR = new Float32Array(len);
  for (let i = 0; i < len; i++) {
    const t = i / SAMPLE_RATE;
    const env = Math.sin(Math.PI * (t / dur));
    const noise = (Math.random() * 2 - 1) * env * 0.09;
    wL[i] = noise;
    wR[i] = noise;
  }
  applyLowPass(wL, 1600);
  applyLowPass(wR, 1600);
  return { wL, wR };
}

function createSuccessChime() {
  const dur = 0.8;
  const len = Math.floor(dur * SAMPLE_RATE);
  const cL = new Float32Array(len);
  const cR = new Float32Array(len);
  const notes = [
    { freq: 523.25, time: 0.0 }, // C5
    { freq: 659.25, time: 0.08 }, // E5
    { freq: 783.99, time: 0.16 }, // G5
    { freq: 1046.5, time: 0.24 }, // C6
  ];
  notes.forEach(({ freq, time }) => {
    const startIdx = Math.floor(time * SAMPLE_RATE);
    const nLen = Math.floor((dur - time) * SAMPLE_RATE);
    for (let i = 0; i < nLen && startIdx + i < len; i++) {
      const t = i / SAMPLE_RATE;
      const tone = Math.sin(2 * Math.PI * freq * t) * Math.exp(-t * 5.5) * 0.14;
      cL[startIdx + i] += tone;
      cR[startIdx + i] += tone;
    }
  });
  return { cL, cR };
}

// Scene 1: Hero reveal soft entrance whoosh (1.2s)
const haptic1 = createHapticTap(1800);
const airWhoosh = createSmoothAirWhoosh(0.6);
mix(L, R, 1.2, airWhoosh.wL, airWhoosh.wR, 0.6);
mix(L, R, 1.5, haptic1.tapL, haptic1.tapR, 0.5);

// Scene 2: Target Intelligence matrix slide (5.0s)
mix(L, R, 5.0, airWhoosh.wL, airWhoosh.wR, 0.5);
[5.3, 5.6, 5.9].forEach((t) => mix(L, R, t, haptic1.tapL, haptic1.tapR, 0.4));

// Scene 3: Workflow Board card glide & Root Pwn success chime (13.5s)
mix(L, R, 10.0, airWhoosh.wL, airWhoosh.wR, 0.45);
const success = createSuccessChime();
mix(L, R, 13.5, success.cL, success.cR, 0.65);

// Scene 4: Payload studio copy interaction (18.5s)
const copyTap = createHapticTap(2200);
mix(L, R, 18.5, copyTap.tapL, copyTap.tapR, 0.55);

// Scene 5: Exam Mode countdown & export chime (23.0s, 26.5s)
mix(L, R, 23.0, haptic1.tapL, haptic1.tapR, 0.4);
mix(L, R, 26.5, success.cL, success.cR, 0.55);

// Scene 6: Outro Launch call to action (28.0s)
const outroWhoosh = createSmoothAirWhoosh(0.8);
mix(L, R, 28.0, outroWhoosh.wL, outroWhoosh.wR, 0.6);

// ----------------------------------------------------
// 5. Final Soft Limiting & Broadcast Normalization (0.38 Peak)
// ----------------------------------------------------
let peakAmp = 0;
for (let i = 0; i < TOTAL_SAMPLES; i++) {
  if (Math.abs(L[i]) > peakAmp) peakAmp = Math.abs(L[i]);
  if (Math.abs(R[i]) > peakAmp) peakAmp = Math.abs(R[i]);
}
console.log(`Peak raw amplitude: ${peakAmp.toFixed(3)} -> Normalizing to 0.38 comfortable broadcast peak.`);
const targetPeak = 0.38;
const normFactor = targetPeak / Math.max(targetPeak, peakAmp);

for (let i = 0; i < TOTAL_SAMPLES; i++) {
  L[i] = Math.tanh(L[i] * normFactor);
  R[i] = Math.tanh(R[i] * normFactor);
}

const outPath = path.join(audioDir, "saas-soundtrack.wav");
fs.writeFileSync(outPath, createWavBuffer(L, R));
const stats = fs.statSync(outPath);
console.log(`\n Successfully generated Modern SaaS Soundtrack:`);
console.log(`  -> Path: ${outPath}`);
console.log(`  -> Size: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);
console.log(`  -> Duration: ${DURATION}s (Peak: 0.38, 100% gentle on ears)`);
