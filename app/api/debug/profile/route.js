import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Service Role 클라이언트
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    if (!userId) {
      return NextResponse.json({ error: 'userId required' }, { status: 400 })
    }

    // DB에서 직접 조회
    const { data, error } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      profile: data,
      addresses: data?.addresses,
      addressesType: typeof data?.addresses,
      addressesLength: Array.isArray(data?.addresses) ? data.addresses.length : 'not array'
    })

  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
