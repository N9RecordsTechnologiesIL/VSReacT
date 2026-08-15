// Inline src/assets/ + bundle src/main.tsx, via the recipe shared across the
// examples (vsreact/js/src/tools/buildExampleUi.ts) — plus one delay-specific
// step: the knob film-strip's manifest (knob-strip.json, produced by
// bakeKnobStrip.ts) is emitted as a `knobStrip` export so main.tsx gets
// {size, frames, sweepDegrees, dataUri} without a runtime JSON import. We take
// the strip's data URI straight from the manifest (it already carries the
// lossless base64) and skip re-inlining knob-strip.webp as a raw asset.
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { buildExampleUi } from "../../../js/src/tools/buildExampleUi";

const manifestPath = join(import.meta.dir, "src/assets/knob-strip.json");
if (!existsSync(manifestPath)) {
  console.error(
    "missing src/assets/knob-strip.json — run:\n" +
      "  bun run ../../js/src/tools/bakeKnobStrip.ts <thisDir>/src/assets 90 180",
  );
  process.exit(1);
}
const manifest = JSON.parse(readFileSync(manifestPath, "utf8")) as {
  size: number;
  frames: number;
  sweepDegrees: number;
  dataUri: string;
};

await buildExampleUi(import.meta.dir, {
  skip: (name) => name === "knob-strip.webp",
  append:
    `export const knobStrip = {\n` +
    `  size: ${manifest.size},\n` +
    `  frames: ${manifest.frames},\n` +
    `  sweepDegrees: ${manifest.sweepDegrees},\n` +
    `  dataUri: ${JSON.stringify(manifest.dataUri)},\n` +
    `} as const;\n`,
});
