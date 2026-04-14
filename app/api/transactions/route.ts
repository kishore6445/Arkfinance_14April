  import { NextResponse } from 'next/server'
  import { createClient } from '@supabase/supabase-js'

  export const dynamic = 'force-dynamic'

  type TransactionRequest = {
    id?: string
    date: string
    description: string
    amount: number
    isIncome: boolean
    accountingType: 'Revenue' | 'Expense' | 'Asset' | 'Liability'
    subtype: string
    bucketId?: string | null
    vendorCustomerName?: string | null
    paymentMethod?: string | null
    bankAccountId?: string | null
    budgetId?: string | null
    budget_id?: string | null
    invoiceId?: string | null
    status?: string
    gstAmount?: number
    taxableAmount?: number
    gstRate?: number
    gstTreatment?: 'Taxable' | 'Exempt' | 'Nil-rated' | 'RCM' | string
    hsnSacCode?: string
    cgstAmount?: number
    sgstAmount?: number
    igstAmount?: number
    itcEligible?: boolean
    notes?: string
    approvalStatus?: 'Pending Approval' | 'Approved' | 'Rejected' | string
    approval_status?: 'Pending Approval' | 'Approved' | 'Rejected' | string
    approvedBy?: string
    approved_by?: string
    sourceType?: string
    source_type?: string
    sourceReferenceId?: string | null
    source_reference_id?: string | null
    paymentStatus?: 'Recorded' | 'Pending Payment' | 'Partially Paid' | 'Paid' | string
    payment_status?: 'Recorded' | 'Pending Payment' | 'Partially Paid' | 'Paid' | string
    reconciliationStatus?: 'Unreconciled' | 'Reconciled' | 'Flagged' | string
    reconciliation_status?: 'Unreconciled' | 'Reconciled' | 'Flagged' | string
    bankStatementReference?: string | null
    bank_statement_reference?: string | null
    workflowStage?: 'ENTRY' | 'REVIEW' | 'APPROVAL' | 'PROCESSING' | 'RECORDED' | string
    workflow_stage?: 'ENTRY' | 'REVIEW' | 'APPROVAL' | 'PROCESSING' | 'RECORDED' | string
    costCenterCode?: string | null
    cost_center_code?: string | null
    internalNotes?: string | null
    internal_notes?: string | null
    externalNotes?: string | null
    external_notes?: string | null
    complianceRiskLevel?: 'LOW' | 'MEDIUM' | 'HIGH' | string
    compliance_risk_level?: 'LOW' | 'MEDIUM' | 'HIGH' | string
    requiresAudit?: boolean
    requires_audit?: boolean
    lockedBy?: string | null
    locked_by?: string | null
    lockedAt?: string | null
    locked_at?: string | null
    approvedAt?: string | null
    approved_at?: string | null
    rejectedAt?: string | null
    rejected_at?: string | null
    processedAt?: string | null
    processed_at?: string | null
    processedBy?: string | null
    processed_by?: string | null
    impactOnCashFlow?: number | null
    impact_on_cash_flow?: number | null
    impactOnProfit?: number | null
    impact_on_profit?: number | null
    taxLines?: Array<{
      lineType?: string
      line_type?: string
      taxCode?: string | null
      tax_code?: string | null
      rate?: number | null
      taxableAmount?: number | null
      taxable_amount?: number | null
      taxAmount?: number | null
      tax_amount?: number | null
      isItcEligible?: boolean | null
      is_itc_eligible?: boolean | null
      hsnSacCode?: string | null
      hsn_sac_code?: string | null
    }>
  }

  type RequestBody = {
    transaction?: TransactionRequest
    accessToken?: string
    userId?: string
    organizationId?: string
  }

  type UserProfileRow = {
    id: string
    organization_id: string | null
    is_active: boolean | null
    role?: string | null
  }

  function normalizeRoleToken(value: string | null | undefined) {
    return (value ?? '')
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '')
  }

  function isAccountantRole(role: string | null | undefined) {
    return normalizeRoleToken(role) === 'ACCOUNTANT'
  }

  type RecurringTemplateRow = {
    id: string
    organization_id: string
    description: string
    amount: number
    is_income: boolean
    accounting_type?: string | null
    subtype?: string | null
    frequency: string
    start_date: string
    end_date?: string | null
    next_due_date: string
    last_generated_date?: string | null
    occurrences_count?: number | null
    status?: string | null
    auto_apply?: boolean | null
    notes?: string | null
    bank_account_id?: string | null
  }

  // Removed role-based approval check - any user can now approve transactions
  // Previously only Accountant/CA roles could approve

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
        const body = (await clonedRequest.json()) as RequestBody
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


  function buildTransactionPayload(
    transaction: TransactionRequest,
    organizationId: string,
    resolvedId?: string
  ) {
        const t = transaction as any
        const isIncome = t.isIncome ?? t.is_income
        const accountingType = t.accountingType ?? t.accounting_type
        const bucketId = t.bucketId ?? t.bucket_id
        const vendorCustomerName = t.vendorCustomerName ?? t.vendor_customer_name
        const paymentMethod = t.paymentMethod ?? t.payment_method
        const bankAccountId = t.bankAccountId ?? t.bank_account_id
        const budgetId = t.budgetId ?? t.budget_id
        const cgstAmount = Number(t.cgstAmount ?? t.cgst_amount ?? 0)
        const sgstAmount = Number(t.sgstAmount ?? t.sgst_amount ?? 0)
        const igstAmount = Number(t.igstAmount ?? t.igst_amount ?? 0)
        const gstAmountFromBreakdown = cgstAmount + sgstAmount + igstAmount
        const gstAmount = t.gstAmount ?? t.gst_amount ?? (gstAmountFromBreakdown > 0 ? gstAmountFromBreakdown : 0)
        const gstRate = t.gstRate ?? t.gst_rate ?? null
        const taxableAmount = t.taxableAmount ?? t.taxable_amount ?? t.amount
        const invoiceId = t.invoiceId ?? t.invoice_reference ?? t.invoice_id
        const approvalStatus = t.approvalStatus ?? t.approval_status ?? 'Pending Approval'
        const approvedBy = t.approvedBy ?? t.approved_by
        const paymentStatus = t.paymentStatus ?? t.payment_status ?? 'Recorded'
        const reconciliationStatus = t.reconciliationStatus ?? t.reconciliation_status
        const bankStatementReference = t.bankStatementReference ?? t.bank_statement_reference ?? null
          const explicitSourceTypeRaw = t.sourceType ?? t.source_type
          const explicitSourceType =
            typeof explicitSourceTypeRaw === 'string' && explicitSourceTypeRaw.trim().length > 0
              ? explicitSourceTypeRaw.trim().toUpperCase()
              : null
          const explicitSourceReference =
            t.sourceReferenceId ?? t.source_reference_id ?? null
          const workflowStageRaw = t.workflowStage ?? t.workflow_stage
          const workflowStage =
            typeof workflowStageRaw === 'string' && workflowStageRaw.trim().length > 0
              ? workflowStageRaw.trim().toUpperCase()
              : 'ENTRY'
          const costCenterCode = t.costCenterCode ?? t.cost_center_code ?? null
          const internalNotes = t.internalNotes ?? t.internal_notes ?? null
          const externalNotes = t.externalNotes ?? t.external_notes ?? null
          const complianceRiskLevelRaw = t.complianceRiskLevel ?? t.compliance_risk_level
          const complianceRiskLevel =
            typeof complianceRiskLevelRaw === 'string' && complianceRiskLevelRaw.trim().length > 0
              ? complianceRiskLevelRaw.trim().toUpperCase()
              : null
          const requiresAudit =
            typeof (t.requiresAudit ?? t.requires_audit) === 'boolean'
              ? Boolean(t.requiresAudit ?? t.requires_audit)
              : false
          const lockedBy = t.lockedBy ?? t.locked_by ?? null
          const lockedAt = t.lockedAt ?? t.locked_at ?? null
          const approvedAt = t.approvedAt ?? t.approved_at ?? null
          const rejectedAt = t.rejectedAt ?? t.rejected_at ?? null
          const processedAt = t.processedAt ?? t.processed_at ?? null
          const processedBy = t.processedBy ?? t.processed_by ?? null
          const impactOnCashFlow = t.impactOnCashFlow ?? t.impact_on_cash_flow ?? null
          const impactOnProfit = t.impactOnProfit ?? t.impact_on_profit ?? null

          const sourceType = explicitSourceType ?? (invoiceId ? 'INVOICE' : 'MANUAL')
          const sourceReferenceId = explicitSourceReference ?? invoiceId ?? null

    return {
      ...(resolvedId ? { id: resolvedId } : {}),
      organization_id: organizationId,
      date: t.date,
      description: t.description.trim(),
      amount: t.amount,
        is_income: isIncome,
        accounting_type: accountingType,
      subtype: t.subtype,
        bucket_id: bucketId ?? null,
        vendor_customer_name: vendorCustomerName ?? null,
        bank_account_id: bankAccountId ?? null,
        budget_id: budgetId ?? null,
        assigned_bank_account_id: bankAccountId ?? null,
      status: t.status ?? 'DRAFT',
        gst_rate: gstRate,
        gst_amount: gstAmount,
        gst_taxable: taxableAmount,
      notes: t.notes ?? '',
        invoice_reference: invoiceId ?? null,
        approval_status: approvalStatus ?? null,
        approved_by: approvedBy ?? null,
        source_type: sourceType,
        source_reference_id: sourceReferenceId,
        payment_status: paymentStatus,
        reconciliation_status: reconciliationStatus ?? null,
        bank_statement_reference: bankStatementReference,
        workflow_stage: workflowStage,
        cost_center_code: costCenterCode,
        internal_notes: internalNotes,
        external_notes: externalNotes,
        compliance_risk_level: complianceRiskLevel,
        requires_audit: requiresAudit,
        locked_by: lockedBy,
        locked_at: lockedAt,
        approved_at: approvedAt,
        rejected_at: rejectedAt,
        processed_at: processedAt,
        processed_by: processedBy,
        impact_on_cash_flow: impactOnCashFlow,
        impact_on_profit: impactOnProfit,
    }
  }

function stripSourceColumns(payload: Record<string, unknown>) {
  const sanitized = { ...payload }
  delete sanitized.source_type
  delete sanitized.source_reference_id
  return sanitized
}

function stripUnsupportedColumns(payload: Record<string, unknown>, errorMessage: string | undefined) {
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
  maybeRemove('budget_id')
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

  return sanitized
}

function isMissingSourceColumnsError(errorMessage: string | undefined) {
  if (!errorMessage) {
    return false
  }

  const normalized = errorMessage.toLowerCase()

  // Catch any "column X does not exist" Postgres error so the retry with stripped columns runs
  if (
    normalized.includes('does not exist') ||
    normalized.includes('column') && normalized.includes('unknown')
  ) {
    return true
  }

  return (
    normalized.includes('source_type') ||
    normalized.includes('source_reference_id') ||
    normalized.includes('payment_status') ||
    normalized.includes('reconciliation_status') ||
    normalized.includes('bank_statement_reference') ||
    normalized.includes('assigned_bank_account_id') ||
    normalized.includes('workflow_stage') ||
    normalized.includes('cost_center_code') ||
    normalized.includes('internal_notes') ||
    normalized.includes('external_notes') ||
    normalized.includes('compliance_risk_level') ||
    normalized.includes('requires_audit') ||
    normalized.includes('locked_by') ||
    normalized.includes('locked_at') ||
    normalized.includes('approved_at') ||
    normalized.includes('rejected_at') ||
    normalized.includes('processed_at') ||
    normalized.includes('processed_by') ||
    normalized.includes('impact_on_cash_flow') ||
    normalized.includes('impact_on_profit')
  )
}

    

  


  // async function selectTransactionsByOrganization(admin: ReturnType<typeof getAdminClient>, organizationId: string) {
  //   const variants = [
  //     () =>
  //       admin
  //         .from('transactions')
  //         .select('*')
  //         .eq('organizationid', organizationId)
  //         .order('createdat', { ascending: false }),
  //     () =>
  //       admin
  //         .from('transactions')
  //         .select('*')
  //         .eq('organization_id', organizationId)
  //         .order('created_at', { ascending: false }),
  //   ]
