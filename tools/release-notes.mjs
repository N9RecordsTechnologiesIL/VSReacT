// Sync GitHub release bodies from CHANGELOG.md, and publish the
// @vsreact/posthog release entry. Dry-run by default; pass --apply.
//
//   node tools/release-notes.mjs [--apply]
//
// Auth comes from the local git credential store (same PAT git push uses).
import { execSync } from 'node:child_process'
import { readFileSync } from 'node:fs'

const APPLY = process.argv.includes('--apply')
const REPO = 'N9RecordsTechnologiesIL/VSReacT'

const cred = execSync('git credential fill', {
  input: 'protocol=https\nhost=github.com\n\n',
}).toString()
const token = /password=(.+)/.exec(cred)[1].trim()

async function api(path, init = {}) {
  const res = await fetch(`https://api.github.com${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      ...(init.body ? { 'Content-Type': 'application/json' } : {}),
    },
  })
  if (!res.ok) throw new Error(`${init.method ?? 'GET'} ${path} -> ${res.status}: ${await res.text()}`)
  return res.json()
}

// ── split CHANGELOG.md into version -> section body ─────────────────────
const changelog = readFileSync(new URL('../CHANGELOG.md', import.meta.url), 'utf8')
const marks = [...changelog.matchAll(/^## (\d+\.\d+\.\d+) — .*$/gm)]
const sections = {}
marks.forEach((m, i) => {
  const end = i + 1 < marks.length ? marks[i + 1].index : changelog.length
  sections[m[1]] = changelog.slice(m.index + m[0].length, end).trim()
})
console.log(`changelog sections: ${Object.keys(sections).join(', ')}`)

// what's-new first, the standing install block after
const installBlock = (tag) => `---

### Install

\`\`\`sh
bun add @vsreact/core   # or npm install / yarn add / pnpm add
\`\`\`

Fetch the native JUCE module with CMake:

\`\`\`cmake
include(FetchContent)
FetchContent_Declare(vsreact
  GIT_REPOSITORY https://github.com/N9RecordsTechnologiesIL/VSReacT.git
  GIT_TAG        ${tag}
  SOURCE_SUBDIR  vsreact)
FetchContent_MakeAvailable(vsreact)
\`\`\`

Docs: https://vsreact.n9records.com/docs`

// ── sync core releases ──────────────────────────────────────────────────
const releases = await api(`/repos/${REPO}/releases?per_page=100`)
const byTag = new Map(releases.map((r) => [r.tag_name, r]))
for (const r of releases) {
  console.log(`  ${r.tag_name}: name=${JSON.stringify(r.name)} bodyLen=${(r.body ?? '').length}`)
}

for (const [ver, section] of Object.entries(sections)) {
  const tag = `v${ver}`
  const body = `${section}\n\n${installBlock(tag)}`
  const existing = byTag.get(tag)
  if (existing) {
    if ((existing.body ?? '').trim() === body) {
      console.log(`${tag}: up to date`)
      continue
    }
    console.log(`${tag}: ${APPLY ? 'patching' : 'would patch'} body (${(existing.body ?? '').length} -> ${body.length} chars)`)
    if (APPLY) await api(`/repos/${REPO}/releases/${existing.id}`, { method: 'PATCH', body: JSON.stringify({ body }) })
  } else {
    console.log(`${tag}: ${APPLY ? 'creating' : 'would create'} release (${body.length} chars)`)
    if (APPLY) await api(`/repos/${REPO}/releases`, { method: 'POST', body: JSON.stringify({ tag_name: tag, name: tag, body }) })
  }
}

// ── @vsreact/posthog 0.0.1 — its own entry, tagged at the v0.0.9 commit ─
const PH_TAG = 'posthog-v0.0.1'
const PH_BODY = `First release of the PostHog SDK for VSReacT plugins — published to npm as
[\`@vsreact/posthog\`](https://www.npmjs.com/package/@vsreact/posthog). Shipped alongside core v0.0.9.

- **\`posthog\`** client — posthog-js-shaped API (\`init\`, \`capture\`, \`identify\`,
  \`register\`, \`set\`, \`reset\`, \`flush\`) that batches in JS (flush at 10 events / 10s)
  and delivers through the native bridge. Every event carries \`distinct_id\`,
  \`$session_id\`, and lib metadata.
- **\`usePostHogParameters()\`** — the one-liner for plugin usage analytics: every host
  parameter change becomes one debounced \`parameter_changed {parameter_id, value, text}\`
  event per parameter.
- **\`useCaptureOnMount(event)\`** for panel/screen views, plus \`usePostHog()\`.
- Native side: **\`vsreact::PostHogBridge\`** — chain it in \`onNativeCall\`; answers
  \`posthog:config\` (persistent anonymous distinct id via an optional \`stateFile\`, host)
  and \`posthog:send\` (queues batches, posts \`{api_key, batch}\` to \`{host}/batch/\` on a
  background thread via \`juce::URL\`). The API key stays in C++.

Requires \`@vsreact/core\` >= 0.0.8 and the \`vsreact\` JUCE module from v0.0.9
(which introduced \`PostHogBridge\`). Docs: https://vsreact.n9records.com/docs/posthog
`

if (byTag.has(PH_TAG)) {
  console.log(`${PH_TAG}: already exists`)
} else {
  const at = await api(`/repos/${REPO}/commits/v0.0.9`)
  console.log(`${PH_TAG}: ${APPLY ? 'creating' : 'would create'} at v0.0.9 commit ${at.sha.slice(0, 7)}`)
  if (APPLY) {
    await api(`/repos/${REPO}/releases`, {
      method: 'POST',
      body: JSON.stringify({
        tag_name: PH_TAG,
        target_commitish: at.sha,
        name: '@vsreact/posthog v0.0.1',
        body: PH_BODY,
      }),
    })
  }
}
console.log(APPLY ? 'applied.' : 'dry run — re-run with --apply.')
