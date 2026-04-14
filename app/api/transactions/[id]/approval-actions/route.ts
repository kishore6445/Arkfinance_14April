import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

type RouteContext = { params: { id: string } }

type ApprovalActionPayload = {
  id?: string
  action: 'ASSIGNED' | 'REASSIGNED' | 'REQUEST_CHANGES' | 'APPROVED' | 'REJECTED' | 'ESCALATED' | string
  fromUserId?: string | null
  toUserId?: string | null
  actedBy?: string | null
  approvalLevel?: 'NONE' | 'MANAGER' | 'ADMIN' | 'ADMIN_AUDITOR' | string
  note?: string | null
  actedAt?: string | null
}

type UserProfileRow = {
  id: string
  organization_id: string | null
  is_active: boolean | null
  role: string | null
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

export async function GET(request: Request, context: RouteContext) {
  try {
    const authorized = await getAuthorizedProfile(request)
    if ('error' in authorized) {
      return authorized.error
    }

    const { admin, profile } = authorized
    const transactionId = context.params.id

    const { data, error } = await admin
      .from('transaction_approval_actions')
      .select('*')
      .eq('transaction_id', transactionId)
      .eq('organization_id', profile.organization_id)
      .order('acted_at', { ascending: false })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ actions: data ?? [] }, { status: 200 })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const authorized = await getAuthorizedProfile(request)
    if ('error' in authorized) {
      return authorized.error
    }

    const { admin, profile } = authorized
    const transactionId = context.params.id
    const body = (await request.json()) as ApprovalActionPayload

    if (!body.action?.trim()) {
      return NextResponse.json({ error: 'action is required' }, { status: 400 })
    }

    // Only Accountants/Admins can record an APPROVED action
    if (body.action.trim().toUpperCase() === 'APPROVED') {
      const roleNormalized = (profile.role ?? '')
        .trim().toUpperCase().replace(/[^A-Z0-9]+/g, '_').replace(/^_+|_+$/g, '')
      const allowedRoles = ['ACCOUNTANT', 'ORG_ADMIN', 'SUPER_ADMIN']
      if (!allowedRoles.includes(roleNormalized)) {
        return NextResponse.json(
          { error: 'Only Accountant users can approve transactions' },
          { status: 403 }
        )
      }
    }

    const payload = {
      id: body.id ?? crypto.randomUUID(),
      transaction_id: transactionId,
      organization_id: profile.organization_id,
      action: body.action.trim().toUpperCase(),
      from_user_id: body.fromUserId ?? null,
      to_user_id: body.toUserId ?? null,
      acted_by: body.actedBy ?? profile.id,
      approval_level: body.approvalLevel?.toUpperCase() ?? null,
      note: body.note ?? null,
      acted_at: body.actedAt ?? new Date().toISOString(),
    }

    const { data, error } = await admin
      .from('transaction_approval_actions')
      .insert(payload)
      .select('*')
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ action: data }, { status: 200 })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