async function selectTransactionsByOrganization(
  admin: ReturnType<typeof getAdminClient>,
  organizationId: string
) {
  const { data, error } = await admin
    .from('transactions')
    .select('*')
    .eq('organization_id', organizationId)
    .order('created_at', { ascending: false })

  if (error || !data?.length) {
    return { data: data ?? [], error }
  }

  const transactionIds = data
    .map((row: any) => row.id)
    .filter((id: string | undefined): id is string => Boolean(id))

  const { data: taxLines, error: taxLinesError } = await admin
    .from('transaction_tax_lines')
    .select('transaction_id, line_type, tax_code, rate, taxable_amount, tax_amount, is_itc_eligible, hsn_sac_code')
    .in('transaction_id', transactionIds)

  if (!taxLinesError) {
    const taxLinesByTransactionId = new Map<string, any[]>()
    for (const line of taxLines ?? []) {
      const existing = taxLinesByTransactionId.get(line.transaction_id) ?? []
      existing.push(line)
      taxLinesByTransactionId.set(line.transaction_id, existing)
    }

    const mergedWithTaxLines = data.map((row: any) => {
      const lines = taxLinesByTransactionId.get(row.id) ?? []
      if (!lines.length) {
        return row
      }

      const firstLine = lines[0]
      const cgstAmount = lines
        .filter((l) => (l.line_type ?? '').toUpperCase() === 'CGST')
        .reduce((sum, l) => sum + Number(l.tax_amount ?? 0), 0)
      const sgstAmount = lines
        .filter((l) => (l.line_type ?? '').toUpperCase() === 'SGST')
        .reduce((sum, l) => sum + Number(l.tax_amount ?? 0), 0)
      const igstAmount = lines
        .filter((l) => (l.line_type ?? '').toUpperCase() === 'IGST')
        .reduce((sum, l) => sum + Number(l.tax_amount ?? 0), 0)

      return {
        ...row,
        gst_rate: firstLine?.rate ?? null,
        gst_treatment: firstLine?.tax_code ?? null,
        hsn_sac_code: firstLine?.hsn_sac_code ?? null,
        cgst_amount: cgstAmount,
        sgst_amount: sgstAmount,
        igst_amount: igstAmount,
        itc_eligible: firstLine?.is_itc_eligible ?? null,
        tax_lines: lines,
      }
    })

    return { data: mergedWithTaxLines, error }
  }

  // Backward-compatible fallback for older deployments still using transaction_items.
  const { data: items } = await admin
    .from('transaction_items')
    .select('transaction_id, gst_rate, gst_treatment, hsn_sac_code, cgst_amount, sgst_amount, igst_amount, itc_eligible')
    .in('transaction_id', transactionIds)

  const itemsByTransactionId = new Map<string, any>()
  for (const item of items ?? []) {
    itemsByTransactionId.set(item.transaction_id, item)
  }

  const merged = data.map((row: any) => {
    const item = itemsByTransactionId.get(row.id)
    if (!item) {
      return row
    }

    return {
      ...row,
      gst_rate: item.gst_rate,
      gst_treatment: item.gst_treatment,
      hsn_sac_code: item.hsn_sac_code,
      cgst_amount: item.cgst_amount,
      sgst_amount: item.sgst_amount,
      igst_amount: item.igst_amount,
      itc_eligible: item.itc_eligible,
    }
  })

  return { data: merged, error }
}

type TransactionReportGroupBy =
  | 'month'
  | 'day'
  | 'week'
  | 'accountingType'
  | 'subtype'
  | 'status'
  | 'paymentStatus'
  | 'vendor'

function normalizeDateOnly(value: unknown): string | null {
  if (typeof value !== 'string' || !value.trim()) {
    return null
  }

  const raw = value.trim()
  const dateOnly = raw.includes('T') ? raw.split('T')[0] : raw
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateOnly)) {
    return null
  }

  return dateOnly
}

function queryParamTruthy(value: string | null) {
  if (!value) {
    return false
  }

  const token = value.trim().toLowerCase()
  return token === '1' || token === 'true' || token === 'yes'
}

function getIsoWeekKey(dateOnly: string) {
  const date = new Date(`${dateOnly}T00:00:00Z`)
  if (Number.isNaN(date.getTime())) {
    return 'unknown'
  }

  const day = date.getUTCDay() || 7
  date.setUTCDate(date.getUTCDate() + 4 - day)
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1))
  const weekNo = Math.ceil(((date.getTime() - yearStart.getTime()) / 86400000 + 1) / 7)
  return `${date.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`
}

function getReportBucketKey(txn: any, groupBy: TransactionReportGroupBy) {
  const dateOnly = normalizeDateOnly(txn.date) ?? 'unknown'
  if (groupBy === 'day') {
    return dateOnly
  }

  if (groupBy === 'week') {
    return dateOnly === 'unknown' ? 'unknown' : getIsoWeekKey(dateOnly)
  }

  if (groupBy === 'accountingType') {
    return String(txn.accounting_type ?? txn.accountingType ?? 'Uncategorized')
  }

  if (groupBy === 'subtype') {
    return String(txn.subtype ?? 'Uncategorized')
  }

  if (groupBy === 'status') {
    return String(txn.status ?? txn.approval_status ?? 'Unknown')
  }

  if (groupBy === 'paymentStatus') {
    return String(txn.payment_status ?? txn.paymentStatus ?? 'Unknown')
  }

  if (groupBy === 'vendor') {
    return String(txn.vendor_customer_name ?? txn.vendorCustomerName ?? 'Unassigned')
  }

  if (dateOnly === 'unknown') {
    return 'unknown'
  }

  return dateOnly.slice(0, 7)
}

function buildTransactionReport(
  transactions: any[],
  options: {
    startDate: string | null
    endDate: string | null
    groupBy: TransactionReportGroupBy
    accountingType: string | null
    isIncomeFilter: boolean | null
  }
) {
  const { startDate, endDate, groupBy, accountingType, isIncomeFilter } = options

  const filtered = transactions.filter((txn) => {
    const txnDate = normalizeDateOnly(txn.date)
    if (startDate && (!txnDate || txnDate < startDate)) {
      return false
    }

    if (endDate && (!txnDate || txnDate > endDate)) {
      return false
    }

    if (accountingType) {
      const token = String(txn.accounting_type ?? txn.accountingType ?? '').trim().toUpperCase()
      if (token !== accountingType) {
        return false
      }
    }

    if (typeof isIncomeFilter === 'boolean') {
      const isIncome = Boolean(txn.is_income ?? txn.isIncome)
      if (isIncome !== isIncomeFilter) {
        return false
      }
    }

    return true
  })

  let totalInflow = 0
  let totalOutflow = 0
  let amountTotal = 0

  const buckets = new Map<string, { count: number; inflow: number; outflow: number; net: number }>()
  const byAccountingType = new Map<string, { count: number; amount: number }>()
  const byPaymentStatus = new Map<string, { count: number; amount: number }>()
  const topTransactions = filtered
    .map((txn) => {
      const amount = Number(txn.amount ?? 0)
      const isIncome = Boolean(txn.is_income ?? txn.isIncome)
      return {
        id: String(txn.id ?? ''),
        date: normalizeDateOnly(txn.date) ?? String(txn.date ?? ''),
        description: String(txn.description ?? ''),
        accountingType: String(txn.accounting_type ?? txn.accountingType ?? 'Uncategorized'),
        paymentStatus: String(txn.payment_status ?? txn.paymentStatus ?? 'Unknown'),
        amount,
        isIncome,
      }
    })
    .sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount))
    .slice(0, 10)

  for (const txn of filtered) {
    const amount = Number(txn.amount ?? 0)
    const isIncome = Boolean(txn.is_income ?? txn.isIncome)
    const bucketKey = getReportBucketKey(txn, groupBy)
    const accountingTypeKey = String(txn.accounting_type ?? txn.accountingType ?? 'Uncategorized')
    const paymentStatusKey = String(txn.payment_status ?? txn.paymentStatus ?? 'Unknown')

    if (isIncome) {
      totalInflow += amount
    } else {
      totalOutflow += amount
    }
    amountTotal += amount

    const existingBucket = buckets.get(bucketKey) ?? { count: 0, inflow: 0, outflow: 0, net: 0 }
    existingBucket.count += 1
    if (isIncome) {
      existingBucket.inflow += amount
    } else {
      existingBucket.outflow += amount
    }
    existingBucket.net = existingBucket.inflow - existingBucket.outflow
    buckets.set(bucketKey, existingBucket)

    const existingAccountingType = byAccountingType.get(accountingTypeKey) ?? { count: 0, amount: 0 }
    existingAccountingType.count += 1
    existingAccountingType.amount += amount
    byAccountingType.set(accountingTypeKey, existingAccountingType)

    const existingPaymentStatus = byPaymentStatus.get(paymentStatusKey) ?? { count: 0, amount: 0 }
    existingPaymentStatus.count += 1
    existingPaymentStatus.amount += amount
    byPaymentStatus.set(paymentStatusKey, existingPaymentStatus)
  }

  const grouped = Array.from(buckets.entries())
    .map(([key, value]) => ({
      key,
      count: value.count,
      inflow: Number(value.inflow.toFixed(2)),
      outflow: Number(value.outflow.toFixed(2)),
      net: Number(value.net.toFixed(2)),
    }))
    .sort((a, b) => a.key.localeCompare(b.key))

  const accountingTypeBreakdown = Array.from(byAccountingType.entries())
    .map(([key, value]) => ({
      key,
      count: value.count,
      amount: Number(value.amount.toFixed(2)),
    }))
    .sort((a, b) => b.amount - a.amount)

  const paymentStatusBreakdown = Array.from(byPaymentStatus.entries())
    .map(([key, value]) => ({
      key,
      count: value.count,
      amount: Number(value.amount.toFixed(2)),
    }))
    .sort((a, b) => b.amount - a.amount)

  const totalTransactions = filtered.length
  const netCashFlow = totalInflow - totalOutflow

  return {
    filters: {
      startDate,
      endDate,
      groupBy,
      accountingType,
      isIncome: isIncomeFilter,
    },
    summary: {
      totalTransactions,
      totalInflow: Number(totalInflow.toFixed(2)),
      totalOutflow: Number(totalOutflow.toFixed(2)),
      netCashFlow: Number(netCashFlow.toFixed(2)),
      averageTransactionValue: totalTransactions > 0 ? Number((amountTotal / totalTransactions).toFixed(2)) : 0,
    },
    grouped,
    accountingTypeBreakdown,
    paymentStatusBreakdown,
    topTransactions,
  }
}

function hasTransactionItemFields(transaction: TransactionRequest | Record<string, unknown>) {
  const t = transaction as Record<string, unknown>
  const keys = [
    'gstRate',
    'gst_rate',
    'gstTreatment',
    'gst_treatment',
    'hsnSacCode',
    'hsn_sac_code',
    'cgstAmount',
    'cgst_amount',
    'sgstAmount',
    'sgst_amount',
    'igstAmount',
    'igst_amount',
    'itcEligible',
    'itc_eligible',
  ]

  return keys.some((key) => {
    const value = t[key]
    if (value === undefined || value === null) {
      return false
    }

    if (typeof value === 'string') {
      return value.trim().length > 0
    }

    return true
  })
}

