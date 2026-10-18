"""
Offline axe-core contrast / WCAG scanner for ZeroBox.

Zero network beyond localhost: axe is injected from node_modules/axe-core/axe.min.js.
Scans each main route x 3 presets (obsidian, monolith, htb) x 2 modes (light, dark):
  - pass 1: runOnly color-contrast
  - pass 2: runOnly wcag2a + wcag2aa tags (all rules)
Also runs a keyboard Tab-through focus-ring check on the tracker route.

Reporter only: always exits 0. Output JSON defaults to <repo>/reports/axe-report.json;
override with --out <path> or AXE_REPORT_PATH.
"""
import sys
import os
import json
import time

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')
if hasattr(sys.stderr, 'reconfigure'):
    sys.stderr.reconfigure(encoding='utf-8', errors='replace')

import subprocess
import urllib.request
from playwright.sync_api import sync_playwright

BASE = "http://localhost:3000"
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
AXE_PATH = os.path.join(ROOT, "node_modules", "axe-core", "axe.min.js")
DEFAULT_REPORT_PATH = os.path.join(ROOT, "reports", "axe-report.json")
REPORT_PATH = os.environ.get("AXE_REPORT_PATH", DEFAULT_REPORT_PATH)

ROUTES = {
    "tracker": "/tracker",
    "methodology": "/methodology",
    "cheatsheet": "/cheatsheet",
    "field-manual": "/field-manual",
    "writeup": "/writeup",
    "analytics": "/analytics",
    "exam": "/exam",
    "vault": "/vault",
    "target-detail": "/target/__FIRST__",  # resolved from persisted machines, if any
}
PRESETS = ["obsidian", "monolith", "htb"]
MODES = ["light", "dark"]

server_proc = None


