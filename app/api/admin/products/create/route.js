import { NextResponse } from 'next/server'
import { supabaseAdmin, verifyAdminAuth } from '@/lib/supabaseAdmin'

export async function POST(request) {
  try {
    const {
      // 기본 필드
      title,
      product_number,
      price,
      inventory,
      thumbnail_url,
      description,

      // 옵션 필드
      optionType,
      sizeOptions,
      colorOptions,
      optionInventories,
      combinations,

      // ⭐ 상세등록 추가 필드
      supplier_id,
      supplier_product_code,
      category,
      sub_category,
      purchase_price,
      purchase_date,
      compare_price,
      detailed_description,
      status, // 상태 (기본값: 'active')
      is_live, // 라이브 상품 여부 (기본값: true)

      adminEmail // 관리자 이메일
    } = await request.json()

    const registrationType = is_live !== false ? '빠른등록' : '상세등록'
    console.log(`🚀 [${registrationType} API] 상품 저장 시작:`, product_number)

    // 🔐 1. 관리자 권한 확인
    if (!adminEmail) {
      console.error('❌ adminEmail 누락')
      return NextResponse.json(
        { error: '관리자 인증 정보가 필요합니다' },
        { status: 401 }
      )
    }

    const isAdmin = await verifyAdminAuth(adminEmail)
    if (!isAdmin) {
      console.warn(`⚠️ 권한 없는 상품 생성 시도: ${adminEmail}`)
      return NextResponse.json(
        { error: '관리자 권한이 없습니다' },
        { status: 403 }
      )
    }
    console.log('✅ 관리자 권한 확인 완료:', adminEmail)

    // 총 재고 계산
    let totalInventory = inventory
    if (optionType !== 'none') {
      totalInventory = Object.values(optionInventories).reduce((sum, qty) => sum + (qty || 0), 0)
    }

    // 1. 제품 생성
    const productData = {
      // 기본 필드
      title: title.trim() || product_number,
      product_number: product_number,
      price: parseInt(price),
      inventory: totalInventory,
      thumbnail_url: thumbnail_url,
      description: description || '',
      status: status || 'active',
      is_featured: false,
      tags: ['NEW'],

      // 라이브 설정 (빠른등록: true, 상세등록: false)
      is_live: is_live !== undefined ? is_live : true,
      is_live_active: is_live !== undefined ? is_live : true,
      live_start_time: is_live !== false ? new Date().toISOString() : null
    }

    // ⭐ 상세등록 추가 필드 (있는 경우만)
    if (supplier_id) productData.supplier_id = supplier_id
    if (supplier_product_code) productData.supplier_product_code = supplier_product_code
    if (category) productData.category = category
    if (sub_category) productData.sub_category = sub_category
    if (purchase_price) productData.purchase_price = parseFloat(purchase_price)
    if (purchase_date) productData.purchase_date = purchase_date
    if (compare_price) productData.compare_price = parseFloat(compare_price)
    if (detailed_description) productData.detailed_description = detailed_description

    const { data: product, error: productError } = await supabaseAdmin
      .from('products')
      .insert(productData)
      .select()
      .single()

    if (productError) {
      console.error('❌ 상품 생성 실패:', productError)
      return NextResponse.json(
        { error: productError.message },
        { status: 500 }
      )
    }

    console.log(`✅ [${registrationType} API] 상품 생성 완료:`, product.id)

    // 2. 옵션이 있는 경우 Variant 시스템으로 저장
    if (optionType !== 'none' && combinations && combinations.length > 0) {
      console.log(`📦 [${registrationType} API] 옵션 저장 시작`)

      // 2-1. product_options 생성
      const optionsToCreate = []

      if (optionType === 'size' || optionType === 'both') {
        optionsToCreate.push({ name: '사이즈', values: sizeOptions })
      }
      if (optionType === 'color' || optionType === 'both') {
        optionsToCreate.push({ name: '색상', values: colorOptions })
      }

      const createdOptionValues = {}

      for (const option of optionsToCreate) {
        // product_options INSERT
        const { data: createdOption, error: optionError } = await supabaseAdmin
          .from('product_options')
          .insert({
            product_id: product.id,
            name: option.name,
            display_order: 0,
            is_required: false
          })
          .select()
          .single()

        if (optionError) {
          console.error('❌ 옵션 생성 실패:', optionError)
          throw optionError
        }

        console.log(`  ✅ 옵션 생성: ${option.name}`)

        // product_option_values INSERT
        const valuesToInsert = option.values.map((value, index) => ({
          option_id: createdOption.id,
          value: value,
          display_order: index
        }))

        const { data: createdValues, error: valuesError } = await supabaseAdmin
          .from('product_option_values')
          .insert(valuesToInsert)
          .select()

        if (valuesError) {
          console.error('❌ 옵션값 생성 실패:', valuesError)
          throw valuesError
        }

        // 매핑 저장
        createdOptionValues[option.name] = {}
        createdValues.forEach(val => {
          createdOptionValues[option.name][val.value] = val.id
        })
        console.log(`  ✅ 옵션값 ${createdValues.length}개 생성`)
      }

      // 2-2. product_variants 생성 (조합별로)
      console.log(`🔀 [${registrationType} API] Variant 생성 시작`)

      // Product ID 앞 8자리 추출 (SKU 유니크 보장)
      const productIdShort = product.id.substring(0, 8)

      for (const combo of combinations) {
        // SKU 생성 (제품번호-옵션값-ProductID)
        let sku = `${product_number}-${productIdShort}`
        if (combo.type === 'size') {
          sku = `${product_number}-${combo.size}-${productIdShort}`
        } else if (combo.type === 'color') {
          sku = `${product_number}-${combo.color}-${productIdShort}`
        } else if (combo.type === 'both') {
          sku = `${product_number}-${combo.size}-${combo.color}-${productIdShort}`
        }

        // 재고
        const variantInventory = optionInventories[combo.key] || 0

        // product_variants INSERT
        const { data: variant, error: variantError } = await supabaseAdmin
          .from('product_variants')
          .insert({
            product_id: product.id,
            sku: sku,
            inventory: variantInventory,
            price_adjustment: 0,
            is_active: true
          })
          .select()
          .single()

        if (variantError) {
          console.error('❌ Variant 생성 실패:', variantError)
          throw variantError
        }

        // 2-3. variant_option_values 매핑
        const mappings = []
        if (combo.type === 'size') {
          mappings.push({
            variant_id: variant.id,
            option_value_id: createdOptionValues['사이즈'][combo.size]
          })
        } else if (combo.type === 'color') {
          mappings.push({
            variant_id: variant.id,
            option_value_id: createdOptionValues['색상'][combo.color]
          })
        } else if (combo.type === 'both') {
          mappings.push({
            variant_id: variant.id,
            option_value_id: createdOptionValues['사이즈'][combo.size]
          })
          mappings.push({
            variant_id: variant.id,
            option_value_id: createdOptionValues['색상'][combo.color]
          })
        }

        const { error: mappingError } = await supabaseAdmin
          .from('variant_option_values')
          .insert(mappings)

        if (mappingError) {
          console.error('❌ Variant 매핑 실패:', mappingError)
          throw mappingError
        }

        console.log(`  ✅ Variant 생성: ${sku} (재고: ${variantInventory})`)
      }

      console.log(`✅ [${registrationType} API] 모든 Variant 생성 완료`)
    }

    console.log(`✅ [${registrationType} API] 상품 저장 완료:`, product.id)

    return NextResponse.json({ product })
  } catch (error) {
    console.error('❌ [상품등록 API] 에러:', error)
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}
