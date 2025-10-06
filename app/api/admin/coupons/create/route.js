import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

// Service Role 클라이언트 (RLS 우회)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

export async function POST(request) {
  try {
    const couponData = await request.json()

    console.log('🎫 쿠폰 생성 요청 (Service Role):', couponData)

    // Service Role로 쿠폰 생성 (RLS 우회)
    const { data, error } = await supabaseAdmin
      .from('coupons')
      .insert({
        code: couponData.code.toUpperCase(),
        name: couponData.name,
        description: couponData.description || null,
        discount_type: couponData.discount_type,
        discount_value: couponData.discount_value,
        min_purchase_amount: couponData.min_purchase_amount || 0,
        max_discount_amount: couponData.max_discount_amount || null,
        valid_from: couponData.valid_from,
        valid_until: couponData.valid_until,
        usage_limit_per_user: couponData.usage_limit_per_user || 1,
        total_usage_limit: couponData.total_usage_limit || null,
        is_active: couponData.is_active !== false,
        created_by: couponData.created_by || null
      })
      .select()
      .single()

    if (error) {
      console.error('❌ 쿠폰 생성 실패 (Service Role):', error)
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      )
    }

    console.log('✅ 쿠폰 생성 완료 (Service Role):', data.code)
    return NextResponse.json({ coupon: data })
  } catch (error) {
    console.error('❌ API 에러:', error)
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}
