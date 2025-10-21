/**
 * UserRepository - 사용자 데이터 저장소 (Phase 5.1)
 * @author Claude
 * @since 2025-10-21
 */

import { createClient } from '@supabase/supabase-js'
import logger from '@/lib/logger'

const getSupabaseAdmin = () => {
  if (typeof window !== 'undefined') {
    throw new Error('UserRepository는 서버 사이드에서만 사용 가능합니다')
  }

  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

class UserRepository {
  constructor() {
    this.supabase = null
  }

  _getClient() {
    if (!this.supabase) {
      this.supabase = getSupabaseAdmin()
    }
    return this.supabase
  }

  /**
   * 사용자 조회 (ID)
   */
  async findById(userId) {
    try {
      const supabase = this._getClient()

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()

      if (error) throw error
      return data
    } catch (error) {
      logger.error('❌ [UserRepository] 사용자 조회 실패:', error)
      throw new Error(`사용자 조회 실패: \${error.message}`)
    }
  }

  /**
   * 사용자 조회 (Kakao ID)
   */
  async findByKakaoId(kakaoId) {
    try {
      const supabase = this._getClient()

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('kakao_id', kakaoId)
        .single()

      if (error) {
        if (error.code === 'PGRST116') return null // Not found
        throw error
      }
      return data
    } catch (error) {
      logger.error('❌ [UserRepository] Kakao 사용자 조회 실패:', error)
      throw new Error(`Kakao 사용자 조회 실패: \${error.message}`)
    }
  }

  /**
   * 사용자 조회 (Email)
   */
  async findByEmail(email) {
    try {
      const supabase = this._getClient()

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('email', email)
        .single()

      if (error) {
        if (error.code === 'PGRST116') return null
        throw error
      }
      return data
    } catch (error) {
      logger.error('❌ [UserRepository] Email 사용자 조회 실패:', error)
      throw new Error(`Email 사용자 조회 실패: \${error.message}`)
    }
  }

  /**
   * 전체 사용자 목록 조회
   */
  async findAll(filters = {}) {
    try {
      const supabase = this._getClient()
      const { page = 1, pageSize = 50 } = filters

      let query = supabase
        .from('profiles')
        .select('*', { count: 'exact' })

      const from = (page - 1) * pageSize
      query = query.range(from, from + pageSize - 1).order('created_at', { ascending: false })

      const { data, error, count } = await query
      if (error) throw error

      return { users: data, totalCount: count }
    } catch (error) {
      logger.error('❌ [UserRepository] 사용자 목록 조회 실패:', error)
      throw new Error(`사용자 목록 조회 실패: \${error.message}`)
    }
  }

  /**
   * 사용자 생성
   */
  async create(userData) {
    try {
      const supabase = this._getClient()

      const { data, error } = await supabase
        .from('profiles')
        .insert(userData)
        .select()
        .single()

      if (error) throw error

      logger.info('✅ [UserRepository] 사용자 생성:', data.id)
      return data
    } catch (error) {
      logger.error('❌ [UserRepository] 사용자 생성 실패:', error)
      throw new Error(`사용자 생성 실패: \${error.message}`)
    }
  }

  /**
   * 사용자 업데이트
   */
  async update(userId, userData) {
    try {
      const supabase = this._getClient()

      const { data, error } = await supabase
        .from('profiles')
        .update(userData)
        .eq('id', userId)
        .select()
        .single()

      if (error) throw error

      logger.info('✅ [UserRepository] 사용자 업데이트:', userId)
      return data
    } catch (error) {
      logger.error('❌ [UserRepository] 사용자 업데이트 실패:', error)
      throw new Error(`사용자 업데이트 실패: \${error.message}`)
    }
  }

  /**
   * 사용자 삭제
   */
  async delete(userId) {
    try {
      const supabase = this._getClient()

      const { error } = await supabase
        .from('profiles')
        .delete()
        .eq('id', userId)

      if (error) throw error

      logger.info('✅ [UserRepository] 사용자 삭제:', userId)
      return true
    } catch (error) {
      logger.error('❌ [UserRepository] 사용자 삭제 실패:', error)
      throw new Error(`사용자 삭제 실패: \${error.message}`)
    }
  }

  /**
   * 프로필 존재 여부 확인
   */
  async exists(userId) {
    try {
      const supabase = this._getClient()

      const { data, error } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', userId)
        .single()

      if (error && error.code !== 'PGRST116') throw error

      return !!data
    } catch (error) {
      logger.error('❌ [UserRepository] 프로필 존재 확인 실패:', error)
      throw new Error(`프로필 존재 확인 실패: \${error.message}`)
    }
  }
}

export default new UserRepository()
