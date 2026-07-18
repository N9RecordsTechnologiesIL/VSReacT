#!/usr/bin/env node
// create-vsreact — scaffold a native JUCE VST whose UI is React.
//
//   bun create vsreact my-plugin
//   npm create vsreact@latest my-plugin
//   bunx create-vsreact my-plugin --posthog
//
// Zero dependencies; templates ship inside the package.

import { cp, mkdir, readFile, readdir, rename, stat, writeFile } from "node:fs/promises";
import { createInterface } from "node:readline/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import process from "node:process";

const TEMPLATES = path.join(path.dirname(fileURLToPath(import.meta.url)), "templates");
const VSREACT_TAG = "v0.0.25";
const CORE_RANGE = "^0.0.25";
const POSTHOG_RANGE = "^0.0.6";

const HELP = `create-vsreact — a native JUCE VST whose UI is React.

Usage:
  bun create vsreact <directory> [options]
  npm create vsreact@latest <directory> [-- options]

Options:
  --name <product>       Display name        (default: from the directory)
  --company <name>       Company name        (default: "My Company")
  --mfr-code <XXXX>      4-char manufacturer code
  --plugin-code <XXXX>   4-char plugin code
  --posthog              Wire @vsreact/posthog analytics (placeholder key)
  --yes                  Accept all defaults, no prompts
  --help                 This message
`;

const titleCase = (slug) =>
  slug
    .replace(/[-_]+/g, " ")
    .trim()
    .split(" ")
    .filter(Boolean)
    .map((word) => word[0].toUpperCase() + word.slice(1))
    .join(" ");

const pascalCase = (text) => titleCase(text).replace(/[^A-Za-z0-9]/g, "") || "MyPlugin";

/** JUCE-style 4-char code: one capital, three lowercase alphanumerics. */
const deriveCode = (text) => {
  const clean = text.replace(/[^A-Za-z0-9]/g, "").toLowerCase() || "plug";
  const padded = (clean + "plug").slice(0, 4);
  return padded[0].toUpperCase() + padded.slice(1);
};

const validCode = (code) => /^[A-Za-z0-9]{4}$/.test(code);

function parseArgs(argv) {
  const options = { posthog: false, yes: false, help: false };
  const positional = [];
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--posthog") options.posthog = true;
    else if (arg === "--yes" || arg === "-y") options.yes = true;
    else if (arg === "--help" || arg === "-h") options.help = true;
    else if (arg === "--name") options.name = argv[++i];
    else if (arg === "--company") options.company = argv[++i];
    else if (arg === "--mfr-code") options.mfrCode = argv[++i];
    else if (arg === "--plugin-code") options.pluginCode = argv[++i];
    else if (!arg.startsWith("-")) positional.push(arg);
  }
  return { options, positional };
}

async function prompt(rl, question, fallback) {
  const answer = (await rl.question(`  ${question} (${fallback}) `)).trim();
  return answer === "" ? fallback : answer;
}

async function main() {
  const { options, positional } = parseArgs(process.argv.slice(2));

  if (options.help) {
    console.log(HELP);
    return;
  }

  let directory = positional[0];
  const interactive = !options.yes && process.stdin.isTTY;
  const rl = interactive ? createInterface({ input: process.stdin, output: process.stdout }) : null;

  console.log("\ncreate-vsreact — write React, ship native VST.\n");

  if (!directory) {
    if (!rl) {
      console.error("error: pass a project directory, e.g.  bun create vsreact my-plugin");
      process.exit(1);
    }
    directory = await prompt(rl, "Project directory?", "my-plugin");
  }

  const target = path.resolve(process.cwd(), directory);
  const exists = await stat(target).catch(() => null);
  if (exists !== null && (await readdir(target)).length > 0) {
    console.error(`error: ${directory} already exists and is not empty.`);
    process.exit(1);
  }

  const slug = path.basename(target);
  let productName = options.name ?? titleCase(slug);
  let company = options.company ?? "My Company";
  let mfrCode = options.mfrCode ?? deriveCode(company);
  let pluginCode = options.pluginCode ?? deriveCode(slug);
  let posthog = options.posthog;

  if (rl) {
    productName = options.name ?? (await prompt(rl, "Product name?", productName));
    company = options.company ?? (await prompt(rl, "Company?", company));
    mfrCode = options.mfrCode ?? (await prompt(rl, "Manufacturer code (4 chars)?", deriveCode(company)));
    pluginCode = options.pluginCode ?? (await prompt(rl, "Plugin code (4 chars)?", deriveCode(slug)));
    if (!options.posthog)
      posthog = (await prompt(rl, "Wire PostHog analytics? [y/N]", "n")).toLowerCase().startsWith("y");
    rl.close();
  }

  for (const [label, code] of [["--mfr-code", mfrCode], ["--plugin-code", pluginCode]]) {
    if (!validCode(code)) {
      console.error(`error: ${label} must be exactly 4 alphanumeric characters (got "${code}").`);
      process.exit(1);
    }
  }

  const targetName = pascalCase(productName);
  const replacements = {
    PRODUCT_NAME: productName,
    COMPANY: company,
    MFR_CODE: mfrCode,
    PLUGIN_CODE: pluginCode,
    TARGET: targetName,
    TARGET_UPPER: targetName.toUpperCase(),
    SLUG: slug,
    VSREACT_TAG,
    CORE_RANGE,
    POSTHOG_RANGE,
  };

  await mkdir(target, { recursive: true });
  await cp(path.join(TEMPLATES, "default"), target, { recursive: true });
  await rename(path.join(target, "gitignore"), path.join(target, ".gitignore"));

  // Substitute {{TOKENS}} and resolve {{#IF_POSTHOG}} blocks in .tpl files.
  const render = async (dir) => {
    for (const entry of await readdir(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        await render(full);
        continue;
      }
      if (!entry.name.endsWith(".tpl")) continue;

      let text = await readFile(full, "utf8");
      text = text.replace(/\{\{#IF_POSTHOG\}\}\r?\n([\s\S]*?)\{\{\/IF_POSTHOG\}\}\r?\n?/g, posthog ? "$1" : "");
      text = text.replace(/\{\{#IF_NO_POSTHOG\}\}\r?\n([\s\S]*?)\{\{\/IF_NO_POSTHOG\}\}\r?\n?/g, posthog ? "" : "$1");
      text = text.replace(/\{\{(\w+)\}\}/g, (_, key) => String(replacements[key] ?? ""));
      await writeFile(full.slice(0, -4), text);
      await (await import("node:fs/promises")).rm(full);
    }
  };
  await render(target);

  console.log(`  ${productName} scaffolded into ${directory}/\n`);
  console.log("Next steps:");
  console.log(`  cd ${directory}/ui && bun install && bun run build   # or npm install && npm run build`);
  console.log(`  cd .. && cmake -S . -B build -DJUCE_SOURCE_DIR=/path/to/JUCE   # omit to auto-fetch JUCE`);
  console.log(`  cmake --build build --target ${targetName}_Standalone --config Release`);
  console.log("\nDev loop: keep the standalone open, edit ui/src/main.tsx, `bun run build` — it hot-reloads.");
  if (posthog)
    console.log("\nPostHog: put YOUR project API key in Source/Plugin.cpp (search phc_YOUR_PROJECT_API_KEY).");
  console.log("\nDocs: https://vsreact.n9records.com/docs/quick-start\n");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
