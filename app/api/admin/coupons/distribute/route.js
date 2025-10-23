/**
 * 쿠폰 배포 API (Clean Architecture Version)
 * - Dependency Injection: CouponRepository, UserRepository
 * - Clean Architecture: Presentation Layer (Routing + Auth Only)
 * - Business Logic: DistributeCouponUseCase
 *
 * @author Claude
 * @since 2025-10-23
 */
import { NextResponse } from 'next/server'
import { verifyAdminAuth } from '@/lib/supabaseAdmin'
import { DistributeCouponUseCase } from '@/lib/use-cases/coupon/DistributeCouponUseCase'
import CouponRepository from '@/lib/repositories/CouponRepository'
import UserRepository from '@/lib/repositories/UserRepository'

export async function POST(request) {
  try {
    const body = await request.json()
    const { couponId, userIds, adminEmail, distributeToAll } = body

    console.log('🎫 [쿠폰배포 API] 쿠폰 배포 시작:', {
      couponId,
      userCount: userIds?.length,
      distributeToAll,
      adminEmail,
    })

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
      console.warn(`⚠️ 권한 없는 쿠폰 배포 시도: ${adminEmail}`)
      return NextResponse.json(
        { error: '관리자 권한이 없습니다' },
        { status: 403 }
      )
    }
    console.log('✅ 관리자 권한 확인 완료:', adminEmail)

    // 2. 파라미터 검증 (Presentation Layer)
    if (!couponId) {
      return NextResponse.json(
        { error: 'couponId가 필요합니다' },
        { status: 400 }
      )
    }

    if (!distributeToAll && (!userIds || !Array.isArray(userIds) || userIds.length === 0)) {
      return NextResponse.json(
        { error: 'userIds 배열이 필요합니다 (또는 distributeToAll=true)' },
        { status: 400 }
      )
    }

    // 3. Dependency Injection
    const distributeCouponUseCase = new DistributeCouponUseCase(
      CouponRepository,
      UserRepository
    )

    // 4. Use Case 실행 (Application Layer)
    let result

    if (distributeToAll) {
      // 전체 고객에게 배포
      console.log('📢 전체 고객 배포 모드')
      result = await distributeCouponUseCase.distributeToAll(
        couponId,
        null // adminId (향후 개선: adminEmail → adminId 변환)
      )
    } else {
      // 특정 사용자들에게 배포
      console.log(`👥 개별 배포 모드 (${userIds.length}명)`)
      result = await distributeCouponUseCase.distributeToUsers(
        couponId,
        userIds,
        null // adminId (향후 개선: adminEmail → adminId 변환)
      )
    }

    console.log('✅ [쿠폰배포 API] 쿠폰 배포 완료:', {
      totalIssued: result.totalIssued,
      totalFailed: result.totalFailed,
      totalSkipped: result.totalSkipped,
    })

    // 5. 결과 반환 (Presentation Layer)
    return NextResponse.json({
      success: true,
      ...result,
      message: `쿠폰이 성공적으로 배포되었습니다 (${result.totalIssued}개 성공, ${result.totalSkipped}개 중복, ${result.totalFailed}개 실패)`,
    })
  } catch (error) {
    console.error('❌ [쿠폰배포 API] 에러:', error)
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}
