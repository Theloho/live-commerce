-- ==========================================
-- Live Commerce Database Schema
-- ==========================================

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "unaccent";

-- ==========================================
-- Custom Types
-- ==========================================

-- User roles
CREATE TYPE user_role AS ENUM ('customer', 'seller', 'admin', 'moderator');

-- User status
CREATE TYPE user_status AS ENUM ('active', 'inactive', 'suspended', 'banned');

-- Order status
CREATE TYPE order_status AS ENUM (
  'pending',
  'confirmed',
  'preparing',
  'shipped',
  'delivered',
  'cancelled',
  'refunded'
);

-- Payment status
CREATE TYPE payment_status AS ENUM (
  'pending',
  'paid',
  'failed',
  'cancelled',
  'refunded',
  'partial_refund'
);

-- Payment method
CREATE TYPE payment_method AS ENUM (
  'card',
  'bank_transfer',
  'virtual_account',
  'kakao_pay',
  'naver_pay',
  'payco',
  'point'
);

-- Broadcast status
CREATE TYPE broadcast_status AS ENUM ('scheduled', 'live', 'ended', 'cancelled');

-- Product status
CREATE TYPE product_status AS ENUM ('active', 'inactive', 'sold_out', 'discontinued');

-- Shipping method
CREATE TYPE shipping_method AS ENUM (
  'standard',
  'express',
  'same_day',
  'dawn',
  'pickup'
);

-- ==========================================
-- Core Tables
-- ==========================================

-- Extended user profiles table
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(100),
  nickname VARCHAR(50) UNIQUE,
  phone VARCHAR(20),
  birth_date DATE,
  gender VARCHAR(10),
  role user_role DEFAULT 'customer',
  status user_status DEFAULT 'active',

  -- Profile details
  avatar_url TEXT,
  bio TEXT,
  website VARCHAR(255),

  -- Business info (for sellers)
  business_name VARCHAR(255),
  business_number VARCHAR(50),
  business_address TEXT,

  -- Preferences
  marketing_agreed BOOLEAN DEFAULT false,
  notification_agreed BOOLEAN DEFAULT true,
  sms_agreed BOOLEAN DEFAULT false,
  email_agreed BOOLEAN DEFAULT true,

  -- Stats
  total_points INTEGER DEFAULT 0,
  total_orders INTEGER DEFAULT 0,
  total_spent DECIMAL(12,2) DEFAULT 0,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_login_at TIMESTAMPTZ,
  email_verified_at TIMESTAMPTZ,
  phone_verified_at TIMESTAMPTZ
);

-- Categories table
CREATE TABLE categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  parent_id UUID REFERENCES categories(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL,
  description TEXT,
  image_url TEXT,
  icon VARCHAR(50),
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,

  -- SEO
  meta_title VARCHAR(255),
  meta_description TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Products table
CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  seller_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,

  -- Basic info
  title VARCHAR(255) NOT NULL,
  slug VARCHAR(255) UNIQUE NOT NULL,
  description TEXT,
  short_description VARCHAR(500),

  -- Pricing
  price DECIMAL(12,2) NOT NULL,
  compare_price DECIMAL(12,2), -- Original price for discount calculation
  cost_price DECIMAL(12,2), -- Cost for profit calculation

  -- Inventory
  sku VARCHAR(100) UNIQUE,
  stock_quantity INTEGER DEFAULT 0,
  min_stock_level INTEGER DEFAULT 0,
  track_inventory BOOLEAN DEFAULT true,

  -- Shipping
  weight DECIMAL(8,2), -- in kg
  length DECIMAL(8,2), -- in cm
  width DECIMAL(8,2),
  height DECIMAL(8,2),

  -- Status and visibility
  status product_status DEFAULT 'active',
  is_featured BOOLEAN DEFAULT false,
  is_digital BOOLEAN DEFAULT false,

  -- Purchase rules
  min_order_quantity INTEGER DEFAULT 1,
  max_order_quantity INTEGER,

  -- Media
  thumbnail_url TEXT,
  images JSONB DEFAULT '[]',
  videos JSONB DEFAULT '[]',

  -- SEO
  meta_title VARCHAR(255),
  meta_description TEXT,

  -- Stats
  view_count INTEGER DEFAULT 0,
  like_count INTEGER DEFAULT 0,
  review_count INTEGER DEFAULT 0,
  review_rating DECIMAL(3,2) DEFAULT 0,
  sales_count INTEGER DEFAULT 0,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  published_at TIMESTAMPTZ,
  featured_at TIMESTAMPTZ
);

