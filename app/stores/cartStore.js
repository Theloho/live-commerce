import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import toast from 'react-hot-toast'

const useCartStore = create(
  persist(
    (set, get) => ({
      // State
      items: [],
      isOpen: false,
      loading: false,

      // Shipping info
      shippingCost: 0,
      freeShippingThreshold: 50000, // 50,000원 이상 무료배송

      // Coupon/Discount
      appliedCoupon: null,
      discountAmount: 0,

      // TODO: Add guest cart sync when user logs in
      // TODO: Implement cart abandonment recovery
      // TODO: Add product availability checking
      // TODO: Implement cart sharing functionality
      // TODO: Add bulk operations (select all, remove all)

      // Computed values (getters)
      getItemCount: () => {
        return get().items.reduce((total, item) => total + item.quantity, 0)
      },

      getSubtotal: () => {
        return get().items.reduce((total, item) => {
          const price = item.salePrice || item.price
          return total + (price * item.quantity)
        }, 0)
      },

      getTotal: () => {
        const { getSubtotal, shippingCost, discountAmount } = get()
        const subtotal = getSubtotal()
        const shipping = subtotal >= get().freeShippingThreshold ? 0 : shippingCost
        return subtotal + shipping - discountAmount
      },

      isFreeShipping: () => {
        return get().getSubtotal() >= get().freeShippingThreshold
      },

      // Actions
      addItem: (product, options = {}) => {
        const { items } = get()
        const {
          quantity = 1,
          selectedOptions = {},
          customizations = {}
        } = options

        // Create unique item key based on product and options
        const itemKey = JSON.stringify({
          id: product.id,
          selectedOptions,
          customizations
        })

        const existingItemIndex = items.findIndex(item => item.itemKey === itemKey)

        if (existingItemIndex >= 0) {
          // Update existing item quantity
          const updatedItems = [...items]
          updatedItems[existingItemIndex].quantity += quantity
          set({ items: updatedItems })
          // ✨ 토스트 제거: 장바구니 수량 변경은 시각적으로 이미 확인 가능
        } else {
          // Add new item
          const newItem = {
            ...product,
            itemKey,
            quantity,
            selectedOptions,
            customizations,
            addedAt: new Date().toISOString()
          }
          set({ items: [...items, newItem] })
          // ✨ 토스트 제거: 장바구니 추가는 시각적으로 이미 확인 가능
        }
      },

      removeItem: (itemKey) => {
        set((state) => ({
          items: state.items.filter(item => item.itemKey !== itemKey)
        }))
        // ✨ 토스트 제거: 상품 삭제는 시각적으로 이미 확인 가능
      },

      updateQuantity: (itemKey, quantity) => {
        if (quantity <= 0) {
          get().removeItem(itemKey)
          return
        }

        set((state) => ({
          items: state.items.map(item =>
            item.itemKey === itemKey
              ? { ...item, quantity }
              : item
          )
        }))
      },

      clearCart: () => {
        set({ items: [], appliedCoupon: null, discountAmount: 0 })
        // ✨ 토스트 제거: 장바구니 비우기는 시각적으로 이미 확인 가능
      },

      // Cart drawer/modal
      openCart: () => set({ isOpen: true }),
      closeCart: () => set({ isOpen: false }),
      toggleCart: () => set((state) => ({ isOpen: !state.isOpen })),

      // Bulk actions
      selectAllItems: () => {
        set((state) => ({
          items: state.items.map(item => ({ ...item, selected: true }))
        }))
      },

      deselectAllItems: () => {
        set((state) => ({
          items: state.items.map(item => ({ ...item, selected: false }))
        }))
      },

      removeSelectedItems: () => {
        set((state) => ({
          items: state.items.filter(item => !item.selected)
        }))
        // ✨ 토스트 제거: 선택 상품 삭제는 시각적으로 이미 확인 가능
      },

      toggleItemSelection: (itemKey) => {
        set((state) => ({
          items: state.items.map(item =>
            item.itemKey === itemKey
              ? { ...item, selected: !item.selected }
              : item
          )
        }))
      },

      // Coupon management
      applyCoupon: (coupon) => {
        const subtotal = get().getSubtotal()
        let discountAmount = 0

        switch (coupon.type) {
          case 'percentage':
            discountAmount = Math.min(
              subtotal * (coupon.value / 100),
              coupon.maxDiscount || subtotal
            )
            break
          case 'fixed':
            discountAmount = Math.min(coupon.value, subtotal)
            break
          case 'free_shipping':
            // Handle free shipping coupon
            set({ shippingCost: 0 })
            break
          default:
            break
        }

        set({
          appliedCoupon: coupon,
          discountAmount
        })

        // ✨ 토스트 제거: 쿠폰 적용은 할인 금액 변경으로 이미 확인 가능
      },

      removeCoupon: () => {
        set({
          appliedCoupon: null,
          discountAmount: 0
        })
        // ✨ 토스트 제거: 쿠폰 제거는 할인 금액 변경으로 이미 확인 가능
      },

      // Shipping
      updateShippingCost: (cost) => {
        set({ shippingCost: cost })
      },

      // Validation
      validateCart: () => {
        const { items } = get()
        const errors = []

        items.forEach(item => {
          // Check stock availability
          if (item.stock !== undefined && item.quantity > item.stock) {
            errors.push(`${item.title}: 재고 부족 (최대 ${item.stock}개)`)
          }

          // Check minimum order quantity
          if (item.minOrder && item.quantity < item.minOrder) {
            errors.push(`${item.title}: 최소 주문 수량 ${item.minOrder}개`)
          }

          // Check maximum order quantity
          if (item.maxOrder && item.quantity > item.maxOrder) {
            errors.push(`${item.title}: 최대 주문 수량 ${item.maxOrder}개`)
          }
        })

        return {
          isValid: errors.length === 0,
          errors
        }
      },

      // Find item by key
      findItem: (itemKey) => {
        return get().items.find(item => item.itemKey === itemKey)
      },

      // Check if product is in cart
      isInCart: (productId, options = {}) => {
        const itemKey = JSON.stringify({
          id: productId,
          selectedOptions: options.selectedOptions || {},
          customizations: options.customizations || {}
        })
        return !!get().findItem(itemKey)
      },

      // Get item quantity in cart
      getItemQuantity: (productId, options = {}) => {
        const itemKey = JSON.stringify({
          id: productId,
          selectedOptions: options.selectedOptions || {},
          customizations: options.customizations || {}
        })
        const item = get().findItem(itemKey)
        return item ? item.quantity : 0
      },

      // Save cart for later (wishlist-like functionality)
      saveForLater: (itemKey) => {
        const item = get().findItem(itemKey)
        if (item) {
          // TODO: Implement save for later functionality
          get().removeItem(itemKey)
          // ✨ 토스트 제거: 상품 이동은 시각적으로 이미 확인 가능
        }
      },

      // Checkout preparation
      prepareCheckout: () => {
        const validation = get().validateCart()
        if (!validation.isValid) {
          validation.errors.forEach(error => toast.error(error))
          return { success: false, errors: validation.errors }
        }

        const {
          items,
          getSubtotal,
          getTotal,
          shippingCost,
          appliedCoupon,
          discountAmount,
          isFreeShipping
        } = get()

        return {
          success: true,
          checkout: {
            items: items.map(item => ({
              productId: item.id,
              title: item.title,
              price: item.salePrice || item.price,
              quantity: item.quantity,
              selectedOptions: item.selectedOptions,
              customizations: item.customizations,
              itemKey: item.itemKey
            })),
            subtotal: getSubtotal(),
            shippingCost: isFreeShipping() ? 0 : shippingCost,
            discountAmount,
            total: getTotal(),
            appliedCoupon
          }
        }
      }
    }),
    {
      name: 'cart-storage',
      // Don't persist loading state
      partialize: (state) => ({
        items: state.items,
        appliedCoupon: state.appliedCoupon,
        discountAmount: state.discountAmount,
        shippingCost: state.shippingCost
      })
    }
  )
)

export default useCartStore