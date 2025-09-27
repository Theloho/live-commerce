import { supabase } from '@/lib/supabase'

export async function POST(request) {
  try {
    console.log('🧹 더미 데이터 정리 시작')

    // 더미 데이터가 있는 order_shipping 레코드 조회
    const { data: dummyRecords, error: selectError } = await supabase
      .from('order_shipping')
      .select('*')
      .or('phone.eq.010-0000-0000,address.eq.기본주소')

    if (selectError) {
      console.error('더미 데이터 조회 오류:', selectError)
      return Response.json({ error: selectError.message }, { status: 500 })
    }

    console.log('🔍 발견된 더미 데이터 레코드:', dummyRecords?.length || 0)

    if (dummyRecords && dummyRecords.length > 0) {
      // 더미 데이터를 빈 문자열로 업데이트
      const { error: updateError } = await supabase
        .from('order_shipping')
        .update({
          phone: '',
          address: ''
        })
        .or('phone.eq.010-0000-0000,address.eq.기본주소')

      if (updateError) {
        console.error('더미 데이터 업데이트 오류:', updateError)
        return Response.json({ error: updateError.message }, { status: 500 })
      }

      console.log('✅ 더미 데이터 정리 완료:', dummyRecords.length, '개 레코드 업데이트')
    }

    return Response.json({
      success: true,
      message: `${dummyRecords?.length || 0}개 레코드의 더미 데이터가 정리되었습니다`,
      updatedRecords: dummyRecords?.length || 0
    })

  } catch (error) {
    console.error('API 오류:', error)
    return Response.json({ error: error.message }, { status: 500 })
  }
}