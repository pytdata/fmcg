import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Switch } from '@/components/ui/switch';
import { SearchableSelect, type SearchableSelectOption } from '@/components/ui/searchable-select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from '@/components/ui/accordion';
import { toast } from 'sonner';
import {
  Plus, Pencil, Trash2, FolderOpen, Search, ChevronRight,
  Layers, Package, RefreshCw,
} from 'lucide-react';
import type { Category } from '@/types/index';

// ── helpers ──────────────────────────────────────────────────────────────────
function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

type CategoryForm = {
  id?: string;
  name: string; slug: string; description: string;
  image_url: string; sort_order: number; parent_id: string; is_active: boolean;
};
const EMPTY: CategoryForm = {
  name: '', slug: '', description: '', image_url: '', sort_order: 0, parent_id: '', is_active: true,
};

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
  // sort children
  map.forEach(node => node.children?.sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name)));
  roots.sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name));
  return roots;
}

// ── Sub-category row (inside accordion) ──────────────────────────────────────
function StatusBadge({ active }: { active: boolean }) {
  return (
    <Badge
      variant="outline"
      className={active
        ? 'text-[10px] px-1.5 py-0 border-emerald-200 bg-emerald-50 text-emerald-700'
        : 'text-[10px] px-1.5 py-0 border-gray-200 bg-gray-100 text-gray-500'}
    >
      {active ? 'Active' : 'Inactive'}
    </Badge>
  );
}

