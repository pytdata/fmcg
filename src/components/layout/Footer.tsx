import { Link } from 'react-router-dom';
import { useState } from 'react';
import { api } from '@/lib/api';
import { Facebook, Instagram, Twitter, Phone, Mail, MapPin, Send } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

export default function Footer() {
  const [email, setEmail] = useState('');

  const subscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    try {
      await api.post('/api/settings/newsletter', { email: email.trim() });
      toast.success('Subscribed successfully!');
      setEmail('');
    } catch (err: any) {
      const msg = err?.message || '';
      if (msg.toLowerCase().includes('duplicate') || msg.toLowerCase().includes('already')) {
        toast.success('You are already subscribed!');
      } else {
        toast.error('Subscription failed. Please try again.');
      }
    }
  };

  return (
    <footer className="bg-gray-900 text-gray-300">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-full bg-amber-500 flex items-center justify-center">
                <span className="text-white font-bold text-sm">KW</span>
              </div>
              <span className="text-lg font-bold text-white">KW Enterprise</span>
            </div>
            <p className="text-sm text-gray-400 mb-4">Your trusted FMCG distributor in Ghana. Quality products, great prices, delivered to your door.</p>
            <div className="flex items-center gap-3">
              <a href="#" className="w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center hover:bg-amber-600 transition-colors"><Facebook className="w-4 h-4" /></a>
              <a href="#" className="w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center hover:bg-amber-600 transition-colors"><Instagram className="w-4 h-4" /></a>
              <a href="#" className="w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center hover:bg-amber-600 transition-colors"><Twitter className="w-4 h-4" /></a>
            </div>
          </div>

          <div>
            <h4 className="text-white font-semibold mb-4">Quick Links</h4>
            <ul className="space-y-2 text-sm">
              <li><Link to="/" className="hover:text-amber-500 transition-colors">Home</Link></li>
              <li><Link to="/shop" className="hover:text-amber-500 transition-colors">Shop</Link></li>
              <li><Link to="/gift-boxes" className="hover:text-amber-500 transition-colors">Gift Boxes</Link></li>
              <li><Link to="/gift-boxes/custom" className="hover:text-amber-500 transition-colors">Build a Gift Box</Link></li>
              <li><Link to="/contact" className="hover:text-amber-500 transition-colors">Contact Us</Link></li>
              <li><Link to="/orders" className="hover:text-amber-500 transition-colors">Track Order</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="text-white font-semibold mb-4">Contact Us</h4>
            <ul className="space-y-3 text-sm">
              <li className="flex items-start gap-2"><Phone className="w-4 h-4 mt-0.5 text-amber-500 shrink-0" /><span>(+233) 26 479 3861</span></li>
              <li className="flex items-start gap-2"><Mail className="w-4 h-4 mt-0.5 text-amber-500 shrink-0" /><span>info@werekoenterprise.com</span></li>
              <li className="flex items-start gap-2"><MapPin className="w-4 h-4 mt-0.5 text-amber-500 shrink-0" /><span>Accra, Ghana</span></li>
            </ul>
          </div>

          <div>
            <h4 className="text-white font-semibold mb-4">Newsletter</h4>
            <p className="text-sm text-gray-400 mb-3">Subscribe for deals and new arrivals.</p>
            <form onSubmit={subscribe} className="flex gap-2">
              <Input type="email" placeholder="Your email" value={email} onChange={(e) => setEmail(e.target.value)} className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-500" required />
              <Button type="submit" size="icon" className="bg-amber-600 hover:bg-amber-700 shrink-0"><Send className="w-4 h-4" /></Button>
            </form>
          </div>
        </div>
      </div>
      <div className="border-t border-gray-800">
        <div className="container mx-auto px-4 py-5">
          <div className="flex flex-col md:flex-row items-center justify-between gap-3 text-xs text-gray-500">
            <p>&copy; {new Date().getFullYear()} KW Enterprise. All rights reserved.</p>
            <div className="flex flex-wrap items-center justify-center gap-4">
              <Link to="/privacy" className="hover:text-amber-500 transition-colors">Privacy Policy</Link>
              <Link to="/terms" className="hover:text-amber-500 transition-colors">Terms & Conditions</Link>
              <Link to="/faq" className="hover:text-amber-500 transition-colors">FAQ</Link>
              <Link to="/contact" className="hover:text-amber-500 transition-colors">Contact Us</Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
