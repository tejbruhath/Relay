import type { Metadata } from 'next'
import './globals.css'
import { ToastProvider } from '@/hooks/useToast'
import { ToastContainer } from '@/components/ui/Toast'

export const metadata: Metadata = {
  title: 'Relay — Webhook Delivery Infrastructure',
  description:
    'Relay handles outbound webhook delivery with retries, dead-lettering, and HMAC signing. Guaranteed delivery for your events.',
  keywords: ['webhooks', 'webhook delivery', 'hmac signing', 'event delivery', 'api infrastructure'],
  openGraph: {
    title: 'Relay — Deliver every signal. Miss nothing.',
    description:
      'Relay handles outbound webhook delivery with retries, dead-lettering, and HMAC signing — so you don\'t have to.',
    type: 'website',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body className="antialiased">
        <ToastProvider>
          {children}
          <ToastContainer />
        </ToastProvider>
      </body>
    </html>
  )
}
