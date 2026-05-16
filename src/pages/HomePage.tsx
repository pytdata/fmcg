import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getCategories, getProducts, getBanners, getGiftBoxes } from '@/services/store';
import { api } from '@/lib/api';
import BannerSlider from '@/components/common/BannerSlider';
import ProductCard from '@/components/common/ProductCard';
import CategoryCard from '@/components/common/CategoryCard';
import GiftBoxCard from '@/components/common/GiftBoxCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Gift, ArrowRight, TrendingUp, Truck, ShieldCheck, Headphones,
  Star, Quote, CheckCircle2, Instagram, Facebook, Twitter,
  Package, Zap, Heart, Award,
} from 'lucide-react';
import type { Category, Product, Banner, GiftBox } from '@/types/index';

// Demo fallback banners when DB is empty
const DEMO_BANNERS: Banner[] = [
  {
    id: '1', title: 'Premium FMCG Products Delivered to You', subtitle: 'Shop quality groceries, beverages and household essentials at unbeatable prices across Ghana.',
    image_url: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=1200&q=80', link: '/shop', button_text: 'Shop Now', sort_order: 0, is_active: true,
  },
  {
    id: '2', title: 'Gift Boxes for Every Occasion', subtitle: 'Curated gift packages with exclusive coupon deals. Perfect for birthdays, weddings and celebrations.',
    image_url: 'https://images.unsplash.com/photo-1512909006721-3d6018887383?w=1200&q=80', link: '/gift-boxes', button_text: 'Explore Gifts', sort_order: 1, is_active: true,
  },
  {
    id: '3', title: 'Fast & Reliable Delivery', subtitle: 'Same-day delivery in Accra. We bring the supermarket to your doorstep — fresh, fast and affordable.',
    image_url: 'https://images.unsplash.com/photo-1553413077-190dd305871c?w=1200&q=80', link: '/shop', button_text: 'Order Now', sort_order: 2, is_active: true,
  },
];

const DEMO_PRODUCTS: Product[] = [
  { id: 'd1', name: 'Organic Coconut Oil 500ml', slug: 'coconut-oil', price: 45.00, compare_price: 55.00, stock_quantity: 50, images: ['https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=400&q=80'], is_featured: true, is_active: true },
  { id: 'd2', name: 'Premium Basmati Rice 5kg', slug: 'basmati-rice', price: 85.00, compare_price: 95.00, stock_quantity: 30, images: ['https://images.unsplash.com/photo-1586201375761-83865001e31c?w=400&q=80'], is_featured: true, is_active: true },
  { id: 'd3', name: 'Fresh Orange Juice 1L Pack', slug: 'orange-juice', price: 22.00, stock_quantity: 100, images: ['https://images.unsplash.com/photo-1621506289937-a8e4df240d0b?w=400&q=80'], is_featured: true, is_active: true },
  { id: 'd4', name: 'Extra Virgin Olive Oil', slug: 'olive-oil', price: 68.00, compare_price: 80.00, stock_quantity: 25, images: ['https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=400&q=80'], is_featured: true, is_active: true },
  { id: 'd5', name: 'Whole Grain Oats 1kg', slug: 'oats', price: 35.00, stock_quantity: 60, images: ['https://images.unsplash.com/photo-1614144052553-5f4aa9219b9b?w=400&q=80'], is_featured: true, is_active: true },
  { id: 'd6', name: 'Almond Milk 1L Carton', slug: 'almond-milk', price: 28.00, stock_quantity: 40, images: ['https://images.unsplash.com/photo-1550583724-b2692b85b150?w=400&q=80'], is_featured: true, is_active: true },
  { id: 'd7', name: 'Honey Jar 350g', slug: 'honey', price: 42.00, compare_price: 50.00, stock_quantity: 80, images: ['https://images.unsplash.com/photo-1587049352846-4a222e784d38?w=400&q=80'], is_featured: true, is_active: true },
  { id: 'd8', name: 'Premium Coffee Blend 200g', slug: 'coffee', price: 55.00, stock_quantity: 35, images: ['https://images.unsplash.com/photo-1559056199-641a0ac8b55e?w=400&q=80'], is_featured: true, is_active: true },
];

const TESTIMONIALS = [
  { name: 'Abena Mensah', role: 'Regular Customer', text: 'KW Enterprise has the best quality products. Delivery is always on time and the packaging is perfect. Highly recommend!', rating: 5, avatar: 'AM' },
  { name: 'Kwame Asante', role: 'Business Owner', text: "I've been ordering wholesale from KW for 2 years. The prices are competitive and they always have stock. Great business to work with.", rating: 5, avatar: 'KA' },
  { name: 'Ama Boateng', role: 'Homemaker', text: 'The gift boxes are absolutely beautiful! I ordered one for my mother\'s birthday and she loved it. Will definitely order again.', rating: 5, avatar: 'AB' },
];

