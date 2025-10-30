/**
 * 라이브 활성 상품 조회 API
 *
 * 목적: 15초 Polling용 경량 API
 * 조건: is_live=true AND is_live_active=true
 * 응답 크기: ~50KB (상품 20개 기준)
 */

import { NextResponse } from 'next/server'
import { GetProductsUseCase } from '@/lib/use-cases/product/GetProductsUseCase'
import ProductRepository from '@/lib/repositories/ProductRepository'

export async function GET() {
  try {
    // Clean Architecture: Use Case 호출
    const getProductsUseCase = new GetProductsUseCase(ProductRepository)

    const result = await getProductsUseCase.execute({
      status: 'active',
      isLive: true,
      isLiveActive: true,
      page: 1,
      pageSize: 50
    })

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to fetch products' },
        { status: 500 }
      )
    }

    // 클라이언트 호환 형식으로 변환
    const products = result.products.map(product => ({
      ...product,
      stock_quantity: product.inventory,
      isLive: product.is_live_active || false
    }))

    return NextResponse.json({
      success: true,
      products
    })
  } catch (error) {
    console.error('❌ [API /products/live] 오류:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
