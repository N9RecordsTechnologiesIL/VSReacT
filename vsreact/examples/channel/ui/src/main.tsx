// CleanStrip, rendered natively in VSReacT. A full-plate photo of the hardware
// (baked at its default state) with the moving parts patched on top: knobs are
// transparent hit zones over the baked caps, live indicators rotate over them,
// the EQ curve is drawn from the same summed-bell math the web used, and the
// meters ride the C++ "meters" event. Static baked readouts are erased with an
// opaque "readout mask" rect (the same flat panel colour the web used) before
// the live value is drawn on top.
//
// Plate is 1536×1024; the web SVG used the same viewBox, so every coordinate
// below is a plate coordinate multiplied by S (0.5) at paint time.

import { memo, useState, useEffect } from "react";
import {
  render,
  View,
  Image,
  Text,
  Svg,
  SvgPath,
  registerFont,
  useParameter,
  useNativeValue,
  useEditorSize,
  useInterval,
  useParamGestures,
  registerImage,
} from "@vsreact/core";
import type { StyleValue, ParameterHandle } from "@vsreact/core";
import { assets } from "./_assets";
import {
  RANGES,
  type ParamId,
  fromNorm,
  toNorm,
  valueToAngle,
  formatGain,
  formatFrequency,
  buildEqPath,
  eqPoint,
  graphX,
} from "./cleanstrip-model";

// ---- Scale + plate ----------------------------------------------------------
const S = 0.5; // 1536×1024 plate -> 768×512 editor
const PLATE_W = 1536;
const PLATE_H = 1024;
const W = PLATE_W * S;
const H = PLATE_H * S;
// Interned natively: the bridge carries "img:N", never the megabyte URI.
const plate = registerImage(assets["plate.webp"]);
const px = (n: number) => n * S;

// Collapsed editor height mirrors the web accordion (stage aspect 1536/795).
const EDITOR_OPEN_H = H; // 512
const EDITOR_COLLAPSED_H = Math.round(PLATE_W * (795 / 1536) * S); // ≈ 398

registerFont({ family: "CleanStrip Narrow", src: assets["narrow.otf"] });
const FONT = "CleanStrip Narrow";

// ---- Full plate + a resampled patch of it ----------------------------------
// Cover clips a shifted copy of the plate so clean panel pixels paint over a
// baked mark underneath (used for the moving knob indicators, whose baked
// default-angle mark must be hidden before the live one is drawn).
function Plate() {
  return (
    <Image
      src={plate}
      style={{ position: "absolute", left: 0, top: 0, width: W, height: H, objectFit: "fill" }}
    />
  );
}
function Cover({ x, y, w, h, ox = 0, oy = 0 }: { x: number; y: number; w: number; h: number; ox?: number; oy?: number }) {
  return (
    <View style={{ position: "absolute", left: px(x), top: px(y), width: px(w), height: px(h), overflow: "hidden" }}>
      <Image src={plate} style={{ position: "absolute", left: px(-x + ox), top: px(-y + oy), width: W, height: H, objectFit: "fill" }} />
    </View>
  );
}

// A flat opaque rect matching the web's .readout-mask (fill #111516) — erases a
// baked readout so the live text can be drawn over a clean panel.
function ReadoutMask({ x, y, w, h }: { x: number; y: number; w: number; h: number }) {
  return (
    <View
      style={{
        position: "absolute",
        left: px(x),
        top: px(y),
        width: px(w),
        height: px(h),
        backgroundColor: "#111516",
        borderRadius: px(4),
      }}
    />
  );
}

