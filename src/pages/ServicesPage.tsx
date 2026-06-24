import { useEffect, useState } from 'react';
import { getCmsPage } from '@/services/store';
import type { CmsPage } from '@/types/index';
import { Skeleton } from '@/components/ui/skeleton';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import Seo from '@/components/common/Seo';
import {
  Truck, ShoppingBag, Gift, Building, CheckCircle, ArrowRight,
  Star, Phone, Mail, Package, Users, Calendar, Sparkles,
  ClipboardList, CreditCard, Heart,
} from 'lucide-react';

// ── CMS content types ─────────────────────────────────────────────────────────
interface ServicesContent {
  hero?: { heading?: string; subheading?: string; image_url?: string };
  intro?: string;
  services?: { title: string; icon: string; desc: string; image_url?: string; features?: string[] }[];
  process?: { step: string; title: string; desc: string }[];
}

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  Truck, ShoppingBag, Gift, Building, Star, Package, Users, Calendar, Sparkles, Heart,
};

// ── Static fallback data ──────────────────────────────────────────────────────
const STATIC: ServicesContent = {
  hero: {
    heading: 'Gifting Services Tailored to Every Occasion',
    subheading:
      'From intimate birthday hampers to large-scale corporate gifting programmes, Kosi Wraps has the expertise, creativity and capacity to make every gift extraordinary.',
  },
  intro:
    'We offer a full range of gifting services — carefully designed to take the stress out of finding, curating and delivering the perfect gift. Whether you\'re an individual or a Fortune 500 company, we make gifting simple, beautiful and meaningful.',
  services: [
    {
      title: 'Ready-Made Gift Hampers',
      icon: 'Gift',
      desc: 'Browse our curated collection of pre-built hampers for every occasion — birthdays, anniversaries, holidays, new babies, congratulations and more. Each hamper is beautifully packaged and ready to ship.',
      features: ['Over 50 ready-made designs', 'Seasonal and themed collections', 'Fast same-day dispatch', 'Personalised gift card included'],
    },
    {
      title: 'Bespoke Gift Curation',
      icon: 'Sparkles',
      desc: 'Work one-on-one with our gift designers to build a completely personalised hamper from scratch. Choose every item, every wrapping detail, and every finishing touch — we handle the rest.',
      features: ['Personal design consultation', 'Unlimited customisation options', 'Premium wrapping & ribbon', 'Custom brand labels available'],
    },
    {
      title: 'Corporate Gifting',
      icon: 'Building',
      desc: 'Impress clients, reward employees and celebrate milestones with professionally curated corporate gift sets. We handle bulk orders with branded packaging, consistent quality and on-time delivery.',
      features: ['Minimum order of 10 units', 'Logo branding & custom boxes', 'Dedicated account manager', 'Bulk pricing discounts'],
    },
    {
      title: 'Event Gifting & Favours',
      icon: 'Calendar',
      desc: 'Make your wedding, conference, product launch or gala unforgettable with bespoke event gifts and favours. We specialise in large-volume, detail-perfect orders that wow your guests.',
      features: ['Weddings, baby showers, parties', 'Branded corporate events', 'Minimum order of 20 units', 'Delivery to event venue'],
    },
    {
      title: 'Subscription Gift Boxes',
      icon: 'Package',
      desc: 'Give the gift that keeps giving. Our monthly subscription boxes are a delightful surprise for loved ones — fresh themes, premium products and thoughtful curation every single month.',
      features: ['Monthly, quarterly or bi-annual plans', 'Fully customisable preferences', 'Special birthday surprises', 'Easy pause or cancel anytime'],
    },
    {
      title: 'Same-Day Delivery',
      icon: 'Truck',
      desc: 'Forgot an important date? Don\'t worry — our same-day delivery service covers Accra and surrounding areas. Order before 2pm and your gift arrives today, beautifully packaged.',
      features: ['Accra coverage (same-day)', 'Other regions (1–2 days)', 'Real-time tracking link', 'WhatsApp delivery confirmation'],
    },
  ],
  process: [
    { step: '01', title: 'Choose or Customise',    desc: 'Browse our ready-made collection or start a custom order. Tell us the occasion, the recipient and your budget.' },
    { step: '02', title: 'We Curate & Package',    desc: 'Our gift designers select, pack and beautifully wrap every item with care and attention to detail.' },
    { step: '03', title: 'Personalise the Message', desc: 'Add a custom gift card, a personal note or branded packaging to make the gift uniquely yours.' },
    { step: '04', title: 'Deliver with Delight',   desc: 'We dispatch promptly and send a real-time tracking link. Your gift arrives fresh and on time — guaranteed.' },
  ],
};

