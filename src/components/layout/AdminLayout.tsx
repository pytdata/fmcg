import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAdminAuth } from '@/contexts/AdminAuthContext';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { toast } from 'sonner';
import {
  LayoutDashboard, ShoppingBag, Users, Tag, Gift, Image, Settings, Menu, LogOut,
  ChevronLeft, ChevronRight, FileText, Ticket, Lock, Loader2, FolderOpen, MapPin,
  Boxes, Building2, UsersRound, BarChart3, Globe, Newspaper, Mail, PackageOpen, Quote,
} from 'lucide-react';

const navGroups = [
  {
    title: 'Overview',
    items: [
      { label: 'Dashboard', path: '/admin',           icon: LayoutDashboard },
      { label: 'Analytics', path: '/admin/analytics',  icon: BarChart3 },
    ],
  },
  {
    title: 'Catalog',
    items: [
      { label: 'Products',        path: '/admin/products',        icon: ShoppingBag },
      { label: 'Categories',      path: '/admin/categories',      icon: FolderOpen },
      { label: 'Pricing',         path: '/admin/pricing',         icon: Ticket },
      { label: 'Gift Boxes',      path: '/admin/gift-boxes',      icon: Gift },
      { label: 'Gift Packaging',  path: '/admin/gift-packaging',  icon: PackageOpen },
    ],
  },
  {
    title: 'Sales',
    items: [
      { label: 'Orders',             path: '/admin/orders',             icon: ShoppingBag },
      { label: 'Customers',          path: '/admin/customers',          icon: Users },
      { label: 'Promotions',         path: '/admin/promotions',         icon: Tag },
      { label: 'Delivery Locations', path: '/admin/delivery-locations', icon: MapPin },
    ],
  },
  {
    title: 'Content',
    items: [
      { label: 'Pages',   path: '/admin/pages',   icon: FileText },
      { label: 'Blog',    path: '/admin/blog',    icon: Newspaper },
      { label: 'Banners', path: '/admin/banners', icon: Image },
      { label: 'Testimonials', path: '/admin/testimonials', icon: Quote },
      { label: 'Brands',  path: '/admin/brands',  icon: Building2 },
      { label: 'Team',    path: '/admin/team',    icon: UsersRound },
    ],
  },
  {
    title: 'Marketing',
    items: [
      { label: 'Newsletter', path: '/admin/newsletter', icon: Mail },
      { label: 'SEO',        path: '/admin/seo',        icon: Globe },
    ],
  },
  {
    title: 'System',
    items: [
      { label: 'Modules',  path: '/admin/modules',  icon: Boxes },
      { label: 'Settings', path: '/admin/settings', icon: Settings },
    ],
  },
];

// ── Inline admin login screen ─────────────────────────────────────────────────
function AdminLoginScreen() {
  const { signIn } = useAdminAuth();
  const navigate = useNavigate();
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError]       = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    const { error: err } = await signIn(email, password);
    setSubmitting(false);
    if (err) {
      setError('Invalid email or password. Please try again.');
    } else {
      toast.success('Welcome back, Admin!');
      navigate('/admin', { replace: true });
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-amber-600 flex items-center justify-center mx-auto mb-4 shadow-lg">
            <Lock className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Admin Portal</h1>
          <p className="text-sm text-gray-500 mt-1">Sign in to access the dashboard</p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8">
          <form onSubmit={handleLogin} className="space-y-5">
            <div className="space-y-1.5">
              <Label htmlFor="admin-email" className="text-sm font-normal">Email address</Label>
              <Input
                id="admin-email"
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
              <Label htmlFor="admin-password" className="text-sm font-normal">Password</Label>
              <Input
                id="admin-password"
                type="password"
                autoComplete="current-password"
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                className="h-11"
              />
            </div>

            {error && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                {error}
              </p>
            )}

            <Button
              type="submit"
              disabled={submitting}
              className="w-full h-11 bg-amber-600 hover:bg-amber-700 text-white font-semibold"
            >
              {submitting
                ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Signing in…</>
                : 'Sign In to Admin'}
            </Button>
          </form>
        </div>

        <p className="text-center text-xs text-gray-400 mt-6">
          Admin access only. Unauthorised access is prohibited.
        </p>
      </div>
    </div>
  );
}

