import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import {
  Plus, Pencil, Trash2, Building2, Search, ExternalLink, CheckCircle, XCircle,
} from 'lucide-react';
import type { Brand } from '@/types/index';

type BrandForm = {
  id?: string;
  name: string;
  logo_url: string;
  website_url: string;
  is_active: boolean;
  sort_order: number;
};

const EMPTY: BrandForm = {
  name: '', logo_url: '', website_url: '', is_active: true, sort_order: 0,
};

export default function AdminBrandsPage() {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<BrandForm>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Brand | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const data = await api.get<Brand[]>('/api/brands/admin/all');
      setBrands(Array.isArray(data) ? data : []);
    } catch { toast.error('Failed to load brands'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const openNew = () => { setForm(EMPTY); setFormOpen(true); };
  const openEdit = (b: Brand) => {
    setForm({
      id: b.id, name: b.name, logo_url: b.logo_url ?? '',
      website_url: b.website_url ?? '', is_active: b.is_active,
      sort_order: b.sort_order,
    });
    setFormOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        logo_url: form.logo_url.trim() || null,
        website_url: form.website_url.trim() || null,
        is_active: form.is_active,
        sort_order: form.sort_order,
      };
      if (form.id) {
        await api.put(`/api/brands/${form.id}`, payload);
        toast.success('Brand updated');
      } else {
        await api.post('/api/brands', payload);
        toast.success('Brand created');
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
      await api.delete(`/api/brands/${deleteTarget.id}`);
      toast.success('Brand deleted');
      setDeleteTarget(null);
      await load();
    } catch { toast.error('Delete failed'); }
  };

  const filtered = brands.filter(b =>
    b.name.toLowerCase().includes(search.toLowerCase()),
  );

  const activeCount = brands.filter(b => b.is_active).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Trusted Brands</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Upload brand logo URLs to feature them on your website.
          </p>
        </div>
        <Button type="button" className="shrink-0" onClick={openNew}>
          <Plus className="w-4 h-4 mr-2" /> Add Brand
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4">
        {[
          { label: 'Total Brands', value: brands.length, icon: Building2, color: 'text-amber-600 bg-amber-50' },
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
            <CardTitle className="text-sm font-semibold flex-1">All Brands</CardTitle>
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
          ) : brands.length === 0 ? (
            <div className="p-10 text-center">
              <Building2 className="w-8 h-8 text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-500">No brands yet. Add one above.</p>
              <p className="text-xs text-gray-400 mt-1">
                Featured brands appear in the "Trusted Brands We Carry" section on your site.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="text-left px-4 py-2.5 font-medium text-gray-600 whitespace-nowrap">Brand</th>
                    <th className="text-left px-4 py-2.5 font-medium text-gray-600 whitespace-nowrap hidden md:table-cell">Website</th>
                    <th className="text-center px-4 py-2.5 font-medium text-gray-600 whitespace-nowrap">Status</th>
                    <th className="text-center px-4 py-2.5 font-medium text-gray-600 whitespace-nowrap">Order</th>
                    <th className="text-right px-4 py-2.5 font-medium text-gray-600 whitespace-nowrap">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((b, idx) => (
                    <tr key={b.id}
                      className={`border-b last:border-0 hover:bg-gray-50 transition-colors ${idx % 2 === 1 ? 'bg-gray-50/40' : ''}`}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-10 h-10 rounded-lg bg-white border flex items-center justify-center shrink-0 overflow-hidden">
                            {b.logo_url ? (
                              <img src={b.logo_url} alt={b.name} className="w-full h-full object-contain p-1" />
                            ) : (
                              <Building2 className="w-4 h-4 text-amber-500" />
                            )}
                          </div>
                          <span className="font-medium text-gray-900">{b.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell text-gray-500">
                        {b.website_url ? (
                          <a href={b.website_url} target="_blank" rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-amber-600 hover:underline">
                            <ExternalLink className="w-3 h-3" />
                            {b.website_url.replace(/^https?:\/\//, '')}
                          </a>
                        ) : (
                          <span className="text-gray-300">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {b.is_active ? (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                            <CheckCircle className="w-3 h-3" /> Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                            <XCircle className="w-3 h-3" /> Inactive
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center text-gray-500">{b.sort_order}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <Button type="button" size="sm" variant="ghost" className="h-8 w-8 p-0"
                            onClick={() => openEdit(b)}>
                            <Pencil className="w-3.5 h-3.5" />
                          </Button>
                          <Button type="button" size="sm" variant="ghost"
                            className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                            onClick={() => setDeleteTarget(b)}>
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
        <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-lg">
          <DialogHeader>
            <DialogTitle>{form.id ? 'Edit Brand' : 'New Brand'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-4 pt-1">
            <div className="space-y-1">
              <Label className="text-sm font-normal">Name <span className="text-destructive">*</span></Label>
              <Input value={form.name} placeholder="e.g. Nestlé"
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label className="text-sm font-normal">Logo URL</Label>
              <Input value={form.logo_url} placeholder="Paste the brand logo image URL"
                onChange={e => setForm(f => ({ ...f, logo_url: e.target.value }))} />
              {form.logo_url.trim() && (
                <div className="mt-2 w-full max-w-[180px] h-16 rounded-lg bg-white border flex items-center justify-center overflow-hidden">
                  <img src={form.logo_url} alt="Logo preview" className="max-h-full max-w-full object-contain p-1" />
                </div>
              )}
            </div>
            <div className="space-y-1">
              <Label className="text-sm font-normal">Website URL</Label>
              <Input value={form.website_url} placeholder="https://example.com"
                onChange={e => setForm(f => ({ ...f, website_url: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label className="text-sm font-normal">Sort Order</Label>
              <Input type="number" min={0} value={form.sort_order} className="w-28"
                onChange={e => setForm(f => ({ ...f, sort_order: Number(e.target.value) }))} />
            </div>
            <div className="flex items-center justify-between py-1">
              <div>
                <Label className="text-sm font-normal">Active</Label>
                <p className="text-xs text-gray-400">Inactive brands are hidden from the website</p>
              </div>
              <Switch checked={form.is_active}
                onCheckedChange={v => setForm(f => ({ ...f, is_active: v }))} />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setFormOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={!form.name.trim() || saving}>
                {saving ? 'Saving…' : form.id ? 'Save Changes' : 'Create Brand'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={o => !o && setDeleteTarget(null)}>
        <AlertDialogContent className="max-w-[calc(100%-2rem)] md:max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete brand?</AlertDialogTitle>
            <AlertDialogDescription>
              <strong>{deleteTarget?.name}</strong> will be permanently removed from the
              Trusted Brands section.
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
