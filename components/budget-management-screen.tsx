'use client';

import { useCallback, useEffect, useState } from 'react';
import { Plus, Edit2, Trash2, AlertTriangle, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { getSupabaseClient } from '@/lib/supabase/client';

interface Budget {
  id: string;
  category: string;
  budgetAmount: number;
  spentAmount: number;
  period: 'Monthly' | 'Quarterly' | 'Annually';
  alertThreshold: number; // percentage
  status: 'On Track' | 'Warning' | 'Exceeded';
  lastUpdated: string;
  notes?: string;
}

async function getAccessToken(): Promise<string | null> {
  const supabase = getSupabaseClient();
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}

export function BudgetManagementScreen() {
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<Budget>>({
    period: 'Monthly',
    alertThreshold: 80,
  });

  const totalBudget = budgets.reduce((sum, b) => sum + Number(b.budgetAmount || 0), 0);
  const totalSpent = budgets.reduce((sum, b) => sum + Number(b.spentAmount || 0), 0);
  const totalRemaining = totalBudget - totalSpent;
  const overallPercentage = totalBudget > 0 ? Math.round((totalSpent / totalBudget) * 100) : 0;

  const warningBudgets = budgets.filter((b) => b.status !== 'On Track');
  const exceededBudgets = budgets.filter((b) => b.status === 'Exceeded');

  const loadBudgets = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const accessToken = await getAccessToken();
      const headers: HeadersInit = accessToken ? { Authorization: `Bearer ${accessToken}` } : {};
      const response = await fetch('/api/budgets', { method: 'GET', headers, cache: 'no-store' });
      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(payload.error ?? 'Failed to load budgets');
      }

      const mappedBudgets: Budget[] = (payload.budgets ?? []).map((row: any) => {
        const budgetAmount = Number(row.budgetAmount ?? 0);
        const spentAmount = Number(row.spentAmount ?? 0);
        const alertThreshold = Number(row.alertThreshold ?? 80);
        const ratio = budgetAmount > 0 ? spentAmount / budgetAmount : 0;
        const status: Budget['status'] = ratio >= 1 ? 'Exceeded' : ratio >= alertThreshold / 100 ? 'Warning' : 'On Track';

        return {
          id: String(row.id),
          category: row.category ?? '',
          budgetAmount,
          spentAmount,
          period: row.period === 'Quarterly' || row.period === 'Annually' ? row.period : 'Monthly',
          alertThreshold,
          status,
          lastUpdated: row.lastUpdated
            ? new Date(row.lastUpdated).toLocaleDateString('en-GB', { month: 'short', day: 'numeric' })
            : '-',
          notes: row.notes ?? undefined,
        };
      });

      setBudgets(mappedBudgets);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to load budgets');
      setBudgets([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadBudgets();
  }, [loadBudgets]);

  const handleSave = async () => {
    if (!formData.category || !formData.budgetAmount) return;

    setIsSaving(true);
    setErrorMessage(null);

    try {
      const accessToken = await getAccessToken();
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      };

      const requestBody = {
        ...(editingId ? { id: editingId } : {}),
        category: formData.category,
        budgetAmount: Number(formData.budgetAmount ?? 0),
        spentAmount: Number(formData.spentAmount ?? 0),
        period: formData.period ?? 'Monthly',
        alertThreshold: Number(formData.alertThreshold ?? 80),
        notes: formData.notes ?? '',
      };

      const response = await fetch('/api/budgets', {
        method: editingId ? 'PATCH' : 'POST',
        headers,
        body: JSON.stringify(requestBody),
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload.error ?? 'Failed to save budget');
      }

      await loadBudgets();
      setFormData({ period: 'Monthly', alertThreshold: 80 });
      setShowForm(false);
      setEditingId(null);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to save budget');
    } finally {
      setIsSaving(false);
    }
  };

  const handleEdit = (budget: Budget) => {
    setFormData(budget);
    setEditingId(budget.id);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    setErrorMessage(null);
    try {
      const accessToken = await getAccessToken();
      const headers: HeadersInit = accessToken ? { Authorization: `Bearer ${accessToken}` } : {};
      const response = await fetch(`/api/budgets?id=${id}`, { method: 'DELETE', headers });
      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(payload.error ?? 'Failed to delete budget');
      }

      setDeleteConfirmId(null);
      await loadBudgets();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to delete budget');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'On Track':
        return 'bg-green-500/10 text-green-700 border-green-200';
      case 'Warning':
        return 'bg-yellow-500/10 text-yellow-700 border-yellow-200';
      case 'Exceeded':
        return 'bg-red-500/10 text-red-700 border-red-200';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="max-w-7xl mx-auto px-8 py-12">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-semibold text-foreground mb-2">Budget Management</h1>
          <p className="text-sm text-muted-foreground">Set limits and track spending by category</p>
        </div>

        {errorMessage && (
          <Card className="mb-6 border-red-300 bg-red-50 p-3 text-sm text-red-700">
            {errorMessage}
          </Card>
        )}

        {/* Overview Cards */}
        <div className="grid grid-cols-4 gap-4 mb-8">
          <Card className="p-4">
            <div className="text-xs text-muted-foreground font-medium mb-2">Total Budget</div>
            <div className="text-2xl font-semibold text-foreground">₹{totalBudget.toLocaleString()}</div>
          </Card>
          <Card className="p-4">
            <div className="text-xs text-muted-foreground font-medium mb-2">Total Spent</div>
            <div className="text-2xl font-semibold text-foreground">₹{totalSpent.toLocaleString()}</div>
          </Card>
          <Card className="p-4">
            <div className="text-xs text-muted-foreground font-medium mb-2">Remaining</div>
            <div className={`text-2xl font-semibold ${totalRemaining >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              ₹{totalRemaining.toLocaleString()}
            </div>
          </Card>
          <Card className="p-4">
            <div className="text-xs text-muted-foreground font-medium mb-2">Utilization</div>
            <div className="text-2xl font-semibold text-foreground">{overallPercentage}%</div>
          </Card>
        </div>

        {/* Alerts */}
        {(warningBudgets.length > 0 || exceededBudgets.length > 0) && (
          <Card className="mb-8 p-4 border-orange-200 bg-orange-500/5">
            <div className="flex items-start gap-3">
              <AlertTriangle size={20} className="text-orange-600 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-orange-900 mb-1">Budget Alerts</h3>
                <div className="space-y-1 text-sm text-orange-800">
                  {exceededBudgets.map((b) => (
                    <p key={b.id}>
                      {b.category} is exceeded by ₹{(b.spentAmount - b.budgetAmount).toLocaleString()}
                    </p>
                  ))}
                  {warningBudgets.filter((b) => b.status === 'Warning').map((b) => (
                    <p key={b.id}>
                      {b.category} at {Math.round((b.spentAmount / b.budgetAmount) * 100)}% of budget
                    </p>
                  ))}
                </div>
              </div>
            </div>
          </Card>
        )}

        {/* Controls */}
        <div className="flex justify-end mb-6">
          <Button
            onClick={() => {
              setFormData({ period: 'Monthly', alertThreshold: 80 });
              setEditingId(null);
              setShowForm(true);
            }}
            className="flex items-center gap-2"
          >
            <Plus size={16} />
            Create Budget
          </Button>
        </div>

        {/* Budgets Grid */}
        <div className="grid grid-cols-1 gap-4">
          {isLoading && (
            <Card className="p-4 text-sm text-muted-foreground">Loading budgets...</Card>
          )}
          {!isLoading && budgets.length === 0 && (
            <Card className="p-4 text-sm text-muted-foreground">No budgets found. Create your first budget.</Card>
          )}
          {budgets.map((budget) => {
            const percentage = (budget.spentAmount / budget.budgetAmount) * 100;
            const remaining = budget.budgetAmount - budget.spentAmount;

            return (
              <Card
                key={budget.id}
                className={`p-4 border ${getStatusColor(budget.status)}`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-semibold text-foreground">{budget.category}</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {budget.period} • Alert at {budget.alertThreshold}%
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleEdit(budget)}
                      className="p-1 text-muted-foreground hover:text-foreground transition-colors"
                      title="Edit"
                    >
                      <Edit2 size={16} />
                    </button>
                    <button
                      onClick={() => setDeleteConfirmId(budget.id)}
                      className="p-1 text-muted-foreground hover:text-red-500 transition-colors"
                      title="Delete"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="mb-3">
                  <div className="flex items-end justify-between mb-2">
                    <div className="text-sm font-semibold text-foreground">
                      ₹{budget.spentAmount.toLocaleString()}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      ₹{budget.budgetAmount.toLocaleString()} budget
                    </div>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                    <div
                      className={`h-full transition-all ${
                        budget.status === 'Exceeded'
                          ? 'bg-red-500'
                          : budget.status === 'Warning'
                            ? 'bg-yellow-500'
                            : 'bg-green-500'
                      }`}
                      style={{ width: `${Math.min(percentage, 100)}%` }}
                    />
                  </div>
                  {percentage > 100 && (
                    <p className="text-xs text-red-600 mt-1 font-medium">
                      Over by ₹{(budget.spentAmount - budget.budgetAmount).toLocaleString()}
                    </p>
                  )}
                </div>

                {/* Details Row */}
                <div className="flex items-center justify-between">
                  <div className="text-xs text-muted-foreground">
                    {percentage > 0 && Math.round(percentage)}% utilization
                  </div>
                  <div className="text-xs font-medium text-foreground">
                    {remaining > 0 ? (
                      <span className="text-green-600">₹{remaining.toLocaleString()} remaining</span>
                    ) : (
                      <span className="text-red-600">₹{Math.abs(remaining).toLocaleString()} over</span>
                    )}
                  </div>
                </div>

                {budget.notes && (
                  <p className="text-xs text-muted-foreground mt-2 italic">Note: {budget.notes}</p>
                )}
              </Card>
            );
          })}
        </div>
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-foreground">
                {editingId ? 'Edit Budget' : 'Create Budget_test'}
              </h2>
              <button
                onClick={() => {
                  setShowForm(false);
                  setEditingId(null);
                }}
                className="p-1 text-muted-foreground hover:text-foreground"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Category</label>
                <input
                  type="text"
                  value={formData.category || ''}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full px-3 py-2 bg-muted border border-border rounded text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent"
                  placeholder="e.g., Salaries, Marketing"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">Budget Amount</label>
                  <input
                    type="number"
                    value={formData.budgetAmount || ''}
                    onChange={(e) => setFormData({ ...formData, budgetAmount: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-muted border border-border rounded text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent"
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">Current Spent</label>
                  <input
                    type="number"
                    value={formData.spentAmount || ''}
                    onChange={(e) => setFormData({ ...formData, spentAmount: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-muted border border-border rounded text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent"
                    placeholder="0"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">Period</label>
                  <select
                    value={formData.period || 'Monthly'}
                    onChange={(e) => setFormData({ ...formData, period: e.target.value as any })}
                    className="w-full px-3 py-2 bg-muted border border-border rounded text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
                  >
                    <option>Monthly</option>
                    <option>Quarterly</option>
                    <option>Annually</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">Alert at (%)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={formData.alertThreshold || ''}
                    onChange={(e) => setFormData({ ...formData, alertThreshold: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-muted border border-border rounded text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent"
                    placeholder="80"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Notes (Optional)</label>
                <textarea
                  value={formData.notes || ''}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-3 py-2 bg-muted border border-border rounded text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent resize-none"
                  rows={2}
                  placeholder="Add any notes..."
                />
              </div>
            </div>

            <div className="flex gap-3 justify-end">
              <button
                onClick={() => {
                  setShowForm(false);
                  setEditingId(null);
                }}
                className="px-4 py-2 bg-muted text-muted-foreground rounded hover:bg-muted/70 transition-colors text-sm font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="px-4 py-2 bg-accent text-accent-foreground rounded hover:bg-accent/90 transition-colors text-sm font-medium disabled:opacity-50"
                disabled={isSaving || !formData.category || !formData.budgetAmount}
              >
                {isSaving ? 'Saving...' : editingId ? 'Update Budget' : 'Create BUdet_test'}
              </button>
            </div>
          </Card>
        </div>
      )}

      {/* Delete Confirmation */}
      {deleteConfirmId && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-sm p-6">
            <h2 className="text-lg font-semibold text-foreground mb-3">Delete Budget?</h2>
            <p className="text-sm text-muted-foreground mb-6">This will remove the budget but keep historical data.</p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="px-4 py-2 bg-muted text-muted-foreground rounded hover:bg-muted/70 transition-colors text-sm font-medium"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteConfirmId)}
                className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition-colors text-sm font-medium"
              >
                Delete
              </button>
            </div>
          </Card>
        </div>
      )}
    </main>
  );
}
