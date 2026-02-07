"use client"

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { getCategoryBreakdown } from "@/lib/data"
import type { DashboardCategoryBreakdown } from "@/lib/api"

export function CategoryBreakdown({ data }: { data?: DashboardCategoryBreakdown[] }) {
  const resolved = data && data.length > 0 ? data : getCategoryBreakdown()

  return (
    <Card className="border-border bg-card">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold text-foreground">
          Spending by Category
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Where your money goes this month
        </p>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col items-center gap-4 lg:flex-row">
          <div className="h-[220px] w-[220px] flex-shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart margin={{ top: 10, right: 10, bottom: 10, left: 10 }}>
                <Pie
                  data={resolved}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={85}
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
          <div className="flex flex-1 flex-col gap-2">
            {resolved.map((item) => (
              <div key={item.category} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <div
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="text-foreground">{item.category}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-muted-foreground">{item.percentage}%</span>
                  <span className="font-medium text-foreground">${item.amount.toFixed(2)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
