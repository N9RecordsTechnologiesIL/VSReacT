// Rebuilds build/main.js whenever src/ changes. The plugin's RootView
// watches the bundle file and remounts on write — that's the hot reload loop.
export {};

import { watch } from "fs";

const buildOnce = async () => {
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
    return;
  }

  await Bun.write("build/main.js", await result.outputs[0].text());
  console.log(`[${new Date().toLocaleTimeString()}] built src/main.tsx -> build/main.js`);
};

await buildOnce();

let timer: ReturnType<typeof setTimeout> | null = null;
watch("src", { recursive: true }, () => {
  if (timer) clearTimeout(timer);
  timer = setTimeout(buildOnce, 60);
});

console.log("watching src/ for changes...");
