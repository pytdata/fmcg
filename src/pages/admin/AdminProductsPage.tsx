import { useEffect, useState, useRef, useCallback } from 'react';
import { api, API_BASE } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { SearchableSelect, type SearchableSelectOption } from '@/components/ui/searchable-select';
import { toast } from 'sonner';
import {
  Plus, Pencil, Trash2, Search, Upload, X, ImageIcon, Loader2,
  Video, CheckCircle2, AlertCircle, Clock, RefreshCw,
} from 'lucide-react';
import type { Product, Category, ProductVariationType, ProductVariationOption, ProductMediaVariant } from '@/types/index';

// ── Types ─────────────────────────────────────────────────────────────────────
interface ProductForm {
  name: string; slug: string; description: string; price: string;
  compare_price: string; stock_quantity: string; category_id: string;
  sku: string; is_featured: boolean; is_active: boolean;
}

interface QueuedMediaItem {
  file: File;
  previewUrl: string;
  jobId?: string;
  mediaId?: string;
  status: 'pending' | 'uploading' | 'queued' | 'processing' | 'ready' | 'failed';
  type: 'image' | 'video';
  variants?: { small?: string; medium?: string; large?: string; original?: string };
  error?: string;
}

const EMPTY_FORM: ProductForm = {
  name: '', slug: '', description: '', price: '', compare_price: '',
  stock_quantity: '', category_id: '', sku: '', is_featured: false, is_active: true,
};

