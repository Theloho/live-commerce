import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Service Role Key를 사용하여 RLS 우회
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL?.trim(),
  (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)?.replace(/[\r\n\s]+/g, '')
)

export async function PATCH(request) {
  try {
    const { productId, updateData } = await request.json()

    console.log('🔍 상품 업데이트 요청:', { productId, updateData })

    if (!productId) {
      return NextResponse.json(
        { success: false, error: '상품 ID가 필요합니다' },
        { status: 400 }
      )
    }

    // Service Role로 직접 업데이트 (RLS 우회)
    const { data, error } = await supabaseAdmin
      .from('products')
      .update({
        ...updateData,
        updated_at: new Date().toISOString()
      })
      .eq('id', productId)
      .select()

    if (error) {
      console.error('상품 업데이트 오류:', error)
      throw error
    }

    console.log('✅ 상품 업데이트 성공:', data)

    return NextResponse.json({
      success: true,
      data: data[0],
      message: '상품 정보가 수정되었습니다'
    })

  } catch (error) {
    console.error('상품 업데이트 실패:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || '상품 수정에 실패했습니다'
      },
      { status: 500 }
    )
  }
}
