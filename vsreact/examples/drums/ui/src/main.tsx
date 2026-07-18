// The drum-machine showcase: a StepSequencer whose pattern drives the
// native step clock, the playhead riding native events back into the
// grid. Core SDK only — no analytics in this one.

import { useEffect, useState } from "react";
import {
  render,
  configureTheme,
  native,
  View,
  Text,
  StepSequencer,
  ParamNumberBox,
  ParamToggle,
  RingMeter,
  useNativeValue,
} from "@vsreact/core";

configureTheme({
  colors: {
    background: "#120B07",
    panel: "#1B110A",
    well: "#140C07",
    line: "#3A2817",
    accent: "#FF8C3B",
    text: "#FFF1E6",
    muted: "#B08A6B",
    faint: "#755B44",
  },
});

const INITIAL_PATTERN = Array.from({ length: 3 }, (_, r) =>
  Array.from({ length: 16 }, (_, s) => (r === 0 ? s % 4 === 0 : r === 1 ? s % 8 === 4 : s % 2 === 0)),
);

function App() {
  const [pattern, setPattern] = useState(INITIAL_PATTERN);
  const clock = useNativeValue("step", { n: 0, level: 0 });

  // Announce the full grid once so JS and native agree from the start.
  useEffect(() => {
    native.call("drums:pattern", { rows: pattern.map((row) => row.map(Number)) });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <View className="w-full h-full bg-background items-center justify-center p-5">
      <View className="rounded-2xl border border-line bg-panel px-7 py-5 gap-4 items-center">
        <View className="flex-row items-center gap-2">
          <View className="w-[8] h-[8] rounded-full bg-accent" />
          <Text className="text-text text-[15] font-bold tracking-widest">VSREACT DRUMS</Text>
        </View>

        <StepSequencer
          pattern={pattern}
          playhead={clock.n}
          rowLabels={["KICK", "SNARE", "HAT"]}
          cellSize={21}
          activeColor="#FF8C3B"
          cellColor="#241812"
          downbeatColor="#2E1F15"
          playheadColor="#FFF1E6"
          onToggle={(row, step, next) => {
            setPattern((rows) => rows.map((cells, r) => (r === row ? cells.map((c, s) => (s === step ? next : c)) : cells)));
            native.call("drums:cell", { row, step, on: next });
          }}
        />

        <View className="flex-row items-center gap-8">
          <ParamNumberBox paramId="tempo" width={92} step={0.02} />
          <ParamToggle paramId="run" offLabel="STOP" onLabel="RUN" />
          <RingMeter value={clock.level} size={56} color="#FF8C3B" trackColor="#FFFFFF12" label="OUT" />
        </View>

        <Text className="text-faint text-[9] tracking-widest">
          CLICK THE GRID · THE NATIVE CLOCK FOLLOWS · NO WEBVIEW ANYWHERE
        </Text>
      </View>
    </View>
  );
}

render(<App />);
