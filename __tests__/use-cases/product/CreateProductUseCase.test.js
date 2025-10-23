/**
 * CreateProductUseCase 단위 테스트
 *
 * 테스트 목적:
 * - 옵션 없는 단일 상품 생성
 * - 사이즈 옵션 상품 생성
 * - 색상 옵션 상품 생성
 * - 사이즈+색상 옵션 상품 생성
 * - 재고 계산 검증
 * - Variant 시스템 검증
 *
 * 작성일: 2025-10-23
 * 관련 이슈: Product Domain Clean Architecture
 */

import { CreateProductUseCase } from '@/lib/use-cases/product/CreateProductUseCase'

// Mock ProductRepository
const mockProductRepository = {
  create: jest.fn(),
  createProductOption: jest.fn(),
  createOptionValues: jest.fn(),
  createVariant: jest.fn(),
  createVariantMappings: jest.fn(),
}

describe('CreateProductUseCase 단위 테스트', () => {
  let createProductUseCase

  beforeEach(() => {
    jest.clearAllMocks()

    // Dependency Injection
    createProductUseCase = new CreateProductUseCase(mockProductRepository)

    // Default mock: product create
    mockProductRepository.create.mockResolvedValue({
      id: '12345678-1234-1234-1234-123456789012',
      product_number: 'P001',
      title: '테스트 상품',
      price: 50000,
      inventory: 100,
    })
  })

  /**
   * Test 1: 옵션 없는 단일 상품 생성
   */
  test('옵션 없는 단일 상품을 생성한다', async () => {
    const params = {
      title: '단일 상품',
      product_number: 'P001',
      price: 50000,
      inventory: 100,
      thumbnail_url: 'https://example.com/image.jpg',
      description: '테스트 상품입니다',
      optionType: 'none', // ✅ 옵션 없음
      status: 'active',
      is_live: true,
    }

    const result = await createProductUseCase.execute(params)

    // 검증: product create 호출됨
    expect(mockProductRepository.create).toHaveBeenCalledTimes(1)
    expect(mockProductRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        title: '단일 상품',
        product_number: 'P001',
        price: 50000,
        inventory: 100,
      })
    )

    // 검증: Variant 시스템 생성 안 함
    expect(mockProductRepository.createProductOption).not.toHaveBeenCalled()
    expect(mockProductRepository.createVariant).not.toHaveBeenCalled()

    // 검증: product 반환
    expect(result).toHaveProperty('product')
    expect(result.product.id).toBe('12345678-1234-1234-1234-123456789012')
  })

  /**
   * Test 2: 사이즈 옵션 상품 생성
   */
  test('사이즈 옵션 상품을 생성한다', async () => {
    // Mock: option 생성
    mockProductRepository.createProductOption.mockResolvedValue({
      id: 'option-1',
      name: '사이즈',
    })

    // Mock: option values 생성
    mockProductRepository.createOptionValues.mockResolvedValue([
      { id: 'value-1', value: 'S', display_order: 0 },
      { id: 'value-2', value: 'M', display_order: 1 },
      { id: 'value-3', value: 'L', display_order: 2 },
    ])

    // Mock: variant 생성
    mockProductRepository.createVariant.mockResolvedValue({
      id: 'variant-1',
      sku: 'P001-S-12345678',
    })

    // Mock: variant mappings
    mockProductRepository.createVariantMappings.mockResolvedValue([])

    const params = {
      title: '사이즈 옵션 상품',
      product_number: 'P001',
      price: 50000,
      inventory: 100, // 사용 안 함 (옵션별 재고 사용)
      thumbnail_url: 'https://example.com/image.jpg',
      description: '테스트 상품입니다',
      optionType: 'size', // ✅ 사이즈 옵션
      sizeOptions: ['S', 'M', 'L'],
      optionInventories: {
        'size-S': 30,
        'size-M': 40,
        'size-L': 30,
      },
      combinations: [
        { key: 'size-S', type: 'size', size: 'S' },
        { key: 'size-M', type: 'size', size: 'M' },
        { key: 'size-L', type: 'size', size: 'L' },
      ],
      status: 'active',
      is_live: true,
    }

    const result = await createProductUseCase.execute(params)

    // 검증: 총 재고 계산 (30 + 40 + 30 = 100)
    expect(mockProductRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        inventory: 100,
      })
    )

    // 검증: product_options 생성 (사이즈 1개)
    expect(mockProductRepository.createProductOption).toHaveBeenCalledTimes(1)
    expect(mockProductRepository.createProductOption).toHaveBeenCalledWith(
      '12345678-1234-1234-1234-123456789012',
      '사이즈',
      0
    )

    // 검증: option values 생성 (S, M, L)
    expect(mockProductRepository.createOptionValues).toHaveBeenCalledTimes(1)
    expect(mockProductRepository.createOptionValues).toHaveBeenCalledWith('option-1', ['S', 'M', 'L'])

    // 검증: variants 생성 (3개)
    expect(mockProductRepository.createVariant).toHaveBeenCalledTimes(3)

    // 검증: variant mappings 생성 (3개)
    expect(mockProductRepository.createVariantMappings).toHaveBeenCalledTimes(3)

    // 검증: product 반환
    expect(result).toHaveProperty('product')
  })

  /**
   * Test 3: 색상 옵션 상품 생성
   */
  test('색상 옵션 상품을 생성한다', async () => {
    // Mock 설정
    mockProductRepository.createProductOption.mockResolvedValue({
      id: 'option-1',
      name: '색상',
    })

    mockProductRepository.createOptionValues.mockResolvedValue([
      { id: 'value-1', value: '블랙', display_order: 0 },
      { id: 'value-2', value: '화이트', display_order: 1 },
    ])

    mockProductRepository.createVariant.mockResolvedValue({
      id: 'variant-1',
      sku: 'P001-블랙-12345678',
    })

    mockProductRepository.createVariantMappings.mockResolvedValue([])

    const params = {
      title: '색상 옵션 상품',
      product_number: 'P001',
      price: 50000,
      inventory: 100,
      thumbnail_url: 'https://example.com/image.jpg',
      description: '테스트 상품입니다',
      optionType: 'color', // ✅ 색상 옵션
      colorOptions: ['블랙', '화이트'],
      optionInventories: {
        'color-블랙': 60,
        'color-화이트': 40,
      },
      combinations: [
        { key: 'color-블랙', type: 'color', color: '블랙' },
        { key: 'color-화이트', type: 'color', color: '화이트' },
      ],
      status: 'active',
      is_live: true,
    }

    const result = await createProductUseCase.execute(params)

    // 검증: product_options 생성 (색상 1개)
    expect(mockProductRepository.createProductOption).toHaveBeenCalledWith(
      '12345678-1234-1234-1234-123456789012',
      '색상',
      0
    )

    // 검증: variants 생성 (2개)
    expect(mockProductRepository.createVariant).toHaveBeenCalledTimes(2)

    expect(result).toHaveProperty('product')
  })

  /**
   * Test 4: 사이즈+색상 옵션 상품 생성
   */
  test('사이즈+색상 옵션 상품을 생성한다', async () => {
    // Mock 설정
    let optionCallCount = 0
    mockProductRepository.createProductOption.mockImplementation(() => {
      optionCallCount++
      return Promise.resolve({
        id: `option-${optionCallCount}`,
        name: optionCallCount === 1 ? '사이즈' : '색상',
      })
    })

    let valuesCallCount = 0
    mockProductRepository.createOptionValues.mockImplementation(() => {
      valuesCallCount++
      if (valuesCallCount === 1) {
        // 사이즈
        return Promise.resolve([
          { id: 'value-1', value: 'S', display_order: 0 },
          { id: 'value-2', value: 'M', display_order: 1 },
        ])
      } else {
        // 색상
        return Promise.resolve([
          { id: 'value-3', value: '블랙', display_order: 0 },
          { id: 'value-4', value: '화이트', display_order: 1 },
        ])
      }
    })

    mockProductRepository.createVariant.mockResolvedValue({
      id: 'variant-1',
      sku: 'P001-S-블랙-12345678',
    })

    mockProductRepository.createVariantMappings.mockResolvedValue([])

    const params = {
      title: '사이즈+색상 옵션 상품',
      product_number: 'P001',
      price: 50000,
      inventory: 100,
      thumbnail_url: 'https://example.com/image.jpg',
      description: '테스트 상품입니다',
      optionType: 'both', // ✅ 사이즈+색상 옵션
      sizeOptions: ['S', 'M'],
      colorOptions: ['블랙', '화이트'],
      optionInventories: {
        'S-블랙': 25,
        'S-화이트': 25,
        'M-블랙': 25,
        'M-화이트': 25,
      },
      combinations: [
        { key: 'S-블랙', type: 'both', size: 'S', color: '블랙' },
        { key: 'S-화이트', type: 'both', size: 'S', color: '화이트' },
        { key: 'M-블랙', type: 'both', size: 'M', color: '블랙' },
        { key: 'M-화이트', type: 'both', size: 'M', color: '화이트' },
      ],
      status: 'active',
      is_live: true,
    }

    const result = await createProductUseCase.execute(params)

    // 검증: product_options 생성 (사이즈 1개 + 색상 1개 = 2개)
    expect(mockProductRepository.createProductOption).toHaveBeenCalledTimes(2)

    // 검증: option values 생성 (2번 호출)
    expect(mockProductRepository.createOptionValues).toHaveBeenCalledTimes(2)

    // 검증: variants 생성 (4개 조합)
    expect(mockProductRepository.createVariant).toHaveBeenCalledTimes(4)

    // 검증: variant mappings 생성 (4개, 각 variant는 2개씩 매핑)
    expect(mockProductRepository.createVariantMappings).toHaveBeenCalledTimes(4)
    // 첫 번째 variant mapping (S-블랙)
    expect(mockProductRepository.createVariantMappings).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ variant_id: 'variant-1' }),
      ])
    )

    expect(result).toHaveProperty('product')
  })

  /**
   * Test 5: 재고 계산 검증
   */
  test('옵션별 재고 합계를 정확히 계산한다', async () => {
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
      inventory: 999, // 사용 안 함 (optionInventories 사용)
      thumbnail_url: 'https://example.com/image.jpg',
      description: '테스트 상품입니다',
      optionType: 'size',
      sizeOptions: ['S', 'M', 'L'],
      optionInventories: {
        'size-S': 15,
        'size-M': 30,
        'size-L': 25,
      }, // 총 70개
      combinations: [
        { key: 'size-S', type: 'size', size: 'S' },
        { key: 'size-M', type: 'size', size: 'M' },
        { key: 'size-L', type: 'size', size: 'L' },
      ],
      status: 'active',
      is_live: true,
    }

    await createProductUseCase.execute(params)

    // 검증: 총 재고 계산 (15 + 30 + 25 = 70)
    expect(mockProductRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        inventory: 70, // ✅ 정확히 계산됨
      })
    )
  })

  /**
   * Test 6: SKU 생성 검증
   */
  test('Variant SKU를 정확히 생성한다', async () => {
    // ✅ Test 6 전용 mock: product_number을 PROD123으로 반환
    mockProductRepository.create.mockResolvedValue({
      id: '12345678-1234-1234-1234-123456789012',
      product_number: 'PROD123', // ✅ 테스트 파라미터와 일치
      title: 'SKU 테스트 상품',
      price: 50000,
      inventory: 50,
    })

    mockProductRepository.createProductOption.mockResolvedValue({
      id: 'option-1',
      name: '사이즈',
    })

    mockProductRepository.createOptionValues.mockResolvedValue([
      { id: 'value-1', value: 'M', display_order: 0 },
    ])

    mockProductRepository.createVariant.mockResolvedValue({
      id: 'variant-1',
      sku: 'PROD123-M-12345678',
    })

    mockProductRepository.createVariantMappings.mockResolvedValue([])

    const params = {
      title: 'SKU 테스트 상품',
      product_number: 'PROD123',
      price: 50000,
      inventory: 100,
      thumbnail_url: 'https://example.com/image.jpg',
      description: '테스트 상품입니다',
      optionType: 'size',
      sizeOptions: ['M'],
      optionInventories: {
        'size-M': 50,
      },
      combinations: [{ key: 'size-M', type: 'size', size: 'M' }],
      status: 'active',
      is_live: true,
    }

    await createProductUseCase.execute(params)

    // 검증: SKU 형식 (제품번호-옵션값-ProductID 앞 8자리)
    expect(mockProductRepository.createVariant).toHaveBeenCalledWith(
      '12345678-1234-1234-1234-123456789012',
      'PROD123-M-12345678', // ✅ 정확한 SKU 형식
      50,
      0
    )
  })
})
