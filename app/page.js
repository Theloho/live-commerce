import HomeClient from './components/HomeClient'
import { GetProductsUseCase } from '@/lib/use-cases/product/GetProductsUseCase'
import ProductRepository from '@/lib/repositories/ProductRepository'

// ⚡ Dynamic Rendering: 매 요청마다 최신 데이터 조회 (ISR 캐시 문제 해결)
export const revalidate = 0 // 0 = Dynamic Rendering (항상 최신 데이터)

// ⚡ Clean Architecture: Dynamic Rendering으로 직접 UseCase 호출
async function getProducts() {
  try {
    console.log('🏠 서버: 상품 데이터 로드 중... (Dynamic Rendering)')

    // Server-side: Use Case로 직접 데이터 조회
    const getProductsUseCase = new GetProductsUseCase(ProductRepository)
    const result = await getProductsUseCase.execute({
      status: 'active',
      isLive: true,
      page: 1,
      pageSize: 50,
    })

    if (!result.success || !result.products || result.products.length === 0) {
      console.log('📦 서버: 상품 데이터 없음')
      return []
    }

    console.log('✅ 서버: 상품 로딩 완료:', result.products.length, '개')

    const productsFormatted = result.products.map(product => ({
      ...product,
      stock_quantity: product.inventory,
      isLive: product.is_live_active || false
    }))

    return productsFormatted
  } catch (error) {
    console.error('❌ 서버: 상품 데이터 로드 오류:', error)
    return []
  }
}

// ⚡ Dynamic Rendering: 매 요청마다 최신 데이터 조회 (product_number 항상 최신!)
export default async function Home() {
  // Dynamic Rendering: 매 요청마다 DB에서 최신 데이터 조회
  const products = await getProducts()

  return <HomeClient initialProducts={products} />
}
