import subprocess
import time
import urllib.request
from playwright.sync_api import sync_playwright

proc = subprocess.Popen(["npx", "vite", "preview", "--port", "4173", "--host", "localhost"], shell=True)
try:
    # Wait for server
    for i in range(20):
        try:
            with urllib.request.urlopen("http://localhost:4173", timeout=1) as resp:
                if resp.status in (200, 304):
                    print("Vite preview server is ready on port 4173!")
                    break
        except Exception:
            time.sleep(0.5)

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        viewports = [
            ("1024px", 1024, 768),
            ("1280px", 1280, 800),
            ("1440px", 1440, 900),
            ("1920px", 1920, 1080),
        ]

        for name, width, height in viewports:
            print(f"\n=== Testing Viewport: {name} ({width}x{height}) with ACTIVE TARGET ===")
            page = browser.new_page(viewport={"width": width, "height": height})
            page.goto("http://localhost:4173/#/tracker", wait_until="networkidle")
            page.wait_for_timeout(1000)

            # Set an active target via localStorage or store if possible, or click Engage Target
            engage_btn = page.locator("button:has-text('ENGAGE TARGET')")
            if engage_btn.is_visible():
                engage_btn.click()
                page.wait_for_timeout(300)
                # Click the first machine in dropdown
                first_machine = page.locator("div:has-text('ENGAGE TARGET') ~ div button").first
                if first_machine.is_visible():
                    first_machine.click()
                    page.wait_for_timeout(500)

            scroll_width = page.evaluate("() => document.querySelector('header').scrollWidth")
            client_width = page.evaluate("() => document.querySelector('header').clientWidth")
            print(f"Header scrollWidth: {scroll_width}, clientWidth: {client_width}, delta: {scroll_width - client_width}")

            overflowing = page.evaluate("""() => {
                const header = document.querySelector('header');
                const rect = header.getBoundingClientRect();
                const children = header.querySelectorAll('*');
                const bad = [];
                for (const el of children) {
                    const r = el.getBoundingClientRect();
                    if (r.right > rect.right + 2) {
                        bad.push({ tag: el.tagName, class: el.className, right: r.right, maxRight: rect.right });
                    }
                }
                return bad;
            }""")
            print(f"Elements overflowing header right edge: {len(overflowing)}")
            for item in overflowing[:5]:
                print(f"  Overflow: {item}")

            page.close()

        browser.close()
finally:
    subprocess.run(["taskkill", "/F", "/T", "/PID", str(proc.pid)], capture_output=True)
