// VSReacT Compressor — the whole panel, in stock components.
//
// This example started life as `create-vsreact compressor` and grew from the
// two-knob starter it generates. There is no reference art: every pixel here
// is a built-in component or a themed View, which makes it the place to look
// if you want a good-looking plugin without a designer's plate.
//
// What crosses the bridge: parameter values (through useParameter, both ways)
// and three meter numbers at 30Hz. The transfer curve is computed here, in
// TypeScript, from the same formula the audio thread runs — see compressor.ts.

import {
  configureTheme,
  render,
  useLayoutRect,
  useNativeValue,
  useParameter,
  normalizedToNatural,
  Bars,
  Meter,
  ParamKnob,
  useRollingBuffer,
  Svg,
  SvgPath,
  Text,
  View,
} from "@vsreact/core";

import { curvePath, dbToX, dbToY, gridLines, outputDb, type CompressorSettings } from "./compressor";

configureTheme({
  colors: {
    background: "#07090A",
    panel: "#0E1214",
    well: "#080B0C",
    line: "#1F282B",
    accent: "#3FD8C8",
    hot: "#F2A93B",
    text: "#E7EEF0",
    muted: "#7E8C90",
    faint: "#4E595C",
  },
});

// ── the transfer curve ─────────────────────────────────────────────────

const GRAPH = { minDb: -60, maxDb: 0, size: 100 } as const;
const GRID = gridLines(GRAPH.minDb, GRAPH.maxDb, 12);

interface GraphProps {
  settings: CompressorSettings;
  inputDb: number;
}

/** Input level → output level, drawn from the live parameter values. The
    dot is where the signal currently sits on that curve. */
function TransferGraph({ settings, inputDb }: GraphProps) {
  const audible = inputDb > GRAPH.minDb;
  const dotX = dbToX(Math.min(inputDb, GRAPH.maxDb), GRAPH);
  const dotY = dbToY(outputDb(Math.min(inputDb, GRAPH.maxDb), settings), GRAPH);
  const kneeX = dbToX(settings.threshold, GRAPH);

  return (
    <View className="rounded-xl border border-line bg-well p-3 gap-2">
      <View className="flex-row justify-between items-center">
        <Text className="text-muted text-[9] tracking-widest">TRANSFER</Text>
        <Text className="text-faint text-[9] tracking-widest">OUT dB</Text>
      </View>

      <View className="w-[176] h-[176]">
        <Svg viewBox="0 0 100 100" className="w-full h-full">
          {/* grid */}
          {GRID.map((db) => {
            // The axes share a range, so one dB value gives both the vertical
            // line at that input and the horizontal at that output.
            const x = dbToX(db, GRAPH);
            const y = dbToY(db, GRAPH);
            return (
              <SvgPath
                key={`grid-${db}`}
                d={`M${x.toFixed(2)} 0 L${x.toFixed(2)} 100 M0 ${y.toFixed(2)} L100 ${y.toFixed(2)}`}
                stroke="#1B2325"
                strokeWidth={0.6}
                fill="none"
              />
            );
          })}

          {/* unity — what the signal would do untouched */}
          <SvgPath d="M0 100 L100 0" stroke="#2A3639" strokeWidth={0.8} strokeDash="3 3" fill="none" />

          {/* where the knee starts bending */}
          <SvgPath
            d={`M${kneeX.toFixed(2)} 0 L${kneeX.toFixed(2)} 100`}
            stroke="#3FD8C844"
            strokeWidth={0.8}
            fill="none"
          />

          {/* the curve itself */}
          <SvgPath
            d={curvePath(settings, GRAPH)}
            stroke="#3FD8C8"
            strokeWidth={2}
            strokeCap="round"
            strokeJoin="round"
            fill="none"
          />

          {/* the live operating point */}
          {audible && (
            <SvgPath
              d={`M${dotX.toFixed(2)} ${dotY.toFixed(2)} m-2.6 0 a2.6 2.6 0 1 0 5.2 0 a2.6 2.6 0 1 0 -5.2 0`}
              fill="#F2A93B"
            />
          )}
        </Svg>
      </View>

      <View className="flex-row justify-between">
        <Text className="text-faint text-[9] tracking-widest">-60</Text>
        <Text className="text-muted text-[9] tracking-widest">INPUT dB</Text>
        <Text className="text-faint text-[9] tracking-widest">0</Text>
      </View>
    </View>
  );
}

// ── meters ─────────────────────────────────────────────────────────────

/** -60..0 dB onto a meter's 0..1. */
const meterLevel = (db: number) => Math.min(1, Math.max(0, (db + 60) / 60));

/** Silence reads as a dash, not "-100.0" — a number that only ever means
    "nothing here" is noise on a meter. */
const readDb = (db: number) => (db <= -60 ? "–" : db.toFixed(1));

