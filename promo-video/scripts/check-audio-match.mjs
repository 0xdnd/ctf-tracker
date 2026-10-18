import fs from "fs";

const fileUploaded = "C:/Users/DANIEL/.gemini/antigravity/brain/f2933c58-30ba-440e-890b-f467d73bbc29/.user_uploaded/uploaded_media_1791309336269.wav";
const f1 = fs.readFileSync(fileUploaded);
const fStealth = fs.readFileSync("c:/Users/DANIEL/Desktop/Projects/ctf-tracker/promo-video/public/audio/cyber-soundtrack-stealth.wav");
const fNeon = fs.readFileSync("c:/Users/DANIEL/Desktop/Projects/ctf-tracker/promo-video/public/audio/cyber-soundtrack-neon.wav");
const fOrig = fs.readFileSync("c:/Users/DANIEL/Desktop/Projects/ctf-tracker/promo-video/public/audio/cyber-soundtrack.wav");

console.log("Equal to cyber-soundtrack-stealth:", f1.equals(fStealth));
console.log("Equal to cyber-soundtrack-neon:", f1.equals(fNeon));
console.log("Equal to cyber-soundtrack (original):", f1.equals(fOrig));
