/**
 * 동시성 테스트 스크립트
 * 브라우저 콘솔에서 실행 (프로덕션 또는 로컬)
 *
 * 사용법:
 * 1. 재고 1개인 상품 찾기
 * 2. 브라우저 콘솔 열기 (F12)
 * 3. 이 코드 전체 복사 + 붙여넣기
 * 4. testConcurrency() 실행
 */

async function testConcurrency() {
  console.log('🧪 동시성 테스트 시작...')

  // ⚠️ 여기에 실제 상품 ID 입력 (재고 1개짜리)
  const productId = 'YOUR_PRODUCT_ID_HERE'
  const quantity = 1

  // 🔥 10명이 동시에 주문 시도 (Promise.all)
  const promises = []
  for (let i = 0; i < 10; i++) {
    promises.push(
      fetch('/api/orders/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderData: {
            items: [{
              product_id: productId,
              quantity: quantity,
              title: 'Test Product',
              price: 10000
            }]
          },
          userProfile: {
            name: `Test User ${i}`,
            phone: '01012345678',
            address: 'Test Address'
          }
        })
      }).then(res => ({
        userId: i,
        status: res.status,
        ok: res.ok,
        body: res.json()
      }))
    )
  }

  // 📊 결과 분석
  console.log('⏳ 10명 동시 요청 전송...')
  const results = await Promise.all(promises)

  const successCount = results.filter(r => r.ok).length
  const failCount = results.filter(r => !r.ok).length

  console.log('\n✅ 테스트 결과:')
  console.log(`성공: ${successCount}명`)
  console.log(`실패: ${failCount}명`)
  console.log('\n상세:')

  for (const result of results) {
    const body = await result.body
    console.log(`User ${result.userId}: ${result.ok ? '✅' : '❌'} (${result.status})`, body.error || 'Success')
  }

  // 기대 결과: 성공 1명, 실패 9명
  if (successCount === 1 && failCount === 9) {
    console.log('\n🎉 테스트 성공! Lock이 정상 작동합니다!')
  } else {
    console.warn('\n⚠️ 예상과 다른 결과입니다.')
  }
}

// 실행: testConcurrency()
console.log('💡 준비 완료! 콘솔에서 testConcurrency()를 실행하세요')
