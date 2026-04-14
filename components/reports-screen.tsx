'use client';

import { useMemo, useState } from 'react';
import { Download, ChevronRight, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CashOutlookScreen } from '@/components/cash-outlook-screen';
import { BudgetVsActualScreen } from '@/components/budget-vs-actual-screen';
import { useAppState } from '@/context/app-state';

type DateRange = 'month' | 'last-month' | 'quarter' | 'year' | 'custom';

interface ReportCard {
  id: string;
  title: string;
  description: string;
  metrics: Array<{ label: string; value: string | number }>;
}

interface CashFlowDriver {
  description: string;
  amount: number;
  source: 'Bank' | 'Invoice';
}

interface ReceivableInvoice {
  id: string;
  party: string;
  invoiceNo: string;
  dueDate: string;
  amount: number;
  paid: number;
  balance: number;
  status: 'Paid' | 'Partial' | 'Unpaid' | 'Overdue';
}

interface PayableInvoice {
  id: string;
  vendor: string;
  billNo: string;
  dueDate: string;
  amount: number;
  paid: number;
  balance: number;
  status: 'Paid' | 'Partial' | 'Unpaid' | 'Overdue';
}

interface BucketHealthItem {
  id: string;
  name: string;
  type: 'Operating' | 'Reserve' | 'Liability' | 'Owner';
  currentBalance: number;
  monthlyTarget: number;
  gap: number;
  status: 'healthy' | 'attention' | 'critical';
}

interface UnmatchedTransaction {
  id: string;
  date: string;
  description: string;
  amount: number;
  type: 'Revenue' | 'Expense' | 'Liability';
  invoiceMatch: string; // 'Blank' or 'Not linked' or invoice number
  status: 'Needs Info' | 'Action Required' | 'Recorded';
}

