import { NextResponse } from 'next/server'

export async function POST(request) {
  try {
    console.log('🧪 통합 주문 시스템 테스트 시작...')

    // 가상의 카카오 사용자 데이터로 createOrder 함수 테스트
    const testOrderData = {
      id: "807b3bf2-cc28-4d68-bda1-955f910b8d57", // 실제 상품 ID
      name: "테스트 상품",
      price: 10000,
      quantity: 1,
      totalPrice: 10000,
      orderType: "direct"
    }

    const testUserProfile = {
      name: "김진태",
      phone: "010-1234-5678",
      address: "테스트 주소",
      detail_address: "상세 주소"
    }

    console.log('📋 테스트 데이터:', { testOrderData, testUserProfile })

    // 통합된 createOrder API 호출 (더 이상 별도 카카오 API 없음)
    const orderResponse = await fetch('http://localhost:3000/api/create-order-card', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        orderData: testOrderData,
        userProfile: testUserProfile,
        paymentMethod: 'bank_transfer',
        depositName: "김진태"
      })
    })

    const orderResult = await orderResponse.text()
    console.log('📋 통합 주문 API 응답 상태:', orderResponse.status)
    console.log('📋 통합 주문 API 응답 내용:', orderResult)

    if (orderResponse.ok) {
      const orderJson = JSON.parse(orderResult)
      return NextResponse.json({
        success: true,
        message: '통합 주문 시스템 테스트 성공',
        order: orderJson,
        note: '별도 카카오 API 없이 통합 시스템으로 주문 생성 성공'
      })
    } else {
      return NextResponse.json({
        success: false,
        message: '통합 주문 시스템 테스트 실패',
        error: orderResult,
        status: orderResponse.status
      })
    }

  } catch (error) {
    console.error('❌ 통합 주문 시스템 테스트 오류:', error)
    return NextResponse.json({
      success: false,
      error: 'Test failed',
      details: error.message
    }, { status: 500 })
  }
}