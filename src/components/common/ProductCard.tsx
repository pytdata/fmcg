import { Link } from 'react-router-dom';
import { useCart } from '@/contexts/CartContext';
import { Button } from '@/components/ui/button';
import { ShoppingCart, Tag, Zap, Flame, Sparkles, ShoppingBag, Ticket } from 'lucide-react';
import type { Product } from '@/types/index';

// Map icon names stored in DB to lucide components
const TAG_ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  Tag, Zap, Flame, Sparkles, ShoppingBag, Ticket,
};

function PricingTagBadge({ tag }: { tag: { name: string; icon: string; color: string; bg_color: string } }) {
  const Icon = TAG_ICON_MAP[tag.icon] ?? Tag;
  return (
    <span
      className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold leading-none whitespace-nowrap"
      style={{ background: tag.bg_color, color: tag.color }}
    >
      <Icon className="w-2.5 h-2.5" />
      {tag.name}
    </span>
  );
}

export default function ProductCard({ product }: { product: Product }) {
  const { addToCart } = useCart();
  const tags = (product as Product & { pricing_tags?: { name: string; icon: string; color: string; bg_color: string }[] }).pricing_tags ?? [];

  return (
    <div className="group bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-lg transition-all duration-300 overflow-hidden flex flex-col">
      <Link to={`/product/${product.slug}`} className="relative block aspect-[4/3] overflow-hidden bg-gray-100">
        <img src={product.images?.[0] || '/placeholder.svg'} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />

        {/* Pricing tag badges — top-left stack */}
        {tags.length > 0 && (
          <div className="absolute top-2 left-2 flex flex-col gap-1">
            {tags.slice(0, 2).map((t, i) => <PricingTagBadge key={i} tag={t} />)}
          </div>
        )}

        {/* Compare-price savings badge — only when no pricing tags */}
        {!tags.length && product.compare_price && product.compare_price > product.price && (
          <span className="absolute top-2 left-2 bg-red-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
            SAVE GHS {(product.compare_price - product.price).toFixed(2)}
          </span>
        )}

        {product.stock_quantity <= 0 && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <span className="text-white font-semibold text-sm">Out of Stock</span>
          </div>
        )}
      </Link>
      <div className="p-3 sm:p-4 flex flex-col flex-1">
        <Link to={`/product/${product.slug}`} className="text-xs text-amber-600 font-medium mb-1">{product.category?.name || 'General'}</Link>
        <Link to={`/product/${product.slug}`} className="text-sm font-semibold text-gray-900 line-clamp-2 mb-2 hover:text-amber-600 transition-colors">{product.name}</Link>
        <div className="mt-auto flex items-end justify-between gap-2">
          <div>
            <span className="text-lg font-bold text-gray-900">GHS {product.price.toFixed(2)}</span>
            {product.compare_price && product.compare_price > 0 && (
              <span className="text-xs text-gray-400 line-through ml-1">GHS {product.compare_price.toFixed(2)}</span>
            )}
          </div>
          <Button
            size="icon"
            className="bg-amber-600 hover:bg-amber-700 h-9 w-9 shrink-0"
            onClick={() => addToCart(product.id)}
            disabled={product.stock_quantity <= 0}
          >
            <ShoppingCart className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