-- Product variants table (for options like size, color)
CREATE TABLE product_variants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,

  title VARCHAR(255) NOT NULL,
  sku VARCHAR(100) UNIQUE,

  -- Pricing override
  price DECIMAL(12,2),
  compare_price DECIMAL(12,2),

  -- Inventory override
  stock_quantity INTEGER DEFAULT 0,

  -- Options (color: red, size: L, etc.)
  option1_name VARCHAR(50),
  option1_value VARCHAR(100),
  option2_name VARCHAR(50),
  option2_value VARCHAR(100),
  option3_name VARCHAR(50),
  option3_value VARCHAR(100),

  -- Media
  image_url TEXT,

  -- Status
  is_active BOOLEAN DEFAULT true,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Broadcasts table
CREATE TABLE broadcasts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  broadcaster_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- Basic info
  title VARCHAR(255) NOT NULL,
  description TEXT,
  thumbnail_url TEXT,

  -- Scheduling
  scheduled_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  duration_minutes INTEGER,

  -- Status
  status broadcast_status DEFAULT 'scheduled',

  -- Stream settings
  stream_key VARCHAR(255) UNIQUE,
  stream_url TEXT,
  playback_url TEXT,

  -- Interaction settings
  chat_enabled BOOLEAN DEFAULT true,
  reactions_enabled BOOLEAN DEFAULT true,
  comments_moderated BOOLEAN DEFAULT false,

  -- Stats
  max_viewers INTEGER DEFAULT 0,
  current_viewers INTEGER DEFAULT 0,
  total_views INTEGER DEFAULT 0,
  total_messages INTEGER DEFAULT 0,
  total_sales DECIMAL(12,2) DEFAULT 0,

  -- Metadata
  tags JSONB DEFAULT '[]',
  settings JSONB DEFAULT '{}',

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Broadcast products (products featured in broadcasts)
CREATE TABLE broadcast_products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  broadcast_id UUID NOT NULL REFERENCES broadcasts(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,

  -- Display settings
  display_order INTEGER DEFAULT 0,
  is_featured BOOLEAN DEFAULT false,

  -- Special pricing for live
  live_price DECIMAL(12,2),
  discount_percentage DECIMAL(5,2),

  -- Promotion
  promotion_text VARCHAR(255),
  limited_quantity INTEGER,
  sold_quantity INTEGER DEFAULT 0,

  -- Timing
  featured_at TIMESTAMPTZ,
  promoted_until TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(broadcast_id, product_id)
);

