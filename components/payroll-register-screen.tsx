'use client';

import { useEffect, useState } from 'react';
import { Download, Eye, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getSupabaseClient } from '@/lib/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface PayrollRegisterEntry {
  id: string;
  employeeId: string;
  employeeName: string;
  designation: string;
  payrollMonth: string;
  basic: number;
  da: number;
  hra: number;
  conveyance: number;
  medical: number;
  grossSalary: number;
  pf: number;
  esi: number;
  incomeTax: number;
  pt: number;
  totalDeductions: number;
  netSalary: number;
  bankAccount: string;
  transferStatus: 'Pending' | 'Processed' | 'Cancelled';
  transferDate?: string;
}

interface PayrollEntryInput {
  selectedEmployeeId: string;
  employeeId: string;
  employeeName: string;
  designation: string;
  basic: number;
  da: number;
  hra: number;
  conveyance: number;
  medical: number;
  itPercentage: number;
  pt: number;
  bankAccount: string;
  transferStatus: 'Pending' | 'Processed' | 'Cancelled';
}

type EmployeeApiRow = {
  id: string;
  employee_code?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  designation_id?: string | null;
  designation?: string | null;
  bank_account?: {
    accountNumber?: string;
  } | null;
  base_ctc?: number | null;
};

type EmployeeOption = {
  id: string;
  employeeCode: string;
  fullName: string;
  designation: string;
  bankAccount: string;
  baseCtc: number;
};

type PayrollRegisterApiRow = {
  id: string;
  employee_code: string;
  employee_name: string;
  designation: string;
  payroll_month: string;
  basic: number;
  da: number;
  hra: number;
  conveyance: number;
  medical: number;
  gross_salary: number;
  pf: number;
  esi: number;
  income_tax: number;
  pt: number;
  total_deductions: number;
  net_salary: number;
  bank_account: string;
  transfer_status: 'Pending' | 'Processed' | 'Cancelled';
  transfer_date?: string | null;
};

async function getAccessToken(): Promise<string | null> {
  const supabase = getSupabaseClient();
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}

const DEFAULT_PAYROLL_INPUT: PayrollEntryInput = {
  selectedEmployeeId: '',
  employeeId: '',
  employeeName: '',
  designation: '',
  basic: 0,
  da: 0,
  hra: 0,
  conveyance: 0,
  medical: 0,
  itPercentage: 0,
  pt: 200,
  bankAccount: '',
  transferStatus: 'Pending',
};

