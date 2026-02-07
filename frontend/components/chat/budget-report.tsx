"use client"

import { useState } from "react"
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
} from "recharts"
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ChevronDown,
  ChevronUp,
  DollarSign,
  TrendingUp,
  HeartPulse,
} from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import type { Recommendation } from "@/lib/api"

export const COLORS = [
  "#9FC490",
  "#7DB8A0",
  "#5BA3B0",
  "#4A90A4",
  "#8B7EC8",
  "#C490A0",
  "#D4A574",
  "#A0C4E8",
]

interface BudgetReportProps {
  result: Record<string, unknown>
  recommendations?: Recommendation[]
}

export function BudgetReport({ result, recommendations }: BudgetReportProps) {
  const solution = result.solution as Record<string, number> | undefined
  const satisfied = result.satisfied_constraints as string[] | undefined
  const dropped = result.dropped_constraints as string[] | undefined
  const status = result.status as string

  const hasStatus = !!status
  const hasConstraints =
    (satisfied && satisfied.length > 0) || (dropped && dropped.length > 0)
  const hasSolution = solution && Object.keys(solution).length > 0

  if (!hasStatus && !hasConstraints && !hasSolution) return null

  const entries = hasSolution
    ? Object.entries(solution).sort(([, a], [, b]) => b - a)
    : []
  const total = entries.reduce((sum, [, v]) => sum + v, 0)

  const chartData = entries.map(([name, value], i) => ({
    name: name.replace(/_/g, " "),
    value,
    color: COLORS[i % COLORS.length],
  }))

  return (
    <div className="mt-4 space-y-3 border-t border-border/50 pt-4">
      {/* Status Banner */}
      {hasStatus && <StatusBanner status={status} total={total} />}

      {/* Allocation Cards + Chart */}
      {hasSolution && (
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          <div className="space-y-2">
            {entries.map(([name, value], i) => (
              <AllocationCard
                key={name}
                name={name}
                value={value}
                total={total}
                color={COLORS[i % COLORS.length]}
              />
            ))}
          </div>
          <AllocationChart data={chartData} />
        </div>
      )}

      {/* Allocation Bars */}
      {hasSolution && <AllocationBars entries={entries} total={total} />}

      {/* Budget Health Recommendations */}
      {recommendations && recommendations.length > 0 && (
        <RecommendationsCard recommendations={recommendations} />
      )}

      {/* Constraints */}
      <ConstraintsSection satisfied={satisfied} dropped={dropped} />
    </div>
  )
}

export function StatusBanner({ status, total }: { status: string; total: number }) {
  const isGood = status === "OPTIMAL" || status === "FEASIBLE"
  return (
    <Card
      className={cn(
        "border",
        isGood ? "border-green-500/30 bg-green-500/5" : "border-red-500/30 bg-red-500/5"
      )}
    >
      <CardContent className="flex items-center justify-between p-3">
        <div className="flex items-center gap-2">
          <div
            className={cn(
              "flex h-8 w-8 items-center justify-center rounded-lg",
              isGood ? "bg-green-500/10" : "bg-red-500/10"
            )}
          >
            {isGood ? (
              <TrendingUp className="h-4 w-4 text-green-500" />
            ) : (
              <AlertTriangle className="h-4 w-4 text-red-500" />
            )}
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Solver Status</p>
            <p
              className={cn(
                "text-sm font-semibold",
                isGood ? "text-green-500" : "text-red-500"
              )}
            >
              {status}
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-xs text-muted-foreground">Total Allocated</p>
          <p className="text-lg font-bold text-foreground">
            <DollarSign className="mr-0.5 inline h-4 w-4 text-primary" />
            {total.toLocaleString()}
          </p>
        </div>
      </CardContent>
    </Card>
  )
}

export function AllocationCard({
  name,
  value,
  total,
  color,
}: {
  name: string
  value: number
  total: number
  color: string
}) {
  const pct = total > 0 ? ((value / total) * 100).toFixed(1) : "0"
  return (
    <div
      className="flex items-center justify-between rounded-lg border border-border/50 bg-background/60 px-3 py-2"
      style={{ borderLeftColor: color, borderLeftWidth: 3 }}
    >
      <div>
        <p className="text-sm font-medium capitalize text-foreground">
          {name.replace(/_/g, " ")}
        </p>
        <p className="text-xs text-muted-foreground">{pct}% of total</p>
      </div>
      <p className="text-sm font-bold font-mono text-primary">
        ${value.toLocaleString()}
      </p>
    </div>
  )
}

