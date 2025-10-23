/**
 * 쿠폰 생성 API (Clean Architecture Version)
 * - Dependency Injection: CouponRepository
 * - Clean Architecture: Presentation Layer (Routing + Validation)
 * - Business Logic: CreateCouponUseCase
 *
 * @author Claude
 * @since 2025-10-23
 */
import { NextResponse } from 'next/server'
import { CreateCouponUseCase } from '@/lib/use-cases/coupon/CreateCouponUseCase'
import CouponRepository from '@/lib/repositories/CouponRepository'

export async function POST(request) {
  try {
    const couponData = await request.json()

    console.log('🎫 [Coupon Create API] Request received:', couponData.code)

    // 1. Basic parameter validation (Presentation Layer)
    if (!couponData.code || !couponData.name || !couponData.discount_type) {
      return NextResponse.json(
        { error: 'Required fields: code, name, discount_type' },
        { status: 400 }
      )
    }

    // 2. Dependency Injection
    const createCouponUseCase = new CreateCouponUseCase(CouponRepository)

    // 3. Execute Use Case (Application Layer)
    const result = await createCouponUseCase.execute(couponData)

    console.log('✅ [Coupon Create API] Success:', result.coupon.code)

    // 4. Return result (Presentation Layer)
    return NextResponse.json(result)
  } catch (error) {
    console.error('❌ [Coupon Create API] Error:', error)
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}
