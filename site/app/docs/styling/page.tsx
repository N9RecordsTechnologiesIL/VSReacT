import type { Metadata } from 'next'
import styles from '../docs.module.css'
import { Code, Crumbs, Note, Pager } from '../ui'

export const metadata: Metadata = {
  title: 'Styling',
  description:
    'The Tailwind-style class subset: layout, spacing, color, radius, typography, effects, hover/active/focus variants, theme tokens, and the style prop.',
}

export default function Page() {
  return (
    <article className={styles.article}>
      <Crumbs slug="styling" />
      <h1>Styling</h1>
      <p className={styles.lead}>
        Styling is a Tailwind-style utility subset, resolved <strong>in JS</strong> by the{' '}
        <code>tw()</code> resolver — C++ only ever sees final style objects. Classes compose
        left to right; unknown classes warn once in dev instead of failing.
      </p>

      <h2 id="classes">Supported classes</h2>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>FAMILY</th>
            <th>CLASSES</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Flexbox</td>
            <td>
              <code>flex-row</code> <code>flex-col</code> <code>flex-1</code>{' '}
              <code>flex-auto</code> <code>flex-none</code> <code>grow</code>{' '}
              <code>shrink-0</code> <code>flex-wrap</code> <code>items-*</code>{' '}
              <code>justify-*</code> <code>self-*</code> <code>basis-*</code>
            </td>
          </tr>
          <tr>
            <td>Sizing &amp; spacing</td>
            <td>
              <code>w-* h-*</code> <code>size-*</code> (width + height together){' '}
              <code>min-w-* max-h-*</code> <code>p-* px-* pt-*</code> <code>m-* mx-* mt-*</code>{' '}
              <code>gap-* gap-x-* gap-y-*</code> — 4px scale, fractions (<code>w-1/2</code>),{' '}
              <code>w-full</code>, arbitrary <code>w-[220]</code>, negatives{' '}
              <code>-mt-2 -left-1/2</code>
            </td>
          </tr>
          <tr>
            <td>Position</td>
            <td>
              <code>absolute</code> <code>relative</code> <code>inset-*</code>{' '}
              <code>inset-x-* inset-y-*</code> <code>top-* right-* bottom-* left-*</code>
            </td>
          </tr>
          <tr>
            <td>Color</td>
            <td>
              <code>bg-*</code> <code>text-*</code> <code>border-*</code> — the{' '}
              <strong>full Tailwind palette</strong> (all 22 families, 50–950), theme
              tokens, hex <code>bg-[#0B0B0A]</code>, opacity suffix <code>bg-black/40</code>
            </td>
          </tr>
          <tr>
            <td>Borders &amp; radius</td>
            <td>
              <code>border</code> <code>border-2</code> <code>rounded</code>{' '}
              <code>rounded-sm…3xl/full</code>, per corner <code>rounded-t-lg</code>{' '}
              <code>rounded-br-full</code>, arbitrary <code>rounded-[10]</code>
            </td>
          </tr>
          <tr>
            <td>Typography</td>
            <td>
              <code>text-xs…text-6xl</code> <code>text-[15]</code>{' '}
              <code>font-normal/medium/semibold/bold</code> <code>font-mono</code>{' '}
              <code>text-left/center/right</code> <code>tracking-*</code>{' '}
              <code>tracking-[3]</code> <code>leading-*</code>
            </td>
          </tr>
          <tr>
            <td>Effects</td>
            <td>
              <code>opacity-*</code> <code>shadow…shadow-xl</code>{' '}
              <code>overflow-hidden</code> <code>overflow-y-scroll</code>{' '}
              <code>aspect-square</code> <code>cursor-pointer/text/default</code>
            </td>
          </tr>
          <tr>
            <td>Variants</td>
            <td>
              <code>hover:</code> <code>active:</code> <code>focus:</code> — resolved to
              native hover/active/focus style layers, applied by the C++ hit-tester with no
              JS round-trip
            </td>
          </tr>
        </tbody>
      </table>

      <h2 id="cx">Composing classes — cx()</h2>
      <p>
        For conditional classNames the SDK ships <code>cx</code>, a tiny clsx: strings,
        arrays, and object maps, falsy values dropped.
      </p>
      <Code title="TSX">{`import { cx } from "@vsreact/core";

<View className={cx(
  "px-4 py-2 rounded-lg",
  active && "bg-lime-400",
  { "opacity-40": disabled },
)} />`}</Code>

      <h2 id="theme">Theme tokens</h2>
      <p>
        Register your palette once and use semantic names everywhere — the resolver expands
        them like any other color:
      </p>
      <Code title="theme.ts">{`import { configureTheme } from "@vsreact/core";

configureTheme({
  colors: {
    surface: "#0F1210",
    raised:  "#161B17",
    accent:  "#C6F135",
    text:    "#ECF2E8",
    faint:   "#8B948C",
  },
});

// then: <View className="bg-surface border-raised hover:bg-raised">
//       <Text className="text-accent" />`}</Code>

      <h2 id="style-prop">The style prop</h2>
      <p>
        For computed values, pass <code>style</code> directly — the same keys the resolver
        produces (<code>width</code>, <code>backgroundColor</code>, <code>fontSize</code>,{' '}
        <code>opacity</code>…). Classes and <code>style</code> merge, with{' '}
        <code>style</code> winning.
      </p>
      <Code title="TSX">{`<View
  className="rounded-full bg-zinc-800"
  style={{ width: size, height: size, opacity: fadeIn }}
/>`}</Code>

      <h2 id="arcs">Arc painting (knobs)</h2>
      <p>Two style families exist only as style keys:</p>
      <ul>
        <li>
          <strong>Arcs</strong> — <code>arcTrackColor</code>, <code>arcColor</code>,{' '}
          <code>arcStart</code>, <code>arcEnd</code>, <code>arcValueStart</code>,{' '}
          <code>arcValueEnd</code>, <code>arcThickness</code>: the natively painted knob
          arc, angles in degrees around the View’s center. The built-in <code>Knob</code>{' '}
          uses −135°…+135°; <code>arcValueStart</code> is what powers its bipolar mode.
          Strokes default to rounded caps, which turn short slices into capsule blobs —
          set <code>arcCap: &quot;butt&quot;</code> (since 0.0.18) for radial tick marks
          and crisp dashes.
        </li>
        <li>
          <strong>Text input chrome</strong> — <code>caretColor</code>,{' '}
          <code>placeholderColor</code>.
        </li>
      </ul>
      <Code title="a bare arc, no Knob component">{`<View
  className="items-center justify-center"
  style={{
    width: 72, height: 72,
    arcTrackColor: "#2A2F27", arcColor: "#C6F135",
    arcStart: -135, arcEnd: 135,
    arcValueEnd: -135 + 270 * value,
    arcThickness: 6,
  }}
/>`}</Code>
      <Note>
        <strong>Performance:</strong> the resolver caches by class string, so repeated
        renders of the same <code>className</code> cost one map lookup. Hover/active/focus
        variants repaint natively — the JS side is not involved after mount.
      </Note>

      <Pager current="styling" />
    </article>
  )
}
