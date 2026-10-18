import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const targetFile = path.resolve(__dirname, "../src/components-showcase/AuthenticZeroBoxUI.tsx");
let content = fs.readFileSync(targetFile, "utf-8");

// 1. Act 2 Replacement: Replace 3x3 Machine Grid with authentic table-1938.webp
const act2GridStart = content.indexOf("{/* 3x3 Dense Machine Matrix */}");
const act2GridEnd = content.indexOf("{/* Bottom Dense Status Strip */}", act2GridStart);

if (act2GridStart === -1 || act2GridEnd === -1) {
  console.error("Act 2 grid markers not found!");
  process.exit(1);
}

const act2Replacement = `{/* Authentic Target Inventory Table from actual project (table-1938.webp) */}
              <div
                style={{
                  flex: 1,
                  position: "relative",
                  borderRadius: 12,
                  border: \`1px solid \${tokens.borderSubtle}\`,
                  backgroundColor: tokens.surfaceCard,
                  overflow: "hidden",
                  boxShadow: "0 10px 30px rgba(0, 0, 0, 0.6)",
                  display: "flex",
                  flexDirection: "column",
                }}
              >
                <Img
                  src={staticFile("images/landing/table-1938.webp")}
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                    objectPosition: "top center",
                    filter: "contrast(1.05) brightness(1.02)",
                  }}
                />

                {/* Living Dynamic Selection Overlay for Sequel row (10.129.1.7) */}
                <div
                  style={{
                    position: "absolute",
                    top: "14.2%",
                    left: "0.8%",
                    right: "0.8%",
                    height: "11.2%",
                    borderRadius: 8,
                    border: \`1.5px solid \${tokens.cyberAccent}\`,
                    backgroundColor: tokens.cyberAccentBg,
                    boxShadow: \`0 0 24px \${tokens.cyberAccentGlow}\`,
                    pointerEvents: "none",
                    opacity: currentAct === 2 && actProgress > 0.35 ? 0.95 : 0,
                    transition: "opacity 0.2s ease",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "flex-end",
                    paddingRight: 20,
                  }}
                >
                  <span
                    style={{
                      backgroundColor: tokens.cyberAccent,
                      color: "#000000",
                      fontSize: 10,
                      fontWeight: 800,
                      fontFamily: "monospace",
                      padding: "3px 9px",
                      borderRadius: 4,
                      boxShadow: \`0 0 12px \${tokens.cyberAccentGlow}\`,
                    }}
                  >
                    ACTIVE TARGET SELECTED
                  </span>
                </div>

                {/* Tactical Search Query Indicator */}
                {searchQuery && (
                  <div
                    style={{
                      position: "absolute",
                      top: 12,
                      right: 18,
                      backgroundColor: tokens.surfaceElevated,
                      border: \`1px solid \${tokens.cyberAccent}\`,
                      borderRadius: 6,
                      padding: "4px 10px",
                      fontSize: 10,
                      fontFamily: "monospace",
                      color: tokens.cyberAccent,
                      boxShadow: \`0 0 15px \${tokens.cyberAccentGlow}\`,
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                    }}
                  >
                    <Search size={10} />
                    <span>Filtering: "{searchQuery}" (Match: 57 items)</span>
                  </div>
                )}
              </div>

              `;

content = content.slice(0, act2GridStart) + act2Replacement + content.slice(act2GridEnd);

// 2. Act 3 Replacement: Replace Synthetic Kanban with authentic hero-app-1575.webp
const act3Start = content.indexOf("{/* ACT 3: Dense 5-Stage Kanban Board */}");
const act3End = content.indexOf("{/* ACT 4: Dense Split Workstation (RevShell Studio) */}", act3Start);

if (act3Start === -1 || act3End === -1) {
  console.error("Act 3 markers not found!");
  process.exit(1);
}

