import {
  Wallet,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  ArrowDownRight,
  PiggyBank,
} from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { getFinancialSummary } from "@/lib/data"
import type { DashboardSummary } from "@/lib/api"

export function StatCards({ summary }: { summary?: DashboardSummary }) {
  const fallback = getFinancialSummary()
  const resolved = summary ?? fallback

  const stats = [
    {
      label: "Total Balance",
      value: `$${resolved.totalBalance.toLocaleString("en-US", { minimumFractionDigits: 2 })}`,
      change: "+2.4%",
      trend: "up" as const,
      icon: Wallet,
    },
    {
      label: "Monthly Income",
      value: `$${resolved.monthlyIncome.toLocaleString("en-US", { minimumFractionDigits: 2 })}`,
      change: "+5.1%",
      trend: "up" as const,
      icon: TrendingUp,
    },
    {
      label: "Monthly Expenses",
      value: `$${resolved.monthlyExpenses.toLocaleString("en-US", { minimumFractionDigits: 2 })}`,
      change: `${resolved.monthOverMonth}%`,
      trend: "down" as const,
      icon: TrendingDown,
    },
    {
      label: "Savings Rate",
      value: `${resolved.savingsRate}%`,
      change: "+3.2%",
      trend: "up" as const,
      icon: PiggyBank,
    },
  ]

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {stats.map((stat) => (
        <Card key={stat.label} className="border-border bg-card">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">{stat.label}</span>
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-secondary">
                <stat.icon className="h-4 w-4 text-muted-foreground" />
              </div>
            </div>
            <p className="mt-2 text-2xl font-bold text-foreground">{stat.value}</p>
            <div className="mt-1 flex items-center gap-1">
              {stat.trend === "up" ? (
                <ArrowUpRight className="h-3.5 w-3.5 text-primary" />
              ) : (
                <ArrowDownRight className="h-3.5 w-3.5 text-primary" />
              )}
              <span className="text-xs text-primary">{stat.change}</span>
              <span className="text-xs text-muted-foreground">vs last month</span>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
