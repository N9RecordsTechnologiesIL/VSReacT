// One-off: pull the reference art out of improvedUIs/_extracted into each
// example's ui/src/assets/, converting CleanStrip's PNG to lossless WebP so
// every plate is WebP. Binaries become the committed source of truth; each
// build.ts inlines them as base64 data URIs at bundle time.
//
// Run from vsreact/js:  bun run src/tools/prepExampleAssets.ts

import sharp from "sharp";
import { copyFileSync, mkdirSync, existsSync, rmSync } from "node:fs";
import { join } from "node:path";

const REPO = "H:/code/11Tools/VSReacT";
const EX = join(REPO, "vsreact/examples");
const SRC = join(EX, "improvedUIs/_extracted");

function dest(example: string): string {
  const dir = join(EX, example, "ui/src/assets");
  mkdirSync(dir, { recursive: true });
  return dir;
}

// The DrumDeck plate bakes the playhead outline around step 11 (measured at
// x 1080..1155, y 375..712). Covering it at runtime with resampled plate left
// faint seams where pad bezels didn't line up, so remove it from the asset once:
// copy the four edge bands from the step-9 column, which is in the same pad group
// (exact pad pitch) and has identical baked pad states (KICK on, SNARE/HAT off),
// making the copy seamless. The live outline is then drawn by the UI alone.
async function neutralisePlayhead(plate: string) {
  const { data, info } = await sharp(plate).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const W = info.width, C = info.channels;
  const out = Buffer.from(data);
  const OFF = 167; // step 11 centre 1116 - step 9 centre 949
  const bands = [
    { x0: 1074, x1: 1090, y0: 366, y1: 722 },
    { x0: 1144, x1: 1162, y0: 366, y1: 722 },
    { x0: 1074, x1: 1162, y0: 366, y1: 386 },
    { x0: 1074, x1: 1162, y0: 702, y1: 722 },
  ];
  for (const b of bands)
    for (let y = b.y0; y <= b.y1; y++)
      for (let x = b.x0; x <= b.x1; x++) {
        const o = (y * W + x) * C, s = (y * W + (x - OFF)) * C;
        out[o] = data[s]; out[o + 1] = data[s + 1]; out[o + 2] = data[s + 2];
      }
  await sharp(out, { raw: { width: W, height: info.height, channels: C } })
    .webp({ lossless: true }).toFile(plate.replace(/\.webp$/, ".tmp.webp"));
  copyFileSync(plate.replace(/\.webp$/, ".tmp.webp"), plate);
  rmSync(plate.replace(/\.webp$/, ".tmp.webp"));
  console.log("drums plate: removed the baked step-11 playhead outline");
}

async function main() {
  // gain <- PlainGain (webp already)
  copyFileSync(
    join(SRC, "PlainGain/src/assets/plain-gain-reference.webp"),
    join(dest("gain"), "plate.webp"),
  );

  // drums <- DrumDeck (webp plate + 2 sprites + otf)
  copyFileSync(join(SRC, "DrumDeck/public/drumdeck-reference.webp"), join(dest("drums"), "plate.webp"));
  await neutralisePlayhead(join(dest("drums"), "plate.webp"));
  copyFileSync(join(SRC, "DrumDeck/src/assets/pad-active.webp"), join(dest("drums"), "pad-active.webp"));
  copyFileSync(join(SRC, "DrumDeck/src/assets/pad-inactive.webp"), join(dest("drums"), "pad-inactive.webp"));
  copyFileSync(join(SRC, "DrumDeck/src/assets/drumdeck-narrow.otf"), join(dest("drums"), "narrow.otf"));

  // channel <- CleanStrip (PNG -> lossless WebP + otf)
  const png = join(SRC, "CleanStrip/public/cleanstrip-reference.png");
  const info = await sharp(png).metadata();
  await sharp(png).webp({ lossless: true }).toFile(join(dest("channel"), "plate.webp"));
  copyFileSync(join(SRC, "CleanStrip/public/cleanstrip-narrow.otf"), join(dest("channel"), "narrow.otf"));
  console.log(`CleanStrip PNG ${info.width}x${info.height} -> lossless WebP`);

  // delay (new example) <- DirtyDelay (webp plate)
  copyFileSync(join(SRC, "DirtyDelay/src/assets/dirtydelay-reference.webp"), join(dest("delay"), "plate.webp"));

  // report sizes
  for (const [ex, file] of [
    ["gain", "plate.webp"], ["drums", "plate.webp"], ["channel", "plate.webp"], ["delay", "plate.webp"],
  ] as const) {
    const p = join(EX, ex, "ui/src/assets", file);
    const meta = await sharp(p).metadata();
    const bytes = Bun.file(p).size;
    console.log(`${ex}/${file}: ${meta.width}x${meta.height}, ${(bytes / 1024).toFixed(0)} KB`);
  }
  console.log("assets prepared. delay/ created:", existsSync(join(EX, "delay")) ? "(example dir exists)" : "(NEW — needs scaffolding)");
}

await main();
