import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Service Role Key를 사용한 관리자 클라이언트 생성
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL?.trim(),
  (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)?.replace(/[\r\n\s]+/g, '')
)

export async function POST(request) {
  try {
    console.log('🔄 카카오 주문 마이그레이션 시작...')

    // 1. user_id가 null인 주문들 중 order_type에 KAKAO가 포함된 주문 조회
    const { data: kakaoOrders, error: ordersError } = await supabaseAdmin
      .from('orders')
      .select(`
        *,
        order_shipping (*)
      `)
      .is('user_id', null)
      .like('order_type', '%KAKAO%')

    if (ordersError) {
      console.error('카카오 주문 조회 실패:', ordersError)
      throw ordersError
    }

    console.log(`📊 발견된 카카오 주문: ${kakaoOrders.length}개`)

    if (kakaoOrders.length === 0) {
      return NextResponse.json({
        success: true,
        message: '마이그레이션할 카카오 주문이 없습니다',
        migratedCount: 0
      })
    }

    // 2. order_type에서 카카오 사용자 ID 추출하고 profiles 테이블에서 해당 사용자 찾기
    const migrationResults = []

    for (const order of kakaoOrders) {
      try {
        console.log(`🔍 주문 ${order.id} 처리 중...`)

        // order_type에서 카카오 사용자 ID 추출
        const match = order.order_type.match(/:KAKAO:(.+)$/)
        if (!match) {
          console.log(`⚠️ 주문 ${order.id}: 카카오 사용자 ID 추출 실패`)
          continue
        }

        const kakaoUserId = match[1]
        console.log(`🔍 카카오 사용자 ID: ${kakaoUserId}`)

        // profiles 테이블에서 카카오 사용자 찾기
        const { data: profile, error: profileError } = await supabaseAdmin
          .from('profiles')
          .select('id, kakao_id, name')
          .eq('kakao_id', kakaoUserId)
          .single()

        if (profileError || !profile) {
          console.log(`❌ 주문 ${order.id}: 프로필을 찾을 수 없음 (kakao_id: ${kakaoUserId})`)
          continue
        }

        console.log(`✅ 프로필 발견: ${profile.name} (ID: ${profile.id})`)

        // auth.users에 해당 사용자가 있는지 확인
        const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(profile.id)

        if (!authUser?.user) {
          console.log(`⚠️ auth.users에 사용자 없음, 생성 시도...`)

          // auth.users에 사용자 생성
          const { data: newAuthUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
            id: profile.id,
            email: `kakao_${profile.kakao_id}@temp.com`,
            email_confirm: true,
            user_metadata: {
              kakao_id: profile.kakao_id,
              name: profile.name,
              provider: 'kakao'
            }
          })

          if (authError) {
            console.error(`❌ auth.users 생성 실패 (${profile.id}):`, authError)
            continue
          }

          console.log(`✅ auth.users 생성 성공: ${profile.id}`)
        }

        // 주문의 user_id 업데이트
        const { error: updateError } = await supabaseAdmin
          .from('orders')
          .update({
            user_id: profile.id,
            updated_at: new Date().toISOString()
          })
          .eq('id', order.id)

        if (updateError) {
          console.error(`❌ 주문 ${order.id} 업데이트 실패:`, updateError)
          continue
        }

        console.log(`✅ 주문 ${order.id} 마이그레이션 완료`)
        migrationResults.push({
          orderId: order.id,
          kakaoUserId: kakaoUserId,
          profileId: profile.id,
          userName: profile.name,
          status: 'success'
        })

      } catch (error) {
        console.error(`❌ 주문 ${order.id} 처리 중 오류:`, error)
        migrationResults.push({
          orderId: order.id,
          status: 'error',
          error: error.message
        })
      }
    }

    const successCount = migrationResults.filter(r => r.status === 'success').length
    const errorCount = migrationResults.filter(r => r.status === 'error').length

    console.log(`🎉 마이그레이션 완료 - 성공: ${successCount}개, 실패: ${errorCount}개`)

    return NextResponse.json({
      success: true,
      message: `카카오 주문 마이그레이션 완료`,
      totalOrders: kakaoOrders.length,
      migratedCount: successCount,
      errorCount: errorCount,
      results: migrationResults
    })

  } catch (error) {
    console.error('❌ 카카오 주문 마이그레이션 실패:', error)
    return NextResponse.json({
      success: false,
      error: error.message,
      message: '카카오 주문 마이그레이션에 실패했습니다'
    }, { status: 500 })
  }
}