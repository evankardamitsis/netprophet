import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "NetProphet Admin",
  description: "Admin panel for NetProphet tennis prediction platform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
