export type ThemeColors = Record<string, string>;

// Tailwind v3 palettes (the curated subset VSReacT ships with).
const palettes: Record<string, Record<string, string>> = {
  zinc: {
    "50": "#fafafa", "100": "#f4f4f5", "200": "#e4e4e7", "300": "#d4d4d8",
    "400": "#a1a1aa", "500": "#71717a", "600": "#52525b", "700": "#3f3f46",
    "800": "#27272a", "900": "#18181b", "950": "#09090b",
  },
  neutral: {
    "50": "#fafafa", "100": "#f5f5f5", "200": "#e5e5e5", "300": "#d4d4d4",
    "400": "#a3a3a3", "500": "#737373", "600": "#525252", "700": "#404040",
    "800": "#262626", "900": "#171717", "950": "#0a0a0a",
  },
  lime: {
    "50": "#f7fee7", "100": "#ecfccb", "200": "#d9f99d", "300": "#bef264",
    "400": "#a3e635", "500": "#84cc16", "600": "#65a30d", "700": "#4d7c0f",
    "800": "#3f6212", "900": "#365314", "950": "#1a2e05",
  },
  red: {
    "50": "#fef2f2", "100": "#fee2e2", "200": "#fecaca", "300": "#fca5a5",
    "400": "#f87171", "500": "#ef4444", "600": "#dc2626", "700": "#b91c1c",
    "800": "#991b1b", "900": "#7f1d1d", "950": "#450a0a",
  },
  amber: {
    "50": "#fffbeb", "100": "#fef3c7", "200": "#fde68a", "300": "#fcd34d",
    "400": "#fbbf24", "500": "#f59e0b", "600": "#d97706", "700": "#b45309",
    "800": "#92400e", "900": "#78350f", "950": "#451a03",
  },
  emerald: {
    "50": "#ecfdf5", "100": "#d1fae5", "200": "#a7f3d0", "300": "#6ee7b7",
    "400": "#34d399", "500": "#10b981", "600": "#059669", "700": "#047857",
    "800": "#065f46", "900": "#064e3b", "950": "#022c22",
  },
  sky: {
    "50": "#f0f9ff", "100": "#e0f2fe", "200": "#bae6fd", "300": "#7dd3fc",
    "400": "#38bdf8", "500": "#0ea5e9", "600": "#0284c7", "700": "#0369a1",
    "800": "#075985", "900": "#0c4a6e", "950": "#082f49",
  },
};

let themeColors: ThemeColors = {};

export function setThemeColors(colors: ThemeColors): void {
  themeColors = { ...themeColors };
  for (const [name, value] of Object.entries(colors))
    themeColors[name] = value.toLowerCase();
}

/** Resolves a color name ("zinc-900", "white", "accent", "lime-400/20",
    "[#c6f135]") to "#rrggbb"/"#rrggbbaa", or undefined if unknown. */
export function resolveColor(name: string): string | undefined {
  let base = name;
  let alpha: string | undefined;

  const slash = name.lastIndexOf("/");
  if (slash > 0) {
    const pct = Number(name.slice(slash + 1));
    if (Number.isFinite(pct)) {
      base = name.slice(0, slash);
      alpha = Math.round((pct / 100) * 255)
        .toString(16)
        .padStart(2, "0");
    }
  }

  let hex: string | undefined;

  if (base.startsWith("[#") && base.endsWith("]")) hex = base.slice(1, -1).toLowerCase();
  else if (base === "white") hex = "#ffffff";
  else if (base === "black") hex = "#000000";
  else if (base === "transparent") hex = "#00000000";
  else if (themeColors[base]) hex = themeColors[base];
  else {
    const dash = base.lastIndexOf("-");
    if (dash > 0) {
      const palette = palettes[base.slice(0, dash)];
      hex = palette?.[base.slice(dash + 1)];
    }
  }

  if (hex === undefined) return undefined;
  return alpha !== undefined && hex.length === 7 ? hex + alpha : hex;
}
