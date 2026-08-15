// Field controls — the number box, checkbox, and radio group. Settings
// panels and fine-value entry, with the same DAW conventions as the
// knobs: drag, wheel, double-click reset, automation-safe Param twins.

import { useRef } from "react";
import { View, Text } from "./primitives";
import { accentColor as themeAccent } from "./theme";
import { useParameter } from "./parameters";

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

/** Snap onto the step grid without float dust. */
export function snapToStep(value: number, step: number, min: number): number {
  const steps = Math.round((value - min) / step);
  return Number((min + steps * step).toPrecision(12));
}

export interface NumberBoxProps {
  value: number;
  min?: number;
  max?: number;
  /** Value change per step; drags move ~a step per 4px. Default 1. */
  step?: number;
  /** Renders the value. Default: trimmed to 2 decimals. */
  format?: (value: number) => string;
  label?: string;
  width?: number;
  disabled?: boolean;
  /** Double-click resets to this. */
  defaultValue?: number;
  trackColor?: string;
  textColor?: string;
  onChange: (value: number) => void;
  onBegin?: () => void;
  onEnd?: () => void;
}

/** The draggable number — BPM, milliseconds, semitones. Drag vertically,
    wheel to step, double-click to reset. */
export function NumberBox({
  value,
  min = 0,
  max = 100,
  step = 1,
  format = (v) => String(Math.round(v * 100) / 100),
  label,
  width = 84,
  disabled,
  defaultValue,
  trackColor = "#2A2F27",
  textColor = "#ECF2E8",
  onChange,
  onBegin,
  onEnd,
}: NumberBoxProps) {
  const startValue = useRef(0);
  const clamped = clamp(value, min, max);

  const commit = (raw: number) => onChange(clamp(snapToStep(raw, step, min), min, max));

  const nudge = (raw: number) => {
    onBegin?.();
    commit(raw);
    onEnd?.();
  };

  return (
    <View className="items-center gap-2">
      <View
        className={`items-center rounded-lg border px-3 py-[7] ${disabled ? "opacity-40" : "cursor-pointer"}`}
        style={{ width, backgroundColor: trackColor, borderColor: "#00000055" }}
        onDragStart={
          disabled
            ? undefined
            : () => {
                startValue.current = clamped;
                onBegin?.();
              }
        }
        onDrag={disabled ? undefined : (e) => commit(startValue.current - (e.dy * step) / 4)}
        onDragEnd={disabled ? undefined : () => onEnd?.()}
        onDoubleClick={
          disabled || defaultValue === undefined ? undefined : () => nudge(defaultValue)
        }
        onWheel={
          disabled ? undefined : (e) => nudge(clamped + (e.dy > 0 ? step : -step))
        }
      >
        <Text className="text-[13] font-bold" style={{ color: textColor }}>
          {format(clamped)}
        </Text>
      </View>
      {label !== undefined ? (
        <Text className="text-faint text-[10] font-bold tracking-widest">{label}</Text>
      ) : null}
    </View>
  );
}

export interface ParamNumberBoxProps {
  paramId: string;
  label?: string;
  width?: number;
  /** Normalized step per wheel notch / drag unit. Default 0.01. */
  step?: number;
}

/** A NumberBox over a host parameter: shows the host's formatted text,
    drags the normalized value, double-click resets to the default. */
export function ParamNumberBox({ paramId, label, width, step = 0.01 }: ParamNumberBoxProps) {
  const param = useParameter(paramId);

  return (
    <NumberBox
      value={param.value}
      min={0}
      max={1}
      step={step}
      format={() => param.text}
      label={label ?? param.name.toUpperCase()}
      width={width}
      defaultValue={param.defaultValue}
      onChange={param.set}
      onBegin={param.begin}
      onEnd={param.end}
    />
  );
}

export interface CheckboxProps {
  checked: boolean;
  label?: string;
  disabled?: boolean;
  /** Box edge length. Default 16. */
  size?: number;
  accentColor?: string;
  boxColor?: string;
  textColor?: string;
  onChange: (checked: boolean) => void;
}

