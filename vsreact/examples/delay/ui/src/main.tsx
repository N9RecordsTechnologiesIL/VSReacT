// DirtyDelay, rendered natively. A full-plate photo of the hardware with the
// moving parts patched on top — the same strategy as the gain example. The
// four knob faces, the 7-segment readout digits, the bypass lever and its
// status LED are all baked into the plate at their default pose; when a control
// moves we cover the baked pixels with resampled plate and draw the live part
// over it. Everything binds to the APVTS through useParameter.

import { render, View, Image, Text, useParameter, dragToValue } from "@vsreact/core";
import type { DragEventPayload, WheelEventPayload, StyleValue } from "@vsreact/core";
import { assets, knobStrip } from "./_assets";
import { FilmStripKnob } from "./FilmStripKnob";
import {
  RANGES, toValue, knobRotationFromNorm, formatDelayTime, type ParamId,
} from "./parameters";

const S = 0.5; // 1586×992 plate → 793×496 editor
const W = 1586 * S, H = 992 * S;
const plate = assets["plate.webp"];
const px = (n: number) => n * S; // plate-px → editor-px

// ── plate + patch helpers (as in the gain example) ─────────────────────────

// Full plate, and a resampled patch of it clipped to `rect`, shifted by
// (ox,oy) plate-px so clean panel pixels cover a baked mark underneath.
function Plate() {
  return <Image src={plate} style={{ position: "absolute", left: 0, top: 0, width: W, height: H, objectFit: "fill" }} />;
}
function Cover({ x, y, w, h, ox = 0, oy = 0 }: { x: number; y: number; w: number; h: number; ox?: number; oy?: number }) {
  return (
    <View style={{ position: "absolute", left: px(x), top: px(y), width: px(w), height: px(h), overflow: "hidden" }}>
      <Image src={plate} style={{ position: "absolute", left: px(-x + ox), top: px(-y + oy), width: W, height: H, objectFit: "fill" }} />
    </View>
  );
}

// ── 7-segment display ───────────────────────────────────────────────────────
// True hexagonal segments via clipPolygon, matching styles.css clip-paths. The
// glass and the baked "ms" unit stay in the plate; we only cover + redraw the
// three digits.

const SEG_ON = "#ff5a2a";
const SEG_OFF = "#3a1109";
const SEG_GLOW: StyleValue = [
  { color: "#ff3d18", radius: 3, offsetX: 0, offsetY: 0 },
  { color: "#ff330d", radius: 8, offsetX: 0, offsetY: 0 },
];

// Digit → active segments (a b c d e f g), from DelayDisplay.tsx.
const DIGIT_SEGMENTS: Record<string, string> = {
  "0": "abcdef", "1": "bc", "2": "abdeg", "3": "abcdg", "4": "bcfg",
  "5": "acdfg", "6": "acdefg", "7": "abc", "8": "abcdefg", "9": "abcdfg",
};

// Horizontal-bar clip (a/d/g): left 15% w 70% h 10.5%, hex arrow ends.
const H_POLY = [8, 0, 92, 0, 100, 50, 92, 100, 8, 100, 0, 50];
// Vertical-bar clip (b/c/e/f): w 12% h 40%, hex.
const V_POLY = [50, 0, 100, 10, 100, 90, 50, 100, 0, 90, 0, 10];

function Segment({ dw, dh, on, kind, left, top }: {
  dw: number; dh: number; on: boolean; kind: "h" | "v"; left: number; top: number;
}) {
  const w = kind === "h" ? dw * 0.7 : dw * 0.12;
  const h = kind === "h" ? dh * 0.105 : dh * 0.4;
  return (
    <View
      style={{
        position: "absolute",
        left: px(left), top: px(top), width: px(w), height: px(h),
        backgroundColor: on ? SEG_ON : SEG_OFF,
        clipPolygon: kind === "h" ? H_POLY : V_POLY,
        ...(on ? { boxShadow: SEG_GLOW } : {}),
      }}
    />
  );
}

