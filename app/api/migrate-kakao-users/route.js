import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Service Role Key를 사용한 관리자 클라이언트 생성
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL?.trim(),
  (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)?.replace(/[\r\n\s]+/g, '')
)

export async function POST(request) {
  try {
    console.log('카카오 사용자 마이그레이션 시작...')

    // 1. profiles 테이블에서 카카오 사용자 조회
    const { data: kakaoUsers, error: fetchError } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .not('kakao_id', 'is', null)

    if (fetchError) {
      console.error('카카오 사용자 조회 실패:', fetchError)
      throw fetchError
    }

    console.log(`${kakaoUsers.length}명의 카카오 사용자를 찾았습니다`)

    const results = {
      success: [],
      failed: [],
      skipped: []
    }

    // 2. 각 카카오 사용자를 auth.users에 추가
    for (const user of kakaoUsers) {
      try {
        // 이미 auth.users에 존재하는지 확인
        const { data: existingUser } = await supabaseAdmin.auth.admin.getUserById(user.id)

        if (existingUser?.user) {
          console.log(`사용자 ${user.email}은(는) 이미 auth.users에 존재합니다`)
          results.skipped.push(user.email)
          continue
        }

        // auth.users에 사용자 생성
        const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
          id: user.id,
          email: user.email,
          email_confirm: true,
          user_metadata: {
            kakao_id: user.kakao_id,
            name: user.name,
            nickname: user.nickname,
            avatar_url: user.avatar_url,
            provider: user.provider || 'kakao',
            phone: user.phone,
            address: user.address,
            detail_address: user.detail_address
          }
        })

        if (authError) {
          console.error(`사용자 ${user.email} auth.users 생성 실패:`, authError)
          results.failed.push({ email: user.email, error: authError.message })
        } else {
          console.log(`사용자 ${user.email} 마이그레이션 성공`)
          results.success.push(user.email)
        }

      } catch (error) {
        console.error(`사용자 ${user.email} 처리 중 오류:`, error)
        results.failed.push({ email: user.email, error: error.message })
      }
    }

    console.log('마이그레이션 완료:', results)

    return NextResponse.json({
      message: '마이그레이션 완료',
      results: results,
      total: kakaoUsers.length,
      success_count: results.success.length,
      failed_count: results.failed.length,
      skipped_count: results.skipped.length
    })

  } catch (error) {
    console.error('마이그레이션 오류:', error)
    return NextResponse.json(
      { error: '마이그레이션 실패', details: error.message },
      { status: 500 }
    )
  }
}

export async function GET(request) {
  try {
    // 카카오 사용자 현황 조회
    const { data: kakaoUsers, error } = await supabaseAdmin
      .from('profiles')
      .select('id, email, name, kakao_id')
      .not('kakao_id', 'is', null)

    if (error) throw error

    // 각 사용자가 auth.users에 있는지 확인
    const status = []
    for (const user of kakaoUsers) {
      const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(user.id)
      status.push({
        ...user,
        in_auth_users: !!authUser?.user
      })
    }

    return NextResponse.json({
      total_kakao_users: kakaoUsers.length,
      users: status
    })

  } catch (error) {
    console.error('상태 조회 오류:', error)
    return NextResponse.json(
      { error: '상태 조회 실패', details: error.message },
      { status: 500 }
    )
  }
}