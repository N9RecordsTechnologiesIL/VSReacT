// The built-in VST controls — knobs, sliders, toggles, XY pads, segmented
// switches — drawn by the VSReacT painter and driven by drag gestures.
// Each has a Param* variant bound to an APVTS parameter.

import { useRef } from "react";
import { View, Text } from "./primitives";
import { useParameter } from "./parameters";
import { useSpring } from "./animation";

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

/** Vertical-drag-to-value mapping shared by Knob (and tested in isolation). */
export function dragToValue(startValue: number, dy: number, sensitivity = 0.005): number {
  return clamp01(startValue - dy * sensitivity);
}

const ARC_START = -135;
const ARC_END = 135;

export interface KnobProps {
  value: number; // normalized 0..1
  text?: string;
  label?: string;
  size?: number;
  disabled?: boolean;
  trackColor?: string;
  valueColor?: string;
  onChange: (value: number) => void;
  onBegin?: () => void;
  onEnd?: () => void;
}

export function Knob({
  value,
  text,
  label,
  size = 64,
  disabled,
  trackColor = "#2A2F27",
  valueColor = "#C6F135",
  onChange,
  onBegin,
  onEnd,
}: KnobProps) {
  const startValue = useRef(0);

  return (
    <View className="items-center gap-2">
      <View
        className={`items-center justify-center ${disabled ? "opacity-40" : "cursor-pointer"}`}
        style={{
          width: size,
          height: size,
          arcTrackColor: trackColor,
          arcColor: valueColor,
          arcStart: ARC_START,
          arcEnd: ARC_END,
          arcValueEnd: ARC_START + (ARC_END - ARC_START) * Math.min(1, Math.max(0, value)),
          arcThickness: Math.max(3, size * 0.08),
        }}
        onDragStart={
          disabled
            ? undefined
            : () => {
                startValue.current = value;
                onBegin?.();
              }
        }
        onDrag={disabled ? undefined : (e) => onChange(dragToValue(startValue.current, e.dy))}
        onDragEnd={disabled ? undefined : () => onEnd?.()}
      >
        {text !== undefined ? (
          <Text
            className="text-text font-bold text-center"
            style={{ fontSize: Math.max(10, size * 0.16) }}
          >
            {text}
          </Text>
        ) : null}
      </View>
      {label !== undefined ? (
        <Text className="text-faint text-[10] font-bold tracking-widest">{label}</Text>
      ) : null}
    </View>
  );
}

export interface ParamKnobProps {
  paramId: string;
  label?: string;
  size?: number;
  trackColor?: string;
  valueColor?: string;
}

/** A Knob bound to an APVTS parameter (via ParameterBridge). */
export function ParamKnob({ paramId, label, size, trackColor, valueColor }: ParamKnobProps) {
  const param = useParameter(paramId);

  return (
    <Knob
      value={param.value}
      text={param.text}
      label={label ?? param.name.toUpperCase()}
      size={size}
      trackColor={trackColor}
      valueColor={valueColor}
      onChange={param.set}
      onBegin={param.begin}
      onEnd={param.end}
    />
  );
}

export interface SliderProps {
  value: number; // normalized 0..1
  /** Track length when horizontal (default 160). */
  width?: number;
  /** Track length when vertical (default 160). */
  height?: number;
  /** Vertical fader — drag up for more, fill rises from the bottom. */
  vertical?: boolean;
  label?: string;
  disabled?: boolean;
  trackColor?: string;
  valueColor?: string;
  onChange: (value: number) => void;
  onBegin?: () => void;
  onEnd?: () => void;
}

