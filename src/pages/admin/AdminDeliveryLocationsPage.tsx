import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, MapPin, Search, Truck, CheckCircle, XCircle } from 'lucide-react';
import type { DeliveryLocation } from '@/types/index';

type LocForm = {
  id?: string;
  name: string;
  region: string;
  delivery_fee: string;
  is_active: boolean;
  sort_order: number;
};

const EMPTY: LocForm = {
  name: '', region: '', delivery_fee: '', is_active: true, sort_order: 0,
};

export default function AdminDeliveryLocationsPage() {
  const [locations, setLocations] = useState<DeliveryLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<LocForm>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<DeliveryLocation | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const data = await api.get<DeliveryLocation[]>('/api/delivery-locations/admin/all');
      setLocations(Array.isArray(data) ? data : []);
    } catch { toast.error('Failed to load locations'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const openNew = () => { setForm(EMPTY); setFormOpen(true); };
  const openEdit = (loc: DeliveryLocation) => {
    setForm({
      id: loc.id, name: loc.name, region: loc.region ?? '',
      delivery_fee: String(loc.delivery_fee), is_active: loc.is_active,
      sort_order: loc.sort_order,
    });
    setFormOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    const fee = parseFloat(form.delivery_fee);
    if (isNaN(fee) || fee < 0) { toast.error('Enter a valid delivery fee (≥ 0)'); return; }
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(), region: form.region.trim() || null,
        delivery_fee: fee, is_active: form.is_active, sort_order: form.sort_order,
      };
      if (form.id) {
        await api.put(`/api/delivery-locations/${form.id}`, payload);
        toast.success('Location updated');
      } else {
        await api.post('/api/delivery-locations', payload);
        toast.success('Location created');
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
      await api.delete(`/api/delivery-locations/${deleteTarget.id}`);
      toast.success('Location deleted');
      setDeleteTarget(null);
      await load();
    } catch { toast.error('Delete failed'); }
  };

  const filtered = locations.filter(l =>
    l.name.toLowerCase().includes(search.toLowerCase()) ||
    (l.region ?? '').toLowerCase().includes(search.toLowerCase()),
  );

  const activeCount = locations.filter(l => l.is_active).length;
  const avgFee = locations.length
    ? (locations.reduce((s, l) => s + Number(l.delivery_fee), 0) / locations.length).toFixed(2)
    : '0.00';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Delivery Locations</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Define locations and their delivery fees — shown to customers at checkout
          </p>
        </div>
        <Button type="button" className="shrink-0" onClick={openNew}>
          <Plus className="w-4 h-4 mr-2" /> Add Location
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total Locations', value: locations.length, icon: MapPin, color: 'text-amber-600 bg-amber-50' },
          { label: 'Active', value: activeCount, icon: CheckCircle, color: 'text-emerald-600 bg-emerald-50' },
          { label: 'Avg. Fee (GHS)', value: avgFee, icon: Truck, color: 'text-blue-600 bg-blue-50' },
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
            <CardTitle className="text-sm font-semibold flex-1">All Locations</CardTitle>
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
          ) : locations.length === 0 ? (
            <div className="p-10 text-center">
              <MapPin className="w-8 h-8 text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-500">No delivery locations yet. Add one above.</p>
              <p className="text-xs text-gray-400 mt-1">
                Customers will see these locations at checkout to select their delivery area.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="text-left px-4 py-2.5 font-medium text-gray-600 whitespace-nowrap">Location</th>
                    <th className="text-left px-4 py-2.5 font-medium text-gray-600 whitespace-nowrap hidden md:table-cell">Region</th>
                    <th className="text-right px-4 py-2.5 font-medium text-gray-600 whitespace-nowrap">Delivery Fee</th>
                    <th className="text-center px-4 py-2.5 font-medium text-gray-600 whitespace-nowrap">Status</th>
                    <th className="text-center px-4 py-2.5 font-medium text-gray-600 whitespace-nowrap">Order</th>
                    <th className="text-right px-4 py-2.5 font-medium text-gray-600 whitespace-nowrap">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((loc, idx) => (
                    <tr key={loc.id}
                      className={`border-b last:border-0 hover:bg-gray-50 transition-colors ${idx % 2 === 1 ? 'bg-gray-50/40' : ''}`}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center shrink-0">
                            <MapPin className="w-3.5 h-3.5 text-amber-500" />
                          </div>
                          <span className="font-medium text-gray-900">{loc.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell text-gray-500">
                        {loc.region || <span className="text-gray-300">—</span>}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {Number(loc.delivery_fee) === 0 ? (
                          <Badge className="bg-emerald-100 text-emerald-700 border-0">Free</Badge>
                        ) : (
                          <span className="font-semibold text-gray-900">
                            GHS {Number(loc.delivery_fee).toFixed(2)}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {loc.is_active ? (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                            <CheckCircle className="w-3 h-3" /> Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                            <XCircle className="w-3 h-3" /> Inactive
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center text-gray-500">{loc.sort_order}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <Button type="button" size="sm" variant="ghost" className="h-8 w-8 p-0"
                            onClick={() => openEdit(loc)}>
                            <Pencil className="w-3.5 h-3.5" />
                          </Button>
                          <Button type="button" size="sm" variant="ghost"
                            className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                            onClick={() => setDeleteTarget(loc)}>
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
            <DialogTitle>{form.id ? 'Edit Location' : 'New Delivery Location'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-4 pt-1">
            <div className="space-y-1">
              <Label className="text-sm font-normal">Location Name <span className="text-destructive">*</span></Label>
              <Input value={form.name} placeholder="e.g. Accra Central"
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label className="text-sm font-normal">Region / Area</Label>
              <Input value={form.region} placeholder="e.g. Greater Accra"
                onChange={e => setForm(f => ({ ...f, region: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label className="text-sm font-normal">
                Delivery Fee (GHS) <span className="text-destructive">*</span>
              </Label>
              <Input type="number" min="0" step="0.01" value={form.delivery_fee}
                placeholder="0.00 for free delivery"
                onChange={e => setForm(f => ({ ...f, delivery_fee: e.target.value }))} />
              <p className="text-xs text-gray-400">Set to 0 for free delivery to this location.</p>
            </div>
            <div className="space-y-1">
              <Label className="text-sm font-normal">Sort Order</Label>
              <Input type="number" min={0} value={form.sort_order} className="w-28"
                onChange={e => setForm(f => ({ ...f, sort_order: Number(e.target.value) }))} />
            </div>
            <div className="flex items-center justify-between py-1">
              <div>
                <Label className="text-sm font-normal">Active</Label>
                <p className="text-xs text-gray-400">Inactive locations are hidden from checkout</p>
              </div>
              <Switch checked={form.is_active}
                onCheckedChange={v => setForm(f => ({ ...f, is_active: v }))} />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setFormOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={!form.name.trim() || saving}>
                {saving ? 'Saving…' : form.id ? 'Save Changes' : 'Create Location'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={o => !o && setDeleteTarget(null)}>
        <AlertDialogContent className="max-w-[calc(100%-2rem)] md:max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete location?</AlertDialogTitle>
            <AlertDialogDescription>
              <strong>{deleteTarget?.name}</strong> will be permanently removed. Existing orders
              referencing this location will not be affected.
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
