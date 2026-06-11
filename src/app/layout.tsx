import "./globals.css";
import React from "react";

export const metadata = {
  title: "7up-IPTV Player",
  description: "Simple IPTV player with ephemeral chat",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ height: "100vh", margin: 0 }}>{children}</body>
    </html>
  );
}
