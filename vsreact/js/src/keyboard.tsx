// The playable piano keyboard — preview a patch without touching the
// host. Views only (white row + absolutely-positioned blacks); press
// for note-on, release for note-off, drag across keys for glissando.

import { useRef, useState } from "react";
import { View, Text } from "./primitives";
import { accentColor as themeAccent } from "./theme";
import { midiNoteName } from "./format";

const BLACK_SEMIS = new Set([1, 3, 6, 8, 10]);
const isBlack = (note: number) => BLACK_SEMIS.has(((note % 12) + 12) % 12);

export interface PianoKeyboardProps {
  /** MIDI note of the leftmost key (snapped down to a white key).
      Default 48 (C3). */
  startNote?: number;
  /** Whole octaves; the keyboard ends on the top C. Default 2. */
  octaves?: number;
  /** Width of one white key. Default 24. */
  whiteKeyWidth?: number;
  /** White-key height; blacks are 60% of it. Default 96. */
  height?: number;
  /** Externally-held notes (host MIDI in) — painted active. */
  heldNotes?: number[];
  /** Prints "C3" on each C. Default true. */
  showOctaveLabels?: boolean;
  disabled?: boolean;
  whiteColor?: string;
  blackColor?: string;
  activeColor?: string;
  borderColor?: string;
  onNoteOn?: (note: number) => void;
  onNoteOff?: (note: number) => void;
}

export function PianoKeyboard({
  startNote = 48,
  octaves = 2,
  whiteKeyWidth = 24,
  height = 96,
  heldNotes,
  showOctaveLabels = true,
  disabled,
  whiteColor = "#ECF2E8",
  blackColor = "#17191C",
  activeColor = themeAccent(),
  borderColor = "#00000066",
  onNoteOn,
  onNoteOff,
}: PianoKeyboardProps) {
  const [pressed, setPressed] = useState<number | null>(null);
  const active = useRef<number | null>(null);

  // Snap the start onto a white key so the layout math stays honest.
  let base = Math.round(startNote);
  while (isBlack(base)) base += 1;

  const whiteCount = Math.max(1, Math.round(octaves)) * 7 + 1;
  const blackWidth = whiteKeyWidth * 0.62;
  const blackHeight = height * 0.6;

  const whites: number[] = [];
  const blacks: Array<{ note: number; left: number }> = [];
  for (let note = base; whites.length < whiteCount; note++) {
    if (isBlack(note)) {
      blacks.push({ note, left: whites.length * whiteKeyWidth - blackWidth / 2 });
    } else {
      whites.push(note);
    }
  }

  const press = (note: number) => {
    if (active.current === note) return;
    if (active.current !== null) onNoteOff?.(active.current);
    active.current = note;
    setPressed(note);
    onNoteOn?.(note);
  };

  const release = () => {
    if (active.current === null) return;
    onNoteOff?.(active.current);
    active.current = null;
    setPressed(null);
  };

  /** The key under an approximate pointer position (glissando). */
  const noteAt = (x: number, y: number): number => {
    if (y <= blackHeight) {
      for (const black of blacks) {
        if (x >= black.left && x <= black.left + blackWidth) return black.note;
      }
    }
    const index = Math.min(whiteCount - 1, Math.max(0, Math.floor(x / whiteKeyWidth)));
    return whites[index];
  };

  const isActive = (note: number) =>
    pressed === note || (heldNotes !== undefined && heldNotes.includes(note));

  const keyHandlers = (note: number, centerX: number, centerY: number) =>
    disabled
      ? {}
      : {
          onMouseDown: () => press(note),
          onMouseUp: release,
          onDrag: (e: { dx: number; dy: number }) => press(noteAt(centerX + e.dx, centerY + e.dy)),
          onDragEnd: release,
        };

  return (
    <View
      className={`flex-row relative ${disabled ? "opacity-40" : "cursor-pointer"}`}
      style={{ width: whiteCount * whiteKeyWidth, height }}
    >
      {whites.map((note, i) => (
        <View
          key={note}
          className="border rounded-b-[3] justify-end items-center pb-1"
          style={{
            width: whiteKeyWidth,
            height,
            backgroundColor: isActive(note) ? activeColor : whiteColor,
            borderColor,
          }}
          {...keyHandlers(note, (i + 0.5) * whiteKeyWidth, height * 0.8)}
        >
          {showOctaveLabels && ((note % 12) + 12) % 12 === 0 ? (
            <Text className="text-[8] font-bold" style={{ color: "#00000088" }}>
              {midiNoteName(note)}
            </Text>
          ) : null}
        </View>
      ))}
      {blacks.map((black) => (
        <View
          key={black.note}
          className="absolute border rounded-b-[3]"
          style={{
            left: black.left,
            top: 0,
            width: blackWidth,
            height: blackHeight,
            backgroundColor: isActive(black.note) ? activeColor : blackColor,
            borderColor,
          }}
          {...keyHandlers(black.note, black.left + blackWidth / 2, blackHeight / 2)}
        />
      ))}
    </View>
  );
}
