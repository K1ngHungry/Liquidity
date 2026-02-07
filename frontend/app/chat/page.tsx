"use client"

import React, { useState, useEffect } from "react"
import { apiClient, type AgentResponse, type Recommendation, type UserConstraint } from "@/lib/api"
import { CommandCenter } from "@/components/chat/command-center"
import { CopilotChat } from "@/components/chat/copilot-chat"
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from "@/components/ui/resizable"
import { supabase } from "@/lib/supabase"
import type { Session } from "@supabase/supabase-js"

interface ChatMessage {
  role: "user" | "assistant"
  content: string
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

  // Responsive layout
  const [isSmallScreen, setIsSmallScreen] = useState(false)

  useEffect(() => {
    const mql = window.matchMedia("(max-width: 1023px)")
    const onChange = () => setIsSmallScreen(mql.matches)
    mql.addEventListener("change", onChange)
    setIsSmallScreen(mql.matches)
    return () => mql.removeEventListener("change", onChange)
  }, [])

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

  // Fetch Nessie dashboard and populate initial constraints
  useEffect(() => {
    const loadDashboardConstraints = async () => {
      if (!session?.access_token) return
      
      try {
        const dashboard = await apiClient.getNessieDashboard(session.access_token)
        
        // Generate constraints from category breakdown
        if (dashboard.categoryBreakdown && dashboard.categoryBreakdown.length > 0) {
          const nessieConstraints: UserConstraint[] = dashboard.categoryBreakdown.map(
            (cat, idx) => ({
              id: `nessie-${idx}`,
              category: cat.category.toLowerCase().replace(/\s+/g, "_"),
              operator: "<=" as const,
              amount: Math.round(cat.amount * 1.2), // 120% of historical
              constraint_type: "soft" as const,
              priority: 2,
              description: `${cat.category} (historical: $${Math.round(cat.amount)})`,
              source: "nessie" as const,
            })
          )
          setConstraints((prev) => (prev && prev.length > 0 ? prev : nessieConstraints))

          // Update categories from dashboard
          const dashCategories = dashboard.categoryBreakdown.map((c) => c.category)
          if (dashCategories.length > 0) {
            setCategories((prev) => (prev && prev.length > 0 ? prev : [...new Set([...dashCategories, "Savings"])]))
          }
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
      })

      if (res.solver_input) {
        console.log("[Solver Input]", res.solver_input)
      }
      if (res.solver_result) {
        console.log("[Solver Result]", res.solver_result)
      }

      // Update solver state for Command Center
      if (res.solver_result) {
        setCurrentResult((prev) => {
          setPreviousResult(prev)
          return res.solver_result
        })
        setCurrentRecommendations(res.recommendations)
      }

      // Merge any new constraints from agent
      console.log("[Agent Response] new_constraints:", res.new_constraints)
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
          content:
            "Sorry, I encountered an error connecting to the solver backend. Please make sure the backend is running.",
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

  const handleSuggestion = (question: string) => {
    if (loading) return
    sendMessage(question)
  }

  const direction = isSmallScreen ? "vertical" : "horizontal"

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col gap-4">
      <div>
        <h1 className="text-2xl font-bold text-foreground">
          AI Financial Advisor
        </h1>
        <p className="text-sm text-muted-foreground">
          Describe your financial situation and let our solver optimize your
          budget.
        </p>
      </div>

      <ResizablePanelGroup
        key={direction}
        direction={direction}
        className="flex-1 rounded-lg border border-border"
      >
        <ResizablePanel
          defaultSize={isSmallScreen ? 40 : 60}
          minSize={isSmallScreen ? 0 : 30}
          collapsible={isSmallScreen}
        >
          <CommandCenter
            currentResult={currentResult}
            previousResult={previousResult}
            recommendations={currentRecommendations}
            constraints={constraints}
            categories={categories}
            onConstraintsChange={setConstraints}
          />
        </ResizablePanel>

        <ResizableHandle withHandle />

        <ResizablePanel defaultSize={isSmallScreen ? 60 : 40} minSize={25}>
          <CopilotChat
            messages={messages}
            input={input}
            loading={loading}
            onInputChange={setInput}
            onSubmit={handleSubmit}
            onSuggestion={handleSuggestion}
          />
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  )
}
