-- ==========================================
-- Row Level Security (RLS) Policies
-- Live Commerce Database
-- ==========================================

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE broadcasts ENABLE ROW LEVEL SECURITY;
ALTER TABLE broadcast_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE broadcast_viewers ENABLE ROW LEVEL SECURITY;
ALTER TABLE broadcast_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE coupon_usages ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE wishlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE carts ENABLE ROW LEVEL SECURITY;

-- ==========================================
-- Helper Functions for RLS
-- ==========================================

-- Function to get current user's role
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS user_role AS $$
DECLARE
    user_role_val user_role;
BEGIN
    SELECT role INTO user_role_val
    FROM profiles
    WHERE id = auth.uid();

    RETURN COALESCE(user_role_val, 'customer');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user is admin or moderator
CREATE OR REPLACE FUNCTION is_admin_or_moderator()
RETURNS boolean AS $$
BEGIN
    RETURN get_user_role() IN ('admin', 'moderator');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user is seller
CREATE OR REPLACE FUNCTION is_seller()
RETURNS boolean AS $$
BEGIN
    RETURN get_user_role() = 'seller';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user owns the resource
CREATE OR REPLACE FUNCTION owns_resource(owner_id UUID)
RETURNS boolean AS $$
BEGIN
    RETURN auth.uid() = owner_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==========================================
-- PROFILES Table Policies
-- ==========================================

-- Users can view all active profiles (for public info)
CREATE POLICY "profiles_select_public"
ON profiles FOR SELECT
USING (status = 'active');

-- Users can view and update their own profile
CREATE POLICY "profiles_select_own"
ON profiles FOR SELECT
USING (auth.uid() = id);

CREATE POLICY "profiles_update_own"
ON profiles FOR UPDATE
USING (auth.uid() = id);

-- Users can insert their own profile (during signup)
CREATE POLICY "profiles_insert_own"
ON profiles FOR INSERT
WITH CHECK (auth.uid() = id);

-- Admin can do everything
CREATE POLICY "profiles_admin_all"
ON profiles FOR ALL
USING (is_admin_or_moderator());

-- ==========================================
-- CATEGORIES Table Policies
-- ==========================================

-- Everyone can view active categories
CREATE POLICY "categories_select_active"
ON categories FOR SELECT
USING (is_active = true);

-- Admin can do everything
CREATE POLICY "categories_admin_all"
ON categories FOR ALL
USING (is_admin_or_moderator());

-- ==========================================
-- PRODUCTS Table Policies
-- ==========================================

-- Everyone can view active products
CREATE POLICY "products_select_active"
ON products FOR SELECT
USING (status = 'active');

-- Sellers can view, insert, and update their own products
CREATE POLICY "products_seller_own"
ON products FOR ALL
USING (auth.uid() = seller_id);

-- Admin can do everything
CREATE POLICY "products_admin_all"
ON products FOR ALL
USING (is_admin_or_moderator());

-- ==========================================
-- PRODUCT_VARIANTS Table Policies
-- ==========================================

-- Everyone can view variants of active products
CREATE POLICY "variants_select_public"
ON product_variants FOR SELECT
USING (
    is_active = true AND
    EXISTS (
        SELECT 1 FROM products
        WHERE products.id = product_variants.product_id
        AND products.status = 'active'
    )
);

-- Sellers can manage variants of their own products
CREATE POLICY "variants_seller_own"
ON product_variants FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM products
        WHERE products.id = product_variants.product_id
        AND products.seller_id = auth.uid()
    )
);

-- Admin can do everything
CREATE POLICY "variants_admin_all"
ON product_variants FOR ALL
USING (is_admin_or_moderator());

-- ==========================================
-- BROADCASTS Table Policies
-- ==========================================

-- Everyone can view live/scheduled broadcasts
CREATE POLICY "broadcasts_select_public"
ON broadcasts FOR SELECT
USING (status IN ('live', 'scheduled'));

-- Broadcasters can manage their own broadcasts
CREATE POLICY "broadcasts_broadcaster_own"
ON broadcasts FOR ALL
USING (auth.uid() = broadcaster_id);