-- Broadcast viewers (for tracking who's watching)
CREATE TABLE broadcast_viewers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  broadcast_id UUID NOT NULL REFERENCES broadcasts(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,

  -- Session info
  session_id VARCHAR(255),
  ip_address INET,
  user_agent TEXT,

  -- Timing
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  last_seen_at TIMESTAMPTZ DEFAULT NOW(),
  left_at TIMESTAMPTZ,
  watch_duration INTEGER DEFAULT 0, -- in seconds

  -- Anonymous viewer info
  anonymous_id VARCHAR(255),
  country VARCHAR(2),
  device_type VARCHAR(50)
);

-- Broadcast messages (chat messages)
CREATE TABLE broadcast_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  broadcast_id UUID NOT NULL REFERENCES broadcasts(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,

  -- Message content
  content TEXT NOT NULL,
  type VARCHAR(20) DEFAULT 'text', -- text, reaction, system, product

  -- User info (for anonymous users)
  user_name VARCHAR(100),
  user_avatar_url TEXT,

  -- Moderation
  is_deleted BOOLEAN DEFAULT false,
  is_pinned BOOLEAN DEFAULT false,
  deleted_by UUID REFERENCES profiles(id),
  deleted_at TIMESTAMPTZ,

  -- Metadata
  metadata JSONB DEFAULT '{}',

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Orders table
CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  broadcast_id UUID REFERENCES broadcasts(id) ON DELETE SET NULL,

  -- Order numbers
  order_number VARCHAR(50) UNIQUE NOT NULL,

  -- Amounts
  subtotal DECIMAL(12,2) NOT NULL,
  tax_amount DECIMAL(12,2) DEFAULT 0,
  shipping_amount DECIMAL(12,2) DEFAULT 0,
  discount_amount DECIMAL(12,2) DEFAULT 0,
  total_amount DECIMAL(12,2) NOT NULL,

  -- Status
  status order_status DEFAULT 'pending',

  -- Shipping info
  shipping_method shipping_method DEFAULT 'standard',
  shipping_address JSONB NOT NULL,
  billing_address JSONB,

  -- Customer info
  customer_name VARCHAR(100) NOT NULL,
  customer_phone VARCHAR(20) NOT NULL,
  customer_email VARCHAR(255) NOT NULL,

  -- Special requests
  order_notes TEXT,
  gift_message TEXT,
  is_gift BOOLEAN DEFAULT false,

  -- Tracking
  tracking_number VARCHAR(100),
  tracking_company VARCHAR(50),
  estimated_delivery_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  confirmed_at TIMESTAMPTZ,
  shipped_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ
);

-- Order items table
CREATE TABLE order_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  variant_id UUID REFERENCES product_variants(id) ON DELETE SET NULL,

  -- Item details
  title VARCHAR(255) NOT NULL,
  variant_title VARCHAR(255),
  sku VARCHAR(100),

  -- Pricing (snapshot at time of order)
  price DECIMAL(12,2) NOT NULL,
  compare_price DECIMAL(12,2),
  quantity INTEGER NOT NULL,
  total_price DECIMAL(12,2) NOT NULL,

  -- Product snapshot
  product_snapshot JSONB,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Payments table
CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,

  -- Payment details
  payment_method payment_method NOT NULL,
  payment_provider VARCHAR(50), -- toss, iamport, etc.
  transaction_id VARCHAR(255) UNIQUE,

  -- Amounts
  amount DECIMAL(12,2) NOT NULL,
  fee DECIMAL(12,2) DEFAULT 0,

  -- Status
  status payment_status DEFAULT 'pending',

  -- Provider response
  provider_response JSONB,
  failure_reason TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  paid_at TIMESTAMPTZ,
  failed_at TIMESTAMPTZ,
  refunded_at TIMESTAMPTZ
);

-- Coupons table
CREATE TABLE coupons (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Basic info
  code VARCHAR(50) UNIQUE NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,

  -- Discount rules
  discount_type VARCHAR(20) NOT NULL, -- percentage, fixed_amount, free_shipping
  discount_value DECIMAL(12,2) NOT NULL,
  max_discount_amount DECIMAL(12,2),
  min_order_amount DECIMAL(12,2) DEFAULT 0,

  -- Usage limits
  usage_limit INTEGER,
  usage_count INTEGER DEFAULT 0,
  usage_limit_per_customer INTEGER DEFAULT 1,

  -- Validity
  valid_from TIMESTAMPTZ DEFAULT NOW(),
  valid_until TIMESTAMPTZ,

  -- Conditions
  applicable_products JSONB DEFAULT '[]',
  applicable_categories JSONB DEFAULT '[]',

  -- Status
  is_active BOOLEAN DEFAULT true,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Coupon usages table
CREATE TABLE coupon_usages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  coupon_id UUID NOT NULL REFERENCES coupons(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  order_id UUID REFERENCES orders(id) ON DELETE SET NULL,

  used_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(coupon_id, user_id, order_id)
);

-- Reviews table
CREATE TABLE reviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  order_id UUID REFERENCES orders(id) ON DELETE SET NULL,

  -- Review content
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  title VARCHAR(255),
  content TEXT,

  -- Media
  images JSONB DEFAULT '[]',

  -- Status
  is_verified BOOLEAN DEFAULT false, -- purchased verification
  is_featured BOOLEAN DEFAULT false,
  is_hidden BOOLEAN DEFAULT false,

  -- Interaction
  helpful_count INTEGER DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(product_id, user_id, order_id)
);

