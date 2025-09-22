const { createClient } = require('@supabase/supabase-js')

// Supabase configuration
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase configuration')
  console.log('Make sure .env.local has:')
  console.log('- NEXT_PUBLIC_SUPABASE_URL')
  console.log('- NEXT_PUBLIC_SUPABASE_ANON_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

// Test data templates
const testData = {
  categories: [
    {
      name: '패션',
      slug: 'fashion',
      description: '의류, 신발, 액세서리',
      sort_order: 1,
      is_active: true
    },
    {
      name: '뷰티',
      slug: 'beauty',
      description: '화장품, 스킨케어',
      sort_order: 2,
      is_active: true
    },
    {
      name: '라이프스타일',
      slug: 'lifestyle',
      description: '홈데코, 키친용품',
      sort_order: 3,
      is_active: true
    },
    {
      name: '전자기기',
      slug: 'electronics',
      description: '스마트폰, 가전제품',
      sort_order: 4,
      is_active: true
    }
  ],

  products: [
    {
      title: '겨울 니트 원피스',
      slug: 'winter-knit-dress',
      description: '따뜻하고 부드러운 겨울 니트 원피스입니다.',
      short_description: '겨울 니트 원피스',
      price: 89000,
      compare_price: 129000,
      sku: 'DRESS001',
      stock_quantity: 50,
      status: 'active',
      is_featured: true,
      thumbnail_url: 'https://picsum.photos/400/400?random=1',
      images: JSON.stringify(['https://picsum.photos/400/400?random=1']),
      min_order_quantity: 1,
      view_count: 120,
      like_count: 15,
      review_count: 8,
      review_rating: 4.5,
      sales_count: 25
    },
    {
      title: '남성 캐주얼 셔츠',
      slug: 'mens-casual-shirt',
      description: '편안한 착용감의 캐주얼 셔츠입니다.',
      short_description: '캐주얼 셔츠',
      price: 45000,
      compare_price: 65000,
      sku: 'SHIRT001',
      stock_quantity: 30,
      status: 'active',
      is_featured: false,
      thumbnail_url: 'https://picsum.photos/400/400?random=2',
      images: JSON.stringify(['https://picsum.photos/400/400?random=2']),
      min_order_quantity: 1,
      view_count: 80,
      like_count: 8,
      review_count: 5,
      review_rating: 4.2,
      sales_count: 12
    },
    {
      title: '비타민C 세럼',
      slug: 'vitamin-c-serum',
      description: '브라이트닝 효과의 비타민C 세럼입니다.',
      short_description: '비타민C 세럼',
      price: 35000,
      compare_price: 50000,
      sku: 'SERUM001',
      stock_quantity: 100,
      status: 'active',
      is_featured: true,
      thumbnail_url: 'https://picsum.photos/400/400?random=3',
      images: JSON.stringify(['https://picsum.photos/400/400?random=3']),
      min_order_quantity: 1,
      view_count: 200,
      like_count: 45,
      review_count: 32,
      review_rating: 4.6,
      sales_count: 89
    },
    {
      title: '무선 이어폰',
      slug: 'wireless-earbuds',
      description: '노이즈 캔슬링 무선 이어폰입니다.',
      short_description: '무선 이어폰',
      price: 150000,
      compare_price: 200000,
      sku: 'EARBUDS001',
      stock_quantity: 50,
      status: 'active',
      is_featured: true,
      thumbnail_url: 'https://picsum.photos/400/400?random=4',
      images: JSON.stringify(['https://picsum.photos/400/400?random=4']),
      min_order_quantity: 1,
      view_count: 180,
      like_count: 35,
      review_count: 25,
      review_rating: 4.5,
      sales_count: 42
    }
  ],

  broadcasts: [
    {
      title: '🔥 겨울 패션 특가 라이브 🔥',
      description: '겨울 신상품 최대 50% 할인! 다양한 패션 아이템을 특가로 만나보세요.',
      thumbnail_url: 'https://picsum.photos/800/450?random=101',
      scheduled_at: new Date(Date.now() - 3600000).toISOString(), // 1시간 전
      started_at: new Date(Date.now() - 2700000).toISOString(), // 45분 전
      status: 'live',
      stream_key: 'live_stream_001',
      chat_enabled: true,
      reactions_enabled: true,
      max_viewers: 1200,
      current_viewers: 850,
      total_views: 2500,
      tags: JSON.stringify(['fashion', 'winter', 'sale'])
    },
    {
      title: '✨ 뷰티 신제품 런칭 ✨',
      description: '새로 출시되는 스킨케어 제품들을 가장 먼저 만나보세요!',
      thumbnail_url: 'https://picsum.photos/800/450?random=102',
      scheduled_at: new Date(Date.now() + 10800000).toISOString(), // 3시간 후
      started_at: null,
      status: 'scheduled',
      stream_key: 'scheduled_stream_002',
      chat_enabled: true,
      reactions_enabled: true,
      max_viewers: 0,
      current_viewers: 0,
      total_views: 0,
      tags: JSON.stringify(['beauty', 'skincare', 'new'])
    },
    {
      title: '🎧 전자기기 할인 쇼',
      description: '인기 전자기기들을 특가로! 이어폰, 스마트워치 등',
      thumbnail_url: 'https://picsum.photos/800/450?random=103',
      scheduled_at: new Date(Date.now() + 86400000).toISOString(), // 1일 후
      started_at: null,
      status: 'scheduled',
      stream_key: 'scheduled_stream_003',
      chat_enabled: true,
      reactions_enabled: true,
      max_viewers: 0,
      current_viewers: 0,
      total_views: 0,
      tags: JSON.stringify(['electronics', 'gadgets', 'sale'])
    }
  ]
}

// Helper functions
async function checkTableExists(tableName) {
  const { data, error } = await supabase
    .from(tableName)
    .select('*')
    .limit(1)

  if (error) {
    console.log(`⚠️  Table '${tableName}' not found or not accessible:`, error.message)
    return false
  }
  return true
}

async function clearTable(tableName) {
  console.log(`🗑️  Clearing ${tableName}...`)
  const { error } = await supabase
    .from(tableName)
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000') // Delete all rows

  if (error) {
    console.log(`⚠️  Could not clear ${tableName}:`, error.message)
  } else {
    console.log(`✅ Cleared ${tableName}`)
  }
}

async function insertData(tableName, data, skipKeys = []) {
  console.log(`\n📝 Inserting data into ${tableName}...`)

  if (!Array.isArray(data) || data.length === 0) {
    console.log(`⚠️  No data provided for ${tableName}`)
    return []
  }

  const results = []
  for (const item of data) {
    // Remove keys that should be skipped (like foreign keys)
    const filteredItem = { ...item }
    skipKeys.forEach(key => delete filteredItem[key])

    const { data: insertedData, error } = await supabase
      .from(tableName)
      .insert(filteredItem)
      .select()
      .single()

    if (error) {
      console.log(`❌ Failed to insert into ${tableName}:`, error.message)
      console.log('Data:', filteredItem)
    } else {
      console.log(`✅ Inserted: ${insertedData.title || insertedData.name || insertedData.id}`)
      results.push(insertedData)
    }
  }

  return results
}

async function insertBroadcastProducts(broadcasts, products) {
  console.log(`\n📝 Creating broadcast-product relationships...`)

  if (!broadcasts.length || !products.length) {
    console.log(`⚠️  No broadcasts or products available for relationships`)
    return
  }

  const liveBroadcast = broadcasts.find(b => b.status === 'live')
  const scheduledBroadcasts = broadcasts.filter(b => b.status === 'scheduled')

  const relationships = []

  // Add products to live broadcast
  if (liveBroadcast) {
    for (let i = 0; i < Math.min(2, products.length); i++) {
      const product = products[i]
      relationships.push({
        broadcast_id: liveBroadcast.id,
        product_id: product.id,
        display_order: i + 1,
        is_featured: i === 0,
        live_price: Math.floor(product.price * 0.8), // 20% discount
        discount_percentage: 20,
        promotion_text: i === 0 ? '라이브 한정 특가!' : '추가 할인!',
        limited_quantity: 50,
        sold_quantity: Math.floor(Math.random() * 20)
      })
    }
  }

  // Add products to scheduled broadcasts
  scheduledBroadcasts.forEach((broadcast, broadcastIndex) => {
    const productIndex = broadcastIndex + 2
    if (productIndex < products.length) {
      const product = products[productIndex]
      relationships.push({
        broadcast_id: broadcast.id,
        product_id: product.id,
        display_order: 1,
        is_featured: true,
        live_price: Math.floor(product.price * 0.85), // 15% discount
        discount_percentage: 15,
        promotion_text: '런칭 기념 특가!',
        limited_quantity: 30,
        sold_quantity: 0
      })
    }
  })

  // Insert relationships
  for (const relationship of relationships) {
    const { data, error } = await supabase
      .from('broadcast_products')
      .insert(relationship)
      .select()
      .single()

    if (error) {
      console.log(`❌ Failed to create broadcast-product relationship:`, error.message)
    } else {
      console.log(`✅ Connected broadcast to product`)
    }
  }
}

// Create a dummy seller profile for foreign key constraints
async function createDummySeller() {
  console.log('👤 Creating dummy seller profile...')

  // Generate a UUID for the seller
  const sellerId = crypto.randomUUID()

  const dummySeller = {
    id: sellerId,
    email: 'demo-seller@example.com',
    name: 'Demo Seller',
    nickname: 'demoseller',
    role: 'seller',
    status: 'active',
    business_name: 'Demo Store'
  }

  const { data, error } = await supabase
    .from('profiles')
    .upsert(dummySeller, { onConflict: 'email' })
    .select()
    .single()

  if (error) {
    console.log('❌ Failed to create dummy seller:', error.message)
    return null
  }

  console.log('✅ Created dummy seller:', data.name)
  return data
}

// Main execution
async function main() {
  console.log('🚀 Live Commerce Test Data Setup\n')
  console.log('📡 Connecting to Supabase...')

  try {
    // Test connection
    const { data: connectionTest, error: connectionError } = await supabase
      .from('categories')
      .select('count')
      .limit(1)

    if (connectionError) {
      console.error('❌ Failed to connect to Supabase:', connectionError.message)
      process.exit(1)
    }

    console.log('✅ Connected to Supabase successfully\n')

    // Create dummy seller for foreign key requirements
    const dummySeller = await createDummySeller()
    if (!dummySeller) {
      console.error('❌ Cannot proceed without dummy seller')
      process.exit(1)
    }

    // Add seller_id to products and broadcaster_id to broadcasts
    const productsWithSeller = testData.products.map(product => ({
      ...product,
      seller_id: dummySeller.id
    }))

    const broadcastsWithBroadcaster = testData.broadcasts.map(broadcast => ({
      ...broadcast,
      broadcaster_id: dummySeller.id
    }))

    // Define insertion order
    const insertionOrder = [
      { name: 'categories', data: testData.categories },
      { name: 'products', data: productsWithSeller },
      { name: 'broadcasts', data: broadcastsWithBroadcaster }
    ]

    const results = {}

    // Clear existing data first
    console.log('🧹 Clearing existing test data...')
    await clearTable('broadcast_products')
    for (const table of insertionOrder.reverse()) {
      await clearTable(table.name)
    }
    insertionOrder.reverse() // Restore original order

    console.log('\n📊 Inserting test data...')

    // Insert data in order
    for (const table of insertionOrder) {
      if (await checkTableExists(table.name)) {
        results[table.name] = await insertData(table.name, table.data)
      }
    }

    // Create broadcast-product relationships
    if (results.broadcasts && results.products) {
      await insertBroadcastProducts(results.broadcasts, results.products)
    }

    // Summary
    console.log('\n📈 Summary:')
    Object.keys(results).forEach(tableName => {
      console.log(`  ${tableName}: ${results[tableName].length} records`)
    })

    console.log('\n✅ Test data setup completed successfully!')
    console.log('\n🔍 You can now:')
    console.log('  - View categories in your app')
    console.log('  - Browse products')
    console.log('  - Check live broadcasts')
    console.log('  - See broadcast-product relationships')

  } catch (error) {
    console.error('❌ Unexpected error:', error.message)
    process.exit(1)
  }
}

// Run if called directly
if (require.main === module) {
  main()
}

module.exports = { main }