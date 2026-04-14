'use client';

import { useCallback, useEffect, useState } from 'react';
import { CheckCircle2, Upload } from 'lucide-react';
import { getSupabaseClient } from '@/lib/supabase/client';

interface InboxTransaction {
  id: string;
  date: string;
  description: string;
  amount: number;
  isIncome: boolean;
  status: 'Recorded' | 'Needs Info' | 'Action Required';
  paymentStatus?: 'Recorded' | 'Pending Payment' | 'Partially Paid' | 'Paid';
  reconciliationStatus?: 'Unreconciled' | 'Reconciled' | 'Flagged' | string;
  bankDate?: string;
  bankAccountId?: string | null;
}

interface StatementRow {
  id: string;
  date: string;
  description: string;
  amount: number;
  type: 'credit' | 'debit';
  reference?: string;
}

interface StatementParseResult {
  rows: StatementRow[];
  error: string | null;
  diagnostics?: string[];
}

interface BankAccountOption {
  id: string;
  accountName: string;
}

async function getAccessToken(): Promise<string> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.auth.getSession();
  if (error) throw new Error(error.message);
  const token = data.session?.access_token;
  if (!token) throw new Error('Missing session token. Please sign in again.');
  return token;
}

export function BankReconciliationScreen() {
  const [selectedAccount, setSelectedAccount] = useState<string>('');
  const [selectedPeriod, setSelectedPeriod] = useState<string>('');

  const [bankAccounts, setBankAccounts] = useState<BankAccountOption[]>([]);
  const [inboxTransactions, setInboxTransactions] = useState<InboxTransaction[]>([]);
  const [periods, setPeriods] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isReconciling, setIsReconciling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reconciliationMessage, setReconciliationMessage] = useState<string | null>(null);
  const [uploadedStatementRows, setUploadedStatementRows] = useState<StatementRow[]>([]);
  const [suggestedMatches, setSuggestedMatches] = useState<Record<string, InboxTransaction | null>>({});
  const [selectedStatementIds, setSelectedStatementIds] = useState<string[]>([]);
  const [reconciledStatementIds, setReconciledStatementIds] = useState<string[]>([]);

  // Load bank accounts for the account selector
  useEffect(() => {
    const load = async () => {
      try {
        const token = await getAccessToken();
        const res = await fetch('/api/bank-accounts', { headers: { Authorization: `Bearer ${token}` } });
        const result = await res.json();
        if (!res.ok) throw new Error(result?.error ?? 'Failed to load bank accounts.');
        const accounts: BankAccountOption[] = (result.accounts ?? []).map((a: any) => ({
          id: a.id,
          accountName: a.account_name,
        }));
        setBankAccounts(accounts);
      } catch (err: any) {
        setError(err?.message ?? 'Failed to load bank accounts.');
      }
    };
    void load();
  }, []);

  // Load transactions from API and derive bank + inbox lists
  const loadTransactions = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const token = await getAccessToken();
      const res = await fetch('/api/transactions', { headers: { Authorization: `Bearer ${token}` } });
      const result = await res.json();
      if (!res.ok) throw new Error(result?.error ?? 'Failed to load transactions.');

      const raw: any[] = result.transactions ?? result.data ?? [];

      // Build available periods (YYYY-MM) from transaction dates
      const periodSet = new Set<string>(raw.map((t) => (t.date as string).substring(0, 7)));
      const sortedPeriods = Array.from(periodSet).sort().reverse();
      setPeriods(sortedPeriods);

      // Recorded (inbox) transactions — all transactions in system
      const inbox: InboxTransaction[] = raw.map((t) => ({
        id: t.id,
        date: new Date(t.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
        description: t.description,
        amount: t.amount,
        isIncome: t.is_income ?? t.isIncome,
        status: (t.status === 'Recorded' || t.status === 'Needs Info' || t.status === 'Action Required')
          ? t.status
          : 'Recorded',
        paymentStatus: t.payment_status,
        reconciliationStatus: t.reconciliation_status,
        bankDate: t.date,
        bankAccountId: t.bank_account_id ?? t.bankAccountId ?? t.assigned_bank_account_id ?? null,
      }));
      setInboxTransactions(inbox);
    } catch (err: any) {
      setError(err?.message ?? 'Failed to load transactions.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { void loadTransactions(); }, [loadTransactions]);

  // Filter by selected account and period
  const filteredInbox = inboxTransactions.filter((t) => {
    const periodMatch = !selectedPeriod || (t.bankDate ?? '').startsWith(selectedPeriod);
    const accountMatch = !selectedAccount || (t.bankAccountId ?? '') === selectedAccount;
    const recordedMatch = t.status === 'Recorded';
    return periodMatch && accountMatch && recordedMatch;
  });
  const matchedCount = filteredInbox.filter((t) => t.reconciliationStatus === 'Reconciled').length;
  const pendingCount = filteredInbox.filter((t) => t.reconciliationStatus !== 'Reconciled').length;
  const unmatchedCount = Math.max(0, uploadedStatementRows.length - matchedCount);
  const matchPercentage = uploadedStatementRows.length > 0
    ? Math.round((matchedCount / uploadedStatementRows.length) * 100)
    : 0;

  const getCandidatePool = useCallback(() => {
    return inboxTransactions.filter((txn) => {
      const accountMatch = !selectedAccount || (txn.bankAccountId ?? '') === selectedAccount;
      const periodMatch = !selectedPeriod || (txn.bankDate ?? '').startsWith(selectedPeriod);
      const recordedMatch = txn.status === 'Recorded';
      const notAlreadyReconciled = txn.reconciliationStatus !== 'Reconciled';
      return accountMatch && periodMatch && recordedMatch && notAlreadyReconciled;
    });
  }, [inboxTransactions, selectedAccount, selectedPeriod]);

  const parseDateToIso = (value: string) => {
    const trimmed = value.trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
      return trimmed;
    }

    const slashMatch = trimmed.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{2,4})$/);
    if (slashMatch) {
      const day = slashMatch[1].padStart(2, '0');
      const month = slashMatch[2].padStart(2, '0');
      const year = slashMatch[3].length === 2 ? `20${slashMatch[3]}` : slashMatch[3];
      return `${year}-${month}-${day}`;
    }

    const parsed = new Date(trimmed);
    if (Number.isNaN(parsed.getTime())) {
      return null;
    }

    return parsed.toISOString().slice(0, 10);
  };

  const parseAmount = (value: string) => {
    const numeric = Number.parseFloat(value.replace(/,/g, '').trim());
    return Number.isFinite(numeric) ? numeric : null;
  };

  const normalizeText = (value: string) =>
    value
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

  const dateDiffInDays = (a: string, b: string) => {
    const aDate = new Date(a);
    const bDate = new Date(b);
    if (Number.isNaN(aDate.getTime()) || Number.isNaN(bDate.getTime())) {
      return Number.POSITIVE_INFINITY;
    }

    const ms = Math.abs(aDate.getTime() - bDate.getTime());
    return Math.floor(ms / (1000 * 60 * 60 * 24));
  };

  const splitCsvLine = (line: string, delimiter: string) => {
    const cells: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let index = 0; index < line.length; index++) {
      const char = line[index];
      const nextChar = line[index + 1];

      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          current += '"';
          index++;
        } else {
          inQuotes = !inQuotes;
        }
        continue;
      }

      if (char === delimiter && !inQuotes) {
        cells.push(current.trim());
        current = '';
        continue;
      }

      current += char;
    }

    cells.push(current.trim());
    return cells;
  };

  const detectDelimiter = (headerLine: string) => {
    const candidates = [',', ';', '\t'];
    let bestDelimiter = ',';
    let bestCount = -1;

    for (const candidate of candidates) {
      const count = splitCsvLine(headerLine, candidate).length;
      if (count > bestCount) {
        bestDelimiter = candidate;
        bestCount = count;
      }
    }

    return bestDelimiter;
  };

  const DATE_HEADER_ALIASES = [
    'date',
    'transaction date',
    'txn date',
    'value date',
    'posted date',
    'booking date',
    'entry date',
  ];

  const DESCRIPTION_HEADER_ALIASES = [
    'description',
    'narration',
    'remarks',
    'remark',
    'particulars',
    'details',
    'transaction details',
    'transaction remarks',
    'payment details',
    'transaction description',
  ];

  const AMOUNT_HEADER_ALIASES = [
    'amount',
    'transaction amount',
    'amount inr',
    'amount rs',
    'amt',
  ];

  const CREDIT_HEADER_ALIASES = [
    'credit',
    'credit amount',
    'deposit',
    'deposit amount',
    'paid in',
    'amount cr',
    'cr amount',
  ];

  const DEBIT_HEADER_ALIASES = [
    'debit',
    'debit amount',
    'withdrawal',
    'withdrawal amount',
    'withdraw',
    'amount dr',
    'dr amount',
  ];

  const REFERENCE_HEADER_ALIASES = [
    'reference',
    'ref',
    'reference no',
    'reference number',
    'transaction id',
    'utr',
    'rrn',
    'cheque no',
    'check no',
    'chq no',
  ];

  const headerMatchesAlias = (header: string, aliases: string[]) => {
    const normalizedHeader = normalizeText(header);
    return aliases.some((alias) => {
      const normalizedAlias = normalizeText(alias);
      return normalizedHeader === normalizedAlias || normalizedHeader.includes(normalizedAlias);
    });
  };

  const findColumnIndex = (headers: string[], aliases: string[]) =>
    headers.findIndex((header) => headerMatchesAlias(header, aliases));

  const analyzeHeaderRow = (line: string) => {
    const delimiter = detectDelimiter(line);
    const headers = splitCsvLine(line, delimiter).map((header) => header.trim());
    const normalizedHeaders = headers.map((header) => normalizeText(header));

    const dateIdx = findColumnIndex(normalizedHeaders, DATE_HEADER_ALIASES);
    const descIdx = findColumnIndex(normalizedHeaders, DESCRIPTION_HEADER_ALIASES);
    const amountIdx = findColumnIndex(normalizedHeaders, AMOUNT_HEADER_ALIASES);
    const creditIdx = findColumnIndex(normalizedHeaders, CREDIT_HEADER_ALIASES);
    const debitIdx = findColumnIndex(normalizedHeaders, DEBIT_HEADER_ALIASES);
    const refIdx = findColumnIndex(normalizedHeaders, REFERENCE_HEADER_ALIASES);

    let score = 0;
    if (dateIdx >= 0) score += 2;
    if (descIdx >= 0) score += 2;
    if (amountIdx >= 0) score += 2;
    if (creditIdx >= 0) score += 1;
    if (debitIdx >= 0) score += 1;
    if (refIdx >= 0) score += 1;

    return {
      delimiter,
      headers,
      normalizedHeaders,
      dateIdx,
      descIdx,
      amountIdx,
      creditIdx,
      debitIdx,
      refIdx,
      score,
    };
  };

  const parseCsvStatement = (text: string): StatementParseResult => {
    const lines = text
      .split(/\r?\n/)
      .map((line) => line.replace(/^\uFEFF/, '').trim())
      .filter(Boolean);

    if (lines.length < 2) {
      return {
        rows: [],
        error: 'The uploaded file is empty or does not contain any statement rows.',
        diagnostics: ['Expected a header row and at least one transaction row.'],
      };
    }

    const headerCandidates = lines
      .slice(0, Math.min(lines.length, 10))
      .map((line, index) => ({ index, analysis: analyzeHeaderRow(line) }))
      .sort((left, right) => right.analysis.score - left.analysis.score);

    const bestCandidate = headerCandidates[0];

    if (!bestCandidate || bestCandidate.analysis.score < 4) {
      return {
        rows: [],
        error: 'The CSV format could not be recognized.',
        diagnostics: [
          'Could not find a usable header row in the first 10 lines of the file.',
          'Supported columns include Date, Transaction Date, Value Date, Description, Narration, Remarks, Particulars, Amount, Credit, Debit, Deposit, and Withdrawal.',
        ],
      };
    }

    const {
      delimiter,
      headers,
      normalizedHeaders,
      dateIdx,
      descIdx,
      amountIdx,
      creditIdx,
      debitIdx,
      refIdx,
    } = bestCandidate.analysis;
    const headerRowIndex = bestCandidate.index;

    const diagnostics: string[] = [];

    if (dateIdx < 0) diagnostics.push('Missing date column. Use a header like Date or Transaction Date.');
    if (descIdx < 0) diagnostics.push('Missing description column. Use Description, Narration, Remarks, or Particulars.');
    if (amountIdx < 0 && creditIdx < 0 && debitIdx < 0) {
      diagnostics.push('Missing amount columns. Use either Amount or separate Credit and Debit or Deposit and Withdrawal columns.');
    }

    if (diagnostics.length > 0) {
      return {
        rows: [],
        error: 'The CSV format could not be recognized.',
        diagnostics: [
          `Detected header row: ${headerRowIndex + 1}.`,
          `Detected delimiter: ${delimiter === '\t' ? 'tab' : delimiter}.`,
          `Headers found: ${headers.join(', ') || 'none'}.`,
          ...diagnostics,
        ],
      };
    }

    const rows: StatementRow[] = [];
    let invalidRows = 0;
    for (let i = headerRowIndex + 1; i < lines.length; i++) {
      const cols = splitCsvLine(lines[i], delimiter);
      const isoDate = dateIdx >= 0 ? parseDateToIso(cols[dateIdx] ?? '') : null;
      const description = descIdx >= 0 ? cols[descIdx] ?? '' : '';
      const reference = refIdx >= 0 ? cols[refIdx] ?? '' : '';

      let amount: number | null = null;
      let type: 'credit' | 'debit' = 'debit';

      if (creditIdx >= 0 || debitIdx >= 0) {
        const credit = creditIdx >= 0 ? parseAmount(cols[creditIdx] ?? '') : null;
        const debit = debitIdx >= 0 ? parseAmount(cols[debitIdx] ?? '') : null;
        if (credit && credit > 0) {
          amount = credit;
          type = 'credit';
        } else if (debit && debit > 0) {
          amount = debit;
          type = 'debit';
        }
      }

      if (amount === null && amountIdx >= 0) {
        const parsedAmount = parseAmount(cols[amountIdx] ?? '');
        if (parsedAmount !== null) {
          amount = Math.abs(parsedAmount);
          type = parsedAmount >= 0 ? 'credit' : 'debit';
        }
      }

      if (!isoDate || !description || amount === null || amount <= 0) {
        invalidRows++;
        continue;
      }

      rows.push({
        id: `stmt-${i}-${Date.now()}`,
        date: isoDate,
        description,
        amount,
        type,
        reference,
      });
    }

    if (rows.length === 0) {
      return {
        rows: [],
        error: 'No valid rows could be parsed from the uploaded CSV.',
        diagnostics: [
          `Detected header row: ${headerRowIndex + 1}.`,
          `Detected delimiter: ${delimiter === '\t' ? 'tab' : delimiter}.`,
          `Headers found: ${normalizedHeaders.join(', ')}.`,
          `Ignored ${invalidRows} invalid row(s).`,
          'Check that each row has a valid date, description, and amount.',
        ],
      };
    }

    return {
      rows,
      error: null,
      diagnostics: [
        `Detected header row: ${headerRowIndex + 1}.`,
        `Parsed ${rows.length} valid row(s). Ignored ${invalidRows} invalid row(s).`,
      ],
    };
  };

  const updateReconciliationOnTransaction = async (
    txn: InboxTransaction,
    statementRef: string
  ) => {
    const token = await getAccessToken();
    const response = await fetch('/api/transactions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        transaction: {
          id: txn.id,
          payment_status: txn.paymentStatus || 'Recorded',
          reconciliation_status: 'Reconciled',
          bank_statement_reference: statementRef,
        },
      }),
    });

    const result = await response.json();
    if (!response.ok) {
      throw new Error(result?.error ?? `Failed to reconcile transaction ${txn.id}`);
    }
  };

  const buildSuggestedMatches = useCallback((rows: StatementRow[]) => {
    const candidatePool = getCandidatePool();
    const usedTransactionIds = new Set<string>();
    const nextSuggestions: Record<string, InboxTransaction | null> = {};

    for (const stmt of rows) {
      const stmtDescription = normalizeText(stmt.description);

      const candidate = candidatePool
        .filter((txn) => {
          if (usedTransactionIds.has(txn.id)) return false;

          const amountMatch = Math.abs(txn.amount - stmt.amount) <= 1;
          const typeMatch = txn.isIncome === (stmt.type === 'credit');
          if (!amountMatch || !typeMatch) {
            return false;
          }

          const daysDiff = dateDiffInDays(txn.bankDate ?? '', stmt.date);
          return Number.isFinite(daysDiff) && daysDiff <= 3;
        })
        .sort((a, b) => {
          const aDateDiff = dateDiffInDays(a.bankDate ?? '', stmt.date);
          const bDateDiff = dateDiffInDays(b.bankDate ?? '', stmt.date);
          if (aDateDiff !== bDateDiff) {
            return aDateDiff - bDateDiff;
          }

          const aDesc = normalizeText(a.description);
          const bDesc = normalizeText(b.description);
          const aDescScore = stmtDescription && aDesc.includes(stmtDescription) ? 1 : 0;
          const bDescScore = stmtDescription && bDesc.includes(stmtDescription) ? 1 : 0;
          return bDescScore - aDescScore;
        })[0] ?? null;

      if (candidate) {
        usedTransactionIds.add(candidate.id);
      }
      nextSuggestions[stmt.id] = candidate;
    }

    setSuggestedMatches(nextSuggestions);
    setSelectedStatementIds(rows.filter((stmt) => nextSuggestions[stmt.id]).map((stmt) => stmt.id));
  }, [getCandidatePool]);

  useEffect(() => {
    if (uploadedStatementRows.length === 0) {
      setSuggestedMatches({});
      setSelectedStatementIds([]);
      setReconciledStatementIds([]);
      return;
    }

    buildSuggestedMatches(uploadedStatementRows);
  }, [uploadedStatementRows, buildSuggestedMatches]);

  const handleManualReconcile = async () => {
    if (selectedStatementIds.length === 0) {
      setError('Select at least one statement transaction to reconcile.');
      return;
    }

    setIsReconciling(true);
    setError(null);
    setReconciliationMessage(null);

    try {
      let matched = 0;
      const reconciledIds: string[] = [];
      for (const statementId of selectedStatementIds) {
        const statementRow = uploadedStatementRows.find((row) => row.id === statementId);
        const matchedTransaction = suggestedMatches[statementId];

        if (!statementRow || !matchedTransaction) {
          continue;
        }

        await updateReconciliationOnTransaction(
          matchedTransaction,
          statementRow.reference || statementRow.description
        );
        matched++;
        reconciledIds.push(statementId);
      }

      if (reconciledIds.length > 0) {
        setReconciledStatementIds((prev) => Array.from(new Set([...prev, ...reconciledIds])));
      }
      setSelectedStatementIds((prev) => prev.filter((id) => !reconciledIds.includes(id)));

      setReconciliationMessage(
        matched > 0
          ? `Manual reconciliation completed. ${matched} transaction(s) reconciled.`
          : 'No selected rows could be reconciled. Try re-uploading or adjusting filters.'
      );

      await loadTransactions();
      buildSuggestedMatches(uploadedStatementRows);
    } catch (err: any) {
      setError(err?.message ?? 'Failed to reconcile selected statement transactions.');
    } finally {
      setIsReconciling(false);
    }
  };

  const handleStatementUpload = async (file: File | null) => {
    if (!file) {
      return;
    }

    const fileName = file.name.toLowerCase();
    const isCsv = fileName.endsWith('.csv');
    const isExcel = fileName.endsWith('.xlsx') || fileName.endsWith('.xls');

    if (!isCsv && !isExcel) {
      setError('Please upload a CSV or Excel statement file (.csv, .xlsx, or .xls).');
      return;
    }

    let content = '';

    try {
      if (isExcel) {
        const XLSX = await import('xlsx');
        const buffer = await file.arrayBuffer();
        const workbook = XLSX.read(buffer, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];

        if (!firstSheetName) {
          setError('The uploaded Excel file does not contain any worksheets.');
          return;
        }

        const sheet = workbook.Sheets[firstSheetName];
        content = XLSX.utils.sheet_to_csv(sheet, { blankrows: false });
      } else {
        content = await file.text();
      }
    } catch (uploadError: any) {
      setError(uploadError?.message ?? 'Failed to read the uploaded statement file.');
      return;
    }

    const parseResult = parseCsvStatement(content);
    if (parseResult.error) {
      const details = parseResult.diagnostics?.length ? ` ${parseResult.diagnostics.join(' ')}` : '';
      setError(`${parseResult.error}${details}`);
      return;
    }

    const parsedRows = parseResult.rows;
    setUploadedStatementRows(parsedRows);
    setError(null);
    setReconciledStatementIds([]);

    const parseNote = parseResult.diagnostics?.[0] ? ` ${parseResult.diagnostics[0]}` : '';
    setReconciliationMessage(
      `Statement uploaded. ${parsedRows.length} transaction(s) loaded.${parseNote}`
    );
  };

  return (
    <main className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Header */}
      <div className="pt-6 pb-4 px-8 border-b border-border">
        <p className="text-sm text-muted-foreground mb-4">Match bank transactions to inbox entries for accurate cash position</p>

        {error && (
          <div className="mb-4 rounded border border-destructive/30 bg-destructive/10 px-4 py-2 text-sm text-destructive">
            {error}
          </div>
        )}
        {reconciliationMessage && (
          <div className="mb-4 rounded border border-accent/30 bg-accent/10 px-4 py-2 text-sm text-accent">
            {reconciliationMessage}
          </div>
        )}

        {/* Account & Period Selectors */}
        <div className="flex items-center gap-4">
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Account</p>
            <select
              value={selectedAccount}
              onChange={(e) => setSelectedAccount(e.target.value)}
              className="px-3 py-2 text-xs border border-border rounded bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              <option value="">All accounts</option>
              {bankAccounts.length === 0 && <option value="">No accounts</option>}
              {bankAccounts.map((acc) => (
                <option key={acc.id} value={acc.id}>{acc.accountName}</option>
              ))}
            </select>
          </div>
          <div className="ml-8">
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Period</p>
            <select
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value)}
              className="px-3 py-2 text-xs border border-border rounded bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              <option value="">All periods</option>
              {periods.map((p) => {
                const [year, month] = p.split('-');
                const label = new Date(Number(year), Number(month) - 1).toLocaleString('default', { month: 'long', year: 'numeric' });
                return <option key={p} value={p}>{label}</option>;
              })}
            </select>
          </div>
          <div className="ml-auto">
            <label className="text-xs text-muted-foreground uppercase tracking-wider mb-1 block">Bank Statement</label>
            <div>
              <label className="inline-flex items-center gap-2 px-3 py-2 text-xs border border-border rounded bg-background hover:bg-muted/20 cursor-pointer">
                <Upload size={14} />
                <span>{isReconciling ? 'Reconciling...' : 'Upload Statement'}</span>
                <input
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0] ?? null;
                    void handleStatementUpload(file);
                    e.currentTarget.value = '';
                  }}
                  disabled={isReconciling}
                />
              </label>
              <p className="mt-2 max-w-md text-[11px] text-muted-foreground">
                Expected columns: Date, Description or Narration, and either Amount or separate Credit and Debit. CSV and Excel statement files are supported. Comma, semicolon, and tab-delimited CSV files are accepted.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Summary Strip */}
      <div className="bg-muted/20 border-b border-border px-8 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-8">
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Match Progress</p>
              <p className="text-2xl font-semibold text-accent">{matchPercentage}%</p>
            </div>
            <div className="flex items-center gap-6 pl-6 border-l border-border">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider">Matched</p>
                <p className="text-lg font-semibold text-green-700 dark:text-green-400">{matchedCount}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider">Pending</p>
                <p className="text-lg font-semibold text-warning">{pendingCount}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider">Unmatched</p>
                <p className="text-lg font-semibold text-destructive">{unmatchedCount}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Recorded + Bank Statement Side-by-Side */}
      <div className="flex-1 overflow-auto">
        {isLoading ? (
          <div className="flex items-center justify-center py-24 text-sm text-muted-foreground">Loading transactions...</div>
        ) : (
          <div className="p-8 grid grid-cols-1 xl:grid-cols-2 gap-8">
            <div>
              <h2 className="text-lg font-medium mb-4">Recorded Transactions</h2>
              {filteredInbox.length === 0 ? (
                <div className="border border-dashed border-border rounded-lg p-6 text-sm text-muted-foreground bg-muted/10">
                  No recorded transactions found for this account and period.
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredInbox.map((txn) => (
                    <div key={txn.id} className="border border-border rounded-lg p-4 bg-accent/5 hover:bg-accent/10 transition-colors">
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">{txn.description}</p>
                          <p className="text-xs text-muted-foreground mt-1">{txn.date}</p>
                        </div>
                        <p className="text-sm font-semibold text-accent whitespace-nowrap">
                          {txn.isIncome ? '+' : '−'}₹{txn.amount.toLocaleString()}
                        </p>
                      </div>
                      <p className="text-xs text-foreground/80 mb-2">
                        Amount: {txn.isIncome ? '+' : '−'}₹{txn.amount.toLocaleString('en-IN')}
                      </p>
                      <div
                        className={`text-xs font-medium flex items-center gap-1 ${
                          txn.reconciliationStatus === 'Reconciled'
                            ? 'text-green-700 dark:text-green-400'
                            : 'text-amber-700 dark:text-amber-400'
                        }`}
                      >
                        <CheckCircle2 size={14} />
                        {txn.reconciliationStatus === 'Reconciled' ? 'Reconciled' : 'Pending Reconciliation'}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div>
              <div className="mb-4 flex items-center justify-between gap-3">
                <h2 className="text-lg font-medium">Uploaded Bank Statement Transactions</h2>
                {uploadedStatementRows.length > 0 && (
                  <button
                    type="button"
                    onClick={() => void handleManualReconcile()}
                    disabled={isReconciling || selectedStatementIds.length === 0}
                    className="px-3 py-2 text-xs border border-border rounded bg-background hover:bg-muted/20 disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {isReconciling ? 'Reconciling...' : `Reconcile Selected (${selectedStatementIds.length})`}
                  </button>
                )}
              </div>

              {uploadedStatementRows.length === 0 ? (
                <div className="border border-dashed border-border rounded-lg p-6 text-sm text-muted-foreground bg-muted/10">
                  Upload a statement file to load bank transactions for manual reconciliation.
                </div>
              ) : (
                <div className="space-y-3">
                  {uploadedStatementRows.map((stmt) => {
                    const suggestion = suggestedMatches[stmt.id];
                    const isReconciled = reconciledStatementIds.includes(stmt.id);
                    const canReconcile = Boolean(suggestion);
                    const isSelected = selectedStatementIds.includes(stmt.id);

                    return (
                      <div key={stmt.id} className="border border-border rounded-lg p-4 bg-background">
                        <div className="flex items-start gap-3">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            disabled={!canReconcile || isReconciling || isReconciled}
                            onChange={(e) => {
                              setSelectedStatementIds((prev) => {
                                if (e.target.checked) {
                                  return prev.includes(stmt.id) ? prev : [...prev, stmt.id];
                                }

                                return prev.filter((id) => id !== stmt.id);
                              });
                            }}
                            className="mt-1 h-4 w-4 rounded border-border"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-3 mb-1">
                              <p className="text-sm font-medium text-foreground truncate">{stmt.description}</p>
                              <p className="text-sm font-semibold text-accent whitespace-nowrap">
                                {stmt.type === 'credit' ? '+' : '−'}₹{stmt.amount.toLocaleString('en-IN')}
                              </p>
                            </div>
                            <p className="text-xs text-muted-foreground mb-2">
                              {new Date(stmt.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                              {stmt.reference ? ` • Ref: ${stmt.reference}` : ''}
                            </p>
                            <div className="mb-2 rounded border border-border bg-muted/10 px-2 py-1 text-xs">
                              <span className="text-muted-foreground">Statement Amount: </span>
                              <span className="font-medium text-foreground">
                                {stmt.type === 'credit' ? '+' : '−'}₹{stmt.amount.toLocaleString('en-IN')}
                              </span>
                            </div>
                            {isReconciled ? (
                              <p className="text-xs text-green-700 dark:text-green-400">
                                Reconciled
                              </p>
                            ) : suggestion ? (
                              <div className="text-xs text-green-700 dark:text-green-400">
                                <p>Suggested match: {suggestion.description}</p>
                                <p>
                                  Recorded on {suggestion.date} • Ref {suggestion.id.slice(0, 8)}
                                </p>
                              </div>
                            ) : (
                              <p className="text-xs text-amber-700 dark:text-amber-400">
                                No matching recorded transaction found for this row.
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {!isLoading && uploadedStatementRows.length === 0 && (
        <div className="border-t border-border bg-muted/10 p-8 text-sm text-muted-foreground">
          Upload a bank CSV statement to start matching with recorded transactions.
        </div>
      )}
    </main>
  );
}
