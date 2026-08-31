import { create } from 'zustand';

interface UIStore {
  // Cart
  cartCount: number;
  setCartCount: (n: number) => void;
  incrementCart: () => void;
  decrementCart: () => void;

  // Wishlist (optimistic UI — synced from API on mount)
  wishlistIds: Set<number>;
  syncWishlistIds: (ids: number[]) => void;
  addToWishlist: (id: number) => void;
  removeFromWishlist: (id: number) => void;
}

export const useUIStore = create<UIStore>((set) => ({
  cartCount: 0,
  setCartCount: (n) => set({ cartCount: n }),
  incrementCart: () => set((s) => ({ cartCount: s.cartCount + 1 })),
  decrementCart: () => set((s) => ({ cartCount: Math.max(0, s.cartCount - 1) })),

  wishlistIds: new Set(),
  syncWishlistIds: (ids) => set({ wishlistIds: new Set(ids) }),
  addToWishlist: (id) =>
    set((s) => ({ wishlistIds: new Set([...s.wishlistIds, id]) })),
  removeFromWishlist: (id) =>
    set((s) => {
      const next = new Set(s.wishlistIds);
      next.delete(id);
      return { wishlistIds: next };
    }),
}));
