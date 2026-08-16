// DrumDeck, rebuilt from stock components in the rack's own voice: charcoal
// housing, orange pads, teal transport. The pad grid is the SDK's
// StepSequencer wired to the same native protocol as before (full pattern up
// front, one drums:cell per toggle, playhead back on the "step" event), the
// tempo is a NumberBox flanked by nudge buttons, and RUN/STOP light teal.
// The DrumDeck Narrow face still sets the readouts.

import { useEffect, useState } from "react";
import {
  render,
  configureTheme,
  native,
  Button,
  Knob,
  Meter,
  NumberBox,
  StepSequencer,
  Text,
  View,
  registerFont,
  useNativeEvent,
  useParameter,
  normalizedToNatural,
  naturalToNormalized,
} from "@vsreact/core";
import { assets } from "./_assets";
import { ROWS, STEPS, DEFAULT_PATTERN } from "./sequencer";

const ORANGE = "#FF7A3D";
const TEAL = "#35E0DC";
const FONT = "DrumDeck Narrow";

registerFont({ family: FONT, src: assets["narrow.otf"] });

configureTheme({
  colors: {
    background: "#111312",
    panel: "#1A1C1B",
    well: "#0B0D0D",
    line: "#2E312F",
    accent: TEAL,
    text: "#EDEBE6",
    muted: "#8E8C84",
    faint: "#585751",
  },
});

const CELL = 38;
const GAP = 6;

/** The step numbers over the grid, teal on the playing column. */
function StepNumbers({ playhead }: { playhead: number }) {
  return (
    <View className="flex-row" style={{ columnGap: GAP, marginLeft: 64 }}>
      {Array.from({ length: STEPS }, (_, i) => (
        <Text
          key={i}
          className="text-center text-[11] font-bold"
          style={{ width: CELL, color: i === playhead ? TEAL : "#6B6A63", fontFamily: FONT }}
        >
          {i + 1}
        </Text>
      ))}
    </View>
  );
}

function Transport() {
  const run = useParameter("run");
  const running = run.value >= 0.5;
  const set = (on: boolean) => {
    run.begin();
    run.set(on ? 1 : 0);
    run.end();
  };

  return (
    <View className="flex-row gap-2">
      <Button
        label="▶ RUN"
        size="sm"
        variant={running ? "solid" : "outline"}
        accentColor={TEAL}
        onClick={() => set(true)}
      />
      <Button label="■ STOP" size="sm" variant={running ? "outline" : "solid"} accentColor="#8E8C84" onClick={() => set(false)} />
    </View>
  );
}

function Tempo() {
  const tempo = useParameter("tempo");
  const bpm = Math.round(normalizedToNatural(tempo.value, tempo));
  const write = (next: number) => {
    tempo.begin();
    tempo.set(naturalToNormalized(next, tempo));
    tempo.end();
  };

  return (
    <View className="items-center gap-1">
      <Text className="text-faint text-[9] font-bold tracking-widest">TEMPO</Text>
      <View className="flex-row items-center gap-1">
        <Button label="−" size="sm" variant="ghost" accentColor="#EDEBE6" onClick={() => write(bpm - 1)} />
        <NumberBox
          value={bpm}
          min={tempo.min}
          max={tempo.max}
          step={1}
          width={72}
          format={(v) => String(Math.round(v))}
          defaultValue={Math.round(normalizedToNatural(tempo.defaultValue, tempo))}
          onChange={write}
        />
        <Button label="+" size="sm" variant="ghost" accentColor="#EDEBE6" onClick={() => write(bpm + 1)} />
        <Text className="text-faint text-[10] font-bold">BPM</Text>
      </View>
    </View>
  );
}

function LevelAndOut() {
  const level = useParameter("level");

  return (
    <View className="flex-row items-center gap-5">
      <View className="items-center gap-1">
        <Text className="text-faint text-[9] font-bold tracking-widest">LEVEL</Text>
        <View className="flex-row items-center gap-2">
          <View className="rounded-[4] bg-well border border-line px-3 py-1">
            <Text className="text-[15]" style={{ fontFamily: FONT, color: "#F0EDE4" }}>
              {level.value.toFixed(2)}
            </Text>
          </View>
          <Knob
            variant="instrument"
            value={level.value}
            size={46}
            defaultValue={level.defaultValue}
            valueColor={TEAL}
            onChange={level.set}
            onBegin={level.begin}
            onEnd={level.end}
          />
        </View>
      </View>
      <View className="items-center gap-1">
        <Text className="text-faint text-[9] font-bold tracking-widest">OUT</Text>
        <Meter value={level.value} length={132} thickness={14} horizontal color={TEAL} hotColor={ORANGE} hotFrom={0.72} />
        <View className="flex-row justify-between w-[132]">
          <Text className="text-faint text-[8]">-24</Text>
          <Text className="text-faint text-[8]">-12</Text>
          <Text className="text-faint text-[8]">-6</Text>
          <Text className="text-faint text-[8]">-3</Text>
          <Text className="text-faint text-[8]">0</Text>
        </View>
      </View>
    </View>
  );
}

function App() {
  const [pattern, setPattern] = useState<boolean[][]>(() => DEFAULT_PATTERN.map((r) => r.slice()));
  const [playhead, setPlayhead] = useState(0);

  useNativeEvent("step", (clock: { n: number }) => setPlayhead(clock.n));

  // Hand C++ the full default groove once; every toggle after is one cell.
  useEffect(() => {
    native.call("drums:pattern", { rows: pattern.map((row) => row.map(Number)) });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggle = (row: number, step: number, on: boolean) => {
    setPattern((rows) => rows.map((cells, r) => (r === row ? cells.map((c, s) => (s === step ? on : c)) : cells)));
    native.call("drums:cell", { row, step, on });
  };

  return (
    <View className="w-full h-full bg-background items-center justify-center gap-3 px-5">
      {/* the head rack: logo · tempo · transport · level/out */}
      <View className="w-full flex-row items-center justify-between rounded-xl border border-line bg-panel px-5 py-2">
        <View className="flex-row items-center gap-3">
          {/* the stacked-lines badge */}
          <View className="gap-[3] rounded-[4] border border-line p-[5]">
            {[0, 1, 2].map((i) => (
              <View key={i} className="w-[18] h-[3] rounded-[1]" style={{ backgroundColor: ORANGE }} />
            ))}
          </View>
          <Text className="text-text text-[24] font-bold" style={{ letterSpacing: 3 }}>
            DRUMDECK
          </Text>
        </View>
        <Tempo />
        <Transport />
        <LevelAndOut />
      </View>

      {/* the pad grid */}
      <View className="w-full rounded-xl border border-line bg-panel px-5 py-3 gap-2 items-center">
        <StepNumbers playhead={playhead} />
        <StepSequencer
          pattern={pattern}
          playhead={playhead}
          rowLabels={["KICK", "SNARE", "HAT"]}
          cellSize={CELL}
          gap={GAP}
          groupEvery={4}
          cellColor="#242624"
          downbeatColor="#2B2E2C"
          activeColor={ORANGE}
          playheadColor={TEAL}
          labelColor="#8E8C84"
          onToggle={toggle}
        />
      </View>
    </View>
  );
}

render(<App />);
