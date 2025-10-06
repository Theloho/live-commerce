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

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const email = searchParams.get('email') || 'master@allok.world'

    console.log('🔍 관리자 상태 확인:', email)

    // Service Role로 profiles 조회 (RLS 우회)
    const { data: profile, error } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('email', email)
      .single()

    if (error) {
      console.error('❌ 프로필 조회 실패:', error)
      return NextResponse.json(
        { error: error.message, profile: null },
        { status: 200 }
      )
    }

    console.log('✅ 프로필 조회 성공:', profile)

    return NextResponse.json({
      profile,
      is_admin: profile?.is_admin,
      message: profile?.is_admin
        ? '✅ 관리자 권한 있음'
        : '❌ 관리자 권한 없음 - DB 업데이트 필요'
    })
  } catch (error) {
    console.error('❌ API 에러:', error)
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}

export async function POST(request) {
  try {
    const { email, setAdmin } = await request.json()

    if (!email) {
      return NextResponse.json(
        { error: 'email 필수' },
        { status: 400 }
      )
    }

    console.log(`🔧 관리자 권한 설정: ${email} → is_admin = ${setAdmin}`)

    // Service Role로 profiles 업데이트 (RLS 우회)
    const { data, error } = await supabaseAdmin
      .from('profiles')
      .update({ is_admin: setAdmin === true })
      .eq('email', email)
      .select()
      .single()

    if (error) {
      console.error('❌ 프로필 업데이트 실패:', error)
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      )
    }

    console.log('✅ 관리자 권한 설정 완료:', data)

    return NextResponse.json({
      success: true,
      profile: data,
      message: `✅ ${email} 관리자 권한 설정 완료`
    })
  } catch (error) {
    console.error('❌ API 에러:', error)
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}