-- Wishlists table
CREATE TABLE wishlists (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,

  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(user_id, product_id)
);

-- Shopping carts table
CREATE TABLE carts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  session_id VARCHAR(255),

  -- Item details
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  variant_id UUID REFERENCES product_variants(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL DEFAULT 1,

  -- Selected options
  selected_options JSONB DEFAULT '{}',

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(user_id, product_id, variant_id, session_id)
);

-- ==========================================
-- Indexes for Performance
-- ==========================================

-- Profiles indexes
CREATE INDEX idx_profiles_email ON profiles(email);
CREATE INDEX idx_profiles_role ON profiles(role);
CREATE INDEX idx_profiles_status ON profiles(status);
CREATE INDEX idx_profiles_created_at ON profiles(created_at DESC);

-- Products indexes
CREATE INDEX idx_products_seller_id ON products(seller_id);
CREATE INDEX idx_products_category_id ON products(category_id);
CREATE INDEX idx_products_status ON products(status);
CREATE INDEX idx_products_is_featured ON products(is_featured);
CREATE INDEX idx_products_created_at ON products(created_at DESC);
CREATE INDEX idx_products_price ON products(price);
CREATE INDEX idx_products_review_rating ON products(review_rating DESC);
CREATE INDEX idx_products_sales_count ON products(sales_count DESC);

-- Search indexes (using English for better compatibility)
CREATE INDEX idx_products_search ON products USING GIN (to_tsvector('english', title || ' ' || COALESCE(description, '')));
CREATE INDEX idx_categories_search ON categories USING GIN (to_tsvector('english', name || ' ' || COALESCE(description, '')));

-- Broadcasts indexes
CREATE INDEX idx_broadcasts_broadcaster_id ON broadcasts(broadcaster_id);
CREATE INDEX idx_broadcasts_status ON broadcasts(status);
CREATE INDEX idx_broadcasts_scheduled_at ON broadcasts(scheduled_at DESC);
CREATE INDEX idx_broadcasts_started_at ON broadcasts(started_at DESC);

-- Broadcast viewers indexes
CREATE INDEX idx_broadcast_viewers_broadcast_id ON broadcast_viewers(broadcast_id);
CREATE INDEX idx_broadcast_viewers_user_id ON broadcast_viewers(user_id);
CREATE INDEX idx_broadcast_viewers_joined_at ON broadcast_viewers(joined_at DESC);

