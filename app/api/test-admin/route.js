import { NextResponse } from 'next/server'
import { supabaseAdmin, verifyAdminAuth } from '@/lib/supabaseAdmin'

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const adminEmail = searchParams.get('adminEmail')

    console.log('🧪 테스트 API 호출:', { adminEmail })
    console.log('🔍 환경변수 확인:', {
      hasUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      hasServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      hasSupabaseAdmin: !!supabaseAdmin
    })

    if (!adminEmail) {
      return NextResponse.json({
        success: false,
        error: 'adminEmail 파라미터가 필요합니다'
      }, { status: 400 })
    }

    // 관리자 인증 확인
    const isAdmin = await verifyAdminAuth(adminEmail)

    console.log('✅ 인증 결과:', { adminEmail, isAdmin })

    // DB에서 직접 프로필 조회
    const { data: profile, error } = await supabaseAdmin
      .from('profiles')
      .select('id, email, name, nickname, is_admin')
      .eq('email', adminEmail)
      .single()

    return NextResponse.json({
      success: true,
      adminEmail,
      isAdmin,
      profile,
      error: error?.message || null
    })

  } catch (error) {
    console.error('❌ 테스트 API 에러:', error)
    return NextResponse.json({
      success: false,
      error: error.message,
      stack: error.stack
    }, { status: 500 })
  }
}
