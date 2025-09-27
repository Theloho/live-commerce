import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Supabase 클라이언트 생성
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL?.trim(),
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.replace(/[\r\n\s]+/g, '')
)

export async function POST(request) {
  try {
    console.log('🔧 배송 정보 수정 시작')

    // 1. 잘못된 데이터가 있는 order_shipping 레코드 조회
    const { data: problematicRecords, error: selectError } = await supabase
      .from('order_shipping')
      .select(`
        *,
        orders (
          user_id,
          customer_order_number,
          status
        )
      `)
      .or('phone.eq.010-0000-0000,address.eq.기본주소,phone.eq.미입력,address.eq.배송지 미입력,phone.eq.,address.eq.')

    if (selectError) {
      console.error('문제 데이터 조회 오류:', selectError)
      return NextResponse.json({ error: selectError.message }, { status: 500 })
    }

    console.log('🔍 발견된 문제 레코드:', problematicRecords?.length || 0)

    let fixedCount = 0
    let failedCount = 0
    const fixDetails = []

    // 2. 각 레코드별로 실제 사용자 정보로 대체
    for (const record of problematicRecords || []) {
      try {
        const userId = record.orders?.user_id

        if (!userId) {
          console.log(`⚠️ 주문 ${record.order_id}의 user_id가 없음`)
          failedCount++
          fixDetails.push({
            order_id: record.order_id,
            status: 'failed',
            reason: 'user_id 없음'
          })
          continue
        }

        // 사용자 프로필 정보 조회 (여러 소스 확인)
        // 1) users 테이블 확인
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('*')
          .eq('id', userId)
          .single()

        let profileData = null

        if (!userError && userData) {
          profileData = userData
          console.log(`✓ users 테이블에서 프로필 발견: ${userId}`)
        } else {
          // 2) profiles 테이블 확인
          const { data: profileRecord, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .single()

          if (!profileError && profileRecord) {
            profileData = profileRecord
            console.log(`✓ profiles 테이블에서 프로필 발견: ${userId}`)
          }
        }

        if (!profileData) {
          console.log(`⚠️ 사용자 ${userId}의 프로필 정보를 찾을 수 없음`)
          failedCount++
          fixDetails.push({
            order_id: record.order_id,
            customer_order_number: record.orders?.customer_order_number,
            status: 'failed',
            reason: '프로필 정보 없음'
          })
          continue
        }

        // 3. 실제 프로필 정보로 order_shipping 업데이트
        const updateData = {}
        let needsUpdate = false

        // 이름 체크 및 업데이트
        if (!record.name || record.name === '미입력' || record.name === '') {
          updateData.name = profileData.name || profileData.nickname || '고객'
          needsUpdate = true
        }

        // 전화번호 체크 및 업데이트
        if (record.phone === '010-0000-0000' || record.phone === '미입력' || record.phone === '') {
          updateData.phone = profileData.phone || ''
          needsUpdate = true
        }

        // 주소 체크 및 업데이트
        if (record.address === '기본주소' || record.address === '배송지 미입력' || record.address === '') {
          updateData.address = profileData.address || ''
          needsUpdate = true
        }

        // 상세주소 체크 및 업데이트
        if (!record.detail_address && profileData.detail_address) {
          updateData.detail_address = profileData.detail_address
          needsUpdate = true
        }

        if (needsUpdate) {
          const { error: updateError } = await supabase
            .from('order_shipping')
            .update(updateData)
            .eq('id', record.id)

          if (updateError) {
            console.error(`❌ 업데이트 실패 (order_shipping.id: ${record.id}):`, updateError)
            failedCount++
            fixDetails.push({
              order_id: record.order_id,
              customer_order_number: record.orders?.customer_order_number,
              status: 'failed',
              reason: updateError.message
            })
          } else {
            console.log(`✅ 업데이트 성공 (주문번호: ${record.orders?.customer_order_number})`)
            fixedCount++
            fixDetails.push({
              order_id: record.order_id,
              customer_order_number: record.orders?.customer_order_number,
              status: 'success',
              updated: updateData
            })
          }
        } else {
          console.log(`ℹ️ 업데이트 불필요 (order_id: ${record.order_id})`)
        }

      } catch (error) {
        console.error('레코드 처리 중 오류:', error)
        failedCount++
        fixDetails.push({
          order_id: record.order_id,
          status: 'error',
          reason: error.message
        })
      }
    }

    console.log('🏁 배송 정보 수정 완료')
    console.log(`✅ 성공: ${fixedCount}개`)
    console.log(`❌ 실패: ${failedCount}개`)

    return NextResponse.json({
      success: true,
      message: `총 ${problematicRecords?.length || 0}개 중 ${fixedCount}개 수정 완료`,
      details: {
        total: problematicRecords?.length || 0,
        fixed: fixedCount,
        failed: failedCount,
        records: fixDetails
      }
    })

  } catch (error) {
    console.error('API 오류:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// GET 메서드: 문제가 있는 레코드 조회만
export async function GET(request) {
  try {
    // 문제가 있는 order_shipping 레코드 조회
    const { data: problematicRecords, error } = await supabase
      .from('order_shipping')
      .select(`
        *,
        orders (
          user_id,
          customer_order_number,
          status,
          created_at
        )
      `)
      .or('phone.eq.010-0000-0000,address.eq.기본주소,phone.eq.미입력,address.eq.배송지 미입력,phone.eq.,address.eq.')
      .order('created_at', { ascending: false })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      total: problematicRecords?.length || 0,
      records: problematicRecords || []
    })

  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}