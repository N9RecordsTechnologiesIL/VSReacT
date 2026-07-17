'use client'

// Docs search — a Ctrl+K quick-switcher over every page and section
// (titles, headings, keywords from nav.ts). Static-export friendly:
// the index ships with the bundle, no server needed.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import styles from './docs.module.css'
import { DOCS, hrefFor } from './nav'

interface Result {
  href: string
  page: string
  group: string
  heading: string | null
  score: number
}

function buildResults(query: string): Result[] {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean)
  if (words.length === 0) return []

  const results: Result[] = []

  for (const page of DOCS) {
    const title = page.title.toLowerCase()
    const group = page.group.toLowerCase()
    const keywords = page.keywords.toLowerCase()
    const base = hrefFor(page)

    const pageHaystack = `${title} ${group} ${keywords}`
    const pageMatches = words.every((w) => pageHaystack.includes(w))
    if (pageMatches) {
      const score =
        (words.every((w) => title.includes(w)) ? 6 : 0) +
        (words.some((w) => title.includes(w)) ? 2 : 0) +
        1
      results.push({ href: base, page: page.title, group: page.group, heading: null, score })
    }

    for (const [id, label] of page.headings) {
      const heading = label.toLowerCase()
      const headingHaystack = `${heading} ${title} ${keywords}`
      if (!words.every((w) => headingHaystack.includes(w))) continue
      if (!words.some((w) => heading.includes(w))) continue

      const score = (words.every((w) => heading.includes(w)) ? 5 : 3) + 1
      results.push({
        href: `${base}#${id}`,
        page: page.title,
        group: page.group,
        heading: label,
        score,
      })
    }
  }

  return results.sort((a, b) => b.score - a.score).slice(0, 10)
}

export function Search() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  const results = useMemo(() => buildResults(query), [query])

  const close = useCallback(() => {
    setOpen(false)
    setQuery('')
    setSelected(0)
  }, [])

  const go = useCallback(
    (href: string) => {
      close()
      router.push(href)
    },
    [close, router],
  )

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setOpen((v) => !v)
      } else if (e.key === 'Escape') {
        close()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [close])

  useEffect(() => {
    if (open) inputRef.current?.focus()
  }, [open])

  useEffect(() => {
    setSelected(0)
  }, [query])

  return (
    <>
      <button
        type="button"
        className={styles.searchBtn}
        onClick={() => setOpen(true)}
        aria-label="Search the documentation"
      >
        <svg viewBox="0 0 24 24" width="13" height="13" aria-hidden="true">
          <circle cx="10.5" cy="10.5" r="6.5" fill="none" stroke="currentColor" strokeWidth="2.4" />
          <path d="M15.5 15.5 L21 21" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
        </svg>
        <span>SEARCH</span>
        <kbd>CTRL K</kbd>
      </button>

      {open ? (
        <div className={styles.searchOverlay} onClick={close} role="presentation">
          <div
            className={styles.searchModal}
            role="dialog"
            aria-modal="true"
            aria-label="Search the documentation"
            onClick={(e) => e.stopPropagation()}
          >
            <input
              ref={inputRef}
              className={styles.searchInput}
              placeholder="Search the docs… (knob, hot reload, param:list)"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'ArrowDown') {
                  e.preventDefault()
                  setSelected((s) => Math.min(results.length - 1, s + 1))
                } else if (e.key === 'ArrowUp') {
                  e.preventDefault()
                  setSelected((s) => Math.max(0, s - 1))
                } else if (e.key === 'Enter' && results[selected]) {
                  go(results[selected].href)
                }
              }}
            />
            <div className={styles.searchList}>
              {results.map((result, index) => (
                <button
                  type="button"
                  key={result.href}
                  className={`${styles.searchRow} ${index === selected ? styles.searchRowOn : ''}`}
                  onMouseEnter={() => setSelected(index)}
                  onClick={() => go(result.href)}
                >
                  <span className={styles.searchGroup}>{result.group}</span>
                  <span className={styles.searchTitle}>
                    {result.page}
                    {result.heading ? <em> › {result.heading}</em> : null}
                  </span>
                  <span className={styles.searchEnter} aria-hidden="true">
                    ↵
                  </span>
                </button>
              ))}
              {query && results.length === 0 ? (
                <p className={styles.searchEmpty}>
                  Nothing for “{query}” — try “knob”, “install”, or “hot reload”.
                </p>
              ) : null}
              {!query ? (
                <p className={styles.searchEmpty}>
                  Type to search every page and section. ↑↓ to move, Enter to open.
                </p>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </>
  )
}
