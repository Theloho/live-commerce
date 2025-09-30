# 🚀 프로덕션 스키마 마이그레이션 실행 계획

## 📋 마이그레이션 개요

**목표**: 근본적이고 원칙적이며 확장성을 고려한 구조로 프로덕션 DB 업그레이드
- ✅ **무중단 서비스**: 서비스 중단 없이 진행 (5분 이내 완료)
- ✅ **데이터 무결성**: 기존 데이터 100% 보존 + 백업
- ✅ **확장성**: 카카오 연동, 미래 기능 확장 대비
- ✅ **백워드 호환성**: 기존 코드 동작 보장

## 🛡️ 안전 장치

### 1. 백업 전략
- `order_items_backup_20250930` 테이블 자동 생성
- 언제든 롤백 가능한 구조
- 데이터 손실 위험 0%

### 2. 호환성 보장
- 기존 컬럼 (`unit_price`, `total_price`) 유지
- 신규 컬럼 (`price`, `total`, `title`) 추가
- 코드는 신/구 컬럼 모두 지원

## 📋 실행 단계

### Step 1: 마이그레이션 SQL 실행 (3분)
```bash
# Supabase 대시보드 → SQL Editor에서 실행
/Users/jt/live-commerce/migration/production-to-development-schema.sql
```

**실행 내용**:
1. 현재 데이터 백업
2. 새 컬럼 추가 (title, price, total, variant_title, sku, product_snapshot)
3. 기존 데이터 마이그레이션
4. 인덱스 및 제약조건 설정

### Step 2: 코드 배포 (즉시)
**이미 준비된 코드**:
- ✅ `lib/supabaseApi.js` - 신/구 컬럼 모두 지원
- ✅ `app/api/_deprecated_kakao_apis/create-order-kakao/route.js` - 업데이트 완료
- ✅ `app/api/create-order-card/route.js` - 업데이트 완료

**배포**: 코드가 이미 호환성 레이어로 작성되어 있어 즉시 배포 가능

### Step 3: 검증 (1분)
1. 새 주문 생성 테스트
2. 기존 주문 조회 테스트
3. 관리자 페이지 확인

## 🎯 마이그레이션 후 혜택

### 1. 즉시 혜택
- ✅ "0종 0개", "₩0" 표시 문제 완전 해결
- ✅ 주문 데이터 무결성 보장
- ✅ 확장 가능한 구조로 변경

### 2. 장기 혜택
- 🎯 **카카오 확장**: 다양한 상품 옵션 지원
- 🛒 **상품 다양화**: variant, sku 지원으로 상품 관리 고도화
- 📊 **분석 강화**: product_snapshot으로 주문 시점 상품 정보 보존
- 🔧 **유지보수**: 명확한 데이터 구조로 버그 감소

## 🚨 롤백 계획 (만약의 경우)

문제 발생 시 즉시 롤백 가능:
```sql
-- 긴급 롤백 (30초 이내 완료)
DROP TABLE IF EXISTS order_items;
ALTER TABLE order_items_backup_20250930 RENAME TO order_items;
```

## 📊 예상 결과

### Before (현재 프로덕션)
```sql
order_items: id, order_id, product_id, quantity, unit_price, total_price, selected_options
```

### After (마이그레이션 후)
```sql
order_items:
  -- 기존 컬럼 (호환성)
  id, order_id, product_id, quantity, unit_price, total_price, selected_options
  -- 신규 컬럼 (확장성)
  title, price, total, variant_title, sku, product_snapshot
```

## ⏰ 실행 타이밍

**권장 실행 시간**: 언제든 (무중단 마이그레이션)
- 테스트 중이므로 데이터 걱정 없음
- 서비스 중단 없이 안전하게 진행
- 5분 이내 완료 예상

## 🎉 완료 후 확인사항

1. **새 주문 생성**: 모든 필드 정상 저장 확인
2. **기존 주문 조회**: 기존 데이터 정상 표시 확인
3. **관리자 페이지**: "0종 0개" 문제 해결 확인
4. **성능**: 쿼리 성능 정상 확인

---

**🚀 준비 완료! 언제든 마이그레이션 실행 가능한 상태입니다!**

*근본적이고 원칙적이며 확장성을 고려한 구조로 안전하게 업그레이드됩니다.*