import type { Metadata } from 'next'
import Link from 'next/link'
import styles from '../docs.module.css'
import { Code, Crumbs, Pager } from '../ui'

export const metadata: Metadata = {
  title: 'Components',
  description:
    'The five VSReacT primitives: View, Text, Image, TextInput, and the NativeView escape hatch.',
}

export default function Page() {
  return (
    <article className={styles.article}>
      <Crumbs slug="components" />
      <h1>Components</h1>
      <p className={styles.lead}>
        Five primitives cover the render surface. All of them accept <code>className</code>,{' '}
        <code>style</code>, and the pointer props listed in{' '}
        <Link href="/docs/events">Events &amp; gestures</Link>.
      </p>

      <h2 id="view">&lt;View&gt;</h2>
      <p>
        The flexbox container — the <code>div</code> of VSReacT. Backgrounds, borders,
        rounded corners, shadows, opacity, scroll containers, and knob arcs are all drawn on
        Views.
      </p>
      <Code title="TSX">{`<View className="flex-1 flex-row items-center gap-4 p-6
                 bg-zinc-900 rounded-xl border hover:bg-zinc-800">
  {children}
</View>`}</Code>

      <h2 id="text">&lt;Text&gt;</h2>
      <p>
        Draws strings and numbers. Font size, weight, family (<code>font-mono</code>),
        letter-spacing, line-height, alignment, and color come from classes or{' '}
        <code>style</code>. Text nodes measure themselves into the Yoga layout, so a{' '}
        <code>Text</code> sizes its container like you expect.
      </p>
      <Code title="TSX">{`<Text className="text-2xl font-bold tracking-tight text-center">
  {gainDb.toFixed(1)} dB
</Text>`}</Code>

      <h2 id="image">&lt;Image src&gt;</h2>
      <p>
        Paints an image from a file path or a <code>data:</code> URI, scaled to its layout
        box.
      </p>
      <Code title="TSX">{`<Image src={logoDataUri} className="w-24 h-24 rounded-full" />`}</Code>

      <h2 id="textinput">&lt;TextInput&gt;</h2>
      <p>
        A real, chrome-stripped <code>juce::TextEditor</code> positioned by Yoga — real
        caret, selection, and IME, while VSReacT paints the box, border, and focus ring
        around it.
      </p>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>PROP</th>
            <th>TYPE</th>
            <th>NOTES</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>
              <code>value</code> / <code>defaultValue</code>
            </td>
            <td>string</td>
            <td>Controlled or uncontrolled, exactly like the DOM.</td>
          </tr>
          <tr>
            <td>
              <code>placeholder</code>
            </td>
            <td>string</td>
            <td>
              Color via the <code>placeholderColor</code> style key.
            </td>
          </tr>
          <tr>
            <td>
              <code>disabled</code>
            </td>
            <td>boolean</td>
            <td>Blocks focus and input.</td>
          </tr>
          <tr>
            <td>
              <code>onChange</code> / <code>onSubmit</code>
            </td>
            <td>(value: string) =&gt; void</td>
            <td>Submit fires on Enter.</td>
          </tr>
          <tr>
            <td>
              <code>onFocus</code> / <code>onBlur</code>
            </td>
            <td>() =&gt; void</td>
            <td>
              Pair with <code>focus:</code> class variants for focus rings.
            </td>
          </tr>
        </tbody>
      </table>
      <Code title="TSX">{`<TextInput
  placeholder="Paste a link…"
  className="w-full p-3 rounded-lg bg-zinc-900 border
             focus:border-lime-400"
  style={{ caretColor: "#C6F135", placeholderColor: "#6b7280" }}
  onSubmit={(url) => native.call("download:start", { url })}
/>`}</Code>

      <h2 id="nativeview">&lt;NativeView nativeId&gt;</h2>
      <p>
        The escape hatch: mounts any <code>juce::Component</code> you registered in the{' '}
        <code>NativeRegistry</code> inside the React layout. React owns its position and
        size; JUCE owns its painting. Perfect for waveform displays, meters fed from the
        audio thread, or any legacy component you are not ready to rewrite.
      </p>
      <Code title="C++ + TSX">{`// C++ — register a factory
vsreact::NativeRegistry registry;
registry.registerFactory ("waveform", [this] {
    return std::make_unique<WaveformDisplay> (processor);
});

// TSX — position it with flexbox
<NativeView nativeId="waveform" className="flex-1 rounded-lg overflow-hidden" />`}</Code>

      <Pager current="components" />
    </article>
  )
}
