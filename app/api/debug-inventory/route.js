import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Service Role Key를 사용하여 RLS 우회
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL?.trim(),
  (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)?.replace(/[\r\n\s]+/g, '')
)

export async function GET() {
  try {
    console.log('🔍 DB 재고 필드 디버깅 시작')

    // 첫 번째 상품의 모든 필드 가져오기
    const { data: products, error } = await supabaseAdmin
      .from('products')
      .select('*')
      .limit(5)

    if (error) {
      console.error('상품 조회 오류:', error)
      throw error
    }

    console.log('🔍 전체 상품 필드 구조:', Object.keys(products[0] || {}))

    // 재고 관련 필드만 추출
    const inventoryFields = products.map(product => {
      const inventoryData = {}
      Object.keys(product).forEach(key => {
        if (key.toLowerCase().includes('inventory') ||
            key.toLowerCase().includes('stock') ||
            key.toLowerCase().includes('quantity')) {
          inventoryData[key] = product[key]
        }
      })
      return {
        id: product.id,
        title: product.title?.slice(0, 30) + '...',
        ...inventoryData
      }
    })

    console.log('🔍 재고 관련 필드 데이터:', inventoryFields)

    return NextResponse.json({
      success: true,
      products: inventoryFields,
      allFields: Object.keys(products[0] || {}),
      message: '재고 필드 디버깅 완료'
    })

  } catch (error) {
    console.error('재고 필드 디버깅 실패:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message,
        products: []
      },
      { status: 500 }
    )
  }
}