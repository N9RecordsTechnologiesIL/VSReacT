// The flagship-visual tier — Output-style macro pads, hardware knobs,
// crossfader strips, and value-reactive orbs. Everything is painted
// natively from Views, arcs, and shadows; the motion runs on the host
// scheduler.

import { useRef, useState } from "react";
import { View, Text } from "./primitives";
import { useParameter } from "./parameters";
import { useInterval } from "./hooks";

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

// ── MacroPad ───────────────────────────────────────────────────────────

export interface MacroPadProps {
  /** Normalized 0..1. */
  x: number;
  /** Normalized 0..1 — 1 is the top. */
  y: number;
  /** Diameter. Default 220. */
  size?: number;
  labelX?: string;
  labelY?: string;
  disabled?: boolean;
  /** Concentric ring count. Default 9. */
  rings?: number;
  /** Freeze the ring motion (reduced-motion, screenshots). */
  animate?: boolean;
  color?: string;
  trackColor?: string;
  onChange: (x: number, y: number) => void;
  onBegin?: () => void;
  onEnd?: () => void;
}

/** The centerpiece macro control: a circular 2D pad whose concentric
    rings breathe with the values — x spreads them, y drives their
    intensity. One drag, two parameters, instrument-grade presence. */
export function MacroPad({
  x,
  y,
  size = 220,
  labelX,
  labelY,
  disabled,
  rings = 9,
  animate = true,
  color = "#C6F135",
  trackColor = "#101210",
  onChange,
  onBegin,
  onEnd,
}: MacroPadProps) {
  const start = useRef({ x: 0, y: 0 });
  const [phase, setPhase] = useState(0);
  useInterval(() => setPhase((p) => (p + 1) % 1000), animate && !disabled ? 50 : null);

  const cx = clamp01(x);
  const cy = clamp01(y);
  const thumb = 12;
  const tx = cx * (size - thumb);
  const ty = (1 - cy) * (size - thumb);

  const ringViews = [];
  for (let i = 0; i < rings; i++) {
    const t = (i + 1) / rings;
    // x spreads the rings outward; the phase makes them breathe gently.
    const spread = 0.3 + 0.7 * Math.pow(t, 1.6 - cx * 1.2);
    const breathe = 1 + 0.02 * Math.sin(phase / 6 + i * 0.9);
    const ringSize = Math.min(size - 2, size * spread * breathe);
    // y drives intensity; outer rings fade.
    const opacity = clamp01((0.12 + 0.5 * cy) * (1.15 - t) * (0.8 + 0.2 * Math.sin(phase / 9 + i)));

    ringViews.push(
      <View
        key={i}
        className="absolute rounded-full border"
        style={{
          width: ringSize,
          height: ringSize,
          left: (size - ringSize) / 2,
          top: (size - ringSize) / 2,
          borderColor: color,
          opacity,
        }}
      />,
    );
  }

  return (
    <View
      className={`relative rounded-full overflow-hidden border ${disabled ? "opacity-40" : "cursor-pointer"}`}
      style={{ width: size, height: size, backgroundColor: trackColor, borderColor: "#00000066" }}
      onDragStart={
        disabled
          ? undefined
          : () => {
              start.current = { x: cx, y: cy };
              onBegin?.();
            }
      }
      onDrag={
        disabled
          ? undefined
          : (e) => onChange(clamp01(start.current.x + e.dx / size), clamp01(start.current.y - e.dy / size))
      }
      onDragEnd={disabled ? undefined : () => onEnd?.()}
      onDoubleClick={disabled ? undefined : () => onChange(0.5, 0.5)}
    >
      {ringViews}
      <View
        className="absolute rounded-full"
        style={{
          width: thumb,
          height: thumb,
          left: tx,
          top: ty,
          backgroundColor: color,
          shadowColor: color,
          shadowRadius: 10,
        }}
      />
      {labelY !== undefined ? (
        <Text
          className="absolute text-[9] font-bold tracking-widest"
          style={{ left: 10, top: size / 2 - 6, color, opacity: 0.75 }}
        >
          {labelY}
        </Text>
      ) : null}
      {labelX !== undefined ? (
        <Text
          className="absolute text-[9] font-bold tracking-widest"
          style={{ bottom: 10, left: size / 2 - 24, color, opacity: 0.75 }}
        >
          {labelX}
        </Text>
      ) : null}
    </View>
  );
}

export interface ParamMacroPadProps {
  paramX: string;
  paramY: string;
  size?: number;
  labelX?: string;
  labelY?: string;
  rings?: number;
  animate?: boolean;
  color?: string;
  trackColor?: string;
}

/** A MacroPad driving two host parameters — labels default to their
    names. */
