// The built-in VST controls — knobs, sliders, toggles, XY pads, segmented
// switches — drawn by the VSReacT painter and driven by drag gestures.
// Each has a Param* variant bound to an APVTS parameter.

import { useEffect, useRef, useState } from "react";
import { View, Text } from "./primitives";
import { useParameter, useParameterList } from "./parameters";
import { useSpring } from "./animation";
import { useLayoutRect } from "./hooks";
import { useOverlay } from "./overlay";

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
  /** Double-click resets to this (DAW convention). */
  defaultValue?: number;
  /** Value arc sweeps from 12 o'clock instead of the left stop — for
      centre-based parameters like pan. */
  bipolar?: boolean;
  /** Value change per wheel notch fraction. 0 disables. Default 0.4. */
  wheelSensitivity?: number;
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
  defaultValue,
  bipolar,
  wheelSensitivity = 0.4,
  trackColor = "#2A2F27",
  valueColor = "#C6F135",
  onChange,
  onBegin,
  onEnd,
}: KnobProps) {
  const startValue = useRef(0);
  const clamped = clamp01(value);
  const angle = ARC_START + (ARC_END - ARC_START) * clamped;
  const center = (ARC_START + ARC_END) / 2;

  const nudge = (target: number) => {
    onBegin?.();
    onChange(clamp01(target));
    onEnd?.();
  };

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
          arcValueStart: bipolar ? Math.min(center, angle) : ARC_START,
          arcValueEnd: bipolar ? Math.max(center, angle) : angle,
          arcThickness: Math.max(3, size * 0.08),
        }}
        onDragStart={
          disabled
            ? undefined
            : () => {
                startValue.current = clamped;
                onBegin?.();
              }
        }
        onDrag={disabled ? undefined : (e) => onChange(dragToValue(startValue.current, e.dy))}
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
  bipolar?: boolean;
  wheelSensitivity?: number;
  trackColor?: string;
  valueColor?: string;
}

/** A Knob bound to an APVTS parameter — double-click resets to the
    host's default, the wheel nudges, gestures stay automation-safe. */
