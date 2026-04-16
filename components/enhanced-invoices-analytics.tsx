'use client'

import React from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, AreaChart, Area
} from 'recharts'
import { Card } from '@/components/ui/card'
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart'
import { KPICard, ProgressMetric, StatusBadge } from '@/components/chart-components'

// Enhanced invoices analytics component
export function EnhancedInvoicesAnalytics({
  totalInvoiceAmount = 2500000,
  totalPaidAmount = 1800000,
  totalBalanceDue = 700000,
  overdueInvoices = 3,
  partialInvoices = 5,
  paidInvoices = 20,
  unpaidInvoices = 8,
}: {
  totalInvoiceAmount?: number
  totalPaidAmount?: number
  totalBalanceDue?: number
  overdueInvoices?: number
  partialInvoices?: number
  paidInvoices?: number
  unpaidInvoices?: number
}) {
  // Invoice aging data
  const agingData = [
    { range: 'Current', days: 'Not Due', invoices: 12, amount: 450000, color: '#10b981' },
    { range: '1-30 Days', days: 'Overdue', invoices: 8, amount: 280000, color: '#f59e0b' },
    { range: '31-60 Days', days: 'Overdue', invoices: 3, amount: 150000, color: '#ef4444' },
    { range: '60+ Days', days: 'Overdue', invoices: 2, amount: 95000, color: '#dc2626' },
  ]

  // Invoice collection trend (7 months)
  const collectionTrend = [
    { month: 'Jan', invoiced: 450000, collected: 380000, outstanding: 70000 },
    { month: 'Feb', invoiced: 520000, collected: 475000, outstanding: 45000 },
    { month: 'Mar', invoiced: 480000, collected: 420000, outstanding: 60000 },
    { month: 'Apr', invoiced: 550000, collected: 520000, outstanding: 30000 },
    { month: 'May', invoiced: 510000, collected: 450000, outstanding: 60000 },
    { month: 'Jun', invoiced: 580000, collected: 500000, outstanding: 80000 },
    { month: 'Jul', invoiced: 620000, collected: 450000, outstanding: 170000 },
  ]

  // Invoice status distribution
  const statusDistribution = [
    { name: 'Paid', value: paidInvoices, color: '#10b981' },
    { name: 'Partial', value: partialInvoices, color: '#f59e0b' },
    { name: 'Unpaid', value: unpaidInvoices, color: '#ef4444' },
    { name: 'Overdue', value: overdueInvoices, color: '#dc2626' },
  ]

  const totalInvoices = paidInvoices + partialInvoices + unpaidInvoices + overdueInvoices
  const collectionRate = totalInvoiceAmount > 0 ? (totalPaidAmount / totalInvoiceAmount) * 100 : 0

  return (
    <div className="space-y-8 p-6">
      {/* Row 1: Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          label="Total Invoiced"
          value={`₹${(totalInvoiceAmount / 100000).toFixed(1)}`}
          unit="L"
          valueClassName="text-blue-600"
        />
        <KPICard
          label="Total Collected"
          value={`₹${(totalPaidAmount / 100000).toFixed(1)}`}
          unit="L"
          trend={12.5}
          trendDirection="up"
          valueClassName="text-green-600"
        />
        <KPICard
          label="Outstanding"
          value={`₹${(totalBalanceDue / 100000).toFixed(1)}`}
          unit="L"
          trend={-5.3}
          trendDirection="up"
          valueClassName="text-orange-600"
        />
        <KPICard
          label="Collection Rate"
          value={collectionRate}
          unit="%"
          trend={3.2}
          trendDirection="up"
          valueClassName="text-purple-600"
        />
      </div>

      {/* Row 2: Invoice Status Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Status Summary Cards */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-foreground mb-4">Invoice Status</h3>
          {statusDistribution.map((status) => (
            <div
              key={status.name}
              className="flex items-center justify-between p-4 rounded-lg border border-border bg-card hover:shadow-sm transition-shadow"
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-4 h-4 rounded-full"
                  style={{ backgroundColor: status.color }}
                />
                <div>
                  <p className="text-sm font-medium text-foreground">{status.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {((status.value / totalInvoices) * 100).toFixed(0)}% of total
                  </p>
                </div>
              </div>
              <span className="text-lg font-bold text-foreground">{status.value}</span>
            </div>
          ))}
        </div>

        {/* Status Distribution Pie */}
        <Card className="p-6 col-span-2">
          <h3 className="text-sm font-semibold text-foreground mb-4">Invoice Distribution</h3>
          <ChartContainer
            config={{
              paid: { label: 'Paid', color: 'hsl(var(--chart-1))' },
              partial: { label: 'Partial', color: 'hsl(var(--chart-2))' },
              unpaid: { label: 'Unpaid', color: 'hsl(var(--chart-3))' },
              overdue: { label: 'Overdue', color: 'hsl(var(--chart-4))' },
            }}
            className="h-80"
          >
            <PieChart>
              <Pie
                data={statusDistribution}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={120}
                paddingAngle={2}
                dataKey="value"
              >
                {statusDistribution.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <ChartTooltip content={<ChartTooltipContent />} />
            </PieChart>
          </ChartContainer>
        </Card>
      </div>

      {/* Row 3: Invoice Aging Analysis */}
      <Card className="p-6">
        <h3 className="text-sm font-semibold text-foreground mb-4">Invoice Aging Analysis</h3>
        <div className="space-y-4">
          {agingData.map((aging) => (
            <div key={aging.range}>
              <div className="flex items-center justify-between mb-2">
                <div>
                  <p className="text-sm font-medium text-foreground">{aging.range}</p>
                  <p className="text-xs text-muted-foreground">{aging.days}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-foreground">
                    ₹{(aging.amount / 100000).toFixed(1)}L ({aging.invoices} invoices)
                  </p>
                </div>
              </div>
              <div className="h-3 w-full rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-300"
                  style={{
                    width: `${(aging.amount / totalBalanceDue) * 100}%`,
                    backgroundColor: aging.color,
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Row 4: Collection Trend */}
      <Card className="p-6">
        <h3 className="text-sm font-semibold text-foreground mb-4">Collection Trend (7 Months)</h3>
        <ChartContainer
          config={{
            invoiced: { label: 'Invoiced', color: 'hsl(var(--chart-1))' },
            collected: { label: 'Collected', color: 'hsl(var(--chart-2))' },
            outstanding: { label: 'Outstanding', color: 'hsl(var(--chart-3))' },
          }}
          className="h-80"
        >
          <AreaChart data={collectionTrend}>
            <defs>
              <linearGradient id="colorInvoiced" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--color-invoiced)" stopOpacity={0.3} />
                <stop offset="95%" stopColor="var(--color-invoiced)" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="colorCollected" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--color-collected)" stopOpacity={0.3} />
                <stop offset="95%" stopColor="var(--color-collected)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey="month" />
            <YAxis />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Area type="monotone" dataKey="invoiced" stroke="var(--color-invoiced)" fillOpacity={1} fill="url(#colorInvoiced)" />
            <Area type="monotone" dataKey="collected" stroke="var(--color-collected)" fillOpacity={1} fill="url(#colorCollected)" />
            <Line type="monotone" dataKey="outstanding" stroke="var(--color-outstanding)" strokeWidth={2} />
          </AreaChart>
        </ChartContainer>
      </Card>

      {/* Row 5: Payment Collection Efficiency */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6">
          <h3 className="text-sm font-semibold text-foreground mb-4">Top Priority Invoices</h3>
          <div className="space-y-3">
            {[
              { invoiceNo: 'INV-2024-0512', party: 'Acme Corp', amount: 125000, days: 65, priority: 'Critical' },
              { invoiceNo: 'INV-2024-0498', party: 'Tech Solutions', amount: 95000, days: 48, priority: 'High' },
              { invoiceNo: 'INV-2024-0487', party: 'Global Ltd', amount: 75000, days: 35, priority: 'Medium' },
            ].map((invoice) => (
              <div key={invoice.invoiceNo} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground">{invoice.invoiceNo}</p>
                  <p className="text-xs text-muted-foreground">{invoice.party}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-foreground">₹{(invoice.amount / 1000).toFixed(0)}K</p>
                  <StatusBadge
                    status={`${invoice.days}d overdue`}
                    variant={invoice.priority === 'Critical' ? 'error' : invoice.priority === 'High' ? 'warning' : 'info'}
                  />
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-6">
          <h3 className="text-sm font-semibold text-foreground mb-4">Key Metrics</h3>
          <div className="space-y-4">
            <div className="p-4 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
              <p className="text-xs text-muted-foreground mb-1">Average Payment Days</p>
              <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">32 days</p>
            </div>
            <div className="p-4 bg-green-50 dark:bg-green-950 rounded-lg border border-green-200 dark:border-green-800">
              <p className="text-xs text-muted-foreground mb-1">DSO (Days Sales Outstanding)</p>
              <p className="text-2xl font-bold text-green-700 dark:text-green-300">28 days</p>
            </div>
            <div className="p-4 bg-red-50 dark:bg-red-950 rounded-lg border border-red-200 dark:border-red-800">
              <p className="text-xs text-muted-foreground mb-1">Invoices at Risk</p>
              <p className="text-2xl font-bold text-red-700 dark:text-red-300">{overdueInvoices}</p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}
