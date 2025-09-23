import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Supabase 클라이언트 생성
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL?.trim(),
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.replace(/[\r\n\s]+/g, '')
)

export async function POST(request) {
  try {
    console.log('실제 상품 데이터 설정 시작...')

    // 1. 기존 Mock 상품 삭제
    const { error: deleteError } = await supabase
      .from('products')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000') // 존재하지 않는 조건으로 전체 삭제

    if (deleteError) {
      console.log('기존 상품 삭제 시도:', deleteError.message)
    }

    // 2. 실제 상품 데이터 추가
    const realProducts = [
      {
        id: crypto.randomUUID(),
        title: '프리미엄 한우 등심',
        description: '최고급 1++ 한우 등심 500g',
        price: 89000,
        compare_price: 120000,
        thumbnail_url: 'https://images.unsplash.com/photo-1558030006-450675393462',
        category: '육류',
        inventory_quantity: 50,
        is_visible: true,
        is_live: false,
        status: 'active',
        seller: '한우마을',
        is_featured: true,
        badge: '베스트',
        free_shipping: true
      },
      {
        id: crypto.randomUUID(),
        title: '제주 흑돼지 삼겹살',
        description: '제주산 흑돼지 삼겹살 600g',
        price: 45000,
        compare_price: 55000,
        thumbnail_url: 'https://images.unsplash.com/photo-1602470520998-f4a52199a3d6',
        category: '육류',
        inventory_quantity: 100,
        is_visible: true,
        is_live: true,
        status: 'active',
        seller: '제주농장',
        is_featured: false,
        badge: '라이브',
        free_shipping: false
      },
      {
        id: crypto.randomUUID(),
        title: '노르웨이 연어',
        description: '신선한 노르웨이산 연어 300g',
        price: 28000,
        compare_price: 35000,
        thumbnail_url: 'https://images.unsplash.com/photo-1599084993091-1cb5c0721cc6',
        category: '수산물',
        inventory_quantity: 80,
        is_visible: true,
        is_live: false,
        status: 'active',
        seller: '바다마트',
        is_featured: true,
        badge: null,
        free_shipping: true
      },
      {
        id: crypto.randomUUID(),
        title: '유기농 채소 세트',
        description: '신선한 유기농 채소 모음',
        price: 25000,
        compare_price: 30000,
        thumbnail_url: 'https://images.unsplash.com/photo-1540420773420-3366772f4999',
        category: '채소',
        inventory_quantity: 120,
        is_visible: true,
        is_live: false,
        status: 'active',
        seller: '유기농장',
        is_featured: false,
        badge: null,
        free_shipping: false
      },
      {
        id: crypto.randomUUID(),
        title: '프리미엄 과일 선물세트',
        description: '엄선된 제철 과일 모음',
        price: 65000,
        compare_price: 80000,
        thumbnail_url: 'https://images.unsplash.com/photo-1619566636858-adf3ef46400b',
        category: '과일',
        inventory_quantity: 60,
        is_visible: true,
        is_live: false,
        status: 'active',
        seller: '과일나라',
        is_featured: true,
        badge: '선물추천',
        free_shipping: true
      }
    ]

    const { data: products, error: insertError } = await supabase
      .from('products')
      .insert(realProducts)
      .select()

    if (insertError) {
      console.error('상품 추가 실패:', insertError)
      throw insertError
    }

    console.log(`${products.length}개의 실제 상품이 추가되었습니다`)

    return NextResponse.json({
      success: true,
      message: `${products.length}개의 실제 상품이 추가되었습니다`,
      products: products
    })

  } catch (error) {
    console.error('실제 상품 설정 오류:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || '실제 상품 설정에 실패했습니다'
      },
      { status: 500 }
    )
  }
}

export async function GET(request) {
  try {
    // 현재 상품 현황 조회
    const { data: products, error } = await supabase
      .from('products')
      .select('id, title, price, status, is_visible')

    if (error) throw error

    return NextResponse.json({
      success: true,
      count: products.length,
      products: products
    })

  } catch (error) {
    console.error('상품 조회 오류:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || '상품 조회에 실패했습니다'
      },
      { status: 500 }
    )
  }
}