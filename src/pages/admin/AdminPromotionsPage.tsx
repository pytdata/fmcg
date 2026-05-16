import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import type { Promotion } from '@/types/index';

type PromoForm = {
  code: string; name: string; discount_type: string; discount_value: string;
  min_order_amount: string; max_uses: string; valid_from: string; valid_until: string;
  is_active: boolean; applies_to: string;
};
const emptyForm = (): PromoForm => ({
  code: '', name: '', discount_type: 'percentage', discount_value: '',
  min_order_amount: '', max_uses: '', valid_from: '', valid_until: '',
  is_active: true, applies_to: 'all',
});

export default function AdminPromotionsPage() {
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [editing, setEditing] = useState<Promotion | null>(null);
  const [form, setForm] = useState<PromoForm>(emptyForm());
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);

  const fetchPromotions = async () => {
    try {
      const data = await api.get<Promotion[]>('/api/promotions/admin/all');
      setPromotions(Array.isArray(data) ? data : []);
    } catch { toast.error('Failed to load promotions'); }
  };

  useEffect(() => { fetchPromotions(); }, []);

  const save = async () => {
    if (!form.code || !form.name || !form.discount_value) {
      toast.error('Code, name and discount value are required'); return;
    }
    setLoading(true);
    const payload = {
      code: form.code.toUpperCase(),
      name: form.name,
      discount_type: form.discount_type,
      discount_value: parseFloat(form.discount_value) || 0,
      min_order_amount: parseFloat(form.min_order_amount) || null,
      max_uses: parseInt(form.max_uses) || null,
      valid_from: form.valid_from || null,
      valid_until: form.valid_until || null,
      is_active: form.is_active,
      applies_to: form.applies_to || 'all',
    };
    try {
      if (editing) {
        await api.put(`/api/promotions/${editing.id}`, payload);
        toast.success('Promotion updated');
        setEditDialogOpen(false);
      } else {
        await api.post('/api/promotions', payload);
        toast.success('Promotion created');
        setDialogOpen(false);
      }
      setEditing(null); setForm(emptyForm());
      await fetchPromotions();
    } catch (err) {
      toast.error((err as Error).message || 'Failed to save promotion');
    } finally {
      setLoading(false);
    }
  };

  const remove = async (id: string) => {
    if (!confirm('Delete this promotion?')) return;
    try {
      await api.delete(`/api/promotions/${id}`);
      toast.success('Deleted'); fetchPromotions();
    } catch { toast.error('Failed to delete'); }
  };

  const openEdit = (p: Promotion) => {
    setEditing(p);
    setForm({
      code: p.code, name: p.name, discount_type: p.discount_type,
      discount_value: String(p.discount_value),
      min_order_amount: p.min_order_amount ? String(p.min_order_amount) : '',
      max_uses: p.max_uses ? String(p.max_uses) : '',
      valid_from: p.valid_from ? String(p.valid_from).slice(0, 16) : '',
      valid_until: p.valid_until ? String(p.valid_until).slice(0, 16) : '',
      is_active: p.is_active, applies_to: p.applies_to || 'all',
    });
    setEditDialogOpen(true);
  };

  const FormFields = () => (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div><Label className="text-sm font-normal">Code *</Label><Input value={form.code} onChange={e => setForm({ ...form, code: e.target.value.toUpperCase() })} placeholder="SAVE10" /></div>
        <div><Label className="text-sm font-normal">Name *</Label><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Welcome Discount" /></div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-sm font-normal">Discount Type</Label>
          <Select value={form.discount_type} onValueChange={v => setForm({ ...form, discount_type: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="percentage">Percentage (%)</SelectItem>
              <SelectItem value="fixed">Fixed (GHS)</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div><Label className="text-sm font-normal">Discount Value *</Label><Input type="number" value={form.discount_value} onChange={e => setForm({ ...form, discount_value: e.target.value })} /></div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div><Label className="text-sm font-normal">Min Order (GHS)</Label><Input type="number" value={form.min_order_amount} onChange={e => setForm({ ...form, min_order_amount: e.target.value })} /></div>
        <div><Label className="text-sm font-normal">Max Uses</Label><Input type="number" value={form.max_uses} onChange={e => setForm({ ...form, max_uses: e.target.value })} /></div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div><Label className="text-sm font-normal">Valid From</Label><Input type="datetime-local" value={form.valid_from} onChange={e => setForm({ ...form, valid_from: e.target.value })} /></div>
        <div><Label className="text-sm font-normal">Valid Until</Label><Input type="datetime-local" value={form.valid_until} onChange={e => setForm({ ...form, valid_until: e.target.value })} /></div>
      </div>
      <div>
        <Label className="text-sm font-normal">Applies To</Label>
        <Select value={form.applies_to} onValueChange={v => setForm({ ...form, applies_to: v })}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Orders</SelectItem>
            <SelectItem value="products">Products Only</SelectItem>
            <SelectItem value="gift_boxes">Gift Boxes Only</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="flex items-center gap-2"><Switch checked={form.is_active} onCheckedChange={v => setForm({ ...form, is_active: v })} /><Label className="text-sm font-normal">Active</Label></div>
      <Button onClick={save} disabled={loading} className="w-full bg-amber-600 hover:bg-amber-700">{loading ? 'Saving…' : 'Save Promotion'}</Button>
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Promotions</h1>
        <Dialog open={dialogOpen} onOpenChange={open => { setDialogOpen(open); if (open) { setEditing(null); setForm(emptyForm()); } }}>
          <DialogTrigger asChild>
            <Button className="bg-amber-600 hover:bg-amber-700"><Plus className="w-4 h-4 mr-1" /> Add Promotion</Button>
          </DialogTrigger>
          <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Add Promotion</DialogTitle></DialogHeader>
            <FormFields />
          </DialogContent>
        </Dialog>
      </div>
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500">
            <tr>
              <th className="text-left px-4 py-3 whitespace-nowrap">Code</th>
              <th className="text-left px-4 py-3 whitespace-nowrap">Name</th>
              <th className="text-left px-4 py-3 whitespace-nowrap">Discount</th>
              <th className="text-left px-4 py-3 whitespace-nowrap">Uses</th>
              <th className="text-left px-4 py-3 whitespace-nowrap">Active</th>
              <th className="text-right px-4 py-3 whitespace-nowrap">Actions</th>
            </tr>
          </thead>
          <tbody>
            {promotions.length === 0 && <tr><td colSpan={6} className="text-center py-10 text-gray-400">No promotions yet</td></tr>}
            {promotions.map(p => (
              <tr key={p.id} className="border-b last:border-0 hover:bg-gray-50">
                <td className="px-4 py-3 font-mono font-medium whitespace-nowrap">{p.code}</td>
                <td className="px-4 py-3 whitespace-nowrap">{p.name}</td>
                <td className="px-4 py-3 whitespace-nowrap">
                  {p.discount_type === 'percentage' ? `${p.discount_value}%` : `GHS ${p.discount_value}`}
                </td>
                <td className="px-4 py-3 whitespace-nowrap">{p.used_count}{p.max_uses ? ` / ${p.max_uses}` : ''}</td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${p.is_active ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                    {p.is_active ? 'Yes' : 'No'}
                  </span>
                </td>
                <td className="px-4 py-3 text-right whitespace-nowrap">
                  <div className="flex items-center justify-end gap-2">
                    <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => openEdit(p)}><Pencil className="w-4 h-4" /></Button>
                    <Button size="icon" variant="ghost" className="h-8 w-8 text-red-500" onClick={() => remove(p.id)}><Trash2 className="w-4 h-4" /></Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Edit Promotion</DialogTitle></DialogHeader>
          <FormFields />
        </DialogContent>
      </Dialog>
    </div>
  );
}

