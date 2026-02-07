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
export const CATEGORY_COLORS: Record<string, string> = {
  "Food & Dining": "#9FC490",
  Transportation: "#82A3A1",
  Shopping: "#C0DFA1",
  Entertainment: "#465362",
  Bills: "#6A8A88",
  Health: "#B0D49A",
  Travel: "#5B7B79",
  Other: "#3A4857",
}

export function getTransactions(): Transaction[] {
  return [
    { id: "t1", date: "2026-02-05", description: "Whole Foods Market", amount: -87.32, category: "Food & Dining", merchant: "Whole Foods", type: "debit" },
    { id: "t2", date: "2026-02-04", description: "Uber Trip", amount: -24.50, category: "Transportation", merchant: "Uber", type: "debit" },
    { id: "t3", date: "2026-02-04", description: "Netflix Subscription", amount: -15.99, category: "Entertainment", merchant: "Netflix", type: "debit" },
    { id: "t4", date: "2026-02-03", description: "Amazon Purchase", amount: -129.99, category: "Shopping", merchant: "Amazon", type: "debit" },
    { id: "t5", date: "2026-02-03", description: "Salary Deposit", amount: 4250.00, category: "Income", merchant: "Employer", type: "credit" },
    { id: "t6", date: "2026-02-02", description: "Electric Bill", amount: -142.00, category: "Bills", merchant: "Con Edison", type: "debit" },
    { id: "t7", date: "2026-02-02", description: "Starbucks Coffee", amount: -6.45, category: "Food & Dining", merchant: "Starbucks", type: "debit" },
    { id: "t8", date: "2026-02-01", description: "Gym Membership", amount: -49.99, category: "Health", merchant: "Planet Fitness", type: "debit" },
    { id: "t9", date: "2026-02-01", description: "Gas Station", amount: -52.30, category: "Transportation", merchant: "Shell", type: "debit" },
    { id: "t10", date: "2026-01-31", description: "Target Shopping", amount: -67.84, category: "Shopping", merchant: "Target", type: "debit" },
    { id: "t11", date: "2026-01-30", description: "Internet Bill", amount: -79.99, category: "Bills", merchant: "Verizon", type: "debit" },
    { id: "t12", date: "2026-01-29", description: "Chipotle Dinner", amount: -14.25, category: "Food & Dining", merchant: "Chipotle", type: "debit" },
    { id: "t13", date: "2026-01-28", description: "Spotify Premium", amount: -10.99, category: "Entertainment", merchant: "Spotify", type: "debit" },
    { id: "t14", date: "2026-01-27", description: "Flight Booking", amount: -389.00, category: "Travel", merchant: "Delta Airlines", type: "debit" },
    { id: "t15", date: "2026-01-26", description: "Freelance Payment", amount: 850.00, category: "Income", merchant: "Client", type: "credit" },
  ]
}

export function getBudgets(): Budget[] {
  return [
    { category: "Food & Dining", limit: 500, spent: 108.02, color: "#9FC490" },
    { category: "Transportation", limit: 200, spent: 76.80, color: "#82A3A1" },
    { category: "Shopping", limit: 300, spent: 197.83, color: "#C0DFA1" },
    { category: "Entertainment", limit: 100, spent: 26.98, color: "#465362" },
    { category: "Bills", limit: 400, spent: 221.99, color: "#6A8A88" },
    { category: "Health", limit: 100, spent: 49.99, color: "#B0D49A" },
    { category: "Travel", limit: 500, spent: 389.00, color: "#5B7B79" },
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
    { category: "Food & Dining", amount: 108.02, percentage: 10.1, color: "#9FC490" },
    { category: "Transportation", amount: 76.80, percentage: 7.2, color: "#82A3A1" },
    { category: "Shopping", amount: 197.83, percentage: 18.5, color: "#C0DFA1" },
    { category: "Entertainment", amount: 26.98, percentage: 2.5, color: "#465362" },
    { category: "Bills", amount: 221.99, percentage: 20.8, color: "#6A8A88" },
    { category: "Health", amount: 49.99, percentage: 4.7, color: "#B0D49A" },
    { category: "Travel", amount: 389.00, percentage: 36.2, color: "#5B7B79" },
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
