/**
 * 쿠폰 사용 처리 API (Clean Architecture Version)
 * - Dependency Injection: CouponRepository
 * - Clean Architecture: Presentation Layer (Routing + Validation)
 * - Business Logic: ValidateCouponUseCase (validate + apply)
 *
 * @author Claude
 * @since 2025-10-23
 */
import { NextResponse } from 'next/server'
import { ValidateCouponUseCase } from '@/lib/use-cases/coupon/ValidateCouponUseCase'
import CouponRepository from '@/lib/repositories/CouponRepository'

export async function POST(request) {
  try {
    const { couponCode, userId, orderId, orderAmount } = await request.json()

    console.log('💳 [Coupon Apply API] Request received:', {
      couponCode,
      userId,
      orderId,
      orderAmount,
    })

    // 1. Basic parameter validation (Presentation Layer)
    if (!couponCode) {
      return NextResponse.json(
        { error: '쿠폰 코드가 필요합니다' },
        { status: 400 }
      )
    }

    if (!userId) {
      return NextResponse.json(
        { error: '사용자 ID가 필요합니다' },
        { status: 400 }
      )
    }

    if (!orderId) {
      return NextResponse.json(
        { error: '주문 ID가 필요합니다' },
        { status: 400 }
      )
    }

    if (typeof orderAmount !== 'number' || orderAmount < 0) {
      return NextResponse.json(
        { error: '주문 금액은 0 이상의 숫자여야 합니다' },
        { status: 400 }
      )
    }

    // 2. Dependency Injection
    const validateCouponUseCase = new ValidateCouponUseCase(CouponRepository)

    // 3. Execute Use Case (Application Layer) - validate + apply
    const result = await validateCouponUseCase.apply(
      couponCode,
      userId,
      orderId,
      orderAmount
    )

    console.log('✅ [Coupon Apply API] Success:', {
      couponCode,
      discount: result.discount,
      userCouponId: result.userCoupon?.id,
    })

    // 4. Return result (Presentation Layer)
    return NextResponse.json(result)
  } catch (error) {
    console.error('❌ [Coupon Apply API] Error:', error)
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}
