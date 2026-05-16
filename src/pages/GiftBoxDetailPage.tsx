import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { getGiftBoxBySlug, getProducts } from '@/services/store';
import { useCart } from '@/contexts/CartContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Gift, Tag, ShoppingCart, ArrowLeft, Check, Package } from 'lucide-react';
import { toast } from 'sonner';
import GiftBoxCard from '@/components/common/GiftBoxCard';
import type { GiftBox, Product } from '@/types/index';

export default function GiftBoxDetailPage() {
  const { slug } = useParams();
  const { addToCart } = useCart();
  const navigate = useNavigate();
  const [giftBox, setGiftBox] = useState<GiftBox | null>(null);
  const [others, setOthers] = useState<GiftBox[]>([]);

  useEffect(() => {
    if (!slug) return;
    getGiftBoxBySlug(slug).then(setGiftBox);
    getProducts({ limit: 4 }).then(() => {});
    getProducts({}).then(() => {});
    // Get other gift boxes
    const loadOthers = async () => {
      const { getGiftBoxes } = await import('@/services/store');
      const boxes = await getGiftBoxes();
      setOthers(boxes.filter(b => b.slug !== slug).slice(0, 3));
    };
    loadOthers();
  }, [slug]);

  const buyGiftBox = () => {
    if (!giftBox) return;
    // Store gift box order intent
    localStorage.setItem('giftBoxOrder', JSON.stringify({ giftBoxId: giftBox.id, type: 'curated' }));
    toast.success('Gift box added. Proceeding to checkout...');
    navigate('/checkout?giftbox=curated');
  };

  if (!giftBox) {
    return <div className="container mx-auto px-4 py-16 text-center"><div className="h-48 bg-gray-100 rounded-xl animate-pulse max-w-md mx-auto" /></div>;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <Link to="/gift-boxes" className="text-sm text-gray-500 hover:text-amber-600 flex items-center gap-1 mb-4"><ArrowLeft className="w-4 h-4" /> Back to Gift Boxes</Link>
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden mb-8">
        <div className="flex flex-col lg:flex-row">
          <div className="w-full lg:w-1/2 aspect-[4/3] lg:aspect-auto bg-gray-50">
            <img src={giftBox.image_url || ''} alt={giftBox.name} className="w-full h-full object-cover" />
          </div>
          <div className="flex-1 p-5 sm:p-8">
            <div className="flex items-center gap-2 mb-2">
              <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 flex items-center gap-1">
                <Gift className="w-3 h-3" /> Gift Box
              </Badge>
              <span className="text-xs text-gray-500">{giftBox.packaging_style}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-3">{giftBox.name}</h1>
            <p className="text-gray-600 text-sm leading-relaxed mb-5">{giftBox.description}</p>

            <div className="mb-5">
              <h4 className="text-sm font-semibold text-gray-900 mb-2 flex items-center gap-1.5"><Package className="w-4 h-4" /> What's Inside</h4>
              <ul className="space-y-1.5">
                {giftBox.items.map((item: any, i: number) => (
                  <li key={i} className="flex items-center gap-2 text-sm text-gray-600">
                    <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    {item.name} {item.qty > 1 ? `(x${item.qty})` : ''}
                  </li>
                ))}
              </ul>
            </div>

            {giftBox.promotional_discount > 0 && (
              <div className="bg-emerald-50 border border-emerald-100 rounded-lg p-3 mb-5 flex items-center gap-2">
                <Tag className="w-4 h-4 text-emerald-600 shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-emerald-800">Save GHS {giftBox.promotional_discount.toFixed(2)}</p>
                  {giftBox.coupon_code && <p className="text-xs text-emerald-600">Use code: <span className="font-bold">{giftBox.coupon_code}</span></p>}
                </div>
              </div>
            )}

            <div className="flex items-baseline gap-3 mb-5">
              <span className="text-3xl font-bold text-gray-900">GHS {giftBox.price.toFixed(2)}</span>
              {giftBox.compare_price && giftBox.compare_price > 0 && (
                <span className="text-lg text-gray-400 line-through">GHS {giftBox.compare_price.toFixed(2)}</span>
              )}
            </div>

            <Button className="bg-emerald-600 hover:bg-emerald-700 h-11 px-8" onClick={buyGiftBox}>
              <ShoppingCart className="w-4 h-4 mr-2" /> Buy Gift Box
            </Button>
          </div>
        </div>
      </div>

      {others.length > 0 && (
        <div>
          <h2 className="text-lg font-bold text-gray-900 mb-4">More Gift Boxes</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {others.map(g => <GiftBoxCard key={g.id} giftBox={g} />)}
          </div>
        </div>
      )}
    </div>
  );
}