-- Admin can do everything
CREATE POLICY "broadcasts_admin_all"
ON broadcasts FOR ALL
USING (is_admin_or_moderator());

-- ==========================================
-- BROADCAST_PRODUCTS Table Policies
-- ==========================================

-- Everyone can view products in public broadcasts
CREATE POLICY "broadcast_products_select_public"
ON broadcast_products FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM broadcasts
        WHERE broadcasts.id = broadcast_products.broadcast_id
        AND broadcasts.status IN ('live', 'scheduled')
    )
);

-- Broadcasters can manage products in their own broadcasts
CREATE POLICY "broadcast_products_broadcaster_own"
ON broadcast_products FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM broadcasts
        WHERE broadcasts.id = broadcast_products.broadcast_id
        AND broadcasts.broadcaster_id = auth.uid()
    )
);

-- Admin can do everything
CREATE POLICY "broadcast_products_admin_all"
ON broadcast_products FOR ALL
USING (is_admin_or_moderator());

-- ==========================================
-- BROADCAST_VIEWERS Table Policies
-- ==========================================

-- Users can view viewer counts (anonymized)
CREATE POLICY "broadcast_viewers_select_anonymous"
ON broadcast_viewers FOR SELECT
USING (true);

-- Users can insert/update their own viewer records
CREATE POLICY "broadcast_viewers_user_own"
ON broadcast_viewers FOR INSERT
WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "broadcast_viewers_update_own"
ON broadcast_viewers FOR UPDATE
USING (auth.uid() = user_id);

-- Broadcasters can view all viewers of their broadcasts
CREATE POLICY "broadcast_viewers_broadcaster"
ON broadcast_viewers FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM broadcasts
        WHERE broadcasts.id = broadcast_viewers.broadcast_id
        AND broadcasts.broadcaster_id = auth.uid()
    )
);

-- Admin can do everything
CREATE POLICY "broadcast_viewers_admin_all"
ON broadcast_viewers FOR ALL
USING (is_admin_or_moderator());

-- ==========================================
-- BROADCAST_MESSAGES Table Policies
-- ==========================================

-- Everyone can view messages in public broadcasts
CREATE POLICY "broadcast_messages_select_public"
ON broadcast_messages FOR SELECT
USING (
    NOT is_deleted AND
    EXISTS (
        SELECT 1 FROM broadcasts
        WHERE broadcasts.id = broadcast_messages.broadcast_id
        AND broadcasts.status = 'live'
        AND broadcasts.chat_enabled = true
    )
);

-- Authenticated users can send messages
CREATE POLICY "broadcast_messages_insert_authenticated"
ON broadcast_messages FOR INSERT
WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (
        SELECT 1 FROM broadcasts
        WHERE broadcasts.id = broadcast_messages.broadcast_id
        AND broadcasts.status = 'live'
        AND broadcasts.chat_enabled = true
    )
);

-- Users can update their own messages (within time limit)
CREATE POLICY "broadcast_messages_update_own"
ON broadcast_messages FOR UPDATE
USING (
    auth.uid() = user_id AND
    created_at > NOW() - INTERVAL '5 minutes'
);

-- Broadcasters and moderators can delete messages in their broadcasts
CREATE POLICY "broadcast_messages_moderate"
ON broadcast_messages FOR UPDATE
USING (
    (is_admin_or_moderator() OR
     EXISTS (
         SELECT 1 FROM broadcasts
         WHERE broadcasts.id = broadcast_messages.broadcast_id
         AND broadcasts.broadcaster_id = auth.uid()
     ))
);

-- ==========================================
-- ORDERS Table Policies
-- ==========================================

-- Users can view their own orders
CREATE POLICY "orders_select_own"
ON orders FOR SELECT
USING (auth.uid() = customer_id);

-- Users can create their own orders
CREATE POLICY "orders_insert_own"
ON orders FOR INSERT
WITH CHECK (auth.uid() = customer_id);

-- Users can update their own orders (limited fields and conditions)
CREATE POLICY "orders_update_own"
ON orders FOR UPDATE
USING (
    auth.uid() = customer_id AND
    status IN ('pending', 'confirmed') AND
    created_at > NOW() - INTERVAL '1 hour'
);

