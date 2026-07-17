// Tooltip + Modal — the dialog kit, built on the overlay layer and
// onLayout. Both paint above everything via useOverlay.

import { useEffect, useRef, useState, type ReactNode } from "react";
import { View, Text } from "./primitives";
import { useLayoutRect } from "./hooks";
import { useOverlay } from "./overlay";

export interface TooltipProps {
  /** The tip text. */
  label: string;
  /** Hover dwell before showing. Default 450ms. */
  delayMs?: number;
  /** Gap between the child and the tip. Default 6. */
  offset?: number;
  backgroundColor?: string;
  color?: string;
  children: ReactNode;
}

/** Wraps its child; hovering it long enough shows a tip below. */
export function Tooltip({
  label,
  delayMs = 450,
  offset = 6,
  backgroundColor = "#20241F",
  color = "#d4d4d8",
  children,
}: TooltipProps) {
  const [rect, onLayout] = useLayoutRect();
  const [visible, setVisible] = useState(false);
  const overlay = useOverlay();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!visible || rect === null) {
      overlay.hide();
      return;
    }

    overlay.show(
      <View
        className="absolute rounded-md border px-2 py-[4]"
        style={{
          left: rect.x,
          top: rect.y + rect.height + offset,
          backgroundColor,
          borderColor: "#00000066",
        }}
      >
        <Text className="text-[11]" style={{ color }}>
          {label}
        </Text>
      </View>,
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, rect, label, offset, backgroundColor, color]);

  useEffect(
    () => () => {
      if (timer.current !== null) clearTimeout(timer.current);
    },
    [],
  );

  return (
    <View
      onLayout={onLayout}
      onMouseEnter={() => {
        if (timer.current !== null) clearTimeout(timer.current);
        timer.current = setTimeout(() => setVisible(true), delayMs);
      }}
      onMouseLeave={() => {
        if (timer.current !== null) clearTimeout(timer.current);
        timer.current = null;
        setVisible(false);
      }}
    >
      {children}
    </View>
  );
}

export interface ModalProps {
  open: boolean;
  /** Backdrop click (and nothing else) calls this. */
  onClose: () => void;
  title?: string;
  width?: number;
  backgroundColor?: string;
  backdropColor?: string;
  children: ReactNode;
}

/** A centered dialog over a click-away backdrop — confirms, settings,
    about boxes. Content is yours; the chrome is minimal. */
export function Modal({
  open,
  onClose,
  title,
  width = 320,
  backgroundColor = "#1C201B",
  backdropColor = "#000000B0",
  children,
}: ModalProps) {
  const overlay = useOverlay();

  useEffect(() => {
    if (!open) {
      overlay.hide();
      return;
    }

    overlay.show(
      <View
        className="absolute inset-0 items-center justify-center"
        style={{ backgroundColor: backdropColor }}
        onClick={onClose}
      >
        {/* swallow clicks inside the panel so they don't reach the backdrop */}
        <View
          className="rounded-xl border p-5 gap-3 shadow-xl"
          style={{ width, backgroundColor, borderColor: "#00000066" }}
          onClick={() => {}}
        >
          {title !== undefined ? (
            <Text className="text-[13] font-bold tracking-wide">{title}</Text>
          ) : null}
          {children}
        </View>
      </View>,
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, title, width, backgroundColor, backdropColor, children]);

  return null;
}
