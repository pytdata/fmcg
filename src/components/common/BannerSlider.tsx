import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { resolveImageUrl, IMAGE_PLACEHOLDER } from '@/lib/media';
import type { Banner } from '@/types/index';

export default function BannerSlider({
  banners,
  heightClass = 'h-[300px] sm:h-[380px] md:h-[460px]',
  rounded = true,
}: {
  banners: Banner[];
  heightClass?: string;
  rounded?: boolean;
}) {
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    if (banners.length <= 1) return;
    const timer = setInterval(() => setCurrent(prev => (prev + 1) % banners.length), 6000);
    return () => clearInterval(timer);
  }, [banners.length]);

  if (!banners.length) return null;

  const banner = banners[current];

  return (
    <div className={`relative w-full ${heightClass} overflow-hidden ${rounded ? 'rounded-xl' : ''}`}>
      <div className="absolute inset-0 transition-opacity duration-700">
        <img
          src={banner.image_url ? resolveImageUrl(banner.image_url) : IMAGE_PLACEHOLDER}
          alt={banner.title}
          onError={e => { (e.currentTarget as HTMLImageElement).src = IMAGE_PLACEHOLDER; }}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/30 to-transparent" />
      </div>
      <div className="relative z-10 flex flex-col justify-center h-full container mx-auto px-4 sm:px-8 max-w-3xl">
        <h2 className="text-2xl sm:text-4xl md:text-5xl font-bold text-white mb-3 drop-shadow-lg animate-in fade-in slide-in-from-bottom-4 duration-700">
          {banner.title}
        </h2>
        {banner.subtitle && (
          <p className="text-sm sm:text-lg text-gray-100 mb-6 max-w-lg drop-shadow animate-in fade-in slide-in-from-bottom-6 duration-700 delay-150">
            {banner.subtitle}
          </p>
        )}
        {banner.link && (
          <div className="animate-in fade-in slide-in-from-bottom-8 duration-700 delay-300">
            <Link to={banner.link}>
              <Button className="bg-amber-600 hover:bg-amber-700 text-white px-6 py-2.5 rounded-full font-medium">
                {banner.button_text || 'Learn More'}
              </Button>
            </Link>
          </div>
        )}
      </div>

      {banners.length > 1 && (
        <>
          <button onClick={() => setCurrent(prev => (prev - 1 + banners.length) % banners.length)} className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/20 hover:bg-white/40 flex items-center justify-center text-white transition-colors">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button onClick={() => setCurrent(prev => (prev + 1) % banners.length)} className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/20 hover:bg-white/40 flex items-center justify-center text-white transition-colors">
            <ChevronRight className="w-5 h-5" />
          </button>
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
            {banners.map((_, i) => (
              <button key={i} onClick={() => setCurrent(i)} className={`w-2 h-2 rounded-full transition-all ${i === current ? 'bg-white w-6' : 'bg-white/50'}`} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
