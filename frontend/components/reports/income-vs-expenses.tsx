"use client"

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from "recharts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

const data = [
  { month: "Sep", income: 4800, expenses: 2840 },
  { month: "Oct", income: 5100, expenses: 3210 },
  { month: "Nov", income: 4950, expenses: 2950 },
  { month: "Dec", income: 5300, expenses: 3780 },
  { month: "Jan", income: 5100, expenses: 3120 },
  { month: "Feb", income: 5100, expenses: 1070 },
]

export function IncomeVsExpenses() {
  return (
    <Card className="border-border bg-card">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold text-foreground">
          Income vs Expenses
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          6-month comparison of earnings and spending
        </p>
      </CardHeader>
      <CardContent>
        <div className="h-[280px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(212, 18%, 16%)" />
              <XAxis
                dataKey="month"
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
                formatter={(value: number) => [`$${value.toLocaleString()}`, ""]}
              />
              <Legend
                wrapperStyle={{ color: "hsl(91, 30%, 85%)", fontSize: "12px" }}
              />
              <Bar dataKey="income" fill="#9FC490" radius={[6, 6, 0, 0]} name="Income" />
              <Bar dataKey="expenses" fill="#82A3A1" radius={[6, 6, 0, 0]} name="Expenses" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}
