import { NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { supabaseAdmin, verifyAdminAuth } from '@/lib/supabaseAdmin'

export async function POST(request) {
  try {
    const { productId, currentStatus, adminEmail } = await request.json()

    console.log('👁️ 상품 노출 토글 API:', { productId, currentStatus, adminEmail })

    // 1. 필수 파라미터 검증
    if (!productId) {
      return NextResponse.json(
        { error: 'productId가 필요합니다' },
        { status: 400 }
      )
    }

    if (!adminEmail) {
      return NextResponse.json(
        { error: '관리자 인증 정보가 필요합니다' },
        { status: 401 }
      )
    }

    // 2. 관리자 권한 확인
    const isAdmin = await verifyAdminAuth(adminEmail)
    if (!isAdmin) {
      console.warn(`⚠️ 권한 없는 노출 토글 시도: ${adminEmail}`)
      return NextResponse.json(
        { error: '관리자 권한이 없습니다' },
        { status: 403 }
      )
    }

    // 3. 상품 노출 상태 토글
    const newStatus = !currentStatus
    const { data, error } = await supabaseAdmin
      .from('products')
      .update({
        is_live_active: newStatus,
        live_start_time: newStatus ? new Date().toISOString() : null,
        live_end_time: newStatus ? null : new Date().toISOString()
      })
      .eq('id', productId)
      .select()
      .single()

    if (error) {
      console.error('❌ 노출 토글 실패:', error)
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      )
    }

    console.log('✅ 노출 토글 완료:', { productId, newStatus })

    // 4. 홈페이지 캐시 즉시 무효화 (사용자가 바로 변경사항 확인 가능)
    revalidatePath('/')
    console.log('🔄 홈페이지 캐시 무효화 완료')

    return NextResponse.json({
      success: true,
      product: data,
      message: newStatus ? '사용자 페이지에 노출됩니다' : '사용자 페이지에서 숨김 처리되었습니다'
    })
  } catch (error) {
    console.error('❌ API 에러:', error)
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}
