// CleanStrip, rebuilt from stock components in its own studio voice:
// cream-on-black, a live EQCurve with draggable band handles where the art
// had a painted response, steel knobs for the bands and the compressor, LED
// meters for gain reduction and output, and the ADVANCED fold with the
// output trim. The plate is gone; the registered CleanStrip Narrow face
// still sets every readout.

import { memo, useState } from "react";
import {
  render,
  configureTheme,
  registerFont,
  EQCurve,
  Knob,
  Disclosure,
  Meter,
  Text,
  View,
  useNativeValue,
  useParameter,
  normalizedToNatural,
  naturalToNormalized,
  formatHz,
} from "@vsreact/core";
import type { EQBand, ParameterHandle } from "@vsreact/core";
import { assets } from "./_assets";

const CREAM = "#E8DFC0";
const GOLD = "#F5D486";
const FONT = "CleanStrip Narrow";

registerFont({ family: FONT, src: assets["narrow.otf"] });

configureTheme({
  colors: {
    background: "#0B0B09",
    panel: "#12110E",
    well: "#080807",
    line: "#2B2920",
    accent: CREAM,
    text: CREAM,
    muted: "#9A9074",
    faint: "#5F5944",
  },
});

const db = (p: ParameterHandle) => normalizedToNatural(p.value, p);
const formatDbText = (value: number) => `${value >= 0 ? "+" : ""}${value.toFixed(1)} dB`;

/** A CleanStrip band knob: steel face, ±12 legends, gold narrow readout. */
function BandKnob({ p, label, readout }: { p: ParameterHandle; label: string; readout: string }) {
  return (
    <View className="items-center gap-1">
      <Text className="text-muted text-[11] font-bold" style={{ letterSpacing: 2 }}>
        {label}
      </Text>
      <View className="relative">
        <Knob
          variant="steel"
          value={p.value}
          size={64}
          defaultValue={p.defaultValue}
          onChange={p.set}
          onBegin={p.begin}
          onEnd={p.end}
        />
        <Text className="absolute text-faint text-[9]" style={{ left: -20, bottom: 2 }}>
          -12 dB
        </Text>
        <Text className="absolute text-faint text-[9]" style={{ right: -22, bottom: 2 }}>
          +12 dB
        </Text>
      </View>
      <Text className="text-[12]" style={{ fontFamily: FONT, color: GOLD }}>
        {readout}
      </Text>
    </View>
  );
}

/** GR + stereo output, on the 30Hz native feed. Lives in a leaf so a meter
    tick never re-renders the EQ or the knobs. */
const MeterBank = memo(function MeterBank({ gr, out }: { gr: number; out: number }) {
  return (
    <View className="flex-row gap-5 items-end">
      <View className="items-center gap-1">
        <Text className="text-faint text-[9] font-bold tracking-widest">GR</Text>
        <Meter value={Math.min(1, gr / 18)} length={150} thickness={11} reverse color="#FFD46D" />
      </View>
      <View className="items-center gap-1">
        <Text className="text-faint text-[9] font-bold tracking-widest">OUTPUT</Text>
        <View className="flex-row gap-2">
          <Meter value={out} length={150} thickness={11} color="#45EAA8" hotColor="#25DCE6" hotFrom={0.75} />
          <Meter value={out} length={150} thickness={11} color="#45EAA8" hotColor="#25DCE6" hotFrom={0.75} />
        </View>
        <View className="flex-row gap-3">
          <Text className="text-faint text-[9]">L</Text>
          <Text className="text-faint text-[9]">R</Text>
        </View>
      </View>
    </View>
  );
});

function LiveMeters({ powered }: { powered: boolean }) {
  const raw = useNativeValue("meters", { in: 0, gr: 0, out: 0 });
  return <MeterBank gr={powered ? raw.gr : 0} out={powered ? Math.min(1, raw.out) : 0} />;
}

function PowerGlyph({ on, onClick }: { on: boolean; onClick: () => void }) {
  const color = on ? CREAM : "#565247";
  return (
    <View className="w-[24] h-[24] items-center justify-center cursor-pointer" onClick={onClick}>
      <View className="w-[15] h-[15] rounded-full border-2" style={{ borderColor: color }} />
      <View className="absolute w-[3] h-[7]" style={{ top: 2, backgroundColor: color }} />
    </View>
  );
}

