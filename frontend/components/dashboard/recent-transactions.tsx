import { ArrowDownLeft, ArrowUpRight } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { getTransactions, CATEGORY_COLORS } from "@/lib/data"
import type { DashboardTransaction } from "@/lib/api"

export function RecentTransactions({ transactions }: { transactions?: DashboardTransaction[] }) {
  const resolved = (transactions && transactions.length > 0 ? transactions : getTransactions()).slice(0, 8)

  return (
    <Card className="border-border bg-card">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold text-foreground">
          Recent Transactions
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Latest activity from your accounts
        </p>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-3">
          {resolved.map((tx) => (
            <div
              key={tx.id}
              className="flex items-center justify-between rounded-lg bg-secondary/50 px-3 py-2.5"
            >
              <div className="flex items-center gap-3">
                <div
                  className="flex h-9 w-9 items-center justify-center rounded-lg"
                  style={{
                    backgroundColor: `${CATEGORY_COLORS[tx.category] || "#6b7280"}15`,
                  }}
                >
                  {tx.type === "credit" ? (
                    <ArrowUpRight
                      className="h-4 w-4"
                      style={{ color: CATEGORY_COLORS[tx.category] || "#6b7280" }}
                    />
                  ) : (
                    <ArrowDownLeft
                      className="h-4 w-4"
                      style={{ color: CATEGORY_COLORS[tx.category] || "#6b7280" }}
                    />
                  )}
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">{tx.description}</p>
                  <p className="text-xs text-muted-foreground">{tx.date}</p>
                </div>
              </div>
              <span
                className={`text-sm font-semibold ${
                  tx.type === "credit" ? "text-primary" : "text-foreground"
                }`}
              >
                {tx.type === "credit" ? "+" : ""}${Math.abs(tx.amount).toFixed(2)}
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
