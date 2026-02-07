"use client"

import React, { useState, useEffect } from "react"
import { Send, Bot, Loader2 } from "lucide-react"
import { apiClient, type AgentResponse, type Recommendation, type UserConstraint } from "@/lib/api"
import { CommandCenter } from "@/components/chat/command-center"
import { Button } from "@/components/ui/button"
import { supabase } from "@/lib/supabase"
import type { Session } from "@supabase/supabase-js"

interface ChatMessage {
  role: "user" | "assistant"
  content: string
}

/** Turn an arbitrary string into a valid solver identifier (lowercase, underscores). */
function sanitizeCategory(raw: string): string {
  let name = raw
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9_]/g, "_") // replace non-alphanumeric
    .replace(/_+/g, "_")         // collapse multiple underscores
    .replace(/^_|_$/g, "")       // trim leading/trailing underscores
  if (name && /^[0-9]/.test(name)) name = `cat_${name}`
  return name || "category"
}

export default function ChatPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)
  const [conversation, setConversation] = useState<Record<string, unknown>[]>(
    [],
  )

  // Solver state — lifted to page level for Command Center
  const [currentResult, setCurrentResult] = useState<Record<
    string,
    unknown
  > | null>(null)
  const [previousResult, setPreviousResult] = useState<Record<
    string,
    unknown
  > | null>(null)
  const [currentRecommendations, setCurrentRecommendations] = useState<
    Recommendation[]
  >([])

  // Constraint state for the form-based editor
  const [constraints, setConstraints] = useState<UserConstraint[]>([])
  const [categories, setCategories] = useState<string[]>([
    "Housing",
    "Groceries",
    "Dining",
    "Transport",
    "Entertainment",
    "Savings",
    "Utilities",
    "Healthcare",
  ])

  // Auth session
  const [session, setSession] = useState<Session | null>(null)

  // Explanation state
  const [explanation, setExplanation] = useState<string | null>(null)
  const [isExplaining, setIsExplaining] = useState(false)

  // Last assistant message (shown inline)
  const lastAssistantMsg = [...messages].reverse().find(m => m.role === "assistant")

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
    })
  }, [])

  useEffect(() => {
    apiClient
      .healthCheck()
      .catch((err) => console.error("API Health check failed", err))
  }, [])

  // Fetch Nessie dashboard and populate initial constraints from bills + deposits
  useEffect(() => {
    const loadDashboardConstraints = async () => {
      if (!session?.access_token) return

      try {
        const dashboard = await apiClient.getNessieDashboard(session.access_token)

        // 1. Compute baseline (Current Budget) from dashboard data
        const baselineSolution: Record<string, number> = {}

        // Add bills as fixed costs
        if (dashboard.bills) {
          dashboard.bills.forEach((bill, idx) => {
               const b = bill as any
               const payee = String(b.payee || b.nickname || `bill_${idx+1}`)
               const amount = Math.round(Number(b.payment_amount || 0))
               if (amount > 0) {
                   const cat = sanitizeCategory(payee)
                   baselineSolution[cat] = (baselineSolution[cat] || 0) + amount
               }
          })
        }

        // Add spending from categories
        if (dashboard.categoryBreakdown) {
          dashboard.categoryBreakdown.forEach(cat => {
              const name = sanitizeCategory(cat.category)
              const amount = Math.round(cat.amount)
              baselineSolution[name] = Math.max(baselineSolution[name] || 0, amount)
          })
        }

        // Set this as the fixed "Previous Result" for comparison
        setPreviousResult({
            status: "CURRENT",
            solution: baselineSolution,
            satisfied_constraints: [],
            dropped_constraints: []
        })

        const nessieConstraints: UserConstraint[] = []

        // Bills → hard constraints (recurring expenses you must pay)
        if (dashboard.bills && dashboard.bills.length > 0) {
          dashboard.bills.forEach((bill, idx) => {
            const payee = String(bill.payee || bill.nickname || `bill_${idx + 1}`)
            const amount = Math.round(Number(bill.payment_amount || 0))
            if (amount <= 0) return

            nessieConstraints.push({
              id: `nessie-bill-${idx}`,
              category: sanitizeCategory(payee),
              operator: "==" as const,
              amount,
              constraint_type: "hard" as const,
              priority: 0,
              description: `${payee} — $${amount}/mo (recurring bill)`,
              source: "nessie" as const,
            })
          })
        }

        // Deposits → income ceiling + savings goal
        if (dashboard.deposits && dashboard.deposits.length > 0) {
          const totalIncome = dashboard.deposits.reduce(
            (sum: number, dep) => {
                const d = dep as any
                return sum + Math.round(Number(d.amount || 0))
            },
            0,
          )

          if (totalIncome > 0) {
            nessieConstraints.push({
              id: "nessie-income",
              category: "total_income",
              operator: "<=" as const,
              amount: totalIncome,
              constraint_type: "hard" as const,
              priority: 0,
              description: `Monthly income — $${totalIncome.toLocaleString()} (from deposits)`,
              source: "nessie" as const,
            })

            const savingsGoal = Math.round(totalIncome * 0.2)
            nessieConstraints.push({
              id: "nessie-savings-goal",
              category: "savings",
              operator: ">=" as const,
              amount: savingsGoal,
              constraint_type: "soft" as const,
              priority: 0,
              description: `Save at least 20% of income ($${savingsGoal.toLocaleString()})`,
              source: "nessie" as const,
            })
          }
        }

        if (nessieConstraints.length > 0) {
          setConstraints((prev) => (prev.length > 0 ? prev : nessieConstraints))

          const billCategories = nessieConstraints
            .filter((c) => c.id.startsWith("nessie-bill-"))
            .map((c) => c.category)
          setCategories((prev) =>
            prev.length > 0
              ? prev
              : [...new Set([...billCategories, "savings", "discretionary"])],
          )
        }
      } catch (err) {
        console.log("Could not load Nessie dashboard for constraints:", err)
      }
    }

    loadDashboardConstraints()
  }, [session])

  const sendMessage = async (textOverride?: string) => {
    const text = textOverride || input.trim()
    if (!text || loading) return

    if (!textOverride) setInput("")

    setMessages((prev) => [...prev, { role: "user", content: text }])
    setLoading(true)

    try {
      const res: AgentResponse = await apiClient.agentSolve({
        message: text,
        conversation_history: conversation,
        user_constraints: constraints.length > 0 ? constraints : undefined,
      })

      // Update solver state for Command Center
      if (res.solver_result) {
        setCurrentResult((prev) => {
          setPreviousResult(prev)
          return res.solver_result
        })
        setCurrentRecommendations(res.recommendations)
      }

      // Merge any new constraints from agent
      if (res.new_constraints && res.new_constraints.length > 0) {
        setConstraints((prev) => [
          ...prev,
          ...res.new_constraints.map((c, idx) => ({
            id: String(c.id || `ai-${Date.now()}-${idx}`),
            category: String(c.category),
            operator: (c.operator as string) as "<=" | ">=" | "==",
            amount: Number(c.amount),
            constraint_type: (c.constraint_type as string) as "hard" | "soft",
            priority: Number(c.priority ?? 2),
            description: String(c.description || ""),
            source: "ai" as const,
          })),
        ])
      }

      setConversation(res.conversation)
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: res.content },
      ])
    } catch (err) {
      console.error(err)
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Sorry, I encountered an error. Please make sure the backend is running.",
        },
      ])
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    sendMessage()
  }

  const handleOptimize = async () => {
    if (loading || constraints.length === 0) return
    setLoading(true)
    setExplanation(null)

    try {
      const res: AgentResponse = await apiClient.directSolve({
        constraints,
      })

      if (res.solver_result) {
        setCurrentResult(res.solver_result)
        setCurrentRecommendations(res.recommendations)

        if (!previousResult) {
             setPreviousResult(res.solver_result)
        }
      }
    } catch (err) {
      console.error("Direct solve failed:", err)
    } finally {
      setLoading(false)
    }
  }

  const handleExplain = async () => {
    if (!currentResult || isExplaining) return
    setIsExplaining(true)

    try {
        const res = await apiClient.explainSolverResult(
            currentResult,
            constraints,
            "User requested explanation for current plan"
        )
        setExplanation(res.explanation)
    } catch (err) {
        console.error("Explanation failed:", err)
        setExplanation("Sorry, I couldn't generate an explanation at this time.")
    } finally {
        setIsExplaining(false)
    }
  }

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col">
      {/* Header */}
      <div className="px-1 pb-3">
        <h1 className="text-2xl font-bold text-foreground">
          AI Financial Advisor
        </h1>
        <p className="text-sm text-muted-foreground">
          Optimize your budget with constraints and AI-powered analysis.
        </p>
      </div>

      {/* Command Center takes full remaining space */}
      <div className="flex-1 overflow-hidden rounded-lg border border-border">
        <CommandCenter
          currentResult={currentResult}
          previousResult={previousResult}
          recommendations={currentRecommendations}
          constraints={constraints}
          categories={categories}
          onConstraintsChange={setConstraints}
          onOptimize={handleOptimize}
          optimizing={loading}
          explanation={explanation}
          onExplain={handleExplain}
          isExplaining={isExplaining}
        />
      </div>

      {/* Compact chat input bar */}
      <div className="border-t border-border bg-background pt-3 pb-1">
        {/* Last assistant message (if any) */}
        {lastAssistantMsg && (
          <div className="flex items-start gap-2 mb-2 px-1">
            <Bot className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
            <p className="text-xs text-muted-foreground line-clamp-2">
              {lastAssistantMsg.content}
            </p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex gap-2 px-1">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Add a constraint: &quot;I want to buy a $2000 watch&quot; or &quot;Keep dining under $300&quot;"
            disabled={loading}
            className="flex-1 rounded-lg border border-border bg-secondary px-4 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:opacity-50"
          />
          <Button
            type="submit"
            disabled={loading || !input.trim()}
            size="icon"
            className="shrink-0"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </form>
      </div>
    </div>
  )
}
