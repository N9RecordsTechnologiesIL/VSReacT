// One-shot hero screenshot: single browser launch, one page, close.
// Same CDP attach as capture-site.mjs (playwright's launch() hangs here).
import { chromium } from "../site/node_modules/playwright-core/index.mjs";
import { spawn } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";

const base = process.argv[2] ?? "http://localhost:4400";
const CHROME = `${process.env.LOCALAPPDATA}\\ms-playwright\\chromium-1234\\chrome-win64\\chrome.exe`;
const PORT = 9335;

const child = spawn(CHROME, [
  `--remote-debugging-port=${PORT}`,
  `--user-data-dir=${join(tmpdir(), `vsreact-hero-${process.pid}`)}`,
  "--no-first-run", "--no-default-browser-check", "--window-size=1400,950", "about:blank",
], { stdio: "ignore" });

let up = false;
for (let i = 0; i < 60 && !up; i++) {
  await new Promise((r) => setTimeout(r, 500));
  try { await fetch(`http://127.0.0.1:${PORT}/json/version`); up = true; } catch { /* wait */ }
}
if (!up) { child.kill(); throw new Error("devtools endpoint never came up"); }

const browser = await chromium.connectOverCDP(`http://127.0.0.1:${PORT}`);
const context = browser.contexts()[0];
const page = context.pages()[0] ?? (await context.newPage());
await page.bringToFront();
await page.setViewportSize({ width: 1280, height: 800 });
await page.goto(base + "/", { waitUntil: "networkidle", timeout: 60000 });
await page.waitForTimeout(1600); // entrance animations + first beam sweep
await page.screenshot({ path: ".shots/hero-animated.png", timeout: 20000 });
console.log("shot -> .shots/hero-animated.png");
await browser.close();
child.kill();
