/**
 * 상품 수정 API (Clean Architecture Version)
 * - Dependency Injection: ProductRepository
 * - Clean Architecture: Presentation Layer (Routing + Auth Only)
 * - Business Logic: UpdateProductUseCase
 *
 * @author Claude
 * @since 2025-10-23
 */
import { NextResponse } from 'next/server'
import { verifyAdminAuth } from '@/lib/supabaseAdmin'
import { UpdateProductUseCase } from '@/lib/use-cases/product/UpdateProductUseCase'
import ProductRepository from '@/lib/repositories/ProductRepository'

export async function POST(request) {
  try {
    const params = await request.json()
    const { productId, adminEmail } = params

    console.log('🔄 [상품수정 API] 상품 수정 시작:', productId)

    // 🔐 1. 관리자 권한 확인 (Presentation Layer)
    if (!adminEmail) {
      console.error('❌ adminEmail 누락')
      return NextResponse.json(
        { error: '관리자 인증 정보가 필요합니다' },
        { status: 401 }
      )
    }

    const isAdmin = await verifyAdminAuth(adminEmail)
    if (!isAdmin) {
      console.warn(`⚠️ 권한 없는 상품 수정 시도: ${adminEmail}`)
      return NextResponse.json(
        { error: '관리자 권한이 없습니다' },
        { status: 403 }
      )
    }
    console.log('✅ 관리자 권한 확인 완료:', adminEmail)

    // 2. productId 검증
    if (!productId) {
      return NextResponse.json(
        { error: '상품 ID가 필요합니다' },
        { status: 400 }
      )
    }

    // 3. Dependency Injection
    const updateProductUseCase = new UpdateProductUseCase(ProductRepository)

    // 4. Use Case 실행 (Application Layer)
    const result = await updateProductUseCase.execute(productId, params)

    console.log('✅ [상품수정 API] 상품 수정 완료:', productId)

    return NextResponse.json(result)
  } catch (error) {
    console.error('❌ [상품수정 API] 에러:', error)
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}
