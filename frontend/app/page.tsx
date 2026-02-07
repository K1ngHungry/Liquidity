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
import { Loader2 } from "lucide-react"

export default function DashboardPage() {
  const [session, setSession] = useState<Session | null>(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [mappingLoading, setMappingLoading] = useState(false)
  const [nessieMapping, setNessieMapping] = useState<NessieMappingResponse | null>(null)

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

    setDashboardData(null)
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

  // REMOVED: Blocking UserRegistrationForm
  // We now allow the dashboard to render even if nessieMapping is null.
  // The dashboard will show demo data (handled by demoFallback logic below).

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

      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            Your financial overview at a glance
          </p>
        </div>
        <div className="flex items-center gap-2">

          <Button variant="outline" onClick={handleSignOut}>
            Sign Out
          </Button>
        </div>
      </div>



      <StatCards summary={resolvedSummary} />

      <div className="grid grid-cols-1 gap-6">
        <SpendingChart data={resolvedMonthlySpending} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <CategoryBreakdown data={resolvedCategoryBreakdown} />
        <RecentTransactions transactions={resolvedTransactions} />
      </div>
    </div>
  )
}
