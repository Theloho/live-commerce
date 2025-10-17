import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

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
    const { userId, profileData } = await request.json()

    console.log('📱 [API] 프로필 완성 요청:', { userId, profileData })
    console.log('📱 [API] Service Role Key 존재:', !!process.env.SUPABASE_SERVICE_ROLE_KEY)

    if (!userId || !profileData) {
      return NextResponse.json(
        { error: '필수 정보가 누락되었습니다' },
        { status: 400 }
      )
    }

    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.error('📱 [API] SUPABASE_SERVICE_ROLE_KEY 환경변수 없음!')
      return NextResponse.json(
        { error: 'Server configuration error: SERVICE_ROLE_KEY missing' },
        { status: 500 }
      )
    }

    // profiles 테이블 업데이트
    console.log('📱 [API] Supabase upsert 호출 시작...')

    const { data, error } = await supabaseAdmin
      .from('profiles')
      .upsert({
        id: userId,
        name: profileData.name,
        phone: profileData.phone,
        nickname: profileData.nickname || profileData.name,
        address: profileData.address,
        detail_address: profileData.detail_address || '',
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'id'
      })
      .select()
      .single()

    if (error) {
      console.error('📱 [API] 프로필 업데이트 실패:', error)
      console.error('📱 [API] 에러 상세:', JSON.stringify(error, null, 2))
      return NextResponse.json(
        {
          error: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint
        },
        { status: 500 }
      )
    }

    console.log('📱 [API] 프로필 업데이트 성공:', data)

    return NextResponse.json({
      success: true,
      profile: data
    })

  } catch (error) {
    console.error('📱 [API] 프로필 완성 오류:', error)
    console.error('📱 [API] 에러 스택:', error.stack)
    return NextResponse.json(
      {
        error: error.message,
        type: error.constructor.name
      },
      { status: 500 }
    )
  }
}
