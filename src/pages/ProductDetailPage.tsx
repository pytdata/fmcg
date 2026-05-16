import { useEffect, useRef, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getProductBySlug, getProducts } from '@/services/store';
import { useCart } from '@/contexts/CartContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ShoppingCart, Minus, Plus, Truck, ShieldCheck, RotateCcw, Play, Pause, ChevronLeft, ChevronRight, Volume2, VolumeX } from 'lucide-react';
import ProductCard from '@/components/common/ProductCard';
import type { Product, ProductMediaVariant, ProductVariationType } from '@/types/index';

// ── Media item: can be image or video ────────────────────────────────────────
interface MediaItem {
  type: 'image' | 'video';
  thumb: string;
  src: string;
  alt?: string;
  variant?: ProductMediaVariant;
}

// ── Video player component ────────────────────────────────────────────────────
function VideoPlayer({ src, poster }: { src: string; poster?: string }) {
  const ref = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);

  const toggle = () => {
    if (!ref.current) return;
    if (playing) { ref.current.pause(); setPlaying(false); }
    else { ref.current.play(); setPlaying(true); }
  };

  return (
    <div className="relative w-full h-full bg-black rounded-lg overflow-hidden group">
      <video
        ref={ref}
        src={src}
        poster={poster}
        muted={muted}
        loop
        playsInline
        className="w-full h-full object-contain"
        onEnded={() => setPlaying(false)}
      />
      {/* Overlay controls */}
      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/20">
        <button onClick={toggle} className="w-14 h-14 rounded-full bg-white/90 flex items-center justify-center shadow-lg">
          {playing ? <Pause className="w-6 h-6 text-gray-800" /> : <Play className="w-6 h-6 text-gray-800 ml-1" />}
        </button>
      </div>
      {/* Mute / Volume */}
      <button
        onClick={() => setMuted(m => !m)}
        className="absolute top-3 right-3 p-1.5 rounded-full bg-black/50 text-white opacity-0 group-hover:opacity-100 transition-opacity"
      >
        {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
      </button>
      {/* Play badge */}
      {!playing && (
        <div className="absolute bottom-3 left-3">
          <Badge className="bg-black/60 text-white text-xs border-0">
            <Play className="w-3 h-3 mr-1" /> Video
          </Badge>
        </div>
      )}
    </div>
  );
}

