// The step sequencer grid — rows of cells you click on and off, with a
// playhead column the host drives. Patterns live in the app's state;
// the component is fully controlled.

import { View, Text } from "./primitives";

export interface StepSequencerProps {
  /** rows × steps. `pattern[row][step]` true = lit. */
  pattern: boolean[][];
  /** The column currently playing — painted with a bright ring. */
  playhead?: number;
  /** Printed left of each row ("KICK", "SNARE"…). */
  rowLabels?: string[];
  /** Cell edge length. Default 20. */
  cellSize?: number;
  /** Space between cells. Default 5. */
  gap?: number;
  /** Downbeat tint every N steps. Default 4; 0 disables. */
  groupEvery?: number;
  disabled?: boolean;
  cellColor?: string;
  /** Downbeat cells (step 0, 4, 8…) when unlit. */
  downbeatColor?: string;
  activeColor?: string;
  playheadColor?: string;
  labelColor?: string;
  onToggle: (row: number, step: number, next: boolean) => void;
}

export function StepSequencer({
  pattern,
  playhead,
  rowLabels,
  cellSize = 20,
  gap = 5,
  groupEvery = 4,
  disabled,
  cellColor = "#242922",
  downbeatColor = "#2E342B",
  activeColor = "#C6F135",
  playheadColor = "#ECF2E8",
  labelColor = "#a1a1aa",
  onToggle,
}: StepSequencerProps) {
  const labelWidth =
    rowLabels !== undefined && rowLabels.length > 0
      ? Math.max(...rowLabels.map((label) => label.length)) * 7 + 10
      : 0;

  return (
    <View className={disabled ? "opacity-40" : ""} style={{ rowGap: gap }}>
      {pattern.map((row, r) => (
        <View key={r} className="flex-row items-center" style={{ columnGap: gap }}>
          {labelWidth > 0 ? (
            <Text
              className="text-[10] font-bold tracking-widest"
              style={{ width: labelWidth, color: labelColor }}
            >
              {rowLabels?.[r] ?? ""}
            </Text>
          ) : null}
          {row.map((lit, s) => (
            <View
              key={s}
              className={`rounded-[4] border ${disabled ? "" : "cursor-pointer"}`}
              style={{
                width: cellSize,
                height: cellSize,
                backgroundColor: lit
                  ? activeColor
                  : groupEvery > 0 && s % groupEvery === 0
                    ? downbeatColor
                    : cellColor,
                borderColor: s === playhead ? playheadColor : "#00000055",
              }}
              onClick={disabled ? undefined : () => onToggle(r, s, !lit)}
            />
          ))}
        </View>
      ))}
    </View>
  );
}
