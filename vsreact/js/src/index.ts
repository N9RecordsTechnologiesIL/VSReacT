// @vsreact/core public API. runtime must load first — it installs the
// timer/console/microtask shims react depends on inside QuickJS.
import "./runtime";
import "./bridge";

export { View, Text, Image, TextInput, NativeView } from "./primitives";
export type {
  CommonProps,
  TextProps,
  ImageProps,
  TextInputProps,
  NativeViewProps,
} from "./primitives";
export { render, unmount } from "./render";
export { native } from "./native";
export { useNativeEvent } from "./hooks";
export { configureTheme, tw } from "./tw";
export type { Style, ResolvedClasses } from "./tw";
export { cx } from "./cx";
export type { ClassValue } from "./cx";
export { useTween, useSpring, springStep, lerp, Easing } from "./animation";
export type { TweenOptions, SpringOptions, EasingFn } from "./animation";
export { useParameter } from "./parameters";
export type { ParameterState, ParameterHandle } from "./parameters";
export {
  Knob,
  Slider,
  Toggle,
  XYPad,
  Segmented,
  ParamKnob,
  ParamSlider,
  ParamToggle,
  ParamXYPad,
  ParamSegmented,
  dragToValue,
} from "./controls";
export type {
  KnobProps,
  SliderProps,
  ToggleProps,
  XYPadProps,
  SegmentedProps,
  ParamKnobProps,
  ParamSliderProps,
  ParamToggleProps,
  ParamXYPadProps,
  ParamSegmentedProps,
} from "./controls";
export type { DragEventPayload } from "./primitives";