export function ReportsScreen() {
  const { state } = useAppState();
  const [dateRange, setDateRange] = useState<DateRange>('year');
  const [selectedReport, setSelectedReport] = useState<string | null>(null);

  const currency = (value: number) => `₹${Math.round(value).toLocaleString('en-IN')}`;

  const inSelectedRange = (rawDate: string) => {
    const date = new Date(rawDate);
    if (Number.isNaN(date.getTime())) return false;
    const now = new Date();

    if (dateRange === 'year') {
      return date.getFullYear() === now.getFullYear();
    }

    if (dateRange === 'quarter') {
      const currentQuarter = Math.floor(now.getMonth() / 3);
      return date.getFullYear() === now.getFullYear() && Math.floor(date.getMonth() / 3) === currentQuarter;
    }

    if (dateRange === 'last-month') {
      const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      return date.getFullYear() === lastMonth.getFullYear() && date.getMonth() === lastMonth.getMonth();
    }

    if (dateRange === 'month') {
      return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth();
    }

    if (dateRange === 'custom') {
      return true;
    }

    return true;
  };

  const scopedTransactions = useMemo(
    () => state.transactions.filter((t) => inSelectedRange(String(t.date ?? ''))),
    [state.transactions, dateRange]
  );

  const scopedInvoices = useMemo(
    () => state.invoices.filter((inv) => inSelectedRange(String(inv.dueDate ?? ''))),
    [state.invoices, dateRange]
  );

  const reportCards: ReportCard[] = useMemo(() => {
    const inflows = scopedTransactions.filter((t) => t.isIncome).reduce((sum, t) => sum + Number(t.amount ?? 0), 0);
    const outflows = scopedTransactions.filter((t) => !t.isIncome).reduce((sum, t) => sum + Number(t.amount ?? 0), 0);

    const receivables = scopedInvoices.filter((inv) => inv.type === 'Revenue');
    const payables = scopedInvoices.filter((inv) => inv.type === 'Expense');

    const receivableOutstanding = receivables.reduce((sum, inv) => sum + Number(inv.balanceDue ?? 0), 0);
    const receivableOverdue = receivables
      .filter((inv) => String(inv.status).toLowerCase() === 'overdue')
      .reduce((sum, inv) => sum + Number(inv.balanceDue ?? 0), 0);

    const payableOutstanding = payables.reduce((sum, inv) => sum + Number(inv.balanceDue ?? 0), 0);
    const payableOverdue = payables
      .filter((inv) => String(inv.status).toLowerCase() === 'overdue')
      .reduce((sum, inv) => sum + Number(inv.balanceDue ?? 0), 0);

    const unmatched = scopedTransactions.filter((t) => !t.invoice || String(t.invoice).trim().length === 0);
    const needsInfo = unmatched.filter((t) => t.status === 'Needs Info').length;
    const actionRequired = unmatched.filter((t) => t.status === 'Action Required').length;

    return [
      {
        id: 'budget-vs-actual',
        title: 'Budget vs Actual',
        description: 'Compare bucket targets against actual spending and balances.',
        metrics: [
          { label: 'Transactions', value: scopedTransactions.length },
          { label: 'Expenses', value: currency(outflows) },
          { label: 'Revenue', value: currency(inflows) },
        ],
      },
      {
        id: 'cash-outlook',
        title: 'Cash Outlook',
        description: 'Directional forecasting for the next 30/60/90 days.',
        metrics: [
          { label: 'Net Flow', value: currency(inflows - outflows) },
          { label: 'At Risk Receivables', value: currency(receivableOverdue) },
          { label: 'Payables Due Soon', value: currency(payableOutstanding) },
        ],
      },
      {
        id: 'cash-flow',
        title: 'Cash Flow Summary',
        description: 'Money in vs money out for the selected period.',
        metrics: [
          { label: 'Inflows', value: currency(inflows) },
          { label: 'Outflows', value: currency(outflows) },
          { label: 'Net Flow', value: currency(inflows - outflows) },
        ],
      },
      {
        id: 'receivables',
        title: 'Receivables',
        description: 'Who needs to pay you, and what is overdue.',
        metrics: [
          { label: 'Total Outstanding', value: currency(receivableOutstanding) },
          { label: 'Overdue', value: currency(receivableOverdue) },
          { label: 'Invoice Count', value: receivables.length },
        ],
      },
      {
        id: 'payables',
        title: 'Payables',
        description: 'What you need to pay vendors, and what is overdue.',
        metrics: [
          { label: 'Total Outstanding', value: currency(payableOutstanding) },
          { label: 'Overdue', value: currency(payableOverdue) },
          { label: 'Invoice Count', value: payables.length },
        ],
      },
      {
        id: 'unmatched',
        title: 'Unmatched Transactions',
        description: 'Transactions waiting to be linked to invoices.',
        metrics: [
          { label: 'Pending', value: unmatched.length },
          { label: 'Needs Info', value: needsInfo },
          { label: 'Action Required', value: actionRequired },
        ],
      },
    ];
  }, [scopedTransactions, scopedInvoices]);

  const dateRangeOptions = [
    { id: 'month', label: 'This Month' },
    { id: 'last-month', label: 'Last Month' },
    { id: 'quarter', label: 'This Quarter' },
    { id: 'year', label: 'This Year' },
    { id: 'custom', label: 'Custom' },
  ];

  if (selectedReport === 'budget-vs-actual') {
    return <BudgetVsActualScreen />;
  }

  if (selectedReport === 'cash-outlook') {
    return <CashOutlookScreen />;
  }

  if (selectedReport === 'cash-flow') {
    const inflows: CashFlowDriver[] = scopedTransactions
      .filter((t) => t.isIncome)
      .slice(0, 10)
      .map((t) => ({
        description: t.description,
        amount: Number(t.amount ?? 0),
        source: t.invoice ? 'Invoice' : 'Bank',
      }));

    const outflows: CashFlowDriver[] = scopedTransactions
      .filter((t) => !t.isIncome)
      .slice(0, 10)
      .map((t) => ({
        description: t.description,
        amount: Number(t.amount ?? 0),
        source: t.invoice ? 'Invoice' : 'Bank',
      }));

    const totalInflow = inflows.reduce((sum, item) => sum + item.amount, 0);
    const totalOutflow = outflows.reduce((sum, item) => sum + item.amount, 0);
    const netCashFlow = totalInflow - totalOutflow;

    return (
      <main className="min-h-screen bg-background text-foreground flex flex-col">
        {/* Header */}
        <div className="pt-8 pb-4 px-6 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSelectedReport(null)}
              className="p-1.5 text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft size={20} />
            </button>
            <h1 className="text-lg font-medium">Cash Flow Summary</h1>
          </div>
          <Button variant="outline" size="sm" className="flex items-center gap-2 bg-transparent">
            <Download size={16} />
            Export
          </Button>
        </div>

        {/* Date Range */}
        <div className="pt-6 px-6 flex items-center gap-2">
          {(['month', 'last-month', 'quarter', 'year', 'custom'] as const).map((range) => (
            <button
              key={range}
              onClick={() => setDateRange(range)}
              className={`px-3 py-1.5 text-xs font-medium rounded transition-colors ${
                dateRange === range
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-muted/70'
              }`}
            >
              {range === 'month' && 'This Month'}
              {range === 'last-month' && 'Last Month'}
              {range === 'quarter' && 'This Quarter'}
              {range === 'year' && 'This Year'}
              {range === 'custom' && 'Custom'}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6 space-y-8">
          {/* Key Numbers */}
          <div className="grid grid-cols-3 gap-4">
            <div className="border border-border rounded-lg p-6 space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Total Inflow</p>
              <p className="text-2xl font-semibold text-accent">₹{totalInflow.toLocaleString()}</p>
            </div>
            <div className="border border-border rounded-lg p-6 space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Total Outflow</p>
              <p className="text-2xl font-semibold text-destructive">₹{totalOutflow.toLocaleString()}</p>
            </div>
            <div className="border border-border rounded-lg p-6 space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Net Cash Flow</p>
              <p className={`text-2xl font-semibold ${netCashFlow >= 0 ? 'text-accent' : 'text-destructive'}`}>
                ₹{netCashFlow.toLocaleString()}
              </p>
            </div>
          </div>

          {/* Top Drivers */}
          <div className="grid grid-cols-2 gap-6">
            {/* Inflows */}
            <div className="space-y-4">
              <h2 className="text-lg font-medium">Top Inflows</h2>
              <div className="border border-border rounded-lg overflow-hidden">
                <div className="grid grid-cols-3 gap-4 px-4 py-2 bg-muted/40 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  <div className="col-span-1">Description</div>
                  <div className="text-right">Amount</div>
                  <div className="text-right">Source</div>
                </div>
                {inflows.map((item, idx) => (
                  <div key={idx} className="grid grid-cols-3 gap-4 px-4 py-3 border-t border-border hover:bg-muted/10 transition-colors items-center">
                    <div className="text-xs text-foreground truncate">{item.description}</div>
                    <div className="text-xs font-medium text-accent text-right">₹{item.amount.toLocaleString()}</div>
                    <div className="text-xs text-muted-foreground text-right">{item.source}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Outflows */}
            <div className="space-y-4">
              <h2 className="text-lg font-medium">Top Outflows</h2>
              <div className="border border-border rounded-lg overflow-hidden">
                <div className="grid grid-cols-3 gap-4 px-4 py-2 bg-muted/40 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  <div className="col-span-1">Description</div>
                  <div className="text-right">Amount</div>
                  <div className="text-right">Source</div>
                </div>
                {outflows.map((item, idx) => (
                  <div key={idx} className="grid grid-cols-3 gap-4 px-4 py-3 border-t border-border hover:bg-muted/10 transition-colors items-center">
                    <div className="text-xs text-foreground truncate">{item.description}</div>
                    <div className="text-xs font-medium text-destructive text-right">₹{item.amount.toLocaleString()}</div>
                    <div className="text-xs text-muted-foreground text-right">{item.source}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Closing Note */}
          <div className="bg-muted/20 border border-border rounded-lg p-6">
            <p className="text-sm text-foreground leading-relaxed">
              Net cash flow improved mainly due to strong client collections and reduced vendor payouts this period. Inflows were driven by two large customer payments and an investment deposit, while outflows remained controlled with salary and software costs as the primary items.
            </p>
          </div>
        </div>
      </main>
    );
  }

  if (selectedReport === 'receivables') {
    const receivables: ReceivableInvoice[] = scopedInvoices
      .filter((inv) => inv.type === 'Revenue')
      .map((inv) => ({
        id: inv.id,
        party: inv.partyName,
        invoiceNo: inv.invoiceNo,
        dueDate: inv.dueDate,
        amount: Number(inv.invoiceAmount ?? 0),
        paid: Number(inv.paidAmount ?? 0),
        balance: Number(inv.balanceDue ?? 0),
        status:
          inv.status === 'Paid'
            ? 'Paid'
            : inv.status === 'Partial' || inv.status === 'Partially Paid'
              ? 'Partial'
              : inv.status === 'Overdue'
                ? 'Overdue'
                : 'Unpaid',
      }));

    const totalOutstanding = receivables.reduce((sum, inv) => sum + inv.balance, 0);
    const overdueAmount = receivables.filter(inv => inv.status === 'Overdue').reduce((sum, inv) => sum + inv.balance, 0);
    const overdueCount = receivables.filter(inv => inv.status === 'Overdue').length;

    return (
      <main className="min-h-screen bg-background text-foreground flex flex-col">
        {/* Header */}
        <div className="pt-8 pb-4 px-6 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSelectedReport(null)}
              className="p-1.5 text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft size={20} />
            </button>
            <h1 className="text-lg font-medium">Receivables</h1>
          </div>
          <Button variant="outline" size="sm" className="flex items-center gap-2 bg-transparent">
            <Download size={16} />
            Export
          </Button>
        </div>

        {/* Date Range */}
        <div className="pt-6 px-6 flex items-center gap-2">
          {(['month', 'last-month', 'quarter', 'year', 'custom'] as const).map((range) => (
            <button
              key={range}
              onClick={() => setDateRange(range)}
              className={`px-3 py-1.5 text-xs font-medium rounded transition-colors ${
                dateRange === range
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-muted/70'
              }`}
            >
              {range === 'month' && 'This Month'}
              {range === 'last-month' && 'Last Month'}
              {range === 'quarter' && 'This Quarter'}
              {range === 'year' && 'This Year'}
              {range === 'custom' && 'Custom'}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6 space-y-6">
          {/* Key Numbers */}
          <div className="grid grid-cols-3 gap-4">
            <div className="border border-border rounded-lg p-6 space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Total Outstanding</p>
              <p className="text-2xl font-semibold text-foreground">₹{totalOutstanding.toLocaleString()}</p>
            </div>
            <div className="border border-border rounded-lg p-6 space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Overdue Amount</p>
              <p className="text-2xl font-semibold text-destructive">₹{overdueAmount.toLocaleString()}</p>
            </div>
            <div className="border border-border rounded-lg p-6 space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Overdue Count</p>
              <p className="text-2xl font-semibold text-destructive">{overdueCount}</p>
            </div>
          </div>

          {/* Receivables Table */}
          <div className="border border-border rounded-lg overflow-hidden">
            {/* Header */}
            <div className="grid grid-cols-7 gap-4 px-6 py-3 bg-muted/40 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              <div>Party</div>
              <div>Invoice No</div>
              <div>Due Date</div>
              <div className="text-right">Amount</div>
              <div className="text-right">Paid</div>
              <div className="text-right">Balance</div>
              <div>Status</div>
            </div>

            {/* Rows */}
            {receivables.map((invoice) => (
              <div
                key={invoice.id}
                onClick={() => {}} // Row click would navigate to invoice detail
                className="grid grid-cols-7 gap-4 px-6 py-3 border-t border-border hover:bg-muted/20 transition-colors cursor-pointer items-center group"
              >
                <div className="text-sm font-medium text-foreground">{invoice.party}</div>
                <div className="text-sm text-foreground">{invoice.invoiceNo}</div>
                <div className="text-sm text-muted-foreground">{invoice.dueDate}</div>
                <div className="text-sm font-medium text-foreground text-right">₹{invoice.amount.toLocaleString()}</div>
                <div className="text-sm text-muted-foreground text-right">₹{invoice.paid.toLocaleString()}</div>
                <div className={`text-sm font-medium text-right ${
                  invoice.status === 'Overdue' 
                    ? 'text-destructive bg-destructive/10 px-2 py-1 rounded' 
                    : invoice.balance > 0 
                      ? 'text-foreground' 
                      : 'text-accent'
                }`}>
                  ₹{invoice.balance.toLocaleString()}
                </div>
                <div className={`text-xs font-medium ${
                  invoice.status === 'Paid' ? 'text-accent' :
                  invoice.status === 'Partial' ? 'text-warning' :
                  invoice.status === 'Overdue' ? 'text-destructive' :
                  'text-muted-foreground'
                }`}>
                  {invoice.status}
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    );
  }

  if (selectedReport === 'payables') {
    const payables: PayableInvoice[] = scopedInvoices
      .filter((inv) => inv.type === 'Expense')
      .map((inv) => ({
        id: inv.id,
        vendor: inv.partyName,
        billNo: inv.invoiceNo,
        dueDate: inv.dueDate,
        amount: Number(inv.invoiceAmount ?? 0),
        paid: Number(inv.paidAmount ?? 0),
        balance: Number(inv.balanceDue ?? 0),
        status:
          inv.status === 'Paid'
            ? 'Paid'
            : inv.status === 'Partial' || inv.status === 'Partially Paid'
              ? 'Partial'
              : inv.status === 'Overdue'
                ? 'Overdue'
                : 'Unpaid',
      }));

    const totalOutstanding = payables.reduce((sum, bill) => sum + bill.balance, 0);
    const overdueAmount = payables.filter(bill => bill.status === 'Overdue').reduce((sum, bill) => sum + bill.balance, 0);
    const now = new Date();
    const next7 = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 7);
    const dueThisWeek = payables
      .filter((bill) => {
        const dueDate = new Date(bill.dueDate);
        return dueDate >= now && dueDate <= next7;
      })
      .reduce((sum, bill) => sum + bill.balance, 0);

    return (
      <main className="min-h-screen bg-background text-foreground flex flex-col">
        {/* Header */}
        <div className="pt-8 pb-4 px-6 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSelectedReport(null)}
              className="p-1.5 text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft size={20} />
            </button>
            <h1 className="text-lg font-medium">Payables</h1>
          </div>
          <Button variant="outline" size="sm" className="flex items-center gap-2 bg-transparent">
            <Download size={16} />
            Export
          </Button>
        </div>

        {/* Date Range */}
        <div className="pt-6 px-6 flex items-center gap-2">
          {(['month', 'last-month', 'quarter', 'year', 'custom'] as const).map((range) => (
            <button
              key={range}
              onClick={() => setDateRange(range)}
              className={`px-3 py-1.5 text-xs font-medium rounded transition-colors ${
                dateRange === range
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-muted/70'
              }`}
            >
              {range === 'month' && 'This Month'}
              {range === 'last-month' && 'Last Month'}
              {range === 'quarter' && 'This Quarter'}
              {range === 'year' && 'This Year'}
              {range === 'custom' && 'Custom'}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6 space-y-6">
          {/* Key Numbers */}
          <div className="grid grid-cols-3 gap-4">
            <div className="border border-border rounded-lg p-6 space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Total Payables Outstanding</p>
              <p className="text-2xl font-semibold text-foreground">₹{totalOutstanding.toLocaleString()}</p>
            </div>
            <div className="border border-border rounded-lg p-6 space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Overdue Amount</p>
              <p className="text-2xl font-semibold text-destructive">₹{overdueAmount.toLocaleString()}</p>
            </div>
            <div className="border border-border rounded-lg p-6 space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Due This Week</p>
              <p className="text-2xl font-semibold text-warning">₹{dueThisWeek.toLocaleString()}</p>
            </div>
          </div>

          {/* Payables Table */}
          <div className="border border-border rounded-lg overflow-hidden">
            {/* Header */}
            <div className="grid grid-cols-7 gap-4 px-6 py-3 bg-muted/40 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              <div>Vendor</div>
              <div>Bill No</div>
              <div>Due Date</div>
              <div className="text-right">Amount</div>
              <div className="text-right">Paid</div>
              <div className="text-right">Balance</div>
              <div>Status</div>
            </div>

            {/* Rows */}
            {payables.map((bill) => (
              <div
                key={bill.id}
                onClick={() => {}}
                className="grid grid-cols-7 gap-4 px-6 py-3 border-t border-border hover:bg-muted/20 transition-colors cursor-pointer items-center group"
              >
                <div className="text-sm font-medium text-foreground">{bill.vendor}</div>
                <div className="text-sm text-foreground">{bill.billNo}</div>
                <div className="text-sm text-muted-foreground">{bill.dueDate}</div>
                <div className="text-sm font-medium text-foreground text-right">₹{bill.amount.toLocaleString()}</div>
                <div className="text-sm text-muted-foreground text-right">₹{bill.paid.toLocaleString()}</div>
                <div className={`text-sm font-medium text-right ${
                  bill.status === 'Overdue' 
                    ? 'text-destructive bg-destructive/10 px-2 py-1 rounded' 
                    : bill.balance > 0 
                      ? 'text-foreground' 
                      : 'text-accent'
                }`}>
                  ₹{bill.balance.toLocaleString()}
                </div>
                <div className={`text-xs font-medium ${
                  bill.status === 'Paid' ? 'text-accent' :
                  bill.status === 'Partial' ? 'text-warning' :
                  bill.status === 'Overdue' ? 'text-destructive' :
                  'text-muted-foreground'
                }`}>
                  {bill.status}
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    );
  }

  if (selectedReport === 'bucket-health') {
    const buckets: BucketHealthItem[] = [
      { id: '1', name: 'Operations', type: 'Operating', currentBalance: 145000, monthlyTarget: 80000, gap: -65000, status: 'healthy' },
      { id: '2', name: 'Emergency Reserve', type: 'Reserve', currentBalance: 245000, monthlyTarget: 250000, gap: 5000, status: 'attention' },
      { id: '3', name: 'Tax Liability', type: 'Liability', currentBalance: 67500, monthlyTarget: 85000, gap: 17500, status: 'critical' },
      { id: '4', name: 'Owner Distributions', type: 'Owner', currentBalance: 95000, monthlyTarget: 50000, gap: -45000, status: 'healthy' },
    ];

    const healthyCount = buckets.filter(b => b.status === 'healthy').length;
    const attentionCount = buckets.filter(b => b.status === 'attention').length;
    const criticalCount = buckets.filter(b => b.status === 'critical').length;

    return (
      <main className="min-h-screen bg-background text-foreground flex flex-col">
        {/* Header */}
        <div className="pt-8 pb-4 px-6 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSelectedReport(null)}
              className="p-1.5 text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft size={20} />
            </button>
            <h1 className="text-lg font-medium">Bucket Health</h1>
          </div>
          <Button variant="outline" size="sm" className="flex items-center gap-2 bg-transparent">
            <Download size={16} />
            Export
          </Button>
        </div>

        {/* Date Range */}
        <div className="pt-6 px-6 flex items-center gap-2">
          {(['month', 'last-month', 'quarter', 'year', 'custom'] as const).map((range) => (
            <button
              key={range}
              onClick={() => setDateRange(range)}
              className={`px-3 py-1.5 text-xs font-medium rounded transition-colors ${
                dateRange === range
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-muted/70'
              }`}
            >
              {range === 'month' && 'This Month'}
              {range === 'last-month' && 'Last Month'}
              {range === 'quarter' && 'This Quarter'}
              {range === 'year' && 'This Year'}
              {range === 'custom' && 'Custom'}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6 space-y-6">
          {/* Key Numbers */}
          <div className="grid grid-cols-3 gap-4">
            <div className="border border-border rounded-lg p-6 space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Healthy Buckets</p>
              <p className="text-2xl font-semibold text-accent">{healthyCount}</p>
            </div>
            <div className="border border-border rounded-lg p-6 space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Needs Attention</p>
              <p className="text-2xl font-semibold text-warning">{attentionCount}</p>
            </div>
            <div className="border border-border rounded-lg p-6 space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Critical Shortfall</p>
              <p className="text-2xl font-semibold text-destructive">{criticalCount}</p>
            </div>
          </div>

          {/* Bucket Health Table */}
          <div className="border border-border rounded-lg overflow-hidden">
            {/* Header */}
            <div className="grid grid-cols-6 gap-4 px-6 py-3 bg-muted/40 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              <div>Bucket Name</div>
              <div>Type</div>
              <div className="text-right">Current Balance</div>
              <div className="text-right">Monthly Target</div>
              <div className="text-right">Gap</div>
              <div>Status</div>
            </div>

            {/* Rows */}
            {buckets.map((bucket) => (
              <div
                key={bucket.id}
                onClick={() => {}}
                className="grid grid-cols-6 gap-4 px-6 py-3 border-t border-border hover:bg-muted/20 transition-colors cursor-pointer items-center group"
              >
                <div className="text-sm font-medium text-foreground">{bucket.name}</div>
                <div className="text-sm text-muted-foreground">{bucket.type}</div>
                <div className="text-sm font-medium text-foreground text-right">₹{bucket.currentBalance.toLocaleString()}</div>
                <div className="text-sm text-muted-foreground text-right">₹{bucket.monthlyTarget.toLocaleString()}</div>
                <div className={`text-sm font-medium text-right ${
                  bucket.status === 'critical' 
                    ? 'text-destructive bg-destructive/10 px-2 py-1 rounded' 
                    : 'text-foreground'
                }`}>
                  ₹{Math.abs(bucket.gap).toLocaleString()}
                </div>
                <div className={`text-xs font-medium ${
                  bucket.status === 'healthy' ? 'text-accent' :
                  bucket.status === 'attention' ? 'text-warning' :
                  'text-destructive'
                }`}>
                  {bucket.status === 'healthy' && 'Healthy'}
                  {bucket.status === 'attention' && 'Attention'}
                  {bucket.status === 'critical' && 'Critical'}
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    );
  }

  if (selectedReport === 'unmatched') {
    const unmatchedTransactions: UnmatchedTransaction[] = scopedTransactions
      .filter((t) => !t.invoice || String(t.invoice).trim().length === 0)
      .slice(0, 50)
      .map((t) => ({
        id: t.id,
        date: t.date,
        description: t.description,
        amount: Number(t.amount ?? 0),
        type: t.accountingType === 'Asset' ? 'Expense' : t.accountingType,
        invoiceMatch: 'Not linked',
        status: (t.status === 'Needs Info' || t.status === 'Action Required' ? t.status : 'Recorded') as UnmatchedTransaction['status'],
      }));

    const needsInfoCount = unmatchedTransactions.filter(t => t.status === 'Needs Info').length;
    const actionRequiredCount = unmatchedTransactions.filter(t => t.status === 'Action Required').length;
    const totalPending = unmatchedTransactions.filter(t => t.status !== 'Recorded').length;

    return (
      <main className="min-h-screen bg-background text-foreground flex flex-col">
        {/* Header */}
        <div className="pt-8 pb-4 px-6 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSelectedReport(null)}
              className="p-1.5 text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft size={20} />
            </button>
            <h1 className="text-lg font-medium">Unmatched Transactions</h1>
          </div>
          <Button variant="outline" size="sm" className="flex items-center gap-2 bg-transparent">
            <Download size={16} />
            Export
          </Button>
        </div>

        {/* Date Range */}
        <div className="pt-6 px-6 flex items-center gap-2">
          {(['month', 'last-month', 'quarter', 'year', 'custom'] as const).map((range) => (
            <button
              key={range}
              onClick={() => setDateRange(range)}
              className={`px-3 py-1.5 text-xs font-medium rounded transition-colors ${
                dateRange === range
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-muted/70'
              }`}
            >
              {range === 'month' && 'This Month'}
              {range === 'last-month' && 'Last Month'}
              {range === 'quarter' && 'This Quarter'}
              {range === 'year' && 'This Year'}
              {range === 'custom' && 'Custom'}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6 space-y-6">
          {/* Key Numbers */}
          <div className="grid grid-cols-3 gap-4">
            <div className="border border-border rounded-lg p-6 space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Total Pending</p>
              <p className="text-2xl font-semibold text-foreground">{totalPending}</p>
            </div>
            <div className="border border-border rounded-lg p-6 space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Needs Info</p>
              <p className="text-2xl font-semibold text-warning">{needsInfoCount}</p>
            </div>
            <div className="border border-border rounded-lg p-6 space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Action Required</p>
              <p className="text-2xl font-semibold text-destructive">{actionRequiredCount}</p>
            </div>
          </div>

          {/* Unmatched Transactions Table */}
          <div className="border border-border rounded-lg overflow-hidden">
            {/* Header */}
            <div className="grid grid-cols-7 gap-4 px-6 py-3 bg-muted/40 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              <div>Date</div>
              <div>Description</div>
              <div className="text-right">Amount</div>
              <div>Type</div>
              <div>Invoice Match</div>
              <div>Status</div>
              <div></div>
            </div>

            {/* Rows */}
            {unmatchedTransactions.map((txn) => (
              <div
                key={txn.id}
                onClick={() => {}}
                className="grid grid-cols-7 gap-4 px-6 py-3 border-t border-border hover:bg-muted/20 transition-colors cursor-pointer items-center group"
              >
                <div className="text-sm text-foreground">{txn.date}</div>
                <div className="text-sm font-medium text-foreground truncate">{txn.description}</div>
                <div className="text-sm font-medium text-foreground text-right">₹{txn.amount.toLocaleString()}</div>
                <div className="text-sm text-muted-foreground">{txn.type}</div>
                <div className="text-sm text-muted-foreground">{txn.invoiceMatch || '—'}</div>
                <div className={`text-xs font-medium ${
                  txn.status === 'Recorded' ? 'text-accent' :
                  txn.status === 'Needs Info' ? 'text-warning' :
                  'text-destructive'
                }`}>
                  {txn.status}
                </div>
                <div className="text-muted-foreground group-hover:text-foreground transition-colors">
                  <ChevronRight size={16} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Header Section */}
      <div className="pt-8 pb-6 px-6 border-b border-border">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-2xl font-medium text-foreground mb-1">Reports</h1>
            <p className="text-sm text-muted-foreground">Clarity without spreadsheets</p>
          </div>
          <Button
            variant="outline"
            className="flex items-center gap-2 bg-transparent"
          >
            <Download size={16} />
            Export
          </Button>
        </div>

        {/* Date Range Control */}
        <div className="flex items-center gap-2">
          {dateRangeOptions.map((option) => (
            <button
              key={option.id}
              onClick={() => setDateRange(option.id as DateRange)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                dateRange === option.id
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-muted/70'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {/* Report Cards Grid */}
      <div className="flex-1 overflow-auto p-6">
        <div className="grid grid-cols-2 gap-6">
          {reportCards.map((card) => (
            <div
              key={card.id}
              onClick={() => setSelectedReport(card.id)}
              className="border border-border rounded-lg p-6 hover:shadow-md transition-all duration-200 cursor-pointer group bg-card hover:bg-card/95"
            >
              {/* Report Title and Description */}
              <div className="mb-6">
                <h2 className="text-lg font-medium text-foreground mb-1">{card.title}</h2>
                <p className="text-xs text-muted-foreground">{card.description}</p>
              </div>

              {/* Metrics Display */}
              <div className="space-y-3 mb-6">
                {card.metrics.map((metric, idx) => (
                  <div key={idx} className="flex items-baseline justify-between">
                    <span className="text-xs text-muted-foreground">{metric.label}</span>
                    <span className="text-sm font-semibold text-foreground">{metric.value}</span>
                  </div>
                ))}
              </div>

              {/* CTA Button */}
              <button className="flex items-center gap-2 text-xs font-medium text-primary hover:text-primary/80 transition-colors group-hover:gap-3">
                Open
                <ChevronRight size={14} className="transition-transform" />
              </button>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
