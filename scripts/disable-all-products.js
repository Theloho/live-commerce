import { createClient } from '@supabase/supabase-js'

// Supabase 설정
const supabaseUrl = 'https://sjmbqfcbnsnqlsmblmfu.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNqbWJxZmNibnNucWxzbWJsbWZ1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgwMTQ2NzgsImV4cCI6MjA3MzU5MDY3OH0.nsKn_m6dnHabkbRMk7xWkdxbzB0_0B1fO_0AhWli0GM'

const supabase = createClient(supabaseUrl, supabaseKey)

async function disableAllProducts() {
  console.log('🔒 모든 상품 비활성화 시작...')

  try {
    // 모든 상품을 inactive로 변경
    const { data, error } = await supabase
      .from('products')
      .update({ status: 'inactive' })
      .eq('status', 'active')
      .select('id, title')

    if (error) {
      console.error('상품 비활성화 오류:', error)
      return
    }

    console.log(`✅ ${data?.length || 0}개의 상품이 비활성화되었습니다`)
    if (data) {
      data.forEach(p => console.log(`  - ${p.title}`))
    }

    // 확인
    const { data: activeProducts } = await supabase
      .from('products')
      .select('id')
      .eq('status', 'active')

    console.log(`\n📊 현재 활성 상품: ${activeProducts?.length || 0}개`)

    if (!activeProducts || activeProducts.length === 0) {
      console.log('🎉 모든 상품이 비활성화되었습니다!')
      console.log('홈페이지에서 상품이 보이지 않을 것입니다.')
    }

  } catch (error) {
    console.error('❌ 오류 발생:', error)
  }

  process.exit(0)
}

disableAllProducts()