"use client"

import { LayoutDashboard } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import type { Recommendation } from "@/lib/api"
import {
  COLORS,
  StatusBanner,
  AllocationCard,
  AllocationChart,
  AllocationBars,
  RecommendationsCard,
  ConstraintsSection,
} from "@/components/chat/budget-report"
import { ScenarioComparison } from "@/components/chat/scenario-comparison"

interface CommandCenterProps {
  currentResult: Record<string, unknown> | null
  previousResult: Record<string, unknown> | null
  recommendations: Recommendation[]
}

export function CommandCenter({
  currentResult,
  previousResult,
  recommendations,
}: CommandCenterProps) {
  if (!currentResult) {
    return <CommandCenterEmpty />
  }

  const hasComparison = previousResult !== null

  return (
    <div className="h-full overflow-y-auto p-4">
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <LayoutDashboard className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-semibold text-foreground">
            Command Center
          </h2>
        </div>

        {hasComparison ? (
          <Tabs defaultValue="current">
            <TabsList>
              <TabsTrigger value="current">Current Plan</TabsTrigger>
              <TabsTrigger value="compare">Compare Changes</TabsTrigger>
            </TabsList>

            <TabsContent value="current">
              <CurrentResultView
                result={currentResult}
                recommendations={recommendations}
              />
            </TabsContent>

            <TabsContent value="compare">
              <ScenarioComparison
                previous={previousResult}
                current={currentResult}
              />
            </TabsContent>
          </Tabs>
        ) : (
          <CurrentResultView
            result={currentResult}
            recommendations={recommendations}
          />
        )}
      </div>
    </div>
  )
}

function CurrentResultView({
  result,
  recommendations,
}: {
  result: Record<string, unknown>
  recommendations: Recommendation[]
}) {
  const solution = result.solution as Record<string, number> | undefined
  const status = result.status as string
  const satisfied = result.satisfied_constraints as string[] | undefined
  const dropped = result.dropped_constraints as string[] | undefined

  const hasSolution = solution && Object.keys(solution).length > 0
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
    <div className="space-y-3">
      {status && <StatusBanner status={status} total={total} />}

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

      {hasSolution && <AllocationBars entries={entries} total={total} />}

      {recommendations.length > 0 && (
        <RecommendationsCard recommendations={recommendations} />
      )}

      <ConstraintsSection satisfied={satisfied} dropped={dropped} />
    </div>
  )
}

function CommandCenterEmpty() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 p-6 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
        <LayoutDashboard className="h-8 w-8 text-primary" />
      </div>
      <div>
        <h2 className="text-lg font-semibold text-foreground">
          Command Center
        </h2>
        <p className="mt-1 max-w-xs text-sm text-muted-foreground">
          Your optimized budget will appear here once you describe your
          financial situation in the chat.
        </p>
      </div>
    </div>
  )
}
