import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Таро Telegram Bot',
  description: 'Приложение для гадания на картах Таро',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ru">
      <body className="antialiased">{children}</body>
    </html>
  )
}
