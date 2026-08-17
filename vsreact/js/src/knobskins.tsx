// The knob faces from the component gallery at vsreact.n9records.com/components,
// as native VSReacT trees. Each skin is pure decoration: <Knob> owns the
// gestures, the value maths and the labels, and asks a skin only to paint the
// face. Every element here is listener-free, so hits fall through to the
// gesture container.
//
// The web gallery draws these with CSS; here the same geometry maps onto the
// painter's own vocabulary — gradientStops/gradientRepeat for knurling and
// spun metal, boxShadow arrays for depth, clipPolygon for pointer noses,
// <Svg> for tick rings and drafted circles. Anything the painter can't do
// (an off-centre radial highlight) is approximated with a layered gradient.

import { Svg, SvgPath, Text, View } from "./primitives";

export type KnobVariant =
  | "arc" // the classic flat arc with the value inside — the long-time default
  | "instrument" // arc + dark pointer cap (the landing-page demo knob)
  | "gauge" // thin ring, fat value stroke, big numeric readout
  | "metal" // machined knurled cap, engraved pointer, centre screw
  | "steel" // spun stainless face on a printed tick ring, hairline pointer
  | "glass" // glossy dome on a wide skirt, wedge pointer
  | "chickenhead" // vintage pointer knob over a printed scale
  | "neon" // discrete LED segment ring with a glowing readout
  | "blueprint"; // drafted dial: dashed construction circle, radius pointer

/** Where <Knob> should put the value text for a given face. */
export function knobTextPlacement(variant: KnobVariant): "inside" | "below" {
  return variant === "arc" || variant === "gauge" || variant === "neon" || variant === "blueprint"
    ? "inside"
    : "below";
}

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

/** 270° arc from -135°, in a 0..100 viewBox — the gallery's arcPath twin. */
function arcPath(value: number, r = 40): string {
  const start = (-135 * Math.PI) / 180;
  const end = ((-135 + 270 * clamp01(value)) * Math.PI) / 180;
  const large = 270 * clamp01(value) > 180 ? 1 : 0;
  const f = (n: number) => Number(n.toFixed(3));
  return `M ${f(50 + r * Math.sin(start))} ${f(50 - r * Math.cos(start))} A ${r} ${r} 0 ${large} 1 ${f(50 + r * Math.sin(end))} ${f(50 - r * Math.cos(end))}`;
}

/** Tick ring line data for the printed-scale skins. */
function tickLines(count: number, inner: number, outer: number): string {
  const parts: string[] = [];
  for (let i = 0; i < count; i++) {
    const a = ((-135 + (270 / (count - 1)) * i) * Math.PI) / 180;
    const f = (n: number) => Number(n.toFixed(3));
    parts.push(
      `M ${f(50 + inner * Math.sin(a))} ${f(50 - inner * Math.cos(a))} L ${f(50 + outer * Math.sin(a))} ${f(50 - outer * Math.cos(a))}`,
    );
  }
  return parts.join(" ");
}

export interface KnobFaceProps {
  variant: KnobVariant;
  /** Normalized 0..1. */
  value: number;
  size: number;
  trackColor: string;
  valueColor: string;
}

/** A full-size concentric wrapper rotated to the value angle; whatever sits
    at its top-centre becomes the pointer. Rotation pivots the frame centre,
    which is the knob centre because the wrapper is concentric. */
function Pointer({ angle, children }: { angle: number; children?: import("react").ReactNode }) {
  return (
    <View
      className="absolute inset-0 items-center"
      style={{ rotate: angle, pointerEvents: "none" }}
    >
      {children}
    </View>
  );
}

// ── the faces ───────────────────────────────────────────────────────────

