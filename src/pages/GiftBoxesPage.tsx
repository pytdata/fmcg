import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getGiftBoxes } from '@/services/store';
import GiftBoxCard from '@/components/common/GiftBoxCard';
import { Button } from '@/components/ui/button';
import { Gift, Sparkles, ArrowRight } from 'lucide-react';
import type { GiftBox } from '@/types/index';

export default function GiftBoxesPage() {
  const [giftBoxes, setGiftBoxes] = useState<GiftBox[]>([]);

  useEffect(() => {
    getGiftBoxes().then(setGiftBoxes);
  }, []);

  return (
    <div className="pb-12">
      {/* Hero */}
      <div className="bg-gradient-to-r from-emerald-700 to-emerald-900 py-12 sm:py-16">
        <div className="container mx-auto px-4 text-center">
          <div className="inline-flex items-center gap-2 bg-white/10 text-white/90 text-xs font-medium px-3 py-1 rounded-full mb-4">
            <Sparkles className="w-3.5 h-3.5" /> Special Feature
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-white mb-3">Gift Boxes</h1>
          <p className="text-emerald-100 max-w-xl mx-auto mb-6">Curated by our team or customized by you — gift boxes that make shopping fun and easy. Special discounts and coupon codes available!</p>
          <Link to="/gift-boxes/custom">
            <Button className="bg-white text-emerald-800 hover:bg-gray-100 font-semibold">Build Your Own Gift Box</Button>
          </Link>
        </div>
      </div>

      {/* Curated Gift Boxes */}
      <div className="container mx-auto px-4 py-10">
        <div className="flex items-center gap-2 mb-5">
          <Gift className="w-5 h-5 text-emerald-600" />
          <h2 className="text-xl font-bold text-gray-900">Curated Gift Boxes</h2>
        </div>
        {giftBoxes.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 sm:gap-5">
            {giftBoxes.map(g => <GiftBoxCard key={g.id} giftBox={g} />)}
          </div>
        ) : (
          <div className="text-center py-12 text-gray-500">No gift boxes available at the moment.</div>
        )}
      </div>

      {/* How it works */}
      <div className="container mx-auto px-4 py-10">
        <div className="bg-gray-50 rounded-2xl p-6 sm:p-10">
          <h2 className="text-xl font-bold text-gray-900 text-center mb-8">How Gift Boxes Work</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {[
              { step: '1', title: 'Browse or Build', desc: 'Choose from admin-curated boxes or create your own custom package.' },
              { step: '2', title: 'Apply Coupons', desc: 'Use special gift box coupon codes for exclusive discounts.' },
              { step: '3', title: 'Checkout & Deliver', desc: 'Complete your order and we will deliver your gift box anywhere in Ghana.' },
            ].map(s => (
              <div key={s.step} className="text-center">
                <div className="w-10 h-10 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold mx-auto mb-3">{s.step}</div>
                <h4 className="font-semibold text-gray-900 mb-1">{s.title}</h4>
                <p className="text-sm text-gray-500">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
