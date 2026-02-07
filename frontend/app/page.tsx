"use client"

import { useState, useEffect } from "react"
import type { Session } from "@supabase/supabase-js"
import { StatCards } from "@/components/dashboard/stat-cards"
import { SpendingChart } from "@/components/dashboard/spending-chart"
import { BudgetTracker } from "@/components/dashboard/budget-tracker"
import { CategoryBreakdown } from "@/components/dashboard/category-breakdown"
import { RecentTransactions } from "@/components/dashboard/recent-transactions"
import { AuthForm } from "@/components/auth-form"
import { UserRegistrationForm } from "@/components/user-registration-form"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { apiClient, type NessieMappingResponse, type DashboardResponse } from "@/lib/api"
import {
  getFinancialSummary,
  getMonthlySpending,
  getCategoryBreakdown,
  getBudgets,
  getTransactions,
} from "@/lib/data"
import { supabase } from "@/lib/supabase"
import { Loader2, Sparkles } from "lucide-react"

export default function DashboardPage() {
  const [session, setSession] = useState<Session | null>(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [mappingLoading, setMappingLoading] = useState(false)
  const [nessieMapping, setNessieMapping] = useState<NessieMappingResponse | null>(null)
  const [isOptimizing, setIsOptimizing] = useState(false)
  const [optimizationResult, setOptimizationResult] = useState<any>(null)
  const [dashboardData, setDashboardData] = useState<DashboardResponse | null>(null)
  const [dashboardLoading, setDashboardLoading] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session ?? null)
      setAuthLoading(false)
    })

    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession)
    })

    return () => {
      listener.subscription.unsubscribe()
    }
  }, [])

  useEffect(() => {
    const accessToken = session?.access_token
    if (!accessToken) {
      setNessieMapping(null)
      setDashboardData(null)
      return
    }
    setMappingLoading(true)
    apiClient
      .getNessieMapping(accessToken)
      .then((mapping) => setNessieMapping(mapping))
      .catch(() => setNessieMapping(null))
      .finally(() => setMappingLoading(false))
  }, [session?.access_token])

  useEffect(() => {
    const accessToken = session?.access_token
    if (!accessToken || !nessieMapping) {
      setDashboardData(null)
      return
    }
    setDashboardLoading(true)
    apiClient
      .getNessieDashboard(accessToken)
      .then((data) => setDashboardData(data))
      .catch(() => setDashboardData(null))
      .finally(() => setDashboardLoading(false))
  }, [session?.access_token, nessieMapping?.nessie_customer_id])

  const handleRegisterSuccess = (mapping: NessieMappingResponse) => {
    setNessieMapping(mapping)
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    setNessieMapping(null)
    setOptimizationResult(null)
    setDashboardData(null)
  }

  const handleOptimize = async () => {
    if (!session?.access_token) return
    setIsOptimizing(true)
    try {
      const result = await apiClient.optimizeCurrentUser(session.access_token)
      setOptimizationResult(result)
    } catch (error) {
      console.error("Optimization failed:", error)
    } finally {
      setIsOptimizing(false)
    }
  }

  if (authLoading) {
    return (
      <div className="flex flex-col gap-6 items-center justify-center min-h-[60vh]">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!session) {
    return (
      <div className="flex flex-col gap-6 items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-2 mb-8">
          <h1 className="text-3xl font-bold text-foreground">Welcome to FinTrack</h1>
          <p className="text-muted-foreground max-w-md mx-auto">
            Sign in to connect your bank account and optimize your liquidity.
          </p>
        </div>
        <AuthForm />
      </div>
    )
  }

  if (mappingLoading) {
    return (
      <div className="flex flex-col gap-6 items-center justify-center min-h-[60vh]">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!nessieMapping && !mappingLoading) {
    return (
      <div className="flex flex-col gap-6 items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-2 mb-8">
          <h1 className="text-3xl font-bold text-foreground">Welcome to Liquidity</h1>
          <p className="text-muted-foreground max-w-md mx-auto">
            Connect your bank account to start optimizing your liquidity and achieving your financial goals.
          </p>
        </div>
        <UserRegistrationForm
          accessToken={session.access_token}
          onRegisterSuccess={handleRegisterSuccess}
        />
      </div>
    )
  }

  if (dashboardLoading) {
    return (
      <div className="flex flex-col gap-6 items-center justify-center min-h-[60vh]">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  const demoFallback = {
    summary: getFinancialSummary(),
    monthlySpending: getMonthlySpending(),
    categoryBreakdown: getCategoryBreakdown(),
    budgets: getBudgets(),
    transactions: getTransactions(),
  }

  const demoFlags = dashboardData?.demoFlags ?? {
    summary: true,
    transactions: true,
    bills: true,
    deposits: true,
    monthlySpending: true,
    categoryBreakdown: true,
    budgets: true,
  }

  const resolvedSummary = demoFlags.summary || !dashboardData ? demoFallback.summary : dashboardData.summary
  const resolvedMonthlySpending =
    demoFlags.monthlySpending || !dashboardData ? demoFallback.monthlySpending : dashboardData.monthlySpending
  const resolvedCategoryBreakdown =
    demoFlags.categoryBreakdown || !dashboardData ? demoFallback.categoryBreakdown : dashboardData.categoryBreakdown
  const resolvedBudgets =
    demoFlags.budgets || !dashboardData ? demoFallback.budgets : dashboardData.budgets
  const resolvedTransactions =
    demoFlags.transactions || !dashboardData ? demoFallback.transactions : dashboardData.transactions

  const usingDemoData = Object.values(demoFlags).some(Boolean)

  return (
    <div className="flex flex-col gap-6">
      {usingDemoData && (
        <Card className="border-amber-400/40 bg-amber-500/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-base text-amber-200">Using Demo Data</CardTitle>
            <CardDescription className="text-amber-100/80">
              Some Nessie data is unavailable. The dashboard is showing demo values where needed.
            </CardDescription>
          </CardHeader>
        </Card>
      )}
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            Your financial overview at a glance
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={handleOptimize} disabled={isOptimizing} className="gap-2">
            {isOptimizing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4" />
            )}
            Optimize My Budget
          </Button>
          <Button variant="outline" onClick={handleSignOut}>
            Sign Out
          </Button>
        </div>
      </div>

      {optimizationResult && (() => {
        const solver = optimizationResult?.solver_result ?? { solution: {}, dropped_constraints: [] }
        const summary = optimizationResult?.nessie_data_summary ?? { total_balance: 0, total_bills: 0, total_bill_amount: 0 }

        return (
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
                  {Object.entries(solver.solution || {}).map(([key, value]) => (
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
                    <li>Total Balance: ${summary.total_balance?.toLocaleString() ?? 0}</li>
                    <li>Bills Covered: {summary.total_bills ?? 0} (${summary.total_bill_amount?.toLocaleString() ?? 0})</li>
                  </ul>
                </div>
                {solver.dropped_constraints?.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-2 text-amber-500">Adjustments Made</h4>
                    <p className="text-xs text-muted-foreground">
                      Some goals were adjusted to meet hard constraints:
                    </p>
                    <ul className="list-disc list-inside text-xs text-muted-foreground mt-1">
                      {solver.dropped_constraints.map((c: string, i: number) => (
                        <li key={i}>{c}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
        )
      })()}

      <StatCards summary={resolvedSummary} />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <SpendingChart data={resolvedMonthlySpending} />
        </div>
        <div>
          <CategoryBreakdown data={resolvedCategoryBreakdown} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <BudgetTracker budgets={resolvedBudgets} />
        <RecentTransactions transactions={resolvedTransactions} />
      </div>
    </div>
  )
}
