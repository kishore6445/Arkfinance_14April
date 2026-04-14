import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

type PayrollRunRequest = {
  payrollMonth?: string
  payrollDate?: string
  status?: 'DRAFT' | 'APPROVED' | 'PROCESSED' | 'REJECTED'
  totalEmployees?: number
  processedEmployees?: number
  totalGross?: number
  totalDeductions?: number
  totalNet?: number
  approvedBy?: string | null
  approvalDate?: string | null
  processedDate?: string | null
  paidDate?: string | null
  accessToken?: string
  userId?: string
  organizationId?: string
  action?: 'reset-month'
}

type UserProfileRow = {
  id: string
  organization_id: string | null
  is_active: boolean | null
  role: string | null
}

type BankAccountRow = {
  id: string
  account_name?: string | null
  balance?: number | null
  is_primary?: boolean | null
  status?: string | null
}

type ExistingPayrollRunRow = {
  id: string
  status?: string | null
  total_net?: number | null
}

type BudgetTrackingRow = {
  budgeted_amount?: number | null
  actual_amount?: number | null
}

function normalizeBudgetToken(value: unknown) {
  if (typeof value !== 'string') {
    return ''
  }

  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

function getAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  }

  return createClient<any>(supabaseUrl, serviceRoleKey)
}

function isPayrollCashCommitted(status: string | null | undefined) {
  const s = (status ?? '').trim().toUpperCase()
  return s === 'PROCESSED' || s === 'APPROVED'
}

function getPayrollTransactionWorkflow(status: string | null | undefined) {
  const normalized = (status ?? '').trim().toUpperCase()

  if (normalized === 'APPROVED') {
    return {
      approval_status: 'Approved',
      payment_status: 'Paid',
    }
  }

  if (normalized === 'PROCESSED') {
    return {
      approval_status: 'Pending Approval',
      payment_status: 'Pending Payment',
    }
  }

  if (normalized === 'REJECTED') {
    return {
      approval_status: 'Rejected',
      payment_status: 'Pending Payment',
    }
  }

  return {
    approval_status: 'Pending Approval',
    payment_status: 'Pending Payment',
  }
}

function isApprovedAndPaidTransaction(
  approvalStatus: string | null | undefined,
  paymentStatus: string | null | undefined,
  transactionStatus: string | null | undefined
) {
  const normalizedApprovalStatus = (approvalStatus ?? '').trim().toUpperCase()
  const normalizedPaymentStatus = (paymentStatus ?? '').trim().toUpperCase()
  const normalizedTransactionStatus = (transactionStatus ?? '').trim().toUpperCase()

  const approvalSatisfied =
    normalizedApprovalStatus === 'APPROVED' ||
    normalizedApprovalStatus === 'APPROVED_FOR_PAYMENT' ||
    normalizedTransactionStatus === 'APPROVED'

  return approvalSatisfied && normalizedPaymentStatus === 'PAID'
}

function deriveRunStatusFromTransaction(
  approvalStatus: string | null | undefined,
  paymentStatus: string | null | undefined,
  transactionStatus: string | null | undefined
) {
  if (isApprovedAndPaidTransaction(approvalStatus, paymentStatus, transactionStatus)) {
    return 'PROCESSED'
  }

  const normalizedApprovalStatus = (approvalStatus ?? '').trim().toUpperCase()
  const normalizedTransactionStatus = (transactionStatus ?? '').trim().toUpperCase()

  if (normalizedApprovalStatus === 'REJECTED') {
    return 'REJECTED'
  }

  if (
    normalizedApprovalStatus === 'APPROVED' ||
    normalizedApprovalStatus === 'APPROVED_FOR_PAYMENT' ||
    normalizedTransactionStatus === 'APPROVED'
  ) {
    return 'APPROVED'
  }

  return 'DRAFT'
}