const BLOG_POSTS = [
  {
    title: '5 Must-Have FMCG Products for Every Ghanaian Home',
    category: 'Lifestyle',
    excerpt: 'Discover the essential pantry staples that make cooking easier and more nutritious for your family.',
    image: 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=400&q=80',
    date: 'May 12, 2026',
    readTime: '3 min',
  },
  {
    title: 'How to Choose the Perfect Gift Box for Any Occasion',
    category: 'Gifting',
    excerpt: 'From birthdays to weddings, learn the art of selecting the right gift that leaves a lasting impression.',
    image: 'https://images.unsplash.com/photo-1513475382585-d06e58bcb0e0?w=400&q=80',
    date: 'May 8, 2026',
    readTime: '4 min',
  },
  {
    title: 'Behind the Scenes: Our Quality Control Process',
    category: 'Company',
    excerpt: 'A look at how we ensure every product that reaches you meets our strict quality standards.',
    image: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=400&q=80',
    date: 'May 2, 2026',
    readTime: '5 min',
  },
];

const BRANDS = [
  { name: 'Nestlé', bg: 'bg-blue-50' },
  { name: 'Unilever', bg: 'bg-green-50' },
  { name: 'Procter & Gamble', bg: 'bg-orange-50' },
  { name: 'Coca-Cola', bg: 'bg-red-50' },
  { name: 'Heineken', bg: 'bg-yellow-50' },
  { name: 'Kellogg\'s', bg: 'bg-purple-50' },
];

