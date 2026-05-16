import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import type { Banner } from '@/types/index';

type BannerForm = { title: string; subtitle: string; image_url: string; link: string; button_text: string; sort_order: string; is_active: boolean };
const emptyForm = (): BannerForm => ({ title: '', subtitle: '', image_url: '', link: '', button_text: '', sort_order: '0', is_active: true });

export default function AdminBannersPage() {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [editing, setEditing] = useState<Banner | null>(null);
  const [form, setForm] = useState<BannerForm>(emptyForm());
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);

  const fetchBanners = async () => {
    try {
      const data = await api.get<Banner[]>('/api/banners/admin/all');
      setBanners(Array.isArray(data) ? data : []);
    } catch { toast.error('Failed to load banners'); }
  };

  useEffect(() => { fetchBanners(); }, []);

  const save = async () => {
    if (!form.title) { toast.error('Title is required'); return; }
    setLoading(true);
    const payload = {
      title: form.title,
      subtitle: form.subtitle || null,
      image_url: form.image_url || null,
      link: form.link || null,
      button_text: form.button_text || null,
      sort_order: parseInt(form.sort_order) || 0,
      is_active: form.is_active,
    };
    try {
      if (editing) {
        await api.put(`/api/banners/${editing.id}`, payload);
        toast.success('Banner updated');
        setEditDialogOpen(false);
      } else {
        await api.post('/api/banners', payload);
        toast.success('Banner created');
        setDialogOpen(false);
      }
      setEditing(null);
      setForm(emptyForm());
      await fetchBanners();
    } catch (err) {
      toast.error((err as Error).message || 'Failed to save banner');
    } finally {
      setLoading(false);
    }
  };

  const remove = async (id: string) => {
    if (!confirm('Delete this banner?')) return;
    try {
      await api.delete(`/api/banners/${id}`);
      toast.success('Deleted');
      fetchBanners();
    } catch { toast.error('Failed to delete'); }
  };

  const openEdit = (b: Banner) => {
    setEditing(b);
    setForm({
      title: b.title, subtitle: b.subtitle || '', image_url: b.image_url || '',
      link: b.link || '', button_text: b.button_text || '',
      sort_order: String(b.sort_order), is_active: b.is_active,
    });
    setEditDialogOpen(true);
  };

  const FormFields = () => (
    <div className="space-y-3">
      <div><Label className="text-sm font-normal">Title *</Label><Input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} /></div>
      <div><Label className="text-sm font-normal">Subtitle</Label><Input value={form.subtitle} onChange={e => setForm({ ...form, subtitle: e.target.value })} /></div>
      <div><Label className="text-sm font-normal">Image URL</Label><Input value={form.image_url} onChange={e => setForm({ ...form, image_url: e.target.value })} placeholder="https://..." /></div>
      <div><Label className="text-sm font-normal">Link URL</Label><Input value={form.link} onChange={e => setForm({ ...form, link: e.target.value })} placeholder="/shop" /></div>
      <div><Label className="text-sm font-normal">Button Text</Label><Input value={form.button_text} onChange={e => setForm({ ...form, button_text: e.target.value })} placeholder="Shop Now" /></div>
      <div><Label className="text-sm font-normal">Sort Order</Label><Input type="number" value={form.sort_order} onChange={e => setForm({ ...form, sort_order: e.target.value })} /></div>
      <div className="flex items-center gap-2"><Switch checked={form.is_active} onCheckedChange={v => setForm({ ...form, is_active: v })} /><Label className="text-sm font-normal">Active</Label></div>
      <Button onClick={save} disabled={loading} className="w-full bg-amber-600 hover:bg-amber-700">{loading ? 'Saving…' : 'Save'}</Button>
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Banners</h1>
        <Dialog open={dialogOpen} onOpenChange={open => { setDialogOpen(open); if (open) { setEditing(null); setForm(emptyForm()); } }}>
          <DialogTrigger asChild>
            <Button className="bg-amber-600 hover:bg-amber-700"><Plus className="w-4 h-4 mr-1" /> Add Banner</Button>
          </DialogTrigger>
          <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Add Banner</DialogTitle></DialogHeader>
            <FormFields />
          </DialogContent>
        </Dialog>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500">
            <tr>
              <th className="text-left px-4 py-3 whitespace-nowrap">Banner</th>
              <th className="text-left px-4 py-3 whitespace-nowrap">Link</th>
              <th className="text-left px-4 py-3 whitespace-nowrap">Order</th>
              <th className="text-left px-4 py-3 whitespace-nowrap">Active</th>
              <th className="text-right px-4 py-3 whitespace-nowrap">Actions</th>
            </tr>
          </thead>
          <tbody>
            {banners.length === 0 && <tr><td colSpan={5} className="text-center py-10 text-gray-400">No banners yet</td></tr>}
            {banners.map(b => (
              <tr key={b.id} className="border-b last:border-0 hover:bg-gray-50">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    {b.image_url && <img src={b.image_url} alt="" className="w-16 h-10 rounded object-cover bg-gray-50 shrink-0" />}
                    <div><p className="font-medium text-gray-900">{b.title}</p><p className="text-xs text-gray-400 line-clamp-1">{b.subtitle}</p></div>
                  </div>
                </td>
                <td className="px-4 py-3 text-xs max-w-[120px] truncate">{b.link}</td>
                <td className="px-4 py-3">{b.sort_order}</td>
                <td className="px-4 py-3">
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${b.is_active ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                    {b.is_active ? 'Yes' : 'No'}
                  </span>
                </td>
                <td className="px-4 py-3 text-right whitespace-nowrap">
                  <div className="flex items-center justify-end gap-2">
                    <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => openEdit(b)}><Pencil className="w-4 h-4" /></Button>
                    <Button size="icon" variant="ghost" className="h-8 w-8 text-red-500" onClick={() => remove(b.id)}><Trash2 className="w-4 h-4" /></Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Edit Banner</DialogTitle></DialogHeader>
          <FormFields />
        </DialogContent>
      </Dialog>
    </div>
  );
}

