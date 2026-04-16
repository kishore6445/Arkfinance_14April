'use client'

import React from 'react'
import { ArrowUpRight, ArrowDownRight, TrendingUp, TrendingDown } from 'lucide-react'
import { cn } from '@/lib/utils'

// KPI Card with trend indicator
export function KPICard({
  label,
  value,
  trend,
  trendDirection = 'up',
  unit = '',
  icon: Icon,
  className,
  valueClassName,
}: {
  label: string
  value: string | number
  trend?: string | number
  trendDirection?: 'up' | 'down'
  unit?: string
  icon?: React.ComponentType<{ className?: string }>
  className?: string
  valueClassName?: string
}) {
  const isPositive = trendDirection === 'up'
  const trendColor = isPositive ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
  const trendBgColor = isPositive ? 'bg-green-50 dark:bg-green-950' : 'bg-red-50 dark:bg-red-950'

  return (
    <div
      className={cn(
        'rounded-lg border border-border bg-card p-6 shadow-sm transition-all hover:shadow-md',
        className
      )}
    >
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground">{label}</p>
          <p className={cn('text-3xl font-bold', valueClassName)}>
            {value}
            {unit && <span className="text-lg text-muted-foreground ml-1">{unit}</span>}
          </p>
          {trend !== undefined && (
            <div className={cn('flex items-center gap-1 text-sm font-medium', trendColor)}>
              {isPositive ? (
                <ArrowUpRight className="w-4 h-4" />
              ) : (
                <ArrowDownRight className="w-4 h-4" />
              )}
              <span>{trend}% vs last period</span>
            </div>
          )}
        </div>
        {Icon && (
          <div className={cn('rounded-lg p-2', trendBgColor)}>
            <Icon className={cn('w-6 h-6', trendColor)} />
          </div>
        )}
      </div>
    </div>
  )
}

// Progress metric with percentage bar
export function ProgressMetric({
  label,
  value,
  total,
  showPercentage = true,
  color = 'bg-blue-600',
  className,
}: {
  label: string
  value: number
  total: number
  showPercentage?: boolean
  color?: string
  className?: string
}) {
  const percentage = (value / total) * 100

  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-foreground">{label}</label>
        {showPercentage && (
          <span className="text-sm font-semibold text-foreground">
            {percentage.toFixed(1)}%
          </span>
        )}
      </div>
      <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
        <div
          className={cn('h-full rounded-full transition-all duration-300', color)}
          style={{ width: `${Math.min(percentage, 100)}%` }}
        />
      </div>
      <p className="text-xs text-muted-foreground">
        {value.toLocaleString()} / {total.toLocaleString()}
      </p>
    </div>
  )
}

// Status badge with color coding
export function StatusBadge({
  status,
  variant = 'default',
}: {
  status: string
  variant?: 'default' | 'success' | 'warning' | 'error' | 'info'
}) {
  const variantClasses = {
    default: 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-200',
    success: 'bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-200',
    warning: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-950 dark:text-yellow-200',
    error: 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200',
    info: 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-200',
  }

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-3 py-1 text-xs font-medium',
        variantClasses[variant]
      )}
    >
      {status}
    </span>
  )
}

// Health score gauge (circular progress)
export function HealthGauge({
  score,
  total = 100,
  label = 'Score',
  size = 'md',
}: {
  score: number
  total?: number
  label?: string
  size?: 'sm' | 'md' | 'lg'
}) {
  const percentage = (score / total) * 100
  const circumference = 2 * Math.PI * 45

  const sizeClasses = {
    sm: 'w-24 h-24',
    md: 'w-32 h-32',
    lg: 'w-40 h-40',
  }

  const textSizeClasses = {
    sm: 'text-lg',
    md: 'text-2xl',
    lg: 'text-4xl',
  }

  // Color based on score
  const getColor = (pct: number) => {
    if (pct >= 80) return '#10b981' // green
    if (pct >= 60) return '#3b82f6' // blue
    if (pct >= 40) return '#f59e0b' // yellow
    return '#ef4444' // red
  }

  const strokeDashoffset = circumference - (percentage / 100) * circumference

  return (
    <div className="flex flex-col items-center gap-2">
      <div className={cn('relative', sizeClasses[size])}>
        <svg
          className="w-full h-full transform -rotate-90"
          viewBox="0 0 120 120"
        >
          {/* Background circle */}
          <circle
            cx="60"
            cy="60"
            r="45"
            fill="none"
            stroke="currentColor"
            strokeWidth="8"
            className="text-muted"
          />
          {/* Progress circle */}
          <circle
            cx="60"
            cy="60"
            r="45"
            fill="none"
            stroke={getColor(percentage)}
            strokeWidth="8"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            className="transition-all duration-500"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={cn('font-bold', textSizeClasses[size])}>
            {Math.round(percentage)}%
          </span>
          <span className="text-xs text-muted-foreground">{label}</span>
        </div>
      </div>
    </div>
  )
}