export default function HomePage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [featuredProducts, setFeaturedProducts] = useState<Product[]>([]);
  const [banners, setBanners] = useState<Banner[]>([]);
  const [giftBoxes, setGiftBoxes] = useState<GiftBox[]>([]);
  const [email, setEmail] = useState('');
  const [subscribing, setSubscribing] = useState(false);

  useEffect(() => {
    getCategories().then(setCategories);
    getProducts({ featured: true, limit: 8 }).then(d => setFeaturedProducts(d.length ? d : DEMO_PRODUCTS));
    getBanners().then(d => setBanners(d.length ? d : DEMO_BANNERS));
    getGiftBoxes().then(d => setGiftBoxes(d.slice(0, 4)));
  }, []);

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setSubscribing(true);
    try {
      await api.post('/api/settings/newsletter', { email });
      setEmail('');
      alert('You\'re subscribed! Watch for deals in your inbox.');
    } catch { alert('Subscription failed. Please try again.'); }
    finally { setSubscribing(false); }
  };

  return (
    <div className="space-y-0 pb-0">
      {/* ── Hero Banner Slider ── */}
      <section className="container mx-auto px-4 pt-4 pb-6">
        <BannerSlider banners={banners} />
      </section>

      {/* ── Features Strip ── */}
      <section className="bg-white border-y border-gray-100 py-4">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { icon: Truck,      title: 'Fast Delivery',    desc: 'Accra & beyond' },
              { icon: ShieldCheck, title: 'Secure Payment',  desc: 'PayStack & MoMo' },
              { icon: Award,      title: 'Quality Products', desc: 'Verified brands' },
              { icon: Headphones, title: '24/7 Support',     desc: 'Always here' },
            ].map(f => (
              <div key={f.title} className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-amber-50 flex items-center justify-center shrink-0">
                  <f.icon className="w-4 h-4 text-amber-600" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-900">{f.title}</p>
                  <p className="text-xs text-gray-500">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Flash Sale Banner ── */}
      <section className="container mx-auto px-4 py-6">
        <div className="bg-gradient-to-r from-red-600 to-orange-500 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center shrink-0">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <div className="text-white">
              <div className="flex items-center gap-2">
                <Badge className="bg-white/20 text-white border-0 text-xs font-bold uppercase">Flash Sale</Badge>
              </div>
              <p className="font-bold text-lg mt-0.5 text-balance">Up to 30% Off Selected Items</p>
              <p className="text-red-100 text-sm text-pretty">Limited time offer — grab your favourites before they're gone!</p>
            </div>
          </div>
          <Link to="/shop" className="shrink-0">
            <Button className="bg-white text-red-600 hover:bg-red-50 font-bold px-6 whitespace-nowrap">
              Shop Sale <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </Link>
        </div>
      </section>

      {/* ── Categories ── */}
      {categories.length > 0 && (
        <section className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-xl font-bold text-gray-900">Shop by Category</h2>
              <p className="text-sm text-gray-500 mt-0.5">Browse our wide selection of product categories</p>
            </div>
            <Link to="/shop" className="text-sm text-amber-600 hover:text-amber-700 font-medium flex items-center gap-1 shrink-0">
              All Categories <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {categories.map(c => <CategoryCard key={c.id} category={c} />)}
          </div>
        </section>
      )}

      {/* ── Featured Products ── */}
      <section className="container mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Featured Products</h2>
            <p className="text-sm text-gray-500 mt-0.5">Hand-picked best sellers and new arrivals</p>
          </div>
          <Link to="/shop" className="text-sm text-amber-600 hover:text-amber-700 font-medium flex items-center gap-1 shrink-0">
            View All <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 sm:gap-5">
          {featuredProducts.map(p => <ProductCard key={p.id} product={p} />)}
        </div>
        <div className="text-center mt-6">
          <Link to="/shop">
            <Button variant="outline" className="px-8 border-amber-200 text-amber-700 hover:bg-amber-50">
              Browse All Products <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </Link>
        </div>
      </section>

      {/* ── Stats Bar ── */}
      <section className="bg-amber-600 py-12">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-white text-center">
            {[
              { value: '500+', label: 'Products' },
              { value: '5,000+', label: 'Happy Customers' },
              { value: '10+', label: 'Cities Covered' },
              { value: '5', label: 'Years of Excellence' },
            ].map(s => (
              <div key={s.label}>
                <div className="text-3xl md:text-4xl font-bold mb-1">{s.value}</div>
                <div className="text-amber-100 text-sm font-medium">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Two-column promo ── */}
      <section className="container mx-auto px-4 py-10">
        <div className="grid md:grid-cols-2 gap-5">
          {/* New Arrivals */}
          <div className="relative bg-gradient-to-br from-blue-600 to-blue-800 rounded-2xl overflow-hidden p-6 text-white flex flex-col justify-between min-h-40">
            <img src="https://images.unsplash.com/photo-1605289355680-75fb41239154?w=600&q=70" alt="" className="absolute inset-0 w-full h-full object-cover opacity-20 mix-blend-overlay" />
            <div className="relative">
              <Badge className="bg-white/20 text-white border-0 text-xs mb-3">New Arrivals</Badge>
              <h3 className="text-xl font-bold mb-1 text-balance">Fresh Stock Just In</h3>
              <p className="text-blue-100 text-sm text-pretty">New products added weekly. Be the first to shop!</p>
            </div>
            <div className="relative mt-4">
              <Link to="/shop">
                <Button size="sm" className="bg-white text-blue-700 hover:bg-blue-50 font-semibold">Shop New</Button>
              </Link>
            </div>
          </div>
          {/* Best Deals */}
          <div className="relative bg-gradient-to-br from-emerald-600 to-emerald-800 rounded-2xl overflow-hidden p-6 text-white flex flex-col justify-between min-h-40">
            <img src="https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=600&q=70" alt="" className="absolute inset-0 w-full h-full object-cover opacity-20 mix-blend-overlay" />
            <div className="relative">
              <Badge className="bg-white/20 text-white border-0 text-xs mb-3">Best Deals</Badge>
              <h3 className="text-xl font-bold mb-1 text-balance">Save More Every Week</h3>
              <p className="text-emerald-100 text-sm text-pretty">Exclusive bulk discounts and coupon codes for registered members.</p>
            </div>
            <div className="relative mt-4">
              <Link to="/register">
                <Button size="sm" className="bg-white text-emerald-700 hover:bg-emerald-50 font-semibold">Join Free</Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── Gift Boxes CTA ── */}
      <section className="container mx-auto px-4 pb-8">
        <div className="bg-gradient-to-r from-emerald-700 to-emerald-900 rounded-2xl p-6 sm:p-10 text-white flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="max-w-lg">
            <div className="flex items-center gap-2 mb-3">
              <Gift className="w-5 h-5 text-emerald-300" />
              <span className="text-emerald-200 text-sm font-medium uppercase tracking-wide">Gift Box Feature</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold mb-3 text-balance">Curated & Customizable Gift Boxes</h2>
            <p className="text-emerald-100 mb-5 text-sm sm:text-base text-pretty">Choose from admin-curated gift packages or build your own custom gift box with special discounts and coupon codes.</p>
            <div className="flex flex-wrap gap-3">
              <Link to="/gift-boxes"><Button className="bg-white text-emerald-800 hover:bg-gray-100 font-semibold">Browse Gift Boxes</Button></Link>
              <Link to="/gift-boxes/custom">
                <Button variant="ghost" className="border border-white/40 text-white hover:bg-white/10">Build Your Own</Button>
              </Link>
            </div>
          </div>
          <div className="hidden md:block shrink-0">
            <img src="https://images.unsplash.com/photo-1512909006721-3d6018887383?w=400&q=80" alt="Gift boxes" className="w-64 h-48 object-cover rounded-xl shadow-2xl rotate-3" />
          </div>
        </div>
      </section>

      {/* ── Gift Boxes Grid ── */}
      {giftBoxes.length > 0 && (
        <section className="container mx-auto px-4 pb-8">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-xl font-bold text-gray-900">Popular Gift Boxes</h2>
            <Link to="/gift-boxes" className="text-sm text-emerald-600 hover:text-emerald-700 font-medium flex items-center gap-1">View All <ArrowRight className="w-4 h-4" /></Link>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 sm:gap-5">
            {giftBoxes.map(g => <GiftBoxCard key={g.id} giftBox={g} />)}
          </div>
        </section>
      )}

      {/* ── Why Choose Us ── */}
      <section className="bg-gray-50 py-14">
        <div className="container mx-auto px-4">
          <div className="text-center mb-10">
            <span className="text-amber-600 text-sm font-medium uppercase tracking-widest">Why KW Enterprise</span>
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mt-2 text-balance">The KW Difference</h2>
            <p className="text-gray-500 mt-2 max-w-xl mx-auto text-pretty">We're more than a shop — we're your trusted FMCG partner in Ghana.</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { icon: Package, title: 'Wide Product Range', desc: 'Over 500 FMCG products from trusted brands — groceries, beverages, personal care and more.', color: 'text-amber-600', bg: 'bg-amber-50' },
              { icon: Truck, title: 'Same-Day Delivery', desc: 'Order before 2pm and receive your items the same day within Accra and major cities.', color: 'text-blue-600', bg: 'bg-blue-50' },
              { icon: ShieldCheck, title: 'Quality Guarantee', desc: 'Every product passes our quality checks. Not satisfied? We offer hassle-free returns.', color: 'text-green-600', bg: 'bg-green-50' },
              { icon: TrendingUp, title: 'Competitive Pricing', desc: 'We buy in bulk to pass savings to you. Always get the best price on top brands.', color: 'text-purple-600', bg: 'bg-purple-50' },
              { icon: Heart, title: 'Customer First', desc: '24/7 WhatsApp and phone support. We go the extra mile to make every order right.', color: 'text-red-500', bg: 'bg-red-50' },
              { icon: Gift, title: 'Gift Solutions', desc: 'Unique pre-made and custom gift boxes for every occasion — delivered with a personal touch.', color: 'text-emerald-600', bg: 'bg-emerald-50' },
            ].map(f => (
              <div key={f.title} className="bg-white rounded-xl p-6 border border-gray-100 shadow-sm h-full flex flex-col">
                <div className={`w-11 h-11 rounded-xl ${f.bg} flex items-center justify-center mb-4 shrink-0`}>
                  <f.icon className={`w-5 h-5 ${f.color}`} />
                </div>
                <h3 className="font-semibold text-gray-900 mb-2 text-balance">{f.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed flex-1 text-pretty">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Testimonials ── */}
      <section className="container mx-auto px-4 py-14">
        <div className="text-center mb-10">
          <span className="text-amber-600 text-sm font-medium uppercase tracking-widest">Customer Reviews</span>
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mt-2 text-balance">What Our Customers Say</h2>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {TESTIMONIALS.map((t, i) => (
            <div key={i} className="bg-white rounded-xl p-6 border border-gray-100 shadow-sm h-full flex flex-col">
              <Quote className="w-7 h-7 text-amber-200 mb-3 shrink-0" />
              <p className="text-gray-600 text-sm leading-relaxed flex-1 text-pretty">"{t.text}"</p>
              <div className="flex mt-4 gap-0.5 mb-3">
                {[...Array(t.rating)].map((_, s) => <Star key={s} className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />)}
              </div>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-amber-100 flex items-center justify-center text-amber-700 font-bold text-sm shrink-0">{t.avatar}</div>
                <div>
                  <p className="text-sm font-semibold text-gray-900">{t.name}</p>
                  <p className="text-xs text-gray-400">{t.role}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Trusted Brands ── */}
      <section className="bg-gray-50 py-10">
        <div className="container mx-auto px-4">
          <p className="text-center text-sm text-gray-400 font-medium uppercase tracking-widest mb-6">Trusted Brands We Carry</p>
          <div className="flex flex-wrap justify-center gap-4">
            {BRANDS.map(b => (
              <div key={b.name} className={`${b.bg} rounded-xl px-6 py-3 text-sm font-semibold text-gray-600 border border-white shadow-sm`}>
                {b.name}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Blog / Tips ── */}
      <section className="container mx-auto px-4 py-14">
        <div className="flex items-center justify-between mb-8">
          <div>
            <span className="text-amber-600 text-sm font-medium uppercase tracking-widest">Blog & Tips</span>
            <h2 className="text-2xl font-bold text-gray-900 mt-1 text-balance">Latest from KW</h2>
          </div>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {BLOG_POSTS.map((post, i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden h-full flex flex-col hover:shadow-md transition-shadow">
              <div className="aspect-video overflow-hidden">
                <img src={post.image} alt={post.title} className="w-full h-full object-cover hover:scale-105 transition-transform duration-300" />
              </div>
              <div className="p-5 flex-1 flex flex-col">
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="secondary" className="text-xs">{post.category}</Badge>
                  <span className="text-xs text-gray-400">{post.readTime} read</span>
                </div>
                <h3 className="font-semibold text-gray-900 mb-2 text-balance leading-snug">{post.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed flex-1 text-pretty">{post.excerpt}</p>
                <p className="text-xs text-gray-400 mt-3">{post.date}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── App Download CTA ── */}
      <section className="container mx-auto px-4 pb-8">
        <div className="bg-gradient-to-r from-gray-900 to-gray-700 rounded-2xl p-6 sm:p-10 text-white">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="max-w-md">
              <Badge className="bg-white/10 text-white border-0 text-xs mb-3 uppercase tracking-wide">Coming Soon</Badge>
              <h2 className="text-2xl sm:text-3xl font-bold mb-2 text-balance">KW Enterprise Mobile App</h2>
              <p className="text-gray-300 text-sm text-pretty mb-4">Order on the go, track deliveries in real-time, and get exclusive app-only deals. Be the first to know when we launch!</p>
              <div className="flex flex-wrap gap-2">
                {['Faster ordering', 'Real-time tracking', 'Exclusive deals', 'Push notifications'].map(f => (
                  <div key={f} className="flex items-center gap-1.5 text-xs text-gray-300">
                    <CheckCircle2 className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    <span>{f}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex gap-3 shrink-0">
              <div className="bg-white/10 border border-white/20 rounded-xl px-5 py-3 text-center cursor-pointer hover:bg-white/20 transition-colors">
                <p className="text-xs text-gray-300 mb-0.5">Notify me on</p>
                <p className="font-bold">App Store</p>
              </div>
              <div className="bg-white/10 border border-white/20 rounded-xl px-5 py-3 text-center cursor-pointer hover:bg-white/20 transition-colors">
                <p className="text-xs text-gray-300 mb-0.5">Notify me on</p>
                <p className="font-bold">Google Play</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Newsletter ── */}
      <section className="bg-amber-50 border-t border-amber-100 py-14">
        <div className="container mx-auto px-4 text-center max-w-xl">
          <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-4">
            <Heart className="w-5 h-5 text-amber-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2 text-balance">Get Exclusive Deals in Your Inbox</h2>
          <p className="text-gray-500 text-sm mb-6 text-pretty">Join 5,000+ subscribers. Unsubscribe anytime — we respect your inbox.</p>
          <form onSubmit={handleSubscribe} className="flex gap-2 max-w-sm mx-auto">
            <Input
              type="email"
              placeholder="Your email address"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              className="flex-1 bg-white"
            />
            <Button type="submit" disabled={subscribing} className="bg-amber-600 hover:bg-amber-700 text-white shrink-0 px-5">
              {subscribing ? '…' : 'Subscribe'}
            </Button>
          </form>
        </div>
      </section>

      {/* ── Social CTA ── */}
      <section className="bg-white border-t border-gray-100 py-8">
        <div className="container mx-auto px-4 text-center">
          <p className="text-sm text-gray-500 mb-4">Follow us for daily deals and updates</p>
          <div className="flex justify-center gap-4">
            <a href="#" className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white hover:bg-blue-700 transition-colors"><Facebook className="w-4 h-4" /></a>
            <a href="#" className="w-10 h-10 rounded-full bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center text-white hover:opacity-90 transition-opacity"><Instagram className="w-4 h-4" /></a>
            <a href="#" className="w-10 h-10 rounded-full bg-sky-500 flex items-center justify-center text-white hover:bg-sky-600 transition-colors"><Twitter className="w-4 h-4" /></a>
          </div>
        </div>
      </section>
    </div>
  );
}
