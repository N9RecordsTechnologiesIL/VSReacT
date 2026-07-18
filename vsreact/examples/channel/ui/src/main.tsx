// The channel-strip showcase: EQCurve bound to real APVTS bands (the
// C++ runs the same RBJ math the display draws), a gain-reduction
// Meter, a RingMeter, and a Disclosure row for the output stage.

import {
  render,
  configureTheme,
  View,
  Text,
  EQCurve,
  Meter,
  RingMeter,
  ParamKnob,
  Disclosure,
  useParameter,
  useNativeValue,
  formatDb,
  type EQBand,
} from "@vsreact/core";
import { posthog, useEditorSession, useScreen } from "@vsreact/posthog";

configureTheme({
  colors: {
    background: "#071009",
    panel: "#0C1810",
    well: "#08120B",
    line: "#1E3526",
    accent: "#3BE38A",
    text: "#E9FFF1",
    muted: "#7FA98D",
    faint: "#4E7059",
  },
});

posthog.init({ defaultProperties: { plugin: "vsreact-channel-example" } });

// mid_freq uses a skewed 200..5000 Hz range (skew 0.35) on the host.
const midFreqToHz = (v: number) => 200 + 4800 * Math.pow(v, 1 / 0.35);
const hzToMidFreq = (hz: number) => Math.pow(Math.max(0, hz - 200) / 4800, 0.35);
const dbOf = (v: number) => (v - 0.5) * 24;
const normOf = (db: number) => Math.min(1, Math.max(0, db / 24 + 0.5));

function Strip() {
  const low = useParameter("low_gain");
  const mid = useParameter("mid_gain");
  const midFreq = useParameter("mid_freq");
  const high = useParameter("high_gain");
  const meters = useNativeValue("meters", { in: 0, gr: 0, out: 0 });

  const bands: EQBand[] = [
    { type: "lowshelf", freq: 200, gainDb: dbOf(low.value), q: 0.71 },
    { type: "peak", freq: midFreqToHz(midFreq.value), gainDb: dbOf(mid.value), q: 0.9 },
    { type: "highshelf", freq: 4000, gainDb: dbOf(high.value), q: 0.71 },
  ];
  const gains = [low, mid, high];

  return (
    <View className="gap-4 items-center">
      <View className="flex-row items-center gap-6">
        <EQCurve
          bands={bands}
          width={250}
          height={110}
          dbRange={12}
          color="#3BE38A55"
          label="EQ — DRAG THE NODES"
          onChange={(index, band) => {
            gains[index].set(normOf(band.gainDb ?? 0));
            if (index === 1) midFreq.set(hzToMidFreq(band.freq));
          }}
          onBegin={(index) => {
            gains[index].begin();
            if (index === 1) midFreq.begin();
          }}
          onEnd={(index) => {
            gains[index].end();
            if (index === 1) midFreq.end();
          }}
        />
        <View className="flex-row items-end gap-4">
          <Meter value={meters.gr / 18} length={110} reverse hotFrom={0.66} color="#FFB13B" hotColor="#FF4545" label="GR" />
          <RingMeter value={meters.out} size={64} color="#3BE38A" trackColor="#FFFFFF12" format={() => formatDb(meters.out <= 0.001 ? -Infinity : 20 * Math.log10(meters.out), 0)} label="OUT" />
        </View>
      </View>

      <View className="flex-row items-center gap-9">
        <ParamKnob paramId="comp" size={62} />
        <Disclosure title="ADVANCED" accentColor="#3BE38A">
          <View className="flex-row gap-6 pt-1">
            <ParamKnob paramId="out_gain" size={54} bipolar />
          </View>
        </Disclosure>
      </View>
    </View>
  );
}

function App() {
  useEditorSession();
  useScreen("Channel");

  return (
    <View className="w-full h-full bg-background items-center justify-center p-5">
      <View className="rounded-2xl border border-line bg-panel px-7 py-5 gap-4 items-center">
        <View className="flex-row items-center gap-2">
          <View className="w-[8] h-[8] rounded-full bg-accent" />
          <Text className="text-text text-[15] font-bold tracking-widest">VSREACT CHANNEL</Text>
        </View>
        <Strip />
        <Text className="text-faint text-[9] tracking-widest">
          THE SAME RBJ MATH RUNS IN C++ AND IN THE DISPLAY
        </Text>
      </View>
    </View>
  );
}

render(<App />);
