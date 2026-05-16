/**
 * AdminSetupPage – one-time admin account creation.
 * Accessible at /admin/setup
 * Protected by the SETUP_TOKEN from server/.env
 */
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import { ShieldCheck, Loader2, CheckCircle2, AlertCircle, ArrowRight, Info } from 'lucide-react';

export default function AdminSetupPage() {
  const navigate = useNavigate();

  const [setupToken, setSetupToken]   = useState('');
  const [email, setEmail]             = useState('tech.dataglow@gmail.com');
  const [password, setPassword]       = useState('');
  const [fullName, setFullName]       = useState('KW Admin');
  const [phone, setPhone]             = useState('');
  const [loading, setLoading]         = useState(false);
  const [success, setSuccess]         = useState(false);
  const [error, setError]             = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await api.post<{ success: boolean; message: string }>('/api/setup/admin', {
        setup_token: setupToken,
        email,
        password,
        full_name: fullName,
        phone,
      });
      if (data.success) {
        setSuccess(true);
        toast.success('Admin account created! You can now sign in.');
      }
    } catch (err) {
      const msg = (err as Error).message || 'Setup failed. Check your setup token and try again.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  // ── Success state ────────────────────────────────────────────────────────
  if (success) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="w-full max-w-sm text-center">
          <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-5">
            <CheckCircle2 className="w-8 h-8 text-green-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Admin Account Ready</h1>
          <p className="text-gray-500 text-sm mb-8">
            Your admin account has been created. Sign in to access the dashboard.
          </p>
          <Button
            onClick={() => navigate('/admin')}
            className="w-full h-11 bg-amber-600 hover:bg-amber-700 text-white font-semibold"
          >
            Go to Admin Login <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
          <p className="text-xs text-gray-400 mt-4">
            Tip: Set <code className="bg-gray-100 px-1 rounded">SETUP_DISABLED=true</code> in{' '}
            <code className="bg-gray-100 px-1 rounded">server/.env</code> to disable this page.
          </p>
        </div>
      </div>
    );
  }

  // ── Setup form ───────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">

        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-amber-600 flex items-center justify-center mx-auto mb-4 shadow-lg">
            <ShieldCheck className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Admin Setup</h1>
          <p className="text-sm text-gray-500 mt-1">Create the first admin account</p>
        </div>

        {/* Info banner */}
        <div className="flex gap-3 bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 mb-6 text-sm text-blue-800">
          <Info className="w-4 h-4 shrink-0 mt-0.5 text-blue-500" />
          <p className="text-pretty">
            The <strong>Setup Token</strong> is the first 16 characters of your{' '}
            <code className="bg-blue-100 px-1 rounded">JWT_SECRET</code> in{' '}
            <code className="bg-blue-100 px-1 rounded">server/.env</code>.
            You can also set a custom <code className="bg-blue-100 px-1 rounded">SETUP_TOKEN</code> env var.
          </p>
        </div>

        {/* Form card */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8">
          <form onSubmit={handleSubmit} className="space-y-5">

            <div className="space-y-1.5">
              <Label htmlFor="setup-token" className="text-sm font-normal">
                Setup Token <span className="text-red-500">*</span>
              </Label>
              <Input
                id="setup-token"
                type="password"
                placeholder="First 16 chars of JWT_SECRET"
                value={setupToken}
                onChange={e => setSetupToken(e.target.value)}
                required
                className="h-11 font-mono"
              />
            </div>

            <div className="border-t border-gray-100 pt-4">
              <p className="text-xs text-gray-400 mb-4 font-medium uppercase tracking-wide">Admin Account Details</p>

              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="setup-name" className="text-sm font-normal">Full Name</Label>
                  <Input
                    id="setup-name"
                    type="text"
                    placeholder="KW Admin"
                    value={fullName}
                    onChange={e => setFullName(e.target.value)}
                    className="h-11"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="setup-email" className="text-sm font-normal">
                    Email <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="setup-email"
                    type="email"
                    autoComplete="email"
                    placeholder="admin@example.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    required
                    className="h-11"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="setup-password" className="text-sm font-normal">
                    Password <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="setup-password"
                    type="password"
                    autoComplete="new-password"
                    placeholder="Min. 8 characters"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                    minLength={8}
                    className="h-11"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="setup-phone" className="text-sm font-normal">Phone (optional)</Label>
                  <Input
                    id="setup-phone"
                    type="tel"
                    placeholder="+233 24 000 0000"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    className="h-11"
                  />
                </div>
              </div>
            </div>

            {error && (
              <div className="flex gap-2 text-sm text-red-700 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <Button
              type="submit"
              disabled={loading}
              className="w-full h-11 bg-amber-600 hover:bg-amber-700 text-white font-semibold"
            >
              {loading
                ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Creating Admin…</>
                : 'Create Admin Account'}
            </Button>
          </form>
        </div>

        <div className="text-center mt-5 space-y-1">
          <Link to="/admin" className="text-xs text-amber-600 hover:underline">
            ← Already have an account? Sign in
          </Link>
        </div>
      </div>
    </div>
  );
}
