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
  "overflow-x-scroll": { overflow: "scroll" },
  "overflow-scroll": { overflow: "scroll" },
  // overflow:"scroll" only engages the axes whose content actually
  // overflows, so auto is the same key.
  "overflow-auto": { overflow: "scroll" },
  "overflow-y-auto": { overflow: "scroll" },
  "overflow-x-auto": { overflow: "scroll" },
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
  truncate: { numberOfLines: 1 },
  uppercase: { textTransform: "uppercase" },
  lowercase: { textTransform: "lowercase" },
  capitalize: { textTransform: "capitalize" },
  "normal-case": { textTransform: "none" },
  underline: { textDecoration: "underline" },
  "line-through": { textDecoration: "line-through" },
  "no-underline": { textDecoration: "none" },
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
  "cursor-grab": { cursor: "grab" },
  "cursor-grabbing": { cursor: "grabbing" },
  "cursor-move": { cursor: "move" },
  "cursor-ns-resize": { cursor: "ns-resize" },
  "cursor-ew-resize": { cursor: "ew-resize" },
  "cursor-crosshair": { cursor: "crosshair" },
  "cursor-not-allowed": { cursor: "not-allowed" },
  "pointer-events-none": { pointerEvents: "none" },
  "pointer-events-auto": { pointerEvents: "auto" },
  "select-text": { userSelect: "text" },
  "select-none": { userSelect: "none" },
  hidden: { display: "none" },
  invisible: { visibility: "hidden" },
  visible: { visibility: "visible" },
  "origin-center": { transformOriginX: 50, transformOriginY: 50 },
  "origin-top": { transformOriginX: 50, transformOriginY: 0 },
  "origin-bottom": { transformOriginX: 50, transformOriginY: 100 },
  "origin-left": { transformOriginX: 0, transformOriginY: 50 },
  "origin-right": { transformOriginX: 100, transformOriginY: 50 },
  "origin-top-left": { transformOriginX: 0, transformOriginY: 0 },
  "origin-top-right": { transformOriginX: 100, transformOriginY: 0 },
  "origin-bottom-left": { transformOriginX: 0, transformOriginY: 100 },
  "origin-bottom-right": { transformOriginX: 100, transformOriginY: 100 },
  "border-solid": { borderStyle: "solid" },
  "border-dashed": { borderStyle: "dashed" },
  "border-dotted": { borderStyle: "dotted" },
  "object-contain": { objectFit: "contain" },
  "object-cover": { objectFit: "cover" },
  "object-fill": { objectFit: "fill" },
  blur: { blurRadius: 8 },
  "blur-none": { blurRadius: 0 },
  "blur-sm": { blurRadius: 4 },
  "blur-md": { blurRadius: 12 },
  "blur-lg": { blurRadius: 16 },
  "blur-xl": { blurRadius: 24 },
  "blur-2xl": { blurRadius: 40 },
  "blur-3xl": { blurRadius: 64 },
  "backdrop-blur": { backdropBlurRadius: 8 },
  "backdrop-blur-none": { backdropBlurRadius: 0 },
  "backdrop-blur-sm": { backdropBlurRadius: 4 },
  "backdrop-blur-md": { backdropBlurRadius: 12 },
  "backdrop-blur-lg": { backdropBlurRadius: 16 },
  "backdrop-blur-xl": { backdropBlurRadius: 24 },
  "backdrop-blur-2xl": { backdropBlurRadius: 40 },
  "backdrop-blur-3xl": { backdropBlurRadius: 64 },
  shadow: { shadowColor: "#00000066", shadowRadius: 4, shadowOffsetY: 1 },
  "shadow-sm": { shadowColor: "#00000066", shadowRadius: 4, shadowOffsetY: 1 },
  "shadow-md": { shadowColor: "#00000066", shadowRadius: 8, shadowOffsetY: 2 },
  "shadow-lg": { shadowColor: "#00000066", shadowRadius: 12, shadowOffsetY: 4 },
  "shadow-xl": { shadowColor: "#00000066", shadowRadius: 20, shadowOffsetY: 8 },
  "shadow-inner": { insetShadowColor: "#0000000D", insetShadowRadius: 4, insetShadowOffsetY: 2 },
  "border-t": { borderTopWidth: 1 },
  "border-r": { borderRightWidth: 1 },
  "border-b": { borderBottomWidth: 1 },
  "border-l": { borderLeftWidth: 1 },
  "bg-gradient-to-t": { gradientType: "linear", gradientAngle: 0 },
  "bg-gradient-to-tr": { gradientType: "linear", gradientAngle: 45 },
  "bg-gradient-to-r": { gradientType: "linear", gradientAngle: 90 },
  "bg-gradient-to-br": { gradientType: "linear", gradientAngle: 135 },
  "bg-gradient-to-b": { gradientType: "linear", gradientAngle: 180 },
  "bg-gradient-to-bl": { gradientType: "linear", gradientAngle: 225 },
  "bg-gradient-to-l": { gradientType: "linear", gradientAngle: 270 },
  "bg-gradient-to-tl": { gradientType: "linear", gradientAngle: 315 },
  "bg-gradient-radial": { gradientType: "radial" },
  "bg-gradient-conic": { gradientType: "conic" },
  transition: { transitionProperty: "default", transitionDuration: 150 },
  "transition-all": { transitionProperty: "all", transitionDuration: 150 },
  "transition-colors": { transitionProperty: "colors", transitionDuration: 150 },
  "transition-opacity": { transitionProperty: "opacity", transitionDuration: 150 },
  "transition-transform": { transitionProperty: "transform", transitionDuration: 150 },
  "transition-none": { transitionProperty: "none" },
  "ease-linear": { transitionEasing: "linear" },
  "ease-in": { transitionEasing: "ease-in" },
  "ease-out": { transitionEasing: "ease-out" },
  "ease-in-out": { transitionEasing: "ease-in-out" },
  "animate-spin": { animationName: "spin", animationDuration: 1000 },
  "animate-pulse": { animationName: "pulse", animationDuration: 2000 },
  "animate-bounce": { animationName: "bounce", animationDuration: 1000 },
  "animate-none": { animationName: "none" },
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
  "translate-x": ["translateX"],
  "translate-y": ["translateY"],
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

  const negate = (v: StyleValue): StyleValue => {
    if (!negative) return v;
    if (typeof v === "number") return -v;
    if (typeof v === "string" && v.endsWith("%")) return `-${v}`;
    return v;
  };

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
    case "from": {
      const color = resolveColor(rest);
      return color !== undefined ? { gradientFrom: color } : undefined;
    }
    case "via": {
      const color = resolveColor(rest);
      return color !== undefined ? { gradientVia: color } : undefined;
    }
    case "to": {
      const color = resolveColor(rest);
      return color !== undefined ? { gradientTo: color } : undefined;
    }
    case "rotate": {
      // Degrees, literal: rotate-45, -rotate-90, rotate-[10]
      const deg = rest.startsWith("[") ? parseLength(rest) : Number(rest);
      return typeof deg === "number" && Number.isFinite(deg) ? { rotate: negate(deg) } : undefined;
    }
    case "scale": {
      // Percent named scale (scale-95), raw factor arbitrary (scale-[1.25])
      if (rest.startsWith("[")) {
        const factor = parseLength(rest);
        return typeof factor === "number" ? { scale: factor } : undefined;
      }
      const percent = Number(rest);
      return Number.isFinite(percent) ? { scale: percent / 100 } : undefined;
    }
    case "text": {
      if (rest in textSizes) return { fontSize: textSizes[rest] };
      if (rest.startsWith("[") && !rest.startsWith("[#")) {
        const size = parseLength(rest);
        if (typeof size === "number") return { fontSize: size };
      }
      const color = resolveColor(rest);
      return color !== undefined ? { color } : undefined;
    }
    case "border": {
      const n = Number(rest);
      if (Number.isFinite(n)) return { borderWidth: n };
      // Per-side widths (literal px like tw): border-t-2, border-b-[3]
      const side = /^([trbl])-(.+)$/.exec(rest);
      if (side) {
        const key = { t: "borderTopWidth", r: "borderRightWidth", b: "borderBottomWidth", l: "borderLeftWidth" }[
          side[1] as "t" | "r" | "b" | "l"
        ];
        const width = side[2].startsWith("[") ? parseLength(side[2]) : Number(side[2]);
        return typeof width === "number" && Number.isFinite(width) ? { [key]: width } : undefined;
      }
      const color = resolveColor(rest);
      return color !== undefined ? { borderColor: color } : undefined;
    }
    case "opacity": {
      const n = Number(rest);
      return Number.isFinite(n) ? { opacity: n / 100 } : undefined;
    }
    case "blur": {
      // Named sizes live in staticClasses; arbitrary is px: blur-[6].
      if (rest.startsWith("[")) {
        const radius = parseLength(rest);
        if (typeof radius === "number") return { blurRadius: radius };
      }
      return undefined;
    }
    case "backdrop": {
      // backdrop-blur-[6] (named backdrop-blur-* sizes are static classes)
      if (rest.startsWith("blur-[")) {
        const radius = parseLength(rest.slice("blur-".length));
        if (typeof radius === "number") return { backdropBlurRadius: radius };
      }
      return undefined;
    }
    case "leading": {
      if (rest.startsWith("[")) {
        const px = parseLength(rest);
        return typeof px === "number" ? { lineHeight: px } : undefined;
      }
      const n = Number(rest);
      return Number.isFinite(n) ? { lineHeight: n * 4 } : undefined;
    }
    case "line": {
      // line-clamp-N (rest arrives as "clamp-N")
      if (rest.startsWith("clamp-")) {
        const n = Number(rest.slice("clamp-".length));
        return Number.isFinite(n) && n > 0 ? { numberOfLines: n } : undefined;
      }
      return undefined;
    }
    case "tracking": {
      // Named scale lives in staticClasses; arbitrary is px: tracking-[3].
      if (rest.startsWith("[")) {
        const spacing = parseLength(rest);
        if (typeof spacing === "number") return { letterSpacing: negate(spacing) };
      }
      return undefined;
    }
    case "flex": {
      const n = Number(rest);
      return Number.isFinite(n) ? { flex: n } : undefined;
    }
    case "duration": {
      // Milliseconds, literal (duration-150, duration-[320]).
      const ms = rest.startsWith("[") ? parseLength(rest) : Number(rest);
      return typeof ms === "number" && Number.isFinite(ms) && ms >= 0
        ? { transitionDuration: ms }
        : undefined;
    }
    case "delay": {
      const ms = rest.startsWith("[") ? parseLength(rest) : Number(rest);
      return typeof ms === "number" && Number.isFinite(ms) && ms >= 0
        ? { transitionDelay: ms }
        : undefined;
    }
    case "z": {
      const z = rest.startsWith("[") ? parseLength(rest) : Number(rest);
      return typeof z === "number" && Number.isFinite(z) ? { zIndex: negate(z) } : undefined;
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
