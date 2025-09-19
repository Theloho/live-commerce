import { createClient } from '@supabase/supabase-js'

// Supabase 설정
const supabaseUrl = 'https://sjmbqfcbnsnqlsmblmfu.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNqbWJxZmNibnNucWxzbWJsbWZ1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgwMTQ2NzgsImV4cCI6MjA3MzU5MDY3OH0.nsKn_m6dnHabkbRMk7xWkdxbzB0_0B1fO_0AhWli0GM'

const supabase = createClient(supabaseUrl, supabaseKey)

async function clearTestData() {
  console.log('🗑️  테스트 데이터 삭제 시작...')

  try {
    // 1. 모든 상품 삭제 (또는 비활성화)
    console.log('📦 상품 데이터 삭제 중...')
    const { error: productsError } = await supabase
      .from('products')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000') // 존재하지 않는 ID로 모든 상품 삭제

    if (productsError) {
      console.error('상품 삭제 오류:', productsError)
      // 삭제 실패 시 비활성화로 대체
      console.log('상품 비활성화 시도 중...')
      const { error: updateError } = await supabase
        .from('products')
        .update({ status: 'inactive' })
        .eq('status', 'active')

      if (updateError) {
        console.error('상품 비활성화 오류:', updateError)
      } else {
        console.log('✅ 모든 상품이 비활성화되었습니다')
      }
    } else {
      console.log('✅ 모든 상품이 삭제되었습니다')
    }

    // 2. 상품 옵션 삭제
    console.log('🎨 상품 옵션 삭제 중...')
    const { error: optionsError } = await supabase
      .from('product_options')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000')

    if (optionsError) {
      console.error('상품 옵션 삭제 오류:', optionsError)
    } else {
      console.log('✅ 모든 상품 옵션이 삭제되었습니다')
    }

    // 3. 테스트 주문 삭제 (있다면)
    console.log('📋 테스트 주문 삭제 중...')
    const { error: ordersError } = await supabase
      .from('orders')
      .delete()
      .eq('status', 'test') // 테스트 주문만 삭제

    if (!ordersError) {
      console.log('✅ 테스트 주문이 삭제되었습니다')
    }

    console.log('\n🎉 테스트 데이터 삭제 완료!')
    console.log('이제 관리자 페이지에서 실제 상품을 추가할 수 있습니다.')

  } catch (error) {
    console.error('❌ 오류 발생:', error)
  }

  process.exit(0)
}

clearTestData()