/** A checkbox row — settings panels, option lists. */
export function Checkbox({
  checked,
  label,
  disabled,
  size = 16,
  accentColor = themeAccent(),
  boxColor = "#2A2F27",
  textColor = "#d4d4d8",
  onChange,
}: CheckboxProps) {
  return (
    <View
      className={`flex-row items-center gap-2 ${disabled ? "opacity-40" : "cursor-pointer"}`}
      onClick={disabled ? undefined : () => onChange(!checked)}
    >
      <View
        className="items-center justify-center rounded-[4] border"
        style={{
          width: size,
          height: size,
          backgroundColor: checked ? accentColor : boxColor,
          borderColor: "#00000066",
        }}
      >
        {checked ? (
          <Text className="font-bold" style={{ fontSize: size * 0.7, color: "#09090b" }}>
            ✓
          </Text>
        ) : null}
      </View>
      {label !== undefined ? (
        <Text className="text-[12]" style={{ color: textColor }}>
          {label}
        </Text>
      ) : null}
    </View>
  );
}

export interface ParamCheckboxProps {
  paramId: string;
  label?: string;
  size?: number;
  accentColor?: string;
}

/** A Checkbox bound to a bool-style parameter (checked = value ≥ 0.5). */
export function ParamCheckbox({ paramId, label, ...rest }: ParamCheckboxProps) {
  const param = useParameter(paramId);

  return (
    <Checkbox
      checked={param.value >= 0.5}
      label={label ?? param.name}
      onChange={(next) => {
        param.begin();
        param.set(next ? 1 : 0);
        param.end();
      }}
      {...rest}
    />
  );
}

export interface RadioGroupProps {
  options: string[];
  index: number;
  disabled?: boolean;
  /** Row spacing. Default 8. */
  gap?: number;
  accentColor?: string;
  dotColor?: string;
  textColor?: string;
  activeTextColor?: string;
  onChange: (index: number) => void;
}

/** Vertical exclusive options with dots — the settings-panel sibling of
    <Segmented>. */
export function RadioGroup({
  options,
  index,
  disabled,
  gap = 8,
  accentColor = themeAccent(),
  dotColor = "#2A2F27",
  textColor = "#a1a1aa",
  activeTextColor = "#ECF2E8",
  onChange,
}: RadioGroupProps) {
  const current = Math.min(options.length - 1, Math.max(0, index));

  return (
    <View className={disabled ? "opacity-40" : ""} style={{ rowGap: gap }}>
      {options.map((option, i) => (
        <View
          key={`${option}-${i}`}
          className={`flex-row items-center gap-2 ${disabled ? "" : "cursor-pointer"}`}
          onClick={disabled ? undefined : () => onChange(i)}
        >
          <View
            className="items-center justify-center rounded-full border"
            style={{ width: 15, height: 15, backgroundColor: dotColor, borderColor: "#00000066" }}
          >
            {i === current ? (
              <View
                className="rounded-full"
                style={{ width: 7, height: 7, backgroundColor: accentColor }}
              />
            ) : null}
          </View>
          <Text className="text-[12]" style={{ color: i === current ? activeTextColor : textColor }}>
            {option}
          </Text>
        </View>
      ))}
    </View>
  );
}

export interface ParamRadioGroupProps {
  paramId: string;
  options: string[];
  gap?: number;
  accentColor?: string;
}

/** A RadioGroup bound to a choice-style parameter (value ↔ index, like
    ParamSegmented). */
export function ParamRadioGroup({ paramId, options, ...rest }: ParamRadioGroupProps) {
  const param = useParameter(paramId);
  const count = Math.max(1, options.length);
  const index = Math.round(param.value * (count - 1));

  return (
    <RadioGroup
      options={options}
      index={index}
      onChange={(i) => {
        param.begin();
        param.set(count <= 1 ? 0 : i / (count - 1));
        param.end();
      }}
      {...rest}
    />
  );
}
