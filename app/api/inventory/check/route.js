/**
 * 재고 확인 API (Clean Architecture Version)
 * - Dependency Injection: ProductRepository
 * - Clean Architecture: Presentation Layer (Routing + Validation)
 * - Business Logic: CheckInventoryUseCase
 *
 * @author Claude
 * @since 2025-10-23
 */
import { NextResponse } from 'next/server'
import { CheckInventoryUseCase } from '@/lib/use-cases/product/CheckInventoryUseCase'
import ProductRepository from '@/lib/repositories/ProductRepository'

export async function POST(request) {
  try {
    const { productId, selectedOptions } = await request.json()

    console.log('🔍 [Inventory Check API] Request received:', { productId, selectedOptions })

    // 1. Basic parameter validation (Presentation Layer)
    if (!productId) {
      return NextResponse.json(
        { error: 'productId가 필요합니다' },
        { status: 400 }
      )
    }

    if (!selectedOptions || typeof selectedOptions !== 'object') {
      return NextResponse.json(
        { error: 'selectedOptions는 객체여야 합니다' },
        { status: 400 }
      )
    }

    // 2. Dependency Injection
    const checkInventoryUseCase = new CheckInventoryUseCase(ProductRepository)

    // 3. Execute Use Case (Application Layer)
    const result = await checkInventoryUseCase.execute({ productId, selectedOptions })

    console.log('✅ [Inventory Check API] Success:', {
      available: result.available,
      inventory: result.inventory,
    })

    // 4. Return result (Presentation Layer)
    return NextResponse.json(result)
  } catch (error) {
    console.error('❌ [Inventory Check API] Error:', error)
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}
