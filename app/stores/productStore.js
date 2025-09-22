import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import axios from 'axios'

const useProductStore = create(
  persist(
    (set, get) => ({
      // State
      products: [],
      featuredProducts: [],
      categories: [],
      currentProduct: null,
      searchQuery: '',
      filters: {
        category: '',
        priceRange: [0, 1000000],
        rating: 0,
        sort: 'latest',
        inStock: false
      },
      loading: false,
      error: null,
      pagination: {
        page: 1,
        limit: 20,
        total: 0,
        hasMore: false
      },

      // Recently viewed products
      recentlyViewed: [],
      maxRecentlyViewed: 10,

      // Wishlist
      wishlist: [],

      // TODO: Add product comparison feature
      // TODO: Implement product recommendations
      // TODO: Add price tracking and alerts
      // TODO: Implement bulk operations for admin
      // TODO: Add product review system

      // Actions
      setProducts: (products) => set({ products }),

      setFeaturedProducts: (featuredProducts) => set({ featuredProducts }),

      setCategories: (categories) => set({ categories }),

      setCurrentProduct: (product) => {
        set({ currentProduct: product })

        // Add to recently viewed
        if (product) {
          const { recentlyViewed, maxRecentlyViewed } = get()
          const filtered = recentlyViewed.filter(p => p.id !== product.id)
          const updated = [product, ...filtered].slice(0, maxRecentlyViewed)
          set({ recentlyViewed: updated })
        }
      },

      setLoading: (loading) => set({ loading }),

      setError: (error) => set({ error }),

      setSearchQuery: (query) => set({ searchQuery: query }),

      setFilters: (filters) => set((state) => ({
        filters: { ...state.filters, ...filters }
      })),

      clearFilters: () => set({
        filters: {
          category: '',
          priceRange: [0, 1000000],
          rating: 0,
          sort: 'latest',
          inStock: false
        }
      }),

      setPagination: (pagination) => set((state) => ({
        pagination: { ...state.pagination, ...pagination }
      })),

      // Fetch products with filters
      fetchProducts: async (options = {}) => {
        try {
          set({ loading: true, error: null })

          const { filters, pagination, searchQuery } = get()
          const params = {
            page: pagination.page,
            limit: pagination.limit,
            search: searchQuery,
            ...filters,
            ...options
          }

          const response = await axios.get('/api/products', { params })
          const { products, total, hasMore } = response.data

          set({
            products,
            pagination: {
              ...pagination,
              total,
              hasMore
            }
          })

          return { success: true }
        } catch (error) {
          set({ error: error.message })
          return { success: false, error: error.message }
        } finally {
          set({ loading: false })
        }
      },

      // Fetch single product
      fetchProduct: async (productId) => {
        try {
          set({ loading: true, error: null })

          const response = await axios.get(`/api/products/${productId}`)
          const product = response.data

          set({ currentProduct: product })

          return { success: true, product }
        } catch (error) {
          set({ error: error.message })
          return { success: false, error: error.message }
        } finally {
          set({ loading: false })
        }
      },

      // Fetch featured products
      fetchFeaturedProducts: async () => {
        try {
          const response = await axios.get('/api/products/featured')
          const featuredProducts = response.data

          set({ featuredProducts })

          return { success: true }
        } catch (error) {
          console.error('Error fetching featured products:', error)
          return { success: false, error: error.message }
        }
      },

      // Fetch categories
      fetchCategories: async () => {
        try {
          const response = await axios.get('/api/categories')
          const categories = response.data

          set({ categories })

          return { success: true }
        } catch (error) {
          console.error('Error fetching categories:', error)
          return { success: false, error: error.message }
        }
      },

      // Load more products (infinite scroll)
      loadMoreProducts: async () => {
        const { pagination, hasMore } = get().pagination

        if (!hasMore) return

        const nextPage = pagination.page + 1
        set((state) => ({
          pagination: { ...state.pagination, page: nextPage }
        }))

        const result = await get().fetchProducts()

        if (result.success) {
          // Append new products to existing ones
          set((state) => ({
            products: [...state.products, ...result.products]
          }))
        }

        return result
      },

      // Search products
      searchProducts: async (query) => {
        set({
          searchQuery: query,
          pagination: { ...get().pagination, page: 1 }
        })

        return await get().fetchProducts()
      },

      // Wishlist management
      addToWishlist: (product) => {
        const { wishlist } = get()
        if (!wishlist.find(p => p.id === product.id)) {
          set({ wishlist: [...wishlist, product] })
        }
      },

      removeFromWishlist: (productId) => {
        set((state) => ({
          wishlist: state.wishlist.filter(p => p.id !== productId)
        }))
      },

      isInWishlist: (productId) => {
        return get().wishlist.some(p => p.id === productId)
      },

      clearWishlist: () => set({ wishlist: [] }),

      // Recently viewed management
      clearRecentlyViewed: () => set({ recentlyViewed: [] }),

      // Get products by category
      getProductsByCategory: (categoryId) => {
        return get().products.filter(p => p.category_id === categoryId)
      },

      // Get filtered products
      getFilteredProducts: () => {
        const { products, filters } = get()

        return products.filter(product => {
          // Category filter
          if (filters.category && product.category_id !== filters.category) {
            return false
          }

          // Price range filter
          if (product.price < filters.priceRange[0] || product.price > filters.priceRange[1]) {
            return false
          }

          // Rating filter
          if (product.rating < filters.rating) {
            return false
          }

          // Stock filter
          if (filters.inStock && product.stock <= 0) {
            return false
          }

          return true
        }).sort((a, b) => {
          // Sort products
          switch (filters.sort) {
            case 'price_asc':
              return a.price - b.price
            case 'price_desc':
              return b.price - a.price
            case 'rating':
              return b.rating - a.rating
            case 'popular':
              return b.sales - a.sales
            default: // latest
              return new Date(b.created_at) - new Date(a.created_at)
          }
        })
      }
    }),
    {
      name: 'product-storage',
      // Persist only certain parts
      partialize: (state) => ({
        recentlyViewed: state.recentlyViewed,
        wishlist: state.wishlist,
        filters: state.filters
      })
    }
  )
)

export default useProductStore