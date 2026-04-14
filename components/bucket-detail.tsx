'use client';

import { useMemo } from 'react';
import { ArrowLeft } from 'lucide-react';
import { useAppState } from '@/context/app-state';

interface Transaction {
  date: string;
  description: string;
  amount: number;
  source: 'Bank' | 'Invoice';
}

interface Bucket {
  id: string;
  name: string;
  type: 'Operating' | 'Reserve' | 'Liability' | 'Owner';
  currentBalance: number;
  monthlyTarget?: number;
  status: 'healthy' | 'attention' | 'critical';
}

interface BucketDetailProps {
  bucket: Bucket;
  onBack: () => void;
}

export function BucketDetail({ bucket, onBack }: BucketDetailProps) {
  const { state } = useAppState();

  const bucketTransactions = useMemo(() => {
    return state.transactions
      .filter((txn) => String((txn as any).bucketId ?? (txn as any).bucket_id ?? '') === bucket.id)
      .sort((left, right) => new Date(right.date).getTime() - new Date(left.date).getTime())
      .slice(0, 12)
      .map<Transaction>((txn) => ({
        date: new Date(txn.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
        description: txn.description,
        amount: Number(txn.amount ?? 0),
        source: txn.invoice ? 'Invoice' : 'Bank',
      }));
  }, [bucket.id, state.transactions]);

  const allocationExplanation = useMemo(() => {
    const linked = state.transactions.filter(
      (txn) => String((txn as any).bucketId ?? (txn as any).bucket_id ?? '') === bucket.id
    );

    if (linked.length === 0) {
      return 'No transactions are linked to this bucket yet.';
    }

    const subtypeCounts = new Map<string, number>();
    for (const transaction of linked) {
      const key = transaction.subtype || transaction.accountingType;
      subtypeCounts.set(key, (subtypeCounts.get(key) || 0) + 1);
    }

    const topSubtypes = Array.from(subtypeCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([name]) => name);

    return `This bucket currently receives ${linked.length} linked transaction${linked.length === 1 ? '' : 's'}, mainly from ${topSubtypes.join(', ')}.`;
  }, [bucket.id, state.transactions]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'text-accent';
      case 'attention':
        return 'text-warning';
      case 'critical':
        return 'text-destructive';
      default:
        return 'text-muted-foreground';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'Healthy';
      case 'attention':
        return 'Attention';
      case 'critical':
        return 'Critical';
      default:
        return status;
    }
  };

  return (
    <main className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <div className="pt-8 pb-4 px-6 border-b border-border flex items-center gap-3">
        <button
          onClick={onBack}
          className="p-1.5 text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft size={20} />
        </button>
        <p className="text-muted-foreground text-sm">Financial explanation</p>
      </div>

      {/* Two-Column Layout */}
      <div className="pt-8 pb-12 px-6">
        <div className="grid grid-cols-3 gap-12 max-w-7xl">
          {/* LEFT COLUMN - Bucket Summary */}
          <div className="col-span-1 space-y-8">
            {/* Bucket Name */}
            <div>
              <h1 className="text-3xl font-bold text-foreground">{bucket.name}</h1>
            </div>

            {/* Type */}
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                Type
              </p>
              <p className="text-sm text-foreground">{bucket.type}</p>
            </div>

            {/* Current Balance - Prominent */}
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                Current Balance
              </p>
              <p className="text-4xl font-bold text-primary">₹{bucket.currentBalance.toLocaleString()}</p>
            </div>

            {/* Monthly Target */}
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                Monthly Target
              </p>
              <p className="text-sm text-foreground">₹{Number(bucket.monthlyTarget ?? 0).toLocaleString()}</p>
            </div>

            {/* Status */}
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                Status
              </p>
              <p className={`text-sm font-medium ${getStatusColor(bucket.status)}`}>
                {getStatusLabel(bucket.status)}
              </p>
            </div>

            {/* Allocation Rule */}
            <div className="border-t border-border pt-8">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                Why This Bucket Exists
              </p>
              <p className="text-sm text-foreground leading-relaxed">{allocationExplanation}</p>
            </div>
          </div>

          {/* RIGHT COLUMN - Assigned Transactions */}
          <div className="col-span-2">
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">
                Transactions Contributing to This Bucket
              </p>

              {/* Transaction Table */}
              <div className="border border-border rounded-lg overflow-hidden">
                {/* Headers */}
                <div className="bg-muted/30 px-4 py-3 flex items-center gap-4 border-b border-border text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  <div className="w-20 flex-shrink-0">Date</div>
                  <div className="flex-1 min-w-0">Description</div>
                  <div className="w-28 flex-shrink-0 text-right">Amount</div>
                  <div className="w-20 flex-shrink-0">Source</div>
                </div>

                {/* Rows */}
                {bucketTransactions.length === 0 && (
                  <div className="px-4 py-6 text-sm text-muted-foreground">
                    No transactions are currently linked to this bucket.
                  </div>
                )}

                {bucketTransactions.map((txn, idx) => (
                  <div
                    key={idx}
                    className="px-4 py-3 flex items-center gap-4 border-b border-border last:border-b-0 hover:bg-muted/20 transition-colors"
                  >
                    <div className="w-20 flex-shrink-0">
                      <p className="text-sm text-muted-foreground">{txn.date}</p>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-foreground truncate">{txn.description}</p>
                    </div>
                    <div className="w-28 flex-shrink-0 text-right">
                      <p className="text-sm font-medium text-foreground">₹{txn.amount.toLocaleString()}</p>
                    </div>
                    <div className="w-20 flex-shrink-0">
                      <p className="text-xs text-muted-foreground">{txn.source}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* View in Inbox Link */}
              <div className="mt-6">
                <p className="text-sm text-muted-foreground">Showing the latest linked transactions for this bucket.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