// ---- Knob -------------------------------------------------------------------
// The metallic cap layers, mirroring .knob-cap's background stack (bottom-up):
// a conic brushed-metal sweep, a faint repeating-radial "machining" texture,
// a lower-right shadow blob, and a top-left specular highlight on top. Painted
// in array order (last on top), exactly the CSS paint order.
const CAP_LAYERS: StyleValue = [
  {
    gradientType: "conic",
    gradientAngle: 205,
    gradientStops: [
      { offset: 0, color: "#817869" },
      { offset: 0.15, color: "#ece2d2" },
      { offset: 0.31, color: "#b7ac9b" },
      { offset: 0.48, color: "#eee5d7" },
      { offset: 0.67, color: "#918777" },
      { offset: 0.82, color: "#d7cdbc" },
      { offset: 1, color: "#71695d" },
    ],
  },
  {
    gradientType: "radial",
    gradientStops: [
      { offset: 0, color: "#2e2822" },
      { offset: 0.7, color: "#00000000" },
    ],
  },
  {
    gradientType: "radial",
    gradientStops: [
      { offset: 0, color: "#ffffffa1" },
      { offset: 0.5, color: "#ffffff00" },
    ],
  },
];

// The dark knob body ring under the cap, mirroring .stable-knob's radial base.
const BODY_LAYERS: StyleValue = [
  {
    gradientType: "radial",
    gradientStops: [
      { offset: 0, color: "#111111" },
      { offset: 0.66, color: "#111111" },
      { offset: 0.67, color: "#050606" },
      { offset: 0.74, color: "#050606" },
      { offset: 0.75, color: "#292721" },
      { offset: 0.78, color: "#292721" },
      { offset: 0.79, color: "#060707" },
      { offset: 1, color: "#060707" },
    ],
  },
];

/**
 * A live CleanStrip knob drawn over the baked one. `cx,cy,size` are plate
 * coordinates (slot centre + slot size), matching StableKnob's x/y/size. The
 * cap covers the baked cap; the indicator bar rotates about the slot centre.
 * Behaviour is bound to the APVTS parameter (normalized 0..1): vertical drag,
 * double-click resets to default, wheel nudges.
 */
function Knob({
  id,
  cx,
  cy,
  size,
  large = false,
  hidden = false,
}: {
  id: ParamId;
  cx: number;
  cy: number;
  size: number;
  large?: boolean;
  hidden?: boolean;
}) {
  const p = useParameter(id);
  const { min, max, def } = RANGES[id];
  const angle = valueToAngle(fromNorm(id, p.value), min, max);
  // Reset goes to the model's default (the UI is the spec), not the host's.
  const gestures = useParamGestures(p, { resetTo: toNorm(id, def) });

  const slot = size; // slot is size×size
  const left = cx - slot / 2;
  const top = cy - slot / 2;
  const capInset = slot * 0.09; // .knob-cap inset: 9%
  const indW = slot * (large ? 0.024 : 0.03);
  const indH = slot * 0.38;

  return (
    <View
      style={{
        position: "absolute",
        left: px(left),
        top: px(top),
        width: px(slot),
        height: px(slot),
        cursor: "ns-resize",
        opacity: hidden ? 0 : 1,
        pointerEvents: hidden ? "none" : "auto",
      }}
      {...gestures}
    >
      {/* dark body ring */}
      <View
        style={{
          position: "absolute", left: 0, top: 0, width: px(slot), height: px(slot),
          borderRadius: px(slot / 2),
          backgroundLayers: BODY_LAYERS,
          borderWidth: px(1),
          borderColor: "#ecdaba38",
          boxShadow: [{ offsetY: px(7), radius: px(9), color: "#000000b3" }],
        }}
      />
      {/* metallic cap */}
      <View
        style={{
          position: "absolute",
          left: px(capInset), top: px(capInset),
          width: px(slot - capInset * 2), height: px(slot - capInset * 2),
          borderRadius: px((slot - capInset * 2) / 2),
          borderWidth: px(1), borderColor: "#f0e2cc8f",
          backgroundLayers: CAP_LAYERS,
        }}
      />
      {/* indicator bar — pivots at slot centre (50%,50%) */}
      <View
        style={{
          position: "absolute",
          left: px(slot * 0.485),
          top: px(slot * 0.12),
          width: px(indW),
          height: px(indH),
          borderRadius: px(indW),
          backgroundColor: "#171918",
          rotate: angle,
          transformOriginX: "50%",
          transformOriginY: "100%",
        }}
      />
    </View>
  );
}

