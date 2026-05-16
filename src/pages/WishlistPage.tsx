import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';
import { useCart } from '@/contexts/CartContext';
import { Button } from '@/components/ui/button';
import { Heart, ShoppingCart, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import type { Product } from '@/types/index';

interface WishlistItem { id: string; product_id: string; product?: Product }

export default function WishlistPage() {
  const { user } = useAuth();
  const { addToCart } = useCart();
  const [items, setItems] = useState<WishlistItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchWishlist = async () => {
    if (!user) { setLoading(false); return; }
    try {
      const data = await api.get<WishlistItem[]>('/api/wishlist');
      setItems(Array.isArray(data) ? data : []);
    } catch { setItems([]); }
    setLoading(false);
  };

  useEffect(() => { fetchWishlist(); }, [user]);

  const remove = async (productId: string) => {
    if (!user) return;
    await api.delete(`/api/wishlist/${productId}`).catch(console.error);
    setItems(prev => prev.filter(i => i.product_id !== productId));
    toast.success('Removed from wishlist');
  };

  if (!user) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <p className="text-gray-500">Please sign in to view your wishlist.</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">My Wishlist</h1>
      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-48 bg-gray-100 rounded-xl animate-pulse" />)}
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border border-gray-100">
          <Heart className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">Your wishlist is empty.</p>
          <Link to="/shop" className="text-amber-600 hover:text-amber-700 text-sm font-medium mt-2 inline-block">Browse Products</Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {items.map(item => {
            const p = item as WishlistItem & { name?: string; price?: number; images?: string[]; slug?: string };
            const name = p.name || p.product?.name || '';
            const price = p.price ?? p.product?.price ?? 0;
            const image = (p.images || p.product?.images)?.[0] || '';
            const slug = p.slug || p.product?.slug || '#';
            return (
              <div key={item.id} className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden group">
                <Link to={`/product/${slug}`} className="block aspect-[4/3] overflow-hidden bg-gray-100">
                  <img src={image} alt={name} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                </Link>
                <div className="p-3">
                  <Link to={`/product/${slug}`} className="text-sm font-medium text-gray-900 line-clamp-1 hover:text-amber-600">{name}</Link>
                  <p className="text-sm font-bold text-gray-900 mt-1">GHS {Number(price).toFixed(2)}</p>
                  <div className="flex gap-2 mt-2">
                    <Button size="sm" className="flex-1 bg-amber-600 hover:bg-amber-700 h-8 text-xs" onClick={() => addToCart(item.product_id)}>
                      <ShoppingCart className="w-3 h-3 mr-1" /> Add
                    </Button>
                    <Button size="sm" variant="outline" className="h-8 w-8 p-0" onClick={() => remove(item.product_id)}>
                      <Trash2 className="w-3 h-3 text-red-500" />
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

