'use client'

import React from 'react'
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar
} from 'recharts'
import { Card } from '@/components/ui/card'
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart'
import { KPICard, ProgressMetric, HealthGauge, StatusBadge } from '@/components/chart-components'

// Enhanced buckets allocation component
export function EnhancedBucketsAllocation({
  totalCash = 5000000,
  operatingExpensesAllocated = 1200000,
  salariesAllocated = 1800000,
  taxesAllocated = 400000,
  loanRepaymentsAllocated = 500000,
  investmentsAllocated = 600000,
  contingencyAllocated = 500000,
}: {
  totalCash?: number
  operatingExpensesAllocated?: number
  salariesAllocated?: number
  taxesAllocated?: number
  loanRepaymentsAllocated?: number
  investmentsAllocated?: number
  contingencyAllocated?: number
}) {
  // Bucket allocation data
  const buckets = [
    {
      name: 'Operating Expenses',
      allocated: operatingExpensesAllocated,
      spent: 950000,
      color: '#3b82f6',
      icon: '💼',
    },
    {
      name: 'Salaries',
      allocated: salariesAllocated,
      spent: 1750000,
      color: '#10b981',
      icon: '👥',
    },
    {
      name: 'Taxes & Compliance',
      allocated: taxesAllocated,
      spent: 350000,
      color: '#f59e0b',
      icon: '📋',
    },
    {
      name: 'Loan Repayments',
      allocated: loanRepaymentsAllocated,
      spent: 450000,
      color: '#8b5cf6',
      icon: '💳',
    },
    {
      name: 'Investments & Growth',
      allocated: investmentsAllocated,
      spent: 400000,
      color: '#06b6d4',
      icon: '📈',
    },
    {
      name: 'Contingency Reserve',
      allocated: contingencyAllocated,
      spent: 100000,
      color: '#6b7280',
      icon: '🛡️',
    },
  ]

  const totalAllocated = buckets.reduce((sum, b) => sum + b.allocated, 0)
  const totalSpent = buckets.reduce((sum, b) => sum + b.spent, 0)
  const unallocated = totalCash - totalAllocated

  // Pie chart data
  const allocationPieData = buckets.map((b) => ({
    name: b.name,
    value: b.allocated,
    color: b.color,
  }))

  // Utilization by bucket
  const utilizationData = buckets.map((b) => ({
    name: b.name.split(' ')[0],
    utilization: (b.spent / b.allocated) * 100,
    budget: b.allocated,
    spent: b.spent,
  }))

  // Health scores for each bucket
  const bucketHealthScores = buckets.map((b) => {
    const utilization = (b.spent / b.allocated) * 100
    let health = 100
    if (utilization > 100) health = 0
    else if (utilization > 95) health = 20
    else if (utilization > 85) health = 40
    else if (utilization > 75) health = 60
    else if (utilization > 50) health = 80
    else health = 100

    return {
      name: b.name.split(' ')[0],
      health,
      utilization: Math.min(utilization, 100),
    }
  })

  return (
    <div className="space-y-8 p-6">
      {/* Row 1: Cash Allocation Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          label="Total Cash Available"
          value={`₹${(totalCash / 100000).toFixed(1)}`}
          unit="L"
          valueClassName="text-blue-600"
        />
        <KPICard
          label="Total Allocated"
          value={`₹${(totalAllocated / 100000).toFixed(1)}`}
          unit="L"
          trend={(totalAllocated / totalCash * 100).toFixed(0)}
          trendDirection="up"
          valueClassName="text-green-600"
        />
        <KPICard
          label="Total Spent"
          value={`₹${(totalSpent / 100000).toFixed(1)}`}
          unit="L"
          valueClassName="text-orange-600"
        />
        <KPICard
          label="Unallocated"
          value={`₹${(unallocated / 100000).toFixed(1)}`}
          unit="L"
          valueClassName="text-purple-600"
        />
      </div>

      {/* Row 2: Allocation & Utilization Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Overall Status */}
        <div className="bg-card rounded-lg border border-border p-6 flex flex-col">
          <h3 className="text-sm font-semibold text-foreground mb-6">Allocation Status</h3>
          <div className="space-y-4 flex-1">
            <div className="flex items-center justify-between pb-4 border-b border-border">
              <span className="text-sm text-muted-foreground">Allocated</span>
              <span className="text-lg font-bold text-foreground">
                {((totalAllocated / totalCash) * 100).toFixed(1)}%
              </span>
            </div>
            <div className="h-3 w-full rounded-full bg-muted overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-green-500 to-blue-500"
                style={{ width: `${(totalAllocated / totalCash) * 100}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Allocated: ₹{(totalAllocated / 1000000).toFixed(1)}M</span>
              <span>Available: ₹{(totalCash / 1000000).toFixed(1)}M</span>
            </div>
          </div>
          <div className="mt-6 p-3 bg-green-50 dark:bg-green-950 rounded-lg border border-green-200 dark:border-green-800">
            <p className="text-xs font-medium text-green-700 dark:text-green-300">
              Unallocated: ₹{(unallocated / 100000).toFixed(1)}L
            </p>
          </div>
        </div>

        {/* Allocation Pie Chart */}
        <Card className="p-6 col-span-2">
          <h3 className="text-sm font-semibold text-foreground mb-4">Cash Allocation Distribution</h3>
          <ChartContainer
            config={{
              allocation: { label: 'Allocation', color: 'hsl(var(--chart-1))' },
            }}
            className="h-80"
          >
            <PieChart>
              <Pie
                data={allocationPieData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={120}
                paddingAngle={2}
                dataKey="value"
              >
                {allocationPieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <ChartTooltip content={<ChartTooltipContent />} />
            </PieChart>
          </ChartContainer>
        </Card>
      </div>

      {/* Row 3: Bucket Details */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-foreground">Bucket Allocation Details</h3>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {buckets.map((bucket) => {
            const utilization = (bucket.spent / bucket.allocated) * 100
            const remaining = bucket.allocated - bucket.spent
            const healthStatus =
              utilization > 100
                ? 'Over Budget'
                : utilization > 95
                ? 'Critical'
                : utilization > 85
                ? 'Warning'
                : utilization > 75
                ? 'Caution'
                : 'Healthy'
            const healthVariant =
              utilization > 100 ? 'error' : utilization > 85 ? 'warning' : 'success'

            return (
              <Card
                key={bucket.name}
                className="p-5 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-lg">{bucket.icon}</span>
                      <p className="text-sm font-semibold text-foreground">{bucket.name}</p>
                    </div>
                    <StatusBadge status={healthStatus} variant={healthVariant} />
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Allocated</span>
                    <span className="font-semibold text-foreground">
                      ₹{(bucket.allocated / 100000).toFixed(1)}L
                    </span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Spent</span>
                    <span className="font-semibold text-foreground">
                      ₹{(bucket.spent / 100000).toFixed(1)}L
                    </span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-300"
                      style={{
                        width: `${Math.min(utilization, 100)}%`,
                        backgroundColor:
                          utilization > 100
                            ? '#ef4444'
                            : utilization > 85
                            ? '#f59e0b'
                            : '#10b981',
                      }}
                    />
                  </div>
                  <div className="flex justify-between text-xs text-muted-foreground pt-1">
                    <span>{utilization.toFixed(1)}% used</span>
                    <span>₹{(remaining / 100000).toFixed(1)}L left</span>
                  </div>
                </div>
              </Card>
            )
          })}
        </div>
      </div>

      {/* Row 4: Utilization Analysis */}
      <Card className="p-6">
        <h3 className="text-sm font-semibold text-foreground mb-4">Bucket Utilization Rate</h3>
        <ChartContainer
          config={{
            budget: { label: 'Budget', color: 'hsl(var(--chart-1))' },
            spent: { label: 'Spent', color: 'hsl(var(--chart-2))' },
          }}
          className="h-80"
        >
          <BarChart data={utilizationData}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey="name" />
            <YAxis label={{ value: 'Amount', angle: -90, position: 'insideLeft' }} />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Legend />
            <Bar dataKey="budget" fill="var(--color-budget)" radius={[8, 8, 0, 0]} />
            <Bar dataKey="spent" fill="var(--color-spent)" radius={[8, 8, 0, 0]} />
          </BarChart>
        </ChartContainer>
      </Card>

      {/* Row 5: Bucket Health Radar */}
      <Card className="p-6">
        <h3 className="text-sm font-semibold text-foreground mb-4">Bucket Health Radar</h3>
        <ChartContainer
          config={{
            health: { label: 'Health Score', color: 'hsl(var(--chart-1))' },
          }}
          className="h-80 flex items-center justify-center"
        >
          <RadarChart data={bucketHealthScores}>
            <PolarGrid stroke="var(--border)" />
            <PolarAngleAxis dataKey="name" />
            <PolarRadiusAxis angle={90} domain={[0, 100]} />
            <Radar
              name="Health Score"
              dataKey="health"
              stroke="var(--color-health)"
              fill="var(--color-health)"
              fillOpacity={0.6}
            />
            <ChartTooltip content={<ChartTooltipContent />} />
          </RadarChart>
        </ChartContainer>
      </Card>

      {/* Row 6: Summary & Recommendations */}
      <Card className="p-6 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950 dark:to-purple-950 border-blue-200 dark:border-blue-800">
        <h3 className="text-sm font-semibold text-foreground mb-4">Allocation Summary & Recommendations</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-3">
            <div className="text-sm">
              <p className="text-muted-foreground mb-1">Total Unallocated</p>
              <p className="text-2xl font-bold text-blue-600">₹{(unallocated / 100000).toFixed(1)}L</p>
              <p className="text-xs text-muted-foreground mt-1">
                ({((unallocated / totalCash) * 100).toFixed(1)}% of total cash)
              </p>
            </div>
            <div className="text-sm">
              <p className="text-muted-foreground mb-1">High-Risk Buckets</p>
              <p className="text-lg font-bold text-orange-600">
                {buckets.filter((b) => (b.spent / b.allocated) * 100 > 85).length}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Buckets exceeding 85% utilization
              </p>
            </div>
          </div>
          <div className="space-y-3">
            <div className="text-sm p-3 bg-white dark:bg-slate-900 rounded border border-blue-200 dark:border-blue-800">
              <p className="font-medium text-foreground mb-2">Recommendation:</p>
              <p className="text-xs text-muted-foreground">
                {unallocated > 500000
                  ? 'Consider allocating remaining cash to growth initiatives or reserve funds.'
                  : unallocated > 0
                  ? 'Minimal unallocated funds. Monitor spending closely.'
                  : 'All cash is allocated. Monitor bucket utilization carefully.'}
              </p>
            </div>
          </div>
        </div>
      </Card>
    </div>
  )
}
