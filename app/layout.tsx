import type { Metadata } from "next";
import { Geist } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import { esES } from "@clerk/localizations";
import { ThemeProvider } from "next-themes";
import "./globals.css";

const geist = Geist({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Meridiano Cero",
  description: "Plataforma de seguimiento de giras escolares",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className={`${geist.className} h-full antialiased`} suppressHydrationWarning>
      <body className="min-h-full flex flex-col bg-background">
        <ClerkProvider localization={esES}>
          <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
            {children}
          </ThemeProvider>
        </ClerkProvider>
      </body>
    </html>
  );
}
