# Contributing

Thanks for looking under the hood. This page is short on ceremony and long on
the things that actually get a change merged here.

## Ground truth

- **Two halves, one program.** `@vsreact/core` (TypeScript, `vsreact/js/`)
  and the JUCE module (C++, `vsreact/module/`) version in lockstep and
  handshake a protocol level at startup. If your change adds a mutation op or
  changes what an existing prop may carry, read `module/vsreact/source/Protocol.h`
  first — it documents when to bump the level and how to keep a fallback.
- **JS decides what, C++ decides how and when.** JS runs only on renders
  (QuickJS, no JIT, ~50x slower than V8 — and it doesn't matter, because
  layout, painting, hover and hit-testing never enter the engine). A change
  that moves per-frame work into JS will be measurably slow; there's a bench
  that will tell you (`tests/PaintBench.cpp`, gated in CI).
- **The audio thread never sees any of this.** Everything runs on the message
  thread. Keep it that way.

## Building and testing

```bash
bun install                                   # workspace root

# TypeScript: build, typecheck, test
cd vsreact/js && bun run build:dist && bunx tsc --noEmit && bun test

# C++: module + full suite against a JUCE checkout
cmake -S ci -B ci/build -DJUCE_SOURCE_DIR=path/to/JUCE -DCMAKE_BUILD_TYPE=Release
cmake --build ci/build --config Release --parallel 4
ctest --test-dir ci/build -C Release --output-on-failure
```

Notes that save an afternoon:

- Build `vsreact/js` dist before anything that imports `@vsreact/core` — the
  examples and `@vsreact/posthog` resolve through `dist/`.
- A Debug C++ build needs no special flags, but know that the paint bench has
  a separate Debug ceiling and the test target links with an 8MB stack
  (QuickJS interpreter frames are 2–3x larger unoptimised).
- On Linux you need JUCE **8.0.14+** (8.0.4's text shaper segfaults there)
  and an X display for the tests — CI runs them under `xvfb-run -a`.

## What a good change looks like

- **Tests are the argument.** Every behavior fix here landed with a test that
  fails without it — bridge diffing, protocol fallback, the stack guard, the
  scaffolder's version pins. A PR that changes behavior without a test will be
  asked for one.
- **Both sides or a fallback.** A feature that needs new native support must
  either degrade gracefully against an older module (see how `registerImage`
  and `patchProps` do it) or bump the protocol level with a loud failure path.
- **Measure paint claims.** If you're changing `Painter.cpp`, run
  `PaintBench` before and after and put both numbers in the PR. "Feels
  faster" doesn't survive review; `153.4 → 7.6 ms/frame` does.
- **Match the voice.** Comments explain constraints the code can't show, not
  what the next line does. Look at any file in `module/vsreact/source/` for
  the register.

## CI will run

TypeScript tests, the C++ suite on Windows/macOS/Linux, the scaffolder's
version-pin guard, pluginval (strictness 5) against the gain example's VST3,
and auval against its AU. Green CI is necessary, not sufficient — a
reviewer will still read the change.

## Releases

Maintainer-driven: versions move in lockstep across the npm packages, the
module tag, the site, and the scaffolder pins (CI fails if they drift), and
a `v*` tag publishes to npm and cuts the GitHub release. Don't bump versions
in a PR.

## License

MIT. By contributing you agree your contribution is licensed the same way.
