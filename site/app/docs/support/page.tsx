import type { Metadata } from 'next'
import styles from '../docs.module.css'
import { Crumbs, Pager } from '../ui'
import { REPO, STASH } from '../../variants/content'

export const metadata: Metadata = {
  title: 'Support & license',
  description: 'Where to get help, report issues, and what the MIT license covers.',
}

export default function Page() {
  return (
    <article className={styles.article}>
      <Crumbs slug="support" />
      <h1>Support &amp; license</h1>
      <p className={styles.lead}>
        VSReacT is built in the open by N9 Records Technologies and proven in production by
        StashTrack.
      </p>

      <h2 id="channels">Get help</h2>
      <ul>
        <li>
          <strong>Source &amp; issues</strong> —{' '}
          <a href={REPO}>{REPO.replace('https://', '')}</a> — bug reports and feature
          requests welcome.
        </li>
        <li>
          <strong>Email</strong> —{' '}
          <a href="mailto:vsreact-support@n9records.com">vsreact-support@n9records.com</a>
        </li>
        <li>
          <strong>See it shipping</strong> — <a href={STASH}>StashTrack</a>, a production
          VST3 whose entire UI is a VSReacT app.
        </li>
      </ul>

      <h2 id="license">License</h2>
      <p>
        The VSReacT framework is <strong>MIT</strong>, © N9 Records Technologies. Vendored
        third-party engines keep their own permissive licenses under{' '}
        <code>vsreact/third_party/</code> (QuickJS-ng: MIT, Yoga: MIT). JUCE has its own
        commercial/GPL terms you must satisfy for plugin distribution.
      </p>

      <Pager current="support" />
    </article>
  )
}
