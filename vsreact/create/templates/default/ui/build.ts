export {};

const result = await Bun.build({
  entrypoints: ["src/main.tsx"],
  target: "browser",
  format: "iife",
  minify: false,
  sourcemap: "external",
  define: {
    "process.env.NODE_ENV": '"production"',
  },
});

if (!result.success) {
  for (const log of result.logs) console.error(log);
  process.exit(1);
}

const bundle = result.outputs.find((o) => o.kind === "entry-point") ?? result.outputs[0];
const mapArtifact = result.outputs.find((o) => o.kind === "sourcemap");
let text = await bundle.text();

// Prepend the source map as ONE line so error stacks in the plugin's overlay
// name src/main.tsx lines instead of bundled ones. Prepended — not appended —
// because an error during initial evaluation must already have it; being one
// line makes the offset a constant 1. sourcesContent is dropped: line mapping
// only needs sources + mappings, and embedding every original file would
// double the bundle.
if (mapArtifact !== undefined) {
  const full = JSON.parse(await mapArtifact.text());
  const map = { version: full.version, sources: full.sources, mappings: full.mappings };
  text = `globalThis.__vsreact_sourcemap = ${JSON.stringify({ file: "main.js", lineOffset: 1, map })};\n${text}`;
}

await Bun.write("build/main.js", text);
console.log(`built src/main.tsx -> build/main.js${mapArtifact !== undefined ? " (+sourcemap)" : ""}`);
