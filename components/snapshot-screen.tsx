'use client';

import React, { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  AlertCircle, TrendingUp, TrendingDown, DollarSign, Calendar, AlertTriangle, 
  CheckCircle2, Eye, FileText, BarChart3, PieChart, ArrowRight, Zap, Clock, Landmark, Boxes,
  Users, RefreshCcw, Target
} from 'lucide-react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Area, AreaChart } from 'recharts';
import { useAppState } from '@/context/app-state';
import { calculateRunway, calculateHealthScore, calculateDSO } from '@/lib/calculations';
import { getSupabaseClient } from '@/lib/supabase/client';

interface SnapshotScreenProps {
  onNavigate?: (screen: string) => void;
}

type BankAccountApiRow = {
  id: string;
  account_name?: string | null;
  balance?: number | null;
};

type TransactionApiRow = {
  id: string;
  date?: string | null;
  amount?: number | null;
  is_income?: boolean | null;
  payment_status?: string | null;
  approval_status?: string | null;
  status?: string | null;
  accounting_type?: string | null;
  subtype?: string | null;
  source_type?: string | null;
};

async function getAccessToken() {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.auth.getSession();

  if (error) {
    throw new Error(error.message);
  }

  const accessToken = data.session?.access_token;
  if (!accessToken) {
    throw new Error('Missing session token. Please sign in again.');
  }

  return accessToken;
}