// ---- EQ graph ---------------------------------------------------------------
// Frequency tick positions (log scale), from EqGraph.tsx. The labels are baked
// into the plate below the bed; only the grid lines are redrawn.
const FREQ_TICKS = [20, 50, 100, 200, 500, 1000, 2000, 5000, 10000, 20000];

// Graph bed rect (plate coords), from .graph-bed.
const BED = { x: 73, y: 137, w: 856, h: 329 };

// One interactive EQ node (LOW/MID/HIGH). The node sits on the curve at
// (eqX,eqY); dragging it vertically changes that band's gain via the bound
// parameter. Label + value are drawn live (the baked ones are under the bed
// repaint). `freqLabel` is the fixed frequency text the web showed.
function GraphNode({
  band,
  eqX,
  eqY,
  label,
  gainDb,
  freqLabel,
}: {
  band: ParameterHandle;
  eqX: number;
  eqY: number;
  label: string;
  gainDb: number;
  freqLabel: string;
}) {
  // No wheel on the graph nodes (matching the web); drag + double-click reset.
  const gestures = useParamGestures(band, { wheelStep: 0 });
  const hit = 40; // generous square hit target in plate px
  return (
    <>
      {/* label above */}
      <Text
        style={{
          position: "absolute", left: px(eqX - 60), top: px(eqY - 29 - 15), width: px(120),
          fontFamily: FONT, fontSize: px(21), color: "#f6dfad", textAlign: "center",
        }}
      >
        {label}
      </Text>
      {/* rim / cap / core, mirroring .graph-node-* radii (18 / 12.5 / 5.5) */}
      <View style={{ position: "absolute", left: px(eqX - 18), top: px(eqY - 18), width: px(36), height: px(36), borderRadius: px(18), backgroundColor: "#090b0b", borderWidth: px(3), borderColor: "#d6c5aa" }} />
      <View style={{ position: "absolute", left: px(eqX - 12.5), top: px(eqY - 12.5), width: px(25), height: px(25), borderRadius: px(12.5), gradientType: "linear", gradientAngle: 135, gradientStops: [ { offset: 0, color: "#f2eadb" }, { offset: 0.48, color: "#aaa08f" }, { offset: 1, color: "#5f594f" } ], borderWidth: px(1.5), borderColor: "#5c584f" }} />
      <View style={{ position: "absolute", left: px(eqX - 5.5), top: px(eqY - 5.5), width: px(11), height: px(11), borderRadius: px(5.5), backgroundColor: "#1a1d1c", borderWidth: px(2), borderColor: "#070808" }} />
      {/* value below */}
      <Text
        style={{
          position: "absolute", left: px(eqX - 90), top: px(eqY + 48 - 15), width: px(180),
          fontFamily: FONT, fontSize: px(18), color: "#f2d6a1", textAlign: "center",
        }}
      >
        {`${formatGain(gainDb)} · ${freqLabel}`}
      </Text>
      {/* transparent drag target */}
      <View
        style={{ position: "absolute", left: px(eqX - hit / 2), top: px(eqY - hit / 2), width: px(hit), height: px(hit), cursor: "ns-resize" }}
        {...gestures}
      />
    </>
  );
}