async function upsertTransactionItem(
  admin: ReturnType<typeof getAdminClient>,
  organizationId: string,
  transactionId: string,
  transaction: TransactionRequest | Record<string, unknown>
) {
  const t = transaction as any

  const { data: existingItem, error: existingItemError } = await admin
    .from('transaction_items')
    .select('id')
    .eq('transaction_id', transactionId)
    .maybeSingle()

  if (existingItemError) {
    return existingItemError
  }

  const payload = {
    id: existingItem?.id ?? crypto.randomUUID(),
    transaction_id: transactionId,
    organization_id: organizationId,
    gst_rate: t.gstRate ?? t.gst_rate ?? null,
    gst_treatment: t.gstTreatment ?? t.gst_treatment ?? null,
    hsn_sac_code: t.hsnSacCode ?? t.hsn_sac_code ?? null,
    cgst_amount: t.cgstAmount ?? t.cgst_amount ?? null,
    sgst_amount: t.sgstAmount ?? t.sgst_amount ?? null,
    igst_amount: t.igstAmount ?? t.igst_amount ?? null,
    itc_eligible:
      typeof (t.itcEligible ?? t.itc_eligible) === 'boolean'
        ? Boolean(t.itcEligible ?? t.itc_eligible)
        : null,
    updated_at: new Date().toISOString(),
  }

  const { error } = await admin
    .from('transaction_items')
    .upsert(payload, { onConflict: 'transaction_id' })

  return error
}

function hasTransactionTaxLineFields(transaction: TransactionRequest | Record<string, unknown>) {
  const t = transaction as Record<string, unknown>
  if (Array.isArray(t.taxLines) && t.taxLines.length > 0) {
    return true
  }

  const keys = [
    'gstRate',
    'gst_rate',
    'gstTreatment',
    'gst_treatment',
    'hsnSacCode',
    'hsn_sac_code',
    'cgstAmount',
    'cgst_amount',
    'sgstAmount',
    'sgst_amount',
    'igstAmount',
    'igst_amount',
    'itcEligible',
    'itc_eligible',
  ]

  return keys.some((key) => {
    const value = t[key]
    if (value === undefined || value === null) {
      return false
    }

    if (typeof value === 'string') {
      return value.trim().length > 0
    }

    return true
  })
}

async function replaceTransactionTaxLines(
  admin: ReturnType<typeof getAdminClient>,
  organizationId: string,
  transactionId: string,
  transaction: TransactionRequest | Record<string, unknown>,
  userId?: string | null
) {
  const t = transaction as any
  const { error: deleteError } = await admin
    .from('transaction_tax_lines')
    .delete()
    .eq('transaction_id', transactionId)

  if (deleteError) {
    return deleteError
  }

  const explicitLines = Array.isArray(t.taxLines) ? t.taxLines : []
  const linesToInsert: Array<Record<string, unknown>> = []

  if (explicitLines.length > 0) {
    for (const line of explicitLines) {
      linesToInsert.push({
        id: crypto.randomUUID(),
        transaction_id: transactionId,
        organization_id: organizationId,
        line_type: (line.lineType ?? line.line_type ?? 'OTHER').toString().toUpperCase(),
        tax_code: line.taxCode ?? line.tax_code ?? null,
        rate: line.rate ?? null,
        taxable_amount: line.taxableAmount ?? line.taxable_amount ?? null,
        tax_amount: line.taxAmount ?? line.tax_amount ?? 0,
        is_itc_eligible: line.isItcEligible ?? line.is_itc_eligible ?? null,
        hsn_sac_code: line.hsnSacCode ?? line.hsn_sac_code ?? null,
        created_by: userId ?? null,
        updated_at: new Date().toISOString(),
      })
    }
  } else {
    const gstRate = t.gstRate ?? t.gst_rate ?? null
    const gstTreatment = t.gstTreatment ?? t.gst_treatment ?? null
    const hsnSacCode = t.hsnSacCode ?? t.hsn_sac_code ?? null
    const taxableAmount = t.taxableAmount ?? t.taxable_amount ?? t.amount ?? null
    const itcEligible =
      typeof (t.itcEligible ?? t.itc_eligible) === 'boolean'
        ? Boolean(t.itcEligible ?? t.itc_eligible)
        : null

    const composed = [
      { lineType: 'CGST', taxAmount: t.cgstAmount ?? t.cgst_amount },
      { lineType: 'SGST', taxAmount: t.sgstAmount ?? t.sgst_amount },
      { lineType: 'IGST', taxAmount: t.igstAmount ?? t.igst_amount },
    ]

    for (const item of composed) {
      const amount = Number(item.taxAmount ?? 0)
      if (amount <= 0) {
        continue
      }

      linesToInsert.push({
        id: crypto.randomUUID(),
        transaction_id: transactionId,
        organization_id: organizationId,
        line_type: item.lineType,
        tax_code: gstTreatment,
        rate: gstRate,
        taxable_amount: taxableAmount,
        tax_amount: amount,
        is_itc_eligible: itcEligible,
        hsn_sac_code: hsnSacCode,
        created_by: userId ?? null,
        updated_at: new Date().toISOString(),
      })
    }
  }

  if (!linesToInsert.length) {
    return null
  }

  const { error } = await admin
    .from('transaction_tax_lines')
    .insert(linesToInsert)

  return error
}

async function adjustBankAccountBalance(
  admin: ReturnType<typeof getAdminClient>,
  bankAccountId: string,
  delta: number
) {
  if (!bankAccountId || delta === 0) {
    return
  }

  const { data: acc } = await admin
    .from('bank_accounts')
    .select('balance')
    .eq('id', bankAccountId)
    .maybeSingle()

  if (acc) {
    await admin
      .from('bank_accounts')
      .update({ balance: Number(acc.balance ?? 0) + delta })
      .eq('id', bankAccountId)
  }
}

function normalizeUpper(value: unknown) {
  if (typeof value !== 'string') {
    return ''
  }

  return value.trim().toUpperCase()
}

function normalizeToken(value: unknown) {
  return normalizeUpper(value).replace(/[^A-Z0-9]+/g, '_').replace(/^_+|_+$/g, '')
}

function paymentStatusCandidates(value: unknown) {
  if (typeof value !== 'string' || !value.trim()) {
    return []
  }

  const trimmed = value.trim()
  const token = normalizeToken(trimmed)
  const variants = new Set<string>([trimmed, token, token.toLowerCase()])

  if (token === 'RECORDED') {
    variants.add('Recorded')
    variants.add('recorded')
  } else if (token === 'PENDING_PAYMENT') {
    variants.add('Pending Payment')
    variants.add('pending payment')
  } else if (token === 'PARTIALLY_PAID') {
    variants.add('Partially Paid')
    variants.add('partially paid')
  } else if (token === 'PAID') {
    variants.add('Paid')
    variants.add('paid')
  }

  return Array.from(variants)
}

function isPaymentStatusConstraintError(message: string | undefined) {
  if (!message) {
    return false
  }

  const normalized = message.toLowerCase()
  return normalized.includes('transactions_payment_status_check') || normalized.includes('payment_status_check')
}

function parseIsoDate(dateValue: string | null | undefined) {
  if (!dateValue) {
    return null
  }

  const parsed = new Date(`${dateValue}T00:00:00.000Z`)
  if (Number.isNaN(parsed.getTime())) {
    return null
  }

  return parsed
}

function isPaymentOnlyUpdate(transaction: TransactionRequest | undefined) {
  if (!transaction || !transaction.id) {
    return false
  }

  const allowedKeys = new Set([
    'id',
    'paymentStatus',
    'payment_status',
    'reconciliationStatus',
    'reconciliation_status',
    'bankStatementReference',
    'bank_statement_reference',
    'invoice_reference',
    'invoiceId',
    'invoiceRef',
    'invoice',
  ])

  return Object.keys(transaction).every((key) => allowedKeys.has(key))
}

function isApprovalOnlyUpdate(transaction: TransactionRequest | undefined) {
  if (!transaction || !transaction.id) {
    return false
  }

  const allowedKeys = new Set([
    'id',
    'approvalStatus',
    'approval_status',
    'approvedBy',
    'approved_by',
  ])

  return Object.keys(transaction).every((key) => allowedKeys.has(key))
}

function approvalStatusCandidates(value: unknown) {
  if (typeof value !== 'string' || !value.trim()) {
    return []
  }

  const trimmed = value.trim()
  const token = normalizeToken(trimmed)
  const variants = new Set<string>([trimmed, token, token.toLowerCase()])

  if (token === 'PENDING_APPROVAL') {
    variants.add('Pending Approval')
    variants.add('pending approval')
  } else if (token === 'APPROVED' || token === 'APPROVED_FOR_PAYMENT') {
    variants.add('Approved')
    variants.add('approved')
  } else if (token === 'REJECTED') {
    variants.add('Rejected')
    variants.add('rejected')
  }

  return Array.from(variants)
}

function isApprovalStatusConstraintError(message: string | undefined) {
  if (!message) {
    return false
  }

  const normalized = message.toLowerCase()
  return normalized.includes('approval_status_check') || normalized.includes('transactions_approval_status_check')
}

function formatIsoDate(date: Date) {
  return date.toISOString().slice(0, 10)
}

function addDays(date: Date, days: number) {
  const next = new Date(date)
  next.setUTCDate(next.getUTCDate() + days)
  return next
}

function addMonths(date: Date, months: number) {
  const next = new Date(date)
  const day = next.getUTCDate()
  next.setUTCDate(1)
  next.setUTCMonth(next.getUTCMonth() + months)

  const lastDay = new Date(Date.UTC(next.getUTCFullYear(), next.getUTCMonth() + 1, 0)).getUTCDate()
  next.setUTCDate(Math.min(day, lastDay))
  return next
}

function computeNextDueDate(currentDueDate: string, frequency: string) {
  const current = parseIsoDate(currentDueDate)
  if (!current) {
    return currentDueDate
  }

  const normalized = normalizeUpper(frequency)
  if (normalized === 'WEEKLY') {
    return formatIsoDate(addDays(current, 7))
  }

  if (normalized === 'BIWEEKLY') {
    return formatIsoDate(addDays(current, 14))
  }

  if (normalized === 'QUARTERLY') {
    return formatIsoDate(addMonths(current, 3))
  }

  if (normalized === 'ANNUALLY' || normalized === 'YEARLY') {
    return formatIsoDate(addMonths(current, 12))
  }

  return formatIsoDate(addMonths(current, 1))
}

function buildRecurringMarker(templateId: string) {
  return `[RECURRING_TEMPLATE:${templateId}]`
}

async function insertRecurringTransactionWithFallbackStatus(
  admin: ReturnType<typeof getAdminClient>,
  basePayload: Record<string, unknown>
) {
  const statusCandidates = [
    'PENDING_APPROVAL',
    'DRAFT',
    'PENDING',
    'RECORDED',
    'Recorded',
    'Needs Info',
    'Action Required',
  ]
  let lastErrorMessage = ''

  for (const candidate of statusCandidates) {
    const payload = {
      ...basePayload,
      status: candidate,
    }

    let { error: insertError } = await admin
      .from('transactions')
      .insert(payload)

    if (insertError) {
      const fallbackPayload = stripUnsupportedColumns(payload, insertError.message)
      ;({ error: insertError } = await admin
        .from('transactions')
        .insert(fallbackPayload))
    }

    if (!insertError) {
      return null
    }

    lastErrorMessage = insertError.message
    if (!insertError.message.toLowerCase().includes('transactions_status_check')) {
      break
    }
  }

  return new Error(lastErrorMessage || 'Unable to insert recurring transaction')
}

