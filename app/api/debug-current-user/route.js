import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL?.trim(),
  (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)?.replace(/[\r\n\s]+/g, '')
)

export async function POST(request) {
  try {
    const { userId } = await request.json()
    console.log(`🔍 사용자 디버깅 시작: ${userId}`)

    // 1. auth.users에서 확인
    try {
      const { data: authUsers, error: authError } = await supabaseAdmin.auth.admin.listUsers()
      console.log(`📊 전체 auth.users 수: ${authUsers?.users?.length || 0}개`)

      const authUser = authUsers?.users?.find(u => u.id === userId)
      console.log(`🔍 auth.users에서 찾음:`, authUser ? '✅ 존재' : '❌ 없음')
      if (authUser) {
        console.log(`   - 이메일: ${authUser.email || 'N/A'}`)
        console.log(`   - 생성일: ${authUser.created_at}`)
      }
    } catch (authError) {
      console.log('⚠️ auth.users 조회 권한 없음:', authError.message)
    }

    // 2. profiles에서 확인
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()

    console.log(`🔍 profiles에서 찾음:`, profile ? '✅ 존재' : '❌ 없음')
    if (profile) {
      console.log(`   - 이름: ${profile.name}`)
      console.log(`   - 전화번호: ${profile.phone}`)
      console.log(`   - 카카오ID: ${profile.kakao_id || 'N/A'}`)
    }
    if (profileError) {
      console.log(`   - 오류: ${profileError.message}`)
    }

    // 3. 해당 사용자의 주문 확인
    const { data: orders, error: ordersError } = await supabaseAdmin
      .from('orders')
      .select('id, user_id, created_at, order_type')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    console.log(`🔍 해당 사용자의 주문: ${orders?.length || 0}개`)
    if (orders && orders.length > 0) {
      orders.forEach((order, i) => {
        console.log(`   ${i+1}. ${order.id} (${order.order_type}) - ${order.created_at}`)
      })
    }

    // 4. user_id가 null인 주문 확인
    const { data: nullOrders, error: nullOrdersError } = await supabaseAdmin
      .from('orders')
      .select('id, created_at, order_type, order_shipping(*)')
      .is('user_id', null)
      .order('created_at', { ascending: false })
      .limit(5)

    console.log(`🔍 user_id가 null인 최근 주문: ${nullOrders?.length || 0}개`)
    if (nullOrders && nullOrders.length > 0) {
      nullOrders.forEach((order, i) => {
        console.log(`   ${i+1}. ${order.id} (${order.order_type}) - 배송지: ${order.order_shipping[0]?.name || 'N/A'}`)
      })
    }

    return NextResponse.json({
      success: true,
      userId,
      authUserExists: authUsers?.users?.find(u => u.id === userId) ? true : false,
      profileExists: !!profile,
      profile: profile,
      userOrders: orders?.length || 0,
      nullOrders: nullOrders?.length || 0,
      diagnosis: !profile ? 'profiles 테이블에 사용자 정보가 없습니다' :
                 orders?.length === 0 ? '사용자는 있지만 주문이 없거나 user_id가 null로 저장되었습니다' :
                 '정상적으로 보입니다'
    })

  } catch (error) {
    console.error('❌ 사용자 디버깅 실패:', error)
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 })
  }
}