import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    console.log('환경변수 테스트:', {
      NODE_ENV: process.env.NODE_ENV,
      urlExists: !!supabaseUrl,
      keyExists: !!supabaseKey,
      urlLength: supabaseUrl?.length,
      keyLength: supabaseKey?.length,
      urlStart: supabaseUrl?.substring(0, 20),
      keyStart: supabaseKey?.substring(0, 20)
    })

    return NextResponse.json({
      NODE_ENV: process.env.NODE_ENV,
      urlExists: !!supabaseUrl,
      keyExists: !!supabaseKey,
      urlLength: supabaseUrl?.length,
      keyLength: supabaseKey?.length,
      urlStart: supabaseUrl?.substring(0, 30),
      keyStart: supabaseKey?.substring(0, 20)
    })

  } catch (error) {
    console.error('환경변수 테스트 오류:', error)
    return NextResponse.json({
      error: 'Test failed',
      details: error.message
    }, { status: 500 })
  }
}