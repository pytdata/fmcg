import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, FolderOpen, Search, ChevronRight, Layers } from 'lucide-react';
import type { Category } from '@/types/index';

// ── helpers ──────────────────────────────────────────────────────────────────
function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

type CategoryForm = {
  id?: string;
  name: string; slug: string; description: string;
  image_url: string; sort_order: number; parent_id: string;
};

const EMPTY: CategoryForm = {
  name: '', slug: '', description: '', image_url: '', sort_order: 0, parent_id: '',
};

// Build a simple tree from flat list
function buildTree(flat: Category[]): Category[] {
  const map = new Map<string, Category>();
  flat.forEach(c => map.set(c.id, { ...c, children: [] }));
  const roots: Category[] = [];
  map.forEach(node => {
    if (node.parent_id && map.has(node.parent_id)) {
      map.get(node.parent_id)!.children!.push(node);
    } else {
      roots.push(node);
    }
  });
  return roots;
}

// ── Category row ─────────────────────────────────────────────────────────────
function CategoryRow({
  cat, depth, onEdit, onDelete,
}: {
  cat: Category; depth: number;
  onEdit: (c: Category) => void;
  onDelete: (c: Category) => void;
}) {
  const hasChildren = (cat.children?.length ?? 0) > 0;
  return (
    <>
      <tr className="border-b last:border-0 hover:bg-gray-50 transition-colors">
        <td className="px-4 py-3">
          <div className="flex items-center gap-2 min-w-0" style={{ paddingLeft: depth * 24 }}>
            {depth > 0 && <ChevronRight className="w-3.5 h-3.5 text-gray-300 shrink-0" />}
            {cat.image_url ? (
              <img src={cat.image_url} alt={cat.name}
                className="w-8 h-8 rounded-lg object-cover border shrink-0"
                onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
            ) : (
              <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center border shrink-0">
                {hasChildren
                  ? <Layers className="w-3.5 h-3.5 text-amber-500" />
                  : <FolderOpen className="w-3.5 h-3.5 text-amber-400" />}
              </div>
            )}
            <div className="min-w-0">
              <span className="font-medium text-gray-900 truncate block">{cat.name}</span>
              {hasChildren && (
                <span className="text-xs text-gray-400">{cat.children!.length} sub-categor{cat.children!.length === 1 ? 'y' : 'ies'}</span>
              )}
            </div>
          </div>
        </td>
        <td className="px-4 py-3">
          <Badge variant="secondary" className="font-mono text-xs">{cat.slug}</Badge>
        </td>
        <td className="px-4 py-3 hidden md:table-cell text-gray-500 max-w-[180px] truncate">
          {cat.description || <span className="text-gray-300">—</span>}
        </td>
        <td className="px-4 py-3 text-center text-gray-500">{cat.sort_order}</td>
        <td className="px-4 py-3">
          <div className="flex items-center justify-end gap-1">
            <Button type="button" size="sm" variant="ghost" className="h-8 w-8 p-0"
              onClick={() => onEdit(cat)}>
              <Pencil className="w-3.5 h-3.5" />
            </Button>
            <Button type="button" size="sm" variant="ghost"
              className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
              onClick={() => onDelete(cat)}>
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          </div>
        </td>
      </tr>
      {(cat.children ?? []).map(child => (
        <CategoryRow key={child.id} cat={child} depth={depth + 1}
          onEdit={onEdit} onDelete={onDelete} />
      ))}
    </>
  );
}

