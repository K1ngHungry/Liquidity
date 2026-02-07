import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { TrendingDown, TrendingUp, DollarSign, Percent } from "lucide-react"
import { getFinancialSummary } from "@/lib/data"

export function MonthlyReport() {
  const summary = getFinancialSummary()

  const metrics = [
    {
      label: "Total Income",
      value: `$${summary.monthlyIncome.toLocaleString("en-US", { minimumFractionDigits: 2 })}`,
      icon: DollarSign,
      description: "This month's earnings",
    },
    {
      label: "Total Expenses",
      value: `$${summary.monthlyExpenses.toLocaleString("en-US", { minimumFractionDigits: 2 })}`,
      icon: TrendingDown,
      description: "This month's spending",
    },
    {
      label: "Net Savings",
      value: `$${(summary.monthlyIncome - summary.monthlyExpenses).toLocaleString("en-US", { minimumFractionDigits: 2 })}`,
      icon: TrendingUp,
      description: "Income minus expenses",
    },
    {
      label: "Savings Rate",
      value: `${summary.savingsRate}%`,
      icon: Percent,
      description: "Percentage of income saved",
    },
  ]

  return (
    <Card className="border-border bg-card">
      <CardHeader>
        <CardTitle className="text-base font-semibold text-foreground">
          February 2026 Summary
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Your monthly financial snapshot
        </p>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {metrics.map((metric) => (
            <div key={metric.label} className="rounded-lg bg-secondary/50 p-4">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                  <metric.icon className="h-4 w-4 text-primary" />
                </div>
                <span className="text-sm text-muted-foreground">{metric.label}</span>
              </div>
              <p className="mt-3 text-xl font-bold text-foreground">{metric.value}</p>
              <p className="mt-1 text-xs text-muted-foreground">{metric.description}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