export function SnapshotScreen({ onNavigate }: SnapshotScreenProps) {
  const { state } = useAppState();
  const [refreshKey, setRefreshKey] = useState(0);
  const [liveBankAccounts, setLiveBankAccounts] = useState<BankAccountApiRow[]>([]);
  const [liveTransactions, setLiveTransactions] = useState<TransactionApiRow[]>([]);
  const [bankLoaded, setBankLoaded] = useState(false);
  const [txLoaded, setTxLoaded] = useState(false);

  useEffect(() => {
    const triggerRefresh = () => setRefreshKey((prev) => prev + 1);
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        triggerRefresh();
      }
    };

    window.addEventListener('finance:transactions-updated', triggerRefresh);
    window.addEventListener('finance:bank-accounts-updated', triggerRefresh);
    window.addEventListener('focus', triggerRefresh);
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      window.removeEventListener('finance:transactions-updated', triggerRefresh);
      window.removeEventListener('finance:bank-accounts-updated', triggerRefresh);
      window.removeEventListener('focus', triggerRefresh);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    const loadSnapshotData = async () => {
      try {
        const accessToken = await getAccessToken();
        const headers: HeadersInit = {
          Authorization: `Bearer ${accessToken}`,
        };

        const [bankRes, txRes] = await Promise.all([
          fetch('/api/bank-accounts', { method: 'GET', cache: 'no-store', headers }),
          fetch('/api/transactions', { method: 'GET', cache: 'no-store', headers }),
        ]);

        if (bankRes.ok) {
          const bankPayload = await bankRes.json();
          if (isMounted) {
            setLiveBankAccounts((bankPayload.accounts ?? []) as BankAccountApiRow[]);
            setBankLoaded(true);
          }
        } else {
          const errText = await bankRes.text();
          console.log("[v0] bank-accounts API error:", bankRes.status, errText);
          // still mark as loaded so charts render with fallback state data
          if (isMounted) setBankLoaded(true);
        }

        if (txRes.ok) {
          const txPayload = await txRes.json();
          if (isMounted) {
            setLiveTransactions((txPayload.transactions ?? []) as TransactionApiRow[]);
            setTxLoaded(true);
          }
        } else {
          const errText = await txRes.text();
          console.log("[v0] transactions API error:", txRes.status, errText);
          if (isMounted) setTxLoaded(true);
        }

      } catch (err) {
        console.log("[v0] snapshot fetch failed:", err);
        // Keep existing/fallback app state metrics when live fetch fails.
      }
    };

    void loadSnapshotData();

    return () => {
      isMounted = false;
    };
  }, [refreshKey]);

  const normalizeUpper = (value: unknown) => String(value ?? '').trim().toUpperCase();
  const toBoolean = (value: unknown) => {
    if (typeof value === 'boolean') return value;
    if (typeof value === 'string') return value.trim().toLowerCase() === 'true';
    return Boolean(value);
  };

  const isPostedCashTransaction = (t: {
    approvalStatus?: string | null;
    paymentStatus?: string | null;
    status?: string | null;
  }) => {
    const approval = normalizeUpper(t.approvalStatus);
    const payment = normalizeUpper(t.paymentStatus);
    const txnStatus = normalizeUpper(t.status);
    const hasWorkflowData = Boolean(t.approvalStatus ?? t.paymentStatus ?? t.status);
    if (!hasWorkflowData) {
      return true;
    }
    const approvalSatisfied =
      approval === 'APPROVED' ||
      approval === 'APPROVED_FOR_PAYMENT' ||
      txnStatus === 'APPROVED';
    const paymentSatisfied = payment === 'PAID';
    return approvalSatisfied && paymentSatisfied;
  };

  const effectiveBankAccounts = bankLoaded
    ? liveBankAccounts.map((a) => ({
        id: a.id,
        accountName: a.account_name ?? 'Bank Account',
        balance: Number(a.balance ?? 0),
      }))
    : state.bankAccounts;

  const effectiveTransactions = txLoaded
    ? liveTransactions.map((t) => ({
        id: t.id,
        date: t.date ?? '',
        amount: Number(t.amount ?? 0),
        isIncome: toBoolean(t.is_income),
        paymentStatus: t.payment_status ?? null,
        approvalStatus: t.approval_status ?? null,
        status: t.status ?? null,
        accountingType: (t.accounting_type ?? 'Expense') as 'Revenue' | 'Expense' | 'Asset' | 'Liability',
        subtype: t.subtype ?? 'Other',
        sourceType: t.source_type ?? null,
      }))
    : state.transactions.map((t) => ({
        ...t,
        paymentStatus: null as string | null,
        approvalStatus: null as string | null,
        sourceType: null as string | null,
      }));

  // Calculate metrics from live app state
  const today = new Date().toISOString().split('T')[0];
  const todayDate = new Date();
  const currentMonthKey = today.slice(0, 7);
  const todayTransactions = effectiveTransactions.filter(
    (t) => t.date === today && isPostedCashTransaction(t)
  );
  const todayIncome = todayTransactions
    .filter(t => t.isIncome)
    .reduce((sum, t) => sum + t.amount, 0);
  const todayExpense = todayTransactions
    .filter(t => !t.isIncome)
    .reduce((sum, t) => sum + t.amount, 0);
  const todayNet = todayIncome - todayExpense;

  const currentMonthTransactions = effectiveTransactions.filter(
    (t) =>
      (t.date ?? '').startsWith(currentMonthKey) &&
      isPostedCashTransaction(t)
  );
  const monthlyRevenue = currentMonthTransactions
    .filter(t => t.isIncome)
    .reduce((sum, t) => sum + t.amount, 0);
  const monthlyBurn = currentMonthTransactions
    .filter(t => !t.isIncome)
    .reduce((sum, t) => sum + t.amount, 0);
  const monthlyNetCashFlow = monthlyRevenue - monthlyBurn;

  const cashBalance = effectiveBankAccounts.reduce((sum, account) => sum + Number(account.balance ?? 0), 0);
  const runway = calculateRunway(cashBalance, monthlyBurn);
  
  // Health thresholds
  const healthThresholds = {
    minRunwayMonths: 3,
    maxLoanPercentage: 10,
    minCashMonths: 2,
    maxDSODays: 45,
  };

  // Health score parameters from live data
  const monthlyLoans = currentMonthTransactions
    .filter(t => !t.isIncome && (t.accountingType === 'Liability' || t.subtype === 'Loans'))
    .reduce((sum, t) => sum + t.amount, 0);
  const unpaidRevenueAmount = state.invoices
    .filter(inv => inv.type === 'Revenue' && inv.balanceDue > 0)
    .reduce((sum, inv) => sum + inv.balanceDue, 0);
  const dso = calculateDSO(unpaidRevenueAmount, monthlyRevenue);
  
  const healthScore = calculateHealthScore(
    runway,
    monthlyLoans,
    monthlyRevenue,
    cashBalance,
    monthlyBurn,
    dso,
    healthThresholds
  );

  const getHealthStatus = (score: number) => {
    if (score >= 80) return 'Healthy';
    if (score >= 60) return 'Caution';
    return 'Critical';
  };

  // Alerts from live state
  const overdueInvoices = state.invoices.filter(inv => {
    const dueDate = new Date(inv.dueDate);
    return inv.balanceDue > 0 && (inv.status === 'Overdue' || dueDate < todayDate);
  }).length;
  const pendingApprovals = state.pendingApprovals.filter(a => a.status === 'pending');
  const pendingApprovalCount = pendingApprovals.length;
  const pendingApprovalAmount = pendingApprovals.reduce((sum, item) => sum + Number(item.amount ?? 0), 0);

  const pendingCompliance = state.complianceItems.filter(c => c.status !== 'Compliant');
  const nearestCompliance = pendingCompliance
    .filter(c => Boolean(c.dueDate))
    .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())[0];
  const complianceMessage = (() => {
    if (!nearestCompliance) {
      return pendingCompliance.length > 0
        ? `${pendingCompliance.length} compliance items pending`
        : 'No upcoming compliance dues';
    }
    const dueDate = new Date(nearestCompliance.dueDate);
    const days = Math.ceil((dueDate.getTime() - todayDate.getTime()) / (1000 * 60 * 60 * 24));
    if (days < 0) return `${nearestCompliance.name} overdue by ${Math.abs(days)} day${Math.abs(days) === 1 ? '' : 's'}`;
    if (days === 0) return `${nearestCompliance.name} due today`;
    if (days === 1) return `${nearestCompliance.name} due tomorrow`;
    return `${nearestCompliance.name} due in ${days} days`;
  })();

  const handleCardClick = (screenId: string) => {
    if (onNavigate) {
      onNavigate(screenId);
    }
  };

  // ── derived values used by charts ────────────────────────────────────────
  const invoicePaid    = state.invoices.filter(i => i.status === 'Paid').length  || 18;
  const invoicePending = state.invoices.filter(i => i.status === 'Pending' || i.status === 'Sent').length || 9;
  const invoiceOverdue = overdueInvoices || 3;

  const revBase = monthlyRevenue > 0 ? monthlyRevenue : 850000;
  const expBase = monthlyBurn    > 0 ? monthlyBurn    : 620000;

  const cashBase = cashBalance > 0 ? cashBalance : 1452386;

  const expenseCategoryData = [
    { name: 'Salaries',        value: 45, fill: '#DC2626' },
    { name: 'Operations',      value: 25, fill: '#F59E0B' },
    { name: 'Infrastructure',  value: 15, fill: '#2563EB' },
    { name: 'Marketing',       value: 10, fill: '#8b5cf6' },
    { name: 'Other',           value:  5, fill: '#64748b' },
  ];

  const cashDistData = (() => {
    const accounts = effectiveBankAccounts.slice(0, 4);
    const total = accounts.reduce((s, a) => s + Number(a.balance || 0), 0);
    if (accounts.length === 0 || total === 0) {
      return [
        { name: 'Operating', value: 60, fill: '#2563EB' },
        { name: 'Reserve',   value: 25, fill: '#8b5cf6' },
        { name: 'Tax / GST', value: 15, fill: '#F59E0B' },
      ];
    }
    const FILLS = ['#2563EB','#8b5cf6','#F59E0B','#DC2626'];
    return accounts.map((acc, idx) => ({
      name:  acc.accountName || `Account ${idx + 1}`,
      value: Math.max(Math.round(Number(acc.balance || 0) / total * 100), 5),
      fill:  FILLS[idx],
    }));
  })();

  const healthColor = healthScore >= 80 ? '#16A34A' : healthScore >= 60 ? '#F59E0B' : '#DC2626';
  const healthBg    = healthScore >= 80 ? 'bg-green-50 border-green-200' : healthScore >= 60 ? 'bg-amber-50 border-amber-200' : 'bg-red-50 border-red-200';
  const healthText  = healthScore >= 80 ? 'text-green-700' : healthScore >= 60 ? 'text-amber-700' : 'text-red-700';
  const healthInsight = healthScore >= 80
    ? 'Business is in strong financial health'
    : healthScore >= 60
    ? 'Some metrics need attention to improve score'
    : 'Low runway and cash reserves are affecting your score';

  const runwayColor = runway >= 6 ? 'text-green-600' : runway >= 3 ? 'text-amber-600' : 'text-red-600';
  const runwayBg    = runway >= 6 ? 'bg-green-50 border-green-200' : runway >= 3 ? 'bg-amber-50 border-amber-200' : 'bg-red-50 border-red-200';

  // ── NEW: Pending Receivables (Sales invoices not yet paid) ────────────────
  const pendingReceivables = state.invoices
    .filter(inv => inv.type === 'Revenue' && (inv.status === 'Pending' || inv.status === 'Sent'))
    .reduce((sum, inv) => sum + (inv.balanceDue || 0), 0);

  // ── NEW: Profitability Percentage ────────────────────────────────────────
  const profitabilityMargin = monthlyRevenue > 0 
    ? ((monthlyRevenue - monthlyBurn) / monthlyRevenue) * 100 
    : 0;

  // ── NEW: CEO Insights (5 key business metrics) ───────────────────────────
  // Calculate week-over-week expense change
  const sevenDaysAgo = new Date(todayDate);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const weekAgoKey = sevenDaysAgo.toISOString().split('T')[0].slice(0, 7);
  
  const lastWeekTransactions = effectiveTransactions.filter(
    (t) => (t.date ?? '').startsWith(weekAgoKey) && !t.isIncome && isPostedCashTransaction(t)
  );
  const lastWeekBurn = lastWeekTransactions.reduce((sum, t) => sum + t.amount, 0);
  const expenseChangePercent = lastWeekBurn > 0 
    ? Math.round(((monthlyBurn - lastWeekBurn) / lastWeekBurn) * 100)
    : 0;

  // Calculate top customers as % of revenue
  const topCustomerRevenue = state.invoices
    .filter(inv => inv.type === 'Revenue' && inv.status === 'Paid')
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 2)
    .reduce((sum, inv) => sum + inv.amount, 0);
  const topCustomerPercent = monthlyRevenue > 0 
    ? Math.round((topCustomerRevenue / monthlyRevenue) * 100)
    : 0;

  // Calculate cash pressure (days until cash runs out)
  const dailyBurnRate = monthlyBurn > 0 ? monthlyBurn / 30 : 1;
  const cashPressureDays = dailyBurnRate > 0 
    ? Math.round(cashBalance / dailyBurnRate)
    : 0;

  // Collections slowdown (DSO trend)
  const dsoTrendUp = dso > 45;

  // Marketing ROI (simple: revenue vs known marketing spend)
  const marketingSpendEstimate = currentMonthTransactions
    .filter(t => !t.isIncome && t.subtype === 'Marketing')
    .reduce((sum, t) => sum + t.amount, 0);
  const marketingRoiImprovement = 18; // placeholder, ideally calculated from YoY

  const ceoInsights = [
    {
      icon: 'TrendingUp',
      text: `Expenses increased ${expenseChangePercent}% this week, mainly due to operational costs.`,
      color: expenseChangePercent > 15 ? 'text-orange-600' : 'text-slate-600',
    },
    {
      icon: 'Users',
      text: `Your top 2 customers contribute ${topCustomerPercent}% of total revenue.`,
      color: topCustomerPercent > 60 ? 'text-blue-600' : 'text-slate-600',
    },
    {
      icon: 'AlertTriangle',
      text: `You may face cash pressure in ${cashPressureDays} days at current burn rate.`,
      color: cashPressureDays < 90 ? 'text-red-600' : 'text-slate-600',
    },
    {
      icon: 'RefreshCcw',
      text: dsoTrendUp 
        ? 'Collections slowed down this month. Follow up on overdue invoices.'
        : 'Collections are on track. DSO is healthy.',
      color: dsoTrendUp ? 'text-purple-600' : 'text-green-600',
    },
    {
      icon: 'Target',
      text: `Marketing ROI improved by ${marketingRoiImprovement}% compared to last month.`,
      color: 'text-green-600',
    },
  ];

  // ── NEW: Recent Transactions (past 7 days) ───────────────────────────────
  const sevenDaysAgoDate = new Date(todayDate);
  sevenDaysAgoDate.setDate(sevenDaysAgoDate.getDate() - 7);
  const sevenDaysAgoKey = sevenDaysAgoDate.toISOString().split('T')[0];

  const recentTransactions = effectiveTransactions
    .filter(t => (t.date ?? '') >= sevenDaysAgoKey && isPostedCashTransaction(t))
    .sort((a, b) => new Date(b.date ?? '').getTime() - new Date(a.date ?? '').getTime())
    .slice(0, 3);

  // ── NEW: Upcoming Payments (next 7 days) ─────────────────────────────────
  const sevenDaysFromNow = new Date(todayDate);
  sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);
  const sevenDaysFromNowKey = sevenDaysFromNow.toISOString().split('T')[0];

  const upcomingPayments = state.invoices
    .filter(inv => 
      inv.type === 'Expense' && 
      inv.dueDate >= today && 
      inv.dueDate <= sevenDaysFromNowKey &&
      inv.balanceDue > 0
    )
    .slice(0, 3);

  const upcomingPaymentTotal = upcomingPayments.reduce((sum, p) => sum + (p.balanceDue || 0), 0);

  // ── semi-circle gauge path helper ───────────────────────────────────────
  const gaugeArc = (pct: number, r: number, cx: number, cy: number) => {
    const clamp = Math.min(Math.max(pct, 0), 100);
    const angle = (clamp / 100) * 180;
    const rad = (angle - 180) * (Math.PI / 180);
    const x = cx + r * Math.cos(rad);
    const y = cy + r * Math.sin(rad);
    const largeArc = angle > 180 ? 1 : 0;
    return `M ${cx - r} ${cy} A ${r} ${r} 0 ${largeArc} 1 ${x} ${y}`;
  };

  return (
    <div className="w-full h-full overflow-auto bg-[#F8FAFC]">
      <div className="max-w-screen-2xl mx-auto px-8 py-8 space-y-8">

        {/* ── HEADER ──────────────────────────────────────────────────────── */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 leading-tight">Financial Command Center</h1>
            <p className="text-sm text-slate-500 mt-1">Know your business health in 5 seconds</p>
          </div>
          <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-4 py-2 shadow-sm">
            <Calendar className="w-4 h-4 text-slate-400" />
            <select className="text-sm text-slate-700 font-medium bg-transparent outline-none cursor-pointer pr-1">
              <option>Today</option>
              <option>This Week</option>
              <option>This Month</option>
              <option>This Quarter</option>
              <option>This Year</option>
            </select>
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════════════════
            SECTION 1 — HERO: 3-col layout (Health 25% | CASH 50% | Runway+Receivables 25%)
        ══════════════════════════════════════════════════════════════════ */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-5 items-start">

          {/* ── Business Health — Quarter size (25%) ── */}
          <Card className={`lg:col-span-1 p-6 border rounded-2xl shadow-sm ${healthBg} flex flex-col`}>
            <p className="text-sm font-semibold uppercase tracking-widest text-slate-500 mb-4">Business Health</p>

            {/* Semi-circle gauge — larger */}
            <div className="flex flex-col items-center">
              <svg viewBox="0 0 220 120" className="w-48 overflow-visible" aria-hidden="true">
                <path d={gaugeArc(100, 90, 110, 110)} fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="18" strokeLinecap="round" />
                <path d={gaugeArc(healthScore, 90, 110, 110)} fill="none" stroke={healthColor} strokeWidth="18" strokeLinecap="round" />
                <text x="110" y="100" textAnchor="middle" fontSize="40" fontWeight="800" fill={healthColor}>{healthScore}</text>
                <text x="110" y="118" textAnchor="middle" fontSize="14" fill="#94a3b8">of 100</text>
              </svg>
              <span className={`inline-block text-base font-bold px-4 py-2 rounded-full mt-3 ${healthText} bg-white/80`}>
                {getHealthStatus(healthScore)}
              </span>
            </div>
          </Card>

          {/* ── CASH IN BANK — Dominant Center (50%) ── */}
          <Card className="lg:col-span-2 px-8 py-8 border border-green-200 rounded-2xl shadow-sm bg-gradient-to-br from-green-50 to-white hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm font-semibold uppercase tracking-widest text-slate-500">Cash in Bank</p>
              <div className="p-3 bg-green-100 rounded-xl">
                <DollarSign className="w-6 h-6 text-green-600" />
              </div>
            </div>
            <p className="text-6xl font-extrabold text-slate-900 mt-3 font-mono">
              ₹{(cashBalance / 100000).toFixed(2)}L
            </p>
            <p className="text-lg text-slate-600 mt-2">Total Available Balance</p>
            <div className="mt-4 pt-4 border-t border-green-100 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">Across {effectiveBankAccounts.length} accounts</span>
                <span className={`font-semibold ${cashBalance > monthlyBurn * 3 ? 'text-green-600' : cashBalance > monthlyBurn ? 'text-amber-600' : 'text-red-600'}`}>
                  {cashBalance > monthlyBurn * 3 ? '✓ Healthy' : cashBalance > monthlyBurn ? '⚠ Watch' : '🔴 Critical'}
                </span>
              </div>
            </div>
            <Button variant="link" className="text-sm text-slate-600 p-0 h-auto mt-3">
              View Accounts →
            </Button>
          </Card>

          {/* ── Right Column: Runway + Receivables (25%) ── */}
          <div className="lg:col-span-1 space-y-4">
            
            <Card className={`px-7 py-6 border rounded-2xl shadow-sm hover:shadow-md transition-shadow ${runwayBg}`}>
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-semibold uppercase tracking-widest text-slate-500">Runway</p>
                <TrendingUp className={`w-5 h-5 ${runwayColor}`} />
              </div>
              <p className={`text-4xl font-extrabold mt-2 ${runwayColor}`}>
                {runway.toFixed(1)} <span className="text-lg font-semibold">mo</span>
              </p>
              <p className="text-sm text-slate-600 mt-2">Until {new Date(todayDate).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}</p>
            </Card>

            {/* Pending Receivables Card */}
            <Card className="px-7 py-6 border border-slate-200 rounded-2xl shadow-sm bg-white hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-semibold uppercase tracking-widest text-slate-500">Receivables</p>
                <FileText className="w-5 h-5 text-blue-600" />
              </div>
              <p className="text-4xl font-extrabold text-slate-900 mt-2">
                ₹{(pendingReceivables / 100000).toFixed(2)}L
              </p>
              <p className="text-sm text-slate-500 mt-2">{state.invoices.filter(inv => inv.type === 'Revenue' && (inv.status === 'Pending' || inv.status === 'Sent')).length} invoices</p>
            </Card>
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════════════════
            SECTION 2 — BUSINESS PERFORMANCE TIMELINE: Single narrative chart
        ══════════════════════════════════════════════════════════════════ */}
        <div>
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Business Performance Timeline</h2>
            <p className="text-slate-500">Understand your business performance and cash movement</p>
          </div>

          {/* TOP METRICS — What Changed This Month */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 mb-8">
            <Card className="p-6 border border-slate-200 rounded-2xl shadow-sm bg-white">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-slate-500 font-semibold">Revenue</p>
                <div className="p-2 bg-green-50 rounded-lg"><TrendingUp className="w-4 h-4 text-green-600" /></div>
              </div>
              <p className="text-3xl font-extrabold text-slate-900">₹{(revBase / 100000).toFixed(1)}L</p>
              <p className="text-sm text-green-600 font-bold mt-1">↑ 18% vs last month</p>
            </Card>

            <Card className="p-6 border border-slate-200 rounded-2xl shadow-sm bg-white">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-slate-500 font-semibold">Expenses</p>
                <div className="p-2 bg-red-50 rounded-lg"><TrendingDown className="w-4 h-4 text-red-600" /></div>
              </div>
              <p className="text-3xl font-extrabold text-slate-900">₹{(expBase / 100000).toFixed(1)}L</p>
              <p className="text-sm text-red-600 font-bold mt-1">↑ 4% vs last month</p>
            </Card>

            <Card className="p-6 border border-green-200 rounded-2xl shadow-sm bg-gradient-to-br from-green-50 to-white">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-slate-500 font-semibold">Profit</p>
                <div className="p-2 bg-green-100 rounded-lg"><DollarSign className="w-4 h-4 text-green-700" /></div>
              </div>
              <p className="text-3xl font-extrabold text-green-700">₹{((revBase - expBase) / 100000).toFixed(1)}L</p>
              <p className="text-sm text-green-600 font-bold mt-1">↑ 67% vs last month</p>
            </Card>

            <Card className="p-6 border border-slate-200 rounded-2xl shadow-sm bg-white">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-slate-500 font-semibold">Net Margin</p>
                <div className="p-2 bg-blue-50 rounded-lg"><BarChart3 className="w-4 h-4 text-blue-600" /></div>
              </div>
              <p className="text-3xl font-extrabold text-slate-900">{profitabilityMargin.toFixed(1)}%</p>
              <p className="text-sm text-blue-600 font-bold mt-1">↑ 9% vs last month</p>
            </Card>

            <Card className="p-6 border border-slate-200 rounded-2xl shadow-sm bg-white">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-slate-500 font-semibold">Best Week</p>
                <div className="p-2 bg-purple-50 rounded-lg"><Calendar className="w-4 h-4 text-purple-600" /></div>
              </div>
              <p className="text-2xl font-extrabold text-slate-900">13–19 May</p>
              <p className="text-xs text-slate-600 mt-1">Highest profit: ₹3.1L</p>
            </Card>
          </div>

          {/* MAIN CHART — Unified Timeline */}
          <Card className="p-8 border border-slate-200 rounded-2xl shadow-sm bg-white mb-8">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-slate-900">Revenue, Expenses & Profit Timeline</h3>
              <div className="flex items-center gap-3">
                <select className="px-4 py-2 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 bg-white hover:bg-slate-50 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="this-month">This Month (1 – 19 May)</option>
                  <option value="last-month">Last Month (1 – 30 Apr)</option>
                  <option value="this-quarter">This Quarter (1 Apr – 30 Jun)</option>
                  <option value="last-quarter">Last Quarter (1 Jan – 31 Mar)</option>
                  <option value="year-to-date">Year to Date (1 Jan – 19 May)</option>
                  <option value="last-year">Last 12 Months</option>
                  <option value="custom">Custom Range</option>
                </select>
                <Button variant="outline" className="text-sm px-4 py-2 border-slate-300">
                  📊 Export
                </Button>
              </div>
            </div>

            <div style={{ width: '100%', height: 350 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={[
                    { period: '1 May', revenue: Math.round(revBase * 0.22), expenses: Math.round(expBase * 0.28), profit: Math.round((revBase * 0.22) - (expBase * 0.28)), note: 'Month start' },
                    { period: '8 May', revenue: Math.round(revBase * 0.25), expenses: Math.round(expBase * 0.23), profit: Math.round((revBase * 0.25) - (expBase * 0.23)), note: 'Big client payment' },
                    { period: '13 May', revenue: Math.round(revBase * 0.28), expenses: Math.round(expBase * 0.25), profit: Math.round((revBase * 0.28) - (expBase * 0.25)), note: 'Marketing expenses ↑' },
                    { period: '19 May', revenue: Math.round(revBase * 0.25), expenses: Math.round(expBase * 0.24), profit: Math.round((revBase * 0.25) - (expBase * 0.24)), note: 'Collections improved' },
                  ]}
                  margin={{ left: -20, right: 10, top: 30, bottom: 60 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                  <XAxis 
                    dataKey="period" 
                    stroke="#94a3b8" 
                    tick={{ fontSize: 12, fontWeight: 500 }} 
                    axisLine={{ stroke: '#e2e8f0' }}
                    tickLine={false}
                  />
                  <YAxis 
                    stroke="#94a3b8" 
                    tick={{ fontSize: 11 }}
                    tickFormatter={(v) => `₹${(v / 100000).toFixed(0)}L`}
                    width={50}
                    axisLine={{ stroke: '#e2e8f0' }}
                    tickLine={false}
                  />
                  <Tooltip 
                    formatter={(value: number) => `₹${(value / 100000).toFixed(1)}L`}
                    contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: 12, fontWeight: 500 }}
                  />
                  <Legend wrapperStyle={{ fontSize: 12, fontWeight: 500, paddingTop: 10 }} />
                  <Bar dataKey="revenue"  fill="#16A34A" name="Revenue" radius={[6, 6, 0, 0]} maxBarSize={35} />
                  <Bar dataKey="expenses" fill="#DC2626" name="Expenses" radius={[6, 6, 0, 0]} maxBarSize={35} />
                  <Bar dataKey="profit"   fill="#2563EB" name="Profit"   radius={[6, 6, 0, 0]} maxBarSize={35} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Business Events & Insights on Timeline */}
            <div className="mt-8 pt-6 border-t border-slate-200 space-y-4">
              <p className="text-sm font-semibold text-slate-900">Key Events This Month</p>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <div className="flex gap-3 p-4 bg-green-50 rounded-lg border border-green-100">
                  <div className="text-lg">📌</div>
                  <div>
                    <p className="font-semibold text-slate-900 text-sm">8 May: Big Client Payment</p>
                    <p className="text-xs text-slate-600 mt-1">Revenue spike helped boost monthly growth</p>
                  </div>
                </div>
                <div className="flex gap-3 p-4 bg-red-50 rounded-lg border border-red-100">
                  <div className="text-lg">🚨</div>
                  <div>
                    <p className="font-semibold text-slate-900 text-sm">13 May: Marketing Expenses</p>
                    <p className="text-xs text-slate-600 mt-1">Campaign spending increased by ₹2.5L</p>
                  </div>
                </div>
                <div className="flex gap-3 p-4 bg-blue-50 rounded-lg border border-blue-100">
                  <div className="text-lg">💰</div>
                  <div>
                    <p className="font-semibold text-slate-900 text-sm">19 May: Collections Strong</p>
                    <p className="text-xs text-slate-600 mt-1">Receivables converted, cash position improved</p>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* ══════════════════════════════════════════════════════════════════
            SECTION 3 — CRITICAL ACTIONS: What requires immediate decision
        ══════════════════════════════════════════════════════════════════ */}
        <div>
          <h2 className="text-2xl font-bold text-slate-900 mb-6">Critical Actions</h2>
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* Overdue Invoices - Left Card */}
            <Card className="p-6 border-l-4 border-l-red-600 border border-slate-200 rounded-2xl shadow-sm bg-white hover:shadow-lg transition-shadow">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-red-50 rounded-lg">
                  <FileText className="w-5 h-5 text-red-600" />
                </div>
                <span className="text-2xl font-bold text-red-600">{invoiceOverdue}</span>
              </div>
              <p className="text-sm font-semibold text-slate-900">Overdue Invoices</p>
              <p className="text-lg font-bold text-red-600 mt-2">₹{(invoiceOverdue * 320000 / 100000).toFixed(0)}L stuck</p>
              <p className="text-xs text-slate-600 mt-1">Largest: ABC Industries (₹8.2L)</p>
              <Button className="w-full mt-4 bg-red-600 hover:bg-red-700 text-white font-semibold py-2 rounded-lg text-sm">
                Follow Up Now
              </Button>
            </Card>

            {/* Compliance Alerts - Middle Card */}
            <Card className="p-6 border-l-4 border-l-yellow-600 border border-slate-200 rounded-2xl shadow-sm bg-white hover:shadow-lg transition-shadow">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-yellow-50 rounded-lg">
                  <AlertTriangle className="w-5 h-5 text-yellow-600" />
                </div>
                <span className="text-2xl font-bold text-yellow-600">2</span>
              </div>
              <p className="text-sm font-semibold text-slate-900">Compliance Alerts</p>
              <div className="mt-2 space-y-1 text-xs text-slate-600">
                <p>GST filing due: 5 Jun</p>
                <p>Tax audit: Scheduled 12 Jun</p>
              </div>
              <Button className="w-full mt-4 bg-yellow-600 hover:bg-yellow-700 text-white font-semibold py-2 rounded-lg text-sm">
                View Calendar
              </Button>
            </Card>

            {/* Pending Approvals - Right Card */}
            <Card className="p-6 border-l-4 border-l-blue-600 border border-slate-200 rounded-2xl shadow-sm bg-white hover:shadow-lg transition-shadow">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-blue-50 rounded-lg">
                  <CheckCircle2 className="w-5 h-5 text-blue-600" />
                </div>
                <span className="text-2xl font-bold text-blue-600">3</span>
              </div>
              <p className="text-sm font-semibold text-slate-900">Pending Approvals</p>
              <div className="mt-2 space-y-1 text-xs text-slate-600">
                <p>Payment requests: ₹45L</p>
                <p>Budget increase: HR team</p>
              </div>
              <Button className="w-full mt-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 rounded-lg text-sm">
                Review Queue
              </Button>
            </Card>
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════════════════
            SECTION 7 — ONE POWERFUL INSIGHT
        ══════════════════════════════════════════════════════════════════ */}
        <Card className="p-8 border-2 border-blue-300 rounded-2xl shadow-sm bg-gradient-to-br from-blue-50 to-white">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-blue-100 rounded-lg mt-1">
              <Zap className="w-6 h-6 text-blue-700" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-blue-700 uppercase tracking-widest mb-1">AI Insight</p>
              <p className="text-lg font-bold text-slate-900 mb-2">Your salary costs are trending 45% vs target 30-35%. At current burn rate, you have 2.4 months runway.</p>
              <p className="text-slate-600 text-sm">Recommendation: Optimize headcount or increase revenue. Modeling shows ₹8L salary reduction would extend runway to 3.2 months.</p>
              <Button variant="link" className="mt-3 text-blue-600 hover:text-blue-700 font-semibold p-0">
                Run Scenario Analysis →
              </Button>
            </div>
          </div>
        </Card>

        {/* ══════════════════════════════════════════════════════════════════
            SECTION 4 — BREAKDOWN: Invoice Status (donut) & others
        ══════════════════════════════════════════════════════════════════ */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

          {/* ══ Money Waiting To Come In - Executive Priority Design ══ */}
          <Card className="p-8 border border-slate-200 rounded-2xl shadow-sm bg-white">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-2xl font-bold text-slate-900">Money Waiting To Come In</h2>
                <p className="text-sm text-slate-400 mt-1">Invoice Status</p>
              </div>
              <div className="flex items-center gap-3">
                <select className="px-4 py-2 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 bg-white hover:bg-slate-50 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="this-month">This Month (1 – 19 May)</option>
                  <option value="last-month">Last Month (1 – 30 Apr)</option>
                  <option value="this-quarter">This Quarter (1 Apr – 30 Jun)</option>
                  <option value="last-quarter">Last Quarter (1 Jan – 31 Mar)</option>
                  <option value="year-to-date">Year to Date (1 Jan – 19 May)</option>
                  <option value="last-year">Last 12 Months</option>
                  <option value="custom">Custom Range</option>
                </select>
                {invoiceOverdue > 0 && (
                  <div className="px-4 py-2 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-xs font-bold text-red-600">NEEDS ATTENTION</p>
                  </div>
                )}
              </div>
            </div>

            {/* HERO: Overdue Amount (Biggest Priority) */}
            <div className="mb-8 pb-8 border-b border-slate-200">
              <p className="text-sm text-slate-500 mb-2 font-semibold uppercase">Money Stuck</p>
              <p className="text-6xl font-extrabold text-red-600 mb-2">₹{(invoiceOverdue * 320000 / 100000).toFixed(0)}L</p>
              <p className="text-lg text-slate-600">{invoiceOverdue} invoice{invoiceOverdue !== 1 ? 's' : ''} delayed</p>
            </div>

            {/* Collection Metrics */}
            <div className="grid grid-cols-2 gap-6 mb-8">
              <div>
                <p className="text-sm text-slate-500 mb-2">Avg Collection Time</p>
                <p className="text-3xl font-bold text-slate-900">21 <span className="text-lg font-semibold">days</span></p>
                <p className="text-xs text-slate-500 mt-1">↓ 3 days vs last month</p>
              </div>
              <div>
                <p className="text-sm text-slate-500 mb-2">Largest Overdue Client</p>
                <p className="text-2xl font-bold text-slate-900">ABC Industries</p>
                <p className="text-lg text-red-600 font-semibold">₹8.2L</p>
              </div>
            </div>

            {/* Stacked Progress Bar (replaces donut) */}
            <div className="mb-6">
              <div className="flex rounded-lg overflow-hidden h-8 w-full gap-1">
                <div className="bg-green-500" style={{ width: `${(invoicePaid / (invoicePaid + invoicePending + invoiceOverdue) * 100)}%` }} title={`Paid: ${invoicePaid}`} />
                <div className="bg-yellow-400" style={{ width: `${(invoicePending / (invoicePaid + invoicePending + invoiceOverdue) * 100)}%` }} title={`Pending: ${invoicePending}`} />
                <div className="bg-red-500" style={{ width: `${(invoiceOverdue / (invoicePaid + invoicePending + invoiceOverdue) * 100)}%` }} title={`Overdue: ${invoiceOverdue}`} />
              </div>
            </div>

            {/* Invoice Breakdown */}
            <div className="grid grid-cols-3 gap-4 mb-8 pb-8 border-b border-slate-200">
              <div>
                <p className="text-sm text-slate-600 mb-1">Paid</p>
                <p className="text-2xl font-bold text-green-600">₹11L</p>
                <p className="text-sm text-slate-500">{invoicePaid} invoice{invoicePaid !== 1 ? 's' : ''}</p>
              </div>
              <div>
                <p className="text-sm text-slate-600 mb-1">Pending</p>
                <p className="text-2xl font-bold text-yellow-600">₹8L</p>
                <p className="text-sm text-slate-500">{invoicePending} invoice{invoicePending !== 1 ? 's' : ''}</p>
              </div>
              <div>
                <p className="text-sm text-slate-600 mb-1">Overdue</p>
                <p className="text-2xl font-bold text-red-600">₹26L</p>
                <p className="text-sm text-slate-500">{invoiceOverdue} invoice{invoiceOverdue !== 1 ? 's' : ''}</p>
              </div>
            </div>

            {/* Action Button */}
            <Button className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded-lg text-base">
              Follow Up Now →
            </Button>
          </Card>

          {/* ══ Where Your Money Is Going - Executive Insights ══ */}
          <Card className="p-8 border border-slate-200 rounded-2xl shadow-sm bg-white">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-2xl font-bold text-slate-900">Where Your Money Is Going</h2>
                <p className="text-sm text-slate-400 mt-1">Expense Breakdown</p>
              </div>
              <select className="px-4 py-2 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 bg-white hover:bg-slate-50 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="this-month">This Month (1 – 19 May)</option>
                <option value="last-month">Last Month (1 – 30 Apr)</option>
                <option value="this-quarter">This Quarter (1 Apr – 30 Jun)</option>
                <option value="last-quarter">Last Quarter (1 Jan – 31 Mar)</option>
                <option value="year-to-date">Year to Date (1 Jan – 19 May)</option>
                <option value="last-year">Last 12 Months</option>
                <option value="custom">Custom Range</option>
              </select>
            </div>

            {/* Horizontal Allocation Bars with Benchmarks */}
            <div className="space-y-6">
              {[
                { name: 'Salaries', amount: '₹4,05,000', pct: 45, benchmark: '30-35%', status: 'above', trend: '+8%', color: 'bg-red-500' },
                { name: 'Operations', amount: '₹2,25,000', pct: 25, benchmark: '20-25%', status: 'healthy', trend: '-3%', color: 'bg-yellow-500' },
                { name: 'Infrastructure', amount: '₹1,35,000', pct: 15, benchmark: '12-15%', status: 'healthy', trend: '-2%', color: 'bg-blue-500' },
                { name: 'Marketing', amount: '₹90,000', pct: 10, benchmark: '15-20%', status: 'below', trend: '+5%', color: 'bg-purple-500' },
                { name: 'Other', amount: '₹45,000', pct: 5, benchmark: '<5%', status: 'healthy', trend: '0%', color: 'bg-slate-400' },
              ].map((expense, idx) => (
                <div key={idx}>
                  <div className="flex items-center justify-between mb-2">
                    <p className="font-semibold text-slate-900 text-base">{expense.name}</p>
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-slate-600">{expense.amount}</span>
                      <span className={`text-sm font-bold ${expense.status === 'above' ? 'text-red-600' : expense.status === 'below' ? 'text-blue-600' : 'text-green-600'}`}>
                        {expense.status === 'above' ? '↑' : expense.status === 'below' ? '↓' : '✓'} {expense.trend}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-3 items-center">
                    <div className="flex-1">
                      <div className="w-full bg-slate-100 rounded-lg h-6 overflow-hidden">
                        <div className={`${expense.color} h-full flex items-center justify-end pr-2`} style={{ width: `${expense.pct}%` }}>
                          <span className="text-white font-bold text-sm">{expense.pct}%</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-slate-600">Target: {expense.benchmark}</p>
                      <p className={`text-xs font-semibold ${expense.status === 'above' ? 'text-red-600' : expense.status === 'below' ? 'text-blue-600' : 'text-green-600'}`}>
                        {expense.status === 'above' ? '⚠ Above' : expense.status === 'below' ? 'Below' : '✓ Healthy'}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Financial Risk Signals */}
            <div className="mt-8 pt-8 border-t border-slate-200 space-y-3">
              <p className="font-bold text-slate-900 text-base">Financial Risk Signals</p>
              <div className="space-y-2">
                <div className="flex items-start gap-2 text-sm">
                  <span className="text-red-600 font-bold">🔴</span>
                  <span className="text-slate-700">Salaries are consuming 45% of expenses. Recommended range is 30–35%.</span>
                </div>
                <div className="flex items-start gap-2 text-sm">
                  <span className="text-green-600 font-bold">🟢</span>
                  <span className="text-slate-700">Operating costs stable this month. Good job keeping expenses in check.</span>
                </div>
                <div className="flex items-start gap-2 text-sm">
                  <span className="text-amber-600 font-bold">🟡</span>
                  <span className="text-slate-700">Marketing spend below target. Consider increasing to capture growth.</span>
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* ══════════════════════════════════════════════════════��═══════════
            SECTION 5 — CASH ALLOCATION: Horizontal stacked bar
        ═══════════════════════════════════════════════���══════════════════ */}
        <Card className="p-8 border border-slate-200 rounded-2xl shadow-sm bg-white">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-slate-900">Cash Allocation</h2>
              <p className="text-sm text-slate-400 mt-1">Smart allocation of your money</p>
            </div>
            <Button variant="ghost" className="text-base text-slate-600 hover:text-slate-900 font-semibold">
              Manage Allocation →
            </Button>
          </div>

          {/* Stacked horizontal bar - larger height */}
          <div className="mb-7">
            <div className="flex rounded-full overflow-hidden h-12 w-full gap-1">
              <div className="bg-green-500 flex items-center justify-center text-white text-sm font-bold" style={{ width: '54%' }}>
                Operating
              </div>
              <div className="bg-blue-500 flex items-center justify-center text-white text-sm font-bold" style={{ width: '16%' }}>
                GST
              </div>
              <div className="bg-amber-400 flex items-center justify-center text-white text-sm font-bold" style={{ width: '17%' }}>
                Salary
              </div>
              <div className="bg-purple-400 flex items-center justify-center text-white text-sm font-bold" style={{ width: '13%' }}>
                Profit
              </div>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-5">
            {[
              { name: 'Operating Account', amount: '₹6,20,000', pct: 54, color: 'bg-green-500' },
              { name: 'GST Reserve', amount: '₹1,80,000', pct: 16, color: 'bg-blue-500' },
              { name: 'Salary Reserve', amount: '₹2,00,000', pct: 17, color: 'bg-amber-400' },
              { name: 'Profit Reserve', amount: '₹1,46,591', pct: 13, color: 'bg-purple-400' },
            ].map(bucket => (
              <div key={bucket.name}>
                <p className="text-sm font-semibold text-slate-600 mb-2">{bucket.name}</p>
                <p className="text-2xl font-bold text-slate-900 mb-2">{bucket.amount}</p>
                <div className="flex items-center gap-2 mt-3">
                  <div className={`w-3 h-3 rounded-full ${bucket.color}`} />
                  <p className="text-sm text-slate-500 font-semibold">{bucket.pct}% allocation</p>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* ══════════════════════════════════════════════════════════════════
            SECTION 4 — ACTION CENTER: 4 alert cards
        ══════════════════════════════════════════════════════════════════ */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-600" />
            <h2 className="text-xl font-bold text-slate-900">Action Center</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Alert 1: Overdue Invoices */}
            <Card className="p-6 border border-red-200 bg-red-50 hover:shadow-md transition-shadow cursor-pointer rounded-2xl" onClick={() => handleCardClick('invoices')}>
              <div className="p-2.5 bg-red-100 rounded-xl w-fit mb-4">
                <AlertCircle className="w-5 h-5 text-red-600" />
              </div>
              <p className="text-base font-bold text-slate-900 mb-1">Overdue Invoices</p>
              <p className="text-sm text-slate-600 mb-5">{overdueInvoices} invoice{overdueInvoices !== 1 ? 's' : ''} overdue</p>
              <Button size="sm" variant="outline" className="text-red-600 border-red-300 hover:bg-red-100 text-xs w-full">
                Review
              </Button>
            </Card>

            {/* Alert 2: Pending Approvals */}
            <Card className="p-6 border border-orange-200 bg-orange-50 hover:shadow-md transition-shadow cursor-pointer rounded-2xl" onClick={() => handleCardClick('approval-queue')}>
              <div className="p-2.5 bg-orange-100 rounded-xl w-fit mb-4">
                <Clock className="w-5 h-5 text-orange-600" />
              </div>
              <p className="text-base font-bold text-slate-900 mb-1">Pending Approvals</p>
              <p className="text-sm text-slate-600 mb-5">
                ₹{pendingApprovalAmount.toLocaleString('en-IN')} across {pendingApprovalCount} request{pendingApprovalCount === 1 ? '' : 's'}
              </p>
              <Button size="sm" variant="outline" className="text-orange-600 border-orange-300 hover:bg-orange-100 text-xs w-full">
                Approve
              </Button>
            </Card>

            {/* Alert 3: Compliance Due */}
            <Card className="p-6 border border-orange-200 bg-orange-50 hover:shadow-md transition-shadow cursor-pointer rounded-2xl" onClick={() => handleCardClick('compliance-deadlines')}>
              <div className="p-2.5 bg-orange-100 rounded-xl w-fit mb-4">
                <Calendar className="w-5 h-5 text-orange-600" />
              </div>
              <p className="text-base font-bold text-slate-900 mb-1">Compliance Due</p>
              <p className="text-sm text-slate-600 mb-5">{complianceMessage}</p>
              <Button size="sm" variant="outline" className="text-orange-600 border-orange-300 hover:bg-orange-100 text-xs w-full">
                View
              </Button>
            </Card>

            {/* Alert 4: Budget Alert */}
            <Card className="p-6 border border-yellow-200 bg-yellow-50 hover:shadow-md transition-shadow cursor-pointer rounded-2xl" onClick={() => handleCardClick('budget-management')}>
              <div className="p-2.5 bg-yellow-100 rounded-xl w-fit mb-4">
                <Zap className="w-5 h-5 text-yellow-600" />
              </div>
              <p className="text-base font-bold text-slate-900 mb-1">Budget Alert</p>
              <p className="text-sm text-slate-600 mb-5">Marketing budget 85% used</p>
              <Button size="sm" variant="outline" className="text-yellow-600 border-yellow-300 hover:bg-yellow-100 text-xs w-full">
                Review
              </Button>
            </Card>
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════════════════
            SECTION 5 — CASH & ACCOUNTS (minimal, larger numbers)
        ══════════════════════════════════════════════════════════════════ */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Landmark className="w-5 h-5 text-blue-600" />
            <h2 className="text-xl font-bold text-slate-900">Cash & Accounts</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Bank Accounts */}
            <Card className="p-6 border border-slate-200 bg-white rounded-2xl hover:shadow-md transition-shadow cursor-pointer" onClick={() => handleCardClick('bank-accounts')}>
              <div className="flex items-start justify-between mb-4">
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Bank Accounts</p>
                  <p className="text-3xl font-extrabold text-slate-900">{effectiveBankAccounts.length}</p>
                </div>
                <div className="p-3 bg-blue-50 rounded-xl">
                  <Landmark className="w-5 h-5 text-blue-600" />
                </div>
              </div>
              <div className="space-y-2 mt-3">
                {effectiveBankAccounts.slice(0, 2).map(acc => (
                  <div key={acc.id} className="flex justify-between items-center text-sm">
                    <span className="text-slate-500">{acc.accountName}</span>
                    <span className="font-semibold text-slate-800">₹{(acc.balance / 100000).toFixed(1)}L</span>
                  </div>
                ))}
                {effectiveBankAccounts.length > 2 && (
                  <p className="text-xs text-slate-400">+{effectiveBankAccounts.length - 2} more</p>
                )}
              </div>
              <Button size="sm" variant="outline" className="text-xs mt-4 w-full">
                Manage Accounts
              </Button>
            </Card>

            {/* Bucket Allocations */}
            <Card className="p-6 border border-slate-200 bg-white rounded-2xl hover:shadow-md transition-shadow cursor-pointer" onClick={() => handleCardClick('bucket-allocation')}>
              <div className="flex items-start justify-between mb-4">
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Bucket Allocation</p>
                  <p className="text-3xl font-extrabold text-slate-900">{state.bankAccountMappings.length}</p>
                </div>
                <div className="p-3 bg-green-50 rounded-xl">
                  <Boxes className="w-5 h-5 text-green-600" />
                </div>
              </div>
              <div className="space-y-1.5 mt-3">
                {state.bankAccountMappings.slice(0, 2).map(mapping => {
                  const bucket = ['GST', 'Operating', 'Reserve', 'CapEx'][['gst', 'operating', 'reserve', 'capex'].indexOf(mapping.bucketId)] || mapping.bucketId;
                  return (
                    <div key={mapping.id} className="flex justify-between text-sm">
                      <span className="text-slate-500">{bucket}</span>
                      <span className="font-semibold text-slate-800">{mapping.allocationPercentage}%</span>
                    </div>
                  );
                })}
                {state.bankAccountMappings.length > 2 && (
                  <p className="text-xs text-slate-400">+{state.bankAccountMappings.length - 2} more</p>
                )}
              </div>
              <Button size="sm" variant="outline" className="text-xs mt-4 w-full">
                Configure
              </Button>
            </Card>

            {/* Recent Transfers */}
            <Card className="p-6 border border-slate-200 bg-white rounded-2xl hover:shadow-md transition-shadow cursor-pointer">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Recent Transfers</p>
                  <p className="text-3xl font-extrabold text-slate-900">{state.interAccountTransfers.length}</p>
                </div>
                <div className="p-3 bg-purple-50 rounded-xl">
                  <ArrowRight className="w-5 h-5 text-purple-600" />
                </div>
              </div>
              <div className="space-y-2 mt-3">
                {state.interAccountTransfers.slice(-2).reverse().map(transfer => (
                  <div key={transfer.id} className="flex justify-between text-sm">
                    <span className="text-slate-500 truncate pr-2">{transfer.description}</span>
                    <span className="font-semibold text-slate-800 shrink-0">₹{(transfer.amount / 1000).toFixed(0)}k</span>
                  </div>
                ))}
                {state.interAccountTransfers.length === 0 && (
                  <p className="text-sm text-slate-400">No transfers yet</p>
                )}
              </div>
            </Card>
          </div>
        </div>

      </div>
    </div>
  );
}
