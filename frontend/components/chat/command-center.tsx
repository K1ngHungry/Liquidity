"use client"

import { LayoutDashboard, Settings2 } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import type { Recommendation, UserConstraint } from "@/lib/api"
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
import {
  ConstraintEditor,
  type UserConstraint as EditorConstraint,
} from "@/components/chat/constraint-editor"

interface CommandCenterProps {
  currentResult: Record<string, unknown> | null
  previousResult: Record<string, unknown> | null
  recommendations: Recommendation[]
  constraints: UserConstraint[]
  categories: string[]
  onConstraintsChange: (constraints: UserConstraint[]) => void
  onOptimize: () => void
  optimizing: boolean
  explanation: string | null
  onExplain: () => void
  isExplaining: boolean
}

// ... (toEditorConstraint and fromEditorConstraint remain unchanged)

// Map between API UserConstraint and Editor UserConstraint (camelCase)
function toEditorConstraint(c: UserConstraint): EditorConstraint {
  return {
    ...c,
    constraintType: c.constraint_type,
  }
}

function fromEditorConstraint(c: EditorConstraint): UserConstraint {
  return {
    id: c.id,
    category: c.category,
    operator: c.operator,
    amount: c.amount,
    constraint_type: c.constraintType,
    priority: c.priority,
    description: c.description,
    source: c.source,
  }
}



export function CommandCenter({
  currentResult,
  previousResult,
  recommendations,
  constraints,
  categories,
  onConstraintsChange,
  onOptimize,
  optimizing,
  explanation,
  onExplain,
  isExplaining,
}: CommandCenterProps) {
  const hasResult = currentResult !== null
  const hasComparison = currentResult !== null && previousResult !== null

  const handleConstraintsChange = (editorConstraints: EditorConstraint[]) => {
    onConstraintsChange(editorConstraints.map(fromEditorConstraint))
  }

  return (
    <div className="h-full overflow-y-auto p-4">
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <LayoutDashboard className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-semibold text-foreground">
            Command Center
          </h2>
        </div>

        <Tabs defaultValue={hasResult ? "results" : "constraints"}>
          <TabsList>
            <TabsTrigger value="results">
              {hasResult ? "Budget Plan" : "Results"}
            </TabsTrigger>
            <TabsTrigger value="constraints">
              <Settings2 className="h-3 w-3 mr-1" />
              Constraints
            </TabsTrigger>
            {hasComparison && (
              <TabsTrigger value="compare">Compare</TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="results" className="mt-3">
            {hasResult ? (
              <CurrentResultView
                result={currentResult}
                recommendations={recommendations}
                explanation={explanation}
                onExplain={onExplain}
                isExplaining={isExplaining}
              />
            ) : (
              <CommandCenterEmpty />
            )}
          </TabsContent>

          <TabsContent value="constraints" className="mt-3">
            <ConstraintEditor
              constraints={constraints.map(toEditorConstraint)}
              categories={categories}
              onConstraintsChange={handleConstraintsChange}
              onOptimize={onOptimize}
              optimizing={optimizing}
            />
          </TabsContent>

          {hasComparison && (
            <TabsContent value="compare" className="mt-3">
              <ScenarioComparison
                previous={previousResult!}
                current={currentResult!}
              />
            </TabsContent>
          )}
        </Tabs>
      </div>
    </div>
  )
}


function CurrentResultView({
  result,
  recommendations,
  explanation,
  onExplain,
  isExplaining,
}: {
  result: Record<string, unknown>
  recommendations: Recommendation[]
  explanation: string | null
  onExplain: () => void
  isExplaining: boolean
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

      {/* Explanation Section */}
      <div className="rounded-lg border bg-card text-card-foreground shadow-sm">
        <div className="p-4 space-y-3">
            <div className="flex items-center justify-between">
                <h3 className="font-semibold text-sm">Analysis</h3>
                {!explanation && (
                    <button 
                        onClick={onExplain}
                        disabled={isExplaining}
                        className="text-xs bg-primary text-primary-foreground hover:bg-primary/90 px-3 py-1 rounded-md disabled:opacity-50 transition-colors"
                    >
                        {isExplaining ? "Analyzing..." : "Explain Plan"}
                    </button>
                )}
            </div>
            
            {explanation ? (
                <div className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">
                    {explanation}
                </div>
            ) : (
                <p className="text-xs text-muted-foreground">
                    Get a detailed analysis of this budget plan, including feasibility and suggestions.
                </p>
            )}
        </div>
      </div>

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
          Go to the <span className="font-semibold text-foreground">Constraints</span> tab and click <span className="font-semibold text-foreground">Generate Plan</span> to see your optimized budget.
        </p>
      </div>
    </div>
  )
}