async function materializeRecurringTransactions(
  admin: ReturnType<typeof getAdminClient>,
  organizationId: string
) {
  const { data: templates, error } = await admin
    .from('recurring_transaction_templates')
    .select('*')
    .eq('organization_id', organizationId)

  if (error) {
    const message = error.message.toLowerCase()
    if (message.includes('recurring_transaction_templates') || message.includes('does not exist')) {
      return
    }
    throw new Error(`Failed to load recurring templates: ${error.message}`)
  }

  const today = formatIsoDate(new Date())

  for (const template of (templates ?? []) as RecurringTemplateRow[]) {
    const normalizedTemplateStatus = normalizeUpper(template.status ?? 'Active')
    if (normalizedTemplateStatus === 'PAUSED' || normalizedTemplateStatus === 'COMPLETED') {
      continue
    }

    if (template.auto_apply === false) {
      continue
    }

    const marker = buildRecurringMarker(template.id)
    const initialDueDate = parseIsoDate(template.next_due_date)
    if (!initialDueDate) {
      continue
    }

    let nextDueDate = formatIsoDate(initialDueDate)
    let lastGeneratedDate = template.last_generated_date ?? null
    let occurrences = Number(template.occurrences_count ?? 0)
    let nextStatus = template.status ?? 'Active'
    let safetyCounter = 0

    while (nextDueDate <= today) {
      safetyCounter += 1
      if (safetyCounter > 120) {
        break
      }

      if (template.end_date && nextDueDate > template.end_date) {
        nextStatus = 'Completed'
        break
      }

      const { data: existingTransaction, error: existingError } = await admin
        .from('transactions')
        .select('id')
        .eq('organization_id', organizationId)
        .eq('date', nextDueDate)
        .eq('notes', marker)
        .maybeSingle()

      if (existingError) {
        console.error('[Recurring Materialize] Duplicate check failed:', existingError.message)
        break
      }

      if (!existingTransaction) {
        const payload: Record<string, unknown> = {
          id: crypto.randomUUID(),
          organization_id: organizationId,
          date: nextDueDate,
          description: template.description,
          amount: Number(template.amount ?? 0),
          is_income: Boolean(template.is_income),
          accounting_type: template.accounting_type ?? (template.is_income ? 'Revenue' : 'Expense'),
          subtype: template.subtype ?? 'Other',
          bucket_id: null,
          vendor_customer_name: null,
          bank_account_id: template.bank_account_id ?? null,
          assigned_bank_account_id: template.bank_account_id ?? null,
          notes: marker,
          source_type: 'RECURRING',
          source_reference_id: template.id,
          workflow_stage: 'ENTRY',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }

        const insertError = await insertRecurringTransactionWithFallbackStatus(admin, payload)
        if (insertError) {
          console.error('[Recurring Materialize] Failed to create recurring transaction:', insertError.message)
          break
        }
      }

      lastGeneratedDate = nextDueDate
      occurrences += 1

      const computedNextDueDate = computeNextDueDate(nextDueDate, template.frequency)
      if (computedNextDueDate === nextDueDate) {
        break
      }

      nextDueDate = computedNextDueDate

      if (template.end_date && nextDueDate > template.end_date) {
        nextStatus = 'Completed'
        break
      }
    }

    if (
      nextDueDate !== template.next_due_date ||
      lastGeneratedDate !== (template.last_generated_date ?? null) ||
      occurrences !== Number(template.occurrences_count ?? 0) ||
      nextStatus !== (template.status ?? 'Active')
    ) {
      const { error: updateError } = await admin
        .from('recurring_transaction_templates')
        .update({
          next_due_date: nextDueDate,
          last_generated_date: lastGeneratedDate,
          occurrences_count: occurrences,
          status: nextStatus,
          updated_at: new Date().toISOString(),
        })
        .eq('id', template.id)
        .eq('organization_id', organizationId)

      if (updateError) {
        console.error('[Recurring Materialize] Failed to update template progress:', updateError.message)
      }
    }
  }
}

async function materializePayrollTransactions(
  admin: ReturnType<typeof getAdminClient>,
  organizationId: string
) {
  const { data: payrollRuns, error: payrollRunsError } = await admin
    .from('payroll_runs')
    .select('id, payroll_month, payroll_date, total_net, status')
    .eq('organization_id', organizationId)

  if (payrollRunsError || !payrollRuns?.length) {
    return
  }

  const eligibleRuns = payrollRuns.filter((row: any) => {
    const status = String(row.status ?? '').trim().toUpperCase()
    return (status === 'DRAFT' || status === 'PROCESSED' || status === 'APPROVED' || status === 'REJECTED') && Number(row.total_net ?? 0) > 0
  })

  if (!eligibleRuns.length) {
    return
  }

  const markers = eligibleRuns.map((row: any) => {
    const payrollMonthShort = typeof row.payroll_month === 'string' ? row.payroll_month.slice(0, 7) : ''
    return `[PAYROLL:${payrollMonthShort}:${String(row.id ?? '')}]`
  })

  const salaryAccountId = await findSalaryAccountId(admin, organizationId)

  const { data: existingTransactions } = await admin
    .from('transactions')
    .select('id, notes, amount, approval_status, payment_status, status, bank_account_id, assigned_bank_account_id')
    .eq('organization_id', organizationId)
    .in('notes', markers)

  const eligibleRunIds = eligibleRuns
    .map((row: any) => String(row.id ?? '').trim())
    .filter((id: string) => id.length > 0)

  const postedAmountByRunId = new Map<string, number>()
  if (eligibleRunIds.length > 0) {
    const { data: existingRunTransactions } = await admin
      .from('transactions')
      .select('source_reference_id, amount, source_type')
      .eq('organization_id', organizationId)
      .in('source_reference_id', eligibleRunIds)

    for (const txn of existingRunTransactions ?? []) {
      const sourceTypeToken = normalizeToken((txn as any)?.source_type)
      if (sourceTypeToken !== 'PAYROLL') {
        continue
      }

      const runId = String((txn as any)?.source_reference_id ?? '').trim()
      if (!runId) {
        continue
      }

      const amount = Number((txn as any)?.amount ?? 0)
      postedAmountByRunId.set(runId, (postedAmountByRunId.get(runId) ?? 0) + amount)
    }
  }

  const existingByMarker = new Map(
    (existingTransactions ?? []).map((row: any) => [String(row.notes ?? ''), row])
  )
  const statusCandidates = ['Recorded', 'RECORDED', 'DRAFT', 'PENDING']

  for (const row of eligibleRuns) {
    const payrollMonthShort = typeof row.payroll_month === 'string' ? row.payroll_month.slice(0, 7) : ''
    const payrollRunId = String(row.id ?? '')
    const marker = `[PAYROLL:${payrollMonthShort}:${payrollRunId}]`
    if (!payrollMonthShort) {
      continue
    }

    const normalizedRunStatus = String(row.status ?? '').trim().toUpperCase()
    const approvalStatus = normalizedRunStatus === 'APPROVED'
      ? 'Approved'
      : normalizedRunStatus === 'REJECTED'
        ? 'Rejected'
        : 'Pending Approval'
    const paymentStatus = normalizedRunStatus === 'APPROVED'
      ? 'Paid'
      : 'Pending Payment'

    const existingRow = existingByMarker.get(marker) as Record<string, unknown> | undefined
    if (existingRow?.id) {
      const existingAmount = Number(existingRow.amount ?? 0)
      const nextAmount = Number(row.total_net ?? 0)
      const postedAmount = Number(postedAmountByRunId.get(payrollRunId) ?? existingAmount)
      const existingIsCommitted = isApprovedForCashMovement(
        existingRow.approval_status,
        existingRow.payment_status,
        existingRow.status
      )

      let updatePayload: Record<string, unknown> = {
        amount: nextAmount,
        approval_status: approvalStatus,
        payment_status: paymentStatus,
        updated_at: new Date().toISOString(),
      }

      if (existingIsCommitted) {
        const committedApprovalStatus = 'Approved'
        const committedPaymentStatus = 'Paid'

        // Never mutate committed payroll amount; append a delta transaction when payroll increases.
        const deltaAmount = nextAmount - postedAmount
        if (deltaAmount > 0) {
          for (const status of statusCandidates) {
            const adjustmentPayload: Record<string, unknown> = {
              id: crypto.randomUUID(),
              organization_id: organizationId,
              date: row.payroll_date,
              description: `Payroll Adjustment - ${payrollMonthShort}`,
              amount: deltaAmount,
              is_income: false,
              accounting_type: 'Expense',
              subtype: 'Salary',
              notes: `[PAYROLL_ADJUSTMENT:${payrollMonthShort}:${payrollRunId}:${Date.now()}]`,
              source_type: 'payroll',
              source_reference_id: payrollRunId,
              status,
              approval_status: committedApprovalStatus,
              payment_status: committedPaymentStatus,
              approved_by: 'system',
              approved_at: new Date().toISOString(),
              ...(salaryAccountId ? { bank_account_id: salaryAccountId, assigned_bank_account_id: salaryAccountId } : {}),
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            }

            let insertPayload: Record<string, unknown> = adjustmentPayload
            let { error } = await admin.from('transactions').insert(insertPayload)
            let retryCount = 0

            while (error && retryCount < 5) {
              const nextPayload = stripUnsupportedColumns(insertPayload, error.message)
              if (JSON.stringify(nextPayload) === JSON.stringify(insertPayload)) {
                break
              }
              insertPayload = nextPayload
              ;({ error } = await admin.from('transactions').insert(insertPayload))
              retryCount++
            }

            if (!error) {
              postedAmountByRunId.set(payrollRunId, postedAmount + deltaAmount)
              break
            }

            if (!error.message.toLowerCase().includes('status')) {
              break
            }
          }
        }

        updatePayload = {
          approval_status: committedApprovalStatus,
          payment_status: committedPaymentStatus,
          updated_at: new Date().toISOString(),
        }
      } else {
        // Keep draft/uncommitted run entries additive as well; do not overwrite base line.
        const deltaAmount = nextAmount - postedAmount
        if (deltaAmount > 0) {
          for (const status of statusCandidates) {
            const adjustmentPayload: Record<string, unknown> = {
              id: crypto.randomUUID(),
              organization_id: organizationId,
              date: row.payroll_date,
              description: `Payroll Adjustment - ${payrollMonthShort}`,
              amount: deltaAmount,
              is_income: false,
              accounting_type: 'Expense',
              subtype: 'Salary',
              notes: `[PAYROLL_ADJUSTMENT:${payrollMonthShort}:${payrollRunId}:${Date.now()}]`,
              source_type: 'payroll',
              source_reference_id: payrollRunId,
              status,
              approval_status: approvalStatus,
              payment_status: paymentStatus,
              approved_by: approvalStatus === 'Approved' ? 'system' : null,
              approved_at: approvalStatus === 'Approved' ? new Date().toISOString() : null,
              ...(salaryAccountId ? { bank_account_id: salaryAccountId, assigned_bank_account_id: salaryAccountId } : {}),
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            }

            let insertPayload: Record<string, unknown> = adjustmentPayload
            let { error } = await admin.from('transactions').insert(insertPayload)
            let retryCount = 0

            while (error && retryCount < 5) {
              const nextPayload = stripUnsupportedColumns(insertPayload, error.message)
              if (JSON.stringify(nextPayload) === JSON.stringify(insertPayload)) {
                break
              }
              insertPayload = nextPayload
              ;({ error } = await admin.from('transactions').insert(insertPayload))
              retryCount++
            }

            if (!error) {
              postedAmountByRunId.set(payrollRunId, postedAmount + deltaAmount)
              break
            }

            if (!error.message.toLowerCase().includes('status')) {
              break
            }
          }
        }

        updatePayload = {
          approval_status: approvalStatus,
          payment_status: paymentStatus,
          updated_at: new Date().toISOString(),
        }
      }

      if (!resolveTransactionBankAccountId(existingRow) && salaryAccountId) {
        updatePayload = {
          ...updatePayload,
          bank_account_id: salaryAccountId,
          assigned_bank_account_id: salaryAccountId,
        }
      }

      let { error } = await admin.from('transactions').update(updatePayload).eq('id', String(existingRow.id))
      let retryCount = 0

      while (error && retryCount < 5) {
        const nextPayload = stripUnsupportedColumns(updatePayload, error.message)
        if (JSON.stringify(nextPayload) === JSON.stringify(updatePayload)) {
          break
        }
        updatePayload = nextPayload
        ;({ error } = await admin.from('transactions').update(updatePayload).eq('id', String(existingRow.id)))
        retryCount++
      }
      continue
    }

    for (const status of statusCandidates) {
      const payload: Record<string, unknown> = {
        id: crypto.randomUUID(),
        organization_id: organizationId,
        date: row.payroll_date,
        description: `Payroll - ${payrollMonthShort}`,
        amount: Number(row.total_net ?? 0),
        is_income: false,
        accounting_type: 'Expense',
        subtype: 'Salary',
        notes: marker,
        source_type: 'payroll',
        source_reference_id: payrollRunId,
        status,
        approval_status: approvalStatus,
        payment_status: paymentStatus,
        approved_by: approvalStatus === 'Approved' ? 'system' : null,
        approved_at: approvalStatus === 'Approved' ? new Date().toISOString() : null,
        ...(salaryAccountId ? { bank_account_id: salaryAccountId, assigned_bank_account_id: salaryAccountId } : {}),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }

      let insertPayload: Record<string, unknown> = payload
      let { error } = await admin.from('transactions').insert(insertPayload)
      let retryCount = 0

      while (error && retryCount < 5) {
        const nextPayload = stripUnsupportedColumns(insertPayload, error.message)
        if (JSON.stringify(nextPayload) === JSON.stringify(insertPayload)) {
          break
        }
        insertPayload = nextPayload
        ;({ error } = await admin.from('transactions').insert(insertPayload))
        retryCount++
      }

      if (!error) {
        existingByMarker.set(marker, {
          id: String(payload.id),
          notes: marker,
          bank_account_id: salaryAccountId,
          assigned_bank_account_id: salaryAccountId,
        })
        break
      }

      if (!error.message.toLowerCase().includes('status')) {
        break
      }
    }
  }
}