async function reconcilePayrollRunStatusesFromTransactions(
  admin: ReturnType<typeof getAdminClient>,
  organizationId: string,
  runs: Array<Record<string, unknown>>
) {
  const runIds = runs
    .map((run) => String(run.id ?? '').trim())
    .filter((id) => id.length > 0)

  if (!runIds.length) {
    return
  }

  const { data: txRows, error } = await admin
    .from('transactions')
    .select('source_reference_id, approval_status, payment_status, status')
    .eq('organization_id', organizationId)
    .eq('source_type', 'payroll')
    .in('source_reference_id', runIds)

  if (error || !txRows?.length) {
    return
  }

  const runTargetStatus = new Map<string, string>()
  for (const tx of txRows as Array<Record<string, unknown>>) {
    const runId = String(tx.source_reference_id ?? '').trim()
    if (!runId) {
      continue
    }

    const derived = deriveRunStatusFromTransaction(
      (tx.approval_status as string | null | undefined) ?? null,
      (tx.payment_status as string | null | undefined) ?? null,
      (tx.status as string | null | undefined) ?? null
    )

    const existing = runTargetStatus.get(runId)
    if (existing === 'PROCESSED') {
      continue
    }
    if (derived === 'PROCESSED' || (derived === 'APPROVED' && existing !== 'APPROVED')) {
      runTargetStatus.set(runId, derived)
    }
  }

  const today = new Date().toISOString().slice(0, 10)
  for (const run of runs) {
    const runId = String(run.id ?? '').trim()
    if (!runId) {
      continue
    }

    const targetStatus = runTargetStatus.get(runId)
    if (!targetStatus) {
      continue
    }

    const currentStatus = String(run.status ?? '').trim().toUpperCase()
    const shouldPromoteToApproved = targetStatus === 'APPROVED' && currentStatus === 'DRAFT'
    const shouldPromoteToProcessed = targetStatus === 'PROCESSED' && currentStatus !== 'PROCESSED'

    if (!shouldPromoteToApproved && !shouldPromoteToProcessed) {
      continue
    }

    const payload: Record<string, unknown> = {
      status: targetStatus,
      updated_at: new Date().toISOString(),
    }

    if ((targetStatus === 'APPROVED' || targetStatus === 'PROCESSED') && !run.approval_date) {
      payload.approval_date = today
    }
    if (targetStatus === 'PROCESSED' && !run.processed_date) {
      payload.processed_date = today
    }
    if (targetStatus === 'PROCESSED' && !run.paid_date) {
      payload.paid_date = today
    }

    const { data: updatedRun, error: updateError } = await admin
      .from('payroll_runs')
      .update(payload)
      .eq('id', runId)
      .eq('organization_id', organizationId)
      .select('*')
      .single()

    if (!updateError && updatedRun) {
      Object.assign(run, updatedRun)
    }
  }
}

async function findSalaryAccount(admin: ReturnType<typeof getAdminClient>, organizationId: string) {
  const { data, error } = await admin
    .from('bank_accounts')
    .select('id, account_name, balance, is_primary, status')
    .eq('organization_id', organizationId)

  if (error) {
    throw new Error(error.message)
  }

  const accounts = (data ?? []) as BankAccountRow[]
  const activeAccounts = accounts.filter((account) => (account.status ?? 'Active') === 'Active')

  const salaryAccount = activeAccounts.find((account) =>
    (account.account_name ?? '').toLowerCase().includes('salary')
  )

  if (salaryAccount) {
    return salaryAccount
  }

  const primaryAccount = activeAccounts.find((account) => Boolean(account.is_primary))
  return primaryAccount ?? null
}

async function findPayrollBudgetId(admin: ReturnType<typeof getAdminClient>, organizationId: string) {
  const { data, error } = await admin
    .from('budgets')
    .select('id, category, budget_name, coa_name')
    .eq('organization_id', organizationId)

  if (error) {
    return null
  }

  const budgets = (data ?? []) as Array<{
    id: string
    category?: string | null
    budget_name?: string | null
    coa_name?: string | null
  }>

  const payrollBudget = budgets.find((row) => {
    const combined = normalizeBudgetToken(
      `${row.category ?? ''} ${row.budget_name ?? ''} ${row.coa_name ?? ''}`
    )
    return combined.includes('payroll') || combined.includes('salary') || combined.includes('wage')
  })

  return payrollBudget?.id ?? null
}

function getTrackingMonthFromDate(dateValue: string | null | undefined) {
  if (typeof dateValue !== 'string' || !dateValue.trim()) {
    const now = new Date()
    return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}-01`
  }

  const dateOnly = dateValue.includes('T') ? dateValue.split('T')[0] : dateValue
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateOnly)) {
    const now = new Date()
    return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}-01`
  }

  return `${dateOnly.slice(0, 7)}-01`
}

