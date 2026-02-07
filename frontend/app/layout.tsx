import React from "react"
import type { Metadata, Viewport } from "next"
import { Inter, JetBrains_Mono } from "next/font/google"
import { AppSidebar } from "@/components/app-sidebar"

import "./globals.css"

const _inter = Inter({ subsets: ["latin"], variable: "--font-inter" })
const _jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains-mono",
})

export const metadata: Metadata = {
  title: "FinTrack - Smart Budgeting",
  description:
    "AI-powered financial dashboard for tracking spending, budgets, and financial reports.",
}

export const viewport: Viewport = {
  themeColor: "#011936",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className="font-sans antialiased">
        <div className="flex min-h-screen">
          <AppSidebar />
          <main className="ml-64 flex-1 p-6 lg:p-8">{children}</main>
        </div>
      </body>
    </html>
  )
}