// One digit cell (dw×dh in plate-px, positioned at dx,dy).
function Digit({ ch, dx, dy, dw, dh }: { ch: string; dx: number; dy: number; dw: number; dh: number }) {
  const active = DIGIT_SEGMENTS[ch] ?? "";
  const is = (s: string) => active.includes(s);
  return (
    <>
      {/* a top, g middle, d bottom (horizontal) */}
      <Segment dw={dw} dh={dh} on={is("a")} kind="h" left={dx + dw * 0.15} top={dy + dh * 0.01} />
      <Segment dw={dw} dh={dh} on={is("g")} kind="h" left={dx + dw * 0.15} top={dy + dh * 0.448} />
      <Segment dw={dw} dh={dh} on={is("d")} kind="h" left={dx + dw * 0.15} top={dy + dh * (1 - 0.01 - 0.105)} />
      {/* f top-left, b top-right, e bottom-left, c bottom-right (vertical) */}
      <Segment dw={dw} dh={dh} on={is("f")} kind="v" left={dx + dw * 0.02} top={dy + dh * 0.07} />
      <Segment dw={dw} dh={dh} on={is("b")} kind="v" left={dx + dw * (1 - 0.02 - 0.12)} top={dy + dh * 0.07} />
      <Segment dw={dw} dh={dh} on={is("e")} kind="v" left={dx + dw * 0.02} top={dy + dh * (1 - 0.07 - 0.4)} />
      <Segment dw={dw} dh={dh} on={is("c")} kind="v" left={dx + dw * (1 - 0.02 - 0.12)} top={dy + dh * (1 - 0.07 - 0.4)} />
    </>
  );
}

// The three-digit strip, measured off the baked "347" in the reference art: the
// lit pixels span x 732..1058, y 180..329, in three cells ~93 wide at a 118
// pitch. No cover is needed — the plate is pre-neutralised at asset-prep time
// (the baked digits are erased by interpolating each glass column), because the
// glass has a strong left-to-right brightness gradient and no blank region big
// enough to resample from.
const DIG = { x: 732, y: 180, cellW: 93, pitch: 118, h: 150 } as const;

function DelayDisplay({ ms }: { ms: number }) {
  const digits = formatDelayTime(ms).padStart(3, "0").slice(-3);
  return (
    <>
      {[...digits].map((ch, i) => (
        <Digit key={i} ch={ch} dx={DIG.x + i * DIG.pitch} dy={DIG.y} dw={DIG.cellW} dh={DIG.h} />
      ))}
    </>
  );
}

// ── bypass: status LED + hardware bat-lever ─────────────────────────────────
// Both are baked lit/engaged in the plate. We cover them and draw live parts:
// a radial-gradient LED lens and a multi-layer metal bat that rotates on toggle
// with a cubic-bezier transition (styles.css .toggle-bat).

const LED = { cx: 1376.6, cy: 212.7, d: 33 } as const;   // status-light lens centre
const TOG = { cx: 1376.6, cy: 302.7, d: 128 } as const;  // toggle mount centre

// Bat gradient (styles.css .toggle-bat, 90deg) — brushed steel across the bar.
const BAT_STOPS: StyleValue = [
  { offset: 0, color: "#090a08" }, { offset: 0.13, color: "#34332c" },
  { offset: 0.34, color: "#a89b82" }, { offset: 0.47, color: "#f4dfb9" },
  { offset: 0.61, color: "#887c68" }, { offset: 0.82, color: "#2a2a24" },
  { offset: 1, color: "#080907" },
];
// Dimmed variant for the "ready" (disengaged) pose — brightness(.76) baked
// into darker stops, since there is no brightness SDK key.
const BAT_STOPS_DIM: StyleValue = [
  { offset: 0, color: "#070806" }, { offset: 0.13, color: "#282721" },
  { offset: 0.34, color: "#807663" }, { offset: 0.47, color: "#b9a98d" },
  { offset: 0.61, color: "#675e4f" }, { offset: 0.82, color: "#20201b" },
  { offset: 1, color: "#060605" },
];
const BAT_SHADOW: StyleValue = [
  { color: "#000000db", radius: 6, offsetX: 5, offsetY: 7 },
  { color: "#ffffff61", radius: 1, offsetX: 1, offsetY: 0, inset: true },
  { color: "#000000a6", radius: 2, offsetX: -2, offsetY: 0, inset: true },
];

