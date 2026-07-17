import { resolveColor, setThemeColors, type ThemeColors } from "./theme";

export type StyleValue = string | number;
export type Style = Record<string, StyleValue>;

export interface ResolvedClasses {
  style: Style;
  hoverStyle?: Style;
  activeStyle?: Style;
  focusStyle?: Style;
}

export function configureTheme(theme: { colors?: ThemeColors }): void {
  if (theme.colors) setThemeColors(theme.colors);
  cache.clear();
}

const staticClasses: Record<string, Style> = {
  flex: {},
  "flex-row": { flexDirection: "row" },
  "flex-col": { flexDirection: "column" },
  "flex-row-reverse": { flexDirection: "row-reverse" },
  "flex-col-reverse": { flexDirection: "column-reverse" },
  "flex-1": { flex: 1 },
  "flex-auto": { flexGrow: 1, flexShrink: 1 },
  "flex-none": { flexGrow: 0, flexShrink: 0 },
  grow: { flexGrow: 1 },
  "grow-0": { flexGrow: 0 },
  shrink: { flexShrink: 1 },
  "shrink-0": { flexShrink: 0 },
  "flex-wrap": { flexWrap: "wrap" },
  "flex-nowrap": { flexWrap: "nowrap" },
  "items-start": { alignItems: "flex-start" },
  "items-center": { alignItems: "center" },
  "items-end": { alignItems: "flex-end" },
  "items-stretch": { alignItems: "stretch" },
  "items-baseline": { alignItems: "baseline" },
  "justify-start": { justifyContent: "flex-start" },
  "justify-center": { justifyContent: "center" },
  "justify-end": { justifyContent: "flex-end" },
  "justify-between": { justifyContent: "space-between" },
  "justify-around": { justifyContent: "space-around" },
  "justify-evenly": { justifyContent: "space-evenly" },
  "self-start": { alignSelf: "flex-start" },
  "self-center": { alignSelf: "center" },
  "self-end": { alignSelf: "flex-end" },
  "self-stretch": { alignSelf: "stretch" },
  "self-auto": { alignSelf: "auto" },
  absolute: { position: "absolute" },
  relative: { position: "relative" },
  "overflow-hidden": { overflow: "hidden" },
  "overflow-visible": { overflow: "visible" },
  "overflow-y-scroll": { overflow: "scroll" },
  "overflow-scroll": { overflow: "scroll" },
  "w-full": { width: "100%" },
  "h-full": { height: "100%" },
  "text-left": { textAlign: "left" },
  "text-center": { textAlign: "center" },
  "text-right": { textAlign: "right" },
  "font-mono": { fontFamily: "monospace" },
  "font-normal": { fontWeight: 400 },
  "font-medium": { fontWeight: 500 },
  "font-semibold": { fontWeight: 600 },
  "font-bold": { fontWeight: 700 },
  "tracking-tighter": { letterSpacing: -0.8 },
  "tracking-tight": { letterSpacing: -0.4 },
  "tracking-normal": { letterSpacing: 0 },
  "tracking-wide": { letterSpacing: 0.4 },
  "tracking-wider": { letterSpacing: 0.8 },
  "tracking-widest": { letterSpacing: 1.6 },
  border: { borderWidth: 1 },
  "aspect-square": { aspectRatio: 1 },
  "aspect-video": { aspectRatio: 16 / 9 },
  "cursor-pointer": { cursor: "pointer" },
  "cursor-text": { cursor: "text" },
  "cursor-default": { cursor: "default" },
  shadow: { shadowColor: "#00000066", shadowRadius: 4, shadowOffsetY: 1 },
  "shadow-sm": { shadowColor: "#00000066", shadowRadius: 4, shadowOffsetY: 1 },
  "shadow-md": { shadowColor: "#00000066", shadowRadius: 8, shadowOffsetY: 2 },
  "shadow-lg": { shadowColor: "#00000066", shadowRadius: 12, shadowOffsetY: 4 },
  "shadow-xl": { shadowColor: "#00000066", shadowRadius: 20, shadowOffsetY: 8 },
};

const textSizes: Record<string, number> = {
  xs: 12, sm: 14, base: 16, lg: 18, xl: 20, "2xl": 24, "3xl": 30, "4xl": 36,
  "5xl": 48, "6xl": 60,
};

const radiusSizes: Record<string, number> = {
  "": 4, sm: 2, md: 6, lg: 8, xl: 12, "2xl": 16, "3xl": 24, full: 9999,
};

const radiusCorners: Record<string, string[]> = {
  "": ["borderTopLeftRadius", "borderTopRightRadius", "borderBottomLeftRadius", "borderBottomRightRadius"],
  t: ["borderTopLeftRadius", "borderTopRightRadius"],
  b: ["borderBottomLeftRadius", "borderBottomRightRadius"],
  l: ["borderTopLeftRadius", "borderBottomLeftRadius"],
  r: ["borderTopRightRadius", "borderBottomRightRadius"],
  tl: ["borderTopLeftRadius"],
  tr: ["borderTopRightRadius"],
  bl: ["borderBottomLeftRadius"],
  br: ["borderBottomRightRadius"],
};