-- Sellers can view orders containing their products
CREATE POLICY "orders_seller_view"
ON orders FOR SELECT
USING (
    is_seller() AND
    EXISTS (
        SELECT 1 FROM order_items oi
        JOIN products p ON oi.product_id = p.id
        WHERE oi.order_id = orders.id AND p.seller_id = auth.uid()
    )
);

-- Admin can do everything
CREATE POLICY "orders_admin_all"
ON orders FOR ALL
USING (is_admin_or_moderator());

-- ==========================================
-- ORDER_ITEMS Table Policies
-- ==========================================

-- Users can view items in their own orders
CREATE POLICY "order_items_select_own"
ON order_items FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM orders
        WHERE orders.id = order_items.order_id
        AND orders.customer_id = auth.uid()
    )
);

-- Users can insert items into their own orders
CREATE POLICY "order_items_insert_own"
ON order_items FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM orders
        WHERE orders.id = order_items.order_id
        AND orders.customer_id = auth.uid()
        AND orders.status = 'pending'
    )
);

-- Sellers can view items of their products
CREATE POLICY "order_items_seller_view"
ON order_items FOR SELECT
USING (
    is_seller() AND
    EXISTS (
        SELECT 1 FROM products
        WHERE products.id = order_items.product_id
        AND products.seller_id = auth.uid()
    )
);

-- Admin can do everything
CREATE POLICY "order_items_admin_all"
ON order_items FOR ALL
USING (is_admin_or_moderator());

-- ==========================================
-- PAYMENTS Table Policies
-- ==========================================

-- Users can view payments for their own orders
CREATE POLICY "payments_select_own"
ON payments FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM orders
        WHERE orders.id = payments.order_id
        AND orders.customer_id = auth.uid()
    )
);

-- Users can create payments for their own orders
CREATE POLICY "payments_insert_own"
ON payments FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM orders
        WHERE orders.id = payments.order_id
        AND orders.customer_id = auth.uid()
    )
);

-- Admin can do everything
CREATE POLICY "payments_admin_all"
ON payments FOR ALL
USING (is_admin_or_moderator());

-- ==========================================
-- COUPONS Table Policies
-- ==========================================

-- Everyone can view active coupons
CREATE POLICY "coupons_select_active"
ON coupons FOR SELECT
USING (
    is_active = true AND
    valid_from <= NOW() AND
    (valid_until IS NULL OR valid_until > NOW()) AND
    (usage_limit IS NULL OR usage_count < usage_limit)
);

-- Admin can do everything
CREATE POLICY "coupons_admin_all"
ON coupons FOR ALL
USING (is_admin_or_moderator());

-- ==========================================
-- COUPON_USAGES Table Policies
-- ==========================================

-- Users can view their own coupon usages
CREATE POLICY "coupon_usages_select_own"
ON coupon_usages FOR SELECT
USING (auth.uid() = user_id);

-- Users can create their own coupon usages
CREATE POLICY "coupon_usages_insert_own"
ON coupon_usages FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Admin can do everything
CREATE POLICY "coupon_usages_admin_all"
ON coupon_usages FOR ALL
USING (is_admin_or_moderator());

-- ==========================================
-- REVIEWS Table Policies
-- ==========================================

-- Everyone can view non-hidden reviews
CREATE POLICY "reviews_select_public"
ON reviews FOR SELECT
USING (NOT is_hidden);

-- Users can create reviews for their own orders
CREATE POLICY "reviews_insert_own"
ON reviews FOR INSERT
WITH CHECK (
    auth.uid() = user_id AND
    (order_id IS NULL OR EXISTS (
        SELECT 1 FROM orders
        WHERE orders.id = reviews.order_id
        AND orders.customer_id = auth.uid()
        AND orders.status = 'delivered'
    ))
);

-- Users can update their own reviews (within time limit)
CREATE POLICY "reviews_update_own"
ON reviews FOR UPDATE
USING (
    auth.uid() = user_id AND
    created_at > NOW() - INTERVAL '7 days'
);

-- Admin can do everything
CREATE POLICY "reviews_admin_all"
ON reviews FOR ALL
USING (is_admin_or_moderator());

