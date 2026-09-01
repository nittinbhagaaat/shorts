import "./globals.css";

export const metadata = {
  title: "clip.studio - AI Viral Moments & Subtitle Studio",
  description: "Generate 35-40s vertical clips from YouTube videos with styled captions using Groq, Mistral, Gemini, and OpenAI.",
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
        <link rel="icon" href="/favicon.png" type="image/png" sizes="any" />
        <link rel="shortcut icon" href="/favicon.png" type="image/png" />
        <link rel="apple-touch-icon" href="/favicon.png" />
      </head>
      <body className="min-h-full flex flex-col bg-[#1d2125] text-[#f6f7f8]">
        {children}
      </body>
    </html>
  );
}
