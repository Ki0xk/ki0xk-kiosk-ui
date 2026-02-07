import React from "react"
import type { Metadata, Viewport } from 'next'
import localFont from 'next/font/local'
import { Analytics } from '@vercel/analytics/next'
import './globals.css'

const pressStart2P = localFont({
  src: '../public/fonts/PressStart2P.woff2',
  weight: '400',
  variable: '--font-pixel',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Ki0xk',
  description: 'Tap. Pay. Settle.',
  generator: 'v0.app',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#0a0a1a',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className={`${pressStart2P.className} antialiased bg-background text-foreground min-h-screen overflow-hidden`}>
        {children}
        <Analytics />
      </body>
    </html>
  )
}
