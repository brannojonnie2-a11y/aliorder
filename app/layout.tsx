import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Track Your Order - Fast Delivery Tracking",
  description: "Track your package in real-time with fast language detection and multi-language support",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="bg-gray-100 min-h-screen">
        {children}
      </body>
    </html>
  );
}
