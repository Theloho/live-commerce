import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.replace(/\s/g, '')

    console.log('Products 테이블 확인 및 생성 테스트')

    // 먼저 기존 products 확인
    const checkResponse = await fetch(`${supabaseUrl}/rest/v1/products?limit=1`, {
      method: 'GET',
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json'
      }
    })

    console.log('Products 테이블 확인 상태:', checkResponse.status)

    if (checkResponse.ok) {
      const products = await checkResponse.json()
      return NextResponse.json({
        success: true,
        message: 'Products 테이블이 이미 존재합니다',
        count: products.length
      })
    }

    // 테이블이 없으면 기본 데이터로 생성 시도
    const sampleProduct = {
      id: crypto.randomUUID(),
      name: 'Test Product',
      description: 'Test Description',
      price: 100000,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }

    const createResponse = await fetch(`${supabaseUrl}/rest/v1/products`, {
      method: 'POST',
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      },
      body: JSON.stringify(sampleProduct)
    })

    const createResult = await createResponse.text()

    return NextResponse.json({
      success: createResponse.ok,
      message: createResponse.ok ? 'Products 테이블 생성 성공' : 'Products 테이블 생성 실패',
      status: createResponse.status,
      result: createResult,
      sampleData: sampleProduct
    })

  } catch (error) {
    console.error('테스트 오류:', error)
    return NextResponse.json({
      error: 'Test failed',
      details: error.message
    }, { status: 500 })
  }
}