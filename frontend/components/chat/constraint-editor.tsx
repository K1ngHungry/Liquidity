"use client"

import { useState } from "react"
import { Plus, Trash2, GripVertical, Sparkles, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Slider } from "@/components/ui/slider"
import { cn } from "@/lib/utils"

export interface UserConstraint {
  id: string
  category: string
  operator: "<=" | ">=" | "=="
  amount: number
  constraintType: "hard" | "soft"
  priority: number // 0-4
  description: string
  source: "user" | "ai" | "nessie"
}

interface ConstraintEditorProps {
  constraints: UserConstraint[]
  categories: string[]
  onConstraintsChange: (constraints: UserConstraint[]) => void
  onOptimize?: () => void
  optimizing?: boolean
  disabled?: boolean
}

const OPERATORS = [
  { value: "<=", label: "at most" },
  { value: ">=", label: "at least" },
  { value: "==", label: "exactly" },
] as const

const PRIORITY_LABELS = ["Critical", "High", "Medium", "Low", "Optional"]

function generateId(): string {
  return `user-${Math.random().toString(36).substring(2, 10)}`
}

export function ConstraintEditor({
  constraints,
  categories,
  onConstraintsChange,
  onOptimize,
  optimizing = false,
  disabled = false,
}: ConstraintEditorProps) {
  // Include categories from existing constraints (for AI-added ones)
  const allCategories = Array.from(
    new Set([
      ...categories.map((c) =>
        c.toLowerCase().trim().replace(/[^a-z0-9_]/g, "_").replace(/_+/g, "_").replace(/^_|_$/g, "")
      ),
      ...constraints.map((c) => c.category),
    ])
  )

  const addConstraint = () => {
    const category = categories[0] || "custom"
    onConstraintsChange([
      ...constraints,
      {
        id: generateId(),
        category: category.toLowerCase().trim().replace(/[^a-z0-9_]/g, "_").replace(/_+/g, "_").replace(/^_|_$/g, "") || "custom",
        operator: "<=",
        amount: 500,
        constraintType: "soft",
        priority: 2,
        description: "",
        source: "user",
      },
    ])
  }

  const updateConstraint = (id: string, updates: Partial<UserConstraint>) => {
    onConstraintsChange(
      constraints.map((c) => (c.id === id ? { ...c, ...updates } : c))
    )
  }

  const deleteConstraint = (id: string) => {
    onConstraintsChange(constraints.filter((c) => c.id !== id))
  }

  const getSourceBadge = (source: UserConstraint["source"]) => {
    switch (source) {
      case "nessie":
        return (
          <Badge variant="secondary" className="text-xs">
            From Bank
          </Badge>
        )
      case "ai":
        return (
          <Badge variant="outline" className="text-xs border-primary">
            AI Suggested
          </Badge>
        )
      default:
        return null
    }
  }

  return (
    <Card className="h-full flex flex-col border-none shadow-none">
      <CardHeader className="pb-3 px-0">
        <CardTitle className="text-sm font-medium flex items-center justify-between">
          <span>Active Constraints</span>
          <Badge variant="outline" className="text-xs font-normal">
            {constraints.length} active
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 px-0 flex-1 overflow-y-auto">
        {constraints.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground border-2 border-dashed rounded-lg">
            <Sparkles className="h-8 w-8 mb-2 opacity-50" />
            <p className="text-sm font-medium">No constraints yet</p>
            <p className="text-xs mt-1 max-w-[200px]">
              Ask the AI to "set a budget for dining" or "save for a watch".
            </p>
          </div>
        ) : (
          constraints.map((constraint) => (
            <div
              key={constraint.id}
              className={cn(
                "flex items-center gap-3 p-3 rounded-lg border text-sm",
                constraint.constraintType === "hard"
                  ? "border-destructive/20 bg-destructive/5"
                  : "border-border bg-card"
              )}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium capitalize truncate">
                    {constraint.category.replace(/_/g, " ")}
                  </span>
                  {getSourceBadge(constraint.source)}
                  <Badge 
                    variant={constraint.constraintType === "hard" ? "destructive" : "secondary"}
                    className="text-[10px] h-5 px-1.5"
                  >
                    {constraint.constraintType === "hard" ? "Must" : "Flexible"}
                  </Badge>
                </div>
                
                <div className="flex items-center text-muted-foreground text-xs">
                  <span>
                    {constraint.operator === "==" 
                      ? "Exactly" 
                      : constraint.operator === "<=" 
                        ? "At most" 
                        : "At least"}
                  </span>
                  <span className="font-mono ml-1 text-foreground font-medium">
                    ${constraint.amount.toLocaleString()}
                  </span>
                  {constraint.constraintType === "soft" && (
                     <span className="ml-2 opacity-70">
                       (Priority: {PRIORITY_LABELS[constraint.priority] ?? "Unknown"})
                     </span>
                  )}
                </div>
              </div>

              <Button
                size="icon"
                variant="ghost"
                onClick={() => deleteConstraint(constraint.id)}
                disabled={disabled}
                aria-label={`Delete ${constraint.description || constraint.category} constraint`}
                className="h-8 w-8 text-muted-foreground hover:text-destructive shrink-0"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))
        )}
      </CardContent>
      
      {onOptimize && (
        <div className="pt-4 mt-auto">
          <Button
            className="w-full"
            onClick={onOptimize}
            disabled={disabled || optimizing || constraints.length === 0}
          >
            {optimizing ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Optimizing Plan...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 mr-2" />
                Generate Plan
              </>
            )}
          </Button>
        </div>
      )}
    </Card>
  )
}
