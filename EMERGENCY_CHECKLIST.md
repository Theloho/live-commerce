# 🚨 런칭 응급상황 대비 체크리스트

**작성일**: 2025-10-17
**런칭 시간**: 4시간 후
**최종 점검자**: Claude Code

---

## 📋 런칭 전 최종 체크리스트

### ✅ 완료된 작업 (2025-10-17 오전)

- ✅ **구글 애널리틱스 연결**: GA4 측정 ID 설정 완료 (`G-H8TT6EQCTH`)
- ✅ **프로덕션 콘솔 로그 제거**: GoogleAnalytics, CookieConsent, analytics.js
- ✅ **빌드 테스트 성공**: 모든 에러 해결 완료
- ✅ **개인정보 처리방침 페이지 수정**: Next.js Link 사용으로 변경

---

### ⚠️ 즉시 확인 필요

#### 1. Vercel 환경변수 설정 (필수!)

**Vercel Dashboard → Settings → Environment Variables**에서 추가:

```
NEXT_PUBLIC_GA_MEASUREMENT_ID=G-H8TT6EQCTH
```

**설정 후**: 재배포 필요 (git push 시 자동)

---

#### 2. 배포 전 로컬 테스트 (권장)

```bash
# 개발 서버 실행
npm run dev

# 확인 사항:
- [ ] 홈페이지 로딩 정상
- [ ] 상품 클릭 정상
- [ ] 체크아웃 흐름 정상
- [ ] 주문 생성 테스트
- [ ] 관리자 로그인 정상
```

---

## 🔥 런칭 직후 발생 가능한 응급상황

### 1️⃣ 페이지가 안 열려요! (500 에러)

**즉시 확인**:
```bash
# Vercel 로그 확인 (브라우저)
https://vercel.com/dashboard → Deployments → Logs

# 주요 확인 항목:
- Supabase 연결 상태
- 환경변수 설정 확인 (NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY)
- RLS 정책 오류
```

**임시 조치**:
- 이전 배포 버전으로 롤백 (Vercel Dashboard → Deployments → 이전 버전 Promote)

---

### 2️⃣ 주문이 생성되지 않아요!

**즉시 확인**:
```sql
-- Supabase Dashboard → SQL Editor
SELECT * FROM orders ORDER BY created_at DESC LIMIT 10;
SELECT * FROM order_items ORDER BY created_at DESC LIMIT 10;
```

**가능한 원인**:
- RLS 정책 문제 (최근 수정: 2025-10-05)
- Variant 재고 부족
- 결제 정보 누락

**임시 조치**:
```sql
-- RLS 정책 긴급 비활성화 (주의: 보안 위험!)
ALTER TABLE orders DISABLE ROW LEVEL SECURITY;
-- 문제 해결 후 즉시 재활성화:
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
```

---

### 3️⃣ 관리자가 로그인이 안 돼요!

**즉시 확인**:
```sql
-- Supabase Dashboard → SQL Editor
SELECT email, is_admin FROM profiles WHERE email = 'master@allok.world';
```

**임시 조치**:
```sql
-- 관리자 권한 즉시 부여
UPDATE profiles
SET is_admin = true
WHERE email = 'master@allok.world';
```

---

### 4️⃣ 구글 애널리틱스가 작동하지 않아요!

**즉시 확인**:
1. 브라우저 개발자 도구 → Network 탭
2. `gtag/js?id=G-H8TT6EQCTH` 요청 확인
3. Console 에러 확인

**가능한 원인**:
- Vercel 환경변수 미설정
- 쿠키 동의 거부

**임시 조치**:
- localStorage 초기화 후 쿠키 재동의 요청

---

### 5️⃣ 카카오 로그인이 안 돼요!

**즉시 확인**:
```sql
-- Supabase Dashboard → SQL Editor
SELECT * FROM profiles WHERE kakao_id IS NOT NULL ORDER BY created_at DESC LIMIT 10;
```

**가능한 원인**:
- 카카오 리다이렉트 URI 불일치
- 환경변수 (`NEXT_PUBLIC_KAKAO_CLIENT_ID`) 누락

**임시 조치**:
- 카카오 Developers → 내 애플리케이션 → 플랫폼 → Web → Redirect URI 확인
- `https://allok.shop/auth/callback` 등록 확인

---

### 6️⃣ 재고가 마이너스로 표시돼요!

**즉시 확인**:
```sql
-- Supabase Dashboard → SQL Editor
SELECT
  p.title,
  p.inventory AS product_inventory,
  pv.sku,
  pv.inventory AS variant_inventory
FROM products p
LEFT JOIN product_variants pv ON pv.product_id = p.id
WHERE p.inventory < 0 OR pv.inventory < 0
ORDER BY p.created_at DESC;
```

**임시 조치**:
```sql
-- 재고 긴급 수동 조정
UPDATE product_variants
SET inventory = 0
WHERE inventory < 0;

UPDATE products
SET inventory = 0
WHERE inventory < 0;
```

---

### 7️⃣ 쿠폰이 적용되지 않아요!

**즉시 확인**:
```sql
-- Supabase Dashboard → SQL Editor
SELECT * FROM coupons WHERE is_active = true ORDER BY created_at DESC;
SELECT * FROM user_coupons WHERE user_id = 'USER_ID' AND is_used = false;
```

