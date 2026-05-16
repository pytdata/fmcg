import { Link } from 'react-router-dom';
import type { Category } from '@/types/index';

export default function CategoryCard({ category }: { category: Category }) {
  return (
    <Link
      to={`/shop/${category.slug}`}
      className="group relative flex items-center justify-center h-32 sm:h-40 rounded-xl overflow-hidden border border-gray-100 shadow-sm hover:shadow-md transition-all"
    >
      <img
        src={category.image_url || `https://images.unsplash.com/photo-1604719312566-8912e9227c6a?w=400&q=80`}
        alt={category.name}
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
