import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, Package, Search, CheckCircle, XCircle } from 'lucide-react';
import { resolveImageUrl, IMAGE_PLACEHOLDER } from '@/lib/media';
import type { GiftPackaging } from '@/types/index';

type PackForm = {
  id?: string;
  name: string;
  style: string;
  material: string;
  price: string;
  details: string;
  image_url: string;
  sort_order: number;
  is_active: boolean;
};

const EMPTY: PackForm = {
  name: '', style: '', material: '', price: '', details: '',
  image_url: '', sort_order: 0, is_active: true,
};

export default function AdminGiftPackagingPage() {
  const [packaging, setPackaging] = useState<GiftPackaging[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<PackForm>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<GiftPackaging | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const data = await api.get<GiftPackaging[]>('/api/gift-packaging/admin/all');
      setPackaging(Array.isArray(data) ? data : []);
    } catch { toast.error('Failed to load packaging'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const openNew = () => { setForm(EMPTY); setFormOpen(true); };
  const openEdit = (p: GiftPackaging) => {
    setForm({
      id: p.id, name: p.name, style: p.style ?? '', material: p.material ?? '',
      price: String(p.price), details: p.details ?? '', image_url: p.image_url ?? '',
      sort_order: p.sort_order, is_active: p.is_active,
    });
    setFormOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    const price = parseFloat(form.price);
    if (Number.isNaN(price) || price < 0) { toast.error('Enter a valid price (≥ 0)'); return; }
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        style: form.style.trim() || null,
        material: form.material.trim() || null,
        price,
        details: form.details.trim() || null,
        image_url: form.image_url.trim() || null,
        sort_order: form.sort_order,
        is_active: form.is_active,
      };
      if (form.id) {
        await api.put(`/api/gift-packaging/${form.id}`, payload);
        toast.success('Packaging updated');
      } else {
        await api.post('/api/gift-packaging', payload);
        toast.success('Packaging created');
      }
      setFormOpen(false);
      await load();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to save');
    } finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await api.delete(`/api/gift-packaging/${deleteTarget.id}`);
      toast.success('Packaging deleted');
      setDeleteTarget(null);
      await load();
    } catch { toast.error('Delete failed'); }
  };

  const filtered = packaging.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    (p.style ?? '').toLowerCase().includes(search.toLowerCase()) ||
    (p.material ?? '').toLowerCase().includes(search.toLowerCase()),
  );

  const activeCount = packaging.filter(p => p.is_active).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gift Packaging</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Packaging styles customers can choose for gift boxes.
          </p>
        </div>
        <Button type="button" className="shrink-0" onClick={openNew}>
          <Plus className="w-4 h-4 mr-2" /> Add Packaging
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4">
        {[
          { label: 'Total', value: packaging.length, icon: Package, color: 'text-amber-600 bg-amber-50' },
          { label: 'Active', value: activeCount, icon: CheckCircle, color: 'text-emerald-600 bg-emerald-50' },
        ].map(s => (
          <Card key={s.label}>
            <CardContent className="p-4 flex items-center gap-3">
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${s.color}`}>
                <s.icon className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs text-gray-500">{s.label}</p>
                <p className="text-xl font-bold text-gray-900">{s.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Table */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <CardTitle className="text-sm font-semibold flex-1">All Packaging</CardTitle>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
              <Input placeholder="Search…" value={search} onChange={e => setSearch(e.target.value)}
                className="pl-8 h-8 w-48 text-sm" />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 text-center text-sm text-gray-400">Loading…</div>
          ) : packaging.length === 0 ? (
            <div className="p-10 text-center">
              <Package className="w-8 h-8 text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-500">No packaging yet. Add one above.</p>
              <p className="text-xs text-gray-400 mt-1">
                Customers will choose from these styles when building a custom gift box.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="text-left px-4 py-2.5 font-medium text-gray-600 whitespace-nowrap">Packaging</th>
                    <th className="text-left px-4 py-2.5 font-medium text-gray-600 whitespace-nowrap hidden md:table-cell">Style</th>
                    <th className="text-left px-4 py-2.5 font-medium text-gray-600 whitespace-nowrap hidden md:table-cell">Material</th>
                    <th className="text-right px-4 py-2.5 font-medium text-gray-600 whitespace-nowrap">Price</th>
                    <th className="text-center px-4 py-2.5 font-medium text-gray-600 whitespace-nowrap">Status</th>
                    <th className="text-center px-4 py-2.5 font-medium text-gray-600 whitespace-nowrap">Order</th>
                    <th className="text-right px-4 py-2.5 font-medium text-gray-600 whitespace-nowrap">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((p, idx) => (
                    <tr key={p.id}
                      className={`border-b last:border-0 hover:bg-gray-50 transition-colors ${idx % 2 === 1 ? 'bg-gray-50/40' : ''}`}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <img
                            src={resolveImageUrl(p.image_url) || IMAGE_PLACEHOLDER}
                            alt={p.name}
                            className="w-10 h-10 rounded-lg object-cover bg-gray-50 shrink-0"
                            onError={e => { (e.currentTarget as HTMLImageElement).src = IMAGE_PLACEHOLDER; }}
                          />
                          <span className="font-medium text-gray-900">{p.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell text-gray-500">
                        {p.style || <span className="text-gray-300">—</span>}
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell text-gray-500">
                        {p.material || <span className="text-gray-300">—</span>}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-gray-900">
                        GHS {Number(p.price).toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {p.is_active ? (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                            <CheckCircle className="w-3 h-3" /> Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                            <XCircle className="w-3 h-3" /> Inactive
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center text-gray-500">{p.sort_order}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <Button type="button" size="sm" variant="ghost" className="h-8 w-8 p-0"
                            onClick={() => openEdit(p)}>
                            <Pencil className="w-3.5 h-3.5" />
                          </Button>
                          <Button type="button" size="sm" variant="ghost"
                            className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                            onClick={() => setDeleteTarget(p)}>
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Form dialog */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{form.id ? 'Edit Packaging' : 'New Packaging'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-4 pt-1">
            <div className="space-y-1">
              <Label className="text-sm font-normal">Name <span className="text-destructive">*</span></Label>
              <Input value={form.name} placeholder="e.g. Premium Gold Wrap"
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-sm font-normal">Style</Label>
                <Input value={form.style} placeholder="e.g. Elegant"
                  onChange={e => setForm(f => ({ ...f, style: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label className="text-sm font-normal">Material</Label>
                <Input value={form.material} placeholder="e.g. Kraft paper"
                  onChange={e => setForm(f => ({ ...f, material: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-sm font-normal">
                Price (GHS) <span className="text-destructive">*</span>
              </Label>
              <Input type="number" min="0" step="0.01" value={form.price}
                placeholder="0.00"
                onChange={e => setForm(f => ({ ...f, price: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label className="text-sm font-normal">Details</Label>
              <Textarea value={form.details} rows={3}
                placeholder="Short description shown to customers…"
                onChange={e => setForm(f => ({ ...f, details: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label className="text-sm font-normal">Image URL</Label>
              <Input value={form.image_url} placeholder="Paste an image link (incl. Google Drive)"
                onChange={e => setForm(f => ({ ...f, image_url: e.target.value }))} />
              {form.image_url.trim() && (
                <img
                  src={resolveImageUrl(form.image_url) || IMAGE_PLACEHOLDER}
                  alt="Preview"
                  className="mt-2 w-24 h-24 rounded-lg object-cover bg-gray-50 border"
                  onError={e => { (e.currentTarget as HTMLImageElement).src = IMAGE_PLACEHOLDER; }}
                />
              )}
            </div>
            <div className="space-y-1">
              <Label className="text-sm font-normal">Sort Order</Label>
              <Input type="number" min={0} value={form.sort_order} className="w-28"
                onChange={e => setForm(f => ({ ...f, sort_order: Number(e.target.value) }))} />
            </div>
            <div className="flex items-center justify-between py-1">
              <div>
                <Label className="text-sm font-normal">Active</Label>
                <p className="text-xs text-gray-400">Inactive packaging is hidden from customers</p>
              </div>
              <Switch checked={form.is_active}
                onCheckedChange={v => setForm(f => ({ ...f, is_active: v }))} />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setFormOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={!form.name.trim() || saving}>
                {saving ? 'Saving…' : form.id ? 'Save Changes' : 'Create Packaging'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={o => !o && setDeleteTarget(null)}>
        <AlertDialogContent className="max-w-[calc(100%-2rem)] md:max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete packaging?</AlertDialogTitle>
            <AlertDialogDescription>
              <strong>{deleteTarget?.name}</strong> will be permanently removed. Customers will no
              longer be able to select it for gift boxes.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
