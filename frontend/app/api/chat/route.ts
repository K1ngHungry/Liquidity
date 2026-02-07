import {
  consumeStream,
  convertToModelMessages,
  streamText,
  type UIMessage,
} from "ai"
import {
  getFinancialSummary,
  getTransactions,
  getBudgets,
  getCategoryBreakdown,
  getMonthlySpending,
} from "@/lib/data"

export const maxDuration = 30

export async function POST(req: Request) {
  const { messages }: { messages: UIMessage[] } = await req.json()

  const summary = getFinancialSummary()
  const transactions = getTransactions()
  const budgets = getBudgets()
  const categories = getCategoryBreakdown()
  const monthlySpending = getMonthlySpending()

  const financialContext = `
You are FinTrack AI, a helpful and knowledgeable financial advisor chatbot. You have access to the user's current financial data:

FINANCIAL SUMMARY:
- Total Balance: $${summary.totalBalance.toLocaleString()}
- Monthly Income: $${summary.monthlyIncome.toLocaleString()}
- Monthly Expenses: $${summary.monthlyExpenses.toLocaleString()}
- Savings Rate: ${summary.savingsRate}%
- Month-over-Month Change: ${summary.monthOverMonth}%

BUDGET STATUS:
${budgets.map((b) => `- ${b.category}: $${b.spent.toFixed(2)} spent of $${b.limit} budget (${((b.spent / b.limit) * 100).toFixed(0)}% used)`).join("\n")}

SPENDING BY CATEGORY:
${categories.map((c) => `- ${c.category}: $${c.amount.toFixed(2)} (${c.percentage}%)`).join("\n")}

MONTHLY SPENDING TREND (last 6 months):
${monthlySpending.map((m) => `- ${m.month}: $${m.amount.toLocaleString()}`).join("\n")}

RECENT TRANSACTIONS:
${transactions.map((t) => `- ${t.date}: ${t.description} ${t.type === "credit" ? "+" : "-"}$${Math.abs(t.amount).toFixed(2)} (${t.category})`).join("\n")}

Guidelines:
- Provide specific, actionable financial advice based on the user's actual data
- Reference specific numbers and categories when giving advice
- Be encouraging but honest about spending habits
- Suggest concrete ways to save money or optimize budgets
- If asked for a report, structure it clearly with headers and bullet points
- Keep responses concise and focused on the user's financial situation
- When discussing trends, reference the monthly spending data
`

  const result = streamText({
    model: "openai/gpt-4o-mini",
    system: financialContext,
    messages: await convertToModelMessages(messages),
    abortSignal: req.signal,
  })

  return result.toUIMessageStreamResponse({
    originalMessages: messages,
    consumeSseStream: consumeStream,
  })
}
