import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

// Service Role 클라이언트 (RLS 우회)
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

export async function POST(request) {
  try {
    const { userId } = await request.json()

    if (!userId) {
      return NextResponse.json(
        { error: 'userId 필요' },
        { status: 400 }
      )
    }

    // Service Role로 profiles 조회 (RLS 우회)
    const { data: profile, error } = await supabaseAdmin
      .from('profiles')
      .select('is_admin, is_master, email, name')
      .eq('id', userId)
      .single()

    if (error) {
      console.error('❌ 프로필 조회 실패 (Service Role):', error)
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ profile })
  } catch (error) {
    console.error('❌ API 에러:', error)
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}
