import { useEffect, useState } from 'react';
import { getCmsPage } from '@/services/store';
import type { CmsPage } from '@/types/index';
import { Skeleton } from '@/components/ui/skeleton';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useModules } from '@/contexts/ModulesContext';
import Seo from '@/components/common/Seo';
import TeamSection from '@/components/about/TeamSection';
import { resolveImageUrl } from '@/lib/media';
import {
  Target, Eye, Star, Award, Truck, ShieldCheck,
  Heart, Leaf, Gem, ArrowRight, CheckCircle2, Phone, Mail, MapPin,
} from 'lucide-react';

// ── CMS content types ─────────────────────────────────────────────────────────
interface AboutStory {
  eyebrow?: string;
  heading?: string;
  paragraphs?: string[];
  image_url?: string;
  badge_value?: string;
  badge_label?: string;
  highlights?: string[];
}

interface AboutContent {
  hero?: { heading?: string; subheading?: string; image_url?: string };
  mission?: string;
  vision?: string;
  values?: { title: string; desc: string }[];
  team?: { name: string; role: string; image_url?: string; bio?: string }[];
  stats?: { label: string; value: string }[];
  story?: AboutStory;
}

const VALUE_ICONS = [Star, Award, ShieldCheck, Truck, Target, Eye, Heart, Leaf, Gem];

// Fallback image for the Our Story section when no image_url is configured.
const STORY_FALLBACK_IMAGE =
  'https://images.unsplash.com/photo-1553413077-190dd305871c?w=700&auto=format&fit=crop';

// ── Static fallback data ──────────────────────────────────────────────────────
const STATIC: AboutContent = {
  hero: {
    heading: 'Crafted with Love, Delivered with Care',
    subheading:
      'At Kosi Wraps, we believe every gift deserves to be wrapped in warmth. From personalised hampers to luxury gift boxes, we bring joy to every occasion — birthdays, weddings, corporate events and beyond.',
  },
  stats: [
    { value: '5,000+', label: 'Happy Customers' },
    { value: '200+', label: 'Unique Products' },
    { value: '98%', label: 'On-Time Delivery' },
    { value: '50+', label: 'Corporate Partners' },
  ],
  mission:
    'Our mission is to make gifting effortless, meaningful and beautiful. We curate premium products and craft bespoke gift experiences that create lasting memories for the people who matter most.',
  vision:
    'To become Ghana\'s most trusted gifting brand — known for quality, creativity and heartfelt customer service that turns ordinary moments into extraordinary memories.',
  values: [
    { title: 'Quality First',     desc: 'We source only the finest products and materials, ensuring every item that leaves our workshop meets the highest standards.' },
    { title: 'Heartfelt Service', desc: 'Every order is handled personally. We listen, advise and go the extra mile to make sure your gift is exactly right.' },
    { title: 'Sustainability',    desc: 'We use eco-friendly packaging and partner with local artisans to reduce our environmental footprint.' },
    { title: 'Reliability',       desc: 'Same-day and scheduled deliveries you can count on — your gift arrives fresh, on time, every time.' },
    { title: 'Creativity',        desc: 'No two gifts are alike. Our team brings fresh ideas and artistic flair to every hamper and box we create.' },
    { title: 'Inclusivity',       desc: 'We celebrate every culture and occasion, offering gifts that resonate across communities and backgrounds.' },
  ],
  team: [
    { name: 'Akosua Mensah',   role: 'Founder & Creative Director', bio: 'With a passion for gifting and 10+ years in retail, Akosua built Kosi Wraps from a dream to a beloved Accra brand.' },
    { name: 'Kwame Agyei',     role: 'Head of Operations',          bio: 'Kwame oversees logistics and ensures every order is processed, packed and delivered with precision and care.' },
    { name: 'Abena Osei',      role: 'Lead Gift Designer',          bio: 'Abena brings creativity and colour to our collections — from seasonal hampers to bespoke corporate gift sets.' },
    { name: 'Kofi Asante',     role: 'Customer Experience Manager', bio: 'Kofi champions every customer journey, ensuring satisfaction from first click to final delivery.' },
  ],
  story: {
    eyebrow: 'Our Story',
    heading: 'Built to Keep Ghana’s Shelves Stocked',
    paragraphs: [
      'KW Enterprise started as a small distribution outfit supplying everyday essentials to neighbourhood shops across Accra. What began with a single van and a handful of trusted retailers quickly grew into a dependable supply partner for businesses right across the region.',
      'Today we move fast-moving consumer goods — from food and beverages to household and personal-care lines — at scale, connecting leading manufacturers with the wholesalers, retailers and institutions who rely on consistent stock and fair pricing.',
      'Reliability is at the heart of everything we do. Efficient warehousing, careful inventory management and a committed delivery team mean our partners get the right products, in the right quantities, exactly when they need them.',
    ],
    image_url: '',
    badge_value: '5+ yrs',
    badge_label: 'of dependable FMCG distribution',
    highlights: [
      'Trusted nationwide network',
      'Reliable, on-time delivery',
      'Competitive wholesale pricing',
    ],
  },
};

