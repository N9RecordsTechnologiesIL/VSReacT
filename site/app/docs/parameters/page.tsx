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

gain.value   // 0..1, live — updates when the DAW automates it
gain.text    // host-formatted display text, e.g. "-3.2 dB"
gain.name    // parameter name from the APVTS
gain.label   // unit label, e.g. "dB"

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
        <code>&lt;ParamKnob paramId label? size? trackColor? valueColor? /&gt;</code> and{' '}
        <code>&lt;ParamSlider /&gt;</code> wrap <code>useParameter</code> with the natively
        painted <code>Knob</code>/<code>Slider</code>: arc or bar, host text in the middle,
        drag with correct begin/set/end gestures, label from the parameter name.
      </p>
      <Code title="TSX">{`<ParamKnob paramId="gain" size={88} />
<ParamKnob paramId="pan"  size={88} valueColor="#FF2E2E" />
<ParamSlider paramId="mix" width={220} />`}</Code>
      <p>
        The unbound <code>&lt;Knob value onChange /&gt;</code> and <code>&lt;Slider /&gt;</code>{' '}
        are exported too, for values that are not host parameters (UI zoom, list filters…).
      </p>

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
