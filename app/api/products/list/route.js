/**
 * 상품 목록 조회 API (Clean Architecture Version)
 * - Dependency Injection: ProductRepository
 * - Clean Architecture: Presentation Layer (Routing + Validation)
 * - Business Logic: GetProductsUseCase
 *
 * @author Claude
 * @since 2025-10-23
 */
import { NextResponse } from 'next/server'
import { GetProductsUseCase } from '@/lib/use-cases/product/GetProductsUseCase'
import ProductRepository from '@/lib/repositories/ProductRepository'

export async function GET(request) {
  try {
    // 1. Query parameters 추출 (Presentation Layer)
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') || 'active'
    const isLive = searchParams.get('isLive') !== 'false' // 기본값 true
    const page = parseInt(searchParams.get('page') || '1', 10)
    const pageSize = parseInt(searchParams.get('pageSize') || '50', 10)

    console.log('🔍 [Products List API] Request received:', {
      status,
      isLive,
      page,
      pageSize,
    })

    // 2. Basic parameter validation (Presentation Layer)
    if (page < 1) {
      return NextResponse.json(
        { error: '페이지 번호는 1 이상이어야 합니다' },
        { status: 400 }
      )
    }

    if (pageSize < 1 || pageSize > 100) {
      return NextResponse.json(
        { error: '페이지 크기는 1~100 사이여야 합니다' },
        { status: 400 }
      )
    }

    // 3. Dependency Injection
    const getProductsUseCase = new GetProductsUseCase(ProductRepository)

    // 4. Execute Use Case (Application Layer)
    const result = await getProductsUseCase.execute({
      status,
      isLive,
      page,
      pageSize,
    })

    console.log('✅ [Products List API] Success:', {
      count: result.products.length,
      totalCount: result.totalCount,
    })

    // 5. Return result (Presentation Layer)
    return NextResponse.json(result)
  } catch (error) {
    console.error('❌ [Products List API] Error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
