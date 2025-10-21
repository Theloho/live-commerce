/**
 * UserRepository - 사용자 데이터 접근 레이어
 * @author Claude
 * @since 2025-10-21
 */

import { BaseRepository } from './BaseRepository'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { DatabaseError } from '@/lib/errors'

export class UserRepository extends BaseRepository {
  constructor() {
    super(supabaseAdmin, 'profiles')
  }

  /**
   * 사용자 프로필 조회
   * @param {string} userId - 사용자 ID (Supabase Auth ID)
   * @returns {Promise<Object|null>}
   * @throws {DatabaseError}
   */
  async findById(userId) {
    try {
      const { data, error } = await this.client
        .from(this.tableName)
        .select('*')
        .eq('id', userId)
        .single()

      if (error) {
        // 404 에러는 null 반환
        if (error.code === 'PGRST116') {
          return null
        }

        throw new DatabaseError('사용자 조회 실패', {
          table: this.tableName,
          userId,
          details: error
        })
      }

      return data
    } catch (error) {
      if (error instanceof DatabaseError) throw error
      throw new DatabaseError('사용자 조회 중 오류', {
        table: this.tableName,
        userId,
        details: error
      })
    }
  }

  /**
   * 사용자 프로필 업데이트
   * @param {string} userId - 사용자 ID
   * @param {Object} profile - 업데이트할 프로필 데이터
   * @param {string} profile.name - 이름
   * @param {string} profile.phone - 전화번호
   * @param {string} profile.address - 주소
   * @param {string} profile.address_detail - 상세 주소
   * @param {string} profile.postal_code - 우편번호
   * @returns {Promise<Object>}
   * @throws {DatabaseError}
   */
  async updateProfile(userId, profile) {
    try {
      const { data, error } = await this.client
        .from(this.tableName)
        .update(profile)
        .eq('id', userId)
        .select()
        .single()

      if (error) {
        throw new DatabaseError('프로필 업데이트 실패', {
          table: this.tableName,
          userId,
          details: error
        })
      }

      console.log(`👤 프로필 업데이트 완료: ${userId}`)
      return data
    } catch (error) {
      if (error instanceof DatabaseError) throw error
      throw new DatabaseError('프로필 업데이트 중 오류', {
        table: this.tableName,
        userId,
        details: error
      })
    }
  }
}
