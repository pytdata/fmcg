import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useCart } from '@/contexts/CartContext';
import { useModules } from '@/contexts/ModulesContext';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ShoppingCart, Menu, Search, User, Heart, Gift, Package, LogOut, ChevronDown, X } from 'lucide-react';

export default function Header() {
  const { user, signOut } = useAuth();
  const { cartCount } = useCart();
  const { isEnabled } = useModules();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (search.trim()) navigate(`/shop?search=${encodeURIComponent(search.trim())}`);
  };

  const navLinks = [
    { label: 'Home', path: '/' },
    { label: 'Shop', path: '/shop' },
    ...(isEnabled('gift_boxes') ? [{ label: 'Gift Boxes', path: '/gift-boxes' }] : []),
    { label: 'About', path: '/about' },
    ...(isEnabled('services_page') ? [{ label: 'Services', path: '/services' }] : []),
    { label: 'Contact', path: '/contact' },
  ];

  return (
    <header className="sticky top-0 z-50 w-full bg-white/95 backdrop-blur border-b shadow-sm">
      <div className="container mx-auto px-4">
        {/* Top bar */}
        <div className="flex items-center justify-between h-16 gap-4">
          <Link to="/" className="flex items-center gap-2 shrink-0">
            <div className="w-8 h-8 rounded-full bg-amber-500 flex items-center justify-center">
              <span className="text-white font-bold text-sm">KW</span>
            </div>
            <span className="text-lg font-bold text-gray-900 hidden sm:block">KW Enterprise</span>
          </Link>

          <form onSubmit={handleSearch} className="hidden md:flex flex-1 max-w-md mx-4 relative">
            <Input
              placeholder="Search products..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pr-10 rounded-full bg-gray-50 border-gray-200"
            />
            <button type="submit" className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-amber-600">
              <Search className="w-4 h-4" />
            </button>
          </form>

          <div className="flex items-center gap-1 sm:gap-3">
            <Link to="/cart" className="relative p-2 text-gray-700 hover:text-amber-600">
              <ShoppingCart className="w-5 h-5" />
              {cartCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 bg-red-600 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                  {cartCount}
                </span>
              )}
            </Link>

            {user ? (
              <div className="hidden sm:flex items-center gap-1">
                <div className="relative group">
                  <div className="flex items-center gap-1 text-gray-700 text-sm font-medium px-3 py-1.5 rounded-md cursor-pointer hover:bg-gray-50">
                    <User className="w-4 h-4" />
                    <span className="max-w-[80px] truncate">Account</span>
                    <ChevronDown className="w-3 h-3" />
                  </div>
                  <div className="absolute right-0 top-full pt-1 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all min-w-[160px]">
                    <div className="bg-white border rounded-lg shadow-lg py-1">
                      <Link to="/profile" className="flex items-center gap-2 px-4 py-2 text-sm hover:bg-gray-50 text-gray-700"><User className="w-4 h-4" /> Profile</Link>
                      <Link to="/orders" className="flex items-center gap-2 px-4 py-2 text-sm hover:bg-gray-50 text-gray-700"><Package className="w-4 h-4" /> Orders</Link>
                      <Link to="/wishlist" className="flex items-center gap-2 px-4 py-2 text-sm hover:bg-gray-50 text-gray-700"><Heart className="w-4 h-4" /> Wishlist</Link>
                      <button onClick={() => signOut()} className="flex items-center gap-2 px-4 py-2 text-sm hover:bg-gray-50 text-red-600 w-full text-left"><LogOut className="w-4 h-4" /> Sign Out</button>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="hidden sm:flex items-center gap-1">
                <Link to="/login"><Button variant="ghost" size="sm">Sign In</Button></Link>
                <Link to="/register"><Button size="sm" className="bg-amber-600 hover:bg-amber-700">Register</Button></Link>
              </div>
            )}

            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="md:hidden"><Menu className="w-5 h-5" /></Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[280px]">
                <div className="flex flex-col h-full">
                  <div className="flex items-center justify-between mb-6">
                    <span className="font-bold text-lg">Menu</span>
                  </div>
                  <form onSubmit={handleSearch} className="mb-4 relative">
                    <Input placeholder="Search..." value={search} onChange={(e) => setSearch(e.target.value)} className="pr-8" />
                    <button type="submit" className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400"><Search className="w-4 h-4" /></button>
                  </form>
                  <nav className="flex flex-col gap-1">
                    {navLinks.map(link => (
                      <Link key={link.path} to={link.path} onClick={() => setMobileOpen(false)} className="px-3 py-2.5 rounded-md text-sm font-medium hover:bg-gray-100">{link.label}</Link>
                    ))}
                    <hr className="my-2" />
                    {user ? (
                      <>
                        <Link to="/profile" onClick={() => setMobileOpen(false)} className="flex items-center gap-2 px-3 py-2.5 rounded-md text-sm hover:bg-gray-100"><User className="w-4 h-4" /> Profile</Link>
                        <Link to="/orders" onClick={() => setMobileOpen(false)} className="flex items-center gap-2 px-3 py-2.5 rounded-md text-sm hover:bg-gray-100"><Package className="w-4 h-4" /> Orders</Link>
                        <Link to="/wishlist" onClick={() => setMobileOpen(false)} className="flex items-center gap-2 px-3 py-2.5 rounded-md text-sm hover:bg-gray-100"><Heart className="w-4 h-4" /> Wishlist</Link>
                        <button onClick={() => { signOut(); setMobileOpen(false); }} className="flex items-center gap-2 px-3 py-2.5 rounded-md text-sm text-red-600 hover:bg-gray-100 w-full text-left"><LogOut className="w-4 h-4" /> Sign Out</button>
                      </>
                    ) : (
                      <>
                        <Link to="/login" onClick={() => setMobileOpen(false)} className="px-3 py-2.5 rounded-md text-sm hover:bg-gray-100">Sign In</Link>
                        <Link to="/register" onClick={() => setMobileOpen(false)} className="px-3 py-2.5 rounded-md text-sm hover:bg-gray-100">Register</Link>
                      </>
                    )}
                  </nav>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-6 h-10 -mb-px">
          {navLinks.map(link => (
            <Link key={link.path} to={link.path} className="text-sm font-medium text-gray-600 hover:text-amber-600 transition-colors relative after:absolute after:bottom-0 after:left-0 after:h-0.5 after:w-0 hover:after:w-full after:bg-amber-600 after:transition-all">
              {link.label}
            </Link>
          ))}
          {isEnabled('custom_gift_box') && (
            <Link to="/gift-boxes/custom" className="text-sm font-medium text-emerald-700 hover:text-emerald-800 transition-colors flex items-center gap-1">
              <Gift className="w-3.5 h-3.5" /> Build Your Gift Box
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
