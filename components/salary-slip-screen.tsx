'use client';

import { useEffect, useState } from 'react';
import { Download, Printer, Mail, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getSupabaseClient } from '@/lib/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface SalarySlip {
  id: string;
  employeeId: string;
  employeeName: string;
  designation: string;
  department: string;
  payrollMonth: string;
  employmentType: string;
  bankAccount: string;
  pfNumber: string;
  esiNumber: string;
  panNumber: string;
  earnings: {
    basic: number;
    da: number;
    hra: number;
    conveyance: number;
    medical: number;
    other: number;
  };
  deductions: {
    pf: number;
    esi: number;
    incomeTax: number;
    pt: number;
    other: number;
  };
  grossSalary: number;
  totalDeductions: number;
  netSalary: number;
  ytdGross: number;
  ytdDeductions: number;
  generatedDate: string;
}

interface SalarySlipListItem {
  id: string;
  employeeName: string;
  employeeId: string;
  payrollMonth: string;
  netSalary: number;
  status: 'Generated' | 'Sent' | 'Downloaded' | 'Pending';
  generatedDate: string;
}

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
  created_at?: string;
};

type EmployeeApiRow = {
  id: string;
  employee_code?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  designation?: string | null;
  department?: string | null;
  employment_type?: string | null;
  bank_account?: { accountNumber?: string } | null;
  pf_number?: string | null;
  esi_number?: string | null;
  pan?: string | null;
};

async function getAccessToken(): Promise<string | null> {
  const supabase = getSupabaseClient();
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}

