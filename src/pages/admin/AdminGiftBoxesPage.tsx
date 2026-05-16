import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import type { GiftBox } from '@/types/index';

export default function AdminGiftBoxesPage() {
  const [boxes, setBoxes] = useState<GiftBox[]>([]);
  const [editing, setEditing] = useState<GiftBox | null>(null);
  const [form, setForm] = useState<any>({});
  const [loading, setLoading] = useState(false);

  const fetch = async () => {
    const data = await api.get<GiftBox[]>('/api/gift-boxes/admin/all');
    setBoxes(Array.isArray(data) ? data : []);
  };

  useEffect(() => { fetch(); }, []);

  const save = async () => {
    setLoading(true);
    const payload = {
      name: form.name,
      slug: form.slug || form.name.toLowerCase().replace(/\s+/g, '-'),
      description: form.description,
      image_url: form.image_url,
      price: parseFloat(form.price) || 0,
      compare_price: parseFloat(form.compare_price) || null,
      items: JSON.parse(form.items || '[]'),
      packaging_style: form.packaging_style,
      promotional_discount: parseFloat(form.promotional_discount) || 0,
      coupon_code: form.coupon_code || null,
      is_published: !!form.is_published,
      is_active: !!form.is_active,
      sort_order: parseInt(form.sort_order) || 0,
    };
    if (editing) {
      await api.put(`/api/gift-boxes/${editing.id}`, payload);
      toast.success('Gift box updated');
    } else {
      await api.post('/api/gift-boxes', payload);
      toast.success('Gift box created');
    }
    setEditing(null); setForm({});
    await fetch(); setLoading(false);
  };

  const remove = async (id: string) => {
    if (!confirm('Delete this gift box?')) return;
    await api.delete(`/api/gift-boxes/${id}`);
    toast.success('Deleted'); fetch();
  };

  const openEdit = (b: GiftBox) => {
    setEditing(b);
    setForm({
      name: b.name, slug: b.slug, description: b.description, image_url: b.image_url || '',
      price: b.price, compare_price: b.compare_price || '', items: JSON.stringify(b.items || []),
      packaging_style: b.packaging_style || '', promotional_discount: b.promotional_discount || 0,
      coupon_code: b.coupon_code || '', is_published: b.is_published, is_active: b.is_active, sort_order: b.sort_order,
    });
  };

  const dialogBody = (
    <div className="space-y-3">
      <div><Label>Name</Label><Input value={form.name || ''} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
      <div><Label>Slug</Label><Input value={form.slug || ''} onChange={e => setForm({ ...form, slug: e.target.value })} /></div>
      <div><Label>Description</Label><Textarea value={form.description || ''} onChange={e => setForm({ ...form, description: e.target.value })} rows={2} /></div>
      <div><Label>Image URL</Label><Input value={form.image_url || ''} onChange={e => setForm({ ...form, image_url: e.target.value })} /></div>
      <div className="grid grid-cols-2 gap-3">
        <div><Label>Price</Label><Input type="number" value={form.price || ''} onChange={e => setForm({ ...form, price: e.target.value })} /></div>
        <div><Label>Compare Price</Label><Input type="number" value={form.compare_price || ''} onChange={e => setForm({ ...form, compare_price: e.target.value })} /></div>
      </div>
      <div><Label>Packaging Style</Label><Input value={form.packaging_style || ''} onChange={e => setForm({ ...form, packaging_style: e.target.value })} /></div>
      <div className="grid grid-cols-2 gap-3">
        <div><Label>Promo Discount</Label><Input type="number" value={form.promotional_discount || ''} onChange={e => setForm({ ...form, promotional_discount: e.target.value })} /></div>
        <div><Label>Coupon Code</Label><Input value={form.coupon_code || ''} onChange={e => setForm({ ...form, coupon_code: e.target.value })} /></div>
      </div>
      <div><Label>Items (JSON array)</Label><Textarea value={form.items || ''} onChange={e => setForm({ ...form, items: e.target.value })} rows={3} placeholder='[{"name":"Item","qty":1}]' /></div>
      <div><Label>Sort Order</Label><Input type="number" value={form.sort_order || ''} onChange={e => setForm({ ...form, sort_order: e.target.value })} /></div>
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2"><Switch checked={!!form.is_published} onCheckedChange={v => setForm({ ...form, is_published: v })} /><Label>Published</Label></div>
        <div className="flex items-center gap-2"><Switch checked={!!form.is_active} onCheckedChange={v => setForm({ ...form, is_active: v })} /><Label>Active</Label></div>
      </div>
      <Button onClick={save} disabled={loading} className="w-full bg-emerald-600 hover:bg-emerald-700">{loading ? 'Saving...' : 'Save'}</Button>
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Gift Boxes</h1>
        <Dialog>
          <DialogTrigger asChild>
            <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={() => { setEditing(null); setForm({}); }}><Plus className="w-4 h-4 mr-1" /> Add Gift Box</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto"><DialogHeader><DialogTitle>Add Gift Box</DialogTitle></DialogHeader>{dialogBody}</DialogContent>
        </Dialog>
      </div>
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500"><tr><th className="text-left px-4 py-3">Gift Box</th><th className="text-left px-4 py-3">Price</th><th className="text-left px-4 py-3">Status</th><th className="text-left px-4 py-3">Published</th><th className="text-right px-4 py-3">Actions</th></tr></thead>
          <tbody>
            {boxes.map(b => (
              <tr key={b.id} className="border-b last:border-0 hover:bg-gray-50">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <img src={b.image_url || ''} alt="" className="w-10 h-10 rounded object-cover bg-gray-50" />
                    <div><p className="font-medium text-gray-900">{b.name}</p><p className="text-xs text-gray-400">{b.packaging_style}</p></div>
                  </div>
                </td>
                <td className="px-4 py-3 font-medium">GHS {b.price.toFixed(2)}</td>
                <td className="px-4 py-3"><span className={`text-xs font-medium px-2 py-0.5 rounded-full ${b.is_active ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'}`}>{b.is_active ? 'Active' : 'Inactive'}</span></td>
                <td className="px-4 py-3"><span className={`text-xs font-medium px-2 py-0.5 rounded-full ${b.is_published ? 'bg-blue-50 text-blue-700' : 'bg-gray-100 text-gray-500'}`}>{b.is_published ? 'Published' : 'Draft'}</span></td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <Dialog>
                      <DialogTrigger asChild><Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => openEdit(b)}><Pencil className="w-4 h-4" /></Button></DialogTrigger>
                      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto"><DialogHeader><DialogTitle>Edit Gift Box</DialogTitle></DialogHeader>{dialogBody}</DialogContent>
                    </Dialog>
                    <Button size="icon" variant="ghost" className="h-8 w-8 text-red-500" onClick={() => remove(b.id)}><Trash2 className="w-4 h-4" /></Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
