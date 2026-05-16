import { useEffect, useState, useCallback } from 'react';
import { api } from '@/lib/api';
import type { CmsPage } from '@/types/index';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Save, Eye, Loader2, Mail, MailOpen, Trash2, RefreshCw, Plus, Minus,
  FileText, Info, Briefcase, HelpCircle, Shield, Phone,
} from 'lucide-react';
import { Link } from 'react-router-dom';

// ── Types ─────────────────────────────────────────────────────────────────────
interface ContactMessage {
  id: string;
  name: string;
  email: string;
  phone?: string;
  subject?: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

// ── Tab config ────────────────────────────────────────────────────────────────
const PAGE_TABS = [
  { slug: 'about',    label: 'About',    icon: Info,       path: '/about' },
  { slug: 'services', label: 'Services', icon: Briefcase,  path: '/services' },
  { slug: 'contact',  label: 'Contact',  icon: Phone,      path: '/contact' },
  { slug: 'faq',      label: 'FAQ',      icon: HelpCircle, path: '/faq' },
  { slug: 'terms',    label: 'Terms',    icon: FileText,   path: '/terms' },
  { slug: 'privacy',  label: 'Privacy',  icon: Shield,     path: '/privacy' },
];

// ── Generic section helpers ───────────────────────────────────────────────────
function SectionField({
  label, value, onChange, multiline = false, placeholder = '',
}: {
  label: string; value: string; onChange: (v: string) => void;
  multiline?: boolean; placeholder?: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-sm font-normal">{label}</Label>
      {multiline
        ? <Textarea value={value} onChange={e => onChange(e.target.value)}
            rows={3} placeholder={placeholder} className="resize-none" />
        : <Input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} />
      }
    </div>
  );
}

// ── Hero editor (shared) ──────────────────────────────────────────────────────
function HeroEditor({
  content, onChange,
}: { content: Record<string, unknown>; onChange: (c: Record<string, unknown>) => void }) {
  const hero = (content.hero as Record<string, string>) || {};
  const set = (k: string, v: string) => onChange({ ...content, hero: { ...hero, [k]: v } });
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold">Hero Section</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <SectionField label="Heading" value={hero.heading || ''} onChange={v => set('heading', v)} placeholder="Main heading" />
        <SectionField label="Sub-heading" value={hero.subheading || ''} onChange={v => set('subheading', v)} multiline placeholder="Sub-heading text" />
        <SectionField label="Background Image URL" value={hero.image_url || ''} onChange={v => set('image_url', v)} placeholder="https://..." />
      </CardContent>
    </Card>
  );
}

// ── About editor ──────────────────────────────────────────────────────────────
function AboutEditor({ content, onChange }: { content: Record<string, unknown>; onChange: (c: Record<string, unknown>) => void }) {
  type Stat = { label: string; value: string };
  type Value = { title: string; desc: string };

  const stats: Stat[] = (content.stats as Stat[]) || [];
  const values: Value[] = (content.values as Value[]) || [];

  const setField = (k: string, v: unknown) => onChange({ ...content, [k]: v });
  const setStat = (i: number, k: keyof Stat, v: string) => {
    const updated = [...stats]; updated[i] = { ...updated[i], [k]: v };
    setField('stats', updated);
  };
  const setValue = (i: number, k: keyof Value, v: string) => {
    const updated = [...values]; updated[i] = { ...updated[i], [k]: v };
    setField('values', updated);
  };

  return (
    <div className="space-y-4">
      <HeroEditor content={content} onChange={onChange} />
      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-sm font-semibold">Mission & Vision</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <SectionField label="Mission" value={(content.mission as string) || ''} onChange={v => setField('mission', v)} multiline />
          <SectionField label="Vision" value={(content.vision as string) || ''} onChange={v => setField('vision', v)} multiline />
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold">Stats</CardTitle>
            <Button type="button" size="sm" variant="outline" className="h-7 text-xs"
              onClick={() => setField('stats', [...stats, { label: '', value: '' }])}>
              <Plus className="w-3 h-3 mr-1" /> Add
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {stats.map((s, i) => (
            <div key={i} className="flex gap-2 items-center">
              <Input placeholder="Label" value={s.label} onChange={e => setStat(i, 'label', e.target.value)} className="flex-1" />
              <Input placeholder="Value" value={s.value} onChange={e => setStat(i, 'value', e.target.value)} className="w-28" />
              <Button type="button" size="sm" variant="ghost" className="h-9 w-9 p-0 text-destructive shrink-0"
                onClick={() => setField('stats', stats.filter((_, j) => j !== i))}>
                <Minus className="w-3.5 h-3.5" />
              </Button>
            </div>
          ))}
          {stats.length === 0 && <p className="text-xs text-gray-400">No stats yet.</p>}
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold">Core Values</CardTitle>
            <Button type="button" size="sm" variant="outline" className="h-7 text-xs"
              onClick={() => setField('values', [...values, { title: '', desc: '' }])}>
              <Plus className="w-3 h-3 mr-1" /> Add
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {values.map((v, i) => (
            <div key={i} className="flex gap-2 items-start">
              <div className="flex-1 space-y-1.5">
                <Input placeholder="Title" value={v.title} onChange={e => setValue(i, 'title', e.target.value)} />
                <Input placeholder="Description" value={v.desc} onChange={e => setValue(i, 'desc', e.target.value)} />
              </div>
              <Button type="button" size="sm" variant="ghost" className="h-9 w-9 p-0 text-destructive shrink-0 mt-0.5"
                onClick={() => setField('values', values.filter((_, j) => j !== i))}>
                <Minus className="w-3.5 h-3.5" />
              </Button>
            </div>
          ))}
          {values.length === 0 && <p className="text-xs text-gray-400">No values yet.</p>}
        </CardContent>
      </Card>
    </div>
  );
}

