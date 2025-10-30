/**
 * 간단한 Lock 테스트
 * Node.js에서 실행
 *
 * 실행: node test-lock-simple.js
 */

require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

const productId = '8794e427-5351-493e-8a42-601a45bdd557'

async function testLock() {
  console.log('🧪 Lock 테스트 시작...\n')

  // 2명이 동시에 구매 시도
  const user1 = supabase.rpc('update_inventory_with_lock', {
    p_product_id: productId,
    p_quantity_change: -1
  })

  const user2 = supabase.rpc('update_inventory_with_lock', {
    p_product_id: productId,
    p_quantity_change: -1
  })

  const [result1, result2] = await Promise.all([user1, user2])

  console.log('👤 User 1:', result1.error ? `❌ ${result1.error.message}` : `✅ 성공`)
  console.log('👤 User 2:', result2.error ? `❌ ${result2.error.message}` : `✅ 성공`)

  const successCount = [result1, result2].filter(r => !r.error).length

  console.log('\n📊 결과:')
  console.log(`성공: ${successCount}명`)
  console.log(`실패: ${2 - successCount}명`)

  if (successCount === 1) {
    console.log('\n🎉 Lock이 정상 작동합니다!')
  } else {
    console.log('\n⚠️ Lock이 작동하지 않습니다!')
  }
}

testLock()