function MeterColumn({ label, value, readout, reverse, color }: {
  label: string;
  value: number;
  readout: string;
  reverse?: boolean;
  color?: string;
}) {
  return (
    <View className="items-center gap-2">
      <Text className="text-faint text-[9] tracking-widest">{label}</Text>
      <Meter value={value} length={150} thickness={16} reverse={reverse} color={color} />
      {/* Fixed-width box, not textLength: that scales the glyphs to fill the
          width, which turns a one-character "–" into a long rule. */}
      <View className="w-[46] items-center">
        <Text className="text-muted text-[11]">{readout}</Text>
      </View>
    </View>
  );
}

/** The last few seconds of gain reduction. `useRollingBuffer` shifts one
    sample in per render, so the 30Hz meter feed drives it for free — four
    seconds of history at 120 bars.

    `Bars` takes a pixel width, and this sits in a flexible column, so the
    column measures itself with `useLayoutRect` and passes the result down.
    That's the general recipe for putting a fixed-size visualiser in a
    layout that stretches: measure the parent, size the child. */
function GainReductionHistory({ reductionDb }: { reductionDb: number }) {
  const history = useRollingBuffer(Math.min(1, reductionDb / 24), 120);
  const [rect, onLayout] = useLayoutRect();

  return (
    <View className="flex-1 items-center gap-2" onLayout={onLayout}>
      <Text className="text-faint text-[9] tracking-widest">GR OVER TIME</Text>
      {rect !== null && (
        <Bars
          values={history}
          width={rect.width}
          height={150}
          gap={1}
          color="#F2A93B"
          trackColor="#12181A"
          hotFrom={1}
        />
      )}
      {/* Matches the readout row under each meter, so the tops align. */}
      <View className="h-[16]" />
    </View>
  );
}

// ── the panel ──────────────────────────────────────────────────────────

const KNOBS = [
  { id: "threshold", label: "THRESH" },
  { id: "ratio", label: "RATIO" },
  { id: "knee", label: "KNEE" },
  { id: "attack", label: "ATTACK" },
  { id: "release", label: "RELEASE" },
  { id: "makeup", label: "MAKEUP" },
  { id: "mix", label: "MIX" },
];

function App() {
  // Natural units come from the host's own NormalisableRange, carried on the
  // parameter handle — no minimum, maximum or skew is restated here.
  const threshold = useParameter("threshold");
  const ratio = useParameter("ratio");
  const knee = useParameter("knee");
  const makeup = useParameter("makeup");
  const mix = useParameter("mix");

  const settings: CompressorSettings = {
    threshold: normalizedToNatural(threshold.value, threshold),
    ratio: normalizedToNatural(ratio.value, ratio),
    knee: normalizedToNatural(knee.value, knee),
    makeup: normalizedToNatural(makeup.value, makeup),
    mix: normalizedToNatural(mix.value, mix) / 100,
  };

  const meters = useNativeValue("meters", { in: -100, gr: 0, out: -100 });

  return (
    <View className="w-full h-full bg-background p-4 gap-3">
      <View className="flex-row items-center gap-2">
        <View className="w-[8] h-[8] rounded-full bg-accent" />
        <Text className="text-text text-[14] font-bold tracking-widest">VSREACT COMPRESSOR</Text>
        <View className="flex-1" />
        <Text className="text-faint text-[9] tracking-widest">
          {meters.gr > 0.1 ? `-${meters.gr.toFixed(1)} dB GR` : "IDLE"}
        </Text>
      </View>

      <View className="flex-row gap-3 flex-1">
        <TransferGraph settings={settings} inputDb={meters.in} />

        <View className="flex-1 rounded-xl border border-line bg-panel p-3 gap-2">
          <View className="flex-row justify-between items-center">
            <Text className="text-muted text-[9] tracking-widest">LEVELS</Text>
            <Text className="text-faint text-[9] tracking-widest">dB</Text>
          </View>

          <View className="flex-1 flex-row items-center gap-6">
            <MeterColumn label="IN" value={meterLevel(meters.in)} readout={readDb(meters.in)} />
            {/* Gain reduction reads downward from the top, the way every
                compressor's GR meter has since the 1950s. */}
            <MeterColumn
              label="GR"
              value={Math.min(1, meters.gr / 24)}
              readout={meters.gr < 0.1 ? "–" : `-${meters.gr.toFixed(1)}`}
              reverse
              color="#F2A93B"
            />
            <MeterColumn label="OUT" value={meterLevel(meters.out)} readout={readDb(meters.out)} />

            <GainReductionHistory reductionDb={meters.gr} />
          </View>
        </View>
      </View>

      <View className="flex-row justify-between rounded-xl border border-line bg-panel px-4 py-3">
        {KNOBS.map((knob) => (
          // The spun-stainless face from the site's component gallery — the
          // value readout moves under the face on physical variants.
          <ParamKnob key={knob.id} paramId={knob.id} label={knob.label} size={62} variant="steel" />
        ))}
      </View>
    </View>
  );
}

render(<App />);
