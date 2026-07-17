import type { Metadata } from 'next'
import Link from 'next/link'
import styles from '../docs.module.css'
import { Code, Crumbs, Note, Pager } from '../ui'

export const metadata: Metadata = {
  title: 'Installation',
  description:
    'Requirements and installation: wire the vsreact JUCE module into your CMake build and add @vsreact/core to your UI project.',
}

export default function Page() {
  return (
    <article className={styles.article}>
      <Crumbs slug="installation" />
      <h1>Installation</h1>
      <p className={styles.lead}>
        VSReacT is two installs: a JUCE module linked into your plugin’s CMake build, and a
        TypeScript package for the UI code. Both live in the same repository.
      </p>

      <h2 id="requirements">Requirements</h2>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>TOOL</th>
            <th>VERSION</th>
            <th>USED FOR</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>CMake</td>
            <td>3.22+</td>
            <td>Building the module, the example, and the test suites.</td>
          </tr>
          <tr>
            <td>C++ toolchain</td>
            <td>C++17</td>
            <td>MSVC 2022, Xcode/clang, or gcc. All three are exercised in CI.</td>
          </tr>
          <tr>
            <td>JUCE</td>
            <td>8</td>
            <td>
              A local checkout, passed to CMake as <code>JUCE_SOURCE_DIR</code>.
            </td>
          </tr>
          <tr>
            <td>Bun</td>
            <td>1.x</td>
            <td>Installing and bundling the TypeScript UI (fast, zero-config TSX).</td>
          </tr>
        </tbody>
      </table>
      <p>
        QuickJS-ng (v0.15.1) and Yoga (v2.0.1) are vendored under{' '}
        <code>vsreact/third_party/</code> — nothing to install, no network access at build
        time.
      </p>

      <h2 id="clone">1. Get the repository</h2>
      <Code title="shell">{`git clone https://github.com/N9RecordsTechnologiesIL/VSReacT.git
cd VSReacT`}</Code>

      <h2 id="cmake">2. Wire the module into your plugin</h2>
      <p>
        VSReacT builds as a static JUCE module through CMake. Add the directory and link the{' '}
        <code>vsreact</code> target — it brings QuickJS, Yoga, and the required JUCE module
        dependencies (<code>juce_gui_extra</code>, <code>juce_audio_processors</code>) with
        it.
      </p>
      <Code title="CMakeLists.txt">{`add_subdirectory(path/to/VSReacT/vsreact vsreact-build)

target_link_libraries(MyPlugin PRIVATE vsreact)`}</Code>

      <h2 id="ts">3. Install the TypeScript package</h2>
      <p>
        <code>@vsreact/core</code> lives at <code>vsreact/js</code>. Point your UI project at
        it with a workspace or file dependency:
      </p>
      <Code title="package.json">{`{
  "dependencies": {
    "@vsreact/core": "file:path/to/VSReacT/vsreact/js",
    "react": "^18.3.1"
  }
}`}</Code>
      <Note>
        <strong>Windows note:</strong> Bun resolves local packages most reliably through a
        workspace root (a top-level <code>package.json</code> with a <code>workspaces</code>{' '}
        array) rather than <code>file:</code> links inside nested folders.
      </Note>
      <p>
        That’s the whole install. Next, prove it works:{' '}
        <Link href="/docs/quick-start">build the gain example</Link>.
      </p>

      <Pager current="installation" />
    </article>
  )
}
