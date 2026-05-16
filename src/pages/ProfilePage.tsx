import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { User, Mail, Phone, Save } from 'lucide-react';

export default function ProfilePage() {
  const { user, profile, refreshProfile } = useAuth();
  const [form, setForm] = useState({ fullName: '', phone: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (profile) setForm({ fullName: profile.full_name || '', phone: profile.phone || '' });
  }, [profile]);

  const saveProfile = async () => {
    if (!user) return;
    setSaving(true);
    try {
      await api.put('/api/auth/profile', { full_name: form.fullName, phone: form.phone });
      toast.success('Profile updated successfully!');
      await refreshProfile();
    } catch {
      toast.error('Failed to update profile.');
    } finally {
      setSaving(false);
    }
  };

  if (!user) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <p className="text-gray-500">Please sign in to view your profile.</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">My Profile</h1>
      <div className="bg-white rounded-xl border border-gray-100 p-6 shadow-sm space-y-5">
        <div>
          <Label className="flex items-center gap-1.5"><Mail className="w-3.5 h-3.5" /> Email</Label>
          <Input value={user.email || ''} disabled className="bg-gray-50" />
        </div>
        <div>
          <Label className="flex items-center gap-1.5"><User className="w-3.5 h-3.5" /> Full Name</Label>
          <Input value={form.fullName} onChange={e => setForm({ ...form, fullName: e.target.value })} />
        </div>
        <div>
          <Label className="flex items-center gap-1.5"><Phone className="w-3.5 h-3.5" /> Phone</Label>
          <Input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
        </div>
        <Button onClick={saveProfile} disabled={saving} className="bg-amber-600 hover:bg-amber-700">
          <Save className="w-4 h-4 mr-2" /> {saving ? 'Saving…' : 'Save Changes'}
        </Button>
      </div>
    </div>
  );
}

