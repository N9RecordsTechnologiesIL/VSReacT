// Reports console errors/warnings and uncaught exceptions for one or more
// routes. Same CDP attach strategy as capture-site.mjs (playwright's own
// launch() hangs on this machine).
//
//   node tools/check-console.mjs [baseUrl] [route ...]

import { chromium } from "../site/node_modules/playwright-core/index.mjs";
import { spawn } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";

const args = process.argv.slice(2);
const base = args.find((a) => a.startsWith("http")) ?? "http://localhost:4400";
// Accept routes with or without the leading slash: Git Bash rewrites a
// leading-slash argv into a Windows path before node ever sees it.
const routes = args.filter((a) => !a.startsWith("http")).map((a) => (a.startsWith("/") ? a : "/" + a));
if (!routes.length) routes.push("/");

const CHROME = process.env.CHROME_PATH ||
  `${process.env.LOCALAPPDATA}\\ms-playwright\\chromium-1234\\chrome-win64\\chrome.exe`;
const PORT = 9334;

const child = spawn(CHROME, [
  `--remote-debugging-port=${PORT}`,
  `--user-data-dir=${join(tmpdir(), `vsreact-console-${process.pid}`)}`,
  "--no-first-run", "--no-default-browser-check", "--window-size=1300,900", "about:blank",
], { stdio: "ignore" });

let up = false;
for (let i = 0; i < 60 && !up; i++) {
  await new Promise((r) => setTimeout(r, 500));
  try { await fetch(`http://127.0.0.1:${PORT}/json/version`); up = true; } catch { /* wait */ }
}
if (!up) { child.kill(); throw new Error("chromium devtools endpoint never came up"); }

const browser = await chromium.connectOverCDP(`http://127.0.0.1:${PORT}`);
const context = browser.contexts()[0];
const page = context.pages()[0] ?? (await context.newPage());
await page.bringToFront();

for (const route of routes) {
  const found = [];
  const onConsole = (m) => {
    if (m.type() === "error" || m.type() === "warning") found.push(`${m.type()}: ${m.text()}`);
  };
  const onError = (e) => found.push(`pageerror: ${e.message}`);
  page.on("console", onConsole);
  page.on("pageerror", onError);

  await page.goto(base + route, { waitUntil: "networkidle", timeout: 60000 });
  await page.waitForTimeout(1500);

  page.off("console", onConsole);
  page.off("pageerror", onError);
  console.log(`\n=== ${route} — ${found.length} issue(s)`);
  for (const f of found.slice(0, 12)) console.log("   " + f.slice(0, 2500));
}

await browser.close();
child.kill();
