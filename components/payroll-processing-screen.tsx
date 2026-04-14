'use client';

import { useEffect, useMemo, useState } from 'react';
import { FileText, Play, Download, CheckCircle, Clock, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getSupabaseClient } from '@/lib/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface PayrollRun {
  id: string;
  payrollMonth: string;
  payrollDate: string;
  totalEmployees: number;
  processedEmployees: number;
  totalGross: number;
  totalDeductions: number;
  totalNet: number;
  status: 'DRAFT' | 'APPROVED' | 'PROCESSED' | 'REJECTED';
  approvedBy?: string;
  approvalDate?: string;
  processedDate?: string;
  paidDate?: string;
  payrollDetails: PayrollRunDetail[];
}

interface PayrollRunDetail {
  entryId: string;
  employeeId: string;
  employeeName: string;
  grossSalary: number;
  totalDeductions: number;
  netSalary: number;
  transferStatus: 'Pending' | 'Processed' | 'Cancelled';
  transferDate?: string;
}

interface PayrollRegisterEntry {
  id: string;
  employeeId: string;
  employeeName: string;
  payrollMonth: string;
  grossSalary: number;
  totalDeductions: number;
  netSalary: number;
  transferStatus: 'Pending' | 'Processed' | 'Cancelled';
  transferDate?: string;
}

type PayrollRegisterApiRow = {
  id: string;
  employee_code: string;
  employee_name: string;
  payroll_month: string;
  gross_salary: number;
  total_deductions: number;
  net_salary: number;
  transfer_status: 'Pending' | 'Processed' | 'Cancelled';
  transfer_date?: string | null;
};

type PayrollRunApiRow = {
  id: string;
  payroll_month: string;
  payroll_date: string;
  status: PayrollRun['status'];
  total_employees: number;
  processed_employees: number;
  total_gross: number;
  total_deductions: number;
  total_net: number;
  approved_by?: string | null;
  approval_date?: string | null;
  processed_date?: string | null;
  paid_date?: string | null;
};

async function getAccessToken(): Promise<string | null> {
  const supabase = getSupabaseClient();
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}

