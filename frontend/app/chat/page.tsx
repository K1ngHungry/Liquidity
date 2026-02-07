"use client"

import React, { useState, useRef, useEffect } from "react"
import { Send, Bot, User, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { apiClient, AgentResponse, Recommendation } from "@/lib/api"
import { BudgetReport } from "@/components/chat/budget-report"

const SUGGESTED_QUESTIONS = [
  "I make $5000/month. Rent is $1500. I want to save at least $1000.",
  "Monthly income $8000. Mortgage $2200. Maximize savings.",
  "I have $3000 to spend. Need to cover bills of $1200.",
]

interface ChatMessage {
  role: "user" | "assistant"
  content: string
  solverResult?: Record<string, unknown> | null
  recommendations?: Recommendation[]
}

export default function ChatPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)
  const [conversation, setConversation] = useState<Record<string, unknown>[]>([])
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, loading])

  // Initial greeting or check
  useEffect(() => {
    // Optional: could check health here, but maybe not block the UI
    apiClient.healthCheck().catch((err) => console.error("API Health check failed", err))
  }, [])

  const sendMessage = async (textOverride?: string) => {
    const text = textOverride || input.trim()
    if (!text || loading) return

    if (!textOverride) setInput("")
    
    // Add user message immediately
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

      setConversation(res.conversation)
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: res.content,
          solverResult: res.solver_result,
          recommendations: res.recommendations,
        },
      ])
    } catch (err) {
      console.error(err)
      setMessages((prev) => [
        ...prev,
        { 
          role: "assistant", 
          content: "Sorry, I encountered an error connecting to the solver backend. Please make sure the backend is running." 
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

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col gap-4">
      <div>
        <h1 className="text-2xl font-bold text-foreground">AI Financial Advisor</h1>
        <p className="text-sm text-muted-foreground">
          Describe your financial situation and let our solver optimize your budget.
        </p>
      </div>

      <Card className="flex flex-1 flex-col overflow-hidden border-border bg-card">
        <div className="flex-1 overflow-y-auto p-4">
          {messages.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-6">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
                <Sparkles className="h-8 w-8 text-primary" />
              </div>
              <div className="text-center">
                <h2 className="text-lg font-semibold text-foreground">
                  Ready to optimize your budget?
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Tell me about your income, expenses, and savings goals.
                </p>
              </div>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 w-full max-w-2xl">
                {SUGGESTED_QUESTIONS.map((question) => (
                  <button
                    key={question}
                    type="button"
                    onClick={() => handleSuggestion(question)}
                    className="rounded-lg border border-border bg-secondary/50 px-4 py-3 text-left text-sm text-foreground transition-colors hover:bg-secondary"
                  >
                    {question}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-4 max-w-3xl mx-auto w-full">
              {messages.map((message, i) => (
                <div
                  key={i}
                  className={`flex gap-3 ${message.role === "user" ? "flex-row-reverse" : ""}`}
                >
                  <div
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                      message.role === "user"
                        ? "bg-primary/10"
                        : "bg-secondary"
                    }`}
                  >
                    {message.role === "user" ? (
                      <User className="h-4 w-4 text-primary" />
                    ) : (
                      <Bot className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>
                  <div
                    className={`rounded-lg px-4 py-3 text-sm leading-relaxed shadow-sm ${
                      message.role === "user"
                        ? "bg-primary text-primary-foreground max-w-[80%]"
                        : "bg-secondary text-foreground w-full"
                    }`}
                  >
                    <div className="whitespace-pre-wrap">{message.content}</div>
                    
                    {/* Render visual budget report if solver result present */}
                    {message.solverResult && (
                      <BudgetReport
                        result={message.solverResult}
                        recommendations={message.recommendations}
                      />
                    )}
                  </div>
                </div>
              ))}
              
              {loading && (
                <div className="flex gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-secondary">
                    <Bot className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="rounded-lg bg-secondary px-4 py-3">
                    <div className="flex gap-1">
                      <div className="h-2 w-2 animate-pulse rounded-full bg-muted-foreground" />
                      <div className="h-2 w-2 animate-pulse rounded-full bg-muted-foreground delay-100" style={{ animationDelay: "0.2s" }} />
                      <div className="h-2 w-2 animate-pulse rounded-full bg-muted-foreground delay-200" style={{ animationDelay: "0.4s" }} />
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        <div className="border-t border-border p-4 bg-background/50 backdrop-blur-sm">
          <form onSubmit={handleSubmit} className="flex gap-2 max-w-3xl mx-auto w-full">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about your finances... (e.g. 'Maximize savings with $5000 income')"
              disabled={loading}
              className="flex-1 rounded-lg border border-border bg-secondary px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:opacity-50"
            />
            <Button
              type="submit"
              disabled={loading || !input.trim()}
              className="bg-primary text-primary-foreground hover:bg-primary/90"
              size="icon"
            >
              <Send className="h-4 w-4" />
              <span className="sr-only">Send message</span>
            </Button>
          </form>
        </div>
      </Card>
    </div>
  )
}

