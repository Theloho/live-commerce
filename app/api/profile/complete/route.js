import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

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
    console.log('📱 [API] Supabase upsert 호출 시작...')

    // 업데이트할 데이터 준비 (제공된 필드만 업데이트)
    const updateData = {
      id: userId,
      updated_at: new Date().toISOString()
    }

    if (profileData.name !== undefined) updateData.name = profileData.name
    if (profileData.phone !== undefined) updateData.phone = profileData.phone
    if (profileData.nickname !== undefined) updateData.nickname = profileData.nickname
    if (profileData.address !== undefined) updateData.address = profileData.address
    if (profileData.detail_address !== undefined) updateData.detail_address = profileData.detail_address
    if (profileData.postal_code !== undefined) updateData.postal_code = profileData.postal_code
    if (profileData.addresses !== undefined) updateData.addresses = profileData.addresses

    console.log('📱 [API] 업데이트 데이터:', updateData)

    // ⚡ upsert 대신 update 사용 (스키마 캐시 이슈 회피)
    const { data, error } = await supabaseAdmin
      .from('profiles')
      .update(updateData)
      .eq('id', userId)
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
