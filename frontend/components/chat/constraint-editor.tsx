"use client"

import { useState } from "react"
import { Plus, Trash2, GripVertical } from "lucide-react"
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
  disabled = false,
}: ConstraintEditorProps) {
  const [newCategory, setNewCategory] = useState("")

  // Include categories from existing constraints (for AI-added ones)
  const allCategories = Array.from(
    new Set([
      ...categories.map((c) => c.toLowerCase().replace(/\s+/g, "_")),
      ...constraints.map((c) => c.category),
    ])
  )

  const addConstraint = () => {
    const category = newCategory || categories[0] || "custom"
    onConstraintsChange([
      ...constraints,
      {
        id: generateId(),
        category: category.toLowerCase().replace(/\s+/g, "_"),
        operator: "<=",
        amount: 500,
        constraintType: "soft",
        priority: 2,
        description: "",
        source: "user",
      },
    ])
    setNewCategory("")
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
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center justify-between">
          <span>Budget Constraints</span>
          <Button
            size="sm"
            variant="outline"
            onClick={addConstraint}
            disabled={disabled}
          >
            <Plus className="h-4 w-4 mr-1" />
            Add
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {constraints.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            No constraints defined. Add one to get started.
          </p>
        ) : (
          constraints.map((constraint) => (
            <div
              key={constraint.id}
              className={cn(
                "flex flex-col gap-2 p-3 rounded-lg border",
                constraint.constraintType === "hard"
                  ? "border-destructive/30 bg-destructive/5"
                  : "border-border bg-muted/30"
              )}
            >
              {/* Row 1: Category, Operator, Amount */}
              <div className="flex items-center gap-2">
                <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" />

                <Select
                  value={constraint.category}
                  onValueChange={(val) =>
                    updateConstraint(constraint.id, { category: val })
                  }
                  disabled={disabled}
                >
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder={constraint.category} />
                  </SelectTrigger>
                  <SelectContent>
                    {allCategories.map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {cat.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
                      </SelectItem>
                    ))}
                    <SelectItem value="custom">Custom...</SelectItem>
                  </SelectContent>
                </Select>

                <Select
                  value={constraint.operator}
                  onValueChange={(val) =>
                    updateConstraint(constraint.id, {
                      operator: val as UserConstraint["operator"],
                    })
                  }
                  disabled={disabled}
                >
                  <SelectTrigger className="w-[100px]">
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

                <div className="flex items-center gap-1">
                  <span className="text-muted-foreground">$</span>
                  <Input
                    type="number"
                    value={constraint.amount}
                    onChange={(e) =>
                      updateConstraint(constraint.id, {
                        amount: parseInt(e.target.value) || 0,
                      })
                    }
                    className="w-24"
                    disabled={disabled}
                  />
                </div>

                <div className="flex-1" />
                {getSourceBadge(constraint.source)}

                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => deleteConstraint(constraint.id)}
                  disabled={disabled}
                  className="h-8 w-8 text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>

              {/* Row 2: Type toggle + Priority slider (for soft) */}
              <div className="flex items-center gap-4 pl-6">
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant={
                      constraint.constraintType === "hard"
                        ? "destructive"
                        : "outline"
                    }
                    onClick={() =>
                      updateConstraint(constraint.id, {
                        constraintType:
                          constraint.constraintType === "hard"
                            ? "soft"
                            : "hard",
                      })
                    }
                    disabled={disabled}
                    className="h-7 text-xs"
                  >
                    {constraint.constraintType === "hard"
                      ? "Must Have"
                      : "Flexible"}
                  </Button>
                </div>

                {constraint.constraintType === "soft" && (
                  <div className="flex items-center gap-2 flex-1">
                    <span className="text-xs text-muted-foreground">
                      Priority:
                    </span>
                    <Slider
                      value={[constraint.priority]}
                      min={0}
                      max={4}
                      step={1}
                      onValueChange={([val]) =>
                        updateConstraint(constraint.id, { priority: val })
                      }
                      disabled={disabled}
                      className="w-24"
                    />
                    <span className="text-xs font-medium w-16">
                      {PRIORITY_LABELS[constraint.priority]}
                    </span>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  )
}
