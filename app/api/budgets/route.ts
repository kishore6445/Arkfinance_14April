import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

type UserProfileRow = {
  id: string
  organization_id: string | null
  is_active: boolean | null
}

type BudgetRequest = {
  id?: string
  category?: string
  budgetAmount?: number
  spentAmount?: number
  period?: 'Monthly' | 'Quarterly' | 'Annually'
  alertThreshold?: number
  notes?: string | null
  status?: 'DRAFT' | 'ACTIVE' | 'PAUSED' | 'CLOSED'
  accessToken?: string
  userId?: string
  organizationId?: string
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
  const headerToken = authHeader?.startsWith('Bearer ') ? authHeader.replace('Bearer ', '') : null
  const fallbackHeaderToken = request.headers.get('x-access-token')
  const fallbackUserIdHeader = request.headers.get('x-user-id')
  const fallbackOrganizationIdHeader = request.headers.get('x-organization-id')

  let bodyToken: string | null = null
  let bodyUserId: string | null = null
  let bodyOrganizationId: string | null = null

  if (request.method !== 'GET' && request.method !== 'DELETE') {
    const clonedRequest = request.clone()
    try {
      const body = (await clonedRequest.json()) as BudgetRequest
      bodyToken = body.accessToken ?? null
      bodyUserId = body.userId ?? null
      bodyOrganizationId = body.organizationId ?? null
    } catch {
      bodyToken = null
      bodyUserId = null
      bodyOrganizationId = null
    }
  }

  const admin = getAdminClient()
  const accessToken = headerToken ?? fallbackHeaderToken ?? bodyToken

  if (!accessToken) {
    const fallbackUserId = fallbackUserIdHeader ?? bodyUserId
    const fallbackOrganizationId = fallbackOrganizationIdHeader ?? bodyOrganizationId

    if (!fallbackUserId || !fallbackOrganizationId) {
      return { error: NextResponse.json({ error: 'Missing authorization token' }, { status: 401 }) }
    }

    const { data: profile, error: profileError } = await admin
      .from('users')
      .select('id, organization_id, is_active')
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
    return { error: NextResponse.json({ error: 'User is not linked to an organization' }, { status: 400 }) }
  }

  return { admin, profile }
}

function periodToType(period: string | undefined) {
  const value = (period ?? 'Monthly').trim().toUpperCase()
  if (value === 'QUARTERLY') return 'QUARTERLY'
  if (value === 'ANNUALLY' || value === 'YEARLY') return 'YEARLY'
  return 'MONTHLY'
}

function typeToPeriod(periodType: string | null | undefined): 'Monthly' | 'Quarterly' | 'Annually' {
  const value = (periodType ?? '').trim().toUpperCase()
  if (value === 'QUARTERLY') return 'Quarterly'
  if (value === 'YEARLY') return 'Annually'
  return 'Monthly'
}

function readRowValue<T = any>(row: Record<string, any>, keys: string[], fallback?: T): T {
  for (const key of keys) {
    const value = row[key]
    if (value !== undefined && value !== null) {
      return value as T
    }
  }
  return fallback as T
}

function stripUnsupportedColumns(payload: Record<string, unknown>, errorMessage: string | undefined) {
  if (!errorMessage) return { ...payload }

  const normalizedError = errorMessage.toLowerCase()
  const nextPayload = { ...payload }
  for (const key of Object.keys(payload)) {
    if (normalizedError.includes(key.toLowerCase())) {
      delete nextPayload[key]
    }
  }
  return nextPayload
}

function normalizeBudgetRow(row: Record<string, any>, actualByBudget: Map<string, number>) {
  const id = String(readRowValue(row, ['id'], ''))
  const budgetAmount = Number(readRowValue(row, ['budget_amount', 'budgetAmount', 'budgetamount'], 0) ?? 0)
  const defaultSpent = Number(readRowValue(row, ['spent_amount', 'spentAmount', 'spent', 'actual_amount'], 0) ?? 0)
  const spentAmount = Number(actualByBudget.get(id) ?? defaultSpent)
  const alertThreshold = Number(readRowValue(row, ['alert_threshold_percent', 'alertThreshold'], 80) ?? 80)
  const periodRaw = String(readRowValue(row, ['period_type', 'periodType', 'period'], '') ?? '')

  return {
    id,
    category: String(readRowValue(row, ['category', 'budget_name', 'coa_name', 'coaName'], 'Budget')),
    budgetAmount,
    spentAmount,
    period: typeToPeriod(periodRaw),
    alertThreshold,
    notes: readRowValue<string | undefined>(row, ['notes'], undefined),
    status: String(readRowValue(row, ['status'], 'ACTIVE')),
    lastUpdated: readRowValue(row, ['updated_at', 'updatedAt', 'created_at', 'createdAt'], new Date().toISOString()),
    organizationId: String(readRowValue(row, ['organization_id', 'organizationId'], '')),
  }
}

