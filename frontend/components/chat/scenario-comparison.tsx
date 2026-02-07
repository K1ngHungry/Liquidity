"use client"

import { ArrowRight, TrendingUp, TrendingDown } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { AllocationChart, COLORS } from "@/components/chat/budget-report"

const POSITIVE_CATEGORIES = ["savings", "emergency", "investment", "retirement", "401k", "ira"]

interface DeltaEntry {
  category: string
  previous: number
  current: number
  delta: number
}

function computeDeltas(
  previous: Record<string, number>,
  current: Record<string, number>,
): DeltaEntry[] {
  const allKeys = new Set([...Object.keys(previous), ...Object.keys(current)])
  return Array.from(allKeys)
    .map((key) => {
      const prev = previous[key] ?? 0
      const curr = current[key] ?? 0
      return { category: key, previous: prev, current: curr, delta: curr - prev }
    })
    .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))
}

function getDeltaColor(category: string, delta: number): string {
  const isPositive = POSITIVE_CATEGORIES.some((kw) =>
    category.toLowerCase().includes(kw),
  )
  if (delta === 0) return "text-muted-foreground"
  if (isPositive) {
    return delta > 0 ? "text-green-500" : "text-red-500"
  }
  return delta < 0 ? "text-green-500" : "text-amber-500"
}

function toChartData(solution: Record<string, number>) {
  return Object.entries(solution)
    .sort(([, a], [, b]) => b - a)
    .map(([name, value], i) => ({
      name: name.replace(/_/g, " "),
      value,
      color: COLORS[i % COLORS.length],
    }))
}

interface ScenarioComparisonProps {
  previous: Record<string, unknown>
  current: Record<string, unknown>
}

export function ScenarioComparison({ previous, current }: ScenarioComparisonProps) {
  const prevSolution = (previous.solution as Record<string, number>) ?? {}
  const currSolution = (current.solution as Record<string, number>) ?? {}
  const deltas = computeDeltas(prevSolution, currSolution)

  const prevTotal = Object.values(prevSolution).reduce((s, v) => s + v, 0)
  const currTotal = Object.values(currSolution).reduce((s, v) => s + v, 0)
  const totalDelta = currTotal - prevTotal

  return (
    <div className="space-y-3">
      {/* Total change summary */}
      <Card className="border-border/50 bg-background/60">
        <CardContent className="p-3">
          <p className="mb-2 text-xs font-medium text-muted-foreground">
            Total Budget Change
          </p>
          <div className="flex items-center gap-2">
            <span className="text-sm font-mono text-muted-foreground">
              ${prevTotal.toLocaleString()}
            </span>
            <ArrowRight className="h-3 w-3 text-muted-foreground" />
            <span className="text-sm font-mono font-bold text-foreground">
              ${currTotal.toLocaleString()}
            </span>
            {totalDelta !== 0 && (
              <span
                className={cn(
                  "ml-1 rounded-md px-1.5 py-0.5 text-xs font-mono font-semibold",
                  totalDelta > 0
                    ? "bg-green-500/10 text-green-500"
                    : "bg-amber-500/10 text-amber-500",
                )}
              >
                {totalDelta > 0 ? "+" : ""}
                ${totalDelta.toLocaleString()}
              </span>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Per-category deltas */}
      <Card className="border-border/50 bg-background/60">
        <CardContent className="space-y-2 p-3">
          <p className="text-xs font-medium text-muted-foreground">
            Category Changes
          </p>
          {deltas.map((entry) => (
            <DeltaRow key={entry.category} entry={entry} />
          ))}
        </CardContent>
      </Card>

      {/* Side-by-side donut charts */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <p className="mb-2 text-center text-xs text-muted-foreground">
            Current Budget
          </p>
          <AllocationChart data={toChartData(prevSolution)} />
        </div>
        <div>
          <p className="mb-2 text-center text-xs text-muted-foreground">
            New Plan
          </p>
          <AllocationChart data={toChartData(currSolution)} />
        </div>
      </div>
    </div>
  )
}

function DeltaRow({ entry }: { entry: DeltaEntry }) {
  const colorClass = getDeltaColor(entry.category, entry.delta)

  return (
    <div className="flex items-center justify-between rounded-lg border border-border/50 bg-background/50 px-3 py-2">
      <span className="text-sm font-medium capitalize text-foreground">
        {entry.category.replace(/_/g, " ")}
      </span>
      <div className="flex items-center gap-2 text-xs">
        <span className="font-mono text-muted-foreground">
          ${entry.previous.toLocaleString()}
        </span>
        <ArrowRight className="h-3 w-3 text-muted-foreground" />
        <span className="font-mono font-bold text-foreground">
          ${entry.current.toLocaleString()}
        </span>
        {entry.delta !== 0 && (
          <span className={cn("flex items-center gap-0.5 font-mono font-semibold", colorClass)}>
            {entry.delta > 0 ? (
              <TrendingUp className="h-3 w-3" />
            ) : (
              <TrendingDown className="h-3 w-3" />
            )}
            {entry.delta > 0 ? "+" : ""}
            ${Math.abs(entry.delta).toLocaleString()}
          </span>
        )}
      </div>
    </div>
  )
}