function deriveBudgetTrackingStatus(actualAmount: number, budgetedAmount: number) {
  if (budgetedAmount <= 0) {
    return 'ON_TRACK'
  }

  const utilization = actualAmount / budgetedAmount
  if (utilization >= 1) return 'OVERSPENT'
  if (utilization >= 0.8) return 'WARNING'
  return 'ON_TRACK'
}

async function applyPayrollBudgetDelta(
  admin: ReturnType<typeof getAdminClient>,
  organizationId: string,
  budgetId: string | null,
  payrollDate: string,
  deltaAmount: number
) {
  if (!budgetId || !Number.isFinite(deltaAmount) || deltaAmount === 0) {
    return
  }

  const trackingMonth = getTrackingMonthFromDate(payrollDate)

  const { data: existingTracking } = await admin
    .from('budget_tracking')
    .select('budgeted_amount, actual_amount')
    .eq('organization_id', organizationId)
    .eq('budget_id', budgetId)
    .eq('tracking_month', trackingMonth)
    .maybeSingle<BudgetTrackingRow>()

  let budgetedAmount = Number(existingTracking?.budgeted_amount ?? 0)
  if (!budgetedAmount) {
    const { data: budgetRow } = await admin
      .from('budgets')
      .select('budget_amount')
      .eq('id', budgetId)
      .eq('organization_id', organizationId)
      .maybeSingle<{ budget_amount?: number | null }>()

    budgetedAmount = Number(budgetRow?.budget_amount ?? 0)
  }

  const currentActualAmount = Number(existingTracking?.actual_amount ?? 0)
  const nextActualAmount = Math.max(0, currentActualAmount + deltaAmount)
  const varianceAmount = budgetedAmount - nextActualAmount
  const variancePercent = budgetedAmount > 0 ? Number(((varianceAmount / budgetedAmount) * 100).toFixed(2)) : 0

  await admin
    .from('budget_tracking')
    .upsert(
      {
        budget_id: budgetId,
        organization_id: organizationId,
        tracking_month: trackingMonth,
        budgeted_amount: budgetedAmount,
        actual_amount: nextActualAmount,
        reserved_amount: 0,
        variance_amount: varianceAmount,
        variance_percent: variancePercent,
        status: deriveBudgetTrackingStatus(nextActualAmount, budgetedAmount),
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'budget_id,tracking_month' }
    )
}

async function adjustBankAccountBalance(
  admin: ReturnType<typeof getAdminClient>,
  bankAccountId: string,
  delta: number
) {
  if (!bankAccountId || delta === 0) {
    return
  }

  const { data: account, error: accountError } = await admin
    .from('bank_accounts')
    .select('id, balance')
    .eq('id', bankAccountId)
    .maybeSingle<{ id: string; balance?: number | null }>()

  if (accountError) {
    throw new Error(accountError.message)
  }

  if (!account) {
    throw new Error('Salary account not found')
  }

  const currentBalance = Number(account.balance ?? 0)
  const nextBalance = currentBalance + delta

  if (nextBalance < 0) {
    throw new Error('Insufficient balance in salary account for payroll processing')
  }

  const { error: updateError } = await admin
    .from('bank_accounts')
    .update({ balance: nextBalance })
    .eq('id', bankAccountId)

  if (updateError) {
    throw new Error(updateError.message)
  }
}

