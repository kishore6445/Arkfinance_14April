'use client';

import React, { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  AlertCircle, TrendingUp, TrendingDown, DollarSign, Calendar, AlertTriangle, 
  CheckCircle2, Eye, FileText, BarChart3, PieChart, ArrowRight, Zap, Clock, Landmark, Boxes
} from 'lucide-react';
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
        }

        if (txRes.ok) {
          const txPayload = await txRes.json();
          if (isMounted) {
            setLiveTransactions((txPayload.transactions ?? []) as TransactionApiRow[]);
            setTxLoaded(true);
          }
        }

      } catch {
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

  return (
    <div className="w-full h-full overflow-auto bg-slate-950">
      <div className="max-w-7xl mx-auto">
        
        {/* HERO STRIP - Full Width Top Metrics */}
        <div className="bg-gradient-to-r from-slate-900 to-slate-800 border-b border-slate-700">
          <div className="px-8 py-8 grid grid-cols-2 md:grid-cols-4 gap-8">
            {/* Metric 1: Cash Available */}
            <div className="space-y-2">
              <p className="text-sm font-semibold text-slate-400 uppercase tracking-wide">Cash Available</p>
              <p className="text-3xl md:text-4xl font-bold text-white">₹{(cashBalance / 100000).toFixed(2)}L</p>
              <div className="h-1 w-16 bg-green-500 rounded-full"></div>
            </div>
            
            {/* Metric 2: Monthly Burn */}
            <div className="space-y-2">
              <p className="text-sm font-semibold text-slate-400 uppercase tracking-wide">Monthly Burn</p>
              <p className="text-3xl md:text-4xl font-bold text-red-400">₹{(monthlyBurn / 100000).toFixed(2)}L</p>
              <div className="h-1 w-16 bg-red-500 rounded-full"></div>
            </div>
            
            {/* Metric 3: Runway */}
            <div className="space-y-2">
              <p className="text-sm font-semibold text-slate-400 uppercase tracking-wide">Runway</p>
              <p className="text-3xl md:text-4xl font-bold text-yellow-400">{runway.toFixed(1)}mo</p>
              <div className="h-1 w-16 bg-yellow-500 rounded-full"></div>
            </div>
            
            {/* Metric 4: Health */}
            <div className="space-y-2">
              <p className="text-sm font-semibold text-slate-400 uppercase tracking-wide">Health Score</p>
              <p className={`text-3xl md:text-4xl font-bold ${
                healthScore >= 80 ? 'text-green-400' : 
                healthScore >= 60 ? 'text-yellow-400' : 
                'text-red-400'
              }`}>{healthScore}/100</p>
              <div className={`h-1 w-16 rounded-full ${
                healthScore >= 80 ? 'bg-green-500' : 
                healthScore >= 60 ? 'bg-yellow-500' : 
                'bg-red-500'
              }`}></div>
            </div>
          </div>
        </div>

        <div className="p-8 space-y-8">

        {/* SECTION 2: NEEDS ATTENTION - Enhanced */}
        <div className="space-y-4">
          <h2 className="text-2xl font-bold text-white">Needs Attention</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Urgent Section */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-2 h-6 bg-red-500 rounded"></div>
                <h3 className="font-semibold text-white text-lg">Urgent</h3>
              </div>
              
              <Card className="p-6 border-l-4 border-l-red-500 bg-slate-800 border border-slate-700">
                <div className="flex items-center justify-between mb-3">
                  <p className="font-semibold text-white text-sm uppercase">Overdue Invoices</p>
                  <span className="text-2xl font-bold text-red-400">{overdueInvoices}</span>
                </div>
                <div className="w-full bg-slate-700 rounded-full h-2">
                  <div className="bg-red-500 h-2 rounded-full" style={{ width: '60%' }}></div>
                </div>
                <p className="text-xs text-slate-400 mt-3">Action: Collect outstanding payments</p>
              </Card>
            </div>

            {/* Warning Section */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-2 h-6 bg-yellow-500 rounded"></div>
                <h3 className="font-semibold text-white text-lg">Warnings</h3>
              </div>
              
              {pendingApprovalCount > 0 && (
                <Card className="p-6 border-l-4 border-l-yellow-500 bg-slate-800 border border-slate-700">
                  <div className="flex items-center justify-between mb-3">
                    <p className="font-semibold text-white text-sm uppercase">Pending Approvals</p>
                    <span className="text-2xl font-bold text-yellow-400">₹{(pendingApprovalAmount / 100000).toFixed(2)}L</span>
                  </div>
                  <p className="text-xs text-slate-400">{pendingApprovalCount} items awaiting approval</p>
                </Card>
              )}
            </div>
          </div>
        </div>

        {/* SECTION 3: CASH FLOW SECTION */}
        <div className="space-y-4">
          <h2 className="text-2xl font-bold text-white">Cash Flow</h2>
          
          <div className="grid grid-cols-3 gap-4">
            {/* Money In */}
            <Card className="p-6 bg-slate-800 border border-slate-700">
              <p className="text-sm font-semibold text-slate-400 uppercase mb-2">Money In (Today)</p>
              <p className="text-2xl font-bold text-green-400">₹{todayIncome.toLocaleString('en-IN')}</p>
              <div className="w-full bg-slate-700 rounded-full h-1 mt-4">
                <div className="bg-green-500 h-1 rounded-full" style={{ width: '70%' }}></div>
              </div>
            </Card>

            {/* Money Out */}
            <Card className="p-6 bg-slate-800 border border-slate-700">
              <p className="text-sm font-semibold text-slate-400 uppercase mb-2">Money Out (Today)</p>
              <p className="text-2xl font-bold text-red-400">₹{todayExpense.toLocaleString('en-IN')}</p>
              <div className="w-full bg-slate-700 rounded-full h-1 mt-4">
                <div className="bg-red-500 h-1 rounded-full" style={{ width: '45%' }}></div>
              </div>
            </Card>

            {/* Net Flow */}
            <Card className="p-6 bg-slate-800 border border-slate-700">
              <p className="text-sm font-semibold text-slate-400 uppercase mb-2">Net Flow (Today)</p>
              <p className={`text-2xl font-bold ${todayNet >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {todayNet >= 0 ? '+' : '-'}₹{Math.abs(todayNet).toLocaleString('en-IN')}
              </p>
              <div className="w-full bg-slate-700 rounded-full h-1 mt-4">
                <div className={`h-1 rounded-full ${todayNet >= 0 ? 'bg-green-500' : 'bg-red-500'}`} style={{ width: '65%' }}></div>
              </div>
            </Card>
          </div>
        </div>

        {/* SECTION 4: EXPENSE BREAKDOWN */}
        <div className="space-y-4">
          <h2 className="text-2xl font-bold text-white">Monthly Breakdown</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Left: Revenue vs Expense */}
            <Card className="p-6 bg-slate-800 border border-slate-700">
              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-semibold text-slate-300">Revenue</p>
                    <p className="text-lg font-bold text-green-400">₹{(monthlyRevenue / 100000).toFixed(2)}L</p>
                  </div>
                  <div className="w-full bg-slate-700 rounded-full h-2">
                    <div className="bg-green-500 h-2 rounded-full" style={{ width: '85%' }}></div>
                  </div>
                </div>
                
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-semibold text-slate-300">Expenses</p>
                    <p className="text-lg font-bold text-red-400">₹{(monthlyBurn / 100000).toFixed(2)}L</p>
                  </div>
                  <div className="w-full bg-slate-700 rounded-full h-2">
                    <div className="bg-red-500 h-2 rounded-full" style={{ width: '60%' }}></div>
                  </div>
                </div>

                <div className="border-t border-slate-600 pt-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-slate-300">Net (This Month)</p>
                    <p className={`text-lg font-bold ${monthlyNetCashFlow >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {monthlyNetCashFlow >= 0 ? '+' : '-'}₹{Math.abs(monthlyNetCashFlow).toLocaleString('en-IN')}
                    </p>
                  </div>
                </div>
              </div>
            </Card>

            {/* Right: Cash Distribution by Account */}
            <Card className="p-6 bg-slate-800 border border-slate-700">
              <h3 className="font-semibold text-white mb-4">Cash by Account</h3>
              <div className="space-y-3">
                {effectiveBankAccounts.length > 0 ? (
                  effectiveBankAccounts.map((account, idx) => (
                    <div key={account.id || idx}>
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-sm text-slate-300">{account.accountName || 'Account'}</p>
                        <p className="font-semibold text-white">₹{(Number(account.balance ?? 0) / 100000).toFixed(2)}L</p>
                      </div>
                      <div className="w-full bg-slate-700 rounded-full h-2">
                        <div 
                          className="bg-blue-500 h-2 rounded-full"
                          style={{ width: `${Math.min((Number(account.balance ?? 0) / cashBalance) * 100, 100)}%` }}
                        ></div>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-slate-400">No accounts connected</p>
                )}
              </div>
            </Card>
          </div>
        </div>

        {/* SECTION 5: INSIGHTS */}
        <div className="space-y-4">
          <h2 className="text-2xl font-bold text-white">Insights</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Insight 1: Runway Status */}
            <Card className="p-4 bg-slate-800 border border-slate-700">
              <p className="text-sm text-slate-400 mb-2">Runway Status</p>
              <p className={`font-semibold ${
                runway > 6 ? 'text-green-400' :
                runway > 3 ? 'text-yellow-400' :
                'text-red-400'
              }`}>
                {runway > 6 ? '✓ Healthy runway' : runway > 3 ? '⚠ Limited runway' : '✗ Critical runway'}
              </p>
              <p className="text-xs text-slate-400 mt-1">Current: {runway.toFixed(1)} months of operations</p>
            </Card>

            {/* Insight 2: Compliance */}
            {complianceMessage && (
              <Card className="p-4 bg-slate-800 border border-slate-700">
                <p className="text-sm text-slate-400 mb-2">Compliance</p>
                <p className="font-semibold text-slate-200">{complianceMessage}</p>
              </Card>
            )}

            {/* Insight 3: Health Trend */}
            <Card className="p-4 bg-slate-800 border border-slate-700">
              <p className="text-sm text-slate-400 mb-2">Business Health</p>
              <p className={`font-semibold ${
                healthScore >= 80 ? 'text-green-400' : 
                healthScore >= 60 ? 'text-yellow-400' : 
                'text-red-400'
              }`}>
                {getHealthStatus(healthScore)}
              </p>
              <p className="text-xs text-slate-400 mt-1">Score: {healthScore}/100</p>
            </Card>
          </div>
        </div>

        {/* SECTION 6: NAVIGATION CARDS */}
        <div className="space-y-4">
          <h2 className="text-2xl font-bold text-white">Explore</h2>
          
            {/* Invoices */}
            <Card className="p-6 bg-slate-800 border border-slate-700 hover:border-slate-600 transition cursor-pointer" onClick={() => handleCardClick('invoices')}>
              <div className="flex items-start justify-between mb-4">
                <div>
                  <p className="text-sm font-semibold text-slate-400 mb-2">Invoices</p>
                  <p className="text-2xl font-bold text-white">Manage</p>
                </div>
                <div className="p-2 bg-slate-700 rounded-lg">
                  <FileText className="w-5 h-5 text-slate-300" />
                </div>
              </div>
              <p className="text-xs text-slate-400">View and track invoices</p>
            </Card>

            {/* Budget */}
            <Card className="p-6 bg-slate-800 border border-slate-700 hover:border-slate-600 transition cursor-pointer" onClick={() => handleCardClick('budget-management')}>
              <div className="flex items-start justify-between mb-4">
                <div>
                  <p className="text-sm font-semibold text-slate-400 mb-2">Budget</p>
                  <p className="text-2xl font-bold text-white">Track</p>
                </div>
                <div className="p-2 bg-slate-700 rounded-lg">
                  <BarChart3 className="w-5 h-5 text-slate-300" />
                </div>
              </div>
              <p className="text-xs text-slate-400">Monitor spending limits</p>
            </Card>

            {/* Accounts */}
            <Card className="p-6 bg-slate-800 border border-slate-700 hover:border-slate-600 transition cursor-pointer" onClick={() => handleCardClick('bank-accounts')}>
              <div className="flex items-start justify-between mb-4">
                <div>
                  <p className="text-sm font-semibold text-slate-400 mb-2">Bank Accounts</p>
                  <p className="text-2xl font-bold text-white">Manage</p>
                </div>
                <div className="p-2 bg-slate-700 rounded-lg">
                  <Landmark className="w-5 h-5 text-slate-300" />
                </div>
              </div>
              <p className="text-xs text-slate-400">View all connected accounts</p>
            </Card>

            {/* Buckets */}
            <Card className="p-6 bg-slate-800 border border-slate-700 hover:border-slate-600 transition cursor-pointer" onClick={() => handleCardClick('bucket-allocation')}>
              <div className="flex items-start justify-between mb-4">
                <div>
                  <p className="text-sm font-semibold text-slate-400 mb-2">Buckets</p>
                  <p className="text-2xl font-bold text-white">Allocate</p>
                </div>
                <div className="p-2 bg-slate-700 rounded-lg">
                  <Boxes className="w-5 h-5 text-slate-300" />
                </div>
              </div>
              <p className="text-xs text-slate-400">Manage cash distribution</p>
            </Card>

            {/* Revenue */}
            <Card className="p-6 bg-slate-800 border border-slate-700 hover:border-slate-600 transition cursor-pointer" onClick={() => handleCardClick('revenue-breakdown')}>
              <div className="flex items-start justify-between mb-4">
                <div>
                  <p className="text-sm font-semibold text-slate-400 mb-2">Revenue</p>
                  <p className="text-2xl font-bold text-white">Analyze</p>
                </div>
                <div className="p-2 bg-slate-700 rounded-lg">
                  <TrendingUp className="w-5 h-5 text-slate-300" />
                </div>
              </div>
              <p className="text-xs text-slate-400">View revenue sources</p>
            </Card>

            {/* Expenses */}
            <Card className="p-6 bg-slate-800 border border-slate-700 hover:border-slate-600 transition cursor-pointer" onClick={() => handleCardClick('expense-breakdown')}>
              <div className="flex items-start justify-between mb-4">
                <div>
                  <p className="text-sm font-semibold text-slate-400 mb-2">Expenses</p>
                  <p className="text-2xl font-bold text-white">Track</p>
                </div>
                <div className="p-2 bg-slate-700 rounded-lg">
                  <TrendingDown className="w-5 h-5 text-slate-300" />
                </div>
              </div>
              <p className="text-xs text-slate-400">Breakdown by category</p>
            </Card>
          </div>
        </div>

        </div>
      </div>
    </div>
  );
}
