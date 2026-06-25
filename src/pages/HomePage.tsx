import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getCategories, getProducts, getBanners, getGiftBoxes, getCmsPage, getTestimonials } from '@/services/store';
import { api } from '@/lib/api';
import { useModules } from '@/contexts/ModulesContext';
import Seo from '@/components/common/Seo';
import TrustedBrands from '@/components/home/TrustedBrands';
import BlogTips from '@/components/home/BlogTips';
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

// ── CMS home content type ─────────────────────────────────────────────────────
interface HomeContent {
  hero?: { heading?: string; subheading?: string; button_text?: string; button_link?: string };
  features?: { icon?: string; title: string; desc: string }[];
  flash_sale?: { enabled?: boolean; title?: string; subtitle?: string; badge?: string };
  stats?: { value: string; label: string }[];
  categories_heading?: string;
  categories_subheading?: string;
  featured_heading?: string;
  featured_subheading?: string;
  promo_banners?: { title: string; subtitle: string; badge: string; link: string; button_text: string }[];
  testimonials?: { name: string; role: string; text: string; rating: number }[];
  newsletter?: { heading?: string; subheading?: string };
  brands?: string[];
}

// ── Icon map for feature icons from CMS ──────────────────────────────────────
const ICON_MAP: Record<string, React.FC<{ className?: string }>> = {
  Truck, ShieldCheck, Award, Headphones, Package, Gift, Heart, Star, Zap, TrendingUp,
};

// ── Defaults (used when CMS hasn't been saved yet) ────────────────────────────
const DEFAULT_CONTENT: HomeContent = {
  hero: { heading: 'Premium FMCG Products', subheading: 'Quality groceries, beverages and household essentials at unbeatable prices across Ghana.', button_text: 'Shop Now', button_link: '/shop' },
  features: [
    { icon: 'Truck', title: 'Fast Delivery', desc: 'Accra & beyond' },
    { icon: 'ShieldCheck', title: 'Secure Payment', desc: 'PayStack & MoMo' },
    { icon: 'Award', title: 'Quality Products', desc: 'Verified brands' },
    { icon: 'Headphones', title: '24/7 Support', desc: 'Always here' },
  ],
  flash_sale: { enabled: true, title: 'Up to 30% Off Selected Items', subtitle: "Limited time offer — grab your favourites before they're gone!", badge: 'Flash Sale' },
  stats: [
    { value: '500+', label: 'Products' },
    { value: '5,000+', label: 'Happy Customers' },
    { value: '10+', label: 'Cities Covered' },
    { value: '5', label: 'Years of Excellence' },
  ],
  categories_heading: 'Shop by Category',
  categories_subheading: 'Browse our wide selection of product categories',
  featured_heading: 'Featured Products',
  featured_subheading: 'Hand-picked best sellers and new arrivals',
  promo_banners: [
    { title: 'Fresh Stock Just In', subtitle: 'New products added weekly. Be the first to shop!', badge: 'New Arrivals', link: '/shop', button_text: 'Shop New' },
    { title: 'Best Deals Just For You', subtitle: 'Exclusive savings on your favourites every week.', badge: 'Best Deals', link: '/shop', button_text: 'Grab Deals' },
  ],
  testimonials: [
    { name: 'Abena Mensah', role: 'Regular Customer', text: 'KW Enterprise has the best quality products. Delivery is always on time and the packaging is perfect. Highly recommend!', rating: 5 },
    { name: 'Kwame Asante', role: 'Business Owner', text: "I've been ordering wholesale from KW for 2 years. The prices are competitive and they always have stock. Great business to work with.", rating: 5 },
    { name: 'Ama Boateng', role: 'Homemaker', text: "The gift boxes are absolutely beautiful! I ordered one for my mother's birthday and she loved it. Will definitely order again.", rating: 5 },
  ],
  newsletter: { heading: 'Get Exclusive Deals in Your Inbox', subheading: "Join 5,000+ subscribers. Unsubscribe anytime — we respect your inbox." },
  brands: ['Nestlé', 'Unilever', 'Procter & Gamble', 'Coca-Cola', 'Heineken', "Kellogg's"],
};


