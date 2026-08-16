// Interns a large image source (a base64 data URI or a file path) in native
// memory and returns a short "img:N" handle to use as an <Image src>. The
// decoded bitmap then lives on the C++ side and the bridge only ever carries
// the handle — a reference-art plate stops being a multi-megabyte string that
// rides along with prop updates. The same shape as registerFont.

const handles = new Map<string, string>();

/**
 * Register an image once and get its handle. Idempotent per source string —
 * repeat calls (including from several components sharing one asset) return
 * the same handle without crossing the bridge again.
 *
 * On a native side too old to have the binding (below protocol 2), this
 * returns the source unchanged: the raw data URI still paints, just without
 * the interning win. The presence of the function is the check here rather
 * than the protocol level — it's the more direct test of the same thing.
 */
export function registerImage(src: string): string {
  if (typeof src !== "string" || src.length === 0)
    throw new Error("registerImage: `src` must be a file path or a data: URI");

  const existing = handles.get(src);
  if (existing !== undefined) return existing;

  const fn = (globalThis as Record<string, any>).__vsreact_registerImage;
  const handle = typeof fn === "function" ? fn(src) : "";
  const result = typeof handle === "string" && handle.length > 0 ? handle : src;

  handles.set(src, result);
  return result;
}