const act3Replacement = `{/* ACT 3: Authentic Kanban Board from Actual Project (hero-app-1575.webp) */}
          {/* ==================================================== */}
          {currentAct === 3 && (
            <div style={{ display: "flex", flexDirection: "column", height: "100%", gap: 8, position: "relative" }}>
              {/* Kanban Frame with Authentic hero-app-1575.webp Capture */}
              <div
                style={{
                  flex: 1,
                  position: "relative",
                  borderRadius: 12,
                  border: \`1px solid \${tokens.borderSubtle}\`,
                  backgroundColor: tokens.surfaceCard,
                  overflow: "hidden",
                  boxShadow: "0 10px 30px rgba(0, 0, 0, 0.6)",
                  display: "flex",
                  flexDirection: "column",
                }}
              >
                <Img
                  src={staticFile("images/landing/hero-app-1575.webp")}
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                    objectPosition: "top right",
                    filter: "contrast(1.05) brightness(1.02)",
                  }}
                />

                {/* Confetti Explosion on Root Pwn Drop */}
                {isRootPwned && confettiProgress > 0 && (
                  <ConfettiBurst progress={confettiProgress} />
                )}

                {/* Living Dragged Card Overlay: Three (10.129.1.14) */}
                {kanbanDragProgress > 0 && !isRootPwned && (
                  <div
                    style={{
                      position: "absolute",
                      left: \`calc(28% + (46% * \${kanbanDragProgress}))\`,
                      top: \`calc(28% + (sin(\${kanbanDragProgress} * 3.14159) * -30px))\`,
                      width: 260,
                      backgroundColor: "rgba(10, 14, 22, 0.96)",
                      border: \`2px solid \${tokens.cyberAccent}\`,
                      borderRadius: 10,
                      padding: "10px 14px",
                      boxShadow: \`0 20px 40px rgba(0, 0, 0, 0.9), 0 0 30px \${tokens.cyberAccentGlow}\`,
                      transform: \`rotate(\${kanbanDragProgress * 4 - 2}deg) scale(1.05)\`,
                      zIndex: 100,
                      pointerEvents: "none",
                      display: "flex",
                      flexDirection: "column",
                      gap: 6,
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <div style={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: "#F59E0B" }} />
                        <span style={{ fontSize: 13, fontWeight: 800, color: tokens.textPrimary }}>Three</span>
                      </div>
                      <span
                        style={{
                          fontSize: 9,
                          fontFamily: "monospace",
                          color: tokens.cyberAccent,
                          backgroundColor: tokens.cyberAccentBg,
                          padding: "2px 6px",
                          borderRadius: 4,
                          fontWeight: 700,
                        }}
                      >
                        MOVING TO PWNED
                      </span>
                    </div>

                    <div
                      style={{
                        backgroundColor: tokens.surfaceSunken,
                        padding: "4px 8px",
                        borderRadius: 5,
                        fontFamily: "monospace",
                        fontSize: 11,
                        color: tokens.textSecondary,
                        border: \`1px solid \${tokens.borderSubtle}\`,
                      }}
                    >
                      10.129.1.14
                    </div>

                    <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                      <span
                        style={{
                          fontSize: 9,
                          backgroundColor: "rgba(234, 88, 12, 0.2)",
                          color: "#FB923C",
                          padding: "1px 6px",
                          borderRadius: 4,
                          fontWeight: 700,
                        }}
                      >
                        🐧 Linux
                      </span>
                      <span
                        style={{
                          fontSize: 9,
                          backgroundColor: "rgba(56, 189, 248, 0.2)",
                          color: "#38BDF8",
                          padding: "1px 6px",
                          borderRadius: 4,
                          fontWeight: 700,
                        }}
                      >
                        Very Easy
                      </span>
                      <span style={{ fontSize: 9, color: tokens.textMuted }}>+1</span>
                    </div>
                  </div>
                )}

                {/* Root Pwned Success Banner across Completed Column */}
                {isRootPwned && (
                  <div
                    style={{
                      position: "absolute",
                      top: "22%",
                      right: "6%",
                      width: "36%",
                      backgroundColor: "rgba(10, 20, 15, 0.95)",
                      border: \`2px solid \${tokens.cyberAccent}\`,
                      borderRadius: 12,
                      padding: "16px 20px",
                      boxShadow: \`0 0 40px \${tokens.cyberAccentGlow}\`,
                      display: "flex",
                      alignItems: "center",
                      gap: 14,
                      zIndex: 90,
                    }}
                  >
                    <div
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: "50%",
                        backgroundColor: tokens.cyberAccentBg,
                        border: \`2px solid \${tokens.cyberAccent}\`,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <CheckCircle2 size={20} color={tokens.cyberAccent} />
                    </div>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 900, color: tokens.textPrimary }}>
                        TARGET SECURED · ROOT PWNED!
                      </div>
                      <div style={{ fontSize: 10, color: tokens.cyberAccent, fontFamily: "monospace", marginTop: 2 }}>
                        Three (10.129.1.14) → Loot Stored in Encrypted Vault
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Kanban Bottom Analytics Rail */}
              <div
                style={{
                  height: 30,
                  backgroundColor: tokens.surfaceCard,
                  borderRadius: 7,
                  border: \`1px solid \${tokens.borderSubtle}\`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "0 12px",
                  fontSize: 10,
                  color: tokens.textMuted,
                  flexShrink: 0,
                }}
              >
                <span>Tactical Engagement Velocity: 3.4 hrs / Pwned Machine</span>
                <span style={{ color: tokens.cyberAccent, fontWeight: 700 }}>
                  CPTS Path Milestone: 58 / 70 Targets Secured (83%)
                </span>
              </div>
            </div>
          )}

          `;