function getPeriodRange(periodType: 'MONTHLY' | 'QUARTERLY' | 'YEARLY') {
  const now = new Date()
  const year = now.getUTCFullYear()
  const month = now.getUTCMonth()

  if (periodType === 'MONTHLY') {
    const start = new Date(Date.UTC(year, month, 1))
    const end = new Date(Date.UTC(year, month + 1, 0))
    return { start, end }
  }

  if (periodType === 'QUARTERLY') {
    const quarterStartMonth = Math.floor(month / 3) * 3
    const start = new Date(Date.UTC(year, quarterStartMonth, 1))
    const end = new Date(Date.UTC(year, quarterStartMonth + 3, 0))
    return { start, end }
  }

  const start = new Date(Date.UTC(year, 0, 1))
  const end = new Date(Date.UTC(year, 11, 31))
  return { start, end }
}

function toIsoDate(date: Date) {
  return date.toISOString().slice(0, 10)
}

function getTrackingMonthStart() {
  const now = new Date()
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}-01`
}

function deriveBudgetStatus(spentAmount: number, budgetAmount: number, alertThreshold: number) {
  if (budgetAmount <= 0) return 'ON_TRACK'
  const utilization = spentAmount / budgetAmount
  if (utilization >= 1) return 'OVERSPENT'
  if (utilization >= alertThreshold / 100) return 'WARNING'
  return 'ON_TRACK'
}

async function upsertBudgetTracking(
  admin: ReturnType<typeof getAdminClient>,
  organizationId: string,
  budgetId: string,
  budgetAmount: number,
  spentAmount: number,
  alertThreshold: number
) {
  const varianceAmount = budgetAmount - spentAmount
  const variancePercent = budgetAmount > 0 ? Number(((varianceAmount / budgetAmount) * 100).toFixed(2)) : 0

  const trackingRow = {
    budget_id: budgetId,
    organization_id: organizationId,
    tracking_month: getTrackingMonthStart(),
    budgeted_amount: budgetAmount,
    actual_amount: spentAmount,
    reserved_amount: 0,
    variance_amount: varianceAmount,
    variance_percent: variancePercent,
    status: deriveBudgetStatus(spentAmount, budgetAmount, alertThreshold),
    updated_at: new Date().toISOString(),
  }

  const { error } = await admin
    .from('budget_tracking')
    .upsert(trackingRow, { onConflict: 'budget_id,tracking_month' })

  if (error) {
    // Keep budget create/update working even when budget_tracking table/columns are not provisioned yet.
    console.warn('[Budgets API] budget_tracking upsert skipped:', error.message)
  }
}

export async function GET(request: Request) {
  try {
    const authorized = await getAuthorizedProfile(request)
    if ('error' in authorized) return authorized.error

    const { admin, profile } = authorized
    const organizationId = profile.organization_id

    const { data: budgetRows, error: budgetError } = await admin
      .from('budgets')
      .select('*')

    if (budgetError) {
      return NextResponse.json({ error: budgetError.message }, { status: 400 })
    }

    const scopedRows = (budgetRows ?? []).filter((row: any) => {
      const rowOrgId = String(readRowValue(row, ['organization_id', 'organizationId'], '') ?? '')
      return organizationId ? rowOrgId === organizationId : true
    })

    const budgetIds = scopedRows.map((row: any) => String(row.id ?? '')).filter(Boolean)

    let actualByBudget = new Map<string, number>()
    if (budgetIds.length > 0) {
      const { data: trackingRows, error: trackingError } = await admin
        .from('budget_tracking')
        .select('budget_id, actual_amount')
        .eq('organization_id', organizationId)
        .in('budget_id', budgetIds)

      if (!trackingError) {
        for (const row of trackingRows ?? []) {
          const budgetId = String((row as any).budget_id ?? '')
          const amount = Number((row as any).actual_amount ?? 0)
          actualByBudget.set(budgetId, (actualByBudget.get(budgetId) ?? 0) + amount)
        }
      }
    }

    const budgets = scopedRows
      .map((row: any) => normalizeBudgetRow(row, actualByBudget))
      .sort((a, b) => String(b.lastUpdated).localeCompare(String(a.lastUpdated)))

    return NextResponse.json({ budgets }, { status: 200 })
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

    const body = (await request.json()) as BudgetRequest
    const category = body.category?.trim()
    const budgetAmount = Number(body.budgetAmount ?? 0)
    const spentAmount = Math.max(0, Number(body.spentAmount ?? 0))
    const alertThreshold = Number(body.alertThreshold ?? 80)

    if (!category) {
      return NextResponse.json({ error: 'Category is required' }, { status: 400 })
    }

    if (!Number.isFinite(budgetAmount) || budgetAmount <= 0) {
      return NextResponse.json({ error: 'Budget amount must be greater than 0' }, { status: 400 })
    }

    const periodType = periodToType(body.period) as 'MONTHLY' | 'QUARTERLY' | 'YEARLY'
    const { start, end } = getPeriodRange(periodType)
    let payload: Record<string, unknown> = {
      id: crypto.randomUUID(),
      organization_id: organizationId,
      category,
      budget_name: category,
      coa_name: category,
      period_type: periodType,
      period_start: toIsoDate(start),
      period_end: toIsoDate(end),
      budget_amount: budgetAmount,
      alert_threshold_percent: alertThreshold,
      notes: body.notes?.trim() ? body.notes.trim() : null,
      status: 'ACTIVE',
      created_by: profile.id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    let created: any = null
    let createError: any = null
    let retryCount = 0

    while (retryCount < 10) {
      const response = await admin.from('budgets').insert(payload).select('*').single()
      created = response.data
      createError = response.error
      if (!createError) {
        break
      }

      const nextPayload = stripUnsupportedColumns(payload, createError.message)
      if (JSON.stringify(nextPayload) === JSON.stringify(payload)) {
        break
      }
      payload = nextPayload
      retryCount++
    }

    if (createError) {
      return NextResponse.json({ error: createError.message }, { status: 400 })
    }

    await upsertBudgetTracking(admin, organizationId, String(created.id), budgetAmount, spentAmount, alertThreshold)

    return NextResponse.json({
      budget: {
        id: String(created.id),
        category: readRowValue(created, ['category', 'budget_name', 'coa_name', 'coaName'], category),
        budgetAmount: Number(readRowValue(created, ['budget_amount', 'budgetAmount'], budgetAmount) ?? budgetAmount),
        spentAmount,
        period: typeToPeriod(readRowValue(created, ['period_type', 'periodType'], periodType)),
        alertThreshold: Number(readRowValue(created, ['alert_threshold_percent', 'alertThreshold'], alertThreshold) ?? alertThreshold),
        notes: readRowValue(created, ['notes'], undefined),
        status: String(readRowValue(created, ['status'], 'ACTIVE')),
        lastUpdated: readRowValue(created, ['updated_at', 'updatedAt', 'created_at', 'createdAt'], new Date().toISOString()),
      },
    }, { status: 201 })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function PATCH(request: Request) {
  try {
    const authorized = await getAuthorizedProfile(request)
    if ('error' in authorized) return authorized.error

    const { admin, profile } = authorized
    const organizationId = profile.organization_id
    if (!organizationId) {
      return NextResponse.json({ error: 'No organization linked to this user' }, { status: 400 })
    }

    const body = (await request.json()) as BudgetRequest
    if (!body.id) {
      return NextResponse.json({ error: 'Budget id is required' }, { status: 400 })
    }

    const category = body.category?.trim()
    const budgetAmount = Number(body.budgetAmount ?? 0)
    const spentAmount = Math.max(0, Number(body.spentAmount ?? 0))
    const alertThreshold = Number(body.alertThreshold ?? 80)

    if (!category) {
      return NextResponse.json({ error: 'Category is required' }, { status: 400 })
    }

    if (!Number.isFinite(budgetAmount) || budgetAmount <= 0) {
      return NextResponse.json({ error: 'Budget amount must be greater than 0' }, { status: 400 })
    }

    const periodType = periodToType(body.period) as 'MONTHLY' | 'QUARTERLY' | 'YEARLY'
    const { start, end } = getPeriodRange(periodType)
    const { data: existingBudget, error: existingBudgetError } = await admin
      .from('budgets')
      .select('*')
      .eq('id', body.id)
      .maybeSingle()

    if (existingBudgetError) {
      return NextResponse.json({ error: existingBudgetError.message }, { status: 400 })
    }

    if (!existingBudget) {
      return NextResponse.json({ error: 'Budget not found' }, { status: 404 })
    }

    const existingOrgId = String(readRowValue(existingBudget, ['organization_id', 'organizationId'], '') ?? '')
    if (existingOrgId && existingOrgId !== organizationId) {
      return NextResponse.json({ error: 'Organization mismatch for this budget' }, { status: 403 })
    }

    let updatePayload: Record<string, unknown> = {
      category,
      budget_name: category,
      coa_name: category,
      period_type: periodType,
      period_start: toIsoDate(start),
      period_end: toIsoDate(end),
      budget_amount: budgetAmount,
      alert_threshold_percent: alertThreshold,
      notes: body.notes?.trim() ? body.notes.trim() : null,
      updated_at: new Date().toISOString(),
    }

    let updated: any = null
    let updateError: any = null
    let retryCount = 0

    while (retryCount < 10) {
      const response = await admin
        .from('budgets')
        .update(updatePayload)
        .eq('id', body.id)
        .select('*')
        .single()

      updated = response.data
      updateError = response.error

      if (!updateError) {
        break
      }

      const nextPayload = stripUnsupportedColumns(updatePayload, updateError.message)
      if (JSON.stringify(nextPayload) === JSON.stringify(updatePayload)) {
        break
      }
      updatePayload = nextPayload
      retryCount++
    }

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 400 })
    }

    await upsertBudgetTracking(admin, organizationId, String(updated.id), budgetAmount, spentAmount, alertThreshold)

    return NextResponse.json({
      budget: {
        id: String(updated.id),
        category: readRowValue(updated, ['category', 'budget_name', 'coa_name', 'coaName'], category),
        budgetAmount: Number(readRowValue(updated, ['budget_amount', 'budgetAmount'], budgetAmount) ?? budgetAmount),
        spentAmount,
        period: typeToPeriod(readRowValue(updated, ['period_type', 'periodType'], periodType)),
        alertThreshold: Number(readRowValue(updated, ['alert_threshold_percent', 'alertThreshold'], alertThreshold) ?? alertThreshold),
        notes: readRowValue(updated, ['notes'], undefined),
        status: String(readRowValue(updated, ['status'], 'ACTIVE')),
        lastUpdated: readRowValue(updated, ['updated_at', 'updatedAt', 'created_at', 'createdAt'], new Date().toISOString()),
      },
    }, { status: 200 })
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

    const requestUrl = new URL(request.url)
    const id = requestUrl.searchParams.get('id')?.trim()

    if (!id) {
      return NextResponse.json({ error: 'Budget id is required' }, { status: 400 })
    }

    const { data: existingBudget, error: existingBudgetError } = await admin
      .from('budgets')
      .select('*')
      .eq('id', id)
      .maybeSingle()

    if (existingBudgetError) {
      return NextResponse.json({ error: existingBudgetError.message }, { status: 400 })
    }

    if (!existingBudget) {
      return NextResponse.json({ error: 'Budget not found' }, { status: 404 })
    }

    const existingOrgId = String(readRowValue(existingBudget, ['organization_id', 'organizationId'], '') ?? '')
    if (existingOrgId && existingOrgId !== organizationId) {
      return NextResponse.json({ error: 'Organization mismatch for this budget' }, { status: 403 })
    }

    const { error: deleteError } = await admin
      .from('budgets')
      .delete()
      .eq('id', id)

    if (deleteError) {
      return NextResponse.json({ error: deleteError.message }, { status: 400 })
    }

    return NextResponse.json({ success: true }, { status: 200 })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