// ── Services editor ───────────────────────────────────────────────────────────
function ServicesEditor({ content, onChange }: { content: Record<string, unknown>; onChange: (c: Record<string, unknown>) => void }) {
  type Service = { title: string; icon: string; desc: string; image_url: string };
  const services: Service[] = (content.services as Service[]) || [];
  const setField = (k: string, v: unknown) => onChange({ ...content, [k]: v });
  const setService = (i: number, k: keyof Service, v: string) => {
    const updated = [...services]; updated[i] = { ...updated[i], [k]: v };
    setField('services', updated);
  };
  return (
    <div className="space-y-4">
      <HeroEditor content={content} onChange={onChange} />
      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-sm font-semibold">Intro Text</CardTitle></CardHeader>
        <CardContent>
          <SectionField label="" value={(content.intro as string) || ''} onChange={v => setField('intro', v)} multiline placeholder="Introduction paragraph" />
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold">Services</CardTitle>
            <Button type="button" size="sm" variant="outline" className="h-7 text-xs"
              onClick={() => setField('services', [...services, { title: '', icon: 'Star', desc: '', image_url: '' }])}>
              <Plus className="w-3 h-3 mr-1" /> Add
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {services.map((s, i) => (
            <div key={i} className="border rounded-lg p-3 space-y-2 bg-gray-50/50">
              <div className="flex gap-2 items-center">
                <Input placeholder="Service title" value={s.title} onChange={e => setService(i, 'title', e.target.value)} className="flex-1 bg-white" />
                <Button type="button" size="sm" variant="ghost" className="h-9 w-9 p-0 text-destructive shrink-0"
                  onClick={() => setField('services', services.filter((_, j) => j !== i))}>
                  <Minus className="w-3.5 h-3.5" />
                </Button>
              </div>
              <Textarea placeholder="Description" value={s.desc} onChange={e => setService(i, 'desc', e.target.value)} rows={2} className="resize-none bg-white" />
            </div>
          ))}
          {services.length === 0 && <p className="text-xs text-gray-400">No services yet.</p>}
        </CardContent>
      </Card>
    </div>
  );
}

