import { useEffect, useMemo, useState } from 'react';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import RichTextEditor from '@/components/admin/RichTextEditor';
import { EMAIL_TEMPLATES, BLANK_TEMPLATE, type EmailTemplate } from '@/lib/emailTemplates';
import { toast } from 'sonner';
import {
  Mail, Plus, Trash2, Send, Save, Users, FileText, Upload, Eye,
  CheckCircle, XCircle, Loader2, LayoutTemplate,
} from 'lucide-react';
import type { EmailCampaign, EmailSubscriber } from '@/types/index';

type ComposerState = {
  id?: string;
  template: string;
  subject: string;
  preheader: string;
  body_html: string;
};

const EMPTY_COMPOSER: ComposerState = {
  template: BLANK_TEMPLATE.id,
  subject: '',
  preheader: '',
  body_html: '',
};

const STATUS_STYLES: Record<EmailCampaign['status'], string> = {
  draft: 'bg-gray-100 text-gray-600',
  sending: 'bg-blue-100 text-blue-700',
  sent: 'bg-emerald-100 text-emerald-700',
  failed: 'bg-red-100 text-red-700',
};

function previewHtml(c: ComposerState): string {
  return `
    <div style="display:none;max-height:0;overflow:hidden;">${c.preheader}</div>
    <div style="background:linear-gradient(135deg,#b45309 0%,#92400e 100%);padding:24px;text-align:center;border-radius:10px 10px 0 0;">
      <h1 style="margin:0;color:#fff;font-size:20px;font-weight:700;">🛒 KW Enterprise</h1>
      <p style="margin:6px 0 0;color:#fde68a;font-size:12px;">Ghana's Trusted FMCG Distributor</p>
    </div>
    <div style="padding:28px;background:#fff;font-family:'Segoe UI',Arial,sans-serif;">
      ${c.body_html || '<p style="color:#9ca3af;">Your email body preview will appear here…</p>'}
    </div>
    <div style="background:#f9fafb;padding:16px;text-align:center;border-radius:0 0 10px 10px;">
      <p style="margin:0;color:#9ca3af;font-size:11px;">© ${new Date().getFullYear()} KW Enterprise. All rights reserved.</p>
    </div>`;
}

