// Build-time tool: render the pure knob shader to N rotation frames stacked
// vertically into one lossless-WebP sprite sheet, plus a manifest. The runtime
// then shows a single frame via translate+clip (see FilmStripKnob) — no
// per-frame shading, which QuickJS cannot afford (~217ms for one 180x180 knob;
// measured in vsreact/tests/KnobShaderBench.cpp).
//
// Run:  bun run vsreact/js/src/tools/bakeKnobStrip.ts <outDir> [size] [frames]

import { shadeKnobSample } from "./knobLighting";

/** Degrees of usable knob travel (matches the web knobRotation sweep). */
export const ROTATION_SWEEP = 270;

/** The rotation a given frame represents, spanning the sweep about zero. */
export function frameAngle(index: number, frames: number): number {
  if (frames <= 1) return 0;
  return -ROTATION_SWEEP / 2 + (ROTATION_SWEEP * index) / (frames - 1);
}

/** Pure: the stacked RGBA frames, no I/O, so it is unit-testable. */
export function renderKnobFrames(size: number, frames: number): Uint8ClampedArray {
  const out = new Uint8ClampedArray(size * size * frames * 4);

  for (let f = 0; f < frames; f += 1) {
    const deg = frameAngle(f, frames);
    const base = f * size * size * 4;

    for (let py = 0; py < size; py += 1) {
      const y = ((py + 0.5) / size) * 2 - 1;

      for (let px = 0; px < size; px += 1) {
        const x = ((px + 0.5) / size) * 2 - 1;
        const o = base + (py * size + px) * 4;
        const s = shadeKnobSample(deg, x, y);

        if (!s) {
          out[o + 3] = 0; // outside the disc
          continue;
        }

        out[o] = Math.round(s.red);
        out[o + 1] = Math.round(s.green);
        out[o + 2] = Math.round(s.blue);
        out[o + 3] = Math.round(s.alpha * 255);
      }
    }
  }

  return out;
}

export interface KnobStripManifest {
  size: number;
  frames: number;
  sweepDegrees: number;
  dataUri: string;
}

/** Renders and writes knob-strip.webp + knob-strip.json into outDir. */
export async function bakeKnobStrip(outDir: string, size = 120, frames = 180): Promise<KnobStripManifest> {
  const { default: sharp } = await import("sharp");
  const { writeFileSync } = await import("node:fs");
  const { join } = await import("node:path");

  const strip = renderKnobFrames(size, frames);

  // Lossless: the strip is the pixel-accurate output of the shader, and the
  // reference art it sits against is itself unquantised.
  const webp = await sharp(Buffer.from(strip.buffer), {
    raw: { width: size, height: size * frames, channels: 4 },
  })
    .webp({ lossless: true })
    .toBuffer();

  const manifest: KnobStripManifest = {
    size,
    frames,
    sweepDegrees: ROTATION_SWEEP,
    dataUri: `data:image/webp;base64,${webp.toString("base64")}`,
  };

  writeFileSync(join(outDir, "knob-strip.webp"), webp);
  writeFileSync(join(outDir, "knob-strip.json"), JSON.stringify(manifest, null, 2));

  return manifest;
}

if (import.meta.main) {
  const [outDir, size, frames] = process.argv.slice(2);

  if (!outDir) {
    console.error("usage: bakeKnobStrip <outDir> [size] [frames]");
    process.exit(1);
  }

  const m = await bakeKnobStrip(outDir, size ? Number(size) : undefined, frames ? Number(frames) : undefined);
  console.log(`baked knob-strip.webp — ${m.frames} frames @ ${m.size}px, ${m.sweepDegrees}deg sweep`);
}