// ── Contact editor ────────────────────────────────────────────────────────────
function ContactEditor({ content, onChange }: { content: Record<string, unknown>; onChange: (c: Record<string, unknown>) => void }) {
  const social = (content.social as Record<string, string>) || {};
  const setField = (k: string, v: string) => onChange({ ...content, [k]: v });
  const setSocial = (k: string, v: string) => onChange({ ...content, social: { ...social, [k]: v } });
  return (
    <div className="space-y-4">
      <HeroEditor content={content} onChange={onChange} />
      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-sm font-semibold">Contact Details</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <SectionField label="Address" value={(content.address as string) || ''} onChange={v => setField('address', v)} />
          <SectionField label="Phone" value={(content.phone as string) || ''} onChange={v => setField('phone', v)} placeholder="+233 26 479 3861" />
          <SectionField label="Email" value={(content.email as string) || ''} onChange={v => setField('email', v)} placeholder="info@example.com" />
          <SectionField label="Office Hours" value={(content.hours as string) || ''} onChange={v => setField('hours', v)} placeholder="Mon–Fri: 8am–6pm" />
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-sm font-semibold">Social Links</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {(['facebook', 'instagram', 'twitter', 'whatsapp'] as const).map(k => (
            <SectionField key={k} label={k.charAt(0).toUpperCase() + k.slice(1)}
              value={social[k] || ''} onChange={v => setSocial(k, v)} placeholder="https://..." />
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

// ── FAQ editor ────────────────────────────────────────────────────────────────
function FaqEditor({ content, onChange }: { content: Record<string, unknown>; onChange: (c: Record<string, unknown>) => void }) {
  type Faq = { question: string; answer: string };
  const faqs: Faq[] = (content.faqs as Faq[]) || [];
  const setField = (k: string, v: unknown) => onChange({ ...content, [k]: v });
  const setFaq = (i: number, k: keyof Faq, v: string) => {
    const updated = [...faqs]; updated[i] = { ...updated[i], [k]: v };
    setField('faqs', updated);
  };
  return (
    <div className="space-y-4">
      <HeroEditor content={content} onChange={onChange} />
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold">FAQ Items</CardTitle>
            <Button type="button" size="sm" variant="outline" className="h-7 text-xs"
              onClick={() => setField('faqs', [...faqs, { question: '', answer: '' }])}>
              <Plus className="w-3 h-3 mr-1" /> Add
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {faqs.map((f, i) => (
            <div key={i} className="border rounded-lg p-3 space-y-2 bg-gray-50/50">
              <div className="flex gap-2 items-start">
                <Input placeholder="Question" value={f.question} onChange={e => setFaq(i, 'question', e.target.value)} className="flex-1 bg-white font-medium" />
                <Button type="button" size="sm" variant="ghost" className="h-9 w-9 p-0 text-destructive shrink-0"
                  onClick={() => setField('faqs', faqs.filter((_, j) => j !== i))}>
                  <Minus className="w-3.5 h-3.5" />
                </Button>
              </div>
              <Textarea placeholder="Answer" value={f.answer} onChange={e => setFaq(i, 'answer', e.target.value)} rows={3} className="resize-none bg-white" />
            </div>
          ))}
          {faqs.length === 0 && <p className="text-xs text-gray-400">No FAQs yet.</p>}
        </CardContent>
      </Card>
    </div>
  );
}

// ── Terms/Privacy editor (sections) ──────────────────────────────────────────
function SectionsEditor({
  content, onChange, title,
}: { content: Record<string, unknown>; onChange: (c: Record<string, unknown>) => void; title: string }) {
  type Section = { title: string; body: string };
  const sections: Section[] = (content.sections as Section[]) || [];
  const setField = (k: string, v: unknown) => onChange({ ...content, [k]: v });
  const setSection = (i: number, k: keyof Section, v: string) => {
    const updated = [...sections]; updated[i] = { ...updated[i], [k]: v };
    setField('sections', updated);
  };
  return (
    <div className="space-y-4">
      <HeroEditor content={content} onChange={onChange} />
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold">{title} Sections</CardTitle>
            <Button type="button" size="sm" variant="outline" className="h-7 text-xs"
              onClick={() => setField('sections', [...sections, { title: '', body: '' }])}>
              <Plus className="w-3 h-3 mr-1" /> Add Section
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {sections.map((s, i) => (
            <div key={i} className="border rounded-lg p-3 space-y-2 bg-gray-50/50">
              <div className="flex gap-2 items-center">
                <Input placeholder="Section title" value={s.title} onChange={e => setSection(i, 'title', e.target.value)} className="flex-1 bg-white font-medium" />
                <Button type="button" size="sm" variant="ghost" className="h-9 w-9 p-0 text-destructive shrink-0"
                  onClick={() => setField('sections', sections.filter((_, j) => j !== i))}>
                  <Minus className="w-3.5 h-3.5" />
                </Button>
              </div>
              <Textarea placeholder="Section content" value={s.body} onChange={e => setSection(i, 'body', e.target.value)} rows={4} className="resize-none bg-white" />
            </div>
          ))}
          {sections.length === 0 && <p className="text-xs text-gray-400">No sections yet.</p>}
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-sm font-semibold">Meta</CardTitle></CardHeader>
        <CardContent>
          <SectionField label="Last Updated Date" value={(content.last_updated as string) || ''} onChange={v => setField('last_updated', v)} placeholder="YYYY-MM-DD" />
        </CardContent>
      </Card>
    </div>
  );
}

// ── Messages tab ──────────────────────────────────────────────────────────────
function MessagesTab() {
  const [messages, setMessages] = useState<ContactMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<ContactMessage | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ContactMessage | null>(null);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.get<{ messages: ContactMessage[] }>('/api/settings/contact-messages');
      setMessages(data.messages || []);
    } catch { toast.error('Failed to load messages'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const markRead = async (msg: ContactMessage, read: boolean) => {
    await api.patch(`/api/settings/contact-messages/${msg.id}/read`, { is_read: read }).catch(() => {});
    setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, is_read: read } : m));
    if (selected?.id === msg.id) setSelected({ ...msg, is_read: read });
  };

  const doDelete = async () => {
    if (!deleteTarget) return;
    await api.delete(`/api/settings/contact-messages/${deleteTarget.id}`).catch(() => {});
    setMessages(prev => prev.filter(m => m.id !== deleteTarget.id));
    if (selected?.id === deleteTarget.id) setSelected(null);
    setDeleteTarget(null);
    toast.success('Message deleted');
  };

  const openMessage = (msg: ContactMessage) => {
    setSelected(msg);
    if (!msg.is_read) markRead(msg, true);
  };

  const displayed = filter === 'unread' ? messages.filter(m => !m.is_read) : messages;
  const unreadCount = messages.filter(m => !m.is_read).length;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            Contact Messages
            {unreadCount > 0 && (
              <Badge className="bg-amber-100 text-amber-700 border-0">{unreadCount} unread</Badge>
            )}
          </h2>
          <p className="text-sm text-gray-500">Messages submitted via the Contact Us page</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border overflow-hidden text-sm">
            {(['all', 'unread'] as const).map(f => (
              <button key={f} type="button"
                onClick={() => setFilter(f)}
                className={`px-3 py-1.5 capitalize transition-colors ${filter === f ? 'bg-amber-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}>
                {f}
              </button>
            ))}
          </div>
          <Button type="button" size="sm" variant="outline" onClick={load} className="h-8">
            <RefreshCw className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="py-16 text-center text-sm text-gray-400">
          <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" /> Loading messages…
        </div>
      ) : messages.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <Mail className="w-10 h-10 text-gray-200 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">No messages yet</p>
            <p className="text-sm text-gray-400 mt-1">Messages from the Contact Us form will appear here.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid lg:grid-cols-5 gap-4">
          {/* List */}
          <div className="lg:col-span-2 space-y-2">
            {displayed.map(msg => (
              <button key={msg.id} type="button"
                onClick={() => openMessage(msg)}
                className={`w-full text-left rounded-xl border p-3.5 transition-all
                  ${selected?.id === msg.id ? 'border-amber-500 bg-amber-50 shadow-sm' : 'bg-white hover:bg-gray-50 border-gray-200'}
                  ${!msg.is_read ? 'border-l-4 border-l-amber-500' : ''}`}>
                <div className="flex items-start justify-between gap-2 mb-1">
                  <span className={`text-sm truncate ${!msg.is_read ? 'font-semibold text-gray-900' : 'font-medium text-gray-700'}`}>
                    {msg.name}
                  </span>
                  {!msg.is_read && <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0 mt-1" />}
                </div>
                {msg.subject && (
                  <p className="text-xs text-gray-600 font-medium truncate mb-0.5">{msg.subject}</p>
                )}
                <p className="text-xs text-gray-400 truncate">{msg.message}</p>
                <p className="text-xs text-gray-300 mt-1.5">
                  {new Date(msg.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </p>
              </button>
            ))}
            {displayed.length === 0 && (
              <p className="text-sm text-gray-400 text-center py-8">No unread messages.</p>
            )}
          </div>

          {/* Detail */}
          <div className="lg:col-span-3">
            {selected ? (
              <Card className="h-full">
                <CardHeader className="pb-3 border-b">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <CardTitle className="text-base text-balance">{selected.subject || '(No subject)'}</CardTitle>
                      <CardDescription className="mt-0.5">
                        From <strong>{selected.name}</strong> · <a href={`mailto:${selected.email}`} className="text-amber-600 hover:underline">{selected.email}</a>
                        {selected.phone && <> · {selected.phone}</>}
                      </CardDescription>
                      <p className="text-xs text-gray-400 mt-1">
                        {new Date(selected.created_at).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button type="button" size="sm" variant="ghost" className="h-8 w-8 p-0"
                        title={selected.is_read ? 'Mark unread' : 'Mark read'}
                        onClick={() => markRead(selected, !selected.is_read)}>
                        {selected.is_read
                          ? <Mail className="w-4 h-4 text-gray-400" />
                          : <MailOpen className="w-4 h-4 text-amber-600" />}
                      </Button>
                      <Button type="button" size="sm" variant="ghost" className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                        onClick={() => setDeleteTarget(selected)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-4">
                  <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap text-pretty">{selected.message}</p>
                  <div className="mt-6 pt-4 border-t flex gap-2">
                    <a href={`mailto:${selected.email}?subject=Re: ${encodeURIComponent(selected.subject || 'Your enquiry')}`}
                      className="inline-flex items-center gap-1.5 text-sm bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 rounded-lg transition-colors">
                      <Mail className="w-3.5 h-3.5" /> Reply via Email
                    </a>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card className="h-full flex items-center justify-center min-h-[260px]">
                <CardContent className="text-center py-12">
                  <MailOpen className="w-8 h-8 text-gray-200 mx-auto mb-2" />
                  <p className="text-sm text-gray-400">Select a message to read it</p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}

      {/* Delete confirm */}
      <AlertDialog open={!!deleteTarget} onOpenChange={o => !o && setDeleteTarget(null)}>
        <AlertDialogContent className="max-w-[calc(100%-2rem)] md:max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete message?</AlertDialogTitle>
            <AlertDialogDescription>
              Message from <strong>{deleteTarget?.name}</strong> will be permanently removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={doDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ── Page editor wrapper ───────────────────────────────────────────────────────
function PageEditor({ page, onSaved }: { page: CmsPage; onSaved: (p: CmsPage) => void }) {
  const [editContent, setEditContent] = useState<Record<string, unknown>>(
    (page.content as Record<string, unknown>) || {},
  );
  const [title, setTitle] = useState(page.title);
  const [metaTitle, setMetaTitle] = useState(page.meta_title || '');
  const [metaDesc, setMetaDesc] = useState(page.meta_desc || '');
  const [isPublished, setIsPublished] = useState(page.is_published);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      const updated = await api.put<CmsPage>(`/api/pages/${page.slug}`, {
        title, content: editContent, meta_title: metaTitle, meta_desc: metaDesc, is_published: isPublished,
      });
      onSaved(updated);
      toast.success(`${title} saved successfully`);
    } catch {
      toast.error('Failed to save page');
    } finally { setSaving(false); }
  };

  const renderEditor = () => {
    switch (page.slug) {
      case 'about':    return <AboutEditor content={editContent} onChange={setEditContent} />;
      case 'services': return <ServicesEditor content={editContent} onChange={setEditContent} />;
      case 'contact':  return <ContactEditor content={editContent} onChange={setEditContent} />;
      case 'faq':      return <FaqEditor content={editContent} onChange={setEditContent} />;
      case 'terms':    return <SectionsEditor content={editContent} onChange={setEditContent} title="Terms" />;
      case 'privacy':  return <SectionsEditor content={editContent} onChange={setEditContent} title="Privacy" />;
      default:         return <p className="text-sm text-gray-400">No editor for this page.</p>;
    }
  };

  const pageMeta = PAGE_TABS.find(t => t.slug === page.slug);

  return (
    <div className="space-y-4">
      {/* Page header bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <Input value={title} onChange={e => setTitle(e.target.value)}
            className="text-base font-semibold h-9 border-0 border-b rounded-none px-0 bg-transparent shadow-none focus-visible:ring-0 w-auto min-w-[200px]" />
          <div className="flex items-center gap-3 mt-1">
            <span className="text-xs text-gray-400">Last updated: {new Date(page.updated_at).toLocaleDateString()}</span>
            <div className="flex items-center gap-1.5">
              <Switch checked={isPublished} onCheckedChange={setIsPublished} className="scale-75" />
              <span className="text-xs text-gray-500">{isPublished ? 'Published' : 'Draft'}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {pageMeta && (
            <Link to={pageMeta.path} target="_blank">
              <Button type="button" size="sm" variant="outline" className="h-8 gap-1.5">
                <Eye className="w-3.5 h-3.5" /> Preview
              </Button>
            </Link>
          )}
          <Button type="button" size="sm" onClick={handleSave} disabled={saving} className="h-8 gap-1.5">
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            {saving ? 'Saving…' : 'Save Page'}
          </Button>
        </div>
      </div>

      {/* Content editor */}
      {renderEditor()}

      {/* SEO section */}
      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-sm font-semibold">SEO / Meta</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <SectionField label="Meta Title" value={metaTitle} onChange={setMetaTitle} placeholder="SEO page title" />
          <SectionField label="Meta Description" value={metaDesc} onChange={setMetaDesc} multiline placeholder="Brief description for search engines" />
        </CardContent>
      </Card>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
export default function AdminPagesPage() {
  const [pages, setPages] = useState<CmsPage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('about');

  useEffect(() => {
    api.get<CmsPage[]>('/api/pages')
      .then(data => {
        setPages(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(err => {
        console.error('[AdminPagesPage]', err);
        setError('Failed to load pages. Check your connection and try again.');
        setLoading(false);
      });
  }, []);

  const unreadCount = 0; // will be shown inside MessagesTab itself

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 gap-3 text-gray-500">
        <Loader2 className="w-5 h-5 animate-spin" /> Loading pages…
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-16 text-center">
        <p className="text-destructive font-medium mb-3">{error}</p>
        <Button type="button" variant="outline" onClick={() => window.location.reload()}>
          <RefreshCw className="w-4 h-4 mr-2" /> Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Pages</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Edit content for all website pages and view contact form submissions
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        {/* Horizontal scrollable tab bar */}
        <div className="overflow-x-auto pb-px">
          <TabsList className="h-10 bg-gray-100 gap-0.5 flex w-max min-w-full md:w-auto">
            {PAGE_TABS.map(tab => {
              const page = pages.find(p => p.slug === tab.slug);
              return (
                <TabsTrigger key={tab.slug} value={tab.slug}
                  className="gap-1.5 text-sm whitespace-nowrap px-4 data-[state=active]:bg-white data-[state=active]:shadow-sm">
                  <tab.icon className="w-3.5 h-3.5 shrink-0" />
                  {tab.label}
                  {page && !page.is_published && (
                    <span className="ml-1 text-[10px] bg-orange-100 text-orange-600 px-1 rounded">Draft</span>
                  )}
                </TabsTrigger>
              );
            })}
            {/* Messages tab */}
            <TabsTrigger value="messages"
              className="gap-1.5 text-sm whitespace-nowrap px-4 data-[state=active]:bg-white data-[state=active]:shadow-sm">
              <Mail className="w-3.5 h-3.5 shrink-0" />
              Messages
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Page tab content */}
        {PAGE_TABS.map(tab => {
          const page = pages.find(p => p.slug === tab.slug);
          return (
            <TabsContent key={tab.slug} value={tab.slug} className="mt-4">
              {page ? (
                <PageEditor
                  page={page}
                  onSaved={updated => setPages(prev => prev.map(p => p.id === updated.id ? updated : p))}
                />
              ) : (
                <div className="py-12 text-center">
                  <p className="text-sm text-gray-400">
                    Page "<strong>{tab.slug}</strong>" not found in database.
                    It will be created on next server startup.
                  </p>
                </div>
              )}
            </TabsContent>
          );
        })}

        {/* Messages tab content */}
        <TabsContent value="messages" className="mt-4">
          <MessagesTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