export function ParamMacroPad({ paramX, paramY, labelX, labelY, ...rest }: ParamMacroPadProps) {
  const px = useParameter(paramX);
  const py = useParameter(paramY);

  return (
    <MacroPad
      x={px.value}
      y={py.value}
      labelX={labelX ?? px.name.toUpperCase()}
      labelY={labelY ?? py.name.toUpperCase()}
      onChange={(nx, ny) => {
        px.set(nx);
        py.set(ny);
      }}
      onBegin={() => {
        px.begin();
        py.begin();
      }}
      onEnd={() => {
        px.end();
        py.end();
      }}
      {...rest}
    />
  );
}

// ── HardwareKnob ───────────────────────────────────────────────────────

const HW_START = -135;
const HW_END = 135;

export interface HardwareKnobProps {
  value: number;
  size?: number;
  label?: string;
  text?: string;
  disabled?: boolean;
  defaultValue?: number;
  wheelSensitivity?: number;
  capColor?: string;
  pointerColor?: string;
  tickColor?: string;
  onChange: (value: number) => void;
  onBegin?: () => void;
  onEnd?: () => void;
}

/** The skeuomorphic knob: a dark hardware cap with a glowing pointer
    notch at the rim and a faint tick track — the audio-ui.com look,
    painted natively. */
export function HardwareKnob({
  value,
  size = 88,
  label,
  text,
  disabled,
  defaultValue,
  wheelSensitivity = 0.4,
  capColor = "#1B1B1A",
  pointerColor = "#C6F135",
  tickColor = "#FFFFFF14",
  onChange,
  onBegin,
  onEnd,
}: HardwareKnobProps) {
  const startValue = useRef(0);
  const clamped = clamp01(value);
  const angle = HW_START + (HW_END - HW_START) * clamped;

  const nudge = (target: number) => {
    onBegin?.();
    onChange(clamp01(target));
    onEnd?.();
  };

  return (
    <View className="items-center gap-2">
      <View
        className={`relative ${disabled ? "opacity-40" : "cursor-pointer"}`}
        style={{
          width: size,
          height: size,
          arcTrackColor: tickColor,
          arcStart: HW_START,
          arcEnd: HW_END,
          arcThickness: 2,
        }}
        onDragStart={
          disabled
            ? undefined
            : () => {
                startValue.current = clamped;
                onBegin?.();
              }
        }
        onDrag={
          disabled
            ? undefined
            : (e) => onChange(clamp01(startValue.current - e.dy * 0.005))
        }
        onDragEnd={disabled ? undefined : () => onEnd?.()}
        onDoubleClick={
          disabled || defaultValue === undefined ? undefined : () => nudge(defaultValue)
        }
        onWheel={
          disabled || wheelSensitivity === 0
            ? undefined
            : (e) => nudge(clamped + e.dy * wheelSensitivity)
        }
      >
        <View
          className="absolute rounded-full border items-center justify-center shadow-lg"
          style={{
            left: size * 0.09,
            top: size * 0.09,
            width: size * 0.82,
            height: size * 0.82,
            backgroundColor: capColor,
            borderColor: "#000000AA",
          }}
        >
          {text !== undefined ? (
            <Text className="text-text font-bold" style={{ fontSize: Math.max(10, size * 0.14) }}>
              {text}
            </Text>
          ) : null}
        </View>
        {/* the pointer: a bright notch riding the rim at the value angle */}
        <View
          className="absolute inset-0"
          style={{
            arcColor: pointerColor,
            arcStart: HW_START,
            arcEnd: HW_END,
            arcValueStart: angle - 4,
            arcValueEnd: angle + 4,
            arcThickness: Math.max(4, size * 0.075),
          }}
        />
      </View>
      {label !== undefined ? (
        <Text className="text-faint text-[10] font-bold tracking-widest">{label}</Text>
      ) : null}
    </View>
  );
}

export interface ParamHardwareKnobProps {
  paramId: string;
  size?: number;
  label?: string;
  capColor?: string;
  pointerColor?: string;
  tickColor?: string;
  wheelSensitivity?: number;
}

/** A HardwareKnob bound to a host parameter. */
export function ParamHardwareKnob({ paramId, label, ...rest }: ParamHardwareKnobProps) {
  const param = useParameter(paramId);

  return (
    <HardwareKnob
      value={param.value}
      text={param.text}
      label={label ?? param.name.toUpperCase()}
      defaultValue={param.defaultValue}
      onChange={param.set}
      onBegin={param.begin}
      onEnd={param.end}
      {...rest}
    />
  );
}

// ── Crossfader ─────────────────────────────────────────────────────────

