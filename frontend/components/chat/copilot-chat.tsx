"use client"

import React, { useRef, useEffect } from "react"
import { Send, Bot, User, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"

const SUGGESTED_QUESTIONS = [
  "I make $5000/month. Rent is $1500. I want to save at least $1000.",
  "Monthly income $8000. Mortgage $2200. Maximize savings.",
  "I have $3000 to spend. Need to cover bills of $1200.",
]

interface ChatMessage {
  role: "user" | "assistant"
  content: string
}

interface CopilotChatProps {
  messages: ChatMessage[]
  input: string
  loading: boolean
  onInputChange: (value: string) => void
  onSubmit: (e: React.FormEvent) => void
  onSuggestion: (question: string) => void
}

export function CopilotChat({
  messages,
  input,
  loading,
  onInputChange,
  onSubmit,
  onSuggestion,
}: CopilotChatProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, loading])

  return (
    <div className="flex h-full flex-col bg-card">
      {/* Header */}
      <div className="border-b border-border px-4 py-3">
        <div className="flex items-center gap-2">
          <Bot className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold text-foreground">Copilot</h3>
        </div>
      </div>

      {/* Messages */}
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
            <div className="grid w-full grid-cols-1 gap-2">
              {SUGGESTED_QUESTIONS.map((question) => (
                <button
                  key={question}
                  type="button"
                  onClick={() => onSuggestion(question)}
                  className="rounded-lg border border-border bg-secondary/50 px-4 py-3 text-left text-sm text-foreground transition-colors hover:bg-secondary"
                >
                  {question}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex w-full flex-col gap-4">
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
                      : "bg-secondary text-white w-full"
                  }`}
                >
                  <div className="whitespace-pre-wrap">{message.content}</div>
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
                    <div
                      className="h-2 w-2 animate-pulse rounded-full bg-muted-foreground"
                      style={{ animationDelay: "0.2s" }}
                    />
                    <div
                      className="h-2 w-2 animate-pulse rounded-full bg-muted-foreground"
                      style={{ animationDelay: "0.4s" }}
                    />
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input */}
      <div className="border-t border-border bg-background/50 p-4 backdrop-blur-sm">
        <form onSubmit={onSubmit} className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => onInputChange(e.target.value)}
            placeholder="Ask about your finances..."
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
    </div>
  )
}
