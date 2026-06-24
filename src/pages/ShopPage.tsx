import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { getCategories, getProducts } from '@/services/store';
import Seo from '@/components/common/Seo';
import ProductCard from '@/components/common/ProductCard';
import { Input } from '@/components/ui/input';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { Badge } from '@/components/ui/badge';
import { Search, SlidersHorizontal, Tag, Package, ChevronDown } from 'lucide-react';
import type { Category, Product } from '@/types/index';

// ── Types ─────────────────────────────────────────────────────────────────────
interface PricingTag {
  id: string; name: string; slug: string; tag_type: string;
  color: string; bg_color: string; icon: string; product_count: number;
}

// ── Build tree from flat list ─────────────────────────────────────────────────
function buildTree(flat: Category[]): Category[] {
  const map = new Map<string, Category>();
  flat.forEach(c => map.set(c.id, { ...c, children: [] }));
  const roots: Category[] = [];
  map.forEach(node => {
    if (node.parent_id && map.has(node.parent_id)) {
      map.get(node.parent_id)!.children!.push(node);
    } else {
      roots.push(node);
    }
  });
  map.forEach(node => node.children?.sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name)));
  roots.sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name));
  return roots;
}

// ── Category Accordion Sidebar ────────────────────────────────────────────────
function CategorySidebar({
  tree, flat, activeCategoryId, onSelect,
}: {
  tree: Category[];
  flat: Category[];
  activeCategoryId: string;
  onSelect: (id: string, slug: string) => void;
}) {
  // Auto-expand the parent of the active category
  const activeItem = flat.find(c => c.id === activeCategoryId);
  const defaultOpen = activeItem?.parent_id
    ? [activeItem.parent_id]
    : activeCategoryId
    ? [activeCategoryId]
    : [];
  const [expanded, setExpanded] = useState<string[]>(defaultOpen);

  const toggle = (id: string) => {
    setExpanded(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  return (
    <div className="space-y-0.5">
      <Seo path="/shop" title="Shop FMCG Products — KW Enterprise" description="Browse hundreds of quality FMCG products across personal care, home care, food and more. Fast, reliable delivery across Ghana." />
      {/* All Products */}
      <button
        type="button"
        onClick={() => onSelect('', '')}
        className={`w-full text-left px-3 py-2.5 rounded-lg text-sm transition-colors flex items-center justify-between
          ${activeCategoryId === '' ? 'bg-amber-50 text-amber-700 font-semibold' : 'text-gray-600 hover:bg-gray-50'}`}
      >
        <span>All Products</span>
        <span className="text-xs text-gray-400">
          {flat.reduce((s, c) => s + (!c.parent_id ? (c.product_count ?? 0) : 0), 0)}
        </span>
      </button>

      {tree.map(cat => {
        const hasChildren = (cat.children?.length ?? 0) > 0;
        const isOpen = expanded.includes(cat.id);
        const isActive = activeCategoryId === cat.id;
        const totalCount = (cat.product_count ?? 0) +
          (cat.children?.reduce((s, c) => s + (c.product_count ?? 0), 0) ?? 0);

        return (
          <div key={cat.id}>
            {/* Parent row */}
            <div className={`flex items-center rounded-lg transition-colors
              ${isActive ? 'bg-amber-50' : 'hover:bg-gray-50'}`}>
              {/* Category name — navigates */}
              <button
                type="button"
                onClick={() => onSelect(cat.id, cat.slug)}
                className={`flex-1 text-left px-3 py-2.5 text-sm min-w-0 ${isActive ? 'text-amber-700 font-semibold' : 'text-gray-700'}`}
              >
                <span className="truncate block">{cat.name}</span>
              </button>
              {/* Right side: count + chevron (expand if has children) */}
              <div className="flex items-center gap-1 px-2 shrink-0">
                <span className="text-xs text-gray-400">{totalCount}</span>
                {hasChildren && (
                  <button
                    type="button"
                    onClick={() => toggle(cat.id)}
                    className="p-0.5 rounded hover:bg-gray-200 transition-colors"
                  >
                    <ChevronDown className={`w-3.5 h-3.5 text-gray-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
                  </button>
                )}
              </div>
            </div>

            {/* Sub-categories (collapsible) */}
            {hasChildren && isOpen && (
              <div className="ml-3 pl-3 border-l-2 border-amber-100 mt-0.5 mb-1 space-y-0.5">
                {cat.children!.map(sub => {
                  const isSubActive = activeCategoryId === sub.id;
                  return (
                    <button
                      key={sub.id}
                      type="button"
                      onClick={() => onSelect(sub.id, sub.slug)}
                      className={`w-full text-left px-2.5 py-2 rounded-lg text-xs flex items-center justify-between transition-colors
                        ${isSubActive ? 'bg-amber-50 text-amber-700 font-semibold' : 'text-gray-600 hover:bg-gray-50'}`}
                    >
                      <span className="truncate">{sub.name}</span>
                      <span className="text-gray-400 ml-1 shrink-0">{sub.product_count ?? 0}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
export default function ShopPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const searchQuery = searchParams.get('search') || '';
  const categoryParam = searchParams.get('category') || '';

  const [flat, setFlat] = useState<Category[]>([]);
  const [tree, setTree] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [pricingTags, setPricingTags] = useState<PricingTag[]>([]);
  const [selectedTag, setSelectedTag] = useState<string>('');
  const [search, setSearch] = useState(searchQuery);
  const [sort, setSort] = useState('newest');
  const [loading, setLoading] = useState(true);

  // active category id derived from URL param
  const activeCategory = flat.find(c => c.slug === categoryParam) || null;

  useEffect(() => {
    getCategories().then(data => {
      setFlat(data);
      setTree(buildTree(data));
    });
    api.get<PricingTag[]>('/api/pricing-tags')
      .then(data => setPricingTags(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    getProducts({ categorySlug: categoryParam || undefined, search: searchQuery || undefined })
      .then(data => { setProducts(data); setLoading(false); });
  }, [categoryParam, searchQuery]);

  const handleCategorySelect = (id: string, slug: string) => {
    void id; // used for active tracking; slug drives URL
    if (slug) {
      setSearchParams({ category: slug });
    } else {
      setSearchParams({});
    }
  };

  const filteredByTag = selectedTag
    ? products.filter(p => (p as Product & { pricing_tags?: { slug: string }[] }).pricing_tags?.some(t => t.slug === selectedTag))
    : products;

  const sortedProducts = [...filteredByTag].sort((a, b) => {
    if (sort === 'price-low') return a.price - b.price;
    if (sort === 'price-high') return b.price - a.price;
    if (sort === 'name') return a.name.localeCompare(b.name);
    return 0;
  });

  void navigate; // available if needed

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col md:flex-row gap-6">

        {/* ── Sidebar ──────────────────────────────────────────────────────── */}
        <aside className="w-full md:w-60 shrink-0">
          <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm sticky top-24">
            <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2 text-sm">
              <SlidersHorizontal className="w-4 h-4" /> Categories
            </h3>
            <CategorySidebar
              tree={tree}
              flat={flat}
              activeCategoryId={activeCategory?.id ?? ''}
              onSelect={handleCategorySelect}
            />

            {/* Pricing tag filter */}
            {pricingTags.filter(t => t.product_count > 0).length > 0 && (
              <div className="mt-5 pt-4 border-t">
                <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2 text-sm">
                  <Tag className="w-4 h-4" /> Promotions
                </h3>
                <div className="space-y-0.5">
                  <button
                    type="button"
                    onClick={() => setSelectedTag('')}
                    className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${!selectedTag ? 'bg-amber-50 text-amber-700 font-semibold' : 'text-gray-600 hover:bg-gray-50'}`}
                  >
                    All Promotions
                  </button>
                  {pricingTags.filter(t => t.product_count > 0).map(t => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setSelectedTag(selectedTag === t.slug ? '' : t.slug)}
                      className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors flex items-center gap-2 ${selectedTag === t.slug ? 'bg-amber-50 text-amber-700 font-semibold' : 'text-gray-600 hover:bg-gray-50'}`}
                    >
                      <Badge className="text-[10px] px-1.5 py-0 font-bold shrink-0 border-0"
                        style={{ background: t.bg_color, color: t.color }}>
                        {t.name}
                      </Badge>
                      <span className="text-xs text-gray-400">({t.product_count})</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </aside>

        {/* ── Products area ─────────────────────────────────────────────────── */}
        <div className="flex-1 min-w-0">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-5">
            <div>
              <h1 className="text-xl font-bold text-gray-900">{activeCategory?.name || 'All Products'}</h1>
              <p className="text-sm text-gray-500 flex items-center gap-1">
                <Package className="w-3.5 h-3.5" />
                {sortedProducts.length} product{sortedProducts.length !== 1 ? 's' : ''}
              </p>
            </div>
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <div className="relative flex-1 sm:flex-none">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Search products..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') setSearchParams(prev => { const sp = new URLSearchParams(prev); sp.set('search', search); return sp; }); }}
                  className="pl-9 w-full sm:w-48"
                />
              </div>
              <SearchableSelect
                value={sort}
                onValueChange={setSort}
                options={[
                  { value: 'newest', label: 'Newest' },
                  { value: 'price-low', label: 'Price: Low to High' },
                  { value: 'price-high', label: 'Price: High to Low' },
                  { value: 'name', label: 'Name' },
                ]}
                placeholder="Sort by…"
                searchPlaceholder="Search…"
                className="w-36"
              />
            </div>
          </div>

          {/* Active category breadcrumb */}
          {activeCategory && (
            <div className="flex items-center gap-2 text-xs text-gray-500 mb-4">
              <button type="button" onClick={() => handleCategorySelect('', '')}
                className="hover:text-amber-600 transition-colors">All</button>
              {activeCategory.parent_id && (() => {
                const parent = flat.find(c => c.id === activeCategory.parent_id);
                return parent ? (
                  <>
                    <span>/</span>
                    <button type="button" onClick={() => handleCategorySelect(parent.id, parent.slug)}
                      className="hover:text-amber-600 transition-colors">{parent.name}</button>
                  </>
                ) : null;
              })()}
              <span>/</span>
              <span className="text-gray-800 font-medium">{activeCategory.name}</span>
            </div>
          )}

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
              <Package className="w-10 h-10 text-gray-200 mx-auto mb-3" />
              <p className="text-gray-500 font-medium">No products found</p>
              <p className="text-sm text-gray-400 mt-1">
                {categoryParam ? `No products in "${activeCategory?.name || categoryParam}" yet.` : 'No products match your search.'}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
