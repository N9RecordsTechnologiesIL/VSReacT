// Server-side building blocks shared by every docs page.

import Link from 'next/link'
import styles from './docs.module.css'
import { DOCS, hrefFor } from './nav'

export function Crumbs({ slug }: { slug: string }) {
  const page = DOCS.find((p) => p.slug === slug)
  return (
    <p className={styles.crumbs}>
      DOCS / <b>{page?.group ?? ''}</b>
    </p>
  )
}

export function Code({ title, children }: { title: string; children: string }) {
  return (
    <figure className={styles.codeBlock}>
      <figcaption className={styles.codeBlockBar}>{title}</figcaption>
      <pre>
        <code>{children}</code>
      </pre>
    </figure>
  )
}

export function Note({ children }: { children: React.ReactNode }) {
  return <div className={styles.note}>{children}</div>
}

/** Prev / next pagination, Colyseus-style, driven by the nav order. */
export function Pager({ current }: { current: string }) {
  const index = DOCS.findIndex((p) => p.slug === current)
  if (index === -1) return null
  const prev = index > 0 ? DOCS[index - 1] : null
  const next = index < DOCS.length - 1 ? DOCS[index + 1] : null

  return (
    <nav className={styles.pager} aria-label="Previous and next page">
      {prev ? (
        <Link className={styles.pagerLink} href={hrefFor(prev)}>
          <span className={styles.pagerLabel}>← PREVIOUS</span>
          <span className={styles.pagerTitle}>{prev.title}</span>
        </Link>
      ) : (
        <span />
      )}
      {next ? (
        <Link className={`${styles.pagerLink} ${styles.next}`} href={hrefFor(next)}>
          <span className={styles.pagerLabel}>NEXT →</span>
          <span className={styles.pagerTitle}>{next.title}</span>
        </Link>
      ) : null}
    </nav>
  )
}