export default function AdminNewsletterPage() {
  // ── Campaigns ──
  const [campaigns, setCampaigns] = useState<EmailCampaign[]>([]);
  const [campLoading, setCampLoading] = useState(true);
  const [composerOpen, setComposerOpen] = useState(false);
  const [composer, setComposer] = useState<ComposerState>(EMPTY_COMPOSER);
  const [saving, setSaving] = useState(false);
  const [sendTarget, setSendTarget] = useState<EmailCampaign | null>(null);
  const [sending, setSending] = useState(false);
  const [deleteCampaign, setDeleteCampaign] = useState<EmailCampaign | null>(null);

  // ── Subscribers ──
  const [subscribers, setSubscribers] = useState<EmailSubscriber[]>([]);
  const [subsLoading, setSubsLoading] = useState(true);
  const [newEmail, setNewEmail] = useState('');
  const [newName, setNewName] = useState('');
  const [bulkText, setBulkText] = useState('');
  const [importing, setImporting] = useState(false);
  const [deleteSub, setDeleteSub] = useState<EmailSubscriber | null>(null);

  const loadCampaigns = async () => {
    setCampLoading(true);
    try {
      const data = await api.get<EmailCampaign[]>('/api/email/campaigns');
      setCampaigns(Array.isArray(data) ? data : []);
    } catch { toast.error('Failed to load campaigns'); }
    finally { setCampLoading(false); }
  };

  const loadSubscribers = async () => {
    setSubsLoading(true);
    try {
      const data = await api.get<EmailSubscriber[]>('/api/email/subscribers');
      setSubscribers(Array.isArray(data) ? data : []);
    } catch { toast.error('Failed to load subscribers'); }
    finally { setSubsLoading(false); }
  };

  useEffect(() => { loadCampaigns(); loadSubscribers(); }, []);

  const activeCount = useMemo(
    () => subscribers.filter(s => s.is_active).length,
    [subscribers],
  );

  // ── Composer actions ──
  const openNewCampaign = () => { setComposer(EMPTY_COMPOSER); setComposerOpen(true); };

  const openEditCampaign = (c: EmailCampaign) => {
    setComposer({
      id: c.id,
      template: c.template || BLANK_TEMPLATE.id,
      subject: c.subject,
      preheader: c.preheader || '',
      body_html: c.body_html || '',
    });
    setComposerOpen(true);
  };

  const applyTemplate = (tpl: EmailTemplate) => {
    setComposer(c => ({
      ...c,
      template: tpl.id,
      subject: tpl.subject || c.subject,
      preheader: tpl.preheader || c.preheader,
      body_html: tpl.bodyHtml,
    }));
  };

  const saveDraft = async (): Promise<string | null> => {
    if (!composer.subject.trim()) { toast.error('Subject is required'); return null; }
    setSaving(true);
    try {
      const payload = {
        subject: composer.subject.trim(),
        preheader: composer.preheader.trim(),
        body_html: composer.body_html,
        template: composer.template,
      };
      if (composer.id) {
        await api.put(`/api/email/campaigns/${composer.id}`, payload);
        toast.success('Draft updated');
        await loadCampaigns();
        return composer.id;
      }
      const created = await api.post<EmailCampaign>('/api/email/campaigns', payload);
      setComposer(c => ({ ...c, id: created.id }));
      toast.success('Draft saved');
      await loadCampaigns();
      return created.id;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save draft');
      return null;
    } finally { setSaving(false); }
  };

  const sendTest = async () => {
    const to = window.prompt('Send a test email to:');
    if (!to) return;
    try {
      await api.post('/api/email/test', {
        to,
        subject: composer.subject.trim() || 'Test Email',
        preheader: composer.preheader.trim(),
        body_html: composer.body_html,
      });
      toast.success(`Test email sent to ${to}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to send test');
    }
  };

  const requestSend = async () => {
    const id = await saveDraft();
    if (!id) return;
    const fresh = campaigns.find(c => c.id === id);
    setSendTarget(
      fresh ?? {
        id, subject: composer.subject, preheader: composer.preheader,
        body_html: composer.body_html, template: composer.template,
        status: 'draft', recipients_count: 0, sent_count: 0,
      },
    );
  };

  const confirmSend = async () => {
    if (!sendTarget) return;
    setSending(true);
    try {
      const res = await api.post<{ sent: number; total: number }>(
        `/api/email/campaigns/${sendTarget.id}/send`, {},
      );
      toast.success(`Campaign sent to ${res.sent} of ${res.total} subscribers`);
      setSendTarget(null);
      setComposerOpen(false);
      await loadCampaigns();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to send campaign');
      await loadCampaigns();
    } finally { setSending(false); }
  };

  const handleDeleteCampaign = async () => {
    if (!deleteCampaign) return;
    try {
      await api.delete(`/api/email/campaigns/${deleteCampaign.id}`);
      toast.success('Campaign deleted');
      setDeleteCampaign(null);
      await loadCampaigns();
    } catch { toast.error('Delete failed'); }
  };

  // ── Subscriber actions ──
  const addSubscriber = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail.trim()) return;
    try {
      await api.post('/api/email/subscribers', {
        email: newEmail.trim(), name: newName.trim() || undefined,
      });
      toast.success('Subscriber added');
      setNewEmail(''); setNewName('');
      await loadSubscribers();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to add subscriber');
    }
  };

  const importBulk = async () => {
    if (!bulkText.trim()) { toast.error('Paste some emails first'); return; }
    setImporting(true);
    try {
      const res = await api.post<{ inserted: number; reactivated: number; total: number }>(
        '/api/email/subscribers/bulk', { text: bulkText },
      );
      toast.success(`Imported ${res.inserted} new, ${res.reactivated} reactivated`);
      setBulkText('');
      await loadSubscribers();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Import failed');
    } finally { setImporting(false); }
  };

  const toggleSubscriber = async (s: EmailSubscriber) => {
    try {
      await api.patch(`/api/email/subscribers/${s.id}`, {});
      await loadSubscribers();
    } catch { toast.error('Failed to update subscriber'); }
  };

  const handleDeleteSub = async () => {
    if (!deleteSub) return;
    try {
      await api.delete(`/api/email/subscribers/${deleteSub.id}`);
      toast.success('Subscriber removed');
      setDeleteSub(null);
      await loadSubscribers();
    } catch { toast.error('Delete failed'); }
  };

  const fmtDate = (d?: string) => (d ? new Date(d).toLocaleDateString() : '—');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Email Marketing</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Compose, preview and broadcast emails to your subscribers.
        </p>
      </div>

      <Tabs defaultValue="campaigns" className="space-y-4">
        <TabsList>
          <TabsTrigger value="campaigns">
            <FileText className="w-3.5 h-3.5 mr-1.5" /> Campaigns
          </TabsTrigger>
          <TabsTrigger value="subscribers">
            <Users className="w-3.5 h-3.5 mr-1.5" /> Subscribers
          </TabsTrigger>
        </TabsList>

        {/* ── Campaigns ── */}
        <TabsContent value="campaigns" className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500">{campaigns.length} campaign(s)</p>
            <Button type="button" onClick={openNewCampaign}>
              <Plus className="w-4 h-4 mr-2" /> New Campaign
            </Button>
          </div>

          <Card>
            <CardContent className="p-0">
              {campLoading ? (
                <div className="p-8 text-center text-sm text-gray-400">Loading…</div>
              ) : campaigns.length === 0 ? (
                <div className="p-10 text-center">
                  <Mail className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                  <p className="text-sm text-gray-500">No campaigns yet.</p>
                  <p className="text-xs text-gray-400 mt-1">
                    Create your first campaign to reach your subscribers.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b">
                      <tr>
                        <th className="text-left px-4 py-2.5 font-medium text-gray-600">Subject</th>
                        <th className="text-center px-4 py-2.5 font-medium text-gray-600">Status</th>
                        <th className="text-center px-4 py-2.5 font-medium text-gray-600 whitespace-nowrap">Sent / Recipients</th>
                        <th className="text-left px-4 py-2.5 font-medium text-gray-600 hidden md:table-cell">Date</th>
                        <th className="text-right px-4 py-2.5 font-medium text-gray-600">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {campaigns.map((c, idx) => (
                        <tr key={c.id}
                          className={`border-b last:border-0 hover:bg-gray-50 ${idx % 2 ? 'bg-gray-50/40' : ''}`}>
                          <td className="px-4 py-3">
                            <p className="font-medium text-gray-900">{c.subject}</p>
                            {c.preheader && (
                              <p className="text-xs text-gray-400 line-clamp-1">{c.preheader}</p>
                            )}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <Badge className={`border-0 ${STATUS_STYLES[c.status]}`}>
                              {c.status}
                            </Badge>
                          </td>
                          <td className="px-4 py-3 text-center text-gray-600">
                            {c.sent_count} / {c.recipients_count}
                          </td>
                          <td className="px-4 py-3 hidden md:table-cell text-gray-500">
                            {fmtDate(c.sent_at || c.created_at)}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center justify-end gap-1">
                              <Button type="button" size="sm" variant="ghost" className="h-8 px-2"
                                onClick={() => openEditCampaign(c)}>
                                {c.status === 'draft' ? 'Edit' : 'View'}
                              </Button>
                              <Button type="button" size="sm" variant="ghost"
                                className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                                onClick={() => setDeleteCampaign(c)}>
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
        </TabsContent>

        {/* ── Subscribers ── */}
        <TabsContent value="subscribers" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Plus className="w-4 h-4 text-amber-600" /> Add Subscriber
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={addSubscriber} className="space-y-3">
                  <div className="space-y-1">
                    <Label className="text-sm font-normal">Email <span className="text-destructive">*</span></Label>
                    <Input type="email" value={newEmail} placeholder="customer@example.com"
                      onChange={e => setNewEmail(e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-sm font-normal">Name</Label>
                    <Input value={newName} placeholder="Optional"
                      onChange={e => setNewName(e.target.value)} />
                  </div>
                  <Button type="submit" disabled={!newEmail.trim()} className="w-full">
                    Add Subscriber
                  </Button>
                </form>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Upload className="w-4 h-4 text-amber-600" /> Import Emails
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Textarea rows={5} value={bulkText}
                  placeholder="Paste emails separated by commas or new lines…"
                  onChange={e => setBulkText(e.target.value)} />
                <Button type="button" onClick={importBulk} disabled={importing || !bulkText.trim()}
                  className="w-full">
                  {importing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
                  {importing ? 'Importing…' : 'Import'}
                </Button>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold">Subscribers</CardTitle>
                <Badge className="bg-emerald-100 text-emerald-700 border-0">
                  {activeCount} active
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {subsLoading ? (
                <div className="p-8 text-center text-sm text-gray-400">Loading…</div>
              ) : subscribers.length === 0 ? (
                <div className="p-10 text-center">
                  <Users className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                  <p className="text-sm text-gray-500">No subscribers yet.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b">
                      <tr>
                        <th className="text-left px-4 py-2.5 font-medium text-gray-600">Email</th>
                        <th className="text-left px-4 py-2.5 font-medium text-gray-600 hidden md:table-cell">Name</th>
                        <th className="text-center px-4 py-2.5 font-medium text-gray-600">Active</th>
                        <th className="text-left px-4 py-2.5 font-medium text-gray-600 hidden md:table-cell">Source</th>
                        <th className="text-left px-4 py-2.5 font-medium text-gray-600 hidden md:table-cell">Date</th>
                        <th className="text-right px-4 py-2.5 font-medium text-gray-600">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {subscribers.map((s, idx) => (
                        <tr key={s.id}
                          className={`border-b last:border-0 hover:bg-gray-50 ${idx % 2 ? 'bg-gray-50/40' : ''}`}>
                          <td className="px-4 py-3 font-medium text-gray-900">{s.email}</td>
                          <td className="px-4 py-3 hidden md:table-cell text-gray-500">
                            {s.name || <span className="text-gray-300">—</span>}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <div className="flex items-center justify-center gap-2">
                              <Switch checked={!!s.is_active}
                                onCheckedChange={() => toggleSubscriber(s)} />
                              {s.is_active
                                ? <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
                                : <XCircle className="w-3.5 h-3.5 text-gray-300" />}
                            </div>
                          </td>
                          <td className="px-4 py-3 hidden md:table-cell text-gray-500">{s.source || '—'}</td>
                          <td className="px-4 py-3 hidden md:table-cell text-gray-500">{fmtDate(s.created_at)}</td>
                          <td className="px-4 py-3">
                            <div className="flex items-center justify-end">
                              <Button type="button" size="sm" variant="ghost"
                                className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                                onClick={() => setDeleteSub(s)}>
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
        </TabsContent>
      </Tabs>

      {/* ── Composer dialog ── */}
      <Dialog open={composerOpen} onOpenChange={setComposerOpen}>
        <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-5xl max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{composer.id ? 'Edit Campaign' : 'New Campaign'}</DialogTitle>
            <DialogDescription>
              Choose a template, write your email, and preview it before sending.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-6 lg:grid-cols-2">
            {/* Editor side */}
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-sm font-normal flex items-center gap-1.5">
                  <LayoutTemplate className="w-3.5 h-3.5" /> Template
                </Label>
                <div className="grid grid-cols-2 gap-2">
                  {[BLANK_TEMPLATE, ...EMAIL_TEMPLATES].map(tpl => (
                    <button key={tpl.id} type="button" onClick={() => applyTemplate(tpl)}
                      className={`text-left rounded-md border p-2.5 transition-colors ${
                        composer.template === tpl.id
                          ? 'border-amber-500 bg-amber-50'
                          : 'border-input hover:border-amber-300 hover:bg-amber-50/40'
                      }`}>
                      <p className="text-xs font-semibold text-gray-800">{tpl.name}</p>
                      <p className="text-[11px] text-gray-400 line-clamp-2">{tpl.description}</p>
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-sm font-normal">Subject <span className="text-destructive">*</span></Label>
                <Input value={composer.subject} placeholder="Your email subject"
                  onChange={e => setComposer(c => ({ ...c, subject: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label className="text-sm font-normal">Preheader</Label>
                <Input value={composer.preheader} placeholder="Short preview text shown in inbox"
                  onChange={e => setComposer(c => ({ ...c, preheader: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label className="text-sm font-normal">Body</Label>
                <RichTextEditor value={composer.body_html}
                  onChange={html => setComposer(c => ({ ...c, body_html: html }))} />
              </div>
            </div>

            {/* Preview side */}
            <div className="space-y-1.5">
              <Label className="text-sm font-normal flex items-center gap-1.5">
                <Eye className="w-3.5 h-3.5" /> Live Preview
              </Label>
              <div className="rounded-lg border bg-[#f5f5f0] p-4 overflow-y-auto max-h-[560px]">
                <div className="mx-auto max-w-[600px] rounded-lg overflow-hidden shadow-sm"
                  dangerouslySetInnerHTML={{ __html: previewHtml(composer) }} />
              </div>
            </div>
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button type="button" variant="outline" onClick={sendTest}
              disabled={!composer.subject.trim()}>
              <Send className="w-4 h-4 mr-2" /> Send Test
            </Button>
            <Button type="button" variant="outline" onClick={saveDraft}
              disabled={saving || !composer.subject.trim()}>
              <Save className="w-4 h-4 mr-2" /> {saving ? 'Saving…' : 'Save Draft'}
            </Button>
            <Button type="button" onClick={requestSend}
              disabled={saving || !composer.subject.trim()}>
              <Send className="w-4 h-4 mr-2" /> Send Campaign
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Send confirmation ── */}
      <AlertDialog open={!!sendTarget} onOpenChange={o => !o && !sending && setSendTarget(null)}>
        <AlertDialogContent className="max-w-[calc(100%-2rem)] md:max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>Send this campaign?</AlertDialogTitle>
            <AlertDialogDescription>
              <strong>{sendTarget?.subject}</strong> will be sent to all{' '}
              <strong>{activeCount}</strong> active subscriber(s). This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={sending}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={e => { e.preventDefault(); confirmSend(); }} disabled={sending}>
              {sending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
              {sending ? 'Sending…' : `Send to ${activeCount}`}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── Delete campaign ── */}
      <AlertDialog open={!!deleteCampaign} onOpenChange={o => !o && setDeleteCampaign(null)}>
        <AlertDialogContent className="max-w-[calc(100%-2rem)] md:max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete campaign?</AlertDialogTitle>
            <AlertDialogDescription>
              <strong>{deleteCampaign?.subject}</strong> will be permanently removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteCampaign}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── Delete subscriber ── */}
      <AlertDialog open={!!deleteSub} onOpenChange={o => !o && setDeleteSub(null)}>
        <AlertDialogContent className="max-w-[calc(100%-2rem)] md:max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>Remove subscriber?</AlertDialogTitle>
            <AlertDialogDescription>
              <strong>{deleteSub?.email}</strong> will be permanently removed from your list.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteSub}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
