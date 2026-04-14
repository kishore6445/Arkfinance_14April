import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

type PayrollRegisterRequest = {
  employeeCode?: string
  employeeName?: string
  designation?: string
  payrollMonth?: string
  basic?: number
  da?: number
  hra?: number
  conveyance?: number
  medical?: number
  grossSalary?: number
  pf?: number
  esi?: number
  incomeTax?: number
  pt?: number
  totalDeductions?: number
  netSalary?: number
  bankAccount?: string
  transferStatus?: 'Pending' | 'Processed' | 'Cancelled'
  transferDate?: string | null
  action?: 'process-month'
  selectedEntryIds?: string[]
  accessToken?: string
  userId?: string
  organizationId?: string
}

type UserProfileRow = {
  id: string
  organization_id: string | null
  is_active: boolean | null
}

type PayrollPendingEntryRow = {
  id: string
  employee_code: string
  employee_name?: string | null
  designation?: string | null
  basic?: number | null
  da?: number | null
  hra?: number | null
  conveyance?: number | null
  medical?: number | null
  gross_salary?: number | null
  income_tax?: number | null
  pt?: number | null
}

type EmployeePackageRow = {
  employee_code?: string | null
  first_name?: string | null
  last_name?: string | null
  designation?: string | null
  base_ctc?: number | null
}

function normalizeEmployeeCode(value: unknown) {
  return String(value ?? '').trim().toUpperCase()
}

function recomputePayrollFromBase(
  row: PayrollPendingEntryRow,
  baseCtc: number
) {
  const basic = Math.round((Number(baseCtc ?? 0) || 0) / 12)
  const da = Number(row.da ?? 0)
  const hra = Number(row.hra ?? 0)
  const conveyance = Number(row.conveyance ?? 0)
  const medical = Number(row.medical ?? 0)
  const pt = Number(row.pt ?? 0)

  const grossSalary = basic + da + hra + conveyance + medical
  const pf = Math.round((basic + da) * 0.12)
  const esi = grossSalary <= 21000 ? Math.round(grossSalary * 0.0075) : 0

  const oldGross = Number(row.gross_salary ?? 0)
  const oldIncomeTax = Number(row.income_tax ?? 0)
  const effectiveIncomeTaxRate = oldGross > 0 ? oldIncomeTax / oldGross : 0
  const incomeTax = Math.round(grossSalary * effectiveIncomeTaxRate)

  const totalDeductions = pf + esi + incomeTax + pt
  const netSalary = grossSalary - totalDeductions

  return {
    basic,
    gross_salary: grossSalary,
    pf,
    esi,
    income_tax: incomeTax,
    total_deductions: totalDeductions,
    net_salary: netSalary,
  }
}

