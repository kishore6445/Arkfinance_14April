'use client';

import { useAppState } from '@/context/app-state';
import { Download, Edit, Share2, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useRouter } from 'next/navigation';
import { useRef } from 'react';
// html2pdf will be loaded dynamically

export default function InvoiceDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { state } = useAppState();
  const previewRef = useRef<HTMLDivElement>(null);

  // Find the invoice from state
  const invoice = state.invoices.find(inv => inv.id === params.id);

  if (!invoice) {
    return (
      <div className="p-6">
        <p className="text-slate-600">Invoice not found</p>
        <Button onClick={() => router.back()} className="mt-4">Back</Button>
      </div>
    );
  }

  // Calculate GST (assumed 18% for demo)
  const GST_RATE = 0.18;
  const subtotal = invoice.invoiceAmount / (1 + GST_RATE);
  const gstAmount = invoice.invoiceAmount - subtotal;

  const handleDownloadPDF = async () => {
    if (!previewRef.current) return;

    // Dynamically import html2pdf
    const html2pdf = (await import('html2pdf.js')).default;

    const element = previewRef.current;
    const opt = {
      margin: 10,
      filename: `${invoice.invoiceNo}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2 },
      jsPDF: { orientation: 'portrait', unit: 'mm', format: 'a4' },
    };

    html2pdf().set(opt).from(element).save();
  };

  const handleShare = async () => {
    const text = `Invoice ${invoice.invoiceNo} from ${state.organization?.name || 'Company'}. Amount: ₹${(invoice.invoiceAmount / 100000).toFixed(2)}L. Due: ${invoice.dueDate}`;
    
    if (navigator.share) {
      navigator.share({
        title: `Invoice ${invoice.invoiceNo}`,
        text,
        url: window.location.href,
      });
    } else {
      // Fallback: copy to clipboard
      navigator.clipboard.writeText(`${invoice.invoiceNo}\n${text}`);
      alert('Invoice details copied to clipboard');
    }
  };

  const handleEdit = () => {
    router.push(`/invoices/${params.id}/edit`);
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.back()}
              className="hover:bg-slate-200"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-slate-900">Invoice {invoice.invoiceNo}</h1>
              <p className="text-sm text-slate-600 mt-1">
                Party: {invoice.partyName} • Status: <span className={`font-semibold ${invoice.status === 'Paid' ? 'text-green-600' : invoice.status === 'Overdue' ? 'text-red-600' : 'text-yellow-600'}`}>{invoice.status}</span>
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleShare}
              className="flex items-center gap-2"
            >
              <Share2 className="w-4 h-4" />
              Share
            </Button>
            <Button
              variant="outline"
              onClick={handleEdit}
              className="flex items-center gap-2"
            >
              <Edit className="w-4 h-4" />
              Edit
            </Button>
            <Button
              onClick={handleDownloadPDF}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700"
            >
              <Download className="w-4 h-4" />
              Download PDF
            </Button>
          </div>
        </div>

        {/* Invoice Preview */}
        <Card className="p-0 bg-white shadow-lg">
          <div ref={previewRef} className="p-12 space-y-6 bg-white print:p-0">
            {/* Company Header */}
            <div className="text-center border-b-2 border-slate-400 pb-6">
              <h2 className="text-4xl font-bold text-slate-900 mb-1">{state.organization?.name || 'COMPANY NAME'}</h2>
              <p className="text-sm text-slate-700 mb-1">{state.organization?.address || '132 STREET, CITY, STATE - PIN'}</p>
              <p className="text-sm text-slate-700 mb-1">GSTIN: {state.organization?.gstinNo || 'AAA213465'}</p>
              <p className="text-sm text-slate-700 mb-1">Email ID: {state.organization?.email || 'contact@company.com'}</p>
              <p className="text-sm text-slate-700">PAN NO. {state.organization?.panNo || 'AAA132456'}</p>
            </div>

            {/* Bill To Section */}
            <div className="grid grid-cols-2 gap-6 border border-slate-400 p-4">
              <div className="bg-blue-50 p-4 border border-slate-300">
                <h3 className="font-bold text-slate-900 mb-2">Bill To:</h3>
                <p className="font-semibold text-slate-900">{invoice.partyName}</p>
                <p className="text-sm text-slate-600 mt-1">PARTY NAME -</p>
                <p className="text-sm text-slate-600">ADDRESS:</p>
                <p className="text-sm text-slate-600 font-semibold mt-1">132 STREET, CITY, STATE - 132456</p>
                <p className="text-sm text-slate-600">Email ID: abc@gmail.com</p>
                <p className="text-sm text-slate-600">GSTIN: 07AAFD8457JU3</p>
              </div>
              <div className="bg-blue-50 p-4 border border-slate-300">
                <p className="text-sm font-semibold text-slate-600">Payment Due Date:</p>
                <p className="text-lg font-bold text-slate-900">{new Date(invoice.dueDate).toLocaleDateString('en-IN')}</p>
                <p className="text-sm font-semibold text-slate-600 mt-4">Payment Mode:</p>
                <p className="text-sm text-slate-600">Bank Transfer</p>
              </div>
            </div>

            {/* Items Table */}
            <div>
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border border-slate-400">
                    <th className="border border-slate-400 p-3 text-left text-sm font-bold bg-slate-100">Description</th>
                    <th className="border border-slate-400 p-3 text-left text-sm font-bold bg-slate-100">HSN Code</th>
                    <th className="border border-slate-400 p-3 text-center text-sm font-bold bg-slate-100">Qty</th>
                    <th className="border border-slate-400 p-3 text-right text-sm font-bold bg-slate-100">Rate</th>
                    <th className="border border-slate-400 p-3 text-right text-sm font-bold bg-slate-100">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border border-slate-400">
                    <td className="border border-slate-400 p-3 text-sm">Invoice for Services Rendered</td>
                    <td className="border border-slate-400 p-3 text-sm text-center">—</td>
                    <td className="border border-slate-400 p-3 text-sm text-center">1</td>
                    <td className="border border-slate-400 p-3 text-sm text-right">₹{subtotal.toLocaleString('en-IN')}</td>
                    <td className="border border-slate-400 p-3 text-sm text-right">₹{subtotal.toLocaleString('en-IN')}</td>
                  </tr>
                  <tr className="border border-slate-400 bg-slate-50">
                    <td colSpan={4} className="border border-slate-400 p-3 text-right font-bold">Total</td>
                    <td className="border border-slate-400 p-3 text-right font-bold">₹{subtotal.toLocaleString('en-IN')}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Terms & Totals */}
            <div className="grid grid-cols-2 gap-6">
              <div className="border border-slate-400 p-4">
                <h4 className="font-bold text-slate-900 mb-2">Terms & conditions</h4>
                <ol className="text-sm text-slate-700 space-y-1 list-decimal list-inside">
                  <li>Payment due within 30 days of invoice date</li>
                  <li>Please quote invoice number when making payment</li>
                  <li>Late payments subject to interest charges</li>
                  <li>All prices are final and non-refundable</li>
                  <li>Disputes must be raised within 15 days</li>
                </ol>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between border border-slate-400 p-3">
                  <span className="font-semibold text-slate-600">Subtotal</span>
                  <span className="font-bold text-slate-900">₹{subtotal.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between border border-slate-400 p-3">
                  <span className="font-semibold text-slate-600">Add : CGST @ 18%</span>
                  <span className="font-bold text-slate-900">₹{(gstAmount / 2).toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between border border-slate-400 p-3">
                  <span className="font-semibold text-slate-600">Add : SGST @ 18%</span>
                  <span className="font-bold text-slate-900">₹{(gstAmount / 2).toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between border-l-4 border-slate-400 bg-slate-900 text-white p-3">
                  <span className="font-bold">Grand Total</span>
                  <span className="text-lg font-bold">₹{invoice.invoiceAmount.toLocaleString('en-IN')}</span>
                </div>

                <div className="border border-slate-400 p-3 bg-slate-50">
                  <p className="text-xs text-slate-500 mb-1">Balance Received :</p>
                  <p className="font-bold text-slate-900">-</p>
                </div>

                <div className="border border-slate-400 p-3">
                  <p className="text-xs text-slate-500 mb-1">Balance Due :</p>
                  <p className={`text-lg font-bold ${invoice.status === 'Paid' ? 'text-green-600' : 'text-red-600'}`}>
                    ₹{invoice.balanceDue.toLocaleString('en-IN')}
                  </p>
                </div>
              </div>
            </div>

            {/* Total in Words */}
            <div className="border-t-2 border-b-2 border-slate-400 p-3 bg-slate-50">
              <p className="text-xs font-semibold text-slate-600 uppercase">Total Amount (₹ - In Words):</p>
              <p className="font-semibold text-slate-900">
                {convertNumberToWords(invoice.invoiceAmount)} Rupees Only
              </p>
            </div>

            {/* Signature Section */}
            <div className="flex justify-end pt-6 border-t border-slate-300">
              <div className="text-center">
                <p className="text-sm text-slate-600 mb-8">Authorized Signatory</p>
                <p className="text-sm font-semibold text-slate-900">For : {state.organization?.name || 'COMPANY NAME'}</p>
              </div>
            </div>
          </div>
        </Card>

        {/* Footer Actions */}
        <div className="mt-6 flex gap-3 justify-center">
          <Button
            variant="outline"
            onClick={() => router.back()}
            className="px-6"
          >
            Back to Invoices
          </Button>
          <Button
            onClick={handleDownloadPDF}
            className="px-6 bg-green-600 hover:bg-green-700"
          >
            Download & Print
          </Button>
        </div>
      </div>
    </div>
  );
}

// Helper function to convert number to words
function convertNumberToWords(num: number): string {
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];

  function convert(n: number): string {
    if (n === 0) return '';
    if (n < 10) return ones[n];
    if (n < 20) return teens[n - 10];
    if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 ? ' ' + ones[n % 10] : '');
    if (n < 1000) return ones[Math.floor(n / 100)] + ' Hundred' + (n % 100 ? ' ' + convert(n % 100) : '');
    if (n < 100000) return convert(Math.floor(n / 1000)) + ' Thousand' + (n % 1000 ? ' ' + convert(n % 1000) : '');
    if (n < 10000000) return convert(Math.floor(n / 100000)) + ' Lakh' + (n % 100000 ? ' ' + convert(n % 100000) : '');
    return convert(Math.floor(n / 10000000)) + ' Crore' + (n % 10000000 ? ' ' + convert(n % 10000000) : '');
  }

  return convert(num);
}
