// Bundles a VSReacT app entry into a single QuickJS-ready IIFE.
//   bun run build.ts [entry] [outfile]
export {};

const entry = process.argv[2] ?? "demo/main.tsx";
const outfile = process.argv[3] ?? "demo/build/main.js";

const result = await Bun.build({
  entrypoints: [entry],
  target: "browser",
  format: "iife",
  minify: false,
  define: {
    "process.env.NODE_ENV": '"production"',
  },
});

if (!result.success) {
  for (const log of result.logs) console.error(log);
  process.exit(1);
}

await Bun.write(outfile, await result.outputs[0].text());
console.log(`built ${entry} -> ${outfile}`);