function isApprovedForCashMovement(
  approvalStatus?: unknown,
  paymentStatus?: unknown,
  transactionStatus?: unknown
) {
  const normalizedApprovalStatus = normalizeUpper(approvalStatus)
  const normalizedPaymentStatus = normalizeUpper(paymentStatus)
  const normalizedTransactionStatus = normalizeUpper(transactionStatus)

  const approvalSatisfied =
    normalizedApprovalStatus === 'APPROVED' ||
    normalizedApprovalStatus === 'APPROVED_FOR_PAYMENT' ||
    normalizedTransactionStatus === 'APPROVED'

  const paymentSatisfied = normalizedPaymentStatus === 'PAID'

  return approvalSatisfied && paymentSatisfied
}

function derivePayrollRunStatusFromTransaction(
  approvalStatus?: unknown,
  paymentStatus?: unknown,
  transactionStatus?: unknown
) {
  if (isApprovedForCashMovement(approvalStatus, paymentStatus, transactionStatus)) {
    return 'PROCESSED'
  }

  const normalizedApprovalStatus = normalizeToken(approvalStatus)
  const normalizedTransactionStatus = normalizeToken(transactionStatus)

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

function extractPayrollRunIdFromNotes(notes: unknown) {
  if (typeof notes !== 'string') {
    return null
  }

  const trimmed = notes.trim()
  if (!trimmed.startsWith('[PAYROLL')) {
    return null
  }

  const parts = trimmed.replace(/^\[/, '').replace(/\]$/, '').split(':')
  if (parts.length < 3) {
    return null
  }

  const runId = String(parts[2] ?? '').trim()
  return runId.length > 0 ? runId : null
}

async function syncPayrollRunStatusFromTransaction(
  admin: ReturnType<typeof getAdminClient>,
  organizationId: string,
  transactionRow: Record<string, unknown> | null | undefined
) {
  if (!transactionRow) {
    return
  }

  const sourceTypeToken = normalizeToken(transactionRow.source_type ?? transactionRow.sourceType)
  const sourceReferenceId = String(
    transactionRow.source_reference_id ?? transactionRow.sourceReferenceId ?? ''
  ).trim()
  const notesRunId = extractPayrollRunIdFromNotes(transactionRow.notes)
  const payrollRunId = sourceReferenceId || notesRunId

  if (!payrollRunId) {
    return
  }

  const looksPayroll =
    sourceTypeToken === 'PAYROLL' ||
    (typeof transactionRow.notes === 'string' && transactionRow.notes.trim().startsWith('[PAYROLL'))

  if (!looksPayroll) {
    return
  }

  const nextStatus = derivePayrollRunStatusFromTransaction(
    transactionRow.approval_status,
    transactionRow.payment_status,
    transactionRow.status
  )

  const { data: existingRun } = await admin
    .from('payroll_runs')
    .select('id, status, approval_date, processed_date, paid_date')
    .eq('id', payrollRunId)
    .eq('organization_id', organizationId)
    .maybeSingle<{
      id: string
      status?: string | null
      approval_date?: string | null
      processed_date?: string | null
      paid_date?: string | null
    }>()

  if (!existingRun?.id) {
    return
  }

  const currentStatus = normalizeToken(existingRun.status)
  const targetStatus = normalizeToken(nextStatus)
  const now = new Date().toISOString().slice(0, 10)
  const updatePayload: Record<string, unknown> = {
    status: nextStatus,
    updated_at: new Date().toISOString(),
  }

  if ((targetStatus === 'APPROVED' || targetStatus === 'PROCESSED') && !existingRun.approval_date) {
    updatePayload.approval_date = now
  }
  if (targetStatus === 'PROCESSED' && !existingRun.processed_date) {
    updatePayload.processed_date = now
  }
  if (targetStatus === 'PROCESSED' && !existingRun.paid_date) {
    updatePayload.paid_date = now
  }

  if (
    currentStatus !== targetStatus ||
    Object.prototype.hasOwnProperty.call(updatePayload, 'approval_date') ||
    Object.prototype.hasOwnProperty.call(updatePayload, 'processed_date') ||
    Object.prototype.hasOwnProperty.call(updatePayload, 'paid_date')
  ) {
    await admin
      .from('payroll_runs')
      .update(updatePayload)
      .eq('id', existingRun.id)
      .eq('organization_id', organizationId)
  }
}

function calculateCashEffect(amount: unknown, isIncome: unknown) {
  const normalizedAmount = Number(amount ?? 0)
  if (!Number.isFinite(normalizedAmount) || normalizedAmount === 0) {
    return 0
  }

  return Boolean(isIncome) ? normalizedAmount : -normalizedAmount
}

function resolveTransactionBankAccountId(row: Record<string, unknown> | null | undefined) {
  if (!row) {
    return null
  }

  const value =
    row.bank_account_id ??
    row.assigned_bank_account_id ??
    row.bankAccountId ??
    row.assignedBankAccountId ??
    null

  const normalized = String(value ?? '').trim()
  return normalized.length > 0 ? normalized : null
}

async function findSalaryAccountId(
  admin: ReturnType<typeof getAdminClient>,
  organizationId: string
) {
  const { data, error } = await admin
    .from('bank_accounts')
    .select('id, account_name, is_primary, status')
    .eq('organization_id', organizationId)

  if (error) {
    return null
  }

  const accounts = (data ?? []) as Array<{
    id: string
    account_name?: string | null
    is_primary?: boolean | null
    status?: string | null
  }>
  const activeAccounts = accounts.filter((account) => (account.status ?? 'Active') === 'Active')

  const salaryAccount = activeAccounts.find((account) =>
    String(account.account_name ?? '').toLowerCase().includes('salary')
  )

  if (salaryAccount?.id) {
    return salaryAccount.id
  }

  return activeAccounts.find((account) => Boolean(account.is_primary))?.id ?? null
}

function calculateBudgetExpenseImpact(amount: unknown, accountingType: unknown) {
  const normalizedAmount = Number(amount ?? 0)
  if (!Number.isFinite(normalizedAmount) || normalizedAmount <= 0) {
    return 0
  }

  return normalizeUpper(accountingType) === 'EXPENSE' ? normalizedAmount : 0
}

type BudgetMatch = {
  id: string
  category: string
  normalizedCategory: string
}

type BucketMatch = {
  id: string
  name: string
  normalizedName: string
}

function normalizeBudgetText(value: unknown) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
}

function buildBudgetMatchRows(rows: any[]) {
  return (rows ?? [])
    .map((row) => {
      const category =
        String(row?.category ?? row?.budget_name ?? row?.coa_name ?? row?.coaName ?? '').trim() || 'Budget'
      const normalizedCategory = normalizeBudgetText(category)
      return {
        id: String(row?.id ?? ''),
        category,
        normalizedCategory,
      } as BudgetMatch
    })
    .filter((row) => row.id.length > 0)
}

function isPayrollExpenseHint(subtype: unknown, description: unknown) {
  const combined = normalizeBudgetText(`${String(subtype ?? '')} ${String(description ?? '')}`)
  return (
    combined.includes('payroll') ||
    combined.includes('salary') ||
    combined.includes('wage') ||
    combined.includes('wages')
  )
}

function pickBudgetForExpense(budgets: BudgetMatch[], subtype: unknown, description: unknown) {
  if (!budgets.length) {
    return null
  }

  const subtypeText = normalizeBudgetText(subtype)
  const descriptionText = normalizeBudgetText(description)
  const combined = `${subtypeText} ${descriptionText}`.trim()

  const payrollBudget = budgets.find((budget) => budget.normalizedCategory.includes('payroll'))
  if (payrollBudget && isPayrollExpenseHint(subtype, description)) {
    return payrollBudget
  }

  if (subtypeText) {
    const exactSubtypeMatch = budgets.find((budget) => budget.normalizedCategory === subtypeText)
    if (exactSubtypeMatch) {
      return exactSubtypeMatch
    }

    const containsSubtypeMatch = budgets.find(
      (budget) =>
        budget.normalizedCategory.includes(subtypeText) ||
        subtypeText.includes(budget.normalizedCategory)
    )
    if (containsSubtypeMatch) {
      return containsSubtypeMatch
    }
  }

  const descriptionMatch = budgets.find(
    (budget) => budget.normalizedCategory.length > 2 && combined.includes(budget.normalizedCategory)
  )
  if (descriptionMatch) {
    return descriptionMatch
  }

  return null
}

async function fetchBudgetMatches(admin: ReturnType<typeof getAdminClient>, organizationId: string) {
  const { data, error } = await admin
    .from('budgets')
    .select('*')
    .eq('organization_id', organizationId)

  if (error || !data?.length) {
    return [] as BudgetMatch[]
  }

  return buildBudgetMatchRows(data)
}

async function fetchBucketMatches(admin: ReturnType<typeof getAdminClient>, organizationId: string) {
  const { data, error } = await admin
    .from('buckets')
    .select('id, name')
    .eq('organization_id', organizationId)

  if (error || !data?.length) {
    return [] as BucketMatch[]
  }

  return (data ?? [])
    .map((row: any) => {
      const name = String(row?.name ?? '').trim()
      return {
        id: String(row?.id ?? ''),
        name,
        normalizedName: normalizeBudgetText(name),
      } as BucketMatch
    })
    .filter((row) => row.id.length > 0)
}

function pickBudgetByBucketId(
  budgets: BudgetMatch[],
  buckets: BucketMatch[],
  bucketId: string | null | undefined
) {
  if (!bucketId) {
    return null
  }

  const bucket = buckets.find((row) => row.id === bucketId)
  if (!bucket || !bucket.normalizedName) {
    return null
  }

  const exact = budgets.find((budget) => budget.normalizedCategory === bucket.normalizedName)
  if (exact) {
    return exact
  }

  return budgets.find(
    (budget) =>
      budget.normalizedCategory.includes(bucket.normalizedName) ||
      bucket.normalizedName.includes(budget.normalizedCategory)
  )
}

