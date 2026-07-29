// Runtime knob backed by a baked film-strip: one frame shown via clip +
// translate. No <Canvas>, no shading at runtime — this is what commercial
// plugins do, and it needs nothing the SDK didn't already ship (Image,
// overflow:hidden, translateY).
//
// Produced by bakeKnobStrip.ts. See the spec's Risks section for why the live
// shader isn't viable under QuickJS.

import { View, Image } from "../index";

export interface KnobStrip {
  /** Frame width AND height in pixels (frames are square). */
  size: number;
  frames: number;
  /** Degrees of travel the strip spans, centred on zero. */
  sweepDegrees: number;
  /** The strip itself, as a `data:image/webp;base64,...` URI. */
  dataUri: string;
}

export interface FilmStripKnobProps {
  /** Rotation in degrees, within ±sweepDegrees/2. */
  rotation: number;
  strip: KnobStrip;
  /** Rendered size; defaults to the strip's native frame size. */
  displaySize?: number;
}

/** The frame index that best represents `rotation`. Exported for tests. */
export function frameForRotation(rotation: number, strip: KnobStrip): number {
  const half = strip.sweepDegrees / 2;
  const t = Math.min(1, Math.max(0, (rotation + half) / strip.sweepDegrees));
  return Math.round(t * (strip.frames - 1));
}

export function FilmStripKnob({ rotation, strip, displaySize }: FilmStripKnobProps) {
  const frame = frameForRotation(rotation, strip);
  const box = displaySize ?? strip.size;
  const scale = box / strip.size;

  return (
    <View style={{ width: box, height: box, overflow: "hidden" }}>
      <Image
        src={strip.dataUri}
        style={{
          width: box,
          height: box * strip.frames,
          translateY: -frame * strip.size * scale,
        }}
      />
    </View>
  );
}
