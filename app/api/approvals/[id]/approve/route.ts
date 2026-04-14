import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

type ApprovalRow = {
  id: string;
  transaction_id?: string | null;
  transactionId?: string | null;
  status?: string | null;
  approver_user_id?: string | null;
  approverUserId?: string | null;
  approver_role?: string | null;
  approverRole?: string | null;
  reason?: string | null;
  approval_date?: string | null;
  approvalDate?: string | null;
};

type TransactionRow = {
  id: string;
  amount?: number | null;
  is_income?: boolean | null;
  bank_account_id?: string | null;
  approval_status?: string | null;
  payment_status?: string | null;
  status?: string | null;
};

function getAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  }

  return createClient<any>(supabaseUrl, serviceRoleKey);
}

function normalizeUpper(value: unknown) {
  if (typeof value !== 'string') {
    return '';
  }

  return value.trim().toUpperCase();
}

function isApprovedForCashMovement(approvalStatus?: unknown, paymentStatus?: unknown, transactionStatus?: unknown) {
  const normalizedApprovalStatus = normalizeUpper(approvalStatus);
  const normalizedPaymentStatus = normalizeUpper(paymentStatus);
  const normalizedTransactionStatus = normalizeUpper(transactionStatus);

  const approvalSatisfied =
    normalizedApprovalStatus === 'APPROVED' ||
    normalizedApprovalStatus === 'APPROVED_FOR_PAYMENT' ||
    normalizedTransactionStatus === 'APPROVED';

  const paymentSatisfied = normalizedPaymentStatus === 'PAID';

  return approvalSatisfied && paymentSatisfied;
}

function calculateCashEffect(amount: unknown, isIncome: unknown) {
  const normalizedAmount = Number(amount ?? 0);
  if (!Number.isFinite(normalizedAmount) || normalizedAmount === 0) {
    return 0;
  }

  return Boolean(isIncome) ? normalizedAmount : -normalizedAmount;
}

async function adjustBankAccountBalance(
  admin: ReturnType<typeof getAdminClient>,
  bankAccountId: string,
  delta: number
) {
  if (!bankAccountId || delta === 0) {
    return;
  }

  const { data: acc } = await admin
    .from('bank_accounts')
    .select('balance')
    .eq('id', bankAccountId)
    .maybeSingle();

  if (acc) {
    await admin
      .from('bank_accounts')
      .update({ balance: Number(acc.balance ?? 0) + delta })
      .eq('id', bankAccountId);
  }
}

function stripUnsupportedColumns(payload: Record<string, unknown>, errorMessage?: string) {
  if (!errorMessage) {
    return { ...payload };
  }

  const normalized = errorMessage.toLowerCase();
  const sanitized = { ...payload };

  const maybeRemove = (column: string) => {
    if (normalized.includes(column.toLowerCase())) {
      delete sanitized[column];
    }
  };

  maybeRemove('approver_user_id');
  maybeRemove('approver_role');
  maybeRemove('approval_date');
  maybeRemove('approval_status');
  maybeRemove('approved_by');
  maybeRemove('approved_at');

  return sanitized;
}

