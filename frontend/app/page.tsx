"use client"

import { useState, useEffect } from "react"
import { StatCards } from "@/components/dashboard/stat-cards"
import { SpendingChart } from "@/components/dashboard/spending-chart"
import { BudgetTracker } from "@/components/dashboard/budget-tracker"
import { CategoryBreakdown } from "@/components/dashboard/category-breakdown"
import { RecentTransactions } from "@/components/dashboard/recent-transactions"
import { UserRegistrationForm } from "@/components/user-registration-form"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { apiClient } from "@/lib/api"
import { Loader2, Sparkles } from "lucide-react"

export default function DashboardPage() {
  const [userId, setUserId] = useState<number | null>(null)
  const [isOptimizing, setIsOptimizing] = useState(false)
  const [optimizationResult, setOptimizationResult] = useState<any>(null)

  useEffect(() => {
    // Check for stored user ID (simple persistence for MVP)
    const storedId = localStorage.getItem("liquidity_user_id")
    if (storedId) {
      setUserId(parseInt(storedId))
    }
  }, [])

  const handleRegisterSuccess = (newUserId: number) => {
    setUserId(newUserId)
    localStorage.setItem("liquidity_user_id", newUserId.toString())
  }

  const handleOptimize = async () => {
    if (!userId) return
    setIsOptimizing(true)
    try {
      const result = await apiClient.optimizeUser(userId)
      setOptimizationResult(result)
    } catch (error) {
      console.error("Optimization failed:", error)
    } finally {
      setIsOptimizing(false)
    }
  }

  if (!userId) {
    return (
      <div className="flex flex-col gap-6 items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-2 mb-8">
          <h1 className="text-3xl font-bold text-foreground">Welcome to FinTrack</h1>
          <p className="text-muted-foreground max-w-md mx-auto">
            Connect your bank account to start optimizing your liquidity and achieving your financial goals.
          </p>
        </div>
        <UserRegistrationForm onRegisterSuccess={handleRegisterSuccess} />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            Your financial overview at a glance
          </p>
        </div>
        <Button onClick={handleOptimize} disabled={isOptimizing} className="gap-2">
          {isOptimizing ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Sparkles className="h-4 w-4" />
          )}
          Optimize My Budget
        </Button>
      </div>

      {optimizationResult && (
        <Card className="bg-primary/5 border-primary/20">
          <CardHeader>
            <CardTitle className="text-primary flex items-center gap-2">
              <Sparkles className="h-5 w-5" />
              Optimization Complete
            </CardTitle>
            <CardDescription>
              We found a way to maximize your savings based on your real-time data.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <h4 className="font-medium mb-2">Recommended Allocation</h4>
                <div className="space-y-1">
                  {Object.entries(optimizationResult.solver_result.solution).map(([key, value]) => (
                    <div key={key} className="flex justify-between text-sm bg-background/50 p-2 rounded">
                      <span className="capitalize">{key.replace('_', ' ')}</span>
                      <span className="font-mono font-medium">${Number(value).toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium mb-2">Summary</h4>
                  <ul className="text-sm space-y-1 text-muted-foreground">
                    <li>Total Balance: ${optimizationResult.nessie_data_summary.total_balance.toLocaleString()}</li>
                    <li>Bills Covered: {optimizationResult.nessie_data_summary.total_bills} (${optimizationResult.nessie_data_summary.total_bill_amount.toLocaleString()})</li>
                  </ul>
                </div>
                {optimizationResult.solver_result.dropped_constraints.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-2 text-amber-500">Adjustments Made</h4>
                    <p className="text-xs text-muted-foreground">
                      Some goals were adjusted to meet hard constraints:
                    </p>
                    <ul className="list-disc list-inside text-xs text-muted-foreground mt-1">
                      {optimizationResult.solver_result.dropped_constraints.map((c: string, i: number) => (
                        <li key={i}>{c}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <StatCards />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <SpendingChart />
        </div>
        <div>
          <CategoryBreakdown />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <BudgetTracker />
        <RecentTransactions />
      </div>
    </div>
  )
}
