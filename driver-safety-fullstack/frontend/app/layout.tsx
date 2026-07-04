import type { Metadata } from "next";
// @ts-ignore: CSS side-effect import handled by Next.js
import "./globals.css";

export const metadata: Metadata = {
  title: "Driver Safety AI — Real-Time Driver Monitoring",
  description:
    "Advanced AI-powered monitoring system using MediaPipe, Computer Vision and Deep Learning to detect drowsiness, distraction, fatigue and unsafe driving behaviour.",
  keywords: ["driver safety", "AI monitoring", "drowsiness detection", "computer vision", "deep learning"],
  openGraph: {
    title: "Driver Safety AI",
    description: "Real-Time Driver Safety & Health Monitoring powered by AI",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="noise">{children}</body>
    </html>
  );
}
