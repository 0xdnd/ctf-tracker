import fs from "fs";

const file = "C:/Users/DANIEL/.gemini/antigravity/brain/f2933c58-30ba-440e-890b-f467d73bbc29/.user_uploaded/uploaded_media_1791309336269.wav";
const stat = fs.statSync(file);
const buf = fs.readFileSync(file);
const riff = buf.toString("ascii", 0, 4);
const wave = buf.toString("ascii", 8, 12);
const channels = buf.readUInt16LE(22);
const sampleRate = buf.readUInt32LE(24);
const bitsPerSample = buf.readUInt16LE(34);
const dataSize = buf.readUInt32LE(40);
const duration = dataSize / (sampleRate * channels * (bitsPerSample / 8));

console.log({
  riff,
  wave,
  channels,
  sampleRate,
  bitsPerSample,
  dataSize,
  durationSeconds: duration,
  fileSizeBytes: stat.size,
});

// Let's also check peak amplitude and RMS
let maxPeak = 0;
let sumSq = 0;
let sampleCount = 0;

for (let i = 44; i < buf.length - 2; i += 2) {
  const sample = buf.readInt16LE(i) / 32768;
  const abs = Math.abs(sample);
  if (abs > maxPeak) maxPeak = abs;
  sumSq += sample * sample;
  sampleCount++;
}

const rms = Math.sqrt(sumSq / sampleCount);
console.log({
  maxPeak,
  peakDb: 20 * Math.log10(maxPeak),
  rms,
  rmsDb: 20 * Math.log10(rms),
});
