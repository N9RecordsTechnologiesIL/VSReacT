# {{PRODUCT_NAME}}

A native JUCE plugin whose UI is React, scaffolded by
[create-vsreact](https://www.npmjs.com/package/create-vsreact).

## Build

```sh
# 1. The UI bundle
cd ui && bun install && bun run build     # or npm install && npm run build

# 2. The plugin (point at a local JUCE checkout, or omit to auto-fetch)
cd .. && cmake -S . -B build -DJUCE_SOURCE_DIR=/path/to/JUCE
cmake --build build --target {{TARGET}}_Standalone --config Release
```

## Dev loop (hot reload)

```sh
cd ui && bun run watch        # rebuilds build/main.js on every save
```

Keep the standalone (or your DAW) open and edit `ui/src/main.tsx` — the
plugin watches the bundle file and remounts in ~100 ms.

## Shipping

Dev builds (`{{TARGET_UPPER}}_DEV=ON`, the default) load the bundle from an
absolute path on this machine. Before distributing, make a build that
embeds it:

```sh
cmake -S . -B build-ship -D{{TARGET_UPPER}}_DEV=OFF
cmake --build build-ship --target {{TARGET}}_VST3 --config Release
```
{{#IF_POSTHOG}}

## Analytics

`@vsreact/posthog` is wired end-to-end. Put **your** project API key in
`Source/Plugin.cpp` (search for `phc_YOUR_PROJECT_API_KEY`) — it's a
client-side ingestion token, but it's yours; think twice before
committing a real one to a public repo.
{{/IF_POSTHOG}}

## Docs

- Quick start: <https://vsreact.n9records.com/docs/quick-start>
- Components: <https://vsreact.n9records.com/components>
- Parameters & gestures: <https://vsreact.n9records.com/docs/parameters>
