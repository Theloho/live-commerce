import { NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { supabaseAdmin, verifyAdminAuth } from '@/lib/supabaseAdmin'

export async function POST(request) {
  try {
    const { productId, adminEmail } = await request.json()

    console.log('🗑️ 상품 삭제 API:', { productId, adminEmail })

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
      console.warn(`⚠️ 권한 없는 상품 삭제 시도: ${adminEmail}`)
      return NextResponse.json(
        { error: '관리자 권한이 없습니다' },
        { status: 403 }
      )
    }

    // 3. Soft Delete 실행
    const now = new Date().toISOString()
    const { data, error } = await supabaseAdmin
      .from('products')
      .update({
        status: 'deleted',
        deleted_at: now,
        updated_at: now,
        is_live: false,
        is_live_active: false
      })
      .eq('id', productId)
      .select()
      .single()

    if (error) {
      console.error('❌ 상품 삭제 실패:', error)
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      )
    }

    console.log(`✅ 상품 삭제 완료 (soft delete):`, productId)

    // 4. 홈페이지 캐시 즉시 무효화
    revalidatePath('/')
    console.log('🔄 홈페이지 캐시 무효화 완료')

    return NextResponse.json({
      success: true,
      product: data
    })
  } catch (error) {
    console.error('❌ API 에러:', error)
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}
