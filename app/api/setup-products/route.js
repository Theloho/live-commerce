import { NextResponse } from 'next/server'

export async function POST() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.replace(/\s/g, '')

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json({ error: 'Missing Supabase configuration' }, { status: 500 })
    }

    console.log('Creating products table...')

    // Create products table
    const createTableResponse = await fetch(`${supabaseUrl}/rest/v1/products`, {
      method: 'POST',
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      },
      body: JSON.stringify({
        id: crypto.randomUUID(),
        name: '프리미엄 라이브 방송 패키지',
        description: '고품질 라이브 커머스 방송을 위한 프리미엄 패키지입니다.',
        price: 299000,
        image_url: 'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=500',
        category: 'package',
        stock_quantity: 100,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
    })

    if (!createTableResponse.ok) {
      const errorText = await createTableResponse.text()
      console.error('Products table creation failed:', errorText)

      // If table doesn't exist error, that's expected - continue with sample data
      if (!errorText.includes('relation "products" does not exist')) {
        return NextResponse.json({
          error: 'Failed to create product',
          details: errorText
        }, { status: 500 })
      }
    }

    // Insert sample products
    const sampleProducts = [
      {
        id: crypto.randomUUID(),
        name: '프리미엄 라이브 방송 패키지',
        description: '고품질 라이브 커머스 방송을 위한 프리미엄 패키지입니다.',
        price: 299000,
        image_url: 'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=500',
        category: 'package',
        stock_quantity: 100,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: crypto.randomUUID(),
        name: '스탠다드 방송 장비',
        description: '기본적인 라이브 방송에 필요한 장비 세트입니다.',
        price: 199000,
        image_url: 'https://images.unsplash.com/photo-1598300042247-d088f8ab3a91?w=500',
        category: 'equipment',
        stock_quantity: 50,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: crypto.randomUUID(),
        name: '마케팅 컨설팅 서비스',
        description: '라이브 커머스 마케팅 전략 수립 및 컨설팅 서비스입니다.',
        price: 500000,
        image_url: 'https://images.unsplash.com/photo-1552664730-d307ca884978?w=500',
        category: 'service',
        stock_quantity: 10,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    ]

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

    if (!insertResponse.ok) {
      const errorText = await insertResponse.text()
      console.error('Sample products insertion failed:', errorText)
      return NextResponse.json({
        error: 'Failed to insert sample products',
        details: errorText
      }, { status: 500 })
    }

    const result = await insertResponse.json()
    console.log('Sample products created successfully:', result)

    return NextResponse.json({
      success: true,
      message: 'Products table and sample data created successfully',
      products: result
    })

  } catch (error) {
    console.error('Setup products error:', error)
    return NextResponse.json({
      error: 'Internal server error',
      details: error.message
    }, { status: 500 })
  }
}