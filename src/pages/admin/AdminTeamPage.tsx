import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
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
  Plus, Pencil, Trash2, UsersRound, Search, CheckCircle, XCircle,
} from 'lucide-react';
import type { TeamMember } from '@/types/index';

type MemberForm = {
  id?: string;
  name: string;
  role: string;
  photo_url: string;
  bio: string;
  email: string;
  linkedin_url: string;
  twitter_url: string;
  is_active: boolean;
  sort_order: number;
};

const EMPTY: MemberForm = {
  name: '', role: '', photo_url: '', bio: '', email: '',
  linkedin_url: '', twitter_url: '', is_active: true, sort_order: 0,
};

function initials(name: string): string {
  return name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
}

export default function AdminTeamPage() {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<MemberForm>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<TeamMember | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const data = await api.get<TeamMember[]>('/api/team/admin/all');
      setMembers(Array.isArray(data) ? data : []);
    } catch { toast.error('Failed to load team'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const openNew = () => { setForm(EMPTY); setFormOpen(true); };
  const openEdit = (m: TeamMember) => {
    setForm({
      id: m.id, name: m.name, role: m.role ?? '', photo_url: m.photo_url ?? '',
      bio: m.bio ?? '', email: m.email ?? '', linkedin_url: m.linkedin_url ?? '',
      twitter_url: m.twitter_url ?? '', is_active: m.is_active, sort_order: m.sort_order,
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
        role: form.role.trim() || null,
        photo_url: form.photo_url.trim() || null,
        bio: form.bio.trim() || null,
        email: form.email.trim() || null,
        linkedin_url: form.linkedin_url.trim() || null,
        twitter_url: form.twitter_url.trim() || null,
        is_active: form.is_active,
        sort_order: form.sort_order,
      };
      if (form.id) {
        await api.put(`/api/team/${form.id}`, payload);
        toast.success('Team member updated');
      } else {
        await api.post('/api/team', payload);
        toast.success('Team member created');
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
      await api.delete(`/api/team/${deleteTarget.id}`);
      toast.success('Team member deleted');
      setDeleteTarget(null);
      await load();
    } catch { toast.error('Delete failed'); }
  };

  const filtered = members.filter(m =>
    m.name.toLowerCase().includes(search.toLowerCase()) ||
    (m.role ?? '').toLowerCase().includes(search.toLowerCase()),
  );

  const activeCount = members.filter(m => m.is_active).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Team</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Manage the team members shown on your About page.
          </p>
        </div>
        <Button type="button" className="shrink-0" onClick={openNew}>
          <Plus className="w-4 h-4 mr-2" /> Add Member
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4">
        {[
          { label: 'Total', value: members.length, icon: UsersRound, color: 'text-amber-600 bg-amber-50' },
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
            <CardTitle className="text-sm font-semibold flex-1">All Members</CardTitle>
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
          ) : members.length === 0 ? (
            <div className="p-10 text-center">
              <UsersRound className="w-8 h-8 text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-500">No team members yet. Add one above.</p>
              <p className="text-xs text-gray-400 mt-1">
                Team members appear in the "Meet Our Team" section on your About page.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="text-left px-4 py-2.5 font-medium text-gray-600 whitespace-nowrap">Member</th>
                    <th className="text-left px-4 py-2.5 font-medium text-gray-600 whitespace-nowrap hidden md:table-cell">Role</th>
                    <th className="text-center px-4 py-2.5 font-medium text-gray-600 whitespace-nowrap">Status</th>
                    <th className="text-center px-4 py-2.5 font-medium text-gray-600 whitespace-nowrap">Order</th>
                    <th className="text-right px-4 py-2.5 font-medium text-gray-600 whitespace-nowrap">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((m, idx) => (
                    <tr key={m.id}
                      className={`border-b last:border-0 hover:bg-gray-50 transition-colors ${idx % 2 === 1 ? 'bg-gray-50/40' : ''}`}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          {m.photo_url ? (
                            <img src={m.photo_url} alt={m.name}
                              className="w-9 h-9 rounded-full object-cover shrink-0" />
                          ) : (
                            <div className="w-9 h-9 rounded-full bg-amber-100 flex items-center justify-center text-amber-700 font-bold text-xs shrink-0">
                              {initials(m.name) || <UsersRound className="w-4 h-4" />}
                            </div>
                          )}
                          <span className="font-medium text-gray-900">{m.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell text-gray-500">
                        {m.role || <span className="text-gray-300">—</span>}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {m.is_active ? (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                            <CheckCircle className="w-3 h-3" /> Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                            <XCircle className="w-3 h-3" /> Inactive
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center text-gray-500">{m.sort_order}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <Button type="button" size="sm" variant="ghost" className="h-8 w-8 p-0"
                            onClick={() => openEdit(m)}>
                            <Pencil className="w-3.5 h-3.5" />
                          </Button>
                          <Button type="button" size="sm" variant="ghost"
                            className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                            onClick={() => setDeleteTarget(m)}>
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
            <DialogTitle>{form.id ? 'Edit Member' : 'New Team Member'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-4 pt-1">
            <div className="space-y-1">
              <Label className="text-sm font-normal">Name <span className="text-destructive">*</span></Label>
              <Input value={form.name} placeholder="e.g. Ama Mensah"
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label className="text-sm font-normal">Role</Label>
              <Input value={form.role} placeholder="e.g. Founder & CEO"
                onChange={e => setForm(f => ({ ...f, role: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label className="text-sm font-normal">Photo URL</Label>
              <Input value={form.photo_url} placeholder="Paste the photo image URL"
                onChange={e => setForm(f => ({ ...f, photo_url: e.target.value }))} />
              {form.photo_url.trim() && (
                <div className="mt-2">
                  <img src={form.photo_url} alt="Photo preview"
                    className="w-16 h-16 rounded-full object-cover border" />
                </div>
              )}
            </div>
            <div className="space-y-1">
              <Label className="text-sm font-normal">Bio</Label>
              <Textarea value={form.bio} placeholder="Short bio…" rows={3}
                onChange={e => setForm(f => ({ ...f, bio: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label className="text-sm font-normal">Email</Label>
              <Input type="email" value={form.email} placeholder="name@example.com"
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label className="text-sm font-normal">LinkedIn URL</Label>
              <Input value={form.linkedin_url} placeholder="https://linkedin.com/in/…"
                onChange={e => setForm(f => ({ ...f, linkedin_url: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label className="text-sm font-normal">Twitter URL</Label>
              <Input value={form.twitter_url} placeholder="https://twitter.com/…"
                onChange={e => setForm(f => ({ ...f, twitter_url: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label className="text-sm font-normal">Sort Order</Label>
              <Input type="number" min={0} value={form.sort_order} className="w-28"
                onChange={e => setForm(f => ({ ...f, sort_order: Number(e.target.value) }))} />
            </div>
            <div className="flex items-center justify-between py-1">
              <div>
                <Label className="text-sm font-normal">Active</Label>
                <p className="text-xs text-gray-400">Inactive members are hidden from the About page</p>
              </div>
              <Switch checked={form.is_active}
                onCheckedChange={v => setForm(f => ({ ...f, is_active: v }))} />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setFormOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={!form.name.trim() || saving}>
                {saving ? 'Saving…' : form.id ? 'Save Changes' : 'Create Member'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={o => !o && setDeleteTarget(null)}>
        <AlertDialogContent className="max-w-[calc(100%-2rem)] md:max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete team member?</AlertDialogTitle>
            <AlertDialogDescription>
              <strong>{deleteTarget?.name}</strong> will be permanently removed from the
              Meet Our Team section.
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
