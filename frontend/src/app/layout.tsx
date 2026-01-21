import type { Metadata } from 'next'
import './globals.css'
import { ChunkErrorHandler } from '@/components/ChunkErrorHandler'
import { AppBootstrap } from './AppBootstrap'

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
      <body className="antialiased">
        <ChunkErrorHandler />
        <AppBootstrap>{children}</AppBootstrap>
      </body>
    </html>
  )
}