export function Slider({
  value,
  width = 160,
  height = 160,
  vertical,
  label,
  disabled,
  trackColor = "#2A2F27",
  valueColor = "#C6F135",
  onChange,
  onBegin,
  onEnd,
}: SliderProps) {
  const startValue = useRef(0);
  const clamped = clamp01(value);

  const onDragStart = disabled
    ? undefined
    : () => {
        startValue.current = clamped;
        onBegin?.();
      };
  const onDragEnd = disabled ? undefined : () => onEnd?.();

  if (vertical) {
    return (
      <View className="items-center gap-2">
        <View
          className={`w-[18] relative ${disabled ? "opacity-40" : "cursor-pointer"}`}
          style={{ height }}
          onDragStart={onDragStart}
          onDrag={disabled ? undefined : (e) => onChange(clamp01(startValue.current - e.dy / height))}
          onDragEnd={onDragEnd}
        >
          <View
            className="absolute w-[4] rounded-full left-[7] top-0 bottom-0"
            style={{ backgroundColor: trackColor }}
          />
          <View
            className="absolute w-[4] rounded-full left-[7] bottom-0"
            style={{ height: clamped * height, backgroundColor: valueColor }}
          />
          <View
            className="absolute w-[12] h-[12] rounded-full left-[3]"
            style={{ top: (1 - clamped) * (height - 12), backgroundColor: valueColor }}
          />
        </View>
        {label !== undefined ? (
          <Text className="text-faint text-[10] font-bold tracking-widest">{label}</Text>
        ) : null}
      </View>
    );
  }

  return (
    <View className="gap-2">
      <View
        className={`h-[18] justify-center relative ${disabled ? "opacity-40" : "cursor-pointer"}`}
        style={{ width }}
        onDragStart={onDragStart}
        onDrag={disabled ? undefined : (e) => onChange(clamp01(startValue.current + e.dx / width))}
        onDragEnd={onDragEnd}
      >
        <View className="h-[4] rounded-full" style={{ backgroundColor: trackColor }} />
        <View
          className="absolute h-[4] rounded-full top-[7]"
          style={{ width: clamped * width, backgroundColor: valueColor }}
        />
        <View
          className="absolute w-[12] h-[12] rounded-full top-[3]"
          style={{ left: clamped * (width - 12), backgroundColor: valueColor }}
        />
      </View>
      {label !== undefined ? (
        <Text className="text-faint text-[10] font-bold tracking-widest">{label}</Text>
      ) : null}
    </View>
  );
}

export interface ParamSliderProps {
  paramId: string;
  label?: string;
  width?: number;
  height?: number;
  vertical?: boolean;
}

/** A Slider bound to an APVTS parameter (via ParameterBridge). */
export function ParamSlider({ paramId, label, width, height, vertical }: ParamSliderProps) {
  const param = useParameter(paramId);

  return (
    <Slider
      value={param.value}
      label={label ?? param.name.toUpperCase()}
      width={width}
      height={height}
      vertical={vertical}
      onChange={param.set}
      onBegin={param.begin}
      onEnd={param.end}
    />
  );
}

// ── Toggle ─────────────────────────────────────────────────────────────

export interface ToggleProps {
  on: boolean;
  label?: string;
  /** Track height; width is 1.8×. Default 22. */
  size?: number;
  disabled?: boolean;
  trackColor?: string;
  onColor?: string;
  thumbColor?: string;
  onChange: (on: boolean) => void;
}

/** A switch with a spring-animated thumb — bypass, on/off, A/B. */
export function Toggle({
  on,
  label,
  size = 22,
  disabled,
  trackColor = "#2A2F27",
  onColor = "#C6F135",
  thumbColor = "#F4F4F5",
  onChange,
}: ToggleProps) {
  const t = useSpring(on ? 1 : 0, { stiffness: 300, damping: 28 });
  const trackWidth = Math.round(size * 1.8);
  const thumb = size - 6;
  const travel = trackWidth - thumb - 6;

  return (
    <View className="items-center gap-2">
      <View
        className={`relative rounded-full ${disabled ? "opacity-40" : "cursor-pointer"}`}
        style={{ width: trackWidth, height: size, backgroundColor: on ? onColor : trackColor }}
        onClick={disabled ? undefined : () => onChange(!on)}
      >
        <View
          className="absolute rounded-full"
          style={{
            width: thumb,
            height: thumb,
            top: 3,
            left: 3 + clamp01(t) * travel,
            backgroundColor: thumbColor,
          }}
        />
      </View>
      {label !== undefined ? (
        <Text className="text-faint text-[10] font-bold tracking-widest">{label}</Text>
      ) : null}
    </View>
  );
}

export interface ParamToggleProps {
  paramId: string;
  label?: string;
  size?: number;
  trackColor?: string;
  onColor?: string;
  thumbColor?: string;
}

/** A Toggle bound to a bool-style APVTS parameter (on = value ≥ 0.5). */
export function ParamToggle({ paramId, label, ...rest }: ParamToggleProps) {
  const param = useParameter(paramId);

  return (
    <Toggle
      on={param.value >= 0.5}
      label={label ?? param.name.toUpperCase()}
      onChange={(next) => {
        param.begin();
        param.set(next ? 1 : 0);
        param.end();
      }}
      {...rest}
    />
  );
}

// ── XYPad ──────────────────────────────────────────────────────────────

export interface XYPadProps {
  /** Normalized 0..1. */
  x: number;
  /** Normalized 0..1 — 1 is the TOP of the pad (drag up for more). */
  y: number;
  width?: number;
  height?: number;
  label?: string;
  disabled?: boolean;
  trackColor?: string;
  valueColor?: string;
  onChange: (x: number, y: number) => void;
  onBegin?: () => void;
  onEnd?: () => void;
}

