// Registers a custom font so `fontFamily` / a font-family class resolves to a
// bundled typeface instead of a system-installed one. Bytes travel to native
// the same two ways images do: a file path or a base64 `data:` URI.

export interface FontSpec {
  /** The family name you'll use in `fontFamily` / the font-family class. */
  family: string;
  /** A file path or a `data:font/...;base64,...` URI. */
  src: string;
  /** Optional weight this face represents (default 400). "bold" → 700. */
  weight?: number | "normal" | "bold";
}

function normalizeWeight(weight: FontSpec["weight"]): number {
  if (weight === "bold") return 700;
  if (weight === "normal" || weight === undefined) return 400;
  return typeof weight === "number" ? weight : 400;
}

export function registerFont(spec: FontSpec): void {
  if (!spec || typeof spec.family !== "string" || spec.family.length === 0)
    throw new Error("registerFont: `family` must be a non-empty string");
  if (typeof spec.src !== "string" || spec.src.length === 0)
    throw new Error("registerFont: `src` must be a file path or a data: URI");

  const fn = (globalThis as Record<string, any>).__vsreact_registerFont;
  if (typeof fn === "function") fn(spec.family, spec.src, normalizeWeight(spec.weight));
}