function InstrumentFace({ value, size, trackColor, valueColor }: KnobFaceProps) {
  const angle = -135 + 270 * clamp01(value);
  const inset = size * 0.15;

  return (
    <>
      <Svg viewBox="0 0 100 100" className="absolute inset-0">
        <SvgPath d={arcPath(1)} stroke={trackColor} strokeWidth={8} strokeCap="round" fill="none" />
        <SvgPath d={arcPath(value)} stroke={valueColor} strokeWidth={8} strokeCap="round" fill="none" />
      </Svg>
      <View
        className="absolute rounded-full"
        style={{
          left: inset, top: inset, right: inset, bottom: inset,
          gradientType: "radial",
          gradientStops: [
            { offset: 0, color: "#34342F" },
            { offset: 0.65, color: "#1B1B1A" },
            { offset: 1, color: "#161616" },
          ],
          boxShadow: [
            { color: "#00000099", radius: 14, offsetY: 6 },
            { color: "#FFFFFF1A", radius: 1, offsetY: 1, inset: true },
          ],
        }}
      />
      <Pointer angle={angle}>
        <View
          className="rounded-[2]"
          style={{ marginTop: size * 0.19, width: 3, height: size * 0.24, backgroundColor: "#EDEDE8" }}
        />
      </Pointer>
    </>
  );
}

function MetalFace({ value, size, valueColor }: KnobFaceProps) {
  const angle = -135 + 270 * clamp01(value);
  const inset = size * 0.13;
  const screw = Math.max(10, size * 0.16);

  return (
    <>
      {/* knurled rim: hard-stop conic pair tiled around the circle */}
      <View
        className="absolute inset-0 rounded-full"
        style={{
          gradientType: "conic",
          gradientRepeat: 45,
          gradientStops: [
            { offset: 0, color: "#8F939A" },
            { offset: 0.5, color: "#8F939A" },
            { offset: 0.5, color: "#D7DADE" },
            { offset: 1, color: "#D7DADE" },
          ],
          boxShadow: [
            { color: "#14161A8C", radius: 14, offsetY: 7 },
            { color: "#FFFFFFB3", radius: 1, offsetY: 1, inset: true },
          ],
        }}
      />
      <View
        className="absolute rounded-full border"
        style={{
          left: inset, top: inset, right: inset, bottom: inset,
          borderColor: "#6B6F76",
          gradientType: "radial",
          gradientStops: [
            { offset: 0, color: "#F3F4F6" },
            { offset: 0.58, color: "#B3B7BD" },
            { offset: 1, color: "#83878E" },
          ],
          boxShadow: [{ color: "#14161A59", radius: 4, offsetY: -2, inset: true }],
        }}
      />
      <Pointer angle={angle}>
        <View style={{ marginTop: size * 0.17, width: 3, height: size * 0.25, backgroundColor: valueColor }} />
      </Pointer>
      {/* centre screw with a slot */}
      <View
        className="absolute rounded-full border items-center justify-center"
        style={{
          left: "50%", top: "50%", width: screw, height: screw,
          translateX: -screw / 2, translateY: -screw / 2,
          borderColor: "#5F636A",
          gradientType: "linear", gradientAngle: 135,
          gradientStops: [{ offset: 0, color: "#D7DADE" }, { offset: 1, color: "#83878E" }],
          pointerEvents: "none",
        }}
      >
        <View style={{ width: screw - 3, height: 1.6, backgroundColor: "#4C5057", rotate: 38 }} />
      </View>
    </>
  );
}

function SteelFace({ value, size, valueColor }: KnobFaceProps) {
  const angle = -135 + 270 * clamp01(value);
  const inset = size * 0.13;
  void valueColor; // machined pointer stays dark steel, like the gallery

  // The gallery's 15-stop turned conic, from 118°.
  const spun = [
    "#6E737B", "#CFD3D9", "#7C8189", "#E9EBEF", "#767B83", "#C3C7CD", "#676C74",
    "#DFE2E6", "#71767E", "#CDD1D7", "#7A7F87", "#EEF0F3", "#6B7078", "#D5D8DD", "#6E737B",
  ].map((color, i, all) => ({ offset: i / (all.length - 1), color }));

  return (
    <>
      <Svg viewBox="0 0 100 100" className="absolute inset-0">
        <SvgPath d={tickLines(13, 43, 48)} stroke="#3B3E44" strokeWidth={2} strokeCap="round" fill="none" />
      </Svg>
      <View
        className="absolute rounded-full border"
        style={{
          left: inset, top: inset, right: inset, bottom: inset,
          borderColor: "#74787F",
          backgroundLayers: [
            {
              gradientType: "radial",
              gradientStops: [
                { offset: 0, color: "#FFFFFF6E" },
                { offset: 0.42, color: "#FFFFFF00" },
                { offset: 1, color: "#FFFFFF00" },
              ],
            },
            { gradientType: "conic", gradientAngle: 118, gradientStops: spun },
          ],
          boxShadow: [
            { color: "#FFFFFFD9", radius: 1, offsetY: 1, inset: true },
            { color: "#00000040", radius: 4, offsetY: -2, inset: true },
            { color: "#14161A59", radius: 3, offsetY: 2 },
            { color: "#14161A47", radius: 14, offsetY: 8 },
          ],
        }}
      />
      <Pointer angle={angle}>
        <View
          className="rounded-[2]"
          style={{
            marginTop: size * 0.19,
            width: 2.5,
            height: size * 0.18,
            gradientType: "linear",
            gradientStops: [{ offset: 0, color: "#17181B" }, { offset: 1, color: "#3A3D43" }],
            boxShadow: [{ color: "#FFFFFF80", radius: 1, offsetY: 1 }],
          }}
        />
      </Pointer>
    </>
  );
}

