import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, Star, Quote, MessageSquareQuote, CheckCircle } from 'lucide-react';
import type { Testimonial } from '@/types/index';

type Form = {
  id?: string;
  name: string;
  role: string;
  text: string;
  rating: number;
  avatar_url: string;
  sort_order: number;
  is_active: boolean;
};

const EMPTY: Form = { name: '', role: '', text: '', rating: 5, avatar_url: '', sort_order: 0, is_active: true };

function initials(name: string) {
  return name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
}

export default function AdminTestimonialsPage() {
  const [items, setItems] = useState<Testimonial[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<Form>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Testimonial | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const data = await api.get<Testimonial[]>('/api/testimonials/admin/all');
      setItems(Array.isArray(data) ? data : []);
    } catch { toast.error('Failed to load testimonials'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const openNew = () => { setForm(EMPTY); setFormOpen(true); };
  const openEdit = (t: Testimonial) => {
    setForm({
      id: t.id, name: t.name, role: t.role ?? '', text: t.text, rating: t.rating,
      avatar_url: t.avatar_url ?? '', sort_order: t.sort_order, is_active: t.is_active,
    });
    setFormOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.text.trim()) { toast.error('Name and testimonial text are required'); return; }
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(), role: form.role.trim() || null, text: form.text.trim(),
        rating: form.rating, avatar_url: form.avatar_url.trim() || null,
        sort_order: form.sort_order, is_active: form.is_active,
      };
      if (form.id) { await api.put(`/api/testimonials/${form.id}`, payload); toast.success('Testimonial updated'); }
      else { await api.post('/api/testimonials', payload); toast.success('Testimonial added'); }
      setFormOpen(false);
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save');
    } finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await api.delete(`/api/testimonials/${deleteTarget.id}`);
      toast.success('Testimonial deleted');
      setDeleteTarget(null);
      await load();
    } catch { toast.error('Delete failed'); }
  };

  const activeCount = items.filter(t => t.is_active).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Testimonials</h1>
          <p className="text-sm text-gray-500 mt-0.5">Customer reviews shown on the homepage.</p>
        </div>
        <Button type="button" className="shrink-0" onClick={openNew}>
          <Plus className="w-4 h-4 mr-2" /> Add Testimonial
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {[
          { label: 'Total', value: items.length, icon: MessageSquareQuote, color: 'text-amber-600 bg-amber-50' },
          { label: 'Active', value: activeCount, icon: CheckCircle, color: 'text-emerald-600 bg-emerald-50' },
        ].map(s => (
          <Card key={s.label}>
            <CardContent className="p-4 flex items-center gap-3">
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${s.color}`}><s.icon className="w-4 h-4" /></div>
              <div><p className="text-xs text-gray-500">{s.label}</p><p className="text-xl font-bold text-gray-900">{s.value}</p></div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-sm font-semibold">All Testimonials</CardTitle></CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 text-center text-sm text-gray-400">Loading…</div>
          ) : items.length === 0 ? (
            <div className="p-10 text-center">
              <Quote className="w-8 h-8 text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-500">No testimonials yet. Add one above.</p>
            </div>
          ) : (
            <div className="divide-y">
              {items.map(t => (
                <div key={t.id} className={`flex items-start gap-3 p-4 ${!t.is_active ? 'opacity-60' : ''}`}>
                  <div className="w-9 h-9 rounded-full bg-amber-100 flex items-center justify-center text-amber-700 font-bold text-sm shrink-0 overflow-hidden">
                    {t.avatar_url ? <img src={t.avatar_url} alt={t.name} className="w-full h-full object-cover" /> : initials(t.name)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-gray-900">{t.name}</span>
                      {t.role && <span className="text-xs text-gray-400">{t.role}</span>}
                      <span className="flex gap-0.5">{[...Array(Math.min(5, t.rating || 5))].map((_, i) => <Star key={i} className="w-3 h-3 fill-amber-400 text-amber-400" />)}</span>
                      {!t.is_active && <span className="text-[10px] uppercase font-semibold text-gray-400">Hidden</span>}
                    </div>
                    <p className="text-sm text-gray-500 mt-0.5 line-clamp-2">{t.text}</p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button type="button" size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => openEdit(t)}><Pencil className="w-3.5 h-3.5" /></Button>
                    <Button type="button" size="sm" variant="ghost" className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => setDeleteTarget(t)}><Trash2 className="w-3.5 h-3.5" /></Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-lg">
          <DialogHeader><DialogTitle>{form.id ? 'Edit Testimonial' : 'New Testimonial'}</DialogTitle></DialogHeader>
          <form onSubmit={handleSave} className="space-y-4 pt-1">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-sm font-normal">Name <span className="text-destructive">*</span></Label>
                <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Abena Mensah" />
              </div>
              <div className="space-y-1">
                <Label className="text-sm font-normal">Role / Title</Label>
                <Input value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))} placeholder="e.g. Regular Customer" />
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-sm font-normal">Testimonial <span className="text-destructive">*</span></Label>
              <Textarea value={form.text} onChange={e => setForm(f => ({ ...f, text: e.target.value }))} rows={3} placeholder="What did they say?" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-sm font-normal">Rating</Label>
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map(n => (
                    <button key={n} type="button" onClick={() => setForm(f => ({ ...f, rating: n }))}>
                      <Star className={`w-5 h-5 ${n <= form.rating ? 'fill-amber-400 text-amber-400' : 'text-gray-300'}`} />
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-sm font-normal">Sort Order</Label>
                <Input type="number" min={0} value={form.sort_order} onChange={e => setForm(f => ({ ...f, sort_order: Number(e.target.value) }))} />
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-sm font-normal">Avatar Image URL</Label>
              <Input value={form.avatar_url} onChange={e => setForm(f => ({ ...f, avatar_url: e.target.value }))} placeholder="https://…  (optional)" />
            </div>
            <div className="flex items-center justify-between py-1">
              <div><Label className="text-sm font-normal">Active</Label><p className="text-xs text-gray-400">Hidden testimonials don't show on the site</p></div>
              <Switch checked={form.is_active} onCheckedChange={v => setForm(f => ({ ...f, is_active: v }))} />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setFormOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={saving || !form.name.trim() || !form.text.trim()}>{saving ? 'Saving…' : form.id ? 'Save Changes' : 'Add Testimonial'}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={o => !o && setDeleteTarget(null)}>
        <AlertDialogContent className="max-w-[calc(100%-2rem)] md:max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete testimonial?</AlertDialogTitle>
            <AlertDialogDescription>The testimonial from <strong>{deleteTarget?.name}</strong> will be permanently removed.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
