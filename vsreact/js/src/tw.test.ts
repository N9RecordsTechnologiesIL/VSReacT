import { describe, expect, test } from "bun:test";
import { configureTheme, tw } from "./tw";

describe("tw resolver", () => {
  test("layout, palette color, radius, border with opacity suffix", () => {
    const r = tw("flex-1 flex-row bg-zinc-950 rounded-xl border border-lime-400/20 p-4");
    expect(r.style).toEqual({
      flex: 1,
      flexDirection: "row",
      backgroundColor: "#09090b",
      borderRadius: 12,
      borderWidth: 1,
      borderColor: "#a3e63533",
      padding: 16,
    });
    expect(r.hoverStyle).toBeUndefined();
  });

  test("hover variant routes to hoverStyle", () => {
    const r = tw("bg-zinc-900 hover:bg-lime-300 active:bg-lime-500 focus:border-lime-400");
    expect(r.style).toEqual({ backgroundColor: "#18181b" });
    expect(r.hoverStyle).toEqual({ backgroundColor: "#bef264" });
    expect(r.activeStyle).toEqual({ backgroundColor: "#84cc16" });
    expect(r.focusStyle).toEqual({ borderColor: "#a3e635" });
  });

  test("theme tokens", () => {
    configureTheme({ colors: { accent: "#C6F135", well: "#0C0E0C" } });
    const r = tw("bg-well text-accent border-accent/35");
    expect(r.style.backgroundColor).toBe("#0c0e0c");
    expect(r.style.color).toBe("#c6f135");
    expect(r.style.borderColor).toBe("#c6f13559");
  });

  test("arbitrary values", () => {
    const r = tw("w-[123] h-[45%] bg-[#C6F135] p-[7]");
    expect(r.style).toEqual({
      width: 123,
      height: "45%",
      backgroundColor: "#c6f135",
      padding: 7,
    });
  });

  test("spacing scale, fractions, full, directional padding/margin", () => {
    const r = tw("w-full h-1/2 px-3 py-1.5 mt-2 -mb-1 gap-2 gap-x-4");
    expect(r.style).toEqual({
      width: "100%",
      height: "50%",
      paddingLeft: 12,
      paddingRight: 12,
      paddingTop: 6,
      paddingBottom: 6,
      marginTop: 8,
      marginBottom: -4,
      gap: 8,
      columnGap: 16,
    });
  });

  test("text utilities", () => {
    const r = tw("text-sm font-bold text-center text-zinc-400 leading-5 tracking-wide");
    expect(r.style).toEqual({
      fontSize: 14,
      fontWeight: 700,
      textAlign: "center",
      color: "#a1a1aa",
      lineHeight: 20,
      letterSpacing: 0.4,
    });
    expect(tw("font-mono").style).toEqual({ fontFamily: "monospace" });
  });

  test("arbitrary text sizes resolve; bracket hex stays a color", () => {
    expect(tw("text-[13]").style).toEqual({ fontSize: 13 });
    expect(tw("text-[8]").style).toEqual({ fontSize: 8 });
    expect(tw("text-[#ff4a38]").style).toEqual({ color: "#ff4a38" });
  });

  test("alignment, position, shadow, opacity, overflow, cursor", () => {
    const r = tw(
      "items-center justify-between absolute inset-0 top-2 shadow-lg opacity-50 overflow-hidden cursor-pointer",
    );
    expect(r.style).toEqual({
      alignItems: "center",
      justifyContent: "space-between",
      position: "absolute",
      left: 0,
      right: 0,
      bottom: 0,
      top: 8,
      shadowColor: "#00000066",
      shadowRadius: 12,
      shadowOffsetY: 4,
      opacity: 0.5,
      overflow: "hidden",
      cursor: "pointer",
    });
  });

  test("per-corner radius", () => {
    const r = tw("rounded-t-lg rounded-br-full");
    expect(r.style).toEqual({
      borderTopLeftRadius: 8,
      borderTopRightRadius: 8,
      borderBottomRightRadius: 9999,
    });
  });

  test("unknown classes are ignored", () => {
    const r = tw("bg-zinc-900 not-a-real-class");
    expect(r.style).toEqual({ backgroundColor: "#18181b" });
  });

  test("later classes win", () => {
    const r = tw("bg-zinc-900 bg-zinc-800");
    expect(r.style.backgroundColor).toBe("#27272a");
  });
});

describe("tw 0.0.3 additions", () => {
  test("full Tailwind palette resolves", () => {
    expect(tw("bg-blue-500").style.backgroundColor).toBe("#3b82f6");
    expect(tw("text-rose-400").style.color).toBe("#fb7185");
    expect(tw("border-slate-700").style.borderColor).toBe("#334155");
    expect(tw("bg-violet-950").style.backgroundColor).toBe("#2e1065");
    expect(tw("bg-teal-500/50").style.backgroundColor).toBe("#14b8a680");
  });

  test("size-* sets width and height together", () => {
    expect(tw("size-10").style).toEqual({ width: 40, height: 40 });
    expect(tw("size-[13]").style).toEqual({ width: 13, height: 13 });
    expect(tw("size-full").style).toEqual({ width: "100%", height: "100%" });
  });

  test("inset-x / inset-y", () => {
    expect(tw("inset-x-2").style).toEqual({ left: 8, right: 8 });
    expect(tw("inset-y-0").style).toEqual({ top: 0, bottom: 0 });
  });

  test("larger text sizes", () => {
    expect(tw("text-5xl").style.fontSize).toBe(48);
    expect(tw("text-6xl").style.fontSize).toBe(60);
  });
});

describe("negative spacing", () => {
  test("negative margins and offsets", () => {
    expect(tw("-mt-2").style).toEqual({ marginTop: -8 });
    expect(tw("-mx-[10]").style).toEqual({ marginLeft: -10, marginRight: -10 });
    expect(tw("-top-4").style).toEqual({ top: -16 });
  });

  test("negative percentages", () => {
    expect(tw("-left-1/2").style).toEqual({ left: "-50%" });
  });
});

describe("arbitrary letter spacing", () => {
  test("tracking-[n] is px", () => {
    expect(tw("tracking-[3]").style).toEqual({ letterSpacing: 3 });
    expect(tw("tracking-[1.5]").style).toEqual({ letterSpacing: 1.5 });
    expect(tw("-tracking-[2]").style).toEqual({ letterSpacing: -2 });
  });

  test("named scale still wins", () => {
    expect(tw("tracking-widest").style).toEqual({ letterSpacing: 1.6 });
  });
});
