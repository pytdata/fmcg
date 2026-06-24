import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import {
  CheckCircle2, AlertTriangle, XCircle, Globe, Gauge, Plus, Pencil, RefreshCw,
} from 'lucide-react';
import type { SeoMeta, SeoAuditCheck, SeoAuditResult } from '@/types/index';

type AuditResponse = {
  overall_score: number;
  results: SeoAuditResult[];
  created_at?: string;
};

type MetaForm = {
  path: string;
  title: string;
  meta_title: string;
  meta_description: string;
  keywords: string;
  og_image: string;
  canonical_url: string;
  h1: string;
  focus_keyword: string;
  noindex: boolean;
  isNew: boolean;
};

const EMPTY_FORM: MetaForm = {
  path: '',
  title: '',
  meta_title: '',
  meta_description: '',
  keywords: '',
  og_image: '',
  canonical_url: '',
  h1: '',
  focus_keyword: '',
  noindex: false,
  isNew: true,
};

function scoreColor(score: number): string {
  if (score >= 80) return 'text-emerald-600';
  if (score >= 50) return 'text-amber-600';
  return 'text-red-600';
}

function scoreRing(score: number): string {
  if (score >= 80) return 'stroke-emerald-500';
  if (score >= 50) return 'stroke-amber-500';
  return 'stroke-red-500';
}

function scoreBadge(score: number): string {
  if (score >= 80) return 'bg-emerald-100 text-emerald-700 border-0';
  if (score >= 50) return 'bg-amber-100 text-amber-700 border-0';
  return 'bg-red-100 text-red-700 border-0';
}

function ScoreRing({ score }: { score: number }) {
  const radius = 52;
  const circ = 2 * Math.PI * radius;
  const offset = circ - (Math.max(0, Math.min(100, score)) / 100) * circ;
  return (
    <div className="relative w-32 h-32 shrink-0">
      <svg className="w-32 h-32 -rotate-90" viewBox="0 0 120 120">
        <circle
          cx="60" cy="60" r={radius} fill="none" strokeWidth="10"
          className="stroke-gray-100"
        />
        <circle
          cx="60" cy="60" r={radius} fill="none" strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          className={`${scoreRing(score)} transition-all duration-700`}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={`text-3xl font-bold ${scoreColor(score)}`}>{score}</span>
        <span className="text-xs text-gray-400">/ 100</span>
      </div>
    </div>
  );
}

function CheckIcon({ status }: { status: SeoAuditCheck['status'] }) {
  if (status === 'pass') return <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />;
  if (status === 'warn') return <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />;
  return <XCircle className="w-4 h-4 text-red-500 shrink-0" />;
}

