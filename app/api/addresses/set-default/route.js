import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

// 기본 배송지 설정
export async function POST(request) {
  try {
    const body = await request.json()
    const { address_id, user_id } = body

    if (!address_id || !user_id) {
      return NextResponse.json({
        error: '주소 ID와 사용자 ID가 필요합니다.'
      }, { status: 400 })
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // 트랜잭션 처리: 기존 기본 배송지 해제 후 새로 설정
    const { error: resetError } = await supabase
      .from('addresses')
      .update({ is_default: false })
      .eq('user_id', user_id)
      .eq('is_default', true)

    if (resetError) {
      console.error('기존 기본 배송지 해제 오류:', resetError)
      return NextResponse.json({ error: '기본 배송지 설정에 실패했습니다.' }, { status: 500 })
    }

    const { data, error } = await supabase
      .from('addresses')
      .update({ is_default: true })
      .eq('id', address_id)
      .eq('user_id', user_id)
      .select()
      .single()

    if (error) {
      console.error('기본 배송지 설정 오류:', error)
      return NextResponse.json({ error: '기본 배송지 설정에 실패했습니다.' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      address: data,
      message: '기본 배송지가 변경되었습니다.'
    })

  } catch (error) {
    console.error('기본 배송지 설정 중 오류:', error)
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 })
  }
}