/**
 * POST /api/approvals/[id]/approve
 * Approve a transaction
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const approvalId = params.id;
    const body = await request.json();
    const { approverUserId, approverRole, comment } = body;

    if (!approverUserId || !approverRole) {
      return NextResponse.json(
        { error: 'Missing required fields: approverUserId, approverRole' },
        { status: 400 }
      );
    }

    const admin = getAdminClient();
    const nowIso = new Date().toISOString();

    // Verify that the approver actually has the Accountant/Admin role in the DB
    const { data: approverProfile, error: approverProfileError } = await admin
      .from('users')
      .select('id, role, is_active')
      .eq('id', approverUserId)
      .maybeSingle();

    if (approverProfileError || !approverProfile) {
      return NextResponse.json({ error: 'Approver user not found' }, { status: 403 });
    }

    if (!approverProfile.is_active) {
      return NextResponse.json({ error: 'Approver account is inactive' }, { status: 403 });
    }

    const approverRoleNormalized = (approverProfile.role ?? '')
      .trim().toUpperCase().replace(/[^A-Z0-9]+/g, '_').replace(/^_+|_+$/g, '');
    const allowedApproverRoles = ['ACCOUNTANT', 'ORG_ADMIN', 'SUPER_ADMIN'];
    if (!allowedApproverRoles.includes(approverRoleNormalized)) {
      return NextResponse.json(
        { error: 'Only Accountant users can approve transactions' },
        { status: 403 }
      );
    }

    const { data: existingApproval, error: approvalFetchError } = await admin
      .from('approvals')
      .select('*')
      .eq('id', approvalId)
      .maybeSingle<ApprovalRow>();

    if (approvalFetchError) {
      return NextResponse.json(
        { error: approvalFetchError.message },
        { status: 400 }
      );
    }

    if (!existingApproval) {
      return NextResponse.json({ error: 'Approval not found' }, { status: 404 });
    }

    const transactionId = existingApproval.transaction_id ?? existingApproval.transactionId;
    if (!transactionId) {
      return NextResponse.json(
        { error: 'Approval is not linked to a transaction' },
        { status: 400 }
      );
    }

    const { data: existingTransaction, error: transactionFetchError } = await admin
      .from('transactions')
      .select('id, amount, is_income, bank_account_id, approval_status, payment_status, status, source_type, source_reference_id')
      .eq('id', transactionId)
      .maybeSingle<TransactionRow>();

    if (transactionFetchError) {
      return NextResponse.json(
        { error: transactionFetchError.message },
        { status: 400 }
      );
    }

    if (!existingTransaction) {
      return NextResponse.json({ error: 'Transaction not found for approval' }, { status: 404 });
    }

    const approvalPayload = {
      status: 'APPROVED',
      approver_user_id: approverUserId,
      approver_role: approverRole,
      reason: comment ?? null,
      approval_date: nowIso,
    };

    let { data: updatedApproval, error: approvalUpdateError } = await admin
      .from('approvals')
      .update(approvalPayload)
      .eq('id', approvalId)
      .select('*')
      .single();

    if (approvalUpdateError) {
      const retryPayload = stripUnsupportedColumns(approvalPayload, approvalUpdateError.message);
      ({ data: updatedApproval, error: approvalUpdateError } = await admin
        .from('approvals')
        .update(retryPayload)
        .eq('id', approvalId)
        .select('*')
        .single());
    }

    if (approvalUpdateError) {
      return NextResponse.json(
        { error: approvalUpdateError.message },
        { status: 400 }
      );
    }

    const transactionPayload = {
      approval_status: 'Approved',
      approved_by: approverUserId,
      approved_at: nowIso,
      status: normalizeUpper(existingTransaction.status) === 'APPROVED' ? existingTransaction.status : 'APPROVED',
    };

    let { data: updatedTransaction, error: transactionUpdateError } = await admin
      .from('transactions')
      .update(transactionPayload)
      .eq('id', transactionId)
      .select('id, amount, is_income, bank_account_id, approval_status, payment_status, status, source_type, source_reference_id')
      .single();

    if (transactionUpdateError) {
      const retryPayload = stripUnsupportedColumns(transactionPayload, transactionUpdateError.message);
      ({ data: updatedTransaction, error: transactionUpdateError } = await admin
        .from('transactions')
        .update(retryPayload)
        .eq('id', transactionId)
        .select('id, amount, is_income, bank_account_id, approval_status, payment_status, status, source_type, source_reference_id')
        .single());
    }

    if (transactionUpdateError) {
      return NextResponse.json(
        { error: transactionUpdateError.message },
        { status: 400 }
      );
    }

    const oldPosted = isApprovedForCashMovement(
      existingTransaction.approval_status,
      existingTransaction.payment_status,
      existingTransaction.status
    );
    const newPosted = isApprovedForCashMovement(
      updatedTransaction?.approval_status,
      updatedTransaction?.payment_status,
      updatedTransaction?.status
    );

    const oldEffect = oldPosted
      ? calculateCashEffect(existingTransaction.amount, existingTransaction.is_income)
      : 0;
    const newEffect = newPosted
      ? calculateCashEffect(updatedTransaction?.amount, updatedTransaction?.is_income)
      : 0;

    const accountId = updatedTransaction?.bank_account_id ?? existingTransaction.bank_account_id;
    if (accountId) {
      const delta = newEffect - oldEffect;
      if (delta !== 0) {
        await adjustBankAccountBalance(admin, accountId, delta);
      }
    }

    const transactionSourceType = String(updatedTransaction?.source_type ?? existingTransaction.source_type ?? '').trim().toUpperCase();
    const payrollRunId = String(updatedTransaction?.source_reference_id ?? existingTransaction.source_reference_id ?? '').trim();
    if (transactionSourceType === 'PAYROLL' && payrollRunId) {
      const payrollRunPayload = {
        status: 'PROCESSED',
        approved_by: approverUserId,
        approval_date: nowIso,
        processed_date: nowIso,
        paid_date: nowIso,
        updated_at: nowIso,
      };

      await admin
        .from('payroll_runs')
        .update(payrollRunPayload)
        .eq('id', payrollRunId);
    }

    return NextResponse.json(
      {
        message: 'Transaction approved',
        approval: updatedApproval,
        transaction: updatedTransaction,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[Approval Action API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to approve transaction' },
      { status: 500 }
    );
  }
}
