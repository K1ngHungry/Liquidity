import { MonthlyReport } from "@/components/reports/monthly-report"
import { SpendingTrends } from "@/components/reports/spending-trends"
import { TopMerchants } from "@/components/reports/top-merchants"
import { IncomeVsExpenses } from "@/components/reports/income-vs-expenses"

export default function ReportsPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Financial Reports</h1>
        <p className="text-sm text-muted-foreground">
          Detailed insights into your financial health
        </p>
      </div>

      <MonthlyReport />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <SpendingTrends />
        <IncomeVsExpenses />
      </div>

      <TopMerchants />
    </div>
  )
}