async function resolveExpenseBudgetId(
  admin: ReturnType<typeof getAdminClient>,
  organizationId: string,
  subtype: unknown,
  description: unknown,
  bucketId?: string | null,
  preloadedBudgets?: BudgetMatch[],
  preloadedBuckets?: BucketMatch[]
) {
  const budgets = preloadedBudgets ?? (await fetchBudgetMatches(admin, organizationId))
  const buckets = preloadedBuckets ?? (await fetchBucketMatches(admin, organizationId))

  const bucketMapped = pickBudgetByBucketId(budgets, buckets, bucketId)
  if (bucketMapped) {
    return bucketMapped.id
  }

  const matched = pickBudgetForExpense(budgets, subtype, description)
  return matched?.id ?? null
}

async function autoAssignMissingExpenseBudgets(
  admin: ReturnType<typeof getAdminClient>,
  organizationId: string
) {
  const budgets = await fetchBudgetMatches(admin, organizationId)
  const buckets = await fetchBucketMatches(admin, organizationId)
  if (!budgets.length) {
    return
  }

  const { data: expenseTransactions, error } = await admin
    .from('transactions')
    .select('id, date, amount, subtype, description, bucket_id, accounting_type, budget_id')
    .eq('organization_id', organizationId)
    .eq('is_income', false)
    .is('budget_id', null)

  if (error || !expenseTransactions?.length) {
    return
  }

  for (const txn of expenseTransactions) {
    const accountingType = normalizeUpper((txn as any)?.accounting_type)
    if (accountingType && accountingType !== 'EXPENSE') {
      continue
    }

    const matchedBudgetId = await resolveExpenseBudgetId(
      admin,
      organizationId,
      (txn as any)?.subtype,
      (txn as any)?.description,
      String((txn as any)?.bucket_id ?? '') || null,
      budgets,
      buckets
    )

    if (!matchedBudgetId) {
      continue
    }

    await admin
      .from('transactions')
      .update({ budget_id: matchedBudgetId })
      .eq('id', String((txn as any)?.id ?? ''))
      .eq('organization_id', organizationId)

    const impact = calculateBudgetExpenseImpact((txn as any)?.amount, (txn as any)?.accounting_type)
    if (impact > 0) {
      await applyBudgetTrackingDelta(
        admin,
        organizationId,
        matchedBudgetId,
        String((txn as any)?.date ?? ''),
        impact
      )
    }
  }
}

function getTrackingMonthFromDate(dateValue: string | null | undefined) {
  const parsed = parseIsoDate(dateValue)
  const sourceDate = parsed ?? new Date()
  return `${sourceDate.getUTCFullYear()}-${String(sourceDate.getUTCMonth() + 1).padStart(2, '0')}-01`
}

function deriveBudgetTrackingStatus(actualAmount: number, budgetedAmount: number) {
  if (budgetedAmount <= 0) return 'ON_TRACK'
  const utilization = actualAmount / budgetedAmount
  if (utilization >= 1) return 'OVERSPENT'
  if (utilization >= 0.8) return 'WARNING'
  return 'ON_TRACK'
}

