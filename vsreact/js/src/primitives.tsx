import { createElement, type ReactNode } from "react";
import type { Style } from "./tw";

export interface CommonProps {
  className?: string;
  style?: Style;
  children?: ReactNode;
  onClick?: () => void;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
  onMouseDown?: () => void;
  onMouseUp?: () => void;
}

export function View(props: CommonProps) {
  return createElement("vs-view", props);
}

export interface TextProps extends Omit<CommonProps, "children"> {
  children?: ReactNode; // strings/numbers (and fragments of them)
}

export function Text(props: TextProps) {
  return createElement("vs-text", props);
}

export interface ImageProps extends CommonProps {
  src: string;
}

export function Image(props: ImageProps) {
  return createElement("vs-image", props);
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
