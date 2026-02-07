"use client"

import { useState } from "react"
import { Plus, Trash2, GripVertical, Sparkles, Loader2, CheckCircle2 } from "lucide-react"
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
  
  const sortedConstraints = [...constraints].sort((a, b) => {
    const aIsIncome = a.category.toLowerCase().includes("income");
    const bIsIncome = b.category.toLowerCase().includes("income");
    
    if (aIsIncome && !bIsIncome) return -1;
    if (!aIsIncome && bIsIncome) return 1;
    
    return 0; // Maintain original order for non-income items
  });

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
      <CardHeader className="pb-3 px-0 flex flex-row items-center justify-between space-y-0">
        <div className="flex items-center gap-2">
          <CardTitle className="text-sm font-medium">Active Constraints</CardTitle>
          <Badge variant="outline" className="text-xs font-normal">
            {constraints.length}
          </Badge>
        </div>
        <div className="flex items-center gap-2">
           <Button 
            size="sm" 
            variant="outline" 
            className="h-7 text-xs" 
            onClick={addConstraint} 
            disabled={disabled}
          >
            <Plus className="h-3.5 w-3.5 mr-1" />
            Add
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 px-0 flex-1 overflow-y-auto">
        {constraints.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground border-2 border-dashed rounded-lg">
            <Sparkles className="h-8 w-8 mb-2 opacity-50" />
            <p className="text-sm font-medium">No constraints yet</p>
            <p className="text-xs mt-1 max-w-[200px]">
              Add a constraint manually or ask the AI to "set a budget for dining".
            </p>
            <Button variant="link" size="sm" onClick={addConstraint} className="mt-2 text-primary">
              Add Constraint
            </Button>
          </div>
        ) : (
                sortedConstraints.map((constraint) => {
                  const isIncome = constraint.category.toLowerCase().includes("income");
                  const isBill = constraint.category.toLowerCase().includes("bill");
                  
                  return (
                    <div
                      key={constraint.id}
                      className={cn(
                        "flex flex-col gap-2 p-3 rounded-lg border text-sm transition-colors",
                         isIncome 
                          ? "border-emerald-500/20 bg-emerald-500/5" 
                          : isBill 
                            ? "border-red-500/20 bg-red-500/5" 
                            : constraint.constraintType === "hard"
                              ? "border-destructive/20 bg-destructive/5"
                              : "border-border bg-card"
                      )}
                    >
                      <div className="flex items-center gap-2">
                        <Select
                          value={constraint.category}
                          onValueChange={(val) => updateConstraint(constraint.id, { category: val })}
                          disabled={disabled}
                        >
                          <SelectTrigger className="h-7 text-xs flex-1 bg-background/50">
                            <SelectValue placeholder="Category" />
                          </SelectTrigger>
                          <SelectContent>
                            {allCategories.map((cat) => (
                              <SelectItem key={cat} value={cat}>
                                <span className="capitalize">{cat.replace(/_/g, " ")}</span>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>

                        <div className="flex items-center gap-1 px-2 h-7 rounded-md bg-green-500/10 text-green-600 border border-green-500/20 shrink-0 select-none" title="Verified against Nessie API Context">
                           <CheckCircle2 className="h-3.5 w-3.5" />
                           <span className="text-[10px] font-medium">Verified</span>
                        </div>

                        <Badge 
                          variant={constraint.constraintType === "hard" ? "destructive" : "secondary"}
                          className="text-[10px] h-7 px-2 cursor-pointer hover:opacity-80 select-none shrink-0"
                          onClick={() => updateConstraint(constraint.id, { 
                              constraintType: constraint.constraintType === "hard" ? "soft" : "hard" 
                          })}
                          title="Click to toggle type"
                        >
                          {constraint.constraintType === "hard" ? "Must" : "Flexible"}
                        </Badge>

                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => deleteConstraint(constraint.id)}
                          disabled={disabled}
                          className="h-7 w-7 text-muted-foreground hover:text-destructive shrink-0"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>

                      <div className="flex items-center gap-2">
                        <Select
                          value={constraint.operator}
                          onValueChange={(val: any) => updateConstraint(constraint.id, { operator: val })}
                          disabled={disabled}
                        >
                          <SelectTrigger className="h-7 text-xs w-[90px] shrink-0 bg-background/50">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {OPERATORS.map((op) => (
                              <SelectItem key={op.value} value={op.value}>
                                {op.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>

                        <div className="relative flex-1">
                          <span className="absolute left-2 top-1.5 text-xs text-muted-foreground">$</span>
                          <Input
                            type="number"
                            value={constraint.amount}
                            onChange={(e) => updateConstraint(constraint.id, { amount: Number(e.target.value) })}
                            className="h-7 text-xs pl-5 py-0 bg-background/50"
                            disabled={disabled}
                          />
                        </div>
                      </div>
                      
                       {constraint.constraintType === "soft" && (
                          <div className="flex items-center gap-2 pt-1 border-t border-border/50">
                            <span className="text-[10px] text-muted-foreground font-medium">Priority:</span>
                            <Slider
                              value={[constraint.priority]}
                              min={0}
                              max={4}
                              step={1}
                              onValueChange={([val]) => updateConstraint(constraint.id, { priority: val })}
                              className="flex-1 max-w-[120px]"
                            />
                            <span className="text-[10px] text-muted-foreground min-w-[45px] text-right">
                              {PRIORITY_LABELS[constraint.priority]}
                            </span>
                          </div>
                      )}
                      
                      
                    </div>
                  );
                })
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
