// The scaffolder is the first five minutes of the project for everyone who
// tries it, and nothing else in CI exercises it. Two classes of bug get
// caught here:
//
//  1. Version drift. The module GIT_TAG and the npm range are two halves of
//     one version — the module publishes a protocol level the bundle checks
//     at startup — and they sat three releases behind the repo for a while
//     because nothing compared them.
//  2. A template token with no value. `{{FOO}}` renders as an empty string,
//     so a typo doesn't throw; it silently produces a broken CMakeLists.

import { describe, expect, test } from "bun:test";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readdirSync, readFileSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

const here = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1"));
const indexPath = path.join(here, "index.mjs");
const source = readFileSync(indexPath, "utf8");

const constant = (name: string): string => {
  const match = new RegExp(`const ${name} = "([^"]+)"`).exec(source);
  if (match === null) throw new Error(`${name} not found in index.mjs`);
  return match[1];
};

const packageVersion = (dir: string): string =>
  JSON.parse(readFileSync(path.join(here, "..", dir, "package.json"), "utf8")).version;

function filesUnder(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const full = path.join(dir, entry);
    return statSync(full).isDirectory() ? filesUnder(full) : [full];
  });
}

describe("pinned versions track this repo", () => {
  const core = packageVersion("js");

  test("the module tag matches the @vsreact/core version", () => {
    // Mismatched halves is exactly the freeze the protocol handshake exists
    // to survive — but a scaffold should never ship in that state at all.
    expect(constant("VSREACT_TAG")).toBe(`v${core}`);
  });

  test("the core range pins that same version", () => {
    // `^0.0.x` is an exact pin under semver — deliberate, so a scaffolded
    // project can't drift onto a core newer than its module.
    expect(constant("CORE_RANGE")).toBe(`^${core}`);
  });

  test("the posthog range matches @vsreact/posthog", () => {
    expect(constant("POSTHOG_RANGE")).toBe(`^${packageVersion("js-posthog")}`);
  });

  test("the README's install snippet pins the current tag", () => {
    // Same drift class as the scaffolder pins: the README sat at v0.0.1 for
    // five releases because nothing compared it to anything.
    const readme = readFileSync(path.join(here, "..", "..", "README.md"), "utf8");
    const pins = [...readme.matchAll(/GIT_TAG\s+(v[\d.]+)/g)].map((m) => m[1]);
    expect(pins.length).toBeGreaterThan(0);
    for (const pin of pins) expect(pin).toBe(`v${core}`);
  });
});

describe("rendering a project", () => {
  const roots: string[] = [];

  const scaffold = (...args: string[]): string => {
    const root = mkdtempSync(path.join(tmpdir(), "vsreact-scaffold-"));
    roots.push(root);
    const target = path.join(root, "my-plugin");
    execFileSync(process.execPath, [indexPath, target, "--yes", ...args], { stdio: "pipe" });
    return target;
  };

  const cleanup = () => roots.forEach((root) => rmSync(root, { recursive: true, force: true }));

  test("leaves no unsubstituted tokens and no .tpl files behind", () => {
    try {
      for (const flags of [[], ["--posthog"]]) {
        const target = scaffold(...flags);

        for (const file of filesUnder(target)) {
          expect(file.endsWith(".tpl")).toBe(false);
          const text = readFileSync(file, "utf8");
          if (/\{\{[#/]?\w+\}\}/.test(text))
            throw new Error(`${path.relative(target, file)} still has a template token`);
        }
      }
    } finally {
      cleanup();
    }
  });

  test("writes the pinned versions into the project it generates", () => {
    try {
      const target = scaffold();
      const cmake = readFileSync(path.join(target, "CMakeLists.txt"), "utf8");
      const ui = readFileSync(path.join(target, "ui", "package.json"), "utf8");

      expect(cmake).toContain(constant("VSREACT_TAG"));
      expect(JSON.parse(ui).dependencies["@vsreact/core"]).toBe(constant("CORE_RANGE"));
    } finally {
      cleanup();
    }
  });

  test("the bundle id survives a company name with spaces", () => {
    try {
      const target = scaffold("--company", "My Company", "--name", "Big Knob");
      const cmake = readFileSync(path.join(target, "CMakeLists.txt"), "utf8");
      expect(cmake).toContain('BUNDLE_ID "com.mycompany.bigknob"');
    } finally {
      cleanup();
    }
  });
});
