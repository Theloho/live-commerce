import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL?.trim(),
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.replace(/[\r\n\s]+/g, '')
)

export async function GET(request) {
  try {
    console.log('🔍 데이터베이스 구조 확인 시작...')

    const results = {}

    // 1. products 테이블 확인
    const { data: products, error: productsError } = await supabase
      .from('products')
      .select('*')
      .limit(3)

    results.products = {
      exists: !productsError,
      error: productsError?.message,
      count: products ? products.length : 0,
      sample: products ? products.slice(0, 2) : []
    }

    // 2. orders 테이블 확인
    const { data: orders, error: ordersError } = await supabase
      .from('orders')
      .select('id')
      .limit(1)

    results.orders = {
      exists: !ordersError,
      error: ordersError?.message,
      count: orders ? orders.length : 0
    }

    // 3. order_items 테이블 확인
    const { data: orderItems, error: orderItemsError } = await supabase
      .from('order_items')
      .select('id')
      .limit(1)

    results.order_items = {
      exists: !orderItemsError,
      error: orderItemsError?.message,
      count: orderItems ? orderItems.length : 0
    }

    // 4. profiles 테이블 확인 (이미 확인했지만 재확인)
    const { data: profilesData, error: profilesError } = await supabase
      .from('profiles')
      .select('id, name, provider')
      .eq('provider', 'kakao')

    results.profiles = {
      exists: !profilesError,
      error: profilesError?.message,
      kakao_count: profilesData ? profilesData.length : 0,
      kakao_users: profilesData || []
    }

    console.log('🎯 DB 구조 확인 결과:', results)

    return NextResponse.json({
      success: true,
      results: results
    })

  } catch (error) {
    console.error('❌ DB 구조 확인 오류:', error)
    return NextResponse.json({
      success: false,
      error: 'DB check failed',
      details: error.message
    }, { status: 500 })
  }
}