export interface CrossfaderProps {
  /** 0 = fully start-side (dry), 1 = fully end-side (wet). */
  value: number;
  width?: number;
  height?: number;
  labelStart?: string;
  labelEnd?: string;
  disabled?: boolean;
  trackColor?: string;
  handleColor?: string;
  textColor?: string;
  onChange: (value: number) => void;
  onBegin?: () => void;
  onEnd?: () => void;
}

/** The DRY/WET strip: a wide track with a grippy rectangular handle. */
export function Crossfader({
  value,
  width = 220,
  height = 34,
  labelStart = "DRY",
  labelEnd = "WET",
  disabled,
  trackColor = "#141614",
  handleColor = "#2E332C",
  textColor = "#6f6e66",
  onChange,
  onBegin,
  onEnd,
}: CrossfaderProps) {
  const startValue = useRef(0);
  const clamped = clamp01(value);
  const handleWidth = 26;
  const travel = width - handleWidth - 6;

  return (
    <View
      className={`relative rounded-lg border justify-center ${disabled ? "opacity-40" : "cursor-pointer"}`}
      style={{ width, height, backgroundColor: trackColor, borderColor: "#00000066" }}
      onDragStart={
        disabled
          ? undefined
          : () => {
              startValue.current = clamped;
              onBegin?.();
            }
      }
      onDrag={disabled ? undefined : (e) => onChange(clamp01(startValue.current + e.dx / travel))}
      onDragEnd={disabled ? undefined : () => onEnd?.()}
      onDoubleClick={disabled ? undefined : () => {
        onBegin?.();
        onChange(0.5);
        onEnd?.();
      }}
    >
      <Text
        className="absolute text-[8] font-bold tracking-widest"
        style={{ left: 7, top: height / 2 - 5, color: textColor }}
      >
        {labelStart}
      </Text>
      <Text
        className="absolute text-[8] font-bold tracking-widest"
        style={{ right: 7, top: height / 2 - 5, color: textColor }}
      >
        {labelEnd}
      </Text>
      <View
        className="absolute rounded-md border flex-row items-center justify-center gap-[3]"
        style={{
          left: 3 + clamped * travel,
          top: 3,
          bottom: 3,
          width: handleWidth,
          backgroundColor: handleColor,
          borderColor: "#00000088",
        }}
      >
        <View className="w-[2] h-[12] rounded-full" style={{ backgroundColor: "#00000066" }} />
        <View className="w-[2] h-[12] rounded-full" style={{ backgroundColor: "#00000066" }} />
      </View>
    </View>
  );
}

export interface ParamCrossfaderProps {
  paramId: string;
  width?: number;
  height?: number;
  labelStart?: string;
  labelEnd?: string;
  trackColor?: string;
  handleColor?: string;
}

/** A Crossfader bound to a host parameter — the classic mix control. */
export function ParamCrossfader({ paramId, ...rest }: ParamCrossfaderProps) {
  const param = useParameter(paramId);

  return (
    <Crossfader
      value={param.value}
      onChange={param.set}
      onBegin={param.begin}
      onEnd={param.end}
      {...rest}
    />
  );
}

// ── PulseOrb ───────────────────────────────────────────────────────────

export interface PulseOrbProps {
  /** Level 0..1 — drives ring intensity and core glow. */
  value: number;
  size?: number;
  color?: string;
  /** Echo ring count. Default 4. */
  rings?: number;
  /** Freeze the motion. */
  animate?: boolean;
}

/** A value-reactive orb: a glowing core emitting echo rings — visual
    feedback for levels, activity, or just presence. */
export function PulseOrb({
  value,
  size = 120,
  color = "#C6F135",
  rings = 4,
  animate = true,
}: PulseOrbProps) {
  const [phase, setPhase] = useState(0);
  useInterval(() => setPhase((p) => (p + 1) % 1000), animate ? 40 : null);

  const level = clamp01(value);
  const core = 14 + level * 12;

  const echoes = [];
  for (let i = 0; i < rings; i++) {
    const t = ((phase * (1 + level * 2) + (i * 100) / rings) % 100) / 100;
    const ringSize = core + t * (size - core - 4);
    const opacity = clamp01((1 - t) * (0.15 + 0.6 * level));

    echoes.push(
      <View
        key={i}
        className="absolute rounded-full border"
        style={{
          width: ringSize,
          height: ringSize,
          left: (size - ringSize) / 2,
          top: (size - ringSize) / 2,
          borderColor: color,
          opacity,
        }}
      />,
    );
  }

  return (
    <View className="relative" style={{ width: size, height: size }}>
      {echoes}
      <View
        className="absolute rounded-full"
        style={{
          width: core,
          height: core,
          left: (size - core) / 2,
          top: (size - core) / 2,
          backgroundColor: color,
          shadowColor: color,
          shadowRadius: 6 + level * 14,
          opacity: 0.55 + 0.45 * level,
        }}
      />
    </View>
  );
}
