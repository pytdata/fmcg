import { useEffect, useState, useCallback } from 'react';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { SearchableSelect, type SearchableSelectOption } from '@/components/ui/searchable-select';
import { toast } from 'sonner';
import {
  Plus, Pencil, Trash2, Search, X, ImageIcon, Loader2,
} from 'lucide-react';
import { resolveImageUrl, IMAGE_PLACEHOLDER } from '@/lib/media';
import type { Product, Category, ProductVariationType, ProductVariationOption } from '@/types/index';

// ── Types ─────────────────────────────────────────────────────────────────────
interface ProductForm {
  name: string; slug: string; description: string; price: string;
  compare_price: string; stock_quantity: string; category_id: string;
  sku: string; is_featured: boolean; is_active: boolean;
  images: string[]; video_urls: string[]; tag_ids: string[];
}

interface PricingTagLite { id: string; name: string; slug: string; color: string; bg_color: string }

const EMPTY_FORM: ProductForm = {
  name: '', slug: '', description: '', price: '', compare_price: '',
  stock_quantity: '', category_id: '', sku: '', is_featured: false, is_active: true,
  images: [''], video_urls: [], tag_ids: [],
};

// ── Media URL editor ──────────────────────────────────────────────────────────
function MediaUrlEditor({
  images, videoUrls, onImagesChange, onVideosChange,
}: {
  images: string[];
  videoUrls: string[];
  onImagesChange: (urls: string[]) => void;
  onVideosChange: (urls: string[]) => void;
}) {
  const setImage = (idx: number, val: string) =>
    onImagesChange(images.map((u, i) => (i === idx ? val : u)));
  const addImage = () => onImagesChange([...images, '']);
  const removeImage = (idx: number) =>
    onImagesChange(images.length > 1 ? images.filter((_, i) => i !== idx) : ['']);

  const setVideo = (idx: number, val: string) =>
    onVideosChange(videoUrls.map((u, i) => (i === idx ? val : u)));
  const addVideo = () => onVideosChange([...videoUrls, '']);
  const removeVideo = (idx: number) =>
    onVideosChange(videoUrls.filter((_, i) => i !== idx));

  return (
    <div className="space-y-6">
      {/* Image URLs */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-medium text-gray-700">Image URLs *</Label>
          <Button type="button" variant="outline" size="sm" onClick={addImage}>
            <Plus className="w-3.5 h-3.5 mr-1" /> Add image
          </Button>
        </div>
        <p className="text-xs text-gray-400">
          Paste direct or Google Drive / Dropbox share links. At least one image is required.
        </p>
        <div className="space-y-2">
          {images.map((url, i) => (
            <div key={i} className="flex items-center gap-2">
              <div className="w-12 h-12 rounded-lg overflow-hidden border border-gray-200 bg-gray-50 shrink-0">
                {url.trim() ? (
                  <img
                    src={resolveImageUrl(url)}
                    alt=""
                    className="w-full h-full object-cover"
                    onError={e => { e.currentTarget.src = IMAGE_PLACEHOLDER; }}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <ImageIcon className="w-5 h-5 text-gray-300" />
                  </div>
                )}
              </div>
              <Input
                value={url}
                placeholder="https://drive.google.com/file/d/…"
                onChange={e => setImage(i, e.target.value)}
                className="flex-1"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-9 w-9 text-red-500 shrink-0"
                onClick={() => removeImage(i)}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          ))}
        </div>
      </div>

      {/* Video URLs */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-medium text-gray-700">Video URLs (optional)</Label>
          <Button type="button" variant="outline" size="sm" onClick={addVideo}>
            <Plus className="w-3.5 h-3.5 mr-1" /> Add video
          </Button>
        </div>
        <p className="text-xs text-gray-400">
          YouTube, Google Drive, or direct video links.
        </p>
        {videoUrls.length === 0 && (
          <p className="text-xs text-gray-400 italic">No videos added.</p>
        )}
        <div className="space-y-2">
          {videoUrls.map((url, i) => (
            <div key={i} className="flex items-center gap-2">
              <Input
                value={url}
                placeholder="https://youtube.com/watch?v=…"
                onChange={e => setVideo(i, e.target.value)}
                className="flex-1"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-9 w-9 text-red-500 shrink-0"
                onClick={() => removeVideo(i)}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Variations Editor ─────────────────────────────────────────────────────────
function VariationsEditor({ productId }: { productId?: string }) {
  const [variations, setVariations] = useState<ProductVariationType[]>([]);
  const [loading, setLoading] = useState(false);
  const [newTypeName, setNewTypeName] = useState('');

  const load = useCallback(async () => {
    if (!productId) return;
    try {
      const data = await api.get<ProductVariationType[]>(`/api/products/${productId}/variations`);
      setVariations(data.map(v => ({ ...v, options: v.options ?? [] })));
    } catch { /* empty */ }
  }, [productId]);

  useEffect(() => { load(); }, [load]);

  const addType = async () => {
    if (!productId || !newTypeName.trim()) return;
    setLoading(true);
    try {
      const created = await api.post<ProductVariationType>(`/api/products/${productId}/variations`, { name: newTypeName.trim() });
      setVariations(prev => [...prev, { ...created, options: created.options ?? [] }]);
      setNewTypeName('');
    } catch (err) { toast.error((err as Error).message || 'Failed to add variation type'); }
    finally { setLoading(false); }
  };

  const deleteType = async (typeId: string) => {
    if (!productId) return;
    try {
      await api.delete(`/api/products/${productId}/variations/${typeId}`);
      setVariations(prev => prev.filter(v => v.id !== typeId));
    } catch (err) { toast.error((err as Error).message || 'Failed to delete type'); }
  };

  const addOption = async (typeId: string, value: string, priceModifier: number, stock: number, sku: string) => {
    if (!productId) return;
    try {
      const opt = await api.post<ProductVariationOption>(`/api/products/${productId}/variations/${typeId}/options`, {
        value, price_modifier: priceModifier, stock_quantity: stock, sku: sku || null,
      });
      setVariations(prev => prev.map(v => v.id === typeId ? { ...v, options: [...v.options, opt] } : v));
    } catch (err) { toast.error((err as Error).message || 'Failed to add option'); }
  };

  const deleteOption = async (typeId: string, optionId: string) => {
    if (!productId) return;
    try {
      await api.delete(`/api/products/${productId}/variations/${typeId}/options/${optionId}`);
      setVariations(prev => prev.map(v => v.id === typeId ? { ...v, options: v.options.filter(o => o.id !== optionId) } : v));
    } catch (err) { toast.error((err as Error).message || 'Failed to delete option'); }
  };

  if (!productId) return <p className="text-sm text-gray-400 italic">Save the product first, then add variations.</p>;

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Input
          placeholder="Variation type name (e.g. Size, Color, Pack)"
          value={newTypeName}
          onChange={e => setNewTypeName(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addType(); } }}
          className="flex-1"
        />
        <Button onClick={addType} disabled={loading || !newTypeName.trim()} size="sm">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4 mr-1" />} Add Type
        </Button>
      </div>

      {variations.length === 0 && <p className="text-sm text-gray-400">No variation types yet.</p>}

      {variations.map(vtype => (
        <VariationTypeCard key={vtype.id} vtype={vtype} onDelete={() => deleteType(vtype.id)} onAddOption={addOption} onDeleteOption={deleteOption} />
      ))}
    </div>
  );
}

function VariationTypeCard({ vtype, onDelete, onAddOption, onDeleteOption }: {
  vtype: ProductVariationType;
  onDelete: () => void;
  onAddOption: (typeId: string, value: string, price: number, stock: number, sku: string) => Promise<void>;
  onDeleteOption: (typeId: string, optionId: string) => void;
}) {
  const [optValue, setOptValue] = useState('');
  const [optPrice, setOptPrice] = useState('0');
  const [optStock, setOptStock] = useState('0');
  const [optSku, setOptSku] = useState('');
  const [adding, setAdding] = useState(false);

  const handleAdd = async () => {
    if (!optValue.trim()) return;
    setAdding(true);
    await onAddOption(vtype.id, optValue.trim(), parseFloat(optPrice) || 0, parseInt(optStock) || 0, optSku.trim());
    setOptValue(''); setOptPrice('0'); setOptStock('0'); setOptSku('');
    setAdding(false);
  };

  return (
    <div className="border rounded-xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="font-semibold text-sm text-gray-800">{vtype.name}</h4>
        <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500" onClick={onDelete}><Trash2 className="w-4 h-4" /></Button>
      </div>

      {/* Options */}
      <div className="flex flex-wrap gap-2">
        {vtype.options.map(opt => {
          const mod = Number(opt.price_modifier) || 0;
          return (
            <div key={opt.id} className="flex items-center gap-1 px-2.5 py-1 rounded-lg border border-gray-200 bg-gray-50 text-sm">
              <span className="font-medium">{opt.value}</span>
              {opt.sku && <span className="text-gray-400 text-xs">[{opt.sku}]</span>}
              {mod !== 0 && <span className="text-gray-400 text-xs">({mod > 0 ? '+' : ''}GHS {mod.toFixed(2)})</span>}
              <span className="text-gray-400 text-xs">| Stk:{opt.stock_quantity}</span>
              <button type="button" onClick={() => onDeleteOption(vtype.id, opt.id)} className="ml-1 text-gray-400 hover:text-red-500"><X className="w-3 h-3" /></button>
            </div>
          );
        })}
        {!vtype.options.length && <p className="text-xs text-gray-400">No options yet.</p>}
      </div>

      {/* Add option row */}
      <div className="flex gap-2 items-center flex-wrap">
        <Input placeholder="Value (e.g. Small)" value={optValue} onChange={e => setOptValue(e.target.value)} className="w-32" />
        <Input type="number" placeholder="+/- Price" value={optPrice} onChange={e => setOptPrice(e.target.value)} className="w-24" />
        <Input type="number" placeholder="Stock" value={optStock} onChange={e => setOptStock(e.target.value)} className="w-20" />
        <Input placeholder="SKU (optional)" value={optSku} onChange={e => setOptSku(e.target.value)} className="w-32" />
        <Button size="sm" onClick={handleAdd} disabled={adding || !optValue.trim()}>
          {adding ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
        </Button>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function AdminProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [pricingTags, setPricingTags] = useState<PricingTagLite[]>([]);
  const [search, setSearch] = useState('');
  const [form, setForm] = useState<ProductForm>(EMPTY_FORM);
  const [editId, setEditId] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('details');

  const load = async () => {
    const [prods, cats, tags] = await Promise.all([
      api.get<Product[]>('/api/products/admin/all').catch(() => []),
      api.get<Category[]>('/api/categories').catch(() => []),
      api.get<PricingTagLite[]>('/api/pricing-tags/admin/all').catch(() => []),
    ]);
    setProducts(Array.isArray(prods) ? prods : []);
    setCategories(Array.isArray(cats) ? cats : []);
    setPricingTags(Array.isArray(tags) ? tags : []);
  };

  useEffect(() => { load(); }, []);

  const filtered = products.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    (p.sku || '').toLowerCase().includes(search.toLowerCase()),
  );

  // Category options: list ONLY sub-categories (parent_id set), grouped under their
  // parent (main) category name. If no sub-categories exist, fall back to top-level.
  const categoryNameById = new Map(categories.map(c => [c.id, c.name]));
  const subCategories = categories.filter(c => c.parent_id);
  const sourceCategories = subCategories.length ? subCategories : categories;
  const categoryOptions: SearchableSelectOption[] = [
    { value: 'none', label: 'No category' },
    ...[...sourceCategories]
      .sort((a, b) => {
        const ga = a.parent_id ? categoryNameById.get(a.parent_id) ?? '' : '';
        const gb = b.parent_id ? categoryNameById.get(b.parent_id) ?? '' : '';
        return ga.localeCompare(gb) || a.name.localeCompare(b.name);
      })
      .map(c => ({
        value: c.id,
        label: c.name,
        group: c.parent_id ? categoryNameById.get(c.parent_id) : undefined,
        keywords: [c.slug],
      })),
  ];

  const openCreate = () => {
    setForm(EMPTY_FORM); setEditId(null); setActiveTab('details'); setOpen(true);
  };

  const openEdit = (p: Product) => {
    setForm({
      name: p.name, slug: p.slug, description: p.description || '',
      price: String(p.price), compare_price: String(p.compare_price || ''),
      stock_quantity: String(p.stock_quantity), category_id: p.category_id || '',
      sku: p.sku || '', is_featured: p.is_featured, is_active: p.is_active,
      images: p.images?.length ? [...p.images] : [''],
      video_urls: p.video_urls?.length ? [...p.video_urls] : [],
      tag_ids: (p as Product & { pricing_tags?: { id: string }[] }).pricing_tags?.map(t => t.id) ?? [],
    });
    setEditId(p.id);
    setActiveTab('details');
    setOpen(true);
  };

  const handleSave = async () => {
    if (!form.name || !form.slug) { toast.error('Name and slug are required'); return; }
    const images = form.images.map(u => u.trim()).filter(Boolean);
    if (!images.length) { toast.error('At least one image URL is required'); return; }
    const videoUrls = form.video_urls.map(u => u.trim()).filter(Boolean);

    setSaving(true);
    try {
      const payload = {
        name: form.name,
        slug: form.slug,
        description: form.description,
        price: parseFloat(form.price) || 0,
        compare_price: parseFloat(form.compare_price) || null,
        stock_quantity: parseInt(form.stock_quantity) || 0,
        category_id: form.category_id || null,
        sku: form.sku,
        is_featured: form.is_featured,
        is_active: form.is_active,
        images,
        video_urls: videoUrls,
        tag_ids: form.tag_ids,
      };
      if (editId) {
        await api.put<Product>(`/api/products/${editId}`, payload);
        toast.success('Product updated');
        setOpen(false);
        load();
      } else {
        const created = await api.post<Product>('/api/products', payload);
        toast.success('Product created — you can now add variations');
        // Keep the dialog open in edit mode so variations can be attached.
        setEditId(created.id);
        setForm(f => ({ ...f, images, video_urls: videoUrls }));
        setActiveTab('variations');
        load();
      }
    } catch (err) {
      toast.error((err as Error).message);
    } finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this product?')) return;
    await api.delete(`/api/products/${id}`);
    toast.success('Deleted'); load();
  };

  const autoSlug = (name: string) =>
    name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

  const imageCount = form.images.filter(u => u.trim()).length;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h1 className="text-xl font-bold text-gray-900">Products</h1>
        <Button onClick={openCreate} className="bg-amber-600 hover:bg-amber-700 text-white">
          <Plus className="w-4 h-4 mr-1" /> New Product
        </Button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <Input placeholder="Search products…" value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600 whitespace-nowrap">Product</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600 whitespace-nowrap">Price</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600 whitespace-nowrap">Stock</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600 whitespace-nowrap">Media</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600 whitespace-nowrap">Status</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600 whitespace-nowrap">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map(p => (
                <tr key={p.id} className="hover:bg-gray-50/50">
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg overflow-hidden bg-gray-100 shrink-0">
                        {p.images?.[0] ? (
                          <img
                            src={resolveImageUrl(p.images[0])}
                            alt={p.name} className="w-full h-full object-cover"
                            onError={e => { e.currentTarget.src = IMAGE_PLACEHOLDER; }}
                          />
                        ) : <ImageIcon className="w-5 h-5 text-gray-300 m-2.5" />}
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-gray-900 truncate max-w-[200px]">{p.name}</p>
                        <p className="text-xs text-gray-400">{p.sku || p.slug}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className="font-semibold">GHS {Number(p.price).toFixed(2)}</span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${p.stock_quantity > 0 ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                      {p.stock_quantity}
                    </span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="flex gap-1">
                      {(p.images?.length ?? 0) > 0 && <Badge variant="secondary" className="text-xs">{p.images.length} img</Badge>}
                      {(p.video_urls?.length ?? 0) > 0 && <Badge variant="secondary" className="text-xs">{p.video_urls?.length} vid</Badge>}
                      {(p.variations?.length ?? 0) > 0 && <Badge variant="secondary" className="text-xs">{p.variations?.length} var</Badge>}
                    </div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="flex gap-1">
                      {p.is_featured && <Badge className="text-xs bg-amber-100 text-amber-700 border-0">Featured</Badge>}
                      <Badge variant={p.is_active ? 'default' : 'secondary'} className="text-xs">
                        {p.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-right">
                    <div className="flex items-center gap-1 justify-end">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(p)}><Pencil className="w-4 h-4" /></Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500" onClick={() => handleDelete(p.id)}><Trash2 className="w-4 h-4" /></Button>
                    </div>
                  </td>
                </tr>
              ))}
              {!filtered.length && (
                <tr><td colSpan={6} className="px-4 py-12 text-center text-gray-400 text-sm">No products found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create / Edit Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-3xl max-h-[90dvh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editId ? 'Edit Product' : 'New Product'}</DialogTitle>
          </DialogHeader>

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid grid-cols-3 w-full">
              <TabsTrigger value="details">Details</TabsTrigger>
              <TabsTrigger value="media">Media {imageCount > 0 && `(${imageCount})`}</TabsTrigger>
              <TabsTrigger value="variations">Variations</TabsTrigger>
            </TabsList>

            {/* ── Details Tab ── */}
            <TabsContent value="details" className="space-y-3 mt-4">
              <div className="grid sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-sm">Name *</Label>
                  <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value, slug: f.slug || autoSlug(e.target.value) }))} />
                </div>
                <div className="space-y-1">
                  <Label className="text-sm">Slug *</Label>
                  <Input value={form.slug} onChange={e => setForm(f => ({ ...f, slug: e.target.value }))} />
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-sm">Description</Label>
                <Textarea rows={3} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
              </div>
              <div className="grid sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <Label className="text-sm">Price (GHS) *</Label>
                  <Input type="number" min="0" step="0.01" value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} />
                </div>
                <div className="space-y-1">
                  <Label className="text-sm">Compare Price</Label>
                  <Input type="number" min="0" step="0.01" value={form.compare_price} onChange={e => setForm(f => ({ ...f, compare_price: e.target.value }))} />
                </div>
                <div className="space-y-1">
                  <Label className="text-sm">Stock Qty</Label>
                  <Input type="number" min="0" value={form.stock_quantity} onChange={e => setForm(f => ({ ...f, stock_quantity: e.target.value }))} />
                </div>
              </div>
              <div className="grid sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-sm">Category</Label>
                  <SearchableSelect
                    value={form.category_id || 'none'}
                    onValueChange={v => setForm(f => ({ ...f, category_id: v === 'none' ? '' : v }))}
                    options={categoryOptions}
                    placeholder="Select category"
                    searchPlaceholder="Search categories…"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-sm">SKU</Label>
                  <Input value={form.sku} onChange={e => setForm(f => ({ ...f, sku: e.target.value }))} />
                </div>
              </div>
              {pricingTags.length > 0 && (
                <div className="space-y-1.5">
                  <Label className="text-sm">Tags</Label>
                  <p className="text-xs text-gray-400">Click to assign one or more tags. Customers can click a tag to see all products with it.</p>
                  <div className="flex flex-wrap gap-2 pt-1">
                    {pricingTags.map(t => {
                      const selected = form.tag_ids.includes(t.id);
                      return (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => setForm(f => ({
                            ...f,
                            tag_ids: selected ? f.tag_ids.filter(id => id !== t.id) : [...f.tag_ids, t.id],
                          }))}
                          className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-all ${selected ? 'ring-2 ring-offset-1 ring-amber-400 border-transparent' : 'border-gray-200 opacity-70 hover:opacity-100'}`}
                          style={selected ? { background: t.bg_color, color: t.color } : undefined}
                        >
                          {t.name}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
              <div className="flex gap-6">
                <div className="flex items-center gap-2">
                  <Switch checked={form.is_featured} onCheckedChange={v => setForm(f => ({ ...f, is_featured: v }))} />
                  <Label>Featured</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch checked={form.is_active} onCheckedChange={v => setForm(f => ({ ...f, is_active: v }))} />
                  <Label>Active</Label>
                </div>
              </div>
            </TabsContent>

            {/* ── Media Tab ── */}
            <TabsContent value="media" className="mt-4">
              <div className="space-y-2 mb-3">
                <p className="text-sm font-medium text-gray-700">Product Images & Videos</p>
                <p className="text-xs text-gray-400">
                  Provide media as URLs (e.g. Google Drive share links). At least one image URL is required.
                </p>
              </div>
              <MediaUrlEditor
                images={form.images}
                videoUrls={form.video_urls}
                onImagesChange={imgs => setForm(f => ({ ...f, images: imgs }))}
                onVideosChange={vids => setForm(f => ({ ...f, video_urls: vids }))}
              />
            </TabsContent>

            {/* ── Variations Tab ── */}
            <TabsContent value="variations" className="mt-4">
              <div className="space-y-2 mb-3">
                <p className="text-sm font-medium text-gray-700">Product Variations</p>
                <p className="text-xs text-gray-400">Add variation types (Size, Color, Pack) and options with individual stock and price modifiers.</p>
              </div>
              <VariationsEditor productId={editId || undefined} />
            </TabsContent>
          </Tabs>

          <div className="flex justify-end gap-2 pt-2 border-t">
            <Button variant="outline" onClick={() => setOpen(false)}>{editId ? 'Done' : 'Cancel'}</Button>
            <Button onClick={handleSave} disabled={saving} className="bg-amber-600 hover:bg-amber-700 text-white">
              {saving ? <><Loader2 className="w-4 h-4 mr-1 animate-spin" /> Saving…</> : 'Save Product'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