function BatLever({ engaged }: { engaged: boolean }) {
  // Cover the baked lever + LED first, then draw live.
  const batW = TOG.d * 0.28;
  const batH = TOG.d * 1.12;
  // The bat pivots about 86% down its own length (styles.css transform-origin).
  const pivotY = TOG.cy - batH * 0.5 + batH * 0.86;
  return (
    <>
      {/* Cover baked LED (shift up to clean panel) */}
      <Cover x={LED.cx - LED.d} y={LED.cy - LED.d} w={LED.d * 2} h={LED.d * 2} oy={-70} />
      {/* Live status LED lens: bright orange when engaged, dim ember otherwise */}
      <View
        style={{
          position: "absolute",
          left: px(LED.cx - LED.d / 2), top: px(LED.cy - LED.d / 2),
          width: px(LED.d), height: px(LED.d), borderRadius: px(LED.d / 2),
          gradientType: "radial",
          gradientStops: engaged
            ? ([
                { offset: 0, color: "#fff2c4" }, { offset: 0.14, color: "#ff8a50" },
                { offset: 0.38, color: "#ff4d24" }, { offset: 0.66, color: "#a92514" },
                { offset: 1, color: "#3a100a" },
              ] as StyleValue)
            : ([
                { offset: 0, color: "#4b1a10" }, { offset: 0.54, color: "#23100b" },
                { offset: 1, color: "#0b0907" },
              ] as StyleValue),
          ...(engaged
            ? {
                boxShadow: [
                  { color: "#ff4a22", radius: 3, offsetX: 0, offsetY: 0 },
                  { color: "#ff411ba8", radius: 7, offsetX: 0, offsetY: 0 },
                ] as StyleValue,
              }
            : {}),
        }}
      />

      {/* Cover baked bat-lever with clean socket pixels */}
      <Cover x={TOG.cx - TOG.d * 0.2} y={TOG.cy - TOG.d * 0.62} w={TOG.d * 0.4} h={TOG.d * 1.2} oy={-TOG.d * 1.35} />

      {/* Live bat: rotates -12deg (engaged/up) ↔ +12deg (ready), cubic-bezier */}
      <View
        style={{
          position: "absolute",
          left: px(TOG.cx - batW / 2), top: px(TOG.cy - batH * 0.5),
          width: px(batW), height: px(batH),
          borderRadius: px(batW / 2),
          gradientType: "linear", gradientAngle: 90,
          gradientStops: engaged ? BAT_STOPS : BAT_STOPS_DIM,
          boxShadow: BAT_SHADOW,
          transformOriginX: "50%",
          transformOriginY: `${(((pivotY - (TOG.cy - batH * 0.5)) / batH) * 100).toFixed(1)}%`,
          rotate: engaged ? -12 : 12,
          transitionProperty: "transform",
          transitionDuration: 180,
          transitionEasing: "cubic-bezier(.2,.86,.2,1)",
        }}
      >
        {/* Ball tip (styles.css .toggle-tip): domed metal cap at the top */}
        <View
          style={{
            position: "absolute", left: px(-batW * 0.3), top: px(-batW * 0.5),
            width: px(batW * 1.6), height: px(batW * 1.6),
            borderRadius: px(batW * 0.8),
            gradientType: "radial",
            gradientStops: [
              { offset: 0, color: engaged ? "#fff3d2" : "#c2b7a0" },
              { offset: 0.12, color: engaged ? "#c9b796" : "#9a9077" },
              { offset: 0.35, color: "#756d5e" }, { offset: 0.59, color: "#34342e" },
              { offset: 0.78, color: "#11120e" }, { offset: 1, color: "#050605" },
            ] as StyleValue,
            boxShadow: [
              { color: "#000000e0", radius: 4, offsetX: 2, offsetY: 3 },
              { color: "#ffffff94", radius: 2, offsetX: 1, offsetY: 1, inset: true },
            ] as StyleValue,
          }}
        />
      </View>
    </>
  );
}