content = content.slice(0, act3Start) + act3Replacement + content.slice(act3End);

// 3. Act 5 Replacement: Replace Synthetic Exam/Graph with authentic exam-2226.webp & graph-2400.webp
const act5Start = content.indexOf("{/* ACT 5: 24h Exam HUD + AD Pivoting Attack Graph */}");
const act5End = content.indexOf("{/* ACT 6: Apple/SaaS 3D Perspective Device Finale */}", act5Start);

if (act5Start === -1 || act5End === -1) {
  console.error("Act 5 markers not found!");
  process.exit(1);
}

const act5Replacement = `{/* ACT 5: Authentic 24h Exam HUD & Attack Graph Captures from Actual Project */}
          {/* ==================================================== */}
          {currentAct === 5 && (
            <div style={{ display: "grid", gridTemplateColumns: "1.1fr 1fr", gap: 10, height: "100%" }}>
              {/* Left: Authentic OffSec OSCP (PEN-200) Exam HUD (exam-2226.webp) */}
              <div
                style={{
                  backgroundColor: tokens.surfaceCard,
                  borderRadius: 11,
                  border: \`1.5px solid \${tokens.borderAccent}\`,
                  overflow: "hidden",
                  boxShadow: \`0 0 30px \${tokens.cyberAccentGlow}\`,
                  display: "flex",
                  flexDirection: "column",
                  position: "relative",
                }}
              >
                <Img
                  src={staticFile("images/landing/exam-2226.webp")}
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                    objectPosition: "top center",
                    filter: "contrast(1.05) brightness(1.02)",
                  }}
                />

                {/* Live Active Countdown Badge Overlay */}
                <div
                  style={{
                    position: "absolute",
                    top: "13%",
                    right: "12%",
                    backgroundColor: tokens.surfaceBase,
                    border: \`1.5px solid \${tokens.cyberAccent}\`,
                    borderRadius: 8,
                    padding: "4px 10px",
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    boxShadow: \`0 0 16px \${tokens.cyberAccentGlow}\`,
                  }}
                >
                  <Clock size={12} color={tokens.cyberAccent} />
                  <span style={{ fontSize: 13, fontFamily: "monospace", fontWeight: 800, color: tokens.cyberAccent }}>
                    {examHoursLeft.toString().padStart(2, "0")}:{examMinsLeft.toString().padStart(2, "0")}:18
                  </span>
                </div>

                {/* Dynamic Passing Score Callout */}
                <div
                  style={{
                    position: "absolute",
                    bottom: 12,
                    left: 12,
                    right: 12,
                    backgroundColor: "rgba(10, 14, 20, 0.95)",
                    border: \`1px solid \${tokens.borderSubtle}\`,
                    borderRadius: 7,
                    padding: "6px 10px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    fontSize: 10,
                    fontFamily: "monospace",
                  }}
                >
                  <span style={{ color: tokens.textSecondary }}>OffSec PEN-200 Protocol: Alex Morgan</span>
                  <span style={{ color: tokens.cyberAccent, fontWeight: 700 }}>85/100 PTS · PASSING CRITERIA MET</span>
                </div>
              </div>

              {/* Right: Authentic Attack Graph Topology (graph-2400.webp) */}
              <div
                style={{
                  backgroundColor: tokens.surfaceCard,
                  borderRadius: 11,
                  border: \`1px solid \${tokens.borderSubtle}\`,
                  overflow: "hidden",
                  boxShadow: "0 10px 30px rgba(0, 0, 0, 0.6)",
                  display: "flex",
                  flexDirection: "column",
                  position: "relative",
                }}
              >
                {/* Header Strip */}
                <div
                  style={{
                    height: 38,
                    backgroundColor: tokens.surfaceSunken,
                    borderBottom: \`1px solid \${tokens.borderSubtle}\`,
                    padding: "0 12px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    flexShrink: 0,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <Network size={14} color={tokens.cyberAccent} />
                    <span style={{ fontSize: 11, fontWeight: 800, color: tokens.textPrimary }}>
                      Live Pivoting Attack Graph
                    </span>
                  </div>
                  <span
                    style={{
                      fontSize: 9,
                      fontFamily: "monospace",
                      color: tokens.cyberAccent,
                      backgroundColor: tokens.cyberAccentBg,
                      padding: "2px 6px",
                      borderRadius: 4,
                      fontWeight: 700,
                    }}
                  >
                    4 ACTIVE TUNNELS
                  </span>
                </div>

                <div style={{ flex: 1, position: "relative", overflow: "hidden" }}>
                  <Img
                    src={staticFile("images/landing/graph-2400.webp")}
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                      objectPosition: "center",
                      filter: "contrast(1.08) brightness(1.05)",
                    }}
                  />

                  {/* Pulsing Pivot Beacon over Ligolo Agent */}
                  <div
                    style={{
                      position: "absolute",
                      top: "42%",
                      left: "58%",
                      width: 14,
                      height: 14,
                      borderRadius: "50%",
                      backgroundColor: tokens.cyberAccent,
                      boxShadow: \`0 0 20px \${tokens.cyberAccentGlow}\`,
                      transform: "translate(-50%, -50%)",
                    }}
                  />
                </div>

                {/* Bottom Tunnel Telemetry Strip */}
                <div
                  style={{
                    height: 32,
                    backgroundColor: tokens.surfaceSunken,
                    borderTop: \`1px solid \${tokens.borderSubtle}\`,
                    padding: "0 12px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    fontSize: 9,
                    fontFamily: "monospace",
                    color: tokens.textMuted,
                    flexShrink: 0,
                  }}
                >
                  <div style={{ display: "flex", gap: 8 }}>
                    <span style={{ color: "#38bdf8" }}>SSH :22</span>
                    <span>•</span>
                    <span style={{ color: "#38bdf8" }}>chisel :8000</span>
                    <span>•</span>
                    <span style={{ color: "#38bdf8" }}>ligolo-ng :11601</span>
                  </div>
                  <span style={{ color: tokens.cyberAccent, fontWeight: 700 }}>Latency: 14ms · Zero Packet Loss</span>
                </div>
              </div>
            </div>
          )}

          `;

content = content.slice(0, act5Start) + act5Replacement + content.slice(act5End);

fs.writeFileSync(targetFile, content, "utf-8");
console.log("Successfully updated AuthenticZeroBoxUI.tsx with authentic project captures!");
