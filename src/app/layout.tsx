import type { Metadata } from "next";
import { Space_Grotesk } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Resolv-HQ — Agent Console",
  description:
    "A bounded, explainable AI agent: retrieval, tools, memory, evaluation and human approval, all inspectable.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={cn("h-full", "antialiased", spaceGrotesk.variable, "font-sans")}
    >
      <body className="min-h-screen bg-background text-foreground font-sans">{children}</body>
    </html>
  );
}
