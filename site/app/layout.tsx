import type { Metadata, Viewport } from 'next'
import { Space_Grotesk, JetBrains_Mono } from 'next/font/google'
import './globals.css'

const grotesk = Space_Grotesk({
  variable: '--font-grotesk',
  subsets: ['latin'],
  display: 'swap',
})

const mono = JetBrains_Mono({
  variable: '--font-mono',
  subsets: ['latin'],
  display: 'swap',
})

export const metadata: Metadata = {
  metadataBase: new URL('https://vsreact.n9records.com'),
  title: 'VSReacT — Write React. Ship native VST.',
  description:
    'VSReacT is a React renderer for JUCE audio plugins: your TSX runs in an embedded QuickJS engine, a custom reconciler streams the tree to C++, Yoga lays it out, and juce::Graphics paints every pixel. No webview.',
  openGraph: {
    title: 'VSReacT',
    description:
      'A React renderer for JUCE plugins — hooks, tailwind-style classes, APVTS-bound knobs, hot reload in the DAW. No webview.',
    type: 'website',
    images: [
      {
        url: '/logos/logo-text.jpeg',
        width: 1024,
        height: 1024,
        alt: 'VSReacT — a React atom with a waveform through its core',
      },
    ],
  },
}

export const viewport: Viewport = {
  colorScheme: 'dark',
  themeColor: '#050705',
}

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${grotesk.variable} ${mono.variable}`}>
      <body>{children}</body>
    </html>
  )
}
