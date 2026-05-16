import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Save } from 'lucide-react';

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<any>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.get('/api/settings').then((data) => {
      if (data) setSettings(data);
    });
  }, []);

  const save = async () => {
    setLoading(true);
    try {
      await api.put('/api/settings', settings);
      toast.success('Settings saved');
    } catch {
      toast.error('Failed to save');
    } finally {
      setLoading(false);
    }
  };

  const update = (key: string, value: any) => setSettings({ ...settings, [key]: value });

  return (
    <div className="space-y-6 max-w-2xl">
      <h1 className="text-2xl font-bold text-gray-900">Site Settings</h1>
      <div className="bg-white rounded-xl border border-gray-100 p-6 shadow-sm space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div><Label>Site Name</Label><Input value={settings.site_name || ''} onChange={e => update('site_name', e.target.value)} /></div>
          <div><Label>Contact Phone</Label><Input value={settings.contact_phone || ''} onChange={e => update('contact_phone', e.target.value)} /></div>
          <div><Label>Contact Email</Label><Input value={settings.contact_email || ''} onChange={e => update('contact_email', e.target.value)} /></div>
          <div><Label>Contact Address</Label><Input value={settings.contact_address || ''} onChange={e => update('contact_address', e.target.value)} /></div>
          <div><Label>Delivery Fee</Label><Input type="number" value={settings.delivery_fee || 0} onChange={e => update('delivery_fee', parseFloat(e.target.value))} /></div>
          <div><Label>Free Delivery Threshold</Label><Input type="number" value={settings.free_delivery_threshold || 0} onChange={e => update('free_delivery_threshold', parseFloat(e.target.value))} /></div>
          <div><Label>Facebook URL</Label><Input value={settings.facebook_url || ''} onChange={e => update('facebook_url', e.target.value)} /></div>
          <div><Label>Instagram URL</Label><Input value={settings.instagram_url || ''} onChange={e => update('instagram_url', e.target.value)} /></div>
          <div><Label>Twitter URL</Label><Input value={settings.twitter_url || ''} onChange={e => update('twitter_url', e.target.value)} /></div>
          <div><Label>WhatsApp Number</Label><Input value={settings.whatsapp_number || ''} onChange={e => update('whatsapp_number', e.target.value)} /></div>
          <div className="sm:col-span-2"><Label>Meta Title</Label><Input value={settings.meta_title || ''} onChange={e => update('meta_title', e.target.value)} /></div>
          <div className="sm:col-span-2"><Label>Meta Description</Label><Input value={settings.meta_description || ''} onChange={e => update('meta_description', e.target.value)} /></div>
        </div>
        <Button onClick={save} disabled={loading} className="bg-amber-600 hover:bg-amber-700">
          <Save className="w-4 h-4 mr-2" /> {loading ? 'Saving...' : 'Save Settings'}
        </Button>
      </div>
    </div>
  );
}
