/**
 * UpdateProductUseCase 단위 테스트
 *
 * 테스트 목적:
 * - 상품 기본 정보 수정
 * - 기존 Variant 삭제 검증
 * - 새 Variant 생성 검증
 * - 옵션 변경 시나리오 (없음 → 있음, 있음 → 없음)
 *
 * 작성일: 2025-10-23
 * 관련 이슈: Product Domain Clean Architecture
 */

import { UpdateProductUseCase } from '@/lib/use-cases/product/UpdateProductUseCase'

// Mock ProductRepository
const mockProductRepository = {
  findById: jest.fn(),
  update: jest.fn(),
  createProductOption: jest.fn(),
  createOptionValues: jest.fn(),
  createVariant: jest.fn(),
  createVariantMappings: jest.fn(),
  _getClient: jest.fn(),
}

// Mock Supabase Client
const mockSupabaseClient = {
  from: jest.fn(),
}

describe('UpdateProductUseCase 단위 테스트', () => {
  let updateProductUseCase

  beforeEach(() => {
    jest.clearAllMocks()

    // Dependency Injection
    updateProductUseCase = new UpdateProductUseCase(mockProductRepository)

    // Default mock: findById
    mockProductRepository.findById.mockResolvedValue({
      id: '12345678-1234-1234-1234-123456789012',
      product_number: 'P001',
      title: '기존 상품',
      price: 50000,
      inventory: 100,
    })

    // Default mock: update
    mockProductRepository.update.mockResolvedValue({
      id: '12345678-1234-1234-1234-123456789012',
      product_number: 'P001',
      title: '수정된 상품',
      price: 60000,
      inventory: 120,
    })

    // Mock Supabase Client for Variant deletion
    mockProductRepository._getClient.mockReturnValue(mockSupabaseClient)

    const mockDelete = jest.fn().mockReturnThis()
    const mockEq = jest.fn().mockResolvedValue({ data: null, error: null })
    const mockIn = jest.fn().mockReturnThis()

    mockSupabaseClient.from.mockReturnValue({
      select: jest.fn().mockResolvedValue({ data: [], error: null }),
      delete: mockDelete,
      eq: mockEq,
      in: mockIn,
    })
  })

  /**
   * Test 1: 기본 정보만 수정 (옵션 없음 → 옵션 없음)
   */
  test('상품 기본 정보만 수정한다', async () => {
    const productId = '12345678-1234-1234-1234-123456789012'

    const params = {
      title: '수정된 상품명',
      product_number: 'P001',
      price: 60000,
      inventory: 120,
      thumbnail_url: 'https://example.com/new-image.jpg',
      description: '수정된 설명',
      optionType: 'none', // ✅ 옵션 없음
      status: 'active',
      is_live: true,
    }

    const result = await updateProductUseCase.execute(productId, params)

    // 검증: findById 호출됨
    expect(mockProductRepository.findById).toHaveBeenCalledWith(productId)

    // 검증: update 호출됨
    expect(mockProductRepository.update).toHaveBeenCalledTimes(1)
    expect(mockProductRepository.update).toHaveBeenCalledWith(
      productId,
      expect.objectContaining({
        title: '수정된 상품명',
        price: 60000,
        inventory: 120,
      })
    )

    // 검증: Variant 시스템 생성 안 함
    expect(mockProductRepository.createProductOption).not.toHaveBeenCalled()
    expect(mockProductRepository.createVariant).not.toHaveBeenCalled()

    // 검증: product 반환
    expect(result).toHaveProperty('product')
    expect(result.product.title).toBe('수정된 상품')
  })

  /**
   * Test 2: 옵션 없음 → 사이즈 옵션 추가
   */
  test('옵션 없는 상품에 사이즈 옵션을 추가한다', async () => {
    const productId = '12345678-1234-1234-1234-123456789012'

    // Mock: option 생성
    mockProductRepository.createProductOption.mockResolvedValue({
      id: 'option-1',
      name: '사이즈',
    })

    // Mock: option values 생성
    mockProductRepository.createOptionValues.mockResolvedValue([
      { id: 'value-1', value: 'S', display_order: 0 },
      { id: 'value-2', value: 'M', display_order: 1 },
    ])

    // Mock: variant 생성
    mockProductRepository.createVariant.mockResolvedValue({
      id: 'variant-1',
      sku: 'P001-S-12345678',
    })

    // Mock: variant mappings
    mockProductRepository.createVariantMappings.mockResolvedValue([])

    const params = {
      title: '수정된 상품',
      product_number: 'P001',
      price: 60000,
      inventory: 100,
      thumbnail_url: 'https://example.com/image.jpg',
      description: '수정된 설명',
      optionType: 'size', // ✅ 사이즈 옵션 추가
      sizeOptions: ['S', 'M'],
      optionInventories: {
        'size-S': 50,
        'size-M': 50,
      },
      combinations: [
        { key: 'size-S', type: 'size', size: 'S' },
        { key: 'size-M', type: 'size', size: 'M' },
      ],
      status: 'active',
      is_live: true,
    }

    const result = await updateProductUseCase.execute(productId, params)

    // 검증: 기존 Variant 삭제 시도 (_getClient 호출)
    expect(mockProductRepository._getClient).toHaveBeenCalled()

    // 검증: product_options 생성 (사이즈 1개)
    expect(mockProductRepository.createProductOption).toHaveBeenCalledTimes(1)

    // 검증: option values 생성
    expect(mockProductRepository.createOptionValues).toHaveBeenCalledTimes(1)

    // 검증: variants 생성 (2개)
    expect(mockProductRepository.createVariant).toHaveBeenCalledTimes(2)

    expect(result).toHaveProperty('product')
  })

  /**
   * Test 3: 사이즈 옵션 → 색상 옵션으로 변경
   */
  test('옵션 타입을 변경한다 (사이즈 → 색상)', async () => {
    const productId = '12345678-1234-1234-1234-123456789012'

    // Mock: findById에서 기존 옵션 있음
    mockProductRepository.findById.mockResolvedValue({
      id: productId,
      product_number: 'P001',
      title: '기존 상품',
      price: 50000,
      inventory: 100,
      // (실제로는 product_options도 JOIN되어 있음)
    })

    // Mock: Variant 삭제 - 기존 데이터 있음
    const mockVariantDelete = jest.fn().mockResolvedValue({ data: null, error: null })
    const mockOptionDelete = jest.fn().mockResolvedValue({ data: null, error: null })

    mockSupabaseClient.from.mockImplementation((table) => {
      if (table === 'product_variants') {
        return {
          select: jest.fn().mockResolvedValue({
            data: [{ id: 'variant-old-1' }, { id: 'variant-old-2' }],
            error: null,
          }),
          delete: jest.fn().mockReturnThis(),
          eq: jest.fn().mockResolvedValue({ data: null, error: null }),
        }
      } else if (table === 'variant_option_values') {
        return {
          delete: jest.fn().mockReturnThis(),
          in: jest.fn().mockResolvedValue({ data: null, error: null }),
        }
      } else if (table === 'product_options') {
        return {
          select: jest.fn().mockResolvedValue({
            data: [{ id: 'option-old-1' }],
            error: null,
          }),
          delete: jest.fn().mockReturnThis(),
          eq: jest.fn().mockResolvedValue({ data: null, error: null }),
        }
      } else if (table === 'product_option_values') {
        return {
          delete: jest.fn().mockReturnThis(),
          in: jest.fn().mockResolvedValue({ data: null, error: null }),
        }
      }
    })

    // Mock: 새 옵션 생성 (색상)
    mockProductRepository.createProductOption.mockResolvedValue({
      id: 'option-new-1',
      name: '색상',
    })

    mockProductRepository.createOptionValues.mockResolvedValue([
      { id: 'value-1', value: '블랙', display_order: 0 },
      { id: 'value-2', value: '화이트', display_order: 1 },
    ])

    mockProductRepository.createVariant.mockResolvedValue({
      id: 'variant-new-1',
      sku: 'P001-블랙-12345678',
    })

    mockProductRepository.createVariantMappings.mockResolvedValue([])

    const params = {
      title: '수정된 상품',
      product_number: 'P001',
      price: 60000,
      inventory: 100,
      thumbnail_url: 'https://example.com/image.jpg',
      description: '수정된 설명',
      optionType: 'color', // ✅ 색상 옵션으로 변경
      colorOptions: ['블랙', '화이트'],
      optionInventories: {
        'color-블랙': 50,
        'color-화이트': 50,
      },
      combinations: [
        { key: 'color-블랙', type: 'color', color: '블랙' },
        { key: 'color-화이트', type: 'color', color: '화이트' },
      ],
      status: 'active',
      is_live: true,
    }

    const result = await updateProductUseCase.execute(productId, params)

    // 검증: 기존 Variant 삭제 로직 실행
    expect(mockProductRepository._getClient).toHaveBeenCalled()

    // 검증: 새 옵션 생성 (색상)
    expect(mockProductRepository.createProductOption).toHaveBeenCalledWith(
      productId,
      '색상',
      0
    )

    // 검증: 새 variants 생성 (2개)
    expect(mockProductRepository.createVariant).toHaveBeenCalledTimes(2)

    expect(result).toHaveProperty('product')
  })

  /**
   * Test 4: 존재하지 않는 상품 수정 시도 → 에러
   */
  test('존재하지 않는 상품 수정 시 에러를 던진다', async () => {
    const productId = 'non-existent-id'

    // Mock: findById null 반환
    mockProductRepository.findById.mockResolvedValue(null)

    const params = {
      title: '수정된 상품',
      product_number: 'P001',
      price: 60000,
      inventory: 100,
      thumbnail_url: 'https://example.com/image.jpg',
      description: '수정된 설명',
      optionType: 'none',
      status: 'active',
      is_live: true,
    }

    // 검증: 에러 발생
    await expect(updateProductUseCase.execute(productId, params)).rejects.toThrow(
      '상품을 찾을 수 없습니다'
    )

    // 검증: update 호출 안 됨
    expect(mockProductRepository.update).not.toHaveBeenCalled()
  })

  /**
   * Test 5: 재고 재계산 검증
   */
  test('옵션별 재고 합계를 재계산한다', async () => {
    const productId = '12345678-1234-1234-1234-123456789012'

    mockProductRepository.createProductOption.mockResolvedValue({
      id: 'option-1',
      name: '사이즈',
    })

    mockProductRepository.createOptionValues.mockResolvedValue([
      { id: 'value-1', value: 'S', display_order: 0 },
      { id: 'value-2', value: 'M', display_order: 1 },
      { id: 'value-3', value: 'L', display_order: 2 },
    ])

    mockProductRepository.createVariant.mockResolvedValue({
      id: 'variant-1',
      sku: 'P001-S-12345678',
    })

    mockProductRepository.createVariantMappings.mockResolvedValue([])

    const params = {
      title: '재고 테스트 상품',
      product_number: 'P001',
      price: 50000,
      inventory: 999, // 사용 안 함
      thumbnail_url: 'https://example.com/image.jpg',
      description: '테스트 상품입니다',
      optionType: 'size',
      sizeOptions: ['S', 'M', 'L'],
      optionInventories: {
        'size-S': 20,
        'size-M': 35,
        'size-L': 30,
      }, // 총 85개
      combinations: [
        { key: 'size-S', type: 'size', size: 'S' },
        { key: 'size-M', type: 'size', size: 'M' },
        { key: 'size-L', type: 'size', size: 'L' },
      ],
      status: 'active',
      is_live: true,
    }

    await updateProductUseCase.execute(productId, params)

    // 검증: 총 재고 재계산 (20 + 35 + 30 = 85)
    expect(mockProductRepository.update).toHaveBeenCalledWith(
      productId,
      expect.objectContaining({
        inventory: 85, // ✅ 정확히 재계산됨
      })
    )
  })
})
