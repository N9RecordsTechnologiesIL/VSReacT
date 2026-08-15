// Workspace structure — tabs for multi-page plugin UIs and the
// disclosure row for collapsible settings sections.

import { useState, type ReactNode } from "react";
import { View, Text } from "./primitives";
import { accentColor as themeAccent } from "./theme";

const clampIndex = (i: number, count: number) => Math.min(Math.max(0, count - 1), Math.max(0, i));

export interface TabsProps {
  labels: string[];
  /** Controlled active tab; omit to let Tabs manage it. */
  index?: number;
  /** Starting tab when uncontrolled. Default 0. */
  defaultIndex?: number;
  onChange?: (index: number) => void;
  /** Fixed width; defaults to content width. */
  width?: number;
  /** Space between the bar and the panel. Default 12. */
  gap?: number;
  accentColor?: string;
  textColor?: string;
  activeTextColor?: string;
  trackColor?: string;
  /** One panel per label (a lone child works for label-driven UIs). */
  children?: ReactNode | ReactNode[];
}

/** The page switcher — MAIN / FX / SETTINGS. A themed tab bar with an
    underline indicator; renders the active panel below it. */
export function Tabs({
  labels,
  index,
  defaultIndex = 0,
  onChange,
  width,
  gap = 12,
  accentColor = themeAccent(),
  textColor = "#7c8087",
  activeTextColor = "#ECF2E8",
  trackColor = "#FFFFFF14",
  children,
}: TabsProps) {
  const [internal, setInternal] = useState(defaultIndex);
  const current = clampIndex(index ?? internal, labels.length);

  const select = (i: number) => {
    setInternal(i);
    onChange?.(i);
  };

  const panels: ReactNode[] = Array.isArray(children) ? children : children !== undefined ? [children] : [];

  return (
    <View style={width !== undefined ? { width } : undefined}>
      <View className="flex-row relative" style={{ columnGap: 4 }}>
        <View
          className="absolute left-0 right-0 h-[1]"
          style={{ bottom: 0, backgroundColor: trackColor }}
        />
        {labels.map((label, i) => (
          <View
            key={`${label}-${i}`}
            className="items-center cursor-pointer px-3 pt-1"
            onClick={() => select(i)}
          >
            <Text
              className="text-[11] font-bold tracking-widest"
              style={{ color: i === current ? activeTextColor : textColor }}
            >
              {label}
            </Text>
            <View
              className="rounded-full self-stretch"
              style={{
                height: 2,
                marginTop: 6,
                backgroundColor: i === current ? accentColor : "#00000000",
              }}
            />
          </View>
        ))}
      </View>
      {panels.length > 0 ? (
        <View style={{ marginTop: gap }}>{panels[Math.min(current, panels.length - 1)]}</View>
      ) : null}
    </View>
  );
}

export interface DisclosureProps {
  title: string;
  /** Controlled open state; omit to let Disclosure manage it. */
  open?: boolean;
  /** Starting state when uncontrolled. Default false. */
  defaultOpen?: boolean;
  onChange?: (open: boolean) => void;
  width?: number;
  textColor?: string;
  accentColor?: string;
  children?: ReactNode;
}

/** A collapsible section row — "ADVANCED", "MODULATION". Click the
    header to fold the content in and out. */
export function Disclosure({
  title,
  open,
  defaultOpen = false,
  onChange,
  width,
  textColor = "#a1a1aa",
  accentColor = themeAccent(),
  children,
}: DisclosureProps) {
  const [internal, setInternal] = useState(defaultOpen);
  const isOpen = open ?? internal;

  const toggle = () => {
    setInternal(!isOpen);
    onChange?.(!isOpen);
  };

  return (
    <View style={width !== undefined ? { width } : undefined}>
      <View className="flex-row items-center gap-2 cursor-pointer py-1" onClick={toggle}>
        <Text className="text-[10] font-bold" style={{ color: accentColor, width: 10 }}>
          {isOpen ? "▾" : "▸"}
        </Text>
        <Text className="text-[11] font-bold tracking-widest" style={{ color: textColor }}>
          {title}
        </Text>
      </View>
      {isOpen ? <View className="pt-2 pl-5">{children}</View> : null}
    </View>
  );
}
