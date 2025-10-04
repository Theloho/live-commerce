/**
 * validate_coupon 함수 수정 API
 *
 * 문제: column reference "coupon_id" is ambiguous
 * 해결: user_coupons 테이블 prefix 추가
 *
 * 사용: GET /api/admin/migrate-coupon-fix
 */

import { createClient } from '@supabase/supabase-js'

export async function GET(request) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseServiceKey) {
      return Response.json({
        success: false,
        error: 'SUPABASE_SERVICE_ROLE_KEY 환경변수가 설정되지 않았습니다'
      }, { status: 500 })
    }

    // Service Role로 Supabase 클라이언트 생성
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    console.log('🔧 validate_coupon 함수 수정 시작...')

    // SQL 함수 재생성
    const sql = `
CREATE OR REPLACE FUNCTION validate_coupon(
    p_coupon_code VARCHAR(50),
    p_user_id UUID,
    p_product_amount DECIMAL(12, 2)
)
RETURNS TABLE (
    is_valid BOOLEAN,
    error_message TEXT,
    coupon_id UUID,
    discount_amount DECIMAL(12, 2)
) AS $$
DECLARE
    v_coupon RECORD;
    v_user_coupon RECORD;
    v_discount DECIMAL(12, 2);
BEGIN
    SELECT * INTO v_coupon
    FROM coupons
    WHERE code = p_coupon_code AND is_active = true;

    IF NOT FOUND THEN
        RETURN QUERY SELECT false, '존재하지 않거나 비활성화된 쿠폰입니다.'::TEXT, NULL::UUID, 0::DECIMAL(12, 2);
        RETURN;
    END IF;

    IF NOW() < v_coupon.valid_from THEN
        RETURN QUERY SELECT false, '아직 사용할 수 없는 쿠폰입니다.'::TEXT, NULL::UUID, 0::DECIMAL(12, 2);
        RETURN;
    END IF;

    IF NOW() > v_coupon.valid_until THEN
        RETURN QUERY SELECT false, '유효 기간이 만료된 쿠폰입니다.'::TEXT, NULL::UUID, 0::DECIMAL(12, 2);
        RETURN;
    END IF;

    IF p_product_amount < v_coupon.min_purchase_amount THEN
        RETURN QUERY SELECT
            false,
            FORMAT('최소 구매 금액 %s원 이상이어야 합니다.', v_coupon.min_purchase_amount::TEXT),
            NULL::UUID,
            0::DECIMAL(12, 2);
        RETURN;
    END IF;

    IF v_coupon.total_usage_limit IS NOT NULL AND v_coupon.total_used_count >= v_coupon.total_usage_limit THEN
        RETURN QUERY SELECT false, '쿠폰 사용 가능 횟수를 초과했습니다.'::TEXT, NULL::UUID, 0::DECIMAL(12, 2);
        RETURN;
    END IF;

    -- ✅ 수정: 테이블 prefix 추가하여 ambiguous 에러 해결
    SELECT * INTO v_user_coupon
    FROM user_coupons
    WHERE user_coupons.user_id = p_user_id AND user_coupons.coupon_id = v_coupon.id;

    IF NOT FOUND THEN
        RETURN QUERY SELECT false, '보유하지 않은 쿠폰입니다.'::TEXT, NULL::UUID, 0::DECIMAL(12, 2);
        RETURN;
    END IF;

    IF v_user_coupon.is_used = true THEN
        RETURN QUERY SELECT false, '이미 사용한 쿠폰입니다.'::TEXT, NULL::UUID, 0::DECIMAL(12, 2);
        RETURN;
    END IF;

    IF v_coupon.discount_type = 'fixed_amount' THEN
        v_discount := LEAST(v_coupon.discount_value, p_product_amount);
    ELSE
        v_discount := p_product_amount * (v_coupon.discount_value / 100);
        IF v_coupon.max_discount_amount IS NOT NULL THEN
            v_discount := LEAST(v_discount, v_coupon.max_discount_amount);
        END IF;
    END IF;

    RETURN QUERY SELECT true, NULL::TEXT, v_coupon.id, v_discount;
END;
$$ LANGUAGE plpgsql;
`

    // PostgreSQL에서 직접 실행 (Supabase에서는 rpc로 함수 생성 불가)
    // 대신 fetch API를 사용해서 직접 PostgreSQL에 연결
    const { error } = await supabase.rpc('exec', { sql })

    if (error) {
      // exec 함수가 없을 경우 대체 방법 시도
      console.error('❌ exec 실패:', error.message)

      return Response.json({
        success: false,
        error: 'SQL 실행 실패. Supabase Dashboard SQL Editor에서 직접 실행하세요.',
        sql_file: '/supabase/migrations/fix_validate_coupon.sql',
        details: error.message,
        instructions: [
          '1. https://supabase.com/dashboard 접속',
          '2. 프로젝트 선택',
          '3. SQL Editor 메뉴 클릭',
          '4. /supabase/migrations/fix_validate_coupon.sql 파일 내용 복사/붙여넣기',
          '5. Run 클릭'
        ]
      }, { status: 500 })
    }

    console.log('✅ validate_coupon 함수 수정 완료')

    return Response.json({
      success: true,
      message: 'validate_coupon 함수가 성공적으로 업데이트되었습니다',
      fixed: 'column reference "coupon_id" is ambiguous 에러 해결'
    })

  } catch (error) {
    console.error('❌ 마이그레이션 실패:', error)

    return Response.json({
      success: false,
      error: error.message,
      sql_file: '/supabase/migrations/fix_validate_coupon.sql',
      instructions: [
        '자동 실행 실패. 수동으로 실행하세요:',
        '',
        '방법 1: Supabase Dashboard',
        '  1. https://supabase.com/dashboard 접속',
        '  2. 프로젝트 선택',
        '  3. SQL Editor 메뉴 클릭',
        '  4. /supabase/migrations/fix_validate_coupon.sql 파일 내용 복사/붙여넣기',
        '  5. Run 클릭',
        '',
        '방법 2: psql',
        '  psql <DATABASE_URL> < /supabase/migrations/fix_validate_coupon.sql'
      ]
    }, { status: 500 })
  }
}
