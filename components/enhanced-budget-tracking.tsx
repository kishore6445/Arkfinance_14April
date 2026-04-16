'use client'

import React from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  LineChart, Line, ComposedChart
} from 'recharts'
import { Card } from '@/components/ui/card'
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart'
import { KPICard, ProgressMetric, StatusBadge } from '@/components/chart-components'

// Enhanced budget tracking component
export function EnhancedBudgetTracking({
  totalBudget = 9000000,
  totalSpent = 6200000,
  burnRate = 900000,
  daysRemaining = 8,
}: {
  totalBudget?: number
  totalSpent?: number
  burnRate?: number
  daysRemaining?: number
}) {
  // Budget vs Actual by Category
  const budgetData = [
    { category: 'Salaries', budget: 4500000, actual: 4200000, variance: 300000 },
    { category: 'Operations', budget: 1800000, actual: 1520000, variance: 280000 },
    { category: 'Marketing', budget: 900000, actual: 850000, variance: 50000 },
    { category: 'R&D', budget: 600000, actual: 580000, variance: 20000 },
    { category: 'Admin', budget: 450000, actual: 420000, variance: 30000 },
    { category: 'Other', budget: 750000, actual: 630000, variance: 120000 },
  ]

  // Monthly budget tracking (6 months)
  const monthlyBudgetTrack = [
    { month: 'Jan', budget: 1500000, actual: 1420000, forecast: 1450000 },
    { month: 'Feb', budget: 1500000, actual: 1480000, forecast: 1520000 },
    { month: 'Mar', budget: 1500000, actual: 1510000, forecast: 1540000 },
    { month: 'Apr', budget: 1500000, actual: 1450000, forecast: 1460000 },
    { month: 'May', budget: 1500000, actual: 1520000, forecast: 1550000 },
    { month: 'Jun', budget: 1500000, actual: 1420000, forecast: 1480000 },
  ]

  // Departmental breakdown
  const departmentBudget = [
    { name: 'Salaries', allocation: 50, color: '#3b82f6' },
    { name: 'Operations', allocation: 20, color: '#10b981' },
    { name: 'Marketing', allocation: 10, color: '#f59e0b' },
    { name: 'R&D', allocation: 10, color: '#8b5cf6' },
    { name: 'Other', allocation: 10, color: '#6b7280' },
  ]

  const percentageSpent = (totalSpent / totalBudget) * 100
  const remainingBudget = totalBudget - totalSpent
  const monthsRemaining = Math.ceil(remainingBudget / burnRate)

  return (
    <div className="space-y-8 p-6">
      {/* Row 1: Budget Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          label="Total Budget"
          value={`₹${(totalBudget / 100000).toFixed(1)}`}
          unit="L"
          valueClassName="text-blue-600"
        />
        <KPICard
          label="Total Spent"
          value={`₹${(totalSpent / 100000).toFixed(1)}`}
          unit="L"
          trend={percentageSpent.toFixed(1)}
          trendDirection="down"
          valueClassName="text-orange-600"
        />
        <KPICard
          label="Remaining"
          value={`₹${(remainingBudget / 100000).toFixed(1)}`}
          unit="L"
          valueClassName="text-green-600"
        />
        <KPICard
          label="Burn Rate"
          value={`₹${(burnRate / 100000).toFixed(1)}`}
          unit="L/month"
          valueClassName="text-red-600"
        />
      </div>

      {/* Row 2: Budget Status */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Overall Budget Consumption */}
        <div className="bg-card rounded-lg border border-border p-6">
          <h3 className="text-sm font-semibold text-foreground mb-4">Overall Budget Status</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Budget Utilization</span>
              <span className="text-2xl font-bold text-foreground">{percentageSpent.toFixed(1)}%</span>
            </div>
            <div className="h-4 w-full rounded-full bg-muted overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-300"
                style={{
                  width: `${Math.min(percentageSpent, 100)}%`,
                  backgroundColor: percentageSpent > 90 ? '#ef4444' : percentageSpent > 75 ? '#f59e0b' : '#10b981',
                }}
              />
            </div>
            <div className="flex justify-between text-xs text-muted-foreground pt-2 border-t border-border">
              <span>Spent: ₹{(totalSpent / 1000000).toFixed(1)}M</span>
              <span>Budget: ₹{(totalBudget / 1000000).toFixed(1)}M</span>
            </div>
          </div>
        </div>

        {/* Budget Timeline */}
        <div className="bg-card rounded-lg border border-border p-6">
          <h3 className="text-sm font-semibold text-foreground mb-4">Budget Timeline</h3>
          <div className="space-y-4">
            <div className="p-3 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
              <p className="text-xs text-muted-foreground mb-1">Days Remaining</p>
              <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">{daysRemaining} days</p>
            </div>
            <div className="p-3 bg-green-50 dark:bg-green-950 rounded-lg border border-green-200 dark:border-green-800">
              <p className="text-xs text-muted-foreground mb-1">Months Remaining</p>
              <p className="text-2xl font-bold text-green-700 dark:text-green-300">{monthsRemaining.toFixed(1)}</p>
            </div>
            <div className="p-3 bg-purple-50 dark:bg-purple-950 rounded-lg border border-purple-200 dark:border-purple-800">
              <p className="text-xs text-muted-foreground mb-1">Monthly Run Rate</p>
              <p className="text-2xl font-bold text-purple-700 dark:text-purple-300">
                ₹{(burnRate / 100000).toFixed(1)}L
              </p>
            </div>
          </div>
        </div>

        {/* Budget Status Alerts */}
        <div className="bg-card rounded-lg border border-border p-6">
          <h3 className="text-sm font-semibold text-foreground mb-4">Status Alerts</h3>
          <div className="space-y-3">
            {percentageSpent > 85 && (
              <div className="flex items-start gap-3 p-3 bg-red-50 dark:bg-red-950 rounded-lg border border-red-200 dark:border-red-800">
                <div className="mt-0.5 w-2 h-2 rounded-full bg-red-600 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-red-900 dark:text-red-200">High Budget Utilization</p>
                  <p className="text-xs text-red-700 dark:text-red-300 mt-0.5">
                    {percentageSpent.toFixed(0)}% of budget already spent
                  </p>
                </div>
              </div>
            )}
            {remainingBudget < burnRate && (
              <div className="flex items-start gap-3 p-3 bg-orange-50 dark:bg-orange-950 rounded-lg border border-orange-200 dark:border-orange-800">
                <div className="mt-0.5 w-2 h-2 rounded-full bg-orange-600 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-orange-900 dark:text-orange-200">Budget Depletion Risk</p>
                  <p className="text-xs text-orange-700 dark:text-orange-300 mt-0.5">
                    Only enough for {monthsRemaining.toFixed(0)} more month{monthsRemaining !== 1 ? 's' : ''}
                  </p>
                </div>
              </div>
            )}
            {percentageSpent <= 85 && remainingBudget >= burnRate && (
              <div className="flex items-start gap-3 p-3 bg-green-50 dark:bg-green-950 rounded-lg border border-green-200 dark:border-green-800">
                <div className="mt-0.5 w-2 h-2 rounded-full bg-green-600 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-green-900 dark:text-green-200">Budget on Track</p>
                  <p className="text-xs text-green-700 dark:text-green-300 mt-0.5">
                    Spending within normal parameters
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Row 3: Budget vs Actual by Category */}
      <Card className="p-6">
        <h3 className="text-sm font-semibold text-foreground mb-4">Budget vs Actual by Category</h3>
        <ChartContainer
          config={{
            budget: { label: 'Budget', color: 'hsl(var(--chart-1))' },
            actual: { label: 'Actual', color: 'hsl(var(--chart-2))' },
          }}
          className="h-80"
        >
          <BarChart data={budgetData} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis type="number" />
            <YAxis dataKey="category" type="category" width={80} />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Legend />
            <Bar dataKey="budget" fill="var(--color-budget)" radius={[0, 8, 8, 0]} />
            <Bar dataKey="actual" fill="var(--color-actual)" radius={[0, 8, 8, 0]} />
          </BarChart>
        </ChartContainer>
      </Card>

      {/* Row 4: Department Budget Allocation */}
      <Card className="p-6">
        <h3 className="text-sm font-semibold text-foreground mb-4">Department Budget Allocation</h3>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-4">
            {departmentBudget.map((dept) => (
              <ProgressMetric
                key={dept.name}
                label={dept.name}
                value={dept.allocation}
                total={100}
                showPercentage={true}
                color={dept.color}
              />
            ))}
          </div>
          <div className="bg-muted rounded-lg p-6 flex items-center justify-center">
            <div className="text-center">
              <p className="text-xs text-muted-foreground mb-2">Total Budget Allocated</p>
              <p className="text-4xl font-bold text-foreground mb-2">100%</p>
              <p className="text-sm text-muted-foreground">
                ₹{(totalBudget / 1000000).toFixed(1)} Million
              </p>
            </div>
          </div>
        </div>
      </Card>

      {/* Row 5: Monthly Budget Tracking */}
      <Card className="p-6">
        <h3 className="text-sm font-semibold text-foreground mb-4">Monthly Budget Tracking</h3>
        <ChartContainer
          config={{
            budget: { label: 'Budget', color: 'hsl(var(--chart-1))' },
            actual: { label: 'Actual', color: 'hsl(var(--chart-2))' },
            forecast: { label: 'Forecast', color: 'hsl(var(--chart-3))' },
          }}
          className="h-80"
        >
          <ComposedChart data={monthlyBudgetTrack}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey="month" />
            <YAxis />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Legend />
            <Bar dataKey="budget" fill="var(--color-budget)" radius={[8, 8, 0, 0]} />
            <Bar dataKey="actual" fill="var(--color-actual)" radius={[8, 8, 0, 0]} />
            <Line type="monotone" dataKey="forecast" stroke="var(--color-forecast)" strokeWidth={2} strokeDasharray="5 5" />
          </ComposedChart>
        </ChartContainer>
      </Card>

      {/* Row 6: Category Variance Details */}
      <Card className="p-6 bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
        <h3 className="text-sm font-semibold text-foreground mb-4">Variance Analysis</h3>
        <div className="space-y-3">
          {budgetData
            .sort((a, b) => b.variance - a.variance)
            .slice(0, 5)
            .map((item) => (
              <div
                key={item.category}
                className="flex items-center justify-between p-3 bg-card rounded-lg border border-border"
              >
                <div>
                  <p className="text-sm font-medium text-foreground">{item.category}</p>
                  <p className="text-xs text-muted-foreground">
                    Variance: ₹{(item.variance / 1000).toFixed(0)}K
                  </p>
                </div>
                <StatusBadge
                  status={`-${((item.variance / item.budget) * 100).toFixed(1)}%`}
                  variant="success"
                />
              </div>
            ))}
        </div>
      </Card>
    </div>
  )
}
