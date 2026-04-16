'use client'

import React from 'react'
import {
  BarChart, Bar, PieChart, Pie, Cell, LineChart, Line, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ComposedChart
} from 'recharts'
import { Card } from '@/components/ui/card'
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart'
import { KPICard, ProgressMetric, StatusBadge } from '@/components/chart-components'

// Enhanced revenue breakdown component
export function EnhancedRevenueBreakdown({
  totalRevenue = 1500000,
  revenueGrowth = 12.5,
  topCategory = 'Product Sales',
  topCategoryAmount = 825000,
}: {
  totalRevenue?: number
  revenueGrowth?: number
  topCategory?: string
  topCategoryAmount?: number
}) {
  // Revenue by category
  const revenueByCategory = [
    { name: 'Product Sales', value: 825000, count: 45, color: '#3b82f6', trend: 8.2 },
    { name: 'Service Revenue', value: 450000, count: 28, color: '#10b981', trend: 15.3 },
    { name: 'Subscriptions', value: 225000, count: 120, color: '#8b5cf6', trend: 22.1 },
  ]

  // 6-month revenue trend
  const revenueTrend = [
    { month: 'Jan', revenue: 1200000, target: 1300000, forecast: 1350000 },
    { month: 'Feb', revenue: 1350000, target: 1300000, forecast: 1420000 },
    { month: 'Mar', revenue: 1500000, target: 1350000, forecast: 1480000 },
    { month: 'Apr', revenue: 1200000, target: 1350000, forecast: 1420000 },
    { month: 'May', revenue: 1450000, target: 1400000, forecast: 1550000 },
    { month: 'Jun', revenue: 1600000, target: 1450000, forecast: 1620000 },
  ]

  // Top customers
  const topCustomers = [
    { name: 'Acme Corp', revenue: 180000, percentage: 12, status: 'Active' },
    { name: 'Tech Solutions', revenue: 150000, percentage: 10, status: 'Active' },
    { name: 'Global Ltd', revenue: 120000, percentage: 8, status: 'Active' },
    { name: 'Prime Industries', revenue: 95000, percentage: 6.3, status: 'Growing' },
  ]

  return (
    <div className="space-y-8 p-6">
      {/* Row 1: Revenue Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          label="Total Revenue"
          value={`₹${(totalRevenue / 100000).toFixed(1)}`}
          unit="L"
          trend={revenueGrowth}
          trendDirection="up"
          valueClassName="text-green-600"
        />
        <KPICard
          label="Revenue Growth"
          value={revenueGrowth}
          unit="%"
          valueClassName="text-blue-600"
        />
        <KPICard
          label="Avg Transaction"
          value={`₹${(totalRevenue / (45 + 28 + 120) / 1000).toFixed(0)}`}
          unit="K"
          valueClassName="text-purple-600"
        />
        <KPICard
          label="Top Source"
          value={topCategory}
          trend={(topCategoryAmount / totalRevenue * 100).toFixed(1)}
          trendDirection="up"
          valueClassName="text-orange-600"
        />
      </div>

      {/* Row 2: Revenue Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Category Distribution */}
        <Card className="p-6">
          <h3 className="text-sm font-semibold text-foreground mb-4">Revenue by Category</h3>
          <ChartContainer
            config={{
              value: { label: 'Revenue', color: 'hsl(var(--chart-1))' },
            }}
            className="h-64"
          >
            <PieChart>
              <Pie
                data={revenueByCategory}
                cx="50%"
                cy="50%"
                innerRadius={40}
                outerRadius={80}
                paddingAngle={2}
                dataKey="value"
              >
                {revenueByCategory.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <ChartTooltip content={<ChartTooltipContent />} />
            </PieChart>
          </ChartContainer>
        </Card>

        {/* Category Details */}
        <div className="col-span-2 space-y-3">
          {revenueByCategory.map((category) => (
            <div key={category.name} className="p-4 bg-card rounded-lg border border-border hover:shadow-sm transition-shadow">
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground">{category.name}</p>
                  <p className="text-xs text-muted-foreground">{category.count} transactions</p>
                </div>
                <StatusBadge
                  status={`+${category.trend}%`}
                  variant={category.trend > 15 ? 'success' : 'info'}
                />
              </div>
              <div className="flex justify-between items-end">
                <div className="flex-1 h-2 bg-muted rounded-full mr-3 overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${(category.value / totalRevenue) * 100}%`,
                      backgroundColor: category.color,
                    }}
                  />
                </div>
                <p className="text-sm font-bold text-foreground">₹{(category.value / 100000).toFixed(1)}L</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Row 3: Revenue Trend */}
      <Card className="p-6">
        <h3 className="text-sm font-semibold text-foreground mb-4">6-Month Revenue Trend</h3>
        <ChartContainer
          config={{
            revenue: { label: 'Actual', color: 'hsl(var(--chart-1))' },
            target: { label: 'Target', color: 'hsl(var(--chart-2))' },
            forecast: { label: 'Forecast', color: 'hsl(var(--chart-3))' },
          }}
          className="h-80"
        >
          <ComposedChart data={revenueTrend}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey="month" />
            <YAxis />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Legend />
            <Bar dataKey="revenue" fill="var(--color-revenue)" radius={[8, 8, 0, 0]} />
            <Line type="monotone" dataKey="target" stroke="var(--color-target)" strokeWidth={2} strokeDasharray="5 5" />
            <Line type="monotone" dataKey="forecast" stroke="var(--color-forecast)" strokeWidth={2} />
          </ComposedChart>
        </ChartContainer>
      </Card>

      {/* Row 4: Top Customers */}
      <Card className="p-6">
        <h3 className="text-sm font-semibold text-foreground mb-4">Top Revenue Sources</h3>
        <div className="space-y-4">
          {topCustomers.map((customer) => (
            <div key={customer.name} className="flex items-center justify-between p-4 bg-muted rounded-lg hover:bg-muted/80 transition-colors">
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground">{customer.name}</p>
                <p className="text-xs text-muted-foreground">{customer.status}</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold text-foreground">₹{(customer.revenue / 1000).toFixed(0)}K</p>
                <p className="text-xs text-muted-foreground">{customer.percentage}% of revenue</p>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}

// Enhanced expense breakdown component
export function EnhancedExpenseBreakdown({
  totalExpenses = 900000,
  expenseGrowth = -5.2,
  highestExpense = 'Salaries',
  highestAmount = 450000,
}: {
  totalExpenses?: number
  expenseGrowth?: number
  highestExpense?: string
  highestAmount?: number
}) {
  // Expense categories
  const expensesByCategory = [
    { name: 'Salaries', value: 450000, budget: 450000, color: '#3b82f6', icon: '👥' },
    { name: 'Operations', value: 270000, budget: 280000, color: '#10b981', icon: '🏢' },
    { name: 'Marketing', value: 90000, budget: 100000, color: '#f59e0b', icon: '📢' },
    { name: 'Technology', value: 60000, budget: 60000, color: '#8b5cf6', icon: '💻' },
    { name: 'Admin & Other', value: 30000, budget: 50000, color: '#6b7280', icon: '📋' },
  ]

  // Monthly expense trend
  const expenseTrend = [
    { month: 'Jan', expenses: 800000, budget: 850000 },
    { month: 'Feb', expenses: 820000, budget: 850000 },
    { month: 'Mar', expenses: 850000, budget: 850000 },
    { month: 'Apr', expenses: 880000, budget: 850000 },
    { month: 'May', expenses: 900000, budget: 850000 },
    { month: 'Jun', expenses: 920000, budget: 900000 },
  ]

  return (
    <div className="space-y-8 p-6">
      {/* Row 1: Expense Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          label="Total Expenses"
          value={`₹${(totalExpenses / 100000).toFixed(1)}`}
          unit="L"
          trend={Math.abs(expenseGrowth)}
          trendDirection={expenseGrowth >= 0 ? 'up' : 'down'}
          valueClassName="text-red-600"
        />
        <KPICard
          label="Highest Category"
          value={highestExpense}
          trend={(highestAmount / totalExpenses * 100).toFixed(1)}
          trendDirection="up"
          valueClassName="text-orange-600"
        />
        <KPICard
          label="Budget Variance"
          value={-2.5}
          unit="%"
          valueClassName="text-green-600"
        />
        <KPICard
          label="YoY Change"
          value={expenseGrowth}
          unit="%"
          trend={Math.abs(expenseGrowth)}
          trendDirection={expenseGrowth >= 0 ? 'down' : 'up'}
          valueClassName="text-blue-600"
        />
      </div>

      {/* Row 2: Expense Overview */}
      <Card className="p-6">
        <h3 className="text-sm font-semibold text-foreground mb-4">Expense Breakdown</h3>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ChartContainer
            config={{
              value: { label: 'Expenses', color: 'hsl(var(--chart-1))' },
            }}
            className="h-64"
          >
            <PieChart>
              <Pie
                data={expensesByCategory}
                cx="50%"
                cy="50%"
                innerRadius={40}
                outerRadius={80}
                paddingAngle={2}
                dataKey="value"
              >
                {expensesByCategory.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <ChartTooltip content={<ChartTooltipContent />} />
            </PieChart>
          </ChartContainer>

          <div className="space-y-3">
            {expensesByCategory.map((expense) => (
              <div key={expense.name} className="p-3 bg-muted rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium text-foreground flex items-center gap-2">
                    <span>{expense.icon}</span>
                    {expense.name}
                  </p>
                  <p className="text-sm font-bold">₹{(expense.value / 100000).toFixed(1)}L</p>
                </div>
                <div className="w-full h-1.5 bg-border rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${(expense.value / expense.budget) * 100}%`,
                      backgroundColor: (expense.value / expense.budget) > 1 ? '#ef4444' : expense.color,
                    }}
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Budget: ₹{(expense.budget / 100000).toFixed(1)}L
                  {expense.value > expense.budget && ` (Over by ₹${((expense.value - expense.budget) / 100000).toFixed(1)}L)`}
                </p>
              </div>
            ))}
          </div>
        </div>
      </Card>

      {/* Row 3: Expense Trend vs Budget */}
      <Card className="p-6">
        <h3 className="text-sm font-semibold text-foreground mb-4">Expense Trend vs Budget</h3>
        <ChartContainer
          config={{
            expenses: { label: 'Actual', color: 'hsl(var(--chart-2))' },
            budget: { label: 'Budget', color: 'hsl(var(--chart-1))' },
          }}
          className="h-80"
        >
          <BarChart data={expenseTrend}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey="month" />
            <YAxis />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Legend />
            <Bar dataKey="expenses" fill="var(--color-expenses)" radius={[8, 8, 0, 0]} />
            <Bar dataKey="budget" fill="var(--color-budget)" radius={[8, 8, 0, 0]} />
          </BarChart>
        </ChartContainer>
      </Card>

      {/* Row 4: Efficiency Metrics */}
      <Card className="p-6 bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
        <h3 className="text-sm font-semibold text-foreground mb-4">Cost Efficiency Metrics</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 bg-white dark:bg-slate-800 rounded-lg border border-border">
            <p className="text-xs text-muted-foreground mb-2">Cost per Revenue Unit</p>
            <p className="text-2xl font-bold text-foreground">₹{((totalExpenses / (1500000)) * 100).toFixed(1)}</p>
            <p className="text-xs text-green-600 mt-1">60% efficiency</p>
          </div>
          <div className="p-4 bg-white dark:bg-slate-800 rounded-lg border border-border">
            <p className="text-xs text-muted-foreground mb-2">Budget Utilization</p>
            <p className="text-2xl font-bold text-foreground">98.5%</p>
            <p className="text-xs text-orange-600 mt-1">Within 5% of budget</p>
          </div>
          <div className="p-4 bg-white dark:bg-slate-800 rounded-lg border border-border">
            <p className="text-xs text-muted-foreground mb-2">Highest Category %</p>
            <p className="text-2xl font-bold text-foreground">50%</p>
            <p className="text-xs text-blue-600 mt-1">Salaries dominate spend</p>
          </div>
        </div>
      </Card>
    </div>
  )
}
