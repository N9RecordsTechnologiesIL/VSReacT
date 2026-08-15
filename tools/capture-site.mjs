// Screenshots every site route to tools/.shots/ for visual review.
//
// Uses the full Chromium build (never headless-shell, which is unstable here)
// via playwright-core resolved from site/node_modules.
//
//   bun run tools/capture-site.mjs [baseUrl] [outDir]
//
// Pass --full for full-page captures instead of the 1280x800 viewport.

import { chromium } from "../site/node_modules/playwright-core/index.mjs";
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { spawn } from "node:child_process";
import { tmpdir } from "node:os";

const base = process.argv[2]?.startsWith("http") ? process.argv[2] : "http://localhost:4400";
const outDir = process.argv.find((a, i) => i > 1 && !a.startsWith("http") && !a.startsWith("--")) ??
  join(import.meta.dir ?? ".", ".shots");
const fullPage = process.argv.includes("--full");

const ROUTES = [
  "/", "/components", "/docs",
  "/docs/quick-start", "/docs/installation", "/docs/integration", "/docs/architecture",
  "/docs/components", "/docs/styling", "/docs/animation", "/docs/hooks",
  "/docs/parameters", "/docs/events", "/docs/native-messaging", "/docs/cpp-api",
  "/docs/hot-reload", "/docs/testing", "/docs/posthog", "/docs/faq", "/docs/support",
];

mkdirSync(outDir, { recursive: true });

// We launch Chromium ourselves and attach over a debug port: playwright's own
// launch() uses --remote-debugging-pipe, which hangs at startup on this
// machine (both headless and headed). Headed also keeps us off
// headless-chrome-shell, which is banned here for eating resources.
const CHROME = process.env.CHROME_PATH ||
  `${process.env.LOCALAPPDATA}\\ms-playwright\\chromium-1234\\chrome-win64\\chrome.exe`;
const PORT = 9333;

const child = spawn(CHROME, [
  `--remote-debugging-port=${PORT}`,
  // Fresh profile per run: a reused one restores the previous session's tabs,
  // and screenshotting a restored animated page times out.
  `--user-data-dir=${join(tmpdir(), `vsreact-shot-${process.pid}`)}`,
  "--no-first-run",
  "--no-default-browser-check",
  "--window-size=1300,900",
  "about:blank",
], { detached: false, stdio: "ignore" });

// Wait for the DevTools endpoint to answer before attaching.
let wsUrl = null;
for (let i = 0; i < 60 && !wsUrl; i++) {
  await new Promise((r) => setTimeout(r, 500));
  try {
    const res = await fetch(`http://127.0.0.1:${PORT}/json/version`);
    wsUrl = (await res.json()).webSocketDebuggerUrl;
  } catch { /* not up yet */ }
}
if (!wsUrl) { child.kill(); throw new Error("chromium devtools endpoint never came up"); }

const browser = await chromium.connectOverCDP(`http://127.0.0.1:${PORT}`);
const context = browser.contexts()[0] ?? (await browser.newContext());
// Reuse the window's visible tab and keep it foregrounded: a headed Chrome
// produces no frames for a background tab, so screenshotting one hangs.
const page = context.pages()[0] ?? (await context.newPage());
await page.bringToFront();
await page.setViewportSize({ width: 1280, height: 800 });

const problems = [];
for (const route of ROUTES) {
  const errors = [];
  const onError = (e) => errors.push(String(e));
  page.on("pageerror", onError);
  const res = await page.goto(base + route, { waitUntil: "networkidle", timeout: 60000 }).catch((e) => {
    errors.push(String(e));
    return null;
  });
  await page.waitForTimeout(400);

  const name = route === "/" ? "home" : route.slice(1).replace(/\//g, "-");
  await page.screenshot({ path: join(outDir, `${name}.png`), fullPage });

  // Overflow check: content wider than the viewport means a layout break.
  const overflow = await page.evaluate(() =>
    Math.max(0, document.documentElement.scrollWidth - document.documentElement.clientWidth));

  const status = res?.status() ?? 0;
  if (status !== 200 || errors.length || overflow > 0) {
    problems.push({ route, status, overflow, errors: errors.slice(0, 2) });
  }
  console.log(`${status} ${overflow ? `overflow+${overflow}px ` : ""}${route}`);
  page.off("pageerror", onError);
}

// Element shots for the pieces worth judging close-up.
const SECTIONS = [
  { name: "sec-bench", route: "/", selector: "#bench" },
  { name: "sec-pipeline", route: "/", selector: "section:nth-of-type(3)" },
  { name: "sec-toolkit", route: "/", selector: "section:nth-of-type(4)" },
  { name: "sec-posthog", route: "/", selector: "section:nth-of-type(5)" },
  { name: "sec-stashtrack", route: "/", selector: "section:nth-of-type(6)" },
];

for (const s of SECTIONS) {
  await page.goto(base + s.route, { waitUntil: "networkidle", timeout: 60000 });
  const found = await page.evaluate((sel) => {
    const el = document.querySelector(sel);
    if (!el) return false;
    el.scrollIntoView({ block: "center", behavior: "instant" });
    return true;
  }, s.selector);
  if (!found) { console.log(`(no ${s.selector} for ${s.name})`); continue; }
  await page.waitForTimeout(900); // let reveal animations settle
  // Viewport shot, not an element shot, and no animations:"disabled": these
  // sections animate forever, so both of those block waiting for stillness.
  await page.screenshot({ path: join(outDir, `${s.name}.png`), timeout: 20000 });
  console.log(`section ${s.name}`);
}

await browser.close();
child.kill();
console.log(problems.length ? `\nPROBLEMS:\n${JSON.stringify(problems, null, 2)}` : "\nall routes clean");