async function createPayrollTransaction(
  admin: ReturnType<typeof getAdminClient>,
  opts: {
    organizationId: string
    createdBy: string
    payrollRunId: string
    payrollMonthShort: string  // YYYY-MM
    payrollDate: string        // YYYY-MM-DD
    totalNet: number
    runStatus: string
    bankAccountId: string | null
  }
) {
  const { organizationId, createdBy, payrollRunId, payrollMonthShort, payrollDate, totalNet, runStatus, bankAccountId } = opts
  const workflow = getPayrollTransactionWorkflow(runStatus)
  const payrollBudgetId = await findPayrollBudgetId(admin, organizationId)

  // Keep one transaction per payroll run so newer runs don't override earlier ones.
  const marker = `[PAYROLL:${payrollMonthShort}:${payrollRunId}]`
  const { data: existing } = await admin
    .from('transactions')
    .select('id, amount, approval_status, payment_status, status')
    .eq('organization_id', organizationId)
    .eq('notes', marker)
    .maybeSingle()

  const { data: existingRunTransactions } = await admin
    .from('transactions')
    .select('amount, source_type, source_reference_id, notes')
    .eq('organization_id', organizationId)
    .eq('source_reference_id', payrollRunId)

  const postedAmount = (existingRunTransactions ?? []).reduce((sum, row: any) => {
    const sourceType = String(row?.source_type ?? '').trim().toUpperCase()
    const notes = String(row?.notes ?? '')
    const isPayrollTagged = sourceType === 'PAYROLL'
    const isPayrollByMarker = notes.startsWith(`[PAYROLL:${payrollMonthShort}:${payrollRunId}]`) ||
      notes.startsWith(`[PAYROLL_ADJUSTMENT:${payrollMonthShort}:${payrollRunId}:`)

    if (!isPayrollTagged && !isPayrollByMarker) {
      return sum
    }

    return sum + Number(row?.amount ?? 0)
  }, 0)

  const deltaAmount = totalNet - postedAmount
  const shouldCreateSupplementalTransaction = Boolean(
    (existing?.id || postedAmount > 0) &&
    deltaAmount > 0
  )

  if (existing?.id && !shouldCreateSupplementalTransaction) {
    // Preserve original payroll record amount; only keep workflow fields in sync.
    await admin
      .from('transactions')
      .update({
        ...(payrollBudgetId ? { budget_id: payrollBudgetId } : {}),
        approval_status: workflow.approval_status,
        payment_status: workflow.payment_status,
        approved_by: workflow.approval_status === 'Approved' ? createdBy : null,
        approved_at: workflow.approval_status === 'Approved' ? new Date().toISOString() : null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', existing.id)

    await applyPayrollBudgetDelta(admin, organizationId, payrollBudgetId, payrollDate, deltaAmount)
    return
  }

  const stripUnsupportedTransactionColumns = (
    payload: Record<string, unknown>,
    errorMessage: string | undefined
  ) => {
    if (!errorMessage) {
      return { ...payload }
    }

    const sanitized = { ...payload }
    const normalized = errorMessage.toLowerCase()

    const maybeRemove = (column: string) => {
      if (normalized.includes(column.toLowerCase())) {
        delete sanitized[column]
      }
    }

    maybeRemove('source_type')
    maybeRemove('source_reference_id')
    maybeRemove('assigned_bank_account_id')
    maybeRemove('payment_status')
    maybeRemove('approval_status')
    maybeRemove('approved_by')
    maybeRemove('reconciliation_status')
    maybeRemove('bank_statement_reference')
    maybeRemove('workflow_stage')
    maybeRemove('cost_center_code')
    maybeRemove('internal_notes')
    maybeRemove('external_notes')
    maybeRemove('compliance_risk_level')
    maybeRemove('requires_audit')
    maybeRemove('locked_by')
    maybeRemove('locked_at')
    maybeRemove('approved_at')
    maybeRemove('rejected_at')
    maybeRemove('processed_at')
    maybeRemove('processed_by')
    maybeRemove('impact_on_cash_flow')
    maybeRemove('impact_on_profit')
    maybeRemove('gst_rate')
    maybeRemove('created_by')
    maybeRemove('bank_account_id')

    return sanitized
  }

  const statusCandidates = ['Recorded', 'RECORDED', 'DRAFT', 'PENDING']
  const transactionAmount = shouldCreateSupplementalTransaction ? deltaAmount : totalNet
  const transactionMarker = shouldCreateSupplementalTransaction
    ? `[PAYROLL_ADJUSTMENT:${payrollMonthShort}:${payrollRunId}:${Date.now()}]`
    : marker
  const transactionDescription = shouldCreateSupplementalTransaction
    ? `Payroll Adjustment - ${payrollMonthShort}`
    : `Payroll - ${payrollMonthShort}`

  for (const status of statusCandidates) {
    const payload: Record<string, unknown> = {
      id: crypto.randomUUID(),
      organization_id: organizationId,
      date: payrollDate,
      description: transactionDescription,
      amount: transactionAmount,
      is_income: false,
      accounting_type: 'Expense',
      subtype: 'Salary',
      ...(payrollBudgetId ? { budget_id: payrollBudgetId } : {}),
      notes: transactionMarker,
      source_type: 'payroll',
      source_reference_id: payrollRunId,
      status,
      approval_status: workflow.approval_status,
      payment_status: workflow.payment_status,
      approved_by: workflow.approval_status === 'Approved' ? createdBy : null,
      approved_at: workflow.approval_status === 'Approved' ? new Date().toISOString() : null,
      created_by: createdBy,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      ...(bankAccountId ? { bank_account_id: bankAccountId } : {}),
    }

    let insertPayload: Record<string, unknown> = payload
    let { error } = await admin.from('transactions').insert(insertPayload)
    let retryCount = 0

    while (error && retryCount < 5) {
      const nextPayload = stripUnsupportedTransactionColumns(insertPayload, error.message)
      if (JSON.stringify(nextPayload) === JSON.stringify(insertPayload)) {
        break
      }
      insertPayload = nextPayload
      ;({ error } = await admin.from('transactions').insert(insertPayload))
      retryCount++
    }

    if (!error) break
    // If status constraint, try the next candidate; otherwise stop
    if (!error.message.toLowerCase().includes('status')) break
  }

  await applyPayrollBudgetDelta(admin, organizationId, payrollBudgetId, payrollDate, transactionAmount)
}

async function getAuthorizedProfile(request: Request) {
  const authHeader = request.headers.get('authorization')
  const headerToken = authHeader?.startsWith('Bearer ') ? authHeader.replace('Bearer ', '') : null
  const fallbackHeaderToken = request.headers.get('x-access-token')
  const fallbackUserIdHeader = request.headers.get('x-user-id')
  const fallbackOrganizationIdHeader = request.headers.get('x-organization-id')
  const requestUrl = new URL(request.url)

  let bodyToken: string | null = null
  let bodyUserId: string | null = null
  let bodyOrganizationId: string | null = null

  if (request.method !== 'GET') {
    const clonedRequest = request.clone()
    try {
      const body = (await clonedRequest.json()) as PayrollRunRequest
      bodyToken = body.accessToken ?? null
      bodyUserId = body.userId ?? null
      bodyOrganizationId = body.organizationId ?? null
    } catch {
      bodyToken = null
      bodyUserId = null
      bodyOrganizationId = null
    }
  }

  const accessToken = headerToken ?? fallbackHeaderToken ?? bodyToken
  const admin = getAdminClient()

  if (!accessToken) {
    const fallbackUserId = fallbackUserIdHeader ?? requestUrl.searchParams.get('userId') ?? bodyUserId
    const fallbackOrganizationId =
      fallbackOrganizationIdHeader ?? requestUrl.searchParams.get('organizationId') ?? bodyOrganizationId

    if (!fallbackUserId || !fallbackOrganizationId) {
      return { error: NextResponse.json({ error: 'Missing authorization token' }, { status: 401 }) }
    }

    const { data: profile, error: profileError } = await admin
      .from('users')
      .select('id, organization_id, is_active, role')
      .eq('id', fallbackUserId)
      .maybeSingle<UserProfileRow>()

    if (profileError) {
      return { error: NextResponse.json({ error: profileError.message }, { status: 400 }) }
    }

    if (!profile?.is_active) {
      return { error: NextResponse.json({ error: 'User is inactive' }, { status: 403 }) }
    }

    if (profile.organization_id !== fallbackOrganizationId) {
      return { error: NextResponse.json({ error: 'Organization mismatch for this user' }, { status: 403 }) }
    }

    return { admin, profile }
  }

  const { data: authData, error: authError } = await admin.auth.getUser(accessToken)
  if (authError || !authData.user) {
    return { error: NextResponse.json({ error: authError?.message ?? 'Unauthorized' }, { status: 401 }) }
  }

  const { data: profile, error: profileError } = await admin
    .from('users')
    .select('id, organization_id, is_active, role')
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

export async function GET(request: Request) {
  try {
    const authorized = await getAuthorizedProfile(request)
    if ('error' in authorized) return authorized.error

    const { admin, profile } = authorized
    const organizationId = profile.organization_id
    if (!organizationId) {
      return NextResponse.json({ error: 'No organization linked to this user' }, { status: 400 })
    }

    const { data, error } = await admin
      .from('payroll_runs')
      .select('*')
      .eq('organization_id', organizationId)
      .order('payroll_month', { ascending: false })
      .order('created_at', { ascending: false })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    const runRows = (data ?? []) as Array<Record<string, unknown>>
    await reconcilePayrollRunStatusesFromTransactions(admin, organizationId, runRows)

    // Strip DATE column value (YYYY-MM-DD) back to YYYY-MM for the client
    const runs = runRows.map((row: Record<string, unknown>) => ({
      ...row,
      payroll_month:
        typeof row.payroll_month === 'string' && row.payroll_month.length >= 7
          ? row.payroll_month.slice(0, 7)
          : row.payroll_month,
    }))
    return NextResponse.json({ runs }, { status: 200 })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const authorized = await getAuthorizedProfile(request)
    if ('error' in authorized) return authorized.error

    const { admin, profile } = authorized
    const organizationId = profile.organization_id
    if (!organizationId) {
      return NextResponse.json({ error: 'No organization linked to this user' }, { status: 400 })
    }

    const body = (await request.json()) as PayrollRunRequest
    if (!body.payrollMonth?.trim() || !body.payrollDate?.trim()) {
      return NextResponse.json({ error: 'payrollMonth and payrollDate are required' }, { status: 400 })
    }

    // DB stores payroll_month as DATE; ensure YYYY-MM-01 format
    const payrollMonthShort = body.payrollMonth.trim().slice(0, 7) // "2026-04"
    const payrollMonthDate = payrollMonthShort.length === 7 ? `${payrollMonthShort}-01` : payrollMonthShort

    const now = new Date().toISOString()
    const existingQuery = await admin
      .from('payroll_runs')
      .select('id, status, total_net')
      .eq('organization_id', organizationId)
      .eq('payroll_month', payrollMonthDate)
      .maybeSingle<ExistingPayrollRunRow>()

    if (existingQuery.error && existingQuery.error.code !== 'PGRST116') {
      return NextResponse.json({ error: existingQuery.error.message }, { status: 400 })
    }

    const nextStatus = body.status ?? 'DRAFT'

    // Only Accountants and Admins can approve or process payroll (which triggers bank debit)
    const committingStatuses = ['APPROVED', 'PROCESSED']
    if (committingStatuses.includes(nextStatus.toUpperCase())) {
      const userRole = (profile.role ?? '').trim().toUpperCase()
      const allowedRoles = ['ACCOUNTANT', 'ORG_ADMIN', 'SUPER_ADMIN']
      if (!allowedRoles.includes(userRole)) {
        return NextResponse.json(
          { error: 'Only an Accountant or Admin can approve or process a payroll run' },
          { status: 403 }
        )
      }
    }

    const previousNet = Number(existingQuery.data?.total_net ?? 0)

    let computedTotalEmployees = Number(body.totalEmployees ?? 0)
    let computedProcessedEmployees = Number(body.processedEmployees ?? 0)
    let computedTotalGross = Number(body.totalGross ?? 0)
    let computedTotalDeductions = Number(body.totalDeductions ?? 0)
    let computedTotalNet = Number(body.totalNet ?? 0)

    // Keep payroll run totals aligned with register state while respecting selected processing.
    if (isPayrollCashCommitted(nextStatus)) {
      const [allEntriesQuery, processedEntriesQuery] = await Promise.all([
        admin
          .from('payroll_register_entries')
          .select('id')
          .eq('organization_id', organizationId)
          .eq('payroll_month', payrollMonthShort)
          .neq('transfer_status', 'Cancelled'),
        admin
          .from('payroll_register_entries')
          .select('id, gross_salary, total_deductions, net_salary')
          .eq('organization_id', organizationId)
          .eq('payroll_month', payrollMonthShort)
          .eq('transfer_status', 'Processed'),
      ])

      if (!allEntriesQuery.error && !processedEntriesQuery.error) {
        const allRows = allEntriesQuery.data ?? []
        const processedRows = (processedEntriesQuery.data ?? []) as Array<{
          id: string
          gross_salary?: number | null
          total_deductions?: number | null
          net_salary?: number | null
        }>

        computedTotalEmployees = allRows.length
        computedProcessedEmployees = processedRows.length
        computedTotalGross = processedRows.reduce((sum, row) => sum + Number(row.gross_salary ?? 0), 0)
        computedTotalDeductions = processedRows.reduce((sum, row) => sum + Number(row.total_deductions ?? 0), 0)
        computedTotalNet = processedRows.reduce((sum, row) => sum + Number(row.net_salary ?? 0), 0)
      }
    }

    const nextNet = computedTotalNet
    const previousCommitted = isPayrollCashCommitted(existingQuery.data?.status)
    const nextCommitted = isPayrollCashCommitted(nextStatus)

    let bankDelta = 0
    if (!previousCommitted && nextCommitted) {
      bankDelta = -nextNet
    } else if (previousCommitted && nextCommitted) {
      bankDelta = -(nextNet - previousNet)
    }

    const payload = {
      organization_id: organizationId,
      payroll_month: payrollMonthDate,
      payroll_date: body.payrollDate.trim(),
      status: nextStatus,
      total_employees: computedTotalEmployees,
      processed_employees: computedProcessedEmployees,
      total_gross: computedTotalGross,
      total_deductions: computedTotalDeductions,
      total_net: nextNet,
      approved_by: body.approvedBy ?? null,
      approval_date: body.approvalDate ?? null,
      processed_date: body.processedDate ?? null,
      paid_date: body.paidDate ?? null,
      updated_at: now,
    }

    // Save the payroll run first
    let savedRun: Record<string, unknown>
    let httpStatus: number

    if (existingQuery.data?.id) {
      const { data, error } = await admin
        .from('payroll_runs')
        .update(payload)
        .eq('id', existingQuery.data.id)
        .select('*')
        .single()

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 })
      }

      savedRun = data as Record<string, unknown>
      httpStatus = 200
    } else {
      const { data, error } = await admin
        .from('payroll_runs')
        .insert({
          id: crypto.randomUUID(),
          ...payload,
          created_by: profile.id,
          created_at: now,
        })
        .select('*')
        .single()

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 })
      }

      savedRun = data as Record<string, unknown>
      httpStatus = 201
    }

    // Attempt bank debit as a best-effort operation (does not block the payroll save)
    let bankWarning: string | null = null
    let salaryAccountId: string | null = null

    if (bankDelta !== 0) {
      const salaryAccount = await findSalaryAccount(admin, organizationId)
      if (!salaryAccount) {
        bankWarning = 'Payroll run saved, but no active salary account found. Create a bank account named "Salary Account" or mark one as primary to enable automatic bank debit.'
      } else {
        salaryAccountId = salaryAccount.id
        try {
          await adjustBankAccountBalance(admin, salaryAccount.id, bankDelta)
        } catch (bankError) {
          bankWarning = bankError instanceof Error ? bankError.message : 'Bank account debit failed'
        }
      }
    }

    // Create/update a transaction record so Cash Runway outflows reflect the payroll
    if (nextCommitted && nextNet > 0) {
      try {
        const payrollRunId = String(savedRun.id ?? '')
        await createPayrollTransaction(admin, {
          organizationId,
          createdBy: profile.id,
          payrollRunId,
          payrollMonthShort,
          payrollDate: body.payrollDate.trim(),
          totalNet: nextNet,
          runStatus: nextStatus,
          bankAccountId: salaryAccountId,
        })
      } catch {
        // best-effort: transaction creation failure does not fail the payroll run
      }
    }

    // Strip DATE column value back to YYYY-MM for the client
    const clientRun = {
      ...savedRun,
      payroll_month:
        typeof savedRun.payroll_month === 'string' && (savedRun.payroll_month as string).length >= 7
          ? (savedRun.payroll_month as string).slice(0, 7)
          : savedRun.payroll_month,
    }
    return NextResponse.json({ run: clientRun, warning: bankWarning }, { status: httpStatus })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    const authorized = await getAuthorizedProfile(request)
    if ('error' in authorized) return authorized.error

    const { admin, profile } = authorized
    const organizationId = profile.organization_id
    if (!organizationId) {
      return NextResponse.json({ error: 'No organization linked to this user' }, { status: 400 })
    }

    const requestUrl = new URL(request.url)
    const payrollMonthParam = requestUrl.searchParams.get('payrollMonth')?.trim()
    if (!payrollMonthParam) {
      return NextResponse.json({ error: 'payrollMonth is required' }, { status: 400 })
    }

    const payrollMonthShort = payrollMonthParam.slice(0, 7)
    const payrollMonthDate = payrollMonthShort.length === 7 ? `${payrollMonthShort}-01` : payrollMonthShort
    const marker = `[PAYROLL:${payrollMonthShort}]`
    const [yearText, monthText] = payrollMonthShort.split('-')
    const year = Number(yearText)
    const month = Number(monthText)
    const monthStart = Number.isFinite(year) && Number.isFinite(month)
      ? `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-01`
      : payrollMonthDate
    const nextMonthDate = Number.isFinite(year) && Number.isFinite(month)
      ? new Date(Date.UTC(year, month, 1)).toISOString().slice(0, 10)
      : null

    const { data: existingRuns, error: existingRunError } = await admin
      .from('payroll_runs')
      .select('id, status, total_net, payroll_month')
      .eq('organization_id', organizationId)
      .gte('payroll_month', monthStart)
      .lt('payroll_month', nextMonthDate ?? '9999-12-31')

    if (existingRunError) {
      return NextResponse.json({ error: existingRunError.message }, { status: 400 })
    }

    const committedRuns = (existingRuns ?? []).filter((run: any) => isPayrollCashCommitted(run?.status))
    const totalNet = committedRuns.reduce((sum: number, run: any) => sum + Number(run?.total_net ?? 0), 0)

    const { data: payrollTxn } = await admin
      .from('transactions')
      .select('id, bank_account_id, notes, description, date, source_type, subtype, accounting_type')
      .eq('organization_id', organizationId)

    const payrollTransactions = (payrollTxn ?? []).filter((txn: any) => {
      const notes = String(txn?.notes ?? '')
      const sourceType = String(txn?.source_type ?? '').trim().toUpperCase()
      const subtype = String(txn?.subtype ?? '').trim().toUpperCase()
      const accountingType = String(txn?.accounting_type ?? '').trim().toUpperCase()
      const descriptionRaw = String(txn?.description ?? '').trim()
      const description = descriptionRaw.toUpperCase()
      const hasMonthInDescription = description.includes(payrollMonthShort)
      const isPayrollDescription = description.startsWith('PAYROLL -') || description.startsWith('SALARY PAYMENT')

      return (
        notes === marker ||
        sourceType === 'PAYROLL' ||
        (accountingType === 'EXPENSE' && subtype === 'SALARY' && hasMonthInDescription && isPayrollDescription) ||
        description === `PAYROLL - ${payrollMonthShort}`
      )
    })

    if (totalNet > 0) {
      const bankAccountId = payrollTransactions[0]?.bank_account_id ?? (await findSalaryAccount(admin, organizationId))?.id ?? null
      if (bankAccountId) {
        try {
          await adjustBankAccountBalance(admin, bankAccountId, totalNet)
        } catch {
          // best-effort reversal; reset should continue even if account adjustment cannot be completed
        }
      }
    }

    const { error: registerError } = await admin
      .from('payroll_register_entries')
      .update({ transfer_status: 'Pending', transfer_date: null, updated_at: new Date().toISOString() })
      .eq('organization_id', organizationId)
      .eq('payroll_month', payrollMonthShort)

    if (registerError) {
      return NextResponse.json({ error: registerError.message }, { status: 400 })
    }

    const payrollTransactionIds = payrollTransactions
      .map((txn: any) => String(txn.id ?? ''))
      .filter((id: string) => id.length > 0)

    if (payrollTransactionIds.length > 0) {
      const { error: transactionDeleteError } = await admin
        .from('transactions')
        .delete()
        .eq('organization_id', organizationId)
        .in('id', payrollTransactionIds)

      if (transactionDeleteError) {
        return NextResponse.json({ error: transactionDeleteError.message }, { status: 400 })
      }
    }

    if ((existingRuns ?? []).length > 0) {
      const payrollRunIds = (existingRuns ?? [])
        .map((run: any) => String(run.id ?? ''))
        .filter((id: string) => id.length > 0)

      const { error: runDeleteError } = await admin
        .from('payroll_runs')
        .delete()
        .eq('organization_id', organizationId)
        .in('id', payrollRunIds)

      if (runDeleteError) {
        return NextResponse.json({ error: runDeleteError.message }, { status: 400 })
      }
    }

    return NextResponse.json({ success: true, payrollMonth: payrollMonthShort }, { status: 200 })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
