// PlainGain, rendered natively. A full-plate photo of the hardware with the
// moving parts patched on top: the baked gold indicators sit at their default
// angle, so when a knob turns we cover the baked mark with resampled plate
// pixels and draw a live indicator over it. Invisible hit zones sit over the
// knobs; the visible knob IS the photo.

import { useState } from "react";
import { render, View, Image, Text, useParameter, useParamGestures } from "@vsreact/core";
import type { StyleValue } from "@vsreact/core";
import { assets } from "./_assets";
import { formatGain, gainRotation, knobRotation, normToGain } from "./parameters";

const S = 0.5;                 // 1536×1024 plate → 768×512 editor
const W = 1536 * S, H = 1024 * S;
const plate = assets["plate.webp"];
const px = (n: number) => n * S;

// The reference indicator's 5-stop metallic gold. Annotated StyleValue so the
// object-array satisfies the style bag's index signature.
const GOLD_STOPS: StyleValue = [
  { offset: 0, color: "#754a1e" }, { offset: 0.28, color: "#e9a348" },
  { offset: 0.52, color: "#ffd17b" }, { offset: 0.78, color: "#ba6f29" },
  { offset: 1, color: "#563312" },
];

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

// The gold pointer: a thin bar with the reference's 5-stop metallic gradient,
// rotated about the knob centre (expressed as a percent of the bar's frame).
function Indicator({ x, y, w, h, cx, cy, angle }: { x: number; y: number; w: number; h: number; cx: number; cy: number; angle: number }) {
  return (
    <View
      style={{
        position: "absolute", left: px(x), top: px(y), width: px(w), height: px(h),
        borderRadius: px(2),
        gradientType: "linear", gradientAngle: 90,
        gradientStops: GOLD_STOPS,
        shadowColor: "#000000e6", shadowRadius: px(2), shadowOffsetX: px(3), shadowOffsetY: px(4),
        rotate: angle,
        transformOriginX: `${((cx - x) / w) * 100}%`,
        transformOriginY: `${((cy - y) / h) * 100}%`,
      }}
    />
  );
}

// Transparent hit target over a knob. Vertical drag, double-click reset and
// wheel nudge — with the automation begin/end bracket — come from the SDK's
// headless useParamGestures.
function KnobHit({ id, cx, cy, size }: { id: string; cx: number; cy: number; size: number }) {
  const p = useParameter(id);
  return (
    <View
      style={{ position: "absolute", left: px(cx - size / 2), top: px(cy - size / 2), width: px(size), height: px(size), cursor: "ns-resize" }}
      {...useParamGestures(p)}
    />
  );
}

function App() {
  const gain = useParameter("gain");
  const pan = useParameter("pan");
  const [powered, setPowered] = useState(true);

  const gainDb = normToGain(gain.value);
  const panVal = pan.value * 2 - 1; // 0..1 → -1..1

  return (
    <View style={{ width: "100%", height: "100%", backgroundColor: "#050505", alignItems: "center", justifyContent: "center" }}>
      <View style={{ width: W, height: H, position: "relative" }}>
        <Plate />

        {/* GAIN: cover the baked pointer, draw the live one, resample readout */}
        <Cover x={465} y={388} w={20} h={73} ox={25} />
        <Indicator x={469} y={393} w={10} h={63} cx={474} cy={543} angle={gainRotation(gainDb)} />

        {/* PAN */}
        <Cover x={1046} y={395} w={20} h={67} ox={25} />
        <Indicator x={1050} y={400} w={10} h={58} cx={1055} cy={543} angle={knobRotation(panVal, -1, 1)} />

        {/* Live readout when moved (baked "0.0 dB" shows otherwise) */}
        {Math.abs(gainDb) >= 0.05 && (
          <>
            <Cover x={642} y={762} w={253} h={74} oy={-96} />
            <Text style={{ position: "absolute", left: px(642), top: px(768), width: px(253), height: px(60), fontSize: px(56), fontWeight: "bold", color: "#e9a348", textAlign: "center" }}>
              {formatGain(gainDb)}
            </Text>
          </>
        )}

        {/* Power glyph: gold when on (baked); dimmed patch + grey glyph when off */}
        {!powered && (
          <>
            <Cover x={1334} y={146} w={46} h={52} ox={-55} />
            <View style={{ position: "absolute", left: px(1345), top: px(150), width: px(24), height: px(28), borderRadius: px(12), borderWidth: px(3), borderColor: "#6b6b6b" }} />
          </>
        )}

        <KnobHit id="gain" cx={474} cy={543} size={300} />
        <KnobHit id="pan" cx={1055} cy={543} size={300} />
        <View
          style={{ position: "absolute", left: px(1330), top: px(140), width: px(60), height: px(60), cursor: "pointer" }}
          onClick={() => setPowered((v) => !v)}
        />
      </View>
    </View>
  );
}

render(<App />);
