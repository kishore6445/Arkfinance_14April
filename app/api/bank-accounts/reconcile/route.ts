import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

type UserProfileRow = {
  id: string
  organization_id: string | null
  is_active: boolean | null
}

function getAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  }

  return createClient<any>(supabaseUrl, serviceRoleKey)
}

async function getAuthorizedProfile(request: Request) {
  const authHeader = request.headers.get('authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return { error: NextResponse.json({ error: 'Missing authorization token' }, { status: 401 }) }
  }

  const accessToken = authHeader.replace('Bearer ', '')
  const admin = getAdminClient()

  const { data: authData, error: authError } = await admin.auth.getUser(accessToken)
  if (authError || !authData.user) {
    return { error: NextResponse.json({ error: authError?.message ?? 'Unauthorized' }, { status: 401 }) }
  }

  const { data: profile, error: profileError } = await admin
    .from('users')
    .select('id, organization_id, is_active')
    .eq('id', authData.user.id)
    .maybeSingle<UserProfileRow>()

  if (profileError) {
    return { error: NextResponse.json({ error: profileError.message }, { status: 400 }) }
  }

  if (!profile?.is_active) {
    return { error: NextResponse.json({ error: 'User is inactive' }, { status: 403 }) }
  }

  if (!profile.organization_id) {
    return { error: NextResponse.json({ error: 'No organization linked to this user' }, { status: 400 }) }
  }

  return { admin, profile }
}

function normalizeUpper(value: unknown) {
  if (typeof value !== 'string') {
    return ''
  }

  return value.trim().toUpperCase()
}

function isApprovedForCashMovement(approvalStatus?: unknown, paymentStatus?: unknown, transactionStatus?: unknown) {
  const normalizedApprovalStatus = normalizeUpper(approvalStatus)
  const normalizedPaymentStatus = normalizeUpper(paymentStatus)
  const normalizedTransactionStatus = normalizeUpper(transactionStatus)

  const approvalSatisfied =
    normalizedApprovalStatus === 'APPROVED' ||
    normalizedApprovalStatus === 'APPROVED_FOR_PAYMENT' ||
    normalizedTransactionStatus === 'APPROVED'

  return approvalSatisfied && normalizedPaymentStatus === 'PAID'
}

function calculateCashEffect(amount: unknown, isIncome: unknown) {
  const normalizedAmount = Number(amount ?? 0)
  if (!Number.isFinite(normalizedAmount) || normalizedAmount === 0) {
    return 0
  }

  return Boolean(isIncome) ? normalizedAmount : -normalizedAmount
}

function getOpeningBalance(account: any) {
  const opening =
    account?.opening_balance ??
    account?.openingBalance ??
    account?.initial_balance ??
    account?.initialBalance ??
    account?.starting_balance ??
    account?.startingBalance ??
    0

  const normalized = Number(opening)
  return Number.isFinite(normalized) ? normalized : 0
}

function getTransactionBankAccountId(txn: any) {
  const candidate =
    txn?.bank_account_id ??
    txn?.assigned_bank_account_id ??
    txn?.bankAccountId ??
    txn?.assignedBankAccountId ??
    null

  const normalized = String(candidate ?? '').trim()
  return normalized.length > 0 ? normalized : null
}

export async function POST(request: Request) {
  try {
    const authorized = await getAuthorizedProfile(request)
    if ('error' in authorized) {
      return authorized.error
    }

    const { admin, profile } = authorized
    const organizationId = profile.organization_id

    const { data: accounts, error: accountsError } = await admin
      .from('bank_accounts')
      .select('*')
      .eq('organization_id', organizationId)

    if (accountsError) {
      return NextResponse.json({ error: accountsError.message }, { status: 400 })
    }

    const { data: transactions, error: transactionsError } = await admin
      .from('transactions')
      .select('amount, is_income, approval_status, payment_status, status, bank_account_id, assigned_bank_account_id')
      .eq('organization_id', organizationId)

    if (transactionsError) {
      return NextResponse.json({ error: transactionsError.message }, { status: 400 })
    }

    const accountDeltaMap = new Map<string, number>()

    for (const txn of transactions ?? []) {
      const accountId = getTransactionBankAccountId(txn)
      if (!accountId) {
        continue
      }

      if (!isApprovedForCashMovement(txn.approval_status, txn.payment_status, txn.status)) {
        continue
      }

      const delta = calculateCashEffect(txn.amount, txn.is_income)
      if (delta === 0) {
        continue
      }

      accountDeltaMap.set(accountId, (accountDeltaMap.get(accountId) ?? 0) + delta)
    }

    const updatedBalances: Array<{ id: string; oldBalance: number; newBalance: number }> = []

    for (const account of accounts ?? []) {
      const accountId = String((account as any)?.id ?? '')
      if (!accountId) {
        continue
      }

      const oldBalance = Number((account as any)?.balance ?? 0)
      const openingBalance = getOpeningBalance(account)
      const transactionDelta = accountDeltaMap.get(accountId) ?? 0
      const newBalance = openingBalance + transactionDelta

      const { error: updateError } = await admin
        .from('bank_accounts')
        .update({ balance: newBalance })
        .eq('id', accountId)
        .eq('organization_id', organizationId)

      if (updateError) {
        return NextResponse.json({ error: updateError.message }, { status: 400 })
      }

      updatedBalances.push({ id: accountId, oldBalance, newBalance })
    }

    return NextResponse.json({
      success: true,
      updatedCount: updatedBalances.length,
      accounts: updatedBalances,
    }, { status: 200 })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
