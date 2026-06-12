import './globals.css'

export const metadata = {
  title: 'NIT Goa RideShare',
  description: 'Campus ride pooling for NIT Goa students and staff',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