export function SalarySlipScreen() {
  const [salarySlips, setSalarySlips] = useState<SalarySlipListItem[]>([]);
  const [detailedSlips, setDetailedSlips] = useState<Record<string, SalarySlip>>({});
  const [employeeMap, setEmployeeMap] = useState<Record<string, EmployeeApiRow>>({});
  const [loading, setLoading] = useState(false);

  const [selectedSlip, setSelectedSlip] = useState<SalarySlip | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));

  // Fetch employees once for statutory info lookup
  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        const accessToken = await getAccessToken();
        const headers: HeadersInit = accessToken ? { Authorization: `Bearer ${accessToken}` } : {};
        const response = await fetch('/api/employees', { method: 'GET', headers, cache: 'no-store' });
        if (!response.ok) return;
        const payload = await response.json();
        const rows: EmployeeApiRow[] = payload.employees ?? [];
        const map: Record<string, EmployeeApiRow> = {};
        for (const row of rows) {
          const code = row.employee_code?.trim();
          if (code) map[code] = row;
        }
        setEmployeeMap(map);
      } catch {
        // ignore
      }
    };
    fetchEmployees();
  }, []);

  // Fetch payroll register entries for the selected month
  useEffect(() => {
    const fetchPayrollEntries = async () => {
      setLoading(true);
      try {
        const accessToken = await getAccessToken();
        const headers: HeadersInit = accessToken ? { Authorization: `Bearer ${accessToken}` } : {};
        const response = await fetch(
          `/api/payroll-register?payrollMonth=${selectedMonth}`,
          { method: 'GET', headers, cache: 'no-store' }
        );
        if (!response.ok) {
          setSalarySlips([]);
          setDetailedSlips({});
          return;
        }
        const payload = await response.json();
        const rows: PayrollRegisterApiRow[] = payload.entries ?? [];

        const listItems: SalarySlipListItem[] = rows.map((row) => ({
          id: row.id,
          employeeName: row.employee_name,
          employeeId: row.employee_code,
          payrollMonth: row.payroll_month,
          netSalary: Number(row.net_salary ?? 0),
          status:
            row.transfer_status === 'Processed'
              ? 'Downloaded'
              : row.transfer_status === 'Cancelled'
              ? 'Pending'
              : 'Generated',
          generatedDate: row.created_at
            ? row.created_at.slice(0, 10)
            : row.payroll_month + '-25',
        }));

        const detailMap: Record<string, SalarySlip> = {};
        for (const row of rows) {
          const emp = employeeMap[row.employee_code] ?? null;
          const grossSalary = Number(row.gross_salary ?? 0);
          const totalDeductions = Number(row.total_deductions ?? 0);
          detailMap[row.id] = {
            id: row.id,
            employeeId: row.employee_code,
            employeeName: row.employee_name,
            designation: row.designation,
            department: emp?.department ?? '',
            payrollMonth: row.payroll_month,
            employmentType: emp?.employment_type ?? '',
            bankAccount: row.bank_account ?? emp?.bank_account?.accountNumber ?? '',
            pfNumber: emp?.pf_number ?? '',
            esiNumber: emp?.esi_number ?? '',
            panNumber: emp?.pan ?? '',
            earnings: {
              basic: Number(row.basic ?? 0),
              da: Number(row.da ?? 0),
              hra: Number(row.hra ?? 0),
              conveyance: Number(row.conveyance ?? 0),
              medical: Number(row.medical ?? 0),
              other: 0,
            },
            deductions: {
              pf: Number(row.pf ?? 0),
              esi: Number(row.esi ?? 0),
              incomeTax: Number(row.income_tax ?? 0),
              pt: Number(row.pt ?? 0),
              other: 0,
            },
            grossSalary,
            totalDeductions,
            netSalary: Number(row.net_salary ?? 0),
            ytdGross: grossSalary, // single-month view; YTD would require cross-month aggregation
            ytdDeductions: totalDeductions,
            generatedDate: row.created_at
              ? row.created_at.slice(0, 10)
              : row.payroll_month + '-25',
          };
        }

        setSalarySlips(listItems);
        setDetailedSlips(detailMap);
      } catch {
        setSalarySlips([]);
        setDetailedSlips({});
      } finally {
        setLoading(false);
      }
    };

    fetchPayrollEntries();
  }, [selectedMonth, employeeMap]);

  const handleDownload = async (slip: SalarySlip) => {
    const { default: jsPDF } = await import('jspdf');

    const pdf = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
    const W = pdf.internal.pageSize.getWidth();
    const margin = 40;
    const col = W / 2;
    let y = margin;

    const fmt = (n: number) => `Rs. ${n.toLocaleString('en-IN')}`;

    // ── Header ──────────────────────────────────────────────────────────
    pdf.setFillColor(22, 163, 74);
    pdf.rect(margin, y, W - margin * 2, 36, 'F');
    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(16);
    pdf.setFont('helvetica', 'bold');
    pdf.text('SALARY SLIP', margin + 10, y + 24);
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');
    pdf.text(`Pay Period: ${slip.payrollMonth}`, W - margin - 10, y + 24, { align: 'right' });
    y += 50;

    // ── Employee Details ─────────────────────────────────────────────────
    pdf.setTextColor(0, 0, 0);
    pdf.setFillColor(243, 244, 246);
    pdf.rect(margin, y, W - margin * 2, 18, 'F');
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'bold');
    pdf.text('EMPLOYEE DETAILS', margin + 6, y + 13);
    y += 24;

    const details: [string, string, string, string][] = [
      ['Employee Name', slip.employeeName,       'Employee ID',  slip.employeeId],
      ['Designation',  slip.designation,          'Department',   slip.department],
      ['PF Number',    slip.pfNumber  || '—',     'ESI Number',   slip.esiNumber  || '—'],
      ['PAN',          slip.panNumber || '—',     'Bank Account', slip.bankAccount || '—'],
    ];

    pdf.setFont('helvetica', 'normal');
    for (const [l1, v1, l2, v2] of details) {
      pdf.setFontSize(8);
      pdf.setTextColor(100, 100, 100);
      pdf.text(l1, margin + 6, y);
      pdf.text(l2, col + 6, y);
      y += 12;
      pdf.setFontSize(9);
      pdf.setTextColor(0, 0, 0);
      pdf.setFont('helvetica', 'bold');
      pdf.text(v1, margin + 6, y);
      pdf.text(v2, col + 6, y);
      pdf.setFont('helvetica', 'normal');
      y += 16;
    }
    y += 6;

    // ── Earnings & Deductions header row ────────────────────────────────
    pdf.setFillColor(240, 253, 244);
    pdf.rect(margin, y, col - margin, 18, 'F');
    pdf.setFillColor(254, 242, 242);
    pdf.rect(col, y, col - margin, 18, 'F');
    pdf.setDrawColor(209, 250, 229);
    pdf.rect(margin, y, col - margin, 18);
    pdf.setDrawColor(254, 202, 202);
    pdf.rect(col, y, col - margin, 18);
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(22, 163, 74);
    pdf.text('EARNINGS', margin + 6, y + 13);
    pdf.setTextColor(220, 38, 38);
    pdf.text('DEDUCTIONS', col + 6, y + 13);
    y += 22;

    // ── Earnings & Deductions rows ───────────────────────────────────────
    const earningsRows: [string, number][] = [
      ['Basic',      slip.earnings.basic],
      ['DA',         slip.earnings.da],
      ['HRA',        slip.earnings.hra],
      ['Conveyance', slip.earnings.conveyance],
      ['Medical',    slip.earnings.medical],
    ];
    const deductionsRows: [string, number][] = [
      ['Provident Fund', slip.deductions.pf],
      ['ESI',            slip.deductions.esi],
      ['Income Tax',     slip.deductions.incomeTax],
      ['PT',             slip.deductions.pt],
      ['Other',          slip.deductions.other],
    ];
    const rowCount = Math.max(earningsRows.length, deductionsRows.length);
    const rowH = 18;
    pdf.setFont('helvetica', 'normal');

    for (let i = 0; i < rowCount; i++) {
      if (i % 2 === 1) {
        pdf.setFillColor(249, 250, 251);
        pdf.rect(margin, y, col - margin, rowH, 'F');
        pdf.rect(col, y, col - margin, rowH, 'F');
      }
      pdf.setDrawColor(229, 231, 235);
      pdf.rect(margin, y, col - margin, rowH);
      pdf.rect(col, y, col - margin, rowH);

      pdf.setFontSize(9);
      pdf.setTextColor(0, 0, 0);

      if (earningsRows[i]) {
        pdf.text(earningsRows[i][0], margin + 6, y + 12);
        pdf.text(fmt(earningsRows[i][1]), col - margin - 6, y + 12, { align: 'right' });
      }
      if (deductionsRows[i]) {
        pdf.text(deductionsRows[i][0], col + 6, y + 12);
        pdf.text(fmt(deductionsRows[i][1]), W - margin - 6, y + 12, { align: 'right' });
      }
      y += rowH;
    }

    // Totals row
    pdf.setFillColor(240, 253, 244);
    pdf.rect(margin, y, col - margin, rowH, 'F');
    pdf.setFillColor(254, 242, 242);
    pdf.rect(col, y, col - margin, rowH, 'F');
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(22, 163, 74);
    pdf.text('GROSS', margin + 6, y + 12);
    pdf.text(fmt(slip.grossSalary), col - margin - 6, y + 12, { align: 'right' });
    pdf.setTextColor(220, 38, 38);
    pdf.text('TOTAL', col + 6, y + 12);
    pdf.text(fmt(slip.totalDeductions), W - margin - 6, y + 12, { align: 'right' });
    y += rowH + 14;

    // ── Net Salary ───────────────────────────────────────────────────────
    pdf.setFillColor(240, 253, 244);
    pdf.setDrawColor(22, 163, 74);
    pdf.roundedRect(margin, y, W - margin * 2, 34, 4, 4, 'FD');
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(0, 0, 0);
    pdf.text('NET SALARY', margin + 12, y + 22);
    pdf.setTextColor(22, 163, 74);
    pdf.setFontSize(14);
    pdf.text(fmt(slip.netSalary), W - margin - 12, y + 22, { align: 'right' });
    y += 48;

    // ── YTD Summary ──────────────────────────────────────────────────────
    pdf.setFillColor(239, 246, 255);
    pdf.roundedRect(margin, y, W - margin * 2, 46, 4, 4, 'F');
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(0, 0, 0);
    pdf.text('YTD SUMMARY', margin + 12, y + 14);
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(9);
    pdf.text('YTD Gross:', margin + 12, y + 30);
    pdf.setFont('helvetica', 'bold');
    pdf.text(fmt(slip.ytdGross), margin + 80, y + 30);
    pdf.setFont('helvetica', 'normal');
    pdf.text('YTD Deductions:', col + 12, y + 30);
    pdf.setFont('helvetica', 'bold');
    pdf.text(fmt(slip.ytdDeductions), col + 100, y + 30);
    y += 60;

    // ── Footer ───────────────────────────────────────────────────────────
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(8);
    pdf.setTextColor(150, 150, 150);
    pdf.text(`Generated on: ${slip.generatedDate}`, margin, y);

    pdf.save(`salary-slip-${slip.employeeName}-${slip.payrollMonth}.pdf`);
  };

  const handleViewSlip = (slip: SalarySlipListItem) => {
    const detailedSlip = detailedSlips[slip.id];
    if (detailedSlip) {
      setSelectedSlip(detailedSlip);
      setShowDetailModal(true);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Salary Slips</h1>
          <p className="text-sm text-muted-foreground mt-1">View, download, and email salary slips to employees</p>
        </div>
      </div>

      {/* Month Selection */}
      <div>
        <label className="text-sm font-medium">Select Month</label>
        <input
          type="month"
          value={selectedMonth}
          onChange={(e) => setSelectedMonth(e.target.value)}
          className="mt-1 px-3 py-2 border border-border rounded-lg w-48"
        />
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white border border-border rounded-lg p-4">
          <p className="text-sm text-muted-foreground">Total Slips</p>
          <p className="text-2xl font-bold">{salarySlips.length}</p>
        </div>
        <div className="bg-white border border-border rounded-lg p-4">
          <p className="text-sm text-muted-foreground">Generated</p>
          <p className="text-2xl font-bold text-green-600">{salarySlips.filter(s => s.status === 'Generated').length}</p>
        </div>
        <div className="bg-white border border-border rounded-lg p-4">
          <p className="text-sm text-muted-foreground">Sent</p>
          <p className="text-2xl font-bold text-blue-600">{salarySlips.filter(s => s.status === 'Sent').length}</p>
        </div>
        <div className="bg-white border border-border rounded-lg p-4">
          <p className="text-sm text-muted-foreground">Total Net</p>
          <p className="text-2xl font-bold">₹{(salarySlips.reduce((sum, s) => sum + s.netSalary, 0) / 100000).toFixed(1)}L</p>
        </div>
      </div>

      {/* Salary Slips List */}
      <div className="bg-white border border-border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gradient-to-r from-muted/40 to-muted/20 border-b">
                <th className="px-4 py-3 text-left font-semibold">Employee</th>
                <th className="px-4 py-3 text-left font-semibold">ID</th>
                <th className="px-4 py-3 text-left font-semibold">Month</th>
                <th className="px-4 py-3 text-right font-semibold">Net Salary</th>
                <th className="px-4 py-3 text-left font-semibold">Generated</th>
                <th className="px-4 py-3 text-center font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">Loading...</td>
                </tr>
              ) : salarySlips.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">No salary slips found for this month.</td>
                </tr>
              ) : (
                salarySlips.map((slip) => (
                  <tr key={slip.id} className="border-b hover:bg-muted/50">
                    <td className="px-4 py-3 font-medium">{slip.employeeName}</td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">{slip.employeeId}</td>
                    <td className="px-4 py-3">{slip.payrollMonth}</td>
                    <td className="px-4 py-3 text-right font-bold text-green-600">₹{slip.netSalary.toLocaleString()}</td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">{slip.generatedDate}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2 justify-center">
                        <button
                          onClick={() => handleViewSlip(slip)}
                          className="p-1 hover:bg-muted rounded"
                          title="View Details"
                        >
                          <Eye size={16} className="text-muted-foreground" />
                        </button>
                        <button
                          onClick={() => {
                            const detailedSlip = detailedSlips[slip.id];
                            if (detailedSlip) handleDownload(detailedSlip);
                          }}
                          className="p-1 hover:bg-muted rounded"
                          title="Download"
                        >
                          <Download size={16} className="text-muted-foreground" />
                        </button>
                        <button
                          className="p-1 hover:bg-muted rounded"
                          title="Send Email"
                        >
                          <Mail size={16} className="text-muted-foreground" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail Modal */}
      {selectedSlip && (
        <Dialog open={showDetailModal} onOpenChange={setShowDetailModal}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Salary Slip - {selectedSlip.employeeName} ({selectedSlip.payrollMonth})</DialogTitle>
            </DialogHeader>

            {/* Slip Content */}
            <div className="bg-gray-50 p-6 rounded-lg border border-border space-y-4">
              {/* Header */}
              <div className="border-b pb-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Employee Name</p>
                    <p className="font-semibold">{selectedSlip.employeeName}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Employee ID</p>
                    <p className="font-semibold">{selectedSlip.employeeId}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Designation</p>
                    <p className="font-semibold">{selectedSlip.designation}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Department</p>
                    <p className="font-semibold">{selectedSlip.department}</p>
                  </div>
                </div>
              </div>

              {/* Statutory Info */}
              <div className="border-b pb-4">
                <p className="font-semibold mb-2 text-sm">Statutory Information</p>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">PF Number</p>
                    <p className="font-medium">{selectedSlip.pfNumber}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">ESI Number</p>
                    <p className="font-medium">{selectedSlip.esiNumber}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">PAN</p>
                    <p className="font-medium">{selectedSlip.panNumber}</p>
                  </div>
                </div>
              </div>

              {/* Earnings & Deductions */}
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <p className="font-semibold mb-2 text-sm">EARNINGS</p>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between"><span>Basic</span><span>₹{selectedSlip.earnings.basic.toLocaleString()}</span></div>
                    <div className="flex justify-between"><span>DA</span><span>₹{selectedSlip.earnings.da.toLocaleString()}</span></div>
                    <div className="flex justify-between"><span>HRA</span><span>₹{selectedSlip.earnings.hra.toLocaleString()}</span></div>
                    <div className="flex justify-between"><span>Conveyance</span><span>₹{selectedSlip.earnings.conveyance.toLocaleString()}</span></div>
                    <div className="flex justify-between"><span>Medical</span><span>₹{selectedSlip.earnings.medical.toLocaleString()}</span></div>
                    <div className="border-t pt-1 flex justify-between font-bold"><span>GROSS</span><span>₹{selectedSlip.grossSalary.toLocaleString()}</span></div>
                  </div>
                </div>
                <div>
                  <p className="font-semibold mb-2 text-sm">DEDUCTIONS</p>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between"><span>PF</span><span>₹{selectedSlip.deductions.pf.toLocaleString()}</span></div>
                    <div className="flex justify-between"><span>ESI</span><span>₹{selectedSlip.deductions.esi.toLocaleString()}</span></div>
                    <div className="flex justify-between"><span>Income Tax</span><span>₹{selectedSlip.deductions.incomeTax.toLocaleString()}</span></div>
                    <div className="flex justify-between"><span>PT</span><span>₹{selectedSlip.deductions.pt.toLocaleString()}</span></div>
                    <div className="border-t pt-1 flex justify-between font-bold"><span>TOTAL</span><span>₹{selectedSlip.totalDeductions.toLocaleString()}</span></div>
                  </div>
                </div>
              </div>

              {/* Net Salary */}
              <div className="bg-white p-3 rounded border-2 border-green-200">
                <div className="flex justify-between items-center">
                  <span className="font-semibold">NET SALARY</span>
                  <span className="text-2xl font-bold text-green-600">₹{selectedSlip.netSalary.toLocaleString()}</span>
                </div>
              </div>

              {/* YTD Summary */}
              <div className="bg-blue-50 p-3 rounded">
                <p className="font-semibold mb-2 text-sm">YTD Summary</p>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="flex justify-between"><span>YTD Gross</span><span className="font-medium">₹{selectedSlip.ytdGross.toLocaleString()}</span></div>
                  <div className="flex justify-between"><span>YTD Deductions</span><span className="font-medium">₹{selectedSlip.ytdDeductions.toLocaleString()}</span></div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 justify-end pt-4">
              <Button variant="outline" onClick={() => setShowDetailModal(false)}>Close</Button>
              <Button onClick={() => window.print()} className="gap-2">
                <Printer size={18} />
                Print
              </Button>
              <Button onClick={() => {
                if (selectedSlip) handleDownload(selectedSlip);
              }} className="gap-2">
                <Download size={18} />
                Download
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