async function applyBudgetTrackingDelta(
  admin: ReturnType<typeof getAdminClient>,
  organizationId: string,
  budgetId: string | null | undefined,
  transactionDate: string | null | undefined,
  deltaAmount: number
) {
  if (!budgetId || !Number.isFinite(deltaAmount) || deltaAmount === 0) {
    return
  }

  try {
    const trackingMonth = getTrackingMonthFromDate(transactionDate)

    const { data: existingTracking, error: existingTrackingError } = await admin
      .from('budget_tracking')
      .select('budgeted_amount, actual_amount, reserved_amount')
      .eq('organization_id', organizationId)
      .eq('budget_id', budgetId)
      .eq('tracking_month', trackingMonth)
      .maybeSingle()

    if (existingTrackingError) {
      console.warn('[Transactions API] budget tracking fetch skipped:', existingTrackingError.message)
      return
    }

    let budgetedAmount = Number((existingTracking as any)?.budgeted_amount ?? 0)
    if (!existingTracking) {
      const { data: budgetRow } = await admin
        .from('budgets')
        .select('budget_amount')
        .eq('id', budgetId)
        .eq('organization_id', organizationId)
        .maybeSingle()

      budgetedAmount = Number((budgetRow as any)?.budget_amount ?? 0)
    }

    const currentActualAmount = Number((existingTracking as any)?.actual_amount ?? 0)
    const reservedAmount = Number((existingTracking as any)?.reserved_amount ?? 0)
    const nextActualAmount = Math.max(0, currentActualAmount + deltaAmount)
    const varianceAmount = budgetedAmount - nextActualAmount
    const variancePercent =
      budgetedAmount > 0 ? Number(((varianceAmount / budgetedAmount) * 100).toFixed(2)) : 0

    const trackingPayload = {
      budget_id: budgetId,
      organization_id: organizationId,
      tracking_month: trackingMonth,
      budgeted_amount: budgetedAmount,
      actual_amount: nextActualAmount,
      reserved_amount: reservedAmount,
      variance_amount: varianceAmount,
      variance_percent: variancePercent,
      status: deriveBudgetTrackingStatus(nextActualAmount, budgetedAmount),
      updated_at: new Date().toISOString(),
    }

    const { error: upsertError } = await admin
      .from('budget_tracking')
      .upsert(trackingPayload, { onConflict: 'budget_id,tracking_month' })

    if (upsertError) {
      console.warn('[Transactions API] budget tracking upsert skipped:', upsertError.message)
    }
  } catch (error) {
    console.warn('[Transactions API] budget tracking update skipped:', error)
  }
}
  //   const errors: string[] = []
  //   for (const query of variants) {
  //     const { data, error } = await query()
  //     if (!error) {
  //       return { data: data ?? [], error: null }
  //     }
  //     errors.push(error.message)
  //   }

  //   return { data: [], error: { message: errors.join(' | ') } }
  // }

  export async function GET(request: Request) {
    try {
      const authorized = await getAuthorizedProfile(request)
      if ('error' in authorized) {
        return authorized.error
      }

      const { admin, profile } = authorized
      const organizationId = profile.organization_id
      if (!organizationId) {
        return NextResponse.json({ error: 'No organization linked to this user' }, { status: 400 })
      }

      try {
        await materializeRecurringTransactions(admin, organizationId)
      } catch (materializeError) {
        console.error('[Transactions API] Recurring materialization failed:', materializeError)
      }

      try {
        await materializePayrollTransactions(admin, organizationId)
      } catch (materializeError) {
        console.error('[Transactions API] Payroll materialization failed:', materializeError)
      }

      try {
        await autoAssignMissingExpenseBudgets(admin, organizationId)
      } catch (autoAssignError) {
        console.error('[Transactions API] Expense budget auto-assignment failed:', autoAssignError)
      }

      const { data, error } = await selectTransactionsByOrganization(admin, organizationId)
      if (error) {
        return NextResponse.json({ error: `Failed to fetch transactions: ${error.message}` }, { status: 400 })
      }

      const url = new URL(request.url)
      const reportMode =
        queryParamTruthy(url.searchParams.get('report')) ||
        String(url.searchParams.get('mode') ?? '').trim().toLowerCase() === 'report'

      if (reportMode) {
        const requestedGroupBy = String(url.searchParams.get('groupBy') ?? 'month').trim() as TransactionReportGroupBy
        const allowedGroupBy: TransactionReportGroupBy[] = [
          'month',
          'day',
          'week',
          'accountingType',
          'subtype',
          'status',
          'paymentStatus',
          'vendor',
        ]
        const groupBy = allowedGroupBy.includes(requestedGroupBy) ? requestedGroupBy : 'month'

        const startDate = normalizeDateOnly(url.searchParams.get('startDate'))
        const endDate = normalizeDateOnly(url.searchParams.get('endDate'))
        const accountingTypeRaw = url.searchParams.get('accountingType')
        const accountingType = accountingTypeRaw ? accountingTypeRaw.trim().toUpperCase() : null
        const isIncomeRaw = url.searchParams.get('isIncome')
        const isIncomeFilter =
          isIncomeRaw === null
            ? null
            : isIncomeRaw.trim().toLowerCase() === 'true'
              ? true
              : isIncomeRaw.trim().toLowerCase() === 'false'
                ? false
                : null

        const report = buildTransactionReport(data ?? [], {
          startDate,
          endDate,
          groupBy,
          accountingType,
          isIncomeFilter,
        })

        return NextResponse.json({ report }, { status: 200 })
      }

      return NextResponse.json({ transactions: data }, { status: 200 })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unexpected server error'
      return NextResponse.json({ error: message }, { status: 500 })
    }
  }

  async function updateInvoiceStatusIfPaid(
    admin: ReturnType<typeof getAdminClient>,
    organizationId: string,
    invoiceIdOrNumber: string | null | undefined,
    paymentStatus: string | undefined
  ) {
    // Only update invoice status if payment_status is being set to 'Paid' and invoice exists
    if (!invoiceIdOrNumber || normalizeToken(paymentStatus) !== 'PAID') {
      return
    }

    try {
      const invoiceRef = String(invoiceIdOrNumber).trim()
      if (!invoiceRef) {
        return
      }

      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(invoiceRef)

      let targetInvoiceId: string | null = null
      if (isUuid) {
        const uuidQueries = [
          admin
            .from('invoices')
            .select('id')
            .eq('organization_id', organizationId)
            .eq('id', invoiceRef)
            .maybeSingle<{ id: string }>(),
          admin
            .from('invoices')
            .select('id')
            .eq('organizationid', organizationId)
            .eq('id', invoiceRef)
            .maybeSingle<{ id: string }>(),
        ]

        for (const query of uuidQueries) {
          const { data } = await query
          if (data?.id) {
            targetInvoiceId = data.id
            break
          }
        }
      }

      if (!targetInvoiceId) {
        const numberQueries = [
          admin
            .from('invoices')
            .select('id')
            .eq('organization_id', organizationId)
            .eq('invoice_no', invoiceRef)
            .maybeSingle<{ id: string }>(),
          admin
            .from('invoices')
            .select('id')
            .eq('organizationid', organizationId)
            .eq('invoice_no', invoiceRef)
            .maybeSingle<{ id: string }>(),
          admin
            .from('invoices')
            .select('id')
            .eq('organizationid', organizationId)
            .eq('invoiceno', invoiceRef)
            .maybeSingle<{ id: string }>(),
          admin
            .from('invoices')
            .select('id')
            .eq('organization_id', organizationId)
            .eq('invoiceno', invoiceRef)
            .maybeSingle<{ id: string }>(),
        ]

        for (const query of numberQueries) {
          const { data } = await query
          if (data?.id) {
            targetInvoiceId = data.id
            break
          }
        }
      }

      if (!targetInvoiceId) {
        console.warn(`[Invoice Status Update] No invoice found for reference ${invoiceRef}`)
        return
      }

      let invoiceAmount = 0
      const invoiceAmountQueries = [
        admin
          .from('invoices')
          .select('invoice_amount')
          .eq('id', targetInvoiceId)
          .eq('organization_id', organizationId)
          .maybeSingle<{ invoice_amount?: number | null }>(),
        admin
          .from('invoices')
          .select('invoiceamount')
          .eq('id', targetInvoiceId)
          .eq('organizationid', organizationId)
          .maybeSingle<{ invoiceamount?: number | null }>(),
      ]

      for (const query of invoiceAmountQueries) {
        const { data } = await query
        const amount = Number((data as any)?.invoice_amount ?? (data as any)?.invoiceamount ?? 0)
        if (amount > 0) {
          invoiceAmount = amount
          break
        }
      }

      // Update invoice status to paid, and align paid/balance columns where available.
      const updateVariants: Array<Record<string, unknown>> = [
        {
          status: 'Paid',
          paid_amount: invoiceAmount || undefined,
          balance_due: 0,
          updated_at: new Date().toISOString(),
        },
        {
          status: 'Paid',
          paidamount: invoiceAmount || undefined,
          balancedue: 0,
          updatedat: new Date().toISOString(),
        },
        { status: 'Paid' },
        { status: 'PAID' },
      ]

      let updateErrorMessage: string | null = null
      let updated = false

      for (const payload of updateVariants) {
        const scopes = [
          admin
            .from('invoices')
            .update(payload)
            .eq('id', targetInvoiceId)
            .eq('organization_id', organizationId),
          admin
            .from('invoices')
            .update(payload)
            .eq('id', targetInvoiceId)
            .eq('organizationid', organizationId),
        ]

        for (const query of scopes) {
          const { error } = await query
          if (!error) {
            updated = true
            break
          }
          updateErrorMessage = error.message
        }

        if (updated) {
          break
        }
      }

      if (!updated && updateErrorMessage) {
        console.error(`[Invoice Status Update] Failed to update invoice ${invoiceRef} to Paid:`, updateErrorMessage)
      }
    } catch (err) {
      console.error(
        `[Invoice Status Update] Unexpected error updating invoice ${invoiceIdOrNumber}:`,
        err instanceof Error ? err.message : 'Unknown error'
      )
    }
  }

  export async function POST(request: Request) {
    try {
      const authorized = await getAuthorizedProfile(request)
      if ('error' in authorized) {
        return authorized.error
      }

      const { admin, profile } = authorized
      const body = (await request.json()) as RequestBody
      const transaction = body.transaction
      const normalizedTransaction = transaction as any
      const incomingPaymentStatus = normalizedTransaction?.paymentStatus ?? normalizedTransaction?.payment_status
      const incomingReconciliationStatus =
        normalizedTransaction?.reconciliationStatus ?? normalizedTransaction?.reconciliation_status
      const incomingBankStatementReference =
        normalizedTransaction?.bankStatementReference ?? normalizedTransaction?.bank_statement_reference
      const bankAccountId =
        normalizedTransaction?.bankAccountId ??
        normalizedTransaction?.assignedBankAccountId ??
        normalizedTransaction?.bank_account_id ??
        normalizedTransaction?.assigned_bank_account_id ??
        null
      let resolvedBudgetId = normalizedTransaction?.budgetId ?? normalizedTransaction?.budget_id ?? null
      const isIncome = normalizedTransaction?.isIncome ?? normalizedTransaction?.is_income
      const incomingApprovalStatus = normalizedTransaction?.approvalStatus ?? normalizedTransaction?.approval_status

      const organizationId = profile.organization_id
      if (!organizationId) {
        return NextResponse.json({ error: 'No organization linked to this user' }, { status: 400 })
      }

      const normalizedAccountingType = normalizeUpper(
        normalizedTransaction?.accountingType ?? normalizedTransaction?.accounting_type
      )

      if (!resolvedBudgetId && normalizedAccountingType === 'EXPENSE') {
        resolvedBudgetId = await resolveExpenseBudgetId(
          admin,
          organizationId,
          normalizedTransaction?.subtype,
          normalizedTransaction?.description,
          normalizedTransaction?.bucketId ?? normalizedTransaction?.bucket_id
        )
        if (resolvedBudgetId) {
          normalizedTransaction.budget_id = resolvedBudgetId
        }
      }

      // Status-only fast path for inline dropdown updates.
      // This avoids failing on missing full transaction fields (date/description/amount)
      // when callers only intend to update payment/reconciliation metadata.
      if (transaction?.id && incomingPaymentStatus !== undefined && isPaymentOnlyUpdate(transaction)) {
        if (!isAccountantRole(profile.role)) {
          return NextResponse.json({ error: 'Only Accountant users can edit transactions' }, { status: 403 })
        }

        const candidates = paymentStatusCandidates(incomingPaymentStatus)
        let updatedData: any = null
        let lastError: { message: string } | null = null
        let usedStatusValue = String(incomingPaymentStatus)

        const { data: oldTxn } = await admin
          .from('transactions')
          .select('amount, is_income, bank_account_id, assigned_bank_account_id, approval_status, payment_status, status, source_type, invoice_reference, invoice_id, invoicereference, invoiceid')
          .eq('id', transaction.id)
          .eq('organization_id', organizationId)
          .maybeSingle()

        for (const candidate of candidates) {
          const statusOnlyPayload: Record<string, unknown> = {
            payment_status: candidate,
          }

          if (incomingReconciliationStatus !== undefined) {
            statusOnlyPayload.reconciliation_status = incomingReconciliationStatus
          }

          if (incomingBankStatementReference !== undefined) {
            statusOnlyPayload.bank_statement_reference = incomingBankStatementReference
          }

          const { data, error } = await admin
            .from('transactions')
            .update(statusOnlyPayload)
            .eq('id', transaction.id)
            .eq('organization_id', organizationId)
            .select('*')
            .single()

          if (!error) {
            updatedData = data
            usedStatusValue = candidate
            lastError = null
            break
          }

          lastError = error
          if (!isPaymentStatusConstraintError(error.message)) {
            break
          }
        }

        if (lastError || !updatedData) {
          return NextResponse.json({ error: `Unable to update transaction status: ${lastError?.message ?? 'Unknown error'}` }, { status: 400 })
        }

        const invoiceId =
          transaction.invoiceId ??
          (transaction as any).invoice ??
          (transaction as any).invoice_reference ??
          normalizedTransaction?.invoice_id ??
          normalizedTransaction?.invoice_reference ??
          normalizedTransaction?.invoiceId ??
          normalizedTransaction?.invoice ??
          oldTxn?.invoice_reference ??
          (oldTxn as any)?.invoicereference ??
          oldTxn?.invoice_id ??
          (oldTxn as any)?.invoiceid
        await updateInvoiceStatusIfPaid(admin, organizationId, invoiceId, usedStatusValue)

        const oldPosted = isApprovedForCashMovement(
          oldTxn?.approval_status,
          oldTxn?.payment_status,
          oldTxn?.status
        )
        const newPosted = isApprovedForCashMovement(
          updatedData?.approval_status,
          updatedData?.payment_status,
          updatedData?.status
        )
        const oldEffect = oldPosted ? calculateCashEffect(oldTxn?.amount, oldTxn?.is_income) : 0
        const newEffect = newPosted ? calculateCashEffect(updatedData?.amount, updatedData?.is_income) : 0

        const oldAccountId = resolveTransactionBankAccountId(oldTxn as Record<string, unknown>)
        let newAccountId = resolveTransactionBankAccountId(updatedData as Record<string, unknown>) ?? oldAccountId

        const payrollSourceToken = normalizeToken(updatedData?.source_type ?? oldTxn?.source_type)
        if (!newAccountId && payrollSourceToken === 'PAYROLL') {
          const salaryAccountId = await findSalaryAccountId(admin, organizationId)
          if (salaryAccountId) {
            newAccountId = salaryAccountId
            await admin
              .from('transactions')
              .update({ bank_account_id: salaryAccountId, assigned_bank_account_id: salaryAccountId })
              .eq('id', transaction.id)
              .eq('organization_id', organizationId)
          }
        }

        if (oldAccountId && oldAccountId === newAccountId) {
          const delta = newEffect - oldEffect
          if (delta !== 0) {
            await adjustBankAccountBalance(admin, oldAccountId, delta)
          }
        } else {
          if (oldAccountId && oldEffect !== 0) {
            await adjustBankAccountBalance(admin, oldAccountId, -oldEffect)
          }
          if (newAccountId && newEffect !== 0) {
            await adjustBankAccountBalance(admin, newAccountId, newEffect)
          }
        }

        await syncPayrollRunStatusFromTransaction(
          admin,
          organizationId,
          updatedData as Record<string, unknown>
        )

        return NextResponse.json({ transaction: updatedData }, { status: 200 })
      }

      // Approval-only fast path for inline dropdown updates.
      if (transaction?.id && incomingApprovalStatus !== undefined && isApprovalOnlyUpdate(transaction)) {
        if (!isAccountantRole(profile.role)) {
          return NextResponse.json({ error: 'Only Accountant users can edit transactions' }, { status: 403 })
        }

        const candidates = approvalStatusCandidates(incomingApprovalStatus)
        let updatedData: any = null
        let lastError: { message: string } | null = null
        let usedApprovalValue = String(incomingApprovalStatus)

        const approvedByValue =
          (transaction.approvedBy ?? transaction.approved_by ?? profile.id ?? null) as string | null

        const { data: oldTxn } = await admin
          .from('transactions')
          .select('amount, is_income, bank_account_id, assigned_bank_account_id, approval_status, payment_status, status, source_type')
          .eq('id', transaction.id)
          .eq('organization_id', organizationId)
          .maybeSingle()

        for (const candidate of candidates) {
          const statusToken = normalizeToken(candidate)
          const approvalOnlyPayload: Record<string, unknown> = {
            approval_status: candidate,
            approved_by: statusToken === 'APPROVED' || statusToken === 'APPROVED_FOR_PAYMENT' ? approvedByValue : null,
          }

          const { data, error } = await admin
            .from('transactions')
            .update(approvalOnlyPayload)
            .eq('id', transaction.id)
            .eq('organization_id', organizationId)
            .select('*')
            .single()

          if (!error) {
            updatedData = data
            usedApprovalValue = candidate
            lastError = null
            break
          }

          lastError = error
          if (!isApprovalStatusConstraintError(error.message)) {
            break
          }
        }

        if (lastError || !updatedData) {
          return NextResponse.json({ error: `Unable to update approval status: ${lastError?.message ?? 'Unknown error'}` }, { status: 400 })
        }

        const oldPosted = isApprovedForCashMovement(
          oldTxn?.approval_status,
          oldTxn?.payment_status,
          oldTxn?.status
        )
        const newPosted = isApprovedForCashMovement(
          usedApprovalValue,
          updatedData?.payment_status,
          updatedData?.status
        )
        const oldEffect = oldPosted ? calculateCashEffect(oldTxn?.amount, oldTxn?.is_income) : 0
        const newEffect = newPosted ? calculateCashEffect(updatedData?.amount, updatedData?.is_income) : 0

        const oldAccountId = resolveTransactionBankAccountId(oldTxn as Record<string, unknown>)
        let newAccountId = resolveTransactionBankAccountId(updatedData as Record<string, unknown>) ?? oldAccountId

        const payrollSourceToken = normalizeToken(updatedData?.source_type ?? oldTxn?.source_type)
        if (!newAccountId && payrollSourceToken === 'PAYROLL') {
          const salaryAccountId = await findSalaryAccountId(admin, organizationId)
          if (salaryAccountId) {
            newAccountId = salaryAccountId
            await admin
              .from('transactions')
              .update({ bank_account_id: salaryAccountId, assigned_bank_account_id: salaryAccountId })
              .eq('id', transaction.id)
              .eq('organization_id', organizationId)
          }
        }

        if (oldAccountId && oldAccountId === newAccountId) {
          const delta = newEffect - oldEffect
          if (delta !== 0) {
            await adjustBankAccountBalance(admin, oldAccountId, delta)
          }
        } else {
          if (oldAccountId && oldEffect !== 0) {
            await adjustBankAccountBalance(admin, oldAccountId, -oldEffect)
          }
          if (newAccountId && newEffect !== 0) {
            await adjustBankAccountBalance(admin, newAccountId, newEffect)
          }
        }

        await syncPayrollRunStatusFromTransaction(
          admin,
          organizationId,
          updatedData as Record<string, unknown>
        )

        return NextResponse.json({ transaction: updatedData }, { status: 200 })
      }

      // Removed role-based approval check - any authenticated user can now approve transactions
      // Previously only Accountant/CA roles could approve
      if (!transaction || !transaction.description?.trim() || !Number.isFinite(transaction.amount) || !transaction.date) {
        return NextResponse.json({ error: 'Transaction date, description and amount are required' }, { status: 400 })
      }

      // UPDATE existing transaction
      if (transaction.id) {
        if (!isAccountantRole(profile.role)) {
          return NextResponse.json({ error: 'Only Accountant users can edit transactions' }, { status: 403 })
        }

        // Fetch the old transaction so we can reverse its effect on the bank balance
        const { data: oldTxn } = await admin
          .from('transactions')
          .select('amount, is_income, accounting_type, date, budget_id, bank_account_id, assigned_bank_account_id, approval_status, payment_status, status')
          .eq('id', transaction.id)
          .maybeSingle()

        const payload = buildTransactionPayload(transaction, organizationId)
        let { data, error } = await admin
          .from('transactions')
          .update(payload)
          .eq('id', transaction.id)
          .select('*')
          .single()

        // Retry loop: keep stripping unknown columns until the update succeeds
        let retryPayload: Record<string, unknown> = payload
        let retryCount = 0
        while (error && isMissingSourceColumnsError(error.message) && retryCount < 5) {
          retryPayload = stripUnsupportedColumns(retryPayload, error.message)
          ;({ data, error } = await admin
            .from('transactions')
            .update(retryPayload as any)
            .eq('id', transaction.id)
            .select('*')
            .single())
          retryCount++
        }

        if (error) {
          return NextResponse.json({ error: `Unable to update transaction: ${error.message}` }, { status: 400 })
        }

        if (hasTransactionTaxLineFields(normalizedTransaction)) {
          const taxLineError = await replaceTransactionTaxLines(
            admin,
            organizationId,
            transaction.id,
            normalizedTransaction,
            profile.id
          )
          if (taxLineError) {
            return NextResponse.json(
              { error: `Unable to save transaction tax lines: ${taxLineError.message}` },
              { status: 400 }
            )
          }
        }

        if (hasTransactionItemFields(normalizedTransaction)) {
          const itemError = await upsertTransactionItem(admin, organizationId, transaction.id, normalizedTransaction)
          if (itemError) {
            return NextResponse.json(
              { error: `Unable to save transaction items: ${itemError.message}` },
              { status: 400 }
            )
          }
        }

        const oldBudgetId = String((oldTxn as any)?.budget_id ?? '') || null
        const oldBudgetImpact = calculateBudgetExpenseImpact((oldTxn as any)?.amount, (oldTxn as any)?.accounting_type)
        const newBudgetImpact = calculateBudgetExpenseImpact(transaction.amount, normalizedTransaction?.accountingType ?? normalizedTransaction?.accounting_type)
        const newBudgetId = resolvedBudgetId

        if (oldBudgetId && oldBudgetId === newBudgetId) {
          const delta = newBudgetImpact - oldBudgetImpact
          await applyBudgetTrackingDelta(admin, organizationId, newBudgetId, transaction.date, delta)
        } else {
          if (oldBudgetId && oldBudgetImpact > 0) {
            await applyBudgetTrackingDelta(admin, organizationId, oldBudgetId, (oldTxn as any)?.date, -oldBudgetImpact)
          }
          if (newBudgetId && newBudgetImpact > 0) {
            await applyBudgetTrackingDelta(admin, organizationId, newBudgetId, transaction.date, newBudgetImpact)
          }
        }

        // Update invoice status to 'Paid' if transaction payment status is updated to 'Paid'
        const invoiceId =
          transaction.invoiceId ??
          (transaction as any).invoice ??
          (transaction as any).invoice_reference ??
          normalizedTransaction?.invoice_id ??
          normalizedTransaction?.invoice_reference ??
          normalizedTransaction?.invoiceId ??
          normalizedTransaction?.invoice
        await updateInvoiceStatusIfPaid(admin, organizationId, invoiceId, transaction.paymentStatus ?? normalizedTransaction?.payment_status)

        // Cash movement happens only after approval, not at draft/edit stage.
        const oldAccountId = resolveTransactionBankAccountId(oldTxn as Record<string, unknown>)
        const newAccountId = bankAccountId ?? normalizedTransaction?.bankAccountId ?? normalizedTransaction?.bank_account_id ?? oldAccountId
        const effectiveApprovalStatus = incomingApprovalStatus ?? oldTxn?.approval_status
        const effectivePaymentStatus = incomingPaymentStatus ?? oldTxn?.payment_status
        const effectiveTransactionStatus = transaction.status ?? oldTxn?.status
        const oldPosted = isApprovedForCashMovement(oldTxn?.approval_status, oldTxn?.payment_status, oldTxn?.status)
        const newPosted = isApprovedForCashMovement(effectiveApprovalStatus, effectivePaymentStatus, effectiveTransactionStatus)
        const oldEffect = oldPosted ? calculateCashEffect(oldTxn?.amount, oldTxn?.is_income) : 0
        const newEffect = newPosted ? calculateCashEffect(transaction.amount, isIncome) : 0

        if (oldAccountId && oldAccountId === newAccountId) {
          const delta = newEffect - oldEffect
          if (delta !== 0) {
            await adjustBankAccountBalance(admin, oldAccountId, delta)
          }
        } else {
          if (oldAccountId && oldEffect !== 0) {
            await adjustBankAccountBalance(admin, oldAccountId, -oldEffect)
          }

          if (newAccountId && newEffect !== 0) {
            await adjustBankAccountBalance(admin, newAccountId, newEffect)
          }
        }

        await syncPayrollRunStatusFromTransaction(
          admin,
          organizationId,
          data as Record<string, unknown>
        )

        return NextResponse.json({ transaction: data }, { status: 200 })
      }

      // INSERT new transaction
      // Only Accountants/Admins can create a transaction already in Approved or Paid state
      const committingApproval = normalizeRoleToken(incomingApprovalStatus) === 'APPROVED'
      const committingPayment = normalizeRoleToken(incomingPaymentStatus) === 'PAID'
      if ((committingApproval || committingPayment) && !isAccountantRole(profile.role)) {
        const allowedAdminRoles = ['ORG_ADMIN', 'SUPER_ADMIN']
        if (!allowedAdminRoles.includes(normalizeRoleToken(profile.role))) {
          return NextResponse.json(
            { error: 'Only Accountant users can approve or mark transactions as paid' },
            { status: 403 }
          )
        }
      }

      const resolvedId = crypto.randomUUID()
      const payload = buildTransactionPayload(transaction, organizationId, resolvedId)
      let { data, error } = await admin
        .from('transactions')
        .insert(payload)
        .select('*')
        .single()

      // Retry loop: keep stripping unknown columns until the insert succeeds
      let insertRetryPayload: Record<string, unknown> = payload
      let insertRetryCount = 0
      while (error && isMissingSourceColumnsError(error.message) && insertRetryCount < 5) {
        insertRetryPayload = stripUnsupportedColumns(insertRetryPayload, error.message)
        ;({ data, error } = await admin
          .from('transactions')
          .insert(insertRetryPayload as any)
          .select('*')
          .single())
        insertRetryCount++
      }

      if (error) {
        return NextResponse.json({ error: `Unable to create transaction: ${error.message}` }, { status: 400 })
      }

      if (hasTransactionTaxLineFields(normalizedTransaction)) {
        const taxLineError = await replaceTransactionTaxLines(
          admin,
          organizationId,
          resolvedId,
          normalizedTransaction,
          profile.id
        )
        if (taxLineError) {
          return NextResponse.json(
            { error: `Unable to save transaction tax lines: ${taxLineError.message}` },
            { status: 400 }
          )
        }
      }

      if (hasTransactionItemFields(normalizedTransaction)) {
        const itemError = await upsertTransactionItem(admin, organizationId, resolvedId, normalizedTransaction)
        if (itemError) {
          return NextResponse.json(
            { error: `Unable to save transaction items: ${itemError.message}` },
            { status: 400 }
          )
        }
      }

      const newBudgetImpact = calculateBudgetExpenseImpact(transaction.amount, normalizedTransaction?.accountingType ?? normalizedTransaction?.accounting_type)
      if (resolvedBudgetId && newBudgetImpact > 0) {
        await applyBudgetTrackingDelta(admin, organizationId, resolvedBudgetId, transaction.date, newBudgetImpact)
      }

      // Update invoice status to 'Paid' if transaction payment status is set to 'Paid'
      const invoiceId =
        transaction.invoiceId ??
        (transaction as any).invoice ??
        (transaction as any).invoice_reference ??
        normalizedTransaction?.invoice_id ??
        normalizedTransaction?.invoice_reference ??
        normalizedTransaction?.invoiceId ??
        normalizedTransaction?.invoice
      await updateInvoiceStatusIfPaid(admin, organizationId, invoiceId, transaction.paymentStatus ?? normalizedTransaction?.payment_status)

      // Cash movement for new transaction only if it's already approved.
      if (bankAccountId && isApprovedForCashMovement(incomingApprovalStatus, incomingPaymentStatus, transaction.status)) {
        const delta = calculateCashEffect(transaction.amount, isIncome)
        if (delta !== 0) {
          await adjustBankAccountBalance(admin, bankAccountId, delta)
        }
      }

      await syncPayrollRunStatusFromTransaction(
        admin,
        organizationId,
        data as Record<string, unknown>
      )

      return NextResponse.json({ transaction: data }, { status: 200 })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unexpected server error'
      return NextResponse.json({ error: message }, { status: 500 })
    }
  }

  export async function DELETE(request: Request) {
    try {
      const authorized = await getAuthorizedProfile(request)
      if ('error' in authorized) {
        return authorized.error
      }

      const { admin, profile } = authorized
      const organizationId = profile.organization_id
      if (!organizationId) {
        return NextResponse.json({ error: 'No organization linked to this user' }, { status: 400 })
      }

      const requestUrl = new URL(request.url)
      const transactionId = requestUrl.searchParams.get('id')
      if (!transactionId) {
        return NextResponse.json({ error: 'Transaction id is required' }, { status: 400 })
      }

      const { data: existingTransaction, error: fetchError } = await admin
        .from('transactions')
        .select('id, amount, accounting_type, date, budget_id, is_income, bank_account_id, assigned_bank_account_id, organization_id, approval_status, payment_status, status')
        .eq('id', transactionId)
        .maybeSingle()

      if (fetchError) {
        return NextResponse.json({ error: `Unable to load transaction: ${fetchError.message}` }, { status: 400 })
      }

      if (!existingTransaction || existingTransaction.organization_id !== organizationId) {
        return NextResponse.json({ error: 'Transaction not found' }, { status: 404 })
      }

      const { error: deleteError } = await admin
        .from('transactions')
        .delete()
        .eq('id', transactionId)

      if (deleteError) {
        return NextResponse.json({ error: `Unable to delete transaction: ${deleteError.message}` }, { status: 400 })
      }

      const removedBudgetImpact = calculateBudgetExpenseImpact(existingTransaction.amount, existingTransaction.accounting_type)
      if (existingTransaction.budget_id && removedBudgetImpact > 0) {
        await applyBudgetTrackingDelta(
          admin,
          organizationId,
          existingTransaction.budget_id,
          existingTransaction.date,
          -removedBudgetImpact
        )
      }

      const existingAccountId = resolveTransactionBankAccountId(existingTransaction as Record<string, unknown>)

      if (
        existingAccountId &&
        isApprovedForCashMovement(
          existingTransaction.approval_status,
          existingTransaction.payment_status,
          existingTransaction.status
        )
      ) {
        const reversal = -calculateCashEffect(existingTransaction.amount, existingTransaction.is_income)
        if (reversal !== 0) {
          await adjustBankAccountBalance(admin, existingAccountId, reversal)
        }
      }

      return NextResponse.json({ success: true }, { status: 200 })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unexpected server error'
      return NextResponse.json({ error: message }, { status: 500 })
    }
  }