function EqGraph({
  low, mid, high, highFreqHz,
}: {
  low: ParameterHandle;
  mid: ParameterHandle;
  high: ParameterHandle;
  highFreqHz: number;
}) {
  const lowDb = fromNorm("low_gain", low.value);
  const midDb = fromNorm("mid_gain", mid.value);
  const highDb = fromNorm("high_gain", high.value);

  const d = buildEqPath(lowDb, midDb, highDb, highFreqHz);
  const lowPt = eqPoint(200, lowDb);
  const midPt = eqPoint(1200, midDb);
  const highPt = eqPoint(highFreqHz, highDb);

  return (
    <>
      {/* Repaint the graph interior so the moving curve never ghosts against
          the baked one. Bed fill, then minor + major grid, matching EqGraph. */}
      <View style={{ position: "absolute", left: px(BED.x), top: px(BED.y), width: px(BED.w), height: px(BED.h), backgroundColor: "#101415", borderWidth: px(2), borderColor: "#080a0b" }} />
      <Svg viewBox="0 0 1536 1024" style={{ position: "absolute", left: 0, top: 0, width: W, height: H }}>
        {/* 25 minor vertical grid lines (.graph-grid--minor, ~7.5% alpha) */}
        {Array.from({ length: 25 }, (_, i) => {
          const x = 74 + (853 / 24) * i;
          return <SvgPath key={`mn${i}`} d={`M ${x} 139 L ${x} 438`} stroke="#80898713" strokeWidth={1} />;
        })}
        {/* horizontal grid */}
        {[160, 230, 299, 369, 438].map((y) => (
          <SvgPath key={`h${y}`} d={`M 74 ${y} L 927 ${y}`} stroke="#80898729" strokeWidth={1} />
        ))}
        {/* frequency grid lines */}
        {FREQ_TICKS.map((f) => {
          const x = graphX(f);
          return <SvgPath key={`f${f}`} d={`M ${x} 139 L ${x} 438`} stroke="#80898729" strokeWidth={1} />;
        })}
        {/* crisp EQ curve */}
        <SvgPath d={d} fill="none" stroke="#f7ddba" strokeWidth={2.2} strokeCap="round" strokeJoin="round" />
      </Svg>
      {/* glow: a wide, semi-transparent copy of the same path, blurred */}
      <View style={{ position: "absolute", left: 0, top: 0, width: W, height: H, blurRadius: px(5), pointerEvents: "none" }}>
        <Svg viewBox="0 0 1536 1024" style={{ position: "absolute", left: 0, top: 0, width: W, height: H }}>
          <SvgPath d={d} fill="none" stroke="#ffd69938" strokeWidth={10} strokeCap="round" strokeJoin="round" />
        </Svg>
      </View>
      {/* frequency axis labels are baked on the panel below the bed (y≈465),
          outside the repaint region, so they stay correct. */}
      {/* interactive nodes */}
      <GraphNode band={low} eqX={lowPt.x} eqY={lowPt.y} label="LOW" gainDb={lowDb} freqLabel="200 Hz" />
      <GraphNode band={mid} eqX={midPt.x} eqY={midPt.y} label="MID" gainDb={midDb} freqLabel="1.2 kHz" />
      <GraphNode band={high} eqX={highPt.x} eqY={highPt.y} label="HIGH" gainDb={highDb} freqLabel={formatFrequency(highFreqHz)} />
    </>
  );
}

// ---- Meters -----------------------------------------------------------------
// Ports StripMeters.tsx. Segment stacks are repainted live over the baked
// wells; lit segments glow via shadowColor. Driven by the C++ "meters" event.
const segmentY = (bottom: number, index: number, height: number, gap: number) =>
  bottom - (index + 1) * height - index * gap;

function MeterWell({ x, y, w, h }: { x: number; y: number; w: number; h: number }) {
  return <View style={{ position: "absolute", left: px(x), top: px(y), width: px(w), height: px(h), borderRadius: px(3), backgroundColor: "#080b0b", borderWidth: px(2), borderColor: "#020303" }} />;
}

// memo: on a tick where the lit count moves, only the segments that crossed
// the threshold re-commit, not all ~100.
const Segment = memo(function Segment({ x, y, w, h, lit, color, glow }: { x: number; y: number; w: number; h: number; lit: boolean; color: string; glow: string }) {
  return (
    <View
      style={{
        position: "absolute", left: px(x), top: px(y), width: px(w), height: px(h), borderRadius: px(1),
        backgroundColor: lit ? color : "#141817",
        opacity: lit ? 1 : 0.72,
        ...(lit ? { shadowColor: glow, shadowRadius: px(3) } : {}),
      }}
    />
  );
});