-- Orders indexes
CREATE INDEX idx_orders_customer_id ON orders(customer_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_created_at ON orders(created_at DESC);
CREATE INDEX idx_orders_order_number ON orders(order_number);

-- Order items indexes
CREATE INDEX idx_order_items_order_id ON order_items(order_id);
CREATE INDEX idx_order_items_product_id ON order_items(product_id);

-- ==========================================
-- Functions and Triggers
-- ==========================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at triggers to all tables
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_categories_updated_at BEFORE UPDATE ON categories FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON products FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_product_variants_updated_at BEFORE UPDATE ON product_variants FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_broadcasts_updated_at BEFORE UPDATE ON broadcasts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_broadcast_products_updated_at BEFORE UPDATE ON broadcast_products FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON orders FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_order_items_updated_at BEFORE UPDATE ON order_items FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_payments_updated_at BEFORE UPDATE ON payments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_coupons_updated_at BEFORE UPDATE ON coupons FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_reviews_updated_at BEFORE UPDATE ON reviews FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_carts_updated_at BEFORE UPDATE ON carts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to generate order numbers
CREATE OR REPLACE FUNCTION generate_order_number()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.order_number IS NULL THEN
        NEW.order_number := 'ORD-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(nextval('order_number_seq')::TEXT, 6, '0');
    END IF;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create sequence for order numbers
CREATE SEQUENCE IF NOT EXISTS order_number_seq;

-- Apply order number trigger
CREATE TRIGGER set_order_number BEFORE INSERT ON orders FOR EACH ROW EXECUTE FUNCTION generate_order_number();

-- Function to update product stats after review
CREATE OR REPLACE FUNCTION update_product_review_stats()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE products
        SET
            review_count = (SELECT COUNT(*) FROM reviews WHERE product_id = NEW.product_id AND NOT is_hidden),
            review_rating = (SELECT AVG(rating) FROM reviews WHERE product_id = NEW.product_id AND NOT is_hidden)
        WHERE id = NEW.product_id;
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
        UPDATE products
        SET
            review_count = (SELECT COUNT(*) FROM reviews WHERE product_id = NEW.product_id AND NOT is_hidden),
            review_rating = (SELECT AVG(rating) FROM reviews WHERE product_id = NEW.product_id AND NOT is_hidden)
        WHERE id = NEW.product_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE products
        SET
            review_count = (SELECT COUNT(*) FROM reviews WHERE product_id = OLD.product_id AND NOT is_hidden),
            review_rating = (SELECT COALESCE(AVG(rating), 0) FROM reviews WHERE product_id = OLD.product_id AND NOT is_hidden)
        WHERE id = OLD.product_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_product_review_stats_trigger
    AFTER INSERT OR UPDATE OR DELETE ON reviews
    FOR EACH ROW EXECUTE FUNCTION update_product_review_stats();

-- RPC Functions for business logic
CREATE OR REPLACE FUNCTION join_broadcast(broadcast_id UUID, user_id UUID DEFAULT NULL)
RETURNS void AS $$
BEGIN
    INSERT INTO broadcast_viewers (broadcast_id, user_id, joined_at)
    VALUES (broadcast_id, user_id, NOW())
    ON CONFLICT (broadcast_id, user_id)
    DO UPDATE SET last_seen_at = NOW();

    UPDATE broadcasts
    SET current_viewers = (
        SELECT COUNT(DISTINCT COALESCE(user_id, session_id))
        FROM broadcast_viewers
        WHERE broadcast_viewers.broadcast_id = join_broadcast.broadcast_id
        AND left_at IS NULL
    )
    WHERE id = broadcast_id;
END;
$$ language 'plpgsql';

CREATE OR REPLACE FUNCTION leave_broadcast(broadcast_id UUID, user_id UUID DEFAULT NULL)
RETURNS void AS $$
BEGIN
    UPDATE broadcast_viewers
    SET left_at = NOW(),
        watch_duration = EXTRACT(EPOCH FROM (NOW() - joined_at))
    WHERE broadcast_viewers.broadcast_id = leave_broadcast.broadcast_id
    AND broadcast_viewers.user_id = leave_broadcast.user_id;

    UPDATE broadcasts
    SET current_viewers = (
        SELECT COUNT(DISTINCT COALESCE(user_id, session_id))
        FROM broadcast_viewers
        WHERE broadcast_viewers.broadcast_id = leave_broadcast.broadcast_id
        AND left_at IS NULL
    )
    WHERE id = broadcast_id;
END;
$$ language 'plpgsql';

CREATE OR REPLACE FUNCTION update_viewer_heartbeat(broadcast_id UUID, user_id UUID)
RETURNS void AS $$
BEGIN
    UPDATE broadcast_viewers
    SET last_seen_at = NOW()
    WHERE broadcast_viewers.broadcast_id = update_viewer_heartbeat.broadcast_id
    AND broadcast_viewers.user_id = update_viewer_heartbeat.user_id;
END;
$$ language 'plpgsql';