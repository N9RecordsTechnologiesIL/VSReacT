// Version handshake between this bundle and the native module it runs inside.
// The module publishes `__vsreact_protocol` (see the module's Protocol.h)
// before evaluating the bundle; a module older than the handshake publishes
// nothing and reads as level 1.
//
// Why this exists: ShadowTree::applyOp ignores an op it doesn't recognise,
// and its assertion compiles out in Release. So a UI built against a newer
// @vsreact/core than the module pinned by the CMake GIT_TAG would paint its
// first frame and then freeze — no error, no overlay, nothing in the log.
// Bumping the npm package without the module is a one-line mistake, so
// features gate on the level and fall back instead.

import { isHosted } from "./runtime";

/** The protocol level this bundle speaks. Bumped alongside the C++ constant
    whenever a new op — or a new kind of value an existing prop may carry —
    would be misread by the previous level. */
export const PROTOCOL_VERSION = 2;

/** The protocol level the loaded native module speaks. */
export function nativeProtocol(): number {
  const value = (globalThis as Record<string, unknown>).__vsreact_protocol;
  if (typeof value === "number" && Number.isFinite(value)) return value;

  // Hosted with no global: a module predating the handshake — level 1.
  // Not hosted (bun test, rendering a design system outside a plugin): there
  // is no consumer of ops at all, so don't pessimise the wire format for a
  // native side that isn't there.
  return isHosted ? 1 : PROTOCOL_VERSION;
}

const warned = new Set<string>();

/** True when the native side is new enough for `feature`. On the first
    failure per feature it warns, naming both levels — the degraded path is
    correct but slower, and the fix (match the module to the package) is not
    something a developer could guess from the symptom. */
export function requireProtocol(level: number, feature: string): boolean {
  const native = nativeProtocol();
  if (native >= level) return true;

  if (!warned.has(feature)) {
    warned.add(feature);
    console.warn(
      `[vsreact] the native module speaks protocol ${native}, this UI bundle speaks ` +
        `${PROTOCOL_VERSION} — falling back for: ${feature}. Update the vsreact module ` +
        `(the GIT_TAG in your FetchContent block) to match your @vsreact/core version.`,
    );
  }

  return false;
}

/** Test seam: forget which features have already warned. */
export function resetProtocolWarnings(): void {
  warned.clear();
}
