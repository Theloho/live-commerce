import { NextResponse } from 'next/server'
import { supabaseAdmin, verifyAdminAuth } from '@/lib/supabaseAdmin'

export async function POST(request) {
  try {
    const { productIds, updates, adminEmail } = await request.json()

    console.log('🔄 상품 일괄 업데이트 API:', { productIds, updates, adminEmail })

    // 1. 필수 파라미터 검증
    if (!productIds || !Array.isArray(productIds) || productIds.length === 0) {
      return NextResponse.json(
        { error: 'productIds 배열이 필요합니다' },
        { status: 400 }
      )
    }

    if (!updates || typeof updates !== 'object') {
      return NextResponse.json(
        { error: '업데이트할 데이터가 필요합니다' },
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
      console.warn(`⚠️ 권한 없는 상품 업데이트 시도: ${adminEmail}`)
      return NextResponse.json(
        { error: '관리자 권한이 없습니다' },
        { status: 403 }
      )
    }

    // 3. 상품 일괄 업데이트
    const { data, error } = await supabaseAdmin
      .from('products')
      .update(updates)
      .in('id', productIds)
      .select()

    if (error) {
      console.error('❌ 일괄 업데이트 실패:', error)
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      )
    }

    console.log(`✅ ${productIds.length}개 상품 업데이트 완료`)

    return NextResponse.json({
      success: true,
      count: data.length,
      products: data
    })
  } catch (error) {
    console.error('❌ API 에러:', error)
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}
