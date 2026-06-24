import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
import { Plus, Pencil, Trash2, Newspaper, Search, CheckCircle, FileText } from 'lucide-react';
import { resolveImageUrl, IMAGE_PLACEHOLDER } from '@/lib/media';
import type { BlogPost } from '@/types/index';

type PostForm = {
  id?: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  cover_image_url: string;
  category: string;
  author: string;
  read_time: string;
  is_published: boolean;
};

const EMPTY: PostForm = {
  title: '', slug: '', excerpt: '', content: '', cover_image_url: '',
  category: '', author: '', read_time: '', is_published: false,
};

function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function formatDate(value?: string | null): string {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

export default function AdminBlogPage() {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<PostForm>(EMPTY);
  const [slugTouched, setSlugTouched] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<BlogPost | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const data = await api.get<BlogPost[]>('/api/blog/admin/all');
      setPosts(Array.isArray(data) ? data : []);
    } catch {
      toast.error('Failed to load posts');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const openNew = () => {
    setForm(EMPTY);
    setSlugTouched(false);
    setFormOpen(true);
  };

  const openEdit = (post: BlogPost) => {
    setForm({
      id: post.id,
      title: post.title,
      slug: post.slug,
      excerpt: post.excerpt ?? '',
      content: post.content ?? '',
      cover_image_url: post.cover_image_url ?? '',
      category: post.category ?? '',
      author: post.author ?? '',
      read_time: post.read_time ?? '',
      is_published: post.is_published,
    });
    setSlugTouched(true);
    setFormOpen(true);
  };

  const onTitleChange = (value: string) => {
    setForm(f => ({
      ...f,
      title: value,
      slug: slugTouched ? f.slug : slugify(value),
    }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const title = form.title.trim();
    const slug = form.slug.trim();
    if (!title) { toast.error('Title is required'); return; }
    if (!slug) { toast.error('Slug is required'); return; }
    setSaving(true);
    try {
      const payload = {
        title,
        slug,
        excerpt: form.excerpt.trim() || null,
        content: form.content.trim() || null,
        cover_image_url: form.cover_image_url.trim() || null,
        category: form.category.trim() || null,
        author: form.author.trim() || null,
        read_time: form.read_time.trim() || null,
        is_published: form.is_published,
      };
      if (form.id) {
        await api.put(`/api/blog/${form.id}`, payload);
        toast.success('Post updated');
      } else {
        await api.post('/api/blog', payload);
        toast.success('Post created');
      }
      setFormOpen(false);
      await load();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await api.delete(`/api/blog/${deleteTarget.id}`);
      toast.success('Post deleted');
      setDeleteTarget(null);
      await load();
    } catch {
      toast.error('Delete failed');
    }
  };

  const filtered = posts.filter(p =>
    p.title.toLowerCase().includes(search.toLowerCase()) ||
    (p.category ?? '').toLowerCase().includes(search.toLowerCase()) ||
    (p.author ?? '').toLowerCase().includes(search.toLowerCase()),
  );

  const publishedCount = posts.filter(p => p.is_published).length;
  const preview = resolveImageUrl(form.cover_image_url);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Blog &amp; Tips</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Write articles and tips. Cover images are pasted as links (URLs / Google Drive) — no file uploads.
          </p>
        </div>
        <Button type="button" className="shrink-0" onClick={openNew}>
          <Plus className="w-4 h-4 mr-2" /> New Post
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total Posts', value: posts.length, icon: Newspaper, color: 'text-amber-600 bg-amber-50' },
          { label: 'Published', value: publishedCount, icon: CheckCircle, color: 'text-emerald-600 bg-emerald-50' },
          { label: 'Drafts', value: posts.length - publishedCount, icon: FileText, color: 'text-gray-600 bg-gray-100' },
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
            <CardTitle className="text-sm font-semibold flex-1">All Posts</CardTitle>
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
          ) : posts.length === 0 ? (
            <div className="p-10 text-center">
              <Newspaper className="w-8 h-8 text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-500">No posts yet. Write your first one above.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="text-left px-4 py-2.5 font-medium text-gray-600 whitespace-nowrap">Post</th>
                    <th className="text-left px-4 py-2.5 font-medium text-gray-600 whitespace-nowrap hidden md:table-cell">Category</th>
                    <th className="text-center px-4 py-2.5 font-medium text-gray-600 whitespace-nowrap">Status</th>
                    <th className="text-left px-4 py-2.5 font-medium text-gray-600 whitespace-nowrap hidden sm:table-cell">Date</th>
                    <th className="text-right px-4 py-2.5 font-medium text-gray-600 whitespace-nowrap">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((post, idx) => (
                    <tr key={post.id}
                      className={`border-b last:border-0 hover:bg-gray-50 transition-colors ${idx % 2 === 1 ? 'bg-gray-50/40' : ''}`}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <img
                            src={post.cover_image_url ? resolveImageUrl(post.cover_image_url) : IMAGE_PLACEHOLDER}
                            alt={post.title}
                            className="w-12 h-12 rounded-lg object-cover bg-gray-100 shrink-0"
                            onError={e => { (e.currentTarget as HTMLImageElement).src = IMAGE_PLACEHOLDER; }}
                          />
                          <div className="min-w-0">
                            <span className="font-medium text-gray-900 block truncate max-w-[20rem]">{post.title}</span>
                            <span className="text-xs text-gray-400 block truncate max-w-[20rem]">/{post.slug}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell text-gray-500">
                        {post.category || <span className="text-gray-300">—</span>}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {post.is_published ? (
                          <Badge className="bg-emerald-100 text-emerald-700 border-0">Published</Badge>
                        ) : (
                          <Badge variant="secondary" className="bg-gray-100 text-gray-600 border-0">Draft</Badge>
                        )}
                      </td>
                      <td className="px-4 py-3 hidden sm:table-cell text-gray-500 whitespace-nowrap">
                        {formatDate(post.published_at ?? post.created_at)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <Button type="button" size="sm" variant="ghost" className="h-8 w-8 p-0"
                            onClick={() => openEdit(post)}>
                            <Pencil className="w-3.5 h-3.5" />
                          </Button>
                          <Button type="button" size="sm" variant="ghost"
                            className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                            onClick={() => setDeleteTarget(post)}>
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
        <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{form.id ? 'Edit Post' : 'New Post'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-4 pt-1">
            <div className="space-y-1">
              <Label className="text-sm font-normal">Title <span className="text-destructive">*</span></Label>
              <Input value={form.title} placeholder="e.g. 5 Tips for the Perfect Gift Box"
                onChange={e => onTitleChange(e.target.value)} />
            </div>

            <div className="space-y-1">
              <Label className="text-sm font-normal">Slug <span className="text-destructive">*</span></Label>
              <Input value={form.slug} placeholder="auto-generated-from-title"
                onChange={e => { setSlugTouched(true); setForm(f => ({ ...f, slug: e.target.value })); }} />
              <p className="text-xs text-gray-400">Used in the URL: /blog/{form.slug || 'your-slug'}</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label className="text-sm font-normal">Category</Label>
                <Input value={form.category} placeholder="e.g. Gifting Tips"
                  onChange={e => setForm(f => ({ ...f, category: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label className="text-sm font-normal">Author</Label>
                <Input value={form.author} placeholder="e.g. KW Team"
                  onChange={e => setForm(f => ({ ...f, author: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label className="text-sm font-normal">Read time</Label>
                <Input value={form.read_time} placeholder="e.g. 4 min"
                  onChange={e => setForm(f => ({ ...f, read_time: e.target.value }))} />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-sm font-normal">Cover Image URL</Label>
              <Input value={form.cover_image_url} placeholder="Paste an image link (URL or Google Drive share link)"
                onChange={e => setForm(f => ({ ...f, cover_image_url: e.target.value }))} />
              <p className="text-xs text-gray-400">Media are links, not uploads. Paste a direct image or Google Drive link.</p>
              {preview && (
                <img
                  src={preview}
                  alt="Cover preview"
                  className="mt-2 w-full max-h-48 rounded-lg object-cover bg-gray-100 border"
                  onError={e => { (e.currentTarget as HTMLImageElement).src = IMAGE_PLACEHOLDER; }}
                />
              )}
            </div>

            <div className="space-y-1">
              <Label className="text-sm font-normal">Excerpt</Label>
              <Textarea value={form.excerpt} rows={2}
                placeholder="Short summary shown in listings"
                onChange={e => setForm(f => ({ ...f, excerpt: e.target.value }))} />
            </div>

            <div className="space-y-1">
              <Label className="text-sm font-normal">Content</Label>
              <Textarea value={form.content} rows={10}
                placeholder="Write the article here (markdown or plain text)"
                onChange={e => setForm(f => ({ ...f, content: e.target.value }))} />
            </div>

            <div className="flex items-center justify-between py-1">
              <div>
                <Label className="text-sm font-normal">Published</Label>
                <p className="text-xs text-gray-400">Drafts are hidden from the public blog</p>
              </div>
              <Switch checked={form.is_published}
                onCheckedChange={v => setForm(f => ({ ...f, is_published: v }))} />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setFormOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={!form.title.trim() || !form.slug.trim() || saving}>
                {saving ? 'Saving…' : form.id ? 'Save Changes' : 'Create Post'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={o => !o && setDeleteTarget(null)}>
        <AlertDialogContent className="max-w-[calc(100%-2rem)] md:max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete post?</AlertDialogTitle>
            <AlertDialogDescription>
              <strong>{deleteTarget?.title}</strong> will be permanently removed. This cannot be undone.
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
