import { NextResponse } from 'next/server'
import { supabaseAdmin, verifyAdminAuth } from '@/lib/supabaseAdmin'

// GET - 공급업체 목록 조회
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const adminEmail = searchParams.get('adminEmail')

    console.log('🔍 [공급업체 API] GET 요청:', { adminEmail })

    // 1. 관리자 인증 확인
    if (!adminEmail) {
      return NextResponse.json(
        { error: '관리자 인증 정보가 필요합니다' },
        { status: 401 }
      )
    }

    const isAdmin = await verifyAdminAuth(adminEmail)
    if (!isAdmin) {
      console.warn(`⚠️ 권한 없는 공급업체 조회 시도: ${adminEmail}`)
      return NextResponse.json(
        { error: '관리자 권한이 없습니다' },
        { status: 403 }
      )
    }

    console.log('✅ 관리자 권한 확인 완료:', adminEmail)

    // 2. Service Role로 공급업체 조회
    const { data: suppliers, error } = await supabaseAdmin
      .from('suppliers')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('❌ 공급업체 조회 오류:', error)
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      )
    }

    // 3. 각 업체의 상품 개수 가져오기
    const suppliersWithCount = await Promise.all(
      (suppliers || []).map(async (supplier) => {
        const { count, error: countError } = await supabaseAdmin
          .from('products')
          .select('id', { count: 'exact', head: true })
          .eq('supplier_id', supplier.id)

        return {
          ...supplier,
          product_count: countError ? 0 : (count || 0)
        }
      })
    )

    console.log(`✅ 조회된 공급업체 수: ${suppliersWithCount.length}`)

    return NextResponse.json({
      success: true,
      suppliers: suppliersWithCount
    })

  } catch (error) {
    console.error('❌ [공급업체 API] GET 에러:', error)
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}

// POST - 공급업체 생성
export async function POST(request) {
  try {
    const body = await request.json()
    const { adminEmail, ...supplierData } = body

    console.log('🔍 [공급업체 API] POST 요청:', { adminEmail })

    // 1. 관리자 인증 확인
    if (!adminEmail) {
      return NextResponse.json(
        { error: '관리자 인증 정보가 필요합니다' },
        { status: 401 }
      )
    }

    const isAdmin = await verifyAdminAuth(adminEmail)
    if (!isAdmin) {
      console.warn(`⚠️ 권한 없는 공급업체 생성 시도: ${adminEmail}`)
      return NextResponse.json(
        { error: '관리자 권한이 없습니다' },
        { status: 403 }
      )
    }

    // 2. 공급업체 생성
    const { data, error } = await supabaseAdmin
      .from('suppliers')
      .insert({
        ...supplierData,
        code: supplierData.code || `SUP${Date.now().toString().slice(-8)}`,
        is_active: true
      })
      .select()
      .single()

    if (error) {
      console.error('❌ 공급업체 생성 오류:', error)
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      )
    }

    console.log('✅ 공급업체 생성 완료:', data.id)

    return NextResponse.json({
      success: true,
      supplier: data
    })

  } catch (error) {
    console.error('❌ [공급업체 API] POST 에러:', error)
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}

// PUT - 공급업체 수정
export async function PUT(request) {
  try {
    const body = await request.json()
    const { adminEmail, id, ...updates } = body

    console.log('🔍 [공급업체 API] PUT 요청:', { adminEmail, id })

    // 1. 관리자 인증 확인
    if (!adminEmail) {
      return NextResponse.json(
        { error: '관리자 인증 정보가 필요합니다' },
        { status: 401 }
      )
    }

    const isAdmin = await verifyAdminAuth(adminEmail)
    if (!isAdmin) {
      console.warn(`⚠️ 권한 없는 공급업체 수정 시도: ${adminEmail}`)
      return NextResponse.json(
        { error: '관리자 권한이 없습니다' },
        { status: 403 }
      )
    }

    // 2. 공급업체 수정
    const { data, error } = await supabaseAdmin
      .from('suppliers')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('❌ 공급업체 수정 오류:', error)
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      )
    }

    console.log('✅ 공급업체 수정 완료:', data.id)

    return NextResponse.json({
      success: true,
      supplier: data
    })

  } catch (error) {
    console.error('❌ [공급업체 API] PUT 에러:', error)
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}

// DELETE - 공급업체 삭제
export async function DELETE(request) {
  try {
    const body = await request.json()
    const { adminEmail, id } = body

    console.log('🔍 [공급업체 API] DELETE 요청:', { adminEmail, id })

    // 1. 관리자 인증 확인
    if (!adminEmail) {
      return NextResponse.json(
        { error: '관리자 인증 정보가 필요합니다' },
        { status: 401 }
      )
    }

    const isAdmin = await verifyAdminAuth(adminEmail)
    if (!isAdmin) {
      console.warn(`⚠️ 권한 없는 공급업체 삭제 시도: ${adminEmail}`)
      return NextResponse.json(
        { error: '관리자 권한이 없습니다' },
        { status: 403 }
      )
    }

    // 2. 공급업체 삭제
    const { error } = await supabaseAdmin
      .from('suppliers')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('❌ 공급업체 삭제 오류:', error)
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      )
    }

    console.log('✅ 공급업체 삭제 완료:', id)

    return NextResponse.json({
      success: true
    })

  } catch (error) {
    console.error('❌ [공급업체 API] DELETE 에러:', error)
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}