// Banner promo bg colours cycle
const PROMO_COLOURS = [
  { from: 'from-blue-600', to: 'to-blue-800', text: 'text-blue-700', light: 'text-blue-100' },
  { from: 'from-emerald-600', to: 'to-emerald-800', text: 'text-emerald-700', light: 'text-emerald-100' },
  { from: 'from-purple-600', to: 'to-purple-800', text: 'text-purple-700', light: 'text-purple-100' },
  { from: 'from-orange-600', to: 'to-orange-800', text: 'text-orange-700', light: 'text-orange-100' },
];

// ── Dummy hero banners (used when no banners are configured in the admin) ──────
// FMCG toiletries / household & personal-care distribution — not groceries.
const DEMO_BANNERS: Banner[] = [
  { id: 'demo-1', title: 'Personal Care & Beauty Essentials', subtitle: 'Soaps, bath gels, lotions, deodorants and oral care from the brands people trust.', image_url: 'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=1600&q=80', link: '/shop', button_text: 'Shop Now', sort_order: 0, is_active: true },
  { id: 'demo-2', title: 'Home Care & Cleaning Supplies', subtitle: 'Detergents, dishwash, disinfectants, fresheners and more — for every home.', image_url: 'https://images.unsplash.com/photo-1563453392212-326f5e854473?w=1600&q=80', link: '/shop', button_text: 'Browse Products', sort_order: 1, is_active: true },
  { id: 'demo-3', title: 'Your Trusted Wholesale Distributor', subtitle: 'Stocked, priced right and delivered fast to retailers and homes across Ghana.', image_url: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=1600&q=80', link: '/contact', button_text: 'Partner With Us', sort_order: 2, is_active: true },
  { id: 'demo-4', title: 'Trusted Brands, Everyday Essentials', subtitle: 'Toiletries, fragrances, stationery and household must-haves all in one place.', image_url: 'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=1600&q=80', link: '/shop', button_text: 'Explore Range', sort_order: 3, is_active: true },
  { id: 'demo-5', title: 'Fast & Reliable Delivery', subtitle: 'Same-day delivery in Accra — we bring the essentials straight to your door.', image_url: 'https://images.unsplash.com/photo-1553413077-190dd305871c?w=1600&q=80', link: '/shop', button_text: 'Order Now', sort_order: 4, is_active: true },
];

// Pick n random items from an array (Fisher–Yates, non-mutating).
function pickRandom<T>(arr: T[], n: number): T[] {
  if (arr.length <= n) return arr;
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy.slice(0, n);
}

// ══════════════════════════════════════════════════════════════════════════════
export default function HomePage() {
  const { isEnabled } = useModules();
  const [cms, setCms] = useState<HomeContent>(DEFAULT_CONTENT);
  const [categories, setCategories] = useState<Category[]>([]);
  const [featuredProducts, setFeaturedProducts] = useState<Product[]>([]);
  const [banners, setBanners] = useState<Banner[]>([]);
  const [giftBoxes, setGiftBoxes] = useState<GiftBox[]>([]);
  const [dbTestimonials, setDbTestimonials] = useState<{ name: string; role: string; text: string; rating: number }[]>([]);
  const [displayCats, setDisplayCats] = useState<Category[]>([]);
  const [email, setEmail] = useState('');
  const [subscribing, setSubscribing] = useState(false);

  // Show 4 random top-level categories, re-shuffled every 30 seconds.
  useEffect(() => {
    const tops = categories.filter(c => !c.parent_id);
    if (!tops.length) { setDisplayCats([]); return; }
    setDisplayCats(pickRandom(tops, 4));
    const id = setInterval(() => setDisplayCats(pickRandom(tops, 4)), 30_000);
    return () => clearInterval(id);
  }, [categories]);

  useEffect(() => {
    // Load CMS content
    getCmsPage('home').then(page => {
      if (page?.content && Object.keys(page.content).length > 0) {
        setCms({ ...DEFAULT_CONTENT, ...(page.content as HomeContent) });
      }
    }).catch(() => {});
    // Load live data
    getCategories().then(setCategories);
    getProducts({ featured: true, limit: 8 }).then(setFeaturedProducts);
    getBanners().then(d => setBanners(d.length ? d : DEMO_BANNERS));
    getGiftBoxes().then(d => setGiftBoxes(d.slice(0, 4)));
    getTestimonials().then(d => setDbTestimonials(d.map(t => ({ name: t.name, role: t.role ?? '', text: t.text, rating: t.rating }))));
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

  const features = cms.features?.length ? cms.features : DEFAULT_CONTENT.features!;
  const stats = cms.stats?.length ? cms.stats : DEFAULT_CONTENT.stats!;
  const testimonials = dbTestimonials.length ? dbTestimonials : (cms.testimonials?.length ? cms.testimonials : DEFAULT_CONTENT.testimonials!);
  const promoBanners = cms.promo_banners?.length ? cms.promo_banners : DEFAULT_CONTENT.promo_banners!;
  const brands = cms.brands?.length ? cms.brands : DEFAULT_CONTENT.brands!;
  const newsletter = { ...DEFAULT_CONTENT.newsletter, ...cms.newsletter };
  const flashSale = { ...DEFAULT_CONTENT.flash_sale, ...cms.flash_sale };

  // Only show top-level categories (no parent)

  return (
    <div className="space-y-0 pb-0">
      <Seo
        path="/"
        title="KW Enterprise — Trusted FMCG Distribution in Ghana"
        description="KW Enterprise is a leading FMCG distributor in Ghana, supplying quality household, personal-care and food products to retailers and homes — with fast, reliable delivery."
      />

      {/* ── Hero Banner Slider (full-bleed, 80vh) ── */}
      {banners.length > 0 && (
        <section className="w-full">
          <BannerSlider banners={banners} heightClass="h-[80vh]" rounded={false} />
        </section>
      )}

      {/* ── Business Positioning Band ── */}
      <section className="bg-gradient-to-r from-amber-600 to-amber-700 text-white">
        <div className="container mx-auto px-4 py-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="max-w-2xl">
            <p className="text-amber-100 text-xs font-semibold uppercase tracking-widest mb-1">FMCG Distribution &amp; Wholesale</p>
            <h2 className="text-xl sm:text-2xl font-bold text-balance">Your trusted partner for quality consumer goods across Ghana</h2>
            <p className="text-amber-100 text-sm mt-1.5 text-pretty">Wholesale supply, retail delivery and corporate solutions — backed by a catalogue of trusted brands.</p>
          </div>
          <div className="flex gap-3 shrink-0">
            <Link to="/shop"><Button className="bg-white text-amber-700 hover:bg-amber-50 font-semibold">Shop Products</Button></Link>
            <Link to="/contact"><Button variant="ghost" className="border border-white/40 text-white hover:bg-white/10">Partner With Us</Button></Link>
          </div>
        </div>
      </section>

      {/* ── Features Strip ── */}
      <section className="bg-white border-y border-gray-100 py-4">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {features.map((f, i) => {
              const Icon = ICON_MAP[f.icon || ''] || Package;
              return (
                <div key={i} className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-amber-50 flex items-center justify-center shrink-0">
                    <Icon className="w-4 h-4 text-amber-600" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-gray-900">{f.title}</p>
                    <p className="text-xs text-gray-500">{f.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Flash Sale Banner ── */}
      {isEnabled('flash_sale') && flashSale.enabled && (
        <section className="container mx-auto px-4 py-6">
          <div className="bg-gradient-to-r from-red-600 to-orange-500 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center shrink-0">
                <Zap className="w-5 h-5 text-white" />
              </div>
              <div className="text-white">
                <Badge className="bg-white/20 text-white border-0 text-xs font-bold uppercase">{flashSale.badge}</Badge>
                <p className="font-bold text-lg mt-0.5 text-balance">{flashSale.title}</p>
                <p className="text-red-100 text-sm text-pretty">{flashSale.subtitle}</p>
              </div>
            </div>
            <Link to="/shop" className="shrink-0">
              <Button className="bg-white text-red-600 hover:bg-red-50 font-bold px-6 whitespace-nowrap">
                Shop Sale <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </Link>
          </div>
        </section>
      )}

      {/* ── Categories (4 random, rotating every 30s) ── */}
      {isEnabled('categories_section') && displayCats.length > 0 && (
        <section className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-xl font-bold text-gray-900">{cms.categories_heading || DEFAULT_CONTENT.categories_heading}</h2>
              <p className="text-sm text-gray-500 mt-0.5">{cms.categories_subheading || DEFAULT_CONTENT.categories_subheading}</p>
            </div>
            <Link to="/shop" className="text-sm text-amber-600 hover:text-amber-700 font-medium flex items-center gap-1 shrink-0">
              All <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {displayCats.map(c => <CategoryCard key={c.id} category={c} />)}
          </div>
        </section>
      )}

      {/* ── Featured Products ── */}
      {isEnabled('featured_products') && featuredProducts.length > 0 && (
      <section className="container mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-xl font-bold text-gray-900">{cms.featured_heading || DEFAULT_CONTENT.featured_heading}</h2>
            <p className="text-sm text-gray-500 mt-0.5">{cms.featured_subheading || DEFAULT_CONTENT.featured_subheading}</p>
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
      )}

      {/* ── Stats Bar ── */}
      {isEnabled('stats') && (
      <section className="bg-amber-600 py-12">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-white text-center">
            {stats.map(s => (
              <div key={s.label}>
                <div className="text-3xl md:text-4xl font-bold mb-1">{s.value}</div>
                <div className="text-amber-100 text-sm font-medium">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>
      )}

      {/* ── Two-column promo ── */}
      {isEnabled('promo_banners') && promoBanners.length > 0 && (
        <section className="container mx-auto px-4 py-10">
          <div className="grid md:grid-cols-2 gap-5">
            {promoBanners.slice(0, 2).map((b, i) => {
              const col = PROMO_COLOURS[i % PROMO_COLOURS.length];
              return (
                <div key={i} className={`relative bg-gradient-to-br ${col.from} ${col.to} rounded-2xl overflow-hidden p-6 text-white flex flex-col justify-between min-h-40`}>
                  <div className="absolute inset-0 bg-black/10 pointer-events-none" />
                  <div className="relative">
                    <Badge className="bg-white/20 text-white border-0 text-xs mb-3">{b.badge}</Badge>
                    <h3 className="text-xl font-bold mb-1 text-balance">{b.title}</h3>
                    <p className="text-white/80 text-sm text-pretty">{b.subtitle}</p>
                  </div>
                  <div className="relative mt-4">
                    <Link to={b.link || '/shop'}>
                      <Button size="sm" className={`bg-white ${col.text} hover:bg-gray-100 font-semibold`}>{b.button_text}</Button>
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* ── Gift Boxes CTA ── */}
      {isEnabled('gift_boxes') && (
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
      )}

      {/* ── Gift Boxes Grid ── */}
      {isEnabled('gift_boxes') && giftBoxes.length > 0 && (
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
      {isEnabled('why_choose_us') && (
      <section className="bg-gray-50 py-14">
        <div className="container mx-auto px-4">
          <div className="text-center mb-10">
            <span className="text-amber-600 text-sm font-medium uppercase tracking-widest">Why KW Enterprise</span>
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mt-2 text-balance">The KW Difference</h2>
            <p className="text-gray-500 mt-2 max-w-xl mx-auto text-pretty">We're more than a shop — we're your trusted FMCG partner in Ghana.</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { icon: Package,     title: 'Wide Product Range',  desc: 'Over 500 FMCG products from trusted brands — groceries, beverages, personal care and more.', color: 'text-amber-600', bg: 'bg-amber-50' },
              { icon: Truck,       title: 'Same-Day Delivery',   desc: 'Order before 2pm and receive your items the same day within Accra and major cities.', color: 'text-blue-600', bg: 'bg-blue-50' },
              { icon: ShieldCheck, title: 'Quality Guarantee',   desc: 'Every product passes our quality checks. Not satisfied? We offer hassle-free returns.', color: 'text-green-600', bg: 'bg-green-50' },
              { icon: TrendingUp,  title: 'Competitive Pricing', desc: 'We buy in bulk to pass savings to you. Always get the best price on top brands.', color: 'text-purple-600', bg: 'bg-purple-50' },
              { icon: Heart,       title: 'Customer First',      desc: '24/7 WhatsApp and phone support. We go the extra mile to make every order right.', color: 'text-red-500', bg: 'bg-red-50' },
              { icon: Gift,        title: 'Gift Solutions',      desc: 'Unique pre-made and custom gift boxes for every occasion — delivered with a personal touch.', color: 'text-emerald-600', bg: 'bg-emerald-50' },
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
      )}

      {/* ── Testimonials (from CMS) ── */}
      {isEnabled('testimonials') && testimonials.length > 0 && (
        <section className="container mx-auto px-4 py-14">
          <div className="text-center mb-10">
            <span className="text-amber-600 text-sm font-medium uppercase tracking-widest">Customer Reviews</span>
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mt-2 text-balance">What Our Customers Say</h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {testimonials.map((t, i) => (
              <div key={i} className="bg-white rounded-xl p-6 border border-gray-100 shadow-sm h-full flex flex-col">
                <Quote className="w-7 h-7 text-amber-200 mb-3 shrink-0" />
                <p className="text-gray-600 text-sm leading-relaxed flex-1 text-pretty">"{t.text}"</p>
                <div className="flex mt-4 gap-0.5 mb-3">
                  {[...Array(Math.min(5, t.rating || 5))].map((_, s) => <Star key={s} className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />)}
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-amber-100 flex items-center justify-center text-amber-700 font-bold text-sm shrink-0">
                    {t.name.split(' ').map(w => w[0]).slice(0, 2).join('')}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{t.name}</p>
                    <p className="text-xs text-gray-400">{t.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── Trusted Brands (admin-managed logos) ── */}
      {isEnabled('trusted_brands') && <TrustedBrands fallbackNames={brands} />}

      {/* ── Blog / Tips (admin-managed, from DB) ── */}
      {isEnabled('blog') && <BlogTips />}

      {/* ── App Download CTA ── */}
      {isEnabled('app_promo') && (
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
                    <CheckCircle2 className="w-3.5 h-3.5 text-amber-400 shrink-0" /><span>{f}</span>
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
      )}

      {/* ── Newsletter (from CMS) ── */}
      {isEnabled('newsletter') && (
      <section className="bg-amber-50 border-t border-amber-100 py-14">
        <div className="container mx-auto px-4 text-center max-w-xl">
          <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-4">
            <Heart className="w-5 h-5 text-amber-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2 text-balance">{newsletter.heading}</h2>
          <p className="text-gray-500 text-sm mb-6 text-pretty">{newsletter.subheading}</p>
          <form onSubmit={handleSubscribe} className="flex gap-2 max-w-sm mx-auto">
            <Input type="email" placeholder="Your email address" value={email} onChange={e => setEmail(e.target.value)} required className="flex-1 bg-white" />
            <Button type="submit" disabled={subscribing} className="bg-amber-600 hover:bg-amber-700 text-white shrink-0 px-5">
              {subscribing ? '…' : 'Subscribe'}
            </Button>
          </form>
        </div>
      </section>
      )}

      {/* ── Social CTA ── */}
      {isEnabled('social') && (
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
      )}
    </div>
  );
}
