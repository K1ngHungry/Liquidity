// Mock financial data - designed to be swapped with Capital One / Visa API data
// Each function mirrors the shape you'd get from a real banking API

export type Transaction = {
  id: string
  date: string
  description: string
  amount: number
  category: string
  merchant: string
  type: "debit" | "credit"
  status: string
}

export type Budget = {
  category: string
  limit: number
  spent: number
  color: string
}

export type MonthlySpending = {
  month: string
  amount: number
}

export type CategoryBreakdown = {
  category: string
  amount: number
  percentage: number
  color: string
}

// Colors computed in JS (not CSS variables) for Recharts compatibility
// Colors computed in JS (not CSS variables) for Recharts compatibility
export const CATEGORY_COLORS: Record<string, string> = {
  "Food & Dining": "hsl(220, 50%, 40%)", // Primary Blue
  Transportation: "hsl(215, 35%, 55%)", // Muted Blue
  Shopping: "hsl(210, 25%, 65%)", // Grey-Blue
  Entertainment: "hsl(210, 20%, 80%)", // Light Blue
  Bills: "hsl(220, 15%, 25%)", // Dark Slate Blue
  Health: "hsl(220, 40%, 50%)", // Slightly brighter blue
  Travel: "hsl(215, 30%, 45%)", // Medium Blue
  Other: "hsl(210, 15%, 35%)", // Dark Grey-Blue
}

export function getTransactions(): Transaction[] {
  return [
    { id: "t1", date: "2026-02-05", description: "Whole Foods Market", amount: -87.32, category: "Food & Dining", merchant: "Whole Foods", type: "debit", status: "posted" },
    { id: "t2", date: "2026-02-04", description: "Uber Trip", amount: -24.50, category: "Transportation", merchant: "Uber", type: "debit", status: "posted" },
    { id: "t3", date: "2026-02-04", description: "Netflix Subscription", amount: -15.99, category: "Entertainment", merchant: "Netflix", type: "debit", status: "posted" },
    { id: "t4", date: "2026-02-03", description: "Amazon Purchase", amount: -129.99, category: "Shopping", merchant: "Amazon", type: "debit", status: "posted" },
    { id: "t5", date: "2026-02-03", description: "Salary Deposit", amount: 4250.00, category: "Income", merchant: "Employer", type: "credit", status: "posted" },
    { id: "t6", date: "2026-02-02", description: "Electric Bill", amount: -142.00, category: "Bills", merchant: "Con Edison", type: "debit", status: "posted" },
    { id: "t7", date: "2026-02-02", description: "Starbucks Coffee", amount: -6.45, category: "Food & Dining", merchant: "Starbucks", type: "debit", status: "posted" },
    { id: "t8", date: "2026-02-01", description: "Gym Membership", amount: -49.99, category: "Health", merchant: "Planet Fitness", type: "debit", status: "posted" },
    { id: "t9", date: "2026-02-01", description: "Gas Station", amount: -52.30, category: "Transportation", merchant: "Shell", type: "debit", status: "posted" },
    { id: "t10", date: "2026-01-31", description: "Target Shopping", amount: -67.84, category: "Shopping", merchant: "Target", type: "debit", status: "posted" },
    { id: "t11", date: "2026-01-30", description: "Internet Bill", amount: -79.99, category: "Bills", merchant: "Verizon", type: "debit", status: "posted" },
    { id: "t12", date: "2026-01-29", description: "Chipotle Dinner", amount: -14.25, category: "Food & Dining", merchant: "Chipotle", type: "debit", status: "posted" },
    { id: "t13", date: "2026-01-28", description: "Spotify Premium", amount: -10.99, category: "Entertainment", merchant: "Spotify", type: "debit", status: "posted" },
    { id: "t14", date: "2026-01-27", description: "Flight Booking", amount: -389.00, category: "Travel", merchant: "Delta Airlines", type: "debit", status: "posted" },
    { id: "t15", date: "2026-01-26", description: "Freelance Payment", amount: 850.00, category: "Income", merchant: "Client", type: "credit", status: "posted" },
  ]
}

export function getBudgets(): Budget[] {
  return [
    { category: "Food & Dining", limit: 500, spent: 108.02, color: "hsl(220, 50%, 40%)" },
    { category: "Transportation", limit: 200, spent: 76.80, color: "hsl(215, 35%, 55%)" },
    { category: "Shopping", limit: 300, spent: 197.83, color: "hsl(210, 25%, 65%)" },
    { category: "Entertainment", limit: 100, spent: 26.98, color: "hsl(210, 20%, 80%)" },
    { category: "Bills", limit: 400, spent: 221.99, color: "hsl(220, 15%, 25%)" },
    { category: "Health", limit: 100, spent: 49.99, color: "hsl(220, 40%, 50%)" },
    { category: "Travel", limit: 500, spent: 389.00, color: "hsl(215, 30%, 45%)" },
  ]
}

export function getMonthlySpending(): MonthlySpending[] {
  return [
    { month: "Sep", amount: 2840 },
    { month: "Oct", amount: 3210 },
    { month: "Nov", amount: 2950 },
    { month: "Dec", amount: 3780 },
    { month: "Jan", amount: 3120 },
    { month: "Feb", amount: 1070 },
  ]
}

export function getCategoryBreakdown(): CategoryBreakdown[] {
  return [
    { category: "Food & Dining", amount: 108.02, percentage: 10.1, color: "hsl(220, 50%, 40%)" },
    { category: "Transportation", amount: 76.80, percentage: 7.2, color: "hsl(215, 35%, 55%)" },
    { category: "Shopping", amount: 197.83, percentage: 18.5, color: "hsl(210, 25%, 65%)" },
    { category: "Entertainment", amount: 26.98, percentage: 2.5, color: "hsl(210, 20%, 80%)" },
    { category: "Bills", amount: 221.99, percentage: 20.8, color: "hsl(220, 15%, 25%)" },
    { category: "Health", amount: 49.99, percentage: 4.7, color: "hsl(220, 40%, 50%)" },
    { category: "Travel", amount: 389.00, percentage: 36.2, color: "hsl(215, 30%, 45%)" },
  ]
}

export function getWeeklySpending() {
  return [
    { day: "Mon", amount: 45 },
    { day: "Tue", amount: 82 },
    { day: "Wed", amount: 23 },
    { day: "Thu", amount: 156 },
    { day: "Fri", amount: 67 },
    { day: "Sat", amount: 198 },
    { day: "Sun", amount: 34 },
  ]
}

export function getFinancialSummary() {
  return {
    totalBalance: 12847.52,
    monthlyIncome: 5100.00,
    monthlyExpenses: 1070.61,
    savingsRate: 79.0,
    monthOverMonth: -12.3,
  }
}