export default function AdminSeoPage() {
  const [entries, setEntries] = useState<SeoMeta[]>([]);
  const [loadingEntries, setLoadingEntries] = useState(true);
  const [overallScore, setOverallScore] = useState<number | null>(null);
  const [auditing, setAuditing] = useState(false);
  const [audit, setAudit] = useState<AuditResponse | null>(null);
  const [auditLoaded, setAuditLoaded] = useState(false);

  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<MetaForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const loadEntries = async () => {
    setLoadingEntries(true);
    try {
      const data = await api.get<SeoMeta[]>('/api/seo/admin/all');
      setEntries(Array.isArray(data) ? data : []);
    } catch {
      toast.error('Failed to load SEO entries');
    } finally {
      setLoadingEntries(false);
    }
  };

  const loadScore = async () => {
    try {
      const data = await api.get<{ overall_score: number }>('/api/seo/score');
      setOverallScore(data.overall_score ?? 0);
    } catch {
      toast.error('Failed to load SEO score');
    }
  };

  useEffect(() => {
    loadEntries();
    loadScore();
  }, []);

  const runAudit = async () => {
    setAuditing(true);
    try {
      const data = await api.get<AuditResponse>('/api/seo/audit');
      setAudit(data);
      setAuditLoaded(true);
      setOverallScore(data.overall_score);
      toast.success('Audit complete');
    } catch {
      toast.error('Failed to run audit');
    } finally {
      setAuditing(false);
    }
  };

  const openNew = () => {
    setForm(EMPTY_FORM);
    setFormOpen(true);
  };

  const openEdit = (m: SeoMeta) => {
    setForm({
      path: m.path,
      title: m.title ?? '',
      meta_title: m.meta_title ?? '',
      meta_description: m.meta_description ?? '',
      keywords: m.keywords ?? '',
      og_image: m.og_image ?? '',
      canonical_url: m.canonical_url ?? '',
      h1: m.h1 ?? '',
      focus_keyword: m.focus_keyword ?? '',
      noindex: m.noindex ?? false,
      isNew: false,
    });
    setFormOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const path = form.path.trim();
    if (!path) {
      toast.error('Path is required');
      return;
    }
    if (!path.startsWith('/')) {
      toast.error('Path must start with /');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        path,
        title: form.title.trim() || null,
        meta_title: form.meta_title.trim() || null,
        meta_description: form.meta_description.trim() || null,
        keywords: form.keywords.trim() || null,
        og_image: form.og_image.trim() || null,
        canonical_url: form.canonical_url.trim() || null,
        h1: form.h1.trim() || null,
        focus_keyword: form.focus_keyword.trim() || null,
        noindex: form.noindex,
      };
      await api.put<SeoMeta>('/api/seo/meta', payload);
      toast.success('SEO content saved');
      setFormOpen(false);
      await Promise.all([loadEntries(), loadScore()]);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const descLen = form.meta_description.length;
  const descInRange = descLen >= 70 && descLen <= 160;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">SEO &amp; Site Audit</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Manage on-page SEO content, run site audits, and track your SEO score.
        </p>
      </div>

      {/* Score card */}
      <Card>
        <CardContent className="p-6 flex flex-col sm:flex-row items-center gap-6">
          <ScoreRing score={overallScore ?? 0} />
          <div className="flex-1 text-center sm:text-left">
            <div className="flex items-center justify-center sm:justify-start gap-2 text-gray-500 text-sm">
              <Gauge className="w-4 h-4" />
              <span>Overall SEO Score</span>
            </div>
            <p className="text-sm text-gray-600 mt-2 max-w-md">
              {overallScore === null
                ? 'Loading your latest score…'
                : overallScore >= 80
                  ? 'Great — your pages are well optimised for search.'
                  : overallScore >= 50
                    ? 'Decent, but several pages could be improved.'
                    : 'Needs attention — many pages are missing key SEO fields.'}
            </p>
          </div>
          <Button type="button" onClick={runAudit} disabled={auditing} className="shrink-0">
            <RefreshCw className={`w-4 h-4 mr-2 ${auditing ? 'animate-spin' : ''}`} />
            {auditing ? 'Running…' : 'Run Audit'}
          </Button>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="content">
        <TabsList>
          <TabsTrigger value="content">SEO Content</TabsTrigger>
          <TabsTrigger value="audit">Site Audit</TabsTrigger>
        </TabsList>

        {/* SEO Content tab */}
        <TabsContent value="content" className="space-y-4">
          <div className="flex justify-end">
            <Button type="button" size="sm" onClick={openNew}>
              <Plus className="w-4 h-4 mr-2" /> Add Page
            </Button>
          </div>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">Pages</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {loadingEntries ? (
                <div className="p-8 text-center text-sm text-gray-400">Loading…</div>
              ) : entries.length === 0 ? (
                <div className="p-10 text-center">
                  <Globe className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                  <p className="text-sm text-gray-500">No SEO pages yet. Add one above.</p>
                </div>
              ) : (
                <div className="divide-y">
                  {entries.map((m) => (
                    <button
                      key={m.path}
                      type="button"
                      onClick={() => openEdit(m)}
                      className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 transition-colors"
                    >
                      <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center shrink-0">
                        <Globe className="w-3.5 h-3.5 text-amber-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 truncate">{m.path}</p>
                        <p className="text-xs text-gray-500 truncate">
                          {m.meta_title || m.title || <span className="text-gray-300">No title set</span>}
                        </p>
                      </div>
                      <Badge className={scoreBadge(m.score ?? 0)}>{m.score ?? 0}</Badge>
                      <Pencil className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                    </button>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Site Audit tab */}
        <TabsContent value="audit" className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500">
              {audit?.created_at
                ? `Last run: ${new Date(audit.created_at).toLocaleString()}`
                : 'Run an audit to evaluate every page.'}
            </p>
            <Button type="button" size="sm" variant="outline" onClick={runAudit} disabled={auditing}>
              <RefreshCw className={`w-4 h-4 mr-2 ${auditing ? 'animate-spin' : ''}`} />
              {auditing ? 'Running…' : 'Run Audit'}
            </Button>
          </div>

          {!auditLoaded && !audit ? (
            <Card>
              <CardContent className="p-10 text-center">
                <Gauge className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                <p className="text-sm text-gray-500">No audit results yet.</p>
                <Button type="button" size="sm" className="mt-3" onClick={runAudit} disabled={auditing}>
                  {auditing ? 'Running…' : 'Run Audit Now'}
                </Button>
              </CardContent>
            </Card>
          ) : audit && audit.results.length === 0 ? (
            <Card>
              <CardContent className="p-10 text-center text-sm text-gray-500">
                No pages to audit. Add SEO content first.
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {audit?.results.map((r) => (
                <Card key={r.path}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-2">
                      <Globe className="w-4 h-4 text-amber-500 shrink-0" />
                      <CardTitle className="text-sm font-semibold flex-1 truncate">{r.path}</CardTitle>
                      <Badge className={scoreBadge(r.score)}>{r.score} / 100</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <ul className="space-y-2">
                      {r.checks.map((c) => (
                        <li key={c.id} className="flex items-start gap-2 text-sm">
                          <CheckIcon status={c.status} />
                          <div className="min-w-0">
                            <span className="font-medium text-gray-800">{c.label}</span>
                            {c.detail && <span className="text-gray-500"> — {c.detail}</span>}
                          </div>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Edit / new dialog */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{form.isNew ? 'New Page SEO' : `Edit SEO — ${form.path}`}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-4 pt-1">
            <div className="space-y-1">
              <Label className="text-sm font-normal">
                Path <span className="text-destructive">*</span>
              </Label>
              <Input
                value={form.path}
                placeholder="/gift-boxes"
                readOnly={!form.isNew}
                disabled={!form.isNew}
                onChange={(e) => setForm((f) => ({ ...f, path: e.target.value }))}
              />
              {form.isNew && (
                <p className="text-xs text-gray-400">Must start with / (e.g. /gift-boxes).</p>
              )}
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label className="text-sm font-normal">Title</Label>
                <Input
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-sm font-normal">Meta Title</Label>
                <Input
                  value={form.meta_title}
                  onChange={(e) => setForm((f) => ({ ...f, meta_title: e.target.value }))}
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-sm font-normal">Meta Description</Label>
              <Textarea
                value={form.meta_description}
                rows={3}
                onChange={(e) => setForm((f) => ({ ...f, meta_description: e.target.value }))}
              />
              <p className={`text-xs ${descInRange ? 'text-emerald-600' : 'text-gray-400'}`}>
                {descLen} characters (recommended 70–160)
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label className="text-sm font-normal">Keywords</Label>
                <Input
                  value={form.keywords}
                  placeholder="comma, separated, keywords"
                  onChange={(e) => setForm((f) => ({ ...f, keywords: e.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-sm font-normal">Focus Keyword</Label>
                <Input
                  value={form.focus_keyword}
                  onChange={(e) => setForm((f) => ({ ...f, focus_keyword: e.target.value }))}
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-sm font-normal">H1 Heading</Label>
              <Input
                value={form.h1}
                onChange={(e) => setForm((f) => ({ ...f, h1: e.target.value }))}
              />
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label className="text-sm font-normal">OG Image URL</Label>
                <Input
                  value={form.og_image}
                  placeholder="https://…"
                  onChange={(e) => setForm((f) => ({ ...f, og_image: e.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-sm font-normal">Canonical URL</Label>
                <Input
                  value={form.canonical_url}
                  placeholder="https://…"
                  onChange={(e) => setForm((f) => ({ ...f, canonical_url: e.target.value }))}
                />
              </div>
            </div>

            <div className="flex items-center justify-between py-1">
              <div>
                <Label className="text-sm font-normal">No-index</Label>
                <p className="text-xs text-gray-400">Hide this page from search engines</p>
              </div>
              <Switch
                checked={form.noindex}
                onCheckedChange={(v) => setForm((f) => ({ ...f, noindex: v }))}
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setFormOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving || !form.path.trim()}>
                {saving ? 'Saving…' : 'Save'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
