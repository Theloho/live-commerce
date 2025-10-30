/**
 * API를 통한 Lock 테스트
 * 실제 주문 생성으로 테스트
 */

require('dotenv').config({ path: '.env.local' })

const productId = '8794e427-5351-493e-8a42-601a45bdd557'
const apiUrl = 'http://localhost:3000/api/orders/create'

async function createOrder(index) {
  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        orderData: {
          items: [{
            product_id: productId,
            quantity: 1,
            title: `Test Product ${index}`,
            price: 10000,
            thumbnail_url: 'https://via.placeholder.com/400'
          }]
        },
        userProfile: {
          id: 'test-user-id',
          name: `Test User ${index}`,
          phone: '01012345678',
          address: 'Test Address',
          detail_address: 'Detail',
          postal_code: '12345'
        }
      })
    })

    const data = await response.json()
    return {
      index,
      success: response.ok,
      status: response.status,
      error: data.error || null,
      orderId: data.order?.id || null
    }
  } catch (error) {
    return {
      index,
      success: false,
      error: error.message
    }
  }
}

async function testConcurrency() {
  console.log('🧪 동시성 테스트 시작 (10명 동시 주문)...\n')

  // 10명이 동시에 주문
  const promises = []
  for (let i = 0; i < 10; i++) {
    promises.push(createOrder(i))
  }

  const results = await Promise.all(promises)

  const successCount = results.filter(r => r.success).length
  const failCount = results.filter(r => !r.success).length
  const lockErrors = results.filter(r => r.error?.includes('동시 구매')).length
  const inventoryErrors = results.filter(r => r.error?.includes('재고 부족')).length

  console.log('📊 결과:')
  console.log(`✅ 성공: ${successCount}명`)
  console.log(`❌ 실패: ${failCount}명`)
  console.log(`  - Lock 에러: ${lockErrors}명`)
  console.log(`  - 재고 부족: ${inventoryErrors}명\n`)

  console.log('상세:')
  results.forEach(r => {
    const status = r.success ? '✅' : '❌'
    const msg = r.success ? `주문 생성 (${r.orderId})` : r.error
    console.log(`  User ${r.index}: ${status} ${msg}`)
  })

  if (successCount === 2 && failCount === 8) {
    console.log('\n🎉 Lock이 정상 작동합니다! (재고 2개 → 2명 성공)')
  } else if (successCount === 1 && failCount === 9) {
    console.log('\n🎉 Lock이 정상 작동합니다! (재고 1개 → 1명 성공)')
  } else {
    console.log('\n⚠️ 예상과 다른 결과입니다.')
  }
}

testConcurrency()
