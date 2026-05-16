import { useEffect, useState, useCallback } from 'react';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import {
  Plus, Pencil, Trash2, Tag, Ticket, BarChart3, Zap, Flame,
  Sparkles, ShoppingBag, Loader2, X, CheckCircle2, Clock, AlertCircle,
  TrendingDown, Package, RefreshCw, Search,
} from 'lucide-react';

// ── Types ─────────────────────────────────────────────────────────────────────
interface PricingTag {
  id: string;
  name: string;
  slug: string;
  tag_type: 'black_friday' | 'flash_sale' | 'clearance' | 'new_arrival' | 'custom';
  color: string;
  bg_color: string;
  icon: string;
  discount_type: 'percentage' | 'fixed' | 'free_shipping' | 'none';
  discount_value: number;
  valid_from: string;
  valid_until: string | null;
  is_active: boolean;
  description: string | null;
  product_count: number;
}

interface TagProduct {
  id: string;
  name: string;
  slug: string;
  price: number;
  images: string[];
  is_active: boolean;
}

interface AllProduct {
  id: string;
  name: string;
  slug: string;
  price: number;
  images: string[];
}

interface Promotion {
  id: string;
  code: string;
  name: string;
  discount_type: 'percentage' | 'fixed' | 'free_shipping';
  discount_value: number;
  min_order_amount: number | null;
  max_uses: number | null;
  used_count: number;
  valid_from: string;
  valid_until: string | null;
  is_active: boolean;
  applies_to: string;
  usage_pct: number | null;
}

interface DiscountStats {
  coupons: { total_coupons: number; active_coupons: number; total_uses: number; expired_coupons: number };
  tags: { total_tags: number; active_tags: number; tagged_products: number };
  savings: { total_saved: number; orders_with_discount: number };
}

// ── Icon map ──────────────────────────────────────────────────────────────────
const ICON_OPTIONS = [
  { key: 'Tag', Component: Tag },
  { key: 'Zap', Component: Zap },
  { key: 'Flame', Component: Flame },
  { key: 'Sparkles', Component: Sparkles },
  { key: 'ShoppingBag', Component: ShoppingBag },
  { key: 'Ticket', Component: Ticket },
];

function TagIcon({ icon, className }: { icon: string; className?: string }) {
  const match = ICON_OPTIONS.find(i => i.key === icon);
  const Comp = match?.Component ?? Tag;
  return <Comp className={className} />;
}

// ── Tag badge preview ─────────────────────────────────────────────────────────
function TagBadge({ tag }: { tag: Pick<PricingTag, 'name' | 'icon' | 'color' | 'bg_color'> }) {
  return (
    <span
      className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold"
      style={{ background: tag.bg_color, color: tag.color }}
    >
      <TagIcon icon={tag.icon} className="w-3 h-3" />
      {tag.name}
    </span>
  );
}

// ── TAG TYPE CONFIG ───────────────────────────────────────────────────────────
const TAG_TYPE_PRESETS: Record<string, { color: string; bg_color: string; icon: string }> = {
  black_friday: { color: '#ffffff', bg_color: '#111827', icon: 'Zap' },
  flash_sale:   { color: '#ffffff', bg_color: '#dc2626', icon: 'Flame' },
  clearance:    { color: '#ffffff', bg_color: '#7c3aed', icon: 'Tag' },
  new_arrival:  { color: '#ffffff', bg_color: '#0891b2', icon: 'Sparkles' },
  custom:       { color: '#ffffff', bg_color: '#b45309', icon: 'Tag' },
};

// ── Blank forms ───────────────────────────────────────────────────────────────
const blankTag = (): Partial<PricingTag> => ({
  name: '', slug: '', tag_type: 'custom', color: '#ffffff', bg_color: '#b45309',
  icon: 'Tag', discount_type: 'none', discount_value: 0,
  valid_from: new Date().toISOString().slice(0, 10),
  valid_until: null, is_active: true, description: '',
});

const blankPromo = (): Partial<Promotion> => ({
  code: '', name: '', discount_type: 'percentage', discount_value: 0,
  min_order_amount: null, max_uses: null,
  valid_from: new Date().toISOString().slice(0, 10),
  valid_until: null, is_active: true, applies_to: 'all',
});