export function PayrollProcessingScreen() {
  const [payrollRuns, setPayrollRuns] = useState<PayrollRun[]>([]);
  const [registerEntries, setRegisterEntries] = useState<PayrollRegisterEntry[]>([]);
  const [selectedEntryIds, setSelectedEntryIds] = useState<string[]>([]);
  const [processingError, setProcessingError] = useState<string | null>(null);
  const [processingWarning, setProcessingWarning] = useState<string | null>(null);

  const [showProcessModal, setShowProcessModal] = useState(false);
  const [showRunDetailModal, setShowRunDetailModal] = useState(false);
  const [selectedRun, setSelectedRun] = useState<PayrollRun | null>(null);
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
  const [isProcessing, setIsProcessing] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  useEffect(() => {
    const loadPayrollRuns = async () => {
      try {
        const accessToken = await getAccessToken();
        const headers: HeadersInit = accessToken ? { Authorization: `Bearer ${accessToken}` } : {};
        const response = await fetch('/api/payroll-runs', {
          method: 'GET',
          headers,
          cache: 'no-store',
        });

        if (!response.ok) {
          setPayrollRuns([]);
          return;
        }

        const payload = await response.json();
        const rows: PayrollRunApiRow[] = payload.runs ?? [];
        setPayrollRuns(
          rows.map((row) => ({
            id: row.id,
            payrollMonth: row.payroll_month,
            payrollDate: row.payroll_date,
            status: row.status,
            totalEmployees: Number(row.total_employees ?? 0),
            processedEmployees: Number(row.processed_employees ?? 0),
            totalGross: Number(row.total_gross ?? 0),
            totalDeductions: Number(row.total_deductions ?? 0),
            totalNet: Number(row.total_net ?? 0),
            approvedBy: row.approved_by ?? undefined,
            approvalDate: row.approval_date ?? undefined,
            processedDate: row.processed_date ?? undefined,
            paidDate: row.paid_date ?? undefined,
            payrollDetails: [],
          }))
        );
      } catch {
        setPayrollRuns([]);
      }
    };

    const loadRegisterEntries = async () => {
      try {
        const accessToken = await getAccessToken();
        const headers: HeadersInit = accessToken ? { Authorization: `Bearer ${accessToken}` } : {};
        const response = await fetch('/api/payroll-register', {
          method: 'GET',
          headers,
          cache: 'no-store',
        });

        if (!response.ok) {
          setRegisterEntries([]);
          return;
        }

        const payload = await response.json();
        const rows: PayrollRegisterApiRow[] = payload.entries ?? [];
        setRegisterEntries(
          rows.map((row) => ({
            id: row.id,
            employeeId: row.employee_code,
            employeeName: row.employee_name,
            payrollMonth: row.payroll_month,
            grossSalary: Number(row.gross_salary ?? 0),
            totalDeductions: Number(row.total_deductions ?? 0),
            netSalary: Number(row.net_salary ?? 0),
            transferStatus: row.transfer_status,
            transferDate: row.transfer_date ?? undefined,
          }))
        );
      } catch {
        setRegisterEntries([]);
      }
    };

    loadPayrollRuns();
    loadRegisterEntries();
    window.addEventListener('focus', loadRegisterEntries);
    window.addEventListener('focus', loadPayrollRuns);

    return () => {
      window.removeEventListener('focus', loadRegisterEntries);
      window.removeEventListener('focus', loadPayrollRuns);
    };
  }, []);

  const selectedMonthEntries = useMemo(
    () => registerEntries.filter((entry) => entry.payrollMonth === selectedMonth && entry.transferStatus !== 'Cancelled'),
    [registerEntries, selectedMonth]
  );

  const selectedMonthSummary = useMemo(() => {
    const totalEmployees = selectedMonthEntries.length;
    const alreadyProcessed = selectedMonthEntries.filter((entry) => entry.transferStatus === 'Processed').length;
    const processedAmount = selectedMonthEntries
      .filter((entry) => entry.transferStatus === 'Processed')
      .reduce((sum, entry) => sum + entry.netSalary, 0);
    const totalGross = selectedMonthEntries.reduce((sum, entry) => sum + entry.grossSalary, 0);
    const totalDeductions = selectedMonthEntries.reduce((sum, entry) => sum + entry.totalDeductions, 0);
    const totalNet = selectedMonthEntries.reduce((sum, entry) => sum + entry.netSalary, 0);
    return { totalEmployees, alreadyProcessed, processedAmount, totalGross, totalDeductions, totalNet };
  }, [selectedMonthEntries]);

  const pendingMonthEntries = useMemo(
    () => selectedMonthEntries.filter((entry) => entry.transferStatus === 'Pending'),
    [selectedMonthEntries]
  );

  const pendingMonthSummary = useMemo(() => {
    const totalEmployees = pendingMonthEntries.length;
    const totalGross = pendingMonthEntries.reduce((sum, entry) => sum + entry.grossSalary, 0);
    const totalDeductions = pendingMonthEntries.reduce((sum, entry) => sum + entry.totalDeductions, 0);
    const totalNet = pendingMonthEntries.reduce((sum, entry) => sum + entry.netSalary, 0);
    return { totalEmployees, totalGross, totalDeductions, totalNet };
  }, [pendingMonthEntries]);

  const selectedPendingEntries = useMemo(
    () => pendingMonthEntries.filter((entry) => selectedEntryIds.includes(entry.id)),
    [pendingMonthEntries, selectedEntryIds]
  );

  const selectedPendingSummary = useMemo(() => {
    const totalEmployees = selectedPendingEntries.length;
    const totalGross = selectedPendingEntries.reduce((sum, entry) => sum + entry.grossSalary, 0);
    const totalDeductions = selectedPendingEntries.reduce((sum, entry) => sum + entry.totalDeductions, 0);
    const totalNet = selectedPendingEntries.reduce((sum, entry) => sum + entry.netSalary, 0);
    return { totalEmployees, totalGross, totalDeductions, totalNet };
  }, [selectedPendingEntries]);

  const currentMonthRunPreview = useMemo<PayrollRun>(() => {
    const status: PayrollRun['status'] =
      selectedMonthSummary.totalEmployees === 0
        ? 'DRAFT'
        : selectedMonthSummary.alreadyProcessed === selectedMonthSummary.totalEmployees
          ? 'PROCESSED'
          : 'DRAFT';

    return {
      id: `preview-${selectedMonth}`,
      payrollMonth: selectedMonth,
      payrollDate: new Date().toISOString().slice(0, 10),
      totalEmployees: selectedMonthSummary.totalEmployees,
      processedEmployees: selectedMonthSummary.alreadyProcessed,
      totalGross: selectedMonthSummary.totalGross,
      totalDeductions: selectedMonthSummary.totalDeductions,
      totalNet: selectedMonthSummary.totalNet,
      status,
      processedDate: selectedMonthSummary.alreadyProcessed > 0 ? new Date().toISOString().slice(0, 10) : undefined,
      payrollDetails: selectedMonthEntries.map((entry) => ({
        entryId: entry.id,
        employeeId: entry.employeeId,
        employeeName: entry.employeeName,
        grossSalary: entry.grossSalary,
        totalDeductions: entry.totalDeductions,
        netSalary: entry.netSalary,
        transferStatus: entry.transferStatus,
        transferDate: entry.transferDate,
      })),
    };
  }, [selectedMonth, selectedMonthEntries, selectedMonthSummary]);

  const payrollRows = useMemo(() => {
    const monthRun = payrollRuns.find((run) => run.payrollMonth === selectedMonth);
    if (monthRun) {
      return [monthRun, ...payrollRuns.filter((run) => run.id !== monthRun.id)];
    }
    return [currentMonthRunPreview, ...payrollRuns];
  }, [currentMonthRunPreview, payrollRuns, selectedMonth]);

  const totalEmployees = payrollRuns.reduce((max, run) => Math.max(max, run.totalEmployees), 0);
  const lastPayroll = payrollRuns[0]?.payrollMonth ?? '-';
  const totalProcessed = payrollRuns.reduce((sum, run) => sum + run.totalNet, 0);
  const pendingApprovals = payrollRuns.filter((run) => run.status === 'DRAFT').length;

  const handleProcessPayroll = async () => {
    if (selectedPendingSummary.totalEmployees === 0) {
      return;
    }

    setProcessingError(null);
    setProcessingWarning(null);
    setIsProcessing(true);
    await new Promise(resolve => setTimeout(resolve, 2000));

    const processedDate = new Date().toISOString().split('T')[0];

    let persistedRun: PayrollRun | null = null;

    try {
      const accessToken = await getAccessToken();
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      };

      const registerResponse = await fetch('/api/payroll-register', {
        method: 'PATCH',
        headers,
        body: JSON.stringify({
          action: 'process-month',
          payrollMonth: selectedMonth,
          selectedEntryIds: selectedPendingEntries.map((entry) => entry.id),
        }),
      });

      if (!registerResponse.ok) {
        const payload = await registerResponse.json().catch(() => ({ error: 'Failed to update payroll register' }));
        throw new Error(payload.error ?? 'Failed to update payroll register');
      }

      const payrollRunResponse = await fetch('/api/payroll-runs', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          payrollMonth: selectedMonth,
          payrollDate: processedDate,
          status: 'PROCESSED',
          totalEmployees: selectedPendingSummary.totalEmployees,
          processedEmployees: selectedPendingSummary.totalEmployees,
          totalGross: selectedPendingSummary.totalGross,
          totalDeductions: selectedPendingSummary.totalDeductions,
          totalNet: selectedPendingSummary.totalNet,
          processedDate,
        }),
      });

      if (!payrollRunResponse.ok) {
        const payload = await payrollRunResponse.json().catch(() => ({ error: 'Failed to persist payroll run' }));
        throw new Error(payload.error ?? 'Failed to persist payroll run');
      }

      const payload = await payrollRunResponse.json();
      if (payload.warning) {
        setProcessingWarning(payload.warning as string);
      }
      const row = payload.run as PayrollRunApiRow;
      persistedRun = {
        id: row.id,
        payrollMonth: row.payroll_month,
        payrollDate: row.payroll_date,
        status: row.status,
        totalEmployees: Number(row.total_employees ?? 0),
        processedEmployees: Number(row.processed_employees ?? 0),
        totalGross: Number(row.total_gross ?? 0),
        totalDeductions: Number(row.total_deductions ?? 0),
        totalNet: Number(row.total_net ?? 0),
        approvedBy: row.approved_by ?? undefined,
        approvalDate: row.approval_date ?? undefined,
        processedDate: row.processed_date ?? undefined,
        paidDate: row.paid_date ?? undefined,
        payrollDetails: [],
      };
    } catch (error) {
      setProcessingError(error instanceof Error ? error.message : 'Failed to process payroll');
      setIsProcessing(false);
      return;
    }

    const selectedIds = new Set(selectedPendingEntries.map((entry) => entry.id));
    const refreshedEntries = registerEntries.map((entry) => {
      if (!selectedIds.has(entry.id) || entry.payrollMonth !== selectedMonth || entry.transferStatus !== 'Pending') {
        return entry;
      }
      return {
        ...entry,
        transferStatus: 'Processed' as const,
        transferDate: processedDate,
      };
    });
    setRegisterEntries(refreshedEntries);

    const processedMonthEntries = refreshedEntries.filter(
      (entry) => entry.payrollMonth === selectedMonth && entry.transferStatus === 'Processed'
    );
    
    const newRun: PayrollRun = {
      id: persistedRun?.id ?? Date.now().toString(),
      payrollMonth: selectedMonth,
      payrollDate: persistedRun?.payrollDate ?? processedDate,
      totalEmployees: selectedMonthSummary.totalEmployees,
      processedEmployees: processedMonthEntries.length,
      totalGross: processedMonthEntries.reduce((sum, entry) => sum + entry.grossSalary, 0),
      totalDeductions: processedMonthEntries.reduce((sum, entry) => sum + entry.totalDeductions, 0),
      totalNet: processedMonthEntries.reduce((sum, entry) => sum + entry.netSalary, 0),
      status: persistedRun?.status ?? 'PROCESSED',
      approvedBy: persistedRun?.approvedBy,
      approvalDate: persistedRun?.approvalDate,
      processedDate: persistedRun?.processedDate ?? processedDate,
      paidDate: persistedRun?.paidDate,
      payrollDetails: processedMonthEntries.map((entry) => ({
        entryId: entry.id,
        employeeId: entry.employeeId,
        employeeName: entry.employeeName,
        grossSalary: entry.grossSalary,
        totalDeductions: entry.totalDeductions,
        netSalary: entry.netSalary,
        transferStatus: entry.transferStatus,
        transferDate: entry.transferDate,
      })),
    };

    setPayrollRuns((prev) => {
      const remaining = prev.filter((run) => run.payrollMonth !== newRun.payrollMonth && run.id !== newRun.id);
      return [newRun, ...remaining];
    });
    setSelectedEntryIds((prev) =>
      prev.filter((id) => !processedMonthEntries.some((entry) => entry.id === id))
    );
    window.dispatchEvent(new CustomEvent('finance:bank-accounts-updated'));
    window.dispatchEvent(new CustomEvent('finance:transactions-updated'));
    setIsProcessing(false);
    setShowProcessModal(false);
  };

  const handleResetPayroll = async () => {
    setProcessingError(null);
    setProcessingWarning(null);
    setIsResetting(true);

    try {
      const accessToken = await getAccessToken();
      const headers: HeadersInit = accessToken ? { Authorization: `Bearer ${accessToken}` } : {};
      const response = await fetch(`/api/payroll-runs?payrollMonth=${selectedMonth}`, {
        method: 'DELETE',
        headers,
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload.error ?? 'Failed to reset payroll month');
      }

      setRegisterEntries((prev) =>
        prev.map((entry) =>
          entry.payrollMonth === selectedMonth
            ? { ...entry, transferStatus: 'Pending' as const, transferDate: undefined }
            : entry
        )
      );
      setSelectedEntryIds((prev) =>
        prev.filter((id) => !registerEntries.some((entry) => entry.id === id && entry.payrollMonth === selectedMonth))
      );
      setPayrollRuns((prev) => prev.filter((run) => run.payrollMonth !== selectedMonth));
      window.dispatchEvent(new CustomEvent('finance:bank-accounts-updated'));
      window.dispatchEvent(new CustomEvent('finance:transactions-updated'));
      setProcessingWarning(`Payroll reset completed for ${selectedMonth}. You can process again now.`);
    } catch (error) {
      setProcessingError(error instanceof Error ? error.message : 'Failed to reset payroll month');
    } finally {
      setIsResetting(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'PROCESSED': return 'bg-blue-100 text-blue-800';
      case 'APPROVED': return 'bg-purple-100 text-purple-800';
      case 'DRAFT': return 'bg-yellow-100 text-yellow-800';
      case 'REJECTED': return 'bg-red-100 text-red-800';
      case 'QUEUED': return 'bg-gray-100 text-gray-700';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const toggleEntrySelection = (entryId: string, checked: boolean) => {
    setSelectedEntryIds((prev) => {
      if (checked) {
        if (prev.includes(entryId)) return prev;
        return [...prev, entryId];
      }
      return prev.filter((id) => id !== entryId);
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-purple-100 rounded-lg">
            <FileText size={28} className="text-purple-600" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">Payroll Processing</h1>
            <p className="text-sm text-gray-600 mt-0.5">Generate and process monthly payroll</p>
          </div>
        </div>
        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={handleResetPayroll}
            disabled={isResetting}
          >
            <RotateCcw size={18} className="mr-2" />
            {isResetting ? 'Resetting...' : 'Reset Month'}
          </Button>
          <Button onClick={() => setShowProcessModal(true)} className="bg-purple-600 hover:bg-purple-700">
            <Play size={18} className="mr-2" />
            Process Payroll
          </Button>
        </div>
      </div>

      {processingError && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {processingError}
        </div>
      )}

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {[
          { label: 'Total Employees', value: totalEmployees.toLocaleString('en-IN'), icon: '👥' },
          { label: 'Last Payroll', value: lastPayroll, icon: '📅' },
          { label: 'Total Processed', value: `₹${totalProcessed.toLocaleString('en-IN')}`, icon: '💰' },
          { label: 'Processed This Month', value: `₹${selectedMonthSummary.processedAmount.toLocaleString('en-IN')}`, icon: '✅' },
          { label: 'Pending Approval', value: pendingApprovals.toLocaleString('en-IN'), icon: '⏳' },
        ].map((stat, i) => (
          <div key={i} className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">{stat.label}</p>
                <p className="text-2xl font-bold mt-1">{stat.value}</p>
              </div>
              <span className="text-3xl">{stat.icon}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Employee-Wise Payroll Table */}
      <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Payroll Month</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Employees</th>
              <th className="px-6 py-3 text-right text-sm font-semibold text-gray-900">Gross Salary</th>
              <th className="px-6 py-3 text-right text-sm font-semibold text-gray-900">Deductions</th>
              <th className="px-6 py-3 text-right text-sm font-semibold text-gray-900">Net Salary</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Status</th>
              <th className="px-6 py-3 text-center text-sm font-semibold text-gray-900">Select</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {selectedMonthEntries.map((entry) => (
              <tr key={entry.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 text-sm font-medium text-gray-900">{entry.payrollMonth}</td>
                <td className="px-6 py-4 text-sm text-gray-700">{entry.employeeName}</td>
                <td className="px-6 py-4 text-sm font-semibold text-gray-900 text-right">₹{entry.grossSalary.toLocaleString('en-IN')}</td>
                <td className="px-6 py-4 text-sm text-red-600 text-right">₹{entry.totalDeductions.toLocaleString('en-IN')}</td>
                <td className="px-6 py-4 text-sm font-semibold text-green-600 text-right">₹{entry.netSalary.toLocaleString('en-IN')}</td>
                <td className="px-6 py-4 text-sm">
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(entry.transferStatus)}`}>
                    {entry.transferStatus}
                  </span>
                </td>
                <td className="px-6 py-4 text-center">
                  {(() => {
                    const isPending = entry.transferStatus === 'Pending';
                    return (
                  <input
                    type="checkbox"
                    checked={isPending && selectedEntryIds.includes(entry.id)}
                    onChange={(e) => toggleEntrySelection(entry.id, e.target.checked)}
                    disabled={!isPending}
                    className={`h-4 w-4 rounded border-gray-300 ${!isPending ? 'cursor-not-allowed opacity-50' : ''}`}
                    aria-label={`Select payroll record for ${entry.employeeName}`}
                  />
                    );
                  })()}
                </td>
              </tr>
            ))}
            {selectedMonthEntries.length === 0 && (
              <tr>
                <td colSpan={7} className="px-6 py-8 text-sm text-gray-500 text-center">
                  No employee-wise payroll data for selected month.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Process Payroll Modal */}
      <Dialog open={showProcessModal} onOpenChange={setShowProcessModal}>
        <DialogContent className="flex flex-col max-h-[90vh]">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle>Process Payroll</DialogTitle>
            <DialogDescription>Generate payroll for selected month</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 flex-1 overflow-y-auto pr-1">
            <div>
              <label className="block text-sm font-medium mb-2">Payroll Month</label>
              <input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-900">
                This will submit payroll for approval using Payroll Register entries for the selected month.
              </p>
            </div>
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-1">
              <p className="text-sm text-gray-700">Employees in Register: <span className="font-semibold">{selectedMonthSummary.totalEmployees}</span></p>
              <p className="text-sm text-gray-700">Already Processed: <span className="font-semibold">{selectedMonthSummary.alreadyProcessed}</span></p>
              <p className="text-sm text-gray-700">Pending to Process: <span className="font-semibold">{pendingMonthSummary.totalEmployees}</span></p>
              <p className="text-sm text-gray-700">Selected for Processing: <span className="font-semibold">{selectedPendingSummary.totalEmployees}</span></p>
              <p className="text-sm text-gray-700">Selected Gross: <span className="font-semibold">₹{selectedPendingSummary.totalGross.toLocaleString('en-IN')}</span></p>
              <p className="text-sm text-gray-700">Selected Deductions: <span className="font-semibold">₹{selectedPendingSummary.totalDeductions.toLocaleString('en-IN')}</span></p>
              <p className="text-sm text-gray-700">Selected Net: <span className="font-semibold text-green-700">₹{selectedPendingSummary.totalNet.toLocaleString('en-IN')}</span></p>
            </div>
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <p className="text-sm text-yellow-900">
                Review the register summary carefully before submitting it for approval.
              </p>
            </div>
            {processingError && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {processingError}
              </div>
            )}
            {processingWarning && (
              <div className="rounded-lg border border-yellow-300 bg-yellow-50 px-4 py-3 text-sm text-yellow-800">
                ⚠ {processingWarning}
              </div>
            )}
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
                <p className="text-sm font-medium text-gray-800">Payroll Register Details For Processing</p>
              </div>
              <div className="max-h-56 overflow-y-auto">
                {selectedPendingEntries.length === 0 ? (
                  <div className="px-4 py-6 text-sm text-gray-500">No pending payroll entries available for this month.</div>
                ) : (
                  <table className="w-full text-sm">
                    <thead className="bg-white border-b border-gray-200 sticky top-0">
                      <tr>
                        <th className="px-4 py-2 text-left font-semibold text-gray-700">Employee</th>
                        <th className="px-4 py-2 text-right font-semibold text-gray-700">Gross</th>
                        <th className="px-4 py-2 text-right font-semibold text-gray-700">Deductions</th>
                        <th className="px-4 py-2 text-right font-semibold text-gray-700">Net</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedPendingEntries.map((entry) => (
                        <tr key={entry.id} className="border-b border-gray-100">
                          <td className="px-4 py-2 text-gray-700">{entry.employeeName}</td>
                          <td className="px-4 py-2 text-right text-gray-700">₹{entry.grossSalary.toLocaleString('en-IN')}</td>
                          <td className="px-4 py-2 text-right text-red-600">₹{entry.totalDeductions.toLocaleString('en-IN')}</td>
                          <td className="px-4 py-2 text-right text-green-600 font-medium">₹{entry.netSalary.toLocaleString('en-IN')}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>
          <div className="flex gap-3 justify-end pt-4 border-t border-gray-100 flex-shrink-0">
            <Button variant="outline" onClick={() => setShowProcessModal(false)}>Cancel</Button>
            <Button 
              onClick={handleProcessPayroll}
              disabled={isProcessing || selectedPendingSummary.totalEmployees === 0}
              className="bg-purple-600 hover:bg-purple-700"
            >
              {isProcessing ? 'Submitting...' : selectedPendingSummary.totalEmployees === 0 ? 'Select Employees' : 'Submit For Approval'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {selectedRun && (
        <Dialog open={showRunDetailModal} onOpenChange={setShowRunDetailModal}>
          <DialogContent className="max-w-4xl">
            <DialogHeader>
              <DialogTitle>Processed Payroll Details - {selectedRun.payrollMonth}</DialogTitle>
              <DialogDescription>
                Employee-level details captured from Payroll Register at processing time.
              </DialogDescription>
            </DialogHeader>
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <div className="max-h-80 overflow-y-auto">
                {selectedRun.payrollDetails.length === 0 ? (
                  <div className="px-4 py-6 text-sm text-gray-500">No payroll details captured.</div>
                ) : (
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b border-gray-200 sticky top-0">
                      <tr>
                        <th className="px-4 py-2 text-left font-semibold text-gray-700">Employee ID</th>
                        <th className="px-4 py-2 text-left font-semibold text-gray-700">Employee Name</th>
                        <th className="px-4 py-2 text-right font-semibold text-gray-700">Gross</th>
                        <th className="px-4 py-2 text-right font-semibold text-gray-700">Deductions</th>
                        <th className="px-4 py-2 text-right font-semibold text-gray-700">Net</th>
                        <th className="px-4 py-2 text-left font-semibold text-gray-700">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedRun.payrollDetails.map((detail) => (
                        <tr key={detail.entryId} className="border-b border-gray-100">
                          <td className="px-4 py-2 text-gray-700">{detail.employeeId}</td>
                          <td className="px-4 py-2 text-gray-700">{detail.employeeName}</td>
                          <td className="px-4 py-2 text-right text-gray-700">₹{detail.grossSalary.toLocaleString('en-IN')}</td>
                          <td className="px-4 py-2 text-right text-red-600">₹{detail.totalDeductions.toLocaleString('en-IN')}</td>
                          <td className="px-4 py-2 text-right text-green-600 font-medium">₹{detail.netSalary.toLocaleString('en-IN')}</td>
                          <td className="px-4 py-2 text-gray-700">{detail.transferStatus}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
