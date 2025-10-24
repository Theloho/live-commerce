/**
 * 상품 생성 API (Clean Architecture Version)
 * - Dependency Injection: ProductRepository
 * - Clean Architecture: Presentation Layer (Routing + Auth Only)
 * - Business Logic: CreateProductUseCase
 *
 * @author Claude
 * @since 2025-10-23
 */
import { NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { verifyAdminAuth } from '@/lib/supabaseAdmin'
import { CreateProductUseCase } from '@/lib/use-cases/product/CreateProductUseCase'
import ProductRepository from '@/lib/repositories/ProductRepository'

export async function POST(request) {
  try {
    const params = await request.json()
    const { adminEmail } = params

    const registrationType = params.is_live !== false ? '빠른등록' : '상세등록'
    console.log(`🚀 [${registrationType} API] 상품 저장 시작:`, params.product_number)

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
      console.warn(`⚠️ 권한 없는 상품 생성 시도: ${adminEmail}`)
      return NextResponse.json(
        { error: '관리자 권한이 없습니다' },
        { status: 403 }
      )
    }
    console.log('✅ 관리자 권한 확인 완료:', adminEmail)

    // 2. Dependency Injection
    const createProductUseCase = new CreateProductUseCase(ProductRepository)

    // 3. Use Case 실행 (Application Layer)
    const result = await createProductUseCase.execute(params)

    console.log(`✅ [${registrationType} API] 상품 저장 완료:`, result.product.id)

    // 4. 홈페이지 캐시 즉시 무효화 (사용자가 바로 상품 확인 가능)
    revalidatePath('/')
    console.log('🔄 홈페이지 캐시 무효화 완료')

    return NextResponse.json(result)
  } catch (error) {
    console.error('❌ [상품등록 API] 에러:', error)
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}