**가능한 원인**:
- 쿠폰 유효기간 만료
- 최소 구매 금액 미달
- 이미 사용한 쿠폰

**임시 조치**:
```sql
-- 쿠폰 유효기간 긴급 연장
UPDATE coupons
SET valid_until = NOW() + INTERVAL '7 days'
WHERE code = '쿠폰코드';
```

---

### 8️⃣ 결제 금액이 이상해요! (배송비/쿠폰 계산 오류)

**즉시 확인**:
- `/lib/orderCalculations.js` 함수 호출 여부
- `formatShippingInfo()` 사용 여부 (도서산간 배송비)

**디버깅 방법**:
```javascript
// 브라우저 Console에서 실행
console.log('상품 금액:', productAmount);
console.log('쿠폰 할인:', discountAmount);
console.log('배송비:', shippingFee);
console.log('최종 금액:', finalAmount);
```

**임시 조치**:
- 관리자 페이지에서 주문 금액 수동 수정
- 고객에게 환불 후 재주문 요청

---

## 📞 긴급 연락처

### 시스템 관리
- **Supabase 대시보드**: https://app.supabase.com
- **Vercel 대시보드**: https://vercel.com/dashboard
- **Google Analytics 대시보드**: https://analytics.google.com

### 계정 정보
- **관리자 이메일**: master@allok.world
- **관리자 비밀번호**: yi01buddy!!
- **Supabase Project**: xoinislnaxllijlnjeue

### 백업 및 복구
```bash
# 긴급 DB 백업 (Supabase Dashboard → Database → Backups)
# 자동 백업: 매일 새벽 2시
# 복구 방법: Supabase Dashboard → Database → Backups → Restore
```

---

## 🔄 롤백 절차 (긴급 상황)

### Vercel 배포 롤백
1. Vercel Dashboard 접속
2. Deployments 탭
3. 이전 정상 배포 선택
4. "Promote to Production" 클릭
5. 1-2분 대기 (자동 배포)

### DB 롤백 (최후의 수단)
1. Supabase Dashboard → Database → Backups
2. 최근 백업 선택 (런칭 직전)
3. "Restore" 클릭
4. ⚠️ **주의**: 모든 신규 데이터 손실

---

## 📊 모니터링 포인트 (런칭 후 24시간)

### 시간대별 체크리스트

**런칭 직후 (0-1시간)**:
- [ ] 홈페이지 정상 로딩 확인
- [ ] 신규 회원가입 1건 테스트
- [ ] 주문 생성 1건 테스트
- [ ] GA 데이터 수집 확인 (실시간 보고서)
- [ ] Vercel 로그 확인 (에러 0건)

**런칭 후 3시간**:
- [ ] 총 방문자 수 확인
- [ ] 총 주문 건수 확인
- [ ] 에러 발생 여부 확인
- [ ] 쿠폰 사용 현황 확인

**런칭 후 12시간**:
- [ ] 서버 안정성 확인
- [ ] DB 성능 확인 (쿼리 속도)
- [ ] 재고 현황 확인
- [ ] 고객 문의 확인

**런칭 후 24시간**:
- [ ] 전체 시스템 안정화 확인
- [ ] 매출 현황 분석
- [ ] 사용자 피드백 수집
- [ ] 개선 사항 도출

---

## 🛠️ 긴급 수정 방법

### 코드 긴급 수정 (Hot Fix)
```bash
# 1. 긴급 수정 브랜치 생성
git checkout -b hotfix/긴급수정내용

# 2. 수정 작업

# 3. 즉시 커밋 및 푸시
git add .
git commit -m "hotfix: 긴급 수정 내용"
git push origin hotfix/긴급수정내용

# 4. main 브랜치로 즉시 병합
git checkout main
git merge hotfix/긴급수정내용
git push origin main

# 5. Vercel 자동 배포 (1-2분 소요)
```

### DB 긴급 수정
```sql
-- Supabase Dashboard → SQL Editor에서 직접 실행
-- 예시: 주문 상태 긴급 변경
UPDATE orders
SET status = 'paid',
    paid_at = NOW()
WHERE id = 'ORDER_ID';
```

---

## 📝 런칭 후 할 일 (비긴급)

### 단기 (1주일 내)
- [ ] Google Search Console 등록
- [ ] 네이버 웹마스터 도구 등록
- [ ] 소셜 미디어 OG 태그 최적화
- [ ] 성능 모니터링 도구 설정 (Sentry 등)

### 중기 (1개월 내)
- [ ] SEO 최적화 (메타 태그, 구조화 데이터)
- [ ] 사용자 피드백 기반 UX 개선
- [ ] A/B 테스트 설정
- [ ] 이메일 마케팅 시스템 구축

---

## ✅ 최종 확인 (배포 전 5분)

런칭 직전 마지막으로 확인:

```bash
# 1. 빌드 테스트
npm run build

# 2. 환경변수 확인
echo $NEXT_PUBLIC_GA_MEASUREMENT_ID
echo $NEXT_PUBLIC_SUPABASE_URL

# 3. Git 상태 확인
git status
git log -1

# 4. Vercel 배포 상태 확인
vercel --prod

# 5. 도메인 접속 확인
# https://allok.shop
```

**모두 정상이면 런칭! 🚀**

---

**작성자**: Claude Code
**최종 업데이트**: 2025-10-17
**비상 연락**: 이 문서를 항상 참고하세요!
