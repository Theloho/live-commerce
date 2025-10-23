import HomeClient from './components/HomeClient'
import { GetProductsUseCase } from '@/lib/use-cases/product/GetProductsUseCase'
import ProductRepository from '@/lib/repositories/ProductRepository'

// ⚡ ISR 설정: 5분마다 자동 재생성 (빌드 시 pre-render + 백그라운드 재생성)
export const revalidate = 300 // 300초 = 5분

// ⚡ Clean Architecture: ISR로 직접 UseCase 호출 (CSR → ISR 전환)
async function getProducts() {
  try {
    console.log('🏠 서버: 상품 데이터 로드 중... (ISR)')

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

// ⚡ ISR: 빌드 시 pre-render + 5분마다 자동 재생성 (최고 성능!)
export default async function Home() {
  // ISR: 빌드 시 + 5분마다 자동 재생성
  const products = await getProducts()

  return <HomeClient initialProducts={products} />
}
