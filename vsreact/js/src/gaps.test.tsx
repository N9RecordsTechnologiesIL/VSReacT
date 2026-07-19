// 0.0.26 "honest gaps" round: selection opt-in, blur classes, transitions,
// animate-* presets, horizontal scroll surface.

import { beforeEach, describe, expect, test } from "bun:test";
import { useState } from "react";

const batches: unknown[][][] = [];
(globalThis as Record<string, any>).__vsreact_flush = (json: string) => {
  batches.push(JSON.parse(json));
};

import { render, unmount, View, Text } from "./index";
import { tw } from "./tw";
import {
  animationDurations,
  animationPresets,
  interpolateStyle,
  lerpHexColor,
  parseHexColor,
  transitionKeys,
} from "./transitions";

const allOps = () => batches.flat();
const opsNamed = (name: string) => allOps().filter((op: any) => op[0] === name);
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

beforeEach(() => {
  unmount();
  batches.length = 0;
});

describe("tw: 0.0.26 classes", () => {
  test("overflow-x and auto variants map to overflow scroll", () => {
    for (const cls of ["overflow-x-scroll", "overflow-x-auto", "overflow-auto", "overflow-y-auto"])
      expect(tw(cls).style.overflow).toBe("scroll");
  });

  test("select-text / select-none map to userSelect", () => {
    expect(tw("select-text").style.userSelect).toBe("text");
    expect(tw("select-none").style.userSelect).toBe("none");
  });

  test("blur scale, arbitrary blur, and backdrop-blur", () => {
    expect(tw("blur").style.blurRadius).toBe(8);
    expect(tw("blur-sm").style.blurRadius).toBe(4);
    expect(tw("blur-3xl").style.blurRadius).toBe(64);
    expect(tw("blur-[6]").style.blurRadius).toBe(6);
    expect(tw("backdrop-blur").style.backdropBlurRadius).toBe(8);
    expect(tw("backdrop-blur-xl").style.backdropBlurRadius).toBe(24);
    expect(tw("backdrop-blur-[10]").style.backdropBlurRadius).toBe(10);
  });

  test("transition groups, duration, delay, easing", () => {
    expect(tw("transition").style).toEqual({ transitionProperty: "default", transitionDuration: 150 });
    expect(tw("transition-colors").style.transitionProperty).toBe("colors");
    expect(tw("transition-none").style.transitionProperty).toBe("none");
    expect(tw("duration-300").style.transitionDuration).toBe(300);
    expect(tw("duration-[320]").style.transitionDuration).toBe(320);
    expect(tw("delay-75").style.transitionDelay).toBe(75);
    expect(tw("ease-out").style.transitionEasing).toBe("ease-out");
    expect(tw("ease-in-out").style.transitionEasing).toBe("ease-in-out");
  });

  test("animate presets carry name and default duration", () => {
    expect(tw("animate-spin").style).toEqual({ animationName: "spin", animationDuration: 1000 });
    expect(tw("animate-pulse").style.animationName).toBe("pulse");
    expect(tw("animate-bounce").style.animationName).toBe("bounce");
    expect(tw("animate-none").style.animationName).toBe("none");
  });
});

