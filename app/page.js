import { supabase } from '@/lib/supabase'
import HomeClient from './components/HomeClient'

// ⚡ ISR 설정: 30초마다 재생성 (성능과 업데이트 속도 균형)
export const revalidate = 30 // 30초

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
        created_at
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

    // 간단한 데이터 변환 (variants는 BuyBottomSheet에서 동적 로드)
    const productsFormatted = data.map(product => ({
      ...product,
      stock_quantity: product.inventory,
      isLive: product.is_live_active || false
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
