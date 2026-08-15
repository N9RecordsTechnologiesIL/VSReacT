// DrumDeck, rendered natively. A full-plate photo of the hardware with the
// moving parts patched on top (the gain-example pattern): the baked plate
// shows the default groove, tempo 124, level 0.82, RUN lit, and the playhead
// parked on step 11. Live state covers those baked marks and redraws over
// them. Pads are invisible hit zones; the visible pad IS the photo, with a
// sprite drawn only where the live pattern differs from the baked one.
//
// Bound to the real APVTS (tempo / run / level, normalized 0..1) and the
// native 16-step clock — this WORKS, it isn't a mock.

import { Fragment, useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { render, native, View, Image, Text, useParameter, useNativeEvent, useParamGestures, registerFont } from "@vsreact/core";
import type { StyleValue } from "@vsreact/core";
import { assets } from "./_assets";
import {
  ROWS, STEPS, DEFAULT_PATTERN, STEP_CENTERS,
  PAD_X, PAD_Y, PAD_W, PAD_H, PAD_ART_W, PAD_ART_H, PAD_ART_DX, PAD_ART_DY,
  BAKED_PLAYHEAD_STEP, PH_BOX_W, PH_BOX_TOP, PH_BOX_H,
  clampTempo, tempoToNorm, normToTempo, clamp01,
} from "./sequencer";

// The DrumDeck typeface, inlined as a data URI by build.ts. Registered at
// module top so it's resolvable before the first render.
registerFont({ family: "DrumDeck Narrow", src: assets["narrow.otf"] });

const S = 0.5;                 // 1672×941 plate → 836×470 editor
const W = 1672 * S, H = 941 * S;
const plate = assets["plate.webp"];
const padActive = assets["pad-active.webp"];
const padInactive = assets["pad-inactive.webp"];
const px = (n: number) => n * S;

// DrumDeck palette (from styles.css / DrumDeckArtwork.tsx).
const CYAN = "#55eaf1";
const CYAN_BRIGHT = "#8cf7fb";
const WELL = "#0b0d0d";        // tempo / level readout wells
const STRIP_BG = "#121414";    // step-number strip bar
const GOLD_STOPS: StyleValue = [
  { offset: 0, color: "#75461f" }, { offset: 0.5, color: "#ffd080" }, { offset: 1, color: "#9a5726" },
];

// A readout digit group: a Text frame centred on plate-space (cx, cy) whose
// glyphs are scaled to `len` plate-px via textLength (mirrors DrumDeckArtwork's
// textAnchor="middle" + textLength/lengthAdjust so digits never shift layout).
// The painter anchors textLength text by textAlign, so we centre the frame on
// cx and let it centre within.
function Readout({ cx, cy, len, size, color, glow, family, children }: {
  cx: number; cy: number; len: number; size: number; color: string;
  glow?: string; family?: string; children: ReactNode;
}) {
  const half = len / 2 + size; // frame wide enough to hold the scaled glyphs
  return (
    <Text
      style={{
        position: "absolute", left: px(cx - half), top: px(cy - size), width: px(half * 2), height: px(size * 2),
        fontFamily: family ?? "DrumDeck Narrow", fontSize: px(size), color, textAlign: "center",
        textLength: px(len),
        ...(glow ? { textShadowColor: glow, textShadowRadius: px(4) } : {}),
      }}
    >
      {children}
    </Text>
  );
}

// Full plate.
function Plate() {
  return <Image src={plate} style={{ position: "absolute", left: 0, top: 0, width: W, height: H, objectFit: "fill" }} />;
}

// A resampled patch of the plate clipped to rect (x,y,w,h) in plate space,
// shifted by (ox,oy) plate-px so clean panel pixels cover a baked mark
// underneath. Identical to the gain example's Cover.
function Cover({ x, y, w, h, ox = 0, oy = 0 }: { x: number; y: number; w: number; h: number; ox?: number; oy?: number }) {
  return (
    <View style={{ position: "absolute", left: px(x), top: px(y), width: px(w), height: px(h), overflow: "hidden" }}>
      <Image src={plate} style={{ position: "absolute", left: px(-x + ox), top: px(-y + oy), width: W, height: H, objectFit: "fill" }} />
    </View>
  );
}

// The step-number strip (plate y 303..369). The baked strip parks its cyan
// highlight on step 11, so we repaint the whole bar over it (a flat dark
// rect — exact, no resampling) and redraw all 16 numbers with per-column
// dot / tick / diamond, lighting the live `playhead` column cyan.
function StepStrip({ playhead }: { playhead: number }) {
  return (
    <View style={{ position: "absolute", left: px(187), top: px(303), width: px(1400), height: px(66) }}>
      {/* opaque strip bg covering the baked numbers + baked highlight */}
      <View style={{ position: "absolute", left: 0, top: 0, width: px(1400), height: px(66), backgroundColor: STRIP_BG }} />
      {STEP_CENTERS.map((c, i) => {
        const active = i === playhead;
        const label = i + 1;
        const lx = c - 187; // local x within the strip
        return (
          // Fragment, not a View: a plain <View> here would be a flex child of
          // the strip, and the absolutely-positioned pieces inside would anchor
          // to that stacked wrapper instead of the strip — which pushed all 16
          // numbers out of view.
          <Fragment key={label}>
            {/* cyan tick above the active number (DrumDeck rect 54×4) */}
            {active && (
              <View style={{
                position: "absolute", left: px(lx - 27), top: px(311 - 303), width: px(54), height: px(4), borderRadius: px(2),
                backgroundColor: CYAN, shadowColor: CYAN, shadowRadius: px(4),
              }} />
            )}
            {/* the number */}
            <Readout cx={lx} cy={344 - 303 + 3} len={label >= 10 ? 24 : 13} size={30}
                     color={active ? "#66edf4" : "#e5d9cb"} glow={active ? CYAN : undefined}>
              {label}
            </Readout>
            {/* active: cyan diamond; inactive: tan dot (DrumDeck circle r=3) */}
            {active ? (
              <View style={{
                position: "absolute", left: px(lx - 4), top: px(357 - 303), width: px(8), height: px(8),
                backgroundColor: "#5cecf3", rotate: 45, shadowColor: CYAN, shadowRadius: px(4),
              }} />
            ) : (
              <View style={{
                position: "absolute", left: px(lx - 3), top: px(360 - 303 - 3), width: px(6), height: px(6), borderRadius: px(3),
                backgroundColor: "#c99560",
              }} />
            )}
          </Fragment>
        );
      })}
    </View>
  );
}

// The live column outline over the pads, matching the baked box measured off
// the plate (75×337 at y 375). No cover is needed for the baked step-11 box:
// plate.webp is pre-neutralised at asset-prep time (see prepExampleAssets.ts),
// the outline replaced by the step-9 column — same pad group, so exact pad
// pitch, and identical baked pad states, so the copy is seamless. Covering it
// live instead left faint seams where resampled bezels didn't line up.
// Border-only so the pads show through — the painter clips the outer glow to
// outside the box, as CSS does.
function PlayheadBox({ playhead }: { playhead: number }) {
  const c = STEP_CENTERS[playhead];
  return (
    <View style={{
      position: "absolute", left: px(c - PH_BOX_W / 2), top: px(PH_BOX_TOP),
      width: px(PH_BOX_W), height: px(PH_BOX_H), borderRadius: px(8),
      borderWidth: px(2), borderColor: CYAN, shadowColor: CYAN, shadowRadius: px(6),
    }} />
  );
}

// ── Pad grid ────────────────────────────────────────────────────────────────
// 48 pads (3 rows × 16 steps). The plate already photographs the default
// groove, so PadSprites draws a sprite ONLY where the live state differs from
// the baked (DEFAULT_PATTERN) state — DrumDeck's minimal-overdraw `changedPads`.
// PadHits is a separate top layer of invisible hit zones so clicks land above
// the playhead outline; it toggles a step and paints across neighbours on drag.
function PadSprites({ pattern }: { pattern: boolean[][] }) {
  const sprites: ReactNode[] = [];
  for (let row = 0; row < ROWS; row++) {
    for (let step = 0; step < STEPS; step++) {
      const active = pattern[row][step];
      if (active === DEFAULT_PATTERN[row][step]) continue;
      const x = PAD_X[step], y = PAD_Y[row];
      sprites.push(
        <Image key={`s-${row}-${step}`} src={active ? padActive : padInactive}
          style={{ position: "absolute", left: px(x + PAD_ART_DX), top: px(y + PAD_ART_DY), width: px(PAD_ART_W), height: px(PAD_ART_H), objectFit: "fill" }} />,
      );
    }
  }
  return <>{sprites}</>;
}

function PadHits({ pattern, onToggle }: {
  pattern: boolean[][];
  onToggle: (row: number, step: number, on: boolean) => void;
}) {
  // Click-and-drag paint: the first pad sets the desired on/off; entering
  // another pad while pressed applies it once (DrumDeck's gesture).
  const paint = useRef<{ desired: boolean; visited: Set<string> } | null>(null);
  const begin = (row: number, step: number, active: boolean) => {
    paint.current = { desired: !active, visited: new Set([`${row}-${step}`]) };
    onToggle(row, step, !active);
  };
  const enter = (row: number, step: number, active: boolean) => {
    const g = paint.current;
    if (!g) return;
    const key = `${row}-${step}`;
    if (g.visited.has(key)) return;
    g.visited.add(key);
    if (active !== g.desired) onToggle(row, step, g.desired);
  };
  const end = () => { paint.current = null; };

  const hits: ReactNode[] = [];
  for (let row = 0; row < ROWS; row++) {
    for (let step = 0; step < STEPS; step++) {
      const active = pattern[row][step];
      const x = PAD_X[step], y = PAD_Y[row];
      hits.push(
        <View key={`h-${row}-${step}`}
          style={{ position: "absolute", left: px(x), top: px(y), width: px(PAD_W), height: px(PAD_H), cursor: "pointer" }}
          onMouseDown={() => begin(row, step, active)}
          onMouseEnter={() => enter(row, step, active)}
          onMouseUp={end}
        />,
      );
    }
  }
  return <>{hits}</>;
}

// ── Level knob ────────────────────────────────────────────────────────────────
// Knob centre in plate space is (1367, 198) — the pivot DrumDeckArtwork rotates
// the needle about. The baked needle sits at 0.82; we cover the whole knob face
// with a drawn dark disc (so the baked needle vanishes regardless of live value)
// then draw the base tick + the live gold needle. Rotation matches DrumDeck:
// -135 + level*270, needle pointing up (12 o'clock) at rotation 0.
const KNOB_CX = 1367, KNOB_CY = 198, KNOB_R = 40;

function LevelKnob({ level }: { level: number }) {
  const rotation = -135 + clamp01(level) * 270;
  return (
    <View style={{ position: "absolute", left: px(KNOB_CX - KNOB_R), top: px(KNOB_CY - KNOB_R), width: px(KNOB_R * 2), height: px(KNOB_R * 2) }}>
      {/* dark knob face — radial so it reads as a turned metal cap, covering
          the baked needle */}
      <View style={{
        position: "absolute", left: 0, top: 0, width: px(KNOB_R * 2), height: px(KNOB_R * 2), borderRadius: px(KNOB_R),
        gradientType: "radial",
        gradientStops: [{ offset: 0, color: "#26221d" }, { offset: 0.7, color: "#161513" }, { offset: 1, color: "#0c0b0a" }] as StyleValue,
        borderWidth: px(2), borderColor: "#3a2f22",
      }} />
      {/* dark base tick (DrumDeck's #171919 line, up-right of centre) */}
      <View style={{
        position: "absolute", left: px(KNOB_R - 3), top: px(2), width: px(6), height: px(KNOB_R - 4), borderRadius: px(3),
        backgroundColor: "#171919", rotate: 28, transformOriginX: "50%", transformOriginY: "100%",
      }} />
      {/* live gold needle: a thin bar from centre pointing up, rotated */}
      <View style={{
        position: "absolute", left: px(KNOB_R - 2), top: px(KNOB_CY - 161), width: px(4), height: px(37), borderRadius: px(2),
        gradientType: "linear", gradientAngle: 0, gradientStops: GOLD_STOPS,
        rotate: rotation, transformOriginX: "50%", transformOriginY: "100%",
      }} />
    </View>
  );
}

// Transparent hit target over the knob, bound through the SDK's headless
// useParamGestures (vertical drag in a begin/end automation gesture,
// double-click reset, wheel nudge). Mirrors DrumDeck's LevelKnob, which also
// took a combined x/y drag + wheel; vertical drag is the required binding.
function KnobHit({ id }: { id: string }) {
  const p = useParameter(id);
  return (
    <View
      style={{ position: "absolute", left: px(1317), top: px(151), width: px(98), height: px(98), cursor: "ns-resize" }}
      {...useParamGestures(p)}
    />
  );
}

// ── Transport RUN / STOP ─────────────────────────────────────────────────────
// One lit / one dim button (DrumDeckArtwork's transport group). The plate bakes
// RUN-lit / STOP-dim (playing). When the live `run` flips to STOP we cover both
// baked boxes and redraw with the glow swapped; when running, the baked art is
// already correct so we draw nothing.
function TransportButton({ x, w, lit, glyph, label, len }: {
  x: number; w: number; lit: boolean; glyph: ReactNode; label: string; len: number;
}) {
  return (
    <View style={{ position: "absolute", left: px(x), top: px(154), width: px(w), height: px(81) }}>
      <View style={{
        position: "absolute", left: 0, top: 0, width: px(w), height: px(81), borderRadius: px(13),
        backgroundColor: lit ? "#0a1112" : "#090b0b", borderWidth: px(lit ? 2 : 3), borderColor: lit ? CYAN : "#343838",
        ...(lit ? { shadowColor: CYAN, shadowRadius: px(6) } : {}),
      }} />
      <View style={{
        position: "absolute", left: px(5), top: px(6), width: px(w - 10), height: px(69), borderRadius: px(8),
        backgroundColor: lit ? "#111718" : "#111414", borderWidth: px(lit ? 2 : 3), borderColor: lit ? CYAN_BRIGHT : "#343838",
      }} />
      {glyph}
      <Readout cx={label === "RUN" ? 970 - x : 1104 - x} cy={196 - 154} len={len} size={24}
               color={lit ? "#e7ddd2" : "#88847e"}>
        {label}
      </Readout>
    </View>
  );
}

function Transport({ run }: { run: boolean }) {
  // Baked = running. Only repaint when stopped.
  if (run) return null;
  // Play triangle via clipPolygon (points in % of the frame): left edge full
  // height, apex at right-centre. Frame = DrumDeck's 910,184 → 931,208.
  const runTriangle = (
    <View style={{
      position: "absolute", left: px(910 - 882), top: px(184 - 154), width: px(21), height: px(24),
      backgroundColor: "#777b7a", clipPolygon: [0, 0, 0, 100, 100, 50] as StyleValue,
    }} />
  );
  const stopSquare = (
    <View style={{
      position: "absolute", left: px(1048 - 1020), top: px(186 - 154), width: px(19), height: px(19), borderRadius: px(1.5),
      backgroundColor: CYAN_BRIGHT, shadowColor: CYAN, shadowRadius: px(4),
    }} />
  );
  return (
    <>
      {/* cover the baked RUN + STOP boxes with clean panel pixels */}
      <Cover x={878} y={150} w={140} h={90} oy={-110} />
      <Cover x={1018} y={150} w={140} h={90} oy={-110} />
      <TransportButton x={882} w={132} lit={false} glyph={runTriangle} label="RUN" len={48} />
      <TransportButton x={1020} w={134} lit={true} glyph={stopSquare} label="STOP" len={52} />
    </>
  );
}

// The 30 Hz native clock only matters to the number strip and the column
// outline, so the subscription lives here, not in App: storing just the step
// index means setState bails out on the ticks where it hasn't advanced, and a
// tick never re-renders the rest of the plate tree. (clock.level is unused by
// this UI — the plate has no live meter.)
function Playhead() {
  const [n, setN] = useState(0);
  useNativeEvent("step", (clock: { n: number }) => setN(clock.n));
  const playhead = ((n % STEPS) + STEPS) % STEPS;
  return (
    <>
      <StepStrip playhead={playhead} />
      <PlayheadBox playhead={playhead} />
    </>
  );
}

// Tempo −/+ press zones. Each press adjusts the tempo param by ±1 BPM (DrumDeck
// clamps 40..240). Kept simple: one step per click (DrumDeck's press-and-hold
// auto-repeat isn't reproduced; a click is the required binding).
function TempoButton({ x, w, dir }: { x: number; w: number; dir: -1 | 1 }) {
  const p = useParameter("tempo");
  const nudge = () => {
    const bpm = clampTempo(normToTempo(p.value) + dir);
    p.begin(); p.set(tempoToNorm(bpm)); p.end();
  };
  return (
    <View style={{ position: "absolute", left: px(x), top: px(160), width: px(w), height: px(72), cursor: "pointer" }}
          onClick={nudge} />
  );
}

// RUN / STOP press zones toggling the `run` bool param.
function RunStopHit({ x, w, target }: { x: number; w: number; target: boolean }) {
  const p = useParameter("run");
  return (
    <View style={{ position: "absolute", left: px(x), top: px(160), width: px(w), height: px(72), cursor: "pointer" }}
          onClick={() => { p.begin(); p.set(target ? 1 : 0); p.end(); }} />
  );
}

function App() {
  const tempo = useParameter("tempo");
  const run = useParameter("run");
  const level = useParameter("level");

  const [pattern, setPattern] = useState<boolean[][]>(() => DEFAULT_PATTERN.map((r) => r.slice()));

  // Announce the full grid once so JS and native agree from the start (the
  // exact protocol the C++ already speaks — see DrumsPlugin.cpp).
  useEffect(() => {
    native.call("drums:pattern", { rows: pattern.map((row) => row.map(Number)) });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggle = (row: number, step: number, on: boolean) => {
    setPattern((rows) => rows.map((cells, r) => (r === row ? cells.map((c, s) => (s === step ? on : c)) : cells)));
    native.call("drums:cell", { row, step, on });
  };

  const running = run.value >= 0.5;
  const bpm = clampTempo(normToTempo(tempo.value));
  const lvl = clamp01(level.value);

  return (
    <View style={{ width: "100%", height: "100%", backgroundColor: "#030404", alignItems: "center", justifyContent: "center" }}>
      <View style={{ width: W, height: H, position: "relative" }}>
        <Plate />

        <PadSprites pattern={pattern} />
        {/* number strip repaint + live playhead outline (30 Hz clock inside) */}
        <Playhead />

        {/* transport lit/dim swap (only repaints when stopped) */}
        <Transport run={running} />

        {/* readouts: cover the baked value well, redraw live. Tempo textLength
            42 (<100) or 62; level 52 (DrumDeckArtwork). */}
        <View style={{ position: "absolute", left: px(563), top: px(175), width: px(134), height: px(49), borderRadius: px(3), backgroundColor: WELL }} />
        <Readout cx={630} cy={196} len={bpm < 100 ? 42 : 62} size={40} color="#eee1d4">{bpm}</Readout>

        <View style={{ position: "absolute", left: px(1227), top: px(176), width: px(82), height: px(48), borderRadius: px(2), backgroundColor: WELL }} />
        <Readout cx={1268} cy={198} len={52} size={36} color="#eee2d6">{lvl.toFixed(2)}</Readout>

        {/* level knob face + live needle */}
        <LevelKnob level={lvl} />

        {/* ── interactive hit zones (topmost) ── */}
        <PadHits pattern={pattern} onToggle={toggle} />
        <TempoButton x={499} w={54} dir={-1} />
        <TempoButton x={710} w={54} dir={1} />
        <RunStopHit x={887} w={122} target={true} />
        <RunStopHit x={1025} w={124} target={false} />
        <KnobHit id="level" />
      </View>
    </View>
  );
}

render(<App />);
