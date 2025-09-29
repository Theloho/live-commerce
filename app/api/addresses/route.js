import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

// 주소 목록 조회 (profiles 테이블의 addresses JSONB 컬럼 사용)
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('user_id')

    if (!userId) {
      return NextResponse.json({ error: '사용자 ID가 필요합니다.' }, { status: 400 })
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // profiles 테이블에서 addresses 컬럼 조회
    const { data, error } = await supabase
      .from('profiles')
      .select('addresses')
      .eq('id', userId)
      .single()

    if (error) {
      console.error('프로필 조회 오류:', error)
      // addresses 컬럼이 없을 수도 있으므로 빈 배열 반환
      return NextResponse.json({ addresses: [] })
    }

    // addresses가 없거나 null이면 빈 배열 반환
    const addresses = data?.addresses || []

    // is_default 기준으로 정렬 (기본 주소가 먼저 오도록)
    const sortedAddresses = Array.isArray(addresses)
      ? addresses.sort((a, b) => {
          if (a.is_default && !b.is_default) return -1
          if (!a.is_default && b.is_default) return 1
          return 0
        })
      : []

    return NextResponse.json({ addresses: sortedAddresses })

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

    // 현재 프로필과 주소 목록 조회
    const { data: profile, error: fetchError } = await supabase
      .from('profiles')
      .select('addresses')
      .eq('id', user_id)
      .single()

    if (fetchError) {
      console.error('프로필 조회 오류:', fetchError)
      return NextResponse.json({ error: '프로필 조회에 실패했습니다.' }, { status: 500 })
    }

    let addresses = profile?.addresses || []

    // 배열이 아니면 빈 배열로 초기화
    if (!Array.isArray(addresses)) {
      addresses = []
    }

    // 새 주소 생성
    const newAddress = {
      id: Date.now(), // 간단한 ID 생성
      label: label || '배송지',
      address,
      detail_address: detail_address || '',
      is_default: false,
      created_at: new Date().toISOString()
    }

    // 기본 주소로 설정하는 경우
    if (is_default || addresses.length === 0) {
      // 기존 기본 주소 해제
      addresses = addresses.map(addr => ({ ...addr, is_default: false }))
      newAddress.is_default = true
    }

    // 새 주소 추가
    addresses.push(newAddress)

    // 최대 5개까지만 저장
    if (addresses.length > 5) {
      return NextResponse.json({ error: '최대 5개의 주소만 저장할 수 있습니다.' }, { status: 400 })
    }

    // 프로필 업데이트
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ addresses })
      .eq('id', user_id)

    if (updateError) {
      console.error('주소 추가 오류:', updateError)
      return NextResponse.json({ error: '주소 추가에 실패했습니다.' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      address: newAddress,
      addresses
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
    const { user_id, address_id, label, address, detail_address, is_default } = body

    if (!user_id || !address_id) {
      return NextResponse.json({
        error: '사용자 ID와 주소 ID가 필요합니다.'
      }, { status: 400 })
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // 현재 프로필과 주소 목록 조회
    const { data: profile, error: fetchError } = await supabase
      .from('profiles')
      .select('addresses')
      .eq('id', user_id)
      .single()

    if (fetchError) {
      console.error('프로필 조회 오류:', fetchError)
      return NextResponse.json({ error: '프로필 조회에 실패했습니다.' }, { status: 500 })
    }

    let addresses = profile?.addresses || []

    // 수정할 주소 찾기
    const addressIndex = addresses.findIndex(addr => addr.id === address_id)

    if (addressIndex === -1) {
      return NextResponse.json({ error: '주소를 찾을 수 없습니다.' }, { status: 404 })
    }

    // 기본 주소로 설정하는 경우
    if (is_default) {
      addresses = addresses.map(addr => ({ ...addr, is_default: false }))
    }

    // 주소 정보 업데이트
    addresses[addressIndex] = {
      ...addresses[addressIndex],
      label: label !== undefined ? label : addresses[addressIndex].label,
      address: address !== undefined ? address : addresses[addressIndex].address,
      detail_address: detail_address !== undefined ? detail_address : addresses[addressIndex].detail_address,
      is_default: is_default !== undefined ? is_default : addresses[addressIndex].is_default,
      updated_at: new Date().toISOString()
    }

    // 프로필 업데이트
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ addresses })
      .eq('id', user_id)

    if (updateError) {
      console.error('주소 수정 오류:', updateError)
      return NextResponse.json({ error: '주소 수정에 실패했습니다.' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      address: addresses[addressIndex],
      addresses
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
    const userId = searchParams.get('user_id')
    const addressId = searchParams.get('address_id')

    if (!userId || !addressId) {
      return NextResponse.json({
        error: '사용자 ID와 주소 ID가 필요합니다.'
      }, { status: 400 })
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // 현재 프로필과 주소 목록 조회
    const { data: profile, error: fetchError } = await supabase
      .from('profiles')
      .select('addresses')
      .eq('id', userId)
      .single()

    if (fetchError) {
      console.error('프로필 조회 오류:', fetchError)
      return NextResponse.json({ error: '프로필 조회에 실패했습니다.' }, { status: 500 })
    }

    let addresses = profile?.addresses || []

    // addressId를 숫자로 변환 (JSONB에서 id가 숫자로 저장됨)
    const addressIdNum = parseInt(addressId)

    // 삭제할 주소 찾기
    const addressIndex = addresses.findIndex(addr => addr.id === addressIdNum)

    if (addressIndex === -1) {
      return NextResponse.json({ error: '주소를 찾을 수 없습니다.' }, { status: 404 })
    }

    // 삭제할 주소가 기본 주소인 경우
    const wasDefault = addresses[addressIndex].is_default

    // 주소 삭제
    addresses.splice(addressIndex, 1)

    // 기본 주소를 삭제했고 다른 주소가 있으면 첫 번째 주소를 기본으로 설정
    if (wasDefault && addresses.length > 0) {
      addresses[0].is_default = true
    }

    // 프로필 업데이트
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ addresses })
      .eq('id', userId)

    if (updateError) {
      console.error('주소 삭제 오류:', updateError)
      return NextResponse.json({ error: '주소 삭제에 실패했습니다.' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      addresses
    })

  } catch (error) {
    console.error('주소 삭제 중 오류:', error)
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 })
  }
}