import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { api } from '@/lib/api';
import type { CartItem, Product } from '@/types/index';
import { useAuth } from './AuthContext';

interface CartContextType {
  cartItems: CartItem[];
  loading: boolean;
  addToCart: (productId: string, quantity?: number) => Promise<void>;
  removeFromCart: (cartItemId: string) => Promise<void>;
  updateQuantity: (cartItemId: string, quantity: number) => Promise<void>;
  cartTotal: number;
  cartCount: number;
  refreshCart: () => Promise<void>;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

// ── Guest cart helpers (localStorage) ────────────────────────────────────────
type GuestCartItem = { id: string; product_id: string; quantity: number };

function readGuestCart(): GuestCartItem[] {
  try { return JSON.parse(localStorage.getItem('guestCart') || '[]'); }
  catch { return []; }
}

function writeGuestCart(items: GuestCartItem[]) {
  localStorage.setItem('guestCart', JSON.stringify(items));
}

export function CartProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchCart = async () => {
    setLoading(true);
    try {
      if (!user) {
        // Guest cart: resolve product details via public API
        const local = readGuestCart();
        if (!local.length) { setCartItems([]); return; }

        const ids = local.map(c => c.product_id);
        // Fetch each product (or batch via search — simple approach: one call per unique id)
        const productMap = new Map<string, Product>();
        await Promise.allSettled(
          ids.map(id =>
            api.get<Product>(`/api/products/${id}`).then(p => productMap.set(id, p)).catch(() => {}),
          ),
        );
        setCartItems(
          local.map(c => ({
            id: c.id,
            product_id: c.product_id,
            quantity: c.quantity,
            product: productMap.get(c.product_id),
          })) as CartItem[],
        );
        return;
      }
      // Authenticated cart
      const items = await api.get<CartItem[]>('/api/cart');
      setCartItems(Array.isArray(items) ? items : []);
    } catch (err) {
      console.error('fetchCart error', err);
      setCartItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchCart(); }, [user]);

  const addToCart = async (productId: string, quantity = 1) => {
    if (!user) {
      const local = readGuestCart();
      const existing = local.find(c => c.product_id === productId);
      if (existing) existing.quantity += quantity;
      else local.push({ id: crypto.randomUUID(), product_id: productId, quantity });
      writeGuestCart(local);
      await fetchCart();
      return;
    }
    await api.post('/api/cart', { product_id: productId, quantity });
    await fetchCart();
  };

  const removeFromCart = async (cartItemId: string) => {
    if (!user) {
      writeGuestCart(readGuestCart().filter(c => c.id !== cartItemId));
      await fetchCart();
      return;
    }
    await api.delete(`/api/cart/${cartItemId}`);
    await fetchCart();
  };

  const updateQuantity = async (cartItemId: string, quantity: number) => {
    if (quantity < 1) return;
    if (!user) {
      const local = readGuestCart();
      const item = local.find(c => c.id === cartItemId);
      if (item) item.quantity = quantity;
      writeGuestCart(local);
      await fetchCart();
      return;
    }
    await api.put(`/api/cart/${cartItemId}`, { quantity });
    await fetchCart();
  };

  const cartTotal = cartItems.reduce((s, i) => s + (i.product?.price || 0) * i.quantity, 0);
  const cartCount = cartItems.reduce((s, i) => s + i.quantity, 0);

  return (
    <CartContext.Provider value={{
      cartItems, loading, addToCart, removeFromCart, updateQuantity,
      cartTotal, cartCount, refreshCart: fetchCart,
    }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (context === undefined) throw new Error('useCart must be used within a CartProvider');
  return context;
}