// ── knob: live film-strip face over the baked well + a transparent hit ──────

const KNOB_CENTERS: Record<ParamId, { cx: number; cy: number }> = {
  time: { cx: 261.7, cy: 565.3 },
  feedback: { cx: 624.1, cy: 565.3 },
  tone: { cx: 962.7, cy: 565.3 },
  mix: { cx: 1322.7, cy: 565.3 },
};
const KNOB_FACE = 176; // baked face disc diameter (plate-px)
const KNOB_HIT = 200;  // generous drag target (plate-px)

// Transparent hit target over a knob. Vertical drag (180px = full range, as in
// the web original), double-click resets, wheel nudges — bound to the APVTS.
function KnobHit({ id }: { id: ParamId }) {
  const p = useParameter(id);
  const { cx, cy } = KNOB_CENTERS[id];
  let start = 0;
  return (
    <View
      style={{
        position: "absolute",
        left: px(cx - KNOB_HIT / 2), top: px(cy - KNOB_HIT / 2),
        width: px(KNOB_HIT), height: px(KNOB_HIT), cursor: "ns-resize",
      }}
      onDragStart={() => { start = p.value; p.begin(); }}
      onDrag={(e: DragEventPayload) => p.set(dragToValue(start, e.dy, 1 / 180))}
      onDragEnd={() => p.end()}
      onDoubleClick={() => { p.begin(); p.set(0.5); p.end(); }}
      onWheel={(e: WheelEventPayload) => { p.begin(); p.set(Math.min(1, Math.max(0, p.value + e.dy * 0.03))); p.end(); }}
    />
  );
}

// The visible live knob face (film-strip), centred on the baked well and turned
// to match the parameter. Separate from the hit so the Image never eats drags.
function LiveKnob({ id }: { id: ParamId }) {
  const p = useParameter(id);
  const { cx, cy } = KNOB_CENTERS[id];
  const disc = px(KNOB_FACE);
  return (
    <View style={{ position: "absolute", left: px(cx) - disc / 2, top: px(cy) - disc / 2, width: disc, height: disc, pointerEvents: "none" }}>
      <FilmStripKnob rotation={knobRotationFromNorm(p.value)} strip={knobStrip} displaySize={disc} />
    </View>
  );
}

function App() {
  const time = useParameter("time");
  const bypass = useParameter("bypass");

  const ms = toValue("time", time.value);
  const engaged = bypass.value >= 0.5;
  void RANGES; // (ranges live in parameters.ts; referenced there)

  return (
    <View style={{ width: "100%", height: "100%", backgroundColor: "#050605", alignItems: "center", justifyContent: "center" }}>
      <View style={{ width: W, height: H, position: "relative" }}>
        <Plate />

        {/* Live 7-seg readout (covers the baked "347", keeps baked "ms") */}
        <DelayDisplay ms={ms} />

        {/* Live knob faces over the baked wells */}
        <LiveKnob id="time" />
        <LiveKnob id="feedback" />
        <LiveKnob id="tone" />
        <LiveKnob id="mix" />

        {/* Bypass LED + bat-lever */}
        <BatLever engaged={engaged} />

        {/* Transparent hit targets (drawn last so they sit on top) */}
        <KnobHit id="time" />
        <KnobHit id="feedback" />
        <KnobHit id="tone" />
        <KnobHit id="mix" />
        <View
          style={{ position: "absolute", left: px(TOG.cx - TOG.d / 2), top: px(TOG.cy - TOG.d / 2), width: px(TOG.d), height: px(TOG.d), cursor: "pointer" }}
          onClick={() => { bypass.begin(); bypass.set(engaged ? 0 : 1); bypass.end(); }}
        />
      </View>
    </View>
  );
}

render(<App />);