function GaugeFace({ value, trackColor, valueColor }: KnobFaceProps) {
  return (
    <Svg viewBox="0 0 100 100" className="absolute inset-0">
      <SvgPath d={arcPath(1, 44)} stroke={trackColor} strokeWidth={4} strokeCap="round" fill="none" />
      <SvgPath d={arcPath(value, 44)} stroke={valueColor} strokeWidth={10} strokeCap="butt" fill="none" />
    </Svg>
  );
}

function GlassFace({ value, size }: KnobFaceProps) {
  const angle = -135 + 270 * clamp01(value);
  const inset = size * 0.16;
  const wedge = Math.max(10, size * 0.16);

  return (
    <>
      {/* the skirt */}
      <View
        className="absolute inset-0 rounded-full border-2"
        style={{
          borderColor: "#CED3DB",
          gradientType: "linear",
          gradientStops: [{ offset: 0, color: "#AEB5C1" }, { offset: 1, color: "#7D8592" }],
          boxShadow: [{ color: "#565D69", radius: 1, offsetY: 4 }],
        }}
      />
      {/* the dome */}
      <View
        className="absolute rounded-full border-2 items-center"
        style={{
          left: inset, top: inset, right: inset, bottom: inset,
          borderColor: "#7FB6F5",
          gradientType: "linear",
          gradientStops: [{ offset: 0, color: "#4B9DF0" }, { offset: 1, color: "#1B5CB8" }],
        }}
      >
        {/* gloss highlight */}
        <View
          className="absolute"
          style={{
            left: "16%", right: "16%", top: "7%", height: "40%",
            borderRadius: size * 0.2,
            gradientType: "linear",
            gradientStops: [{ offset: 0, color: "#FFFFFFE6" }, { offset: 1, color: "#FFFFFF0D" }],
          }}
        />
      </View>
      <Pointer angle={angle}>
        {/* wedge pointer: a clipped triangle, tip toward the centre.
            clipPolygon is a flat [x,y,…] array in percent of the frame. */}
        <View
          style={{
            marginTop: size * 0.14,
            width: wedge,
            height: wedge * 1.1,
            backgroundColor: "#FFFFFF",
            clipPolygon: [0, 0, 100, 0, 50, 100],
            boxShadow: [{ color: "#00000066", radius: 1, offsetY: 1 }],
          }}
        />
      </Pointer>
    </>
  );
}