function SubCategoryRow({
  cat, onEdit, onDelete, onToggle,
}: {
  cat: Category;
  onEdit: (c: Category) => void;
  onDelete: (c: Category) => void;
  onToggle: (c: Category) => void;
}) {
  const active = cat.is_active ?? true;
  return (
    <div className={`flex items-center gap-3 py-2.5 px-3 rounded-lg hover:bg-gray-50 transition-colors group ml-4 border-l-2 border-amber-100 ${active ? '' : 'opacity-60'}`}>
      <ChevronRight className="w-3 h-3 text-amber-300 shrink-0" />
      {cat.image_url ? (
        <img src={cat.image_url} alt={cat.name}
          className="w-7 h-7 rounded-md object-cover border shrink-0"
          onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
      ) : (
        <div className="w-7 h-7 rounded-md bg-amber-50 flex items-center justify-center border shrink-0">
          <FolderOpen className="w-3.5 h-3.5 text-amber-400" />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 min-w-0">
          <p className="text-sm font-medium text-gray-800 truncate">{cat.name}</p>
          <StatusBadge active={active} />
        </div>
        <p className="text-xs text-gray-400 truncate">{cat.slug}</p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full flex items-center gap-1">
          <Package className="w-3 h-3" />{cat.product_count ?? 0}
        </span>
        <Switch
          checked={active}
          onCheckedChange={() => onToggle(cat)}
          aria-label={active ? 'Deactivate category' : 'Activate category'}
        />
        <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
          <Button type="button" size="sm" variant="ghost" className="h-7 w-7 p-0"
            onClick={() => onEdit(cat)}>
            <Pencil className="w-3.5 h-3.5" />
          </Button>
          <Button type="button" size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive hover:text-destructive"
            onClick={() => onDelete(cat)}>
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}

// ── Top-level category accordion item ────────────────────────────────────────
function CategoryAccordionItem({
  cat, onEdit, onDelete, onAddSub, onToggle,
}: {
  cat: Category;
  onEdit: (c: Category) => void;
  onDelete: (c: Category) => void;
  onAddSub: (parent: Category) => void;
  onToggle: (c: Category) => void;
}) {
  const hasChildren = (cat.children?.length ?? 0) > 0;
  const active = cat.is_active ?? true;
  const totalProducts = (cat.product_count ?? 0) +
    (cat.children?.reduce((sum, c) => sum + (c.product_count ?? 0), 0) ?? 0);

  return (
    <AccordionItem value={cat.id} className={`border rounded-xl mb-2 overflow-hidden shadow-sm ${active ? '' : 'opacity-60'}`}>
      <div className="flex items-center gap-0 bg-white hover:bg-gray-50/60 transition-colors">
        {/* Expand trigger — only shown if has children */}
        {hasChildren ? (
          <AccordionTrigger className="flex-none px-3 py-0 h-14 hover:no-underline [&>svg]:shrink-0" />
        ) : (
          <div className="w-10 shrink-0" />
        )}

        {/* Category info — clicking expands too when has children */}
        <div className="flex-1 flex items-center gap-3 py-3 pr-3 min-w-0">
          {cat.image_url ? (
            <img src={cat.image_url} alt={cat.name}
              className="w-9 h-9 rounded-lg object-cover border shrink-0"
              onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
          ) : (
            <div className="w-9 h-9 rounded-lg bg-amber-50 flex items-center justify-center border shrink-0">
              {hasChildren
                ? <Layers className="w-4 h-4 text-amber-500" />
                : <FolderOpen className="w-4 h-4 text-amber-400" />}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 min-w-0">
              <p className="text-sm font-semibold text-gray-900 truncate">{cat.name}</p>
              <StatusBadge active={active} />
              {hasChildren && (
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0 shrink-0">
                  {cat.children!.length} sub
                </Badge>
              )}
            </div>
            <p className="text-xs text-gray-400 truncate">{cat.slug}</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs text-gray-500 bg-amber-50 border border-amber-100 px-2 py-0.5 rounded-full flex items-center gap-1">
              <Package className="w-3 h-3 text-amber-500" />{totalProducts}
            </span>
            <Switch
              checked={active}
              onCheckedChange={() => onToggle(cat)}
              aria-label={active ? 'Deactivate category' : 'Activate category'}
            />
            <Button type="button" size="sm" variant="ghost" className="h-7 px-2 text-xs text-amber-600 hover:text-amber-700 hover:bg-amber-50 gap-1"
              onClick={() => onAddSub(cat)}>
              <Plus className="w-3 h-3" /> Sub
            </Button>
            <Button type="button" size="sm" variant="ghost" className="h-7 w-7 p-0"
              onClick={() => onEdit(cat)}>
              <Pencil className="w-3.5 h-3.5" />
            </Button>
            <Button type="button" size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive hover:text-destructive"
              onClick={() => onDelete(cat)}>
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      </div>

      {hasChildren && (
        <AccordionContent className="pb-0">
          <div className="bg-gray-50/50 border-t px-3 py-2 space-y-0.5">
            {cat.children!.map(child => (
              <SubCategoryRow key={child.id} cat={child} onEdit={onEdit} onDelete={onDelete} onToggle={onToggle} />
            ))}
          </div>
        </AccordionContent>
      )}
    </AccordionItem>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
export default function AdminCategoriesPage() {
  const [flat, setFlat] = useState<Category[]>([]);
  const [tree, setTree] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const [form, setForm] = useState<CategoryForm>(EMPTY);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Category | null>(null);
  const [slugTouched, setSlugTouched] = useState(false);

  // Stats
  const totalCategories = flat.filter(c => !c.parent_id).length;
  const totalSubs = flat.filter(c => !!c.parent_id).length;
  const totalProducts = flat.reduce((s, c) => s + (!c.parent_id ? (c.product_count ?? 0) : 0), 0);

  const load = () => {
    setLoading(true);
    api.get<Category[]>('/api/categories/admin/all')
      .then(data => {
        const arr = Array.isArray(data) ? data : [];
        setFlat(arr);
        setTree(buildTree(arr));
      })
      .catch(() => toast.error('Failed to load categories'))
      .finally(() => setLoading(false));
  };
  useEffect(load, []);

  // Filtered tree
  const filteredTree = search.trim()
    ? flat.filter(c => c.name.toLowerCase().includes(search.toLowerCase()) || c.slug.includes(search.toLowerCase()))
        .map(c => ({ ...c, children: [] }))
    : tree;

  const openCreate = (parentCat?: Category) => {
    setForm({ ...EMPTY, parent_id: parentCat?.id ?? '' });
    setSlugTouched(false);
    setDialogOpen(true);
  };
  const openEdit = (cat: Category) => {
    setForm({
      id: cat.id, name: cat.name, slug: cat.slug,
      description: cat.description || '', image_url: cat.image_url || '',
      sort_order: cat.sort_order, parent_id: cat.parent_id || '',
      is_active: cat.is_active ?? true,
    });
    setSlugTouched(true);
    setDialogOpen(true);
  };

  const handleNameChange = (name: string) => {
    setForm(f => ({ ...f, name, slug: slugTouched ? f.slug : slugify(name) }));
  };

  const handleSave = async () => {
    if (!form.name || !form.slug) return toast.error('Name and slug are required');
    setSaving(true);
    const payload = {
      name: form.name.trim(), slug: form.slug.trim(),
      description: form.description || null,
      image_url: form.image_url || null,
      sort_order: form.sort_order,
      parent_id: form.parent_id || null,
      is_active: form.is_active,
    };
    try {
      if (form.id) {
        await api.put(`/api/categories/${form.id}`, payload);
        toast.success('Category updated');
      } else {
        await api.post('/api/categories', payload);
        toast.success('Category created');
      }
      setDialogOpen(false);
      load();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '';
      toast.error(msg.includes('Slug') ? 'Slug already exists' : 'Failed to save category');
    } finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await api.delete(`/api/categories/${deleteTarget.id}`);
      toast.success('Category deleted');
      setDeleteTarget(null);
      load();
    } catch { toast.error('Failed to delete category'); }
  };

  const handleToggleActive = async (cat: Category) => {
    const next = !(cat.is_active ?? true);
    try {
      await api.patch(`/api/categories/${cat.id}/active`, { is_active: next });
      toast.success(next ? 'Category activated' : 'Category hidden from website');
      load();
    } catch { toast.error('Failed to update status'); }
  };

  // Top-level parents (for parent selector, excluding self)
  const parentOptions = flat.filter(c => !c.parent_id && c.id !== form.id);
  const parentSelectOptions: SearchableSelectOption[] = [
    { value: 'none', label: 'Top-level (no parent)' },
    ...parentOptions.map(p => ({
      value: p.id,
      label: p.name,
      keywords: [p.slug],
    })),
  ];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Categories</h1>
          <p className="text-sm text-gray-500 mt-0.5">Manage product categories and sub-categories</p>
        </div>
        <div className="flex items-center gap-2">
          <Button type="button" size="sm" variant="outline" onClick={load} className="h-9">
            <RefreshCw className="w-3.5 h-3.5" />
          </Button>
          <Button type="button" onClick={() => openCreate()} className="h-9 gap-1.5">
            <Plus className="w-4 h-4" /> Add Category
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Categories', value: totalCategories, icon: Layers },
          { label: 'Sub-categories', value: totalSubs, icon: FolderOpen },
          { label: 'Total Products', value: totalProducts, icon: Package },
        ].map(s => (
          <Card key={s.label} className="h-full">
            <CardContent className="pt-4 pb-3 flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-amber-50 flex items-center justify-center shrink-0">
                <s.icon className="w-4 h-4 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{s.value}</p>
                <p className="text-xs text-gray-500">{s.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <Input placeholder="Search categories…" value={search}
          onChange={e => setSearch(e.target.value)} className="pl-9 h-9" />
      </div>

      {/* Accordion tree */}
      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-14 rounded-xl bg-gray-100 animate-pulse" />
          ))}
        </div>
      ) : filteredTree.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Layers className="w-8 h-8 text-gray-200 mx-auto mb-2" />
            <p className="text-gray-500 font-medium">No categories found</p>
            <p className="text-sm text-gray-400 mt-1">Create your first category to get started</p>
            <Button type="button" onClick={() => openCreate()} className="mt-4 gap-1.5">
              <Plus className="w-4 h-4" /> Add Category
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Accordion type="multiple" className="space-y-0">
          {filteredTree.map(cat => (
            <CategoryAccordionItem
              key={cat.id}
              cat={cat}
              onEdit={openEdit}
              onDelete={setDeleteTarget}
              onAddSub={openCreate}
              onToggle={handleToggleActive}
            />
          ))}
        </Accordion>
      )}

      {/* ── Create/Edit dialog ─────────────────────────────────────────────── */}
      <Dialog open={dialogOpen} onOpenChange={o => { if (!saving) setDialogOpen(o); }}>
        <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-lg">
          <DialogHeader>
            <DialogTitle>{form.id ? 'Edit Category' : 'Create Category'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2 space-y-1.5">
                <Label className="text-sm font-normal">Name <span className="text-red-500">*</span></Label>
                <Input value={form.name} onChange={e => handleNameChange(e.target.value)} placeholder="Category name" />
              </div>
              <div className="col-span-2 space-y-1.5">
                <Label className="text-sm font-normal">Slug <span className="text-red-500">*</span></Label>
                <Input value={form.slug}
                  onChange={e => { setSlugTouched(true); setForm(f => ({ ...f, slug: slugify(e.target.value) })); }}
                  placeholder="category-slug" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-normal">Parent Category</Label>
              <SearchableSelect
                value={form.parent_id || 'none'}
                onValueChange={v => setForm(f => ({ ...f, parent_id: v === 'none' ? '' : v }))}
                options={parentSelectOptions}
                placeholder="Top-level (no parent)"
                searchPlaceholder="Search categories…"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-normal">Description</Label>
              <Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                rows={2} className="resize-none" placeholder="Optional description" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-sm font-normal">Image URL</Label>
                <Input value={form.image_url} onChange={e => setForm(f => ({ ...f, image_url: e.target.value }))}
                  placeholder="https://..." />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm font-normal">Sort Order</Label>
                <Input type="number" value={form.sort_order}
                  onChange={e => setForm(f => ({ ...f, sort_order: Number(e.target.value) }))} />
              </div>
            </div>
            {form.image_url && (
              <img src={form.image_url} alt="Preview"
                className="w-full h-24 object-cover rounded-lg border"
                onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
            )}
            <div className="rounded-lg border bg-gray-50/60 p-3 space-y-2">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <Label className="text-sm font-normal">Active</Label>
                  <p className="text-xs text-gray-400">Visible on the website</p>
                </div>
                <Switch
                  checked={form.is_active}
                  onCheckedChange={v => setForm(f => ({ ...f, is_active: v }))}
                  aria-label="Category active status"
                />
              </div>
              <p className="text-xs text-gray-400">
                Inactive categories and their sub-categories are hidden from the website.
              </p>
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <Button type="button" variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>Cancel</Button>
            <Button type="button" onClick={handleSave} disabled={saving || !form.name || !form.slug}>
              {saving ? 'Saving…' : form.id ? 'Update' : 'Create'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Delete confirm ─────────────────────────────────────────────────── */}
      <AlertDialog open={!!deleteTarget} onOpenChange={o => !o && setDeleteTarget(null)}>
        <AlertDialogContent className="max-w-[calc(100%-2rem)] md:max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete "{deleteTarget?.name}"?</AlertDialogTitle>
            <AlertDialogDescription>
              {(deleteTarget?.children?.length ?? 0) > 0
                ? `This will also promote ${deleteTarget!.children!.length} sub-categor${deleteTarget!.children!.length === 1 ? 'y' : 'ies'} to top level.`
                : 'This action cannot be undone.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
