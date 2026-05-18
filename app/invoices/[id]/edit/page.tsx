'use client';

import { useAppState } from '@/context/app-state';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Save } from 'lucide-react';

export default function InvoiceEditPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { state } = useAppState();
  const invoice = state.invoices.find(inv => inv.id === params.id);

  const [formData, setFormData] = useState(
    invoice || {
      invoiceNo: '',
      partyName: '',
      type: 'Revenue' as const,
      invoiceAmount: 0,
      paidAmount: 0,
      balanceDue: 0,
      dueDate: '',
      status: 'Unpaid' as const,
    }
  );

  const [isSaving, setIsSaving] = useState(false);

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // Call API to update invoice
      const response = await fetch(`/api/invoices/${params.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        router.back();
      } else {
        alert('Failed to save invoice');
      }
    } catch (error) {
      console.error('Error saving invoice:', error);
      alert('Error saving invoice');
    } finally {
      setIsSaving(false);
    }
  };

  if (!invoice) {
    return (
      <div className="p-6">
        <p className="text-slate-600">Invoice not found</p>
        <Button onClick={() => router.back()} className="mt-4">Back</Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.back()}
            className="hover:bg-slate-200"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-3xl font-bold text-slate-900">Edit Invoice {invoice.invoiceNo}</h1>
        </div>

        {/* Edit Form */}
        <Card className="p-8 bg-white shadow-lg space-y-6">
          <div className="grid grid-cols-2 gap-6">
            {/* Invoice Number */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Invoice Number</label>
              <Input
                type="text"
                value={formData.invoiceNo}
                onChange={e => handleInputChange('invoiceNo', e.target.value)}
                disabled
                className="bg-slate-100"
              />
            </div>

            {/* Party Name */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Party Name</label>
              <Input
                type="text"
                value={formData.partyName}
                onChange={e => handleInputChange('partyName', e.target.value)}
                placeholder="Enter party name"
              />
            </div>

            {/* Invoice Amount */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Invoice Amount (₹)</label>
              <Input
                type="number"
                value={formData.invoiceAmount}
                onChange={e => handleInputChange('invoiceAmount', parseFloat(e.target.value))}
                placeholder="Enter amount"
              />
            </div>

            {/* Paid Amount */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Paid Amount (₹)</label>
              <Input
                type="number"
                value={formData.paidAmount}
                onChange={e => handleInputChange('paidAmount', parseFloat(e.target.value))}
                placeholder="Enter paid amount"
              />
            </div>

            {/* Due Date */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Due Date</label>
              <Input
                type="date"
                value={formData.dueDate}
                onChange={e => handleInputChange('dueDate', e.target.value)}
              />
            </div>

            {/* Status */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Status</label>
              <select
                value={formData.status}
                onChange={e => handleInputChange('status', e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="Paid">Paid</option>
                <option value="Partial">Partial</option>
                <option value="Unpaid">Unpaid</option>
                <option value="Overdue">Overdue</option>
              </select>
            </div>

            {/* Type */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Invoice Type</label>
              <select
                value={formData.type}
                onChange={e => handleInputChange('type', e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="Revenue">Revenue</option>
                <option value="Expense">Expense</option>
              </select>
            </div>

            {/* Balance Due (Read-only) */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Balance Due (₹)</label>
              <Input
                type="number"
                value={formData.invoiceAmount - formData.paidAmount}
                disabled
                className="bg-slate-100"
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4 border-t border-slate-200">
            <Button
              variant="outline"
              onClick={() => router.back()}
              className="px-6"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={isSaving}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 px-6"
            >
              <Save className="w-4 h-4" />
              {isSaving ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
