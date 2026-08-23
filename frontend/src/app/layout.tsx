import type { Metadata } from "next";
import { ThemeProvider } from "@/components/ThemeProvider";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { AppToaster } from "@/components/AppToaster";
import "./globals.css";

export const metadata: Metadata = {
  title: "School Registry | Modern School Management",
  description: "School management for teachers, students, parents, and admins.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="font-sans antialiased" suppressHydrationWarning={true}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <LanguageProvider>
            {children}
            <AppToaster />
          </LanguageProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
