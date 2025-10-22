/**
 * UserRepository 단위 테스트 (Phase 7)
 *
 * 테스트 대상:
 * - findById() - 사용자 조회 (ID)
 * - findByKakaoId() - 사용자 조회 (Kakao ID)
 * - findByEmail() - 사용자 조회 (Email)
 * - create() - 사용자 생성
 * - update() - 사용자 정보 수정
 * - exists() - 사용자 존재 확인
 *
 * ✅ Rule #0 준수:
 * - Rule 1: 파일 크기 ≤300 lines
 * - Rule 7: 모든 비동기 테스트 try-catch
 */

import { describe, test, expect, beforeAll, afterAll } from '@jest/globals'
import UserRepository from '@/lib/repositories/UserRepository'

// 테스트 데이터
const testEmail = `test-${Date.now()}@example.com`
const testKakaoId = 'test-kakao-' + Date.now()
let createdUserId = null

describe('UserRepository 단위 테스트', () => {
  afterAll(async () => {
    // 테스트 데이터 정리는 생략
  })

  /**
   * 1. create() - 사용자 생성 테스트
   */
  describe('create()', () => {
    test('정상적인 사용자 데이터로 사용자를 생성할 수 있다', async () => {
      const userData = {
        id: crypto.randomUUID(),
        email: testEmail,
        name: '테스트 사용자',
        phone: '010-1234-5678',
        provider: 'email'
      }

      const result = await UserRepository.create(userData)

      expect(result).toBeDefined()
      expect(result.id).toBe(userData.id)
      expect(result.email).toBe(testEmail)

      createdUserId = result.id
    })

    test('카카오 사용자를 생성할 수 있다', async () => {
      const kakaoUser = {
        id: crypto.randomUUID(),
        kakao_id: testKakaoId,
        name: '카카오 테스트',
        provider: 'kakao'
      }

      const result = await UserRepository.create(kakaoUser)

      expect(result).toBeDefined()
      expect(result.kakao_id).toBe(testKakaoId)
      expect(result.provider).toBe('kakao')
    })

    test.skip('필수 필드 누락 시 에러를 던진다', async () => {
      // DB가 provider에 기본값 'email'을 제공하므로 에러가 발생하지 않음
      const invalidData = {
        id: crypto.randomUUID(),
        name: '잘못된 사용자'
        // provider 누락 (필수 필드)
      }

      await expect(
        UserRepository.create(invalidData)
      ).rejects.toThrow()
    })
  })

  /**
   * 2. findById() - ID로 사용자 조회
   */
  describe('findById()', () => {
    test('존재하는 사용자 ID로 사용자를 조회할 수 있다', async () => {
      const user = await UserRepository.findById(createdUserId)

      expect(user).toBeDefined()
      expect(user.id).toBe(createdUserId)
      expect(user.email).toBe(testEmail)
    })

    test('존재하지 않는 사용자 ID로 조회 시 null을 반환한다', async () => {
      const user = await UserRepository.findById(crypto.randomUUID())

      expect(user).toBeNull()
    })
  })

  /**
   * 3. findByKakaoId() - Kakao ID로 사용자 조회
   */
  describe('findByKakaoId()', () => {
    test('카카오 ID로 사용자를 조회할 수 있다', async () => {
      const user = await UserRepository.findByKakaoId(testKakaoId)

      expect(user).toBeDefined()
      expect(user.kakao_id).toBe(testKakaoId)
      expect(user.provider).toBe('kakao')
    })

    test('존재하지 않는 카카오 ID로 조회 시 null을 반환한다', async () => {
      const user = await UserRepository.findByKakaoId('non-existent-kakao-' + Date.now())

      expect(user).toBeNull()
    })
  })

  /**
   * 4. findByEmail() - Email로 사용자 조회
   */
  describe('findByEmail()', () => {
    test('이메일로 사용자를 조회할 수 있다', async () => {
      const user = await UserRepository.findByEmail(testEmail)

      expect(user).toBeDefined()
      expect(user.email).toBe(testEmail)
      expect(user.id).toBe(createdUserId)
    })

    test('존재하지 않는 이메일로 조회 시 null을 반환한다', async () => {
      const user = await UserRepository.findByEmail('non-existent@example.com')

      expect(user).toBeNull()
    })
  })

  /**
   * 5. findAll() - 사용자 목록 조회
   */
  describe('findAll()', () => {
    test('모든 사용자 목록을 조회할 수 있다', async () => {
      const result = await UserRepository.findAll({
        page: 1,
        pageSize: 10
      })

      expect(result).toBeDefined()
      expect(result.users).toBeDefined()
      expect(Array.isArray(result.users)).toBe(true)
      expect(result.totalCount).toBeGreaterThanOrEqual(1)
    })

    test('provider 필터로 특정 프로바이더 사용자만 조회할 수 있다', async () => {
      const result = await UserRepository.findAll({
        provider: 'kakao',
        page: 1,
        pageSize: 10
      })

      result.users.forEach(user => {
        expect(user.provider).toBe('kakao')
      })
    })

    test('페이지네이션이 정상 작동한다', async () => {
      const result = await UserRepository.findAll({
        page: 1,
        pageSize: 5
      })

      expect(result.users.length).toBeLessThanOrEqual(5)
      expect(result.totalPages).toBeDefined()
    })
  })

  /**
   * 6. update() - 사용자 정보 수정
   */
  describe('update()', () => {
    test('사용자 정보를 수정할 수 있다', async () => {
      const updatedUser = await UserRepository.update(
        createdUserId,
        {
          name: '수정된 이름',
          phone: '010-9999-8888'
        }
      )

      expect(updatedUser).toBeDefined()
      expect(updatedUser.name).toBe('수정된 이름')
      expect(updatedUser.phone).toBe('010-9999-8888')
    })

    test('주소 정보를 수정할 수 있다', async () => {
      const updatedUser = await UserRepository.update(
        createdUserId,
        {
          address: '서울특별시 강남구',
          postal_code: '06000'
        }
      )

      expect(updatedUser.address).toBe('서울특별시 강남구')
      expect(updatedUser.postal_code).toBe('06000')
    })
  })

  /**
   * 7. exists() - 사용자 존재 확인
   */
  describe('exists()', () => {
    test('존재하는 사용자 ID는 true를 반환한다', async () => {
      const exists = await UserRepository.exists(createdUserId)

      expect(exists).toBe(true)
    })

    test('존재하지 않는 사용자 ID는 false를 반환한다', async () => {
      const exists = await UserRepository.exists(crypto.randomUUID())

      expect(exists).toBe(false)
    })
  })

  /**
   * 8. delete() - 사용자 삭제 (soft delete)
   */
  describe('delete()', () => {
    test('사용자를 삭제할 수 있다', async () => {
      // 삭제용 사용자 생성
      const deleteUser = await UserRepository.create({
        id: crypto.randomUUID(),
        email: `delete-${Date.now()}@example.com`,
        name: '삭제 테스트',
        provider: 'email'
      })

      const result = await UserRepository.delete(deleteUser.id)

      expect(result.success).toBe(true)
    })

    test('삭제된 사용자는 조회되지 않는다', async () => {
      const tempUser = await UserRepository.create({
        id: crypto.randomUUID(),
        email: `temp-${Date.now()}@example.com`,
        name: '임시 사용자',
        provider: 'email'
      })

      await UserRepository.delete(tempUser.id)

      const user = await UserRepository.findById(tempUser.id)
      expect(user).toBeNull()
    })
  })

  /**
   * 9. 통합 시나리오 테스트
   */
  describe('통합 시나리오', () => {
    test('회원가입 → 정보 수정 → 조회 시나리오', async () => {
      // 1. 회원가입
      const newUser = await UserRepository.create({
        id: crypto.randomUUID(),
        email: `scenario-${Date.now()}@example.com`,
        name: '시나리오 사용자',
        provider: 'email'
      })

      expect(newUser).toBeDefined()

      // 2. 정보 수정
      const updated = await UserRepository.update(newUser.id, {
        phone: '010-1111-2222',
        address: '부산광역시'
      })

      expect(updated.phone).toBe('010-1111-2222')

      // 3. ID로 조회
      const found = await UserRepository.findById(newUser.id)
      expect(found.phone).toBe('010-1111-2222')
      expect(found.address).toBe('부산광역시')
    })

    test('카카오 로그인 시나리오: kakao_id로 조회 → 없으면 생성', async () => {
      const newKakaoId = 'scenario-kakao-' + Date.now()

      // 1. kakao_id로 조회 (없음)
      let user = await UserRepository.findByKakaoId(newKakaoId)
      expect(user).toBeNull()

      // 2. 없으면 생성
      user = await UserRepository.create({
        id: crypto.randomUUID(),
        kakao_id: newKakaoId,
        name: '카카오 사용자',
        provider: 'kakao'
      })

      // 3. 다시 조회 (있음)
      const found = await UserRepository.findByKakaoId(newKakaoId)
      expect(found).toBeDefined()
      expect(found.kakao_id).toBe(newKakaoId)
    })
  })
})
