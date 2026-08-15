// Synth-surface controls — the ADSR envelope editor and the pitch/mod
// wheels. Views only: the envelope is a filled column fill (like
// <Waveform>) with draggable corner handles riding on top.

import { useEffect, useRef, useState } from "react";
import { View, Text } from "./primitives";
import { accentColor as themeAccent } from "./theme";
import { useSpring } from "./animation";
import { useParameter } from "./parameters";

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

export type ADSRKey = "attack" | "decay" | "sustain" | "release";

export interface ADSREnvelopeProps {
  /** All 0..1: times are a fraction of each stage's max width. */
  attack: number;
  decay: number;
  sustain: number;
  release: number;
  width?: number;
  height?: number;
  /** Fill resolution. Default 44 columns. */
  columns?: number;
  disabled?: boolean;
  trackColor?: string;
  /** The filled envelope body. */
  color?: string;
  handleColor?: string;
  label?: string;
  onChange: (key: ADSRKey, value: number) => void;
  onBegin?: (key: ADSRKey) => void;
  onEnd?: (key: ADSRKey) => void;
}

/** The envelope level at x, piecewise over A → D → S plateau → R. */
export function adsrLevelAt(
  x: number,
  width: number,
  attack: number,
  decay: number,
  sustain: number,
  release: number,
): number {
  const segW = width * 0.27;
  const ax = attack * segW;
  const dw = decay * segW;
  const rw = release * segW;
  const rx = width - rw;

  if (x <= ax) return ax === 0 ? 1 : x / ax;
  if (x <= ax + dw) return 1 - (1 - sustain) * ((x - ax) / (dw || 1));
  if (x <= rx) return sustain;
  return rw === 0 ? 0 : Math.max(0, sustain * (1 - (x - rx) / rw));
}

/** The classic four-corner envelope editor: drag the attack peak, the
    decay/sustain corner (both axes), and the release corner. */
export function ADSREnvelope({
  attack,
  decay,
  sustain,
  release,
  width = 220,
  height = 96,
  columns = 44,
  disabled,
  trackColor = "#141714",
  color = themeAccent("66"),
  handleColor = "#ECF2E8",
  label,
  onChange,
  onBegin,
  onEnd,
}: ADSREnvelopeProps) {
  const start = useRef({ attack: 0, decay: 0, sustain: 0, release: 0 });

  const a = clamp01(attack);
  const d = clamp01(decay);
  const s = clamp01(sustain);
  const r = clamp01(release);

  const segW = width * 0.27;
  const HANDLE = 18;

  const handleProps = (keys: ADSRKey[], move: (dx: number, dy: number) => void) =>
    disabled
      ? {}
      : {
          onDragStart: () => {
            start.current = { attack: a, decay: d, sustain: s, release: r };
            for (const key of keys) onBegin?.(key);
          },
          onDrag: (e: { dx: number; dy: number }) => move(e.dx, e.dy),
          onDragEnd: () => {
            for (const key of keys) onEnd?.(key);
          },
        };

  const dot = (left: number, top: number, keys: ADSRKey[], move: (dx: number, dy: number) => void) => (
    <View
      className={`absolute items-center justify-center ${disabled ? "" : "cursor-pointer"}`}
      style={{ left: left - HANDLE / 2, top: top - HANDLE / 2, width: HANDLE, height: HANDLE }}
      {...handleProps(keys, move)}
    >
      <View
        className="rounded-full border"
        style={{ width: 9, height: 9, backgroundColor: handleColor, borderColor: "#00000088" }}
      />
    </View>
  );

  const body = (
    <View
      className={`relative rounded overflow-hidden ${disabled ? "opacity-40" : ""}`}
      style={{ width, height, backgroundColor: trackColor }}
    >
      {/* Sampled columns, drawn edge to edge: the envelope reads as one filled
          shape with a stepped top, not as a row of bars. */}
      <View className="absolute inset-0 flex-row items-end px-[1]">
        {Array.from({ length: columns }, (_, i) => {
          const level = adsrLevelAt(((i + 0.5) / columns) * width, width, a, d, s, r);
          return (
            <View
              key={i}
              className="flex-1"
              style={{ height: Math.max(1, level * (height - 4)), backgroundColor: color }}
            />
          );
        })}
      </View>
      {dot(a * segW, 4, ["attack"], (dx) => onChange("attack", clamp01(start.current.attack + dx / segW)))}
      {dot(a * segW + d * segW, 4 + (1 - s) * (height - 8), ["decay", "sustain"], (dx, dy) => {
        onChange("decay", clamp01(start.current.decay + dx / segW));
        onChange("sustain", clamp01(start.current.sustain - dy / (height - 8)));
      })}
      {dot(width - r * segW, 4 + (1 - s) * (height - 8), ["release"], (dx) =>
        onChange("release", clamp01(start.current.release - dx / segW)),
      )}
    </View>
  );

  if (label === undefined) return body;

  return (
    <View className="items-center gap-2">
      {body}
      <Text className="text-faint text-[10] font-bold tracking-widest">{label}</Text>
    </View>
  );
}

export interface ParamADSREnvelopeProps {
  attackId: string;
  decayId: string;
  sustainId: string;
  releaseId: string;
  width?: number;
  height?: number;
  color?: string;
  label?: string;
}

/** An ADSREnvelope over four host parameters, gestures opened per
    handle (the decay/sustain corner drives both together). */
