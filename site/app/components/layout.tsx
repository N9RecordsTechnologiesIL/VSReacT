import type { Metadata } from 'next'
import type { ReactNode } from 'react'

export const metadata: Metadata = {
  title: 'Component Library — VSReacT',
  description:
    'Every VSReacT control, live: knobs, sliders, faders, toggles, XY pads, dropdowns, buttons, meters, visualizers, inputs, tooltips, and modals — interactive web twins of the natively painted components.',
  alternates: { canonical: '/components' },
}

export default function ComponentsLayout({ children }: { children: ReactNode }) {
  return children
}