export function AllocationChart({
  data,
}: {
  data: { name: string; value: number; color: string }[]
}) {
  return (
    <Card className="border-border/50 bg-background/60">
      <CardContent className="flex flex-col items-center justify-center p-3">
        <div className="h-[160px] w-[160px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={45}
                outerRadius={70}
                paddingAngle={3}
                dataKey="value"
                strokeWidth={0}
              >
                {data.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(209, 60%, 8%)",
                  border: "1px solid hsl(212, 18%, 16%)",
                  borderRadius: "8px",
                  color: "hsl(91, 30%, 90%)",
                  fontSize: "12px",
                }}
                formatter={(value: number) => [
                  `$${value.toLocaleString()}`,
                  "Amount",
                ]}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-2 flex flex-wrap justify-center gap-x-3 gap-y-1">
          {data.map((item) => (
            <div key={item.name} className="flex items-center gap-1.5 text-xs">
              <div
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: item.color }}
              />
              <span className="capitalize text-muted-foreground">
                {item.name}
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

export function AllocationBars({
  entries,
  total,
}: {
  entries: [string, number][]
  total: number
}) {
  return (
    <Card className="border-border/50 bg-background/60">
      <CardContent className="space-y-2 p-3">
        <p className="text-xs font-medium text-muted-foreground">
          Budget Distribution
        </p>
        {entries.map(([name, value], i) => {
          const pct = total > 0 ? (value / total) * 100 : 0
          return (
            <div key={name}>
              <div className="flex items-center justify-between text-xs">
                <span className="capitalize text-foreground">
                  {name.replace(/_/g, " ")}
                </span>
                <span className="text-muted-foreground">
                  ${value.toLocaleString()} ({pct.toFixed(0)}%)
                </span>
              </div>
              <div className="mt-1 h-2 rounded-full bg-secondary">
                <div
                  className="h-2 rounded-full transition-all"
                  style={{
                    width: `${pct}%`,
                    backgroundColor: COLORS[i % COLORS.length],
                  }}
                />
              </div>
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
}

export function RecommendationsCard({
  recommendations,
}: {
  recommendations: Recommendation[]
}) {
  return (
    <Card className="border-border/50 bg-background/60">
      <CardContent className="p-3">
        <div className="mb-2 flex items-center gap-1.5">
          <HeartPulse className="h-3.5 w-3.5 text-primary" />
          <p className="text-xs font-medium text-muted-foreground">
            Budget Health
          </p>
        </div>
        <div className="space-y-2">
          {recommendations.map((rec) => (
            <div
              key={rec.label}
              className="flex items-start gap-2 rounded-md border border-border/50 bg-background/50 px-2.5 py-2"
            >
              <div className="mt-0.5 shrink-0">
                {rec.status === "good" && (
                  <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                )}
                {rec.status === "warning" && (
                  <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                )}
                {rec.status === "critical" && (
                  <XCircle className="h-3.5 w-3.5 text-red-500" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-medium text-foreground">
                    {rec.label}
                  </span>
                  <div className="flex items-center gap-1.5 text-xs">
                    <span
                      className={cn(
                        "font-mono font-semibold",
                        rec.status === "good" && "text-green-500",
                        rec.status === "warning" && "text-amber-500",
                        rec.status === "critical" && "text-red-500"
                      )}
                    >
                      {rec.value}
                    </span>
                    <span className="text-muted-foreground">
                      ({rec.threshold})
                    </span>
                  </div>
                </div>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {rec.detail}
                </p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

export function ConstraintsSection({
  satisfied,
  dropped,
}: {
  satisfied?: string[]
  dropped?: string[]
}) {
  const [open, setOpen] = useState(false)
  const hasConstraints =
    (satisfied && satisfied.length > 0) || (dropped && dropped.length > 0)

  if (!hasConstraints) return null

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        aria-controls="constraints-details"
        className="flex items-center gap-1 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        {open ? (
          <ChevronUp className="h-3 w-3" />
        ) : (
          <ChevronDown className="h-3 w-3" />
        )}
        Constraint Details
      </button>

      {open && (
        <div id="constraints-details" className="mt-2 space-y-2 rounded-lg border border-border/50 bg-background/50 p-3 text-xs">
          {satisfied && satisfied.length > 0 && (
            <div className="space-y-1">
              {satisfied.map((c, i) => (
                <div key={i} className="flex gap-2 text-green-400/90">
                  <CheckCircle2 className="mt-0.5 h-3 w-3 shrink-0" />
                  <span>{c}</span>
                </div>
              ))}
            </div>
          )}
          {dropped && dropped.length > 0 && (
            <div className="space-y-1">
              <p className="font-medium text-amber-400/90">
                Relaxed Constraints
              </p>
              {dropped.map((c, i) => (
                <div key={i} className="flex gap-2 text-amber-400/90">
                  <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" />
                  <span>{c}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
