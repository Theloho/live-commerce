import { supabase } from '@/lib/supabase'
import HomeClient from './components/HomeClient'

// ⚡ ISR 설정: 5분마다 재생성
export const revalidate = 300 // 5분

// ⚡ 서버에서 상품 데이터 fetch (빌드 시 pre-render)
async function getProducts() {
  try {
    console.log('🏠 서버: 상품 데이터 로드 중...')

    const { data, error } = await supabase
      .from('products')
      .select(`
        id,
        title,
        product_number,
        price,
        compare_price,
        thumbnail_url,
        inventory,
        status,
        is_featured,
        is_live_active,
        created_at,
        product_variants (
          id,
          sku,
          inventory,
          price_adjustment,
          is_active,
          variant_option_values (
            option_value_id,
            product_option_values (
              id,
              value,
              option_id,
              product_options (
                id,
                name
              )
            )
          )
        )
      `)
      .eq('status', 'active')
      .eq('is_live_active', true)  // ✅ 추가: 노출 중인 상품만 표시
      .order('created_at', { ascending: false })
      .limit(50)

    if (error) {
      console.error('서버: 상품 조회 오류:', error)
      return []
    }

    if (!data || data.length === 0) {
      console.log('📦 서버: 상품 데이터 없음')
      return []
    }

    console.log('✅ 서버: 상품 로딩 완료:', data.length, '개')

    // 간단한 데이터 변환 + Variant 옵션 매핑
    const productsFormatted = data.map(product => ({
      ...product,
      stock_quantity: product.inventory,
      isLive: product.is_live_active || false,
      hasOptions: product.product_variants && product.product_variants.length > 0,
      optionCount: product.product_variants ? product.product_variants.length : 0,
      // BuyBottomSheet가 필요로 하는 옵션 정보 포함
      variants: product.product_variants?.map(variant => ({
        ...variant,
        options: variant.variant_option_values?.map(vov => ({
          optionName: vov.product_option_values?.product_options?.name || '',
          optionValue: vov.product_option_values?.value || '',
          optionId: vov.product_option_values?.product_options?.id || '',
          valueId: vov.product_option_values?.id || ''
        })) || []
      })) || []
    }))

    return productsFormatted
  } catch (error) {
    console.error('서버: 상품 데이터 로드 오류:', error)
    return []
  }
}

// ⚡ Server Component (기본값)
export default async function Home() {
  // 서버에서 상품 데이터 fetch
  const products = await getProducts()

  // Client Component에 데이터 전달
  return <HomeClient initialProducts={products} />
}