// Utilities whose value is a length on the 4px spacing scale.
const lengthKeys: Record<string, string[]> = {
  w: ["width"],
  h: ["height"],
  size: ["width", "height"],
  "min-w": ["minWidth"],
  "min-h": ["minHeight"],
  "max-w": ["maxWidth"],
  "max-h": ["maxHeight"],
  p: ["padding"],
  px: ["paddingLeft", "paddingRight"],
  py: ["paddingTop", "paddingBottom"],
  pt: ["paddingTop"],
  pr: ["paddingRight"],
  pb: ["paddingBottom"],
  pl: ["paddingLeft"],
  m: ["margin"],
  mx: ["marginLeft", "marginRight"],
  my: ["marginTop", "marginBottom"],
  mt: ["marginTop"],
  mr: ["marginRight"],
  mb: ["marginBottom"],
  ml: ["marginLeft"],
  gap: ["gap"],
  "gap-x": ["columnGap"],
  "gap-y": ["rowGap"],
  top: ["top"],
  right: ["right"],
  bottom: ["bottom"],
  left: ["left"],
  inset: ["left", "right", "top", "bottom"],
  "inset-x": ["left", "right"],
  "inset-y": ["top", "bottom"],
  basis: ["flexBasis"],
};

const warned = new Set<string>();

function warnUnknown(cls: string): void {
  if (warned.has(cls)) return;
  warned.add(cls);
  console.warn(`[vsreact] unknown class "${cls}" ignored`);
}

/** "4"→16, "1.5"→6, "px"→1, "1/2"→"50%", "full"→"100%", "[123]"→123, "[45%]"→"45%" */
function parseLength(raw: string): StyleValue | undefined {
  if (raw.startsWith("[") && raw.endsWith("]")) {
    const inner = raw.slice(1, -1);
    if (inner.endsWith("%")) return inner;
    const n = Number(inner.replace(/px$/, ""));
    return Number.isFinite(n) ? n : undefined;
  }
  if (raw === "px") return 1;
  if (raw === "full") return "100%";
  if (raw === "auto") return "auto";
  if (/^\d+\/\d+$/.test(raw)) {
    const [num, den] = raw.split("/").map(Number);
    return `${((num / den) * 100).toFixed(4).replace(/\.?0+$/, "")}%`;
  }
  const n = Number(raw);
  return Number.isFinite(n) ? n * 4 : undefined;
}

function resolveClass(cls: string): Style | undefined {
  const negative = cls.startsWith("-");
  const body = negative ? cls.slice(1) : cls;

  const negate = (v: StyleValue): StyleValue => (negative && typeof v === "number" ? -v : v);

  const known = staticClasses[body];
  if (known && !negative) return known;

  // rounded, rounded-lg, rounded-t-lg, rounded-br-full, rounded-[10]
  if (body === "rounded" || body.startsWith("rounded-")) {
    const rest = body === "rounded" ? "" : body.slice("rounded-".length);
    const parts = rest === "" ? [] : rest.split("-");
    let corner = "";
    let size = "";
    if (parts.length === 1) {
      if (parts[0] in radiusCorners) corner = parts[0];
      else size = parts[0];
    } else if (parts.length === 2) {
      [corner, size] = parts;
    }
    const corners = radiusCorners[corner];
    const radius =
      size.startsWith("[") ? (parseLength(size) as number | undefined) : radiusSizes[size];
    if (corners === undefined || radius === undefined) return undefined;
    if (corner === "") return { borderRadius: radius };
    const style: Style = {};
    for (const key of corners) style[key] = radius;
    return style;
  }

  const dash = body.indexOf("-");
  if (dash <= 0) return undefined;

  // Longest matching length-utility prefix (handles gap-x-4 vs gap-4, min-w-*).
  for (const prefix of Object.keys(lengthKeys).sort((a, b) => b.length - a.length)) {
    if (body.startsWith(prefix + "-")) {
      const value = parseLength(body.slice(prefix.length + 1));
      if (value === undefined) break;
      const style: Style = {};
      for (const key of lengthKeys[prefix]) style[key] = negate(value);
      return style;
    }
  }

  const prefix = body.slice(0, dash);
  const rest = body.slice(dash + 1);

  switch (prefix) {
    case "bg": {
      const color = resolveColor(rest);
      return color !== undefined ? { backgroundColor: color } : undefined;
    }
    case "text": {
      if (rest in textSizes) return { fontSize: textSizes[rest] };
      const color = resolveColor(rest);
      return color !== undefined ? { color } : undefined;
    }
    case "border": {
      const n = Number(rest);
      if (Number.isFinite(n)) return { borderWidth: n };
      const color = resolveColor(rest);
      return color !== undefined ? { borderColor: color } : undefined;
    }
    case "opacity": {
      const n = Number(rest);
      return Number.isFinite(n) ? { opacity: n / 100 } : undefined;
    }
    case "leading": {
      const n = Number(rest);
      return Number.isFinite(n) ? { lineHeight: n * 4 } : undefined;
    }
    case "flex": {
      const n = Number(rest);
      return Number.isFinite(n) ? { flex: n } : undefined;
    }
    default:
      return undefined;
  }
}

const cache = new Map<string, ResolvedClasses>();

export function tw(classes: string): ResolvedClasses {
  const cached = cache.get(classes);
  if (cached) return cached;

  const result: ResolvedClasses = { style: {} };

  for (const cls of classes.split(/\s+/)) {
    if (cls === "") continue;

    let bucket: "style" | "hoverStyle" | "activeStyle" | "focusStyle" = "style";
    let body = cls;

    if (body.startsWith("hover:")) [bucket, body] = ["hoverStyle", body.slice(6)];
    else if (body.startsWith("active:")) [bucket, body] = ["activeStyle", body.slice(7)];
    else if (body.startsWith("focus:")) [bucket, body] = ["focusStyle", body.slice(6)];

    const resolved = resolveClass(body);

    if (resolved === undefined) {
      warnUnknown(cls);
      continue;
    }

    result[bucket] = Object.assign(result[bucket] ?? {}, resolved);
  }

  cache.set(classes, result);
  return result;
}
