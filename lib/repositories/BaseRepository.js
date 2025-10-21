/**
 * BaseRepository
 *
 * 모든 Repository의 기본 클래스
 * 공통 DB 접근 로직과 에러 처리를 제공
 *
 * @author Claude
 * @since 2025-10-21
 * @version 1.0
 */

import { supabase } from '../supabase'
import { DatabaseError } from '../errors/DatabaseError'
import logger from '../logger'

export class BaseRepository {
  /**
   * 테이블 이름 (자식 클래스에서 반드시 설정)
   * @type {string}
   */
  tableName = null

  constructor() {
    if (!this.tableName) {
      throw new Error('tableName must be set in child class')
    }
  }

  /**
   * Supabase 클라이언트 반환
   * @returns {import('@supabase/supabase-js').SupabaseClient}
   */
  getClient() {
    return supabase
  }

  /**
   * SELECT 쿼리 실행 (공통 에러 처리)
   * @param {Function} queryFn - Supabase 쿼리 빌더 함수
   * @returns {Promise<Array>}
   * @throws {DatabaseError}
   */
  async executeQuery(queryFn) {
    try {
      const { data, error } = await queryFn()

      if (error) {
        logger.error(`[${this.tableName}] Query error:`, error)
        throw new DatabaseError(error.message, {
          table: this.tableName,
          code: error.code,
          details: error.details
        })
      }

      return data || []
    } catch (error) {
      if (error instanceof DatabaseError) {
        throw error
      }

      logger.error(`[${this.tableName}] Unexpected error:`, error)
      throw new DatabaseError(error.message, {
        table: this.tableName,
        originalError: error
      })
    }
  }

  /**
   * INSERT 쿼리 실행
   * @param {Object} data - 삽입할 데이터
   * @returns {Promise<Object>}
   * @throws {DatabaseError}
   */
  async insert(data) {
    logger.debug(`[${this.tableName}] INSERT:`, data)

    try {
      const { data: result, error } = await supabase
        .from(this.tableName)
        .insert(data)
        .select()
        .single()

      if (error) {
        logger.error(`[${this.tableName}] INSERT error:`, error)
        throw new DatabaseError(error.message, {
          table: this.tableName,
          operation: 'INSERT',
          code: error.code
        })
      }

      logger.info(`[${this.tableName}] INSERT success:`, result.id)
      return result
    } catch (error) {
      if (error instanceof DatabaseError) {
        throw error
      }

      throw new DatabaseError(error.message, {
        table: this.tableName,
        operation: 'INSERT',
        originalError: error
      })
    }
  }

  /**
   * UPDATE 쿼리 실행
   * @param {string|number} id - 업데이트할 레코드 ID
   * @param {Object} data - 업데이트할 데이터
   * @returns {Promise<Object>}
   * @throws {DatabaseError}
   */
  async update(id, data) {
    logger.debug(`[${this.tableName}] UPDATE:`, { id, data })

    try {
      const { data: result, error } = await supabase
        .from(this.tableName)
        .update(data)
        .eq('id', id)
        .select()
        .single()

      if (error) {
        logger.error(`[${this.tableName}] UPDATE error:`, error)
        throw new DatabaseError(error.message, {
          table: this.tableName,
          operation: 'UPDATE',
          id,
          code: error.code
        })
      }

      logger.info(`[${this.tableName}] UPDATE success:`, id)
      return result
    } catch (error) {
      if (error instanceof DatabaseError) {
        throw error
      }

      throw new DatabaseError(error.message, {
        table: this.tableName,
        operation: 'UPDATE',
        id,
        originalError: error
      })
    }
  }

  /**
   * DELETE 쿼리 실행 (소프트 삭제 권장)
   * @param {string|number} id - 삭제할 레코드 ID
   * @returns {Promise<boolean>}
   * @throws {DatabaseError}
   */
  async delete(id) {
    logger.debug(`[${this.tableName}] DELETE:`, id)

    try {
      const { error } = await supabase
        .from(this.tableName)
        .delete()
        .eq('id', id)

      if (error) {
        logger.error(`[${this.tableName}] DELETE error:`, error)
        throw new DatabaseError(error.message, {
          table: this.tableName,
          operation: 'DELETE',
          id,
          code: error.code
        })
      }

      logger.info(`[${this.tableName}] DELETE success:`, id)
      return true
    } catch (error) {
      if (error instanceof DatabaseError) {
        throw error
      }

      throw new DatabaseError(error.message, {
        table: this.tableName,
        operation: 'DELETE',
        id,
        originalError: error
      })
    }
  }

  /**
   * ID로 단일 레코드 조회
   * @param {string|number} id - 조회할 레코드 ID
   * @returns {Promise<Object|null>}
   * @throws {DatabaseError}
   */
  async findById(id) {
    logger.debug(`[${this.tableName}] FIND_BY_ID:`, id)

    try {
      const { data, error } = await supabase
        .from(this.tableName)
        .select('*')
        .eq('id', id)
        .single()

      if (error) {
        // 404 에러는 null 반환 (에러 아님)
        if (error.code === 'PGRST116') {
          logger.warn(`[${this.tableName}] Record not found:`, id)
          return null
        }

        logger.error(`[${this.tableName}] FIND_BY_ID error:`, error)
        throw new DatabaseError(error.message, {
          table: this.tableName,
          operation: 'FIND_BY_ID',
          id,
          code: error.code
        })
      }

      return data
    } catch (error) {
      if (error instanceof DatabaseError) {
        throw error
      }

      throw new DatabaseError(error.message, {
        table: this.tableName,
        operation: 'FIND_BY_ID',
        id,
        originalError: error
      })
    }
  }

  /**
   * 전체 레코드 조회
   * @returns {Promise<Array>}
   * @throws {DatabaseError}
   */
  async findAll() {
    logger.debug(`[${this.tableName}] FIND_ALL`)

    try {
      const { data, error } = await supabase
        .from(this.tableName)
        .select('*')

      if (error) {
        logger.error(`[${this.tableName}] FIND_ALL error:`, error)
        throw new DatabaseError(error.message, {
          table: this.tableName,
          operation: 'FIND_ALL',
          code: error.code
        })
      }

      return data || []
    } catch (error) {
      if (error instanceof DatabaseError) {
        throw error
      }

      throw new DatabaseError(error.message, {
        table: this.tableName,
        operation: 'FIND_ALL',
        originalError: error
      })
    }
  }
}
