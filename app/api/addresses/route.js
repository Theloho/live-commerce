import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

// 주소 목록 조회
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('user_id')

    if (!userId) {
      return NextResponse.json({ error: '사용자 ID가 필요합니다.' }, { status: 400 })
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const { data, error } = await supabase
      .from('addresses')
      .select('*')
      .eq('user_id', userId)
      .order('is_default', { ascending: false })
      .order('created_at', { ascending: false })

    if (error) {
      console.error('주소 조회 오류:', error)
      // 더 상세한 에러 정보 반환 (개발 중에만 사용, 프로덕션에서는 제거 필요)
      return NextResponse.json({
        error: '주소 조회에 실패했습니다.',
        details: error.message,
        code: error.code
      }, { status: 500 })
    }

    return NextResponse.json({ addresses: data || [] })

  } catch (error) {
    console.error('주소 조회 중 오류:', error)
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 })
  }
}

// 새 주소 추가
export async function POST(request) {
  try {
    const body = await request.json()
    const { user_id, label, address, detail_address, is_default = false } = body

    if (!user_id || !address) {
      return NextResponse.json({
        error: '사용자 ID와 주소는 필수입니다.'
      }, { status: 400 })
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // 기본 배송지로 설정하는 경우, 기존 기본 배송지를 해제
    if (is_default) {
      await supabase
        .from('addresses')
        .update({ is_default: false })
        .eq('user_id', user_id)
        .eq('is_default', true)
    }

    const { data, error } = await supabase
      .from('addresses')
      .insert({
        user_id,
        label: label || '배송지',
        address,
        detail_address: detail_address || '',
        is_default
      })
      .select()
      .single()

    if (error) {
      console.error('주소 추가 오류:', error)
      return NextResponse.json({ error: '주소 추가에 실패했습니다.' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      address: data,
      message: '주소가 성공적으로 추가되었습니다.'
    })

  } catch (error) {
    console.error('주소 추가 중 오류:', error)
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 })
  }
}

// 주소 수정
export async function PUT(request) {
  try {
    const body = await request.json()
    const { id, user_id, label, address, detail_address, is_default } = body

    if (!id || !user_id) {
      return NextResponse.json({
        error: '주소 ID와 사용자 ID가 필요합니다.'
      }, { status: 400 })
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // 기본 배송지로 설정하는 경우, 기존 기본 배송지를 해제
    if (is_default) {
      await supabase
        .from('addresses')
        .update({ is_default: false })
        .eq('user_id', user_id)
        .eq('is_default', true)
        .neq('id', id)
    }

    const updateData = {}
    if (label !== undefined) updateData.label = label
    if (address !== undefined) updateData.address = address
    if (detail_address !== undefined) updateData.detail_address = detail_address
    if (is_default !== undefined) updateData.is_default = is_default

    const { data, error } = await supabase
      .from('addresses')
      .update(updateData)
      .eq('id', id)
      .eq('user_id', user_id)
      .select()
      .single()

    if (error) {
      console.error('주소 수정 오류:', error)
      return NextResponse.json({ error: '주소 수정에 실패했습니다.' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      address: data,
      message: '주소가 성공적으로 수정되었습니다.'
    })

  } catch (error) {
    console.error('주소 수정 중 오류:', error)
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 })
  }
}

// 주소 삭제
export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    const userId = searchParams.get('user_id')

    if (!id || !userId) {
      return NextResponse.json({
        error: '주소 ID와 사용자 ID가 필요합니다.'
      }, { status: 400 })
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // 삭제하려는 주소가 기본 배송지인지 확인
    const { data: addressToDelete, error: checkError } = await supabase
      .from('addresses')
      .select('is_default')
      .eq('id', id)
      .eq('user_id', userId)
      .single()

    if (checkError) {
      console.error('주소 확인 오류:', checkError)
      return NextResponse.json({ error: '주소를 찾을 수 없습니다.' }, { status: 404 })
    }

    const { error } = await supabase
      .from('addresses')
      .delete()
      .eq('id', id)
      .eq('user_id', userId)

    if (error) {
      console.error('주소 삭제 오류:', error)
      return NextResponse.json({ error: '주소 삭제에 실패했습니다.' }, { status: 500 })
    }

    // 기본 배송지를 삭제한 경우, 첫 번째 주소를 기본 배송지로 설정
    if (addressToDelete.is_default) {
      const { data: remainingAddresses } = await supabase
        .from('addresses')
        .select('id')
        .eq('user_id', userId)
        .order('created_at', { ascending: true })
        .limit(1)

      if (remainingAddresses && remainingAddresses.length > 0) {
        await supabase
          .from('addresses')
          .update({ is_default: true })
          .eq('id', remainingAddresses[0].id)
      }
    }

    return NextResponse.json({
      success: true,
      message: '주소가 성공적으로 삭제되었습니다.'
    })

  } catch (error) {
    console.error('주소 삭제 중 오류:', error)
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 })
  }
}