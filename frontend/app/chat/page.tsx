"use client"

import React, { useState, useEffect } from "react"
import { apiClient, type AgentResponse, type Recommendation } from "@/lib/api"
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
