/**
 * 상품 Variant 조회 API (Clean Architecture Version)
 * - Dependency Injection: ProductRepository
 * - Clean Architecture: Presentation Layer (Routing + Validation)
 * - Business Logic: GetProductVariantsUseCase
 *
 * @author Claude
 * @since 2025-10-23
 */
import { NextResponse } from 'next/server'
import { GetProductVariantsUseCase } from '@/lib/use-cases/product/GetProductVariantsUseCase'
import ProductRepository from '@/lib/repositories/ProductRepository'

export async function POST(request) {
  try {
    const { productId } = await request.json()

    console.log('🔍 [Variants API] Request received:', productId)

    // 1. Basic parameter validation (Presentation Layer)
    if (!productId) {
      return NextResponse.json(
        { error: 'productId가 필요합니다' },
        { status: 400 }
      )
    }

    // 2. Dependency Injection
    const getProductVariantsUseCase = new GetProductVariantsUseCase(ProductRepository)

    // 3. Execute Use Case (Application Layer)
    const result = await getProductVariantsUseCase.execute({ productId })

    console.log('✅ [Variants API] Success:', result.variants.length, '개')

    // 4. Return result (Presentation Layer)
    return NextResponse.json(result)
  } catch (error) {
    console.error('❌ [Variants API] Error:', error)
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}
