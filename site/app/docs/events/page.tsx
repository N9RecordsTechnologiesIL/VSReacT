import type { Metadata } from 'next'
import styles from '../docs.module.css'
import { Code, Crumbs, Pager } from '../ui'

export const metadata: Metadata = {
  title: 'Events & gestures',
  description:
    'Pointer events with DOM-style bubbling, drag gestures with pixel deltas, wheel-scroll containers, and per-node cursors.',
}

export default function Page() {
  return (
    <article className={styles.article}>
      <Crumbs slug="events" />
      <h1>Events &amp; gestures</h1>
      <p className={styles.lead}>
        The RootView hit-tests every mouse event into the shadow tree with DOM-style
        bubbling, maintains hover chains, and applies <code>hover:</code>/
        <code>active:</code> style layers natively — no JS round-trip for a hover repaint.
      </p>

      <h2 id="pointer">Pointer events</h2>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>PROP</th>
            <th>PAYLOAD</th>
            <th>NOTES</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>
              <code>onClick</code>
            </td>
            <td>—</td>
            <td>Fires on release over the pressed node.</td>
          </tr>
          <tr>
            <td>
              <code>onMouseEnter</code> / <code>onMouseLeave</code>
            </td>
            <td>—</td>
            <td>Hover chain, parent-to-child, like the DOM.</td>
          </tr>
          <tr>
            <td>
              <code>onMouseDown</code> / <code>onMouseUp</code>
            </td>
            <td>—</td>
            <td>
              Drive <code>active:</code> styles.
            </td>
          </tr>
          <tr>
            <td>
              <code>onDragStart</code> / <code>onDrag</code> / <code>onDragEnd</code>
            </td>
            <td>
              <code>{'{dx, dy, x, y}'}</code>
            </td>
            <td>
              Deltas from the drag origin plus the live pointer position, in root
              coordinates — everything a knob or an XY pad needs.
            </td>
          </tr>
        </tbody>
      </table>

      <h2 id="drag">Drag gestures</h2>
      <p>
        The built-in knob maps vertical drag to value with{' '}
        <code>dragToValue(startValue, dy)</code>. Rolling your own control is a few lines:
      </p>
      <Code title="a custom vertical fader">{`function Fader({ value, onChange }) {
  const start = useRef(0);

  return (
    <View
      className="w-10 h-40 bg-zinc-900 rounded-lg cursor-pointer"
      onDragStart={() => { start.current = value; }}
      onDrag={(e) => onChange(clamp01(start.current - e.dy / 160))}
    >
      <View
        className="absolute left-0 right-0 bottom-0 bg-lime-400 rounded-lg"
        style={{ height: \`\${value * 100}%\` }}
      />
    </View>
  );
}`}</Code>

      <h2 id="scroll">Scroll containers</h2>
      <p>
        Give a View <code>overflow-y-scroll</code> and a bounded height: children lay out at
        full size, the mouse wheel scrolls, the painter clips and draws a thumb. Set the{' '}
        <code>scrollTop</code> prop to reset the offset programmatically (say, when switching
        tabs).
      </p>
      <Code title="TSX">{`<View className="flex-1 overflow-y-scroll gap-2 p-3" scrollTop={0}>
  {items.map((item) => <Row key={item.id} item={item} />)}
</View>`}</Code>

      <h2 id="cursor">Cursors</h2>
      <p>
        Cursors come from classes — <code>cursor-pointer</code>, <code>cursor-text</code>,{' '}
        <code>cursor-default</code> — applied per-node by the hit-tester as the mouse moves.
      </p>

      <Pager current="events" />
    </article>
  )
}
