import "./globals.css";
import { AuthProvider } from "@/contexts/AuthContext";

export const metadata = {
  title: "clip.studio - Ultra-Fast AI Viral Shorts Studio",
  description: "Extract 35-40s viral vertical 9:16 shorts from YouTube videos in seconds with smart speaker framing and custom text overlays.",
  verification: {
    google: "94RJZPLf9raobhEzHv0irDIvlb908Vwpv3WLRY_w1Nc",
  },
  icons: {
    icon: [
      { url: '/favicon.png', type: 'image/png' },
      { url: '/favicon.ico' },
      { url: '/logo.png', type: 'image/png' },
    ],
    shortcut: '/favicon.png',
    apple: '/favicon.png',
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="h-full antialiased">
      <head>
        <meta name="google-site-verification" content="94RJZPLf9raobhEzHv0irDIvlb908Vwpv3WLRY_w1Nc" />
        <link rel="icon" href="/favicon.png" type="image/png" sizes="any" />
        <link rel="shortcut icon" href="/favicon.png" type="image/png" />
        <link rel="apple-touch-icon" href="/favicon.png" />
      </head>
      <body suppressHydrationWarning className="min-h-full flex flex-col bg-[#1d2125] text-[#f6f7f8]">
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