function App() {
  const low = useParameter("low_gain");
  const mid = useParameter("mid_gain");
  const high = useParameter("high_gain");
  const highFreq = useParameter("high_freq");
  const comp = useParameter("comp");
  const outGain = useParameter("out_gain");
  const [powered, setPowered] = useState(true);

  // The same bands the DSP runs: shelves at fixed corners, the high shelf's
  // corner riding the high_freq parameter. Handle drags write straight back.
  const bands: EQBand[] = [
    { type: "lowshelf", freq: 200, gainDb: db(low) },
    { type: "peak", freq: 1200, gainDb: db(mid), q: 0.8 },
    { type: "highshelf", freq: normalizedToNatural(highFreq.value, highFreq), gainDb: db(high) },
  ];
  const gains = [low, mid, high];

  return (
    <View className="w-full h-full bg-background px-6 py-3 gap-2" style={{ opacity: powered ? 1 : 0.99 }}>
      {/* header */}
      <View className="flex-row items-end justify-between">
        <View>
          <Text className="text-text text-[22] font-bold" style={{ letterSpacing: 6 }}>
            CLEANSTRIP
          </Text>
          <Text className="text-faint text-[9] font-bold" style={{ letterSpacing: 4 }}>
            CHANNEL STRIP
          </Text>
        </View>
        <View className="flex-row items-center gap-3">
          <Text className="text-faint text-[10] font-bold" style={{ letterSpacing: 3 }}>
            CLEAN SIGNAL PATH
          </Text>
          <PowerGlyph on={powered} onClick={() => setPowered((v) => !v)} />
        </View>
      </View>

      {/* EQ display + comp/meters */}
      <View className="flex-row gap-5" style={{ opacity: powered ? 1 : 0.35 }}>
        <View className="rounded-[6] border border-line bg-well p-2">
          <EQCurve
            bands={bands}
            width={420}
            height={160}
            dbRange={14}
            color={CREAM}
            handleColor={GOLD}
            onChange={(i, band) => {
              gains[i].set(naturalToNormalized(band.gainDb ?? 0, gains[i]));
              if (i === 2) highFreq.set(naturalToNormalized(band.freq, highFreq));
            }}
            onBegin={(i) => gains[i].begin()}
            onEnd={(i) => gains[i].end()}
          />
        </View>

        <View className="flex-1 flex-row items-center justify-between pr-1">
          <View className="items-center gap-1">
            <Text className="text-muted text-[12] font-bold" style={{ letterSpacing: 2 }}>
              COMP
            </Text>
            <View className="relative">
              <Knob
                variant="steel"
                value={comp.value}
                size={96}
                defaultValue={comp.defaultValue}
                onChange={comp.set}
                onBegin={comp.begin}
                onEnd={comp.end}
              />
              <Text className="absolute text-faint text-[10]" style={{ left: -8, bottom: 6 }}>
                0
              </Text>
              <Text className="absolute text-faint text-[10]" style={{ right: -8, bottom: 6 }}>
                1
              </Text>
            </View>
            <Text className="text-[13]" style={{ fontFamily: FONT, color: GOLD }}>
              {comp.value.toFixed(2)}
            </Text>
          </View>

          <LiveMeters powered={powered} />
        </View>
      </View>

      {/* band knobs */}
      <View
        className="flex-row justify-between rounded-[6] border border-line bg-panel px-10 py-2"
        style={{ opacity: powered ? 1 : 0.35 }}
      >
        <BandKnob p={low} label="LOW" readout={`${formatDbText(db(low))} · 200 Hz`} />
        <BandKnob p={mid} label="MID" readout={`${formatDbText(db(mid))} · 1.2 kHz`} />
        <BandKnob p={high} label="HIGH" readout={`${formatDbText(db(high))} · ${formatHz(normalizedToNatural(highFreq.value, highFreq))}`} />
        <View className="items-center gap-1">
          <Text className="text-muted text-[11] font-bold" style={{ letterSpacing: 2 }}>
            FREQ
          </Text>
          <Knob
            variant="steel"
            value={highFreq.value}
            size={64}
            defaultValue={highFreq.defaultValue}
            onChange={highFreq.set}
            onBegin={highFreq.begin}
            onEnd={highFreq.end}
          />
          <Text className="text-[12]" style={{ fontFamily: FONT, color: GOLD }}>
            {formatHz(normalizedToNatural(highFreq.value, highFreq))}
          </Text>
        </View>
      </View>

      {/* the fold */}
      <View className="items-center" style={{ opacity: powered ? 1 : 0.35 }}>
        <Disclosure title="ADVANCED" defaultOpen width={696} textColor="#9A9074" accentColor={CREAM}>
          <View className="items-center py-1">
            <BandKnob p={outGain} label="OUTPUT GAIN" readout={formatDbText(db(outGain))} />
          </View>
        </Disclosure>
      </View>
    </View>
  );
}

render(<App />);
