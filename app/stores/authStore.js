import { create } from 'zustand'
import { persist } from 'zustand/middleware'

const useAuthStore = create(
  persist(
    (set, get) => ({
      // State
      user: null,
      profile: null, // ⚡ 추가: 사용자 프로필 캐시 (DB profiles 테이블)
      loading: false,
      isAuthenticated: false,

      // TODO: Add user preferences (theme, language, notifications)
      // TODO: Implement user roles and permissions
      // TODO: Add login history tracking
      // TODO: Implement auto-logout after inactivity
      // TODO: Add email verification status

      // Actions
      setUser: (user) =>
        set({
          user,
          isAuthenticated: !!user,
          loading: false
        }),

      clearUser: () =>
        set({
          user: null,
          profile: null, // ⚡ 프로필도 함께 삭제
          isAuthenticated: false,
          loading: false
        }),

      // ⚡ 추가: 프로필 관리
      setProfile: (profile) =>
        set({ profile }),

      clearProfile: () =>
        set({ profile: null }),

      updateProfile: (updates) =>
        set((state) => ({
          profile: state.profile ? { ...state.profile, ...updates } : updates
        })),

      setLoading: (loading) =>
        set({ loading }),

      updateUser: (updates) =>
        set((state) => ({
          user: state.user ? { ...state.user, ...updates } : null
        })),

      // User preferences
      updatePreferences: (preferences) =>
        set((state) => ({
          user: state.user
            ? {
                ...state.user,
                preferences: {
                  ...state.user.preferences,
                  ...preferences
                }
              }
            : null
        })),

      // Helper getters
      getUserId: () => get().user?.id,
      getUserName: () => get().user?.user_metadata?.name || get().user?.email,
      getUserEmail: () => get().user?.email,
      isEmailVerified: () => !!get().user?.email_confirmed_at,

      // Check if user has specific role
      hasRole: (role) => {
        const userRoles = get().user?.user_metadata?.roles || []
        return userRoles.includes(role)
      },

      // Check if user has specific permission
      hasPermission: (permission) => {
        const userPermissions = get().user?.user_metadata?.permissions || []
        return userPermissions.includes(permission)
      }
    }),
    {
      name: 'auth-storage',
      // Only persist non-sensitive data
      partialize: (state) => ({
        user: state.user ? {
          id: state.user.id,
          email: state.user.email,
          user_metadata: state.user.user_metadata,
          email_confirmed_at: state.user.email_confirmed_at
        } : null,
        profile: state.profile, // ⚡ 추가: 프로필 캐시 저장 (localStorage)
        isAuthenticated: state.isAuthenticated
      })
    }
  )
)

export default useAuthStore