function ChickenheadFace({ value, size }: KnobFaceProps) {
  const angle = -135 + 270 * clamp01(value);
  const inset = size * 0.17;
  const nose = size * 0.24;

  return (
    <>
      <Svg viewBox="0 0 100 100" className="absolute inset-0">
        <SvgPath d={tickLines(11, 41, 47)} stroke="#6E5A3E" strokeWidth={2.4} strokeCap="round" fill="none" />
      </Svg>
      <View
        className="absolute rounded-full border-2"
        style={{
          left: inset, top: inset, right: inset, bottom: inset,
          borderColor: "#17100A",
          gradientType: "radial",
          gradientStops: [
            { offset: 0, color: "#4C3A2B" },
            { offset: 0.72, color: "#221911" },
            { offset: 1, color: "#1B130C" },
          ],
          boxShadow: [{ color: "#281C1080", radius: 9, offsetY: 5 }],
        }}
      />
      <Pointer angle={angle}>
        {/* the chicken-head nose: tip pokes past the body edge toward the
            tick ring, wide base buried in the cap. clipPolygon is a flat
            [x,y,…] array in percent of the frame. The cream line is a
            sibling ON TOP of the nose base (children of a clipped node
            paint unclipped, so it must not live inside the pentagon). */}
        <View
          style={{
            position: "absolute",
            left: "50%",
            translateX: -nose / 2,
            top: size * 0.06,
            width: nose,
            height: size * 0.41,
            gradientType: "linear",
            gradientStops: [{ offset: 0, color: "#3E2E1F" }, { offset: 1, color: "#1D140D" }],
            clipPolygon: [50, 0, 100, 82, 78, 100, 22, 100, 0, 82],
          }}
        />
        <View
          className="rounded-[1]"
          style={{
            position: "absolute",
            left: "50%",
            translateX: -1.5,
            top: size * 0.23,
            width: 3,
            height: size * 0.17,
            backgroundColor: "#F4E9D4",
          }}
        />
      </Pointer>
    </>
  );
}

function NeonFace({ value, size, trackColor, valueColor }: KnobFaceProps) {
  const SEG = 20;
  const lit = clamp01(value);
  const r = size / 2 - 5;
  const w = 3.5;
  const h = 9;

  return (
    <>
      {Array.from({ length: SEG }, (_, i) => {
        const a = -135 + (270 * i) / (SEG - 1);
        const rad = (a * Math.PI) / 180;
        const on = i / (SEG - 1) <= lit;
        return (
          <View
            key={i}
            className="absolute rounded-[2]"
            style={{
              left: size / 2 + r * Math.sin(rad) - w / 2,
              top: size / 2 - r * Math.cos(rad) - h / 2,
              width: w,
              height: h,
              rotate: a,
              backgroundColor: on ? valueColor : trackColor,
              ...(on ? { boxShadow: [{ color: valueColor + "AA", radius: 7 }] } : {}),
            }}
          />
        );
      })}
    </>
  );
}

function BlueprintFace({ value, size, valueColor }: KnobFaceProps) {
  const angle = -135 + 270 * clamp01(value);

  return (
    <>
      <Svg viewBox="0 0 100 100" className="absolute inset-0">
        <SvgPath
          d="M 50 3 A 47 47 0 1 1 49.99 3"
          stroke="#EAF3FF80"
          strokeWidth={1}
          strokeDash="4 5"
          fill="none"
        />
        <SvgPath d="M 50 17 A 33 33 0 1 1 49.99 17" stroke="#EAF3FFD9" strokeWidth={1.4} fill="none" />
        <SvgPath d={arcPath(value, 47)} stroke={valueColor} strokeWidth={2.5} fill="none" />
      </Svg>
      <Pointer angle={angle}>
        <View style={{ marginTop: size * 0.18, width: 1.5, height: size * 0.32, backgroundColor: "#EAF3FF" }} />
      </Pointer>
      <View
        className="absolute rounded-full"
        style={{ left: "50%", top: "50%", width: 5, height: 5, translateX: -2.5, translateY: -2.5, backgroundColor: "#EAF3FF" }}
      />
    </>
  );
}

/** The face for a variant, or null for "arc" — whose whole look is the
    gesture container's own arc keys, exactly as it has always painted. */
export function KnobFace(props: KnobFaceProps) {
  switch (props.variant) {
    case "instrument": return <InstrumentFace {...props} />;
    case "gauge": return <GaugeFace {...props} />;
    case "metal": return <MetalFace {...props} />;
    case "steel": return <SteelFace {...props} />;
    case "glass": return <GlassFace {...props} />;
    case "chickenhead": return <ChickenheadFace {...props} />;
    case "neon": return <NeonFace {...props} />;
    case "blueprint": return <BlueprintFace {...props} />;
    default: return null;
  }
}
