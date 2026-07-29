// One-off: pull the reference art out of improvedUIs/_extracted into each
// example's ui/src/assets/, converting CleanStrip's PNG to lossless WebP so
// every plate is WebP. Binaries become the committed source of truth; each
// build.ts inlines them as base64 data URIs at bundle time.
//
// Run from vsreact/js:  bun run src/tools/prepExampleAssets.ts

import sharp from "sharp";
import { copyFileSync, mkdirSync, existsSync } from "node:fs";
import { join } from "node:path";

const REPO = "H:/code/11Tools/VSReacT";
const EX = join(REPO, "vsreact/examples");
const SRC = join(EX, "improvedUIs/_extracted");

function dest(example: string): string {
  const dir = join(EX, example, "ui/src/assets");
  mkdirSync(dir, { recursive: true });
  return dir;
}

async function main() {
  // gain <- PlainGain (webp already)
  copyFileSync(
    join(SRC, "PlainGain/src/assets/plain-gain-reference.webp"),
    join(dest("gain"), "plate.webp"),
  );

  // drums <- DrumDeck (webp plate + 2 sprites + otf)
  copyFileSync(join(SRC, "DrumDeck/public/drumdeck-reference.webp"), join(dest("drums"), "plate.webp"));
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
