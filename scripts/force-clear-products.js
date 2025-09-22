import { createClient } from '@supabase/supabase-js'

// Supabase 설정
const supabaseUrl = 'https://sjmbqfcbnsnqlsmblmfu.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNqbWJxZmNibnNucWxzbWJsbWZ1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgwMTQ2NzgsImV4cCI6MjA3MzU5MDY3OH0.nsKn_m6dnHabkbRMk7xWkdxbzB0_0B1fO_0AhWli0GM'

const supabase = createClient(supabaseUrl, supabaseKey)

async function forceClearProducts() {
  console.log('🗑️  강제 상품 삭제 시작...')

  try {
    // 1. 모든 상품 조회 (상태 무관)
    console.log('📦 모든 상품 조회 중...')
    const { data: allProducts, error: fetchError } = await supabase
      .from('products')
      .select('id, title, status')

    if (fetchError) {
      console.error('상품 조회 오류:', fetchError)
      return
    }

    console.log(`총 ${allProducts.length}개의 상품이 있습니다:`)
    allProducts.forEach(p => console.log(`  - ${p.title} (${p.status}) [${p.id}]`))

    // 2. 상품 옵션부터 삭제 (외래키 제약)
    console.log('\n🎨 상품 옵션 삭제 중...')
    const { error: optionsError } = await supabase
      .from('product_options')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000')

    if (optionsError) {
      console.error('상품 옵션 삭제 오류:', optionsError)
    } else {
      console.log('✅ 모든 상품 옵션이 삭제되었습니다')
    }

    // 3. 모든 상품을 하나씩 삭제
    console.log('\n📦 상품 강제 삭제 중...')
    let deletedCount = 0

    for (const product of allProducts) {
      // SQL로 직접 삭제 시도
      const { error: deleteError } = await supabase.rpc('delete_product_force', {
        product_id: product.id
      })

      if (deleteError) {
        // RPC 실패 시 일반 DELETE 시도
        const { error: normalDeleteError } = await supabase
          .from('products')
          .delete()
          .eq('id', product.id)

        if (normalDeleteError) {
          console.log(`  ❌ ${product.title} 삭제 실패`)
          // 최후의 수단: status를 deleted로 변경
          const { error: updateError } = await supabase
            .from('products')
            .update({ status: 'deleted' })
            .eq('id', product.id)

          if (!updateError) {
            console.log(`  ⚠️ ${product.title} 상태를 'deleted'로 변경`)
          }
        } else {
          console.log(`  ✅ ${product.title} 삭제됨`)
          deletedCount++
        }
      } else {
        console.log(`  ✅ ${product.title} 강제 삭제됨`)
        deletedCount++
      }
    }

    // 4. 최종 확인
    const { data: remainingProducts } = await supabase
      .from('products')
      .select('id, title, status')

    console.log(`\n📊 결과:`)
    console.log(`  - 삭제된 상품: ${deletedCount}개`)
    console.log(`  - 남은 상품: ${remainingProducts?.length || 0}개`)

    if (remainingProducts && remainingProducts.length > 0) {
      console.log('\n⚠️ 남은 상품들:')
      remainingProducts.forEach(p => console.log(`  - ${p.title} (${p.status})`))
    } else {
      console.log('\n🎉 모든 상품이 제거되었습니다!')
    }

  } catch (error) {
    console.error('❌ 오류 발생:', error)
  }

  process.exit(0)
}

forceClearProducts()