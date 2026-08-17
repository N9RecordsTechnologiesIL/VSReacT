// Source-map translation for error stacks. QuickJS reports frames in the
// bundled file's line numbers ("at tick (main.js:3021)"), which is useless
// against a 3000-line IIFE. The build prepends the bundle's source map as a
// one-line global; this module decodes it (lazily, only when an error
// actually happens) and rewrites each frame to the original file and line
// ("at tick (src/main.tsx:47)").
//
// Only the mappings features stacks need are implemented: base64-VLQ decode
// and per-generated-line segment lookup. Column info is used when the engine
// provides it; QuickJS often reports line-only, in which case the line's
// first segment names the file — right file, near-enough line.

export interface RawSourceMap {
  version: number;
  sources: string[];
  mappings: string;
}

/** [generatedColumn, sourceIndex, sourceLine, sourceColumn] per segment. */
type Segment = [number, number, number, number];

const BASE64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
const charToInt = new Map([...BASE64].map((c, i) => [c, i] as const));

/** Decode one line of VLQ segments, mutating the cross-line source state. */
function decodeLine(line: string, state: { src: number; srcLine: number; srcCol: number }): Segment[] {
  const segments: Segment[] = [];
  let genCol = 0;
  let pos = 0;

  while (pos < line.length) {
    const values: number[] = [];
    // one segment: 1, 4 or 5 VLQ values, comma-terminated
    while (pos < line.length && line[pos] !== ",") {
      let value = 0;
      let shift = 0;
      let digit: number;
      do {
        const mapped = charToInt.get(line[pos++]);
        if (mapped === undefined) return segments; // malformed — keep what we have
        digit = mapped;
        value += (digit & 31) << shift;
        shift += 5;
      } while (digit & 32);
      values.push(value & 1 ? -(value >>> 1) : value >>> 1);
    }
    pos++; // the comma

    if (values.length >= 4) {
      genCol += values[0];
      state.src += values[1];
      state.srcLine += values[2];
      state.srcCol += values[3];
      segments.push([genCol, state.src, state.srcLine, state.srcCol]);
    } else if (values.length >= 1) {
      genCol += values[0];
    }
  }

  return segments;
}

/** Decoded map: segments per generated line (0-based). */
export function decodeMappings(mappings: string): Segment[][] {
  const state = { src: 0, srcLine: 0, srcCol: 0 };
  return mappings.split(";").map((line) => decodeLine(line, state));
}

/** The original {source, line} for a generated position (1-based in, 1-based
    out), or undefined when the map has nothing there. */
export function originalPosition(
  lines: Segment[][],
  map: RawSourceMap,
  generatedLine: number,
  generatedColumn?: number,
): { source: string; line: number } | undefined {
  const segments = lines[generatedLine - 1];
  if (!segments || segments.length === 0) return undefined;

  let best = segments[0];

  if (generatedColumn !== undefined) {
    // Last segment at or before the column — the standard lookup.
    for (const segment of segments) {
      if (segment[0] > generatedColumn - 1) break;
      best = segment;
    }
  } else {
    // Line-only frames (QuickJS): the first segment is often the tail of the
    // previous statement spilling onto this line, so take the source line
    // most of the line's segments agree on instead.
    const votes = new Map<string, { count: number; segment: Segment }>();
    for (const segment of segments) {
      const key = `${segment[1]}:${segment[2]}`;
      const entry = votes.get(key);
      if (entry) entry.count++;
      else votes.set(key, { count: 1, segment });
    }
    let bestCount = 0;
    for (const { count, segment } of votes.values())
      if (count > bestCount) {
        bestCount = count;
        best = segment;
      }
  }

  const source = map.sources[best[1]];
  return source === undefined ? undefined : { source, line: best[2] + 1 };
}

/** Rewrite every `file:line(:col)?` frame in a QuickJS stack through the map.
    `bundleFile` is the name frames carry (the evaluate() filename);
    `lineOffset` is how many lines the build prepended ABOVE the mapped
    bundle (the map global itself). Frames that don't resolve pass through. */
export function mapStackTrace(
  stack: string,
  map: RawSourceMap,
  bundleFile: string,
  lineOffset: number,
): string {
  const lines = decodeMappings(map.mappings);
  const frame = new RegExp(`(${bundleFile.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}):(\\d+)(?::(\\d+))?`, "g");

  return stack.replace(frame, (whole, _file, lineText, colText) => {
    const generatedLine = Number(lineText) - lineOffset;
    if (generatedLine < 1) return whole;

    const original = originalPosition(lines, map, generatedLine, colText ? Number(colText) : undefined);
    return original === undefined ? whole : `${original.source}:${original.line}`;
  });
}
