import subprocess
import time
import urllib.request
from playwright.sync_api import sync_playwright

proc = subprocess.Popen(["npx", "vite", "preview", "--port", "4173", "--host", "localhost"], shell=True)
try:
    for i in range(20):
        try:
            with urllib.request.urlopen("http://localhost:4173", timeout=1) as resp:
                if resp.status in (200, 304):
                    break
        except Exception:
            time.sleep(0.5)

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page(viewport={"width": 1280, "height": 800})
        page.goto("http://localhost:4173/#/tracker", wait_until="networkidle")
        page.wait_for_timeout(1000)

        engage_btn = page.locator("button:has-text('ENGAGE TARGET')")
        if engage_btn.is_visible():
            engage_btn.click()
            page.wait_for_timeout(300)
            first_machine = page.locator("div:has-text('ENGAGE TARGET') ~ div button").first
            if first_machine.is_visible():
                first_machine.click()
                page.wait_for_timeout(500)

        elements_info = page.evaluate("""() => {
            const header = document.querySelector('header');
            const items = [];
            for (const child of header.children) {
                const r = child.getBoundingClientRect();
                const subitems = [];
                for (const sub of child.children) {
                    const sr = sub.getBoundingClientRect();
                    subitems.push({
                        tag: sub.tagName,
                        text: sub.innerText ? sub.innerText.slice(0, 30).replace(/\\n/g, ' ') : '',
                        width: sr.width,
                        x: sr.x,
                        right: sr.right,
                        class: sub.className
                    });
                }
                items.push({
                    tag: child.tagName,
                    class: child.className,
                    width: r.width,
                    x: r.x,
                    right: r.right,
                    subitems
                });
            }
            return items;
        }""")

        for i, item in enumerate(elements_info):
            print(f"Top Child {i}: {item['class']} -> width={item['width']}, right={item['right']}")
            for sub in item['subitems']:
                print(f"   Sub: [{sub['tag']}] '{sub['text']}' -> width={sub['width']}, right={sub['right']}")

        browser.close()
finally:
    subprocess.run(["taskkill", "/F", "/T", "/PID", str(proc.pid)], capture_output=True)
