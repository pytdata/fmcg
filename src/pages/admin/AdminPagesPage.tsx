import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import type { CmsPage } from '@/types/index';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import {
  Tabs, TabsContent, TabsList, TabsTrigger,
} from '@/components/ui/tabs';
import {
  Card, CardContent, CardHeader, CardTitle, CardDescription,
} from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Plus, Trash2, Save, Eye, Upload, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function AdminPagesPage() {
  const [pages, setPages] = useState<CmsPage[]>([]);
  const [activeSlug, setActiveSlug] = useState<string>('about');
  const [saving, setSaving] = useState(false);
  const [uploadingMedia, setUploadingMedia] = useState<string | null>(null);

  // Per-page edit state
  const [editMap, setEditMap] = useState<Record<string, Partial<CmsPage>>>({});

  useEffect(() => {
    api.get<CmsPage[]>('/api/pages').then(data => {
      setPages(data);
      const map: Record<string, Partial<CmsPage>> = {};
      data.forEach(p => { map[p.slug] = { ...p, content: { ...p.content } }; });
      setEditMap(map);
    }).catch(() => toast.error('Failed to load pages'));
  }, []);

  const current = editMap[activeSlug];
  const setContent = (key: string, value: unknown) => {
    setEditMap(prev => ({
      ...prev,
      [activeSlug]: {
        ...prev[activeSlug],
        content: { ...(prev[activeSlug]?.content as Record<string, unknown> || {}), [key]: value },
      },
    }));
  };
  const getContent = (key: string) =>
    (editMap[activeSlug]?.content as Record<string, unknown>)?.[key];

  const handleSave = async () => {
    if (!current) return;
    setSaving(true);
    try {
      await api.put(`/api/pages/${activeSlug}`, {
        title: current.title,
        content: current.content,
        meta_title: current.meta_title,
        meta_desc: current.meta_desc,
        is_published: current.is_published,
      });
      toast.success('Page saved successfully');
    } catch {
      toast.error('Failed to save page');
    } finally { setSaving(false); }
  };

  const handleMediaUpload = async (file: File, field: string) => {
    setUploadingMedia(field);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('category', 'pages');
      formData.append('entityType', 'page');
      formData.append('entityId', activeSlug);
      const res = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/media/upload`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${localStorage.getItem('kw_token')}` },
        body: formData,
      });
      const data = await res.json();
      if (data.jobId) toast.success('Image queued for processing');
      else toast.error(data.error || 'Upload failed');
    } catch { toast.error('Upload failed'); }
    finally { setUploadingMedia(null); }
  };

  if (!pages.length) {
    return (
      <div className="p-8 text-center text-gray-500">
        <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
        Loading pages...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Page Content Manager</h1>
          <p className="text-sm text-gray-500 mt-0.5">Edit About and Services page content — changes go live instantly</p>
        </div>
        <div className="flex items-center gap-2">
          <Link to={`/${activeSlug}`} target="_blank">
            <Button variant="outline" size="sm"><Eye className="w-4 h-4 mr-1" /> Preview</Button>
          </Link>
          <Button onClick={handleSave} disabled={saving} size="sm" className="bg-amber-600 hover:bg-amber-700 text-white">
            {saving ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Save className="w-4 h-4 mr-1" />}
            Save Changes
          </Button>
        </div>
      </div>

      <Tabs value={activeSlug} onValueChange={setActiveSlug}>
        <TabsList>
          {pages.map(p => (
            <TabsTrigger key={p.slug} value={p.slug} className="capitalize">
              {p.title}
              <Badge variant={p.is_published ? 'default' : 'secondary'} className="ml-2 text-xs py-0">
                {p.is_published ? 'Live' : 'Draft'}
              </Badge>
            </TabsTrigger>
          ))}
        </TabsList>

        {/* ── ABOUT PAGE ── */}
        <TabsContent value="about" className="space-y-4 mt-4">
          <AboutEditor
            current={editMap['about']}
            setEditMap={setEditMap}
            getContent={getContent}
            setContent={setContent}
            handleMediaUpload={handleMediaUpload}
            uploadingMedia={uploadingMedia}
          />
        </TabsContent>

        {/* ── SERVICES PAGE ── */}
        <TabsContent value="services" className="space-y-4 mt-4">
          <ServicesEditor
            current={editMap['services']}
            setEditMap={setEditMap}
            getContent={getContent}
            setContent={setContent}
            handleMediaUpload={handleMediaUpload}
            uploadingMedia={uploadingMedia}
          />
        </TabsContent>
      </Tabs>

      {/* Page meta + publish toggle */}
      {current && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">SEO & Publish Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid md:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-sm">Page Title</Label>
                <Input value={current.title || ''} onChange={e => setEditMap(p => ({ ...p, [activeSlug]: { ...p[activeSlug], title: e.target.value } }))} />
              </div>
              <div className="space-y-1">
                <Label className="text-sm">Meta Title</Label>
                <Input value={current.meta_title || ''} onChange={e => setEditMap(p => ({ ...p, [activeSlug]: { ...p[activeSlug], meta_title: e.target.value } }))} />
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-sm">Meta Description</Label>
              <Textarea rows={2} value={current.meta_desc || ''} onChange={e => setEditMap(p => ({ ...p, [activeSlug]: { ...p[activeSlug], meta_desc: e.target.value } }))} />
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={current.is_published ?? false}
                onCheckedChange={v => setEditMap(p => ({ ...p, [activeSlug]: { ...p[activeSlug], is_published: v } }))}
              />
              <Label>Published (visible to visitors)</Label>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ── About Page editor ──────────────────────────────────────────────────────────
function AboutEditor({ getContent, setContent, handleMediaUpload, uploadingMedia }: {
  current: Partial<CmsPage> | undefined;
  setEditMap: React.Dispatch<React.SetStateAction<Record<string, Partial<CmsPage>>>>;
  getContent: (k: string) => unknown;
  setContent: (k: string, v: unknown) => void;
  handleMediaUpload: (f: File, field: string) => Promise<void>;
  uploadingMedia: string | null;
}) {
  const hero = (getContent('hero') as Record<string, string>) || {};
  const values = (getContent('values') as { title: string; desc: string }[]) || [];
  const team = (getContent('team') as { name: string; role: string; bio?: string; image_url?: string }[]) || [];
  const stats = (getContent('stats') as { label: string; value: string }[]) || [];

  return (
    <div className="space-y-4">
      {/* Hero */}
      <Card>
        <CardHeader><CardTitle className="text-sm">Hero Section</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1"><Label className="text-sm">Heading</Label>
            <Input value={hero.heading || ''} onChange={e => setContent('hero', { ...hero, heading: e.target.value })} /></div>
          <div className="space-y-1"><Label className="text-sm">Subheading</Label>
            <Input value={hero.subheading || ''} onChange={e => setContent('hero', { ...hero, subheading: e.target.value })} /></div>
          <div className="space-y-1"><Label className="text-sm">Hero Image URL</Label>
            <div className="flex gap-2">
              <Input value={hero.image_url || ''} onChange={e => setContent('hero', { ...hero, image_url: e.target.value })} placeholder="https://..." className="flex-1" />
              <label className="cursor-pointer">
                <input type="file" accept="image/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) handleMediaUpload(f, 'about-hero'); }} />
                <Button variant="outline" size="sm" asChild>
                  <span>{uploadingMedia === 'about-hero' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}</span>
                </Button>
              </label>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Mission & Vision */}
      <Card>
        <CardHeader><CardTitle className="text-sm">Mission & Vision</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1"><Label className="text-sm">Mission</Label>
            <Textarea rows={3} value={(getContent('mission') as string) || ''} onChange={e => setContent('mission', e.target.value)} /></div>
          <div className="space-y-1"><Label className="text-sm">Vision</Label>
            <Textarea rows={3} value={(getContent('vision') as string) || ''} onChange={e => setContent('vision', e.target.value)} /></div>
        </CardContent>
      </Card>

      {/* Stats */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm">Stats Bar</CardTitle>
            <Button size="sm" variant="outline" onClick={() => setContent('stats', [...stats, { label: 'Metric', value: '0+' }])}>
              <Plus className="w-3 h-3 mr-1" /> Add
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid sm:grid-cols-2 gap-3">
            {stats.map((s, i) => (
              <div key={i} className="flex gap-2 items-center">
                <Input placeholder="Value" value={s.value} onChange={e => { const n = [...stats]; n[i] = { ...n[i], value: e.target.value }; setContent('stats', n); }} className="w-24" />
                <Input placeholder="Label" value={s.label} onChange={e => { const n = [...stats]; n[i] = { ...n[i], label: e.target.value }; setContent('stats', n); }} className="flex-1" />
                <Button size="icon" variant="ghost" className="shrink-0 text-red-500 h-8 w-8" onClick={() => setContent('stats', stats.filter((_, j) => j !== i))}><Trash2 className="w-4 h-4" /></Button>
              </div>
            ))}
            {!stats.length && <p className="text-sm text-gray-400 col-span-2">No stats yet. Click Add to add one.</p>}
          </div>
        </CardContent>
      </Card>

      {/* Values */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm">Core Values</CardTitle>
            <Button size="sm" variant="outline" onClick={() => setContent('values', [...values, { title: '', desc: '' }])}>
              <Plus className="w-3 h-3 mr-1" /> Add Value
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {values.map((v, i) => (
            <div key={i} className="flex gap-2 items-start p-3 border rounded-lg">
              <div className="flex-1 space-y-2">
                <Input placeholder="Title" value={v.title} onChange={e => { const n = [...values]; n[i] = { ...n[i], title: e.target.value }; setContent('values', n); }} />
                <Textarea placeholder="Description" rows={2} value={v.desc} onChange={e => { const n = [...values]; n[i] = { ...n[i], desc: e.target.value }; setContent('values', n); }} />
              </div>
              <Button size="icon" variant="ghost" className="text-red-500 shrink-0 h-8 w-8 mt-1" onClick={() => setContent('values', values.filter((_, j) => j !== i))}><Trash2 className="w-4 h-4" /></Button>
            </div>
          ))}
          {!values.length && <p className="text-sm text-gray-400">No values yet.</p>}
        </CardContent>
      </Card>

      {/* Team */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm">Team Members</CardTitle>
            <Button size="sm" variant="outline" onClick={() => setContent('team', [...team, { name: '', role: '', bio: '', image_url: '' }])}>
              <Plus className="w-3 h-3 mr-1" /> Add Member
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {team.map((m, i) => (
            <div key={i} className="flex gap-2 items-start p-3 border rounded-lg">
              <div className="flex-1 grid sm:grid-cols-2 gap-2">
                <Input placeholder="Full Name" value={m.name} onChange={e => { const n = [...team]; n[i] = { ...n[i], name: e.target.value }; setContent('team', n); }} />
                <Input placeholder="Role/Title" value={m.role} onChange={e => { const n = [...team]; n[i] = { ...n[i], role: e.target.value }; setContent('team', n); }} />
                <Input placeholder="Photo URL" value={m.image_url || ''} onChange={e => { const n = [...team]; n[i] = { ...n[i], image_url: e.target.value }; setContent('team', n); }} className="col-span-full sm:col-span-1" />
                <Textarea placeholder="Short bio" rows={2} value={m.bio || ''} onChange={e => { const n = [...team]; n[i] = { ...n[i], bio: e.target.value }; setContent('team', n); }} className="col-span-full sm:col-span-1" />
              </div>
              <Button size="icon" variant="ghost" className="text-red-500 shrink-0 h-8 w-8 mt-1" onClick={() => setContent('team', team.filter((_, j) => j !== i))}><Trash2 className="w-4 h-4" /></Button>
            </div>
          ))}
          {!team.length && <p className="text-sm text-gray-400">No team members yet.</p>}
        </CardContent>
      </Card>
    </div>
  );
}

// ── Services Page editor ───────────────────────────────────────────────────────
function ServicesEditor({ getContent, setContent, handleMediaUpload, uploadingMedia }: {
  current: Partial<CmsPage> | undefined;
  setEditMap: React.Dispatch<React.SetStateAction<Record<string, Partial<CmsPage>>>>;
  getContent: (k: string) => unknown;
  setContent: (k: string, v: unknown) => void;
  handleMediaUpload: (f: File, field: string) => Promise<void>;
  uploadingMedia: string | null;
}) {
  const hero = (getContent('hero') as Record<string, string>) || {};
  const services = (getContent('services') as { title: string; icon: string; desc: string; image_url?: string }[]) || [];
  const process = (getContent('process') as { step: string; title: string; desc: string }[]) || [];
  const ICONS = ['Truck', 'ShoppingBag', 'Gift', 'Building', 'Star', 'Award'];

  return (
    <div className="space-y-4">
      {/* Hero */}
      <Card>
        <CardHeader><CardTitle className="text-sm">Hero Section</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1"><Label className="text-sm">Heading</Label>
            <Input value={hero.heading || ''} onChange={e => setContent('hero', { ...hero, heading: e.target.value })} /></div>
          <div className="space-y-1"><Label className="text-sm">Subheading</Label>
            <Input value={hero.subheading || ''} onChange={e => setContent('hero', { ...hero, subheading: e.target.value })} /></div>
          <div className="space-y-1"><Label className="text-sm">Hero Image URL</Label>
            <div className="flex gap-2">
              <Input value={hero.image_url || ''} onChange={e => setContent('hero', { ...hero, image_url: e.target.value })} placeholder="https://..." className="flex-1" />
              <label className="cursor-pointer">
                <input type="file" accept="image/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) handleMediaUpload(f, 'services-hero'); }} />
                <Button variant="outline" size="sm" asChild>
                  <span>{uploadingMedia === 'services-hero' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}</span>
                </Button>
              </label>
            </div>
          </div>
          <div className="space-y-1"><Label className="text-sm">Intro Paragraph</Label>
            <Textarea rows={3} value={(getContent('intro') as string) || ''} onChange={e => setContent('intro', e.target.value)} /></div>
        </CardContent>
      </Card>

      {/* Services list */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm">Services</CardTitle>
            <CardDescription className="ml-auto mr-2 text-xs">Add cards for each service you offer</CardDescription>
            <Button size="sm" variant="outline" onClick={() => setContent('services', [...services, { title: '', icon: 'ShoppingBag', desc: '', image_url: '' }])}>
              <Plus className="w-3 h-3 mr-1" /> Add Service
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {services.map((svc, i) => (
            <div key={i} className="flex gap-2 items-start p-3 border rounded-lg">
              <div className="flex-1 grid sm:grid-cols-2 gap-2">
                <Input placeholder="Service Title" value={svc.title} onChange={e => { const n = [...services]; n[i] = { ...n[i], title: e.target.value }; setContent('services', n); }} />
                <select
                  value={svc.icon}
                  onChange={e => { const n = [...services]; n[i] = { ...n[i], icon: e.target.value }; setContent('services', n); }}
                  className="h-9 rounded-md border border-input bg-background px-3 text-sm"
                >
                  {ICONS.map(ic => <option key={ic} value={ic}>{ic}</option>)}
                </select>
                <Textarea placeholder="Description" rows={2} value={svc.desc} onChange={e => { const n = [...services]; n[i] = { ...n[i], desc: e.target.value }; setContent('services', n); }} className="col-span-full" />
                <Input placeholder="Image URL (optional)" value={svc.image_url || ''} onChange={e => { const n = [...services]; n[i] = { ...n[i], image_url: e.target.value }; setContent('services', n); }} className="col-span-full" />
              </div>
              <Button size="icon" variant="ghost" className="text-red-500 shrink-0 h-8 w-8 mt-1" onClick={() => setContent('services', services.filter((_, j) => j !== i))}><Trash2 className="w-4 h-4" /></Button>
            </div>
          ))}
          {!services.length && <p className="text-sm text-gray-400">No services yet. Click Add Service.</p>}
        </CardContent>
      </Card>

      {/* Process steps */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm">How It Works (Process Steps)</CardTitle>
            <Button size="sm" variant="outline" onClick={() => setContent('process', [...process, { step: String(process.length + 1), title: '', desc: '' }])}>
              <Plus className="w-3 h-3 mr-1" /> Add Step
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {process.map((step, i) => (
            <div key={i} className="flex gap-2 items-start p-3 border rounded-lg">
              <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-sm font-bold shrink-0 mt-1">{step.step}</div>
              <div className="flex-1 space-y-2">
                <Input placeholder="Step Title" value={step.title} onChange={e => { const n = [...process]; n[i] = { ...n[i], title: e.target.value }; setContent('process', n); }} />
                <Input placeholder="Step description" value={step.desc} onChange={e => { const n = [...process]; n[i] = { ...n[i], desc: e.target.value }; setContent('process', n); }} />
              </div>
              <Button size="icon" variant="ghost" className="text-red-500 shrink-0 h-8 w-8 mt-1" onClick={() => setContent('process', process.filter((_, j) => j !== i))}><Trash2 className="w-4 h-4" /></Button>
            </div>
          ))}
          {!process.length && <p className="text-sm text-gray-400">No process steps yet.</p>}
        </CardContent>
      </Card>
    </div>
  );
}
