// DirtyDelay, rebuilt from stock components in the hardware's own voice:
// bronze-brown panel, cream legends, a red LED millisecond display in a
// recessed bezel, a bypass toggle with its status LED, and four vintage
// chicken-head knobs over printed tick scales. The film strips and the
// seven-segment art are gone — the character stays.

import {
  render,
  configureTheme,
  Knob,
  Text,
  Toggle,
  View,
  useParameter,
  normalizedToNatural,
} from "@vsreact/core";
import { formatDelayTime } from "./parameters";

const CREAM = "#D8C9A6";
const LED = "#FF3B1F";

configureTheme({
  colors: {
    background: "#100D0A",
    panel: "#241D16",
    well: "#15100B",
    line: "#3A2F22",
    accent: CREAM,
    text: CREAM,
    muted: "#8F8266",
    faint: "#5E543F",
  },
});

/** A vintage knob column: chicken-head face, endpoint legends at the stops,
    letterspaced cream label. */
function DelayKnob({ id, label, left, right }: { id: string; label: string; left: string; right: string }) {
  const p = useParameter(id);

  return (
    <View className="items-center gap-2">
      <View className="relative">
        <Knob
          variant="chickenhead"
          value={p.value}
          size={104}
          defaultValue={p.defaultValue}
          onChange={p.set}
          onBegin={p.begin}
          onEnd={p.end}
        />
        <Text className="absolute text-faint text-[10]" style={{ left: -12, bottom: 4 }}>
          {left}
        </Text>
        <Text className="absolute text-faint text-[10]" style={{ right: -12, bottom: 4 }}>
          {right}
        </Text>
      </View>
      <Text className="text-muted text-[15] font-bold" style={{ letterSpacing: 3 }}>
        {label}
      </Text>
    </View>
  );
}

/** The red LED readout in its recessed glass bezel. */
function LedDisplay({ ms }: { ms: number }) {
  return (
    <View
      className="rounded-[10] border-2 items-center justify-center flex-row"
      style={{
        width: 300,
        height: 104,
        borderColor: "#0B0805",
        backgroundColor: "#160705",
        boxShadow: [
          { color: "#000000CC", radius: 10, offsetY: 4, inset: true },
          { color: "#3A2F2266", radius: 1, offsetY: 1 },
        ],
        columnGap: 6,
      }}
    >
      <Text
        className="font-bold"
        style={{
          fontSize: 58,
          color: LED,
          textShadowColor: LED + "99",
          textShadowRadius: 14,
          letterSpacing: 6,
        }}
      >
        {formatDelayTime(ms).padStart(3, "0")}
      </Text>
      <Text
        className="font-bold"
        style={{ fontSize: 22, color: LED, textShadowColor: LED + "99", textShadowRadius: 10, marginTop: 24 }}
      >
        ms
      </Text>
    </View>
  );
}

function App() {
  const time = useParameter("time");
  const bypass = useParameter("bypass");
  const ms = normalizedToNatural(time.value, time);
  // Same reading as the plate UI: the lever up (param high) is "engaged",
  // and the status LED burns red while the delay is in the signal path.
  const active = bypass.value >= 0.5;

  return (
    <View className="w-full h-full bg-background items-center justify-center">
      <View
        className="rounded-2xl border-2 border-line bg-panel px-9 py-7 gap-7"
        style={{ width: 733, height: 436, boxShadow: [{ color: "#000000B3", radius: 36, offsetY: 14 }] }}
      >
        <View className="flex-row items-center justify-between">
          {/* the logo block */}
          <View className="gap-1">
            <Text className="text-text font-bold" style={{ fontSize: 34 }}>
              DirtyDelay
            </Text>
            <View className="h-[2] w-[168] bg-line" />
            <Text className="text-faint text-[10] font-bold" style={{ letterSpacing: 4 }}>
              GRITTY · WARM · ALIVE
            </Text>
          </View>

          <LedDisplay ms={ms} />

          {/* bypass: status LED over the switch */}
          <View className="items-center gap-2">
            <Text className="text-muted text-[11] font-bold" style={{ letterSpacing: 2 }}>
              BYPASS
            </Text>
            <View
              className="w-[12] h-[12] rounded-full"
              style={{
                backgroundColor: active ? LED : "#4A1810",
                ...(active ? { boxShadow: [{ color: LED + "99", radius: 8 }] } : {}),
              }}
            />
            <Toggle
              on={active}
              onColor={LED}
              onChange={(on) => {
                bypass.begin();
                bypass.set(on ? 1 : 0);
                bypass.end();
              }}
            />
          </View>
        </View>

        <View className="flex-1 flex-row items-center justify-between px-2">
          <DelayKnob id="time" label="TIME" left="1 ms" right="1000" />
          <DelayKnob id="feedback" label="FEEDBACK" left="0%" right="95%" />
          <DelayKnob id="tone" label="TONE" left="DARK" right="BRIGHT" />
          <DelayKnob id="mix" label="MIX" left="DRY" right="WET" />
        </View>
      </View>
    </View>
  );
}

render(<App />);
