'use client'

import React from 'react'
import {
  LineChart, Line, AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ComposedChart, CartesianAxis, ScatterChart, Scatter, ReferenceLine
} from 'recharts'
import { Card } from '@/components/ui/card'
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart'
import { KPICard, ProgressMetric, StatusBadge, TimelineItem } from '@/components/chart-components'

// Enhanced cash runway component
export function EnhancedCashRunway({
  currentCash = 5000000,
  monthlyBurnRate = 900000,
  monthlyRevenue = 1500000,
  projectedRunway = 5.5,
  breakEvenMonth = 10,
}: {
  currentCash?: number
  monthlyBurnRate?: number
  monthlyRevenue?: number
  projectedRunway?: number
  breakEvenMonth?: number
}) {
  // 12-month cash projection
  const cashProjection = [
    { month: 'Jan', revenue: 1500000, burn: 900000, netCash: 5000000, scenario: 'base' },
    { month: 'Feb', revenue: 1550000, burn: 910000, netCash: 4640000, scenario: 'base' },
    { month: 'Mar', revenue: 1600000, burn: 920000, netCash: 4320000, scenario: 'base' },
    { month: 'Apr', revenue: 1650000, burn: 930000, netCash: 4040000, scenario: 'base' },
    { month: 'May', revenue: 1700000, burn: 940000, netCash: 3800000, scenario: 'base' },
    { month: 'Jun', revenue: 1750000, burn: 950000, netCash: 3600000, scenario: 'base' },
    { month: 'Jul', revenue: 1750000, burn: 1000000, netCash: 3350000, scenario: 'base' },
    { month: 'Aug', revenue: 1800000, burn: 1000000, netCash: 3150000, scenario: 'base' },
    { month: 'Sep', revenue: 1900000, burn: 1000000, netCash: 3050000, scenario: 'base' },
    { month: 'Oct', revenue: 2000000, burn: 1000000, netCash: 3050000, scenario: 'breakeven' },
    { month: 'Nov', revenue: 2100000, burn: 1000000, netCash: 3150000, scenario: 'growth' },
    { month: 'Dec', revenue: 2200000, burn: 1000000, netCash: 3350000, scenario: 'growth' },
  ]

  // Pessimistic vs Optimistic scenarios
  const scenarioComparison = [
    { month: 'Jan', pessimistic: 5000000, base: 5000000, optimistic: 5000000 },
    { month: 'Feb', pessimistic: 4500000, base: 4640000, optimistic: 4750000 },
    { month: 'Mar', pessimistic: 3950000, base: 4320000, optimistic: 4560000 },
    { month: 'Apr', pessimistic: 3350000, base: 4040000, optimistic: 4420000 },
    { month: 'May', pessimistic: 2700000, base: 3800000, optimistic: 4320000 },
    { month: 'Jun', pessimistic: 2050000, base: 3600000, optimistic: 4280000 },
    { month: 'Jul', pessimistic: 1350000, base: 3350000, optimistic: 4300000 },
    { month: 'Aug', pessimistic: 600000, base: 3150000, optimistic: 4350000 },
    { month: 'Sep', pessimistic: 0, base: 3050000, optimistic: 4400000 },
    { month: 'Oct', pessimistic: 0, base: 3050000, optimistic: 4500000 },
  ]

  // Burn rate trends
  const burnRateTrend = [
    { month: 'Jan', burnRate: 900000, revenueRate: 1500000, netRate: 600000 },
    { month: 'Feb', burnRate: 910000, revenueRate: 1550000, netRate: 640000 },
    { month: 'Mar', burnRate: 920000, revenueRate: 1600000, netRate: 680000 },
    { month: 'Apr', burnRate: 930000, revenueRate: 1650000, netRate: 720000 },
    { month: 'May', burnRate: 940000, revenueRate: 1700000, netRate: 760000 },
    { month: 'Jun', burnRate: 950000, revenueRate: 1750000, netRate: 800000 },
    { month: 'Jul', burnRate: 1000000, revenueRate: 1750000, netRate: 750000 },
    { month: 'Aug', burnRate: 1000000, revenueRate: 1800000, netRate: 800000 },
    { month: 'Sep', burnRate: 1000000, revenueRate: 1900000, netRate: 900000 },
  ]

  const netMonthly = monthlyRevenue - monthlyBurnRate
  const monthsToBreakeven = monthlyBurnRate > 0 ? Math.ceil(monthlyBurnRate / (monthlyRevenue / monthlyBurnRate)) : 0

  return (
    <div className="space-y-8 p-6">
      {/* Row 1: Runway Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          label="Current Cash"
          value={`₹${(currentCash / 100000).toFixed(1)}`}
          unit="L"
          valueClassName="text-blue-600"
        />
        <KPICard
          label="Monthly Burn"
          value={`₹${(monthlyBurnRate / 100000).toFixed(1)}`}
          unit="L"
          valueClassName="text-red-600"
        />
        <KPICard
          label="Monthly Revenue"
          value={`₹${(monthlyRevenue / 100000).toFixed(1)}`}
          unit="L"
          valueClassName="text-green-600"
        />
        <KPICard
          label="Projected Runway"
          value={projectedRunway}
          unit="months"
          trend={-3.2}
          trendDirection="down"
          valueClassName="text-purple-600"
        />
      </div>

      {/* Row 2: Runway Status */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Runway Gauge */}
        <div className="bg-card rounded-lg border border-border p-6 flex flex-col items-center justify-center">
          <h3 className="text-sm font-medium text-muted-foreground mb-4">Runway Status</h3>
          <div className="text-4xl font-bold text-purple-600 mb-2">{projectedRunway.toFixed(1)}</div>
          <p className="text-sm text-muted-foreground mb-6">months of runway</p>
          <div className="w-full h-3 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-300"
              style={{
                width: `${Math.min((projectedRunway / 12) * 100, 100)}%`,
                backgroundColor:
                  projectedRunway > 6 ? '#10b981' : projectedRunway > 3 ? '#f59e0b' : '#ef4444',
              }}
            />
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            {projectedRunway > 6
              ? 'Healthy runway'
              : projectedRunway > 3
              ? 'Caution: Monitor carefully'
              : 'Critical: Action needed'}
          </p>
        </div>

        {/* Key Indicators */}
        <div className="bg-card rounded-lg border border-border p-6">
          <h3 className="text-sm font-semibold text-foreground mb-4">Key Indicators</h3>
          <div className="space-y-4">
            <div className="p-3 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
              <p className="text-xs text-muted-foreground mb-1">Monthly Net Cash</p>
              <p className={`text-2xl font-bold ${netMonthly >= 0 ? 'text-green-700 dark:text-green-300' : 'text-red-700 dark:text-red-300'}`}>
                {netMonthly >= 0 ? '+' : '-'}₹{Math.abs(netMonthly / 100000).toFixed(1)}L
              </p>
            </div>
            <div className="p-3 bg-orange-50 dark:bg-orange-950 rounded-lg border border-orange-200 dark:border-orange-800">
              <p className="text-xs text-muted-foreground mb-1">Burn Rate</p>
              <p className="text-2xl font-bold text-orange-700 dark:text-orange-300">
                ₹{(monthlyBurnRate / 100000).toFixed(1)}L/mo
              </p>
            </div>
            <div className="p-3 bg-purple-50 dark:bg-purple-950 rounded-lg border border-purple-200 dark:border-purple-800">
              <p className="text-xs text-muted-foreground mb-1">Months to Breakeven</p>
              <p className="text-2xl font-bold text-purple-700 dark:text-purple-300">
                {monthsToBreakeven} months
              </p>
            </div>
          </div>
        </div>

        {/* Risk Assessment */}
        <div className="bg-card rounded-lg border border-border p-6">
          <h3 className="text-sm font-semibold text-foreground mb-4">Risk Assessment</h3>
          <div className="space-y-3">
            {projectedRunway < 3 && (
              <div className="flex items-start gap-3 p-3 bg-red-50 dark:bg-red-950 rounded-lg border border-red-200 dark:border-red-800">
                <div className="mt-0.5 w-2 h-2 rounded-full bg-red-600 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-red-900 dark:text-red-200">Critical Risk</p>
                  <p className="text-xs text-red-700 dark:text-red-300 mt-0.5">
                    Less than 3 months runway remaining
                  </p>
                </div>
              </div>
            )}
            {monthlyBurnRate > monthlyRevenue && (
              <div className="flex items-start gap-3 p-3 bg-red-50 dark:bg-red-950 rounded-lg border border-red-200 dark:border-red-800">
                <div className="mt-0.5 w-2 h-2 rounded-full bg-red-600 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-red-900 dark:text-red-200">Negative Cash Flow</p>
                  <p className="text-xs text-red-700 dark:text-red-300 mt-0.5">
                    Expenses exceed revenue
                  </p>
                </div>
              </div>
            )}
            {projectedRunway > 6 && monthlyBurnRate < monthlyRevenue && (
              <div className="flex items-start gap-3 p-3 bg-green-50 dark:bg-green-950 rounded-lg border border-green-200 dark:border-green-800">
                <div className="mt-0.5 w-2 h-2 rounded-full bg-green-600 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-green-900 dark:text-green-200">Low Risk</p>
                  <p className="text-xs text-green-700 dark:text-green-300 mt-0.5">
                    Healthy cash position and positive cash flow
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Row 3: 12-Month Cash Projection */}
      <Card className="p-6">
        <h3 className="text-sm font-semibold text-foreground mb-4">12-Month Cash Projection</h3>
        <ChartContainer
          config={{
            revenue: { label: 'Revenue', color: 'hsl(var(--chart-1))' },
            burn: { label: 'Burn Rate', color: 'hsl(var(--chart-2))' },
            netCash: { label: 'Net Cash', color: 'hsl(var(--chart-3))' },
          }}
          className="h-80"
        >
          <ComposedChart data={cashProjection}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey="month" />
            <YAxis />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Legend />
            <Bar dataKey="revenue" fill="var(--color-revenue)" radius={[8, 8, 0, 0]} />
            <Bar dataKey="burn" fill="var(--color-burn)" radius={[8, 8, 0, 0]} />
            <Line type="monotone" dataKey="netCash" stroke="var(--color-netCash)" strokeWidth={3} />
          </ComposedChart>
        </ChartContainer>
      </Card>

      {/* Row 4: Scenario Analysis */}
      <Card className="p-6">
        <h3 className="text-sm font-semibold text-foreground mb-4">Scenario Analysis (Pessimistic vs Base vs Optimistic)</h3>
        <ChartContainer
          config={{
            pessimistic: { label: 'Pessimistic', color: 'hsl(var(--chart-2))' },
            base: { label: 'Base Case', color: 'hsl(var(--chart-1))' },
            optimistic: { label: 'Optimistic', color: 'hsl(var(--chart-3))' },
          }}
          className="h-80"
        >
          <AreaChart data={scenarioComparison}>
            <defs>
              <linearGradient id="colorPessimistic" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--color-pessimistic)" stopOpacity={0.3} />
                <stop offset="95%" stopColor="var(--color-pessimistic)" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="colorBase" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--color-base)" stopOpacity={0.3} />
                <stop offset="95%" stopColor="var(--color-base)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey="month" />
            <YAxis />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Area type="monotone" dataKey="pessimistic" stroke="var(--color-pessimistic)" fillOpacity={1} fill="url(#colorPessimistic)" />
            <Area type="monotone" dataKey="base" stroke="var(--color-base)" fillOpacity={1} fill="url(#colorBase)" />
            <Line type="monotone" dataKey="optimistic" stroke="var(--color-optimistic)" strokeWidth={2} />
          </AreaChart>
        </ChartContainer>
      </Card>

      {/* Row 5: Burn Rate vs Revenue Trend */}
      <Card className="p-6">
        <h3 className="text-sm font-semibold text-foreground mb-4">Burn Rate vs Revenue Convergence</h3>
        <ChartContainer
          config={{
            burnRate: { label: 'Burn Rate', color: 'hsl(var(--chart-2))' },
            revenueRate: { label: 'Revenue', color: 'hsl(var(--chart-1))' },
            netRate: { label: 'Net Rate', color: 'hsl(var(--chart-3))' },
          }}
          className="h-80"
        >
          <LineChart data={burnRateTrend}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey="month" />
            <YAxis />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Legend />
            <ReferenceLine y={0} stroke="var(--border)" strokeDasharray="5 5" />
            <Line type="monotone" dataKey="burnRate" stroke="var(--color-burnRate)" strokeWidth={2} />
            <Line type="monotone" dataKey="revenueRate" stroke="var(--color-revenueRate)" strokeWidth={2} />
            <Line type="monotone" dataKey="netRate" stroke="var(--color-netRate)" strokeWidth={2} strokeDasharray="5 5" />
          </LineChart>
        </ChartContainer>
      </Card>

      {/* Row 6: Milestones */}
      <Card className="p-6 bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
        <h3 className="text-sm font-semibold text-foreground mb-4">Critical Milestones</h3>
        <div className="space-y-4">
          <TimelineItem
            date="Today"
            amount={currentCash}
            type="net"
            description={`Current cash position: ₹${(currentCash / 1000000).toFixed(1)}M`}
          />
          <TimelineItem
            date="Month 6"
            amount={3600000}
            type="outflow"
            description={`Projected cash at current burn rate`}
          />
          <TimelineItem
            date={`Month ${Math.ceil(projectedRunway)}`}
            amount={0}
            type="outflow"
            description={`Expected cash depletion if no changes`}
          />
          <TimelineItem
            date={`Month ${breakEvenMonth}`}
            amount={0}
            type="net"
            description={`Projected break-even (revenue = expenses)`}
          />
        </div>
      </Card>
    </div>
  )
}
