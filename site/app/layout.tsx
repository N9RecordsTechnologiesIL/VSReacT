import type { Metadata, Viewport } from 'next'
import { Anton, Archivo, JetBrains_Mono } from 'next/font/google'
import './globals.css'

const archivo = Archivo({ variable: '--font-archivo', subsets: ['latin'], display: 'swap' })
const anton = Anton({ variable: '--font-anton', subsets: ['latin'], weight: '400', display: 'swap' })
const jbMono = JetBrains_Mono({ variable: '--font-jb', subsets: ['latin'], display: 'swap' })

export const metadata: Metadata = {
  metadataBase: new URL('https://vsreact.n9records.com'),
  title: 'VSReacT — This UI is React. Drag it.',
  description:
    'VSReacT is a React renderer for JUCE audio plugins: your TSX runs in an embedded QuickJS engine, a custom reconciler streams the tree to C++, Yoga lays it out, juce::Graphics paints every pixel. No webview.',
  alternates: { canonical: '/' },
  openGraph: {
    title: 'VSReacT — Write React. Ship native VST.',
    description:
      'A React renderer for JUCE plugins — hooks, utility classes, APVTS-bound knobs, hot reload in the DAW. No webview. Try the live demo.',
    url: 'https://vsreact.n9records.com',
    siteName: 'VSReacT',
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
  // favicon + apple icon come from app/icon.png and app/apple-icon.png
  // (the hue-shifted red logo), injected automatically by Next.
}

export const viewport: Viewport = {
  colorScheme: 'dark',
  themeColor: '#0b0b0a',
}

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${archivo.variable} ${anton.variable} ${jbMono.variable}`}>
      <body>{children}</body>
    </html>
  )
}
