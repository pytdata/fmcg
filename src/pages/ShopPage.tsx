import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useParams, useSearchParams } from 'react-router-dom';
import { getCategories, getProducts } from '@/services/store';
import ProductCard from '@/components/common/ProductCard';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, SlidersHorizontal, Tag } from 'lucide-react';
import type { Category, Product } from '@/types/index';

export default function ShopPage() {
  const { categorySlug } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const searchQuery = searchParams.get('search') || '';

  interface PricingTag { id: string; name: string; slug: string; tag_type: string; color: string; bg_color: string; icon: string; product_count: number; }
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [pricingTags, setPricingTags] = useState<PricingTag[]>([]);
  const [selectedTag, setSelectedTag] = useState<string>('');
  const [search, setSearch] = useState(searchQuery);
  const [sort, setSort] = useState('newest');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getCategories().then(setCategories);
    api.get<PricingTag[]>('/api/pricing-tags').then(data => setPricingTags(Array.isArray(data) ? data : [])).catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    getProducts({ categorySlug, search: searchQuery || undefined }).then(data => {
      setProducts(data);
      setLoading(false);
    });
  }, [categorySlug, searchQuery]);

  const filteredByTag = selectedTag
    ? products.filter(p => (p as Product & { pricing_tags?: { slug: string }[] }).pricing_tags?.some(t => t.slug === selectedTag))
    : products;

  const sortedProducts = [...filteredByTag].sort((a, b) => {
    if (sort === 'price-low') return a.price - b.price;
    if (sort === 'price-high') return b.price - a.price;
    if (sort === 'name') return a.name.localeCompare(b.name);
    return 0;
  });

  const activeCategory = categories.find(c => c.slug === categorySlug);

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col md:flex-row gap-6">
        {/* Sidebar */}
        <aside className="w-full md:w-56 shrink-0">
          <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm sticky top-24">
            <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2"><SlidersHorizontal className="w-4 h-4" /> Categories</h3>
            <div className="space-y-1">
              <button
                onClick={() => { const sp = new URLSearchParams(searchParams); sp.delete('search'); setSearchParams(sp); }}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${!categorySlug ? 'bg-amber-50 text-amber-700 font-medium' : 'text-gray-600 hover:bg-gray-50'}`}
              >
                All Products
              </button>
              {categories.map(c => (
                <button
                  key={c.id}
                  onClick={() => { setSearchParams({}); }}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${categorySlug === c.slug ? 'bg-amber-50 text-amber-700 font-medium' : 'text-gray-600 hover:bg-gray-50'}`}
                >
                  {c.name}
                </button>
              ))}
            </div>

            {/* Pricing tag filter */}
            {pricingTags.length > 0 && (
              <div className="mt-5">
                <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <Tag className="w-4 h-4" /> Promotions
                </h3>
                <div className="space-y-1">
                  <button
                    onClick={() => setSelectedTag('')}
                    className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${!selectedTag ? 'bg-amber-50 text-amber-700 font-medium' : 'text-gray-600 hover:bg-gray-50'}`}
                  >
                    All Promotions
                  </button>
                  {pricingTags.filter(t => t.product_count > 0).map(t => (
                    <button
                      key={t.id}
                      onClick={() => setSelectedTag(selectedTag === t.slug ? '' : t.slug)}
                      className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors flex items-center gap-2 ${selectedTag === t.slug ? 'bg-amber-50 text-amber-700 font-medium' : 'text-gray-600 hover:bg-gray-50'}`}
                    >
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold shrink-0"
                        style={{ background: t.bg_color, color: t.color }}>
                        {t.name}
                      </span>
                      <span className="text-xs text-gray-400">({t.product_count})</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </aside>

        {/* Products */}
        <div className="flex-1">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-5">
            <div>
              <h1 className="text-xl font-bold text-gray-900">{activeCategory?.name || 'All Products'}</h1>
              <p className="text-sm text-gray-500">{sortedProducts.length} product{sortedProducts.length !== 1 ? 's' : ''}</p>
            </div>
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <div className="relative flex-1 sm:flex-none">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Search products..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') setSearchParams({ search }); }}
                  className="pl-9 w-full sm:w-48"
                />
              </div>
              <Select value={sort} onValueChange={setSort}>
                <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="newest">Newest</SelectItem>
                  <SelectItem value="price-low">Price: Low to High</SelectItem>
                  <SelectItem value="price-high">Price: High to Low</SelectItem>
                  <SelectItem value="name">Name</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="bg-white rounded-xl border border-gray-100 h-64 animate-pulse" />
              ))}
            </div>
          ) : sortedProducts.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 sm:gap-5">
              {sortedProducts.map(p => <ProductCard key={p.id} product={p} />)}
            </div>
          ) : (
            <div className="text-center py-16">
              <p className="text-gray-500">No products found.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