// ── Media Upload Queue UI ─────────────────────────────────────────────────────
function MediaQueueUploader({
  productId, existingMedia, onMediaChange,
}: {
  productId?: string;
  existingMedia: ProductMediaVariant[];
  onMediaChange: (items: ProductMediaVariant[]) => void;
}) {
  const [queue, setQueue] = useState<QueuedMediaItem[]>([]);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const updateItem = useCallback((idx: number, patch: Partial<QueuedMediaItem>) => {
    setQueue(prev => prev.map((it, i) => i === idx ? { ...it, ...patch } : it));
  }, []);

  const pollJob = useCallback(async (idx: number, jobId: string, prodId: string) => {
    let attempts = 0;
    const MAX = 40;
    const interval = setInterval(async () => {
      attempts++;
      if (attempts > MAX) { clearInterval(interval); updateItem(idx, { status: 'failed', error: 'Timed out' }); return; }
      try {
        const job = await api.get<{ status: string; url_large?: string; url_medium?: string; url_small?: string; url_original?: string; media_status?: string }>(`/api/products/${prodId}/media/job/${jobId}`);
        if (job.media_status === 'ready') {
          clearInterval(interval);
          updateItem(idx, { status: 'ready', variants: { large: job.url_large, medium: job.url_medium, small: job.url_small, original: job.url_original } });
          // Refresh media list
          const fresh = await api.get<ProductMediaVariant[]>(`/api/products/${prodId}/media`);
          onMediaChange(fresh);
        } else if (job.status === 'failed') {
          clearInterval(interval); updateItem(idx, { status: 'failed', error: 'Processing failed' });
        } else {
          updateItem(idx, { status: job.status === 'processing' ? 'processing' : 'queued' });
        }
      } catch { /* retry */ }
    }, 2500);
  }, [updateItem, onMediaChange]);

  const uploadFiles = async (files: File[], prodId?: string) => {
    const newItems: QueuedMediaItem[] = files.map(f => ({
      file: f,
      previewUrl: URL.createObjectURL(f),
      status: 'pending',
      type: f.type.startsWith('video/') ? 'video' : 'image',
    }));

    setQueue(prev => [...prev, ...newItems]);
    const startIdx = queue.length;

    if (!prodId) { toast.warning('Save the product first to upload media'); return; }

    for (let i = 0; i < newItems.length; i++) {
      const idx = startIdx + i;
      updateItem(idx, { status: 'uploading' });
      try {
        const fd = new FormData();
        fd.append('file', newItems[i].file);
        const res = await fetch(`${API_BASE}/api/products/${prodId}/media`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${localStorage.getItem('kw_token')}` },
          body: fd,
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Upload failed');
        updateItem(idx, { status: 'queued', jobId: data.jobId, mediaId: data.mediaId });
        if (data.jobId) pollJob(idx, data.jobId, prodId);
      } catch (err) {
        updateItem(idx, { status: 'failed', error: (err as Error).message });
      }
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); setDragging(false);
    const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/') || f.type.startsWith('video/'));
    if (files.length) uploadFiles(files, productId);
  };

  const StatusIcon = ({ status }: { status: QueuedMediaItem['status'] }) => {
    if (status === 'ready') return <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />;
    if (status === 'failed') return <AlertCircle className="w-3.5 h-3.5 text-red-500" />;
    if (status === 'uploading' || status === 'processing') return <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-500" />;
    return <Clock className="w-3.5 h-3.5 text-gray-400" />;
  };

  return (
    <div className="space-y-3">
      {/* Existing media from DB */}
      {existingMedia.length > 0 && (
        <div>
          <p className="text-xs font-medium text-gray-500 mb-2">Saved Media ({existingMedia.length})</p>
          <div className="flex flex-wrap gap-2">
            {existingMedia.map(m => (
              <div key={m.id} className="relative group w-18 h-18 rounded-lg border border-gray-200 overflow-hidden bg-gray-50" style={{ width: 72, height: 72 }}>
                {m.media_type === 'video'
                  ? <div className="w-full h-full flex items-center justify-center bg-gray-800"><Video className="w-6 h-6 text-white" /></div>
                  : <img src={`${API_BASE}${m.url_small || m.url_medium || m.url_original}`} alt="" className="w-full h-full object-cover" />
                }
                <div className="absolute top-1 right-1">
                  <Badge className="text-xs px-1 py-0 bg-green-500 border-0">✓</Badge>
                </div>
                <button
                  type="button"
                  onClick={async () => {
                    await api.delete(`/api/products/${productId}/media/${m.id}`);
                    onMediaChange(existingMedia.filter(x => x.id !== m.id));
                  }}
                  className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                >
                  <X className="w-4 h-4 text-white" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Drop zone */}
      <div
        onDragOver={e => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors
          ${dragging ? 'border-amber-400 bg-amber-50' : 'border-gray-200 hover:border-amber-300 hover:bg-amber-50/50'}`}
      >
        <input
          ref={inputRef}
          type="file"
          multiple
          accept="image/*,video/*"
          className="hidden"
          onChange={e => { if (e.target.files?.length) uploadFiles(Array.from(e.target.files), productId); }}
        />
        <div className="flex flex-col items-center gap-2 text-gray-500">
          <div className="flex gap-2">
            <ImageIcon className="w-5 h-5" />
            <Video className="w-5 h-5" />
          </div>
          <p className="text-sm font-medium">Drop images or videos here, or click to browse</p>
          <p className="text-xs text-gray-400">Images: JPEG, PNG, WebP, AVIF · Videos: MP4, WebM · Compressed automatically</p>
        </div>
      </div>

      {/* Queue progress */}
      {queue.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-gray-500">Upload Queue ({queue.filter(q => q.status === 'ready').length}/{queue.length} done)</p>
          <div className="space-y-1.5 max-h-52 overflow-y-auto">
            {queue.map((item, i) => (
              <div key={i} className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
                <div className="w-8 h-8 rounded-md overflow-hidden border border-gray-200 shrink-0">
                  {item.type === 'video'
                    ? <div className="w-full h-full bg-gray-200 flex items-center justify-center"><Video className="w-4 h-4 text-gray-500" /></div>
                    : <img src={item.previewUrl} alt="" className="w-full h-full object-cover" />
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-gray-700 truncate">{item.file.name}</p>
                  <p className="text-xs text-gray-400 capitalize">{item.status === 'ready' ? 'Compressed & saved' : item.status}{item.error ? `: ${item.error}` : ''}</p>
                </div>
                <StatusIcon status={item.status} />
                {item.status === 'ready' && item.variants && (
                  <div className="flex gap-1">
                    {['small', 'medium', 'large'].map(sz => (
                      <Badge key={sz} variant="secondary" className="text-xs py-0 px-1">{sz.charAt(0).toUpperCase()}</Badge>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
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
      setVariations(data);
    } catch { /* empty */ }
  }, [productId]);

  useEffect(() => { load(); }, [load]);

  const addType = async () => {
    if (!productId || !newTypeName.trim()) return;
    setLoading(true);
    try {
      const created = await api.post<ProductVariationType>(`/api/products/${productId}/variations`, { name: newTypeName.trim() });
      setVariations(prev => [...prev, { ...created, options: [] }]);
      setNewTypeName('');
    } catch { toast.error('Failed to add variation type'); }
    finally { setLoading(false); }
  };

  const deleteType = async (typeId: string) => {
    if (!productId) return;
    await api.delete(`/api/products/${productId}/variations/${typeId}`);
    setVariations(prev => prev.filter(v => v.id !== typeId));
  };

  const addOption = async (typeId: string, value: string, priceModifier: number, stock: number) => {
    if (!productId) return;
    const opt = await api.post<ProductVariationOption>(`/api/products/${productId}/variations/${typeId}/options`, {
      value, price_modifier: priceModifier, stock_quantity: stock,
    });
    setVariations(prev => prev.map(v => v.id === typeId ? { ...v, options: [...v.options, opt] } : v));
  };

  const deleteOption = async (typeId: string, optionId: string) => {
    if (!productId) return;
    await api.delete(`/api/products/${productId}/variations/${typeId}/options/${optionId}`);
    setVariations(prev => prev.map(v => v.id === typeId ? { ...v, options: v.options.filter(o => o.id !== optionId) } : v));
  };

  if (!productId) return <p className="text-sm text-gray-400 italic">Save the product first, then add variations.</p>;

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Input
          placeholder="Variation type name (e.g. Size, Color, Pack)"
          value={newTypeName}
          onChange={e => setNewTypeName(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && addType()}
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
  onAddOption: (typeId: string, value: string, price: number, stock: number) => Promise<void>;
  onDeleteOption: (typeId: string, optionId: string) => void;
}) {
  const [optValue, setOptValue] = useState('');
  const [optPrice, setOptPrice] = useState('0');
  const [optStock, setOptStock] = useState('0');
  const [adding, setAdding] = useState(false);

  const handleAdd = async () => {
    if (!optValue.trim()) return;
    setAdding(true);
    await onAddOption(vtype.id, optValue.trim(), parseFloat(optPrice) || 0, parseInt(optStock) || 0);
    setOptValue(''); setOptPrice('0'); setOptStock('0');
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
        {vtype.options.map(opt => (
          <div key={opt.id} className="flex items-center gap-1 px-2.5 py-1 rounded-lg border border-gray-200 bg-gray-50 text-sm">
            <span className="font-medium">{opt.value}</span>
            {opt.price_modifier !== 0 && <span className="text-gray-400 text-xs">({opt.price_modifier > 0 ? '+' : ''}GHS {opt.price_modifier})</span>}
            <span className="text-gray-400 text-xs">| Stk:{opt.stock_quantity}</span>
            <button onClick={() => onDeleteOption(vtype.id, opt.id)} className="ml-1 text-gray-400 hover:text-red-500"><X className="w-3 h-3" /></button>
          </div>
        ))}
        {!vtype.options.length && <p className="text-xs text-gray-400">No options yet.</p>}
      </div>

      {/* Add option row */}
      <div className="flex gap-2 items-center flex-wrap">
        <Input placeholder="Value (e.g. Small)" value={optValue} onChange={e => setOptValue(e.target.value)} className="w-32" />
        <Input type="number" placeholder="+/- Price" value={optPrice} onChange={e => setOptPrice(e.target.value)} className="w-24" />
        <Input type="number" placeholder="Stock" value={optStock} onChange={e => setOptStock(e.target.value)} className="w-20" />
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
  const [search, setSearch] = useState('');
  const [form, setForm] = useState<ProductForm>(EMPTY_FORM);
  const [editId, setEditId] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeMedia, setActiveMedia] = useState<ProductMediaVariant[]>([]);
  const [activeTab, setActiveTab] = useState('details');

  const load = async () => {
    const [prods, cats] = await Promise.all([
      api.get<Product[]>('/api/products/admin/all').catch(() => []),
      api.get<Category[]>('/api/categories').catch(() => []),
    ]);
    setProducts(Array.isArray(prods) ? prods : []);
    setCategories(Array.isArray(cats) ? cats : []);
  };

  useEffect(() => { load(); }, []);

  const filtered = products.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    (p.sku || '').toLowerCase().includes(search.toLowerCase()),
  );

  // Build category options: top-level first, sub-categories grouped under their parent's name.
  const categoryNameById = new Map(categories.map(c => [c.id, c.name]));
  const categoryOptions: SearchableSelectOption[] = [
    { value: 'none', label: 'No category' },
    ...[...categories]
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
    setForm(EMPTY_FORM); setEditId(null); setActiveMedia([]); setActiveTab('details'); setOpen(true);
  };

  const openEdit = (p: Product) => {
    setForm({
      name: p.name, slug: p.slug, description: p.description || '',
      price: String(p.price), compare_price: String(p.compare_price || ''),
      stock_quantity: String(p.stock_quantity), category_id: p.category_id || '',
      sku: p.sku || '', is_featured: p.is_featured, is_active: p.is_active,
    });
    setEditId(p.id);
    setActiveMedia(p.media?.filter(m => m.status === 'ready') ?? []);
    setActiveTab('details');
    setOpen(true);
  };

  const handleSave = async () => {
    if (!form.name || !form.slug) { toast.error('Name and slug are required'); return; }
    setSaving(true);
    try {
      const payload = {
        ...form,
        price: parseFloat(form.price) || 0,
        compare_price: parseFloat(form.compare_price) || null,
        stock_quantity: parseInt(form.stock_quantity) || 0,
        category_id: form.category_id || null,
        images: activeMedia.filter(m => m.media_type === 'image').map(m => `${API_BASE}${m.url_medium || m.url_original}`),
      };
      if (editId) {
        await api.put<Product>(`/api/products/${editId}`, payload);
        toast.success('Product updated');
      } else {
        await api.post<Product>('/api/products', payload);
        toast.success('Product created');
      }
      setOpen(false); load();
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
                        {(p.images?.[0] || p.image_variants?.[0]) ? (
                          <img
                            src={p.image_variants?.[0] ? `${API_BASE}${p.image_variants[0].url_small || p.image_variants[0].url_original}` : p.images[0]}
                            alt={p.name} className="w-full h-full object-cover"
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
                    <span className="font-semibold">GHS {p.price.toFixed(2)}</span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${p.stock_quantity > 0 ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                      {p.stock_quantity}
                    </span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="flex gap-1">
                      {(p.image_variants?.length ?? 0) > 0 && <Badge variant="secondary" className="text-xs">{p.image_variants?.length} img</Badge>}
                      {(p.videos?.length ?? 0) > 0 && <Badge variant="secondary" className="text-xs">{p.videos?.length} vid</Badge>}
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
              <TabsTrigger value="media">Media {activeMedia.length > 0 && `(${activeMedia.length})`}</TabsTrigger>
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
                  All files are automatically validated (type + magic bytes), scanned for malware,
                  compressed, and stored in 3 sizes (Small 300px · Medium 600px · Large 1200px).
                </p>
              </div>
              <MediaQueueUploader
                productId={editId || undefined}
                existingMedia={activeMedia}
                onMediaChange={setActiveMedia}
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
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving} className="bg-amber-600 hover:bg-amber-700 text-white">
              {saving ? <><Loader2 className="w-4 h-4 mr-1 animate-spin" /> Saving…</> : 'Save Product'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
