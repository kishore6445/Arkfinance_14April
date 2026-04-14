import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { financialCalculationsService } from '@/services/financial-calculations.service';

type MappedTransaction = {
  organizationId: string;
  date: string;
  amount: number;
  status: string;
  accountingType: 'Revenue' | 'Expense' | 'Asset' | 'Liability';
  subtype?: string;
  isIncome: boolean;
  coaName?: string;
  coaCode?: string;
};

function getAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  }

  return createClient<any>(supabaseUrl, serviceRoleKey);
}

function normalizeApprovalStatus(value: unknown) {
  return String(value ?? '').trim().toUpperCase().replace(/[^A-Z0-9]+/g, '_');
}

function normalizeAccountingType(value: unknown): MappedTransaction['accountingType'] {
  const token = String(value ?? '').trim().toUpperCase();
  if (token === 'EXPENSE') return 'Expense';
  if (token === 'ASSET') return 'Asset';
  if (token === 'LIABILITY') return 'Liability';
  return 'Revenue';
}

async function fetchTransactionsForRange(
  organizationId: string,
  startDate: string,
  endDate: string
): Promise<MappedTransaction[]> {
  const admin = getAdminClient();

  const { data, error } = await admin
    .from('transactions')
    .select(
      'organization_id,date,amount,status,approval_status,accounting_type,subtype,is_income,coa_name,coa_code'
    )
    .eq('organization_id', organizationId)
    .gte('date', startDate)
    .lte('date', endDate);

  if (error) {
    throw new Error(`Failed to fetch transactions: ${error.message}`);
  }

  return (data ?? []).map((row: any) => {
    const approvalToken = normalizeApprovalStatus(row.approval_status);
    const statusToken = normalizeApprovalStatus(row.status);
    const isApproved = approvalToken === 'APPROVED' || statusToken === 'APPROVED';

    return {
      organizationId: String(row.organization_id ?? organizationId),
      date: String(row.date ?? ''),
      amount: Number(row.amount ?? 0),
      status: isApproved ? 'APPROVED' : 'DRAFT',
      accountingType: normalizeAccountingType(row.accounting_type),
      subtype: row.subtype ?? undefined,
      isIncome: Boolean(row.is_income),
      coaName: row.coa_name ?? row.subtype ?? undefined,
      coaCode: row.coa_code ?? undefined,
    };
  });
}

async function buildBalanceSheetResponse(searchParams: URLSearchParams) {
  const organizationId = searchParams.get('organizationId');
  const asOfDate = searchParams.get('asOfDate');

  console.log('[Financial Statements API] Fetching Balance Sheet:', {
    organizationId,
    asOfDate,
  });

  if (!organizationId || !asOfDate) {
    return NextResponse.json(
      { error: 'Missing required query parameters' },
      { status: 400 }
    );
  }

  const rangeStart = `${new Date(asOfDate).getFullYear()}-01-01`;
  const transactions = await fetchTransactionsForRange(organizationId, rangeStart, asOfDate);

  const balanceSheet = await financialCalculationsService.calculateBalanceSheet(
    organizationId,
    new Date(asOfDate),
    transactions as any
  );

  const validation = financialCalculationsService.validateBalanceSheet(balanceSheet);

  return NextResponse.json(
    {
      statement: 'Balance Sheet',
      balanceSheet,
      validation,
    },
    { status: 200 }
  );
}

/**
 * GET /api/financial-statements/pnl
 * Get P&L Statement
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const endpoint = searchParams.get('endpoint');
    const statementType = searchParams.get('statementType');

    if (endpoint === 'balance-sheet' || statementType === 'balance-sheet') {
      return await buildBalanceSheetResponse(searchParams);
    }

    const organizationId = searchParams.get('organizationId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    console.log('[Financial Statements API] Fetching P&L:', {
      organizationId,
      dateRange: `${startDate} to ${endDate}`,
    });

    if (!organizationId || !startDate || !endDate) {
      return NextResponse.json(
        { error: 'Missing required query parameters' },
        { status: 400 }
      );
    }

    const transactions = await fetchTransactionsForRange(organizationId, startDate, endDate);
    const pnl = await financialCalculationsService.calculatePnL(
      organizationId,
      new Date(startDate),
      new Date(endDate),
      transactions as any
    );

    return NextResponse.json(
      {
        statement: 'P&L',
        pnl,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[Financial Statements API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch P&L statement' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/financial-statements/balance-sheet
 * Get Balance Sheet
 */
export async function PUT(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const endpoint = searchParams.get('endpoint');
  const statementType = searchParams.get('statementType');

  if (endpoint === 'balance-sheet' || statementType === 'balance-sheet') {
    try {
      return await buildBalanceSheetResponse(searchParams);
    } catch (error) {
      console.error('[Financial Statements API] Error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch balance sheet' },
        { status: 500 }
      );
    }
  }

  return NextResponse.json(
    { error: 'Invalid endpoint' },
    { status: 400 }
  );
}
