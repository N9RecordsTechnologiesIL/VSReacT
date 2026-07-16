// Knob and Slider — the classic VST controls, drawn by the VSReacT painter
// (arc styles) and driven by drag gestures.

import { useRef } from "react";
import { View, Text } from "./primitives";
import { useParameter } from "./parameters";

/** Vertical-drag-to-value mapping shared by Knob (and tested in isolation). */
export function dragToValue(startValue: number, dy: number, sensitivity = 0.005): number {
  return Math.min(1, Math.max(0, startValue - dy * sensitivity));
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
  width?: number;
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
  label,
  disabled,
  trackColor = "#2A2F27",
  valueColor = "#C6F135",
  onChange,
  onBegin,
  onEnd,
}: SliderProps) {
  const startValue = useRef(0);
  const clamped = Math.min(1, Math.max(0, value));

  return (
    <View className="gap-2">
      <View
        className={`h-[18] justify-center relative ${disabled ? "opacity-40" : "cursor-pointer"}`}
        style={{ width }}
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
            : (e) => onChange(Math.min(1, Math.max(0, startValue.current + e.dx / width)))
        }
        onDragEnd={disabled ? undefined : () => onEnd?.()}
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
}

/** A Slider bound to an APVTS parameter (via ParameterBridge). */
export function ParamSlider({ paramId, label, width }: ParamSliderProps) {
  const param = useParameter(paramId);

  return (
    <Slider
      value={param.value}
      label={label ?? param.name.toUpperCase()}
      width={width}
      onChange={param.set}
      onBegin={param.begin}
      onEnd={param.end}
    />
  );
}