export function PayrollRegisterScreen() {
  const [payrollRegister, setPayrollRegister] = useState<PayrollRegisterEntry[]>([]);
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
  const [selectedEntry, setSelectedEntry] = useState<PayrollRegisterEntry | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [filterStatus, setFilterStatus] = useState<'All' | 'Pending' | 'Processed' | 'Cancelled'>('All');
  const [entryInput, setEntryInput] = useState<PayrollEntryInput>(DEFAULT_PAYROLL_INPUT);
  const [employees, setEmployees] = useState<EmployeeOption[]>([]);
  const [loadingEmployees, setLoadingEmployees] = useState(false);
  const [isSavingEntry, setIsSavingEntry] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);

  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        setLoadingEmployees(true);
        const supabase = getSupabaseClient();
        const { data } = await supabase.auth.getSession();
        const accessToken = data.session?.access_token ?? null;
        const headers: HeadersInit = accessToken ? { Authorization: `Bearer ${accessToken}` } : {};

        const response = await fetch('/api/employees', {
          method: 'GET',
          headers,
          cache: 'no-store',
        });

        if (!response.ok) {
          setEmployees([]);
          return;
        }

        const payload = await response.json();
        const rows: EmployeeApiRow[] = payload.employees ?? [];
        const mapped = rows.map((row) => {
          const firstName = row.first_name?.trim() ?? '';
          const lastName = row.last_name?.trim() ?? '';
          const resolvedDesignation =
            row.designation?.trim() ||
            (row.designation_id && row.designation_id.trim().length > 0 ? row.designation_id : 'N/A');
          return {
            id: row.id,
            employeeCode: row.employee_code?.trim() || `EMP-${row.id.slice(0, 6).toUpperCase()}`,
            fullName: `${firstName} ${lastName}`.trim() || 'Unnamed Employee',
            designation: resolvedDesignation,
            bankAccount: row.bank_account?.accountNumber ?? '',
            baseCtc: Number(row.base_ctc ?? 0),
          } satisfies EmployeeOption;
        });

        setEmployees(mapped);
      } catch {
        setEmployees([]);
        setFormError('Unable to load employees. Please refresh and try again.');
      } finally {
        setLoadingEmployees(false);
      }
    };

    fetchEmployees();
  }, []);

  useEffect(() => {
    const fetchPayrollRegister = async () => {
      try {
        const accessToken = await getAccessToken();
        const headers: HeadersInit = accessToken ? { Authorization: `Bearer ${accessToken}` } : {};
        const response = await fetch('/api/payroll-register', {
          method: 'GET',
          headers,
          cache: 'no-store',
        });

        if (!response.ok) {
          setPayrollRegister([]);
          return;
        }

        const payload = await response.json();
        const rows: PayrollRegisterApiRow[] = payload.entries ?? [];
        setPayrollRegister(
          rows.map((row) => ({
            id: row.id,
            employeeId: row.employee_code,
            employeeName: row.employee_name,
            designation: row.designation,
            payrollMonth: row.payroll_month,
            basic: Number(row.basic ?? 0),
            da: Number(row.da ?? 0),
            hra: Number(row.hra ?? 0),
            conveyance: Number(row.conveyance ?? 0),
            medical: Number(row.medical ?? 0),
            grossSalary: Number(row.gross_salary ?? 0),
            pf: Number(row.pf ?? 0),
            esi: Number(row.esi ?? 0),
            incomeTax: Number(row.income_tax ?? 0),
            pt: Number(row.pt ?? 0),
            totalDeductions: Number(row.total_deductions ?? 0),
            netSalary: Number(row.net_salary ?? 0),
            bankAccount: row.bank_account ?? '',
            transferStatus: row.transfer_status,
            transferDate: row.transfer_date ?? undefined,
          }))
        );
      } catch {
        setPayrollRegister([]);
      }
    };

    fetchPayrollRegister();
  }, []);

  const grossSalary = entryInput.basic + entryInput.da + entryInput.hra + entryInput.conveyance + entryInput.medical;
  const pf = Math.round((entryInput.basic + entryInput.da) * 0.12);
  const esi = grossSalary <= 21000 ? Math.round(grossSalary * 0.0075) : 0;
  const incomeTax = Math.round(grossSalary * (entryInput.itPercentage / 100));
  const totalDeductions = pf + esi + incomeTax + entryInput.pt;
  const netSalary = grossSalary - totalDeductions;

  const filteredRegister = payrollRegister.filter(entry => {
    if (entry.payrollMonth !== selectedMonth) return false;
    if (filterStatus === 'All') return true;
    return entry.transferStatus === filterStatus;
  });

  const totals = {
    employees: filteredRegister.length,
    grossTotal: filteredRegister.reduce((sum, e) => sum + e.grossSalary, 0),
    deductionsTotal: filteredRegister.reduce((sum, e) => sum + e.totalDeductions, 0),
    netTotal: filteredRegister.reduce((sum, e) => sum + e.netSalary, 0),
  };

  const setNumberInput = (field: keyof PayrollEntryInput, value: string) => {
    const parsed = Number.parseFloat(value);
    setEntryInput((prev) => ({
      ...prev,
      [field]: Number.isFinite(parsed) ? parsed : 0,
    }));
  };

  const handleEmployeeSelect = (selectedId: string) => {
    const selectedEmployee = employees.find((employee) => employee.id === selectedId);
    if (!selectedEmployee) {
      setEntryInput((prev) => ({
        ...prev,
        selectedEmployeeId: '',
      }));
      return;
    }

    const monthlyBase = Math.round(selectedEmployee.baseCtc / 12);

    setEntryInput((prev) => ({
      ...prev,
      selectedEmployeeId: selectedEmployee.id,
      employeeId: selectedEmployee.employeeCode,
      employeeName: selectedEmployee.fullName,
      designation: selectedEmployee.designation,
      bankAccount: selectedEmployee.bankAccount,
      basic: prev.basic > 0 ? prev.basic : monthlyBase,
    }));
  };

  const handleAddEntry = async () => {
    setFormError(null);
    setFormSuccess(null);

    if (!entryInput.employeeId.trim() || !entryInput.employeeName.trim() || !entryInput.designation.trim()) {
      setFormError('Please select an employee before adding to register.');
      return;
    }

    if (!selectedMonth.trim()) {
      setFormError('Please select a payroll month.');
      return;
    }

    try {
      setIsSavingEntry(true);
      const accessToken = await getAccessToken();
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
          ...(accessToken ? { Authorization: `Bearer ${accessToken}`, 'x-access-token': accessToken } : {}),
      };

      const response = await fetch('/api/payroll-register', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          employeeCode: entryInput.employeeId.trim(),
          employeeName: entryInput.employeeName.trim(),
          designation: entryInput.designation.trim(),
          payrollMonth: selectedMonth,
          basic: entryInput.basic,
          da: entryInput.da,
          hra: entryInput.hra,
          conveyance: entryInput.conveyance,
          medical: entryInput.medical,
          grossSalary,
          pf,
          esi,
          incomeTax,
          pt: entryInput.pt,
          totalDeductions,
          netSalary,
          bankAccount: entryInput.bankAccount.trim(),
          transferStatus: entryInput.transferStatus,
          transferDate: entryInput.transferStatus === 'Processed' ? new Date().toISOString().split('T')[0] : null,
        }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({ error: 'Failed to add payroll register entry' }));
        setFormError(payload.error ?? 'Failed to add payroll register entry.');
        return;
      }

      const payload = await response.json();
      const row = payload.entry as PayrollRegisterApiRow;
      const newEntry: PayrollRegisterEntry = {
        id: row.id,
        employeeId: row.employee_code,
        employeeName: row.employee_name,
        designation: row.designation,
        payrollMonth: row.payroll_month,
        basic: Number(row.basic ?? 0),
        da: Number(row.da ?? 0),
        hra: Number(row.hra ?? 0),
        conveyance: Number(row.conveyance ?? 0),
        medical: Number(row.medical ?? 0),
        grossSalary: Number(row.gross_salary ?? 0),
        pf: Number(row.pf ?? 0),
        esi: Number(row.esi ?? 0),
        incomeTax: Number(row.income_tax ?? 0),
        pt: Number(row.pt ?? 0),
        totalDeductions: Number(row.total_deductions ?? 0),
        netSalary: Number(row.net_salary ?? 0),
        bankAccount: row.bank_account ?? '',
        transferStatus: row.transfer_status,
        transferDate: row.transfer_date ?? undefined,
      };

      setPayrollRegister((prev) => [newEntry, ...prev]);
      setEntryInput(DEFAULT_PAYROLL_INPUT);
      setFormSuccess('Employee added to payroll register successfully.');
    } catch (error: any) {
      setFormError(error?.message ?? 'Failed to add payroll register entry.');
    } finally {
      setIsSavingEntry(false);
    }
  };

  const handleDownload = () => {
    // CSV download logic
    const csvContent = [
      ['Employee ID', 'Employee Name', 'Designation', 'Basic', 'DA', 'HRA', 'Gross', 'PF', 'ESI', 'IT', 'PT', 'Deductions', 'Net', 'Status'].join(','),
      ...filteredRegister.map(e => [e.employeeId, e.employeeName, e.designation, e.basic, e.da, e.hra, e.grossSalary, e.pf, e.esi, e.incomeTax, e.pt, e.totalDeductions, e.netSalary, e.transferStatus].join(',')),
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `payroll-register-${selectedMonth}.csv`;
    a.click();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Payroll Register</h1>
          <p className="text-sm text-muted-foreground mt-1">Detailed payroll transaction summary by employee</p>
        </div>
        <Button onClick={handleDownload} className="gap-2">
          <Download size={18} />
          Download CSV
        </Button>
      </div>

      {/* Month Selection and Filters */}
      <div className="flex gap-4 items-end">
        <div>
          <label className="text-sm font-medium">Payroll Month</label>
          <input
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="mt-1 px-3 py-2 border border-border rounded-lg w-48"
          />
        </div>
        <div>
          <label className="text-sm font-medium">Transfer Status</label>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as any)}
            className="mt-1 px-3 py-2 border border-border rounded-lg w-48"
          >
            <option>All</option>
            <option>Pending</option>
            <option>Processed</option>
            <option>Cancelled</option>
          </select>
        </div>
      </div>

      {/* Capture Entry */}
      <div className="bg-white border border-border rounded-lg p-5 space-y-4">
        <div>
          <h2 className="text-lg font-semibold">Add Payroll Entry</h2>
          <p className="text-sm text-muted-foreground mt-1">
            PF is calculated as 12% of Basic+DA. ESI is 0.75% of Gross when Gross is up to ₹21,000. IT is based on the entered percentage.
          </p>
          {formError && (
            <div className="mt-3 rounded border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {formError}
            </div>
          )}
          {formSuccess && (
            <div className="mt-3 rounded border border-green-500/40 bg-green-500/10 px-3 py-2 text-sm text-green-700">
              {formSuccess}
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <label className="text-sm font-medium">Employee</label>
            <select
              value={entryInput.selectedEmployeeId}
              onChange={(e) => handleEmployeeSelect(e.target.value)}
              className="mt-1 w-full px-3 py-2 border border-border rounded-lg"
            >
              <option value="">{loadingEmployees ? 'Loading employees...' : 'Select employee'}</option>
              {employees.map((employee) => (
                <option key={employee.id} value={employee.id}>
                  {employee.employeeCode} - {employee.fullName}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-sm font-medium">Employee ID</label>
            <input
              value={entryInput.employeeId}
              readOnly
              className="mt-1 w-full px-3 py-2 border border-border rounded-lg"
              placeholder="EMP-001"
            />
          </div>
          <div>
            <label className="text-sm font-medium">Employee Name</label>
            <input
              value={entryInput.employeeName}
              readOnly
              className="mt-1 w-full px-3 py-2 border border-border rounded-lg"
              placeholder="Employee name"
            />
          </div>
          <div>
            <label className="text-sm font-medium">Designation</label>
            <input
              value={entryInput.designation}
              readOnly
              className="mt-1 w-full px-3 py-2 border border-border rounded-lg"
              placeholder="Accountant"
            />
          </div>
          <div>
            <label className="text-sm font-medium">Bank Account</label>
            <input
              value={entryInput.bankAccount}
              readOnly
              className="mt-1 w-full px-3 py-2 border border-border rounded-lg"
              placeholder="Masked account"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <label className="text-sm font-medium">Basic</label>
            <input
              type="number"
              min={0}
              value={entryInput.basic}
              onChange={(e) => setNumberInput('basic', e.target.value)}
              className="mt-1 w-full px-3 py-2 border border-border rounded-lg"
            />
          </div>
          <div>
            <label className="text-sm font-medium">DA</label>
            <input
              type="number"
              min={0}
              value={entryInput.da}
              onChange={(e) => setNumberInput('da', e.target.value)}
              className="mt-1 w-full px-3 py-2 border border-border rounded-lg"
            />
          </div>
          <div>
            <label className="text-sm font-medium">HRA</label>
            <input
              type="number"
              min={0}
              value={entryInput.hra}
              onChange={(e) => setNumberInput('hra', e.target.value)}
              className="mt-1 w-full px-3 py-2 border border-border rounded-lg"
            />
          </div>
          <div>
            <label className="text-sm font-medium">Conveyance</label>
            <input
              type="number"
              min={0}
              value={entryInput.conveyance}
              onChange={(e) => setNumberInput('conveyance', e.target.value)}
              className="mt-1 w-full px-3 py-2 border border-border rounded-lg"
            />
          </div>
          <div>
            <label className="text-sm font-medium">Medical</label>
            <input
              type="number"
              min={0}
              value={entryInput.medical}
              onChange={(e) => setNumberInput('medical', e.target.value)}
              className="mt-1 w-full px-3 py-2 border border-border rounded-lg"
            />
          </div>
          <div>
            <label className="text-sm font-medium">IT % (Monthly Estimate)</label>
            <input
              type="number"
              min={0}
              step={0.1}
              value={entryInput.itPercentage}
              onChange={(e) => setNumberInput('itPercentage', e.target.value)}
              className="mt-1 w-full px-3 py-2 border border-border rounded-lg"
            />
          </div>
          <div>
            <label className="text-sm font-medium">PT</label>
            <input
              type="number"
              min={0}
              value={entryInput.pt}
              onChange={(e) => setNumberInput('pt', e.target.value)}
              className="mt-1 w-full px-3 py-2 border border-border rounded-lg"
            />
          </div>
          <div>
            <label className="text-sm font-medium">Transfer Status</label>
            <select
              value={entryInput.transferStatus}
              onChange={(e) => setEntryInput((prev) => ({ ...prev, transferStatus: e.target.value as PayrollEntryInput['transferStatus'] }))}
              className="mt-1 w-full px-3 py-2 border border-border rounded-lg"
            >
              <option>Pending</option>
              <option>Processed</option>
              <option>Cancelled</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-muted/30 rounded-lg p-4 text-sm">
          <div>
            <p className="text-muted-foreground">Gross Salary</p>
            <p className="font-semibold">₹{grossSalary.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-muted-foreground">PF (12% Basic+DA)</p>
            <p className="font-semibold">₹{pf.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-muted-foreground">ESI (0.75% if eligible)</p>
            <p className="font-semibold">₹{esi.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Income Tax</p>
            <p className="font-semibold">₹{incomeTax.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Total Deductions</p>
            <p className="font-semibold text-red-600">₹{totalDeductions.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Net Salary</p>
            <p className="font-semibold text-green-600">₹{netSalary.toLocaleString()}</p>
          </div>
        </div>

        <div className="flex justify-end">
          <Button onClick={handleAddEntry} className="gap-2" disabled={isSavingEntry}>
            <Plus size={16} />
            {isSavingEntry ? 'Saving...' : 'Add To Register'}
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white border border-border rounded-lg p-4">
          <p className="text-sm text-muted-foreground">Total Employees</p>
          <p className="text-2xl font-bold">{totals.employees}</p>
        </div>
        <div className="bg-white border border-border rounded-lg p-4">
          <p className="text-sm text-muted-foreground">Total Gross</p>
          <p className="text-2xl font-bold text-green-600">₹{totals.grossTotal.toLocaleString('en-IN')}</p>
        </div>
        <div className="bg-white border border-border rounded-lg p-4">
          <p className="text-sm text-muted-foreground">Total Deductions</p>
          <p className="text-2xl font-bold text-red-600">₹{totals.deductionsTotal.toLocaleString('en-IN')}</p>
        </div>
        <div className="bg-white border border-border rounded-lg p-4">
          <p className="text-sm text-muted-foreground">Total Net</p>
          <p className="text-2xl font-bold text-blue-600">₹{totals.netTotal.toLocaleString('en-IN')}</p>
        </div>
      </div>

      {/* Payroll Register Table */}
      <div className="bg-white border border-border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gradient-to-r from-muted/40 to-muted/20 border-b">
                <th className="px-4 py-3 text-left font-semibold">Employee</th>
                <th className="px-4 py-3 text-left font-semibold">Designation</th>
                <th className="px-4 py-3 text-right font-semibold">Gross</th>
                <th className="px-4 py-3 text-right font-semibold">PF</th>
                <th className="px-4 py-3 text-right font-semibold">ESI</th>
                <th className="px-4 py-3 text-right font-semibold">IT</th>
                <th className="px-4 py-3 text-right font-semibold">Deductions</th>
                <th className="px-4 py-3 text-right font-semibold">Net</th>
                <th className="px-4 py-3 text-left font-semibold">Status</th>
                <th className="px-4 py-3 text-center font-semibold">Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredRegister.map((entry) => (
                <tr key={entry.id} className="border-b hover:bg-muted/50">
                  <td className="px-4 py-3 font-medium">{entry.employeeName}</td>
                  <td className="px-4 py-3 text-muted-foreground">{entry.designation}</td>
                  <td className="px-4 py-3 text-right font-semibold">₹{entry.grossSalary.toLocaleString()}</td>
                  <td className="px-4 py-3 text-right">₹{entry.pf.toLocaleString()}</td>
                  <td className="px-4 py-3 text-right">₹{entry.esi.toLocaleString()}</td>
                  <td className="px-4 py-3 text-right">₹{entry.incomeTax.toLocaleString()}</td>
                  <td className="px-4 py-3 text-right font-medium text-red-600">₹{entry.totalDeductions.toLocaleString()}</td>
                  <td className="px-4 py-3 text-right font-bold text-green-600">₹{entry.netSalary.toLocaleString()}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      entry.transferStatus === 'Processed' ? 'bg-green-100 text-green-700' :
                      entry.transferStatus === 'Pending' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-red-100 text-red-700'
                    }`}>
                      {entry.transferStatus}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => {
                        setSelectedEntry(entry);
                        setShowDetailModal(true);
                      }}
                      className="text-blue-600 hover:text-blue-800"
                    >
                      <Eye size={18} />
                    </button>
                  </td>
                </tr>
              ))}
              {filteredRegister.length === 0 && (
                <tr>
                  <td colSpan={10} className="px-4 py-8 text-center text-muted-foreground">
                    No payroll entries for selected filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail Modal */}
      {selectedEntry && (
        <Dialog open={showDetailModal} onOpenChange={setShowDetailModal}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Payroll Details - {selectedEntry.employeeName}</DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-6">
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase">EARNINGS</p>
                <div className="mt-3 space-y-2">
                  <div className="flex justify-between"><span>Basic Salary</span><span className="font-medium">₹{selectedEntry.basic}</span></div>
                  <div className="flex justify-between"><span>DA</span><span className="font-medium">₹{selectedEntry.da}</span></div>
                  <div className="flex justify-between"><span>HRA</span><span className="font-medium">₹{selectedEntry.hra}</span></div>
                  <div className="flex justify-between"><span>Conveyance</span><span className="font-medium">₹{selectedEntry.conveyance}</span></div>
                  <div className="flex justify-between"><span>Medical</span><span className="font-medium">₹{selectedEntry.medical}</span></div>
                  <div className="border-t pt-2 flex justify-between font-bold"><span>Gross Salary</span><span>₹{selectedEntry.grossSalary}</span></div>
                </div>
              </div>
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase">DEDUCTIONS</p>
                <div className="mt-3 space-y-2">
                  <div className="flex justify-between"><span>PF</span><span className="font-medium">₹{selectedEntry.pf}</span></div>
                  <div className="flex justify-between"><span>ESI</span><span className="font-medium">₹{selectedEntry.esi}</span></div>
                  <div className="flex justify-between"><span>Income Tax</span><span className="font-medium">₹{selectedEntry.incomeTax}</span></div>
                  <div className="flex justify-between"><span>PT</span><span className="font-medium">₹{selectedEntry.pt}</span></div>
                  <div className="border-t pt-2 flex justify-between font-bold"><span>Total Deductions</span><span>₹{selectedEntry.totalDeductions}</span></div>
                </div>
              </div>
            </div>
            <div className="border-t pt-4 flex justify-between text-lg font-bold">
              <span>Net Salary</span>
              <span className="text-green-600">₹{selectedEntry.netSalary.toLocaleString()}</span>
            </div>
            <div className="bg-muted/50 p-3 rounded text-sm">
              <p className="text-muted-foreground">Bank Transfer: {selectedEntry.bankAccount}</p>
              <p className="text-muted-foreground">Status: {selectedEntry.transferStatus} {selectedEntry.transferDate && `on ${selectedEntry.transferDate}`}</p>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
