import fs from "fs";
import path from "path";

const filePath = path.resolve("src/components-showcase/AuthenticZeroBoxUI.tsx");
let content = fs.readFileSync(filePath, "utf-8");

// 1. Add import
if (!content.includes('import { AttackGraphTopology }')) {
  content = content.replace(
    'import { THEME_PRESETS, ThemePreset } from "../styles/theme";',
    'import { THEME_PRESETS, ThemePreset } from "../styles/theme";\nimport { AttackGraphTopology } from "./AttackGraphShowcase";'
  );
}

// 2. Replace Act 5 Right column:
// Look for "{/* Right: Authentic Attack Graph Topology (graph-2400.webp) */}" to "</div>\n              </div>\n            </div>\n          )}"
const act5RightMarker = '{/* Right: Authentic Attack Graph Topology (graph-2400.webp) */}';
const act5EndMarker = '            </div>\n          )}\n\n          {/* ACT 6: Apple/SaaS 3D Perspective Device Finale */}';

const act5RightIdx = content.indexOf(act5RightMarker);
const act5EndIdx = content.indexOf(act5EndMarker);

if (act5RightIdx === -1 || act5EndIdx === -1) {
  console.error("Markers not found:", { act5RightIdx, act5EndIdx });
  process.exit(1);
}

const replacementAct5Right = `{/* Right: Live Dynamic AD Pivoting Attack Graph */}
              <div style={{ height: "100%", overflow: "hidden" }}>
                <AttackGraphTopology progress={actProgress} themePreset={themePreset} height="100%" />
              </div>
`;

// Also cut out Act 6 dead code:
// From "{/* ACT 6: Apple/SaaS 3D Perspective Device Finale */}" to the closing tag before "</div>\n      </div>\n    </div>\n  );\n};"
const act6Marker = '{/* ACT 6: Apple/SaaS 3D Perspective Device Finale */}';
const act6Idx = content.indexOf(act6Marker);
const finalCloseMarker = '        </div>\n      </div>\n    </div>\n  );\n};';
const finalCloseIdx = content.lastIndexOf(finalCloseMarker);

if (act6Idx === -1 || finalCloseIdx === -1) {
  console.error("Act 6 markers not found:", { act6Idx, finalCloseIdx });
  process.exit(1);
}

const beforeAct5Right = content.slice(0, act5RightIdx);
const newContent = beforeAct5Right + replacementAct5Right + '            </div>\n          )}\n' + content.slice(finalCloseIdx);

fs.writeFileSync(filePath, newContent, "utf-8");
console.log("Successfully updated AuthenticZeroBoxUI.tsx!");