// ── Main ─────────────────────────────────────────────────────────────────────
export default function AdminCategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<Category | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<CategoryForm>(EMPTY);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const data = await api.get<Category[]>('/api/categories');
      setCategories(Array.isArray(data) ? data : []);
    } catch { toast.error('Failed to load categories'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const openNew = () => { setForm(EMPTY); setFormOpen(true); };
  const openEdit = (cat: Category) => {
    setForm({
      id: cat.id, name: cat.name, slug: cat.slug,
      description: cat.description ?? '', image_url: cat.image_url ?? '',
      sort_order: cat.sort_order, parent_id: cat.parent_id ?? '',
    });
    setFormOpen(true);
  };

  const existingSlugs = categories.map(c => c.slug);
  const slugConflict = !!form.slug &&
    existingSlugs.filter(s => s !== (form.id ? categories.find(c => c.id === form.id)?.slug : undefined)).includes(form.slug);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.slug.trim() || slugConflict) return;
    setSaving(true);
    try {
      const payload = {
        name: form.name, slug: form.slug,
        description: form.description || null, image_url: form.image_url || null,
        sort_order: form.sort_order, parent_id: form.parent_id || null,
      };
      if (form.id) {
        await api.put(`/api/categories/${form.id}`, payload);
        toast.success('Category updated');
      } else {
        await api.post('/api/categories', payload);
        toast.success('Category created');
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
      await api.delete(`/api/categories/${deleteTarget.id}`);
      toast.success('Category deleted — sub-categories promoted to top level');
      setDeleteTarget(null);
      await load();
    } catch { toast.error('Delete failed — category may be in use by products'); }
  };

  // Flat list for search; tree for display
  const filtered = search
    ? categories.filter(c =>
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        c.slug.toLowerCase().includes(search.toLowerCase()))
    : null; // null = show tree

  const tree = buildTree(categories);

  // Parent options (all top-level + ones that aren't the current item or its descendants)
  const parentOptions = categories.filter(c => c.id !== form.id);

  const stats = {
    total: categories.length,
    parents: categories.filter(c => !c.parent_id).length,
    children: categories.filter(c => !!c.parent_id).length,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Categories</h1>
          <p className="text-sm text-gray-500 mt-0.5">Manage product categories and sub-categories</p>
        </div>
        <Button type="button" className="shrink-0" onClick={openNew}>
          <Plus className="w-4 h-4 mr-2" /> New Category
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total', value: stats.total, icon: FolderOpen, color: 'text-amber-600 bg-amber-50' },
          { label: 'Top-level', value: stats.parents, icon: Layers, color: 'text-blue-600 bg-blue-50' },
          { label: 'Sub-categories', value: stats.children, icon: ChevronRight, color: 'text-emerald-600 bg-emerald-50' },
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
            <CardTitle className="text-sm font-semibold flex-1">All Categories</CardTitle>
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
          ) : categories.length === 0 ? (
            <div className="p-10 text-center">
              <FolderOpen className="w-8 h-8 text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-500">No categories yet. Create one above.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="text-left px-4 py-2.5 font-medium text-gray-600 whitespace-nowrap">Category</th>
                    <th className="text-left px-4 py-2.5 font-medium text-gray-600 whitespace-nowrap">Slug</th>
                    <th className="text-left px-4 py-2.5 font-medium text-gray-600 whitespace-nowrap hidden md:table-cell">Description</th>
                    <th className="text-center px-4 py-2.5 font-medium text-gray-600 whitespace-nowrap">Order</th>
                    <th className="text-right px-4 py-2.5 font-medium text-gray-600 whitespace-nowrap">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered
                    ? filtered.map(cat => (
                        <CategoryRow key={cat.id} cat={cat} depth={0}
                          onEdit={openEdit} onDelete={setDeleteTarget} />
                      ))
                    : tree.map(cat => (
                        <CategoryRow key={cat.id} cat={cat} depth={0}
                          onEdit={openEdit} onDelete={setDeleteTarget} />
                      ))
                  }
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create / Edit dialog */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-lg">
          <DialogHeader>
            <DialogTitle>{form.id ? 'Edit Category' : 'New Category'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-4 pt-1">
            {/* Name */}
            <div className="space-y-1">
              <Label className="text-sm font-normal">Name <span className="text-destructive">*</span></Label>
              <Input value={form.name} placeholder="e.g. Beverages"
                onChange={e => {
                  const v = e.target.value;
                  setForm(f => ({ ...f, name: v, ...(!f.id ? { slug: slugify(v) } : {}) }));
                }} />
            </div>
            {/* Slug */}
            <div className="space-y-1">
              <Label className="text-sm font-normal">Slug <span className="text-destructive">*</span></Label>
              <Input value={form.slug} placeholder="beverages"
                onChange={e => setForm(f => ({ ...f, slug: slugify(e.target.value) }))}
                className={slugConflict ? 'border-destructive' : ''} />
              {slugConflict && <p className="text-xs text-destructive">Slug already in use.</p>}
            </div>
            {/* Parent */}
            <div className="space-y-1">
              <Label className="text-sm font-normal">Parent Category</Label>
              <Select value={form.parent_id || 'none'}
                onValueChange={v => setForm(f => ({ ...f, parent_id: v === 'none' ? '' : v }))}>
                <SelectTrigger><SelectValue placeholder="None (top-level)" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None (top-level)</SelectItem>
                  {parentOptions.map(c => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.parent_id ? `  ↳ ${c.name}` : c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {/* Description */}
            <div className="space-y-1">
              <Label className="text-sm font-normal">Description</Label>
              <Textarea value={form.description} rows={2} placeholder="Optional"
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
            </div>
            {/* Image URL */}
            <div className="space-y-1">
              <Label className="text-sm font-normal">Image URL</Label>
              <Input value={form.image_url} placeholder="https://..."
                onChange={e => setForm(f => ({ ...f, image_url: e.target.value }))} />
              {form.image_url && (
                <img src={form.image_url} alt="preview"
                  className="mt-2 h-14 w-14 rounded-lg object-cover border"
                  onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
              )}
            </div>
            {/* Sort order */}
            <div className="space-y-1">
              <Label className="text-sm font-normal">Sort Order</Label>
              <Input type="number" min={0} value={form.sort_order} className="w-28"
                onChange={e => setForm(f => ({ ...f, sort_order: Number(e.target.value) }))} />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setFormOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={!form.name.trim() || !form.slug.trim() || slugConflict || saving}>
                {saving ? 'Saving…' : form.id ? 'Save Changes' : 'Create Category'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={o => !o && setDeleteTarget(null)}>
        <AlertDialogContent className="max-w-[calc(100%-2rem)] md:max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete category?</AlertDialogTitle>
            <AlertDialogDescription>
              <strong>{deleteTarget?.name}</strong> will be deleted. Any sub-categories will be
              promoted to the top level. Products using this category will become uncategorized.
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
