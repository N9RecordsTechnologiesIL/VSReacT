import type { Metadata } from 'next'
import styles from '../docs.module.css'
import { Code, Crumbs, Pager } from '../ui'

export const metadata: Metadata = {
  title: 'Reference-art workflow',
  description:
    'Ship a pixel-exact panel design as a real plugin UI: intern the plate with registerImage, lay invisible hit zones over it, cover the moving parts, and drive knobs with film strips.',
}

export default function Page() {
  return (
    <article className={styles.article}>
      <Crumbs slug="reference-art" />
      <h1>Reference-art workflow</h1>
      <p className={styles.lead}>
        Four of the example plugins don&apos;t draw their panels with components — they{' '}
        <em>are</em> the designer&apos;s render, shipped pixel-exact, with live parts
        patched on top. This guide distils that workflow: it&apos;s how you turn a Figma
        export, a web prototype, or a photograph of real hardware into a working plugin UI.
      </p>

      <h2 id="idea">The idea</h2>
      <p>
        One full-panel image (the <strong>plate</strong>) is the layout, the lighting, the
        texture — everything static. On top of it you place exactly three kinds of things:
        invisible <strong>hit zones</strong> that take the gestures, <strong>covers</strong>{' '}
        that hide a baked control at its default pose, and <strong>live parts</strong>{' '}
        (an indicator, a film-strip knob face, a readout) drawn where the covered pixels
        were. Everything is positioned in <em>plate space</em> — the image&apos;s own pixel
        coordinates — and multiplied by one scale factor at paint time, so measurements
        taken in your design tool transfer directly.
      </p>
      <Code title="the shape of every reference-art UI">{`const S = 0.5;                       // 1536x1024 plate -> 768x512 editor
const W = 1536 * S, H = 1024 * S;
const px = (n: number) => n * S;     // plate-px -> editor-px

<View style={{ width: W, height: H, position: "relative" }}>
  <Plate />                          {/* the art, whole */}
  {/* live parts, positioned in plate space */}
  {/* invisible hit zones LAST, so they sit on top */}
</View>`}</Code>

      <h2 id="plate">Ship the plate</h2>
      <p>
        Export the panel at exactly the pixel size you&apos;ll draw it at (a 1:1 blit always
        beats runtime rescaling; 2x and <code>S = 0.5</code> is the usual choice), encode it
        as <strong>lossless WebP</strong>, and inline it as a data URI at build time — a
        plugin has no file server to fetch from. Then intern it with{' '}
        <code>registerImage</code>: the bitmap decodes once into native memory and the
        bridge only ever carries a short <code>&quot;img:N&quot;</code> handle instead of
        megabytes of base64.
      </p>
      <Code title="ui/src/main.tsx">{`import { registerImage } from "@vsreact/core";
import { assets } from "./_assets";   // generated: build.ts inlines src/assets/

const plate = registerImage(assets["plate.webp"]);

function Plate() {
  return <Image src={plate} style={{
    position: "absolute", left: 0, top: 0, width: W, height: H, objectFit: "fill",
  }} />;
}`}</Code>
      <p>
        Export the plate with every control at its <strong>default pose</strong> — the UI
        then only has to draw differences, and a freshly opened editor is mostly just the
        photograph.
      </p>

      <h2 id="hits">Invisible hit zones</h2>
      <p>
        The visible knob is a photograph; the thing that takes the drag is a transparent{' '}
        <code>View</code> over it, bound through <code>useParamGestures</code> — vertical
        drag, double-click reset and wheel nudge, inside the <code>begin()</code>/
        <code>end()</code> automation gesture hosts need. Make hit zones larger and squarer
        than the drawn control; nobody ever complained a knob was too easy to grab.
      </p>
      <Code title="a knob that is a photo">{`function KnobHit({ id, cx, cy, size }: { id: string; cx: number; cy: number; size: number }) {
  const p = useParameter(id);
  return (
    <View
      style={{ position: "absolute", left: px(cx - size / 2), top: px(cy - size / 2),
               width: px(size), height: px(size), cursor: "ns-resize" }}
      {...useParamGestures(p)}
    />
  );
}`}</Code>
      <p>
        Render hit zones <em>after</em> everything else so no later sibling covers them —
        a panel can render perfectly and still be dead if a decorative layer eats the
        drags. The examples&apos; interaction tests exist precisely because this failure is
        invisible in a screenshot.
      </p>

      <h2 id="covers">Cover the moving parts</h2>
      <p>
        When a control moves, the plate&apos;s baked version of it is wrong. The trick is a{' '}
        <strong>Cover</strong>: a clipped window onto a <em>shifted</em> copy of the plate,
        so clean panel pixels from a blank region nearby paint over the baked mark — grain,
        lighting and all. Then draw the live part on top.
      </p>
      <Code title="the load-bearing ten lines">{`// A resampled patch of the plate clipped to rect (x,y,w,h) in plate space,
// shifted by (ox,oy) plate-px so clean pixels cover a baked mark underneath.
function Cover({ x, y, w, h, ox = 0, oy = 0 }) {
  return (
    <View style={{ position: "absolute", left: px(x), top: px(y),
                   width: px(w), height: px(h), overflow: "hidden" }}>
      <Image src={plate} style={{ position: "absolute",
        left: px(-x + ox), top: px(-y + oy), width: W, height: H, objectFit: "fill" }} />
    </View>
  );
}`}</Code>
      <p>
        Pick the shift so the source region is genuinely blank and shares the local
        lighting. When no blank region exists — the delay example&apos;s LED glass has a
        strong brightness gradient — erase the baked mark from the asset once at build
        time instead (the examples do per-column interpolation in a small{' '}
        <code>sharp</code> script) and skip the runtime cover entirely.
      </p>

      <h2 id="knobs">Film-strip knobs</h2>
      <p>
        A photoreal knob face that turns is a <strong>film strip</strong>: N pre-rendered
        rotation frames stacked in one lossless-WebP sprite, one frame shown at runtime.
        Bake it with <code>bakeKnobStrip</code> (or export frames from your DSCC/renderer),
        and show it with the built-in <code>FilmStripKnob</code> — which interns the strip
        via <code>registerImage</code>, so turning it ships one number over the bridge.
      </p>
      <Code title="bake once, turn forever">{`# build time — writes knob-strip.webp + knob-strip.json
bun run vsreact/js/src/tools/bakeKnobStrip.ts <outDir> 90 180

// runtime — the visible face; a KnobHit over it takes the gestures
<FilmStripKnob rotation={-135 + 270 * p.value} strip={knobStrip} displaySize={disc} />`}</Code>
      <p>
        Why not shade the knob live in JS? Measured: ~217ms per 180x180 frame under
        QuickJS. Bake at build time; the runtime shows pixels.
      </p>

      <h2 id="fonts">Readouts &amp; fonts</h2>
      <p>
        Live values need the design&apos;s typeface: <code>registerFont</code> a bundled
        OTF/TTF (also inlined as a data URI) and it resolves through{' '}
        <code>fontFamily</code> before any system lookup. Two style keys exist for exactly
        this job: <code>textLength</code> scales a line to a fixed width so digit readouts
        never shift layout, and <code>textStroke*</code> outlines glyphs like the printed
        panel. Derive the displayed value from the parameter&apos;s own host range —{' '}
        <code>normalizedToNatural(p.value, p)</code> — so nothing mirrors the APVTS in TS.
      </p>
      <Code title="a readout in the panel's own voice">{`registerFont({ family: "Panel Narrow", src: assets["narrow.otf"] });

const ms = normalizedToNatural(time.value, time);  // 1..1000 from the C++ range
<Text style={{ fontFamily: "Panel Narrow", fontSize: px(40),
               textLength: px(62), textAlign: "center", color: "#eee1d4" }}>
  {Math.round(ms)}
</Text>`}</Code>

      <h2 id="verify">Verify it moves</h2>
      <p>
        Screenshot-compare the editor against the design export — but don&apos;t stop
        there: hit-test each control point and assert the parameter actually changed, with
        the <code>param:begin</code>/<code>param:end</code> bracket around it. The
        examples&apos; <code>ExampleInteractionTests</code> are a ready-made template: they
        drive <code>vsreact::hitTest</code>, dispatch drag events, and check the APVTS
        write — because a reference-art panel can look perfect and be completely dead.
      </p>
      <p>
        For working code, read the four examples in{' '}
        <code>vsreact/examples/</code> — gain is the smallest complete instance of
        everything above; delay adds film strips and a seven-segment readout built from{' '}
        <code>clipPolygon</code> hexes.
      </p>

      <Pager current="reference-art" />
    </article>
  )
}
