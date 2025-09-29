import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL?.trim(),
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.replace(/[\r\n\s]+/g, '')
)

export async function POST(request) {
  try {
    console.log('🔧 카카오 사용자 주문 처리 문제 해결 시작...')

    // 1. 모든 카카오 프로필 조회해서 실제 데이터 확인
    console.log('🔍 실제 카카오 프로필 데이터 조회 중...')

    const { data: allKakaoProfiles, error: allProfilesError } = await supabase
      .from('profiles')
      .select('*')
      .eq('provider', 'kakao')

    if (allProfilesError) {
      console.error('전체 카카오 프로필 조회 오류:', allProfilesError)
    } else {
      console.log(`📊 총 카카오 프로필 수: ${allKakaoProfiles ? allKakaoProfiles.length : 0}개`)
      allKakaoProfiles?.forEach((profile, index) => {
        console.log(`${index + 1}. ID: ${profile.id}, 이름: ${profile.name}, 카카오ID: ${profile.kakao_id}`)
      })
    }

    // 2. 실제 존재하는 첫 번째 카카오 사용자를 대상으로 처리
    if (!allKakaoProfiles || allKakaoProfiles.length === 0) {
      throw new Error('카카오 프로필이 없습니다')
    }

    const userProfile = allKakaoProfiles[0] // 실제 존재하는 첫 번째 카카오 사용자
    const problematicUserId = userProfile.id

    console.log(`👤 처리 대상 사용자: ${userProfile.name} (ID: ${problematicUserId}, 카카오ID: ${userProfile.kakao_id})`)

    // 3. 이 사용자의 기존 주문들 조회
    const { data: existingOrders, error: ordersError } = await supabase
      .from('orders')
      .select('*')
      .eq('user_id', problematicUserId)

    if (ordersError && !ordersError.message.includes('relation "orders" does not exist')) {
      console.error('기존 주문 조회 오류:', ordersError)
    } else {
      console.log(`📋 기존 주문 수: ${existingOrders ? existingOrders.length : 0}개`)
    }

    // 4. 새로운 익명 사용자 생성하여 auth.users 테이블에 항목 추가
    console.log('🆕 새로운 인증 사용자 생성 중...')

    const { data: newAuthUser, error: authError } = await supabase.auth.signInAnonymously()

    if (authError) {
      throw new Error(`새 인증 사용자 생성 실패: ${authError.message}`)
    }

    const newUserId = newAuthUser.user.id
    console.log(`✅ 새 인증 사용자 생성 성공: ${newUserId}`)

    // 5. 프로필 테이블 업데이트 - 기존 프로필을 새 user_id로 업데이트
    const { error: updateProfileError } = await supabase
      .from('profiles')
      .update({ id: newUserId })
      .eq('id', problematicUserId)

    if (updateProfileError) {
      console.error('프로필 업데이트 오류:', updateProfileError)
      throw new Error(`프로필 업데이트 실패: ${updateProfileError.message}`)
    }

    console.log(`✅ 프로필 ID 업데이트: ${problematicUserId} → ${newUserId}`)

    // 6. 기존 주문들이 있다면 새 user_id로 업데이트
    let orderUpdateCount = 0
    if (existingOrders && existingOrders.length > 0) {
      const { error: orderUpdateError } = await supabase
        .from('orders')
        .update({ user_id: newUserId })
        .eq('user_id', problematicUserId)

      if (orderUpdateError) {
        console.error('주문 업데이트 오류:', orderUpdateError)
      } else {
        orderUpdateCount = existingOrders.length
        console.log(`✅ 기존 주문 ${orderUpdateCount}개 새 user_id로 업데이트`)
      }
    }

    // 7. 결제 정보도 업데이트 (있다면)
    let paymentUpdateCount = 0
    const { data: existingPayments, error: paymentsError } = await supabase
      .from('payments')
      .select('id')
      .eq('user_id', problematicUserId)

    if (!paymentsError && existingPayments && existingPayments.length > 0) {
      const { error: paymentUpdateError } = await supabase
        .from('payments')
        .update({ user_id: newUserId })
        .eq('user_id', problematicUserId)

      if (!paymentUpdateError) {
        paymentUpdateCount = existingPayments.length
        console.log(`✅ 기존 결제 ${paymentUpdateCount}개 새 user_id로 업데이트`)
      }
    }

    // 8. 로그아웃 (정리)
    await supabase.auth.signOut()

    // 9. 결과 리포트
    const result = {
      success: true,
      old_user_id: problematicUserId,
      new_user_id: newUserId,
      user_name: userProfile.name,
      kakao_id: userProfile.kakao_id,
      updated_orders: orderUpdateCount,
      updated_payments: paymentUpdateCount,
      message: `카카오 사용자 ${userProfile.name}의 인증 문제 해결 완료`
    }

    console.log('🎉 카카오 사용자 문제 해결 완료:', result)

    return NextResponse.json(result)

  } catch (error) {
    console.error('❌ 카카오 사용자 문제 해결 실패:', error)
    return NextResponse.json({
      success: false,
      error: 'Fix failed',
      details: error.message
    }, { status: 500 })
  }
}