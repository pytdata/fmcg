import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { Boxes, Loader2 } from 'lucide-react';
import type { SiteModule } from '@/types/index';

export default function AdminModulesPage() {
  const [modules, setModules] = useState<SiteModule[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const data = await api.get<SiteModule[]>('/api/modules');
      setModules(Array.isArray(data) ? data : []);
    } catch { toast.error('Failed to load modules'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const toggle = async (key: string, enabled: boolean) => {
    setSaving(key);
    // optimistic update
    setModules(ms => ms.map(m => m.key === key ? { ...m, enabled } : m));
    try {
      await api.patch(`/api/modules/${key}`, { enabled });
      toast.success(`${enabled ? 'Enabled' : 'Disabled'} successfully`);
    } catch {
      toast.error('Failed to update — reverting');
      setModules(ms => ms.map(m => m.key === key ? { ...m, enabled: !enabled } : m));
    } finally { setSaving(null); }
  };

  const activeCount = modules.filter(m => m.enabled).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Website Modules</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Activate or deactivate sections &amp; features. Disabled modules are hidden from the website.
        </p>
      </div>

      <Card>
        <CardContent className="p-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <Boxes className="w-4 h-4" />
          </div>
          <div>
            <p className="text-xs text-gray-500">Active Modules</p>
            <p className="text-xl font-bold text-gray-900">{activeCount} / {modules.length}</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">All Modules</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 text-center text-sm text-gray-400">
              <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2" /> Loading…
            </div>
          ) : (
            <div className="divide-y">
              {modules.map(m => (
                <div key={m.key} className="flex items-center justify-between gap-4 px-4 py-3.5">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900">{m.label}</p>
                    {m.description && <p className="text-xs text-gray-500 mt-0.5">{m.description}</p>}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {saving === m.key && <Loader2 className="w-3.5 h-3.5 animate-spin text-gray-400" />}
                    <Switch checked={m.enabled} onCheckedChange={v => toggle(m.key, v)} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
