import type { Metadata } from 'next'
import Link from 'next/link'
import styles from '../docs.module.css'
import { Code, Crumbs, Pager } from '../ui'
import { PmTabs } from '../Tabs'
import { VERSION } from '../../version'

export const metadata: Metadata = {
  title: 'Installation',
  description:
    'Install vsreact with bun, npm, yarn, or pnpm, and let CMake fetch the native JUCE module.',
}

export default function Page() {
  return (
    <article className={styles.article}>
      <Crumbs slug="installation" />
      <h1>Installation</h1>
      <p className={styles.lead}>
        Two moves: install the package, let CMake fetch the module. That’s it.
      </p>

      <h2 id="ui-package">1. The UI package</h2>
      <PmTabs
        commands={{
          bun: 'bun add @vsreact/core',
          npm: 'npm install @vsreact/core',
          yarn: 'yarn add @vsreact/core',
          pnpm: 'pnpm add @vsreact/core',
        }}
      />
      <p>
        That’s the whole JS side — <code>@vsreact/core</code> brings React 18 and the
        reconciler with it.
      </p>

      <h2 id="native-module">2. The native module</h2>
      <p>
        Add one block to your plugin’s <code>CMakeLists.txt</code>, after JUCE — CMake
        downloads the module at configure time, pinned to the tag:
      </p>
      <Code title="CMakeLists.txt">{`include(FetchContent)

FetchContent_Declare(vsreact
    GIT_REPOSITORY https://github.com/N9RecordsTechnologiesIL/VSReacT.git
    GIT_TAG        v${VERSION}
    SOURCE_SUBDIR  vsreact)

FetchContent_MakeAvailable(vsreact)

target_link_libraries(MyPlugin PRIVATE vsreact)`}</Code>
      <p>
        QuickJS, Yoga, and the module’s JUCE dependencies come along automatically. (A git
        submodule + <code>add_subdirectory(path/vsreact)</code> works the same, if you prefer
        vendoring.)
      </p>

      <h2 id="requirements">Requirements</h2>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>TOOL</th>
            <th>VERSION</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>CMake</td>
            <td>3.22+</td>
          </tr>
          <tr>
            <td>C++ toolchain</td>
            <td>C++17 — MSVC 2022, Xcode/clang, or gcc</td>
          </tr>
          <tr>
            <td>JUCE</td>
            <td>
              8 (8.0.4+ on Windows/macOS; 8.0.14+ on Linux — earlier Linux JUCE
              segfaults shaping text when a custom font is missing a glyph)
            </td>
          </tr>
          <tr>
            <td>Bun / Node</td>
            <td>Bun 1.x or Node 18+ — for installing and bundling the UI</td>
          </tr>
        </tbody>
      </table>

      <p>
        Done? <Link href="/docs/quick-start">The quick start</Link> gets you a running plugin
        in five minutes.
      </p>

      <Pager current="installation" />
    </article>
  )
}
