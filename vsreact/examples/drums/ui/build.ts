export {};

const result = await Bun.build({
  entrypoints: ["src/main.tsx"],
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

await Bun.write("build/main.js", await result.outputs[0].text());
console.log("built src/main.tsx -> build/main.js");