// ══════════════════════════════════════════════════════════════════════════════
export default function ServicesPage() {
  const [page, setPage] = useState<CmsPage | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getCmsPage('services').then(p => { setPage(p); setLoading(false); });
  }, []);

  if (loading) return <ServicesSkeleton />;

  const raw = (page?.content ?? {}) as ServicesContent;
  const c: ServicesContent = {
    hero:     { ...STATIC.hero,     ...raw.hero },
    intro:    raw.intro             ?? STATIC.intro,
    services: raw.services?.length  ? raw.services : STATIC.services,
    process:  raw.process?.length   ? raw.process  : STATIC.process,
  };

  return (
    <div className="pb-20">
      <Seo path="/services" title="Our Services — KW Enterprise" description="Wholesale distribution, retail supply and corporate solutions from KW Enterprise." />

      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <section className="relative bg-gradient-to-br from-amber-700 via-amber-800 to-amber-900 text-white overflow-hidden">
        {c.hero?.image_url && (
          <div className="absolute inset-0">
            <img src={c.hero.image_url} alt="" className="w-full h-full object-cover opacity-20" />
          </div>
        )}
        <div className="absolute top-0 right-0 w-80 h-80 bg-amber-500/20 rounded-full -translate-y-1/2 translate-x-1/4 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-56 h-56 bg-amber-900/30 rounded-full translate-y-1/2 -translate-x-1/4 pointer-events-none" />

        <div className="relative container mx-auto px-4 py-24 text-center">
          <span className="inline-block text-amber-200 text-sm font-medium uppercase tracking-widest mb-4 px-4 py-1 border border-amber-500/40 rounded-full">
            What We Offer
          </span>
          <h1 className="text-3xl md:text-5xl font-bold mb-5 text-balance max-w-3xl mx-auto leading-tight">
            {c.hero?.heading}
          </h1>
          <p className="text-base md:text-lg text-amber-100 max-w-2xl mx-auto text-pretty leading-relaxed">
            {c.hero?.subheading}
          </p>
          <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
            <Button asChild className="bg-white text-amber-800 hover:bg-amber-50 font-semibold px-6">
              <Link to="/shop">Browse Products <ArrowRight className="w-4 h-4 ml-1" /></Link>
            </Button>
            <Button asChild variant="ghost" className="border border-white/50 text-white hover:bg-white/10 px-6">
              <Link to="/contact">Request a Custom Order</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* ── Stats strip ───────────────────────────────────────────────────── */}
      <section className="bg-white border-b border-gray-100 shadow-sm">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-gray-100">
            {[
              { value: '50+', label: 'Gift Designs' },
              { value: '5,000+', label: 'Orders Delivered' },
              { value: 'Same Day', label: 'Accra Delivery' },
              { value: '100%', label: 'Satisfaction Guarantee' },
            ].map((s, i) => (
              <div key={i} className="py-7 px-4 text-center">
                <div className="text-2xl font-bold text-amber-600 mb-1">{s.value}</div>
                <div className="text-sm text-gray-500 font-medium">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Intro ─────────────────────────────────────────────────────────── */}
      {c.intro && (
        <section className="container mx-auto px-4 py-14 max-w-3xl text-center">
          <span className="text-amber-600 text-sm font-medium uppercase tracking-widest">Our Offerings</span>
          <p className="text-gray-600 mt-4 text-base leading-relaxed text-pretty">{c.intro}</p>
        </section>
      )}

      {/* ── Services grid ─────────────────────────────────────────────────── */}
      <section className="bg-gray-50 py-16">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900 text-balance">Everything You Need for the Perfect Gift</h2>
            <p className="text-gray-500 mt-3 max-w-xl mx-auto text-pretty">
              Six ways we help you give gifts that are remembered long after the day is over.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {(c.services ?? []).map((svc, i) => {
              const Icon = ICON_MAP[svc.icon] ?? Gift;
              return (
                <div key={i} className="bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 p-6 h-full flex flex-col">
                  <div className="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center mb-4 shrink-0">
                    <Icon className="w-6 h-6 text-amber-600" />
                  </div>
                  <h3 className="text-base font-bold text-gray-900 mb-2">{svc.title}</h3>
                  <p className="text-sm text-gray-500 leading-relaxed text-pretty mb-4">{svc.desc}</p>
                  {svc.features?.length ? (
                    <ul className="mt-auto space-y-1.5">
                      {svc.features.map((f, fi) => (
                        <li key={fi} className="flex items-start gap-2 text-xs text-gray-600">
                          <CheckCircle className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                          {f}
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Process steps ─────────────────────────────────────────────────── */}
      <section className="container mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <span className="text-amber-600 text-sm font-medium uppercase tracking-widest">How It Works</span>
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mt-2 text-balance">Ordering is Simple</h2>
          <p className="text-gray-500 mt-3 max-w-lg mx-auto text-pretty">
            Four easy steps from idea to delivered delight.
          </p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 relative">
          {/* Connector line on desktop */}
          <div className="hidden lg:block absolute top-8 left-[12.5%] right-[12.5%] h-0.5 bg-amber-100 z-0" />
          {(c.process ?? []).map((step, i) => {
            const StepIcons = [ClipboardList, Sparkles, CreditCard, Truck];
            const StepIcon = StepIcons[i % StepIcons.length];
            return (
              <div key={i} className="relative z-10 text-center flex flex-col items-center">
                <div className="w-16 h-16 rounded-full bg-amber-600 text-white flex flex-col items-center justify-center mb-4 shadow-md shrink-0">
                  <StepIcon className="w-6 h-6" />
                </div>
                <span className="text-xs text-amber-500 font-bold tracking-wider mb-1">STEP {step.step}</span>
                <h3 className="text-sm font-bold text-gray-900 mb-2 text-balance">{step.title}</h3>
                <p className="text-xs text-gray-500 leading-relaxed text-pretty">{step.desc}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── Testimonial highlight ─────────────────────────────────────────── */}
      <section className="bg-amber-50 py-16">
        <div className="container mx-auto px-4">
          <div className="text-center mb-10">
            <span className="text-amber-600 text-sm font-medium uppercase tracking-widest">What Customers Say</span>
            <h2 className="text-2xl font-bold text-gray-900 mt-2 text-balance">Loved by Thousands</h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { name: 'Ama K.',     role: 'Individual Customer',     quote: 'The hamper arrived beautifully wrapped and right on time. My mum was in tears — in the best way! Will definitely order again.' },
              { name: 'Kofi Boateng', role: 'HR Manager, TechCo',   quote: 'We ordered 150 branded gift sets for our annual staff appreciation event. Flawless execution, on-brand packaging and delivered two days early.' },
              { name: 'Serwa M.',   role: 'Bride',                   quote: 'Kosi Wraps did all 80 wedding favour boxes for us. Every single one was perfect. Our guests kept asking where we got them!' },
            ].map((t, i) => (
              <div key={i} className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 h-full flex flex-col">
                <div className="flex gap-0.5 mb-4">
                  {[...Array(5)].map((_, si) => <Star key={si} className="w-4 h-4 fill-amber-400 text-amber-400" />)}
                </div>
                <p className="text-sm text-gray-600 italic leading-relaxed flex-1 text-pretty">"{t.quote}"</p>
                <div className="mt-4 pt-4 border-t border-gray-50">
                  <p className="text-sm font-semibold text-gray-900">{t.name}</p>
                  <p className="text-xs text-gray-400">{t.role}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ───────────────────────────────────────────────────────────── */}
      <section className="container mx-auto px-4 py-16">
        <div className="bg-gradient-to-br from-amber-700 to-amber-900 rounded-2xl p-8 md:p-12 text-white">
          <div className="grid md:grid-cols-2 gap-8 items-center">
            <div>
              <h2 className="text-2xl md:text-3xl font-bold mb-3 text-balance">Start Your Order Today</h2>
              <p className="text-amber-100 text-pretty leading-relaxed mb-6">
                Whether you need a single hamper or a thousand branded gift sets, our team is ready to help. Reach out and we'll get started right away.
              </p>
              <div className="space-y-2 text-sm text-amber-100">
                <div className="flex items-center gap-2"><Phone className="w-4 h-4 shrink-0" /> +233 24 000 0000</div>
                <div className="flex items-center gap-2"><Mail className="w-4 h-4 shrink-0" /> hello@kosiWraps.com</div>
              </div>
            </div>
            <div className="flex flex-col gap-3 md:items-end">
              <Button asChild className="bg-white text-amber-800 hover:bg-amber-50 font-semibold w-full md:w-auto px-8">
                <Link to="/shop">Shop Now <ShoppingBag className="w-4 h-4 ml-1" /></Link>
              </Button>
              <Button asChild variant="ghost" className="border border-white/50 text-white hover:bg-white/10 w-full md:w-auto px-8">
                <Link to="/contact">Request Corporate Quote</Link>
              </Button>
              <p className="text-xs text-amber-300 mt-1">Corporate orders: response within 2 business hours</p>
            </div>
          </div>
        </div>
      </section>

    </div>
  );
}

// ── Skeleton ──────────────────────────────────────────────────────────────────
function ServicesSkeleton() {
  return (
    <div className="pb-20">
      <div className="h-64 bg-muted animate-pulse" />
      <div className="container mx-auto px-4 py-14 space-y-8">
        <Skeleton className="h-16 rounded-xl max-w-2xl mx-auto" />
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-52 rounded-xl" />)}
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-36 rounded-xl" />)}
        </div>
      </div>
    </div>
  );
}


