// PlainGain, rebuilt from the SDK's stock components in the plate's own
// style: charcoal panel, amber scale arcs, machined-black caps, the boxed
// amber readout. The photograph is gone — every pixel here is a themed
// component — but the palette, layout and window are the hardware's.

import { useState } from "react";
import { render, configureTheme, Knob, Text, View, useParameter } from "@vsreact/core";
import { formatGain, normToGain } from "./parameters";

const AMBER = "#E89A3C";

configureTheme({
  colors: {
    background: "#0A0A09",
    panel: "#1D1C1A",
    head: "#232220",
    well: "#111110",
    line: "#33312D",
    accent: AMBER,
    text: "#EDE6DA",
    muted: "#8F887C",
    faint: "#5C574E",
  },
});

/** A big PlainGain knob: instrument face over an amber scale, endpoint
    legends at the stops, letterspaced label above. */
function GainKnob({
  id,
  label,
  left,
  right,
}: {
  id: string;
  label: string;
  left: string;
  right: string;
}) {
  const p = useParameter(id);

  return (
    <View className="items-center gap-3">
      <Text className="text-text text-[17] font-bold" style={{ letterSpacing: 4 }}>
        {label}
      </Text>
      <View className="relative">
        {/* The hardware prints a static amber scale and shows the value with
            the pointer alone — track and value in near-matching amber gets
            that look while the swept half stays a shade brighter. */}
        <Knob
          variant="instrument"
          value={p.value}
          size={168}
          defaultValue={p.defaultValue}
          trackColor="#B5762A"
          valueColor={AMBER}
          onChange={p.set}
          onBegin={p.begin}
          onEnd={p.end}
        />
        {/* endpoint legends sit just outside the arc stops */}
        <Text className="absolute text-muted text-[12]" style={{ left: -18, bottom: 14 }}>
          {left}
        </Text>
        <Text className="absolute text-muted text-[12]" style={{ right: -18, bottom: 14 }}>
          {right}
        </Text>
      </View>
    </View>
  );
}

function PowerGlyph({ on, onClick }: { on: boolean; onClick: () => void }) {
  const color = on ? AMBER : "#6B6B6B";
  return (
    <View className="w-[26] h-[26] items-center justify-center cursor-pointer" onClick={onClick}>
      <View className="w-[16] h-[16] rounded-full border-2" style={{ borderColor: color }} />
      <View className="absolute w-[3] h-[8]" style={{ top: 2, backgroundColor: color }} />
    </View>
  );
}

function App() {
  const gain = useParameter("gain");
  const [powered, setPowered] = useState(true);
  const gainDb = normToGain(gain.value);

  return (
    <View className="w-full h-full bg-background items-center justify-center">
      <View
        className="rounded-2xl border border-line bg-panel overflow-hidden"
        style={{
          width: 648,
          height: 400,
          boxShadow: [{ color: "#000000B3", radius: 40, offsetY: 16 }],
        }}
      >
        {/* header strip */}
        <View className="flex-row items-center justify-between px-6 h-[56] bg-head border-b border-line">
          <Text className="text-text text-[22] font-bold">PlainGain</Text>
          <View className="flex-row items-center gap-4">
            <Text className="text-muted text-[11] font-bold" style={{ letterSpacing: 3 }}>
              GAIN UTILITY
            </Text>
            <PowerGlyph on={powered} onClick={() => setPowered((v) => !v)} />
          </View>
        </View>

        <View className="flex-1 items-center justify-center gap-2" style={{ opacity: powered ? 1 : 0.35 }}>
          <View className="flex-row" style={{ columnGap: 120 }}>
            <GainKnob id="gain" label="GAIN" left="-60" right="+6" />
            <GainKnob id="pan" label="PAN" left="L" right="R" />
          </View>

          {/* the boxed amber readout */}
          <View className="rounded-[4] bg-well border border-line px-5 py-1 mt-3">
            <Text className="text-[22] font-bold" style={{ color: AMBER }}>
              {formatGain(gainDb)}
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
}

render(<App />);