// ── Main admin layout ─────────────────────────────────────────────────────────
export default function AdminLayout() {
  const { isAdmin, loading, signOut } = useAdminAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  // Wait for auth to resolve before deciding
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
      </div>
    );
  }

  // Not an admin — show the inline login screen (no redirect, no flash)
  if (!isAdmin) {
    return <AdminLoginScreen />;
  }

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Desktop Sidebar */}
      <aside className={`hidden lg:flex flex-col border-r bg-white transition-all duration-300 ${collapsed ? 'w-16' : 'w-60'}`}>
        <div className="flex items-center justify-between h-14 px-3 border-b">
          {!collapsed && (
            <Link to="/" className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-amber-500 flex items-center justify-center">
                <span className="text-white font-bold text-xs">KW</span>
              </div>
              <span className="font-bold text-sm">Admin</span>
            </Link>
          )}
          <button onClick={() => setCollapsed(!collapsed)} className="p-1 hover:bg-gray-100 rounded">
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>
        <nav className="flex-1 min-h-0 py-3 px-2 space-y-3 overflow-y-auto">
          {navGroups.map(group => (
            <div key={group.title} className="space-y-1">
              {!collapsed && (
                <p className="px-2 pt-1 text-[10px] font-semibold uppercase tracking-wider text-gray-400">{group.title}</p>
              )}
              {group.items.map(item => {
                const active = location.pathname === item.path;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`flex items-center gap-3 px-2 py-2 rounded-lg text-sm transition-colors ${active ? 'bg-amber-50 text-amber-700 font-medium' : 'text-gray-600 hover:bg-gray-50'}`}
                    title={collapsed ? item.label : undefined}
                  >
                    <item.icon className="w-4 h-4 shrink-0" />
                    {!collapsed && <span>{item.label}</span>}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>
        <div className="p-2 border-t">
          <button
            onClick={() => { signOut(); navigate('/admin'); }}
            className={`flex items-center gap-3 px-2 py-2 rounded-lg text-sm text-red-600 hover:bg-red-50 w-full ${collapsed ? 'justify-center' : ''}`}
          >
            <LogOut className="w-4 h-4 shrink-0" />
            {!collapsed && <span>Sign Out</span>}
          </button>
        </div>
      </aside>

      {/* Mobile layout */}
      <div className="flex flex-col flex-1 min-w-0">
        <header className="lg:hidden flex items-center justify-between h-14 px-4 bg-white border-b">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-amber-500 flex items-center justify-center">
              <span className="text-white font-bold text-xs">KW</span>
            </div>
            <span className="font-bold text-sm">Admin</span>
          </Link>
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon"><Menu className="w-5 h-5" /></Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-60 p-0">
              <div className="flex flex-col h-full">
                <div className="flex items-center gap-2 h-14 px-4 border-b shrink-0">
                  <div className="w-7 h-7 rounded-full bg-amber-500 flex items-center justify-center">
                    <span className="text-white font-bold text-xs">KW</span>
                  </div>
                  <span className="font-bold text-sm">Admin</span>
                </div>
                <nav className="flex-1 min-h-0 py-3 px-2 space-y-3 overflow-y-auto">
                  {navGroups.map(group => (
                    <div key={group.title} className="space-y-1">
                      <p className="px-2 pt-1 text-[10px] font-semibold uppercase tracking-wider text-gray-400">{group.title}</p>
                      {group.items.map(item => {
                        const active = location.pathname === item.path;
                        return (
                          <Link
                            key={item.path}
                            to={item.path}
                            onClick={() => setMobileOpen(false)}
                            className={`flex items-center gap-3 px-2 py-2 rounded-lg text-sm transition-colors ${active ? 'bg-amber-50 text-amber-700 font-medium' : 'text-gray-600 hover:bg-gray-50'}`}
                          >
                            <item.icon className="w-4 h-4 shrink-0" />
                            <span>{item.label}</span>
                          </Link>
                        );
                      })}
                    </div>
                  ))}
                </nav>
                <div className="p-2 border-t">
                  <button
                    onClick={() => { signOut(); navigate('/admin'); }}
                    className="flex items-center gap-3 px-2 py-2 rounded-lg text-sm text-red-600 hover:bg-red-50 w-full"
                  >
                    <LogOut className="w-4 h-4 shrink-0" /><span>Sign Out</span>
                  </button>
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </header>
        <main className="flex-1 overflow-y-auto p-4 sm:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
