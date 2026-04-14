'use client';

import { useState, useMemo } from 'react';
import { Download, FileText } from 'lucide-react';
import { useAppState } from '@/context/app-state';
import { generateEnhancedPLStatement, generateBalanceSheet, generateCashFlowStatement, getDateRange } from '@/lib/financial-calculations';

type TabType = 'final-account' | 'cash-flow' | 'sap' | 'share-capital' | 'sch-bs' | 'sch-pl' | 'notes' | 'ari' | 'bs-schedule' | 'pl-schedule' | 'fixed-assets' | 'dep-as-per-it' | 'deferred-tax' | 'gratuity-cal' | 'audit-entries';

export function FinancialStatementsScreen() {
  const { state } = useAppState();
  const [activeTab, setActiveTab] = useState<TabType>('final-account');

  const tabs = [
    { id: 'final-account' as TabType, label: 'FINAL ACCOUNT', color: 'primary', icon: '📊' },
    { id: 'cash-flow' as TabType, label: 'Cash Flow Statement', color: 'default', icon: '💰' },
    { id: 'sap' as TabType, label: 'SAP', color: 'default', icon: '📋' },
    { id: 'share-capital' as TabType, label: 'Share Capital', color: 'highlight', icon: '📈' },
    { id: 'sch-bs' as TabType, label: 'Sch - BS', color: 'default', icon: '📑' },
    { id: 'sch-pl' as TabType, label: 'Sch - P&L', color: 'default', icon: '📑' },
    { id: 'notes' as TabType, label: 'Notes', color: 'highlight', icon: '📝' },
    { id: 'ari' as TabType, label: 'ARI', color: 'default', icon: '📄' },
    { id: 'bs-schedule' as TabType, label: 'BS Subschedule', color: 'default', icon: '📋' },
    { id: 'pl-schedule' as TabType, label: 'P&L Subschedule', color: 'default', icon: '📊' },
    { id: 'fixed-assets' as TabType, label: 'Fixed Assets', color: 'default', icon: '🏗️' },
    { id: 'dep-as-per-it' as TabType, label: 'Depreciation', color: 'default', icon: '📉' },
    { id: 'deferred-tax' as TabType, label: 'Deferred Tax', color: 'default', icon: '💳' },
    { id: 'gratuity-cal' as TabType, label: 'Gratuity', color: 'default', icon: '👥' },
    { id: 'audit-entries' as TabType, label: 'Audit Entries', color: 'highlight', icon: '✓' },
  ];

  const now = new Date();
  const currentYear = now.getFullYear();
  const previousYear = currentYear - 1;

  const getYearFromDate = (value?: string) => {
    const date = new Date(String(value ?? ''));
    return Number.isNaN(date.getTime()) ? null : date.getFullYear();
  };

  const currentYearRange = {
    start: `${currentYear}-01-01`,
    end: `${currentYear}-12-31`,
  };

  const previousYearRange = {
    start: `${previousYear}-01-01`,
    end: `${previousYear}-12-31`,
  };

  // Generate real financial data from transactions
  const realPLStatement = useMemo(() => {
    const { start, end } = getDateRange('year');
    return generateEnhancedPLStatement(state.transactions, state.invoices, start, end);
  }, [state.transactions, state.invoices]);

  const realPLPreviousYear = useMemo(() => {
    return generateEnhancedPLStatement(
      state.transactions,
      state.invoices,
      previousYearRange.start,
      previousYearRange.end
    );
  }, [state.transactions, state.invoices, previousYear]);

  const realBalanceSheet = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    return generateBalanceSheet(state.transactions, state.invoices, today);
  }, [state.transactions, state.invoices]);

  const realBalanceSheetPreviousYear = useMemo(() => {
    return generateBalanceSheet(
      state.transactions,
      state.invoices,
      `${previousYear}-12-31`
    );
  }, [state.transactions, state.invoices, previousYear]);

  const realCashFlow = useMemo(() => {
    const { start, end } = getDateRange('year');
    return generateCashFlowStatement(state.transactions, start, end);
  }, [state.transactions]);

  const realCashFlowPreviousYear = useMemo(() => {
    return generateCashFlowStatement(
      state.transactions,
      previousYearRange.start,
      previousYearRange.end
    );
  }, [state.transactions, previousYear]);

  const approvedTransactions = useMemo(() => {
    return state.transactions.filter((t) => {
      const approval = String((t as any).approvalStatus ?? (t as any).approval_status ?? t.status ?? '')
        .trim()
        .toUpperCase()
        .replace(/[^A-Z0-9]+/g, '_');
      return approval === 'APPROVED' || String(t.status ?? '').toUpperCase() === 'APPROVED';
    });
  }, [state.transactions]);

  const receivablesByYear = useMemo(() => {
    let current = 0;
    let previous = 0;
    for (const invoice of state.invoices) {
      if (invoice.type !== 'Revenue') continue;
      const year = getYearFromDate(invoice.dueDate);
      const amount = Number(invoice.balanceDue ?? 0);
      if (year === currentYear) current += amount;
      if (year === previousYear) previous += amount;
    }
    return { current, previous };
  }, [state.invoices, currentYear, previousYear]);

  const assetGroups = useMemo(() => {
    const map = new Map<string, number>();

    for (const tx of state.transactions) {
      const year = getYearFromDate(tx.date);
      if (year !== currentYear || tx.accountingType !== 'Asset') continue;

      const key = tx.coaName || tx.subtype || tx.description || 'Capital Assets';
      map.set(key, (map.get(key) || 0) + Math.abs(Number(tx.amount ?? 0)));
    }

    const entries = Array.from(map.entries())
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value);

    if (entries.length === 0) {
      return [{ label: 'Capital Assets', value: Math.max(0, Number(realBalanceSheet.assets.fixed || 0)) }];
    }

    return entries.slice(0, 8);
  }, [state.transactions, currentYear, realBalanceSheet.assets.fixed]);

  const totalAssetGroupValue = useMemo(
    () => assetGroups.reduce((sum, item) => sum + item.value, 0),
    [assetGroups]
  );

  const effectiveDepRate =
    Number(realBalanceSheet.assets.fixed || 0) > 0
      ? ((Number(realPLStatement.summary?.totalDepreciation || 0) / Number(realBalanceSheet.assets.fixed || 0)) * 100)
      : 0;

  const effectiveTaxRate =
    Number(realPLStatement.summary?.profitBeforeTax || 0) > 0
      ? ((Number(realPLStatement.summary?.taxExpense || 0) / Number(realPLStatement.summary?.profitBeforeTax || 0)) * 100)
      : 0;

  const gratuityPaidDuringYear = useMemo(() => {
    return state.transactions
      .filter((tx) => {
        const year = getYearFromDate(tx.date);
        const bucket = `${tx.description} ${tx.subtype} ${tx.coaName}`.toLowerCase();
        return year === currentYear && tx.accountingType === 'Expense' && bucket.includes('gratuity');
      })
      .reduce((sum, tx) => sum + Math.abs(Number(tx.amount ?? 0)), 0);
  }, [state.transactions, currentYear]);

  const openingGratuityProvision = Number(realPLPreviousYear.summary?.totalEmployeeBenefits || 0) * 0.1;
  const currentYearGratuityProvision = Number(realPLStatement.summary?.totalEmployeeBenefits || 0) * 0.1;
  const closingGratuityProvision = Math.max(
    0,
    openingGratuityProvision + currentYearGratuityProvision - gratuityPaidDuringYear
  );

  const fmt = (value: number) =>
    Number(value || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const renderTabContent = () => {
    switch (activeTab) {
      case 'final-account':
        return (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold">Balance Sheet</h2>
                <p className="text-sm text-muted-foreground mt-1">Generated from live transaction data</p>
              </div>
              <button className="flex items-center gap-2 px-4 py-2 bg-accent text-accent-foreground rounded-lg hover:bg-accent/90">
                <Download size={18} />
                Export
              </button>
            </div>
            <div className="overflow-x-auto rounded-lg border border-border">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="bg-background border-b border-border">
                    <th className="border border-border px-4 py-2 text-left font-semibold">PARTICULARS</th>
                    <th className="border border-border px-4 py-2 text-right font-semibold">Current Year</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-border">
                    <td className="border border-border px-4 py-2">Current Assets</td>
                    <td className="border border-border px-4 py-2 text-right">₹{fmt(realBalanceSheet.assets.current)}</td>
                  </tr>
                  <tr className="border-b border-border">
                    <td className="border border-border px-4 py-2">Fixed Assets</td>
                    <td className="border border-border px-4 py-2 text-right">₹{fmt(realBalanceSheet.assets.fixed)}</td>
                  </tr>
                  <tr className="border-b border-border bg-accent/10">
                    <td className="border border-border px-4 py-2 font-semibold">Total Assets</td>
                    <td className="border border-border px-4 py-2 text-right font-semibold">₹{fmt(realBalanceSheet.assets.total)}</td>
                  </tr>
                  <tr className="border-b border-border">
                    <td className="border border-border px-4 py-2">Current Liabilities</td>
                    <td className="border border-border px-4 py-2 text-right">₹{fmt(realBalanceSheet.liabilities.current)}</td>
                  </tr>
                  <tr className="border-b border-border">
                    <td className="border border-border px-4 py-2">Long Term Liabilities</td>
                    <td className="border border-border px-4 py-2 text-right">₹{fmt(realBalanceSheet.liabilities.longTerm)}</td>
                  </tr>
                  <tr className="border-b border-border">
                    <td className="border border-border px-4 py-2">Equity</td>
                    <td className="border border-border px-4 py-2 text-right">₹{fmt(realBalanceSheet.equity.total)}</td>
                  </tr>
                  <tr className="border-b border-border bg-accent/10">
                    <td className="border border-border px-4 py-2 font-semibold">Liabilities + Equity</td>
                    <td className="border border-border px-4 py-2 text-right font-semibold">₹{fmt(realBalanceSheet.totalLiabilitiesAndEquity)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        );
      case 'cash-flow':
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold">Cash Flow Statement</h2>
              <p className="text-sm text-muted-foreground mt-1">Automatically generated from approved transaction flows</p>
            </div>
            <div className="overflow-x-auto rounded-lg border border-border shadow-sm">
              <table className="w-full border-collapse text-sm bg-white">
                <thead>
                  <tr className="bg-gradient-to-r from-muted/40 to-muted/20 border-b border-border">
                    <th className="border border-border px-4 py-3 text-left font-semibold text-foreground">PARTICULARS</th>
                    <th className="border border-border px-4 py-3 text-right font-semibold text-foreground">Current Year</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-border bg-accent/10">
                    <td className="border border-border px-4 py-2 font-semibold">A. CASH FLOW FROM OPERATING ACTIVITIES</td>
                    <td className="border border-border px-4 py-2 text-right"></td>
                  </tr>
                  <tr className="border-b border-border">
                    <td className="border border-border px-4 py-2">Operating Inflows</td>
                    <td className="border border-border px-4 py-2 text-right">₹{fmt(realCashFlow.operating.inflows)}</td>
                  </tr>
                  <tr className="border-b border-border">
                    <td className="border border-border px-4 py-2">Operating Outflows</td>
                    <td className="border border-border px-4 py-2 text-right">₹{fmt(realCashFlow.operating.outflows)}</td>
                  </tr>
                  <tr className="border-b border-border bg-accent/10">
                    <td className="border border-border px-4 py-2 font-semibold">Net Cash from Operating Activities</td>
                    <td className="border border-border px-4 py-2 text-right font-semibold">₹{fmt(realCashFlow.operating.net)}</td>
                  </tr>
                  <tr className="border-b border-border bg-accent/10">
                    <td className="border border-border px-4 py-2 font-semibold">B. CASH FLOW FROM INVESTING ACTIVITIES</td>
                    <td className="border border-border px-4 py-2 text-right"></td>
                  </tr>
                  <tr className="border-b border-border">
                    <td className="border border-border px-4 py-2">Investing Inflows</td>
                    <td className="border border-border px-4 py-2 text-right">₹{fmt(realCashFlow.investing.inflows)}</td>
                  </tr>
                  <tr className="border-b border-border">
                    <td className="border border-border px-4 py-2">Investing Outflows</td>
                    <td className="border border-border px-4 py-2 text-right">₹{fmt(realCashFlow.investing.outflows)}</td>
                  </tr>
                  <tr className="border-b border-border bg-accent/10">
                    <td className="border border-border px-4 py-2 font-semibold">Net Cash from Investing Activities</td>
                    <td className="border border-border px-4 py-2 text-right font-semibold">₹{fmt(realCashFlow.investing.net)}</td>
                  </tr>
                  <tr className="border-b border-border bg-accent/10">
                    <td className="border border-border px-4 py-2 font-semibold">C. CASH FLOW FROM FINANCING ACTIVITIES</td>
                    <td className="border border-border px-4 py-2 text-right"></td>
                  </tr>
                  <tr className="border-b border-border">
                    <td className="border border-border px-4 py-2">Financing Inflows</td>
                    <td className="border border-border px-4 py-2 text-right">₹{fmt(realCashFlow.financing.inflows)}</td>
                  </tr>
                  <tr className="border-b border-border">
                    <td className="border border-border px-4 py-2">Financing Outflows</td>
                    <td className="border border-border px-4 py-2 text-right">₹{fmt(realCashFlow.financing.outflows)}</td>
                  </tr>
                  <tr className="border-b border-border bg-accent/10">
                    <td className="border border-border px-4 py-2 font-semibold">Net Cash Change</td>
                    <td className="border border-border px-4 py-2 text-right font-semibold">₹{fmt(realCashFlow.summary.netCashFlow)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        );
      case 'sap':
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold">Summary of Accounting Policies</h2>
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold mb-2">1. Company Overview</h3>
                <p className="text-sm text-muted-foreground">This report set is generated from {state.transactions.length} transactions and {state.invoices.length} invoices captured in the system.</p>
              </div>
              <div>
                <h3 className="font-semibold mb-2">2. Basis of Preparation</h3>
                <p className="text-sm text-muted-foreground">Statements are generated from transaction-level postings and invoice balances using the configured chart of accounts and accounting type mappings.</p>
              </div>
              <div>
                <h3 className="font-semibold mb-2">3. Revenue Recognition</h3>
                <p className="text-sm text-muted-foreground">Revenue is recognised when performance obligations are satisfied, which is generally upon delivery of goods or services to the customer.</p>
              </div>
              <div>
                <h3 className="font-semibold mb-2">4. Inventories</h3>
                <p className="text-sm text-muted-foreground">Inventories are valued at the lower of cost and net realisable value using the weighted average method. Cost includes material, labour and appropriate production overheads.</p>
              </div>
              <div>
                <h3 className="font-semibold mb-2">5. Property, Plant and Equipment</h3>
                <p className="text-sm text-muted-foreground">Fixed assets are carried at cost less accumulated depreciation. Depreciation is provided on a straight-line basis over the estimated useful lives of the assets.</p>
              </div>
            </div>
          </div>
        );
      case 'share-capital':
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold">Share Capital Details</h2>
            <div className="overflow-x-auto rounded-lg border border-border">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="bg-background border-b border-border">
                    <th className="border border-border px-4 py-2 text-left font-semibold">PARTICULARS</th>
                    <th className="border border-border px-4 py-2 text-right font-semibold">Current Year</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-border">
                    <td className="border border-border px-4 py-2">Capital</td>
                    <td className="border border-border px-4 py-2 text-right">₹{fmt(realBalanceSheet.equity.capital)}</td>
                  </tr>
                  <tr className="border-b border-border bg-accent/10">
                    <td className="border border-border px-4 py-2 font-semibold">Retained Earnings</td>
                    <td className="border border-border px-4 py-2 text-right font-semibold">₹{fmt(realBalanceSheet.equity.retainedEarnings)}</td>
                  </tr>
                  <tr className="border-b border-border bg-accent/10">
                    <td className="border border-border px-4 py-2 font-semibold">Total Equity</td>
                    <td className="border border-border px-4 py-2 text-right font-semibold">₹{fmt(realBalanceSheet.equity.total)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        );
      case 'notes':
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold">Notes to the Financial Statements</h2>
            <div className="space-y-6">
              <div>
                <h3 className="font-semibold mb-2">Note 1: Revenue from Operations</h3>
                <div className="overflow-x-auto rounded-lg border border-border">
                  <table className="w-full border-collapse text-sm">
                    <tbody>
                      <tr className="border-b border-border">
                        <td className="border border-border px-4 py-2">Revenue from Operations</td>
                        <td className="border border-border px-4 py-2 text-right">₹{fmt(realPLStatement.summary?.totalRevenue || 0)}</td>
                      </tr>
                      <tr className="border-b border-border">
                        <td className="border border-border px-4 py-2">Other Income</td>
                        <td className="border border-border px-4 py-2 text-right">₹{fmt(realPLStatement.summary?.otherIncome || 0)}</td>
                      </tr>
                      <tr className="border-b border-border bg-accent/10">
                        <td className="border border-border px-4 py-2 font-semibold">Total</td>
                        <td className="border border-border px-4 py-2 text-right font-semibold">₹{fmt((realPLStatement.summary?.totalRevenue || 0) + (realPLStatement.summary?.otherIncome || 0))}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
              <div>
                <h3 className="font-semibold mb-2">Note 2: Share Capital</h3>
                <p className="text-sm text-muted-foreground">Capital and reserves are derived from balance sheet aggregation.</p>
              </div>
              <div>
                <h3 className="font-semibold mb-2">Note 3: Reserves and Surplus</h3>
                <div className="overflow-x-auto rounded-lg border border-border">
                  <table className="w-full border-collapse text-sm">
                    <tbody>
                      <tr className="border-b border-border">
                        <td className="border border-border px-4 py-2">Retained Earnings</td>
                        <td className="border border-border px-4 py-2 text-right">₹{fmt(realBalanceSheet.equity.retainedEarnings)}</td>
                      </tr>
                      <tr className="border-b border-border bg-accent/10">
                        <td className="border border-border px-4 py-2 font-semibold">Net Profit (Current Period)</td>
                        <td className="border border-border px-4 py-2 text-right font-semibold">₹{fmt(realPLStatement.summary?.netProfit || 0)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        );
      case 'sch-bs':
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold">Schedule - Balance Sheet Details</h2>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="bg-background border-b border-border">
                    <th className="border border-border px-4 py-2 text-left font-semibold">PARTICULARS</th>
                    <th className="border border-border px-4 py-2 text-right font-semibold">{currentYear}</th>
                    <th className="border border-border px-4 py-2 text-right font-semibold">{previousYear}</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-border">
                    <td className="border border-border px-4 py-2">Fixed Assets (Net)</td>
                    <td className="border border-border px-4 py-2 text-right">₹{fmt(realBalanceSheet.assets.fixed)}</td>
                    <td className="border border-border px-4 py-2 text-right">₹{fmt(realBalanceSheetPreviousYear.assets.fixed)}</td>
                  </tr>
                  <tr className="border-b border-border">
                    <td className="border border-border px-4 py-2">Current Assets</td>
                    <td className="border border-border px-4 py-2 text-right">₹{fmt(realBalanceSheet.assets.current)}</td>
                    <td className="border border-border px-4 py-2 text-right">₹{fmt(realBalanceSheetPreviousYear.assets.current)}</td>
                  </tr>
                  <tr className="border-b border-border">
                    <td className="border border-border px-4 py-2">Trade Receivables</td>
                    <td className="border border-border px-4 py-2 text-right">₹{fmt(receivablesByYear.current)}</td>
                    <td className="border border-border px-4 py-2 text-right">₹{fmt(receivablesByYear.previous)}</td>
                  </tr>
                  <tr className="border-b border-border">
                    <td className="border border-border px-4 py-2">Cash & Equivalents</td>
                    <td className="border border-border px-4 py-2 text-right">₹{fmt(Math.max(0, realCashFlow.summary.netCashFlow))}</td>
                    <td className="border border-border px-4 py-2 text-right">₹{fmt(Math.max(0, realCashFlowPreviousYear.summary.netCashFlow))}</td>
                  </tr>
                  <tr className="border-b border-border bg-accent/10">
                    <td className="border border-border px-4 py-2 font-semibold">Total Assets</td>
                    <td className="border border-border px-4 py-2 text-right font-semibold">₹{fmt(realBalanceSheet.assets.total)}</td>
                    <td className="border border-border px-4 py-2 text-right font-semibold">₹{fmt(realBalanceSheetPreviousYear.assets.total)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        );
      case 'sch-pl':
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold">Schedule - Profit & Loss Details</h2>
            <div className="text-xs text-muted-foreground mb-4">
              <p>Generated from {state.transactions.length} transactions | Data automatically calculated</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="bg-background border-b border-border">
                    <th className="border border-border px-4 py-2 text-left font-semibold">PARTICULARS</th>
                    <th className="border border-border px-4 py-2 text-right font-semibold">{currentYear}</th>
                    <th className="border border-border px-4 py-2 text-right font-semibold">{previousYear}</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-border">
                    <td className="border border-border px-4 py-2">Revenue from Operations</td>
                    <td className="border border-border px-4 py-2 text-right">₹{fmt(realPLStatement.summary?.totalRevenue || 0)}</td>
                    <td className="border border-border px-4 py-2 text-right">₹{fmt(realPLPreviousYear.summary?.totalRevenue || 0)}</td>
                  </tr>
                  <tr className="border-b border-border">
                    <td className="border border-border px-4 py-2">Cost of Materials Consumed</td>
                    <td className="border border-border px-4 py-2 text-right">₹{fmt(realPLStatement.summary?.totalCOGS || 0)}</td>
                    <td className="border border-border px-4 py-2 text-right">₹{fmt(realPLPreviousYear.summary?.totalCOGS || 0)}</td>
                  </tr>
                  <tr className="border-b border-border">
                    <td className="border border-border px-4 py-2">Gross Profit</td>
                    <td className="border border-border px-4 py-2 text-right">₹{fmt(realPLStatement.summary?.grossProfit || 0)}</td>
                    <td className="border border-border px-4 py-2 text-right">₹{fmt(realPLPreviousYear.summary?.grossProfit || 0)}</td>
                  </tr>
                  <tr className="border-b border-border">
                    <td className="border border-border px-4 py-2">Employee Benefits Expense</td>
                    <td className="border border-border px-4 py-2 text-right">₹{fmt(realPLStatement.summary?.totalEmployeeBenefits || 0)}</td>
                    <td className="border border-border px-4 py-2 text-right">₹{fmt(realPLPreviousYear.summary?.totalEmployeeBenefits || 0)}</td>
                  </tr>
                  <tr className="border-b border-border">
                    <td className="border border-border px-4 py-2">Depreciation</td>
                    <td className="border border-border px-4 py-2 text-right">₹{fmt(realPLStatement.summary?.totalDepreciation || 0)}</td>
                    <td className="border border-border px-4 py-2 text-right">₹{fmt(realPLPreviousYear.summary?.totalDepreciation || 0)}</td>
                  </tr>
                  <tr className="border-b border-border">
                    <td className="border border-border px-4 py-2">Other Expenses</td>
                    <td className="border border-border px-4 py-2 text-right">₹{fmt(realPLStatement.summary?.totalOtherExpenses || 0)}</td>
                    <td className="border border-border px-4 py-2 text-right">₹{fmt(realPLPreviousYear.summary?.totalOtherExpenses || 0)}</td>
                  </tr>
                  <tr className="border-b border-border bg-accent/10">
                    <td className="border border-border px-4 py-2 font-semibold">EBIT</td>
                    <td className="border border-border px-4 py-2 text-right font-semibold">₹{fmt((realPLStatement.summary?.grossProfit || 0) - (realPLStatement.summary?.totalEmployeeBenefits || 0) - (realPLStatement.summary?.totalDepreciation || 0) - (realPLStatement.summary?.totalOtherExpenses || 0))}</td>
                    <td className="border border-border px-4 py-2 text-right font-semibold">₹{fmt((realPLPreviousYear.summary?.grossProfit || 0) - (realPLPreviousYear.summary?.totalEmployeeBenefits || 0) - (realPLPreviousYear.summary?.totalDepreciation || 0) - (realPLPreviousYear.summary?.totalOtherExpenses || 0))}</td>
                  </tr>
                  <tr className="border-b border-border">
                    <td className="border border-border px-4 py-2">Finance Costs</td>
                    <td className="border border-border px-4 py-2 text-right">₹{fmt(realPLStatement.summary?.totalFinanceCosts || 0)}</td>
                    <td className="border border-border px-4 py-2 text-right">₹{fmt(realPLPreviousYear.summary?.totalFinanceCosts || 0)}</td>
                  </tr>
                  <tr className="border-b border-border bg-accent/10">
                    <td className="border border-border px-4 py-2 font-semibold">Profit Before Tax</td>
                    <td className="border border-border px-4 py-2 text-right font-semibold">₹{fmt(realPLStatement.summary?.profitBeforeTax || 0)}</td>
                    <td className="border border-border px-4 py-2 text-right font-semibold">₹{fmt(realPLPreviousYear.summary?.profitBeforeTax || 0)}</td>
                  </tr>
                  <tr className="border-b border-border">
                    <td className="border border-border px-4 py-2">Tax Expense</td>
                    <td className="border border-border px-4 py-2 text-right">₹{fmt(realPLStatement.summary?.taxExpense || 0)}</td>
                    <td className="border border-border px-4 py-2 text-right">₹{fmt(realPLPreviousYear.summary?.taxExpense || 0)}</td>
                  </tr>
                  <tr className="border-b border-border bg-accent/10">
                    <td className="border border-border px-4 py-2 font-semibold">Net Profit</td>
                    <td className="border border-border px-4 py-2 text-right font-semibold">₹{fmt(realPLStatement.summary?.netProfit || 0)}</td>
                    <td className="border border-border px-4 py-2 text-right font-semibold">₹{fmt(realPLPreviousYear.summary?.netProfit || 0)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        );
      case 'fixed-assets':
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold">Fixed Assets Schedule</h2>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="bg-background border-b border-border">
                    <th className="border border-border px-4 py-2 text-left font-semibold">PARTICULARS</th>
                    <th className="border border-border px-4 py-2 text-right font-semibold">Gross Block</th>
                    <th className="border border-border px-4 py-2 text-right font-semibold">Depreciation</th>
                    <th className="border border-border px-4 py-2 text-right font-semibold">Net Block</th>
                  </tr>
                </thead>
                <tbody>
                  {assetGroups.map((asset, idx) => {
                    const depreciation = totalAssetGroupValue > 0
                      ? (asset.value / totalAssetGroupValue) * Number(realPLStatement.summary?.totalDepreciation || 0)
                      : 0;
                    return (
                      <tr className="border-b border-border" key={`${asset.label}-${idx}`}>
                        <td className="border border-border px-4 py-2">{asset.label}</td>
                        <td className="border border-border px-4 py-2 text-right">₹{fmt(asset.value)}</td>
                        <td className="border border-border px-4 py-2 text-right">₹{fmt(depreciation)}</td>
                        <td className="border border-border px-4 py-2 text-right">₹{fmt(Math.max(0, asset.value - depreciation))}</td>
                      </tr>
                    );
                  })}
                  <tr className="border-b border-border bg-accent/10">
                    <td className="border border-border px-4 py-2 font-semibold">Total</td>
                    <td className="border border-border px-4 py-2 text-right font-semibold">₹{fmt(totalAssetGroupValue)}</td>
                    <td className="border border-border px-4 py-2 text-right font-semibold">₹{fmt(realPLStatement.summary?.totalDepreciation || 0)}</td>
                    <td className="border border-border px-4 py-2 text-right font-semibold">₹{fmt(Math.max(0, totalAssetGroupValue - Number(realPLStatement.summary?.totalDepreciation || 0)))}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        );
      case 'dep-as-per-it':
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold">Depreciation as Per Income Tax Rules</h2>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="bg-background border-b border-border">
                    <th className="border border-border px-4 py-2 text-left font-semibold">PARTICULARS</th>
                    <th className="border border-border px-4 py-2 text-right font-semibold">Rate (%)</th>
                    <th className="border border-border px-4 py-2 text-right font-semibold">Depreciation</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-border">
                    <td className="border border-border px-4 py-2">Effective Depreciable Asset Base</td>
                    <td className="border border-border px-4 py-2 text-right">{effectiveDepRate.toFixed(2)}%</td>
                    <td className="border border-border px-4 py-2 text-right">₹{fmt(realPLStatement.summary?.totalDepreciation || 0)}</td>
                  </tr>
                  <tr className="border-b border-border bg-accent/10">
                    <td className="border border-border px-4 py-2 font-semibold">Total IT Depreciation</td>
                    <td className="border border-border px-4 py-2 text-right"></td>
                    <td className="border border-border px-4 py-2 text-right font-semibold">₹{fmt(realPLStatement.summary?.totalDepreciation || 0)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        );
      case 'deferred-tax':
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold">Deferred Tax Asset / Liability</h2>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="bg-background border-b border-border">
                    <th className="border border-border px-4 py-2 text-left font-semibold">PARTICULARS</th>
                    <th className="border border-border px-4 py-2 text-right font-semibold">Taxable Temporary Difference</th>
                    <th className="border border-border px-4 py-2 text-right font-semibold">Deferred Tax ({effectiveTaxRate.toFixed(2)}%)</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-border">
                    <td className="border border-border px-4 py-2">Excess Book Depreciation</td>
                    <td className="border border-border px-4 py-2 text-right">₹{fmt(realPLStatement.summary?.totalDepreciation || 0)}</td>
                    <td className="border border-border px-4 py-2 text-right">₹{fmt(Number(realPLStatement.summary?.totalDepreciation || 0) * (effectiveTaxRate / 100))}</td>
                  </tr>
                  <tr className="border-b border-border bg-accent/10">
                    <td className="border border-border px-4 py-2 font-semibold">Net Deferred Tax Asset</td>
                    <td className="border border-border px-4 py-2 text-right"></td>
                    <td className="border border-border px-4 py-2 text-right font-semibold">₹{fmt(Number(realPLStatement.summary?.taxExpense || 0) * (effectiveTaxRate / 100))}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        );
      case 'gratuity-cal':
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold">Gratuity Calculation & Provision</h2>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="bg-background border-b border-border">
                    <th className="border border-border px-4 py-2 text-left font-semibold">PARTICULARS</th>
                    <th className="border border-border px-4 py-2 text-right font-semibold">Amount (Rs 000's)</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-border">
                    <td className="border border-border px-4 py-2">Opening Balance of Gratuity Provision</td>
                    <td className="border border-border px-4 py-2 text-right">₹{fmt(openingGratuityProvision)}</td>
                  </tr>
                  <tr className="border-b border-border">
                    <td className="border border-border px-4 py-2">Current Year Provision</td>
                    <td className="border border-border px-4 py-2 text-right">₹{fmt(currentYearGratuityProvision)}</td>
                  </tr>
                  <tr className="border-b border-border">
                    <td className="border border-border px-4 py-2">Gratuity Paid During Year</td>
                    <td className="border border-border px-4 py-2 text-right">₹{fmt(gratuityPaidDuringYear)}</td>
                  </tr>
                  <tr className="border-b border-border bg-accent/10">
                    <td className="border border-border px-4 py-2 font-semibold">Closing Balance of Gratuity Provision</td>
                    <td className="border border-border px-4 py-2 text-right font-semibold">₹{fmt(closingGratuityProvision)}</td>
                  </tr>
                  <tr className="border-b border-border mt-4">
                    <td className="border border-border px-4 py-2 font-semibold">Actuarial Valuation Method</td>
                    <td className="border border-border px-4 py-2 text-right">Projected Unit Credit</td>
                  </tr>
                  <tr className="border-b border-border">
                    <td className="border border-border px-4 py-2">Discount Rate (%)</td>
                    <td className="border border-border px-4 py-2 text-right">6.50%</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        );
      case 'audit-entries':
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold">Audit Adjustments</h2>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="bg-background border-b border-border">
                    <th className="border border-border px-4 py-2 text-left font-semibold">S.No</th>
                    <th className="border border-border px-4 py-2 text-left font-semibold">Description</th>
                    <th className="border border-border px-4 py-2 text-right font-semibold">Debit</th>
                    <th className="border border-border px-4 py-2 text-right font-semibold">Credit</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-border">
                    <td className="border border-border px-4 py-2">1</td>
                    <td className="border border-border px-4 py-2">Approved Expense Transactions</td>
                    <td className="border border-border px-4 py-2 text-right">₹{fmt(approvedTransactions.filter((t) => t.accountingType === 'Expense').reduce((sum, t) => sum + Number(t.amount || 0), 0))}</td>
                    <td className="border border-border px-4 py-2 text-right"></td>
                  </tr>
                  <tr className="border-b border-border">
                    <td className="border border-border px-4 py-2">2</td>
                    <td className="border border-border px-4 py-2">Approved Revenue Transactions</td>
                    <td className="border border-border px-4 py-2 text-right"></td>
                    <td className="border border-border px-4 py-2 text-right">₹{fmt(approvedTransactions.filter((t) => t.accountingType === 'Revenue').reduce((sum, t) => sum + Number(t.amount || 0), 0))}</td>
                  </tr>
                  <tr className="border-b border-border">
                    <td className="border border-border px-4 py-2">3</td>
                    <td className="border border-border px-4 py-2">Net Profit</td>
                    <td className="border border-border px-4 py-2 text-right">₹{fmt(realPLStatement.summary?.netProfit || 0)}</td>
                    <td className="border border-border px-4 py-2 text-right"></td>
                  </tr>
                  <tr className="border-b border-border">
                    <td className="border border-border px-4 py-2">4</td>
                    <td className="border border-border px-4 py-2">Net Cash Flow</td>
                    <td className="border border-border px-4 py-2 text-right"></td>
                    <td className="border border-border px-4 py-2 text-right">₹{fmt(realCashFlow.summary.netCashFlow)}</td>
                  </tr>
                  <tr className="border-b border-border bg-accent/10">
                    <td className="border border-border px-4 py-2 font-semibold"></td>
                    <td className="border border-border px-4 py-2 font-semibold">Total</td>
                    <td className="border border-border px-4 py-2 text-right font-semibold">₹{fmt(approvedTransactions.filter((t) => t.accountingType === 'Expense').reduce((sum, t) => sum + Number(t.amount || 0), 0) + (realPLStatement.summary?.netProfit || 0))}</td>
                    <td className="border border-border px-4 py-2 text-right font-semibold">₹{fmt(approvedTransactions.filter((t) => t.accountingType === 'Revenue').reduce((sum, t) => sum + Number(t.amount || 0), 0) + realCashFlow.summary.netCashFlow)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        );
      case 'ari':
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold">Additional Regulatory Information</h2>
            <div className="overflow-x-auto rounded-lg border border-border">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="bg-background border-b border-border">
                    <th className="border border-border px-4 py-2 text-left font-semibold">Metric</th>
                    <th className="border border-border px-4 py-2 text-right font-semibold">Value</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-border">
                    <td className="border border-border px-4 py-2">Total Transactions Processed</td>
                    <td className="border border-border px-4 py-2 text-right">{state.transactions.length}</td>
                  </tr>
                  <tr className="border-b border-border">
                    <td className="border border-border px-4 py-2">Approved Transactions</td>
                    <td className="border border-border px-4 py-2 text-right">{approvedTransactions.length}</td>
                  </tr>
                  <tr className="border-b border-border">
                    <td className="border border-border px-4 py-2">Outstanding Receivables</td>
                    <td className="border border-border px-4 py-2 text-right">₹{fmt(receivablesByYear.current)}</td>
                  </tr>
                  <tr className="border-b border-border bg-accent/10">
                    <td className="border border-border px-4 py-2 font-semibold">Current Period Net Profit</td>
                    <td className="border border-border px-4 py-2 text-right font-semibold">₹{fmt(realPLStatement.summary?.netProfit || 0)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        );
      case 'bs-schedule':
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold">Balance Sheet Sub-schedules</h2>
            <div className="overflow-x-auto rounded-lg border border-border">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="bg-background border-b border-border">
                    <th className="border border-border px-4 py-2 text-left font-semibold">Component</th>
                    <th className="border border-border px-4 py-2 text-right font-semibold">{currentYear}</th>
                    <th className="border border-border px-4 py-2 text-right font-semibold">{previousYear}</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-border">
                    <td className="border border-border px-4 py-2">Current Assets</td>
                    <td className="border border-border px-4 py-2 text-right">₹{fmt(realBalanceSheet.assets.current)}</td>
                    <td className="border border-border px-4 py-2 text-right">₹{fmt(realBalanceSheetPreviousYear.assets.current)}</td>
                  </tr>
                  <tr className="border-b border-border">
                    <td className="border border-border px-4 py-2">Fixed Assets</td>
                    <td className="border border-border px-4 py-2 text-right">₹{fmt(realBalanceSheet.assets.fixed)}</td>
                    <td className="border border-border px-4 py-2 text-right">₹{fmt(realBalanceSheetPreviousYear.assets.fixed)}</td>
                  </tr>
                  <tr className="border-b border-border">
                    <td className="border border-border px-4 py-2">Current Liabilities</td>
                    <td className="border border-border px-4 py-2 text-right">₹{fmt(realBalanceSheet.liabilities.current)}</td>
                    <td className="border border-border px-4 py-2 text-right">₹{fmt(realBalanceSheetPreviousYear.liabilities.current)}</td>
                  </tr>
                  <tr className="border-b border-border bg-accent/10">
                    <td className="border border-border px-4 py-2 font-semibold">Equity</td>
                    <td className="border border-border px-4 py-2 text-right font-semibold">₹{fmt(realBalanceSheet.equity.total)}</td>
                    <td className="border border-border px-4 py-2 text-right font-semibold">₹{fmt(realBalanceSheetPreviousYear.equity.total)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        );
      case 'pl-schedule':
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold">P&L Sub-schedules</h2>
            <div className="overflow-x-auto rounded-lg border border-border">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="bg-background border-b border-border">
                    <th className="border border-border px-4 py-2 text-left font-semibold">Component</th>
                    <th className="border border-border px-4 py-2 text-right font-semibold">{currentYear}</th>
                    <th className="border border-border px-4 py-2 text-right font-semibold">{previousYear}</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-border">
                    <td className="border border-border px-4 py-2">Revenue from Operations</td>
                    <td className="border border-border px-4 py-2 text-right">₹{fmt(realPLStatement.summary?.totalRevenue || 0)}</td>
                    <td className="border border-border px-4 py-2 text-right">₹{fmt(realPLPreviousYear.summary?.totalRevenue || 0)}</td>
                  </tr>
                  <tr className="border-b border-border">
                    <td className="border border-border px-4 py-2">COGS</td>
                    <td className="border border-border px-4 py-2 text-right">₹{fmt(realPLStatement.summary?.totalCOGS || 0)}</td>
                    <td className="border border-border px-4 py-2 text-right">₹{fmt(realPLPreviousYear.summary?.totalCOGS || 0)}</td>
                  </tr>
                  <tr className="border-b border-border">
                    <td className="border border-border px-4 py-2">Employee Benefits</td>
                    <td className="border border-border px-4 py-2 text-right">₹{fmt(realPLStatement.summary?.totalEmployeeBenefits || 0)}</td>
                    <td className="border border-border px-4 py-2 text-right">₹{fmt(realPLPreviousYear.summary?.totalEmployeeBenefits || 0)}</td>
                  </tr>
                  <tr className="border-b border-border bg-accent/10">
                    <td className="border border-border px-4 py-2 font-semibold">Net Profit</td>
                    <td className="border border-border px-4 py-2 text-right font-semibold">₹{fmt(realPLStatement.summary?.netProfit || 0)}</td>
                    <td className="border border-border px-4 py-2 text-right font-semibold">₹{fmt(realPLPreviousYear.summary?.netProfit || 0)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        );
      default:
        return <div className="p-8 text-center text-muted-foreground">Content - Coming Soon</div>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-accent/10 rounded-lg">
            <FileText size={28} className="text-accent" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-foreground">Financial Statements</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Automated generation from {state.transactions.length} transactions | Real-time calculations</p>
          </div>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-accent text-accent-foreground rounded-lg hover:bg-accent/90 font-medium">
          <Download size={18} />
          Export
        </button>
      </div>

      {/* Enhanced Tab Navigation */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-2">
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Statement Sheets</h2>
          <div className="text-xs text-muted-foreground">{tabs.length} available</div>
        </div>
        
        <div className="bg-gradient-to-b from-muted/40 to-muted/20 rounded-lg border border-border/50 overflow-x-auto">
          <div className="flex gap-1.5 p-2.5 min-w-max">
            {tabs.map((tab) => {
              const isActive = activeTab === tab.id;
              const isHighlight = tab.color === 'highlight';
              const isPrimary = tab.color === 'primary';
              
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-3.5 py-2 rounded-md text-xs font-medium whitespace-nowrap transition-all duration-200 flex items-center gap-1.5 border ${
                    isActive
                      ? isPrimary
                        ? 'bg-blue-600 text-white shadow-md border-blue-700'
                        : isHighlight
                        ? 'bg-red-600 text-white shadow-md border-red-700'
                        : 'bg-accent text-accent-foreground shadow-md border-accent'
                      : isHighlight
                      ? 'bg-red-50 text-red-700 hover:bg-red-100 border-red-200'
                      : isPrimary
                      ? 'bg-blue-50 text-blue-700 hover:bg-blue-100 border-blue-200'
                      : 'bg-background text-foreground hover:bg-muted border-border'
                  }`}
                >
                  <span className="text-base leading-none">{tab.icon}</span>
                  <span className="hidden sm:inline">{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Tab Content Area */}
      <div className="bg-white border border-border rounded-lg shadow-sm overflow-hidden">
        {/* Content Header with context */}
        <div className="border-b border-border bg-gradient-to-r from-muted/40 to-transparent px-6 py-4">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h3 className="text-lg font-semibold text-foreground">
                {tabs.find(t => t.id === activeTab)?.label}
              </h3>
              <p className="text-xs text-muted-foreground mt-1">
                 {activeTab === 'final-account' ? `Balance Sheet as at ${currentYear}` : 
                  activeTab === 'cash-flow' ? `Cash Flow Statement for year ended ${currentYear}` :
                 activeTab === 'sch-pl' ? 'Profit & Loss Schedule - Automatically calculated' :
                 'Financial statement section - Generated from transaction data'}
              </p>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <div className="px-2.5 py-1.5 bg-accent/10 text-accent rounded-md font-medium">
                {activeTab === 'final-account' ? 'Balance Sheet' : 
                 activeTab === 'cash-flow' ? 'Cash Flow' : 
                 activeTab === 'sch-pl' ? 'P&L Statement' : 
                 'Statement'}
              </div>
              <span className="text-muted-foreground">Rs in 000's</span>
            </div>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-6">
          {renderTabContent()}
        </div>
      </div>
    </div>
  );
}
