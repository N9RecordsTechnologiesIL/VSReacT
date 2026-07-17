import type { Metadata } from 'next'
import Link from 'next/link'
import styles from '../docs.module.css'
import { Code, Crumbs, Note, Pager } from '../ui'
import { PmTabs } from '../Tabs'
import { CORE_TARBALL, VERSION } from '../../version'

export const metadata: Metadata = {
  title: 'Installation',
  description:
    'Install @vsreact/core with bun, npm, yarn, or pnpm, and let CMake fetch the native JUCE module — no cloning, no relative paths.',
}

export default function Page() {
  return (
    <article className={styles.article}>
      <Crumbs slug="installation" />
      <h1>Installation</h1>
      <p className={styles.lead}>
        Two installs, each one copy-paste: the UI package through your package manager, the
        native module fetched by CMake. No cloning, no relative paths.
      </p>

      <h2 id="ui-package">1. The UI package</h2>
      <p>
        Add <code>@vsreact/core</code> to your UI project. It ships React 18 and the
        reconciler with it — no other dependencies to pick.
      </p>
      <PmTabs
        commands={{
          bun: `bun add ${CORE_TARBALL}`,
          npm: `npm install ${CORE_TARBALL}`,
          yarn: `yarn add ${CORE_TARBALL}`,
          pnpm: `pnpm add ${CORE_TARBALL}`,
        }}
      />
      <Note>
        The URL always resolves to the <strong>latest release</strong> of{' '}
        <code>@vsreact/core</code> — your lockfile pins the exact version you installed. To
        pin explicitly, use the versioned asset:{' '}
        <code>
          …/releases/download/v{VERSION}/vsreact-core-{VERSION}.tgz
        </code>
        . Registry publishing (<code>npm install @vsreact/core</code>) lands with a later
        release — the tarball is the identical artifact.
      </Note>

      <h2 id="native-module">2. The native module</h2>
      <p>
        Let CMake fetch the JUCE module at configure time — pinned to a tag, cached by the
        build directory. Put this after JUCE is added to your project (the module needs
        JUCE’s CMake API):
      </p>
      <Code title="CMakeLists.txt">{`include(FetchContent)

FetchContent_Declare(vsreact
    GIT_REPOSITORY https://github.com/N9RecordsTechnologiesIL/VSReacT.git
    GIT_TAG        v${VERSION}
    SOURCE_SUBDIR  vsreact)

FetchContent_MakeAvailable(vsreact)

target_link_libraries(MyPlugin PRIVATE vsreact)`}</Code>
      <p>
        That one block brings QuickJS, Yoga, and the module’s JUCE dependencies (
        <code>juce_gui_extra</code>, <code>juce_audio_processors</code>) with it. Nothing
        else to configure.
      </p>

      <h2 id="vendoring">Prefer vendoring?</h2>
      <p>
        A git submodule (or a plain checkout) works exactly the same way — point{' '}
        <code>add_subdirectory</code> at the <code>vsreact/</code> folder inside the repo:
      </p>
      <Code title="CMakeLists.txt (submodule alternative)">{`add_subdirectory(third_party/VSReacT/vsreact vsreact-build)
target_link_libraries(MyPlugin PRIVATE vsreact)`}</Code>

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
            <td>Building your plugin and fetching the module.</td>
          </tr>
          <tr>
            <td>C++ toolchain</td>
            <td>C++17</td>
            <td>MSVC 2022, Xcode/clang, or gcc. All three are exercised in CI.</td>
          </tr>
          <tr>
            <td>JUCE</td>
            <td>8</td>
            <td>Your plugin already has this — VSReacT plugs into it.</td>
          </tr>
          <tr>
            <td>Bun / Node</td>
            <td>Bun 1.x (or Node 18+)</td>
            <td>Installing and bundling the UI. The docs use Bun; any manager works.</td>
          </tr>
        </tbody>
      </table>
      <p>
        QuickJS-ng (v0.15.1) and Yoga (v2.0.1) are vendored inside the module — nothing to
        install, no network access at build time beyond the one CMake fetch.
      </p>
      <p>
        Installed? Prove it works: <Link href="/docs/quick-start">the quick start</Link>{' '}
        builds a running plugin in five minutes.
      </p>

      <Pager current="installation" />
    </article>
  )
}
