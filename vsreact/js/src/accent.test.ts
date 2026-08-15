import { afterEach, describe, expect, test } from "bun:test";
import { accentColor, DEFAULT_ACCENT, setThemeColors } from "./theme";

// setThemeColors is process-global, so every test here restores the default.
afterEach(() => setThemeColors({ accent: DEFAULT_ACCENT }));

describe("accentColor", () => {
  test("falls back to VSReacT lime when no theme accent is set", () => {
    expect(accentColor().toLowerCase()).toBe(DEFAULT_ACCENT.toLowerCase());
  });

  test("follows the theme's accent token, as authored", () => {
    setThemeColors({ accent: "#A07DFF" });
    expect(accentColor()).toBe("#A07DFF");
  });

  test("appends an alpha suffix for translucent fills", () => {
    setThemeColors({ accent: "#A07DFF" });
    expect(accentColor("66")).toBe("#A07DFF66");
  });

  test("replaces an existing alpha rather than doubling it", () => {
    setThemeColors({ accent: "#A07DFF80" });
    expect(accentColor("66")).toBe("#A07DFF66");
  });

  test("is read per call, so a later configureTheme reaches the controls", () => {
    setThemeColors({ accent: "#111111" });
    const first = accentColor();
    setThemeColors({ accent: "#222222" });
    expect(first).toBe("#111111");
    expect(accentColor()).toBe("#222222");
  });
});
