import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const role = new URL(request.url).searchParams.get('role')
  const service = createServiceClient()
  let query = service.from('profiles').select('id, email, full_name, role').order('full_name', { ascending: true })
  if (role) query = query.eq('role', role)

  const { data } = await query
  return NextResponse.json(data ?? [])
}