export function ParamKnob({ paramId, label, ...rest }: ParamKnobProps) {
  const param = useParameter(paramId);

  return (
    <Knob
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
  /** Double-click resets to this (DAW convention). */
  defaultValue?: number;
  /** Value change per wheel notch fraction. 0 disables. Default 0.4. */
  wheelSensitivity?: number;
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
  defaultValue,
  wheelSensitivity = 0.4,
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

  const nudge = (target: number) => {
    onBegin?.();
    onChange(clamp01(target));
    onEnd?.();
  };
  const onDoubleClick =
    disabled || defaultValue === undefined ? undefined : () => nudge(defaultValue);
  const onWheel =
    disabled || wheelSensitivity === 0
      ? undefined
      : (e: { dy: number }) => nudge(clamped + e.dy * wheelSensitivity);

  if (vertical) {
    return (
      <View className="items-center gap-2">
        <View
          className={`w-[18] relative ${disabled ? "opacity-40" : "cursor-pointer"}`}
          style={{ height }}
          onDragStart={onDragStart}
          onDrag={disabled ? undefined : (e) => onChange(clamp01(startValue.current - e.dy / height))}
          onDragEnd={onDragEnd}
          onDoubleClick={onDoubleClick}
          onWheel={onWheel}
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
        onDoubleClick={onDoubleClick}
        onWheel={onWheel}
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
  wheelSensitivity?: number;
}

/** A Slider bound to an APVTS parameter — double-click resets to the
    host's default, the wheel nudges, gestures stay automation-safe. */
export function ParamSlider({ paramId, label, ...rest }: ParamSliderProps) {
  const param = useParameter(paramId);

  return (
    <Slider
      value={param.value}
      label={label ?? param.name.toUpperCase()}
      defaultValue={param.defaultValue}
      onChange={param.set}
      onBegin={param.begin}
      onEnd={param.end}
      {...rest}
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

// ── GenericEditor ──────────────────────────────────────────────────────

export interface GenericEditorProps {
  /** Knobs per row. Default 4. */
  columns?: number;
  /** Knob diameter. Default 72. */
  size?: number;
  trackColor?: string;
  valueColor?: string;
}

/** One GenericEditor cell: knob + live value label + name. */
function GenericEditorKnob({
  paramId,
  size,
  trackColor,
  valueColor,
}: {
  paramId: string;
  size?: number;
  trackColor?: string;
  valueColor?: string;
}) {
  const param = useParameter(paramId);

  return (
    <View className="items-center gap-1">
      <Knob
        value={param.value}
        size={size}
        defaultValue={param.defaultValue}
        trackColor={trackColor}
        valueColor={valueColor}
        onChange={param.set}
        onBegin={param.begin}
        onEnd={param.end}
      />
      <Text className="text-text text-[11] font-bold">{param.text}</Text>
      <Text className="text-faint text-[9] font-bold tracking-widest">
        {param.name.toUpperCase()}
      </Text>
    </View>
  );
}

/** The zero-effort editor: one knob per APVTS parameter with a live
    value label and name under each, laid out in rows.
    `render(<GenericEditor />)` is a complete, working plugin UI. */
export function GenericEditor({ columns = 4, size = 72, trackColor, valueColor }: GenericEditorProps) {
  const params = useParameterList();

  const rows: (typeof params)[] = [];
  for (let i = 0; i < params.length; i += Math.max(1, columns))
    rows.push(params.slice(i, i + Math.max(1, columns)));

  return (
    <View className="flex-1 flex-col items-center justify-center gap-6 p-4">
      {rows.map((row, index) => (
        <View key={index} className="flex-row gap-7">
          {row.map((param) => (
            <GenericEditorKnob
              key={param.id}
              paramId={param.id}
              size={size}
              trackColor={trackColor}
              valueColor={valueColor}
            />
          ))}
        </View>
      ))}
    </View>
  );
}

// ── Select ─────────────────────────────────────────────────────────────

export interface SelectProps {
  options: string[];
  index: number;
  /** Trigger width; the menu matches it. Default 160. */
  width?: number;
  label?: string;
  disabled?: boolean;
  trackColor?: string;
  menuColor?: string;
  activeColor?: string;
  textColor?: string;
  activeTextColor?: string;
  /** Menu scrolls beyond this height. Default 190. */
  maxMenuHeight?: number;
  onChange: (index: number) => void;
}

const SELECT_ROW_HEIGHT = 30;

/** A dropdown: the menu renders in the overlay layer, positioned under
    the trigger via onLayout, with a click-away backdrop and a scrolling
    option list. */
export function Select({
  options,
  index,
  width = 160,
  label,
  disabled,
  trackColor = "#2A2F27",
  menuColor = "#20241F",
  activeColor = "#C6F135",
  textColor = "#d4d4d8",
  activeTextColor = "#09090b",
  maxMenuHeight = 190,
  onChange,
}: SelectProps) {
  const [open, setOpen] = useState(false);
  const [rect, onLayout] = useLayoutRect();
  const overlay = useOverlay();
  const current = Math.min(options.length - 1, Math.max(0, index));

  useEffect(() => {
    if (!open || rect === null) {
      overlay.hide();
      return;
    }

    const menuHeight = Math.min(options.length * SELECT_ROW_HEIGHT + 8, maxMenuHeight);

    overlay.show(
      <View className="absolute inset-0" onClick={() => setOpen(false)}>
        <View
          className="absolute rounded-lg border shadow-lg overflow-hidden"
          style={{
            left: rect.x,
            top: rect.y + rect.height + 4,
            width: rect.width,
            backgroundColor: menuColor,
            borderColor: "#00000066",
          }}
        >
          <View className="overflow-y-scroll p-[4] gap-[2]" style={{ height: menuHeight }}>
            {options.map((option, i) => (
              <View
                key={`${option}-${i}`}
                className="px-3 py-[6] rounded cursor-pointer hover:bg-white/10"
                style={{ backgroundColor: i === current ? activeColor : "#00000000" }}
                onClick={() => {
                  onChange(i);
                  setOpen(false);
                }}
              >
                <Text
                  className="text-[12] font-medium"
                  style={{ color: i === current ? activeTextColor : textColor }}
                >
                  {option}
                </Text>
              </View>
            ))}
          </View>
        </View>
      </View>,
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, rect, options, current, menuColor, activeColor, textColor, activeTextColor, maxMenuHeight]);

  return (
    <View className="items-center gap-2">
      <View
        className={`flex-row items-center justify-between rounded-lg border px-3 py-[8] ${
          disabled ? "opacity-40" : "cursor-pointer"
        }`}
        style={{ width, backgroundColor: trackColor, borderColor: "#00000055" }}
        onLayout={onLayout}
        onClick={disabled ? undefined : () => setOpen((v) => !v)}
      >
        <Text className="text-[12] font-medium" style={{ color: textColor }}>
          {options[current] ?? ""}
        </Text>
        <Text className="text-[9]" style={{ color: textColor, opacity: 0.7 }}>
          {open ? "▲" : "▼"}
        </Text>
      </View>
      {label !== undefined ? (
        <Text className="text-faint text-[10] font-bold tracking-widest">{label}</Text>
      ) : null}
    </View>
  );
}

export interface ParamSelectProps {
  paramId: string;
  options: string[];
  width?: number;
  label?: string;
  trackColor?: string;
  menuColor?: string;
  activeColor?: string;
  textColor?: string;
  activeTextColor?: string;
  maxMenuHeight?: number;
}

/** A Select bound to a choice-style APVTS parameter (same value↔index
    mapping as ParamSegmented). */
export function ParamSelect({ paramId, options, label, ...rest }: ParamSelectProps) {
  const param = useParameter(paramId);
  const count = Math.max(1, options.length);
  const index = Math.round(param.value * (count - 1));

  return (
    <Select
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