// ── Carousel ──────────────────────────────────────────────────────────────────
function MediaCarousel({ items, selected, onSelect }: {
  items: MediaItem[];
  selected: number;
  onSelect: (i: number) => void;
}) {
  const item = items[selected];
  const prev = () => onSelect((selected - 1 + items.length) % items.length);
  const next = () => onSelect((selected + 1) % items.length);

  return (
    <div className="flex flex-col gap-3">
      {/* Main view */}
      <div className="relative aspect-square rounded-xl overflow-hidden bg-gray-50 border border-gray-100">
        {item?.type === 'video'
          ? <VideoPlayer src={item.src} poster={item.thumb} />
          : <img src={item?.src || '/placeholder.svg'} alt={item?.alt || 'Product'} className="w-full h-full object-cover" />
        }
        {items.length > 1 && (
          <>
            <button onClick={prev} className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/90 shadow flex items-center justify-center hover:bg-white transition-colors">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button onClick={next} className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/90 shadow flex items-center justify-center hover:bg-white transition-colors">
              <ChevronRight className="w-4 h-4" />
            </button>
            {/* Dot indicators */}
            <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-1.5">
              {items.map((_, i) => (
                <button key={i} onClick={() => onSelect(i)} className={`w-1.5 h-1.5 rounded-full transition-all ${i === selected ? 'bg-white w-4' : 'bg-white/60'}`} />
              ))}
            </div>
          </>
        )}
      </div>

      {/* Thumbnails */}
      {items.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {items.map((it, i) => (
            <button
              key={i}
              onClick={() => onSelect(i)}
              className={`relative w-16 h-16 rounded-lg overflow-hidden border-2 flex-shrink-0 transition-all ${i === selected ? 'border-amber-500 shadow-sm' : 'border-gray-100 hover:border-gray-300'}`}
            >
              <img src={it.thumb} alt="" className="w-full h-full object-cover" />
              {it.type === 'video' && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                  <Play className="w-4 h-4 text-white" />
                </div>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Variations selector ───────────────────────────────────────────────────────
function VariationsSelector({ variations, selections, onChange }: {
  variations: ProductVariationType[];
  selections: Record<string, string>;
  onChange: (typeId: string, optionId: string) => void;
}) {
  return (
    <div className="space-y-4">
      {variations.map(vtype => (
        <div key={vtype.id}>
          <p className="text-sm font-semibold text-gray-700 mb-2">{vtype.name}</p>
          <div className="flex flex-wrap gap-2">
            {vtype.options.map(opt => {
              const selected = selections[vtype.id] === opt.id;
              const noStock = opt.stock_quantity === 0;
              return (
                <button
                  key={opt.id}
                  onClick={() => !noStock && onChange(vtype.id, opt.id)}
                  disabled={noStock}
                  className={`px-3 py-1.5 rounded-lg border text-sm font-medium transition-all
                    ${selected
                      ? 'border-amber-500 bg-amber-50 text-amber-800 shadow-sm'
                      : noStock
                        ? 'border-gray-100 bg-gray-50 text-gray-300 cursor-not-allowed line-through'
                        : 'border-gray-200 text-gray-700 hover:border-amber-300 hover:bg-amber-50'
                    }`}
                >
                  {opt.value}
                  {opt.price_modifier !== 0 && (
                    <span className="ml-1 text-xs text-gray-500">
                      ({opt.price_modifier > 0 ? '+' : ''}GHS {opt.price_modifier.toFixed(2)})
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function ProductDetailPage() {
  const { slug } = useParams();
  const { addToCart } = useCart();
  const [product, setProduct] = useState<Product | null>(null);
  const [related, setRelated] = useState<Product[]>([]);
  const [qty, setQty] = useState(1);
  const [selectedImage, setSelectedImage] = useState(0);

  useEffect(() => {
    if (!slug) return;
    getProductBySlug(slug).then(p => {
      setProduct(p);
      setQty(1);
      setSelectedImage(0);
    });
    getProducts({ limit: 4 }).then(setRelated);
  }, [slug]);

  if (!product) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <div className="h-64 bg-gray-100 rounded-xl animate-pulse max-w-md mx-auto" />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 sm:p-6 mb-8">
        <div className="flex flex-col lg:flex-row gap-6 lg:gap-10">
          {/* Images */}
          <div className="w-full lg:w-1/2">
            <div className="aspect-square rounded-lg overflow-hidden bg-gray-50 mb-3">
              <img src={product.images?.[selectedImage] || '/placeholder.svg'} alt={product.name} className="w-full h-full object-cover" />
            </div>
            {product.images.length > 1 && (
              <div className="flex gap-2 overflow-x-auto">
                {product.images.map((img, i) => (
                  <button key={i} onClick={() => setSelectedImage(i)} className={`w-16 h-16 rounded-lg overflow-hidden border-2 flex-shrink-0 ${i === selectedImage ? 'border-amber-600' : 'border-gray-100'}`}>
                    <img src={img} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Details */}
          <div className="flex-1">
            <Link to={`/shop/${product.category?.slug}`} className="text-xs text-amber-600 font-medium uppercase tracking-wide">{product.category?.name}</Link>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mt-1 mb-3">{product.name}</h1>
            <div className="flex items-baseline gap-3 mb-4">
              <span className="text-3xl font-bold text-gray-900">GHS {product.price.toFixed(2)}</span>
              {product.compare_price && product.compare_price > 0 && (
                <span className="text-lg text-gray-400 line-through">GHS {product.compare_price.toFixed(2)}</span>
              )}
            </div>
            <p className="text-gray-600 text-sm leading-relaxed mb-5">{product.description}</p>

            <div className="flex items-center gap-1.5 mb-5 text-sm">
              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${product.stock_quantity > 0 ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                {product.stock_quantity > 0 ? `In Stock (${product.stock_quantity})` : 'Out of Stock'}
              </span>
              {product.sku && <span className="text-gray-400 text-xs">SKU: {product.sku}</span>}
            </div>

            <div className="flex items-center gap-4 mb-6">
              <div className="flex items-center border border-gray-200 rounded-lg">
                <button onClick={() => setQty(Math.max(1, qty - 1))} className="px-3 py-2 hover:bg-gray-50"><Minus className="w-4 h-4" /></button>
                <span className="w-10 text-center text-sm font-medium">{qty}</span>
                <button onClick={() => setQty(Math.min(product.stock_quantity, qty + 1))} className="px-3 py-2 hover:bg-gray-50"><Plus className="w-4 h-4" /></button>
              </div>
              <Button
                className="flex-1 bg-amber-600 hover:bg-amber-700 h-10"
                onClick={() => addToCart(product.id, qty)}
                disabled={product.stock_quantity <= 0}
              >
                <ShoppingCart className="w-4 h-4 mr-2" /> Add to Cart
              </Button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-gray-500">
              <div className="flex items-center gap-2"><Truck className="w-4 h-4 text-amber-600" /> Fast Delivery</div>
              <div className="flex items-center gap-2"><ShieldCheck className="w-4 h-4 text-amber-600" /> Secure Payment</div>
              <div className="flex items-center gap-2"><RotateCcw className="w-4 h-4 text-amber-600" /> Easy Returns</div>
            </div>
          </div>
        </div>
      </div>

      {/* Related */}
      <div>
        <h2 className="text-lg font-bold text-gray-900 mb-4">You May Also Like</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {related.filter(r => r.id !== product.id).slice(0, 4).map(p => <ProductCard key={p.id} product={p} />)}
        </div>
      </div>
    </div>
  );
}