// ══════════════════════════════════════════════════════════════════════════════
// TAB 1 — Pricing Tags
// ══════════════════════════════════════════════════════════════════════════════
function PricingTagsTab() {
  const [tags, setTags] = useState<PricingTag[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<Partial<PricingTag>>(blankTag());
  const [editId, setEditId] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [assignOpen, setAssignOpen] = useState(false);
  const [assignTag, setAssignTag] = useState<PricingTag | null>(null);
  const [tagProducts, setTagProducts] = useState<TagProduct[]>([]);
  const [allProducts, setAllProducts] = useState<AllProduct[]>([]);
  const [productSearch, setProductSearch] = useState('');
  const [assignSaving, setAssignSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const data = await api.get<PricingTag[]>('/api/pricing-tags/admin/all').catch(() => []);
    setTags(Array.isArray(data) ? data : []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const autoSlug = (name: string) =>
    name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

  const applyPreset = (type: string) => {
    const preset = TAG_TYPE_PRESETS[type] ?? TAG_TYPE_PRESETS.custom;
    setForm(f => ({ ...f, tag_type: type as PricingTag['tag_type'], ...preset }));
  };

  const openCreate = () => {
    setForm(blankTag()); setEditId(null); setOpen(true);
  };

  const openEdit = (t: PricingTag) => {
    setForm({ ...t, valid_from: t.valid_from?.slice(0, 10) ?? '', valid_until: t.valid_until?.slice(0, 10) ?? '' });
    setEditId(t.id); setOpen(true);
  };

  const handleSave = async () => {
    if (!form.name || !form.slug) { toast.error('Name and slug are required'); return; }
    setSaving(true);
    try {
      const payload = {
        ...form,
        discount_value: parseFloat(String(form.discount_value)) || 0,
        valid_from: form.valid_from || new Date().toISOString(),
        valid_until: form.valid_until || null,
      };
      if (editId) {
        await api.put(`/api/pricing-tags/${editId}`, payload);
        toast.success('Tag updated');
      } else {
        await api.post('/api/pricing-tags', payload);
        toast.success('Tag created');
      }
      setOpen(false); load();
    } catch (err) { toast.error((err as Error).message); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this tag? It will be removed from all assigned products.')) return;
    await api.delete(`/api/pricing-tags/${id}`);
    toast.success('Tag deleted'); load();
  };

  const openAssign = async (tag: PricingTag) => {
    setAssignTag(tag); setAssignOpen(true); setProductSearch('');
    const [tp, ap] = await Promise.all([
      api.get<TagProduct[]>(`/api/pricing-tags/${tag.id}/products`).catch(() => []),
      api.get<AllProduct[]>('/api/products/admin/all').catch(() => []),
    ]);
    setTagProducts(Array.isArray(tp) ? tp : []);
    setAllProducts(Array.isArray(ap) ? ap : []);
  };

  const toggleProduct = async (product: AllProduct) => {
    if (!assignTag) return;
    const isAssigned = tagProducts.some(p => p.id === product.id);
    if (isAssigned) {
      await api.delete(`/api/pricing-tags/${assignTag.id}/products/${product.id}`);
      setTagProducts(prev => prev.filter(p => p.id !== product.id));
    } else {
      await api.post(`/api/pricing-tags/${assignTag.id}/products/${product.id}`, {});
      setTagProducts(prev => [...prev, product as TagProduct]);
    }
  };

  const saveAssignments = async () => {
    if (!assignTag) return;
    setAssignSaving(true);
    await api.put(`/api/pricing-tags/${assignTag.id}/products`, {
      product_ids: tagProducts.map(p => p.id),
    });
    toast.success('Products updated'); setAssignOpen(false); load();
    setAssignSaving(false);
  };

  const filtered = allProducts.filter(p =>
    p.name.toLowerCase().includes(productSearch.toLowerCase()),
  );

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-base font-semibold text-gray-900">Pricing Tags</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            Create Black Friday, Flash Sale and custom promotional tags. Assign them to products to display badges.
          </p>
        </div>
        <Button onClick={openCreate} className="bg-amber-600 hover:bg-amber-700 text-white">
          <Plus className="w-4 h-4 mr-1" /> New Tag
        </Button>
      </div>

      {loading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(4)].map((_, i) => <div key={i} className="h-36 bg-gray-100 rounded-xl animate-pulse" />)}
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {tags.map(tag => (
            <div key={tag.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 space-y-3 h-full flex flex-col">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                    style={{ background: tag.bg_color, color: tag.color }}>
                    <TagIcon icon={tag.icon} className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-sm text-gray-900 truncate">{tag.name}</p>
                    <p className="text-xs text-gray-400">{tag.tag_type.replace('_', ' ')}</p>
                  </div>
                </div>
                <div className="flex gap-1 shrink-0">
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(tag)}><Pencil className="w-3.5 h-3.5" /></Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500" onClick={() => handleDelete(tag.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
                </div>
              </div>

              {tag.description && <p className="text-xs text-gray-500 line-clamp-2 text-pretty">{tag.description}</p>}

              <div className="flex flex-wrap gap-2 text-xs">
                {tag.discount_type !== 'none' && (
                  <span className="bg-green-50 text-green-700 px-2 py-0.5 rounded-full font-medium">
                    {tag.discount_type === 'percentage' ? `${tag.discount_value}% off`
                      : tag.discount_type === 'fixed' ? `GHS ${tag.discount_value} off`
                      : 'Free Shipping'}
                  </span>
                )}
                <span className="bg-gray-50 text-gray-600 px-2 py-0.5 rounded-full">
                  {tag.product_count} product{tag.product_count !== 1 ? 's' : ''}
                </span>
                {!tag.is_active && <span className="bg-red-50 text-red-600 px-2 py-0.5 rounded-full">Inactive</span>}
                {tag.valid_until && new Date(tag.valid_until) < new Date() && (
                  <span className="bg-orange-50 text-orange-600 px-2 py-0.5 rounded-full">Expired</span>
                )}
              </div>

              <div className="mt-auto pt-2 border-t border-gray-50">
                <Button variant="outline" size="sm" className="w-full h-8 text-xs" onClick={() => openAssign(tag)}>
                  <Package className="w-3.5 h-3.5 mr-1" /> Assign Products
                </Button>
              </div>
            </div>
          ))}
          {!tags.length && (
            <div className="col-span-3 py-16 text-center text-gray-400">
              <Tag className="w-10 h-10 mx-auto mb-3 text-gray-200" />
              <p className="font-medium">No pricing tags yet</p>
              <p className="text-sm mt-1">Create your first tag to start promoting products</p>
            </div>
          )}
        </div>
      )}

      {/* ── Create / Edit Tag Dialog ── */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-lg max-h-[90dvh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editId ? 'Edit Tag' : 'New Pricing Tag'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {/* Preview */}
            <div className="flex items-center justify-center py-3 bg-gray-50 rounded-xl">
              <TagBadge tag={{ name: form.name || 'Preview', icon: form.icon || 'Tag', color: form.color || '#fff', bg_color: form.bg_color || '#b45309' }} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-sm">Tag Name *</Label>
                <Input value={form.name || ''} onChange={e => setForm(f => ({ ...f, name: e.target.value, slug: f.slug || autoSlug(e.target.value) }))} placeholder="e.g. Black Friday" />
              </div>
              <div className="space-y-1">
                <Label className="text-sm">Slug *</Label>
                <Input value={form.slug || ''} onChange={e => setForm(f => ({ ...f, slug: e.target.value }))} placeholder="black-friday" />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-sm">Tag Type</Label>
              <Select value={form.tag_type || 'custom'} onValueChange={v => { setForm(f => ({ ...f, tag_type: v as PricingTag['tag_type'] })); applyPreset(v); }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="black_friday">Black Friday</SelectItem>
                  <SelectItem value="flash_sale">Flash Sale</SelectItem>
                  <SelectItem value="clearance">Clearance</SelectItem>
                  <SelectItem value="new_arrival">New Arrival</SelectItem>
                  <SelectItem value="custom">Custom</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="text-sm">Description</Label>
              <Textarea rows={2} value={form.description || ''} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Short description shown to admins" />
            </div>

            {/* Colours & Icon */}
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label className="text-sm">Text Color</Label>
                <div className="flex items-center gap-2">
                  <input type="color" value={form.color || '#ffffff'} onChange={e => setForm(f => ({ ...f, color: e.target.value }))} className="w-8 h-8 rounded cursor-pointer border border-gray-200" />
                  <Input value={form.color || ''} onChange={e => setForm(f => ({ ...f, color: e.target.value }))} className="flex-1 font-mono text-xs" />
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-sm">Background</Label>
                <div className="flex items-center gap-2">
                  <input type="color" value={form.bg_color || '#b45309'} onChange={e => setForm(f => ({ ...f, bg_color: e.target.value }))} className="w-8 h-8 rounded cursor-pointer border border-gray-200" />
                  <Input value={form.bg_color || ''} onChange={e => setForm(f => ({ ...f, bg_color: e.target.value }))} className="flex-1 font-mono text-xs" />
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-sm">Icon</Label>
                <Select value={form.icon || 'Tag'} onValueChange={v => setForm(f => ({ ...f, icon: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ICON_OPTIONS.map(i => <SelectItem key={i.key} value={i.key}>{i.key}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Discount */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-sm">Discount Type</Label>
                <Select value={form.discount_type || 'none'} onValueChange={v => setForm(f => ({ ...f, discount_type: v as PricingTag['discount_type'] }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None (label only)</SelectItem>
                    <SelectItem value="percentage">Percentage (%)</SelectItem>
                    <SelectItem value="fixed">Fixed (GHS)</SelectItem>
                    <SelectItem value="free_shipping">Free Shipping</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {(form.discount_type === 'percentage' || form.discount_type === 'fixed') && (
                <div className="space-y-1">
                  <Label className="text-sm">{form.discount_type === 'percentage' ? 'Percentage (%)' : 'Amount (GHS)'}</Label>
                  <Input type="number" min="0" value={form.discount_value || ''} onChange={e => setForm(f => ({ ...f, discount_value: parseFloat(e.target.value) || 0 }))} />
                </div>
              )}
            </div>

            {/* Validity */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-sm">Valid From</Label>
                <Input type="date" value={form.valid_from?.slice(0, 10) || ''} onChange={e => setForm(f => ({ ...f, valid_from: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label className="text-sm">Valid Until (optional)</Label>
                <Input type="date" value={form.valid_until?.slice(0, 10) || ''} onChange={e => setForm(f => ({ ...f, valid_until: e.target.value || null }))} />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Switch checked={form.is_active ?? true} onCheckedChange={v => setForm(f => ({ ...f, is_active: v }))} />
              <Label>Active</Label>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2 border-t">
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving} className="bg-amber-600 hover:bg-amber-700 text-white">
              {saving ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : null}
              {editId ? 'Update Tag' : 'Create Tag'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Assign Products Dialog ── */}
      <Dialog open={assignOpen} onOpenChange={setAssignOpen}>
        <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-xl max-h-[90dvh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              Assign Products
              {assignTag && <TagBadge tag={assignTag} />}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input placeholder="Search products…" value={productSearch} onChange={e => setProductSearch(e.target.value)} className="pl-9" />
            </div>
            <p className="text-xs text-gray-500">{tagProducts.length} product{tagProducts.length !== 1 ? 's' : ''} currently assigned</p>
            <div className="space-y-1.5 max-h-72 overflow-y-auto">
              {filtered.map(p => {
                const assigned = tagProducts.some(tp => tp.id === p.id);
                return (
                  <div key={p.id} onClick={() => toggleProduct(p)}
                    className={`flex items-center gap-3 p-2.5 rounded-lg border cursor-pointer transition-colors
                      ${assigned ? 'border-amber-300 bg-amber-50' : 'border-gray-100 hover:bg-gray-50'}`}>
                    <div className="w-9 h-9 rounded-lg overflow-hidden bg-gray-100 shrink-0">
                      {p.images?.[0]
                        ? <img src={p.images[0]} alt={p.name} className="w-full h-full object-cover" />
                        : <div className="w-full h-full flex items-center justify-center"><Package className="w-4 h-4 text-gray-300" /></div>
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{p.name}</p>
                      <p className="text-xs text-gray-400">GHS {Number(p.price).toFixed(2)}</p>
                    </div>
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors
                      ${assigned ? 'border-amber-500 bg-amber-500' : 'border-gray-300'}`}>
                      {assigned && <CheckCircle2 className="w-3 h-3 text-white" />}
                    </div>
                  </div>
                );
              })}
              {!filtered.length && <p className="text-center text-sm text-gray-400 py-8">No products found</p>}
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2 border-t">
            <Button variant="outline" onClick={() => setAssignOpen(false)}>Cancel</Button>
            <Button onClick={saveAssignments} disabled={assignSaving} className="bg-amber-600 hover:bg-amber-700 text-white">
              {assignSaving ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : null}
              Save Assignments
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// TAB 2 — Coupon Codes
// ══════════════════════════════════════════════════════════════════════════════
function CouponsTab() {
  const [promos, setPromos] = useState<Promotion[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<Partial<Promotion>>(blankPromo());
  const [editId, setEditId] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    const data = await api.get<Promotion[]>('/api/promotions/admin/all').catch(() => []);
    setPromos(Array.isArray(data) ? data : []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const openCreate = () => { setForm(blankPromo()); setEditId(null); setOpen(true); };
  const openEdit = (p: Promotion) => {
    setForm({ ...p, valid_from: p.valid_from?.slice(0, 10) ?? '', valid_until: p.valid_until?.slice(0, 10) ?? '' });
    setEditId(p.id); setOpen(true);
  };

  const handleSave = async () => {
    if (!form.code || !form.name || !form.discount_type) { toast.error('Code, name and type are required'); return; }
    setSaving(true);
    try {
      const payload = {
        ...form,
        code: (form.code || '').toUpperCase().trim(),
        discount_value: ['percentage', 'fixed'].includes(form.discount_type || '') ? (parseFloat(String(form.discount_value)) || 0) : 0,
        min_order_amount: form.min_order_amount ? parseFloat(String(form.min_order_amount)) : null,
        max_uses: form.max_uses ? parseInt(String(form.max_uses)) : null,
        valid_from: form.valid_from || new Date().toISOString(),
        valid_until: form.valid_until || null,
      };
      if (editId) {
        await api.put(`/api/promotions/${editId}`, payload);
        toast.success('Coupon updated');
      } else {
        await api.post('/api/promotions', payload);
        toast.success('Coupon created');
      }
      setOpen(false); load();
    } catch (err) { toast.error((err as Error).message); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this coupon?')) return;
    await api.delete(`/api/promotions/${id}`);
    toast.success('Deleted'); load();
  };

  const generateCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 8; i++) code += chars[Math.floor(Math.random() * chars.length)];
    setForm(f => ({ ...f, code }));
  };

  const filtered = promos.filter(p =>
    p.code.toLowerCase().includes(search.toLowerCase()) ||
    p.name.toLowerCase().includes(search.toLowerCase()),
  );

  const discountLabel = (p: Promotion) => {
    if (p.discount_type === 'percentage') return `${p.discount_value}% off`;
    if (p.discount_type === 'fixed') return `GHS ${p.discount_value} off`;
    return 'Free Shipping';
  };

  const isExpired = (p: Promotion) => p.valid_until && new Date(p.valid_until) < new Date();
  const isAtLimit = (p: Promotion) => p.max_uses !== null && p.used_count >= p.max_uses;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-base font-semibold text-gray-900">Coupon Codes</h2>
          <p className="text-sm text-gray-500 mt-0.5">Create and manage discount coupons customers apply at checkout.</p>
        </div>
        <Button onClick={openCreate} className="bg-amber-600 hover:bg-amber-700 text-white">
          <Plus className="w-4 h-4 mr-1" /> New Coupon
        </Button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <Input placeholder="Search coupons…" value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600 whitespace-nowrap">Code</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600 whitespace-nowrap">Name</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600 whitespace-nowrap">Discount</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600 whitespace-nowrap">Usage</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600 whitespace-nowrap">Expires</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600 whitespace-nowrap">Status</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600 whitespace-nowrap">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr><td colSpan={7} className="px-4 py-10 text-center"><Loader2 className="w-5 h-5 animate-spin mx-auto text-gray-300" /></td></tr>
              ) : filtered.map(p => (
                <tr key={p.id} className="hover:bg-gray-50/50">
                  <td className="px-4 py-3 whitespace-nowrap">
                    <code className="bg-amber-50 text-amber-800 px-2 py-0.5 rounded font-bold text-xs tracking-wider">{p.code}</code>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <p className="font-medium text-gray-900">{p.name}</p>
                    {p.min_order_amount && <p className="text-xs text-gray-400">Min: GHS {p.min_order_amount}</p>}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className="inline-flex items-center gap-1 text-green-700 font-semibold text-xs bg-green-50 px-2 py-0.5 rounded-full">
                      <TrendingDown className="w-3 h-3" />{discountLabel(p)}
                    </span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <span className="text-gray-700 font-medium">{p.used_count}{p.max_uses ? `/${p.max_uses}` : ''}</span>
                      {p.max_uses && (
                        <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div className="h-full bg-amber-400 rounded-full transition-all"
                            style={{ width: `${Math.min(100, (p.used_count / p.max_uses) * 100)}%` }} />
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-500">
                    {p.valid_until ? new Date(p.valid_until).toLocaleDateString() : 'No expiry'}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    {isExpired(p) ? (
                      <Badge className="bg-orange-50 text-orange-700 border-0 text-xs">Expired</Badge>
                    ) : isAtLimit(p) ? (
                      <Badge className="bg-red-50 text-red-700 border-0 text-xs">Limit Reached</Badge>
                    ) : p.is_active ? (
                      <Badge className="bg-green-50 text-green-700 border-0 text-xs">Active</Badge>
                    ) : (
                      <Badge variant="secondary" className="text-xs">Inactive</Badge>
                    )}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-right">
                    <div className="flex items-center gap-1 justify-end">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(p)}><Pencil className="w-4 h-4" /></Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500" onClick={() => handleDelete(p.id)}><Trash2 className="w-4 h-4" /></Button>
                    </div>
                  </td>
                </tr>
              ))}
              {!loading && !filtered.length && (
                <tr><td colSpan={7} className="px-4 py-12 text-center text-gray-400 text-sm">No coupons found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Create / Edit Coupon Dialog ── */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-lg max-h-[90dvh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editId ? 'Edit Coupon' : 'New Coupon Code'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1">
              <Label className="text-sm">Coupon Code *</Label>
              <div className="flex gap-2">
                <Input
                  value={form.code || ''}
                  onChange={e => setForm(f => ({ ...f, code: e.target.value.toUpperCase() }))}
                  placeholder="e.g. BLACKFRIDAY20"
                  className="font-mono tracking-wider flex-1"
                />
                <Button type="button" variant="outline" onClick={generateCode} className="shrink-0">
                  <RefreshCw className="w-4 h-4" />
                </Button>
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-sm">Coupon Name *</Label>
              <Input value={form.name || ''} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Black Friday 20% off" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-sm">Discount Type *</Label>
                <Select value={form.discount_type || 'percentage'} onValueChange={v => setForm(f => ({ ...f, discount_type: v as Promotion['discount_type'] }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percentage">Percentage (%)</SelectItem>
                    <SelectItem value="fixed">Fixed Amount (GHS)</SelectItem>
                    <SelectItem value="free_shipping">Free Shipping</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {form.discount_type !== 'free_shipping' && (
                <div className="space-y-1">
                  <Label className="text-sm">{form.discount_type === 'percentage' ? 'Percentage (%)' : 'Amount (GHS)'} *</Label>
                  <Input type="number" min="0" step={form.discount_type === 'percentage' ? '1' : '0.01'}
                    value={form.discount_value || ''}
                    onChange={e => setForm(f => ({ ...f, discount_value: parseFloat(e.target.value) || 0 }))} />
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-sm">Min. Order Amount (GHS)</Label>
                <Input type="number" min="0" value={form.min_order_amount || ''} onChange={e => setForm(f => ({ ...f, min_order_amount: parseFloat(e.target.value) || null }))} placeholder="No minimum" />
              </div>
              <div className="space-y-1">
                <Label className="text-sm">Max Uses</Label>
                <Input type="number" min="0" value={form.max_uses || ''} onChange={e => setForm(f => ({ ...f, max_uses: parseInt(e.target.value) || null }))} placeholder="Unlimited" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-sm">Valid From</Label>
                <Input type="date" value={form.valid_from?.slice(0, 10) || ''} onChange={e => setForm(f => ({ ...f, valid_from: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label className="text-sm">Valid Until</Label>
                <Input type="date" value={form.valid_until?.slice(0, 10) || ''} onChange={e => setForm(f => ({ ...f, valid_until: e.target.value || null }))} />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-sm">Applies To</Label>
              <Select value={form.applies_to || 'all'} onValueChange={v => setForm(f => ({ ...f, applies_to: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Orders</SelectItem>
                  <SelectItem value="products">Products Only</SelectItem>
                  <SelectItem value="gift_boxes">Gift Boxes Only</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <Switch checked={form.is_active ?? true} onCheckedChange={v => setForm(f => ({ ...f, is_active: v }))} />
              <Label>Active</Label>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2 border-t">
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving} className="bg-amber-600 hover:bg-amber-700 text-white">
              {saving ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : null}
              {editId ? 'Update Coupon' : 'Create Coupon'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// TAB 3 — Discount Overview
// ══════════════════════════════════════════════════════════════════════════════
function DiscountOverviewTab() {
  const [stats, setStats] = useState<DiscountStats | null>(null);
  const [promos, setPromos] = useState<Promotion[]>([]);
  const [tags, setTags] = useState<PricingTag[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get<DiscountStats>('/api/promotions/admin/stats').catch(() => null),
      api.get<Promotion[]>('/api/promotions/admin/all').catch(() => []),
      api.get<PricingTag[]>('/api/pricing-tags/admin/all').catch(() => []),
    ]).then(([s, p, t]) => {
      setStats(s);
      setPromos(Array.isArray(p) ? p.slice(0, 5) : []);
      setTags(Array.isArray(t) ? t : []);
      setLoading(false);
    });
  }, []);

  const topCoupons = [...promos].sort((a, b) => b.used_count - a.used_count).slice(0, 5);
  const activeTags = tags.filter(t => t.is_active && (!t.valid_until || new Date(t.valid_until) > new Date()));

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-base font-semibold text-gray-900">Discount Overview</h2>
        <p className="text-sm text-gray-500 mt-0.5">Summary of all active promotions, coupon usage and savings.</p>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Active Coupons', value: stats?.coupons.active_coupons ?? '—', icon: Ticket, color: 'text-amber-600', bg: 'bg-amber-50' },
          { label: 'Total Uses', value: stats?.coupons.total_uses ?? '—', icon: CheckCircle2, color: 'text-green-600', bg: 'bg-green-50' },
          { label: 'Tagged Products', value: stats?.tags.tagged_products ?? '—', icon: Tag, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'Customer Savings', value: stats?.savings.total_saved ? `GHS ${parseFloat(String(stats.savings.total_saved)).toFixed(0)}` : 'GHS 0', icon: TrendingDown, color: 'text-purple-600', bg: 'bg-purple-50' },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 h-full flex flex-col">
            <div className={`w-9 h-9 rounded-lg ${s.bg} flex items-center justify-center mb-3 shrink-0`}>
              <s.icon className={`w-4 h-4 ${s.color}`} />
            </div>
            <p className="text-2xl font-bold text-gray-900">{loading ? '—' : s.value}</p>
            <p className="text-xs text-gray-500 mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Active tags */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
        <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Tag className="w-4 h-4 text-amber-600" /> Active Pricing Tags ({activeTags.length})
        </h3>
        {activeTags.length === 0 ? (
          <p className="text-sm text-gray-400">No active tags. Create some in the Tags tab.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {activeTags.map(t => (
              <div key={t.id} className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-gray-100 bg-gray-50 text-sm">
                <TagBadge tag={t} />
                <span className="text-gray-500 text-xs">
                  {t.product_count} product{t.product_count !== 1 ? 's' : ''}
                  {t.discount_type !== 'none' && ` · ${t.discount_type === 'percentage' ? `${t.discount_value}% off` : t.discount_type === 'fixed' ? `GHS ${t.discount_value} off` : 'Free shipping'}`}
                </span>
                {t.valid_until && (
                  <span className="text-gray-400 text-xs flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    Until {new Date(t.valid_until).toLocaleDateString()}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Top coupons */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
        <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Ticket className="w-4 h-4 text-amber-600" /> Most Used Coupons
        </h3>
        {loading ? (
          <div className="space-y-2">{[...Array(3)].map((_, i) => <div key={i} className="h-10 bg-gray-100 rounded-lg animate-pulse" />)}</div>
        ) : topCoupons.length === 0 ? (
          <p className="text-sm text-gray-400">No coupons used yet.</p>
        ) : (
          <div className="space-y-3">
            {topCoupons.map(p => (
              <div key={p.id} className="flex items-center gap-3">
                <code className="bg-amber-50 text-amber-800 px-2 py-0.5 rounded font-bold text-xs tracking-wider w-28 shrink-0">{p.code}</code>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="text-xs text-gray-600 truncate">{p.name}</span>
                    <span className="text-xs text-gray-500 shrink-0 ml-2">
                      {p.used_count}{p.max_uses ? `/${p.max_uses}` : ''} uses
                    </span>
                  </div>
                  {p.max_uses ? (
                    <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-amber-400 rounded-full"
                        style={{ width: `${Math.min(100, (p.used_count / p.max_uses) * 100)}%` }} />
                    </div>
                  ) : (
                    <div className="w-full h-1.5 bg-amber-100 rounded-full" />
                  )}
                </div>
                {p.is_active && !p.valid_until || (p.valid_until && new Date(p.valid_until) > new Date())
                  ? <Badge className="bg-green-50 text-green-700 border-0 text-xs shrink-0">Active</Badge>
                  : <Badge className="bg-gray-50 text-gray-500 border-0 text-xs shrink-0">Inactive</Badge>
                }
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Expired / at-limit warning */}
      {stats && (stats.coupons.expired_coupons > 0) && (
        <div className="bg-orange-50 border border-orange-100 rounded-xl p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-orange-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-orange-800">
              {stats.coupons.expired_coupons} coupon{stats.coupons.expired_coupons !== 1 ? 's' : ''} expired
            </p>
            <p className="text-xs text-orange-600 mt-0.5">
              Consider removing or updating expired coupons in the Coupon Codes tab.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// MAIN PAGE
// ══════════════════════════════════════════════════════════════════════════════
export default function AdminPricingPage() {
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Pricing & Promotions</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Manage pricing tags (Black Friday, Flash Sale…), coupon codes and discount moderation.
        </p>
      </div>

      <Tabs defaultValue="tags">
        <TabsList className="grid grid-cols-3 w-full">
          <TabsTrigger value="tags" className="flex items-center gap-1.5">
            <Tag className="w-3.5 h-3.5" /> Pricing Tags
          </TabsTrigger>
          <TabsTrigger value="coupons" className="flex items-center gap-1.5">
            <Ticket className="w-3.5 h-3.5" /> Coupon Codes
          </TabsTrigger>
          <TabsTrigger value="overview" className="flex items-center gap-1.5">
            <BarChart3 className="w-3.5 h-3.5" /> Overview
          </TabsTrigger>
        </TabsList>
        <TabsContent value="tags" className="mt-5"><PricingTagsTab /></TabsContent>
        <TabsContent value="coupons" className="mt-5"><CouponsTab /></TabsContent>
        <TabsContent value="overview" className="mt-5"><DiscountOverviewTab /></TabsContent>
      </Tabs>
    </div>
  );
}