/** A 2D drag pad with crosshair — filter cutoff/resonance, pan/depth… */
export function XYPad({
  x,
  y,
  width = 160,
  height = 160,
  label,
  disabled,
  trackColor = "#161B17",
  valueColor = "#C6F135",
  onChange,
  onBegin,
  onEnd,
}: XYPadProps) {
  const start = useRef({ x: 0, y: 0 });
  const cxv = clamp01(x);
  const cyv = clamp01(y);
  const thumb = 14;
  const tx = cxv * (width - thumb);
  const ty = (1 - cyv) * (height - thumb);

  return (
    <View className="items-center gap-2">
      <View
        className={`relative rounded-lg overflow-hidden border ${disabled ? "opacity-40" : "cursor-pointer"}`}
        style={{ width, height, backgroundColor: trackColor, borderColor: "#00000055" }}
        onDragStart={
          disabled
            ? undefined
            : () => {
                start.current = { x: cxv, y: cyv };
                onBegin?.();
              }
        }
        onDrag={
          disabled
            ? undefined
            : (e) =>
                onChange(
                  clamp01(start.current.x + e.dx / width),
                  clamp01(start.current.y - e.dy / height),
                )
        }
        onDragEnd={disabled ? undefined : () => onEnd?.()}
      >
        <View
          className="absolute left-0 right-0 h-[1]"
          style={{ top: ty + thumb / 2, backgroundColor: valueColor, opacity: 0.35 }}
        />
        <View
          className="absolute top-0 bottom-0 w-[1]"
          style={{ left: tx + thumb / 2, backgroundColor: valueColor, opacity: 0.35 }}
        />
        <View
          className="absolute rounded-full"
          style={{ width: thumb, height: thumb, left: tx, top: ty, backgroundColor: valueColor }}
        />
      </View>
      {label !== undefined ? (
        <Text className="text-faint text-[10] font-bold tracking-widest">{label}</Text>
      ) : null}
    </View>
  );
}

export interface ParamXYPadProps {
  paramX: string;
  paramY: string;
  width?: number;
  height?: number;
  label?: string;
  trackColor?: string;
  valueColor?: string;
}

/** An XYPad driving two APVTS parameters at once. */
export function ParamXYPad({ paramX, paramY, label, ...rest }: ParamXYPadProps) {
  const px = useParameter(paramX);
  const py = useParameter(paramY);

  return (
    <XYPad
      x={px.value}
      y={py.value}
      label={label ?? `${px.name} / ${py.name}`.toUpperCase()}
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

// ── Segmented ──────────────────────────────────────────────────────────

export interface SegmentedProps {
  options: string[];
  index: number;
  label?: string;
  disabled?: boolean;
  trackColor?: string;
  activeColor?: string;
  textColor?: string;
  activeTextColor?: string;
  onChange: (index: number) => void;
}

/** A row of exclusive options — oscillator shapes, filter modes, A/B/C. */
export function Segmented({
  options,
  index,
  label,
  disabled,
  trackColor = "#2A2F27",
  activeColor = "#C6F135",
  textColor = "#a1a1aa",
  activeTextColor = "#09090b",
  onChange,
}: SegmentedProps) {
  const current = Math.min(options.length - 1, Math.max(0, index));

  return (
    <View className="items-center gap-2">
      <View
        className={`flex-row rounded-lg p-[3] gap-[3] ${disabled ? "opacity-40" : ""}`}
        style={{ backgroundColor: trackColor }}
      >
        {options.map((option, i) => (
          <View
            key={`${option}-${i}`}
            className={`px-3 py-[6] rounded-md ${disabled ? "" : "cursor-pointer"}`}
            style={{ backgroundColor: i === current ? activeColor : "#00000000" }}
            onClick={disabled ? undefined : () => onChange(i)}
          >
            <Text
              className="text-[11] font-bold tracking-wide"
              style={{ color: i === current ? activeTextColor : textColor }}
            >
              {option}
            </Text>
          </View>
        ))}
      </View>
      {label !== undefined ? (
        <Text className="text-faint text-[10] font-bold tracking-widest">{label}</Text>
      ) : null}
    </View>
  );
}

export interface ParamSegmentedProps {
  paramId: string;
  options: string[];
  label?: string;
  trackColor?: string;
  activeColor?: string;
  textColor?: string;
  activeTextColor?: string;
}

/** A Segmented bound to a choice-style APVTS parameter: the normalized
    value maps to an option index (index / (count − 1)). */
export function ParamSegmented({ paramId, options, label, ...rest }: ParamSegmentedProps) {
  const param = useParameter(paramId);
  const count = Math.max(1, options.length);
  const index = Math.round(param.value * (count - 1));

  return (
    <Segmented
      options={options}
      index={index}
      label={label ?? param.name.toUpperCase()}
      onChange={(i) => {
        param.begin();
        param.set(count <= 1 ? 0 : i / (count - 1));
        param.end();
      }}
      {...rest}
    />
  );
}
