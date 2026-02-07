"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard,
  FileBarChart,
  MessageSquare,
  Wallet,
  TrendingUp,
  CreditCard,
} from "lucide-react"
import { cn } from "@/lib/utils"

const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/reports", label: "Reports", icon: FileBarChart },
  { href: "/chat", label: "AI Advisor", icon: MessageSquare },
]

export function AppSidebar() {
  const pathname = usePathname()

  return (
    <aside className="fixed left-0 top-0 z-40 flex h-screen w-64 flex-col border-r border-border bg-card">
      <div className="flex items-center gap-3 px-6 py-6">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
          <Wallet className="h-5 w-5 text-primary-foreground" />
        </div>
        <div>
          <h1 className="text-lg font-bold text-foreground">FinTrack</h1>
          <p className="text-xs text-muted-foreground">Smart Budgeting</p>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4">
        <ul className="flex flex-col gap-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                  )}
                >
                  <item.icon className="h-5 w-5" />
                  {item.label}
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>

      <div className="border-t border-border p-4">
        <div className="rounded-lg bg-secondary p-4">
          <div className="flex items-center gap-2 text-sm font-medium text-foreground">
            <TrendingUp className="h-4 w-4 text-primary" />
            Savings Goal
          </div>
          <div className="mt-2 h-2 rounded-full bg-background">
            <div
              className="h-2 rounded-full bg-primary transition-all"
              style={{ width: "68%" }}
            />
          </div>
          <p className="mt-1.5 text-xs text-muted-foreground">
            $6,800 of $10,000
          </p>
        </div>
        <div className="mt-3 flex items-center gap-3 rounded-lg px-1">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary">
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">API Ready</p>
            <p className="text-xs text-muted-foreground">Connect your bank</p>
          </div>
        </div>
      </div>
    </aside>
  )
}
