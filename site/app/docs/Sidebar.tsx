'use client'

import { Fragment } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import styles from './docs.module.css'
import { DOCS, hrefFor } from './nav'

const normalize = (path: string) => (path.endsWith('/') && path !== '/' ? path.slice(0, -1) : path)

export function Sidebar() {
  const pathname = normalize(usePathname() ?? '')
  let lastGroup = ''

  return (
    <nav className={styles.side} aria-label="Documentation">
      {DOCS.map((page) => {
        const href = hrefFor(page)
        const heading =
          page.group !== lastGroup ? <span className={styles.sideGroup}>{page.group}</span> : null
        lastGroup = page.group

        // Fragment, not a display:contents wrapper: `contents` hides the div
        // from the box tree but not the DOM, so .sideGroup:first-child matched
        // inside every wrapper and every group heading lost its top margin.
        return (
          <Fragment key={href}>
            {heading}
            <Link
              href={href}
              className={pathname === href ? styles.active : undefined}
              aria-current={pathname === href ? 'page' : undefined}
            >
              {page.title}
            </Link>
          </Fragment>
        )
      })}
    </nav>
  )
}