// Merge CMS story content over defaults; fall back per-field so partial edits still render.
function mergeStory(raw?: AboutStory): Required<Omit<AboutStory, 'image_url'>> & { image_url?: string } {
  const def = STATIC.story as AboutStory;
  return {
    eyebrow:     raw?.eyebrow?.trim()         || def.eyebrow     || 'Our Story',
    heading:     raw?.heading?.trim()         || def.heading     || '',
    paragraphs:  raw?.paragraphs?.length      ? raw.paragraphs   : (def.paragraphs ?? []),
    image_url:   raw?.image_url?.trim()       || def.image_url   || '',
    badge_value: raw?.badge_value?.trim()     || def.badge_value || '',
    badge_label: raw?.badge_label?.trim()     || def.badge_label || '',
    highlights:  raw?.highlights?.length      ? raw.highlights   : (def.highlights ?? []),
  };
}

// ══════════════════════════════════════════════════════════════════════════════
export default function AboutPage() {
  const { isEnabled } = useModules();
  const [page, setPage] = useState<CmsPage | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getCmsPage('about').then(p => { setPage(p); setLoading(false); });
  }, []);

  if (loading) return <AboutSkeleton />;

  // Merge CMS content over static defaults
  const raw = (page?.content ?? {}) as AboutContent;
  const c: AboutContent = {
    hero:   { ...STATIC.hero,   ...raw.hero },
    stats:  raw.stats?.length   ? raw.stats   : STATIC.stats,
    mission: raw.mission        ?? STATIC.mission,
    vision:  raw.vision         ?? STATIC.vision,
    values:  raw.values?.length ? raw.values  : STATIC.values,
    team:    raw.team?.length   ? raw.team    : STATIC.team,
    story:   mergeStory(raw.story),
  };

  return (
    <div className="pb-20">
      <Seo path="/about" title="About Us — KW Enterprise" description="Learn about KW Enterprise, our mission, values and the team behind Ghana’s trusted FMCG distribution business." />

      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <section className="relative bg-gradient-to-br from-amber-700 via-amber-800 to-amber-900 text-white overflow-hidden">
        {c.hero?.image_url && (
          <div className="absolute inset-0">
            <img src={c.hero.image_url} alt="" className="w-full h-full object-cover opacity-20" />
          </div>
        )}
        {/* decorative circles */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-amber-600/30 rounded-full -translate-y-1/2 translate-x-1/3 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-amber-900/40 rounded-full translate-y-1/2 -translate-x-1/4 pointer-events-none" />

        <div className="relative container mx-auto px-4 py-24 text-center">
          <span className="inline-block text-amber-200 text-sm font-medium uppercase tracking-widest mb-4 px-4 py-1 border border-amber-500/40 rounded-full">
            Who We Are
          </span>
          <h1 className="text-3xl md:text-5xl font-bold mb-5 text-balance max-w-3xl mx-auto leading-tight">
            {c.hero?.heading}
          </h1>
          <p className="text-base md:text-lg text-amber-100 max-w-2xl mx-auto text-pretty leading-relaxed">
            {c.hero?.subheading}
          </p>
          <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
            <Button asChild className="bg-white text-amber-800 hover:bg-amber-50 font-semibold px-6">
              <Link to="/shop">Shop Our Collection <ArrowRight className="w-4 h-4 ml-1" /></Link>
            </Button>
            <Button asChild variant="ghost" className="border border-white/50 text-white hover:bg-white/10 px-6">
              <Link to="/contact">Get in Touch</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* ── Stats bar ─────────────────────────────────────────────────────── */}
      <section className="bg-white border-b border-gray-100 shadow-sm">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-gray-100">
            {(c.stats ?? []).map((s, i) => (
              <div key={i} className="py-7 px-4 text-center">
                <div className="text-3xl font-bold text-amber-600 mb-1">{s.value}</div>
                <div className="text-sm text-gray-500 font-medium">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Story section ─────────────────────────────────────────────────── */}
      <section className="container mx-auto px-4 py-16">
        <div className="grid md:grid-cols-2 gap-10 items-center">
          <div>
            {c.story?.eyebrow && (
              <span className="text-amber-600 text-sm font-medium uppercase tracking-widest">{c.story.eyebrow}</span>
            )}
            {c.story?.heading && (
              <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mt-2 mb-4 text-balance">
                {c.story.heading}
              </h2>
            )}
            <div className="space-y-4 text-gray-600 leading-relaxed text-pretty">
              {(c.story?.paragraphs ?? []).map((p, i) => (
                <p key={i}>{p}</p>
              ))}
            </div>
            {(c.story?.highlights?.length ?? 0) > 0 && (
              <div className="mt-6 flex flex-col sm:flex-row gap-3">
                {(c.story?.highlights ?? []).map((text, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm text-gray-700">
                    <CheckCircle2 className="w-4 h-4 text-amber-500 shrink-0" />
                    {text}
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="relative">
            <div className="aspect-[4/3] rounded-2xl overflow-hidden bg-amber-50 shadow-lg">
              <img
                src={resolveImageUrl(c.story?.image_url) || STORY_FALLBACK_IMAGE}
                alt={c.story?.heading || 'Our story'}
                className="w-full h-full object-cover"
              />
            </div>
            {(c.story?.badge_value || c.story?.badge_label) && (
              <div className="absolute -bottom-4 -left-4 bg-amber-600 text-white rounded-xl p-4 shadow-lg max-w-[160px]">
                {c.story?.badge_value && <p className="text-2xl font-bold">{c.story.badge_value}</p>}
                {c.story?.badge_label && <p className="text-xs text-amber-100 mt-0.5">{c.story.badge_label}</p>}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ── Mission & Vision ──────────────────────────────────────────────── */}
      <section className="bg-gray-50 py-16">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-2 gap-8">
            <div className="bg-white rounded-2xl p-8 border border-amber-100 shadow-sm">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center">
                  <Target className="w-6 h-6 text-amber-700" />
                </div>
                <h2 className="text-xl font-bold text-gray-900">Our Mission</h2>
              </div>
              <p className="text-gray-600 leading-relaxed text-pretty">{c.mission}</p>
            </div>
            <div className="bg-white rounded-2xl p-8 border border-emerald-100 shadow-sm">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center">
                  <Eye className="w-6 h-6 text-emerald-700" />
                </div>
                <h2 className="text-xl font-bold text-gray-900">Our Vision</h2>
              </div>
              <p className="text-gray-600 leading-relaxed text-pretty">{c.vision}</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Values ───────────────────────────────────────────────────────── */}
      <section className="container mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <span className="text-amber-600 text-sm font-medium uppercase tracking-widest">What Drives Us</span>
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mt-2 text-balance">Our Core Values</h2>
          <p className="text-gray-500 mt-3 max-w-lg mx-auto text-pretty">
            These principles guide every decision we make, every product we choose and every gift we create.
          </p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {(c.values ?? []).map((v, i) => {
            const Icon = VALUE_ICONS[i % VALUE_ICONS.length];
            return (
              <div key={i} className="bg-white rounded-xl p-6 border border-gray-100 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 h-full flex flex-col">
                <div className="w-11 h-11 rounded-xl bg-amber-50 flex items-center justify-center mb-4 shrink-0">
                  <Icon className="w-5 h-5 text-amber-600" />
                </div>
                <h3 className="text-base font-semibold text-gray-900 mb-2">{v.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed flex-1 text-pretty">{v.desc}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── Team (admin-managed) ─────────────────────────────────────────── */}
      {isEnabled('team') && <TeamSection />}

      {/* ── Contact strip ────────────────────────────────────────────────── */}
      <section className="container mx-auto px-4 py-16">
        <div className="bg-gradient-to-br from-amber-700 to-amber-900 rounded-2xl p-8 md:p-12 text-white text-center">
          <h2 className="text-2xl md:text-3xl font-bold mb-3 text-balance">Ready to Create the Perfect Gift?</h2>
          <p className="text-amber-100 mb-8 max-w-xl mx-auto text-pretty">
            Whether it's a single item or a corporate order of 500, our team is here to help you make it memorable.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
            <div className="flex items-center gap-2 text-sm text-amber-100">
              <Phone className="w-4 h-4 shrink-0" /> +233 24 000 0000
            </div>
            <div className="flex items-center gap-2 text-sm text-amber-100">
              <Mail className="w-4 h-4 shrink-0" /> hello@kosiWraps.com
            </div>
            <div className="flex items-center gap-2 text-sm text-amber-100">
              <MapPin className="w-4 h-4 shrink-0" /> East Legon, Accra, Ghana
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button asChild className="bg-white text-amber-800 hover:bg-amber-50 font-semibold">
              <Link to="/shop">Browse Our Collection</Link>
            </Button>
            <Button asChild variant="ghost" className="border border-white/50 text-white hover:bg-white/10">
              <Link to="/contact">Contact Us</Link>
            </Button>
          </div>
        </div>
      </section>

    </div>
  );
}

// ── Skeleton ──────────────────────────────────────────────────────────────────
function AboutSkeleton() {
  return (
    <div className="pb-20">
      <div className="h-64 bg-muted animate-pulse" />
      <div className="container mx-auto px-4 py-14 space-y-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
        </div>
        <div className="grid md:grid-cols-2 gap-6">
          <Skeleton className="h-48 rounded-2xl" />
          <Skeleton className="h-48 rounded-2xl" />
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-32 rounded-xl" />)}
        </div>
      </div>
    </div>
  );
}



