"use client"

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { getCategoryBreakdown } from "@/lib/data"
import type { DashboardCategoryBreakdown } from "@/lib/api"

export function CategoryBreakdown({ data }: { data?: DashboardCategoryBreakdown[] }) {
  const resolved = data && data.length > 0 ? data : getCategoryBreakdown()

  return (
    <Card className="border-border bg-card h-full flex flex-col">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold text-foreground">
          Budget Tracking
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Recurring Expenses
        </p>
      </CardHeader>
      <CardContent className="flex-1">
        <div className="flex flex-col items-center gap-6 h-full">
          <div className="h-[250px] w-full flex-shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart margin={{ top: 10, right: 10, bottom: 10, left: 10 }}>
                <Pie
                  data={resolved}
                  cx="50%"
                  cy="50%"
                  innerRadius={80}
                  outerRadius={120}
                  paddingAngle={3}
                  dataKey="amount"
                  strokeWidth={0}
                >
                  {resolved.map((entry) => (
                    <Cell key={entry.category} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(209, 60%, 8%)",
                    border: "1px solid hsl(212, 18%, 16%)",
                    borderRadius: "8px",
                    color: "hsl(91, 30%, 90%)",
                  }}
                  itemStyle={{ color: "hsl(91, 30%, 90%)" }}
                  labelStyle={{ color: "hsl(91, 30%, 90%)" }}
                  formatter={(value: number) => [`$${value.toFixed(2)}`, "Amount"]}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex flex-1 flex-col justify-center gap-4 w-full">
            {resolved.map((item) => (
              <div key={item.category} className="flex items-center justify-between text-sm p-2 rounded-lg hover:bg-muted/50 transition-colors">
                <div className="flex items-center gap-3">
                  <div
                    className="h-3 w-3 rounded-full shadow-sm"
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="font-medium text-foreground">{item.category}</span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-muted-foreground text-xs">{item.percentage}%</span>
                  <span className="font-semibold text-foreground">${item.amount.toFixed(2)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
