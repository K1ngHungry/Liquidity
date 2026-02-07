import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { getTransactions, CATEGORY_COLORS } from "@/lib/data"

export function TopMerchants() {
  const transactions = getTransactions()

  // Aggregate spending by merchant
  const merchantMap = new Map<string, { merchant: string; total: number; count: number; category: string }>()
  for (const tx of transactions) {
    if (tx.type === "debit") {
      const existing = merchantMap.get(tx.merchant)
      if (existing) {
        existing.total += Math.abs(tx.amount)
        existing.count += 1
      } else {
        merchantMap.set(tx.merchant, {
          merchant: tx.merchant,
          total: Math.abs(tx.amount),
          count: 1,
          category: tx.category,
        })
      }
    }
  }

  const topMerchants = Array.from(merchantMap.values())
    .sort((a, b) => b.total - a.total)
    .slice(0, 8)

  const maxSpending = topMerchants[0]?.total || 1

  return (
    <Card className="border-border bg-card">
      <CardHeader>
        <CardTitle className="text-base font-semibold text-foreground">
          Top Merchants
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Where you spend the most
        </p>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-3">
          {topMerchants.map((merchant) => {
            const barWidth = (merchant.total / maxSpending) * 100
            const color = CATEGORY_COLORS[merchant.category] || "#6b7280"
            return (
              <div key={merchant.merchant} className="flex items-center gap-4">
                <div className="w-32 shrink-0 text-sm font-medium text-foreground">
                  {merchant.merchant}
                </div>
                <div className="flex-1">
                  <div className="h-7 rounded-md bg-secondary/50">
                    <div
                      className="flex h-7 items-center rounded-md px-2"
                      style={{
                        width: `${Math.max(barWidth, 8)}%`,
                        backgroundColor: `${color}25`,
                        borderLeft: `3px solid ${color}`,
                      }}
                    >
                      <span className="text-xs font-medium text-foreground">
                        ${merchant.total.toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="w-24 text-right text-xs text-muted-foreground">
                  {merchant.count} transaction{merchant.count > 1 ? "s" : ""}
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
