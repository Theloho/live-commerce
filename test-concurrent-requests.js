/**
 * 진짜 동시성 테스트 - Promise.all로 완전 동시 실행
 */

const productId = '8794e427-5351-493e-8a42-601a45bdd557'

async function directInventoryUpdate(index, delay = 0) {
  // 약간의 딜레이로 타이밍 조절
  if (delay > 0) await new Promise(r => setTimeout(r, delay))
  
  try {
    const response = await fetch('http://localhost:3000/api/admin/products/test-lock', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        productId: productId,
        quantityChange: -1
      })
    })
    
    const data = await response.json()
    return {
      index,
      success: response.ok,
      data,
      error: data.error
    }
  } catch (error) {
    return {
      index,
      success: false,
      error: error.message
    }
  }
}

async function test() {
  console.log('🧪 동시성 테스트: 10명이 완전히 동시에 재고 차감\n')
  
  // Promise.all로 완전 동시 실행
  const results = await Promise.all([
    directInventoryUpdate(0),
    directInventoryUpdate(1),
    directInventoryUpdate(2),
    directInventoryUpdate(3),
    directInventoryUpdate(4),
    directInventoryUpdate(5),
    directInventoryUpdate(6),
    directInventoryUpdate(7),
    directInventoryUpdate(8),
    directInventoryUpdate(9)
  ])
  
  const success = results.filter(r => r.success)
  const failed = results.filter(r => !r.success)
  
  console.log('📊 결과:')
  console.log(`✅ 성공: ${success.length}명`)
  console.log(`❌ 실패: ${failed.length}명\n`)
  
  console.log('상세:')
  results.forEach(r => {
    const icon = r.success ? '✅' : '❌'
    const msg = r.error || 'Success'
    console.log(`  User ${r.index}: ${icon} ${msg}`)
  })
  
  // 예상: 재고 2개면 2명 성공, 8명 실패
  if (success.length <= 2 && failed.length >= 8) {
    console.log('\n🎉 Lock이 정상 작동합니다!')
  } else {
    console.log(`\n⚠️ 예상: 2명 성공, 실제: ${success.length}명 성공`)
  }
}

test()
