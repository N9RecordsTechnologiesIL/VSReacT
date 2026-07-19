import { createElement, type ReactNode } from "react";
import type { Style } from "./tw";

export interface DragEventPayload {
  /** Delta from the drag start, in root coordinates. */
  dx: number;
  dy: number;
  /** Current pointer position in root coordinates. */
  x: number;
  y: number;
}

/** A node's laid-out rect in root coordinates (scroll-adjusted). */
export interface LayoutRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Mouse-wheel payload. Deltas are JUCE's notch fraction (~0.1 per notch,
    dy positive = wheel up; dx nonzero on trackpads/tilt wheels). */
export interface WheelEventPayload {
  dy: number;
  dx: number;
}

/** Web-style key event: key names match KeyboardEvent.key ("ArrowUp",
    "Enter", "Escape", " ", "a"). */
export interface KeyEventPayload {
  key: string;
  shift: boolean;
  ctrl: boolean;
  alt: boolean;
  meta: boolean;
}

/** Root-space pointer position. */
export interface MouseMovePayload {
  x: number;
  y: number;
}

export interface CommonProps {
  className?: string;
  style?: Style;
  children?: ReactNode;
  /** Resets the vertical scroll offset of an overflow-scroll container. */
  scrollTop?: number;
  /** Resets the horizontal scroll offset of an overflow-scroll container. */
  scrollLeft?: number;
  onClick?: () => void;
  onDoubleClick?: () => void;
  /** Wheel over this node (controls win the wheel over scroll containers). */
  onWheel?: (e: WheelEventPayload) => void;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
  onMouseDown?: () => void;
  onMouseUp?: () => void;
  onDragStart?: (e: DragEventPayload) => void;
  onDrag?: (e: DragEventPayload) => void;
  onDragEnd?: (e: DragEventPayload) => void;
  onMouseMove?: (e: MouseMovePayload) => void;
  /** Declaring onKeyDown (or onFocus/onBlur, or a focus: style variant)
      makes the node focusable: click focuses it, Tab cycles, keys arrive
      here with web KeyboardEvent.key names. */
  onKeyDown?: (e: KeyEventPayload) => void;
  /** Fires when a key seen by onKeyDown is released (node still focused). */
  onKeyUp?: (e: KeyEventPayload) => void;
  onFocus?: () => void;
  onBlur?: () => void;
  /** Fires after layout whenever this node's root-space rect changes —
      the foundation for popovers, menus, and tooltips. */
  onLayout?: (rect: LayoutRect) => void;
}

export function View(props: CommonProps) {
  return createElement("vs-view", props);
}

export interface TextProps extends Omit<CommonProps, "children"> {
  children?: ReactNode; // strings/numbers (and fragments of them)
  /** Opt this text into selection (drag to select, double-click for a word,
      Ctrl/Cmd+C copies). Text is NOT selectable by default. Equivalent to
      the `select-text` class / `userSelect: "text"` style key. */
  selectable?: boolean;
}

export function Text({ selectable, ...props }: TextProps) {
  if (selectable) props = { ...props, style: { userSelect: "text", ...props.style } };
  return createElement("vs-text", props);
}

export interface ImageProps extends CommonProps {
  src: string;
  /** Style keys also work: objectFit ("contain" default | "cover" | "fill")
      and tintColor (fills the image's alpha with a solid colour). */
}

export function Image(props: ImageProps) {
  return createElement("vs-image", props);
}

export interface SvgProps extends CommonProps {
  /** "minX minY width height" — path coordinates map from this box onto the
      node's layout frame (like the web's preserveAspectRatio="none"). */
  viewBox: string;
}

/** Vector container: lays out like a View, paints its <SvgPath> children
    scaled from viewBox space. Icon sets port directly — rename attributes
    and drop each path's `d` in. */
export function Svg(props: SvgProps) {
  return createElement("vs-svg", props);
}

export interface SvgPathProps {
  /** SVG path data ("M12 2 L22 22 …") — parsed once and cached. */
  d: string;
  /** Fill color; SVG's default black. "none" for stroke-only paths. */
  fill?: string;
  stroke?: string;
  /** Stroke width in viewBox units (scales with the frame, like SVG). */
  strokeWidth?: number;
  strokeCap?: "butt" | "round" | "square";
  strokeJoin?: "miter" | "round" | "bevel";
  /** Dash pattern in viewBox units, e.g. "4 2". */
  strokeDash?: string;
  fillRule?: "nonzero" | "evenodd";
}

export function SvgPath(props: SvgPathProps) {
  return createElement("vs-svgpath", props);
}

export interface TextInputProps extends Omit<CommonProps, "children" | "onChange" | "onSubmit"> {
  value?: string;
  defaultValue?: string;
  placeholder?: string;
  disabled?: boolean;
  onChange?: (value: string) => void;
  onSubmit?: (value: string) => void;
  onFocus?: () => void;
  onBlur?: () => void;
}

export function TextInput({ onChange, onSubmit, ...rest }: TextInputProps) {
  return createElement("vs-textinput", {
    ...rest,
    onChange: onChange ? (payload: any) => onChange(String(payload?.value ?? "")) : undefined,
    onSubmit: onSubmit ? (payload: any) => onSubmit(String(payload?.value ?? "")) : undefined,
  });
}

export interface NativeViewProps extends CommonProps {
  /** Id of a component factory registered in the C++ NativeRegistry. */
  nativeId: string;
}

export function NativeView(props: NativeViewProps) {
  return createElement("vs-native", props);
}
