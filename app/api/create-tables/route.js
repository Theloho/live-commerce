import { NextResponse } from 'next/server'

export async function POST() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.replace(/\s/g, '')

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json({ error: 'Missing Supabase configuration' }, { status: 500 })
    }

    console.log('테이블 생성 시작...')

    // 먼저 간단한 products 테이블 생성
    const sampleProducts = [
      {
        id: crypto.randomUUID(),
        name: '프리미엄 라이브 방송 패키지',
        description: '고품질 라이브 커머스 방송을 위한 프리미엄 패키지입니다.',
        price: 299000,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: crypto.randomUUID(),
        name: '스탠다드 방송 장비',
        description: '기본적인 라이브 방송에 필요한 장비 세트입니다.',
        price: 199000,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: crypto.randomUUID(),
        name: '마케팅 컨설팅 서비스',
        description: '라이브 커머스 마케팅 전략 수립 및 컨설팅 서비스입니다.',
        price: 500000,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    ]

    // products 테이블에 데이터 삽입 시도
    const insertResponse = await fetch(`${supabaseUrl}/rest/v1/products`, {
      method: 'POST',
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      },
      body: JSON.stringify(sampleProducts)
    })

    let result = null
    if (insertResponse.ok) {
      result = await insertResponse.json()
      console.log('상품 데이터 삽입 성공:', result)
    } else {
      const errorText = await insertResponse.text()
      console.log('상품 데이터 삽입 실패:', errorText)
      result = { error: errorText, status: insertResponse.status }
    }

    return NextResponse.json({
      success: insertResponse.ok,
      message: insertResponse.ok ? '상품 테이블 생성 및 데이터 삽입 완료' : '테이블 생성 필요',
      result: result,
      sampleData: sampleProducts
    })

  } catch (error) {
    console.error('테이블 생성 오류:', error)
    return NextResponse.json({
      error: 'Internal server error',
      details: error.message
    }, { status: 500 })
  }
}