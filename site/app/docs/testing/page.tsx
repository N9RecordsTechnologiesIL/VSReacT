import type { Metadata } from 'next'
import styles from '../docs.module.css'
import { Code, Crumbs, Pager } from '../ui'

export const metadata: Metadata = {
  title: 'Testing',
  description:
    'Both halves ship with suites: bun test for the TypeScript package, JUCE UnitTest + CTest for the C++ module. CI runs Windows and macOS on every push.',
}

export default function Page() {
  return (
    <article className={styles.article}>
      <Crumbs slug="testing" />
      <h1>Testing</h1>
      <p className={styles.lead}>
        Both halves of the framework ship with suites that run in CI on every push — the
        reconciler and resolver in Bun, the shadow tree and painter as JUCE UnitTests.
      </p>

      <h2 id="ts">TypeScript</h2>
      <Code title="shell">{`cd vsreact/js && bun test
# reconciler host config, tw resolver, controls, animation`}</Code>
      <p>
        The host config tests render real React trees against a mock bridge and assert on
        the exact mutation ops — refactors that change the wire format fail loudly.
      </p>

      <h2 id="cpp">C++</h2>
      <Code title="shell">{`cmake -S ci -B ci/build -DJUCE_SOURCE_DIR=path/to/JUCE -DCMAKE_BUILD_TYPE=Release
cmake --build ci/build --config Release
ctest --test-dir ci/build -C Release`}</Code>
      <p>
        Covers style parsing, Yoga layout application, shadow-tree mutations, hit-testing,
        and the ParameterBridge (using its synchronous test hooks —{' '}
        <code>setEventSink</code> and <code>flushPendingEvents</code>).
      </p>

      <h2 id="ci">Continuous integration</h2>
      <p>
        <code>.github/workflows/ci.yml</code> builds the JS suite plus the native module on
        Windows (MSVC) and macOS (clang) for every push, against a fresh JUCE checkout. The
        example plugin builds as part of the native job, so API breaks surface immediately.
      </p>

      <Pager current="testing" />
    </article>
  )
}