def ensure_server_running():
    global server_proc
    try:
        with urllib.request.urlopen(BASE, timeout=2) as resp:
            if resp.status in (200, 304):
                return
    except Exception:
        pass

    print("[INIT] Starting Vite dev server on port 3000...")
    server_proc = subprocess.Popen("npm run dev", shell=True, cwd=ROOT,
                                   stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    for _ in range(60):
        time.sleep(1)
        try:
            with urllib.request.urlopen(BASE, timeout=1):
                print("  [ok] Vite dev server is ready")
                return
        except Exception:
            continue
    raise RuntimeError("Dev server did not start within 60 seconds.")


def cleanup_server():
    global server_proc
    if server_proc:
        print("[CLEANUP] Stopping spawned Vite dev server...")
        try:
            subprocess.run(["taskkill", "/F", "/T", "/PID", str(server_proc.pid)], capture_output=True)
        except Exception:
            try:
                server_proc.kill()
            except Exception:
                pass


APPLY_THEME_JS = """
([preset, mode]) => {
  const root = document.documentElement;
  root.classList.remove('theme-transition');
  root.setAttribute('data-theme', preset);
  root.setAttribute('data-mode', mode);
  if (mode === 'dark') { root.classList.add('dark'); root.classList.remove('light'); }
  else { root.classList.remove('dark'); root.classList.add('light'); }
  root.style.colorScheme = mode;
}
"""


SETTLE_JS = """
async () => {
  const deadline = performance.now() + 4000;
  const nextFrame = () => new Promise(r => requestAnimationFrame(() => r()));
  // Wait until every running CSS transition / animation has finished, so axe measures
  // settled colors rather than mid-fade blends (theme-switch and entrance animations).
  for (;;) {
    await nextFrame();
    const running = document.getAnimations().filter(a => {
      if (a.playState !== 'running') return false;
      const t = a.effect && a.effect.getComputedTiming ? a.effect.getComputedTiming() : null;
      return !t || t.iterations !== Infinity;
    });
    if (running.length === 0 || performance.now() > deadline) break;
  }
  await nextFrame();
  await nextFrame();
}
"""


def wait_for_settle(page):
    try:
        page.evaluate(SETTLE_JS)
    except Exception:
        page.wait_for_timeout(600)


def trim(s, n=200):
    s = s or ""
    return s if len(s) <= n else s[:n]


def summarize_axe(results):
    out = []
    for v in results.get("violations", []):
        nodes = []
        for n in v.get("nodes", []):
            entry = {
                "target": n.get("target"),
                "html": trim(n.get("html")),
            }
            for chk in (n.get("any", []) + n.get("all", []) + n.get("none", [])):
                d = chk.get("data") or {}
                if isinstance(d, dict) and ("fgColor" in d or "contrastRatio" in d):
                    entry["fg"] = d.get("fgColor")
                    entry["bg"] = d.get("bgColor")
                    entry["ratio"] = d.get("contrastRatio")
                    entry["expected"] = d.get("expectedContrastRatio")
                    break
            nodes.append(entry)
        out.append({
            "id": v.get("id"),
            "impact": v.get("impact"),
            "count": len(v.get("nodes", [])),
            "nodes": nodes,
        })
    return out


def run_axe(page, options):
    return page.evaluate("(opts) => axe.run(document, opts)", options)


def get_first_machine_id(page):
    try:
        return page.evaluate("""() => {
          try {
            const raw = localStorage.getItem('zerobox-tactical-store');
            if (!raw) return null;
            const st = JSON.parse(raw).state || {};
            const m = (st.machines || [])[0];
            return m ? m.id : null;
          } catch (e) { return null; }
        }""")
    except Exception:
        return None


def tab_through_check(page):
    print("\n[TAB-THROUGH] Keyboard focus-ring check on /tracker (10 Tab presses)")
    page.goto(f"{BASE}/#/tracker", wait_until="domcontentloaded")
    page.wait_for_timeout(1200)
    page.evaluate(APPLY_THEME_JS, ["obsidian", "dark"])
    page.mouse.click(2, 2)  # neutral body focus start
    page.keyboard.press("Tab")
    failures = []
    checked = 0
    for i in range(10):
        page.wait_for_timeout(60)
        info = page.evaluate("""() => {
          const el = document.activeElement;
          if (!el || el === document.body) return null;
          const cs = getComputedStyle(el);
          return {
            tag: el.tagName.toLowerCase(),
            id: el.id || '',
            cls: (el.getAttribute('class') || '').slice(0, 80),
            testid: el.getAttribute('data-testid') || '',
            outlineStyle: cs.outlineStyle,
            outlineWidth: parseFloat(cs.outlineWidth) || 0,
            outlineColor: cs.outlineColor,
            boxShadow: cs.boxShadow,
          };
        }""")
        if info is None:
            print(f"  Tab {i+1}: activeElement is body (skipped)")
        else:
            checked += 1
            transparent = info["outlineColor"].replace(" ", "") in ("rgba(0,0,0,0)", "transparent")
            ok = info["outlineStyle"] != "none" and info["outlineWidth"] > 0 and not transparent
            label = info["testid"] or info["id"] or info["tag"]
            print(f"  Tab {i+1}: <{info['tag']}> {label} outline={info['outlineStyle']} "
                  f"{info['outlineWidth']}px {info['outlineColor']} -> {'ok' if ok else 'NO RING'}")
            if not ok:
                failures.append({"tab": i + 1, **info})
        page.keyboard.press("Tab")
    status = "PASS" if (checked > 0 and not failures) else "FAIL"
    print(f"[TAB-THROUGH] {status} ({checked} focused elements checked, {len(failures)} without ring)")
    return {"status": status, "checked": checked, "failures": failures}


def run():
    global REPORT_PATH
    if "--out" in sys.argv:
        idx = sys.argv.index("--out")
        if idx + 1 < len(sys.argv):
            REPORT_PATH = os.path.abspath(sys.argv[idx + 1])
    if not os.path.exists(AXE_PATH):
        print(f"[ERROR] axe-core not found at {AXE_PATH}")
        return
    ensure_server_running()
    report = {"routes": {}, "tabThrough": None}
    summary_rows = []

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(viewport={"width": 1440, "height": 900})
        context.add_init_script("localStorage.setItem('zerobox_onboarding_completed', 'true');")
        page = context.new_page()
        page.set_default_navigation_timeout(60000)
        page.set_default_timeout(45000)

        # Boot once to discover a machine id for the target-detail route.
        page.goto(f"{BASE}/#/tracker", wait_until="domcontentloaded")
        page.wait_for_timeout(1500)
        first_id = get_first_machine_id(page)

        for route_name, route_path in ROUTES.items():
            if "__FIRST__" in route_path:
                if not first_id:
                    print(f"[SKIP] {route_name}: no machine available")
                    continue
                route_path = route_path.replace("__FIRST__", str(first_id))
            for preset in PRESETS:
                for mode in MODES:
                    key = f"{route_name}|{preset}|{mode}"
                    try:
                        page.goto(f"{BASE}/#{route_path}", wait_until="domcontentloaded")
                        page.wait_for_timeout(900)
                        page.evaluate(APPLY_THEME_JS, [preset, mode])
                        page.wait_for_timeout(250)
                        wait_for_settle(page)
                        if not page.evaluate("typeof axe !== 'undefined'"):
                            page.add_script_tag(path=AXE_PATH)
                        cc = run_axe(page, {"runOnly": {"type": "rule", "values": ["color-contrast"]}})
                        wc = run_axe(page, {"runOnly": {"type": "tag", "values": ["wcag2a", "wcag2aa"]}})
                        cc_v = summarize_axe(cc)
                        wc_v = summarize_axe(wc)
                        report["routes"][key] = {
                            "route": route_name, "preset": preset, "mode": mode,
                            "colorContrast": cc_v, "wcag2a_aa": wc_v,
                        }
                        cc_count = sum(v["count"] for v in cc_v)
                        other = [v for v in wc_v
                                 if v["id"] != "color-contrast" and v["impact"] in ("serious", "critical")]
                        other_count = sum(v["count"] for v in other)
                        other_ids = ",".join(sorted({v["id"] for v in other}))
                        summary_rows.append((route_name, preset, mode, cc_count, other_count, other_ids))
                    except Exception as e:
                        report["routes"][key] = {"route": route_name, "preset": preset, "mode": mode,
                                                 "error": str(e)}
                        summary_rows.append((route_name, preset, mode, -1, -1, f"ERROR {str(e)[:40]}"))

        report["tabThrough"] = tab_through_check(page)
        browser.close()

    os.makedirs(os.path.dirname(REPORT_PATH), exist_ok=True)
    with open(REPORT_PATH, "w", encoding="utf-8") as f:
        json.dump(report, f, indent=2)

    print("\n================ AXE SUMMARY (nodes) ================")
    print(f"{'route':<14}{'preset':<10}{'mode':<7}{'contrast':>9}{'serious/crit other':>20}  rules")
    for r in summary_rows:
        print(f"{r[0]:<14}{r[1]:<10}{r[2]:<7}{r[3]:>9}{r[4]:>20}  {r[5]}")
    total_cc = sum(r[3] for r in summary_rows if r[3] > 0)
    total_other = sum(r[4] for r in summary_rows if r[4] > 0)
    print(f"TOTAL color-contrast nodes: {total_cc}; other serious/critical nodes: {total_other}")
    print(f"Tab-through: {report['tabThrough']['status']}")
    print(f"Report written: {REPORT_PATH}")


if __name__ == "__main__":
    try:
        run()
    except Exception as exc:
        print(f"[ERROR] {exc}")
    finally:
        cleanup_server()
    sys.exit(0)
