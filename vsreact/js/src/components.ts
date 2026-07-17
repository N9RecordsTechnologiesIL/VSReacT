// The component layer, importable on its own:
//
//   import { Knob, Select, Meter } from "@vsreact/core/components";
//
// Identical exports to the root — this subpath exists for readability
// and as the boundary line if the component kit ever becomes its own
// package.

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
export { Bars, Waveform, useRollingBuffer, pushRolling } from "./visualizers";
export type { BarsProps, WaveformProps } from "./visualizers";
export { Button } from "./button";
export type { ButtonProps } from "./button";
export { Tooltip, Modal } from "./popover";
export type { TooltipProps, ModalProps } from "./popover";
