import { NextResponse } from 'next/server'

export async function POST(request) {
  try {
    console.log('🧪 카카오 주문 테스트 시작...')

    // DB 구조 확인 결과에서 실제 상품 ID 사용
    const testProductId = "807b3bf2-cc28-4d68-bda1-955f910b8d57"
    console.log(`📦 실제 상품 사용: ${testProductId}`)

    // 실제 카카오 사용자 데이터로 주문 생성 API 호출
    const testOrderData = {
      orderData: {
        id: testProductId,
        name: "테스트 상품",
        price: 10000,
        quantity: 1,
        orderType: "direct"
      },
      userProfile: {
        name: "김진태",
        nickname: "김진태",
        phone: "010-1234-5678",
        address: "테스트 주소",
        detail_address: "상세 주소"
      },
      userId: "9fa1fc4e-842f-4072-b88e-486e81490460", // 실제 카카오 사용자 ID
      depositName: "김진태"
    }

    console.log('📋 테스트 주문 데이터:', testOrderData)

    // create-order-kakao API 호출
    const orderResponse = await fetch('http://localhost:3000/api/create-order-kakao', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testOrderData)
    })

    const orderResult = await orderResponse.text()
    console.log('📋 주문 API 응답 상태:', orderResponse.status)
    console.log('📋 주문 API 응답 내용:', orderResult)

    if (orderResponse.ok) {
      const orderJson = JSON.parse(orderResult)
      return NextResponse.json({
        success: true,
        message: '카카오 주문 테스트 성공',
        order: orderJson
      })
    } else {
      return NextResponse.json({
        success: false,
        message: '카카오 주문 테스트 실패',
        error: orderResult,
        status: orderResponse.status
      })
    }

  } catch (error) {
    console.error('❌ 카카오 주문 테스트 오류:', error)
    return NextResponse.json({
      success: false,
      error: 'Test failed',
      details: error.message
    }, { status: 500 })
  }
}