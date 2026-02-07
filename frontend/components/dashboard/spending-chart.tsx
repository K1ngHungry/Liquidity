"use client"

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
} from "recharts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { getMonthlySpending } from "@/lib/data"
import type { DashboardMonthlySpending } from "@/lib/api"

export function SpendingChart({ data }: { data?: DashboardMonthlySpending[] }) {
  const resolved = data && data.length > 0 ? data : getMonthlySpending()

  return (
    <Card className="border-border bg-card">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold text-foreground">
          Spending Overview
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Monthly spending over the last 6 months
        </p>
      </CardHeader>
      <CardContent>
        <div className="h-[280px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={resolved} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="spendingGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#9FC490" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="#9FC490" stopOpacity={0} />
                </linearGradient>
              </defs>
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
                formatter={(value: number) => [`$${value.toLocaleString()}`, "Spending"]}
              />
              <Area
                type="monotone"
                dataKey="amount"
                stroke="#9FC490"
                strokeWidth={2}
                fill="url(#spendingGradient)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}
