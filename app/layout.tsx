import './globals.css'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'ZeroCord',
  description: 'A minimalistic communication platform',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
