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
export {
  useNativeEvent,
  useDebounced,
  useThrottled,
  usePrevious,
  useToggle,
  useInterval,
  useHover,
  useLayoutRect,
} from "./hooks";
export { useOverlay, OverlayLayer } from "./overlay";
export { Tooltip, Modal } from "./popover";
export type { TooltipProps, ModalProps } from "./popover";
export { Button } from "./button";
export type { ButtonProps } from "./button";
export { Bars, Waveform, useRollingBuffer, pushRolling } from "./visualizers";
export type { BarsProps, WaveformProps } from "./visualizers";
export { configureTheme, tw } from "./tw";
export type { Style, ResolvedClasses } from "./tw";
export { cx } from "./cx";
export type { ClassValue } from "./cx";
export { useTween, useSpring, springStep, lerp, Easing } from "./animation";
export type { TweenOptions, SpringOptions, EasingFn } from "./animation";
export { useParameter, useParameterList } from "./parameters";
export type { ParameterState, ParameterHandle, ParameterInfo } from "./parameters";
export {
  Knob,
  Slider,
  Toggle,
  XYPad,
  Segmented,
  Select,
  GenericEditor,
  ParamKnob,
  ParamSlider,
  ParamToggle,
  ParamXYPad,
  ParamSegmented,
  ParamSelect,
  dragToValue,
} from "./controls";
export type {
  KnobProps,
  SliderProps,
  ToggleProps,
  XYPadProps,
  SegmentedProps,
  SelectProps,
  GenericEditorProps,
  ParamKnobProps,
  ParamSliderProps,
  ParamToggleProps,
  ParamXYPadProps,
  ParamSegmentedProps,
  ParamSelectProps,
} from "./controls";
export { Meter, usePeakHold, peakHoldStep } from "./meter";
export type { MeterProps, PeakHoldOptions, PeakHoldState } from "./meter";
export type { DragEventPayload, LayoutRect, WheelEventPayload } from "./primitives";
