'use client'

import { useState } from 'react'
import styles from './docs.module.css'

const MANAGERS = ['bun', 'npm', 'yarn', 'pnpm'] as const
type Manager = (typeof MANAGERS)[number]

/** Package-manager tabs, the way every real docs site shows an install. */
export function PmTabs({ commands }: { commands: Record<Manager, string> }) {
  const [active, setActive] = useState<Manager>('bun')

  return (
    <div className={styles.tabs}>
      <div className={styles.tabRow} role="tablist" aria-label="Package manager">
        {MANAGERS.map((m) => (
          <button
            key={m}
            role="tab"
            aria-selected={active === m}
            className={active === m ? styles.tabOn : undefined}
            onClick={() => setActive(m)}
          >
            {m}
          </button>
        ))}
      </div>
      <pre>
        <code>{commands[active]}</code>
      </pre>
    </div>
  )
}