describe("transitions: pure helpers", () => {
  test("parseHexColor handles 6 and 8 digit hex only", () => {
    expect(parseHexColor("#ff0080")).toEqual([255, 0, 128, 255]);
    expect(parseHexColor("#ff008040")).toEqual([255, 0, 128, 64]);
    expect(parseHexColor("red")).toBeUndefined();
    expect(parseHexColor("#fff")).toBeUndefined();
    expect(parseHexColor(12)).toBeUndefined();
  });

  test("lerpHexColor midpoints and alpha promotion", () => {
    expect(lerpHexColor("#000000", "#ffffff", 0.5)).toBe("#808080");
    expect(lerpHexColor("#000000", "#ffffff", 0)).toBe("#000000");
    expect(lerpHexColor("#00000000", "#000000", 1)).toBe("#000000ff");
  });

  test("transitionKeys diffs only animatable changes in the group", () => {
    const prev = { opacity: 0, backgroundColor: "#000000", width: 10, flexDirection: "row" };
    const next = { opacity: 1, backgroundColor: "#ffffff", width: 20, flexDirection: "column" };

    expect(transitionKeys(prev, next, "all").sort()).toEqual(["backgroundColor", "opacity", "width"]);
    expect(transitionKeys(prev, next, "colors")).toEqual(["backgroundColor"]);
    expect(transitionKeys(prev, next, "opacity")).toEqual(["opacity"]);
    expect(transitionKeys(prev, next, "none")).toEqual([]);
    // default group: opacity+colors+transform, not width
    expect(transitionKeys(prev, next, "default").sort()).toEqual(["backgroundColor", "opacity"]);
  });

  test("transitionKeys skips keys missing an endpoint or non-animatable", () => {
    expect(transitionKeys({}, { opacity: 1 }, "all")).toEqual([]);
    expect(transitionKeys({ translateX: "50%" }, { translateX: "0%" }, "all")).toEqual([]);
  });

  test("interpolateStyle blends numbers and colors", () => {
    const patch = interpolateStyle(
      { opacity: 0, color: "#000000" },
      { opacity: 1, color: "#ffffff" },
      ["opacity", "color"],
      0.5,
    );
    expect(patch.opacity).toBeCloseTo(0.5, 5);
    expect(patch.color).toBe("#808080");
  });

  test("presets: spin is linear rotation, pulse dips to 0.5, bounce returns home", () => {
    expect(animationPresets.spin(0).rotate).toBe(0);
    expect(animationPresets.spin(0.25).rotate).toBe(90);
    expect(animationPresets.pulse(0).opacity).toBe(1);
    expect(animationPresets.pulse(0.5).opacity).toBe(0.5);
    expect(animationPresets.pulse(1).opacity).toBe(1);
    expect(animationPresets.bounce(0).translateY).toBe("0.00%");
    expect(String(animationPresets.bounce(0.5).translateY)).toBe("-25.00%");
    expect(animationDurations.spin).toBe(1000);
  });
});

describe("selection + scroll props through the bridge", () => {
  test("<Text selectable> lands userSelect:'text' in the style payload", () => {
    render(<Text selectable>copy me</Text>);

    const create: any = opsNamed("create").find((op: any) => op[2] === "text");
    const props: any = opsNamed("setProps").find((op: any) => op[1] === create[1]);
    expect(props[2].style.userSelect).toBe("text");
  });

  test("plain <Text> stays unselectable (no userSelect key)", () => {
    render(<Text>plain</Text>);

    const create: any = opsNamed("create").find((op: any) => op[2] === "text");
    const props: any = opsNamed("setProps").find((op: any) => op[1] === create[1]);
    expect(props[2].style.userSelect).toBeUndefined();
    expect(props[2].selectable).toBeUndefined(); // consumed, not forwarded
  });

  test("scrollLeft passes through like scrollTop", () => {
    render(<View className="overflow-x-scroll" scrollLeft={12} scrollTop={4} />);

    const props: any = opsNamed("setProps")[0];
    expect(props[2].scrollLeft).toBe(12);
    expect(props[2].scrollTop).toBe(4);
    expect(props[2].style.overflow).toBe("scroll");
  });
});

describe("transition engine end-to-end", () => {
  test("a style change with transitionDuration tweens instead of jumping", async () => {
    function Fader() {
      const [on, setOn] = useState(false);
      return (
        <View
          onClick={() => setOn(true)}
          style={{ opacity: on ? 1 : 0, transitionDuration: 60, transitionProperty: "all" }}
        />
      );
    }

    render(<Fader />);

    const create: any = opsNamed("create")[0];
    const nodeId = create[1];

    (globalThis as Record<string, any>).__vsreact_dispatch(
      JSON.stringify({ kind: "event", nodeId, type: "click" }),
    );

    await sleep(160);

    const styleOps = opsNamed("setProps")
      .filter((op: any) => op[1] === nodeId)
      .map((op: any) => op[2].style.opacity);

    // The commit lands at the old value, frames climb, the last hits 1 exactly.
    expect(styleOps[styleOps.length - 1]).toBe(1);
    expect(styleOps.some((o: number) => o > 0 && o < 1)).toBe(true);
  });

  test("animate-spin keeps emitting rotate frames until unmounted", async () => {
    render(<View className="animate-spin" />);

    const create: any = opsNamed("create")[0];
    const nodeId = create[1];

    await sleep(80);
    unmount();
    const count = opsNamed("setProps").filter(
      (op: any) => op[1] === nodeId && typeof op[2].style.rotate === "number",
    ).length;
    expect(count).toBeGreaterThan(2);

    batches.length = 0;
    await sleep(60);
    // no frames after unmount
    expect(opsNamed("setProps").filter((op: any) => op[1] === nodeId).length).toBe(0);
  });
});
