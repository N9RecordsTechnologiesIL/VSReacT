import type { Metadata } from 'next'
import Link from 'next/link'
import type { ReactNode } from 'react'
import styles from './docs.module.css'
import { Sidebar } from './Sidebar'
import { REPO } from '../variants/content'

export const metadata: Metadata = {
  title: {
    default: 'Documentation — VSReacT',
    template: '%s — VSReacT Docs',
  },
  description:
    'The VSReacT manual: install the framework, build the example plugin, and learn the full JS and C++ API — components, styling, parameter binding, native messaging, hot reload.',
}

export default function DocsLayout({ children }: { children: ReactNode }) {
  return (
    <div className={styles.page}>
      <header className={styles.head}>
        <Link href="/" className={styles.mark} aria-label="VSReacT — back to the landing page">
          <b>VS</b>
          <svg viewBox="0 0 100 100" className={styles.markAtom} aria-hidden="true">
            <ellipse cx="50" cy="50" rx="46" ry="17" />
            <ellipse cx="50" cy="50" rx="46" ry="17" transform="rotate(60 50 50)" />
            <ellipse cx="50" cy="50" rx="46" ry="17" transform="rotate(-60 50 50)" />
            <circle cx="50" cy="50" r="9" className={styles.markCore} />
          </svg>
          <b>T</b>
        </Link>
        <span className={styles.crumb}>DOCS</span>
        <nav className={styles.headNav}>
          <Link className={styles.headLink} href="/">
            HOME
          </Link>
          <a className={styles.headLink} href="mailto:vsreact-support@n9records.com">
            SUPPORT
          </a>
          <a className={styles.headCta} href={REPO}>
            GITHUB
          </a>
        </nav>
      </header>
      <div className={styles.shell}>
        <Sidebar />
        {children}
      </div>
    </div>
  )
}