function OutputMeter({ x, lit, segments }: { x: number; lit: number; segments: number }) {
  return (
    <>
      <MeterWell x={x - 2} y={227} w={27} h={479} />
      {Array.from({ length: segments }, (_, i) => {
        // Top band (index ≥ 22) is cyan, matching .meter-segment--band-2.
        const color = Math.floor(i / 11) === 2 ? "#25dce6" : "#45eaa8";
        return (
          <Segment key={i} x={x + 2} y={segmentY(698, i, 10, 4)} w={19} h={10} lit={i < lit} color={color} glow="#40eeb480" />
        );
      })}
    </>
  );
}

// memo: the "meters" event fires at 30 Hz whether or not anything moved; when
// the derived numbers are unchanged (idle audio), the whole meter subtree
// bails out and no ops cross the bridge.
const Meters = memo(function Meters({ gr, left, right }: { gr: number; left: number; right: number }) {
  const grSegments = 34;
  const outSegments = 34;
  const litGr = Math.round(gr * grSegments);
  const litLeft = Math.round(left * outSegments);
  const litRight = Math.round(right * outSegments);

  return (
    <>
      {/* Gain-reduction meter */}
      <MeterWell x={1248} y={212} w={26} h={474} />
      {Array.from({ length: grSegments }, (_, i) => (
        <Segment key={`gr${i}`} x={1252} y={segmentY(677, i, 9, 4)} w={18} h={9} lit={i < litGr} color="#ffd46d" glow="#ffba3dcc" />
      ))}
      {/* Output L / R */}
      <OutputMeter x={1372} lit={litLeft} segments={outSegments} />
      <OutputMeter x={1424} lit={litRight} segments={outSegments} />
    </>
  );
});

// The 30 Hz meters subscription lives in this leaf, not in App: a meter tick
// must never re-render the plate, the EQ graph, or the knobs (whose full
// setProps payloads — including the plate's base64 src — would otherwise be
// re-sent over the bridge 30 times a second).
function LiveMeters({ powered }: { powered: boolean }) {
  // Live meters from C++. When powered off, zero them (the DSP keeps running,
  // but the CleanStrip look treats power as a display gate, like the web).
  const raw = useNativeValue("meters", { in: 0, gr: 0, out: 0 });
  const gr = powered ? Math.min(1, raw.gr / 18) : 0;
  const level = powered ? Math.min(1, raw.out) : 0;
  return <Meters gr={gr} left={level} right={level} />;
}

// ---- Readout (masked baked text + live value) -------------------------------
// Erases the baked readout with an opaque panel-coloured rect, then draws the
// live value centred in that rect. Text is centred vertically by placing the
// line box top at mask-top + (maskH - fontSize)/2.
function Readout({ x, y, w, h, fontSize, text }: {
  x: number; y: number; w: number; h: number;
  fontSize: number; text: string;
}) {
  return (
    <>
      <ReadoutMask x={x} y={y} w={w} h={h} />
      <Text
        style={{
          position: "absolute", left: px(x), top: px(y + (h - fontSize) / 2), width: px(w),
          fontFamily: FONT, fontSize: px(fontSize), color: "#f5d486", textAlign: "center",
        }}
      >
        {text}
      </Text>
    </>
  );
}