-- ==========================================
-- WISHLISTS Table Policies
-- ==========================================

-- Users can manage their own wishlist
CREATE POLICY "wishlists_user_own"
ON wishlists FOR ALL
USING (auth.uid() = user_id);

-- ==========================================
-- CARTS Table Policies
-- ==========================================

-- Users can manage their own cart
CREATE POLICY "carts_user_own"
ON carts FOR ALL
USING (auth.uid() = user_id);

-- Anonymous users can manage cart by session
CREATE POLICY "carts_anonymous_session"
ON carts FOR ALL
USING (
    user_id IS NULL AND
    session_id IS NOT NULL
);

-- ==========================================
-- Additional Security Functions
-- ==========================================

-- Function to check if user can purchase product
CREATE OR REPLACE FUNCTION can_purchase_product(product_id UUID, quantity INTEGER)
RETURNS boolean AS $$
DECLARE
    product_record products;
BEGIN
    SELECT * INTO product_record
    FROM products
    WHERE id = product_id;

    -- Check if product exists and is active
    IF NOT FOUND OR product_record.status != 'active' THEN
        RETURN FALSE;
    END IF;

    -- Check stock
    IF product_record.track_inventory AND product_record.stock_quantity < quantity THEN
        RETURN FALSE;
    END IF;

    -- Check minimum order quantity
    IF quantity < product_record.min_order_quantity THEN
        RETURN FALSE;
    END IF;

    -- Check maximum order quantity
    IF product_record.max_order_quantity IS NOT NULL AND quantity > product_record.max_order_quantity THEN
        RETURN FALSE;
    END IF;

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to validate coupon usage
CREATE OR REPLACE FUNCTION can_use_coupon(coupon_code TEXT, user_id UUID, order_amount DECIMAL)
RETURNS boolean AS $$
DECLARE
    coupon_record coupons;
    usage_count_user INTEGER;
BEGIN
    -- Get coupon details
    SELECT * INTO coupon_record
    FROM coupons
    WHERE code = coupon_code AND is_active = true;

    -- Check if coupon exists
    IF NOT FOUND THEN
        RETURN FALSE;
    END IF;

    -- Check validity period
    IF coupon_record.valid_from > NOW() OR
       (coupon_record.valid_until IS NOT NULL AND coupon_record.valid_until < NOW()) THEN
        RETURN FALSE;
    END IF;

    -- Check minimum order amount
    IF order_amount < coupon_record.min_order_amount THEN
        RETURN FALSE;
    END IF;

    -- Check overall usage limit
    IF coupon_record.usage_limit IS NOT NULL AND
       coupon_record.usage_count >= coupon_record.usage_limit THEN
        RETURN FALSE;
    END IF;

    -- Check per-customer usage limit
    IF coupon_record.usage_limit_per_customer IS NOT NULL THEN
        SELECT COUNT(*) INTO usage_count_user
        FROM coupon_usages
        WHERE coupon_id = coupon_record.id AND user_id = can_use_coupon.user_id;

        IF usage_count_user >= coupon_record.usage_limit_per_customer THEN
            RETURN FALSE;
        END IF;
    END IF;

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==========================================
-- Performance and Security Optimizations
-- ==========================================

-- Create indexes for RLS performance
CREATE INDEX IF NOT EXISTS idx_profiles_auth_uid ON profiles(id) WHERE id = auth.uid();
CREATE INDEX IF NOT EXISTS idx_orders_customer_auth ON orders(customer_id) WHERE customer_id = auth.uid();
CREATE INDEX IF NOT EXISTS idx_products_seller_auth ON products(seller_id) WHERE seller_id = auth.uid();
CREATE INDEX IF NOT EXISTS idx_broadcasts_broadcaster_auth ON broadcasts(broadcaster_id) WHERE broadcaster_id = auth.uid();

-- Grant necessary permissions to authenticated users
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;

-- Grant read-only access to anonymous users for public data
GRANT SELECT ON categories TO anon;
GRANT SELECT ON products TO anon;
GRANT SELECT ON product_variants TO anon;
GRANT SELECT ON broadcasts TO anon;
GRANT SELECT ON broadcast_products TO anon;
GRANT SELECT ON reviews TO anon;