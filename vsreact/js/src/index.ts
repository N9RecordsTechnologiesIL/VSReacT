// @vsreact/core public API. runtime must load first — it installs the
// timer/console/microtask shims react depends on inside QuickJS.
import "./runtime";
import "./bridge";

/** The SDK version — stamp it on support dumps and analytics. */
export const VERSION = "0.0.26";

export { View, Text, Image, TextInput, NativeView, Svg, SvgPath } from "./primitives";
export type {
  CommonProps,
  TextProps,
  ImageProps,
  TextInputProps,
  NativeViewProps,
  SvgProps,
  SvgPathProps,
} from "./primitives";
export { render, unmount } from "./render";
export { native } from "./native";
export {
  useNativeEvent,
  useNativeValue,
  useRootSize,
  useDebounced,
  useThrottled,
  usePrevious,
  useToggle,
  useInterval,
  useHover,
  useLayoutRect,
} from "./hooks";
export type { RootSize } from "./hooks";
export { useOverlay, OverlayLayer } from "./overlay";
export { Tooltip, Modal } from "./popover";
export type { TooltipProps, ModalProps } from "./popover";
export { Button } from "./button";
export type { ButtonProps } from "./button";
export { Bars, Waveform, useRollingBuffer, pushRolling } from "./visualizers";
export type { BarsProps, WaveformProps } from "./visualizers";
export { configureTheme, tw } from "./tw";
export type { Style, ResolvedClasses } from "./tw";
export { registerFont, type FontSpec } from "./fonts";
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
  sliderKeyTarget,
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
export { Meter, RingMeter, usePeakHold, peakHoldStep } from "./meter";
export type { MeterProps, RingMeterProps, PeakHoldOptions, PeakHoldState } from "./meter";
export { EQCurve, biquadMagnitudeDb, eqResponseDb, eqXToHz, eqHzToX } from "./eq";
export type { EQCurveProps, EQBand, FilterType } from "./eq";
export {
  NumberBox,
  Checkbox,
  RadioGroup,
  ParamNumberBox,
  ParamCheckbox,
  ParamRadioGroup,
  snapToStep,
} from "./fields";
export type {
  NumberBoxProps,
  CheckboxProps,
  RadioGroupProps,
  ParamNumberBoxProps,
  ParamCheckboxProps,
  ParamRadioGroupProps,
} from "./fields";
export { ProgressBar, Spinner } from "./feedback";
export type { ProgressBarProps, SpinnerProps } from "./feedback";
export { PianoKeyboard } from "./keyboard";
export type { PianoKeyboardProps } from "./keyboard";
export { StepSequencer } from "./sequencer";
export type { StepSequencerProps } from "./sequencer";
export { Tabs, Disclosure } from "./layout";
export type { TabsProps, DisclosureProps } from "./layout";
export {
  ADSREnvelope,
  ParamADSREnvelope,
  PitchBend,
  ModWheel,
  ParamModWheel,
  ParamPitchBend,
  adsrLevelAt,
} from "./synth";
export type {
  ADSRKey,
  ADSREnvelopeProps,
  ParamADSREnvelopeProps,
  PitchBendProps,
  ModWheelProps,
  ParamModWheelProps,
  ParamPitchBendProps,
} from "./synth";
export {
  mapRange,
  formatDb,
  formatHz,
  formatMs,
  formatPercent,
  formatSemitones,
  midiNoteName,
  midiNoteToHz,
  hzToMidiNote,
} from "./format";
export {
  MacroPad,
  ParamMacroPad,
  HardwareKnob,
  ParamHardwareKnob,
  Crossfader,
  ParamCrossfader,
  PulseOrb,
} from "./specialty";
export type {
  MacroPadProps,
  ParamMacroPadProps,
  HardwareKnobProps,
  ParamHardwareKnobProps,
  CrossfaderProps,
  ParamCrossfaderProps,
  PulseOrbProps,
} from "./specialty";
export type { DragEventPayload, LayoutRect, WheelEventPayload, KeyEventPayload, MouseMovePayload } from "./primitives";