async function syncPendingEntriesWithEmployeePackages(
  admin: ReturnType<typeof getAdminClient>,
  organizationId: string,
  payrollMonth?: string | null
) {
  let pendingQuery = admin
    .from('payroll_register_entries')
    .select('id, employee_code, employee_name, designation, basic, da, hra, conveyance, medical, gross_salary, income_tax, pt')
    .eq('organization_id', organizationId)
    .eq('transfer_status', 'Pending')

  if (payrollMonth?.trim()) {
    pendingQuery = pendingQuery.eq('payroll_month', payrollMonth.trim())
  }

  const { data: pendingEntries, error: pendingError } = await pendingQuery
  if (pendingError || !pendingEntries?.length) {
    return
  }

  const employeeCodes = Array.from(
    new Set(
      (pendingEntries as PayrollPendingEntryRow[])
        .map((entry) => normalizeEmployeeCode(entry.employee_code))
        .filter((code) => code.length > 0)
    )
  )

  if (!employeeCodes.length) {
    return
  }

  const { data: employeeRows, error: employeeError } = await admin
    .from('employees')
    .select('employee_code, first_name, last_name, designation, base_ctc')
    .eq('organization_id', organizationId)

  if (employeeError || !employeeRows?.length) {
    return
  }

  const employeeByCode = new Map<string, EmployeePackageRow>()
  for (const employee of employeeRows as EmployeePackageRow[]) {
    const code = normalizeEmployeeCode(employee.employee_code)
    if (code.length > 0) {
      employeeByCode.set(code, employee)
    }
  }

  for (const entry of pendingEntries as PayrollPendingEntryRow[]) {
    const matchedEmployee = employeeByCode.get(normalizeEmployeeCode(entry.employee_code))
    if (!matchedEmployee) {
      continue
    }

    const nextBaseCtc = Number(matchedEmployee.base_ctc ?? 0)
    if (!Number.isFinite(nextBaseCtc)) {
      continue
    }

    const recomputed = recomputePayrollFromBase(entry, nextBaseCtc)
    const fullName = `${String(matchedEmployee.first_name ?? '').trim()} ${String(matchedEmployee.last_name ?? '').trim()}`.trim()
    const designation = String(matchedEmployee.designation ?? '').trim()

    const updatePayload: Record<string, unknown> = {
      ...recomputed,
      updated_at: new Date().toISOString(),
    }

    if (fullName.length > 0) {
      updatePayload.employee_name = fullName
    }

    if (designation.length > 0) {
      updatePayload.designation = designation
    }

    await admin
      .from('payroll_register_entries')
      .update(updatePayload)
      .eq('id', entry.id)
      .eq('organization_id', organizationId)
      .eq('transfer_status', 'Pending')
  }
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
  const requestUrl = new URL(request.url)

  let bodyToken: string | null = null
  let bodyUserId: string | null = null
  let bodyOrganizationId: string | null = null

  if (request.method !== 'GET') {
    const clonedRequest = request.clone()
    try {
      const body = (await clonedRequest.json()) as PayrollRegisterRequest
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
    const requestUrl = new URL(request.url)
    const payrollMonth = requestUrl.searchParams.get('payrollMonth')

    // Keep pending payroll entries aligned with latest employee package edits.
    await syncPendingEntriesWithEmployeePackages(admin, organizationId, payrollMonth)

    let query = admin
      .from('payroll_register_entries')
      .select('*')
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false })

    if (payrollMonth) {
      query = query.eq('payroll_month', payrollMonth)
    }

    const { data, error } = await query

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ entries: data ?? [] }, { status: 200 })
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

    const body = (await request.json()) as PayrollRegisterRequest
    if (!body.employeeCode?.trim() || !body.employeeName?.trim() || !body.designation?.trim() || !body.payrollMonth?.trim()) {
      return NextResponse.json({ error: 'employeeCode, employeeName, designation and payrollMonth are required' }, { status: 400 })
    }

    const now = new Date().toISOString()
    const payload = {
      id: crypto.randomUUID(),
      organization_id: organizationId,
      employee_code: body.employeeCode.trim(),
      employee_name: body.employeeName.trim(),
      designation: body.designation.trim(),
      payroll_month: body.payrollMonth.trim(),
      basic: Number(body.basic ?? 0),
      da: Number(body.da ?? 0),
      hra: Number(body.hra ?? 0),
      conveyance: Number(body.conveyance ?? 0),
      medical: Number(body.medical ?? 0),
      gross_salary: Number(body.grossSalary ?? 0),
      pf: Number(body.pf ?? 0),
      esi: Number(body.esi ?? 0),
      income_tax: Number(body.incomeTax ?? 0),
      pt: Number(body.pt ?? 0),
      total_deductions: Number(body.totalDeductions ?? 0),
      net_salary: Number(body.netSalary ?? 0),
      bank_account: body.bankAccount?.trim() || null,
      transfer_status: body.transferStatus ?? 'Pending',
      transfer_date: body.transferDate ?? null,
      created_at: now,
      updated_at: now,
    }

    const { data, error } = await admin
      .from('payroll_register_entries')
      .insert(payload)
      .select('*')
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ entry: data }, { status: 201 })
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

    const body = (await request.json()) as PayrollRegisterRequest
    if (body.action !== 'process-month') {
      return NextResponse.json({ error: 'Unsupported action' }, { status: 400 })
    }

    if (!body.payrollMonth?.trim()) {
      return NextResponse.json({ error: 'payrollMonth is required for process-month action' }, { status: 400 })
    }

    const transferDate = new Date().toISOString().slice(0, 10)
    const selectedIds = (body.selectedEntryIds ?? []).filter((id) => typeof id === 'string' && id.trim().length > 0)

    let query = admin
      .from('payroll_register_entries')
      .update({ transfer_status: 'Processed', transfer_date: transferDate, updated_at: new Date().toISOString() })
      .eq('organization_id', organizationId)
      .eq('payroll_month', body.payrollMonth.trim())
      .eq('transfer_status', 'Pending')

    if (selectedIds.length > 0) {
      query = query.in('id', selectedIds)
    }

    const { data, error } = await query.select('id')

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ success: true, updatedCount: data?.length ?? 0, transferDate }, { status: 200 })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