// Metric comparison (side by side)
export function MetricComparison({
  label,
  current,
  previous,
  unit = '',
  showChange = true,
}: {
  label: string
  current: number
  previous: number
  unit?: string
  showChange?: boolean
}) {
  const change = current - previous
  const percentChange = previous !== 0 ? (change / previous) * 100 : 0
  const isPositive = change >= 0

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <p className="text-sm font-medium text-muted-foreground mb-3">{label}</p>
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-2xl font-bold">{current.toLocaleString()}</p>
          <p className="text-xs text-muted-foreground mt-1">Current</p>
        </div>
        <div className="text-right">
          <p className="text-lg font-semibold text-muted-foreground">
            {previous.toLocaleString()}
          </p>
          <p className="text-xs text-muted-foreground mt-1">Previous</p>
        </div>
        {showChange && (
          <div
            className={cn(
              'px-3 py-1.5 rounded-lg text-sm font-semibold flex items-center gap-1',
              isPositive
                ? 'bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300'
                : 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300'
            )}
          >
            {isPositive ? (
              <ArrowUpRight className="w-4 h-4" />
            ) : (
              <ArrowDownRight className="w-4 h-4" />
            )}
            {Math.abs(percentChange).toFixed(1)}%
          </div>
        )}
      </div>
    </div>
  )
}

// Timeline item for cash flow
export function TimelineItem({
  date,
  amount,
  type = 'inflow',
  description,
}: {
  date: string
  amount: number
  type?: 'inflow' | 'outflow' | 'net'
  description?: string
}) {
  const typeColors = {
    inflow: 'bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300',
    outflow: 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300',
    net: 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300',
  }

  return (
    <div className="flex gap-4 pb-6 last:pb-0">
      <div className="relative flex flex-col items-center">
        <div className={cn('w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold', typeColors[type])}>
          {type === 'inflow' ? '↑' : type === 'outflow' ? '↓' : '→'}
        </div>
        <div className="w-0.5 h-12 bg-border mt-2" />
      </div>
      <div className="flex-1 pt-1.5">
        <p className="text-sm font-medium text-foreground">{date}</p>
        {description && <p className="text-xs text-muted-foreground mt-0.5">{description}</p>}
        <p className={cn('text-lg font-bold mt-1', type === 'outflow' ? 'text-red-600' : 'text-green-600')}>
          {type === 'outflow' ? '-' : '+'} {Math.abs(amount).toLocaleString()}
        </p>
      </div>
    </div>
  )
}

// Data table row highlighter
export function TableDataHighlight({
  value,
  threshold = 0,
  format = 'number',
}: {
  value: number
  threshold?: number
  format?: 'number' | 'percent' | 'currency'
}) {
  let displayValue = value

  if (format === 'percent') {
    displayValue = value
  } else if (format === 'currency') {
    displayValue = value
  }

  const isWarning = value < threshold
  const bgColor = isWarning ? 'bg-red-50 dark:bg-red-950' : 'bg-transparent'

  return (
    <div className={cn('px-3 py-2 rounded', bgColor)}>
      <span className={isWarning ? 'text-red-700 dark:text-red-300 font-semibold' : ''}>
        {format === 'currency' && '$'}
        {displayValue.toLocaleString()}
        {format === 'percent' && '%'}
      </span>
    </div>
  )
}
