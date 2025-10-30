/**
 * Lock 테스트용 간단한 API
 * ProductRepository.updateInventoryWithLock() 직접 호출
 */

import { NextResponse } from 'next/server'
import ProductRepository from '@/lib/repositories/ProductRepository'

export async function POST(request) {
  try {
    const { productId, quantityChange } = await request.json()

    // Lock 메서드 직접 호출
    const result = await ProductRepository.updateInventoryWithLock(
      productId,
      quantityChange
    )

    return NextResponse.json({
      success: true,
      result
    })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error.message
      },
      { status: 500 }
    )
  }
}
