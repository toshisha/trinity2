import './globals.css'

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body style={{ fontFamily: 'Helvetica, sans-serif' }}>{children}</body>
    </html>
  )
}