// ---- App --------------------------------------------------------------------
function App() {
  const low = useParameter("low_gain");
  const mid = useParameter("mid_gain");
  const high = useParameter("high_gain");
  const highFreq = useParameter("high_freq");
  const comp = useParameter("comp");
  const outGain = useParameter("out_gain");

  const [powered, setPowered] = useState(true);
  const [advancedOpen, setAdvancedOpen] = useState(true);
  const [, resize] = useEditorSize();

  const highFreqHz = fromNorm("high_freq", highFreq.value);
  const compVal = fromNorm("comp", comp.value);
  const outGainDb = fromNorm("out_gain", outGain.value);

  // Accordion: animate the editor HEIGHT between open (512) and collapsed
  // (≈398), stepped by a short timer over ~180ms (the host may clamp — fine).
  // The web animates the stage aspect 1536/1024 → 1536/795; the editor keeps a
  // fixed width so the collapse reads as a height change.
  const target = advancedOpen ? EDITOR_OPEN_H : EDITOR_COLLAPSED_H;
  const [animH, setAnimH] = useState(EDITOR_OPEN_H);
  useInterval(
    () => setAnimH((cur) => {
      if (Math.abs(cur - target) < 1) return cur === target ? cur : target;
      return cur + (target - cur) * 0.4; // ~180ms ease at 30ms steps
    }),
    animH === target ? null : 30,
  );
  useEffect(() => { resize(W, Math.round(animH)); }, [animH, resize]);

  return (
    <View style={{ width: "100%", height: "100%", backgroundColor: "#020404", alignItems: "center" }}>
      <View style={{ width: W, height: H, position: "relative" }}>
        <Plate />

        {/* EQ graph (live curve + glow + interactive nodes) */}
        <EqGraph low={low} mid={mid} high={high} highFreqHz={highFreqHz} />

        {/* Meters (the 30 Hz subscription lives inside — see LiveMeters) */}
        <LiveMeters powered={powered} />

        {/* Fixed readouts: erase baked value, draw live */}
        {/* FREQ (baked "1.20 kHz" → live high-shelf frequency) */}
        <Readout x={765} y={655} w={126} h={42} fontSize={20} text={formatFrequency(highFreqHz)} />
        {/* COMP amount */}
        <Readout x={1014} y={551} w={113} h={48} fontSize={26} text={compVal.toFixed(2)} />
        {/* OUTPUT GAIN (hidden with the panel) */}
        {advancedOpen && (
          <Readout x={697} y={927} w={119} h={43} fontSize={20} text={formatGain(outGainDb)} />
        )}

        {/* Knobs — coords/sizes straight from CleanStrip.tsx */}
        <Knob id="low_gain" cx={150} cy={620} size={101} />
        <Knob id="mid_gain" cx={397} cy={620} size={101} />
        <Knob id="high_gain" cx={622} cy={620} size={101} />
        <Knob id="high_freq" cx={827} cy={620} size={76} />
        <Knob id="comp" cx={1070} cy={441} size={166} large />
        <Knob id="out_gain" cx={756} cy={894} size={84} hidden={!advancedOpen} />

        {/* When collapsed, mask the advanced panel (.advanced-mask). */}
        {!advancedOpen && (
          <View style={{ position: "absolute", left: px(23), top: px(793), width: px(1490), height: px(188), borderRadius: px(9), backgroundColor: "#111516", borderWidth: px(2), borderColor: "#070909" }} />
        )}

        {/* Power button: toggles the meter display gate. The baked gold glyph
            shows when on; when off, dim it with a translucent overlay. */}
        <View
          style={{ position: "absolute", left: px(1438), top: px(26), width: px(61), height: px(61), borderRadius: px(31), cursor: "pointer" }}
          onClick={() => setPowered((v) => !v)}
        >
          {!powered && (
            <View style={{ position: "absolute", left: 0, top: 0, width: px(61), height: px(61), borderRadius: px(31), backgroundColor: "#020404b3" }} />
          )}
        </View>

        {/* ADVANCED toggle strip (.advanced-toggle at x23,y750,w1490,h45). */}
        <View
          style={{ position: "absolute", left: px(23), top: px(750), width: px(1490), height: px(45), cursor: "pointer" }}
          onClick={() => setAdvancedOpen((v) => !v)}
        />
      </View>
    </View>
  );
}

render(<App />);
