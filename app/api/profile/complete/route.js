import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Service Role 클라이언트 (RLS 우회)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export async function POST(request) {
  try {
    const { userId, profileData } = await request.json()

    console.log('📱 [API] 프로필 완성 요청:', { userId, profileData })

    if (!userId || !profileData) {
      return NextResponse.json(
        { error: '필수 정보가 누락되었습니다' },
        { status: 400 }
      )
    }

    // profiles 테이블 업데이트
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
      return NextResponse.json(
        { error: error.message },
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
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}
