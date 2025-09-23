import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Service Role Key를 사용하여 RLS 우회
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL?.trim(),
  (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)?.replace(/[\r\n\s]+/g, '')
)

export async function GET(request) {
  try {
    console.log('상품 데이터 조회 시작 (Service Role Key 사용)...')

    // Service Role Key로 직접 조회 (RLS 우회)
    const { data: products, error } = await supabaseAdmin
      .from('products')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('상품 조회 오류:', error)
      throw error
    }

    console.log(`${products?.length || 0}개의 상품 조회 성공`)

    return NextResponse.json({
      success: true,
      products: products || [],
      count: products?.length || 0
    })

  } catch (error) {
    console.error('상품 조회 실패:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || '상품 조회에 실패했습니다',
        products: []
      },
      { status: 500 }
    )
  }
}