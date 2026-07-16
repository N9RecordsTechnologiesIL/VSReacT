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
export { configureTheme, tw } from "./tw";
export type { Style, ResolvedClasses } from "./tw";
export { useTween, lerp, Easing } from "./animation";
export type { TweenOptions, EasingFn } from "./animation";
export { useParameter } from "./parameters";
export type { ParameterState, ParameterHandle } from "./parameters";
export { Knob, Slider, ParamKnob, ParamSlider, dragToValue } from "./controls";
export type { KnobProps, SliderProps, ParamKnobProps, ParamSliderProps } from "./controls";
export type { DragEventPayload } from "./primitives";
