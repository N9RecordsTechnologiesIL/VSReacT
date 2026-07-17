import type { Metadata } from 'next'
import styles from '../docs.module.css'
import { Code, Crumbs, Pager } from '../ui'

export const metadata: Metadata = {
  title: 'Audio parameters',
  description:
    'Two-way, automation-safe binding to the AudioProcessorValueTreeState: useParameter, ParamKnob/ParamSlider, and the ParameterBridge protocol.',
}

export default function Page() {
  return (
    <article className={styles.article}>
      <Crumbs slug="parameters" />
      <h1>Audio parameters</h1>
      <p className={styles.lead}>
        Parameter binding is two-way and automation-safe. C++ owns the truth (the{' '}
        <code>AudioProcessorValueTreeState</code>); JS reads, sets, and subscribes through{' '}
        <code>vsreact::ParameterBridge</code>. All values are normalized 0..1.
      </p>

      <h2 id="useparameter">useParameter(id)</h2>
      <Code title="TSX">{`const gain = useParameter("gain");

gain.value        // 0..1, live — updates when the DAW automates it
gain.text         // host-formatted display text, e.g. "-3.2 dB"
gain.name         // parameter name from the APVTS
gain.label        // unit label, e.g. "dB"
gain.defaultValue // the host's normalized default — double-click reset target

gain.begin();       // start an automation gesture
gain.set(0.75);     //   ...as many times as you like (drag)
gain.end();         // end the gesture — hosts record clean automation`}</Code>
      <p>
        Always bracket drags with <code>begin()</code>/<code>end()</code> — that is what
        makes host automation recording and touch/latch modes behave. The built-in controls
        do it for you.
      </p>

      <h2 id="controls">Ready-made controls</h2>
      <p>
        Every built-in control has a <code>Param*</code> twin that wraps{' '}
        <code>useParameter</code> with correct begin/set/end gestures and takes its label
        from the parameter name:
      </p>
      <Code title="TSX">{`<ParamKnob      paramId="gain" size={88} />
<ParamSlider    paramId="mix" width={220} />
<ParamSlider    paramId="level" vertical height={140} />   // fader
<ParamToggle    paramId="bypass" />                        // on = value ≥ 0.5
<ParamXYPad     paramX="cutoff" paramY="resonance" />      // two params, one drag
<ParamSegmented paramId="shape" options={["SINE", "SAW", "SQR"]} />
<ParamSelect    paramId="mode" options={MODES} />          // dropdown for long lists`}</Code>
      <ul>
        <li>
          <strong>ParamToggle</strong> — bool-style parameters; a click writes a full
          begin/set/end gesture so hosts record it cleanly.
        </li>
        <li>
          <strong>ParamXYPad</strong> — drives two parameters at once; both gestures open on
          drag-start and close on release.
        </li>
        <li>
          <strong>ParamSegmented</strong> — choice-style parameters; the normalized value
          maps to an option index (<code>index / (count − 1)</code>), matching{' '}
          <code>AudioParameterChoice</code>.
        </li>
      </ul>
      <p>
        The unbound versions (<code>Knob</code>, <code>Slider</code>, <code>Toggle</code>,{' '}
        <code>XYPad</code>, <code>Segmented</code>) are exported too, for values that are not
        host parameters — UI zoom, tab selection, list filters.
      </p>

      <h2 id="generic">The one-line editor</h2>
      <p>
        <code>useParameterList()</code> enumerates every parameter in the APVTS (via{' '}
        <code>param:list</code>), which makes a complete, working editor exactly one line:
      </p>
      <Code title="ui/src/main.tsx — an entire plugin UI">{`import { render, GenericEditor } from "@vsreact/core";

render(<GenericEditor />);`}</Code>
      <p>
        <code>&lt;GenericEditor columns? size? trackColor? valueColor? /&gt;</code> lays out
        one <code>ParamKnob</code> per parameter in rows — the fastest path from a processor
        to a usable UI, and a solid starting point you can replace control by control. For
        custom generic UIs, build on the hook directly:
      </p>
      <Code title="TSX">{`const params = useParameterList();
// [{ id, name, label, value, text }, …] — one entry per APVTS parameter

return params.map((p) => <ParamSlider key={p.id} paramId={p.id} />);`}</Code>

      <h2 id="wiring">C++ wiring</h2>
      <Code title="PluginEditor.h / .cpp">{`vsreact::ParameterBridge bridge { processor.apvts };

// 1. chain param:* calls first in onNativeCall
options.onNativeCall = [this] (const juce::String& name, const juce::var& args) -> juce::var {
    if (auto handled = bridge.handleNativeCall (name, args))
        return *handled;
    return {};
};

// 2. attach the RootView so DAW-side changes reach useParameter
bridge.attach (*root);`}</Code>
      <p>
        DAW-side changes (automation, preset loads, other UI) are coalesced on the message
        thread — the bridge is a <code>juce::AsyncUpdater</code>, so a burst of automation
        becomes one batched push per message-loop tick — and delivered to JS as{' '}
        <code>param</code> events. The <code>useParameter</code> hook subscribes for you.
      </p>

      <h2 id="protocol">The wire protocol</h2>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>MESSAGE</th>
            <th>PAYLOAD</th>
            <th>DIRECTION</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>
              <code>param:list</code>
            </td>
            <td>
              <code>{'{}'}</code> → <code>{'[{id, name, label, value, text}, …]'}</code>
            </td>
            <td>JS → C++ (enumeration)</td>
          </tr>
          <tr>
            <td>
              <code>param:get</code>
            </td>
            <td>
              <code>{'{id}'}</code> → <code>{'{value, text, name, label}'}</code>
            </td>
            <td>JS → C++</td>
          </tr>
          <tr>
            <td>
              <code>param:set</code>
            </td>
            <td>
              <code>{'{id, value}'}</code>
            </td>
            <td>JS → C++</td>
          </tr>
          <tr>
            <td>
              <code>param:begin</code> / <code>param:end</code>
            </td>
            <td>
              <code>{'{id}'}</code>
            </td>
            <td>JS → C++ (gesture brackets)</td>
          </tr>
          <tr>
            <td>
              <code>param</code> event
            </td>
            <td>
              <code>{'{id, value, text}'}</code>
            </td>
            <td>C++ → JS</td>
          </tr>
        </tbody>
      </table>

      <Pager current="parameters" />
    </article>
  )
}
