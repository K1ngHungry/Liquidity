"use client"

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
} from "recharts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { getWeeklySpending } from "@/lib/data"

export function SpendingTrends() {
  const data = getWeeklySpending()

  return (
    <Card className="border-border bg-card">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold text-foreground">
          Weekly Spending Pattern
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Your daily spending habits this week
        </p>
      </CardHeader>
      <CardContent>
        <div className="h-[280px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(212, 18%, 16%)" />
              <XAxis
                dataKey="day"
                axisLine={false}
                tickLine={false}
                tick={{ fill: "hsl(212, 12%, 45%)", fontSize: 12 }}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fill: "hsl(212, 12%, 45%)", fontSize: 12 }}
                tickFormatter={(value) => `$${value}`}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(209, 60%, 8%)",
                  border: "1px solid hsl(212, 18%, 16%)",
                  borderRadius: "8px",
                  color: "hsl(91, 30%, 90%)",
                }}
                formatter={(value: number) => [`$${value}`, "Spent"]}
              />
              <Bar dataKey="amount" fill="#9FC490" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}
