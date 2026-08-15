// Button — the pressable with hover/active states baked in.

import type { ReactNode } from "react";
import { View, Text } from "./primitives";
import { accentColor as themeAccent } from "./theme";
import { cx } from "./cx";
import type { Style } from "./tw";

export interface ButtonProps {
  label?: string;
  children?: ReactNode;
  onClick: () => void;
  disabled?: boolean;
  /** solid (default) — filled; outline — bordered; ghost — text only. */
  variant?: "solid" | "outline" | "ghost";
  size?: "sm" | "md" | "lg";
  accentColor?: string;
  /** Text color for the solid variant (default near-black). */
  textColor?: string;
}

const SIZES = {
  sm: { pad: "px-3 py-[5]", text: 11 },
  md: { pad: "px-4 py-[8]", text: 12 },
  lg: { pad: "px-5 py-[11]", text: 13 },
} as const;

/** A pressable with sensible plugin styling — solid/outline/ghost. */
export function Button({
  label,
  children,
  onClick,
  disabled,
  variant = "solid",
  size = "md",
  accentColor = themeAccent(),
  textColor = "#09090b",
}: ButtonProps) {
  const { pad, text } = SIZES[size];

  const className = cx(
    "flex-row items-center justify-center gap-2 rounded-lg",
    pad,
    disabled ? "opacity-40" : "cursor-pointer",
    !disabled && variant === "solid" && "hover:opacity-90 active:opacity-75",
    !disabled && variant !== "solid" && "hover:bg-white/10 active:bg-white/15",
    variant === "outline" && "border",
  );

  const style: Style =
    variant === "solid"
      ? { backgroundColor: accentColor }
      : variant === "outline"
        ? { borderColor: accentColor }
        : {};

  const color = variant === "solid" ? textColor : accentColor;

  return (
    <View className={className} style={style} onClick={disabled ? undefined : onClick}>
      {label !== undefined ? (
        <Text className="font-bold tracking-wide" style={{ fontSize: text, color }}>
          {label}
        </Text>
      ) : null}
      {children}
    </View>
  );
}
