'use client'

import React from 'react'
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ComposedChart
} from 'recharts'
import { Card } from '@/components/ui/card'
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart'
import { KPICard, ProgressMetric, HealthGauge, MetricComparison, StatusBadge } from '@/components/chart-components'

// Enhanced dashboard component
export function EnhancedDashboardKPIs({ 
  cashBalance = 5000000,
  monthlyRevenue = 1500000,
  monthlyBurn = 900000,
  runway = 5.5,
  healthScore = 75,
  todayIncome = 125000,
  todayExpense = 85000,
  monthlyNetCashFlow = 600000,
  overdueInvoices = 3,
  pendingApprovals = 2,
}: {
  cashBalance?: number
  monthlyRevenue?: number
  monthlyBurn?: number
  runway?: number
  healthScore?: number
  todayIncome?: number
  todayExpense?: number
  monthlyNetCashFlow?: number
  overdueInvoices?: number
  pendingApprovals?: number
}) {
  // 7-day cash flow projection
  const cashFlowData = [
    { date: 'Mon', inflow: 250000, outflow: 180000, net: 70000 },
    { date: 'Tue', inflow: 180000, outflow: 220000, net: -40000 },
    { date: 'Wed', inflow: 320000, outflow: 190000, net: 130000 },
    { date: 'Thu', inflow: 150000, outflow: 210000, net: -60000 },
    { date: 'Fri', inflow: 420000, outflow: 280000, net: 140000 },
    { date: 'Sat', inflow: 90000, outflow: 120000, net: -30000 },
    { date: 'Sun', inflow: 200000, outflow: 150000, net: 50000 },
  ]

  // Monthly breakdown
  const monthlyData = [
    { month: 'Jan', revenue: 1200000, expenses: 850000 },
    { month: 'Feb', revenue: 1350000, expenses: 880000 },
    { month: 'Mar', revenue: 1500000, expenses: 900000 },
    { month: 'Apr', revenue: 1200000, expenses: 920000 },
    { month: 'May', revenue: 1450000, expenses: 870000 },
    { month: 'Jun', revenue: 1600000, expenses: 950000 },
  ]

  // Revenue by category
  const revenueMix = [
    { name: 'Product Sales', value: 55, color: '#3b82f6' },
    { name: 'Services', value: 30, color: '#10b981' },
    { name: 'Subscriptions', value: 15, color: '#8b5cf6' },
  ]

  // Expense breakdown
  const expenseCategories = [
    { name: 'Salaries', value: 450000, percent: 50 },
    { name: 'Operations', value: 270000, percent: 30 },
    { name: 'Marketing', value: 90000, percent: 10 },
    { name: 'Other', value: 90000, percent: 10 },
  ]

  return (
    <div className="space-y-8 p-6">
      {/* Row 1: Primary KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          label="Cash Position"
          value={`₹${(cashBalance / 100000).toFixed(1)}`}
          unit="L"
          trend={3.2}
          trendDirection="up"
          valueClassName="text-green-600"
        />
        <KPICard
          label="Monthly Revenue"
          value={`₹${(monthlyRevenue / 100000).toFixed(1)}`}
          unit="L"
          trend={8.5}
          trendDirection="up"
          valueClassName="text-blue-600"
        />
        <KPICard
          label="Monthly Burn"
          value={`₹${(monthlyBurn / 100000).toFixed(1)}`}
          unit="L"
          trend={-2.1}
          trendDirection="down"
          valueClassName="text-orange-600"
        />
        <KPICard
          label="Runway"
          value={runway}
          unit="months"
          trend={5.2}
          trendDirection="up"
          valueClassName="text-purple-600"
        />
      </div>

      {/* Row 2: Health & Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Health Score Gauge */}
        <div className="bg-card rounded-lg border border-border p-6 flex flex-col items-center justify-center">
          <h3 className="text-sm font-medium text-muted-foreground mb-4">Business Health Score</h3>
          <HealthGauge score={healthScore} total={100} size="md" />
          <div className="mt-6 text-center">
            <StatusBadge
              status={healthScore >= 80 ? 'Healthy' : healthScore >= 60 ? 'Caution' : 'Critical'}
              variant={healthScore >= 80 ? 'success' : healthScore >= 60 ? 'warning' : 'error'}
            />
          </div>
        </div>

        {/* Critical Alerts */}
        <div className="bg-card rounded-lg border border-border p-6">
          <h3 className="text-sm font-semibold text-foreground mb-4">Active Alerts</h3>
          <div className="space-y-3">
            {overdueInvoices > 0 && (
              <div className="flex items-start gap-3 p-3 bg-red-50 dark:bg-red-950 rounded-lg border border-red-200 dark:border-red-800">
                <div className="mt-0.5 w-2 h-2 rounded-full bg-red-600 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-red-900 dark:text-red-200">
                    {overdueInvoices} Overdue Invoice{overdueInvoices !== 1 ? 's' : ''}
                  </p>
                  <p className="text-xs text-red-700 dark:text-red-300 mt-1">
                    Immediate payment action needed
                  </p>
                </div>
              </div>
            )}
            {pendingApprovals > 0 && (
              <div className="flex items-start gap-3 p-3 bg-yellow-50 dark:bg-yellow-950 rounded-lg border border-yellow-200 dark:border-yellow-800">
                <div className="mt-0.5 w-2 h-2 rounded-full bg-yellow-600 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-yellow-900 dark:text-yellow-200">
                    {pendingApprovals} Pending Approval{pendingApprovals !== 1 ? 's' : ''}
                  </p>
                  <p className="text-xs text-yellow-700 dark:text-yellow-300 mt-1">
                    Awaiting authorization
                  </p>
                </div>
              </div>
            )}
            {runway < 3 && (
              <div className="flex items-start gap-3 p-3 bg-red-50 dark:bg-red-950 rounded-lg border border-red-200 dark:border-red-800">
                <div className="mt-0.5 w-2 h-2 rounded-full bg-red-600 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-red-900 dark:text-red-200">
                    Low Cash Runway
                  </p>
                  <p className="text-xs text-red-700 dark:text-red-300 mt-1">
                    Only {runway.toFixed(1)} months remaining
                  </p>
                </div>
              </div>
            )}
            {overdueInvoices === 0 && pendingApprovals === 0 && runway >= 3 && (
              <div className="text-sm text-muted-foreground text-center py-4">
                No critical alerts
              </div>
            )}
          </div>
        </div>

        {/* Daily Summary */}
        <div className="bg-card rounded-lg border border-border p-6">
          <h3 className="text-sm font-semibold text-foreground mb-4">Today&apos;s Summary</h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center pb-3 border-b border-border">
              <span className="text-sm text-muted-foreground">Money In</span>
              <span className="text-lg font-bold text-green-600">₹{(todayIncome / 1000).toFixed(0)}K</span>
            </div>
            <div className="flex justify-between items-center pb-3 border-b border-border">
              <span className="text-sm text-muted-foreground">Money Out</span>
              <span className="text-lg font-bold text-red-600">₹{(todayExpense / 1000).toFixed(0)}K</span>
            </div>
            <div className="flex justify-between items-center pt-2">
              <span className="text-sm font-medium text-foreground">Net</span>
              <span className={`text-lg font-bold ${(todayIncome - todayExpense) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {(todayIncome - todayExpense) >= 0 ? '+' : '-'}₹{Math.abs((todayIncome - todayExpense) / 1000).toFixed(0)}K
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Row 3: Cash Flow & Trends */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 7-Day Cash Flow */}
        <Card className="p-6">
          <h3 className="text-sm font-semibold text-foreground mb-4">7-Day Cash Flow</h3>
          <ChartContainer
            config={{
              inflow: { label: 'Inflow', color: 'hsl(var(--chart-1))' },
              outflow: { label: 'Outflow', color: 'hsl(var(--chart-2))' },
              net: { label: 'Net', color: 'hsl(var(--chart-3))' },
            }}
            className="h-80"
          >
            <ComposedChart data={cashFlowData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="date" />
              <YAxis />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Legend />
              <Bar dataKey="inflow" fill="var(--color-inflow)" radius={[8, 8, 0, 0]} />
              <Bar dataKey="outflow" fill="var(--color-outflow)" radius={[8, 8, 0, 0]} />
              <Line type="monotone" dataKey="net" stroke="var(--color-net)" strokeWidth={2} />
            </ComposedChart>
          </ChartContainer>
        </Card>

        {/* Revenue vs Expenses Trend */}
        <Card className="p-6">
          <h3 className="text-sm font-semibold text-foreground mb-4">Revenue vs Expenses (6M)</h3>
          <ChartContainer
            config={{
              revenue: { label: 'Revenue', color: 'hsl(var(--chart-1))' },
              expenses: { label: 'Expenses', color: 'hsl(var(--chart-2))' },
            }}
            className="h-80"
          >
            <AreaChart data={monthlyData}>
              <defs>
                <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--color-revenue)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="var(--color-revenue)" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorExpenses" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--color-expenses)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="var(--color-expenses)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="month" />
              <YAxis />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Area type="monotone" dataKey="revenue" stroke="var(--color-revenue)" fillOpacity={1} fill="url(#colorRevenue)" />
              <Area type="monotone" dataKey="expenses" stroke="var(--color-expenses)" fillOpacity={1} fill="url(#colorExpenses)" />
            </AreaChart>
          </ChartContainer>
        </Card>
      </div>

      {/* Row 4: Distribution Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Distribution */}
        <Card className="p-6">
          <h3 className="text-sm font-semibold text-foreground mb-4">Revenue by Category</h3>
          <div className="flex items-center justify-between">
            <ChartContainer
              config={{
                ProductSales: { label: 'Product Sales', color: '#3b82f6' },
                Services: { label: 'Services', color: '#10b981' },
                Subscriptions: { label: 'Subscriptions', color: '#8b5cf6' },
              }}
              className="h-64 w-1/2"
            >
              <PieChart>
                <Pie
                  data={revenueMix}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {revenueMix.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <ChartTooltip content={<ChartTooltipContent />} />
              </PieChart>
            </ChartContainer>
            <div className="flex flex-col gap-3 w-1/2 pl-4">
              {revenueMix.map((item) => (
                <div key={item.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="text-xs text-muted-foreground">{item.name}</span>
                  </div>
                  <span className="text-sm font-semibold">{item.value}%</span>
                </div>
              ))}
            </div>
          </div>
        </Card>

        {/* Expense Breakdown */}
        <Card className="p-6">
          <h3 className="text-sm font-semibold text-foreground mb-4">Monthly Expenses</h3>
          <div className="space-y-4">
            {expenseCategories.map((category) => (
              <ProgressMetric
                key={category.name}
                label={category.name}
                value={category.value}
                total={monthlyBurn}
                color={
                  category.name === 'Salaries'
                    ? 'bg-blue-600'
                    : category.name === 'Operations'
                    ? 'bg-orange-600'
                    : category.name === 'Marketing'
                    ? 'bg-purple-600'
                    : 'bg-gray-600'
                }
              />
            ))}
          </div>
        </Card>
      </div>

      {/* Row 5: Monthly Summary */}
      <Card className="p-6 bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
        <h3 className="text-sm font-semibold text-foreground mb-4">Month Summary</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <MetricComparison
            label="Monthly Revenue"
            current={monthlyRevenue}
            previous={1350000}
            unit="₹"
            showChange={true}
          />
          <MetricComparison
            label="Monthly Expenses"
            current={monthlyBurn}
            previous={880000}
            unit="₹"
            showChange={true}
          />
          <MetricComparison
            label="Net Cash Flow"
            current={monthlyNetCashFlow}
            previous={470000}
            unit="₹"
            showChange={true}
          />
        </div>
      </Card>
    </div>
  )
}
