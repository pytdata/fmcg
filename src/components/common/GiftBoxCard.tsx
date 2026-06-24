import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Gift, Tag } from 'lucide-react';
import { resolveImageUrl, IMAGE_PLACEHOLDER } from '@/lib/media';
import type { GiftBox } from '@/types/index';

export default function GiftBoxCard({ giftBox }: { giftBox: GiftBox }) {
  return (
    <div className="group bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-lg transition-all duration-300 overflow-hidden flex flex-col">
      <Link to={`/gift-boxes/${giftBox.slug}`} className="relative block aspect-[4/3] overflow-hidden bg-gray-100">
        <img
          src={giftBox.image_url ? resolveImageUrl(giftBox.image_url) : IMAGE_PLACEHOLDER}
          alt={giftBox.name}
          onError={e => { (e.currentTarget as HTMLImageElement).src = IMAGE_PLACEHOLDER; }}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />
        {giftBox.promotional_discount > 0 && (
          <span className="absolute top-2 left-2 bg-emerald-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
            <Tag className="w-3 h-3" /> SAVE GHS {giftBox.promotional_discount.toFixed(2)}
          </span>
        )}
      </Link>
      <div className="p-3 sm:p-4 flex flex-col flex-1">
        <div className="flex items-center gap-1.5 mb-1">
          <Gift className="w-3.5 h-3.5 text-emerald-600" />
          <span className="text-xs text-emerald-600 font-medium">{giftBox.packaging_style}</span>
        </div>
        <Link to={`/gift-boxes/${giftBox.slug}`} className="text-sm font-semibold text-gray-900 line-clamp-2 mb-1 hover:text-emerald-700 transition-colors">{giftBox.name}</Link>
        <p className="text-xs text-gray-500 line-clamp-2 mb-3">{giftBox.description}</p>
        <div className="mt-auto">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-lg font-bold text-gray-900">GHS {giftBox.price.toFixed(2)}</span>
            {giftBox.compare_price && giftBox.compare_price > 0 && (
              <span className="text-xs text-gray-400 line-through">GHS {giftBox.compare_price.toFixed(2)}</span>
            )}
          </div>
          <Link to={`/gift-boxes/${giftBox.slug}`}>
            <Button className="w-full bg-emerald-600 hover:bg-emerald-700 text-white text-sm">View Gift Box</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