export function ParamADSREnvelope({
  attackId,
  decayId,
  sustainId,
  releaseId,
  ...visual
}: ParamADSREnvelopeProps) {
  const params = {
    attack: useParameter(attackId),
    decay: useParameter(decayId),
    sustain: useParameter(sustainId),
    release: useParameter(releaseId),
  };

  return (
    <ADSREnvelope
      attack={params.attack.value}
      decay={params.decay.value}
      sustain={params.sustain.value}
      release={params.release.value}
      onChange={(key, value) => params[key].set(value)}
      onBegin={(key) => params[key].begin()}
      onEnd={(key) => params[key].end()}
      {...visual}
    />
  );
}

/* ── wheels ─────────────────────────────────────────────────────────── */

interface WheelSkin {
  width?: number;
  height?: number;
  disabled?: boolean;
  trackColor?: string;
  thumbColor?: string;
  accentColor?: string;
  label?: string;
}

function WheelChrome({
  value01,
  width = 34,
  height = 110,
  disabled,
  trackColor = "#141714",
  thumbColor = "#3A4038",
  accentColor = themeAccent(),
  label,
  centerMark,
  handlers,
}: WheelSkin & {
  /** Thumb position, 0 (bottom) .. 1 (top). */
  value01: number;
  centerMark?: boolean;
  handlers: Record<string, unknown>;
}) {
  const THUMB = 16;
  const travel = height - 4 - THUMB;

  const wheel = (
    <View
      className={`relative rounded-lg border overflow-hidden ${disabled ? "opacity-40" : "cursor-pointer"}`}
      style={{ width, height, backgroundColor: trackColor, borderColor: "#00000066" }}
      {...handlers}
    >
      {centerMark ? (
        <View
          className="absolute left-0 right-0 h-[1]"
          style={{ top: height / 2, backgroundColor: "#FFFFFF2E" }}
        />
      ) : null}
      <View
        className="absolute left-[2] right-[2] rounded"
        style={{ top: 2 + (1 - clamp01(value01)) * travel, height: THUMB, backgroundColor: thumbColor }}
      >
        <View
          className="absolute left-[2] right-[2] rounded-full"
          style={{ top: THUMB / 2 - 1.25, height: 2.5, backgroundColor: accentColor }}
        />
      </View>
    </View>
  );

  if (label === undefined) return wheel;

  return (
    <View className="items-center gap-2">
      {wheel}
      <Text className="text-faint text-[10] font-bold tracking-widest">{label}</Text>
    </View>
  );
}

export interface PitchBendProps extends WheelSkin {
  /** Bend, −1..+1; fires continuously and again as the spring returns. */
  onChange?: (value: number) => void;
  /** Snap back to center on release. Default true. */
  springBack?: boolean;
}

/** The pitch wheel: drag up/down from center, springs back to 0 on
    release (momentary — it owns its own state). */
export function PitchBend({ onChange, springBack = true, ...skin }: PitchBendProps) {
  const [drag, setDrag] = useState<number | null>(null);
  const sprung = useSpring(drag ?? 0, { stiffness: 320, damping: 24 });
  const value = drag ?? (springBack ? sprung : 0);

  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  useEffect(() => {
    onChangeRef.current?.(value);
  }, [value]);

  const startValue = useRef(0);
  const height = skin.height ?? 110;

  const handlers = skin.disabled
    ? {}
    : {
        onDragStart: () => {
          startValue.current = drag ?? 0;
          setDrag(startValue.current);
        },
        onDrag: (e: { dy: number }) =>
          setDrag(Math.min(1, Math.max(-1, startValue.current - e.dy / (height / 2)))),
        onDragEnd: () => setDrag(null),
      };

  return <WheelChrome value01={(value + 1) / 2} centerMark handlers={handlers} {...skin} />;
}

export interface ModWheelProps extends WheelSkin {
  /** 0..1, controlled — mod wheels stay where you leave them. */
  value: number;
  onChange: (value: number) => void;
  onBegin?: () => void;
  onEnd?: () => void;
}

/** The mod wheel: a vertical strip that holds its position. */
export function ModWheel({ value, onChange, onBegin, onEnd, ...skin }: ModWheelProps) {
  const startValue = useRef(0);
  const height = skin.height ?? 110;

  const handlers = skin.disabled
    ? {}
    : {
        onDragStart: () => {
          startValue.current = clamp01(value);
          onBegin?.();
        },
        onDrag: (e: { dy: number }) => onChange(clamp01(startValue.current - e.dy / (height - 20))),
        onDragEnd: () => onEnd?.(),
      };

  return <WheelChrome value01={clamp01(value)} handlers={handlers} {...skin} />;
}

export interface ParamModWheelProps extends WheelSkin {
  paramId: string;
}

/** A ModWheel bound to a host parameter. */
export function ParamModWheel({ paramId, ...skin }: ParamModWheelProps) {
  const param = useParameter(paramId);

  return (
    <ModWheel
      value={param.value}
      onChange={param.set}
      onBegin={param.begin}
      onEnd={param.end}
      label={skin.label ?? param.name.toUpperCase()}
      {...skin}
    />
  );
}

export interface ParamPitchBendProps extends WheelSkin {
  /** A 0..1 host parameter with 0.5 center. */
  paramId: string;
}

/** A PitchBend writing 0.5 ± bend/2 to a host parameter; release closes
    the gesture at dead center (the visual spring is cosmetic). */
export function ParamPitchBend({ paramId, ...skin }: ParamPitchBendProps) {
  const param = useParameter(paramId);
  const active = useRef(false);

  return (
    <PitchBend
      onChange={(v) => {
        if (v === 0 && !active.current) return; // at rest (incl. mount) — nothing to write
        if (!active.current) {
          active.current = true;
          param.begin();
        }
        param.set(0.5 + v / 2);
        if (v === 0) {
          active.current = false;
          param.end();
        }
      }}
      {...skin}
    />
  );
}
