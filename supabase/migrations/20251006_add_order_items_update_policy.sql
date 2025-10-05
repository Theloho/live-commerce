-- ==========================================
-- 🔧 order_items UPDATE 정책 추가
-- 생성일: 2025-10-06
-- 목적: 주문 수량 조정 기능 활성화
-- ==========================================

-- 기존 UPDATE 정책 삭제 (있다면)
DROP POLICY IF EXISTS "Users can update their order items" ON order_items;

-- UPDATE 정책 추가 (주문 수량 조정용)
CREATE POLICY "Users can update their order items"
ON order_items
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM orders
    WHERE orders.id = order_items.order_id
    AND (
      -- 관리자는 모든 주문 수정 가능
      (SELECT is_admin FROM profiles WHERE id = auth.uid()) = true
      OR
      -- Supabase Auth 사용자
      orders.user_id = auth.uid()
      OR
      -- 카카오 사용자
      orders.order_type LIKE '%KAKAO:' || (SELECT kakao_id FROM profiles WHERE id = auth.uid())::text || '%'
    )
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM orders
    WHERE orders.id = order_items.order_id
    AND (
      (SELECT is_admin FROM profiles WHERE id = auth.uid()) = true
      OR
      orders.user_id = auth.uid()
      OR
      orders.order_type LIKE '%KAKAO:' || (SELECT kakao_id FROM profiles WHERE id = auth.uid())::text || '%'
    )
  )
);

-- 검증 쿼리
SELECT
  tablename,
  policyname,
  cmd
FROM pg_policies
WHERE tablename = 'order_items'
ORDER BY cmd, policyname;
