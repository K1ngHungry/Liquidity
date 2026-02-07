"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { getBudgets } from "@/lib/data"
import type { DashboardBudget } from "@/lib/api"

export function BudgetTracker({ budgets }: { budgets?: DashboardBudget[] }) {
  const resolved = budgets && budgets.length > 0 ? budgets : getBudgets()

  return (
    <Card className="border-border bg-card">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold text-foreground">
          Budget Tracking
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Current month progress by category
        </p>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-4">
          {resolved.map((budget) => {
            const percentage = Math.min((budget.spent / budget.limit) * 100, 100)
            const isOver = budget.spent > budget.limit
            return (
              <div key={budget.category}>
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <div
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: budget.color }}
                    />
                    <span className="text-foreground">{budget.category}</span>
                  </div>
                  <span className="text-muted-foreground">
                    ${budget.spent.toFixed(2)} / ${budget.limit}
                  </span>
                </div>
                <div className="mt-1.5 h-2 rounded-full bg-secondary">
                  <div
                    className="h-2 rounded-full transition-all"
                    style={{
                      width: `${percentage}%`,
                      backgroundColor: isOver ? "#ef4444" : budget.color,
                    }}
                  />
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
