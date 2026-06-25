import { Link } from 'react-router-dom';
import { resolveImageUrl, categoryImage } from '@/lib/media';
import type { Category } from '@/types/index';

export default function CategoryCard({ category }: { category: Category }) {
  const imgUrl = category.image_url
    ? resolveImageUrl(category.image_url)
    : categoryImage(`${category.name} ${category.slug}`);
  return (
    <Link
      to={`/shop/${category.slug}`}
      className="group relative flex items-center justify-center h-32 sm:h-40 rounded-xl overflow-hidden border border-gray-100 shadow-sm hover:shadow-md transition-all bg-gradient-to-br from-amber-500 to-amber-700"
    >
      <img
        src={imgUrl}
        alt={category.name}
        loading="lazy"
        onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
        className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
      <div className="relative z-10 text-center px-2">
        <h3 className="text-white font-semibold text-sm sm:text-base">{category.name}</h3>
        <span className="text-white/80 text-xs mt-0.5 inline-block">Browse</span>
      </div>
    </Link>
  );
}
