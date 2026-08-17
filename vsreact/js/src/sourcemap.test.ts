// The stack mapper, tested against a real map: a tiny two-file project is
// bundled with Bun at test time, so the VLQ decoding is verified against
// mappings an actual bundler emits — not against hand-rolled fixtures that
// share the implementation's assumptions.

import { describe, expect, test } from "bun:test";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { decodeMappings, mapStackTrace, originalPosition, type RawSourceMap } from "./sourcemap";

describe("decodeMappings", () => {
  test("decodes the canonical first segment", () => {
    // "AAAA" = [0,0,0,0]: generated col 0 -> source 0, line 0, col 0.
    const lines = decodeMappings("AAAA");
    expect(lines[0][0]).toEqual([0, 0, 0, 0]);
  });

  test("tolerates junk without throwing", () => {
    expect(() => decodeMappings(";;%%$$;;")).not.toThrow();
  });
});

describe("against a real Bun sourcemap", () => {
  test("maps bundled frames back to the original files and lines", async () => {
    const dir = mkdtempSync(join(tmpdir(), "vsreact-map-"));

    try {
      // helper.ts line 4 (1-based) throws; entry.ts line 3 calls it.
      writeFileSync(
        join(dir, "helper.ts"),
        `// a comment\n// another\nexport function boom(): never {\n  throw new Error("kaboom");\n}\n`,
      );
      writeFileSync(join(dir, "entry.ts"), `import { boom } from "./helper";\n\nboom();\n`);

      const result = await Bun.build({
        entrypoints: [join(dir, "entry.ts")],
        target: "browser",
        format: "iife",
        sourcemap: "external",
      });
      expect(result.success).toBe(true);

      const bundleText = await result.outputs.find((o) => o.kind === "entry-point")!.text();
      const map = JSON.parse(await result.outputs.find((o) => o.kind === "sourcemap")!.text()) as RawSourceMap;

      // Find where the throw landed in the bundle, like a stack frame would.
      const generatedLine = bundleText.split("\n").findIndex((l) => l.includes('"kaboom"')) + 1;
      expect(generatedLine).toBeGreaterThan(0);

      const lines = decodeMappings(map.mappings);
      const original = originalPosition(lines, map, generatedLine);
      expect(original).toBeDefined();
      expect(original!.source.endsWith("helper.ts")).toBe(true);
      expect(original!.line).toBe(4);

      // The full stack rewrite, with the one-line prepend offset our build
      // adds accounted for.
      const stack = `    at boom (main.js:${generatedLine + 1})\n    at <anonymous> (main.js:9999)`;
      const mapped = mapStackTrace(stack, map, "main.js", 1);
      expect(mapped).toContain("helper.ts:4");
      expect(mapped).toContain("main.js:9999"); // unmappable frame passes through
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
